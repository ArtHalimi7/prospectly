import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { scrapeGoogleMaps, scrapeSearchSnippets } from './scraper.js';
import { enrichLeadDetails, generateCustomWhatsApp } from './enricher.js';
import { sendEmail } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper to write to env dynamically
function updateEnvFile(config) {
  const envContent = Object.entries(config)
    .map(([key, val]) => `${key}=${val}`)
    .join('\n');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  // Reload process.env settings
  dotenv.config({ path: envPath });
}

// -------------------------------------------------------------
// Database Connection & JSON File Fallback helper
// -------------------------------------------------------------
const LEADS_FILE = path.join(__dirname, 'leads.json');
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');
const CAMPAIGNS_FILE = path.join(__dirname, 'campaigns.json');

function readJSONFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return defaultData;
  }
}

function writeJSONFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Simulated SQL-to-JSON query parser for out-of-the-box local usage
function executeJSONQuery(query, params = []) {
  const normalized = query.trim().replace(/\s+/g, ' ');

  // 1. LEADS QUERIES
  if (normalized.includes('SELECT * FROM leads ORDER BY')) {
    const leads = readJSONFile(LEADS_FILE);
    return leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  if (normalized.includes('SELECT * FROM leads WHERE id IN')) {
    const leads = readJSONFile(LEADS_FILE);
    // params are the array of ids
    return leads.filter(l => params.map(String).includes(String(l.id)));
  }

  if (normalized.includes('SELECT id FROM leads WHERE') && (normalized.includes('business_name') || normalized.includes('phone_number'))) {
    const leads = readJSONFile(LEADS_FILE);
    const nameParam = params[0]?.trim().toLowerCase();
    const phoneParam = params[1] ? String(params[1]).replace(/\D/g, '') : '';
    
    return leads.filter(l => {
      const dbName = l.business_name?.trim().toLowerCase();
      const dbPhone = l.phone_number ? String(l.phone_number).replace(/\D/g, '') : '';
      
      const nameMatch = dbName && nameParam && dbName === nameParam;
      const phoneMatch = dbPhone && phoneParam && dbPhone === phoneParam;
      
      return nameMatch || phoneMatch;
    }).map(l => ({ id: l.id }));
  }

  if (normalized.includes('INSERT INTO leads')) {
    const leads = readJSONFile(LEADS_FILE);
    const newLead = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      business_name: params[0],
      category: params[1],
      location: params[2],
      phone_number: params[3],
      rating: parseFloat(params[4]) || null,
      reviews_count: parseInt(params[5]) || 0,
      status: params[6] || 'Scraped',
      estimated_owner_name: params[7] || 'Unknown',
      primary_contact_email: params[8] || null,
      primary_social_pitch_url: params[9] || null,
      confidence_score: params[10] || 'Low',
      quick_pitch_hook: params[11] || '',
      personalized_subject: params[12] || '',
      personalized_body: params[13] || '',
      personalized_whatsapp: params[14] || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    leads.push(newLead);
    writeJSONFile(LEADS_FILE, leads);
    return { insertId: newLead.id };
  }

  if (normalized.includes('UPDATE leads SET')) {
    const leads = readJSONFile(LEADS_FILE);
    const targetId = params[params.length - 1];
    
    let updated = false;
    const updatedLeads = leads.map(l => {
      if (String(l.id) === String(targetId)) {
        updated = true;
        if (normalized.includes('status = ?') && params.length === 2) {
          return { ...l, status: params[0], updated_at: new Date().toISOString() };
        }
        if (normalized.includes('personalized_whatsapp = ?') && params.length === 2) {
          return { ...l, personalized_whatsapp: params[0], updated_at: new Date().toISOString() };
        }
        return {
          ...l,
          business_name: params[0] !== undefined ? params[0] : l.business_name,
          estimated_owner_name: params[1] !== undefined ? params[1] : l.estimated_owner_name,
          primary_contact_email: params[2] !== undefined ? params[2] : l.primary_contact_email,
          primary_social_pitch_url: params[3] !== undefined ? params[3] : l.primary_social_pitch_url,
          quick_pitch_hook: params[4] !== undefined ? params[4] : l.quick_pitch_hook,
          status: params[5] !== undefined ? params[5] : l.status,
          personalized_subject: params[6] !== undefined ? params[6] : (l.personalized_subject || ''),
          personalized_body: params[7] !== undefined ? params[7] : (l.personalized_body || ''),
          personalized_whatsapp: params[8] !== undefined ? params[8] : (l.personalized_whatsapp || ''),
          updated_at: new Date().toISOString()
        };
      }
      return l;
    });
    
    if (updated) {
      writeJSONFile(LEADS_FILE, updatedLeads);
    }
    return { affectedRows: updated ? 1 : 0 };
  }

  if (normalized.includes('DELETE FROM leads WHERE id = ?')) {
    const leads = readJSONFile(LEADS_FILE);
    const filtered = leads.filter(l => String(l.id) !== String(params[0]));
    writeJSONFile(LEADS_FILE, filtered);
    return { affectedRows: 1 };
  }

  // 2. TEMPLATES QUERIES
  const defaultTemplates = [
    {
      id: 1,
      name: 'Custom Web Design Pitch',
      subject: '💡 Website idea for {{business_name}}',
      body: `Hi {{estimated_owner_name}},\n\nI was looking up some highly rated local businesses in the area and noticed your excellent services at {{business_name}} (loved your Google review rating!).\n\nHowever, I noticed that your business currently doesn't have an active website. In today's digital market, having a strong web presence is key to getting new leads without middle-man fees.\n\n{{quick_pitch_hook}}\n\nI designed a quick mockup of how your website could look, featuring direct online booking and customer review testimonials. Would you be open to a 5-minute chat sometime this week to take a look?\n\nBest regards,\nYour Name\nYour Agency`
    },
    {
      id: 2,
      name: 'Mobile Optimization Landing Page Pitch',
      subject: '📱 Quick suggestion for {{business_name}}',
      body: `Dear {{estimated_owner_name}},\n\nI hope this email finds you well.\n\nMy name is Your Name, and I am a local web developer. I recently found {{business_name}} while looking for services in your area. While you have amazing reviews on Google Maps, it looks like you don't have a website to convert those visitors into direct customers.\n\n{{quick_pitch_hook}}\n\nHaving a simple, fast-loading, mobile-optimized landing page can increase your direct client calls by up to 40%.\n\nWould you be open to seeing a free custom visual concept I drafted for you?\n\nKind regards,\nYour Name`
    }
  ];

  if (normalized.includes('SELECT COUNT(*) as count FROM templates')) {
    const templates = readJSONFile(TEMPLATES_FILE, defaultTemplates);
    return [{ count: templates.length }];
  }

  if (normalized.includes('SELECT * FROM templates ORDER BY')) {
    return readJSONFile(TEMPLATES_FILE, defaultTemplates);
  }

  if (normalized.includes('SELECT * FROM templates WHERE name = ?')) {
    const templates = readJSONFile(TEMPLATES_FILE, defaultTemplates);
    return templates.filter(t => t.name === params[0]);
  }

  if (normalized.includes('INSERT INTO templates')) {
    const templates = readJSONFile(TEMPLATES_FILE, defaultTemplates);
    const newTemp = {
      id: Date.now(),
      name: params[0],
      subject: params[1],
      body: params[2],
      created_at: new Date().toISOString()
    };
    templates.push(newTemp);
    writeJSONFile(TEMPLATES_FILE, templates);
    return { insertId: newTemp.id };
  }

  if (normalized.includes('UPDATE templates SET')) {
    const templates = readJSONFile(TEMPLATES_FILE, defaultTemplates);
    const updated = templates.map(t => {
      if (String(t.id) === String(params[3])) {
        return {
          ...t,
          name: params[0],
          subject: params[1],
          body: params[2]
        };
      }
      return t;
    });
    writeJSONFile(TEMPLATES_FILE, updated);
    return { affectedRows: 1 };
  }

  if (normalized.includes('DELETE FROM templates WHERE id = ?')) {
    const templates = readJSONFile(TEMPLATES_FILE, defaultTemplates);
    const filtered = templates.filter(t => String(t.id) !== String(params[0]));
    writeJSONFile(TEMPLATES_FILE, filtered);
    return { affectedRows: 1 };
  }

  // 3. CAMPAIGNS QUERIES
  if (normalized.includes('SELECT * FROM campaigns ORDER BY')) {
    return readJSONFile(CAMPAIGNS_FILE);
  }

  if (normalized.includes('SELECT * FROM campaigns WHERE id = ?')) {
    const campaigns = readJSONFile(CAMPAIGNS_FILE);
    return campaigns.filter(c => String(c.id) === String(params[0]));
  }

  if (normalized.includes('INSERT INTO campaigns')) {
    const campaigns = readJSONFile(CAMPAIGNS_FILE);
    const newCamp = {
      id: Date.now(),
      name: params[0],
      template_name: params[1],
      status: params[2] || 'Draft',
      total_leads: parseInt(params[3]) || 0,
      sent_leads: parseInt(params[4]) || 0,
      created_at: new Date().toISOString()
    };
    campaigns.push(newCamp);
    writeJSONFile(CAMPAIGNS_FILE, campaigns);
    return { insertId: newCamp.id };
  }

  if (normalized.includes('UPDATE campaigns SET status = ? WHERE id = ?')) {
    const campaigns = readJSONFile(CAMPAIGNS_FILE);
    const updated = campaigns.map(c => {
      if (String(c.id) === String(params[1])) {
        return { ...c, status: params[0] };
      }
      return c;
    });
    writeJSONFile(CAMPAIGNS_FILE, updated);
    return { affectedRows: 1 };
  }

  if (normalized.includes('UPDATE campaigns SET sent_leads = ? WHERE id = ?')) {
    const campaigns = readJSONFile(CAMPAIGNS_FILE);
    const updated = campaigns.map(c => {
      if (String(c.id) === String(params[1])) {
        return { ...c, sent_leads: parseInt(params[0]) };
      }
      return c;
    });
    writeJSONFile(CAMPAIGNS_FILE, updated);
    return { affectedRows: 1 };
  }

  return [];
}

async function executeQuery(query, params = []) {
  try {
    const db = await connectDB();
    const [results] = await db.query(query, params);
    return results;
  } catch (err) {
    console.warn(`[DATABASE] MySQL connection offline. Running query on local JSON storage...`);
    return executeJSONQuery(query, params);
  }
}

// -------------------------------------------------------------
// API Settings Routes
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  res.json({
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'client_scrapper',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GMAIL_USER: process.env.GMAIL_USER || '',
    GMAIL_PASS: process.env.GMAIL_PASS || '',
    SMTP_DELAY: process.env.SMTP_DELAY || '30'
  });
});

app.post('/api/settings', (req, res) => {
  try {
    updateEnvFile(req.body);
    res.json({ success: true, message: 'Settings saved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Leads Routes
// -------------------------------------------------------------
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await executeQuery('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const {
    business_name,
    estimated_owner_name,
    primary_contact_email,
    primary_social_pitch_url,
    quick_pitch_hook,
    status,
    personalized_subject,
    personalized_body,
    personalized_whatsapp
  } = req.body;
  try {
    await executeQuery(
      `UPDATE leads SET 
        business_name = ?, 
        estimated_owner_name = ?, 
        primary_contact_email = ?, 
        primary_social_pitch_url = ?, 
        quick_pitch_hook = ?,
        status = ?,
        personalized_subject = ?,
        personalized_body = ?,
        personalized_whatsapp = ?
       WHERE id = ?`,
      [
        business_name,
        estimated_owner_name,
        primary_contact_email,
        primary_social_pitch_url,
        quick_pitch_hook,
        status || 'Enriched',
        personalized_subject || '',
        personalized_body || '',
        personalized_whatsapp || '',
        id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to generate/regenerate custom WhatsApp message for a specific lead
app.post('/api/leads/:id/generate-whatsapp', async (req, res) => {
  const { id } = req.params;
  const { language, tone, customInstructions } = req.body || {};
  try {
    const leads = await executeQuery('SELECT * FROM leads WHERE id = ?', [id]);
    const lead = Array.isArray(leads) && leads.length > 0 ? leads[0] : null;
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const message = await generateCustomWhatsApp({
      business_name: lead.business_name,
      category: lead.category,
      location: lead.location,
      phone_number: lead.phone_number,
      rating: lead.rating,
      reviews_count: lead.reviews_count,
      estimated_owner_name: lead.estimated_owner_name,
      language: language || null,
      tone: tone || 'Professional & Friendly',
      customInstructions: customInstructions || ''
    });

    // Save generated message back to lead record
    await executeQuery(
      'UPDATE leads SET personalized_whatsapp = ? WHERE id = ?',
      [message, id]
    );

    res.json({ success: true, message, personalized_whatsapp: message });
  } catch (err) {
    console.error(`[API] generate-whatsapp error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Direct on-demand WhatsApp message generator endpoint
app.post('/api/generate-whatsapp', async (req, res) => {
  try {
    const {
      business_name,
      category,
      location,
      phone_number,
      rating,
      reviews_count,
      estimated_owner_name,
      language,
      tone,
      customInstructions
    } = req.body;

    const message = await generateCustomWhatsApp({
      business_name: business_name || 'Local Business',
      category: category || 'Business',
      location: location || '',
      phone_number: phone_number || '',
      rating: rating || 5.0,
      reviews_count: reviews_count || 0,
      estimated_owner_name: estimated_owner_name || '',
      language: language || null,
      tone: tone || 'Professional & Friendly',
      customInstructions: customInstructions || ''
    });

    res.json({ success: true, message });
  } catch (err) {
    console.error(`[API] generate-whatsapp error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to mark lead as WhatsApp Sent
app.post('/api/leads/:id/whatsapp-sent', async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery('UPDATE leads SET status = ? WHERE id = ?', ['WhatsApp Sent', id]);
    res.json({ success: true, status: 'WhatsApp Sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    await executeQuery('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Templates Routes
// -------------------------------------------------------------
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await executeQuery('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', async (req, res) => {
  const { name, subject, body } = req.body;
  try {
    const result = await executeQuery(
      'INSERT INTO templates (name, subject, body) VALUES (?, ?, ?)',
      [name, subject, body]
    );
    res.json({ id: result.insertId, name, subject, body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, subject, body } = req.body;
  try {
    await executeQuery(
      'UPDATE templates SET name = ?, subject = ?, body = ? WHERE id = ?',
      [name, subject, body, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    await executeQuery('DELETE FROM templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Campaigns Routes
// -------------------------------------------------------------
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await executeQuery('SELECT * FROM campaigns ORDER BY created_at DESC');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const { name, templateId, leadIds } = req.body;
  try {
    const [templates] = await executeQuery('SELECT * FROM templates WHERE id = ?', [templateId]);
    const template = templates;
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const totalLeads = leadIds.length;
    const result = await executeQuery(
      'INSERT INTO campaigns (name, template_name, status, total_leads, sent_leads) VALUES (?, ?, ?, ?, ?)',
      [name, template.name, 'Draft', totalLeads, 0]
    );
    
    // Store lead bindings for campaign in session storage equivalent or MySQL table if needed.
    // For local simplicity, we store the references in local database or campaign object metadata,
    // or just return the new campaign.
    res.json({
      id: result.insertId,
      name,
      template_name: template.name,
      status: 'Draft',
      total_leads: totalLeads,
      sent_leads: 0,
      created_at: new Date().toISOString(),
      leadIds // send back leadIds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Scraper Live Trigger Endpoint (Chunked Response Streaming)
// -------------------------------------------------------------

/**
 * Smart Retry Query Generator
 * When a broad search yields 0 website-less leads, generates localized
 * city-specific search terms in the local language for better results.
 * Small local businesses in specific cities are far more likely to lack websites.
 */
function generateRetryQueries(originalQuery) {
  const q = originalQuery.toLowerCase();
  const retryQueries = [];

  // Mapping of countries/regions to their major cities and local language business terms
  const regionMap = {
    switzerland: {
      cities: ['Zürich', 'Bern', 'Basel', 'Luzern', 'St. Gallen', 'Winterthur', 'Thun', 'Aarau', 'Schaffhausen', 'Solothurn'],
      localTerms: {
        'auto': ['Autohandel', 'Occasion Autos', 'Autogarage', 'Gebrauchtwagen'],
        'car': ['Autohandel', 'Occasion Autos', 'Autogarage', 'Gebrauchtwagen'],
        'dealership': ['Autohandel', 'Occasion Autos', 'Autogarage'],
        'restaurant': ['Restaurant', 'Gasthaus', 'Beiz'],
        'plumber': ['Sanitär', 'Installateur'],
        'barber': ['Coiffeur', 'Friseur', 'Barbershop'],
        'hairdresser': ['Coiffeur', 'Friseur'],
        'bakery': ['Bäckerei', 'Konditorei'],
        'electrician': ['Elektriker', 'Elektro'],
        'painter': ['Maler', 'Malergeschäft'],
        'carpenter': ['Schreiner', 'Schreinerei'],
        'cleaning': ['Reinigung', 'Putzfirma'],
        'tailor': ['Schneiderei', 'Änderungsschneiderei'],
        'mechanic': ['Autogarage', 'Autowerkstatt', 'Mechaniker'],
        'garage': ['Autogarage', 'Autowerkstatt'],
        'default': ['Geschäft', 'Dienstleistung']
      }
    },
    germany: {
      cities: ['Hamburg', 'München', 'Berlin', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Leipzig', 'Nürnberg'],
      localTerms: {
        'auto': ['Autohandel', 'Autohändler', 'Gebrauchtwagen', 'Autohaus'],
        'car': ['Autohandel', 'Autohändler', 'Gebrauchtwagen'],
        'dealership': ['Autohandel', 'Autohändler', 'Autohaus'],
        'restaurant': ['Restaurant', 'Gasthaus', 'Gaststätte', 'Imbiss'],
        'plumber': ['Sanitär', 'Klempner', 'Installateur'],
        'barber': ['Friseur', 'Barbershop', 'Herrenfriseur'],
        'hairdresser': ['Friseur', 'Friseursalon'],
        'bakery': ['Bäckerei', 'Konditorei'],
        'electrician': ['Elektriker', 'Elektro'],
        'painter': ['Maler', 'Malermeister'],
        'carpenter': ['Schreiner', 'Tischler'],
        'cleaning': ['Reinigung', 'Gebäudereinigung'],
        'tailor': ['Schneiderei', 'Änderungsschneiderei'],
        'mechanic': ['Werkstatt', 'KFZ Werkstatt'],
        'garage': ['Autowerkstatt', 'KFZ Werkstatt'],
        'default': ['Geschäft', 'Dienstleistung']
      }
    },
    austria: {
      cities: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels'],
      localTerms: {
        'auto': ['Autohandel', 'Gebrauchtwagen', 'Autohaus'],
        'car': ['Autohandel', 'Gebrauchtwagen'],
        'dealership': ['Autohandel', 'Autohaus'],
        'default': ['Geschäft', 'Dienstleistung']
      }
    },
    kosovo: {
      cities: ['Prishtinë', 'Prizren', 'Pejë', 'Mitrovicë', 'Ferizaj', 'Gjakovë', 'Gjilan'],
      localTerms: {
        'auto': ['Autosallon', 'Autoshitje', 'Auto'],
        'car': ['Autosallon', 'Autoshitje'],
        'dealership': ['Autosallon', 'Autoshitje'],
        'restaurant': ['Restorant', 'Bufe'],
        'barber': ['Berber', 'Parukeri'],
        'default': ['Dyqan', 'Biznes']
      }
    },
    albania: {
      cities: ['Tiranë', 'Durrës', 'Vlorë', 'Shkodër', 'Elbasan', 'Korçë', 'Fier'],
      localTerms: {
        'auto': ['Autosallon', 'Autoshitje'],
        'car': ['Autosallon', 'Autoshitje'],
        'dealership': ['Autosallon'],
        'default': ['Dyqan', 'Biznes']
      }
    }
  };

  // Detect country from query
  let detectedRegion = null;
  const regionKeywords = {
    switzerland: ['switzerland', 'schweiz', 'suisse', 'svizzera', 'swiss', 'zürich', 'zurich', 'bern', 'basel', 'genf', 'geneva', 'luzern', 'lucerne'],
    germany: ['germany', 'deutschland', 'german', 'hamburg', 'münchen', 'munich', 'berlin', 'köln', 'cologne', 'frankfurt', 'stuttgart'],
    austria: ['austria', 'österreich', 'wien', 'vienna', 'graz', 'salzburg', 'innsbruck'],
    kosovo: ['kosovo', 'kosova', 'prishtina', 'prishtinë', 'prizren', 'peja', 'pejë'],
    albania: ['albania', 'shqipëri', 'shqiperi', 'tirana', 'tiranë', 'durrës']
  };

  for (const [region, keywords] of Object.entries(regionKeywords)) {
    if (keywords.some(kw => q.includes(kw))) {
      detectedRegion = region;
      break;
    }
  }

  if (!detectedRegion) return retryQueries;

  const regionData = regionMap[detectedRegion];
  if (!regionData) return retryQueries;

  // Detect the business type from the query
  let matchedTermKey = 'default';
  for (const termKey of Object.keys(regionData.localTerms)) {
    if (termKey !== 'default' && q.includes(termKey)) {
      matchedTermKey = termKey;
      break;
    }
  }

  const localTerms = regionData.localTerms[matchedTermKey] || regionData.localTerms['default'];
  const cities = regionData.cities;

  // Generate city-specific queries using local language terms
  // Limit to first 5 cities and first 2 terms to avoid excessive scraping
  for (const term of localTerms.slice(0, 2)) {
    for (const city of cities.slice(0, 5)) {
      retryQueries.push(`${term} ${city}`);
    }
  }

  return retryQueries;
}

app.post('/api/scrape', async (req, res) => {
  const { query, minRating, limit } = req.body;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const streamWrite = (msg) => {
    res.write(`${msg}\n`);
  };

  try {
    streamWrite(`[INFO] Connected to scraping stream...`);
    
    // 1. Scrape Google Maps with original query
    let rawLeads = await scrapeGoogleMaps({
      query,
      minRating: minRating || 4.0,
      limit: limit || 10,
      logCallback: streamWrite
    });

    // 2. If 0 leads found, try smart retry with localized city-specific searches
    if (rawLeads.length === 0) {
      streamWrite(`[RETRY] No website-less leads found with initial query. Generating localized search alternatives...`);
      
      const retryQueries = generateRetryQueries(query);
      
      if (retryQueries.length > 0) {
        streamWrite(`[RETRY] Will try ${retryQueries.length} localized search variations to find website-less businesses...`);
        
        const targetLimit = limit || 10;
        
        for (const retryQuery of retryQueries) {
          if (rawLeads.length >= targetLimit) {
            streamWrite(`[RETRY] Reached target of ${targetLimit} leads. Stopping search.`);
            break;
          }
          
          streamWrite(`[RETRY] Trying: "${retryQuery}" ...`);
          
          try {
            const retryLeads = await scrapeGoogleMaps({
              query: retryQuery,
              minRating: minRating || 4.0,
              limit: Math.min(5, targetLimit - rawLeads.length), // Small batches per retry
              logCallback: streamWrite
            });
            
            if (retryLeads.length > 0) {
              streamWrite(`[RETRY] ✅ Found ${retryLeads.length} website-less leads from "${retryQuery}"!`);
              rawLeads.push(...retryLeads);
            }
          } catch (retryErr) {
            streamWrite(`[RETRY] Query "${retryQuery}" failed: ${retryErr.message}. Continuing...`);
          }
        }
        
        if (rawLeads.length === 0) {
          streamWrite(`[WARNING] No website-less leads found after ${retryQueries.length} localized searches.`);
          streamWrite(`[TIP] Try more specific business types (e.g., "Friseur Hamburg", "Reinigung Zürich") or target smaller cities.`);
          streamWrite(`[TIP] Businesses in highly digitized markets (auto dealerships, restaurants in major cities) almost always have websites.`);
          res.end();
          return;
        }
      } else {
        streamWrite(`[WARNING] No website-less leads found matching query: "${query}"`);
        streamWrite(`[TIP] Try searching for specific business types in specific cities (e.g., "Friseur Hamburg" instead of "hairdresser Germany").`);
        streamWrite(`[TIP] Smaller, service-based businesses (cleaners, tailors, barbers) are more likely to lack websites.`);
        res.end();
        return;
      }
    }

    streamWrite(`[INFO] Google Maps scrape complete. Found ${rawLeads.length} leads matching filters.`);

    // 3. Save/Enrich leads sequentially
    for (let i = 0; i < rawLeads.length; i++) {
      const lead = rawLeads[i];

      // Deduplicate against existing database records (match name or phone)
      const existing = await executeQuery(
        'SELECT id FROM leads WHERE business_name = ? OR (phone_number = ? AND phone_number IS NOT NULL)', 
        [lead.business_name, lead.phone_number || null]
      );
      if (existing && existing.length > 0) {
        streamWrite(`[DATABASE] Lead "${lead.business_name}" already exists in the database. Skipping duplicate.`);
        continue;
      }

      streamWrite(`[OSINT] Lead #${i+1}/${rawLeads.length}: Initiating web search for "${lead.business_name}"...`);

      // Search Google for email and social snippets
      const searchSnippets = await scrapeSearchSnippets({
        businessName: lead.business_name,
        location: lead.location
      });

      streamWrite(`[GEMINI] Analyzing snippets using Gemini AI...`);

      // Enrich lead using Gemini
      const enriched = await enrichLeadDetails({
        business_name: lead.business_name,
        category: lead.category,
        location: lead.location,
        phone_number: lead.phone_number,
        rating: lead.rating,
        reviews_count: lead.reviews_count,
        search_snippets: searchSnippets
      });

      // Filter out leads that already have an official website discovered online
      if (enriched.status === 'Website Exists' || enriched.discovered_website) {
        streamWrite(`[OSINT] Skipping: "${lead.business_name}" already has an official website discovered: ${enriched.discovered_website}`);
        continue;
      }

      // Map response fields
      const finalLead = {
        ...lead,
        status: enriched.status === 'Lead Found' ? 'Enriched' : 'No Context Found',
        estimated_owner_name: enriched.estimated_owner_name || 'Unknown',
        primary_contact_email: enriched.primary_contact_email || null,
        primary_social_pitch_url: enriched.primary_social_pitch_url || null,
        confidence_score: enriched.confidence_score || 'Low',
        quick_pitch_hook: enriched.quick_pitch_hook || '',
        personalized_subject: enriched.personalized_subject || '',
        personalized_body: enriched.personalized_body || '',
        personalized_whatsapp: enriched.personalized_whatsapp || ''
      };

      // Save to MySQL DB
      streamWrite(`[DATABASE] Saving lead to MySQL table...`);
      await executeQuery(
        `INSERT INTO leads 
          (business_name, category, location, phone_number, rating, reviews_count, status, estimated_owner_name, primary_contact_email, primary_social_pitch_url, confidence_score, quick_pitch_hook, personalized_subject, personalized_body, personalized_whatsapp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalLead.business_name,
          finalLead.category,
          finalLead.location,
          finalLead.phone_number,
          finalLead.rating,
          finalLead.reviews_count,
          finalLead.status,
          finalLead.estimated_owner_name,
          finalLead.primary_contact_email,
          finalLead.primary_social_pitch_url,
          finalLead.confidence_score,
          finalLead.quick_pitch_hook,
          finalLead.personalized_subject,
          finalLead.personalized_body,
          finalLead.personalized_whatsapp
        ]
      );

      streamWrite(`[SUCCESS] Lead #${i+1} saved: ${finalLead.business_name} (${finalLead.phone_number ? 'Phone & WhatsApp ready' : 'No phone'})`);
    }

    streamWrite(`[SUCCESS] Full scraping sequence successfully processed!`);
    res.end();
  } catch (err) {
    streamWrite(`[ERROR] Scraping thread crashed: ${err.message}`);
    res.end();
  }
});

// -------------------------------------------------------------
// Campaign Send Action Endpoint (Chunked Response Streaming)
// -------------------------------------------------------------
app.post('/api/campaigns/:id/send', async (req, res) => {
  const campaignId = req.params.id;
  const { leadIds } = req.body; // option to override or supply lead bindings

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const streamWrite = (msg) => {
    res.write(`${msg}\n`);
  };

  try {
    streamWrite(`[CAMPAIGN] Retrieving campaign data from database...`);
    const [camps] = await executeQuery('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    const campaign = camps;
    if (!campaign) {
      streamWrite(`[ERROR] Campaign not found.`);
      res.end();
      return;
    }

    // Get matching templates
    const [templates] = await executeQuery('SELECT * FROM templates WHERE name = ?', [campaign.template_name]);
    const template = templates;
    if (!template) {
      streamWrite(`[ERROR] Campaign Template "${campaign.template_name}" no longer exists.`);
      res.end();
      return;
    }

    // Load leads connected to this campaign run
    let targetLeads = [];
    if (leadIds && leadIds.length > 0) {
      const placeholders = leadIds.map(() => '?').join(',');
      targetLeads = await executeQuery(`SELECT * FROM leads WHERE id IN (${placeholders})`, leadIds);
    } else {
      // Fallback: send to all leads who are 'Enriched' and have emails, who haven't been emailed yet
      targetLeads = await executeQuery(`SELECT * FROM leads WHERE status = 'Enriched' AND primary_contact_email IS NOT NULL`);
    }

    if (targetLeads.length === 0) {
      streamWrite(`[WARNING] No viable leads with valid email addresses found to contact.`);
      res.end();
      return;
    }

    streamWrite(`[CAMPAIGN] Found ${targetLeads.length} leads to deliver.`);
    await executeQuery('UPDATE campaigns SET status = "Sending" WHERE id = ?', [campaignId]);

    const delaySeconds = parseInt(process.env.SMTP_DELAY || '30');

    for (let i = 0; i < targetLeads.length; i++) {
      const lead = targetLeads[i];
      streamWrite(`[SMTP] Preparing cold email for: ${lead.business_name} (${lead.primary_contact_email})`);

      try {
        const result = await sendEmail({
          to: lead.primary_contact_email,
          subject: template.subject,
          body: template.body,
          leadData: lead
        });

        // Update lead status to Emailed
        await executeQuery('UPDATE leads SET status = "Emailed" WHERE id = ?', [lead.id]);
        // Update campaign counters
        await executeQuery('UPDATE campaigns SET sent_leads = ? WHERE id = ?', [i + 1, campaignId]);
        
        if (result && result.simulation) {
          streamWrite(`[DRAFT GENERATED] Recipient: ${lead.primary_contact_email} | Subject: "${result.subject}" | Body compiled locally. PROGRESS:${i + 1}/${targetLeads.length}`);
        } else {
          streamWrite(`[SUCCESS] Email successfully delivered. PROGRESS:${i + 1}/${targetLeads.length}`);
        }

        // Safe rate limiting delay
        if (i < targetLeads.length - 1) {
          streamWrite(`[COOLDOWN] Safe delay: Sleeping for ${delaySeconds} seconds to preserve Gmail sender reputation...`);
          await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
        }
      } catch (mailErr) {
        streamWrite(`[FAILED] Failed to send to ${lead.primary_contact_email}: ${mailErr.message}`);
      }
    }

    await executeQuery('UPDATE campaigns SET status = "Completed" WHERE id = ?', [campaignId]);
    streamWrite(`[SUCCESS] Campaign outreach complete!`);
    res.end();

  } catch (err) {
    streamWrite(`[ERROR] Campaign execution thread crashed: ${err.message}`);
    res.end();
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[SERVER] Node Express backend running on http://localhost:${PORT}`);
});
