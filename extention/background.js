console.log('[AwareGuard] background worker active');

const BADGE_CONFIG = {
  SAFE: { color: '#10b981', text: 'OK' },
  SUSPICIOUS: { color: '#f59e0b', text: '!' },
  PHISHING: { color: '#ef4444', text: '!!' },
  DEFAULT: { color: '#6b7280', text: '' },
};

function updateBadge(verdict) {
  const config = BADGE_CONFIG[verdict] || BADGE_CONFIG.DEFAULT;
  chrome.action.setBadgeBackgroundColor({ color: config.color });
  chrome.action.setBadgeText({ text: config.text });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lastScan?.newValue?.verdict) {
    updateBadge(changes.lastScan.newValue.verdict);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'ACTIVE', version: '2.1.0' });
    return;
  }

  if (message.type === 'GET_SCAN_STATUS') {
    chrome.storage.local.get(['lastScan'], ({ lastScan }) => {
      sendResponse({ lastScan: lastScan || null });
    });
    return true;
  }

  if (message.type === 'REPORT_PHISHING') {
    chrome.storage.local.get(['settings', 'authToken', 'userEmail'], async ({ settings, authToken, userEmail }) => {
      try {
        const response = await fetch(`${settings?.apiBase || 'http://localhost:5000'}/api/analyze-email/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ logId: message.payload?.logId, userEmail }),
        });

        const data = await response.json();
        sendResponse({ success: response.ok, data, error: response.ok ? null : data.message });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });

    return true;
  }
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({
      lastScan: null,
      authToken: null,
      userEmail: null,
      settings: {
        autoScan: true,
        showSafeBanners: true,
        apiBase: 'http://localhost:5000',
      },
    });
    updateBadge('DEFAULT');
  }
});
