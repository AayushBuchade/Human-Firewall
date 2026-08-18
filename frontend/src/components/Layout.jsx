import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020b18' }}>
      {/* Background grid */}
      <div className="bg-grid" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5,
      }} />

      {/* Ambient glow blobs */}
      <div style={{
        position: 'fixed', top: '10%', left: '20%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <Sidebar />

      <main style={{
        marginLeft: '260px',
        flex: 1,
        padding: '32px',
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
