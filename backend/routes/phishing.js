/**
 * routes/phishing.js — Phishing Simulation Routes (PostgreSQL-backed)
 *
 * GET  /api/phishing/emails          — list inbox for a user (per-user simulations)
 * GET  /api/phishing/emails/:id        — get single email (template id)
 * POST /api/phishing/action            — record employee response, update risk score
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');

function getRiskLevel(score) {
  if (score <= 20) return 'Very Secure';
  if (score <= 40) return 'Low Risk';
  if (score <= 60) return 'Moderate Risk';
  if (score <= 80) return 'High Risk';
  return 'Critical';
}

function isLegitimateEmail(category) {
  return category === 'Legitimate Email';
}

function mapEmailRow(row) {
  const isSafe = isLegitimateEmail(row.category);
  return {
    id: row.template_id || row.id,
    simulationId: row.simulation_id || null,
    from: row.sender_email,
    fromName: row.sender_name,
    to: row.recipient || 'you@company.com',
    subject: row.subject,
    timestamp: row.created_at || row.timestamp,
    category: row.category,
    difficulty: row.difficulty,
    isPhishing: !isSafe,
    isSafe,
    status: row.status || 'sent',
    preview: (row.body || '').slice(0, 120) + ((row.body || '').length > 120 ? '...' : ''),
  };
}

// GET /api/phishing/emails — per-user inbox from phishing_simulations
router.get('/emails', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'userId query parameter is required' });
  }

  try {
    const userCheck = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    const result = await query(
      `SELECT ps.id AS simulation_id, ps.status, ps.created_at,
              pt.id AS template_id, pt.subject, pt.sender_name, pt.sender_email,
              pt.body, pt.category, pt.difficulty, pt.red_flags, pt.explanation
       FROM phishing_simulations ps
       JOIN phishing_templates pt ON ps.template_id = pt.id
       WHERE ps.user_id = $1
       ORDER BY ps.created_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Fallback: assign inbox on first load if seed missed this user
      const templates = await query(
        `SELECT id FROM phishing_templates ORDER BY created_at ASC LIMIT 25`
      );
      for (let i = 0; i < templates.rows.length; i++) {
        await query(
          `INSERT INTO phishing_simulations (user_id, template_id, status, created_at)
           VALUES ($1, $2, 'sent', NOW() - (INTERVAL '1 hour' * $3))
           ON CONFLICT DO NOTHING`,
          [userId, templates.rows[i].id, i]
        );
      }
      const retry = await query(
        `SELECT ps.id AS simulation_id, ps.status, ps.created_at,
                pt.id AS template_id, pt.subject, pt.sender_name, pt.sender_email,
                pt.body, pt.category, pt.difficulty
         FROM phishing_simulations ps
         JOIN phishing_templates pt ON ps.template_id = pt.id
         WHERE ps.user_id = $1
         ORDER BY ps.created_at DESC`,
        [userId]
      );
      return res.json(retry.rows.map(mapEmailRow));
    }

    return res.json(result.rows.map(mapEmailRow));
  } catch (err) {
    console.error('[Phishing Emails Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load inbox emails' });
  }
});

// GET /api/phishing/emails/:id — single email detail
router.get('/emails/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    const result = await query(
      `SELECT id, subject, sender_name, sender_email, body, difficulty, category,
              red_flags, explanation, attack_technique, expected_user_action
       FROM phishing_templates
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Email not found' });
    }

    const email = result.rows[0];
    let status = 'sent';

    if (userId) {
      const simRes = await query(
        `SELECT status FROM phishing_simulations
         WHERE user_id = $1 AND template_id = $2 LIMIT 1`,
        [userId, id]
      );
      if (simRes.rows.length > 0) status = simRes.rows[0].status;
    }

    const isSafe = isLegitimateEmail(email.category);

    return res.json({
      id: email.id,
      from: email.sender_email,
      fromName: email.sender_name,
      to: 'you@company.com',
      subject: email.subject,
      body: email.body,
      timestamp: new Date().toISOString(),
      difficulty: email.difficulty,
      category: email.category,
      isPhishing: !isSafe,
      isSafe,
      status,
      redFlags: email.red_flags,
      explanation: email.explanation,
      attackTechnique: email.attack_technique,
      expectedAction: email.expected_user_action,
    });
  } catch (err) {
    console.error('[Phishing Email Detail Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load email details' });
  }
});

// POST /api/phishing/action — record action
router.post('/action', async (req, res) => {
  const { userId, emailId, action } = req.body;

  if (!userId || !emailId || !action) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'userId, emailId, and action are required' });
  }

  const validActions = ['clicked', 'reported', 'ignored', 'marked_safe'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: `Invalid action. Must be one of: ${validActions.join(', ')}` });
  }

  try {
    const userRes = await query(
      `SELECT id, name, risk_score, org_id, security_streak, phishing_reported
       FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }
    const user = userRes.rows[0];

    const templateRes = await query(
      `SELECT id, subject, category, difficulty, red_flags, explanation, risk_score, expected_user_action
       FROM phishing_templates WHERE id = $1`,
      [emailId]
    );
    if (templateRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Simulated email template not found' });
    }
    const template = templateRes.rows[0];
    const isSafe = isLegitimateEmail(template.category);

    const simCheck = await query(
      `SELECT id, status FROM phishing_simulations
       WHERE user_id = $1 AND template_id = $2 LIMIT 1`,
      [userId, emailId]
    );

    let simulationId;
    if (simCheck.rows.length > 0) {
      if (simCheck.rows[0].status !== 'sent') {
        return res.status(409).json({
          message: 'Already acted on this email',
          existingAction: { emailId, action: simCheck.rows[0].status },
        });
      }
      simulationId = simCheck.rows[0].id;
      await query(
        `UPDATE phishing_simulations SET status = $1, acted_at = NOW() WHERE id = $2`,
        [action, simulationId]
      );
    } else {
      const simInsert = await query(
        `INSERT INTO phishing_simulations (user_id, template_id, status, acted_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [userId, emailId, action]
      );
      simulationId = simInsert.rows[0].id;
    }

    await query(
      `INSERT INTO phishing_events (simulation_id, user_id, event_type, details)
       VALUES ($1, $2, $3, $4)`,
      [simulationId, userId, action.toUpperCase(), JSON.stringify({ category: template.category, difficulty: template.difficulty, isSafe })]
    );

    // Score impact depends on whether email is phishing or legitimate
    let streakChange = 0;
    let countsAsAttempt = true;
    let clickInc = 0;
    let reportInc = 0;
    let credInc = 0;

    if (isSafe) {
      if (action === 'marked_safe') {
        streakChange = 1;
        reportInc = 0;
      } else if (action === 'reported') {
        streakChange = -1;
        reportInc = 0;
      } else if (action === 'clicked') {
        streakChange = 0;
      }
    } else {
      if (action === 'reported') {
        streakChange = 1;
        reportInc = 1;
      } else if (action === 'clicked') {
        streakChange = -user.security_streak;
        clickInc = 1;
        credInc = 1;
      } else if (action === 'marked_safe') {
        streakChange = -1;
        clickInc = 1;
      }
    }

    if (action === 'ignored') {
      streakChange = Math.min(streakChange, 0);
    }

    await query(
      `UPDATE users
       SET phishing_attempts = phishing_attempts + $1,
           phishing_clicked = phishing_clicked + $2,
           phishing_reported = phishing_reported + $3,
           credential_submission_attempts = credential_submission_attempts + $4,
           security_streak = GREATEST(0, security_streak + $5),
           last_phishing_event = NOW(),
           last_activity = NOW()
       WHERE id = $6`,
      [countsAsAttempt ? 1 : 0, clickInc, reportInc, credInc, streakChange, userId]
    );

    const updatedUserRes = await query(
      `SELECT phishing_attempts, phishing_clicked, phishing_reported,
              credential_submission_attempts, training_completed, successful_quizzes, security_streak
       FROM users WHERE id = $1`,
      [userId]
    );
    const u = updatedUserRes.rows[0];

    const rawScore = 40 + (u.phishing_clicked * 30) + ((u.phishing_attempts - u.phishing_clicked - u.phishing_reported) * 10)
                     - (u.phishing_reported * 15) - (u.training_completed * 10) - (u.successful_quizzes * 5)
                     + (u.credential_submission_attempts * 40);
    const newScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const newLevel = getRiskLevel(newScore);

    await query('UPDATE users SET risk_score = $1, risk_level = $2 WHERE id = $3', [newScore, newLevel, userId]);

    let activityText = '';
    if (isSafe) {
      if (action === 'marked_safe') activityText = `Correctly identified legitimate email: "${template.subject}".`;
      else if (action === 'reported') activityText = `False positive: Reported legitimate email "${template.subject}".`;
      else if (action === 'clicked') activityText = `Opened link in legitimate email: "${template.subject}".`;
      else activityText = `Ignored legitimate email: "${template.subject}".`;
    } else {
      if (action === 'clicked') activityText = `Failed simulation: Clicked phishing link in "${template.subject}".`;
      else if (action === 'reported') activityText = `Successfully identified and reported simulated phishing: "${template.subject}".`;
      else if (action === 'marked_safe') activityText = `Missed phishing threat — marked malicious email as safe: "${template.subject}".`;
      else activityText = `Ignored simulated email: "${template.subject}".`;
    }

    const activityType = action === 'clicked' || action === 'marked_safe' && !isSafe
      ? 'FAILED_PHISHING'
      : action === 'reported' && !isSafe
        ? 'REPORTED_PHISHING'
        : 'INCIDENT_REPORTED';

    await query(
      `INSERT INTO security_activity (user_id, activity_type, description) VALUES ($1, $2, $3)`,
      [userId, activityType, activityText]
    );

    await query('INSERT INTO risk_scores (user_id, score) VALUES ($1, $2)', [userId, newScore]);

    if (newScore !== user.risk_score) {
      await query(
        `INSERT INTO risk_events (user_id, org_id, score_change, score_after, severity, trigger, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, user.org_id, newScore - user.risk_score, newScore,
         action === 'clicked' || (!isSafe && action === 'marked_safe') ? 'high' : 'low',
         'phishing_simulation', `Interacted with simulated email: ${action}`]
      );
    }

    // Badge checks
    if (u.phishing_reported >= 5) {
      const hunterRes = await query("SELECT id FROM badges WHERE name = 'Phishing Hunter'");
      if (hunterRes.rows.length > 0) {
        const badgeId = hunterRes.rows[0].id;
        const checkBadge = await query('SELECT id FROM employee_badges WHERE user_id = $1 AND badge_id = $2', [userId, badgeId]);
        if (checkBadge.rows.length === 0) {
          await query('INSERT INTO employee_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badgeId]);
        }
      }
    }

    if (u.security_streak >= 5) {
      const defenderRes = await query("SELECT id FROM badges WHERE name = 'Cyber Defender'");
      if (defenderRes.rows.length > 0) {
        const badgeId = defenderRes.rows[0].id;
        const checkBadge = await query('SELECT id FROM employee_badges WHERE user_id = $1 AND badge_id = $2', [userId, badgeId]);
        if (checkBadge.rows.length === 0) {
          await query('INSERT INTO employee_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badgeId]);
        }
      }
    }

    let feedback = {};
    if (isSafe) {
      if (action === 'marked_safe') {
        feedback = { type: 'success', title: 'Correct — Legitimate Email', message: 'This was a genuine internal communication. Marking it safe was the right call.', redFlags: [], riskDelta: -5 };
      } else if (action === 'reported') {
        feedback = { type: 'warning', title: 'False Alarm', message: 'This email was legitimate. Reporting safe internal emails creates unnecessary workload for the security team.', redFlags: template.red_flags, riskDelta: +10 };
      } else if (action === 'ignored') {
        feedback = { type: 'success', title: 'Safe to Ignore', message: 'This was a legitimate email. Ignoring it was acceptable, though marking safe helps tracking.', redFlags: [], riskDelta: 0 };
      } else {
        feedback = { type: 'success', title: 'Legitimate Link', message: 'This link was from a trusted internal source.', redFlags: [], riskDelta: 0 };
      }
    } else if (action === 'clicked') {
      feedback = { type: 'danger', title: 'You Clicked a Phishing Link!', message: 'This was a simulated phishing attack. In a real scenario, you may have compromised your credentials.', redFlags: template.red_flags, riskDelta: +30, explanation: template.explanation };
    } else if (action === 'reported') {
      feedback = { type: 'success', title: 'Excellent! You Reported Phishing!', message: 'Great job identifying and reporting this phishing email.', redFlags: template.red_flags, riskDelta: -15, explanation: template.explanation };
    } else if (action === 'marked_safe') {
      feedback = { type: 'danger', title: 'Missed Phishing Threat!', message: 'This was a phishing email. Marking it safe puts the organization at risk.', redFlags: template.red_flags, riskDelta: +20, explanation: template.explanation };
    } else {
      feedback = { type: 'warning', title: 'Ignored — But Should Report', message: 'This was a phishing email. Reporting helps protect your entire organization.', redFlags: template.red_flags, riskDelta: +10, explanation: template.explanation };
    }

    return res.json({
      success: true,
      action: { emailId, action, timestamp: new Date().toISOString() },
      feedback,
      newRiskScore: newScore,
      newClassification: newLevel.toLowerCase(),
    });
  } catch (err) {
    console.error('[Record Phishing Action Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to record response action' });
  }
});

module.exports = router;
