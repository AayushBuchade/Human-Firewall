const MAX_BODY_LENGTH = 20000;
const MAX_SUBJECT_LENGTH = 250;
const MAX_LINKS = 25;

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim().slice(0, maxLength);
}

function sanitizeLink(link) {
  if (typeof link === 'string') {
    return { url: sanitizeString(link, 2048), text: '' };
  }
  if (!link || typeof link !== 'object') return null;
  return {
    url: sanitizeString(link.url, 2048),
    text: sanitizeString(link.text, 512),
  };
}

function normalizeSender(sender) {
  if (!sender || typeof sender !== 'object') {
    return { name: '', email: '', domain: '', displayText: '' };
  }

  const email = sanitizeString(sender.email, 320).toLowerCase();
  const domain = email.includes('@') ? email.split('@').pop() : sanitizeString(sender.domain, 255).toLowerCase();

  return {
    name: sanitizeString(sender.name, 120),
    email,
    domain,
    displayText: sanitizeString(sender.displayText, 320),
  };
}

function validateAnalysisPayload(payload = {}) {
  const subject = sanitizeString(payload.subject, MAX_SUBJECT_LENGTH);
  const body = sanitizeString(payload.body, MAX_BODY_LENGTH);
  const messageId = sanitizeString(payload.messageId, 180);
  const platform = ['gmail', 'outlook'].includes(payload.platform) ? payload.platform : 'unknown';
  const userEmail = sanitizeString(payload.userEmail, 320).toLowerCase();
  const sender = normalizeSender(payload.sender);

  if (!subject && !body) {
    return { error: 'At least one of subject or body is required.' };
  }

  if (payload.links && !Array.isArray(payload.links)) {
    return { error: 'links must be an array.' };
  }

  const links = (payload.links || [])
    .slice(0, MAX_LINKS)
    .map(sanitizeLink)
    .filter((link) => link && link.url);

  return {
    value: {
      subject,
      body,
      messageId,
      platform,
      userEmail,
      sender,
      links,
    },
  };
}

module.exports = { validateAnalysisPayload };
