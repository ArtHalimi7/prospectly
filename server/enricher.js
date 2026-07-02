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
    'mannheim', 'wiesbaden', 'straße', 'str.', 'weg', 'allee', 'platz'
  ];
  
  const hasGermanZip = /\b\d{5}\b/.test(combined);
  const isGerman = germanKeywords.some(kw => combined.includes(kw)) || hasGermanZip;

  if (isGerman) return 'German';
  return 'English';
}

export async function enrichLeadDetails({ business_name, category, location, phone_number, search_snippets }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[ENRICHER] GEMINI_API_KEY not found in environment, returning mock values.');
    return mockEnrichment(business_name, location, phone_number);
  }

  const targetLang = detectLanguageByLocation(location, phone_number);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
You are an expert OSINT (Open-Source Intelligence) and B2B lead generation assistant specializing in local business data enrichment and personalized sales copywriting. 

Your objective is to analyze the provided raw Google Maps data of a local business that lacks a website, and perform targeted, step-by-step reasoning to:
1. Determine if they already have an official website anywhere on the internet that wasn't listed on Google Maps.
2. Uncover the direct contact details of the owner or decision-maker.
3. Draft a highly personalized, custom cold email outreach subject and body specifically tailored for them.

### Input Data Provided:
- Business Name: ${business_name}
- Category: ${category}
- Location: ${location}
- Phone Number: ${phone_number || 'Not available'}
- Raw Social Links and Search Snippets found via Search:
${search_snippets}

### Your Task Execution Strategy:
1. Identify the Digital Footprint: Analyze the business name and location. Determine the most likely platforms where a local business of this type would manage their presence (e.g., Facebook Pages, Instagram, local business registries, Impressum listings).
2. Check for Existing Official Website: Check the search snippets and URLs carefully. If you discover they actually *do* have an official business website (e.g. \`autosallonipo.com\` or \`dioniauto.de\`, excluding general directories like Yelp, GelbeSeiten, Facebook, Instagram, or maps), set \`status\` to \`Website Exists\` and output the website URL in \`discovered_website\`.
3. Extract the Decision-Maker: Search for signs of ownership. Look for phrases like "Owner," "Geschäftsführer," "Inhaber," "Founder," or names attached to the public legal registration or social media "About" sections.
4. Clean & Validate: Isolate the most direct contact method. Prioritize a direct personal/business email over a generic contact form.
5. Language Requirement:
   - You MUST write the \`personalized_subject\` and \`personalized_body\` in: **${targetLang}**.
   - If language is **German**: Use formal, polite address ("Sie", e.g., "Sehr geehrter Herr/Frau [Name]" or "Sehr geehrter Inhaber").
   - If language is **Albanian**: Write in extremely natural, modern, and casual Albanian as spoken and typed online in Kosovo and Albania. Use standard letters 'e' instead of diacritic/umlaut 'ë' and 'c' instead of 'ç' (e.g. write "Pershendetje, pashe qe keni vleresime shume te mira..." instead of "I nderuar pronar, pashë vlerësimet tona të shkëlqyera..."). Make it sound natural, human, and professional, like a direct message.
   - Sign off the pitch formally as: "Art Halimi - arthalimi.com". Do NOT use placeholders like "[Your Name]" or "[Your Company Name]". Sign it off exactly as "Art Halimi - arthalimi.com".
6. Draft Personalized Email Pitch:
   - Write a custom subject line (\`personalized_subject\`) that is short, intriguing, and mentions their business or high reviews.
   - Write a complete, highly personalized cold email body (\`personalized_body\`) of 2-3 paragraphs. Mention their Google reviews/rating, point out that they have excellent reviews but lack a website to directly convert visitors into customers, explain how a fast landing page with direct bookings will help them, and suggest a 5-minute chat. Address the owner by name if known, otherwise use a polite general title.

### Output Format:
Provide your findings in a strict, clean JSON format with NO conversational filler, so it can be parsed directly into a database. Make sure you return EXACTLY this JSON structure:

{
  "business_name": "Verified Business Name",
  "status": "Lead Found" or "Website Exists" or "No Context Found",
  "discovered_website": "https://domain.com or null",
  "estimated_owner_name": "Full Name or 'Unknown'",
  "primary_contact_email": "email@domain.com or null",
  "primary_social_pitch_url": "Direct link to FB/IG messaging or null",
  "confidence_score": "High" or "Medium" or "Low",
  "quick_pitch_hook": "A 1-sentence personalized pitch hook mentioning their high reviews and how a website can help them scale.",
  "personalized_subject": "Custom subject line written in the native country language.",
  "personalized_body": "Custom 2-to-3 paragraph cold email written in the native country language, signed off as 'Art Halimi - arthalimi.com'."
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
    return mockEnrichment(business_name, location, phone_number);
  }
}

function mockEnrichment(business_name, location = '', phone = '') {
  const lang = detectLanguageByLocation(location, phone);
  
  let subject = `💡 Website suggestion for ${business_name}`;
  let body = `Hi there,\n\nI was looking up local businesses and loved your Google Reviews! However, I noticed you do not have a website yet; I'd love to build one to help you showcase your quality work.\n\nBest regards,\nArt Halimi - arthalimi.com`;

  if (lang === 'German') {
    subject = `💡 Website-Vorschlag für ${business_name}`;
    body = `Sehr geehrter Inhaber,\n\nich habe Ihre hervorragenden Bewertungen auf Google Maps gesehen und mich gewundert, warum ein so toller Betrieb noch keine eigene Website hat. In der heutigen Zeit ist eine professionelle Webpräsenz entscheidend, um direkt Kunden zu gewinnen.\n\nIch würde Ihnen gerne einen kostenlosen Entwurf zeigen, wie Ihre Website aussehen könnte. Hätten Sie diese Woche Zeit für ein kurzes 5-Minuten-Gespräch?\n\nMit freundlichen Grüßen,\nArt Halimi - arthalimi.com`;
  } else if (lang === 'Albanian') {
    subject = `💡 Sugjerim per uebfaqe per ${business_name}`;
    body = `Pershendetje,\n\nPashe qe keni vleresime shume te mira ne Google Maps per biznesin tuaj. Vura re qe nuk keni ende nje uebfaqe aktive. Nje faqe interneti e thjeshte dhe profesionale do t'ju ndihmonte te merrni me shume kliente direkt, pa pasur nevoje per ndermjetesues.\n\nKam pergatitur nje koncept apo dizajn fillestar falas per ju. A keni kohe per nje bisede te shkurter 5-minuteshe kete jave per ta shikuar bashke?\n\nMe respekt,\nArt Halimi - arthalimi.com`;
  }

  return {
    business_name: business_name,
    status: "Lead Found",
    discovered_website: null,
    estimated_owner_name: "Unknown",
    primary_contact_email: null,
    primary_social_pitch_url: null,
    confidence_score: "Low",
    quick_pitch_hook: lang === 'German' ? 'Hervorragende Google-Bewertungen, aber keine Website.' : 'Vleresime shume te mira ne Google, por pa uebfaqe.',
    personalized_subject: subject,
    personalized_body: body
  };
}
