/**
 * Unit & Integration Tests for LeadPulse AI Auditor and Pitch Generator
 */

const assert = require('assert');
const Auditor = require('../background/auditor');
const PitchGenerator = require('../background/pitchGenerator');
const { sampleLeads, mockHtmlSamples } = require('./mockData');

console.log('🧪 Starting Auditor & PitchGenerator Tests...\n');

// Test 1: URL Normalization
console.log('Test 1: URL Normalization');
const url1 = Auditor.normalizeUrl('example.com');
assert.strictEqual(url1, 'https://example.com', 'Should prefix https:// if missing');

const url2 = Auditor.normalizeUrl('https://www.google.com/url?q=https%3A%2F%2Ftargetsite.com%2Fshop&sa=D');
assert.strictEqual(url2, 'https://targetsite.com/shop', 'Should extract real URL from Google Maps redirect wrapper');
console.log('  ✔ Passed: URL Normalization');

// Test 2: Business Without Website (Khan Grill)
console.log('\nTest 2: Business Without Website (Web Dev Opportunity)');
(async () => {
  const noSiteBusiness = sampleLeads[1]; // Khan Grill
  const audit = await Auditor.auditBusiness(noSiteBusiness);

  assert.strictEqual(audit.hasWebsite, false, 'hasWebsite should be false');
  assert.strictEqual(audit.leadScore, 'HIGH', 'Score should be HIGH because it has reviews/phone but no website');
  assert.ok(audit.leadScorePoints >= 65, 'Points should be >= 65');
  assert.ok(audit.opportunities.includes('Web Development'), 'Opportunities should include Web Development');
  assert.strictEqual(audit.primaryService, 'Web Development');
  assert.ok(audit.missingDetails.length > 0, 'Should have missing details');
  assert.ok(audit.servicesWeOffer.length > 0, 'Should have services we offer');
  assert.ok(audit.servicesWeOffer.some(s => s.includes('Website Development')), 'Services should offer Website Development');
  assert.ok(audit.primaryPitch.includes('Khan Grill'), 'Pitch should mention business name');
  assert.ok(audit.primaryPitch.includes('website'), 'Pitch should propose building a website');

  console.log('  ✔ Passed: Business Without Website');
  console.log('    • Score:', audit.leadScore, `(${audit.leadScorePoints} pts)`);
  console.log('    • Missing Details:', audit.missingDetails.join(' | '));
  console.log('    • Services We Offer:', audit.servicesWeOffer.join('; '));
  console.log('    • Pitch:', audit.primaryPitch);
})();

// Test 3: HTML Parsing & Signal Detection (Unoptimized Site)
console.log('\nTest 3: HTML Parsing & Signal Detection (Unoptimized Site)');
const unoptResult = {
  websiteUrl: 'http://bellapasta-test-fake.pk',
  hasWebsite: true,
  hasSsl: false,
  statusCode: 200,
  isBroken: false,
  isReachable: true,
  isMobileFriendly: false,
  hasTitle: false,
  titleText: '',
  titleLength: 0,
  hasMetaDescription: false,
  metaDescriptionText: '',
  cms: [],
  frameworks: [],
  hasChatWidget: false,
  chatWidgetType: null,
  hasWhatsapp: false,
  hasEcommerce: false,
  technologies: [],
  auditFindings: [],
  leadScore: 'LOW',
  leadScorePoints: 0,
  leadScoreReasons: [],
  opportunities: []
};

Auditor._parseHtml(mockHtmlSamples.unoptimizedSite, unoptResult);
Auditor._calculateScore(unoptResult, sampleLeads[0]);
Auditor._attachPitch(unoptResult, sampleLeads[0]);

assert.strictEqual(unoptResult.hasTitle, false, 'Should detect missing title');
assert.strictEqual(unoptResult.hasMetaDescription, false, 'Should detect missing meta description');
assert.strictEqual(unoptResult.isMobileFriendly, false, 'Should detect missing viewport meta');
assert.strictEqual(unoptResult.hasChatWidget, false, 'Should detect no chat widget');
assert.ok(unoptResult.leadScorePoints >= 65, 'Should score HIGH due to stacked gaps + real customer reviews');
assert.ok(unoptResult.opportunities.includes('Mobile Optimization'), 'Should identify Mobile Optimization');
assert.ok(unoptResult.opportunities.includes('SSL Security'), 'Should identify SSL Security');

console.log('  ✔ Passed: Unoptimized HTML Parsing');
console.log('    • Detected Opportunities:', unoptResult.opportunities.join(', '));
console.log('    • Pitch:', unoptResult.primaryPitch);

// Test 4: HTML Parsing & Signal Detection (Modern Shopify & WhatsApp Site)
console.log('\nTest 4: Modern E-Commerce Site with Shopify & WhatsApp');
const modernResult = {
  websiteUrl: 'https://gourmet-sweets.com',
  hasWebsite: true,
  hasSsl: true,
  statusCode: 200,
  isBroken: false,
  isReachable: true,
  isMobileFriendly: false,
  hasTitle: false,
  titleText: '',
  hasMetaDescription: false,
  metaDescriptionText: '',
  cms: [],
  frameworks: [],
  hasChatWidget: false,
  hasWhatsapp: false,
  hasEcommerce: false,
  technologies: [],
  auditFindings: [],
  opportunities: []
};

Auditor._parseHtml(mockHtmlSamples.modernEcommerceSite, modernResult);
modernResult.socialLinks = { facebook: '', instagram: '', linkedin: '', twitter: '', youtube: '', tiktok: '', pinterest: '' };
modernResult.contactInfo = { email: '', allEmails: [], websitePhone: '' };
modernResult.missingDetails = [];
modernResult.servicesWeOffer = [];
Auditor._extractSocialsAndContacts(mockHtmlSamples.modernEcommerceSite, 'https://gourmet-sweets.com', modernResult);
Auditor._synthesizeMissingDetails(modernResult, { category: 'Bakery' });

assert.strictEqual(modernResult.hasTitle, true, 'Should detect valid title');
assert.strictEqual(modernResult.hasMetaDescription, true, 'Should detect meta description');
assert.strictEqual(modernResult.isMobileFriendly, true, 'Should detect mobile viewport');
assert.strictEqual(modernResult.hasEcommerce, true, 'Should detect Shopify / E-Commerce');
assert.strictEqual(modernResult.ecommercePlatform, 'Shopify', 'Should identify Shopify specifically');
assert.strictEqual(modernResult.hasWhatsapp, true, 'Should detect WhatsApp chat link');
assert.ok(modernResult.technologies.includes('Shopify'), 'Technologies should list Shopify');
assert.ok(modernResult.technologies.includes('WhatsApp'), 'Technologies should list WhatsApp');

// Social & Contact Assertions
assert.strictEqual(modernResult.socialLinks.facebook, 'https://www.facebook.com/gourmetsweetsisb', 'Should extract Facebook URL');
assert.strictEqual(modernResult.socialLinks.instagram, 'https://instagram.com/gourmetsweets_official', 'Should extract Instagram URL');
assert.strictEqual(modernResult.socialLinks.linkedin, 'https://linkedin.com/company/gourmet-sweets-pk', 'Should extract LinkedIn URL');
assert.strictEqual(modernResult.socialLinks.twitter, 'https://twitter.com/gourmet_pk', 'Should extract Twitter/X URL');
assert.strictEqual(modernResult.contactInfo.email, 'orders@gourmet-sweets.com', 'Should extract email from website');

console.log('  ✔ Passed: Modern Tech Detection (Shopify, WhatsApp, SEO Meta tags)');
console.log('    • Socials Found:', JSON.stringify(modernResult.socialLinks));
console.log('    • Email Extracted:', modernResult.contactInfo.email);
console.log('\nAll Auditor tests passed successfully! 🚀');

