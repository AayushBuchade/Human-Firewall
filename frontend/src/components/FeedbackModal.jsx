import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Shield, Info, CheckCircle } from 'lucide-react';

const typeConfig = {
  danger: { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  success: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  info: { icon: Info, color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.25)' },
};

export default function FeedbackModal({ feedback, onClose }) {
  if (!feedback) return null;

  const cfg = typeConfig[feedback.type] || typeConfig.info;
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2,11,24,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(5,20,40,0.96)',
            border: `1px solid ${cfg.border}`,
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${cfg.color}20`,
            position: 'relative',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              width: '28px', height: '28px',
              cursor: 'pointer', color: '#7ab3d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>

          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
            <div style={{
              width: '48px', height: '48px', flexShrink: 0,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} color={cfg.color} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: cfg.color, marginBottom: '6px' }}>
                {feedback.title}
              </h2>
              <p style={{ fontSize: '14px', color: '#7ab3d4', lineHeight: '1.6' }}>
                {feedback.message}
              </p>
            </div>
          </div>

          {/* Risk delta */}
          {feedback.riskDelta !== 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px',
              background: feedback.riskDelta > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${feedback.riskDelta > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              color: feedback.riskDelta > 0 ? '#ef4444' : '#10b981',
              marginBottom: '20px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              Risk Score: {feedback.riskDelta > 0 ? '+' : ''}{feedback.riskDelta} points
            </div>
          )}

          {/* Red flags */}
          {feedback.redFlags && feedback.redFlags.length > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', letterSpacing: '1px', marginBottom: '10px' }}>
                🚩 RED FLAGS YOU SHOULD HAVE SPOTTED
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {feedback.redFlags.map((flag, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#e2f0fb' }}>
                    <span style={{ color: '#ef4444', flexShrink: 0 }}>✗</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: '100%', textAlign: 'center', padding: '12px' }}
          >
            Got it — Continue Training
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
