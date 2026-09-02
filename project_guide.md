# Prospectly — Autonomous B2B Lead Generation & Outreach Platform

**Prospectly** is a self-hosted, full-stack B2B lead generation, enrichment, and cold outreach platform built for web developers and digital agencies.

It automatically finds local businesses on **Google Maps** that have **high ratings and reviews but NO active website**, enriches them with owner names and contact details via live OSINT search, calculates their **Website Buying Intent Score (0–98%)**, drafts human-written personalized outreach pitches using **Google Gemini AI**, and executes cold outreach via **1-Click WhatsApp** and **automated Email Campaigns**.

---

## 📑 Architecture Overview

```
Prospectly/
├── server/                       # Backend (Node.js + Express)
│   ├── db.js                     # MySQL Database initialization & schema migrations
│   ├── index.js                  # Express API server & local JSON fallback engine
│   ├── scraper.js                # Puppeteer Google Maps & OSINT Search scraper
│   ├── enricher.js               # Gemini 2.5 Flash AI enrichment & tone generators
│   ├── mailer.js                 # Nodemailer Gmail/Workspace SMTP sender
│   ├── leads.json                # Local JSON fallback store for leads
│   ├── templates.json            # Local JSON fallback store for email templates
│   ├── campaigns.json            # Local JSON fallback store for campaigns
│   └── .env                      # API keys & DB credentials
│
├── src/                          # Frontend (React 18 + Vite + TailwindCSS)
│   ├── components/
│   │   ├── Navbar.jsx            # Sleek dark-mode header navigation
│   │   ├── Hero.jsx              # Landing hero with quick scrape search bar
│   │   ├── WhatsAppModal.jsx     # Expanded WhatsApp outreach drawer & live preview
│   │   └── DarkVeil.jsx          # Ambient background WebGL shader
│   ├── pages/
│   │   ├── Dashboard.jsx         # Master-Detail Outreach Workspace & Intent Radar
│   │   ├── Campaigns.jsx         # Email campaign creator & automated batch sender
│   │   ├── Templates.jsx         # Cold email template editor with dynamic tags
│   │   └── Settings.jsx          # API keys, SMTP credentials & DB configuration
│   ├── index.css                 # Custom scrollbars, glassmorphism & typography
│   └── App.jsx                   # React Router route definitions
```

---

## 🚀 Key Modules & How They Work

### 1. Headless Google Maps Scraper (`server/scraper.js`)
* Uses **Puppeteer** in headless Chrome to search Google Maps directly.
* Streams live execution logs over Server-Sent Events (SSE) to the frontend macOS terminal window.
* **Strict Filter:** Automatically filters out listings that already have an official website listed on Google Maps.
* Extracts: Business Name, Google Rating ($0.0 - 5.0$), Review Count, Address, Category, Phone Number, and Maps URL.

### 2. OSINT Enrichment & Gemini AI (`server/enricher.js`)
* For every scraped business without a website, executes a headless Google search query: `"[Business Name] [City] email facebook instagram"`.
* Feeds raw search snippets into **Google Gemini 2.5 Flash** (`gemini-2.5-flash`).
* **Language Detection:** Automatically selects **German**, **Albanian**, or **English** based on country code phone prefixes (`+49`, `+383`, `+355`) and city names.
* **Anti-AI Persona:** Prompts Gemini to write in a casual, direct, human developer voice (signed as *Art Halimi - arthalimi.com*) with **ZERO emojis**, no corporate buzzwords, and short natural texting sentences.

### 3. Website Buying Intent Radar (0–98%) (`src/pages/Dashboard.jsx`)
Scores each lead dynamically using real commercial buying signals:
* **High Customer Demand (+30 pts):** $40+$ reviews and $4.5+★$ rating proves steady customer revenue and foot traffic.
* **Social-Only Web Presence (+15 pts):** Relies on Instagram/Facebook without a dedicated booking landing page.
* **Direct Mobile WhatsApp Reachable (+15 pts):** Mobile phone available for instant 1-on-1 visual preview delivery.
* **Owner / Decision-Maker Identified (+5 pts):** Personal name discovered for high-response cold outreach.
* **Radar Widget:** Renders an intent meter, bulleted signals list, and recommended pitch hook strategy.

### 4. Message Tracking & Status Workflow
* Tracks outreach state (`status = 'WhatsApp Sent' | 'Emailed' | 'Contacted' | 'Enriched' | 'Scraped'`) and `last_contacted_at` timestamps.
* Visual row badges: `✓ WA Sent · 2h ago`, `✓ Emailed`, `Unsent`.
* **1-Click Quick Toggle:** Clickable checkmark on each lead row and in the Inspector to mark as contacted/unsent.
* **Filter Pills:** `All`, `🔥 High Intent`, `💬 Uncontacted`, `✓ Contacted`, `WA Ready`, `WA Sent`, `Emailed`, `Enriched`.

### 5. 1-Click WhatsApp Suite (`src/components/WhatsAppModal.jsx`)
* Direct inline launch via `https://wa.me/{cleanPhone}?text={encodedPitch}`.
* `cleanPhoneForWhatsApp` helper auto-formats phone numbers with appropriate country codes (`+49` for Germany, `+383` for Kosovo, `+355` for Albania, `+41` for Switzerland).
* Expanded modal with editable message, angle switchers (German/Albanian/English, Friendly/Direct/Mockup), skip navigation, and draft saving.

### 6. Email Campaigns & Templates (`src/pages/Campaigns.jsx`, `src/pages/Templates.jsx`, `server/mailer.js`)
* Connects to Gmail or Google Workspace via SMTP using App Passwords.
* Replaces dynamic variables: `{{business_name}}`, `{{estimated_owner_name}}`, `{{quick_pitch_hook}}`, `{{personalized_subject}}`, `{{personalized_body}}`.
* Includes configurable rate-limiting delays between message deliveries to maintain high inbox deliverability.

### 7. Dual Database & Local JSON Fallback (`server/db.js`, `server/index.js`)
* Connects to **MySQL** if configured and available.
* If MySQL is offline or not configured, automatically and silently falls back to local JSON storage (`server/leads.json`, `server/templates.json`, `server/campaigns.json`).
* **The entire app works 100% out of the box with zero external database setup required.**

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/leads` | List all extracted leads ordered by `created_at DESC` |
| `PUT` | `/api/leads/:id` | Update lead details, pitch messages, or status |
| `DELETE`| `/api/leads/:id` | Delete an individual lead |
| `POST`| `/api/leads/batch-delete` | Batch delete multiple leads (`{ ids: [...] }`) |
| `POST`| `/api/leads/:id/status` | Toggle contacted status (`{ status }`) & update `last_contacted_at` |
| `POST`| `/api/leads/:id/whatsapp-sent` | Mark lead as `WhatsApp Sent` with timestamp |
| `POST`| `/api/leads/:id/generate-whatsapp` | Generate custom AI WhatsApp pitch message |
| `POST`| `/api/scrape` | Stream live Puppeteer scraper execution for query |
| `GET` | `/api/templates` | List all cold email templates |
| `POST`| `/api/templates` | Create a new cold email template |
| `PUT` | `/api/templates/:id` | Update email template |
| `DELETE`| `/api/templates/:id` | Delete email template |
| `GET` | `/api/campaigns` | List all email campaigns |
| `POST`| `/api/campaigns` | Create a new campaign with target lead IDs |
| `POST`| `/api/campaigns/:id/send` | Start sending campaign emails via SMTP |
| `GET` | `/api/settings` | Read configured environment settings |
| `POST`| `/api/settings` | Save environment settings & reload `.env` |

---

## ⚙️ Configuration & Environment (`server/.env`)

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=client_scrapper
GEMINI_API_KEY=your_gemini_api_key_here
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_google_app_password
```

---

## 💻 Development & Execution

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start backend server (Port 5000)
npm run server

# Start frontend dev server (Port 5173)
npm run dev

# Production build test
npm run build
```

---

## 🤖 Guide for Future AI Agents Working on this Repo

1. **Backend Database Compatibility:** When modifying queries in `server/index.js`, always ensure parity between the SQL queries and `executeJSONQuery` so both MySQL mode and JSON file fallback mode work identically.
2. **AI Voice & Style:** All pitch messages generated by Gemini in `server/enricher.js` must strictly adhere to the human developer persona (Art Halimi, arthalimi.com) with **no emojis** and casual, direct language.
3. **Phone Number Handling:** Always use `cleanPhoneForWhatsApp(phone, location)` from `src/components/WhatsAppModal.jsx` when building WhatsApp links to ensure proper country code prefixing.
4. **State Management:** Dashboard updates should be optimistic where appropriate, and deleting active leads should shift focus to the nearest remaining lead.
