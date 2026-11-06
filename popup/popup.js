/**
 * LeadPulse AI - Popup & Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const startBtnLabel = document.getElementById('start-btn-label');
  const statusTicker = document.getElementById('status-ticker');
  const btnOpenTab = document.getElementById('btn-open-tab');
  const btnOpenGmaps = document.getElementById('btn-open-gmaps');

  const statTotal = document.getElementById('stat-total');
  const statHigh = document.getElementById('stat-high');
  const statNoSite = document.getElementById('stat-no-site');
  const statGaps = document.getElementById('stat-gaps');

  const leadsList = document.getElementById('leads-list');
  const emptyState = document.getElementById('empty-state');
  const filterSearch = document.getElementById('filter-search');
  const filterScore = document.getElementById('filter-score');

  const btnExportXlsx = document.getElementById('btn-export-xlsx');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnCopyClipboard = document.getElementById('btn-copy-clipboard');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnClear = document.getElementById('btn-clear');

  const settingMaxLeads = document.getElementById('setting-max-leads');
  const settingMode = document.getElementById('setting-mode');
  const settingDelay = document.getElementById('setting-delay');
  const settingAudit = document.getElementById('setting-audit');
  const settingGoogleSync = document.getElementById('setting-google-sync');
  const settingGoogleWebhook = document.getElementById('setting-google-webhook');
  const btnQuickCopyCode = document.getElementById('btn-quick-copy-code');
  const btnTestGSheet = document.getElementById('btn-test-gsheet');
  const btnShowGSheetGuide = document.getElementById('btn-show-gsheet-guide');
  const btnSyncGSheet = document.getElementById('btn-sync-gsheet');

  const targetSearchQuery = document.getElementById('target-search-query');
  const quickTags = document.querySelectorAll('.lp-tag-btn');

  // Modal elements
  const pitchModal = document.getElementById('pitch-modal');
  const modalClose = document.getElementById('modal-close');
  const modalBusinessName = document.getElementById('modal-business-name');
  const modalMeta = document.getElementById('modal-meta');
  const modalPitchText = document.getElementById('modal-pitch-text');
  const modalGapsList = document.getElementById('modal-gaps-list');
  const btnCopyPitch = document.getElementById('btn-copy-pitch');

  const gsheetModal = document.getElementById('gsheet-modal');
  const modalGSheetClose = document.getElementById('modal-gsheet-close');
  const appsScriptCodeBlock = document.getElementById('apps-script-code-block');
  const btnCopyAppsScript = document.getElementById('btn-copy-apps-script');
  const tabDirectImport = document.getElementById('tab-direct-import');
  const tabLiveWebhook = document.getElementById('tab-live-webhook');
  const tabDirectTsv = document.getElementById('tab-direct-tsv');
  const gsheetInstructions = document.getElementById('gsheet-instructions');
  const scriptTypeLabel = document.getElementById('script-type-label');
  const linkOpenActiveSheet = document.getElementById('link-open-active-sheet');

  // License & Monetization Elements
  const btnPlanPill = document.getElementById('btn-plan-pill');
  const btnUpgradeTop = document.getElementById('btn-upgrade-top');
  const upgradeModal = document.getElementById('upgrade-modal');
  const modalUpgradeClose = document.getElementById('modal-upgrade-close');
  const inputLicenseKey = document.getElementById('input-license-key');
  const btnActivateLicense = document.getElementById('btn-activate-license');
  const licenseFeedback = document.getElementById('license-feedback');
  const btnDeactivateLicense = document.getElementById('btn-deactivate-license');
  const codeDemoKey = document.getElementById('code-demo-key');

  let currentLicense = { isPro: false, plan: 'FREE' };
  let allLeads = [];
  let isScraping = false;
  let isPaused = false;
  let activeTab = null;

  // 1. Initial Data Fetch
  const stored = await chrome.storage.local.get(['leads', 'settings', 'license']);
  allLeads = stored.leads || [];

  if (typeof LicenseManager !== 'undefined') {
    currentLicense = await LicenseManager.getLicenseInfo();
  } else if (stored.license) {
    currentLicense = stored.license;
  }
  updateLicenseUI(currentLicense);

  if (stored.settings) {
    if (stored.settings.maxLeads) settingMaxLeads.value = stored.settings.maxLeads;
    if (stored.settings.scrapingMode) settingMode.value = stored.settings.scrapingMode;
    if (stored.settings.scrollDelayMs) settingDelay.value = stored.settings.scrollDelayMs;
    if (stored.settings.enableTechAudit !== undefined) settingAudit.checked = stored.settings.enableTechAudit;
    if (stored.settings.enableGoogleSync !== undefined) settingGoogleSync.checked = stored.settings.enableGoogleSync;
    if (stored.settings.googleSheetsWebhookUrl) settingGoogleWebhook.value = stored.settings.googleSheetsWebhookUrl;
  }

  // Detect current tab query on Google Maps
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;
    if (tab && tab.url && tab.url.includes('google.com/maps')) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_QUERY' }, resp => {
        if (chrome.runtime.lastError) return;
        if (resp && resp.query && resp.query !== 'Google Maps Search') {
          targetSearchQuery.value = resp.query;
          statusTicker.textContent = `📍 Current search: "${resp.query}"`;
        }
      });
    }
  } catch (e) {
    // Ignore tab query errors
  }

  // Sync background state
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (res && res.state) {
      isScraping = res.state.isScraping;
      isPaused = res.state.isPaused;
    }
  } catch (e) {
    // Background might be warming up
  }

  renderStats();
  renderLeads();
  updateControlButtons();

  // Quick search tags
  quickTags.forEach(btn => {
    btn.addEventListener('click', () => {
      targetSearchQuery.value = btn.dataset.query;
      targetSearchQuery.focus();
    });
  });

  // 2. Event Listeners for Controls
  btnStart.addEventListener('click', async () => {
    // Find active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;

    const queryVal = targetSearchQuery.value.trim();

    if (!tab || !tab.url || !tab.url.includes('google.com/maps')) {
      const targetUrl = queryVal
        ? `https://www.google.com/maps/search/${encodeURIComponent(queryVal)}`
        : 'https://www.google.com/maps/search/restaurants';
      const confirmNav = confirm(
        `LeadPulse AI needs to run on Google Maps.\n\nOpen Google Maps for "${queryVal || 'restaurants'}" now?`
      );
      if (confirmNav) {
        chrome.tabs.create({ url: targetUrl });
      }
      return;
    }

    let targetMax = parseInt(settingMaxLeads.value, 10);
    if (!currentLicense.isPro && targetMax > 25) {
      targetMax = 25;
    }

    const settings = {
      maxLeads: targetMax,
      scrapingMode: settingMode.value,
      scrollDelayMs: parseInt(settingDelay.value, 10),
      enableTechAudit: settingAudit.checked
    };

    // Save settings
    await chrome.storage.local.set({ settings });

    isScraping = true;
    isPaused = false;
    updateControlButtons();

    if (queryVal) {
      statusTicker.textContent = `🔍 Searching & Prospecting "${queryVal}"...`;
      chrome.runtime.sendMessage({
        type: 'SEARCH_AND_SCRAPE',
        data: { tabId: tab.id, query: queryVal, settings }
      });
    } else {
      statusTicker.textContent = '🚀 Scraping Google Maps listings...';
      chrome.runtime.sendMessage({
        type: 'START_SCRAPING',
        data: { tabId: tab.id, settings }
      });
    }
  });

  btnPause.addEventListener('click', () => {
    isPaused = true;
    updateControlButtons();
    statusTicker.textContent = '⏸️ Prospecting paused';
    chrome.runtime.sendMessage({ type: 'PAUSE_SCRAPING' });
  });

  btnStop.addEventListener('click', () => {
    isScraping = false;
    isPaused = false;
    updateControlButtons();
    statusTicker.textContent = '⏹️ Prospecting stopped';
    chrome.runtime.sendMessage({ type: 'STOP_SCRAPING' });
  });

  btnOpenGmaps.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.google.com/maps/search/restaurants' });
  });

  btnOpenTab.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
  });

  // UI State helper
  function updateLicenseUI(lic) {
    currentLicense = lic || { isPro: false, plan: 'FREE' };
    if (currentLicense.isPro) {
      if (btnPlanPill) {
        btnPlanPill.textContent = 'PRO ⭐';
        btnPlanPill.className = 'lp-plan-pill lp-plan-pro';
        btnPlanPill.title = `Active Plan: ${currentLicense.type || 'Pro License'}`;
      }
      if (btnUpgradeTop) btnUpgradeTop.style.display = 'none';
      if (btnDeactivateLicense) btnDeactivateLicense.style.display = 'inline-block';
    } else {
      if (btnPlanPill) {
        btnPlanPill.textContent = 'FREE (25)';
        btnPlanPill.className = 'lp-plan-pill lp-plan-free';
        btnPlanPill.title = 'Free Plan (25 Leads Limit) - Click to Upgrade';
      }
      if (btnUpgradeTop) btnUpgradeTop.style.display = 'inline-block';
      if (btnDeactivateLicense) btnDeactivateLicense.style.display = 'none';
    }
  }

  // License Modal Listeners
  if (btnPlanPill) btnPlanPill.addEventListener('click', () => { upgradeModal.style.display = 'flex'; });
  if (btnUpgradeTop) btnUpgradeTop.addEventListener('click', () => { upgradeModal.style.display = 'flex'; });
  if (modalUpgradeClose) modalUpgradeClose.addEventListener('click', () => { upgradeModal.style.display = 'none'; });

  if (codeDemoKey) {
    codeDemoKey.addEventListener('click', () => {
      inputLicenseKey.value = codeDemoKey.textContent.trim();
      inputLicenseKey.focus();
    });
  }

  if (btnActivateLicense) {
    btnActivateLicense.addEventListener('click', async () => {
      const key = inputLicenseKey.value.trim();
      if (!key) {
        licenseFeedback.style.color = '#f87171';
        licenseFeedback.textContent = 'Please enter a license key.';
        return;
      }
      btnActivateLicense.disabled = true;
      btnActivateLicense.textContent = 'Verifying...';

      try {
        let license;
        if (typeof LicenseManager !== 'undefined') {
          license = await LicenseManager.activate(key);
        } else {
          const resp = await chrome.runtime.sendMessage({ type: 'ACTIVATE_LICENSE', data: { key } });
          if (!resp.success) throw new Error(resp.error);
          license = resp.license;
        }

        licenseFeedback.style.color = '#34d399';
        licenseFeedback.textContent = `✔ Success! Activated ${license.type || 'Pro License'}.`;
        updateLicenseUI(license);

        setTimeout(() => {
          upgradeModal.style.display = 'none';
          btnActivateLicense.disabled = false;
          btnActivateLicense.textContent = 'Activate';
          licenseFeedback.textContent = '';
        }, 1600);
      } catch (err) {
        btnActivateLicense.disabled = false;
        btnActivateLicense.textContent = 'Activate';
        licenseFeedback.style.color = '#f87171';
        licenseFeedback.textContent = err.message || 'Invalid key.';
      }
    });
  }

  if (btnDeactivateLicense) {
    btnDeactivateLicense.addEventListener('click', async () => {
      if (confirm('Deactivate Pro license on this device?')) {
        let lic;
        if (typeof LicenseManager !== 'undefined') {
          lic = await LicenseManager.deactivate();
        } else {
          const resp = await chrome.runtime.sendMessage({ type: 'DEACTIVATE_LICENSE' });
          lic = resp.license;
        }
        updateLicenseUI(lic);
        upgradeModal.style.display = 'none';
        statusTicker.textContent = 'Switched to Free Tier.';
      }
    });
  }

  // Intercept settingMaxLeads change for free users
  settingMaxLeads.addEventListener('change', () => {
    const val = parseInt(settingMaxLeads.value, 10);
    if (!currentLicense.isPro && val > 25) {
      upgradeModal.style.display = 'flex';
      licenseFeedback.style.color = '#fbbf24';
      licenseFeedback.textContent = `Extracting ${val} leads requires LeadPulse Pro.`;
    }
  });

  // Settings Auto-Save
  [settingMaxLeads, settingMode, settingDelay, settingAudit, settingGoogleSync, settingGoogleWebhook].forEach(input => {
    input.addEventListener('change', () => {
      const settings = {
        maxLeads: parseInt(settingMaxLeads.value, 10),
        scrapingMode: settingMode.value,
        scrollDelayMs: parseInt(settingDelay.value, 10),
        enableTechAudit: settingAudit.checked,
        enableGoogleSync: settingGoogleSync.checked,
        googleSheetsWebhookUrl: settingGoogleWebhook.value.trim()
      };
      chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', data: { settings } });
    });
  });

  // Google Sheets & Code Export Handlers
  let currentModalTab = 'direct';

  function getTargetSheetDetails() {
    const rawVal = settingGoogleWebhook.value.trim();
    if (typeof GoogleSync !== 'undefined' && GoogleSync.extractSheetDetails) {
      return GoogleSync.extractSheetDetails(rawVal);
    }
    return {
      spreadsheetId: '1icDCheARP2uZVGVmudBQMrzyLti1RsbH4hEaT8JyZXk',
      sheetGid: '1890934928'
    };
  }

  function openGSheetModal(tab = 'direct') {
    currentModalTab = tab;
    const leads = getFilteredLeads();
    const details = getTargetSheetDetails();

    // Reset tab active states
    [tabDirectImport, tabLiveWebhook, tabDirectTsv].forEach(t => {
      if (t) {
        t.style.background = 'rgba(30,41,59,0.8)';
        t.style.color = '#94a3b8';
      }
    });

    if (tab === 'direct') {
      if (tabDirectImport) {
        tabDirectImport.style.background = '#4f46e5';
        tabDirectImport.style.color = '#fff';
      }
      scriptTypeLabel.textContent = `Direct Importer Script (${leads.length} leads)`;
      gsheetInstructions.innerHTML = `
        <ol style="margin-left: 18px; margin-bottom: 6px;">
          <li>In your Google Sheet, click top menu: <strong>Extensions &gt; Apps Script</strong>.</li>
          <li>Select all existing code (Ctrl+A), delete it, and <strong>paste the code below</strong>.</li>
          <li>Click <strong>Save (💾)</strong>, then click <strong>Run (▶)</strong> at the top.</li>
          <li>All <strong>${leads.length}</strong> leads will be immediately inserted into your sheet!</li>
        </ol>
      `;
      if (typeof GoogleSync !== 'undefined' && GoogleSync.generateDirectImporterScript) {
        appsScriptCodeBlock.textContent = GoogleSync.generateDirectImporterScript(leads, details.spreadsheetId, details.sheetGid);
      }
    } else if (tab === 'webhook') {
      if (tabLiveWebhook) {
        tabLiveWebhook.style.background = '#10b981';
        tabLiveWebhook.style.color = '#fff';
      }
      scriptTypeLabel.textContent = 'Live Sync Webhook Script (Auto-sync as Scraped)';
      gsheetInstructions.innerHTML = `
        <ol style="margin-left: 18px; margin-bottom: 6px;">
          <li>In your Google Sheet, click top menu: <strong>Extensions &gt; Apps Script</strong>.</li>
          <li>Delete existing code and <strong>paste the script below</strong>.</li>
          <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, set <em>Who has access</em> to <strong>Anyone</strong>, and click <strong>Deploy</strong>.</li>
          <li>Copy the <strong>Web App URL</strong> and paste it into LeadPulse AI settings to auto-sync!</li>
        </ol>
      `;
      if (typeof GoogleSync !== 'undefined' && GoogleSync.getAppsScriptTemplate) {
        appsScriptCodeBlock.textContent = GoogleSync.getAppsScriptTemplate(details.spreadsheetId, details.sheetGid);
      }
    } else if (tab === 'tsv') {
      if (tabDirectTsv) {
        tabDirectTsv.style.background = '#0ea5e9';
        tabDirectTsv.style.color = '#fff';
      }
      scriptTypeLabel.textContent = `Tab-Delimited Table Data (${leads.length} rows)`;
      gsheetInstructions.innerHTML = `
        <ol style="margin-left: 18px; margin-bottom: 6px;">
          <li>Click <strong>📋 Copy Code / Data</strong> below to copy all rows to clipboard.</li>
          <li>Open your Google Sheet or Excel.</li>
          <li>Click cell <strong>A1</strong>, and press <strong>Ctrl + V</strong> on your keyboard.</li>
          <li>All leads and columns will paste directly into their respective cells!</li>
        </ol>
      `;
      if (typeof Exporter !== 'undefined') {
        const rows = Exporter.prepareRows(leads);
        const headers = Object.keys(rows[0] || {});
        appsScriptCodeBlock.textContent = [
          headers.join('\t'),
          ...rows.slice(0, 10).map(r => headers.map(h => String(r[h] || '').replace(/[\t\r\n]+/g, ' ')).join('\t')),
          ...(rows.length > 10 ? [`... and ${rows.length - 10} more rows. Click Copy below to copy all rows.`] : [])
        ].join('\n');
      }
    }

    gsheetModal.style.display = 'flex';
  }

  // Tab switchers
  if (tabDirectImport) tabDirectImport.addEventListener('click', () => openGSheetModal('direct'));
  if (tabLiveWebhook) tabLiveWebhook.addEventListener('click', () => openGSheetModal('webhook'));
  if (tabDirectTsv) tabDirectTsv.addEventListener('click', () => openGSheetModal('tsv'));

  // Quick Copy Code Button (in Settings)
  if (btnQuickCopyCode) {
    btnQuickCopyCode.addEventListener('click', async () => {
      const leads = getFilteredLeads();
      const details = getTargetSheetDetails();
      const script = typeof GoogleSync !== 'undefined'
        ? GoogleSync.generateDirectImporterScript(leads, details.spreadsheetId, details.sheetGid)
        : '';

      try {
        await navigator.clipboard.writeText(script);
        btnQuickCopyCode.innerHTML = '✔ Copied Code! Opening Guide...';
        statusTicker.textContent = '📋 Copied Apps Script code! Paste in Extensions > Apps Script and click Run.';
        setTimeout(() => {
          btnQuickCopyCode.innerHTML = '📋 Copy Code to Paste in Google Sheet (Extensions &gt; Apps Script)';
        }, 2500);
      } catch (e) {
        // clipboard fallback
      }
      openGSheetModal('direct');
    });
  }

  // Copy Code Button (in Export Toolbar)
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', async () => {
      const leads = getFilteredLeads();
      const details = getTargetSheetDetails();
      const script = typeof GoogleSync !== 'undefined'
        ? GoogleSync.generateDirectImporterScript(leads, details.spreadsheetId, details.sheetGid)
        : '';

      try {
        await navigator.clipboard.writeText(script);
        btnCopyCode.innerHTML = '✔ Code Copied!';
        statusTicker.textContent = '📋 Copied Apps Script code! Paste in Extensions > Apps Script and click Run.';
        setTimeout(() => {
          btnCopyCode.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            📋 Copy Code
          `;
        }, 2200);
      } catch (e) {
        // clipboard fallback
      }
      openGSheetModal('direct');
    });
  }

  // 1-Click Clipboard Copy (Ctrl+V)
  if (btnCopyClipboard) {
    btnCopyClipboard.addEventListener('click', async () => {
      const leadsToCopy = getFilteredLeads();
      if (leadsToCopy.length === 0) {
        alert('No leads to copy yet. Run a search to collect leads first!');
        return;
      }
      try {
        await Exporter.copyToClipboard(leadsToCopy);
        const orig = btnCopyClipboard.innerHTML;
        btnCopyClipboard.innerHTML = `✔ Copied (${leadsToCopy.length})!`;
        statusTicker.textContent = `📋 Copied ${leadsToCopy.length} leads! Open Excel or Google Sheet and press Ctrl+V to paste.`;
        setTimeout(() => { btnCopyClipboard.innerHTML = orig; }, 2500);
      } catch (err) {
        alert(`Clipboard copy error: ${err.message}`);
      }
    });
  }

  // Copy Script inside Modal
  btnCopyAppsScript.addEventListener('click', async () => {
    if (currentModalTab === 'tsv') {
      const leads = getFilteredLeads();
      await Exporter.copyToClipboard(leads);
      btnCopyAppsScript.textContent = '✔ Copied All Rows!';
      statusTicker.textContent = `📋 Copied ${leads.length} rows! Open sheet and press Ctrl+V.`;
    } else {
      await navigator.clipboard.writeText(appsScriptCodeBlock.textContent);
      btnCopyAppsScript.textContent = '✔ Code Copied!';
      statusTicker.textContent = '📋 Copied Apps Script code! Paste in Extensions > Apps Script.';
    }
    setTimeout(() => { btnCopyAppsScript.textContent = '📋 Copy Code'; }, 1800);
  });

  // Test Google Sheet / Webhook
  btnTestGSheet.addEventListener('click', async () => {
    const url = settingGoogleWebhook.value.trim();
    if (!url) {
      alert('Please paste your Google Apps Script Web App URL first.');
      settingGoogleWebhook.focus();
      return;
    }

    // Check if user entered a Google Sheet view link instead of Web App URL
    if (url.includes('docs.google.com/spreadsheets/d/')) {
      openGSheetModal('direct');
      return;
    }

    btnTestGSheet.textContent = 'Testing...';
    btnTestGSheet.disabled = true;

    chrome.runtime.sendMessage({
      type: 'TEST_GOOGLE_SYNC',
      data: { webhookUrl: url }
    }, response => {
      btnTestGSheet.disabled = false;
      if (response && response.success) {
        btnTestGSheet.textContent = '✔ Success!';
        statusTicker.textContent = '🟢 Google Sheet Connected! Test row sent.';
        setTimeout(() => { btnTestGSheet.textContent = 'Test'; }, 2500);
      } else {
        btnTestGSheet.textContent = '❌ Failed';
        alert(`Google Sheets Connection Failed:\n${response?.error || 'Make sure the Web App is deployed with "Anyone" access.'}`);
        setTimeout(() => { btnTestGSheet.textContent = 'Test'; }, 3000);
      }
    });
  });

  btnShowGSheetGuide.addEventListener('click', () => {
    openGSheetModal('direct');
  });

  modalGSheetClose.addEventListener('click', () => {
    gsheetModal.style.display = 'none';
  });

  btnSyncGSheet.addEventListener('click', async () => {
    const url = settingGoogleWebhook.value.trim();
    if (!url || url.includes('docs.google.com/spreadsheets/')) {
      openGSheetModal('direct');
      return;
    }

    const leadsToSync = getFilteredLeads();
    if (leadsToSync.length === 0) {
      alert('No leads to sync.');
      return;
    }

    btnSyncGSheet.textContent = 'Syncing...';
    statusTicker.textContent = `Syncing ${leadsToSync.length} leads to Google Sheets...`;

    chrome.runtime.sendMessage({
      type: 'BATCH_SYNC_GOOGLE_SHEETS',
      data: { webhookUrl: url }
    }, resp => {
      if (resp && resp.success) {
        btnSyncGSheet.textContent = '✔ Synced!';
        statusTicker.textContent = `🟢 Successfully synced ${resp.count} leads to Google Sheets!`;
        setTimeout(() => { btnSyncGSheet.textContent = 'Google Sheet'; }, 3000);
      } else {
        btnSyncGSheet.textContent = 'Google Sheet';
        alert(`Google Sync Error:\n${resp?.error || 'Unknown error'}`);
      }
    });
  });

  // 3. Filters
  filterSearch.addEventListener('input', renderLeads);
  filterScore.addEventListener('change', renderLeads);

  // 4. Exports
  btnExportXlsx.addEventListener('click', () => {
    const leadsToExport = getFilteredLeads();
    if (leadsToExport.length === 0) {
      alert('No leads to export.');
      return;
    }
    try {
      Exporter.exportToExcel(leadsToExport, `LeadPulse_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  });

  btnExportCsv.addEventListener('click', () => {
    const leadsToExport = getFilteredLeads();
    if (leadsToExport.length === 0) {
      alert('No leads to export.');
      return;
    }
    Exporter.exportToCsv(leadsToExport, `LeadPulse_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  btnClear.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all scraped leads?')) {
      await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_LEADS' });
      allLeads = [];
      renderStats();
      renderLeads();
      statusTicker.textContent = 'All leads cleared.';
    }
  });

  // 5. Message listener from background
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'LEAD_AUDITED') {
      const incoming = message.lead;
      const idx = allLeads.findIndex(l => l.id === incoming.id || l.dedupKey === incoming.dedupKey);
      if (idx >= 0) {
        allLeads[idx] = incoming;
      } else {
        allLeads.unshift(incoming);
      }
      renderStats();
      renderLeads();
      statusTicker.textContent = `Scraped & Audited: ${incoming.name}`;
    } else if (message.type === 'SCRAPING_FINISHED') {
      isScraping = false;
      isPaused = false;
      updateControlButtons();
      statusTicker.textContent = `Completed! ${allLeads.length} leads in database.`;
    } else if (message.type === 'STATUS_SYNC' && message.data) {
      if (message.data.tickerMessage) {
        statusTicker.textContent = message.data.tickerMessage;
      }
      if (message.data.scrapedCount !== undefined && message.data.isScraping) {
        statusTicker.textContent = `🚀 Scanning Google Maps: ${message.data.scrapedCount} / ${message.data.targetLimit || 50} leads...`;
      }
      if (message.data.isFinished) {
        isScraping = false;
        isPaused = false;
        updateControlButtons();
      }
      if (message.data.error) {
        isScraping = false;
        isPaused = false;
        updateControlButtons();
        statusTicker.textContent = `⚠️ ${message.data.error}`;
        targetSearchQuery.focus();
      }
    }
  });

  // UI State helper
  function updateControlButtons() {
    if (isScraping) {
      btnStart.style.display = 'none';
      if (isPaused) {
        btnPause.style.display = 'none';
        btnStop.style.display = 'inline-flex';
        startBtnLabel.textContent = 'Resume Prospecting';
        btnStart.style.display = 'inline-flex';
      } else {
        btnPause.style.display = 'inline-flex';
        btnStop.style.display = 'inline-flex';
      }
    } else {
      btnStart.style.display = 'inline-flex';
      btnPause.style.display = 'none';
      btnStop.style.display = 'none';
      startBtnLabel.textContent = 'Start Prospecting';
    }
  }

  function getFilteredLeads() {
    const q = filterSearch.value.trim().toLowerCase();
    const scoreVal = filterScore.value;

    return allLeads.filter(lead => {
      // Score filter
      if (scoreVal === 'HIGH' && lead.leadScore !== 'HIGH') return false;
      if (scoreVal === 'MEDIUM' && lead.leadScore !== 'MEDIUM') return false;
      if (scoreVal === 'LOW' && lead.leadScore !== 'LOW') return false;
      if (scoreVal === 'NO_SITE' && lead.hasWebsite) return false;

      // Text search
      if (q) {
        const hay = `${lead.name} ${lead.category} ${lead.address} ${lead.primaryService}`.toLowerCase();
        return hay.includes(q);
      }

      return true;
    });
  }

  function renderStats() {
    statTotal.textContent = allLeads.length;
    const high = allLeads.filter(l => l.leadScore === 'HIGH').length;
    statHigh.textContent = high;
    const noSite = allLeads.filter(l => !l.hasWebsite).length;
    statNoSite.textContent = noSite;
    const gaps = allLeads.filter(l => l.opportunities && l.opportunities.length > 0).length;
    statGaps.textContent = gaps;
  }

  function renderLeads() {
    const filtered = getFilteredLeads();

    if (filtered.length === 0) {
      leadsList.innerHTML = '';
      emptyState.style.display = allLeads.length === 0 ? 'flex' : 'none';
      return;
    }

    emptyState.style.display = 'none';
    leadsList.innerHTML = filtered.map(lead => createLeadCardHtml(lead)).join('');

    // Attach click events to rows to view pitch modal
    const rows = leadsList.querySelectorAll('.lp-lead-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const leadId = row.dataset.id;
        const lead = allLeads.find(l => l.id === leadId);
        if (lead) openPitchModal(lead);
      });
    });
  }

  function createLeadCardHtml(lead) {
    const scoreClass =
      lead.leadScore === 'HIGH'
        ? 'lp-badge-high'
        : lead.leadScore === 'MEDIUM'
        ? 'lp-badge-med'
        : 'lp-badge-low';

    const opps = Array.isArray(lead.servicesWeOffer) && lead.servicesWeOffer.length > 0
      ? lead.servicesWeOffer.slice(0, 3)
      : (Array.isArray(lead.opportunities) ? lead.opportunities.slice(0, 3) : []);

    const oppPills = opps
      .map(o => `<span class="lp-gap-pill ${o.includes('Web') ? 'lp-webdev-pill' : ''}">${escapeHtml(o)}</span>`)
      .join('');

    const socials = lead.socialLinks || {};
    const socialIcons = [];
    if (socials.facebook) socialIcons.push('🔵 FB');
    if (socials.instagram) socialIcons.push('🟣 IG');
    if (socials.linkedin) socialIcons.push('💼 LI');
    if (socials.twitter) socialIcons.push('🐦 X');
    if (socials.youtube) socialIcons.push('🔴 YT');
    if (socials.tiktok) socialIcons.push('🎵 TT');

    const email = lead.contactInfo?.email || lead.email;

    return `
      <div class="lp-lead-row" data-id="${lead.id}">
        <div class="lp-lead-header">
          <span class="lp-lead-name" title="${escapeHtml(lead.name)}">${escapeHtml(lead.name)}</span>
          <span class="lp-badge-score ${scoreClass}">${lead.leadScore || 'LOW'} (${lead.leadScorePoints || 0})</span>
        </div>
        <div class="lp-lead-meta">
          ${lead.phone ? `<span>📞 ${escapeHtml(lead.phone)}</span>` : ''}
          ${email ? `<span style="color:#38bdf8;">✉️ ${escapeHtml(email)}</span>` : ''}
          ${lead.rating ? `<span>⭐ ${lead.rating} (${lead.reviewCount || 0})</span>` : ''}
          ${lead.hasWebsite ? `<span>🌐 <a href="${escapeHtml(lead.websiteUrl || lead.website)}" target="_blank" style="color:#7dd3fc; text-decoration:none;" onclick="event.stopPropagation()">Website</a></span>` : `<span style="color:#f87171;">❌ No Website</span>`}
          ${socialIcons.length > 0 ? `<span style="color:#c084fc;">📱 ${socialIcons.join(' ')}</span>` : (lead.hasWebsite ? `<span style="color:#94a3b8;">No Socials</span>` : '')}
        </div>
        ${oppPills ? `<div class="lp-lead-tags">${oppPills}</div>` : ''}
      </div>
    `;
  }

  function openPitchModal(lead) {
    modalBusinessName.textContent = lead.name;
    const socials = lead.socialLinks || {};
    const socialLinksHtml = Object.entries(socials)
      .filter(([_, url]) => Boolean(url))
      .map(([net, url]) => `<a href="${escapeHtml(url)}" target="_blank" style="color:#818cf8; text-transform:capitalize; margin-right:8px;">${net}</a>`)
      .join('') || '<span style="color:#94a3b8;">None Found</span>';

    const email = lead.contactInfo?.email || lead.email || 'None Found';

    modalMeta.innerHTML = `
      <strong>Category:</strong> ${escapeHtml(lead.category || 'N/A')}<br>
      <strong>Phone:</strong> ${escapeHtml(lead.phone || 'N/A')}<br>
      <strong>Website:</strong> ${lead.hasWebsite ? `<a href="${escapeHtml(lead.websiteUrl || lead.website)}" target="_blank" style="color:#818cf8;">${escapeHtml(lead.websiteUrl || lead.website)}</a>` : '<span style="color:#f87171;">No Website Listed</span>'}<br>
      <strong>Email:</strong> ${escapeHtml(email)}<br>
      <strong>Social Profiles:</strong> ${socialLinksHtml}<br>
      <strong>Google Rating:</strong> ${lead.rating ? `${lead.rating} ⭐ (${lead.reviewCount || 0} reviews)` : 'None'}
    `;

    modalPitchText.textContent = lead.primaryPitch || 'Reach out to introduce your agency services.';

    const missing = Array.isArray(lead.missingDetails) && lead.missingDetails.length > 0
      ? lead.missingDetails
      : (Array.isArray(lead.auditFindings) ? lead.auditFindings : []);

    const services = Array.isArray(lead.servicesWeOffer) && lead.servicesWeOffer.length > 0
      ? lead.servicesWeOffer
      : (Array.isArray(lead.opportunities) ? lead.opportunities : []);

    modalGapsList.innerHTML = `
      <div style="margin-bottom:8px;">
        <div style="font-size:10px; color:#f87171; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Missing Details & Gaps</div>
        ${missing.map(m => `<span class="lp-gap-pill" style="margin-bottom:3px; display:inline-block;">${escapeHtml(m)}</span>`).join('')}
      </div>
      <div>
        <div style="font-size:10px; color:#34d399; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Services We Offer (Agency Upsells)</div>
        ${services.map(s => `<span class="lp-gap-pill lp-webdev-pill" style="margin-bottom:3px; display:inline-block; border-color:rgba(16,185,129,0.3); color:#6ee7b7; background:rgba(16,185,129,0.1);">${escapeHtml(s)}</span>`).join('')}
      </div>
    `;

    pitchModal.style.display = 'flex';

    btnCopyPitch.onclick = () => {
      navigator.clipboard.writeText(lead.primaryPitch || '');
      btnCopyPitch.textContent = 'Copied!';
      setTimeout(() => (btnCopyPitch.textContent = 'Copy Pitch'), 1500);
    };
  }

  modalClose.addEventListener('click', () => {
    pitchModal.style.display = 'none';
  });

  window.addEventListener('click', e => {
    if (e.target === pitchModal) {
      pitchModal.style.display = 'none';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});

