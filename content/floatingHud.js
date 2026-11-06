/**
 * LeadPulse AI - Google Maps In-Page Floating HUD
 * Provides immediate visual feedback and control directly on the Google Maps tab.
 */

const FloatingHUD = {
  rootEl: null,
  cardEl: null,
  pillEl: null,
  isMinimized: false,

  init(callbacks = {}) {
    if (document.getElementById('leadpulse-hud-root')) return;

    this.rootEl = document.createElement('div');
    this.rootEl.id = 'leadpulse-hud-root';

    this.rootEl.innerHTML = `
      <div class="lp-hud-pill" id="lp-hud-pill">
        <span>⚡ LeadPulse</span>
        <span id="lp-pill-count">0 Leads</span>
      </div>
      <div class="lp-hud-card" id="lp-hud-card">
        <div class="lp-hud-header">
          <div class="lp-hud-brand">
            <div class="lp-hud-logo-icon">⚡</div>
            <span>LeadPulse AI</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="lp-hud-status-badge" id="lp-status-badge">Idle</span>
            <button class="lp-hud-min-btn" id="lp-btn-minimize" title="Minimize">−</button>
          </div>
        </div>

        <div class="lp-hud-stats-row">
          <div class="lp-stat-box">
            <div class="lp-stat-label">Scraped</div>
            <div class="lp-stat-value" id="lp-stat-scraped">0 / 50</div>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-label">High Priority</div>
            <div class="lp-stat-value" id="lp-stat-high" style="color:#38bdf8;">0</div>
          </div>
        </div>

        <div class="lp-hud-progress-wrap">
          <div class="lp-hud-progress-bar" id="lp-progress-bar"></div>
        </div>

        <div id="lp-hud-activity" class="lp-hud-activity-text">Ready to prospect listings</div>

        <div class="lp-hud-actions">
          <button class="lp-btn lp-btn-primary" id="lp-hud-start-btn">▶ Start Prospecting</button>
          <button class="lp-btn lp-btn-warning" id="lp-hud-pause-btn" style="display:none;">Pause</button>
          <button class="lp-btn lp-btn-primary" id="lp-hud-resume-btn" style="display:none;">Resume</button>
          <button class="lp-btn lp-btn-danger" id="lp-hud-stop-btn" style="display:none;">Stop</button>
          <button class="lp-btn lp-btn-excel" id="lp-hud-export-btn" style="display:none;">📥 Export Excel</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootEl);

    this.cardEl = document.getElementById('lp-hud-card');
    this.pillEl = document.getElementById('lp-hud-pill');

    // Bind Minimize / Restore
    document.getElementById('lp-btn-minimize').addEventListener('click', () => {
      this.setMinimized(true);
    });

    this.pillEl.addEventListener('click', () => {
      this.setMinimized(false);
    });

    // Control buttons
    document.getElementById('lp-hud-start-btn').addEventListener('click', () => {
      if (callbacks.onStart) callbacks.onStart();
    });

    document.getElementById('lp-hud-pause-btn').addEventListener('click', () => {
      if (callbacks.onPause) callbacks.onPause();
    });

    document.getElementById('lp-hud-resume-btn').addEventListener('click', () => {
      if (callbacks.onResume) callbacks.onResume();
    });

    document.getElementById('lp-hud-stop-btn').addEventListener('click', () => {
      if (callbacks.onStop) callbacks.onStop();
    });

    document.getElementById('lp-hud-export-btn').addEventListener('click', () => {
      if (callbacks.onExport) callbacks.onExport();
    });
  },

  setMinimized(minimized) {
    this.isMinimized = minimized;
    if (minimized) {
      this.cardEl.classList.add('lp-minimized');
      this.pillEl.classList.add('lp-active');
    } else {
      this.cardEl.classList.remove('lp-minimized');
      this.pillEl.classList.remove('lp-active');
    }
  },

  update(state) {
    if (!this.rootEl) return;

    const statusBadge = document.getElementById('lp-status-badge');
    const statScraped = document.getElementById('lp-stat-scraped');
    const statHigh = document.getElementById('lp-stat-high');
    const progressBar = document.getElementById('lp-progress-bar');
    const pillCount = document.getElementById('lp-pill-count');

    const pauseBtn = document.getElementById('lp-hud-pause-btn');
    const resumeBtn = document.getElementById('lp-hud-resume-btn');
    const stopBtn = document.getElementById('lp-hud-stop-btn');
    const startBtn = document.getElementById('lp-hud-start-btn');
    const exportBtn = document.getElementById('lp-hud-export-btn');
    const activityText = document.getElementById('lp-hud-activity');

    const current = state.scrapedCount || 0;
    const target = state.targetLimit || 50;
    const percent = Math.min(100, Math.round((current / (target || 1)) * 100));

    statScraped.textContent = `${current} / ${target}`;
    pillCount.textContent = `${current} Leads`;
    progressBar.style.width = `${percent}%`;

    if (state.highCount !== undefined) {
      statHigh.textContent = String(state.highCount);
    }

    if (state.activity && activityText) {
      activityText.textContent = state.activity;
    }

    // Status label and button visibility
    if (state.isScraping) {
      startBtn.style.display = 'none';
      exportBtn.style.display = 'none';
      if (state.isPaused) {
        statusBadge.textContent = 'Paused';
        statusBadge.className = 'lp-hud-status-badge lp-status-paused';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'flex';
        stopBtn.style.display = 'flex';
      } else {
        statusBadge.textContent = 'Scanning...';
        statusBadge.className = 'lp-hud-status-badge lp-status-active';
        pauseBtn.style.display = 'flex';
        resumeBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
      }
    } else {
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      stopBtn.style.display = 'none';

      if (state.isFinished) {
        statusBadge.textContent = 'Finished';
        statusBadge.className = 'lp-hud-status-badge lp-status-done';
        startBtn.style.display = 'none';
        exportBtn.style.display = 'flex';
      } else {
        statusBadge.textContent = 'Idle';
        statusBadge.className = 'lp-hud-status-badge';
        startBtn.style.display = 'flex';
        exportBtn.style.display = current > 0 ? 'flex' : 'none';
      }
    }
  },

  showToast(message, type = 'info', durationMs = 4000) {
    const existing = document.getElementById('lp-hud-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'lp-hud-toast';
    toast.className = `lp-hud-toast lp-toast-${type}`;

    const icon = type === 'warning' ? '⚠️' : type === 'error' ? '❌' : '⚡';
    toast.innerHTML = `
      <span class="lp-hud-toast-icon">${icon}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 350);
      }
    }, durationMs);
  }
};

if (typeof window !== 'undefined') {
  window.FloatingHUD = FloatingHUD;
}

