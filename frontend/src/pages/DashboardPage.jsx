import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import RiskMeter from '../components/RiskMeter';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { Activity, Mail, BookOpen, TrendingUp, TrendingDown, AlertTriangle, Star, ChevronRight, Zap } from 'lucide-react';

const cardAnim = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function StatCard({ icon: Icon, label, value, sublabel, color = '#00d4ff', delay = 0 }) {
  return (
    <motion.div variants={cardAnim} transition={{ delay }} className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#7ab3d4', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
          {sublabel && <div style={{ fontSize: '12px', color: '#7ab3d4', marginTop: '4px' }}>{sublabel}</div>}
        </div>
        <div style={{
          width: '40px', height: '40px',
          background: `${color}15`,
          border: `1px solid ${color}30`,
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(5,20,40,0.95)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
    }}>
      <div style={{ color: '#7ab3d4' }}>{label}</div>
      <div style={{ color: '#00d4ff', fontWeight: '700' }}>Risk: {payload[0].value}</div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return navigate('/');

    const fetchData = () => {
      api.get(`/dashboard/${user.id}`)
        .then(res => setData(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 3000); // Sync data in real-time

    return () => clearInterval(interval);
  }, [user, navigate]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#00d4ff' }}>
      <div style={{ width: '20px', height: '20px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading dashboard...
    </div>
  );

  if (!data) return <div style={{ color: '#ef4444', padding: '40px' }}>Failed to load dashboard. Is the backend running?</div>;

  const actionColor = a => a === 'clicked' ? '#ef4444' : a === 'reported' ? '#10b981' : '#f59e0b';

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* Header */}
      <motion.div variants={cardAnim} style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#e2f0fb', marginBottom: '4px' }}>
              Welcome back, <span className="gradient-text">{data.user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ color: '#7ab3d4', fontSize: '14px' }}>
              {data.user?.department} · Your security posture overview
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: '10px',
            fontSize: '13px', color: '#00d4ff', fontWeight: '600',
          }}>
            ⚡ {data.totalXP} XP Earned
          </div>
        </div>
      </motion.div>

      {/* Top row: Risk meter + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Risk meter */}
        <motion.div variants={cardAnim} className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '4px' }}>RISK SCORE</div>
          <RiskMeter score={data.riskScore} size={160} />
          <div style={{ fontSize: '12px', color: '#7ab3d4', textAlign: 'center', lineHeight: '1.5', marginTop: '8px' }}>
            {data.classificationDetails?.description}
          </div>
        </motion.div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <StatCard icon={Activity} label="CLICK RATE" value={`${data.metrics.clickRate}%`} sublabel="Phishing clicked" color="#ef4444" delay={0.05} />
          <StatCard icon={Mail} label="REPORT RATE" value={`${data.metrics.reportRate}%`} sublabel="Threats reported" color="#10b981" delay={0.1} />
          <StatCard icon={BookOpen} label="TRAINING" value={`${data.lessonsCompleted}/${data.totalLessons}`} sublabel={`${data.trainingProgress}% complete`} color="#7c3aed" delay={0.15} />
          <StatCard icon={Zap} label="SIMULATIONS" value={data.metrics.totalSimulations} sublabel="Emails analyzed" color="#00d4ff" delay={0.2} />
        </div>
      </div>

      {/* Risk trend chart + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '20px' }}>
        {/* Chart */}
        <motion.div variants={cardAnim} className="stat-card">
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2f0fb' }}>Risk Score Trend</div>
              <div style={{ fontSize: '12px', color: '#7ab3d4' }}>7-day simulation history</div>
            </div>
            <TrendingDown size={16} color="#10b981" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.riskTrend}>
              <XAxis dataKey="day" tick={{ fill: '#7ab3d4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#7ab3d4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="risk"
                stroke="#00d4ff" strokeWidth={2.5}
                dot={{ fill: '#00d4ff', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#00d4ff', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recommendations */}
        <motion.div variants={cardAnim} className="stat-card">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2f0fb', marginBottom: '2px' }}>Recommendations</div>
            <div style={{ fontSize: '12px', color: '#7ab3d4' }}>Personalized action items</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data.classificationDetails?.recommendations || []).map((rec, i) => (
              <div key={i} style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(0,212,255,0.06)',
              }}>
                <span style={{ color: '#00d4ff', flexShrink: 0, fontSize: '13px' }}>→</span>
                <span style={{ fontSize: '12px', color: '#e2f0fb', lineHeight: '1.5' }}>{rec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent activity + Next lesson */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Recent activity */}
        <motion.div variants={cardAnim} className="stat-card">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2f0fb' }}>Recent Activity</div>
            <Link to="/phishing" style={{ fontSize: '12px', color: '#00d4ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {data.recentActivity.length === 0 ? (
            <div style={{ color: '#7ab3d4', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              No activity yet. Go to the Phishing Inbox to start your training!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recentActivity.map((act, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ fontSize: '12px', color: '#e2f0fb', minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                      {act.emailSubject}
                    </div>
                    <div style={{ color: '#7ab3d4', fontSize: '11px' }}>
                      {new Date(act.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="badge" style={{
                    color: actionColor(act.action),
                    background: `${actionColor(act.action)}15`,
                    borderColor: `${actionColor(act.action)}30`,
                    flexShrink: 0,
                  }}>
                    {act.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Next lesson */}
        <motion.div variants={cardAnim}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(0,212,255,0.06))', border: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>
              ⚡ CONTINUE TRAINING
            </div>
            {data.nextLesson ? (
              <>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{data.nextLesson.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2f0fb', marginBottom: '6px' }}>
                  {data.nextLesson.title}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#7ab3d4' }}>⏱ {data.nextLesson.duration}</span>
                  <span style={{ fontSize: '12px', color: '#a78bfa' }}>⚡ +{data.nextLesson.xp} XP</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: '16px' }}>
                  <div className="progress-fill" style={{ width: `${data.trainingProgress}%` }} />
                </div>
                <div style={{ fontSize: '11px', color: '#7ab3d4', marginBottom: '16px' }}>
                  {data.trainingProgress}% overall progress
                </div>
                <Link
                  to={`/training/${data.nextLesson.id}`}
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '11px',
                    background: 'rgba(124,58,237,0.2)',
                    border: '1px solid rgba(124,58,237,0.4)',
                    borderRadius: '10px',
                    color: '#a78bfa', fontSize: '13px', fontWeight: '600',
                    textDecoration: 'none', transition: 'all 0.2s',
                  }}
                >
                  Start Lesson →
                </Link>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
                <div style={{ color: '#10b981', fontWeight: '700' }}>All Lessons Complete!</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
