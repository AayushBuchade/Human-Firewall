const { userRiskProfiles, behaviorRecords } = require('../data/mockData');
const { createRiskEvent } = require('../models/entities');

function ensureUserRiskProfile(userId, orgId = null) {
  if (!userRiskProfiles[userId]) {
    userRiskProfiles[userId] = {
      userId,
      orgId,
      cumulativeRisk: 0,
      behavioralScore: 50,
      riskEvents: [],
      lastVerdict: 'SAFE',
      updatedAt: new Date().toISOString(),
    };
  }

  return userRiskProfiles[userId];
}

function mapSeverity(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function applyRiskAssessment({ userId, orgId = null, analysis, subject, sender, platform, messageId }) {
  const profile = ensureUserRiskProfile(userId, orgId);
  const scoreDelta = analysis.riskDelta;

  profile.cumulativeRisk = Math.min(100, Math.max(0, profile.cumulativeRisk + scoreDelta));
  profile.behavioralScore = Math.min(100, Math.max(0, Math.round((profile.behavioralScore * 0.7) + (analysis.score * 0.3))));
  profile.lastVerdict = analysis.verdict;
  profile.updatedAt = new Date().toISOString();

  profile.riskEvents.push(createRiskEvent({
    userId,
    orgId,
    scoreDelta,
    scoreAfter: profile.cumulativeRisk,
    severity: mapSeverity(analysis.score),
    trigger: analysis.reportType === 'click_intercept' ? 'link_click' : 'email_scan',
    details: {
      subject: subject.slice(0, 120),
      senderEmail: sender.email,
      senderDomain: sender.domain,
      messageId,
      platform,
      verdict: analysis.verdict,
      reasons: analysis.reasons.slice(0, 5),
    },
  }));

  if (profile.riskEvents.length > 200) {
    profile.riskEvents = profile.riskEvents.slice(-200);
  }

  if (behaviorRecords[userId]) {
    behaviorRecords[userId].riskScore = profile.behavioralScore;
    behaviorRecords[userId].classification =
      profile.behavioralScore >= 70 ? 'vulnerable' : profile.behavioralScore >= 40 ? 'cautious' : 'secure';
  }

  return profile;
}

module.exports = {
  ensureUserRiskProfile,
  applyRiskAssessment,
};
