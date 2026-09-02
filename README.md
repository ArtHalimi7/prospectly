# Prospectly

Autonomous B2B lead generation, OSINT enrichment, and cold outreach platform — built for web developers and digital agencies.

Scrapes Google Maps for local businesses that have high ratings and reviews but **NO active website**, calculates their **Website Buying Intent Score**, drafts human-written pitches via **Gemini 2.5 Flash**, and sends outreach via **1-Click WhatsApp** or **Nodemailer Email Campaigns**.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Configure server/.env (optional for Gemini AI & SMTP)
# If no MySQL DB is configured, local JSON fallback storage is used automatically.

# 3. Start Backend & Frontend
npm run server   # Express backend on http://localhost:5000
npm run dev      # Vite frontend on http://localhost:5173
```

For complete architecture documentation, API endpoints reference, and development guides, see [`project_guide.md`](./project_guide.md).
