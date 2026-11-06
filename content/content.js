/**
 * LeadPulse AI - Google Maps Content Script
 * Scrapes business profiles, coordinates deep inspections, and syncs with background auditor.
 */

const LeadScraper = {
  isScraping: false,
  isPaused: false,
  scrapedLeads: new Map(), // key: url or name -> lead object
  targetLimit: 50,
  scrollDelayMs: 2000,
  scrapingMode: 'fast', // 'fast' | 'deep'
  highScoreCount: 0,
  feedElement: null,

  init() {
    console.log('[LeadPulse AI] Content script active on Google Maps.');

    // Initialize floating HUD
    if (typeof FloatingHUD !== 'undefined') {
      FloatingHUD.init({
        onStart: () => this.start(),
        onPause: () => this.pause(),
        onResume: () => this.resume(),
        onStop: () => this.stop(),
        onExport: () => this.exportCurrentLeads()
      });
    }

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'PING':
          sendResponse({ pong: true });
          break;

        case 'GET_CURRENT_QUERY':
          sendResponse({
            success: true,
            query: this.extractCurrentQuery(),
            hasResults: Boolean(this.findFeedElement())
          });
          break;

        case 'START_SCRAPER_COMMAND':
          this.start(message.settings || {});
          sendResponse({ success: true });
          break;

        case 'SEARCH_AND_SCRAPE_COMMAND':
          this.searchAndScrape(message.query, message.settings || {});
          sendResponse({ success: true });
          break;

        case 'PAUSE_SCRAPER_COMMAND':
          this.pause();
          sendResponse({ success: true });
          break;

        case 'RESUME_SCRAPER_COMMAND':
          this.resume();
          sendResponse({ success: true });
          break;

        case 'STOP_SCRAPER_COMMAND':
          this.stop();
          sendResponse({ success: true });
          break;

        case 'LEAD_AUDITED':
          if (message.lead && message.lead.leadScore === 'HIGH') {
            this.highScoreCount++;
            this.updateHUD();
          }
          break;
      }
    });
  },

  /**
   * Finds the Google Maps scrollable feed container using multi-tiered fallbacks
   */
  findFeedElement() {
    // Strategy 1: Explicit feed role
    const feed = document.querySelector('div[role="feed"]');
    if (feed && feed.scrollHeight > 150) {
      return feed;
    }

    // Strategy 2: Multi-lingual Aria label matches
    const ariaMatch = document.querySelector(
      'div[aria-label*="Results"], div[aria-label*="results"], div[aria-label*="Resultados"], div[aria-label*="résultats"], div[aria-label*="Ergebnisse"]'
    );
    if (ariaMatch && ariaMatch.scrollHeight > 150) {
      return ariaMatch;
    }

    // Strategy 3: Standard Google Maps container classes
    const classSelectors = [
      'div.m6QErb[aria-label]',
      'div.m6QErb.DxyBCb',
      'div.m6QErb.kA9KIf',
      'div.m6QErb.dS8AEf',
      'div[role="main"] div.m6QErb'
    ];
    for (const sel of classSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const c of candidates) {
        if (c.scrollHeight > 250 && c.clientHeight > 150) {
          return c;
        }
      }
    }

    // Strategy 4: Traversal from any rendered place link/card to scrollable parent
    const placeNodes = document.querySelectorAll('div[role="article"], div.Nv2PK, a[href*="/maps/place/"]');
    if (placeNodes.length > 0) {
      let current = placeNodes[0].parentElement;
      while (current && current !== document.body && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && current.clientHeight > 180;
        if (isScrollable || (current.scrollHeight > current.clientHeight && current.clientHeight > 250)) {
          return current;
        }
        current = current.parentElement;
      }
    }

    return null;
  },

  /**
   * Waits up to timeoutMs for Google Maps feed to render
   */
  async waitForFeed(timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const feed = this.findFeedElement();
      if (feed) return feed;
      await this.sleep(300);
    }
    return null;
  },

  /**
   * Automates search query input and triggers scraping once loaded
   */
  async searchAndScrape(query, settings = {}) {
    if (!query) {
      await this.start(settings);
      return;
    }

    if (typeof FloatingHUD !== 'undefined') {
      FloatingHUD.showToast(`🔍 Searching Google Maps for "${query}"...`, 'info', 3000);
    }

    const searchInput = document.querySelector('input#searchboxinput');
    const searchBtn = document.querySelector('#searchbox-searchbutton, button[id*="search"], button[aria-label*="Search"]');

    if (searchInput && searchBtn) {
      searchInput.value = query;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      await this.sleep(200);
      searchBtn.click();
    } else {
      // Direct SPA navigation
      window.location.href = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      return;
    }

    if (typeof FloatingHUD !== 'undefined') {
      FloatingHUD.showToast('Waiting for search results to load...', 'info', 3000);
    }

    const feed = await this.waitForFeed(6000);
    if (!feed) {
      if (typeof FloatingHUD !== 'undefined') {
        FloatingHUD.showToast(`No results found for "${query}". Try another location or keyword.`, 'warning', 5000);
      }
      this.notifyBackgroundStatus(true);
      return;
    }

    await this.start(settings);
  },

  /**
   * Starts scraping process
   */
  async start(settings = {}) {
    if (this.isScraping && !this.isPaused) return;

    this.isScraping = true;
    this.isPaused = false;
    this.targetLimit = settings.maxLeads || 50;
    this.scrollDelayMs = settings.scrollDelayMs || 2000;
    this.scrapingMode = settings.scrapingMode || 'fast';

    // Check if feed is available, or wait briefly if page is still rendering
    this.feedElement = this.findFeedElement();
    if (!this.feedElement) {
      this.feedElement = await this.waitForFeed(3500);
    }

    if (!this.feedElement) {
      const msg = 'Please enter a niche & location above (e.g. "Dentists in Miami") or search on Google Maps first!';
      if (typeof FloatingHUD !== 'undefined') {
        FloatingHUD.showToast(msg, 'warning', 6000);
      }
      chrome.runtime.sendMessage({
        type: 'SCRAPER_STATUS_UPDATE',
        data: {
          isScraping: false,
          error: msg
        }
      }).catch(() => {});
      this.isScraping = false;
      this.updateHUD();
      return;
    }

    if (typeof FloatingHUD !== 'undefined') {
      FloatingHUD.showToast('🚀 Scraping Google Maps listings...', 'info', 2500);
    }

    this.updateHUD();
    this.notifyBackgroundStatus();

    try {
      await this.runScrapeLoop();
    } catch (err) {
      console.error('[LeadPulse AI] Scrape loop error:', err);
    } finally {
      this.isScraping = false;
      this.updateHUD();
      this.notifyBackgroundStatus(true);
    }
  },

  pause() {
    this.isPaused = true;
    this.updateHUD();
    chrome.runtime.sendMessage({ type: 'SCRAPER_STATUS_UPDATE', data: { isPaused: true } });
  },

  resume() {
    this.isPaused = false;
    this.updateHUD();
    chrome.runtime.sendMessage({ type: 'SCRAPER_STATUS_UPDATE', data: { isPaused: false } });
  },

  stop() {
    this.isScraping = false;
    this.isPaused = false;
    this.updateHUD();
    this.notifyBackgroundStatus(true);
  },

  updateHUD() {
    if (typeof FloatingHUD !== 'undefined') {
      FloatingHUD.update({
        isScraping: this.isScraping,
        isPaused: this.isPaused,
        isFinished: !this.isScraping && this.scrapedLeads.size > 0,
        scrapedCount: this.scrapedLeads.size,
        targetLimit: this.targetLimit,
        highCount: this.highScoreCount
      });
    }
  },

  notifyBackgroundStatus(isFinished = false) {
    chrome.runtime.sendMessage({
      type: 'SCRAPER_STATUS_UPDATE',
      data: {
        isScraping: this.isScraping,
        isPaused: this.isPaused,
        isFinished,
        scrapedCount: this.scrapedLeads.size,
        targetLimit: this.targetLimit,
        activeQuery: this.extractCurrentQuery()
      }
    }).catch(() => {});
  },

  async exportCurrentLeads() {
    try {
      const data = await chrome.storage.local.get(['leads']);
      const leads = data.leads && data.leads.length > 0 ? data.leads : Array.from(this.scrapedLeads.values());
      if (leads.length === 0) {
        if (typeof FloatingHUD !== 'undefined') {
          FloatingHUD.showToast('No leads collected to export yet.', 'warning', 3000);
        }
        return;
      }
      if (typeof Exporter !== 'undefined') {
        const safeQuery = this.extractCurrentQuery().replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
        Exporter.exportToExcel(leads, `Leads_${safeQuery || 'GoogleMaps'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        if (typeof FloatingHUD !== 'undefined') {
          FloatingHUD.showToast(`✅ Exported ${leads.length} leads with Socials & Gaps to Excel!`, 'info', 4000);
        }
      }
    } catch (e) {
      console.error('[LeadPulse AI] Export error:', e);
    }
  },

  extractCurrentQuery() {
    const searchInput = document.querySelector('input#searchboxinput');
    if (searchInput && searchInput.value) return searchInput.value;
    const match = window.location.pathname.match(/\/maps\/search\/([^/]+)/);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : 'Google Maps Search';
  },

  /**
   * Main scrape loop with scrolling & item parsing
   */
  async runScrapeLoop() {
    let idleScrollCount = 0;
    let lastScrollTop = -1;

    while (this.isScraping && this.scrapedLeads.size < this.targetLimit) {
      if (this.isPaused) {
        await this.sleep(500);
        continue;
      }

      // 1. Scrape all currently rendered cards
      const newLeadsFound = await this.scrapeVisibleCards();

      // 2. Check if we met the limit
      if (this.scrapedLeads.size >= this.targetLimit) {
        break;
      }

      // 3. Scroll feed to trigger lazy-loaded cards
      if (!this.feedElement || !document.contains(this.feedElement)) {
        this.feedElement = this.findFeedElement();
      }

      if (this.feedElement) {
        const prevTop = this.feedElement.scrollTop;
        this.feedElement.scrollTop += 700;
        this.feedElement.scrollBy({ top: 700, behavior: 'smooth' });
        this.feedElement.dispatchEvent(new Event('scroll'));
        await this.sleep(this.scrollDelayMs);

        // Check if we hit the bottom of the feed
        if (this.feedElement.scrollTop === prevTop || this.isEndOfList()) {
          idleScrollCount++;
          if (idleScrollCount >= 3) {
            console.log('[LeadPulse AI] Reached end of Google Maps feed.');
            break;
          }
        } else {
          idleScrollCount = 0;
        }
      } else {
        await this.sleep(1000);
      }
    }
  },

  isEndOfList() {
    const endIndicators = [
      "You've reached the end of the list.",
      "No more results",
      "You've seen all results"
    ];
    const text = document.body.innerText;
    return endIndicators.some(phrase => text.includes(phrase));
  },

  /**
   * Scrapes currently visible cards in the feed
   */
  async scrapeVisibleCards() {
    const cards = [];

    // Prioritize direct place links (universal in all Google Maps layouts)
    const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');
    placeLinks.forEach(link => {
      const card = link.closest('div.Nv2PK') ||
                   link.closest('div[role="article"]') ||
                   link.closest('div.THOPZb') ||
                   link.closest('div.m6QErb > div') ||
                   link.parentElement;
      if (card && !cards.includes(card)) {
        cards.push(card);
      }
    });

    // Fallback: direct articles
    if (cards.length === 0) {
      const articleElements = document.querySelectorAll('div[role="article"], div.Nv2PK, div.THOPZb');
      articleElements.forEach(art => {
        if (!cards.includes(art)) cards.push(art);
      });
    }

    let newlyDiscovered = 0;

    for (const card of cards) {
      if (!this.isScraping || this.scrapedLeads.size >= this.targetLimit) break;

      const lead = this.parseCard(card);
      if (lead && lead.name && !this.scrapedLeads.has(lead.dedupKey)) {
        this.scrapedLeads.set(lead.dedupKey, lead);
        newlyDiscovered++;

        // If Deep Mode requested, click into the card to fetch verified phone & website
        if (this.scrapingMode === 'deep') {
          await this.deepInspectCard(card, lead);
        }

        // Send to background for live website & tech auditing
        chrome.runtime.sendMessage({
          type: 'RAW_LEAD_DISCOVERED',
          data: { lead }
        }).catch(() => {});

        this.updateHUD();
        this.notifyBackgroundStatus();
      }
    }

    return newlyDiscovered;
  },

  /**
   * Parses basic data directly from feed card DOM
   */
  parseCard(card) {
    // 1. Link & Name
    const linkEl = card.querySelector('a[href*="/maps/place/"]') || card.closest('a[href*="/maps/place/"]');
    const placeUrl = linkEl ? linkEl.href : '';

    let name = '';
    const nameEl = card.querySelector('.qBF1Pd, div[class*="fontHeadlineSmall"], a.hfpxzc');
    if (nameEl) {
      name = nameEl.textContent.trim() || nameEl.getAttribute('aria-label') || '';
    } else if (linkEl && linkEl.getAttribute('aria-label')) {
      name = linkEl.getAttribute('aria-label').trim();
    }

    if (!name) return null;

    // 2. Rating & Review Count
    let rating = null;
    let reviewCount = 0;

    const ratingEl = card.querySelector('span.MW4etd, span[aria-label*="stars"]');
    if (ratingEl) {
      const ratingText = ratingEl.textContent.trim() || ratingEl.getAttribute('aria-label') || '';
      const rMatch = ratingText.match(/(\d+\.\d+|\d+)/);
      if (rMatch) rating = parseFloat(rMatch[1]);
    }

    const reviewEl = card.querySelector('span.UY7F9, span[aria-label*="reviews"]');
    if (reviewEl) {
      const reviewText = reviewEl.textContent.trim() || reviewEl.getAttribute('aria-label') || '';
      const revMatch = reviewText.match(/([\d,]+)/);
      if (revMatch) reviewCount = parseInt(revMatch[1].replace(/,/g, ''), 10);
    }

    // 3. Category & Address info from secondary rows
    const textRows = Array.from(card.querySelectorAll('.W4Efsd, div.fontBodyMedium'));
    let category = '';
    let address = '';
    let phone = '';

    for (const row of textRows) {
      const text = row.textContent.trim();
      // Phone check
      const phoneMatch = text.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/);
      if (phoneMatch && !phone) {
        phone = phoneMatch[0].trim();
      }

      // Category detection
      const spans = row.querySelectorAll('span');
      if (spans.length > 0 && !category) {
        for (const s of spans) {
          const sText = s.textContent.trim();
          if (sText && !sText.includes('·') && !sText.match(/\d/) && sText.length < 35) {
            category = sText;
            break;
          }
        }
      }

      // Address check
      if (text.includes(',') || text.includes('Rd') || text.includes('St') || text.includes('Ave') || text.includes('Sector')) {
        if (!address) address = text.replace(/·/g, '').trim();
      }
    }

    // 4. Website Link (Visible in feed card)
    let website = '';
    const websiteEl = card.querySelector('a[data-value="Website"], a[aria-label*="Website"], a[href^="http"]:not([href*="google.com"]):not([href*="/maps/"])');
    if (websiteEl) {
      website = websiteEl.href;
    }

    const dedupKey = placeUrl || `${name}_${address}_${phone}`;

    return {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dedupKey,
      name,
      rating,
      reviewCount,
      category,
      address,
      phone,
      website,
      googleMapsUrl: placeUrl
    };
  },

  /**
   * Deep Inspection: Clicks card to extract precise phone, website, and address from detail view
   */
  async deepInspectCard(card, lead) {
    try {
      const clickable = card.querySelector('a.hfpxzc, a[href*="/maps/place/"]') || card;
      clickable.click();
      await this.sleep(1200);

      // Detail container selectors
      const websiteBtn = document.querySelector('a[data-item-id="authority"], a[aria-label*="Website:"]');
      if (websiteBtn && websiteBtn.href) {
        lead.website = websiteBtn.href;
      }

      const phoneBtn = document.querySelector('button[data-item-id^="phone:"], button[aria-label*="Phone:"]');
      if (phoneBtn) {
        const phoneLabel = phoneBtn.getAttribute('aria-label') || phoneBtn.textContent;
        const pMatch = phoneLabel.match(/[\d\s+\-().]{7,}/);
        if (pMatch) lead.phone = pMatch[0].trim();
      }

      const addressBtn = document.querySelector('button[data-item-id="address"], button[aria-label*="Address:"]');
      if (addressBtn) {
        lead.address = (addressBtn.getAttribute('aria-label') || addressBtn.textContent)
          .replace(/^Address:\s*/i, '')
          .trim();
      }
    } catch (e) {
      console.warn('[LeadPulse AI] Deep inspection error:', e);
    }
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Initialize once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LeadScraper.init());
} else {
  LeadScraper.init();
}

