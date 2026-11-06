/**
 * LeadPulse AI - Auditor Engine
 * Performs deep audits of website presence, social media URLs (Facebook, Instagram,
 * LinkedIn, Twitter/X, YouTube, TikTok), contact emails, SEO tags, mobile friendliness,
 * tech stack, missing details, and agency services we offer.
 */

// Import PitchGenerator if running in Node.js
let PitchGen = typeof PitchGenerator !== 'undefined' ? PitchGenerator : null;
if (!PitchGen && typeof require !== 'undefined') {
  try {
    PitchGen = require('./pitchGenerator');
  } catch (e) {
    // Loaded via script tag or importScripts
  }
}

const Auditor = {
  /**
   * Sanitizes and normalizes a business website URL
   * Handles Google Maps redirect wrappers (e.g., https://www.google.com/url?q=...)
   */
  normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();

    if (url.includes('google.com/url?') || url.includes('/url?q=')) {
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        const qParam = parsed.searchParams.get('q') || parsed.searchParams.get('url');
        if (qParam) url = qParam;
      } catch (e) {
        const match = url.match(/[?&](?:q|url)=([^&]+)/);
        if (match) url = decodeURIComponent(match[1]);
      }
    }

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    return url;
  },

  /**
   * Performs an asynchronous audit of a business
   * @param {Object} business - Lead details { name, website, phone, rating, reviewCount, category, address }
   * @param {Object} options - Audit configuration { timeoutMs: 7000 }
   * @returns {Promise<Object>} Complete audit report
   */
  async auditBusiness(business, options = {}) {
    const timeoutMs = options.timeoutMs || 7000;
    const cleanUrl = this.normalizeUrl(business.website);

    // Initial audit container
    const result = {
      websiteUrl: cleanUrl || '',
      hasWebsite: Boolean(cleanUrl),
      hasSsl: false,
      statusCode: null,
      isBroken: false,
      isReachable: false,
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
      ecommercePlatform: null,
      technologies: [],
      // Social Media URLs extracted from website
      socialLinks: {
        facebook: '',
        instagram: '',
        linkedin: '',
        twitter: '',
        youtube: '',
        tiktok: '',
        pinterest: ''
      },
      // Direct Contact extracted from website
      contactInfo: {
        email: '',
        allEmails: [],
        websitePhone: ''
      },
      // Missing details detected & agency services we offer
      missingDetails: [],
      servicesWeOffer: [],
      auditFindings: [],
      leadScore: 'LOW',
      leadScorePoints: 0,
      leadScoreReasons: [],
      opportunities: [],
      valueProposition: '',
      primaryPitch: '',
      primaryService: 'General Growth',
      auditedAt: new Date().toISOString()
    };

    // Case 1: No website provided on Google Maps
    if (!result.hasWebsite) {
      result.auditFindings.push('No website listed on Google Maps');
      result.missingDetails = [
        'No Website / Zero Online Presence',
        'No Social Media Links Listed',
        'No Online Menu / Direct Ordering System',
        'No Automated Lead / Reservation Capture'
      ];
      result.servicesWeOffer = [
        'Custom Website Development (Modern & Mobile-Optimized)',
        'Local SEO & Google Search Ranking Setup',
        'Digital Menu & Direct Online Ordering (0% Commission)',
        'Social Media Brand Setup (Facebook, Instagram, TikTok)',
        'WhatsApp Business Auto-Responder Integration'
      ];

      this._calculateScore(result, business);
      this._attachPitch(result, business);
      return result;
    }

    // Case 2: Website provided -> Fetch & inspect HTML for socials, contact, and gaps
    try {
      result.hasSsl = cleanUrl.startsWith('https://');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(cleanUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          mode: 'cors'
        });
      } catch (fetchErr) {
        // Fallback to HTTP if HTTPS fails with cert error
        if (cleanUrl.startsWith('https://')) {
          const httpUrl = cleanUrl.replace('https://', 'http://');
          try {
            response = await fetch(httpUrl, {
              method: 'GET',
              signal: controller.signal
            });
            result.hasSsl = false;
            result.websiteUrl = httpUrl;
          } catch (httpErr) {
            throw fetchErr;
          }
        } else {
          throw fetchErr;
        }
      } finally {
        clearTimeout(timer);
      }

      result.statusCode = response.status;
      result.isReachable = response.ok;

      if (!response.ok) {
        result.isBroken = true;
        result.auditFindings.push(`Website returned HTTP ${response.status} error`);
        result.missingDetails.push(`Broken Website (Error ${response.status})`);
        result.servicesWeOffer.push('Emergency Website Repair & Server Migration');
      } else {
        if (response.url && response.url.startsWith('https://')) {
          result.hasSsl = true;
        } else if (response.url && response.url.startsWith('http://')) {
          result.hasSsl = false;
        }

        const html = await response.text();
        this._parseHtml(html, result);
        this._extractSocialsAndContacts(html, cleanUrl, result);
      }
    } catch (err) {
      result.isBroken = true;
      result.isReachable = false;
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout ? 'Connection Timed Out (Slow Server)' : 'Failed to Connect / DNS Error';
      result.statusCode = isTimeout ? 'TIMEOUT' : 'UNREACHABLE';
      result.auditFindings.push(errMsg);
      result.missingDetails.push('Website Unreachable / Broken Server');
      result.servicesWeOffer.push('Website Rebuilding & High-Speed Cloud Hosting');
    }

    // Synthesize Missing Details & Services We Offer
    this._synthesizeMissingDetails(result, business);
    this._calculateScore(result, business);
    this._attachPitch(result, business);

    return result;
  },

  /**
   * Extracts Social Media URLs, Emails, and Phone Numbers from website HTML
   */
  _extractSocialsAndContacts(html, baseUrl, result) {
    if (!html || typeof html !== 'string') return;

    // 1. Social Media Links
    // Facebook
    const fbMatch = html.match(/https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/(?!sharer|share|dialog|plugins|tr|profile\.php\?id=0)([a-zA-Z0-9.\-_]+(?:\/[a-zA-Z0-9.\-_]+)?)/i);
    if (fbMatch) {
      result.socialLinks.facebook = fbMatch[0].replace(/["'>].*$/, '');
    }

    // Instagram
    const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/(?!explore|p\/|reel\/|stories\/|share)([a-zA-Z0-9._-]+)/i);
    if (igMatch) {
      result.socialLinks.instagram = igMatch[0].replace(/["'>].*$/, '');
    }

    // LinkedIn
    const liMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in|school)\/([a-zA-Z0-9._-]+)/i);
    if (liMatch) {
      result.socialLinks.linkedin = liMatch[0].replace(/["'>].*$/, '');
    }

    // Twitter / X
    const twMatch = html.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?!intent|share|privacy)([a-zA-Z0-9_]+)/i);
    if (twMatch) {
      result.socialLinks.twitter = twMatch[0].replace(/["'>].*$/, '');
    }

    // YouTube
    const ytMatch = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/|user\/)([a-zA-Z0-9._-]+)/i);
    if (ytMatch) {
      result.socialLinks.youtube = ytMatch[0].replace(/["'>].*$/, '');
    }

    // TikTok
    const ttMatch = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
    if (ttMatch) {
      result.socialLinks.tiktok = ttMatch[0].replace(/["'>].*$/, '');
    }

    // Pinterest
    const pinMatch = html.match(/https?:\/\/(?:www\.)?pinterest\.com\/([a-zA-Z0-9._-]+)/i);
    if (pinMatch) {
      result.socialLinks.pinterest = pinMatch[0].replace(/["'>].*$/, '');
    }

    // 2. Email Address Extraction
    const emailsFound = new Set();

    // Check mailto: links first (highest confidence)
    const mailtoRegex = /href=["']mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']/gi;
    let mailtoMatch;
    while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
      const email = mailtoMatch[1].toLowerCase().trim();
      if (this._isValidEmail(email)) emailsFound.add(email);
    }

    // General text email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g;
    const bodyMatches = html.match(emailRegex) || [];
    for (const em of bodyMatches) {
      const clean = em.toLowerCase().trim();
      if (this._isValidEmail(clean)) {
        emailsFound.add(clean);
      }
    }

    const emailList = Array.from(emailsFound);
    result.contactInfo.allEmails = emailList;
    result.contactInfo.email = emailList[0] || '';

    // 3. Website Phone Extraction
    const telMatch = html.match(/href=["']tel:([^"']+)["']/i);
    if (telMatch && telMatch[1]) {
      result.contactInfo.websitePhone = telMatch[1].trim();
    }
  },

  _isValidEmail(email) {
    if (!email || email.length < 6 || email.length > 50) return false;
    const lower = email.toLowerCase();
    const badEndings = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.js', '.css'];
    if (badEndings.some(ext => lower.endsWith(ext))) return false;

    const badWords = [
      'example.com',
      'domain.com',
      'yourname@',
      'yourdomain',
      'email@email.com',
      'sentry.io',
      'bootstrap',
      'wixpress',
      'schema.org'
    ];
    if (badWords.some(w => lower.includes(w))) return false;

    return true;
  },

  /**
   * Lightweight HTML inspection for SEO tags, tech stack, and automation widgets
   */
  _parseHtml(html, result) {
    if (!html || typeof html !== 'string') return;
    const lowerHtml = html.toLowerCase();

    // 1. Title Tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const cleanTitle = titleMatch[1].replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      result.titleText = cleanTitle;
      result.titleLength = cleanTitle.length;
      result.hasTitle = cleanTitle.length > 0 && !cleanTitle.toLowerCase().includes('untitled');
    }

    // 2. Meta Description
    const metaDescMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    if (metaDescMatch && metaDescMatch[1]) {
      const cleanDesc = metaDescMatch[1].replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      result.metaDescriptionText = cleanDesc;
      result.hasMetaDescription = cleanDesc.length > 5;
    }

    // 3. Viewport (Mobile Friendly indicator)
    result.isMobileFriendly = /<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html);

    // 4. CMS & Website Builders
    const cmsList = [];
    if (/wp-content|wp-includes|meta[^>]*generator[^>]*wordpress/i.test(html)) cmsList.push('WordPress');
    if (/cdn\.shopify\.com|myshopify\.com|Shopify\.theme/i.test(html)) {
      cmsList.push('Shopify');
      result.hasEcommerce = true;
      result.ecommercePlatform = 'Shopify';
    }
    if (/wp-content\/plugins\/woocommerce|woocommerce-/i.test(html)) {
      cmsList.push('WooCommerce');
      result.hasEcommerce = true;
      result.ecommercePlatform = 'WooCommerce';
    }
    if (/static\.wixstatic\.com|wix\.com/i.test(html)) cmsList.push('Wix');
    if (/squarespace\.com/i.test(html)) cmsList.push('Squarespace');
    if (/webflow\.com|assets\.website-files\.com/i.test(html)) cmsList.push('Webflow');
    if (/drupal/i.test(html)) cmsList.push('Drupal');
    if (/joomla/i.test(html)) cmsList.push('Joomla');
    result.cms = Array.from(new Set(cmsList));

    // 5. Frontend Frameworks
    const fwList = [];
    if (/__NEXT_DATA__|_next\//i.test(html)) fwList.push('Next.js');
    if (/__NUXT__/i.test(html)) fwList.push('Nuxt.js');
    if (/react|react-dom/i.test(html) && !fwList.includes('Next.js')) fwList.push('React');
    if (/vue\.min\.js|v-bind|v-model/i.test(html) && !fwList.includes('Nuxt.js')) fwList.push('Vue.js');
    if (/bootstrap/i.test(html)) fwList.push('Bootstrap');
    if (/tailwind/i.test(html)) fwList.push('Tailwind CSS');
    result.frameworks = Array.from(new Set(fwList));

    // 6. E-Commerce Indicators
    if (!result.hasEcommerce) {
      if (/magento|bigcommerce|prestashop|opencart|snipcart/i.test(lowerHtml)) {
        result.hasEcommerce = true;
        result.ecommercePlatform = 'Dedicated Cart';
      } else if (/js\.stripe\.com|paypal\.com\/sdk|square\.com/i.test(html)) {
        result.hasEcommerce = true;
        result.ecommercePlatform = 'Payment Gateway';
      } else if (/shopping-cart|add-to-cart|add_to_cart|btn-cart|data-item-price/i.test(html)) {
        result.hasEcommerce = true;
        result.ecommercePlatform = 'Custom Cart';
      }
    }

    // 7. Chat Widgets & Automation
    const chatWidgets = [];
    if (/wa\.me\/|api\.whatsapp\.com\/|whatsapp:\/\/send/i.test(html)) {
      result.hasWhatsapp = true;
      chatWidgets.push('WhatsApp');
    }
    if (/embed\.tawk\.to/i.test(html)) chatWidgets.push('Tawk.to');
    if (/widget\.intercom\.io/i.test(html)) chatWidgets.push('Intercom');
    if (/client\.crisp\.chat/i.test(html)) chatWidgets.push('Crisp');
    if (/static\.zdassets\.com|zendesk/i.test(html)) chatWidgets.push('Zendesk');
    if (/cdn\.livechatinc\.com/i.test(html)) chatWidgets.push('LiveChat');
    if (/js\.driftt\.com/i.test(html)) chatWidgets.push('Drift');
    if (/js\.hs-scripts\.com|hbspt/i.test(html)) chatWidgets.push('HubSpot Chat');
    if (/code\.tidio\.co/i.test(html)) chatWidgets.push('Tidio');
    if (/calendly\.com/i.test(html)) chatWidgets.push('Calendly Booking');

    if (chatWidgets.length > 0) {
      result.hasChatWidget = true;
      result.chatWidgetType = chatWidgets.join(', ');
    }

    result.technologies = Array.from(
      new Set([
        ...result.cms,
        ...result.frameworks,
        ...(result.ecommercePlatform ? [result.ecommercePlatform] : []),
        ...(chatWidgets.length > 0 ? chatWidgets : [])
      ])
    );
  },

  /**
   * Synthesizes gaps and corresponding agency services we offer
   */
  _synthesizeMissingDetails(result, business) {
    const missing = [];
    const services = [];

    if (result.hasWebsite && !result.isBroken) {
      // Social Media Gaps
      const hasAnySocial = Object.values(result.socialLinks).some(url => Boolean(url));
      if (!hasAnySocial) {
        missing.push('No Social Media Links on Website');
        services.push('Social Media Marketing (SMM) & Brand Profile Setup');
      } else {
        if (!result.socialLinks.instagram) {
          missing.push('Missing Instagram Profile');
          services.push('Instagram Growth & Reels Marketing');
        }
        if (!result.socialLinks.facebook) {
          missing.push('Missing Facebook Page');
          services.push('Facebook Business Page & Ads Management');
        }
      }

      // Email / Contact Form Gap
      if (!result.contactInfo.email) {
        missing.push('No Direct Email / Contact Form Found');
        services.push('Lead Capture Forms & Automated Email Notifications');
      }

      // SSL Gap
      if (!result.hasSsl) {
        missing.push('No SSL Certificate (Marked Insecure by Chrome)');
        services.push('SSL Security Installation & HTTPS Setup');
        result.auditFindings.push('No SSL Certificate (Not Secure)');
      }

      // SEO Gaps
      if (!result.hasTitle || !result.hasMetaDescription) {
        missing.push('Missing SEO Title / Meta Description Tags');
        services.push('On-Page Technical SEO & Search Rank Optimization');
        if (!result.hasTitle) result.auditFindings.push('Missing HTML Title Tag');
        if (!result.hasMetaDescription) result.auditFindings.push('Missing Meta Description');
      }

      // Mobile Responsive Gap
      if (!result.isMobileFriendly) {
        missing.push('Not Mobile Responsive (Poor smartphone layout)');
        services.push('Mobile-Friendly Website Redesign');
        result.auditFindings.push('Not Mobile Responsive');
      }

      // Automation / Chat Gap
      if (!result.hasChatWidget && !result.hasWhatsapp) {
        missing.push('No WhatsApp or Live Chat Widget');
        services.push('WhatsApp Business & 24/7 AI Chatbot Integration');
        result.auditFindings.push('No Instant Chat / WhatsApp');
      }

      // E-Commerce / Online Ordering Gap
      const isCommerceOrFood = /restaurant|cafe|bakery|store|shop|boutique|retail|salon|spa|dental|clinic|hotel|bar/i.test(
        business.category || ''
      );
      if (isCommerceOrFood && !result.hasEcommerce) {
        missing.push('No Online Ordering or Booking Integration');
        services.push('Direct Online Ordering & Table Booking System (0% Commission)');
      }
    }

    result.missingDetails = Array.from(new Set([...result.missingDetails, ...missing]));
    result.servicesWeOffer = Array.from(new Set([...result.servicesWeOffer, ...services]));
  },

  /**
   * Scores the lead from 0 - 100 points
   */
  _calculateScore(result, business) {
    let points = 0;
    const reasons = [];

    // Viability signals (Active paying customers)
    if (business.phone && business.phone.trim().length > 4) {
      points += 15;
      reasons.push('+15 Direct Phone Available');
    }
    const reviews = business.reviewCount || 0;
    if (reviews >= 10) {
      points += 15;
      reasons.push(`+15 Validated Business (${reviews} reviews)`);
    }

    // Urgency gaps (Agency Services)
    if (!result.hasWebsite) {
      points += 35; // Dream Web Dev prospect
      reasons.push('+35 No Website (High-Value Web Dev Prospect)');
    } else if (result.isBroken) {
      points += 30;
      reasons.push('+30 Broken Link (Urgent Repair)');
    } else {
      if (!result.hasSsl) {
        points += 20;
        reasons.push('+20 Missing SSL Certificate');
      }
      if (!result.isMobileFriendly) {
        points += 20;
        reasons.push('+20 Non-Responsive Mobile Design');
      }
      if (!result.hasTitle || !result.hasMetaDescription) {
        points += 15;
        reasons.push('+15 Missing Essential SEO Tags');
      }
      if (!result.hasChatWidget && !result.hasWhatsapp) {
        points += 10;
        reasons.push('+10 Missing Chat/Automation');
      }
      const hasAnySocial = Object.values(result.socialLinks || {}).some(url => Boolean(url));
      if (!hasAnySocial) {
        points += 10;
        reasons.push('+10 Missing Social Media Links (SMM Lead)');
      }
    }

    if (reviews < 15 && reviews > 0) {
      points += 10;
      reasons.push('+10 Low Review Count (Local SEO / Reputation)');
    }

    result.leadScorePoints = Math.min(100, points);
    result.leadScoreReasons = reasons;

    if (result.leadScorePoints >= 65) {
      result.leadScore = 'HIGH';
    } else if (result.leadScorePoints >= 40) {
      result.leadScore = 'MEDIUM';
    } else {
      result.leadScore = 'LOW';
    }
  },

  /**
   * Attaches pitch and value propositions
   */
  _attachPitch(result, business) {
    const generator = typeof PitchGenerator !== 'undefined' ? PitchGenerator : PitchGen;
    if (generator && typeof generator.generate === 'function') {
      const pitchData = generator.generate(result, business);
      result.primaryService = pitchData.primaryService;
      result.primaryPitch = pitchData.primaryPitch;
      result.opportunities = pitchData.opportunities;
      result.valueProposition = pitchData.valueProps.join(' | ');
    } else {
      result.primaryPitch = 'Contact client for agency services';
    }
  }
};

// Export for Node tests and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auditor;
} else if (typeof window !== 'undefined') {
  window.Auditor = Auditor;
}
