import puppeteer from 'puppeteer';

/**
 * Smart Query Preprocessor
 * Converts natural language queries into clean Google Maps search terms.
 * Examples:
 *   "Find businesses with no website, for example an auto dealership in Switzerland"
 *   → "auto dealership Switzerland"
 *   "Plumbers in Hamburg" → "Plumbers Hamburg"
 *   "Friseur ohne Webseite in Zürich" → "Friseur Zürich"
 */
function preprocessQuery(rawQuery) {
  let q = rawQuery.trim();

  // Remove common natural language noise phrases (case-insensitive)
  const noisePatterns = [
    /find\s+(me\s+)?/gi,
    /search\s+(for\s+)?/gi,
    /look\s+(for\s+)?/gi,
    /businesses?\s+with\s+no\s+websites?/gi,
    /businesses?\s+without\s+(a\s+)?websites?/gi,
    /without\s+(a\s+)?websites?/gi,
    /with\s+no\s+websites?/gi,
    /ohne\s+webseite[n]?/gi,
    /ohne\s+website[s]?/gi,
    /for\s+example\s+/gi,
    /for\s+instance\s+/gi,
    /such\s+as\s+/gi,
    /like\s+an?\s+/gi,
    /,\s*for\s+example/gi,
    /,\s*e\.?g\.?/gi,
    /please\s*/gi,
    /i\s+want\s+(to\s+)?/gi,
    /i\s+need\s+(to\s+)?/gi,
    /can\s+you\s+/gi,
    /show\s+me\s+/gi,
    /get\s+me\s+/gi,
    /an?\s+(?=\w+\s+(in|near|around))/gi,  // Remove "an" before "X in Y"
  ];

  for (const pattern of noisePatterns) {
    q = q.replace(pattern, ' ');
  }

  // Clean up extra whitespace, commas, and leading/trailing junk
  q = q.replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Remove leading articles if they start the cleaned query
  q = q.replace(/^(an?|the|die|der|das|ein[e]?)\s+/i, '');

  // If still too long or noisy, try to extract "[business type] in [location]" pattern
  const inPattern = q.match(/(.+?)\s+(?:in|near|around|bei|nahe)\s+(.+)/i);
  if (inPattern) {
    const businessType = inPattern[1].trim();
    const location = inPattern[2].trim();
    q = `${businessType} ${location}`;
  }

  return q || rawQuery; // Fallback to original if preprocessing empties it
}

/**
 * Generate alternative search queries to try if the first one yields no results.
 * Google Maps responds better to specific local terms.
 */
function generateAlternativeQueries(cleanedQuery) {
  const alternatives = [];
  
  // Try with "near me" style or more specific local terms
  const parts = cleanedQuery.split(/\s+/);
  if (parts.length >= 2) {
    // Try just the location with the business type
    alternatives.push(cleanedQuery);
    
    // Try reversing: "location business_type"
    const inMatch = cleanedQuery.match(/(.+?)\s+(\S+)$/i);
    if (inMatch) {
      alternatives.push(`${inMatch[2]} ${inMatch[1]}`);
    }
  }
  
  return alternatives;
}


export async function scrapeGoogleMaps({ query, minRating = 4.0, limit = 10, logCallback }) {
  const log = (msg) => {
    console.log(`[SCRAPER] ${msg}`);
    if (logCallback) logCallback(`[SCRAPER] ${msg}`);
  };

  // Preprocess the query to strip natural language noise
  const cleanQuery = preprocessQuery(query);
  if (cleanQuery !== query) {
    log(`Smart query cleanup: "${query}" → "${cleanQuery}"`);
  }

  log(`Launching headless browser...`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800',
      '--accept-lang=en-US,en'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  // Set user agent to mimic regular browser
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(cleanQuery)}?hl=en`;
  log(`Navigating to Google Maps search...`);
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // Handle Cookie Consent pop-up (very common in Europe/Germany)
  try {
    log("Checking for Google cookie consent overlay...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const acceptBtnSelector = 'form[action*="consent.google.com"] button, button[aria-label="Accept all"], button[aria-label="Alle akzeptieren"]';
    const consentBtn = await page.$(acceptBtnSelector);
    if (consentBtn) {
      log("Cookie consent button found. Clicking to dismiss...");
      await consentBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const acceptBtn = buttons.find(b => {
          const txt = b.innerText.toLowerCase();
          return txt.includes('accept all') || txt.includes('alle akzeptieren') || txt.includes('agree') || txt.includes('ich stimme zu') || txt.includes('all accept');
        });
        if (acceptBtn) {
          acceptBtn.click();
          return true;
        }
        return false;
      });
      if (clicked) {
        log("Cookie consent button clicked via text match.");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        log("No cookie consent overlay detected. Proceeding.");
      }
    }
  } catch (consentErr) {
    log(`Non-blocking issue handling consent form: ${consentErr.message}`);
  }

  log(`Searching listings for "${cleanQuery}"...`);
  
  // Locate the results feed container
  let feedSelector = 'div[role="feed"]';
  let feedFound = true;
  try {
    await page.waitForSelector(feedSelector, { timeout: 12000 });
  } catch (err) {
    log(`Feed container not found. Saving debug screenshot and checking for place links...`);
    feedFound = false;
    
    try {
      await page.screenshot({ path: './scraper_debug.png' });
      log(`Saved debug screenshot to server/scraper_debug.png`);
    } catch (ssErr) {
      log(`Failed to save screenshot: ${ssErr.message}`);
    }

    const hasLinks = await page.evaluate(() => document.querySelectorAll('a[href*="/maps/place/"]').length > 0);
    if (!hasLinks) {
      log(`Failed to load Google Maps search results (no place links found).`);
      await browser.close();
      return [];
    }
    log(`Found place links on page. Proceeding with search execution.`);
  }

  // Scroll loop to load listings
  log(`Scrolling results panel to collect listing cards...`);
  let prevHeight = 0;
  let scrollAttempts = 0;
  let itemsCount = 0;
  const maxScrollAttempts = 30; // More aggressive scrolling to find smaller local businesses
  const targetListings = limit * 4; // Collect 4x more listings to have better filtering odds
  
  while (scrollAttempts < maxScrollAttempts && itemsCount < targetListings) {
    itemsCount = await page.evaluate((sel) => {
      const links = document.querySelectorAll('a[href*="/maps/place/"]');
      return links.length;
    }, feedSelector);

    if (scrollAttempts % 5 === 0 || itemsCount !== prevHeight) {
      log(`Found ${itemsCount} listings in scroll buffer...`);
    }
    prevHeight = itemsCount;
    
    if (itemsCount >= targetListings) break;

    const scrolled = await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) {
        feed.scrollBy(0, 2000);
        return true;
      }
      const firstLink = document.querySelector('a[href*="/maps/place/"]');
      const panel = firstLink ? firstLink.closest('div.m6QErb') : null;
      if (panel) {
        panel.scrollBy(0, 2000);
        return true;
      }
      return false;
    });

    if (!scrolled) break;
    
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    // Check if bottom of feed is reached
    const isEnd = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes("You've reached the end of the list") || 
             bodyText.includes("Ende der Liste erreicht");
    });
    if (isEnd) {
      log(`Reached the end of Google Maps list.`);
      break;
    }

    scrollAttempts++;
  }

  // Extract listing URLs
  const listingUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    return anchors.map(a => a.href);
  });

  log(`Collected ${listingUrls.length} total listing URLs. Filtering and inspecting details...`);
  
  const leads = [];
  
  // Deduplicate listing URLs by extracting the unique business name slug segment
  const seenSlugs = new Set();
  const uniqueUrls = [];
  for (const url of listingUrls) {
    const slug = url.split('/maps/place/')[1]?.split('/')[0];
    if (slug) {
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        uniqueUrls.push(url);
      }
    } else if (!uniqueUrls.includes(url)) {
      uniqueUrls.push(url);
    }
  }

  const slicedUrls = uniqueUrls.slice(0, limit * 4);
  
  for (const url of slicedUrls) {
    if (leads.length >= limit) {
      log(`Reached target limit of ${limit} website-less leads.`);
      break;
    }

    log(`Inspecting details for: ${url.substring(0, 50)}...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for client-side JS rendering

      // Scrape details from side panel
      const details = await page.evaluate(() => {
        // Name
        const nameNode = document.querySelector('h1');
        const name = nameNode ? nameNode.innerText.trim() : '';

        // Rating
        const ratingNode = document.querySelector('div.F7nice span[aria-hidden="true"]');
        const rating = ratingNode ? parseFloat(ratingNode.innerText.replace(',', '.')) : null;

        // Reviews Count
        const reviewsNode = document.querySelector('div.F7nice span[aria-label*="reviews"]');
        let reviews = 0;
        if (reviewsNode) {
          const match = reviewsNode.getAttribute('aria-label').match(/\d+/);
          reviews = match ? parseInt(match[0]) : 0;
        }

        // Phone: find button with data-item-id="phone:tel:"
        const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
        const phone = phoneBtn ? phoneBtn.getAttribute('data-item-id').replace('phone:tel:', '').trim() : null;

        // Address: find button with data-item-id="address"
        const addressBtn = document.querySelector('button[data-item-id="address"]');
        const address = addressBtn ? addressBtn.innerText.trim() : '';

        // Category: find text near rating or secondary text label
        const categoryNode = document.querySelector('button[jsaction*="category"]');
        const category = categoryNode ? categoryNode.innerText.trim() : '';

        // Website: check button with data-item-id="authority"
        const websiteBtn = document.querySelector('a[data-item-id="authority"]');
        const website = websiteBtn ? websiteBtn.href : null;

        return { name, rating, reviews, phone, address, category, website };
      });

      if (!details.name) {
        log(`Could not resolve name, skipping listing.`);
        continue;
      }

      log(`Found: "${details.name}" | Rating: ${details.rating} | Website: ${details.website ? details.website : 'NONE'}`);

      // Filter out businesses with website, or with low rating
      if (details.website) {
        log(`Skipping: "${details.name}" has an active website: ${details.website}`);
        continue;
      }

      if (details.rating && details.rating < minRating) {
        log(`Skipping: "${details.name}" rating is too low (${details.rating} < ${minRating})`);
        continue;
      }

      // Add to targets list
      leads.push({
        business_name: details.name,
        category: details.category || 'Local Business',
        location: details.address || query.split('in ')[1] || 'Unknown',
        phone_number: details.phone,
        rating: details.rating,
        reviews_count: details.reviews,
        maps_url: url
      });
      
      log(`Lead Added! Total collected: ${leads.length}`);

    } catch (err) {
      log(`Error scraping detail page: ${err.message}`);
    }
  }

  await browser.close();
  log(`Completed Google Maps Scraping run. Collected ${leads.length} leads.`);
  return leads;
}

// Helper to crawl external directory links and regex match email addresses
async function crawlUrlForEmail(page, url) {
  if (!url || url.includes('google.com') || url.includes('youtube.com') || url.includes('maps.google')) {
    return null;
  }
  try {
    console.log(`[CRAWLER] Browsing link to find email: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    
    // Extract page body text
    const text = await page.evaluate(() => document.body.innerText);
    
    // Regex matching email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    
    if (matches && matches.length > 0) {
      const validEmails = matches.filter(email => {
        const lower = email.toLowerCase();
        return !lower.endsWith('.png') && 
               !lower.endsWith('.jpg') && 
               !lower.endsWith('.webp') &&
               !lower.includes('sentry') &&
               !lower.includes('example.com') &&
               !lower.includes('w3.org');
      });
      if (validEmails.length > 0) {
        const unique = [...new Set(validEmails)];
        console.log(`[CRAWLER] Found candidate emails: ${unique.join(', ')}`);
        return unique[0];
      }
    }
  } catch (err) {
    // Non-blocking failures
  }
  return null;
}

// OSINT: Puppeteer Google Search for social snippets
export async function scrapeSearchSnippets({ businessName, location }) {
  console.log(`[OSINT] Querying Google Search for "${businessName} ${location}" snippets...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Query searches for email, impressum, facebook page and contact info
  const searchQuery = `${businessName} ${location} email facebook instagram impressum`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en`;
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Handle Google Search Cookie Consent form
    try {
      const acceptBtnSelector = 'form[action*="consent.google.com"] button, button[aria-label="Accept all"], button[aria-label="Alle akzeptieren"]';
      const consentBtn = await page.$(acceptBtnSelector);
      if (consentBtn) {
        await consentBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const acceptBtn = buttons.find(b => {
            const txt = b.innerText.toLowerCase();
            return txt.includes('accept all') || txt.includes('alle akzeptieren') || txt.includes('agree') || txt.includes('ich stimme zu') || txt.includes('all accept');
          });
          if (acceptBtn) acceptBtn.click();
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (e) {
      // Non-blocking
    }

    // Extract snippet structures from Google search results
    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.g'));
      return items.slice(0, 5).map(item => {
        const titleNode = item.querySelector('h3');
        const linkNode = item.querySelector('a');
        const snippetNode = item.querySelector('.VwiC3b') || item.querySelector('.s370HD') || item.querySelector('[style*="-webkit-line-clamp"]');
        
        return {
          title: titleNode ? titleNode.innerText : '',
          link: linkNode ? linkNode.href : '',
          snippet: snippetNode ? snippetNode.innerText : ''
        };
      });
    });

    // Deep Crawl external links in parallel for email detection
    const emailPromises = results.map(r => crawlUrlForEmail(page, r.link));
    const crawledEmails = await Promise.all(emailPromises);
    const foundEmails = crawledEmails.filter(Boolean);

    await browser.close();
    
    // Format as string blocks for the LLM, appending any directly crawled email addresses
    let formattedSnippets = results.map((r, i) => {
      return `Result #${i+1}:\nTitle: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}\n---`;
    }).join('\n');

    if (foundEmails.length > 0) {
      formattedSnippets += `\n\n[EXTRACTED EMAILS DIRECTLY FROM SITES] Found verified email candidates: ${[...new Set(foundEmails)].join(', ')}`;
    }

    return formattedSnippets;
  } catch (err) {
    console.error(`[OSINT] Error searching snippets: ${err.message}`);
    await browser.close();
    return 'No search snippets retrieved due to query exception.';
  }
}
