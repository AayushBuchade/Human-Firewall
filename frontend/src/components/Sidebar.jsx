import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Mail, BookOpen, Shield, AlertTriangle,
  LogOut, User, Settings, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/phishing', icon: Mail, label: 'Phishing Inbox' },
  { to: '/training', icon: BookOpen, label: 'Training' },
  { to: '/scenarios', icon: AlertTriangle, label: 'Attack Scenarios' },
];

const adminItems = [
  { to: '/admin', icon: Shield, label: 'Admin Panel' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRiskColor = () => '#00d4ff';

  return (
    <aside style={{
      width: '260px',
      minHeight: '100vh',
      background: 'rgba(2, 11, 24, 0.95)',
      borderRight: '1px solid rgba(0, 212, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
    }}>
      {/* Logo */}
      <div style={{ padding: '8px 8px 24px', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #00d4ff20, #7c3aed40)',
            border: '1px solid rgba(0,212,255,0.4)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#00d4ff', letterSpacing: '0.5px' }}>
              HUMAN
            </div>
            <div style={{ fontSize: '10px', color: '#7ab3d4', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px' }}>
              FIREWALL
            </div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div style={{
        margin: '16px 0',
        padding: '14px',
        background: 'rgba(0,212,255,0.05)',
        border: '1px solid rgba(0,212,255,0.1)',
        borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '700', color: '#fff',
            flexShrink: 0,
          }}>
            {user?.avatar || 'U'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2f0fb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '11px', color: '#7ab3d4' }}>
              {user?.role === 'admin' ? '⚡ Admin' : user?.department}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '10px', color: '#7ab3d4', letterSpacing: '1.5px', padding: '0 8px 8px', fontWeight: '600' }}>
          NAVIGATION
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Icon size={16} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <div style={{ fontSize: '10px', color: '#7ab3d4', letterSpacing: '1.5px', padding: '16px 8px 8px', fontWeight: '600' }}>
              ADMIN
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon size={16} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div style={{ borderTop: '1px solid rgba(0,212,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={handleLogout}
          className="sidebar-item"
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', color: '#ef4444', cursor: 'pointer' }}
        >
          <LogOut size={16} />
          <span style={{ fontSize: '13px', fontWeight: '500' }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
