/**
 * LeadPulse AI - Google Sheets Live Sync
 * Syncs scraped and audited leads directly to Google Sheets via Webhook / Google Apps Script.
 */

const GoogleSync = {
  /**
   * Formats a lead object into Google Sheets row schema
   */
  formatLead(lead = {}) {
    const missing = Array.isArray(lead.missingDetails) && lead.missingDetails.length > 0
      ? lead.missingDetails.join(' | ')
      : (Array.isArray(lead.auditFindings) ? lead.auditFindings.join('; ') : (lead.auditFindings || 'None'));

    const services = Array.isArray(lead.servicesWeOffer) && lead.servicesWeOffer.length > 0
      ? lead.servicesWeOffer.join('; ')
      : (Array.isArray(lead.opportunities) ? lead.opportunities.join(', ') : (lead.opportunities || 'General Growth'));

    const technologies = Array.isArray(lead.technologies) ? lead.technologies.join(', ') : (lead.technologies || '');
    const socials = lead.socialLinks || {};
    const contact = lead.contactInfo || {};

    const sslText = !lead.hasWebsite
      ? 'No Website'
      : (lead.hasSsl ? 'Secure (HTTPS)' : 'Insecure (HTTP)');

    const mobileText = !lead.hasWebsite
      ? 'N/A'
      : (lead.isMobileFriendly ? 'Yes' : 'No');

    const timestamp = lead.scrapedAt
      ? new Date(lead.scrapedAt).toISOString().replace('T', ' ').slice(0, 19)
      : new Date().toISOString().replace('T', ' ').slice(0, 19);

    const email = contact.email || lead.email || (lead.hasWebsite ? '' : 'No Website');
    const website = lead.websiteUrl || lead.website || 'No Website';
    const cmsTech = technologies || (lead.hasWebsite ? 'Custom HTML/JS' : 'No Website');
    const leadStatus = lead.leadScore ? `${lead.leadScore} (${lead.leadScorePoints || 0} pts)` : 'NEW';

    const remarks = [
      lead.primaryPitch ? `🎯 ${lead.primaryPitch}` : '',
      missing && missing !== 'None' ? `⚠️ Missing: ${missing}` : '',
      services && services !== 'General Growth' ? `💡 Offer: ${services}` : ''
    ].filter(Boolean).join(' | ');

    return {
      // 1-13: User's Exact Sheet Headers
      'Timestamp': timestamp,
      'Niche / Category': lead.category || '',
      'Location / Address': lead.address || '',
      'Business Name': lead.name || '',
      'Phone': lead.phone || '',
      'Email': email,
      'CMS / Tech': cmsTech,
      'Rating': lead.rating !== null && lead.rating !== undefined ? lead.rating : 'N/A',
      'Reviews': lead.reviewCount || 0,
      'Website': website,
      'Lead Status': leadStatus,
      'Detailed Remarks': remarks || 'Ready for outreach',
      'Source Link': lead.googleMapsUrl || '',

      // 14+: Extended Agency Intelligence & Audit Columns
      'Facebook URL': socials.facebook || '',
      'Instagram URL': socials.instagram || '',
      'LinkedIn URL': socials.linkedin || '',
      'Twitter / X URL': socials.twitter || '',
      'YouTube URL': socials.youtube || '',
      'TikTok URL': socials.tiktok || '',
      'SSL Security': sslText,
      'Mobile Friendly': mobileText,
      'Missing Details & Gaps': missing,
      'Services We Offer (Agency Upsell)': services,
      'Tailored Outreach Pitch': lead.primaryPitch || '',
      'Lead Score Points': lead.leadScorePoints || 0
    };
  },

  /**
   * Syncs a single lead to Google Sheets
   */
  async syncLead(lead, webhookUrl) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Invalid Google Sheets Webhook URL.');
    }

    const payload = {
      action: 'append',
      lead: this.formatLead(lead)
    };

    return this._postPayload(webhookUrl, payload);
  },

  /**
   * Batch syncs an array of leads to Google Sheets
   */
  async syncBatch(leads = [], webhookUrl) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Invalid Google Sheets Webhook URL.');
    }
    if (leads.length === 0) {
      throw new Error('No leads to sync.');
    }

    const payload = {
      action: 'batch',
      leads: leads.map(l => this.formatLead(l))
    };

    return this._postPayload(webhookUrl, payload);
  },

  /**
   * Tests connection with a dummy test row
   */
  async testConnection(webhookUrl) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Please enter a valid Webhook URL starting with https://');
    }

    const testLead = {
      name: 'Test Business (LeadPulse AI)',
      leadScore: 'HIGH',
      leadScorePoints: 95,
      hasWebsite: true,
      websiteUrl: 'https://example.com',
      phone: '+1 555-0199',
      email: 'hello@example.com',
      category: 'Software Agency',
      address: '100 Innovation Way',
      primaryPitch: 'This is a test row to verify Google Sheets Live Sync.',
      opportunities: ['Web Development', 'SEO Services'],
      servicesWeOffer: ['Custom Website Development', 'Social Media Marketing'],
      missingDetails: ['No SSL Certificate', 'No Mobile Viewport']
    };

    const res = await this.syncLead(testLead, webhookUrl);
    return res;
  },

  async _postPayload(webhookUrl, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      // Use text/plain to prevent CORS preflight blocking with Google Apps Script
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { status: response.ok ? 'success' : 'unknown' };
      }

      return {
        success: response.ok || data.status === 'success',
        status: data.status || 'success',
        response: data
      };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      throw new Error(isTimeout ? 'Google Sheets request timed out.' : `Connection error: ${err.message}`);
    }
  },

  /**
   * Extracts Google Spreadsheet ID and Tab GID from URL or raw ID
   * Defaults to user's sheet: 1icDCheARP2uZVGVmudBQMrzyLti1RsbH4hEaT8JyZXk / 1890934928
   */
  extractSheetDetails(input = '') {
    const defaultId = '1icDCheARP2uZVGVmudBQMrzyLti1RsbH4hEaT8JyZXk';
    const defaultGid = '1890934928';

    if (!input) {
      return { spreadsheetId: defaultId, sheetGid: defaultGid };
    }

    const str = String(input);
    const idMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = str.match(/[#&?]gid=([0-9]+)/);

    return {
      spreadsheetId: idMatch ? idMatch[1] : (str.length > 20 && !str.includes('/') ? str : defaultId),
      sheetGid: gidMatch ? gidMatch[1] : defaultGid
    };
  },

  /**
   * Generates a direct importer script with scraped leads baked in.
   * The user copies this and pastes it into Extensions > Apps Script in Google Sheets,
   * then clicks "Run" (▶). It immediately adds all leads to their sheet without deployment!
   *
   * @param {Array} leads Scraped leads array
   * @param {string} [spreadsheetId] Google Spreadsheet ID
   * @param {string} [sheetGid] Tab GID
   */
  generateDirectImporterScript(leads = [], spreadsheetId = '', sheetGid = '') {
    const details = this.extractSheetDetails(spreadsheetId || sheetGid);
    const targetId = spreadsheetId || details.spreadsheetId;
    const targetGid = sheetGid || details.sheetGid;

    const idSnippet = targetId ? `"${targetId}"` : '""';
    const gidSnippet = targetGid ? `"${targetGid}"` : '""';

    const formattedRows = leads.map(l => this.formatLead(l));
    const itemsJson = JSON.stringify(formattedRows, null, 2);

    return `// ============================================================
// LeadPulse AI - Direct Lead Importer Script
// ============================================================
// INSTRUCTIONS TO IMPORT ${leads.length} LEADS (Takes 10 seconds):
// 1. In your Google Sheet, click top menu: Extensions > Apps Script
// 2. Clear all existing code (Ctrl+A -> Delete) and PASTE this entire script
// 3. Click the Save icon (💾), then click "Run" (▶) at the top toolbar
//
// All ${leads.length} leads will immediately appear in your Google Sheet!
// ============================================================

function importLeadPulseData() {
  var SPREADSHEET_ID = ${idSnippet};
  var TARGET_GID = ${gidSnippet};

  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = null;

  if (TARGET_GID) {
    var allSheets = ss.getSheets();
    for (var k = 0; k < allSheets.length; k++) {
      if (String(allSheets[k].getSheetId()) === String(TARGET_GID)) {
        sheet = allSheets[k];
        break;
      }
    }
  }
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }

  // Setup headers if sheet is empty
  var headers = [
    "Timestamp", "Niche / Category", "Location / Address", "Business Name",
    "Phone", "Email", "CMS / Tech", "Rating", "Reviews", "Website",
    "Lead Status", "Detailed Remarks", "Source Link",
    "Facebook URL", "Instagram URL", "LinkedIn URL", "Twitter / X URL", "YouTube URL", "TikTok URL",
    "SSL Security", "Mobile Friendly", "Missing Details & Gaps", "Services We Offer (Agency Upsell)",
    "Tailored Outreach Pitch", "Lead Score Points"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4f46e5").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  var items = ${itemsJson};
  var rowsToAppend = [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    rowsToAppend.push([
      item["Timestamp"] || item["Date Scraped"] || new Date().toISOString().slice(0, 10),
      item["Niche / Category"] || item["Category"] || item.category || "",
      item["Location / Address"] || item["Full Address"] || item.address || "",
      item["Business Name"] || item.name || "",
      item["Phone"] || item["Phone Number"] || item.phone || "",
      item["Email"] || item["Email Address"] || item.email || "",
      item["CMS / Tech"] || item["Detected Tech Stack"] || "",
      item["Rating"] || item.rating || "",
      item["Reviews"] || item["Review Count"] || item.reviewCount || 0,
      item["Website"] || item["Website URL"] || item.website || "",
      item["Lead Status"] || item["Lead Score"] || "NEW",
      item["Detailed Remarks"] || item["Audit Findings"] || item["Missing Details & Gaps"] || "",
      item["Source Link"] || item["Google Maps URL"] || item.googleMapsUrl || "",
      item["Facebook URL"] || "",
      item["Instagram URL"] || "",
      item["LinkedIn URL"] || "",
      item["Twitter / X URL"] || "",
      item["YouTube URL"] || "",
      item["TikTok URL"] || "",
      item["SSL Security"] || "",
      item["Mobile Friendly"] || "",
      item["Missing Details & Gaps"] || "",
      item["Services We Offer (Agency Upsell)"] || "",
      item["Tailored Outreach Pitch"] || item.primaryPitch || "",
      item["Lead Score Points"] || item["Score Points"] || item.leadScorePoints || 0
    ]);
  }

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
  }

  SpreadsheetApp.getUi().alert("✔ LeadPulse AI: Successfully imported " + rowsToAppend.length + " leads into " + sheet.getName() + "!");
}
`;
  },

  /**
   * Returns copy-paste ready Google Apps Script code for the user
   * @param {string} [spreadsheetId] Optional Google Spreadsheet ID
   * @param {string} [sheetGid] Optional Tab GID
   */
  getAppsScriptTemplate(spreadsheetId = '', sheetGid = '') {
    const details = this.extractSheetDetails(spreadsheetId || sheetGid);
    const targetId = spreadsheetId || details.spreadsheetId;
    const targetGid = sheetGid || details.sheetGid;

    const idSnippet = targetId ? `"${targetId}"` : '""';
    const gidSnippet = targetGid ? `"${targetGid}"` : '""';

    return `// ============================================================
// LeadPulse AI - Google Sheets Live Sync Receiver Script
// ============================================================
// HOW TO SETUP IN YOUR SHEET (30 SECONDS):
// 1. Open your Google Sheet.
// 2. Click "Extensions" > "Apps Script" in the top menu.
// 3. Delete any code in the editor and PASTE this entire script.
// 4. Click "Deploy" (top right blue button) > "New deployment".
// 5. Select type (gear icon): "Web app".
// 6. Set "Execute as": "Me".
// 7. Set "Who has access": "Anyone".
// 8. Click "Deploy", copy the Web App URL, and paste it into LeadPulse AI!
// ============================================================

function doPost(e) {
  try {
    var SPREADSHEET_ID = ${idSnippet};
    var TARGET_GID = ${gidSnippet};

    var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = null;

    if (TARGET_GID) {
      var allSheets = ss.getSheets();
      for (var k = 0; k < allSheets.length; k++) {
        if (String(allSheets[k].getSheetId()) === String(TARGET_GID)) {
          sheet = allSheets[k];
          break;
        }
      }
    }
    if (!sheet) {
      sheet = ss.getActiveSheet();
    }

    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    // Auto-setup headers with styling on empty sheets
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Timestamp", "Niche / Category", "Location / Address", "Business Name",
        "Phone", "Email", "CMS / Tech", "Rating", "Reviews", "Website",
        "Lead Status", "Detailed Remarks", "Source Link",
        "Facebook URL", "Instagram URL", "LinkedIn URL", "Twitter / X URL", "YouTube URL", "TikTok URL",
        "SSL Security", "Mobile Friendly", "Missing Details & Gaps", "Services We Offer (Agency Upsell)",
        "Tailored Outreach Pitch", "Lead Score Points"
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#4f46e5").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    var items = data.leads ? data.leads : (data.lead ? [data.lead] : (Array.isArray(data) ? data : [data]));
    var rowsToAppend = [];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      rowsToAppend.push([
        item["Timestamp"] || item["Date Scraped"] || new Date().toISOString().slice(0, 10),
        item["Niche / Category"] || item["Category"] || item.category || "",
        item["Location / Address"] || item["Full Address"] || item.address || "",
        item["Business Name"] || item.name || "",
        item["Phone"] || item["Phone Number"] || item.phone || "",
        item["Email"] || item["Email Address"] || item.email || "",
        item["CMS / Tech"] || item["Detected Tech Stack"] || "",
        item["Rating"] || item.rating || "",
        item["Reviews"] || item["Review Count"] || item.reviewCount || 0,
        item["Website"] || item["Website URL"] || item.website || "",
        item["Lead Status"] || item["Lead Score"] || "NEW",
        item["Detailed Remarks"] || item["Audit Findings"] || item["Missing Details & Gaps"] || "",
        item["Source Link"] || item["Google Maps URL"] || item.googleMapsUrl || "",
        item["Facebook URL"] || "",
        item["Instagram URL"] || "",
        item["LinkedIn URL"] || "",
        item["Twitter / X URL"] || "",
        item["YouTube URL"] || "",
        item["TikTok URL"] || "",
        item["SSL Security"] || "",
        item["Mobile Friendly"] || "",
        item["Missing Details & Gaps"] || "",
        item["Services We Offer (Agency Upsell)"] || "",
        item["Tailored Outreach Pitch"] || item.primaryPitch || "",
        item["Lead Score Points"] || item["Score Points"] || item.leadScorePoints || 0
      ]);
    }

    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rowsToAppend.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }
};

// Export for Node tests and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleSync;
} else if (typeof window !== 'undefined') {
  window.GoogleSync = GoogleSync;
}

