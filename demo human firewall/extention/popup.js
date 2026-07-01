/**
 * popup.js — Aware Guard Extension Popup Script
 *
 * Handles:
 *  - Displaying the last scan result (verdict, score, timestamp)
 *  - "Scan Now" button triggering a manual re-scan
 *  - "Report Phishing" button submitting false-negative reports to backend
 *
 * Communication:
 *  - popup → background: REPORT_PHISHING
 *  - popup → content: MANUAL_SCAN
 *  - popup ← storage: lastScan (verdict, score, subject, logId, timestamp)
 */

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const verdictBadge = document.getElementById('verdict-badge');
const verdictIcon = document.getElementById('verdict-icon');
const verdictLabel = document.getElementById('verdict-label');
const scoreValue = document.getElementById('score-value');
const scoreBar = document.getElementById('score-bar');
const scanSubject = document.getElementById('scan-subject');
const scanTime = document.getElementById('scan-time');
const reasonsList = document.getElementById('reasons-list');
const resultPanel = document.getElementById('result-panel');
const emptyState = document.getElementById('empty-state');
const scanBtn = document.getElementById('scan-btn');
const reportBtn = document.getElementById('report-btn');
const reportStatus = document.getElementById('report-status');

// ─── Verdict Config ───────────────────────────────────────────────────────────
const VERDICT_UI = {
  SAFE: {
    icon: '✅',
    label: 'SAFE',
    color: '#10b981',
    barColor: '#10b981',
    dotColor: '#10b981',
  },
  SUSPICIOUS: {
    icon: '⚠️',
    label: 'SUSPICIOUS',
    color: '#f59e0b',
    barColor: '#f59e0b',
    dotColor: '#f59e0b',
  },
  PHISHING: {
    icon: '🚨',
    label: 'PHISHING',
    color: '#ef4444',
    barColor: '#ef4444',
    dotColor: '#ef4444',
  },
};

// ─── Load Last Scan Result ────────────────────────────────────────────────────

/**
 * Reads the last scan result from chrome.storage and populates the popup UI.
 */
function loadLastScan() {
  chrome.storage.local.get(['lastScan'], ({ lastScan }) => {
    if (!lastScan) {
      showEmptyState();
      return;
    }
    renderScanResult(lastScan);
  });
}

/**
 * Shows the "no scan yet" state.
 */
function showEmptyState() {
  if (emptyState) emptyState.style.display = 'block';
  if (resultPanel) resultPanel.style.display = 'none';
  if (reportBtn) reportBtn.style.display = 'none';
}

/**
 * Renders a scan result into the popup UI.
 * @param {{ verdict, score, subject, reasons, logId, timestamp }} scan
 */
function renderScanResult(scan) {
  if (emptyState) emptyState.style.display = 'none';
  if (resultPanel) resultPanel.style.display = 'block';

  const config = VERDICT_UI[scan.verdict] || VERDICT_UI.SUSPICIOUS;

  // Verdict badge
  if (verdictIcon) verdictIcon.textContent = config.icon;
  if (verdictLabel) {
    verdictLabel.textContent = config.label;
    verdictLabel.style.color = config.color;
  }

  // Score bar
  if (scoreValue) scoreValue.textContent = `${scan.score}/100`;
  if (scoreBar) {
    scoreBar.style.width = `${scan.score}%`;
    scoreBar.style.background = config.barColor;
  }

  // Subject
  if (scanSubject && scan.subject) {
    scanSubject.textContent = scan.subject.length > 50
      ? scan.subject.slice(0, 50) + '…'
      : scan.subject;
  }

  // Timestamp
  if (scanTime && scan.timestamp) {
    const d = new Date(scan.timestamp);
    scanTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Status dot
  if (statusDot) statusDot.style.background = config.dotColor;
  if (statusText) statusText.textContent = 'Active';

  // Show "Report Phishing" button only if not SAFE and we have a logId
  if (reportBtn) {
    if (scan.verdict !== 'SAFE' && scan.logId) {
      reportBtn.style.display = 'block';
      reportBtn.setAttribute('data-log-id', scan.logId);
      // If already reported, show as disabled
      if (scan.reported) {
        reportBtn.disabled = true;
        reportBtn.textContent = '✓ Reported';
      } else {
        reportBtn.disabled = false;
        reportBtn.textContent = '🚩 Report Phishing';
      }
    } else {
      reportBtn.style.display = 'none';
    }
  }
}

// ─── Button Handlers ──────────────────────────────────────────────────────────

/**
 * "Scan Now" — sends MANUAL_SCAN message to the active Gmail tab's content script.
 */
if (scanBtn) {
  scanBtn.addEventListener('click', () => {
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url?.includes('mail.google.com')) {
        scanBtn.textContent = 'Not on Gmail';
        setTimeout(() => {
          scanBtn.disabled = false;
          scanBtn.textContent = 'Scan Now';
        }, 2000);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_SCAN' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not yet loaded (e.g., page just opened)
          scanBtn.textContent = 'Open an Email First';
        } else if (response?.success) {
          scanBtn.textContent = '✓ Scanning…';
          // Reload result after a short delay to pick up async response
          setTimeout(loadLastScan, 1500);
        } else {
          scanBtn.textContent = 'No Email Open';
        }
        setTimeout(() => {
          scanBtn.disabled = false;
          scanBtn.textContent = 'Scan Now';
        }, 2500);
      });
    });
  });
}

/**
 * "Report Phishing" — relays the logId to the background script
 * which submits it to POST /api/analyze-email/report
 */
if (reportBtn) {
  reportBtn.addEventListener('click', () => {
    const logId = reportBtn.getAttribute('data-log-id');
    if (!logId) return;

    reportBtn.disabled = true;
    reportBtn.textContent = 'Submitting…';

    chrome.runtime.sendMessage(
      { type: 'REPORT_PHISHING', payload: { logId } },
      (response) => {
        if (response?.success) {
          reportBtn.textContent = '✓ Reported — Thank you!';
          if (reportStatus) {
            reportStatus.textContent = 'Report submitted to security team.';
            reportStatus.style.display = 'block';
          }
          // Mark as reported in storage
          chrome.storage.local.get(['lastScan'], ({ lastScan }) => {
            if (lastScan) {
              chrome.storage.local.set({ lastScan: { ...lastScan, reported: true } });
            }
          });
        } else {
          reportBtn.disabled = false;
          reportBtn.textContent = '🚩 Retry Report';
          if (reportStatus) {
            reportStatus.textContent = 'Report failed. Check your connection.';
            reportStatus.style.color = '#ef4444';
            reportStatus.style.display = 'block';
          }
        }
      }
    );
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadLastScan();
