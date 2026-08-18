/**
 * routes/dashboard.js — Upgraded Employee Dashboard (PostgreSQL-backed)
 *
 * GET /api/saas-dashboard/:userId — fetch full dashboard data, metrics, trend, and progress
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { classifyUser, getClassificationDetails } = require('../utils/behaviorAnalysis');

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Fetch user statistics
    const userRes = await query(
      `SELECT id, name, email, department, risk_score, risk_level,
              phishing_attempts, phishing_clicked, phishing_reported,
              training_completed, training_progress, training_xp, lessons_completed, avatar
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee profile not found' });
    }

    const u = userRes.rows[0];
    const riskScore = u.risk_score;
    const classification = classifyUser(riskScore);
    const details = getClassificationDetails(classification);

    const totalSims = parseInt(u.phishing_attempts || 0, 10);
    const clickRate = totalSims > 0 ? Math.round((parseInt(u.phishing_clicked || 0, 10) / totalSims) * 100) : 0;
    const reportRate = totalSims > 0 ? Math.round((parseInt(u.phishing_reported || 0, 10) / totalSims) * 100) : 0;
    const ignoreRate = totalSims > 0 ? Math.max(0, 100 - clickRate - reportRate) : 0;

    const metrics = {
      totalSimulations: totalSims,
      clickRate,
      reportRate,
      ignoreRate,
      clickedCount: parseInt(u.phishing_clicked || 0, 10),
      reportedCount: parseInt(u.phishing_reported || 0, 10),
      ignoredCount: Math.max(0, totalSims - parseInt(u.phishing_clicked || 0, 10) - parseInt(u.phishing_reported || 0, 10))
    };

    // 2. Fetch risk trend (last 7 points) from risk_scores
    const trendRes = await query(
      `SELECT score, recorded_at
       FROM risk_scores
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 7`,
      [userId]
    );

    let riskTrend = trendRes.rows.reverse().map(t => {
      const dayName = new Date(t.recorded_at).toLocaleDateString('en-US', { weekday: 'short' });
      return { day: dayName, risk: t.score };
    });

    if (riskTrend.length === 0) {
      riskTrend = [{ day: 'Today', risk: riskScore }];
    }

    // 3. Fetch recent activity (last 5 simulation actions)
    const recentActivityRes = await query(
      `SELECT pt.subject, ps.status, ps.acted_at
       FROM phishing_simulations ps
       JOIN phishing_templates pt ON ps.template_id = pt.id
       WHERE ps.user_id = $1 AND ps.status != 'sent'
       ORDER BY ps.acted_at DESC
       LIMIT 5`,
      [userId]
    );

    const recentActivity = recentActivityRes.rows.map(act => ({
      emailSubject: act.subject,
      action: act.status,
      timestamp: act.acted_at
    }));

    // 4. Fetch next recommended training lesson
    const lessonsListRes = await query(
      `SELECT l.id, c.title, c.icon, c.duration, c.xp
       FROM training_lessons l
       JOIN training_modules m ON l.module_id = m.id
       JOIN training_courses c ON m.course_id = c.id
       ORDER BY c.title ASC`
    );

    const completedIds = Array.isArray(u.lessons_completed) ? u.lessons_completed : [];
    const nextLessonObj = lessonsListRes.rows.find(l => !completedIds.includes(l.id));

    return res.json({
      user: {
        name: u.name,
        department: u.department,
        avatar: u.avatar || (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      },
      riskScore,
      classification,
      classificationDetails: details,
      metrics,
      riskTrend,
      recentActivity,
      trainingProgress: parseInt(u.training_progress || 0, 10),
      lessonsCompleted: completedIds.length,
      totalLessons: lessonsListRes.rows.length,
      totalXP: parseInt(u.training_xp || 0, 10),
      nextLesson: nextLessonObj ? {
        id: nextLessonObj.id,
        title: nextLessonObj.title,
        icon: nextLessonObj.icon,
        duration: nextLessonObj.duration,
        xp: nextLessonObj.xp
      } : null
    });

  } catch (err) {
    console.error('[Dashboard Details Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve employee dashboard data' });
  }
});

module.exports = router;
