/**
 * routes/training.js — Upgraded Training Lesson Routes (PostgreSQL-backed)
 *
 * GET  /api/training/lessons     — list all lessons/courses
 * GET  /api/training/lessons/:id — get full lesson detail with slides
 * POST /api/training/complete    — mark a lesson as completed, award XP, update risk score
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Helper: map risk score to classification
function getRiskLevel(score) {
  if (score <= 20) return 'Very Secure';
  if (score <= 40) return 'Low Risk';
  if (score <= 60) return 'Moderate Risk';
  if (score <= 80) return 'High Risk';
  return 'Critical';
}

// GET /api/training/lessons — get all lessons
router.get('/lessons', async (req, res) => {
  try {
    const result = await query(
      `SELECT l.id, c.title, c.category, c.difficulty, c.duration, c.xp, c.icon, c.description,
              jsonb_array_length(l.slides) AS "slideCount"
       FROM training_lessons l
       JOIN training_modules m ON l.module_id = m.id
       JOIN training_courses c ON m.course_id = c.id
       ORDER BY c.title ASC`
    );
    
    return res.json(result.rows.map(l => ({
      id: l.id,
      title: l.title,
      category: l.category,
      difficulty: l.difficulty,
      duration: l.duration,
      xp: l.xp,
      icon: l.icon,
      description: l.description,
      slideCount: parseInt(l.slideCount || 0, 10)
    })));

  } catch (err) {
    console.error('[Training Lessons List Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve training courses' });
  }
});

// GET /api/training/lessons/:id — get single lesson detail with slides
router.get('/lessons/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT l.id, c.title, c.category, c.difficulty, c.duration, c.xp, c.icon, c.description, l.slides, l.tip
       FROM training_lessons l
       JOIN training_modules m ON l.module_id = m.id
       JOIN training_courses c ON m.course_id = c.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Training course not found' });
    }

    const l = result.rows[0];
    return res.json({
      id: l.id,
      title: l.title,
      category: l.category,
      difficulty: l.difficulty,
      duration: l.duration,
      xp: l.xp,
      icon: l.icon,
      description: l.description,
      slides: l.slides,
      tip: l.tip
    });

  } catch (err) {
    console.error('[Training Lesson Detail Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve course details' });
  }
});

// POST /api/training/complete — mark lesson as completed
router.post('/complete', async (req, res) => {
  const { userId, lessonId } = req.body;

  if (!userId || !lessonId) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'userId and lessonId are required' });
  }

  try {
    // 1. Get user details
    const userRes = await query(
      `SELECT id, name, lessons_completed, training_xp, risk_score, org_id,
              phishing_attempts, phishing_clicked, phishing_reported, credential_submission_attempts, successful_quizzes
       FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }
    const user = userRes.rows[0];
    const completedList = Array.isArray(user.lessons_completed) ? user.lessons_completed : [];

    // 2. Get lesson & course details
    const lessonRes = await query(
      `SELECT l.id, c.title, c.xp, c.id AS course_id
       FROM training_lessons l
       JOIN training_modules m ON l.module_id = m.id
       JOIN training_courses c ON m.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Training lesson not found' });
    }
    const lesson = lessonRes.rows[0];

    // 3. Check if already completed
    if (completedList.includes(lessonId)) {
      // Calculate overall progress from total lessons count
      const totalRes = await query('SELECT COUNT(*) AS total FROM training_lessons');
      const totalLessons = parseInt(totalRes.rows[0].total || 1, 10);
      const progressPercent = Math.round((completedList.length / totalLessons) * 100);

      return res.json({
        message: 'Lesson already completed',
        alreadyCompleted: true,
        xpEarned: 0,
        lessonsCompleted: completedList,
        trainingProgress: progressPercent,
        newRiskScore: user.risk_score
      });
    }

    // 4. Update lessons completed array & XP in user object
    completedList.push(lessonId);
    const newXp = user.training_xp + lesson.xp;
    const newTrainingCompletedCount = completedList.length;

    // Get total count of lessons
    const totalRes = await query('SELECT COUNT(*) AS total FROM training_lessons');
    const totalLessons = parseInt(totalRes.rows[0].total || 1, 10);
    const progressPercent = Math.round((newTrainingCompletedCount / totalLessons) * 100);

    // Calculate deterministic risk score
    // - training completed = -10 risk points, - successful quiz = -5 risk points
    const u = user;
    const rawScore = 40 + (u.phishing_clicked * 30) + ((u.phishing_attempts - u.phishing_clicked - u.phishing_reported) * 10)
                     - (u.phishing_reported * 15) - (newTrainingCompletedCount * 10) - (u.successful_quizzes * 5)
                     + (u.credential_submission_attempts * 40);
    const newScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const newLevel = getRiskLevel(newScore);

    // Update user row
    await query(
      `UPDATE users
       SET lessons_completed = $1,
           training_completed = $2,
           training_progress = $3,
           training_xp = $4,
           risk_score = $5,
           risk_level = $6,
           last_activity = NOW()
       WHERE id = $7`,
      [JSON.stringify(completedList), newTrainingCompletedCount, progressPercent, newXp, newScore, newLevel, userId]
    );

    // Insert course progress status
    await query(
      `INSERT INTO employee_training_progress (user_id, course_id, status, progress_percentage, completed_lessons)
       VALUES ($1, $2, 'completed', 100, $3)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET status = 'completed', progress_percentage = 100, completed_lessons = $3, updated_at = NOW()`,
      [userId, lesson.course_id, JSON.stringify([lessonId])]
    );

    // Log Activity
    await query(
      `INSERT INTO security_activity (user_id, activity_type, description)
       VALUES ($1, $2, $3)`,
      [userId, 'COMPLETED_LESSON', `Successfully completed course "${lesson.title}" and earned +${lesson.xp} XP.`]
    );

    // Log Risk Score Snapshot & Risk Event if score changed
    await query(
      'INSERT INTO risk_scores (user_id, score) VALUES ($1, $2)',
      [userId, newScore]
    );

    if (newScore !== user.risk_score) {
      await query(
        `INSERT INTO risk_events (user_id, org_id, score_change, score_after, severity, trigger, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, user.org_id, newScore - user.risk_score, newScore, 'low', 'training_completion', `Completed course: ${lesson.title}`]
      );
    }

    // Gamification: Award "Security Champion" if XP >= 1000
    if (newXp >= 1000) {
      const championBadgeRes = await query('SELECT id FROM badges WHERE name = \'Security Champion\'');
      if (championBadgeRes.rows.length > 0) {
        const badgeId = championBadgeRes.rows[0].id;
        // Check if already awarded
        const badgeCheck = await query('SELECT id FROM employee_badges WHERE user_id = $1 AND badge_id = $2', [userId, badgeId]);
        if (badgeCheck.rows.length === 0) {
          await query('INSERT INTO employee_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badgeId]);
          await query(
            `INSERT INTO security_activity (user_id, activity_type, description)
             VALUES ($1, $2, $3)`,
            [userId, 'COMPLETED_LESSON', 'Awarded the "Security Champion" Badge for exceeding 1,000 XP!']
          );
        }
      }
    }

    return res.json({
      success: true,
      xpEarned: lesson.xp,
      lessonsCompleted: completedList,
      trainingProgress: progressPercent,
      newRiskScore: newScore
    });

  } catch (err) {
    console.error('[Complete Lesson Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to complete lesson' });
  }
});

// GET /api/training/lessons/:id/quiz — get quiz questions for a lesson
router.get('/lessons/:id/quiz', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT id, question_text, options, type
       FROM training_questions
       WHERE lesson_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    return res.json(result.rows.map(q => ({
      id: q.id,
      questionText: q.question_text,
      options: q.options,
      type: q.type || 'multiple_choice',
    })));
  } catch (err) {
    console.error('[Training Quiz Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to load quiz questions' });
  }
});

// POST /api/training/quiz — submit quiz answers
router.post('/quiz', async (req, res) => {
  const { userId, lessonId, answers } = req.body;

  if (!userId || !lessonId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'userId, lessonId, and answers array are required' });
  }

  try {
    const questionsRes = await query(
      `SELECT id, question_text, options, correct_option_index, explanation
       FROM training_questions WHERE lesson_id = $1 ORDER BY created_at ASC`,
      [lessonId]
    );
    if (questionsRes.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'No quiz found for this lesson' });
    }

    const questions = questionsRes.rows;
    const results = questions.map((q, idx) => {
      const selected = answers[idx]?.selectedIndex ?? answers.find(a => a.questionId === q.id)?.selectedIndex;
      const correct = selected === q.correct_option_index;
      return {
        questionId: q.id,
        questionText: q.question_text,
        selectedIndex: selected,
        correctIndex: q.correct_option_index,
        correct,
        explanation: q.explanation,
      };
    });

    const score = Math.round((results.filter(r => r.correct).length / results.length) * 100);
    const passed = score >= 70;

    for (const r of results) {
      await query(
        `INSERT INTO training_attempts (user_id, lesson_id, question_id, is_correct, answer_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, lessonId, r.questionId, r.correct, r.selectedIndex ?? -1]
      );
    }

    const userRes = await query('SELECT failed_quizzes, successful_quizzes, risk_score, org_id FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (passed) {
      await query(
        `UPDATE users SET successful_quizzes = successful_quizzes + 1, last_activity = NOW() WHERE id = $1`,
        [userId]
      );
    } else {
      await query(
        `UPDATE users SET failed_quizzes = failed_quizzes + 1, last_activity = NOW() WHERE id = $1`,
        [userId]
      );
    }

    // Recalculate risk after quiz
    const statsRes = await query(
      `SELECT phishing_attempts, phishing_clicked, phishing_reported, credential_submission_attempts,
              training_completed, successful_quizzes, failed_quizzes
       FROM users WHERE id = $1`,
      [userId]
    );
    const s = statsRes.rows[0];
    const rawScore = 40 + (s.phishing_clicked * 30) + ((s.phishing_attempts - s.phishing_clicked - s.phishing_reported) * 10)
                     - (s.phishing_reported * 15) - (s.training_completed * 10) - (s.successful_quizzes * 5)
                     + (s.credential_submission_attempts * 40);
    const newScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const newLevel = getRiskLevel(newScore);
    await query('UPDATE users SET risk_score = $1, risk_level = $2 WHERE id = $3', [newScore, newLevel, userId]);

    if (newScore !== user.risk_score) {
      await query(
        `INSERT INTO risk_events (user_id, org_id, score_change, score_after, severity, trigger, reason)
         VALUES ($1, (SELECT org_id FROM users WHERE id = $1), $2, $3, $4, $5, $6)`,
        [userId, newScore - user.risk_score, newScore, passed ? 'low' : 'medium', 'training_quiz',
         passed ? `Passed quiz with ${score}%` : `Failed quiz with ${score}%`]
      );
    }

    return res.json({ score, passed, results, newRiskScore: newScore, newLevel });
  } catch (err) {
    console.error('[Submit Quiz Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to submit quiz' });
  }
});

module.exports = router;
