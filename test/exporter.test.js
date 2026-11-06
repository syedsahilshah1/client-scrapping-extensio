/**
 * Unit & Integration Tests for SheetJS (.xlsx) and CSV Exporter
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Exporter = require('../lib/exporter');

console.log('🧪 Starting Exporter Tests...\n');

// Test Leads
const testLeads = [
  {
    name: 'Bella Pasta Trattoria',
    phone: '+92 51 2854321',
    address: 'Sector F-7/2, Islamabad',
    category: 'Italian Restaurant',
    rating: 4.6,
    reviewCount: 142,
    website: 'http://bellapasta.pk',
    websiteUrl: 'http://bellapasta.pk',
    hasWebsite: true,
    hasSsl: false,
    statusCode: 200,
    isMobileFriendly: false,
    hasTitle: false,
    titleLength: 0,
    hasMetaDescription: false,
    hasChatWidget: false,
    hasWhatsapp: false,
    technologies: ['WordPress'],
    auditFindings: ['No SSL Certificate (Not Secure)', 'Missing HTML Title Tag', 'Not Mobile Responsive'],
    leadScore: 'HIGH',
    leadScorePoints: 75,
    primaryService: 'SEO & Web Modernization',
    opportunities: ['SSL Security', 'On-Page SEO', 'Mobile Optimization'],
    primaryPitch: 'We noticed Bella Pasta Trattoria has great local demand but an insecure, non-mobile site. We can modernize your online presence.',
    valueProposition: 'Your site is marked Not Secure by Google Chrome and is not mobile-responsive.',
    googleMapsUrl: 'https://maps.google.com/?cid=12345678',
    scrapedAt: '2026-11-03T10:00:00Z',
    socialLinks: {
      facebook: 'https://facebook.com/bellapasta',
      instagram: 'https://instagram.com/bellapasta_pk',
      linkedin: '',
      twitter: '',
      youtube: '',
      tiktok: ''
    },
    contactInfo: {
      email: 'info@bellapasta.pk',
      allEmails: ['info@bellapasta.pk'],
      websitePhone: '+92 51 2854321'
    },
    missingDetails: ['No SSL Certificate', 'Not Mobile Responsive'],
    servicesWeOffer: ['SSL Installation', 'Mobile Website Redesign']
  },
  {
    name: 'Khan Grill & Barbeque',
    phone: '+92 300 1234567',
    address: 'Saddar, Rawalpindi',
    category: 'Barbecue Restaurant',
    rating: 4.8,
    reviewCount: 89,
    website: '',
    websiteUrl: '',
    hasWebsite: false,
    hasSsl: false,
    auditFindings: ['No website listed on Google Maps'],
    missingDetails: ['No Website / Zero Online Presence', 'No Online Ordering'],
    servicesWeOffer: ['Custom Website Development', 'Direct Online Ordering'],
    leadScore: 'HIGH',
    leadScorePoints: 85,
    primaryService: 'Web Development',
    opportunities: ['Web Development', 'Local Online Presence'],
    primaryPitch: 'Build a modern, mobile-responsive website for Khan Grill & Barbeque to capture direct local orders.',
    valueProposition: 'You currently have no website listed on Google Maps.',
    googleMapsUrl: 'https://maps.google.com/?cid=87654321',
    scrapedAt: '2026-11-03T10:00:00Z'
  }
];

// Test 1: Column Schema Validation
console.log('Test 1: Standardized Row Mapping');
const rows = Exporter.prepareRows(testLeads);

assert.strictEqual(rows.length, 2, 'Should have 2 mapped rows');
const requiredColumns = [
  'Timestamp',
  'Niche / Category',
  'Location / Address',
  'Business Name',
  'Phone',
  'Email',
  'CMS / Tech',
  'Rating',
  'Reviews',
  'Website',
  'Lead Status',
  'Detailed Remarks',
  'Source Link',
  'Facebook URL',
  'Instagram URL',
  'LinkedIn URL',
  'Twitter / X URL',
  'YouTube URL',
  'TikTok URL',
  'Missing Details & Gaps',
  'Services We Offer (Agency Upsell)',
  'Tailored Outreach Pitch',
  'Lead Score Points'
];

requiredColumns.forEach(col => {
  assert.ok(col in rows[0], `Row 0 should have column: "${col}"`);
  assert.ok(col in rows[1], `Row 1 should have column: "${col}"`);
});

assert.strictEqual(rows[0]['Business Name'], 'Bella Pasta Trattoria');
assert.strictEqual(rows[0]['Website'], 'http://bellapasta.pk');
assert.strictEqual(rows[0]['SSL Security'], 'Insecure (HTTP)');
assert.strictEqual(rows[1]['Website'], 'No Website');
assert.ok(rows[1]['Lead Status'].includes('HIGH'));

console.log('  ✔ Passed: Column Schema Mapping');

// Test 2: XLSX File Generation
console.log('\nTest 2: SheetJS (.xlsx) Workbook Generation');
const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Audited Leads');

const outputPath = path.join(__dirname, 'test_output.xlsx');
XLSX.writeFile(workbook, outputPath);

assert.ok(fs.existsSync(outputPath), 'Output .xlsx file should exist on disk');
const stats = fs.statSync(outputPath);
assert.ok(stats.size > 1000, `Generated Excel file size (${stats.size} bytes) should be valid`);

// Re-read file to verify integrity
const readBack = XLSX.readFile(outputPath);
assert.ok(readBack.SheetNames.includes('Audited Leads'), 'Sheet name should be "Audited Leads"');
const sheetData = XLSX.utils.sheet_to_json(readBack.Sheets['Audited Leads']);
assert.strictEqual(sheetData.length, 2, 'Should contain 2 rows');
assert.strictEqual(sheetData[0]['Business Name'], 'Bella Pasta Trattoria');
assert.strictEqual(sheetData[1]['Business Name'], 'Khan Grill & Barbeque');

// Cleanup
fs.unlinkSync(outputPath);
console.log('  ✔ Passed: SheetJS Workbook generation and round-trip verification');

// Test 3: CSV Escaping & UTF-8 BOM
console.log('\nTest 3: CSV Generation & Cell Escaping');
const csvCell1 = Exporter._escapeCsvCell('Hello, World');
assert.strictEqual(csvCell1, '"Hello, World"', 'Should escape commas with quotes');

const csvCell2 = Exporter._escapeCsvCell('Quote "Test"');
assert.strictEqual(csvCell2, '"Quote ""Test"""', 'Should double escape quotes');

console.log('  ✔ Passed: CSV cell escaping');
console.log('\nAll Exporter tests passed successfully! 🚀');

