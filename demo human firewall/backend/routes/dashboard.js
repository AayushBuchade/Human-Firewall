/**
 * routes/dashboard.js — Employee Dashboard
 *
 * GET /api/saas-dashboard/:userId — full dashboard data for an employee
 *
 * Works for BOTH mock users (user-001 etc.) AND real DB users (UUIDs).
 * For DB users without mock behavior records, returns fresh/default data.
 */

const express = require('express');
const router = express.Router();
const { behaviorRecords, phishingEmails, trainingLessons, users } = require('../data/mockData');
const { calculateRiskScore, classifyUser, getClassificationDetails, getMetrics } = require('../utils/behaviorAnalysis');
const { findUserById } = require('../models/userModel');

// GET /api/saas-dashboard/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  // Try mock data first (for seeded demo users)
  let record = behaviorRecords[userId];
  let user = users.find(u => u.id === userId);

  // If not in mock data, try DB (for real signed-up users)
  if (!record || !user) {
    try {
      const dbUser = await findUserById(userId);
      if (!dbUser) {
        return res.status(404).json({ message: 'Dashboard data not found' });
      }

      // Create a behavior record in-memory for this DB user if not exists
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
      record = behaviorRecords[userId];

      // Build user info from DB
      user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        department: dbUser.department,
        avatar: (dbUser.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      };
    } catch (err) {
      console.error('[Dashboard] DB lookup error:', err.message);
      return res.status(500).json({ message: 'Failed to load dashboard' });
    }
  }

  const riskScore = calculateRiskScore(record.actions, record.lessonsCompleted);
  const classification = classifyUser(riskScore);
  const details = getClassificationDetails(classification);
  const metrics = getMetrics(record.actions, phishingEmails);

  // Build risk trend (mock weekly data)
  const today = new Date();
  const riskTrend = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (6 - i));
    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
    // Simulate decreasing risk as training progresses
    const simulatedScore = Math.max(10, riskScore + (6 - i) * 4 - Math.random() * 8);
    return { day: dayName, risk: Math.round(simulatedScore) };
  });

  // Recent activity
  const recentActivity = record.actions
    .slice(-5)
    .reverse()
    .map(action => {
      const email = phishingEmails.find(e => e.id === action.emailId);
      return {
        emailSubject: email ? email.subject : 'Unknown Email',
        action: action.action,
        timestamp: action.timestamp,
      };
    });

  // Recommended next lesson
  const nextLesson = trainingLessons.find(l => !record.lessonsCompleted.includes(l.id));

  res.json({
    user: user ? { name: user.name, department: user.department, avatar: user.avatar } : null,
    riskScore,
    classification,
    classificationDetails: details,
    metrics,
    riskTrend,
    recentActivity,
    trainingProgress: record.trainingProgress,
    lessonsCompleted: record.lessonsCompleted.length,
    totalLessons: trainingLessons.length,
    totalXP: record.lessonsCompleted.reduce((sum, id) => {
      const lesson = trainingLessons.find(l => l.id === id);
      return sum + (lesson ? lesson.xp : 0);
    }, 0),
    nextLesson: nextLesson ? {
      id: nextLesson.id,
      title: nextLesson.title,
      icon: nextLesson.icon,
      duration: nextLesson.duration,
      xp: nextLesson.xp,
    } : null,
  });
});

module.exports = router;
