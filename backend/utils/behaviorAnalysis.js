// Simple rule-based AI behavior analysis engine
// Classifies users based on their interactions with simulated phishing attacks

/**
 * Scoring rules:
 * - Clicked phishing email: +30 risk points
 * - Ignored phishing email: +10 risk points (better than clicking, but should report)
 * - Reported phishing email: -15 risk points
 * - Completed training lesson: -5 risk points per lesson
 */

function calculateRiskScore(actions, lessonsCompleted) {
  let score = 40; // base score

  for (const action of actions) {
    if (action.action === 'clicked') score += 30;
    else if (action.action === 'ignored') score += 10;
    else if (action.action === 'reported') score -= 15;
  }

  score -= lessonsCompleted.length * 5;
  return Math.max(0, Math.min(100, score));
}

function classifyUser(riskScore) {
  if (riskScore >= 60) return 'vulnerable';
  if (riskScore >= 30) return 'cautious';
  return 'secure';
}

function getClassificationDetails(classification) {
  const map = {
    vulnerable: {
      label: 'Vulnerable',
      color: '#ef4444',
      glow: '#ef444440',
      icon: '⚠️',
      description: 'High risk. You have clicked phishing links. Immediate training required.',
      recommendations: [
        'Complete the Phishing Awareness lesson immediately',
        'Enable multi-factor authentication on all accounts',
        'Practice URL inspection before clicking links',
        'Report all suspicious emails to IT security',
      ],
    },
    cautious: {
      label: 'Cautious',
      color: '#f59e0b',
      glow: '#f59e0b40',
      icon: '🟡',
      description: 'Moderate risk. You are aware but need more practice identifying threats.',
      recommendations: [
        'Complete remaining training modules',
        'Practice identifying phishing red flags',
        'Review the Social Engineering lesson',
        'Improve your reporting rate',
      ],
    },
    secure: {
      label: 'Secure',
      color: '#10b981',
      glow: '#10b98140',
      icon: '🛡️',
      description: 'Low risk. You are actively identifying and reporting threats. Great work!',
      recommendations: [
        'Complete advanced training modules',
        'Help train other team members',
        'Stay updated on new phishing techniques',
        'Consider becoming a Security Champion',
      ],
    },
  };
  return map[classification] || map['cautious'];
}

function getMetrics(actions, phishingEmails) {
  const phishingActions = actions.filter(a => {
    const email = phishingEmails.find(e => e.id === a.emailId);
    return email && email.isPhishing;
  });

  const totalPhishing = phishingActions.length;
  const clicked = phishingActions.filter(a => a.action === 'clicked').length;
  const reported = phishingActions.filter(a => a.action === 'reported').length;
  const ignored = phishingActions.filter(a => a.action === 'ignored').length;

  return {
    totalSimulations: totalPhishing,
    clickRate: totalPhishing > 0 ? Math.round((clicked / totalPhishing) * 100) : 0,
    reportRate: totalPhishing > 0 ? Math.round((reported / totalPhishing) * 100) : 0,
    ignoreRate: totalPhishing > 0 ? Math.round((ignored / totalPhishing) * 100) : 0,
    clickedCount: clicked,
    reportedCount: reported,
    ignoredCount: ignored,
  };
}

module.exports = { calculateRiskScore, classifyUser, getClassificationDetails, getMetrics };
