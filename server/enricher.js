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

export async function enrichLeadDetails({ business_name, category, location, phone_number, search_snippets, rating, reviews_count }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[ENRICHER] GEMINI_API_KEY not found in environment, returning mock values.');
    return mockEnrichment(business_name, location, phone_number, rating, reviews_count);
  }

  const targetLang = detectLanguageByLocation(location, phone_number);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
You are an OSINT lead generation assistant. Analyze this local business (which has no website on Google Maps) and enrich the data.

### Input Data:
- Business Name: ${business_name}
- Category: ${category}
- Location: ${location}
- Phone Number: ${phone_number || 'Not available'}
- Google Rating: ${rating || 'N/A'} (${reviews_count || 0} reviews)
- Search Snippets:
${search_snippets}

### Tasks:
1. Check if they actually have an official website somewhere (not Facebook/Instagram/directories). If yes, set status to "Website Exists" and fill discovered_website.
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
- Sound like a 25-year-old web developer texting, not a sales department.

Language-specific rules for WhatsApp:
${targetLang === 'German' ? `
- Write in natural, everyday German. Not formal business German. Use "Sie" but keep it casual.
- MUST start with: "Hallo, ich bin Art Halimi, ich mache Webseiten (arthalimi.com)."
- Keep it short. 4-5 sentences max after the intro.
- Example of the right tone (DO NOT COPY THIS WORD FOR WORD, write something original in this style): "Hab gesehen dass ihr gute Bewertungen auf Google habt aber keine eigene Webseite. Ich mach sowas beruflich und wuerde euch gerne mal nen kostenlosen Entwurf zeigen wie das aussehen koennte. Kein Stress, kein Vertrag. Falls Interesse besteht einfach kurz antworten."
- Sign off with just "Gruss, Art"
` : ''}
${targetLang === 'Albanian' ? `
- Write in natural, everyday Albanian (Kosovo dialect is fine). Not formal. Not literary. Just normal how people talk.
- MUST start with: "Pershendetje, une jam Art Halimi, merrem me web development (arthalimi.com)."
- Keep it short. 4-5 sentences max after the intro.
- Example of the right tone (DO NOT COPY THIS WORD FOR WORD, write something original in this style): "E pashe qe keni vleresime te mira ne Google ama ska webfaqe tuajen. Un i boj webfaqe profesionale dhe doja me ju tregu nje draft falas si mundet me dukje. Pa asnje obligim. Nese ju intereson thjesht me kthy nje pergjigje."
- Sign off with just "Faleminderit, Art"
` : ''}
${targetLang === 'English' ? `
- Write in casual, natural English. Like texting a potential business contact.
- MUST start with: "Hey, I'm Art Halimi, I build websites (arthalimi.com)."
- Keep it short. 4-5 sentences max after the intro.
- Sign off with just "Cheers, Art"
` : ''}

For the email (personalized_body):
- Same vibe as WhatsApp but slightly more structured. Still no emojis. Still human.
- Sign off as "Art Halimi - arthalimi.com"
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
  "personalized_body": "Cold email body in ${targetLang}. Human. No emojis. Signed 'Art Halimi - arthalimi.com'.",
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
  customInstructions = ''
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const targetLang = language || detectLanguageByLocation(location, phone_number);

  if (!apiKey) {
    return generateMockWhatsApp(business_name, targetLang, estimated_owner_name, rating, reviews_count);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Write a WhatsApp message from Art Halimi (web developer, arthalimi.com) to ${business_name}.

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
${targetLang === 'German' ? '   "Hallo, ich bin Art Halimi, ich mache Webseiten (arthalimi.com)."' : ''}
${targetLang === 'Albanian' ? '   "Pershendetje, une jam Art Halimi, merrem me web development (arthalimi.com)."' : ''}
${targetLang === 'English' ? '   "Hey, I\'m Art Halimi, I build websites (arthalimi.com)."' : ''}

7. End casually. "Gruss, Art" or "Faleminderit, Art" or "Cheers, Art". Not some formal corporate signoff.

8. Output ONLY the raw message text. No markdown. No quotes. No explanation. Just the message as it would appear in WhatsApp.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip any emojis that might have slipped through
    const cleaned = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B50}\u{2728}\u{2764}\u{FE0F}\u{200D}\u{20E3}\u{FE0E}\u{E0020}-\u{E007F}]/gu, '').replace(/  +/g, ' ');
    return cleaned;
  } catch (err) {
    console.error(`[GENERATE_WHATSAPP] Error: ${err.message}`);
    return generateMockWhatsApp(business_name, targetLang, estimated_owner_name, rating, reviews_count);
  }
}

function generateMockWhatsApp(business_name, lang, owner, rating, reviews_count) {
  if (lang === 'German') {
    return `Hallo, ich bin Art Halimi, ich mache Webseiten (arthalimi.com).

Hab euer Geschäft auf Google Maps gesehen${rating ? `, ${rating} Sterne` : ''} - sieht gut aus. Mir ist aufgefallen dass ihr keine eigene Webseite habt.

Ich mach sowas beruflich und würde euch gerne mal nen kostenlosen Entwurf zeigen, einfach damit ihr seht wie das aussehen könnte. Kein Vertrag, kein Stress.

Falls Interesse besteht einfach kurz antworten, dann können wir 5 Minuten telefonieren.

Gruss, Art`;
  }

  if (lang === 'Albanian') {
    return `Pershendetje, une jam Art Halimi, merrem me web development (arthalimi.com).

E pashe ${business_name} ne Google Maps${rating ? `, ${rating} yje` : ''}, duket mire. Vetem vura re qe nuk keni nje webfaqe tuajen.

Une i boj webfaqe profesionale dhe doja me ju tregu nje draft falas, vetem me pa se si do te dukej. Pa asnje obligim.

Nese ju intereson, thjesht me kthy nje pergjigje te shkurter.

Faleminderit, Art`;
  }

  return `Hey, I'm Art Halimi, I build websites (arthalimi.com).

Found ${business_name} on Google Maps${rating ? `, ${rating} stars` : ''} - looks solid. Noticed you don't have your own website though.

I do this for a living and I'd be happy to put together a free draft for you, just so you can see what it could look like. No strings attached.

If you're interested just shoot me a quick reply and we can hop on a 5 min call.

Cheers, Art`;
}

function mockEnrichment(business_name, location = '', phone = '', rating = 4.8, reviews_count = 12) {
  const lang = detectLanguageByLocation(location, phone);
  
  let subject, body;

  if (lang === 'German') {
    subject = `Webseite für ${business_name}`;
    body = `Hallo,

ich hab ${business_name} auf Google Maps gefunden und gesehen dass ihr gute Bewertungen habt aber keine eigene Webseite.

Ich bin Webentwickler und mache das beruflich. Würde euch gerne mal einen kostenlosen Entwurf zeigen wie eure Seite aussehen könnte. Kein Vertrag, nichts verbindliches - einfach nur damit ihr seht was möglich wäre.

Falls ihr Interesse habt, meldet euch einfach kurz.

Art Halimi - arthalimi.com`;
  } else if (lang === 'Albanian') {
    subject = `Webfaqe per ${business_name}`;
    body = `Pershendetje,

E pashe ${business_name} ne Google Maps, keni vleresime te mira por nuk keni nje webfaqe tuajen.

Une merrem me web development dhe doja me ju tregu nje draft falas se si do mundet me dukje faqja juaj. Pa asnje obligim.

Nese ju intereson thjesht me kthy nje pergjigje.

Art Halimi - arthalimi.com`;
  } else {
    subject = `Website for ${business_name}`;
    body = `Hi there,

Found ${business_name} on Google Maps - good reviews but no website. I build websites for a living and I'd be happy to put together a free draft for you. No commitment, just to show you what it could look like.

Let me know if you're interested.

Art Halimi - arthalimi.com`;
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
