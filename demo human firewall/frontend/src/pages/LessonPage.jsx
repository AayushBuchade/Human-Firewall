import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { ArrowLeft, ArrowRight, CheckCircle, Zap, Lightbulb } from 'lucide-react';

export default function LessonPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!user) return navigate('/');
    api.get(`/training/lessons/${id}`)
      .then(res => setLesson(res.data))
      .catch(() => navigate('/training'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleNext = async () => {
    if (currentSlide < lesson.slides.length - 1) {
      setCurrentSlide(s => s + 1);
    } else {
      // Complete lesson
      setFinishing(true);
      try {
        const res = await api.post('/training/complete', { userId: user.id, lessonId: id });
        setXpEarned(res.data.xpEarned || lesson.xp);
        setCompleted(true);
      } catch {
        setCompleted(true);
      } finally {
        setFinishing(false);
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', color: '#00d4ff' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading lesson...
    </div>
  );

  if (!lesson) return null;

  // Completion screen
  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}
      >
        <div style={{
          textAlign: 'center', maxWidth: '440px',
          background: 'rgba(5,20,40,0.8)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '24px',
          padding: '48px 40px',
          boxShadow: '0 0 60px rgba(16,185,129,0.1)',
        }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            style={{ fontSize: '64px', marginBottom: '20px' }}
          >
            🏆
          </motion.div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#e2f0fb', marginBottom: '8px' }}>
            Lesson Complete!
          </h2>
          <p style={{ color: '#7ab3d4', fontSize: '14px', marginBottom: '24px' }}>
            You've finished <strong style={{ color: '#e2f0fb' }}>{lesson.title}</strong>
          </p>
          {xpEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px',
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '30px',
                fontSize: '20px', fontWeight: '800', color: '#a78bfa',
                marginBottom: '32px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <Zap size={18} /> +{xpEarned} XP Earned!
            </motion.div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              onClick={() => navigate('/training')}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              ← Back to Training Hub
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none', border: 'none', color: '#7ab3d4',
                cursor: 'pointer', fontSize: '13px', padding: '8px',
              }}
            >
              View my Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const slide = lesson.slides[currentSlide];
  const progress = ((currentSlide) / lesson.slides.length) * 100;
  const isLast = currentSlide === lesson.slides.length - 1;

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Back + meta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/training')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#7ab3d4', fontSize: '13px', padding: '0',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
          onMouseLeave={e => e.currentTarget.style.color = '#7ab3d4'}
        >
          <ArrowLeft size={15} /> Back to Training
        </button>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#7ab3d4', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a78bfa' }}>
            <Zap size={12} /> +{lesson.xp} XP
          </span>
          <span>{lesson.duration}</span>
        </div>
      </div>

      {/* Lesson title */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{lesson.icon}</div>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#e2f0fb', marginBottom: '4px' }}>{lesson.title}</h1>
        <div style={{ fontSize: '13px', color: '#7ab3d4' }}>
          Slide {currentSlide + 1} of {lesson.slides.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: '28px', height: '6px' }}>
        <motion.div
          className="progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <div style={{
            background: 'rgba(5,20,40,0.8)',
            border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: '20px',
            padding: '36px',
            marginBottom: '20px',
            minHeight: '280px',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#00d4ff', marginBottom: '20px', lineHeight: '1.3' }}>
              {slide.title}
            </h2>
            <p style={{
              fontSize: '15px', color: '#c8dff0', lineHeight: '1.8',
              whiteSpace: 'pre-line',
            }}>
              {slide.content}
            </p>
          </div>

          {/* Tip box */}
          {slide.tip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '16px 20px',
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <Lightbulb size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '13px', color: '#f59e0b', lineHeight: '1.6' }}>{slide.tip}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentSlide(s => s - 1)}
          disabled={currentSlide === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: '10px',
            color: currentSlide === 0 ? '#7ab3d4' : '#e2f0fb',
            cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
            opacity: currentSlide === 0 ? 0.4 : 1,
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          }}
        >
          <ArrowLeft size={14} /> Previous
        </button>

        {/* Slide dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {lesson.slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: i === currentSlide ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === currentSlide ? '#00d4ff' : 'rgba(0,212,255,0.2)',
                transition: 'all 0.3s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={finishing}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 24px',
            background: isLast
              ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(0,212,255,0.1))'
              : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))',
            border: `1px solid ${isLast ? 'rgba(16,185,129,0.4)' : 'rgba(0,212,255,0.35)'}`,
            borderRadius: '10px',
            color: isLast ? '#10b981' : '#00d4ff',
            cursor: finishing ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {finishing ? (
            <><div style={{ width: '14px', height: '14px', border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Completing...</>
          ) : isLast ? (
            <><CheckCircle size={15} /> Complete Lesson</>
          ) : (
            <>Next <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
}
