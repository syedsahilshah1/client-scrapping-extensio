# LeadPulse AI ⚡
### AI-Powered Lead Generation & Web Presence Auditor Chrome Extension (Manifest V3)

> **Scan Google Maps listings, audit web presence & tech gaps, score high-value prospects, and export client-ready Excel sheets with tailored cold outreach pitches.**

---

## 🌟 Overview & Value Proposition

**LeadPulse AI** is an automated prospecting and intelligence extension tailored for digital agencies selling:
* **Web Development & Redesign** (Detects businesses with no website, broken 404 links, or non-mobile responsive layouts)
* **SEO & Reputation Management** (Detects missing `<title>` / `<meta>` tags, no SSL `http://`, and low Google review counts)
* **E-Commerce & Online Booking** (Detects restaurants, stores, and clinics lacking direct online ordering or booking systems)
* **Automation & Chatbots** (Detects absence of instant chat widgets and WhatsApp auto-responders)

---

## 🏗️ Architecture & Core Modules

```
[Google Maps Search] ──> [Content Script Scraper] ──> [Background Tech Auditor] ──> [Excel/CSV Exporter]
                                   │                              │                         │
                                   ▼                              ▼                         ▼
                           In-Page Floating HUD           Score & Pitch Engine       SheetJS (.xlsx)
```

1. **Module A: Chrome Extension (Manifest V3)**
   - `manifest.json`: Configured with modern MV3 permissions (`activeTab`, `storage`, `tabs`, `scripting`, `<all_urls>`).
   - `content/content.js`: Automated smooth scrolling feed reader with multi-tier fallback selectors for dynamic Google Maps classes.
   - `content/floatingHud.js` & `content/content.css`: In-page glassmorphism HUD displaying real-time scraping counts, pause/stop controls, and progress.
   - `popup/popup.html` & `popup.js`: Interactive control panel with filter controls, live feed cards, and one-click full tab expansion.

2. **Module B: Lead Auditor Engine**
   - `background/auditor.js`: Validates SSL, status codes, mobile viewport responsiveness, title & description tags.
   - Tech stack signatures: Detects WordPress, Shopify, WooCommerce, Wix, Squarespace, Webflow, Next.js, WhatsApp links, and live chat scripts (Intercom, Tawk.to, Crisp, Zendesk).
   - `background/pitchGenerator.js`: Automatically drafts high-converting outreach angles tailored to the exact gap discovered.
   - Scoring algorithm: Rates each lead **HIGH**, **MEDIUM**, or **LOW** priority (up to 100 points).

3. **Module C: Data Exporter**
   - `lib/exporter.js` & bundled `lib/xlsx.full.min.js`: Generates `.xlsx` spreadsheets with auto-formatted column widths and CSV exports with UTF-8 BOM encoding.

---

## 📊 Generated Excel Columns

| Column | Description | Example |
|---|---|---|
| **Business Name** | Name of the business on Google Maps | *Al Madina Restaurant & Hotel* |
| **Lead Score** | Priority rating based on opportunity & viability | `HIGH (75 pts)` |
| **Has Website?** | `Yes` or `No` | `No` |
| **Website URL** | Cleaned and validated website URL | `https://bellapasta.pk` or *None* |
| **Phone Number** | Direct phone number from Google Maps | `+92 51 2854321` |
| **Email Address** | Business contact email scraped from website | `info@bellapasta.pk` |
| **Website Phone** | Phone extracted from site `tel:` link | `+92 51 2854321` |
| **Facebook URL** | Official Facebook page URL | `https://facebook.com/bellapasta` |
| **Instagram URL** | Official Instagram profile URL | `https://instagram.com/bellapasta_pk` |
| **LinkedIn URL** | Official LinkedIn company profile | `https://linkedin.com/company/...` |
| **Twitter / X URL** | Official Twitter or X handle link | `https://twitter.com/bellapasta` |
| **YouTube URL** | Official YouTube channel link | `https://youtube.com/@bellapasta` |
| **TikTok URL** | Official TikTok profile link | `https://tiktok.com/@bellapasta` |
| **Missing Details & Gaps** | Key missing signals detected | `No Website, No Socials, No Online Menu` |
| **Services We Offer (Agency Upsell)**| Concrete services your agency can pitch & sell | `Custom Web Dev, Social Media Marketing (SMM), Online Menu` |
| **Tailored Outreach Pitch** | High-converting cold outreach pitch | *"We noticed you have 684 reviews but no website..."* |
| **Primary Service Needed** | Top recommended service | `Web Development`, `Social Media Marketing`, `SEO` |
| **SSL Security** | Encryption status | `Secure (HTTPS)` vs `Insecure (HTTP)` |
| **Mobile Friendly** | Viewport mobile check | `Yes` or `No` |
| **Detected Tech Stack** | Identified CMS, framework, or cart | `WordPress, WooCommerce` |
| **Chat & Automation** | Instant response channels found | `WhatsApp Detected`, `Tawk.to`, `None` |
| **Rating & Reviews** | Google social proof metrics | `4.0 ⭐ (684 reviews)` |
| **Full Address** | Physical location and area | `Hangu Rd, Kohat` |
| **Google Maps URL** | Direct link to the listing | `https://maps.google.com/?cid=...` |
| **Date Scraped** | Timestamp of extraction | `2026-11-03` |

---

## 🚀 Installation Guide

You can load this extension into any Chromium browser (Google Chrome, Brave, Edge, Arc, Opera) in under 60 seconds:

1. Open your browser and navigate to **`chrome://extensions`**.
2. Enable the **"Developer mode"** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select this project directory:
   ```
   D:\js\scrapping of lead
   ```
5. The **LeadPulse AI** extension icon (`⚡`) will now appear in your browser toolbar! Pin it for quick access.

---

## 🧭 Step-by-Step Usage

1. **Open Google Maps**:
   - Go to [Google Maps](https://www.google.com/maps).
   - Search for any target niche and location:
     - Examples: `"Dentists in Austin"`, `"Restaurants in Islamabad"`, `"Roofing contractors in Dallas"`.
2. **Open LeadPulse AI**:
   - Click the extension icon (`⚡`).
   - Choose your **Lead Target Limit** (e.g. 50 leads) and **Scraping Mode** (*Fast Scan* or *Deep Inspection*).
   - Ensure **Live Web Presence & Tech Stack Audit** is checked.
3. **Start Prospecting**:
   - Click **Start Prospecting**.
   - Watch the in-page Floating HUD on Google Maps and the live popup feed populate with leads, audit scores, and badges.
   - You can pause or stop the scan at any point.
4. **Export Leads**:
   - Click **Export Excel (.xlsx)** to download a formatted spreadsheet ready for your CRM (HubSpot, GoHighLevel, Instantly, Lemlist) or spreadsheet outreach.

---

## 🎯 Agency Outreach Playbook

### Scenario A: Business Has No Website (e.g., Khan Grill)
* **Gap**: 89 Google Reviews, 4.8 Rating, but NO website listed on Maps.
* **Why it's High Value**: They have paying customers and cash flow, but lose all web traffic.
* **Cold Call / WhatsApp Angle**:
  > *"Hi Khan Grill team! I noticed your amazing 4.8-star rating on Google Maps with 89 reviews. However, you don't have a website linked, so hungry customers are clicking on your competitors instead. We can set up a mobile-friendly site with direct ordering in 5 days. Can I send you a 60-second preview?"*

### Scenario B: Business Has Insecure Site & No Mobile Viewport
* **Gap**: HTTP only (red "Not Secure" warning in Chrome) and no mobile responsiveness.
* **Cold Email Angle**:
  > *"Hi [Name], I visited your site via Google Maps from my iPhone and noticed two urgent issues: 1) Chrome flags your site as 'Not Secure' with a red warning, and 2) the text requires zooming in on mobile phones. Google demotes non-mobile sites in local rankings. We can secure your site with free SSL and make it 100% mobile-responsive this week."*

---

## 🟢 Google Sheets & Excel Export Integration

LeadPulse AI gives you **3 instant ways** to get your scraped leads into Google Sheets or Excel:

### ⚡ Method 1: Direct Apps Script Importer (Fastest - 10 Seconds)
1. In LeadPulse AI, click **📋 Copy Code** (in the toolbar) or **📋 Copy Code to Paste in Google Sheet** (in Settings).
2. Open your Google Sheet, and click top menu: **Extensions > Apps Script**.
3. Clear any existing code (Ctrl+A -> Delete) and **paste the code**.
4. Click the Save icon (💾), then click **Run (▶)** at the top.
5. All scraped leads will immediately populate into your Google Sheet tab with formatted headers!

### 📋 Method 2: 1-Click Clipboard (Ctrl + V)
1. Click **Copy (Ctrl+V)** in the LeadPulse AI toolbar.
2. Open your Google Sheet or Excel.
3. Click cell **A1**, and press **Ctrl + V** on your keyboard.
4. All 30 columns and rows will paste cleanly into cells!

### 🟢 Method 3: Live Sync Webhook (Real-Time Cloud Streaming)
1. Open your Google Sheet and click **Extensions > Apps Script**.
2. In LeadPulse AI, open **Settings > 30s Setup Guide**, switch to the **Live Webhook** tab, and click **Copy Code**.
3. Paste into Apps Script, click **Deploy > New deployment** (type: **Web app**, Who has access: **Anyone**).
4. Copy the Web App URL and paste it into LeadPulse AI settings.
5. Every lead scraped on Google Maps will now stream live into your Google Sheet in real-time!

---

## 🧪 Testing & Verification

Run the built-in automated test suite:
```bash
npm test
```
The test suite verifies:
* URL normalization & Google redirect parameter decoding
* Web Dev, SEO, E-commerce, and Automation opportunity detection
* Lead scoring point calculations
* SheetJS `.xlsx` workbook generation & round-trip verification
* CSV escaping and UTF-8 BOM encoding

