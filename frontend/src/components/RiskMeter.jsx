export default function RiskMeter({ score, size = 160 }) {
  const getColor = () => {
    if (score >= 60) return '#ef4444';
    if (score >= 30) return '#f59e0b';
    return '#10b981';
  };

  const getLabel = () => {
    if (score >= 60) return 'Vulnerable';
    if (score >= 30) return 'Cautious';
    return 'Secure';
  };

  const color = getColor();
  const radius = (size / 2) - 14;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;
  const strokeWidth = 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            style={{
              filter: `drop-shadow(0 0 8px ${color}80)`,
              transition: 'stroke-dashoffset 1.5s ease, stroke 0.5s ease',
            }}
          />
        </svg>

        {/* Center content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: size > 120 ? '32px' : '24px',
            fontWeight: '800',
            color,
            fontFamily: 'JetBrains Mono, monospace',
            lineHeight: 1,
            filter: `drop-shadow(0 0 6px ${color}60)`,
          }}>
            {score}
          </div>
          <div style={{ fontSize: '11px', color: '#7ab3d4', marginTop: '2px' }}>/ 100</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 14px',
        borderRadius: '20px',
        border: `1px solid ${color}40`,
        background: `${color}10`,
        fontSize: '12px',
        fontWeight: '700',
        color,
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        <span style={{
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        {getLabel()}
      </div>
    </div>
  );
}
