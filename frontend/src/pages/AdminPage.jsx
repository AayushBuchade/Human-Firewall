import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from 'recharts';
import {
  Shield, Users, AlertTriangle, TrendingDown, Trash2, X,
  Activity, Award, Send, RefreshCw, BookOpen, Search, Sparkles, AlertCircle, Info, Calendar
} from 'lucide-react';

const classColors = {
  vulnerable: '#ef4444',
  cautious: '#f59e0b',
  secure: '#10b981'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(5,20,40,0.95)',
      border: '1px solid rgba(0,212,255,0.25)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      color: '#e2f0fb',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: '#7ab3d4', marginBottom: '4px', fontWeight: '600' }}>{label}</div>
      <div style={{ color: '#00d4ff', fontWeight: '700' }}>Risk: {payload[0].value}</div>
    </div>
  );
};

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // States
  const [overview, setOverview] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals & Profile Deep Dive
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [courseToAssign, setCourseToAssign] = useState('');
  
  // Actions states
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { userId, userName }
  const [confirmReset, setConfirmReset] = useState(false);

  // Initial Fetch & Real-time interval
  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [overviewRes, behaviorRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/behavior/admin/all')
      ]);
      setOverview(overviewRes.data);
      setBehavior(behaviorRes.data);
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return navigate('/');
    if (user.role !== 'admin') return navigate('/dashboard');

    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  // Handle selected user profile load
  const loadUserProfile = async (userId) => {
    setProfileLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.get(`/admin/users/${userId}/profile`);
      setSelectedProfile(res.data);
      setSelectedUserId(userId);
    } catch (err) {
      setActionError('Failed to retrieve employee security profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    loadUserProfile(userId);
  };

  // Close profile panel
  const closeProfile = () => {
    setSelectedUserId(null);
    setSelectedProfile(null);
  };

  // Administrative Actions
  const handleTriggerPhishing = async () => {
    if (!selectedUserId) return;
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post(`/admin/users/${selectedUserId}/phishing`);
      setActionSuccess(res.data.message || 'Phishing campaign launched successfully.');
      loadUserProfile(selectedUserId);
      fetchData(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to trigger simulated phishing email.');
    }
  };

  const handleAssignCourse = async () => {
    if (!selectedUserId || !courseToAssign) return;
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post(`/admin/users/${selectedUserId}/assign`, { courseId: courseToAssign });
      setActionSuccess(res.data.message || 'Course assigned successfully.');
      setCourseToAssign('');
      loadUserProfile(selectedUserId);
      fetchData(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to assign course.');
    }
  };

  const handleResetProfile = async () => {
    if (!selectedUserId) return;
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post(`/admin/users/${selectedUserId}/reset`);
      setActionSuccess(res.data.message || 'Employee statistics reset successfully.');
      setConfirmReset(false);
      loadUserProfile(selectedUserId);
      fetchData(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reset profile.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/auth/users/${confirmDelete.userId}`);
      setBehavior(prev => ({
        ...prev,
        users: prev.users.filter(u => u.userId !== confirmDelete.userId),
        summary: {
          ...prev.summary,
          total: prev.summary.total - 1
        }
      }));
      if (selectedUserId === confirmDelete.userId) {
        closeProfile();
      }
      setActionSuccess(`${confirmDelete.userName} was removed successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);
      setConfirmDelete(null);
      fetchData(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to remove user account.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: '#00d4ff' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(0,212,255,0.15)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '14px', letterSpacing: '1px', fontWeight: '600', color: '#7ab3d4' }}>ESTABLISHING SOC TELEMETRY LINK...</span>
      </div>
    );
  }

  const { users: userList } = behavior;
  const filteredUsers = userList.filter(u =>
    u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '1400px', margin: '0 auto', padding: '10px' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(10,25,47,0.8), rgba(0,212,255,0.05))',
        border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={20} color="#00d4ff" style={{ filter: 'drop-shadow(0 0 6px #00d4ff)' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#e2f0fb', letterSpacing: '0.5px' }}>SOC COMMAND CENTER</h1>
          </div>
          <p style={{ color: '#7ab3d4', fontSize: '13px', marginLeft: '48px' }}>
            Real-time organizational risk posture, email threat intelligence, and behavioral simulation analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '11px', fontWeight: '700', color: '#10b981',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px',
            textTransform: 'uppercase', letterSpacing: '1px'
          }}>
            <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
            SYSTEM STREAMING
          </div>
        </div>
      </div>

      {/* 2. Core Metrics Summary Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'AVG ORG RISK SCORE', value: `${overview.avgOrgRiskScore}/100`, desc: 'Target posture: < 25', color: overview.avgOrgRiskScore > 50 ? '#ef4444' : '#10b981', icon: TrendingDown },
          { label: 'SIMULATIONS TRIGGERED', value: overview.totalSimulationsSent, desc: 'Active campaigns run', color: '#00d4ff', icon: Send },
          { label: 'AVG PHISHING CLICK RATE', value: `${overview.avgClickRate}%`, desc: 'Lower is better', color: overview.avgClickRate > 20 ? '#ef4444' : '#10b981', icon: AlertTriangle },
          { label: 'AVG REPORTING RATE', value: `${overview.avgReportRate}%`, desc: 'Target: > 70%', color: '#10b981', icon: Shield },
          { label: 'EMAIL SHIELD LOGS', value: overview.totalScans, desc: `${overview.phishingDetected} threats intercepted`, color: '#a78bfa', icon: Activity }
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="stat-card"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{card.label}</span>
                <h3 style={{ fontSize: '32px', fontWeight: '800', color: card.color, marginTop: '8px', marginBottom: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {card.value}
                </h3>
                <span style={{ fontSize: '11px', color: '#548ca8' }}>{card.desc}</span>
              </div>
              <div style={{
                width: '40px', height: '40px',
                background: `${card.color}15`,
                border: `1px solid ${card.color}35`,
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <card.icon size={18} color={card.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. Charts & Activity Logs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        
        {/* Risk Distribution Chart */}
        <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2f0fb' }}>Risk Distribution Breakdown</span>
            <span style={{ fontSize: '11px', color: '#7ab3d4' }}>Active users count</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '180px' }}>
            <div style={{ flex: 1 }}>
              {[
                { label: 'Critical Risk (>80)', key: 'Critical', color: '#ef4444' },
                { label: 'High Risk (60-80)', key: 'High Risk', color: '#f97316' },
                { label: 'Moderate Risk (40-60)', key: 'Moderate Risk', color: '#f59e0b' },
                { label: 'Low Risk (20-40)', key: 'Low Risk', color: '#3b82f6' },
                { label: 'Very Secure (<20)', key: 'Very Secure', color: '#10b981' }
              ].map(item => {
                const count = overview.riskLevelBreakdown[item.key] || 0;
                const total = overview.totalEmployees || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={item.label} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: item.color, fontWeight: '600' }}>{item.label}</span>
                      <span style={{ color: '#7ab3d4' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: item.color, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Top Vulnerable Departments */}
        <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2f0fb' }}>Top Vulnerable Departments</span>
            <span style={{ fontSize: '11px', color: '#7ab3d4' }}>Ordered by avg risk</span>
          </div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.topVulnerableDepartments} barSize={24} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#7ab3d4', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="department" type="category" tick={{ fill: '#7ab3d4', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgRiskScore" radius={[0, 4, 4, 0]}>
                  {overview.topVulnerableDepartments.map((entry, idx) => (
                    <Cell key={idx} fill={entry.avgRiskScore > 50 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* 4. Split Pane layout: User Inventory on Left, Real-time Activity Feed / Profile details on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Side: Employee Security Inventory */}
        <div className="stat-card" style={{ minHeight: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#e2f0fb' }}>Employee Security Inventory</h2>
              <span style={{ fontSize: '12px', color: '#7ab3d4' }}>Monitor metrics and click for profile deep-dive</span>
            </div>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} color="#7ab3d4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search name or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(5,15,30,0.8)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  borderRadius: '10px',
                  padding: '8px 12px 8px 34px',
                  fontSize: '12px',
                  color: '#fff',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
                  {['Employee', 'Department', 'Risk Score', 'Classification', 'Click Rate', 'Report Rate', 'Streak', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '12px 10px', textAlign: 'left',
                      fontSize: '11px', color: '#7ab3d4', fontWeight: '700',
                      letterSpacing: '0.5px'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#548ca8', fontSize: '13px' }}>
                      No matching employee records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserId === u.userId;
                    return (
                      <tr
                        key={u.userId}
                        onClick={() => handleUserClick(u.userId)}
                        style={{
                          borderBottom: '1px solid rgba(0,212,255,0.04)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(0,212,255,0.08)' : 'transparent',
                          transition: 'all 0.15s'
                        }}
                        className="inventory-row"
                      >
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '30px', height: '30px',
                              background: isSelected ? 'linear-gradient(135deg, #a78bfa, #00d4ff)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                              borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: '700', color: '#fff',
                            }}>
                              {u.avatar}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2f0fb' }}>{u.userName}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: '#7ab3d4' }}>{u.department}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: classColors[u.classification], fontFamily: 'JetBrains Mono, monospace' }}>
                            {u.riskScore}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span className={`badge risk-${u.classification}`} style={{ fontSize: '10px', padding: '3px 8px', textTransform: 'capitalize' }}>
                            {u.classification}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: u.clickRate > 25 ? '#ef4444' : '#10b981', fontFamily: 'JetBrains Mono, monospace', fontWeight: '700' }}>
                          {u.clickRate}%
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: u.reportRate >= 50 ? '#10b981' : '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontWeight: '700' }}>
                          {u.reportRate}%
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: '#e2f0fb', fontFamily: 'JetBrains Mono, monospace' }}>
                          {u.securityStreak > 0 ? `🔥 ${u.securityStreak}` : '0'}
                        </td>
                        <td style={{ padding: '12px 10px' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleUserClick(u.userId)}
                            style={{
                              background: 'rgba(0,212,255,0.08)',
                              border: '1px solid rgba(0,212,255,0.2)',
                              color: '#00d4ff',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Telemetry logs feed OR selected employee profile deep dive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Action Feedback alerts */}
          {(actionSuccess || actionError) && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{
              background: actionSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: actionSuccess ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start'
            }}>
              {actionSuccess ? <Sparkles size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: actionSuccess ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
                  {actionSuccess ? 'TELEMETRY UPDATE' : 'OPERATION FAILED'}
                </div>
                <div style={{ fontSize: '11px', color: '#e2f0fb', lineHeight: '1.4' }}>{actionSuccess || actionError}</div>
              </div>
              <button onClick={() => { setActionSuccess(''); setActionError(''); }} style={{ background: 'none', border: 'none', color: '#7ab3d4', cursor: 'pointer' }}>
                <X size={12} />
              </button>
            </motion.div>
          )}

          {/* Conditional Rendering: Employee Profile OR Org Activity Feed */}
          {selectedProfile ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="stat-card" style={{ borderColor: 'rgba(0,212,255,0.3)', background: 'linear-gradient(135deg, rgba(8,18,36,0.98), rgba(4,10,25,0.98))' }}>
              
              {/* Profile Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '42px', height: '42px',
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '800', color: '#fff',
                    boxShadow: '0 0 10px rgba(0,212,255,0.3)'
                  }}>
                    {selectedProfile.employee.avatar}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#fff', marginBottom: '2px' }}>{selectedProfile.employee.name}</h3>
                    <span style={{ fontSize: '11px', color: '#7ab3d4' }}>{selectedProfile.employee.jobRole} • {selectedProfile.employee.department}</span>
                  </div>
                </div>
                <button onClick={closeProfile} style={{ background: 'none', border: 'none', color: '#7ab3d4', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Score Display */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(0,212,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#7ab3d4', fontWeight: '700', letterSpacing: '0.5px' }}>SECURITY RISK PROFILE</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '900', color: classColors[selectedProfile.employee.riskLevel.toLowerCase().replace(' ', '')] || '#00d4ff', fontFamily: 'JetBrains Mono, monospace' }}>
                      {selectedProfile.employee.riskScore}
                    </span>
                    <span style={{ fontSize: '11px', color: '#548ca8' }}>/100</span>
                  </div>
                </div>
                <span className={`badge risk-${selectedProfile.employee.riskLevel.toLowerCase().replace(' ', '')}`} style={{ padding: '4px 10px', fontSize: '11px' }}>
                  {selectedProfile.employee.riskLevel}
                </span>
              </div>

              {/* Core Employee Telemetry Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '10px', color: '#7ab3d4' }}>TRAINING progress</span>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#e2f0fb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={12} color="#00d4ff" />
                    {selectedProfile.employee.trainingProgress}% ({selectedProfile.employee.trainingCompleted} completed)
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '10px', color: '#7ab3d4' }}>XP & SECURITY STREAK</span>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#e2f0fb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={12} color="#10b981" />
                    {selectedProfile.employee.trainingXP} XP • 🔥 {selectedProfile.employee.securityStreak} days
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '10px', color: '#7ab3d4' }}>PHISHING CLICK RATE</span>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: selectedProfile.employee.phishingClicked > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                    ❌ {selectedProfile.employee.phishingClicked} clicks / {selectedProfile.employee.phishingAttempts} runs
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                  <span style={{ fontSize: '10px', color: '#7ab3d4' }}>REPORTED THREATS</span>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                    🛡️ {selectedProfile.employee.phishingReported} reports ({Math.round(selectedProfile.employee.phishingAttempts > 0 ? (selectedProfile.employee.phishingReported / selectedProfile.employee.phishingAttempts * 100) : 0)}%)
                  </div>
                </div>
              </div>

              {/* Risk Score Trend (Line chart) */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '700', display: 'block', marginBottom: '8px' }}>RISK SCORE SENSOR HISTORY</span>
                <div style={{ height: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedProfile.riskTrend}>
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="risk" stroke="#00d4ff" strokeWidth={2} dot={{ r: 3, fill: '#00d4ff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Badges Gallery */}
              {selectedProfile.badges && selectedProfile.badges.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '700', display: 'block', marginBottom: '8px' }}>AWARDED DEFENSE BADGES</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedProfile.badges.map(b => (
                      <div key={b.name} title={`${b.name}: ${b.description}`} style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2f0fb'
                      }}>
                        <span>{b.icon}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600' }}>{b.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Console */}
              <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', color: '#00d4ff', fontWeight: '800', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>SOC INTERVENTION CONSOLE</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Trigger Phishing Simulation */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2f0fb' }}>Simulate Phishing</div>
                      <div style={{ fontSize: '10px', color: '#7ab3d4' }}>Dispatch random test templates</div>
                    </div>
                    <button
                      onClick={handleTriggerPhishing}
                      style={{
                        background: 'linear-gradient(135deg, #00d4ff, #00b4d8)', border: 'none', color: '#fff',
                        borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Send size={12} /> Run Test
                    </button>
                  </div>

                  {/* Assign Training Course */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2f0fb' }}>Assign Training Module</div>
                        <div style={{ fontSize: '10px', color: '#7ab3d4' }}>Enforce specific cybersecurity course</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={courseToAssign}
                        onChange={e => setCourseToAssign(e.target.value)}
                        style={{
                          flex: 1, background: 'rgba(5,15,30,0.9)', border: '1px solid rgba(0,212,255,0.15)',
                          borderRadius: '8px', padding: '6px', fontSize: '11px', color: '#fff', outline: 'none'
                        }}
                      >
                        <option value="">-- Choose Course --</option>
                        {selectedProfile.availableCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.title} ({c.xp} XP)</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssignCourse}
                        disabled={!courseToAssign}
                        style={{
                          background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                          color: '#c084fc', borderRadius: '8px', padding: '6px 12px', fontSize: '11px',
                          fontWeight: '700', cursor: courseToAssign ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  </div>

                  {/* Reset Risk Profile */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2f0fb' }}>Reset Risk Score</div>
                      <div style={{ fontSize: '10px', color: '#7ab3d4' }}>Clear history and restore base score to 40</div>
                    </div>
                    
                    {confirmReset ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setConfirmReset(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7ab3d4', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleResetProfile} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Confirm</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmReset(true)}
                        style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444',
                          borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        Reset Score
                      </button>
                    )}
                  </div>

                  {/* Remove Account */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444' }}>De-provision Account</div>
                      <div style={{ fontSize: '10px', color: '#7ab3d4' }}>Permanently remove employee credentials</div>
                    </div>
                    <button
                      onClick={() => setConfirmDelete({ userId: selectedProfile.employee.id, userName: selectedProfile.employee.name })}
                      style={{
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#ef4444'
                      }}
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Event Logs */}
              <div>
                <span style={{ fontSize: '11px', color: '#7ab3d4', fontWeight: '700', display: 'block', marginBottom: '8px' }}>EMPLOYEE INCIDENT LOGS</span>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {selectedProfile.activities.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#548ca8', padding: '10px 0' }}>No security events logged.</div>
                  ) : (
                    selectedProfile.activities.map(act => (
                      <div key={act.id} style={{
                        background: 'rgba(255,255,255,0.01)', borderLeft: `3px solid ${act.activityType.includes('FAIL') ? '#ef4444' : act.activityType.includes('REPORT') ? '#10b981' : '#a78bfa'}`,
                        padding: '8px 10px', borderRadius: '0 6px 6px 0', fontSize: '11px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2f0fb', marginBottom: '3px' }}>
                          <span style={{ fontWeight: '700' }}>{act.activityType.replace('_', ' ')}</span>
                          <span style={{ color: '#548ca8', fontSize: '9px' }}>{new Date(act.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ color: '#7ab3d4', lineHeight: '1.3' }}>{act.description}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </motion.div>
          ) : (
            // Default Right side panel: Dynamic Org Activity Feed and Risk Scoring Guide
            <>
              {/* Activity Feed */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="stat-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Activity size={16} color="#00d4ff" />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2f0fb' }}>Real-time Security Activity</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                  {overview.recentActivityFeed.length === 0 ? (
                    <div style={{ color: '#548ca8', fontSize: '12px', textAlign: 'center', padding: '30px' }}>No active telemetry streams.</div>
                  ) : (
                    overview.recentActivityFeed.map(act => (
                      <div key={act.id} style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,212,255,0.05)',
                        borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%', marginTop: '4px',
                          background: act.activityType.includes('FAIL') ? '#ef4444' : act.activityType.includes('REPORT') ? '#10b981' : '#a78bfa',
                          boxShadow: `0 0 6px ${act.activityType.includes('FAIL') ? '#ef4444' : act.activityType.includes('REPORT') ? '#10b981' : '#a78bfa'}`
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#e2f0fb' }}>{act.userName}</span>
                            <span style={{ fontSize: '9px', color: '#548ca8' }}>{new Date(act.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: '#7ab3d4', margin: 0, lineHeight: '1.3' }}>{act.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* Behavior Risk Engine Explanation */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(10,25,47,0.6), rgba(0,212,255,0.02))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Info size={16} color="#00d4ff" />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#e2f0fb' }}>Scoring Engine (Rule-based AI)</span>
                </div>
                <p style={{ fontSize: '11px', color: '#7ab3d4', lineHeight: '1.4', marginBottom: '12px' }}>
                  The employee risk profile computes dynamically based on real threat interactions and compliance tasks:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '6px 8px', borderRadius: '6px' }}>💥 Phishing click: +30</div>
                  <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '6px 8px', borderRadius: '6px' }}>🔑 Credential submit: +40</div>
                  <div style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '6px 8px', borderRadius: '6px' }}>🟡 Phishing ignored: +10</div>
                  <div style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '6px 8px', borderRadius: '6px' }}>🛡️ Phishing reported: -15</div>
                  <div style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)', padding: '6px 8px', borderRadius: '6px', gridColumn: 'span 2' }}>📚 Lesson course done: -10 | Perfect Quiz: -5</div>
                </div>
              </motion.div>
            </>
          )}

        </div>

      </div>

      {/* 5. Deprovision Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(135deg, rgba(10,25,47,0.98), rgba(5,15,35,0.98))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '16px', padding: '24px', width: '380px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={16} color="#ef4444" />
              </div>
              <span style={{ fontWeight: '800', color: '#e2f0fb', fontSize: '15px' }}>De-provision Account?</span>
            </div>

            <p style={{ color: '#7ab3d4', fontSize: '13px', lineHeight: '1.5', marginBottom: '8px' }}>
              You are about to remove employee account access for:
            </p>
            <p style={{ color: '#ef4444', fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>
              {confirmDelete.userName}
            </p>
            <p style={{ color: '#548ca8', fontSize: '11px', marginBottom: '24px', lineHeight: '1.4' }}>
              Warning: This is an administrative database override. All training progress, simulation actions, streak history, and badges will be permanently erased.
            </p>

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
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
