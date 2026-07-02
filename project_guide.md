# Project Guide: Private Client Scrapper Tool

This guide defines the scope, architecture, and configuration for the **ClientScrapper** tool. If you start a new conversation with an AI coding assistant, you can instruct them to read this file to immediately align on the design and implementation details.

---

## 1. Project Goal
Build a private, self-hosted web application to:
1. Scrape local businesses from Google Maps based on search query (e.g., "Plumbers in Hamburg"), filtering for businesses that have a **high rating/reviews** and **NO website**.
2. Automatically enrich these leads via Google Search to find contact emails, names of owners/decision-makers, and social media handles.
3. Use a Google Gemini 1.5 Flash LLM to analyze the scraped information and generate a personalized cold email pitch hook using a custom prompt.
4. Manage leads, customize email templates, and execute cold email campaigns via a Gmail/Google Workspace account using SMTP (Google App Passwords) with a rate-limiting delay between sends.

---

## 2. Technology Stack & Architecture
- **Frontend**: React (Vite, SPA) styled with TailwindCSS.
- **Backend**: Node.js and Express.js.
- **Database**: MySQL (local server connection initialized on backend startup).
- **Scraper**: Puppeteer (running locally in a headless browser to keep search and Maps scraping 100% free and unlimited).
- **AI Engine**: Google Gemini API (`gemini-1.5-flash`).
- **Mailing Engine**: Nodemailer connected to Gmail/Workspace SMTP.

---

## 3. Configuration (`.env` file)
The Express backend requires a `.env` file in the `server/` directory containing:
```env
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=client_scrapper
GEMINI_API_KEY=your_google_gemini_api_key
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_PASS=your_gmail_app_password
```

---

## 4. AI Data Enrichment Prompt
Below is the exact prompt that is fed to the Gemini 1.5 Flash API along with the raw scraped data and search snippets. The AI must respond with **strict, clean JSON** and no conversational text:

```
You are an expert OSINT (Open-Source Intelligence) and B2B lead generation assistant specializing in local business data enrichment. 

Your objective is to analyze the provided raw Google Maps data of a local business that lacks a website, and perform targeted, step-by-step reasoning to uncover the direct contact details of the owner or decision-maker.

### Input Data Provided:
- Business Name: [Name]
- Category: [Category]
- Location: [City/Region]
- Phone Number: [Phone Number]
- Raw Social Links and Search Snippets found via search: [Google Search Results]

### Your Task Execution Strategy:
1. Identify the Digital Footprint: Analyze the business name and location. Determine the most likely platforms where a local business of this type would manage their presence (e.g., Facebook Pages, Instagram, local business registries like GelbeSeiten, Impressum listings).
2. Extract the Decision-Maker: Search for signs of ownership. Look for phrases like "Owner," "Geschäftsführer," "Inhaber," "Founder," or names attached to the public legal registration or social media "About" sections.
3. Clean & Validate: Isolate the most direct contact method. Prioritize a direct personal/business email over a generic contact form. If no email is accessible, extract their primary active social media handle (e.g., Instagram DM or Facebook Messenger link) where a direct pitch can be sent.

### Output Format:
Provide your findings in a strict, clean JSON format with NO conversational filler, so it can be parsed directly into a database:

{
  "business_name": "Verified Business Name",
  "status": "Lead Found" | "No Context Found",
  "estimated_owner_name": "Full Name or 'Unknown'",
  "primary_contact_email": "email@domain.com or null",
  "primary_social_pitch_url": "Direct link to FB/IG messaging or null",
  "confidence_score": "High" | "Medium" | "Low",
  "quick_pitch_hook": "A 1-sentence personalized pitch hook mentioning their high reviews and how a website can help them scale."
}
```

---

## 5. Workflow
1. **Search & Scrape**: The user inputs a search term, minimum rating, minimum review count, and limit. Puppeteer opens Google Maps, scrolls through results, extracts businesses without a website, and saves them to the MySQL database with status `Scraped`.
2. **Enrichment**: For each scraped lead, the backend programmatically performs a Puppeteer Google Search for `"[Business Name] [City] email facebook instagram"`, extracts the search snippets, runs them through the Gemini prompt, and updates the lead status to `Enriched` or `No Context Found`.
3. **Review**: The user views a table of enriched leads in the React UI, allows editing of emails or names, and selects leads to target.
4. **Campaign & Send**: The user creates a campaign, binds an email template (with placeholders like `{{business_name}}`, `{{estimated_owner_name}}`, `{{quick_pitch_hook}}`), and starts the campaign. The backend delivers the emails using Nodemailer with a safe delay (e.g., 30–60 seconds) between messages.
