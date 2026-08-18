import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Mail, AlertTriangle, Search, Shield, ShieldAlert } from 'lucide-react';

const difficultyColor = {
  Beginner: '#10b981', Intermediate: '#f59e0b', Advanced: '#ef4444', Expert: '#dc2626',
  beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444', expert: '#dc2626',
  easy: '#10b981', medium: '#f59e0b', hard: '#ef4444',
};

function EmailRow({ email, index, actedOn, onClick }) {
  const isActed = actedOn.includes(email.id) || email.status !== 'sent';
  const diffColor = difficultyColor[email.difficulty] || '#7ab3d4';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onClick(email.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 20px',
        background: isActed ? 'rgba(0,0,0,0.2)' : 'rgba(5,20,40,0.7)',
        border: `1px solid ${isActed ? 'rgba(255,255,255,0.04)' : email.isSafe ? 'rgba(16,185,129,0.15)' : 'rgba(0,212,255,0.12)'}`,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isActed ? 0.65 : 1,
      }}
      whileHover={{ borderColor: email.isSafe ? 'rgba(16,185,129,0.35)' : 'rgba(0,212,255,0.3)', x: 2 }}
    >
      <div style={{
        width: '40px', height: '40px', flexShrink: 0,
        background: email.isSafe ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.2))',
        border: `1px solid ${email.isSafe ? 'rgba(16,185,129,0.25)' : 'rgba(0,212,255,0.25)'}`,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px',
      }}>
        {email.fromName?.[0]?.toUpperCase() || '?'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{
            fontSize: '13px', fontWeight: isActed ? '400' : '600',
            color: isActed ? '#7ab3d4' : '#e2f0fb',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px',
          }}>
            {email.fromName} <span style={{ color: '#7ab3d4', fontWeight: '400' }}>&lt;{email.from}&gt;</span>
          </div>
          <div style={{ fontSize: '11px', color: '#7ab3d4', flexShrink: 0 }}>
            {new Date(email.timestamp).toLocaleDateString()}
          </div>
        </div>
        <div style={{
          fontSize: '13px', fontWeight: isActed ? '400' : '500',
          color: isActed ? '#7ab3d4' : '#e2f0fb',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px',
        }}>
          {email.subject}
        </div>
        <div style={{ fontSize: '12px', color: '#7ab3d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email.preview}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {email.isSafe ? (
          <span className="badge" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', fontSize: '10px' }}>
            <Shield size={10} style={{ display: 'inline', marginRight: 3 }} />Safe
          </span>
        ) : (
          <span className="badge" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', fontSize: '10px' }}>
            <ShieldAlert size={10} style={{ display: 'inline', marginRight: 3 }} />Sim
          </span>
        )}
        <span className="badge" style={{ color: diffColor, background: `${diffColor}12`, borderColor: `${diffColor}30`, fontSize: '10px' }}>
          {email.difficulty}
        </span>
        {isActed && (
          <span className="badge" style={{ color: '#7ab3d4', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '10px' }}>
            Done
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function PhishingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [actedOn, setActedOn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return navigate('/');
    Promise.all([
      api.get('/phishing/emails', { params: { userId: user.id } }),
      api.get(`/behavior/${user.id}`),
    ]).then(([emailsRes, behaviorRes]) => {
      setEmails(emailsRes.data);
      const acted = behaviorRes.data.actions.map(a => a.emailId);
      setActedOn(acted);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const filtered = emails.filter(e => {
    const matchSearch = e.subject.toLowerCase().includes(search.toLowerCase()) ||
      e.fromName.toLowerCase().includes(search.toLowerCase()) ||
      e.from.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'phishing') return !e.isSafe;
    if (filter === 'safe') return e.isSafe;
    if (filter === 'pending') return e.status === 'sent' && !actedOn.includes(e.id);
    return true;
  });

  const pending = filtered.filter(e => e.status === 'sent' && !actedOn.includes(e.id));
  const done = filtered.filter(e => e.status !== 'sent' || actedOn.includes(e.id));

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={18} color="#00d4ff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e2f0fb' }}>Phishing Simulation Inbox</h1>
            <p style={{ color: '#7ab3d4', fontSize: '13px', marginTop: '2px' }}>
              {emails.length} messages · Mix of simulated threats and legitimate emails
            </p>
          </div>
        </div>
        <p style={{ color: '#7ab3d4', fontSize: '14px', marginLeft: '48px' }}>
          Analyze each email: <strong style={{ color: '#e2f0fb' }}>Report phishing, Mark as safe, Click a link, or Ignore.</strong> Your responses update your risk score.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{
          padding: '12px 16px', background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px',
          fontSize: '13px', color: '#f59e0b',
        }}>
        <AlertTriangle size={16} />
        <span><strong>Simulation Mode:</strong> All emails are synthetic training content. No real credentials are collected.</span>
      </motion.div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'phishing', 'safe'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid',
            borderColor: filter === f ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.12)',
            background: filter === f ? 'rgba(0,212,255,0.12)' : 'rgba(0,0,0,0.2)',
            color: filter === f ? '#00d4ff' : '#7ab3d4', cursor: 'pointer', fontSize: '12px',
            textTransform: 'capitalize', fontFamily: 'Inter, sans-serif',
          }}>
            {f === 'all' ? 'All Emails' : f}
          </button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={15} color="#7ab3d4" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input className="input-field" placeholder="Search by sender, subject..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '38px' }} />
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#00d4ff', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading your inbox...
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', color: '#7ab3d4', letterSpacing: '1.5px', fontWeight: '600', marginBottom: '12px' }}>
                UNREVIEWED — {pending.length} EMAILS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pending.map((email, i) => (
                  <EmailRow key={email.id} email={email} index={i} actedOn={actedOn} onClick={id => navigate(`/phishing/${id}`)} />
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#7ab3d4', letterSpacing: '1.5px', fontWeight: '600', marginBottom: '12px' }}>
                REVIEWED — {done.length} EMAILS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {done.map((email, i) => (
                  <EmailRow key={email.id} email={email} index={i} actedOn={actedOn} onClick={id => navigate(`/phishing/${id}`)} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#7ab3d4' }}>
              <Mail size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              No emails match your filters.
            </div>
          )}
        </>
      )}
    </div>
  );
}
