/**
 * routes/phishing.js — Phishing Simulation Routes
 *
 * GET  /api/phishing/emails      — list all simulation emails
 * GET  /api/phishing/emails/:id  — get single email detail
 * POST /api/phishing/action      — record user action on an email
 *
 * Works for BOTH mock users (user-001) AND real DB users (UUIDs).
 */

const express = require('express');
const router = express.Router();
const { phishingEmails, behaviorRecords } = require('../data/mockData');
const { calculateRiskScore, classifyUser } = require('../utils/behaviorAnalysis');

/**
 * Ensure a behavior record exists for the given userId.
 */
function ensureBehaviorRecord(userId) {
  if (!behaviorRecords[userId]) {
    behaviorRecords[userId] = {
      userId,
      actions: [],
      riskScore: 40,
      classification: 'cautious',
      lessonsCompleted: [],
      trainingProgress: 0,
    };
  }
  return behaviorRecords[userId];
}

// GET /api/phishing/emails — get all phishing simulation emails
router.get('/emails', (req, res) => {
  // Return emails without revealing which are phishing (for simulation authenticity)
  const safeEmails = phishingEmails.map(e => ({
    id: e.id,
    from: e.from,
    fromName: e.fromName,
    to: e.to,
    subject: e.subject,
    timestamp: e.timestamp,
    category: e.category === 'legitimate' ? 'email' : 'email',
    difficulty: e.difficulty,
    preview: e.body.slice(0, 120) + '...',
  }));
  res.json(safeEmails);
});

// GET /api/phishing/emails/:id — get single email detail
router.get('/emails/:id', (req, res) => {
  const email = phishingEmails.find(e => e.id === req.params.id);
  if (!email) return res.status(404).json({ message: 'Email not found' });

  // Return full email without redFlags or isPhishing (user must judge themselves)
  res.json({
    id: email.id,
    from: email.from,
    fromName: email.fromName,
    to: email.to,
    subject: email.subject,
    body: email.body,
    timestamp: email.timestamp,
    difficulty: email.difficulty,
  });
});

// POST /api/phishing/action — record user action on an email
router.post('/action', (req, res) => {
  const { userId, emailId, action } = req.body;

  if (!userId || !emailId || !action) {
    return res.status(400).json({ message: 'userId, emailId, and action are required' });
  }

  if (!['clicked', 'reported', 'ignored'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be clicked, reported, or ignored' });
  }

  const email = phishingEmails.find(e => e.id === emailId);
  if (!email) return res.status(404).json({ message: 'Email not found' });

  // Auto-create record for new users (DB-backed UUIDs)
  const record = ensureBehaviorRecord(userId);

  // Check if already acted on this email
  const existingAction = record.actions.find(a => a.emailId === emailId);
  if (existingAction) {
    return res.status(409).json({ message: 'Already acted on this email', existingAction });
  }

  // Record the action
  const newAction = { emailId, action, timestamp: new Date().toISOString() };
  record.actions.push(newAction);

  // Recalculate risk score
  record.riskScore = calculateRiskScore(record.actions, record.lessonsCompleted);
  record.classification = classifyUser(record.riskScore);

  // Prepare feedback response
  let feedback = {};
  if (email.isPhishing) {
    if (action === 'clicked') {
      feedback = {
        type: 'danger',
        title: '⚠️ You Clicked a Phishing Link!',
        message: 'This was a simulated phishing attack. In a real scenario, you may have compromised your credentials or infected your device.',
        redFlags: email.redFlags,
        riskDelta: +30,
      };
    } else if (action === 'reported') {
      feedback = {
        type: 'success',
        title: '🛡️ Excellent! You Reported Phishing!',
        message: 'Great job! You correctly identified and reported this phishing email. This is exactly what you should do.',
        redFlags: email.redFlags,
        riskDelta: -15,
      };
    } else if (action === 'ignored') {
      feedback = {
        type: 'warning',
        title: '🟡 You Ignored It — But Should Report',
        message: 'This was a phishing email. While ignoring avoids immediate harm, reporting it helps protect your entire organization.',
        redFlags: email.redFlags,
        riskDelta: +10,
      };
    }
  } else {
    if (action === 'reported') {
      feedback = {
        type: 'warning',
        title: '🟡 This was a Legitimate Email',
        message: 'You reported a legitimate email. While being cautious is good, false positives can slow down business communications.',
        redFlags: [],
        riskDelta: 0,
      };
    } else {
      feedback = {
        type: 'info',
        title: '✅ Good Call — That Was Legitimate',
        message: 'This email was from a legitimate sender. Your instinct was correct!',
        redFlags: [],
        riskDelta: 0,
      };
    }
  }

  res.json({
    success: true,
    action: newAction,
    feedback,
    newRiskScore: record.riskScore,
    newClassification: record.classification,
  });
});

module.exports = router;
