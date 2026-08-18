/**
 * routes/admin.js — Upgraded Admin Dashboard API (PostgreSQL-backed)
 *
 * Implements endpoints for:
 * GET  /api/admin/overview               — SOC command center org-wide risk summary
 * GET  /api/admin/users                  — paginated user list with full security stats
 * GET  /api/admin/users/:userId/profile  — deep-dive security profile details
 * POST /api/admin/users/:userId/phishing — instantly trigger a simulated phishing campaign
 * POST /api/admin/users/:userId/assign   — assign a security training course
 * POST /api/admin/users/:userId/reset    — reset employee risk profile to baseline
 */

const express = require('express');
const router = express.Router();

const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query } = require('../db');

// Enforce authentication & admin role
router.use(requireAuth, requireAdmin);

// Helper: map risk score to classification
function getRiskLevel(score) {
  if (score <= 20) return 'Very Secure';
  if (score <= 40) return 'Low Risk';
  if (score <= 60) return 'Moderate Risk';
  if (score <= 80) return 'High Risk';
  return 'Critical';
}

// ─── GET /api/admin/overview ─────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  const orgId = req.user?.orgId || '00000000-0000-0000-0000-000000000001';

  try {
    // 1. Scan metrics (email_logs scanned by the extension)
    const scanSummaryRes = await query(
      `SELECT
         COUNT(*)                                         AS total_scans,
         COUNT(*) FILTER (WHERE verdict = 'PHISHING')     AS phishing_count,
         COUNT(*) FILTER (WHERE verdict = 'SUSPICIOUS')   AS suspicious_count,
         COUNT(*) FILTER (WHERE verdict = 'SAFE')         AS safe_count,
         COUNT(*) FILTER (WHERE reported_phishing = TRUE) AS reported_count,
         AVG(score)::NUMERIC(5,1)                         AS avg_score
       FROM email_logs
       WHERE org_id = $1`,
      [orgId]
    );
    const scanSum = scanSummaryRes.rows[0];

    // 2. Org risk and simulation metrics (from users table)
    const orgMetricsRes = await query(
      `SELECT
         COUNT(*) AS total_employees,
         AVG(risk_score)::NUMERIC(5,1) AS avg_risk_score,
         SUM(phishing_attempts) AS total_simulations_sent,
         SUM(phishing_clicked) AS total_clicked,
         SUM(phishing_reported) AS total_reported
       FROM users
       WHERE org_id = $1 AND role != 'admin'`,
      [orgId]
    );
    const orgMet = orgMetricsRes.rows[0];

    const totalSims = parseInt(orgMet.total_simulations_sent || 0, 10);
    const clickRate = totalSims > 0 ? Math.round((parseInt(orgMet.total_clicked || 0, 10) / totalSims) * 100) : 0;
    const reportRate = totalSims > 0 ? Math.round((parseInt(orgMet.total_reported || 0, 10) / totalSims) * 100) : 0;

    // 3. Risk level breakdown
    const breakdownRes = await query(
      `SELECT risk_level, COUNT(*) AS count
       FROM users
       WHERE org_id = $1 AND role != 'admin'
       GROUP BY risk_level`,
      [orgId]
    );
    const breakdown = { 'Very Secure': 0, 'Low Risk': 0, 'Moderate Risk': 0, 'High Risk': 0, 'Critical': 0 };
    breakdownRes.rows.forEach(r => {
      if (breakdown[r.risk_level] !== undefined) {
        breakdown[r.risk_level] = parseInt(r.count, 10);
      }
    });

    // 4. Top vulnerable departments (highest average risk score)
    const deptRes = await query(
      `SELECT
         department,
         COUNT(*) AS employee_count,
         AVG(risk_score)::NUMERIC(5,1) AS avg_risk_score
       FROM users
       WHERE org_id = $1 AND role != 'admin'
       GROUP BY department
       ORDER BY avg_risk_score DESC
       LIMIT 5`,
      [orgId]
    );

    // 5. Recent security activities timeline
    const activityRes = await query(
      `SELECT
         sa.id,
         sa.activity_type,
         sa.description,
         sa.created_at,
         u.name AS user_name,
         u.email AS user_email
       FROM security_activity sa
       JOIN users u ON sa.user_id = u.id
       WHERE u.org_id = $1
       ORDER BY sa.created_at DESC
       LIMIT 10`,
      [orgId]
    );

    // 6. Top 5 highest risk users
    const topRiskRes = await query(
      `SELECT id, name, email, department, job_role, risk_score, risk_level, avatar
       FROM users
       WHERE org_id = $1 AND role != 'admin'
       ORDER BY risk_score DESC
       LIMIT 5`,
      [orgId]
    );

    return res.json({
      totalScans: parseInt(scanSum.total_scans || 0, 10),
      phishingDetected: parseInt(scanSum.phishing_count || 0, 10),
      suspiciousCount: parseInt(scanSum.suspicious_count || 0, 10),
      safeCount: parseInt(scanSum.safe_count || 0, 10),
      phishingReports: parseInt(scanSum.reported_count || 0, 10),
      avgScanScore: parseFloat(scanSum.avg_score || 0),
      
      // SOC commands
      avgOrgRiskScore: parseFloat(orgMet.avg_risk_score || 40),
      totalEmployees: parseInt(orgMet.total_employees || 0, 10),
      totalSimulationsSent: totalSims,
      avgClickRate: clickRate,
      avgReportRate: reportRate,
      
      riskLevelBreakdown: breakdown,
      topVulnerableDepartments: deptRes.rows.map(d => ({
        department: d.department,
        employeeCount: parseInt(d.employee_count, 10),
        avgRiskScore: parseFloat(d.avg_risk_score)
      })),
      recentActivityFeed: activityRes.rows.map(a => ({
        id: a.id,
        activityType: a.activity_type,
        description: a.description,
        timestamp: a.created_at,
        userName: a.user_name,
        userEmail: a.user_email
      })),
      topRiskUsers: topRiskRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        jobRole: u.job_role,
        riskScore: u.risk_score,
        riskLevel: u.risk_level,
        avatar: u.avatar
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Admin Overview Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load command center overview' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const orgId = req.user?.orgId || '00000000-0000-0000-0000-000000000001';
  const search = req.query.search || '';

  try {
    let sql = `
      SELECT id, name, email, department, job_role, risk_score, risk_level,
             phishing_attempts, phishing_clicked, phishing_reported,
             training_completed, training_progress, training_xp, security_streak, avatar, created_at
      FROM users
      WHERE org_id = $1 AND role != 'admin'
    `;
    const params = [orgId];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $2 OR email ILIKE $2 OR department ILIKE $2 OR job_role ILIKE $2)`;
    }

    sql += ` ORDER BY risk_score DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countParams = [orgId];
    let countSql = `SELECT COUNT(*) AS total FROM users WHERE org_id = $1 AND role != 'admin'`;
    if (search) {
      countParams.push(`%${search}%`);
      countSql += ` AND (name ILIKE $2 OR email ILIKE $2 OR department ILIKE $2 OR job_role ILIKE $2)`;
    }

    const [dataRes, countRes] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);

    const total = parseInt(countRes.rows[0].total, 10);

    return res.json({
      users: dataRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        jobRole: u.job_role,
        riskScore: u.risk_score,
        riskLevel: u.risk_level,
        phishingAttempts: u.phishing_attempts,
        phishingClicked: u.phishing_clicked,
        phishingReported: u.phishing_reported,
        trainingCompleted: u.training_completed,
        trainingProgress: u.training_progress,
        trainingXP: u.training_xp,
        securityStreak: u.security_streak,
        avatar: u.avatar,
        joinedAt: u.created_at
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error('[Admin Users Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load employee list' });
  }
});

// ─── GET /api/admin/users/:userId/profile ─────────────────────────────────────
router.get('/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const orgId = req.user?.orgId || '00000000-0000-0000-0000-000000000001';

  try {
    // 1. Fetch main user details
    const userRes = await query(
      `SELECT id, name, email, department, job_role, risk_score, risk_level,
              phishing_attempts, phishing_clicked, phishing_reported, credential_submission_attempts,
              training_completed, training_progress, training_xp, security_streak, avatar, account_created
       FROM users
       WHERE id = $1 AND org_id = $2`,
      [userId, orgId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found' });
    }
    const user = userRes.rows[0];

    // 2. Fetch risk trend (7 snapshots)
    const trendRes = await query(
      `SELECT score, recorded_at
       FROM risk_scores
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 7`,
      [userId]
    );
    // Reverse to chronological
    const riskTrend = trendRes.rows.reverse().map((t, idx) => {
      const dayName = new Date(t.recorded_at).toLocaleDateString('en-US', { weekday: 'short' });
      return { day: dayName, risk: t.score };
    });

    // 3. Fetch security activities (15 items)
    const activitiesRes = await query(
      `SELECT id, activity_type, description, created_at
       FROM security_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 15`,
      [userId]
    );

    // 4. Fetch awarded badges
    const badgesRes = await query(
      `SELECT b.name, b.description, b.icon, eb.awarded_at
       FROM employee_badges eb
       JOIN badges b ON eb.badge_id = b.id
       WHERE eb.user_id = $1
       ORDER BY eb.awarded_at DESC`,
      [userId]
    );

    // 5. Fetch available training courses (for assignment list)
    const availableCoursesRes = await query(
      `SELECT id, title, category, difficulty, xp FROM training_courses ORDER BY title`
    );

    return res.json({
      employee: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        jobRole: user.job_role,
        riskScore: user.risk_score,
        riskLevel: user.risk_level,
        phishingAttempts: user.phishing_attempts,
        phishingClicked: user.phishing_clicked,
        phishingReported: user.phishing_reported,
        credentialSubmissionAttempts: user.credential_submission_attempts,
        trainingCompleted: user.training_completed,
        trainingProgress: user.training_progress,
        trainingXP: user.training_xp,
        securityStreak: user.security_streak,
        avatar: user.avatar,
        accountCreated: user.account_created
      },
      riskTrend: riskTrend.length > 0 ? riskTrend : [{ day: 'Today', risk: user.risk_score }],
      activities: activitiesRes.rows.map(a => ({
        id: a.id,
        activityType: a.activity_type,
        description: a.description,
        timestamp: a.created_at
      })),
      badges: badgesRes.rows.map(b => ({
        name: b.name,
        description: b.description,
        icon: b.icon,
        awardedAt: b.awarded_at
      })),
      availableCourses: availableCoursesRes.rows
    });

  } catch (err) {
    console.error('[Admin User Profile Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve employee profile' });
  }
});

// ─── POST /api/admin/users/:userId/phishing ───────────────────────────────────
router.post('/users/:userId/phishing', async (req, res) => {
  const { userId } = req.params;
  const orgId = req.user?.orgId || '00000000-0000-0000-0000-000000000001';

  try {
    // 1. Check user exists
    const userRes = await query(
      'SELECT id, name, email, risk_score FROM users WHERE id = $1 AND org_id = $2',
      [userId, orgId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found' });
    }
    const user = userRes.rows[0];

    // 2. Select a random phishing template
    const templateRes = await query('SELECT id, subject, category FROM phishing_templates ORDER BY RANDOM() LIMIT 1');
    if (templateRes.rows.length === 0) {
      return res.status(500).json({ error: 'CONFIG_ERROR', message: 'No phishing templates available to trigger' });
    }
    const template = templateRes.rows[0];

    // 3. Create simulation entry
    const simulationRes = await query(
      `INSERT INTO phishing_simulations (template_id, user_id, status)
       VALUES ($1, $2, $3) RETURNING id`,
      [template.id, userId, 'sent']
    );

    // 4. Log security activity and update user simulation counts
    await query(
      `INSERT INTO security_activity (user_id, activity_type, description)
       VALUES ($1, $2, $3)`,
      [userId, 'INCIDENT_REPORTED', `Administrative phishing simulation triggered. Email subject: "${template.subject}"`]
    );

    await query(
      `UPDATE users
       SET phishing_attempts = phishing_attempts + 1,
           total_simulations = total_simulations + 1,
           last_phishing_event = NOW(),
           last_activity = NOW()
       WHERE id = $1`,
      [userId]
    );

    // 5. Recalculate and record risk score
    // Get updated user details
    const updatedUserRes = await query(
      `SELECT phishing_attempts, phishing_clicked, phishing_reported,
              credential_submission_attempts, training_completed, successful_quizzes
       FROM users WHERE id = $1`,
      [userId]
    );
    const u = updatedUserRes.rows[0];
    
    // Deterministic formula
    const rawScore = 40 + (u.phishing_clicked * 30) + ((u.phishing_attempts - u.phishing_clicked - u.phishing_reported) * 10)
                     - (u.phishing_reported * 15) - (u.training_completed * 10) - (u.successful_quizzes * 5)
                     + (u.credential_submission_attempts * 40);
    const newScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const newLevel = getRiskLevel(newScore);

    await query(
      'UPDATE users SET risk_score = $1, risk_level = $2 WHERE id = $3',
      [newScore, newLevel, userId]
    );

    await query(
      'INSERT INTO risk_scores (user_id, score) VALUES ($1, $2)',
      [userId, newScore]
    );

    if (newScore !== user.risk_score) {
      await query(
        `INSERT INTO risk_events (user_id, org_id, score_change, score_after, severity, trigger, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, orgId, newScore - user.risk_score, newScore, 'medium', 'phishing_simulation', 'Triggered simulation campaign run']
      );
    }

    return res.json({
      success: true,
      message: `Phishing simulation ("${template.subject}") triggered successfully for ${user.name}.`,
      simulationId: simulationRes.rows[0].id
    });

  } catch (err) {
    console.error('[Admin Trigger Phishing Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to trigger phishing simulation' });
  }
});

// ─── POST /api/admin/users/:userId/assign ─────────────────────────────────────
router.post('/users/:userId/assign', async (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.body;
  const orgId = req.user?.orgId || '00000000-0000-0000-0000-000000000001';

  if (!courseId) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'courseId is required' });
  }

  try {
    // 1. Verify user and course exist
    const userRes = await query('SELECT name FROM users WHERE id = $1 AND org_id = $2', [userId, orgId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found' });
    }

    const courseRes = await query('SELECT title FROM training_courses WHERE id = $1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Course not found' });
    }

    const courseTitle = courseRes.rows[0].title;

    // 2. Insert or update employee progress
    await query(
      `INSERT INTO employee_training_progress (user_id, course_id, status, progress_percentage)
       VALUES ($1, $2, 'in_progress', 0)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET status = 'in_progress', progress_percentage = 0, updated_at = NOW()`,
      [userId, courseId]
    );

    // 3. Log security activity
    await query(
      `INSERT INTO security_activity (user_id, activity_type, description)
       VALUES ($1, $2, $3)`,
      [userId, 'COMPLETED_LESSON', `Assigned course "${courseTitle}" administratively.`]
    );

    return res.json({
      success: true,
      message: `Course "${courseTitle}" assigned to ${userRes.rows[0].name} successfully.`
    });

  } catch (err) {
    console.error('[Admin Assign Course Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to assign course' });
  }
});

// ─── POST /api/admin/users/:userId/reset ───────────────────────────────────────
router.post('/users/:userId/reset', async (req, res) => {
  const { userId } = req.params;
  const orgId = req.user?.orgId || '00000000-0000-0000-0000-000000000001';

  try {
    // 1. Check user exists
    const userRes = await query(
      'SELECT id, name, risk_score FROM users WHERE id = $1 AND org_id = $2',
      [userId, orgId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found' });
    }
    const user = userRes.rows[0];

    // 2. Reset employee behavioral statistics
    await query(
      `UPDATE users
       SET risk_score = 40,
           risk_level = 'Low Risk',
           phishing_attempts = 0,
           phishing_clicked = 0,
           phishing_reported = 0,
           credential_submission_attempts = 0,
           training_completed = 0,
           training_progress = 0,
           training_xp = 0,
           lessons_completed = '[]',
           failed_quizzes = 0,
           successful_quizzes = 0,
           security_streak = 0,
           total_simulations = 0,
           last_activity = NOW()
       WHERE id = $1`,
      [userId]
    );

    // 3. Clear progress but keep courses/badges records clean
    await query('DELETE FROM employee_training_progress WHERE user_id = $1', [userId]);
    await query('DELETE FROM employee_badges WHERE user_id = $1', [userId]);
    await query('DELETE FROM phishing_simulations WHERE user_id = $1', [userId]);

    // 4. Log the audit actions in risk events and security activity
    await query(
      `INSERT INTO security_activity (user_id, activity_type, description)
       VALUES ($1, $2, $3)`,
      [userId, 'INCIDENT_REPORTED', 'Employee security score and behavior stats reset by Admin.']
    );

    const change = 40 - user.risk_score;
    await query(
      `INSERT INTO risk_events (user_id, org_id, score_change, score_after, severity, trigger, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, orgId, change, 40, 'low', 'admin_action', 'Administrative risk profile reset to baseline']
    );

    await query(
      'INSERT INTO risk_scores (user_id, score) VALUES ($1, $2)',
      [userId, 40]
    );

    return res.json({
      success: true,
      message: `Employee risk profile and metrics for ${user.name} have been reset to baseline.`
    });

  } catch (err) {
    console.error('[Admin Reset User Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to reset employee risk profile' });
  }
});

module.exports = router;
