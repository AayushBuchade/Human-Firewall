const URGENCY_KEYWORDS = [
  'urgent', 'immediately', 'act now', 'expires', 'expired', 'last chance',
  'today only', 'account suspended', 'account locked', 'verify now', 'asap',
  'time sensitive', 'final notice', 'within 24 hours', 'within 48 hours',
];
const AUTHORITY_KEYWORDS = [
  'paypal', 'amazon', 'apple', 'google', 'microsoft', 'bank', 'irs',
  'security alert', 'unusual activity', 'verify your identity', 'login attempt',
];
const THREAT_KEYWORDS = [
  'suspended', 'terminated', 'legal action', 'arrested', 'criminal charges',
  'compromised', 'breach', 'penalty', 'fine', 'subpoena',
];
const FINANCIAL_KEYWORDS = [
  'wire transfer', 'gift card', 'invoice', 'payment', 'bank details',
  'refund', 'claim your prize', 'payroll', 'salary', 'bonus',
];
const CREDENTIAL_KEYWORDS = [
  'password', 'otp', 'one time password', 'verification code', 'mfa',
  '2fa', 'login', 'sign in', 'reset your password',
];
const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'rb.gy', 'cutt.ly', 'tiny.cc',
];
const SUSPICIOUS_TLDS = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.top', '.click', '.link'];
const BRAND_DOMAINS = {
  paypal: ['paypal.com'],
  amazon: ['amazon.com', 'amazon.in'],
  google: ['google.com', 'gmail.com'],
  apple: ['apple.com'],
  microsoft: ['microsoft.com', 'office.com', 'outlook.com'],
  netflix: ['netflix.com'],
  bank: ['bank.com'],
};

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

function countKeywords(text, list) {
  const normalized = normalize(text);
  const matches = list.filter((kw) => normalized.includes(kw));
  return { count: matches.length, matches };
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function domainRoot(domain) {
  if (!domain) return '';
  const parts = domain.split('.').filter(Boolean);
  return parts.slice(-2).join('.');
}

function looksLikeIp(domain) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(domain || '');
}

function hasObfuscatedBrand(domain) {
  const compact = (domain || '').replace(/[^a-z0-9]/g, '');
  return /(paypa1|g00gle|micr0soft|app1e|amaz0n|netf1ix|0ffice)/.test(compact);
}

function characterDiversity(domain) {
  return new Set((domain || '').replace(/[^a-z0-9]/g, '').split('')).size;
}

function inspectLink(link) {
  const url = typeof link === 'string' ? link : link.url;
  const text = typeof link === 'string' ? '' : link.text;
  const domain = extractDomain(url);
  const reasons = [];

  if (!domain) {
    reasons.push('invalid or unparsable URL');
    return { url, domain: '', reasons, score: 20 };
  }

  let score = 0;
  if (URL_SHORTENERS.some((item) => domain === item || domain.endsWith(`.${item}`))) {
    reasons.push('uses URL shortener');
    score += 12;
  }
  if (SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld))) {
    reasons.push('uses suspicious TLD');
    score += 14;
  }
  if (looksLikeIp(domain)) {
    reasons.push('direct IP address used instead of domain');
    score += 18;
  }
  if (domain.includes('@')) {
    reasons.push('contains @ character in URL host');
    score += 20;
  }
  if (hasObfuscatedBrand(domain)) {
    reasons.push('lookalike brand spelling in domain');
    score += 18;
  }
  if (characterDiversity(domain) > 18 || domain.length > 35) {
    reasons.push('domain is unusually complex');
    score += 6;
  }

  const normalizedText = normalize(text);
  if (normalizedText) {
    const textDomain = extractDomain(normalizedText.startsWith('http') ? normalizedText : `https://${normalizedText}`);
    if (textDomain && domainRoot(textDomain) !== domainRoot(domain)) {
      reasons.push('visible link text mismatches actual destination');
      score += 20;
    }
  }

  for (const [brand, allowedDomains] of Object.entries(BRAND_DOMAINS)) {
    if (domain.includes(brand) && !allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) {
      reasons.push(`pretends to be ${brand} on a non-official domain`);
      score += 18;
      break;
    }
  }

  return { url, domain, reasons, score };
}

function analyzeEmail({ subject, body, sender = {}, links = [], reportType = 'email_open' }) {
  let score = 0;
  const reasons = [];
  const indicators = {
    urgency: 0,
    authority: 0,
    threats: 0,
    finance: 0,
    credentialHarvesting: 0,
    suspiciousLinks: 0,
    senderSpoofing: 0,
  };

  const combinedText = `${subject} ${body}`;
  const urgency = countKeywords(combinedText, URGENCY_KEYWORDS);
  const authority = countKeywords(combinedText, AUTHORITY_KEYWORDS);
  const threats = countKeywords(combinedText, THREAT_KEYWORDS);
  const finance = countKeywords(combinedText, FINANCIAL_KEYWORDS);
  const credentials = countKeywords(combinedText, CREDENTIAL_KEYWORDS);

  if (urgency.count) {
    indicators.urgency = Math.min(20, urgency.count * 7);
    score += indicators.urgency;
    reasons.push(`Urgency language present: ${urgency.matches.slice(0, 2).join(', ')}`);
  }
  if (authority.count) {
    indicators.authority = Math.min(15, authority.count * 5);
    score += indicators.authority;
    reasons.push(`Authority cues found: ${authority.matches.slice(0, 2).join(', ')}`);
  }
  if (threats.count) {
    indicators.threats = Math.min(20, threats.count * 8);
    score += indicators.threats;
    reasons.push(`Threat language found: ${threats.matches.slice(0, 2).join(', ')}`);
  }
  if (finance.count) {
    indicators.finance = Math.min(18, finance.count * 6);
    score += indicators.finance;
    reasons.push(`Financial request cues found: ${finance.matches.slice(0, 2).join(', ')}`);
  }
  if (credentials.count) {
    indicators.credentialHarvesting = Math.min(18, credentials.count * 6);
    score += indicators.credentialHarvesting;
    reasons.push(`Credential collection cues found: ${credentials.matches.slice(0, 2).join(', ')}`);
  }

  if (sender.email) {
    const senderDomain = sender.domain || sender.email.split('@').pop();
    if (!sender.email.includes('@')) {
      indicators.senderSpoofing += 12;
      reasons.push('Sender email is malformed');
    }
    if (hasObfuscatedBrand(senderDomain) || senderDomain.split('.').length > 3) {
      indicators.senderSpoofing += 15;
      reasons.push(`Sender domain looks suspicious: ${senderDomain}`);
    }
    score += indicators.senderSpoofing;
  }

  const flaggedLinkDetails = [];
  for (const link of links) {
    const inspected = inspectLink(link);
    if (inspected.reasons.length) {
      indicators.suspiciousLinks += inspected.score;
      flaggedLinkDetails.push(inspected);
    }
  }

  if (flaggedLinkDetails.length) {
    score += Math.min(35, indicators.suspiciousLinks);
    reasons.push(`${flaggedLinkDetails.length} suspicious link(s) detected`);
  }

  if (links.length >= 8) {
    score += 8;
    reasons.push(`High link volume for a single email (${links.length})`);
  }

  if (reportType === 'click_intercept') {
    score += 15;
    reasons.unshift('User attempted to open a risky link from the email');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict = 'SAFE';
  if (score >= 70 || flaggedLinkDetails.some((item) => item.score >= 30)) {
    verdict = 'PHISHING';
  } else if (score >= 35) {
    verdict = 'SUSPICIOUS';
  }

  if (verdict === 'SAFE' && reasons.length === 0) {
    reasons.push('No phishing signals detected');
  }

  const riskDelta = verdict === 'PHISHING' ? 18 : verdict === 'SUSPICIOUS' ? 8 : 0;

  return {
    verdict,
    score,
    reasons: reasons.slice(0, 6),
    flaggedLinks: flaggedLinkDetails.map((item) => item.url),
    flaggedLinkDetails,
    indicators,
    riskDelta,
    reportType,
  };
}

module.exports = { analyzeEmail, extractDomain };
