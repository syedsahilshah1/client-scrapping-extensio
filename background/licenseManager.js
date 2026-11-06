/**
 * LeadPulse AI - License & Monetization Manager
 * Handles Free Tier vs Pro Tier feature gating, license verification, and limits.
 */

const LicenseManager = {
  FREE_LIMIT: 25,
  CHECKOUT_URL: 'https://gumroad.com', // Replace with your Gumroad, Lemon Squeezy, or Stripe link

  /**
   * Validates a license key
   * Supports demo keys, Gumroad / Lemon Squeezy license format, or standard LP-PRO keys
   */
  validateKey(key = '') {
    const cleaned = String(key).trim().toUpperCase();
    if (!cleaned) {
      return { valid: false, reason: 'Please enter a license key.' };
    }

    // Master / Demo Keys for instant activation
    const masterKeys = ['PRO-VIP-2026', 'LEADPULSE-PRO-LIFETIME', 'PRO-TEST-UNLIMITED', 'AGENCY-PRO-2026'];
    if (masterKeys.includes(cleaned)) {
      return {
        valid: true,
        plan: 'PRO',
        type: 'Lifetime Agency License',
        licenseKey: cleaned,
        activatedAt: new Date().toISOString()
      };
    }

    // Format: LP-PRO-XXXX-XXXX-XXXX
    const lpPattern = /^LP-(PRO|AGENCY)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (lpPattern.test(cleaned)) {
      return {
        valid: true,
        plan: 'PRO',
        type: 'Pro License',
        licenseKey: cleaned,
        activatedAt: new Date().toISOString()
      };
    }

    // Generic valid format (e.g. Gumroad / Stripe token: PRO-XXXXXXXX)
    if (cleaned.startsWith('PRO-') && cleaned.length >= 10) {
      return {
        valid: true,
        plan: 'PRO',
        type: 'Pro Subscription',
        licenseKey: cleaned,
        activatedAt: new Date().toISOString()
      };
    }

    return {
      valid: false,
      reason: 'Invalid license key. Please check your purchase confirmation email.'
    };
  },

  /**
   * Gets current user license state from chrome.storage
   */
  async getLicenseInfo() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(['license']);
      if (stored && stored.license && stored.license.isPro) {
        return stored.license;
      }
    }
    return {
      isPro: false,
      plan: 'FREE',
      maxLeads: this.FREE_LIMIT,
      label: 'Free Tier (25 Leads Limit)'
    };
  },

  /**
   * Activates a license key and stores it
   */
  async activate(key) {
    const result = this.validateKey(key);
    if (!result.valid) {
      throw new Error(result.reason);
    }

    const licenseData = {
      isPro: true,
      plan: result.plan,
      type: result.type,
      licenseKey: result.licenseKey,
      activatedAt: result.activatedAt
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ license: licenseData });
    }
    return licenseData;
  },

  /**
   * Deactivates the license back to free tier
   */
  async deactivate() {
    const freeData = {
      isPro: false,
      plan: 'FREE',
      maxLeads: this.FREE_LIMIT,
      licenseKey: ''
    };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ license: freeData });
    }
    return freeData;
  }
};

// Export for Node tests and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LicenseManager;
} else if (typeof window !== 'undefined') {
  window.LicenseManager = LicenseManager;
}

