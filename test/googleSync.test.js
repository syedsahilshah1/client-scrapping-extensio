/**
 * Unit Tests for Google Sheets Live Sync Module
 */

const assert = require('assert');
const GoogleSync = require('../background/googleSync');

console.log('🧪 Starting GoogleSync Tests...\n');

// Test 1: Lead Formatting for Google Sheets Schema
console.log('Test 1: Format Lead for Google Sheets');
const testLead = {
  name: 'Al Madina Restaurant & Hotel',
  rating: 4.0,
  reviewCount: 684,
  category: 'Pakistani restaurant',
  address: 'Hangu Rd, Kohat',
  phone: '+92 51 2854321',
  website: '',
  hasWebsite: false,
  missingDetails: ['No Website / Zero Online Presence', 'No Social Media Links'],
  servicesWeOffer: ['Custom Website Development', 'Social Media Marketing'],
  primaryPitch: 'We can launch a modern mobile-friendly website in 5 days.',
  leadScore: 'HIGH',
  leadScorePoints: 85
};

const formatted = GoogleSync.formatLead(testLead);

assert.strictEqual(formatted['Business Name'], 'Al Madina Restaurant & Hotel');
assert.strictEqual(formatted['Website'], 'No Website');
assert.ok(formatted['Lead Status'].includes('HIGH'));
assert.strictEqual(formatted['Lead Score Points'], 85);
assert.ok(formatted['Missing Details & Gaps'].includes('No Website'));
assert.ok(formatted['Services We Offer (Agency Upsell)'].includes('Website Development'));
assert.strictEqual(formatted['Phone'], '+92 51 2854321');
assert.strictEqual(formatted['Niche / Category'], 'Pakistani restaurant');
assert.strictEqual(formatted['Location / Address'], 'Hangu Rd, Kohat');

console.log('  ✔ Passed: Google Sheet Schema Formatting');

// Test 2: Google Apps Script Template Integrity
console.log('\nTest 2: Google Apps Script Template Generation');
const template = GoogleSync.getAppsScriptTemplate();

assert.ok(template.includes('function doPost(e)'), 'Template should define doPost');
assert.ok(template.includes('Business Name'), 'Template should include headers');
assert.ok(template.includes('SpreadsheetApp.getActiveSpreadsheet()'), 'Template should access spreadsheet');
assert.ok(template.includes('ContentService.createTextOutput'), 'Template should return JSON output');

console.log('  ✔ Passed: Apps Script Template Generation (Ready for Deployment)');

// Test 3: URL Validation
console.log('\nTest 3: Webhook URL Validation');
assert.rejects(
  async () => {
    await GoogleSync.syncLead(testLead, 'invalid-url');
  },
  /Invalid Google Sheets Webhook URL/
);
console.log('  ✔ Passed: URL Validation Error Handling');

// Test 4: Extract Sheet ID and GID
console.log('\nTest 4: Extract Sheet ID & Tab GID');
const sampleUrl = 'https://docs.google.com/spreadsheets/d/1icDCheARP2uZVGVmudBQMrzyLti1RsbH4hEaT8JyZXk/edit?gid=1890934928#gid=1890934928';
const extracted = GoogleSync.extractSheetDetails(sampleUrl);
assert.strictEqual(extracted.spreadsheetId, '1icDCheARP2uZVGVmudBQMrzyLti1RsbH4hEaT8JyZXk');
assert.strictEqual(extracted.sheetGid, '1890934928');
console.log('  ✔ Passed: Sheet ID & GID extraction');

// Test 5: Direct Importer Script Generation
console.log('\nTest 5: Direct Importer Script Generation');
const importerScript = GoogleSync.generateDirectImporterScript([testLead], extracted.spreadsheetId, extracted.sheetGid);
assert.ok(importerScript.includes('function importLeadPulseData()'));
assert.ok(importerScript.includes('1icDCheARP2uZVGVmudBQMrzyLti1RsbH4hEaT8JyZXk'));
assert.ok(importerScript.includes('1890934928'));
assert.ok(importerScript.includes('Al Madina Restaurant & Hotel'));
assert.ok(importerScript.includes('SpreadsheetApp.getUi().alert'));
console.log('  ✔ Passed: Direct Importer Script Generation with baked-in leads');

console.log('\nAll GoogleSync tests passed successfully! 🚀');

