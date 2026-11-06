/**
 * Unit Tests for License & Monetization Manager
 */

const assert = require('assert');
const LicenseManager = require('../background/licenseManager');

console.log('🧪 Starting LicenseManager Tests...\n');

// Test 1: Empty or Invalid Keys
console.log('Test 1: Reject Invalid Keys');
const emptyRes = LicenseManager.validateKey('');
assert.strictEqual(emptyRes.valid, false);

const invalidRes = LicenseManager.validateKey('RANDOM-STRING');
assert.strictEqual(invalidRes.valid, false);
console.log('  ✔ Passed: Rejected empty & invalid keys');

// Test 2: Master / VIP Keys
console.log('\nTest 2: Master VIP Demo Keys');
const masterRes = LicenseManager.validateKey('PRO-VIP-2026');
assert.strictEqual(masterRes.valid, true);
assert.strictEqual(masterRes.plan, 'PRO');
console.log('  ✔ Passed: Master key activated successfully');

// Test 3: Pattern-based LP-PRO Keys
console.log('\nTest 3: Pattern LP-PRO-XXXX-XXXX-XXXX Keys');
const patternRes = LicenseManager.validateKey('LP-PRO-ABCD-1234-EFGH');
assert.strictEqual(patternRes.valid, true);
assert.strictEqual(patternRes.plan, 'PRO');
console.log('  ✔ Passed: LP-PRO format key activated successfully');

// Test 4: Generic Stripe / Gumroad Key
console.log('\nTest 4: Generic Gumroad / Stripe Key format');
const stripeKey = LicenseManager.validateKey('PRO-9876543210-GUM');
assert.strictEqual(stripeKey.valid, true);
console.log('  ✔ Passed: Stripe/Gumroad key activated');

console.log('\nAll LicenseManager tests passed successfully! 🚀');

