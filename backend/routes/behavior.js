/**
 * routes/behavior.js — Upgraded Behavior Analysis Routes (PostgreSQL-backed)
 *
 * GET /api/behavior/admin/all   — get behavior overview of all employees (Admin)
 * GET /api/behavior/:userId     — full behavior metrics and action logs for one employee
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { classifyUser, getClassificationDetails } = require('../utils/behaviorAnalysis');

// GET /api/behavior/admin/all — get all users behavior (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, department, risk_score, risk_level,
              phishing_attempts, phishing_clicked, phishing_reported,
              training_completed, training_progress, avatar
       FROM users
       WHERE role != 'admin'
       ORDER BY risk_score DESC`
    );

    const allRecords = result.rows.map(u => {
      const classification = classifyUser(u.risk_score);
      const totalSims = parseInt(u.phishing_attempts || 0, 10);
      const clickRate = totalSims > 0 ? Math.round((parseInt(u.phishing_clicked || 0, 10) / totalSims) * 100) : 0;
      const reportRate = totalSims > 0 ? Math.round((parseInt(u.phishing_reported || 0, 10) / totalSims) * 100) : 0;

      return {
        userId: u.id,
        userName: u.name,
        department: u.department,
        avatar: u.avatar || '??',
        riskScore: u.risk_score,
        classification,
        clickRate,
        reportRate,
        totalSimulations: totalSims,
        lessonsCompleted: parseInt(u.training_completed || 0, 10),
        trainingProgress: parseInt(u.training_progress || 0, 10)
      };
    });

    const total = allRecords.length || 1;
    const avgRisk = Math.round(allRecords.reduce((s, r) => s + r.riskScore, 0) / total);
    const vulnerable = allRecords.filter(r => r.classification === 'vulnerable').length;
    const cautious = allRecords.filter(r => r.classification === 'cautious').length;
    const secure = allRecords.filter(r => r.classification === 'secure').length;

    return res.json({
      users: allRecords,
      summary: { avgRisk, vulnerable, cautious, secure, total: allRecords.length }
    });

  } catch (err) {
    console.error('[Behavior Admin All Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve employees behavior metrics' });
  }
});

// GET /api/behavior/:userId — full behavior analysis for a single user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const userRes = await query(
      `SELECT id, name, department, risk_score, risk_level,
              phishing_attempts, phishing_clicked, phishing_reported,
              training_completed, training_progress, lessons_completed, avatar
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee behavioral profile not found' });
    }

    const u = userRes.rows[0];
    const classification = classifyUser(u.risk_score);
    const details = getClassificationDetails(classification);

    const totalSims = parseInt(u.phishing_attempts || 0, 10);
    const clickRate = totalSims > 0 ? Math.round((parseInt(u.phishing_clicked || 0, 10) / totalSims) * 100) : 0;
    const reportRate = totalSims > 0 ? Math.round((parseInt(u.phishing_reported || 0, 10) / totalSims) * 100) : 0;
    const ignoreRate = totalSims > 0 ? Math.max(0, 100 - clickRate - reportRate) : 0;

    const clickedCount = parseInt(u.phishing_clicked || 0, 10);
    const reportedCount = parseInt(u.phishing_reported || 0, 10);
    const ignoredCount = Math.max(0, totalSims - clickedCount - reportedCount);

    // Retrieve active user action records from DB (excluding pending 'sent' status)
    const actionsRes = await query(
      `SELECT template_id AS "emailId", status AS action, acted_at AS timestamp
       FROM phishing_simulations
       WHERE user_id = $1 AND status != 'sent'
       ORDER BY acted_at DESC`,
      [userId]
    );

    const completedLessons = Array.isArray(u.lessons_completed) ? u.lessons_completed : [];

    return res.json({
      userId: u.id,
      riskScore: u.risk_score,
      classification,
      classificationDetails: details,
      metrics: {
        totalSimulations: totalSims,
        clickRate,
        reportRate,
        ignoreRate,
        clickedCount,
        reportedCount,
        ignoredCount
      },
      actions: actionsRes.rows,
      lessonsCompleted: completedLessons,
      trainingProgress: parseInt(u.training_progress || 0, 10)
    });

  } catch (err) {
    console.error('[Behavior User Details Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve employee behavior metrics' });
  }
});

module.exports = router;
