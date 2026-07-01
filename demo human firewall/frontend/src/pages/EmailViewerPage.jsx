import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import FeedbackModal from '../components/FeedbackModal';
import { ArrowLeft, Flag, MousePointerClick, Eye, Clock, Loader2, Lock } from 'lucide-react';

export default function EmailViewerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [alreadyActed, setAlreadyActed] = useState(false);

  useEffect(() => {
    if (!user) return navigate('/');
    Promise.all([
      api.get(`/phishing/emails/${id}`),
      api.get(`/behavior/${user.id}`),
    ]).then(([emailRes, behaviorRes]) => {
      setEmail(emailRes.data);
      const acted = behaviorRes.data.actions.find(a => a.emailId === id);
      if (acted) setAlreadyActed(true);
    }).catch(() => navigate('/phishing'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleAction = async (action) => {
    if (alreadyActed || actionLoading) return;
    setActionLoading(action);
    try {
      const res = await api.post('/phishing/action', {
        userId: user.id, emailId: id, action,
      });
      setFeedback(res.data.feedback);
      setAlreadyActed(true);
      // Store updated score in localStorage for sidebar refresh
      if (res.data.newRiskScore !== undefined) {
        const stored = JSON.parse(localStorage.getItem('hf_user') || '{}');
        localStorage.setItem('hf_user', JSON.stringify({ ...stored, riskScore: res.data.newRiskScore }));
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setAlreadyActed(true);
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleCloseFeedback = () => {
    setFeedback(null);
    navigate('/phishing');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', color: '#00d4ff' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading email...
    </div>
  );

  if (!email) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back */}
        <button
          onClick={() => navigate('/phishing')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#7ab3d4', fontSize: '13px', marginBottom: '24px', padding: '0',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
          onMouseLeave={e => e.currentTarget.style.color = '#7ab3d4'}
        >
          <ArrowLeft size={15} /> Back to Inbox
        </button>

        <div style={{ maxWidth: '760px' }}>
          {/* Simulation badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '20px',
            fontSize: '11px', fontWeight: '700', color: '#f59e0b',
            letterSpacing: '1px', marginBottom: '20px',
          }}>
            ⚠️ SIMULATION EMAIL — FOR TRAINING ONLY
          </div>

          {/* Email card */}
          <div style={{
            background: 'rgba(5,20,40,0.8)',
            border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '20px',
          }}>
            {/* Email header bar */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderBottom: '1px solid rgba(0,212,255,0.08)',
              padding: '16px 24px',
              display: 'flex', gap: '6px', alignItems: 'center',
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
              <div style={{ marginLeft: '12px', fontSize: '12px', color: '#7ab3d4', fontFamily: 'JetBrains Mono, monospace' }}>
                📧 Inbox — Company Mail Client
              </div>
            </div>

            {/* Email metadata */}
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2f0fb', marginBottom: '16px', lineHeight: '1.4' }}>
                {email.subject}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <MetaRow label="From" value={`${email.fromName} <${email.from}>`} highlight />
                <MetaRow label="To" value={email.to} />
                <MetaRow label="Date" value={new Date(email.timestamp).toLocaleString()} />
              </div>
            </div>

            {/* Email body */}
            <div style={{ padding: '24px' }}>
              <div style={{
                fontSize: '14px',
                color: '#c8dff0',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Inter, sans-serif',
              }}>
                {email.body}
              </div>

              {/* Fake link button (for simulation) */}
              {email.body.includes('→') && (
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px dashed rgba(0,212,255,0.15)',
                  borderRadius: '10px',
                  fontSize: '13px', color: '#7ab3d4',
                }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600', color: '#e2f0fb' }}>
                    🔗 This email contains a link. What do you do?
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAction('clicked')}
                      disabled={alreadyActed || !!actionLoading}
                      style={{
                        padding: '6px 14px',
                        background: 'rgba(0,212,255,0.08)',
                        border: '1px solid rgba(0,212,255,0.2)',
                        borderRadius: '6px',
                        color: '#00d4ff', fontSize: '12px', cursor: 'pointer',
                        opacity: alreadyActed ? 0.4 : 1,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      http://suspicious-link.example...
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {alreadyActed ? (
            <div style={{
              padding: '16px 20px',
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: '12px',
              fontSize: '13px', color: '#7ab3d4', textAlign: 'center',
            }}>
              ✓ You have already responded to this email.
              <button onClick={() => navigate('/phishing')} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px' }}>
                ← Back to inbox
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '12px', color: '#7ab3d4', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>
                YOUR RESPONSE — Choose how you would handle this email:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <ActionBtn
                  icon={MousePointerClick}
                  label="Click Link"
                  desc="Follow the link in this email"
                  color="#ef4444"
                  loading={actionLoading === 'clicked'}
                  disabled={!!actionLoading}
                  onClick={() => handleAction('clicked')}
                />
                <ActionBtn
                  icon={Flag}
                  label="Report Phishing"
                  desc="Flag this to IT security"
                  color="#10b981"
                  loading={actionLoading === 'reported'}
                  disabled={!!actionLoading}
                  onClick={() => handleAction('reported')}
                />
                <ActionBtn
                  icon={Eye}
                  label="Ignore"
                  desc="Delete without reporting"
                  color="#f59e0b"
                  loading={actionLoading === 'ignored'}
                  disabled={!!actionLoading}
                  onClick={() => handleAction('ignored')}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
    </>
  );
}

function MetaRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <span style={{ color: '#7ab3d4', minWidth: '40px', fontSize: '12px' }}>{label}:</span>
      <span style={{
        color: highlight ? '#f59e0b' : '#c8dff0',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px', wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, desc, color, loading: isLoading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '16px',
        background: `${color}08`,
        border: `1px solid ${color}25`,
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.25s',
        opacity: disabled && !isLoading ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.borderColor = `${color}50`; }}}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}25`; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        {isLoading
          ? <Loader2 size={15} color={color} style={{ animation: 'spin 0.8s linear infinite' }} />
          : <Icon size={15} color={color} />
        }
        <span style={{ fontSize: '13px', fontWeight: '700', color }}>{label}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#7ab3d4' }}>{desc}</div>
    </button>
  );
}
