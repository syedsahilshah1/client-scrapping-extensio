/**
 * LeadPulse AI - Pitch & Value Proposition Generator
 * Generates tailored, high-converting outreach angles based on audited tech gaps.
 */

const PitchGenerator = {
  /**
   * Generates a primary outreach pitch and list of specific opportunities
   * @param {Object} audit - Audit result object
   * @param {Object} business - Basic business info (name, category, reviews, rating)
   * @returns {Object} { primaryPitch, valueProps: [], opportunities: [], primaryService }
   */
  generate(audit, business = {}) {
    const opportunities = [];
    const valueProps = [];
    let primaryService = 'General Growth';
    let primaryPitch = '';

    const name = business.name || 'your business';
    const reviews = business.reviewCount || 0;
    const rating = business.rating || 0;

    // 1. Web Development Gaps (Highest Priority)
    if (!audit.hasWebsite) {
      primaryService = 'Web Development';
      opportunities.push('Web Development');
      opportunities.push('Local Online Presence');
      valueProps.push(
        `You currently have no website listed on Google Maps. Over 70% of local consumers search online before visiting a local business. You are losing high-intent customers to nearby competitors every day.`
      );
      primaryPitch = `We noticed ${name} has great local demand but no direct website. We can launch a modern, mobile-optimized website for ${name} within 7 days to capture direct phone calls, orders, and inquiries.`;
    } else if (audit.isBroken) {
      primaryService = 'Web Development';
      opportunities.push('Broken Website Repair');
      opportunities.push('Website Modernization');
      valueProps.push(
        `Your website link on Google Maps returned a ${audit.statusCode || 'broken'} error. Potential customers clicking your profile are hitting a dead end.`
      );
      primaryPitch = `Your Google Maps profile currently links to an unreachable/broken page (${audit.websiteUrl}). We can fix and modernize your site so you stop leaking qualified leads.`;
    } else if (audit.isMobileFriendly === false) {
      primaryService = 'Web Development';
      opportunities.push('Mobile Optimization');
      valueProps.push(
        `Your website lacks a responsive mobile viewport. Over 65% of local searches happen on smartphones, and non-mobile sites suffer severe ranking drops.`
      );
      if (!primaryPitch) {
        primaryPitch = `Your website is not optimized for mobile smartphone users. We can upgrade your website to a fully responsive, modern design that converts mobile visitors into paying customers.`;
      }
    }

    // 2. SEO Gaps
    const seoIssues = [];
    if (audit.hasWebsite && !audit.isBroken) {
      if (audit.hasSsl === false) {
        opportunities.push('SSL Security');
        seoIssues.push('No SSL Certificate (HTTP instead of HTTPS)');
        valueProps.push(
          `Your site is marked 'Not Secure' by Google Chrome. This scares away up to 80% of visitors and incurs Google ranking penalties.`
        );
      }
      if (audit.hasTitle === false || audit.titleLength < 10) {
        opportunities.push('On-Page SEO');
        seoIssues.push('Missing or incomplete SEO Title tag');
        valueProps.push(
          `Your website lacks an optimized <title> tag. Google cannot accurately identify what services you offer in your local area.`
        );
      }
      if (audit.hasMetaDescription === false) {
        opportunities.push('Meta Description Optimization');
        seoIssues.push('Missing Meta Description');
        valueProps.push(
          `Missing meta description tag hurts your search snippet click-through rates on Google search results.`
        );
      }
    }

    // Reputation / Local SEO Review Gap
    if (reviews < 15 && reviews > 0) {
      opportunities.push('Google Review Generation');
      valueProps.push(
        `You currently have only ${reviews} Google reviews. Businesses with 40+ reviews dominate the Google Maps 3-Pack rankings in local search.`
      );
    } else if (reviews === 0) {
      opportunities.push('Reputation Management');
      valueProps.push(
        `Zero reviews on your listing causes immediate trust friction for new prospective clients.`
      );
    }

    if (seoIssues.length > 0 && !primaryPitch) {
      primaryService = 'SEO Services';
      primaryPitch = `Your website has critical technical SEO gaps (${seoIssues.join(', ')}). We can optimize your on-page SEO and local schema to push ${name} to the top of Google local rankings.`;
    }

    // 3. E-Commerce / Online Booking Gaps
    if (audit.hasWebsite && !audit.isBroken) {
      const isCommerceOrFood = /restaurant|cafe|bakery|store|shop|boutique|retail|salon|spa|dental|clinic|auto/i.test(
        business.category || ''
      );

      if (isCommerceOrFood && !audit.hasEcommerce) {
        opportunities.push('E-Commerce & Online Booking');
        valueProps.push(
          `No direct online ordering or booking system detected. You may be paying 20-30% commissions to third-party portals or missing direct reservations.`
        );
        if (!primaryPitch) {
          primaryService = 'E-Commerce Solutions';
          primaryPitch = `Integrate an automated direct ordering/booking system on your website to capture sales without paying heavy platform commissions.`;
        }
      }
    }

    // 4. Social Media Presence Gaps
    if (audit.hasWebsite && !audit.isBroken && audit.socialLinks) {
      const hasAnySocial = Object.values(audit.socialLinks).some(url => Boolean(url));
      if (!hasAnySocial) {
        opportunities.push('Social Media Marketing (SMM)');
        valueProps.push(
          `No active social media channels (Facebook/Instagram/TikTok) detected on your site. You are missing out on organic viral reach and younger demographics.`
        );
        if (!primaryPitch) {
          primaryService = 'Social Media Marketing';
          primaryPitch = `Launch professional social media pages (Instagram, Facebook & TikTok) for ${name} to attract local foot traffic and build brand loyalty.`;
        }
      }
    }

    // 5. Automation & Chat Gaps
    if (audit.hasWebsite && !audit.isBroken && !audit.hasChatWidget && !audit.hasWhatsapp) {
      opportunities.push('Chat & WhatsApp Automation');
      valueProps.push(
        `No live chat or automated WhatsApp responder found on your website. 60%+ of customers choose the business that responds first within 5 minutes.`
      );
      if (!primaryPitch) {
        primaryService = 'Automation';
        primaryPitch = `Add an automated WhatsApp or AI live chat widget to ${name}'s website to capture customer inquiries and schedule bookings 24/7 automatically.`;
      }
    }

    // Fallback pitch if everything looked good
    if (!primaryPitch) {
      primaryPitch = `Enhance ${name}'s digital footprint with high-converting landing pages, review automation, and local Google Ads to scale customer acquisition.`;
      opportunities.push('Growth & Funnel Optimization');
    }

    return {
      primaryService,
      primaryPitch,
      opportunities: Array.from(new Set(opportunities)),
      valueProps
    };
  }
};

// Export for Node tests and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PitchGenerator;
} else if (typeof window !== 'undefined') {
  window.PitchGenerator = PitchGenerator;
}

