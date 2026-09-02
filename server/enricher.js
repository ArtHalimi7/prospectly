import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

export function detectLanguageByLocation(location = '', phone = '') {
  const combined = location.toLowerCase();
  const phoneClean = phone ? phone.replace(/\D/g, '') : '';

  // 1. Phone prefix checks (Highest Priority)
  if (phoneClean) {
    if (phoneClean.startsWith('383') || phoneClean.startsWith('355')) {
      return 'Albanian';
    }
    if (phoneClean.startsWith('49')) {
      return 'German';
    }
    if (/^04[34589]\d+/.test(phoneClean)) {
      return 'Albanian';
    }
    if (/^06[789]\d+/.test(phoneClean)) {
      return 'Albanian';
    }
    if (/^01[567]\d+/.test(phoneClean)) {
      return 'German';
    }
  }

  // 2. Text keyword checks for Kosovo / Albania
  const albanianKeywords = [
    'albania', 'kosovo', 'shqipëri', 'shqiperi', 'kosovë', 'kosove',
    'pristina', 'prishtine', 'prishtinë', 'prishtina', 'tirana', 'tirane', 'tiranë',
    'gjilan', 'prizren', 'peja', 'peje', 'pejë', 'ferizaj', 'mitrovica', 'mitrovicë',
    'gjakova', 'gjakove', 'gjakovë', 'shkodra', 'shkodër', 'vlore', 'vlorë', 
    'durres', 'durrës', 'podujeve', 'podujevë', 'skenderaj', 'deçan', 'decan',
    'shqip'
  ];
  
  const isAlbanian = albanianKeywords.some(kw => combined.includes(kw));
  if (isAlbanian) return 'Albanian';

  // 3. Text keyword checks for Germany / Austria / Switzerland
  const germanKeywords = [
    'germany', 'deutschland', 'gelsenkirchen', 'düsseldorf', 'duesseldorf', 
    'essen', 'neuss', 'ratingen', 'köln', 'koeln', 'münchen', 'muenchen', 
    'berlin', 'hamburg', 'frankfurt', 'stuttgart', 'dortmund', 'bochum', 
    'duisburg', 'wuppertal', 'bonn', 'münster', 'muenster', 'karlsruhe', 
    'mannheim', 'wiesbaden', 'straße', 'str.', 'weg', 'allee', 'platz',
    'switzerland', 'schweiz', 'zürich', 'zurich', 'bern', 'basel', 'luzern',
    'austria', 'österreich', 'wien', 'graz', 'salzburg', 'innsbruck'
  ];
  
  const hasGermanZip = /\b\d{5}\b/.test(combined);
  const isGerman = germanKeywords.some(kw => combined.includes(kw)) || hasGermanZip;

  if (isGerman) return 'German';
  return 'English';
}

export function classifyPhoneNumber(phone = '', location = '') {
  if (!phone || typeof phone !== 'string') {
    return { type: 'none', whatsapp_status: 'none', formatted: '', label: 'No Phone' };
  }

  const rawDigits = phone.replace(/\D/g, '');
  const loc = (location || '').toLowerCase();
  
  if (!rawDigits || rawDigits.length < 5) {
    return { type: 'none', whatsapp_status: 'none', formatted: phone, label: 'Invalid' };
  }

  // Germany (015x, 016x, 017x or 4915x, 4916x, 4917x)
  if (/^(?:49)?0?1[567]\d{7,9}$/.test(rawDigits) || /^(?:49)?1[567]\d{7,9}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Switzerland (075, 076, 077, 078, 079 or 4175..4179)
  if (/^(?:41)?0?7[56789]\d{7}$/.test(rawDigits) || /^(?:41)?7[56789]\d{7}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Kosovo (383 43..49 or 043..049)
  if (/^(?:383)?0?4[3456789]\d{6}$/.test(rawDigits) || /^(?:383)?4[3456789]\d{6}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Albania (355 67..69 or 067..069)
  if (/^(?:355)?0?6[789]\d{7}$/.test(rawDigits) || /^(?:355)?6[789]\d{7}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Austria (43 650..699 or 0650..0699)
  if (/^(?:43)?0?6(?:50|60|64|76|80|99)\d{5,8}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // UK (44 7xxx or 07xxx)
  if (/^(?:44)?0?7\d{9}$/.test(rawDigits)) {
    return { type: 'mobile', whatsapp_status: 'ready', formatted: phone, label: 'WA Ready' };
  }

  // Regional Landlines:
  // German landlines: 02xx (e.g. 0209 Gelsenkirchen), 03xx, 04xx (040 Hamburg), 05xx, 06xx, 07xx, 08xx, 09xx
  // Swiss landlines: +41 44 (Zurich), 022 (Geneva), 031 (Bern), 061 (Basel), etc.
  if (/^(?:49|41|43|383|355)?0?[2345689]/.test(rawDigits)) {
    return { type: 'landline', whatsapp_status: 'landline', formatted: phone, label: 'Landline' };
  }

  return { type: 'unknown', whatsapp_status: 'unknown', formatted: phone, label: 'Unknown' };
}

export async function enrichLeadDetails({ 
  business_name, 
  category, 
  location, 
  phone_number, 
  search_snippets, 
  rating, 
  reviews_count,
  sender_name = 'Art Halimi',
  sender_profession = 'Web Developer',
  sender_portfolio = 'arthalimi.com'
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const phoneClassification = classifyPhoneNumber(phone_number, location);

  // Fast pre-check: if snippets explicitly detected an active company domain, auto-flag it
  const explicitDomainMatch = search_snippets && search_snippets.match(/\[DETECTED ACTIVE COMPANY DOMAIN VIA ORGANIC SEARCH\] Official Website:\s*(https?:\/\/[^\s]+)/i);
  if (explicitDomainMatch && explicitDomainMatch[1]) {
    console.log(`[ENRICHER SHIELD] Discovered live official website via search: ${explicitDomainMatch[1]}`);
    return {
      business_name,
      status: 'Website Exists',
      discovered_website: explicitDomainMatch[1],
      phone_type: phoneClassification.type,
      whatsapp_status: phoneClassification.whatsapp_status
    };
  }

  if (!apiKey) {
    console.warn('[ENRICHER] GEMINI_API_KEY not found in environment, returning mock values.');
    const mock = mockEnrichment(business_name, location, phone_number, rating, reviews_count, sender_name, sender_profession, sender_portfolio);
    return {
      ...mock,
      phone_type: phoneClassification.type,
      whatsapp_status: phoneClassification.whatsapp_status
    };
  }

  const targetLang = detectLanguageByLocation(location, phone_number);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const portfolioSnippet = sender_portfolio ? ` (${sender_portfolio})` : '';

    const prompt = `
You are an OSINT lead generation assistant. Analyze this local business (which has no website on Google Maps) and enrich the data.
Outreach pitches must be written as coming from: ${sender_name} (${sender_profession}${portfolioSnippet}).

### Input Data:
- Business Name: ${business_name}
- Category: ${category}
- Location: ${location}
- Phone Number: ${phone_number || 'Not available'}
- Google Rating: ${rating || 'N/A'} (${reviews_count || 0} reviews)
- Search Snippets:
${search_snippets}

### Tasks:
1. STRICT WEBSITE CHECK: Check if they actually have an official commercial website somewhere online (excluding generic business directories like Local.ch, Moneyhouse, Zefix, GelbeSeiten, Facebook, Instagram). If they have an active website (e.g. tec-schweiz.ch, example.de), set status to "Website Exists" and fill discovered_website with the full URL.
2. Try to find the owner/decision-maker name.
3. Find a direct contact email if possible.
4. Write a cold email and a WhatsApp message in **${targetLang}**.

### CRITICAL WRITING RULES - READ CAREFULLY:
The WhatsApp message and email MUST sound like a real human being wrote them. NOT like AI. NOT like marketing copy. Like a real person casually texting someone about business.

Rules:
- ZERO emojis. Not a single one. No stars, no rockets, no phones, no sparkles. Nothing.
- No corporate buzzwords. No "high-converting", no "leverage", no "unlock potential", no "dedicated online presence", no "herausragend", no "beeindruckend".
- No exclamation marks spam. Use them sparingly, max 1 in the whole message.
- Short sentences. The way people actually text.
- Don't congratulate them on their rating like some marketing bot. Just mention it naturally: "I saw you have good reviews on Google" or "hab gesehen ihr habt gute Bewertungen" -- that is it.
- Don't oversell. Don't list 5 benefits of having a website. Just say you noticed they don't have one, you make websites, you would show them a free draft if they are interested.
- Sound like a professional independent ${sender_profession} texting, not a sales department.

Language-specific rules for WhatsApp:
${targetLang === 'German' ? `
- Write in natural, everyday German. Not formal business German. Use "Sie" but keep it casual.
- MUST start with: "Hallo, ich bin ${sender_name}, ich mache Webseiten${portfolioSnippet}."
- Keep it short. 4-5 sentences max after the intro.
- Example of the right tone (DO NOT COPY THIS WORD FOR WORD, write something original in this style): "Hab gesehen dass ihr gute Bewertungen auf Google habt aber keine eigene Webseite. Ich mach sowas beruflich und wuerde euch gerne mal nen kostenlosen Entwurf zeigen wie das aussehen koennte. Kein Stress, kein Vertrag. Falls Interesse besteht einfach kurz antworten."
- Sign off with just "Gruss, ${sender_name.split(' ')[0]}"
` : ''}
${targetLang === 'Albanian' ? `
- Write in natural, spoken Kosovo-Albanian. NOT literary textbook Albanian from Tirana, and NOT robotic Google Translate. Write how a real web developer naturally texts on WhatsApp in Kosovo.
- Follow this exact natural structure:
  1. "Pershendetje, une jam ${sender_name}..."
  2. "Jam ${sender_profession}, pra me profesion krijoj website per biznese te ndryshme."
  3. "E pashe [emrin e biznesit] ne Google Maps, dhe e pashe qe keni kogja vlersime te mira."
  4. "Nese jeni te interesum, mundem me jau kriju nje dizajn koncept se qysh mundet mu dok nje faqe per biznesin tuj, pa asnje obligim, dhe nese ju pelqen mundemi me diskutu per detaje."
  5. Sign off: "Faleminderit, ${sender_name.split(' ')[0]}"
- Vocabulary & Grammar rules:
  - Use "qysh mundet mu dok" (NEVER say "si mundet me dukje")
  - Use "dizajn koncept" (NEVER say "draft falas si mundet me dukje")
  - Use "biznesin tuj" or "sallonin tuj"
  - Use "kogja vlersime te mira"
  - NEVER say "Une i boj webfaqe profesionale" (grammatically broken)
  - NEVER say "thjesht me kthy nje pergjigje" (awkward English translation)
` : ''}
${targetLang === 'English' ? `
- Write in casual, natural English. Like texting a potential business contact.
- MUST start with: "Hey, I'm ${sender_name}, I build websites${portfolioSnippet}."
- Keep it short. 4-5 sentences max after the intro.
- Sign off with just "Cheers, ${sender_name.split(' ')[0]}"
` : ''}

For the email (personalized_body):
- Same vibe as WhatsApp but slightly more structured. Still no emojis. Still human.
- Sign off as "${sender_name}${portfolioSnippet ? ` - ${sender_portfolio}` : ''}"
- If German: Use "Sie" form but don't be stiff.
- If Albanian: Keep it simple and direct.

### Output JSON (strict format, no extra text):
{
  "business_name": "Verified Business Name",
  "status": "Lead Found" or "Website Exists" or "No Context Found",
  "discovered_website": "https://domain.com or null",
  "estimated_owner_name": "Full Name or 'Unknown'",
  "primary_contact_email": "email@domain.com or null",
  "primary_social_pitch_url": "Direct link to FB/IG messaging or null",
  "confidence_score": "High" or "Medium" or "Low",
  "quick_pitch_hook": "One short sentence about their situation, no emojis.",
  "personalized_subject": "Short email subject, no emojis, in ${targetLang}.",
  "personalized_body": "Cold email body in ${targetLang}. Human. No emojis. Signed '${sender_name}'.",
  "personalized_whatsapp": "WhatsApp message in ${targetLang}. Sounds like a real person texting. No emojis. Starts with the required intro line."
}
`;

    console.log(`[ENRICHER] Invoking Gemini model for: "${business_name}"... (Target Language: ${targetLang})`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();

    console.log(`[ENRICHER] Model responded. Parsing JSON...`);
    const enrichedData = JSON.parse(jsonText);
    return enrichedData;

  } catch (err) {
    console.error(`[ENRICHER] Gemini Enrichment failed: ${err.message}`);
    return mockEnrichment(business_name, location, phone_number, rating, reviews_count);
  }
}

export async function generateCustomWhatsApp({
  business_name,
  category = 'Local Business',
  location = '',
  phone_number = '',
  rating = 5.0,
  reviews_count = 0,
  estimated_owner_name = '',
  language = null,
  tone = 'Professional & Friendly',
  customInstructions = '',
  sender_name = 'Art Halimi',
  sender_profession = 'Web Developer',
  sender_portfolio = 'arthalimi.com'
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const rawLang = language || detectLanguageByLocation(location, phone_number);
  const targetLang = (rawLang === 'Deutsch' || rawLang === 'German') ? 'German' : (rawLang === 'Albanian' ? 'Albanian' : 'English');

  if (!apiKey) {
    return generateMockWhatsApp(business_name, targetLang, estimated_owner_name, rating, reviews_count, sender_name, sender_profession, sender_portfolio);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const portfolioSnippet = sender_portfolio ? ` (${sender_portfolio})` : '';

    const prompt = `
Write a WhatsApp message from ${sender_name} (${sender_profession}${portfolioSnippet}) to ${business_name}.

Context:
- Business: ${business_name} (${category})
- Location: ${location}
- Rating: ${rating || 'good'} stars, ${reviews_count || 0} reviews on Google
- Contact: ${estimated_owner_name && estimated_owner_name !== 'Unknown' ? estimated_owner_name : 'the business'}
- Language: ${targetLang}
- Tone: ${tone}
${customInstructions ? `- Extra instructions: ${customInstructions}` : ''}

CRITICAL RULES - this is the most important part:

1. ZERO emojis. Absolutely none. Not one. If you put a single emoji I will reject the entire output.

2. This has to sound like a real person wrote it. Like someone actually typing on their phone. Not marketing copy. Not AI. Not a template.

3. Keep it SHORT. Like 5-7 lines max. Nobody reads long WhatsApp messages from strangers.

4. Don't be cringe. Don't say "beeindruckend" or "hervorragend" or "herausragend" or "ausgezeichnet" in German. Don't say "shkelqyer" or "mbreslenese" or "jashtezakonisht" in Albanian. Just talk normal.

5. Don't list benefits of having a website. Just say you noticed they don't have one and you would make them a free draft to see if they like it.

6. Starting line MUST be:
${targetLang === 'German' ? `   "Hallo, ich bin ${sender_name}, ich mache Webseiten${portfolioSnippet}."` : ''}
${targetLang === 'Albanian' ? `   "Pershendetje, une jam ${sender_name}..." followed by "Jam ${sender_profession}, pra me profesion krijoj website per biznese te ndryshme."` : ''}
${targetLang === 'English' ? `   "Hey, I'm ${sender_name}, I build websites${portfolioSnippet}."` : ''}

7. End casually. "Gruss, ${sender_name.split(' ')[0]}" or "Faleminderit, ${sender_name.split(' ')[0]}" or "Cheers, ${sender_name.split(' ')[0]}". Not some formal corporate signoff.

${targetLang === 'Albanian' ? `
CRITICAL ALBANIAN (KOSOVO) PHRASING:
- Say "qysh mundet mu dok" (NEVER say "si mundet me dukje")
- Say "dizajn koncept se qysh mundet mu dok nje faqe per biznesin tuj, pa asnje obligim"
- Say "kogja vlersime te mira"
- Say "nese ju pelqen mundemi me diskutu per detaje"
- End with "Faleminderit, ${sender_name.split(' ')[0]}"
` : ''}

8. Output ONLY the raw message text. No markdown. No quotes. No explanation. Just the message as it would appear in WhatsApp.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip any emojis that might have slipped through
    const cleaned = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B50}\u{2728}\u{2764}\u{FE0F}\u{200D}\u{20E3}\u{FE0E}\u{E0020}-\u{E007F}]/gu, '').replace(/  +/g, ' ');
    return cleaned;
  } catch (err) {
    console.error(`[GENERATE_WHATSAPP] Error: ${err.message}`);
    return generateMockWhatsApp(business_name, targetLang, estimated_owner_name, rating, reviews_count, sender_name, sender_profession, sender_portfolio);
  }
}

function generateMockWhatsApp(business_name, lang, owner, rating, reviews_count, sender_name = 'Art Halimi', sender_profession = 'Web Developer', sender_portfolio = 'arthalimi.com') {
  const firstName = sender_name.split(' ')[0] || 'Art';
  const portfolioSnippet = sender_portfolio ? ` (${sender_portfolio})` : '';

  if (lang === 'German') {
    return `Hallo, ich bin ${sender_name}, ich mache Webseiten${portfolioSnippet}.

Hab euer Geschäft auf Google Maps gesehen${rating ? `, ${rating} Sterne` : ''} - sieht gut aus. Mir ist aufgefallen dass ihr keine eigene Webseite habt.

Ich mach sowas beruflich und würde euch gerne mal nen kostenlosen Entwurf zeigen, einfach damit ihr seht wie das aussehen könnte. Kein Vertrag, kein Stress.

Falls Interesse besteht einfach kurz antworten, dann können wir 5 Minuten telefonieren.

Gruss, ${firstName}`;
  }

  if (lang === 'Albanian') {
    return `Pershendetje, une jam ${sender_name}...

Jam ${sender_profession}, pra me profesion krijoj website per biznese te ndryshme.

E pashe ${business_name} ne Google Maps, dhe e pashe qe keni kogja vlersime te mira${rating ? ` (${rating} yje)` : ''}.

Nese jeni te interesum, mundem me jau kriju nje dizajn koncept se qysh mundet mu dok nje faqe per biznesin tuj, pa asnje obligim, dhe nese ju pelqen mundemi me diskutu per detaje.

Faleminderit, ${firstName}`;
  }

  return `Hey, I'm ${sender_name}, I build websites${portfolioSnippet}.

Found ${business_name} on Google Maps${rating ? `, ${rating} stars` : ''} - looks solid. Noticed you don't have your own website though.

I do this for a living and I'd be happy to put together a free draft for you, just so you can see what it could look like. No strings attached.

If you're interested just shoot me a quick reply and we can hop on a 5 min call.

Cheers, ${firstName}`;
}

function mockEnrichment(business_name, location = '', phone = '', rating = 4.8, reviews_count = 12, sender_name = 'Art Halimi', sender_profession = 'Web Developer', sender_portfolio = 'arthalimi.com') {
  const lang = detectLanguageByLocation(location, phone);
  const firstName = sender_name.split(' ')[0] || 'Art';
  const portfolioSnippet = sender_portfolio ? ` (${sender_portfolio})` : '';
  
  let subject, body;

  if (lang === 'German') {
    subject = `Webseite für ${business_name}`;
    body = `Hallo,

ich hab ${business_name} auf Google Maps gefunden und gesehen dass ihr gute Bewertungen habt aber keine eigene Webseite.

Ich bin ${sender_profession} und mache das beruflich. Würde euch gerne mal einen kostenlosen Entwurf zeigen wie eure Seite aussehen könnte. Kein Vertrag, nichts verbindliches - einfach nur damit ihr seht was möglich wäre.

Falls ihr Interesse habt, meldet euch einfach kurz.

${sender_name}${portfolioSnippet ? ` - ${sender_portfolio}` : ''}`;
  } else if (lang === 'Albanian') {
    subject = `Dizajn koncept per ${business_name}`;
    body = `Pershendetje,

Une jam ${sender_name}, jam ${sender_profession} dhe me profesion krijoj website per biznese te ndryshme.

E pashe ${business_name} ne Google Maps dhe vura re qe keni kogja vleresime te mira, mirepo nuk keni nje faqe tuajen ne internet.

Nese jeni te interesuar, mundem me jau kriju nje dizajn koncept se qysh mundet mu dok nje faqe per biznesin tuaj, pa asnje obligim, dhe nese ju pelqen mundemi me diskutu per detaje.

Faleminderit,
${firstName}${portfolioSnippet ? ` (${sender_portfolio})` : ''}`;
  } else {
    subject = `Website for ${business_name}`;
    body = `Hi there,

Found ${business_name} on Google Maps - good reviews but no website. I build websites for a living and I'd be happy to put together a free draft for you. No commitment, just to show you what it could look like.

Let me know if you're interested.

${sender_name}${portfolioSnippet ? ` - ${sender_portfolio}` : ''}`;
  }

  const whatsapp = generateMockWhatsApp(business_name, lang, 'Unknown', rating, reviews_count);

  return {
    business_name: business_name,
    status: "Lead Found",
    discovered_website: null,
    estimated_owner_name: "Unknown",
    primary_contact_email: null,
    primary_social_pitch_url: null,
    confidence_score: "Low",
    quick_pitch_hook: lang === 'German'
      ? `Gute Google-Bewertungen aber keine eigene Webseite.`
      : lang === 'Albanian'
        ? `Vleresime te mira ne Google por pa webfaqe.`
        : `Good Google reviews but no website.`,
    personalized_subject: subject,
    personalized_body: body,
    personalized_whatsapp: whatsapp
  };
}
