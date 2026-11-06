/**
 * LeadPulse AI - Background Service Worker (Manifest V3)
 * Orchestrates background audits, state management, storage, and communication.
 */

// Import auditor, pitch generator, Google Sync, and License Manager into service worker
importScripts('pitchGenerator.js', 'auditor.js', 'googleSync.js', 'licenseManager.js');

// Runtime state
const state = {
  isScraping: false,
  isPaused: false,
  activeTabId: null,
  activeQuery: '',
  targetLimit: 50,
  leadsCount: 0,
  auditQueue: [],
  isProcessingQueue: false,
  settings: {
    maxLeads: 50,
    scrollDelayMs: 2000,
    enableTechAudit: true,
    auditTimeoutMs: 7000,
    scrapingMode: 'fast', // 'fast' | 'deep'
    enableGoogleSync: false,
    googleSheetsWebhookUrl: ''
  }
};

// Initialize settings from storage
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[LeadPulse AI] Extension installed.');
  const stored = await chrome.storage.local.get(['settings', 'leads']);
  if (stored.settings) {
    Object.assign(state.settings, stored.settings);
  } else {
    await chrome.storage.local.set({ settings: state.settings });
  }

  const existingLeads = stored.leads || [];
  state.leadsCount = existingLeads.length;
  updateBadge(existingLeads.length);
});

// Ensure content script is running in tab, inject if missing
async function ensureContentScriptReady(tabId) {
  if (!tabId) return false;
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (res && res.pong) return true;
  } catch (err) {
    console.log('[LeadPulse AI] Dynamic script injection into tab', tabId);
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/content.css']
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'lib/xlsx.full.min.js',
          'lib/exporter.js',
          'content/floatingHud.js',
          'content/content.js'
        ]
      });
      await new Promise(r => setTimeout(r, 400));
      return true;
    } catch (injErr) {
      console.warn('[LeadPulse AI] Dynamic injection failed:', injErr);
      return false;
    }
  }
  return true;
}

// Listen for tab navigation to auto-start pending scrape
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && state.pendingScrape && state.pendingScrape.tabId === tabId) {
    console.log('[LeadPulse AI] Tab finished loading target search. Starting scraper...');
    const pending = { ...state.pendingScrape };
    state.pendingScrape = null;

    await new Promise(r => setTimeout(r, 1800)); // allow GMaps DOM to render
    await ensureContentScriptReady(tabId);
    chrome.tabs.sendMessage(tabId, {
      type: 'START_SCRAPER_COMMAND',
      settings: pending.settings
    }).catch(err => console.warn('Could not start scraper on loaded tab:', err));
  }
});

// Update extension icon badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Background Queue Processor for Auditing
async function processAuditQueue() {
  if (state.isProcessingQueue) return;
  state.isProcessingQueue = true;

  while (state.auditQueue.length > 0) {
    const item = state.auditQueue.shift();
    try {
      let auditResult;
      if (state.settings.enableTechAudit) {
        auditResult = await Auditor.auditBusiness(item.lead, {
          timeoutMs: state.settings.auditTimeoutMs
        });
      } else {
        // Basic evaluation without network fetch
        auditResult = {
          websiteUrl: item.lead.website || '',
          hasWebsite: Boolean(item.lead.website),
          hasSsl: item.lead.website ? item.lead.website.startsWith('https://') : false,
          isReachable: null,
          isBroken: false,
          leadScore: item.lead.website ? 'MEDIUM' : 'HIGH',
          leadScorePoints: item.lead.website ? 50 : 80,
          opportunities: item.lead.website ? ['General SEO & Growth'] : ['Web Development', 'Local Online Presence'],
          primaryService: item.lead.website ? 'SEO & Growth' : 'Web Development',
          primaryPitch: item.lead.website
            ? `Scale ${item.lead.name}'s customer base with modern SEO and review automation.`
            : `Build a modern, mobile-responsive website for ${item.lead.name} to capture direct local leads.`,
          auditFindings: item.lead.website ? ['Audit disabled in settings'] : ['No website listed']
        };
      }

      const completeLead = {
        ...item.lead,
        ...auditResult,
        id: item.lead.id || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        scrapedAt: new Date().toISOString()
      };

      // Save to chrome.storage.local
      await saveLead(completeLead);

      // Live Sync to Google Sheets if configured
      if (state.settings.enableGoogleSync && state.settings.googleSheetsWebhookUrl && typeof GoogleSync !== 'undefined') {
        GoogleSync.syncLead(completeLead, state.settings.googleSheetsWebhookUrl)
          .then(() => {
            broadcast({ type: 'GOOGLE_SYNC_UPDATE', data: { leadId: completeLead.id, success: true } });
          })
          .catch(syncErr => {
            console.warn('[LeadPulse AI] Google Sheet auto-sync warning:', syncErr.message);
          });
      }

      // Notify content script and popup
      broadcast({
        type: 'LEAD_AUDITED',
        lead: completeLead
      });
    } catch (err) {
      console.error('[LeadPulse AI] Error auditing lead:', err);
    }
  }

  state.isProcessingQueue = false;
}

// Save or update lead in storage (deduplicated)
async function saveLead(newLead) {
  const data = await chrome.storage.local.get(['leads']);
  const leads = data.leads || [];

  // Deduplication key: Google Maps URL or (Name + Phone/Address)
  const existingIndex = leads.findIndex(l => {
    if (newLead.googleMapsUrl && l.googleMapsUrl && l.googleMapsUrl === newLead.googleMapsUrl) {
      return true;
    }
    const sameName = l.name && newLead.name && l.name.toLowerCase() === newLead.name.toLowerCase();
    const sameAddress = l.address && newLead.address && l.address.toLowerCase() === newLead.address.toLowerCase();
    return sameName && sameAddress;
  });

  if (existingIndex >= 0) {
    leads[existingIndex] = { ...leads[existingIndex], ...newLead };
  } else {
    leads.unshift(newLead);
  }

  await chrome.storage.local.set({ leads });
  state.leadsCount = leads.length;
  updateBadge(leads.length);
}

// Broadcast message to popup & active tabs
function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might be closed, which is expected
  });

  if (state.activeTabId) {
    chrome.tabs.sendMessage(state.activeTabId, message).catch(() => {
      // Tab might not be ready
    });
  }
}

// Listen for messages from Content Script and Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, data } = message;

  switch (type) {
    case 'GET_STATUS':
      sendResponse({
        success: true,
        state: {
          isScraping: state.isScraping,
          isPaused: state.isPaused,
          leadsCount: state.leadsCount,
          activeQuery: state.activeQuery,
          settings: state.settings
        }
      });
      return false;

    case 'START_SCRAPING':
      state.isScraping = true;
      state.isPaused = false;
      if (data && data.tabId) state.activeTabId = data.tabId;
      if (data && data.settings) Object.assign(state.settings, data.settings);

      if (state.activeTabId) {
        (async () => {
          if (typeof LicenseManager !== 'undefined') {
            const lic = await LicenseManager.getLicenseInfo();
            if (!lic.isPro) {
              state.settings.maxLeads = Math.min(state.settings.maxLeads || 25, LicenseManager.FREE_LIMIT);
            }
          }
          await ensureContentScriptReady(state.activeTabId);
          chrome.tabs.sendMessage(state.activeTabId, {
            type: 'START_SCRAPER_COMMAND',
            settings: state.settings
          }).catch(err => console.warn('Could not message content script:', err));
        })();
      }
      sendResponse({ success: true, message: 'Scraping started' });
      return false;

    case 'SEARCH_AND_SCRAPE':
      state.isScraping = true;
      state.isPaused = false;
      const targetTabId = data && data.tabId ? data.tabId : state.activeTabId;
      state.activeTabId = targetTabId;
      if (data && data.settings) Object.assign(state.settings, data.settings);
      const query = (data?.query || '').trim();
      state.activeQuery = query;

      if (targetTabId) {
        (async () => {
          try {
            if (typeof LicenseManager !== 'undefined') {
              const lic = await LicenseManager.getLicenseInfo();
              if (!lic.isPro) {
                state.settings.maxLeads = Math.min(state.settings.maxLeads || 25, LicenseManager.FREE_LIMIT);
              }
            }
            const tab = await chrome.tabs.get(targetTabId);
            const currentUrl = tab.url || '';
            const queryFormatted = encodeURIComponent(query).replace(/%20/g, '+');
            const targetUrl = `https://www.google.com/maps/search/${queryFormatted}`;

            const isAlreadyOnThisSearch =
              currentUrl.includes(`/maps/search/${encodeURIComponent(query)}`) ||
              currentUrl.includes(`/maps/search/${queryFormatted}`);

            if (query && !isAlreadyOnThisSearch) {
              console.log('[LeadPulse AI] Updating tab URL to:', targetUrl);
              state.pendingScrape = {
                tabId: targetTabId,
                query,
                settings: state.settings
              };
              await chrome.tabs.update(targetTabId, { url: targetUrl });
              broadcast({
                type: 'STATUS_SYNC',
                data: {
                  isScraping: true,
                  activeQuery: query,
                  tickerMessage: `Navigating Google Maps to "${query}"...`
                }
              });
              return;
            }

            // Already on this search page
            await ensureContentScriptReady(targetTabId);
            chrome.tabs.sendMessage(targetTabId, {
              type: 'START_SCRAPER_COMMAND',
              settings: state.settings
            }).catch(err => console.warn('Could not message content script:', err));
          } catch (err) {
            console.error('[LeadPulse AI] Search and scrape error:', err);
          }
        })();
      }
      sendResponse({ success: true, message: 'Search and scrape initiated' });
      return false;

    case 'PAUSE_SCRAPING':
      state.isPaused = true;
      if (state.activeTabId) {
        chrome.tabs.sendMessage(state.activeTabId, { type: 'PAUSE_SCRAPER_COMMAND' }).catch(() => {});
      }
      sendResponse({ success: true });
      return false;

    case 'RESUME_SCRAPING':
      state.isPaused = false;
      if (state.activeTabId) {
        chrome.tabs.sendMessage(state.activeTabId, { type: 'RESUME_SCRAPER_COMMAND' }).catch(() => {});
      }
      sendResponse({ success: true });
      return false;

    case 'STOP_SCRAPING':
      state.isScraping = false;
      state.isPaused = false;
      if (state.activeTabId) {
        chrome.tabs.sendMessage(state.activeTabId, { type: 'STOP_SCRAPER_COMMAND' }).catch(() => {});
      }
      broadcast({ type: 'SCRAPING_FINISHED' });
      sendResponse({ success: true });
      return false;

    case 'RAW_LEAD_DISCOVERED':
      // From Content Script
      if (data && data.lead) {
        state.auditQueue.push({ lead: data.lead, tabId: sender.tab?.id });
        processAuditQueue();
      }
      sendResponse({ success: true });
      return false;

    case 'SCRAPER_STATUS_UPDATE':
      // From Content Script
      if (data) {
        if (data.isFinished) {
          state.isScraping = false;
          state.isPaused = false;
        }
        if (data.activeQuery) {
          state.activeQuery = data.activeQuery;
        }
      }
      broadcast({ type: 'STATUS_SYNC', data });
      sendResponse({ success: true });
      return false;

    case 'CLEAR_ALL_LEADS':
      chrome.storage.local.set({ leads: [] }).then(() => {
        state.leadsCount = 0;
        updateBadge(0);
        broadcast({ type: 'LEADS_CLEARED' });
        sendResponse({ success: true });
      });
      return true; // asynchronous

    case 'TEST_GOOGLE_SYNC':
      if (data && data.webhookUrl && typeof GoogleSync !== 'undefined') {
        GoogleSync.testConnection(data.webhookUrl)
          .then(res => sendResponse({ success: true, res }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
      sendResponse({ success: false, error: 'No webhook URL provided.' });
      return false;

    case 'BATCH_SYNC_GOOGLE_SHEETS':
      if (data && data.webhookUrl && typeof GoogleSync !== 'undefined') {
        chrome.storage.local.get(['leads']).then(stored => {
          const leadsToSync = stored.leads || [];
          if (leadsToSync.length === 0) {
            sendResponse({ success: false, error: 'No leads stored to sync.' });
            return;
          }
          GoogleSync.syncBatch(leadsToSync, data.webhookUrl)
            .then(res => sendResponse({ success: true, count: leadsToSync.length, res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        });
        return true;
      }
      sendResponse({ success: false, error: 'Invalid sync request.' });
      return false;

    case 'GET_APPS_SCRIPT_TEMPLATE':
      if (typeof GoogleSync !== 'undefined') {
        const tpl = GoogleSync.getAppsScriptTemplate(data?.spreadsheetId, data?.sheetGid);
        sendResponse({ success: true, template: tpl });
      } else {
        sendResponse({ success: false, error: 'GoogleSync module not loaded.' });
      }
      return false;

    case 'GET_DIRECT_IMPORTER_SCRIPT':
      if (typeof GoogleSync !== 'undefined') {
        chrome.storage.local.get(['leads']).then(stored => {
          const leads = stored.leads || [];
          const script = GoogleSync.generateDirectImporterScript(leads, data?.spreadsheetId, data?.sheetGid);
          sendResponse({ success: true, script, count: leads.length });
        });
        return true;
      } else {
        sendResponse({ success: false, error: 'GoogleSync module not loaded.' });
        return false;
      }

    case 'CHECK_LICENSE':
      if (typeof LicenseManager !== 'undefined') {
        LicenseManager.getLicenseInfo().then(info => sendResponse({ success: true, license: info }));
        return true;
      }
      sendResponse({ success: false, license: { isPro: false, plan: 'FREE', maxLeads: 25 } });
      return false;

    case 'ACTIVATE_LICENSE':
      if (typeof LicenseManager !== 'undefined') {
        LicenseManager.activate(data?.key)
          .then(license => {
            broadcast({ type: 'LICENSE_UPDATED', license });
            sendResponse({ success: true, license });
          })
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
      sendResponse({ success: false, error: 'License manager not available' });
      return false;

    case 'DEACTIVATE_LICENSE':
      if (typeof LicenseManager !== 'undefined') {
        LicenseManager.deactivate().then(license => {
          broadcast({ type: 'LICENSE_UPDATED', license });
          sendResponse({ success: true, license });
        });
        return true;
      }
      sendResponse({ success: false, error: 'License manager not available' });
      return false;

    case 'UPDATE_SETTINGS':
      if (data && data.settings) {
        Object.assign(state.settings, data.settings);
        chrome.storage.local.set({ settings: state.settings });
      }
      sendResponse({ success: true, settings: state.settings });
      return false;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

