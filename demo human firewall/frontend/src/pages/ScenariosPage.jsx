import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, ExternalLink, Smartphone, Globe } from 'lucide-react';

const scenarios = [
  {
    id: 'scenario-001',
    title: 'Fake Bank Login Page',
    category: 'Credential Harvesting',
    icon: '🏦',
    difficulty: 'medium',
    description: 'A spoofed banking portal designed to steal your credentials. Notice the suspicious URL and subtle design differences.',
    redFlags: [
      'URL is "secure-bankofamerica-login.com" — NOT bankofamerica.com',
      'HTTPS padlock present but domain is wrong',
      'Slightly off branding/colors',
      'Page asks for SSN which banks never do on login',
    ],
    component: FakeBankLogin,
  },
  {
    id: 'scenario-002',
    title: 'SMS Smishing Attack',
    category: 'Smishing',
    icon: '📱',
    difficulty: 'easy',
    description: 'Fraudulent SMS messages impersonating postal services or banks to trick you into clicking malicious links.',
    redFlags: [
      'Urgent language: "Your package will be returned TODAY"',
      'Suspicious shortened URL hiding real destination',
      'Sender is a random phone number, not a business name',
      'Asks you to "confirm" personal details via link',
    ],
    component: SmishingScenario,
  },
  {
    id: 'scenario-003',
    title: 'Fake Microsoft 365 Login',
    category: 'Corporate Credential Theft',
    icon: '💻',
    difficulty: 'hard',
    description: 'A convincing copy of the Microsoft login page targeting corporate credentials. Very hard to spot without checking the URL.',
    redFlags: [
      'URL is "microsoft365-secure-login.org" — not microsoft.com',
      'Pixel-perfect copy of real Microsoft login UI',
      'Email field pre-filled to look legitimate',
      'After login, redirects to real Microsoft site to hide the attack',
    ],
    component: FakeMicrosoftLogin,
  },
];

function FakeBankLogin({ onReveal, revealed }) {
  return (
    <div style={{
      background: '#f0f4f8', borderRadius: '8px', overflow: 'hidden',
      border: '1px solid #ddd', maxWidth: '400px', margin: '0 auto',
      fontFamily: 'Arial, sans-serif', fontSize: '14px',
    }}>
      {/* Fake browser bar */}
      <div style={{ background: '#e8ecef', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28ca41' }} />
        </div>
        <div style={{
          flex: 1, background: '#fff', borderRadius: '4px', padding: '4px 8px',
          fontSize: '11px', color: revealed ? '#ef4444' : '#333',
          display: 'flex', alignItems: 'center', gap: '4px',
          border: revealed ? '1px solid #ef4444' : '1px solid #ddd',
        }}>
          🔒 https://secure-bankofamerica-login.com/signin
          {revealed && <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 'bold', color: '#ef4444' }}>⚠️ FAKE!</span>}
        </div>
      </div>

      <div style={{ padding: '24px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '28px', color: '#c0392b', fontWeight: 'bold', marginBottom: '4px' }}>
            🏦 Bank of America
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Online Banking Sign-In</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input placeholder="Online ID" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
          <input type="password" placeholder="Password" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
          <input placeholder="Social Security Number (Last 4)" style={{ padding: '10px', border: `1px solid ${revealed ? '#ef4444' : '#ddd'}`, borderRadius: '4px', fontSize: '14px', background: revealed ? '#fff5f5' : '#fff' }} />
          {revealed && <div style={{ fontSize: '11px', color: '#ef4444', background: '#fff5f5', padding: '6px 8px', borderRadius: '4px' }}>🚩 Real banks NEVER ask for SSN on login!</div>}
          <button style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Sign In
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', marginTop: '12px' }}>
          © 2026 Bank of America Corporation. All rights reserved.
        </div>
      </div>
    </div>
  );
}

function SmishingScenario({ revealed }) {
  const messages = [
    { from: 'them', text: 'USPS: Your package could not be delivered. Confirm your address to reschedule: bit.ly/usps-resc830', time: '10:23 AM' },
    { from: 'them', text: 'URGENT: Failure to confirm within 24hrs will result in package return. Tap here: bit.ly/usps-resc830', time: '10:24 AM' },
  ];

  return (
    <div style={{ maxWidth: '320px', margin: '0 auto' }}>
      {/* Phone frame */}
      <div style={{
        background: '#1a1a2e', borderRadius: '36px', padding: '16px',
        border: '3px solid #333', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px 8px', color: '#fff', fontSize: '11px' }}>
          <span>10:24</span>
          <span>📶 🔋</span>
        </div>

        {/* Message header */}
        <div style={{ background: '#f2f2f2', borderRadius: '20px 20px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5561f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff' }}>
            📦
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px' }}>+1 (555) 027-4891</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Unknown Number</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ background: '#f2f2f2', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px', borderRadius: '0 0 20px 20px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{
                background: '#fff',
                borderRadius: '0 12px 12px 12px',
                padding: '8px 12px',
                maxWidth: '90%',
                fontSize: '12px', lineHeight: '1.5',
                border: revealed && msg.text.includes('bit.ly') ? '1px solid #ef4444' : 'none',
              }}>
                {msg.text}
                {revealed && msg.text.includes('bit.ly') && (
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#ef4444', fontWeight: '700' }}>
                    🚩 Shortened URL — destination unknown!
                  </div>
                )}
              </div>
              <span style={{ fontSize: '10px', color: '#999', marginTop: '2px', marginLeft: '8px' }}>{msg.time}</span>
            </div>
          ))}
          {revealed && (
            <div style={{ background: '#fff3f3', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#c0392b' }}>
              🚩 USPS never sends links via text. Always go directly to usps.com
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FakeMicrosoftLogin({ revealed }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '8px', overflow: 'hidden',
      border: '1px solid #ddd', maxWidth: '400px', margin: '0 auto',
      fontFamily: 'Segoe UI, Arial, sans-serif',
    }}>
      {/* Browser bar */}
      <div style={{ background: '#e8ecef', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28ca41' }} />
        </div>
        <div style={{
          flex: 1, background: '#fff', borderRadius: '4px', padding: '4px 8px',
          fontSize: '11px', color: revealed ? '#ef4444' : '#333',
          display: 'flex', alignItems: 'center', gap: '4px',
          border: revealed ? '1px solid #ef4444' : '1px solid #ddd',
        }}>
          🔒 https://microsoft365-secure-login.org/auth
          {revealed && <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 'bold', color: '#ef4444' }}>⚠️ NOT microsoft.com!</span>}
        </div>
      </div>

      <div style={{ padding: '32px 40px' }}>
        {/* MS Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '20px' }}>
            <div style={{ background: '#f25022', height: '9px' }} />
            <div style={{ background: '#7fba00', height: '9px' }} />
            <div style={{ background: '#00a4ef', height: '9px' }} />
            <div style={{ background: '#ffb900', height: '9px' }} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: '300', color: '#333' }}>Microsoft</span>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '400', color: '#1b1b1b', marginBottom: '16px' }}>Sign in</h2>
        <input
          style={{ width: '100%', padding: '8px 0', borderBottom: '1px solid #767676', border: 'none', borderBottom: '2px solid #0067b8', fontSize: '15px', outline: 'none', marginBottom: '20px', color: '#333' }}
          placeholder="Email, phone, or Skype"
          defaultValue="alice@company.com"
        />
        <button style={{ background: '#0067b8', color: '#fff', border: 'none', padding: '10px 20px', fontSize: '15px', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
          Next
        </button>

        {revealed && (
          <div style={{ marginTop: '16px', background: '#fff5f5', border: '1px solid #ef4444', borderRadius: '4px', padding: '10px', fontSize: '12px', color: '#c0392b' }}>
            🚩 Real Microsoft URL always ends in <strong>microsoft.com</strong> or <strong>live.com</strong>, never ".org"
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const ScenarioComponent = activeScenario?.component;

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e2f0fb' }}>Attack Scenarios</h1>
        </div>
        <p style={{ color: '#7ab3d4', fontSize: '14px', marginLeft: '48px' }}>
          Explore real-world attack simulations. Inspect each scenario, then reveal the red flags.
        </p>
      </motion.div>

      {/* Scenario cards */}
      {!activeScenario ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {scenarios.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { setActiveScenario(s); setRevealed(false); }}
              style={{
                background: 'rgba(5,20,40,0.7)',
                border: '1px solid rgba(239,68,68,0.12)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.25s',
              }}
              whileHover={{
                borderColor: 'rgba(239,68,68,0.35)',
                y: -4,
                boxShadow: '0 12px 40px rgba(239,68,68,0.1)',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{s.icon}</div>
              <div style={{ marginBottom: '8px' }}>
                <span className="badge" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', fontSize: '10px' }}>
                  {s.category}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2f0fb', marginBottom: '8px' }}>{s.title}</h3>
              <p style={{ fontSize: '13px', color: '#7ab3d4', lineHeight: '1.6', marginBottom: '16px' }}>{s.description}</p>
              <div style={{ fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                Explore Scenario →
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back */}
            <button
              onClick={() => { setActiveScenario(null); setRevealed(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#7ab3d4', fontSize: '13px', marginBottom: '24px', padding: '0',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
              onMouseLeave={e => e.currentTarget.style.color = '#7ab3d4'}
            >
              ← Back to Scenarios
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
              {/* Scenario display */}
              <div>
                <div style={{
                  background: 'rgba(5,20,40,0.7)',
                  border: '1px solid rgba(0,212,255,0.1)',
                  borderRadius: '16px',
                  padding: '28px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2f0fb' }}>{activeScenario.title}</h2>
                      <p style={{ fontSize: '13px', color: '#7ab3d4', marginTop: '4px' }}>{activeScenario.description}</p>
                    </div>
                  </div>

                  <ScenarioComponent revealed={revealed} />
                </div>

                {!revealed ? (
                  <button
                    onClick={() => setRevealed(true)}
                    style={{
                      width: '100%', padding: '13px',
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1))',
                      border: '1px solid rgba(239,68,68,0.35)',
                      borderRadius: '12px',
                      color: '#ef4444', fontSize: '14px', fontWeight: '600',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} /> Reveal Red Flags
                  </button>
                ) : (
                  <div style={{
                    padding: '14px',
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '12px',
                    textAlign: 'center', fontSize: '13px', color: '#10b981', fontWeight: '600',
                  }}>
                    <Shield size={15} style={{ display: 'inline', marginRight: '6px' }} />
                    Red flags revealed! Study the indicators carefully.
                  </div>
                )}
              </div>

              {/* Red flags panel */}
              <div style={{
                background: 'rgba(5,20,40,0.7)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '16px',
                padding: '24px',
                position: 'sticky', top: '20px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', letterSpacing: '1px', marginBottom: '16px' }}>
                  🚩 RED FLAGS — {activeScenario.redFlags.length} INDICATORS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeScenario.redFlags.map((flag, i) => (
                    <motion.div
                      key={i}
                      initial={revealed ? { opacity: 0, x: 10 } : { opacity: 1 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: revealed ? i * 0.1 : 0 }}
                      style={{
                        display: 'flex', gap: '10px',
                        padding: '10px 12px',
                        background: revealed ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${revealed ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)'}`,
                        borderRadius: '8px',
                        filter: revealed ? 'none' : 'blur(4px)',
                        transition: 'filter 0.5s',
                        cursor: revealed ? 'default' : 'none',
                        userSelect: revealed ? 'text' : 'none',
                      }}
                    >
                      <span style={{ color: '#ef4444', flexShrink: 0 }}>✗</span>
                      <span style={{ fontSize: '12px', color: '#e2f0fb', lineHeight: '1.5' }}>{flag}</span>
                    </motion.div>
                  ))}
                </div>
                {!revealed && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#7ab3d4', marginTop: '16px' }}>
                    Click "Reveal Red Flags" to unlock
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
