import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import RiskMeter from '../components/RiskMeter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Shield, Users, AlertTriangle, TrendingDown, Trash2, X } from 'lucide-react';

const classColors = { vulnerable: '#ef4444', cautious: '#f59e0b', secure: '#10b981' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(5,20,40,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <div style={{ color: '#7ab3d4' }}>{label}</div>
      <div style={{ color: '#00d4ff', fontWeight: '700' }}>Risk: {payload[0].value}</div>
    </div>
  );
};

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); // { userId, userName }
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  useEffect(() => {
    if (!user) return navigate('/');
    if (user.role !== 'admin') return navigate('/dashboard');

    const fetchData = () => {
      api.get('/behavior/admin/all')
        .then(res => setData(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 3000); // Sync data in real-time

    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleDeleteClick = (userId, userName) => {
    setConfirmDelete({ userId, userName });
    setDeleteError('');
  };

  const confirmDeleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/auth/users/${confirmDelete.userId}`);
      setData(prev => ({
        ...prev,
        users: prev.users.filter(u => u.userId !== confirmDelete.userId),
        summary: {
          ...prev.summary,
          total: prev.summary.total - 1,
        },
      }));
      setDeleteSuccess(`${confirmDelete.userName} has been removed.`);
      setTimeout(() => setDeleteSuccess(''), 3000);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', color: '#00d4ff' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading admin panel...
    </div>
  );

  if (!data) return <div style={{ color: '#ef4444', padding: '40px' }}>Failed to load data. Is the backend running?</div>;

  const { users: userList, summary } = data;

  const chartData = userList.map(u => ({
    name: u.userName.split(' ')[0],
    risk: u.riskScore,
    class: u.classification,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="#a78bfa" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e2f0fb' }}>Security Admin Panel</h1>
        </div>
        <p style={{ color: '#7ab3d4', fontSize: '14px', marginLeft: '48px' }}>
          Organization-wide security posture overview. Monitor risk scores and training progress.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Employees', value: summary.total, icon: Users, color: '#00d4ff' },
          { label: 'Avg Risk Score', value: summary.avgRisk, icon: TrendingDown, color: '#f59e0b' },
          { label: 'Vulnerable', value: summary.vulnerable, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Secure', value: summary.secure, icon: Shield, color: '#10b981' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#7ab3d4', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: card.color, fontFamily: 'JetBrains Mono, monospace' }}>{card.value}</div>
              </div>
              <div style={{
                width: '38px', height: '38px',
                background: `${card.color}15`,
                border: `1px solid ${card.color}30`,
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={16} color={card.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Distribution + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', marginBottom: '24px' }}>
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="stat-card"
        >
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2f0fb' }}>Risk Scores by Employee</div>
            <div style={{ fontSize: '12px', color: '#7ab3d4' }}>Lower is better</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="name" tick={{ fill: '#7ab3d4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#7ab3d4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={classColors[entry.class] || '#00d4ff'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card"
        >
          <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: '700', color: '#e2f0fb' }}>Risk Distribution</div>
          {[
            { label: 'Vulnerable', count: summary.vulnerable, color: '#ef4444' },
            { label: 'Cautious', count: summary.cautious, color: '#f59e0b' },
            { label: 'Secure', count: summary.secure, color: '#10b981' },
          ].map(item => {
            const pct = Math.round((item.count / summary.total) * 100);
            return (
              <div key={item.label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ color: item.color }}>{item.label}</span>
                  <span style={{ color: '#7ab3d4' }}>{item.count} ({pct}%)</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{ height: '100%', background: item.color, borderRadius: '2px' }}
                  />
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Employee table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="stat-card"
      >
        <div style={{ marginBottom: '20px', fontSize: '13px', fontWeight: '700', color: '#e2f0fb' }}>
          Employee Security Details
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Employee', 'Department', 'Risk Score', 'Classification', 'Click Rate', 'Report Rate', 'Training', 'Simulations', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontSize: '11px', color: '#7ab3d4', fontWeight: '600',
                    letterSpacing: '0.5px', borderBottom: '1px solid rgba(0,212,255,0.08)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userList.map((u, i) => (
                <motion.tr
                  key={u.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700', color: '#fff',
                      }}>
                        {u.avatar}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2f0fb' }}>{u.userName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#7ab3d4' }}>{u.department}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: classColors[u.classification], fontFamily: 'JetBrains Mono, monospace' }}>
                      {u.riskScore}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge risk-${u.classification}`} style={{ fontSize: '10px' }}>
                      {u.classification}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: u.clickRate > 30 ? '#ef4444' : '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
                    {u.clickRate}%
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: u.reportRate > 50 ? '#10b981' : '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                    {u.reportRate}%
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '4px', background: 'rgba(0,212,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${u.trainingProgress}%`, background: 'linear-gradient(90deg, #00d4ff, #7c3aed)', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#7ab3d4' }}>{u.trainingProgress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#7ab3d4', fontFamily: 'JetBrains Mono, monospace' }}>
                    {u.totalSimulations}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => handleDeleteClick(u.userId, u.userName)}
                      title="Delete employee"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Success toast */}
      {deleteSuccess && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: '12px', padding: '14px 20px',
          color: '#10b981', fontSize: '14px', fontWeight: '600',
          zIndex: 1000, backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          ✅ {deleteSuccess}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999,
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(135deg, rgba(10,25,47,0.98), rgba(5,15,35,0.98))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '16px', padding: '28px', width: '360px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trash2 size={16} color="#ef4444" />
                </div>
                <span style={{ fontWeight: '700', color: '#e2f0fb', fontSize: '15px' }}>Delete Employee</span>
              </div>
              <button onClick={() => setConfirmDelete(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7ab3d4' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#7ab3d4', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
              Are you sure you want to remove
            </p>
            <p style={{ color: '#e2f0fb', fontSize: '15px', fontWeight: '700', marginBottom: '20px' }}>
              {confirmDelete.userName}?
            </p>
            <p style={{ color: '#7ab3d4', fontSize: '12px', marginBottom: '20px' }}>
              This will delete their account and all behavior records for this session.
            </p>

            {deleteError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 14px',
                color: '#ef4444', fontSize: '12px', marginBottom: '16px',
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#7ab3d4', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none', color: '#fff',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
