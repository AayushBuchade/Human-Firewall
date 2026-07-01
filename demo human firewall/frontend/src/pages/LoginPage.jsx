import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Engineering' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const demoCredentials = [
    { label: 'Employee', email: 'alice@company.com', password: 'password123', role: 'employee' },
    { label: 'Admin', email: 'admin@company.com', password: 'admin123', role: 'admin' },
  ];

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await login(form.email, form.password);
      } else {
        user = await signup(form.name, form.email, form.password, form.department);
      }
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email, password) => {
    setForm(f => ({ ...f, email, password }));
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020b18',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background effects */}
      <div className="bg-grid" style={{ position: 'fixed', inset: 0, opacity: 0.6 }} />
      <div style={{
        position: 'fixed', top: '-10%', left: '-5%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-5%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px', position: 'relative',
        display: 'none',
      }} className="hidden lg:flex">
      </div>

      {/* Full-screen form layout */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', zIndex: 1, width: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', marginBottom: '40px' }}
          >
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #00d4ff20, #7c3aed40)',
              border: '1px solid rgba(0,212,255,0.4)',
              borderRadius: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', margin: '0 auto 16px',
              boxShadow: '0 0 30px rgba(0,212,255,0.2)',
            }}>🛡️</div>
            <h1 className="gradient-text" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
              Human Firewall
            </h1>
            <p style={{ color: '#7ab3d4', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px' }}>
              CYBERSECURITY AWARENESS PLATFORM
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: 'rgba(5,20,40,0.8)',
              border: '1px solid rgba(0,212,255,0.12)',
              borderRadius: '20px',
              padding: '32px',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Mode toggle */}
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: '4px',
              marginBottom: '28px',
            }}>
              {['login', 'signup'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  style={{
                    flex: 1, padding: '8px',
                    borderRadius: '7px', border: 'none',
                    cursor: 'pointer',
                    background: mode === m ? 'rgba(0,212,255,0.15)' : 'transparent',
                    color: mode === m ? '#00d4ff' : '#7ab3d4',
                    fontWeight: mode === m ? '600' : '400',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#7ab3d4', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    FULL NAME
                  </label>
                  <input
                    className="input-field"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', color: '#7ab3d4', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#7ab3d4', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#7ab3d4',
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#7ab3d4', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    DEPARTMENT
                  </label>
                  <select
                    className="input-field"
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    style={{ cursor: 'pointer' }}
                  >
                    {['Engineering', 'Finance', 'HR', 'Marketing', 'Sales', 'Legal', 'Operations'].map(d => (
                      <option key={d} value={d} style={{ background: '#051428' }}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px',
                  fontSize: '13px', color: '#ef4444',
                }}>
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(124,58,237,0.2))',
                  border: '1px solid rgba(0,212,255,0.4)',
                  borderRadius: '10px',
                  padding: '13px',
                  color: '#00d4ff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'Inter, sans-serif',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading ? 'Processing...' : (mode === 'login' ? 'Access Platform' : 'Create Account')}
              </button>
            </form>

            {/* Quick demo logins */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,212,255,0.08)' }}>
              <div style={{ fontSize: '11px', color: '#7ab3d4', textAlign: 'center', marginBottom: '12px', letterSpacing: '1px' }}>
                QUICK DEMO ACCESS
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {demoCredentials.map(cred => (
                  <button
                    key={cred.label}
                    onClick={() => quickLogin(cred.email, cred.password)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(0,212,255,0.12)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#7ab3d4',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)';
                      e.currentTarget.style.color = '#00d4ff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.12)';
                      e.currentTarget.style.color = '#7ab3d4';
                    }}
                  >
                    <div style={{ fontWeight: '600' }}>{cred.label}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>{cred.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
