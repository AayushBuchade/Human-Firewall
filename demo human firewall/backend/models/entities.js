const { v4: uuidv4 } = require('uuid');

function nowIso() {
  return new Date().toISOString();
}

function createEmailLog({
  userId = null,
  userEmail = 'anonymous',
  orgId = null,
  platform = 'unknown',
  messageId = null,
  subject = '',
  sender = {},
  verdict = 'SAFE',
  score = 0,
  reasons = [],
  flaggedLinks = [],
  flaggedLinkDetails = [],
  indicators = {},
  reportedPhishing = false,
}) {
  return {
    id: uuidv4(),
    userId,
    userEmail,
    orgId,
    platform,
    messageId,
    subject: subject.slice(0, 200),
    sender: {
      name: sender.name || '',
      email: sender.email || '',
      domain: sender.domain || '',
      displayText: sender.displayText || '',
    },
    verdict,
    score,
    reasons,
    flaggedLinks,
    flaggedLinkDetails,
    indicators,
    reportedPhishing,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function createRiskEvent({
  userId,
  orgId = null,
  scoreDelta = 0,
  scoreAfter = 0,
  severity = 'low',
  trigger = 'email_scan',
  details = {},
}) {
  return {
    id: uuidv4(),
    userId,
    orgId,
    scoreDelta,
    scoreAfter,
    severity,
    trigger,
    details,
    timestamp: nowIso(),
  };
}

module.exports = {
  createEmailLog,
  createRiskEvent,
};
