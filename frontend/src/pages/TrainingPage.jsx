import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { BookOpen, Clock, Zap, CheckCircle, Lock, ChevronRight } from 'lucide-react';

const categoryColor = {
  phishing: '#ef4444',
  social_engineering: '#f59e0b',
  passwords: '#7c3aed',
  browsing: '#00d4ff',
  bec: '#10b981',
};

const categoryLabel = {
  phishing: '🎣 Phishing',
  social_engineering: '🎭 Social Engineering',
  passwords: '🔑 Passwords',
  browsing: '🌐 Safe Browsing',
  bec: '💼 BEC Fraud',
};

const difficultyColors = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

export default function TrainingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    if (!user) return navigate('/');
    Promise.all([
      api.get('/training/lessons'),
      api.get(`/behavior/${user.id}`),
    ]).then(([lessonsRes, behaviorRes]) => {
      setLessons(lessonsRes.data);
      setCompleted(behaviorRes.data.lessonsCompleted || []);
      const xp = lessonsRes.data
        .filter(l => behaviorRes.data.lessonsCompleted.includes(l.id))
        .reduce((sum, l) => sum + l.xp, 0);
      setTotalXP(xp);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const progress = lessons.length > 0 ? Math.round((completed.length / lessons.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={18} color="#a78bfa" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e2f0fb' }}>Security Training</h1>
            </div>
            <p style={{ color: '#7ab3d4', fontSize: '14px', marginLeft: '48px' }}>
              Complete lessons to improve your security posture and earn XP.
            </p>
          </div>

          {/* XP badge */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              padding: '12px 20px', borderRadius: '12px',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace' }}>
                ⚡ {totalXP}
              </div>
              <div style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '600', letterSpacing: '0.5px' }}>XP EARNED</div>
            </div>
            <div style={{
              padding: '12px 20px', borderRadius: '12px',
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>
                {completed.length}/{lessons.length}
              </div>
              <div style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '600', letterSpacing: '0.5px' }}>COMPLETED</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#7ab3d4' }}>
            <span>Overall Progress</span>
            <span style={{ fontWeight: '700', color: progress === 100 ? '#10b981' : '#00d4ff' }}>{progress}%</span>
          </div>
          <div className="progress-bar" style={{ height: '8px' }}>
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#00d4ff', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading lessons...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {lessons.map((lesson, i) => {
            const isDone = completed.includes(lesson.id);
            const catColor = categoryColor[lesson.category] || '#00d4ff';

            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  to={`/training/${lesson.id}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    background: isDone ? 'rgba(16,185,129,0.04)' : 'rgba(5,20,40,0.7)',
                    border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : 'rgba(0,212,255,0.1)'}`,
                    borderRadius: '16px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.borderColor = isDone ? 'rgba(16,185,129,0.4)' : 'rgba(0,212,255,0.3)';
                      e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${isDone ? 'rgba(16,185,129,0.1)' : 'rgba(0,212,255,0.1)'}`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = isDone ? 'rgba(16,185,129,0.2)' : 'rgba(0,212,255,0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Completed checkmark */}
                    {isDone && (
                      <div style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '50%',
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircle size={14} color="#10b981" />
                      </div>
                    )}

                    {/* Icon */}
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>{lesson.icon}</div>

                    {/* Category tag */}
                    <div style={{ marginBottom: '10px' }}>
                      <span className="badge" style={{
                        color: catColor,
                        background: `${catColor}12`,
                        borderColor: `${catColor}30`,
                        fontSize: '10px',
                      }}>
                        {categoryLabel[lesson.category] || lesson.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2f0fb', marginBottom: '8px' }}>
                      {lesson.title}
                    </h3>

                    {/* Description */}
                    <p style={{ fontSize: '13px', color: '#7ab3d4', lineHeight: '1.6', marginBottom: '16px' }}>
                      {lesson.description}
                    </p>

                    {/* Meta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#7ab3d4' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {lesson.duration}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <BookOpen size={11} /> {lesson.slideCount} slides
                        </span>
                      </div>
                      <span className="badge" style={{
                        color: difficultyColors[lesson.difficulty],
                        background: `${difficultyColors[lesson.difficulty]}12`,
                        borderColor: `${difficultyColors[lesson.difficulty]}30`,
                        fontSize: '10px',
                      }}>
                        {lesson.difficulty}
                      </span>
                    </div>

                    {/* XP + CTA */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isDone ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={13} /> {isDone ? 'Earned' : 'Earn'} +{lesson.xp} XP
                      </span>
                      <span style={{ fontSize: '12px', color: isDone ? '#10b981' : '#00d4ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isDone ? '✓ Review' : 'Start'} <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
