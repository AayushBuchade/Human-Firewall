/**
 * routes/behavior.js — Behavior Analysis Routes
 *
 * GET /api/behavior/:userId     — full behavior analysis for a user
 * GET /api/behavior/admin/all   — all users behavior (admin)
 *
 * Works for BOTH mock users (user-001) AND real DB users (UUIDs).
 * For DB users without existing records, creates a fresh default.
 */

const express = require('express');
const router = express.Router();
const { behaviorRecords, phishingEmails, users } = require('../data/mockData');
const { calculateRiskScore, classifyUser, getClassificationDetails, getMetrics } = require('../utils/behaviorAnalysis');
const { findUserById, listUsersForOrg } = require('../models/userModel');

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Ensure a behavior record exists for the given userId.
 * If not in mock data, creates a fresh default record.
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

// GET /api/behavior/admin/all — get all users behavior (admin only)
// NOTE: This must be defined BEFORE /:userId to avoid matching "admin" as a userId
router.get('/admin/all', async (req, res) => {
  try {
    // Get all users from DB
    const { users: dbUsers } = await listUsersForOrg(DEFAULT_ORG_ID, { limit: 100, offset: 0 });

    const allRecords = dbUsers.map(dbUser => {
      const record = ensureBehaviorRecord(dbUser.id);
      const riskScore = calculateRiskScore(record.actions, record.lessonsCompleted);
      const classification = classifyUser(riskScore);
      const metrics = getMetrics(record.actions, phishingEmails);
      const avatar = (dbUser.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

      return {
        userId: dbUser.id,
        userName: dbUser.name,
        department: dbUser.department,
        avatar,
        riskScore,
        classification,
        clickRate: metrics.clickRate,
        reportRate: metrics.reportRate,
        totalSimulations: metrics.totalSimulations,
        lessonsCompleted: record.lessonsCompleted.length,
        trainingProgress: record.trainingProgress,
      };
    });

    // Also include mock users not in DB
    for (const [mockUserId, record] of Object.entries(behaviorRecords)) {
      if (!allRecords.find(r => r.userId === mockUserId)) {
        const mockUser = users.find(u => u.id === mockUserId);
        if (mockUser) {
          const riskScore = calculateRiskScore(record.actions, record.lessonsCompleted);
          const classification = classifyUser(riskScore);
          const metrics = getMetrics(record.actions, phishingEmails);

          allRecords.push({
            userId: record.userId,
            userName: mockUser.name,
            department: mockUser.department,
            avatar: mockUser.avatar || '??',
            riskScore,
            classification,
            clickRate: metrics.clickRate,
            reportRate: metrics.reportRate,
            totalSimulations: metrics.totalSimulations,
            lessonsCompleted: record.lessonsCompleted.length,
            trainingProgress: record.trainingProgress,
          });
        }
      }
    }

    // Summary stats
    const total = allRecords.length || 1;
    const avgRisk = Math.round(allRecords.reduce((s, r) => s + r.riskScore, 0) / total);
    const vulnerable = allRecords.filter(r => r.classification === 'vulnerable').length;
    const cautious = allRecords.filter(r => r.classification === 'cautious').length;
    const secure = allRecords.filter(r => r.classification === 'secure').length;

    res.json({
      users: allRecords,
      summary: { avgRisk, vulnerable, cautious, secure, total: allRecords.length },
    });
  } catch (err) {
    console.error('[Behavior] Admin all error:', err.message);
    res.status(500).json({ message: 'Failed to load behavior data' });
  }
});

// GET /api/behavior/:userId — full behavior analysis for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  // Try mock data first
  let record = behaviorRecords[userId];

  // If not in mock data, try to find in DB and create fresh record
  if (!record) {
    try {
      const dbUser = await findUserById(userId);
      if (!dbUser) {
        return res.status(404).json({ message: 'Behavior record not found' });
      }
      record = ensureBehaviorRecord(userId);
    } catch (err) {
      console.error('[Behavior] DB lookup error:', err.message);
      return res.status(500).json({ message: 'Failed to load behavior data' });
    }
  }

  const riskScore = calculateRiskScore(record.actions, record.lessonsCompleted);
  const classification = classifyUser(riskScore);
  const details = getClassificationDetails(classification);
  const metrics = getMetrics(record.actions, phishingEmails);

  // Update in memory
  record.riskScore = riskScore;
  record.classification = classification;

  res.json({
    userId,
    riskScore,
    classification,
    classificationDetails: details,
    metrics,
    actions: record.actions,
    lessonsCompleted: record.lessonsCompleted,
    trainingProgress: record.trainingProgress,
  });
});

module.exports = router;
