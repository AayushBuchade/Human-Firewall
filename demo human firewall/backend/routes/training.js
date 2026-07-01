/**
 * routes/training.js — Training Lesson Routes
 *
 * GET  /api/training/lessons       — list all lessons
 * GET  /api/training/lessons/:id   — get full lesson with slides
 * POST /api/training/complete      — mark a lesson as completed
 *
 * Works for BOTH mock users (user-001) AND real DB users (UUIDs).
 */

const express = require('express');
const router = express.Router();
const { trainingLessons, behaviorRecords } = require('../data/mockData');
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

// GET /api/training/lessons — get all lessons
router.get('/lessons', (req, res) => {
  res.json(trainingLessons.map(l => ({
    id: l.id,
    title: l.title,
    category: l.category,
    difficulty: l.difficulty,
    duration: l.duration,
    xp: l.xp,
    icon: l.icon,
    description: l.description,
    slideCount: l.slides.length,
  })));
});

// GET /api/training/lessons/:id — get full lesson with slides
router.get('/lessons/:id', (req, res) => {
  const lesson = trainingLessons.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
  res.json(lesson);
});

// POST /api/training/complete — mark a lesson as completed
router.post('/complete', (req, res) => {
  const { userId, lessonId } = req.body;

  if (!userId || !lessonId) {
    return res.status(400).json({ message: 'userId and lessonId are required' });
  }

  const lesson = trainingLessons.find(l => l.id === lessonId);
  if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

  // Auto-create record for new users (DB-backed UUIDs or mock)
  const record = ensureBehaviorRecord(userId);

  if (record.lessonsCompleted.includes(lessonId)) {
    return res.json({ message: 'Lesson already completed', alreadyCompleted: true, xp: 0 });
  }

  record.lessonsCompleted.push(lessonId);
  record.trainingProgress = Math.round((record.lessonsCompleted.length / trainingLessons.length) * 100);

  // Recalculate risk score
  record.riskScore = calculateRiskScore(record.actions, record.lessonsCompleted);
  record.classification = classifyUser(record.riskScore);

  res.json({
    success: true,
    xpEarned: lesson.xp,
    lessonsCompleted: record.lessonsCompleted,
    trainingProgress: record.trainingProgress,
    newRiskScore: record.riskScore,
  });
});

module.exports = router;
