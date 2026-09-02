import puppeteer from 'puppeteer';

let activeBrowserInstance = null;
let isScrapeAborted = false;

/**
 * Aborts any ongoing Puppeteer scraping session immediately.
 */
export function abortScraping() {
  isScrapeAborted = true;
  if (activeBrowserInstance) {
    try {
      activeBrowserInstance.close().catch(() => {});
    } catch (e) {}
    activeBrowserInstance = null;
  }
}

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
  isScrapeAborted = false;
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
  activeBrowserInstance = browser;

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const leads = [];

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(cleanQuery)}`;
    log(`Navigating to Google Maps search...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle cookie consent dialog
    try {
      log(`Checking for Google cookie consent overlay...`);
      const consentBtn = await page.$('button[aria-label*="Accept all"], button[aria-label*="Alle akzeptieren"], form[action*="consent"] button');
      if (consentBtn) {
        log(`Cookie consent button found. Clicking to dismiss...`);
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
    try {
      await page.waitForSelector(feedSelector, { timeout: 12000 });
    } catch (err) {
      log(`Feed container not found. Checking for place links...`);
      const hasLinks = await page.evaluate(() => document.querySelectorAll('a[href*="/maps/place/"]').length > 0);
      if (!hasLinks) {
        log(`Failed to load Google Maps search results (no place links found).`);
        return [];
      }
      log(`Found place links on page. Proceeding with search execution.`);
    }

    // Scroll results panel
    log(`Scrolling results panel to collect listing cards...`);
    let scrollAttempts = 0;
    const maxScrolls = 15;
    
    while (scrollAttempts < maxScrolls) {
      if (isScrapeAborted) {
        log('[ABORTED] Scraping cancelled by user.');
        break;
      }

      const listingsCount = await page.evaluate(() => {
        return document.querySelectorAll('a[href*="/maps/place/"]').length;
      });
      
      log(`Found ${listingsCount} listings in scroll buffer...`);
      if (listingsCount >= Math.max(30, limit * 3.5)) break;

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
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
    
    // Deduplicate listing URLs
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

    // Inspect up to 30 candidates or until target limit is met
    const slicedUrls = uniqueUrls.slice(0, Math.min(uniqueUrls.length, Math.max(25, limit * 3)));
    
    for (const url of slicedUrls) {
      if (isScrapeAborted) {
        log('[ABORTED] Scraping cancelled by user.');
        break;
      }

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

          // Phone
          const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
          const phone = phoneBtn ? phoneBtn.getAttribute('data-item-id').replace('phone:tel:', '').trim() : null;

          // Address with unicode cleanup
          const addressBtn = document.querySelector('button[data-item-id="address"]');
          const rawAddress = addressBtn ? addressBtn.innerText.trim() : '';
          const address = rawAddress
            .replace(/[\uE000-\uF8FF]/gu, '') // strip Private Use Area unicode icons like 
            .replace(/\n+/g, ', ')
            .replace(/\s+/g, ' ')
            .trim();

          // Category
          const categoryNode = document.querySelector('button[jsaction*="category"]');
          const category = categoryNode ? categoryNode.innerText.trim() : '';

          // Helper to unwrap google redirect URL and clean
          const extractCleanExternalUrl = (href) => {
            if (!href) return null;
            try {
              if (href.includes('google.com/url?') || href.includes('google.com/maps/url?')) {
                const u = new URL(href);
                const target = u.searchParams.get('q') || u.searchParams.get('url');
                if (target && !target.includes('google.com') && !target.includes('goo.gl')) return target;
              }
              const lower = href.toLowerCase();
              if (!lower.includes('google.com') && !lower.includes('goo.gl') && !lower.includes('gstatic.com') && !lower.includes('ggpht.com')) {
                return href;
              }
            } catch (e) {}
            return null;
          };

          // Website Detection
          let website = null;

          // 1. Check data-item-id="authority"
          const websiteBtn = document.querySelector('a[data-item-id^="authority"], button[data-item-id^="authority"] a, a[data-item-id="authority"]');
          if (websiteBtn && websiteBtn.href) {
            const unwrapped = extractCleanExternalUrl(websiteBtn.href);
            if (unwrapped) website = unwrapped;
          }

          // 2. Check localized aria-labels and tooltips (EN, DE, AL, FR, IT, ES, etc.)
          if (!website) {
            const websiteSelector = [
              'a[aria-label*="website" i]',
              'a[aria-label*="webseite" i]',
              'a[aria-label*="uebsajt" i]',
              'a[aria-label*="faqja" i]',
              'a[aria-label*="site" i]',
              'a[aria-label*="sitio" i]',
              'a[data-tooltip*="website" i]',
              'a[data-tooltip*="webseite" i]',
              'a[data-tooltip*="site" i]',
              'a[data-tooltip*="uebsajt" i]'
            ].join(',');
            const altWebsiteAnchor = document.querySelector(websiteSelector);
            if (altWebsiteAnchor && altWebsiteAnchor.href) {
              const unwrapped = extractCleanExternalUrl(altWebsiteAnchor.href);
              if (unwrapped) website = unwrapped;
            }
          }

          // 3. Check for Globe SVG Icon or action buttons with globe graphic
          if (!website) {
            const allActionLinks = Array.from(document.querySelectorAll('a[role="button"], button a, a[data-item-id]'));
            for (const link of allActionLinks) {
              const unwrapped = extractCleanExternalUrl(link.href);
              if (unwrapped) {
                const text = link.innerText.toLowerCase();
                if (text.includes('website') || text.includes('webseite') || text.includes('uebsajt') || text.includes('site') || text.includes('.com') || text.includes('.ch') || text.includes('.de')) {
                  website = unwrapped;
                  break;
                }
              }
            }
          }

          // 4. Fallback: check any external link in the side panel
          if (!website) {
            const allLinks = Array.from(document.querySelectorAll('div[role="main"] a[href^="http"], div[role="region"] a[href^="http"], div.m6QErb a[href^="http"]'));
            for (const link of allLinks) {
              const unwrapped = extractCleanExternalUrl(link.href);
              if (unwrapped) {
                const lower = unwrapped.toLowerCase();
                // Exclude social networks and review directories
                if (!lower.includes('facebook.com') && !lower.includes('instagram.com') && !lower.includes('twitter.com') && !lower.includes('tiktok.com') && !lower.includes('youtube.com')) {
                  website = unwrapped;
                  break;
                }
              }
            }
          }

          return { name, rating, reviews, phone, address, category, website };
        });

        if (!details.name) {
          log(`Could not resolve name, skipping listing.`);
          continue;
        }

        log(`Found: "${details.name}" | Rating: ${details.rating} | Website: ${details.website ? details.website : 'NONE'}`);

        // Filter out businesses with website, or with low rating
        if (details.website) {
          log(`[FILTER] Discarded: "${details.name}" has an active website (${details.website})`);
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
  } catch (outerErr) {
    log(`Scraping interrupted: ${outerErr.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {}
    }
    activeBrowserInstance = null;
  }

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

// Helper to unwrap google redirect URL
function unwrapGoogleUrl(url) {
  if (!url) return '';
  try {
    if (url.includes('google.com/url?') || url.includes('google.com/maps/url?')) {
      const u = new URL(url);
      return u.searchParams.get('q') || u.searchParams.get('url') || url;
    }
  } catch (e) {}
  return url;
}

// Common directory, social, and search domains to exclude when looking for an official website
const DIRECTORY_DOMAINS = [
  'google.', 'facebook.com', 'fb.com', 'instagram.com', 'linkedin.com', 'youtube.com',
  'twitter.com', 'x.com', 'yelp.', 'yellowpages.', 'gelbeseiten.de', 'dasoertliche.de',
  'dastelefonbuch.de', 'local.ch', 'search.ch', 'zefix.ch', 'moneyhouse.ch', 'kompass.com',
  'firmenwissen.de', 'tripadvisor.', 'wlw.de', 'herold.at', 'cylex.', 'golocal.de',
  '11880.com', 'mapquest.com', 'tiktok.com', 'pinterest.com', 'wikipedia.org', 'webwiki.de',
  'branchenbuch.', 'stadtbranchenbuch.', 'firmeneintrag.',
  // Albanian / Balkan directories and classifieds
  'merrjep.', 'dyqani.', 'veturaneshitje.', 'findglocal.', 'infoproff.', 'teve1.', 'gazeta',
  'kallxo.', 'indeksonline.', 'telegrafi.', 'rks-gov.', 'atlas-studio.', 'gjirafa.'
];

function isDirectoryOrSocialUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DIRECTORY_DOMAINS.some(d => host.includes(d));
  } catch (e) {
    return true;
  }
}

/**
 * Direct Domain Prober
 * Checks if the exact business name has an active commercial domain (e.g. autosallonipo.com)
 */
export async function probeDirectDomain(businessName, location = '') {
  if (!businessName) return null;
  const clean = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean || clean.length < 3) return null;

  const loc = (location || '').toLowerCase();
  const extensions = ['.com', '.net'];
  if (loc.includes('schweiz') || loc.includes('switzerland') || loc.includes('zürich') || loc.includes('bern')) {
    extensions.unshift('.ch');
  } else if (loc.includes('deutschland') || loc.includes('germany') || loc.includes('hamburg') || loc.includes('berlin')) {
    extensions.unshift('.de');
  } else if (loc.includes('österreich') || loc.includes('austria') || loc.includes('wien')) {
    extensions.unshift('.at');
  } else if (loc.includes('kosov') || loc.includes('prishtin') || loc.includes('albania') || loc.includes('tiran')) {
    extensions.unshift('.al');
  }

  const candidateUrls = [];
  for (const ext of extensions) {
    candidateUrls.push(`https://${clean}${ext}`);
    candidateUrls.push(`https://www.${clean}${ext}`);
  }

  // Probe candidates with fast timeout
  for (const candidate of candidateUrls.slice(0, 4)) {
    try {
      const res = await fetch(candidate, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2500),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.status >= 200 && res.status < 400) {
        console.log(`[DIRECT PROBE SHIELD] Detected live website for "${businessName}": ${candidate} (Status ${res.status})`);
        return candidate;
      }
    } catch (e) {
      // not reachable
    }
  }
  return null;
}

// OSINT: Puppeteer Google Search for social snippets & active website detection
export async function scrapeSearchSnippets({ businessName, location }) {
  console.log(`[OSINT] Querying Google Search for "${businessName} ${location}" snippets...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Clean location string and extract city
  const cleanLoc = (location || '')
    .replace(/[\uE000-\uF8FF]/gu, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const locParts = cleanLoc.split(',').map(s => s.trim()).filter(Boolean);
  const city = locParts.length > 1 ? locParts[locParts.length - 1].replace(/\b\d{4,5}\b/g, '').trim() : cleanLoc;

  // Query searches for email, impressum, website, and company identity
  const searchQuery = `"${businessName}" ${city || ''} email impressum website`;
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
      return items.slice(0, 6).map(item => {
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

    // Domain Shield: Check if any organic search result link is an official company domain
    let detectedLiveWebsite = null;
    const cleanBizName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const bizWords = businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !['gmbh', 'ag', 'und', 'and', 'the', 'der', 'die', 'das', 'co', 'kg', 'e.k.', 'ltd', 'inc', 'sallon', 'autosallon', 'auto'].includes(w));

    for (const r of results) {
      const cleanUrl = unwrapGoogleUrl(r.link);
      if (!cleanUrl || isDirectoryOrSocialUrl(cleanUrl)) continue;
      try {
        const host = new URL(cleanUrl).hostname.toLowerCase().replace(/^www\./, '');
        const hostClean = host.replace(/[^a-z0-9]/g, '');
        
        // Check if hostname strongly matches business name
        const matchesName = (cleanBizName.length >= 4 && hostClean.includes(cleanBizName.slice(0, 7))) ||
                            bizWords.some(w => w.length >= 3 && host.includes(w)) ||
                            (r.title && r.title.toLowerCase().includes(businessName.toLowerCase()));

        if (matchesName) {
          detectedLiveWebsite = cleanUrl;
          console.log(`[OSINT SHIELD] Detected potential active website: ${cleanUrl} for "${businessName}"`);
          break;
        }
      } catch (uErr) {
        // ignore
      }
    }

    // Crawl external links sequentially for candidate email detection
    const foundEmails = [];
    const candidateLinks = results
      .map(r => unwrapGoogleUrl(r.link))
      .filter(l => l && !l.includes('google.com') && !l.includes('youtube.com'))
      .slice(0, 3);

    for (const link of candidateLinks) {
      try {
        const candidateEmail = await crawlUrlForEmail(page, link);
        if (candidateEmail) {
          foundEmails.push(candidateEmail);
        }
      } catch (crawlErr) {
        // Non-blocking
      }
    }

    await browser.close();
    
    // Format as string blocks for the LLM, appending any directly crawled email addresses and detected websites
    let formattedSnippets = results.map((r, i) => {
      const cleanLink = unwrapGoogleUrl(r.link);
      return `Result #${i+1}:\nTitle: ${r.title}\nLink: ${cleanLink}\nSnippet: ${r.snippet}\n---`;
    }).join('\n');

    if (detectedLiveWebsite) {
      formattedSnippets += `\n\n[DETECTED ACTIVE COMPANY DOMAIN VIA ORGANIC SEARCH] Official Website: ${detectedLiveWebsite}`;
    }

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
