console.log('[AwareGuard] content script active');

const DEFAULT_API_BASE = 'http://localhost:5000';
const ANALYZE_PATH = '/api/analyze-email';

const scannedMessageIds = new Map();
let activeBannerId = null;
let currentPlatform = detectPlatform();
let pendingScanTimer = null;
let inFlightScanKey = null;

function detectPlatform() {
  if (location.hostname.includes('mail.google.com')) return 'gmail';
  if (location.hostname.includes('outlook.office.com') || location.hostname.includes('outlook.live.com')) return 'outlook';
  return 'unknown';
}

const SELECTORS = {
  gmail: {
    emailBody: '.a3s.aiL, .a3s',
    subject: 'h2.hP',
    messageContainer: '[data-message-id]',
    senderName: '.gD',
    senderEmail: '.gD[email], .go span[email]',
  },
  outlook: {
    emailBody: '[role="document"]',
    subject: '[role="heading"]',
    messageContainer: '[data-convid], [aria-label*="Message"]',
    senderName: '[data-testid="messageHeader"] span',
    senderEmail: '[data-testid="messageHeader"] [title*="@"]',
  },
};

const VERDICT_CONFIG = {
  SAFE: {
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
    textColor: '#065f46',
    iconColor: '#10b981',
    icon: 'SAFE',
    label: 'SAFE',
    description: 'No phishing signals detected',
  },
  SUSPICIOUS: {
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#f59e0b',
    textColor: '#78350f',
    iconColor: '#f59e0b',
    icon: 'WARN',
    label: 'SUSPICIOUS',
    description: 'Warning signals detected. Verify before clicking.',
  },
  PHISHING: {
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
    textColor: '#7f1d1d',
    iconColor: '#ef4444',
    icon: 'STOP',
    label: 'PHISHING',
    description: 'High-risk email. Do not click links or submit credentials.',
  },
};

function getSelectors() {
  return SELECTORS[currentPlatform] || SELECTORS.gmail;
}

function removeVerdictBanner() {
  if (activeBannerId) {
    document.getElementById(activeBannerId)?.remove();
    activeBannerId = null;
  }
  document.querySelectorAll('[data-aware-guard="true"]').forEach((el) => el.remove());
}

function showVerdictBanner(result) {
  removeVerdictBanner();

  const config = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.SUSPICIOUS;
  const bannerId = `aware-guard-banner-${Date.now()}`;
  activeBannerId = bannerId;

  const reasonsHtml = (result.reasons || [])
    .slice(0, 3)
    .map((reason) => `<li style="margin:2px 0">${reason}</li>`)
    .join('');

  const banner = document.createElement('div');
  banner.id = bannerId;
  banner.setAttribute('data-aware-guard', 'true');
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:12px;line-height:1;flex-shrink:0;padding-top:4px;font-weight:700;color:${config.iconColor}">${config.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span style="font-weight:700;font-size:13px;color:${config.iconColor}">
            Aware Guard ${config.label}
          </span>
          <span style="font-size:11px;color:${config.textColor};opacity:0.8">
            Score ${result.score}/100
          </span>
        </div>
        <div style="font-size:12px;color:${config.textColor};margin-top:2px">
          ${config.description}
        </div>
        ${reasonsHtml ? `<ul style="margin:6px 0 0;padding-left:16px;font-size:11px;color:${config.textColor};opacity:0.9">${reasonsHtml}</ul>` : ''}
      </div>
      <button
        id="aware-guard-close-${bannerId}"
        style="background:none;border:none;color:${config.textColor};cursor:pointer;font-size:16px;padding:0;line-height:1;opacity:0.6;flex-shrink:0"
        title="Dismiss"
      >x</button>
    </div>
  `;

  Object.assign(banner.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '2147483647',
    background: config.bgColor,
    border: `1.5px solid ${config.borderColor}`,
    borderRadius: '10px',
    padding: '10px 12px',
    maxWidth: '360px',
    minWidth: '260px',
    boxShadow: `0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px ${config.borderColor}22`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: '1.4',
  });

  document.body.appendChild(banner);
  document.getElementById(`aware-guard-close-${bannerId}`)?.addEventListener('click', removeVerdictBanner);

  if (result.verdict === 'SAFE') {
    setTimeout(() => {
      if (activeBannerId === bannerId) removeVerdictBanner();
    }, 4000);
  }
}

function extractEmailContent() {
  const selectors = getSelectors();
  const bodyEl = document.querySelector(selectors.emailBody);
  if (!bodyEl) return null;

  const subjectEl = document.querySelector(selectors.subject);
  const subject = subjectEl ? subjectEl.innerText.trim() : document.title || 'No Subject';
  const containerEl = bodyEl.closest(selectors.messageContainer);
  const messageId = containerEl
    ? containerEl.getAttribute('data-message-id') || containerEl.getAttribute('data-convid') || subject.slice(0, 40)
    : `no-id-${subject.slice(0, 20)}`;

  const senderNameEl = document.querySelector(selectors.senderName);
  const senderEmailEl = document.querySelector(selectors.senderEmail);
  const senderEmail = senderEmailEl?.getAttribute('email')
    || senderEmailEl?.getAttribute('title')
    || senderEmailEl?.textContent
    || '';

  const linkEls = bodyEl.querySelectorAll('a[href]');
  const seenLinks = new Set();
  const links = [...linkEls]
    .map((anchor) => ({
      url: anchor.href,
      text: (anchor.innerText || anchor.textContent || '').trim().slice(0, 250),
    }))
    .filter((link) => {
      if (!link.url || !link.url.startsWith('http')) return false;
      if (link.url.startsWith('mailto:') || link.url.startsWith('javascript:')) return false;
      if (seenLinks.has(link.url)) return false;
      seenLinks.add(link.url);
      return true;
    });

  return {
    subject,
    body: bodyEl.innerText.trim(),
    links,
    messageId,
    sender: {
      name: senderNameEl?.textContent?.trim() || '',
      email: senderEmail.trim(),
      displayText: `${senderNameEl?.textContent?.trim() || ''} ${senderEmail.trim()}`.trim(),
    },
    platform: currentPlatform,
  };
}

async function getExtensionSettings() {
  return chrome.storage.local.get(['authToken', 'settings', 'userEmail']);
}

async function sendToBackend(emailData, reportType = 'email_open') {
  const { authToken, settings, userEmail } = await getExtensionSettings();
  const apiBase = settings?.apiBase || DEFAULT_API_BASE;

  const response = await fetch(`${apiBase}${ANALYZE_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      subject: emailData.subject,
      body: emailData.body,
      links: emailData.links,
      sender: emailData.sender,
      messageId: emailData.messageId,
      platform: emailData.platform,
      userEmail: userEmail || '',
      reportType,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

async function analyzeCurrentEmail() {
  const emailData = extractEmailContent();
  if (!emailData) return;

  const fingerprint = `${emailData.messageId}:${emailData.subject}:${emailData.links.length}`;
  if (scannedMessageIds.has(fingerprint) || inFlightScanKey === fingerprint) return;

  scannedMessageIds.set(fingerprint, Date.now());
  inFlightScanKey = fingerprint;

  try {
    const result = await sendToBackend(emailData);
    showVerdictBanner(result);
    chrome.storage.local.set({
      lastScan: {
        messageId: emailData.messageId,
        subject: emailData.subject,
        verdict: result.verdict,
        score: result.score,
        reasons: result.reasons,
        logId: result.logId,
        sender: emailData.sender,
        platform: emailData.platform,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AwareGuard] scan failed:', error.message);
    scannedMessageIds.delete(fingerprint);
  } finally {
    inFlightScanKey = null;
  }
}

function onDomChange() {
  clearTimeout(pendingScanTimer);
  pendingScanTimer = setTimeout(() => {
    analyzeCurrentEmail();
  }, 600);
}

function startObserver() {
  const target = document.querySelector('[role="main"]') || document.body;
  const observer = new MutationObserver(onDomChange);

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

async function handleProtectedLinkClick(event) {
  const anchor = event.target.closest('a[href]');
  if (!anchor || !anchor.href.startsWith('http')) return;

  const emailData = extractEmailContent();
  if (!emailData) return;

  const clickedLink = {
    url: anchor.href,
    text: (anchor.innerText || anchor.textContent || '').trim().slice(0, 250),
  };

  try {
    const result = await sendToBackend({ ...emailData, links: [clickedLink] }, 'click_intercept');
    if (result.verdict === 'PHISHING') {
      event.preventDefault();
      event.stopPropagation();
      showVerdictBanner({
        ...result,
        reasons: ['Blocked risky link click'].concat(result.reasons || []),
      });
    }
  } catch (error) {
    console.error('[AwareGuard] click analysis failed:', error.message);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MANUAL_SCAN') {
    const emailData = extractEmailContent();
    if (emailData) {
      [...scannedMessageIds.keys()]
        .filter((key) => key.startsWith(`${emailData.messageId}:`))
        .forEach((key) => scannedMessageIds.delete(key));
      analyzeCurrentEmail().then(() => {
        sendResponse({ success: true, message: 'Scan complete' });
      }).catch((err) => {
        sendResponse({ success: false, message: 'Scan failed: ' + err.message });
      });
    } else {
      sendResponse({ success: false, message: 'No email open' });
    }
  }
  return true;
});

function initializeAwareGuard() {
  currentPlatform = detectPlatform();
  startObserver();
  document.addEventListener('click', handleProtectedLinkClick, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAwareGuard);
} else {
  initializeAwareGuard();
}
