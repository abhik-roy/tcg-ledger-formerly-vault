// src/primitives.jsx — visual atoms for Graphite system

const { usd, GAME_COLORS } = window.TCGData;

// ─── Iconography ──────────────────────────────────────────────
function Icon({ name, size = 16, color = 'currentColor', stroke = 1.6 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'layers': return (<svg {...common}><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>);
    case 'dashboard': return (<svg {...common}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>);
    case 'library': return (<svg {...common}><path d="M16 6 4 6"/><path d="M16 12 4 12"/><path d="M16 18 4 18"/><circle cx="20" cy="6" r="1"/><circle cx="20" cy="12" r="1"/><circle cx="20" cy="18" r="1"/></svg>);
    case 'target': return (<svg {...common}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
    case 'history': return (<svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>);
    case 'repeat': return (<svg {...common}><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>);
    case 'shield': return (<svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>);
    case 'settings': return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>);
    case 'logout': return (<svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>);
    case 'search': return (<svg {...common}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>);
    case 'x': return (<svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>);
    case 'check': return (<svg {...common}><path d="m4 12 5 5L20 6"/></svg>);
    case 'plus': return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case 'minus': return (<svg {...common}><path d="M5 12h14"/></svg>);
    case 'chevron-right': return (<svg {...common}><path d="m9 6 6 6-6 6"/></svg>);
    case 'chevron-left':  return (<svg {...common}><path d="m15 6-6 6 6 6"/></svg>);
    case 'chevron-down':  return (<svg {...common}><path d="m6 9 6 6 6-6"/></svg>);
    case 'dollar': return (<svg {...common}><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>);
    case 'send':   return (<svg {...common}><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg>);
    case 'package':return (<svg {...common}><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22V12"/></svg>);
    case 'image':  return (<svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>);
    case 'message': case 'chat': return (<svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>);
    case 'users':  return (<svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    case 'undo': return (<svg {...common}><path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>);
    case 'ban': return (<svg {...common}><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>);
    case 'filter': return (<svg {...common}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/></svg>);
    case 'swap': return (<svg {...common}><path d="M7 16V4M3 8l4-4 4 4"/><path d="M17 8v12M21 16l-4 4-4-4"/></svg>);
    case 'star': return (<svg {...common}><path d="m12 2 3.1 6.3 7 1-5 4.9 1.1 6.8L12 17.8 5.8 21l1.1-6.8-5-4.9 7-1Z"/></svg>);
    case 'bell': return (<svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>);
    case 'sparkles': return (<svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>);
    case 'pin': return (<svg {...common}><path d="M12 2v10"/><path d="M7 7h10"/><path d="M9 12v4l-3 5h12l-3-5v-4"/></svg>);
    case 'info': return (<svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M11 12h1v4h1"/></svg>);
    case 'arrow-right': return (<svg {...common}><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
    case 'arrow-left': return (<svg {...common}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>);
    case 'arrow-up-right': return (<svg {...common}><path d="M7 17 17 7M7 7h10v10"/></svg>);
    case 'trend-up': return (<svg {...common}><path d="m22 7-9 9-4-4-7 7"/><path d="M16 7h6v6"/></svg>);
    case 'alert': return (<svg {...common}><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>);
    case 'handshake': return (<svg {...common}><path d="M11 17l-2.5-2.5M15 11l2.5 2.5M20 12l-8-8-4 4M4 12l8 8 4-4"/></svg>);
    case 'pencil': return (<svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>);
    case 'inbox': return (<svg {...common}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>);
    case 'card': return (<svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>);
    case 'moon': return (<svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>);
    case 'sun': return (<svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>);
    case 'dot': return (<svg {...common}><circle cx="12" cy="12" r="3" fill={color}/></svg>);
    default: return <svg {...common} />;
  }
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ user, size = 28 }) {
  if (!user) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${user.avatarHue}, 22%, 18%)`,
      color: `hsl(${user.avatarHue}, 60%, 88%)`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, letterSpacing: '0.01em',
      border: `1px solid hsl(${user.avatarHue}, 22%, 26%)`,
      flexShrink: 0, fontFamily: 'var(--font-sans)',
    }}>
      {user.initials}
    </div>
  );
}

// ─── Game chip ────────────────────────────────────────────────
function GameChip({ game, size = 'sm' }) {
  const color = GAME_COLORS[game] || 'var(--ink-3)';
  const label = { magic: 'Magic', pokemon: 'Pokémon', yugioh: 'Yu-Gi-Oh', lorcana: 'Lorcana' }[game] || game;
  return (
    <span className="chip chip-mono" style={{
      color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      fontSize: size === 'sm' ? 9.5 : 10,
      padding: size === 'sm' ? '2px 7px' : '3px 9px',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

// ─── Condition chip ───────────────────────────────────────────
function ConditionChip({ condition }) {
  const tones = {
    NM: 'var(--signal-green)',
    LP: 'var(--accent-cool)',
    MP: 'var(--signal-amber)',
    HP: 'var(--accent-hot)',
  };
  const c = tones[condition] || 'var(--ink-3)';
  return (
    <span className="chip chip-mono" style={{
      color: c, borderColor: `color-mix(in srgb, ${c} 32%, transparent)`,
      fontSize: 9.5,
    }}>{condition}</span>
  );
}

// ─── Status pill ──────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    pending:   { c: 'var(--signal-amber)', label: 'Pending' },
    accepted:  { c: 'var(--signal-green)', label: 'Accepted' },
    declined:  { c: 'var(--ink-3)',        label: 'Declined' },
    withdrawn: { c: 'var(--ink-3)',        label: 'Withdrawn' },
    voided:    { c: 'var(--ink-3)',        label: 'Voided' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="chip chip-mono" style={{
      color: s.c, borderColor: `color-mix(in srgb, ${s.c} 32%, transparent)`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c, marginRight: 2 }} />
      {s.label}
    </span>
  );
}

// ─── CardArt — stylized digital card face ─────────────────────
function CardArt({ card, size = 'md', style = {}, tilt = false }) {
  if (!card) return null;
  const color = GAME_COLORS[card.game] || '#888';
  const dims = size === 'xs' ? { w: 36, h: 50 }
             : size === 'sm' ? { w: 48, h: 67 }
             : size === 'md' ? { w: 120, h: 168 }
             : size === 'lg' ? { w: 200, h: 280 }
             : size === 'xl' ? { w: 280, h: 392 }
             : { w: 160, h: 224 };

  const ref = React.useRef(null);
  const onMove = (e) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 16;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -12;
    ref.current.style.setProperty('--rx', x + 'deg');
    ref.current.style.setProperty('--ry', y + 'deg');
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty('--rx', '0deg');
    ref.current.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      className={tilt ? "sleeve sleeve-tilt" : "sleeve"}
      onMouseMove={tilt ? onMove : undefined}
      onMouseLeave={tilt ? onLeave : undefined}
      style={{
        width: dims.w + 8, height: dims.h + 8,
        flexShrink: 0,
        ...style,
      }}>
      <div className="card-art-placeholder" style={{
        width: '100%', height: '100%',
        '--art-color': color,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Inner frame */}
        <div style={{
          position: 'absolute', inset: '5%',
          display: 'flex', flexDirection: 'column',
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 3,
        }}>
          {/* Name bar */}
          <div style={{
            padding: '4% 6%',
            fontFamily: 'var(--font-sans)',
            fontSize: Math.max(7, dims.w * 0.055),
            fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.008em',
            borderBottom: `1px solid color-mix(in srgb, ${color} 40%, rgba(255,255,255,0.12))`,
            lineHeight: 1.1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 35%, transparent), transparent)`,
          }}>
            {card.name}
          </div>
          {/* Art window */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(circle at 28% 30%, color-mix(in srgb, ${color} 60%, transparent) 0, transparent 55%),
                radial-gradient(circle at 72% 75%, color-mix(in srgb, ${color} 40%, transparent) 0, transparent 50%)
              `,
            }} />
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            }}>
              <svg width={dims.w * 0.42} height={dims.w * 0.42} viewBox="0 0 24 24" fill="none"
                   stroke="rgba(255,255,255,0.85)" strokeWidth="1.1" opacity="0.9">
                {card.game === 'magic' && <path d="M12 2 L4 8 L4 16 L12 22 L20 16 L20 8 Z"/>}
                {card.game === 'pokemon' && <><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.9)"/></>}
                {card.game === 'yugioh' && <><polygon points="12,2 22,12 12,22 2,12"/><circle cx="12" cy="12" r="4"/></>}
                {card.game === 'lorcana' && <><path d="M12 3 C 7 3 3 7 3 12 C 3 17 7 21 12 21 C 17 21 21 17 21 12"/><path d="M8 12 C 10 10 14 10 16 12"/></>}
              </svg>
            </div>
          </div>
          {/* Set line */}
          <div style={{
            padding: '3% 6% 4%',
            fontFamily: 'var(--font-mono)',
            fontSize: Math.max(6, dims.w * 0.05),
            fontWeight: 500,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            borderTop: `1px solid color-mix(in srgb, ${color} 30%, rgba(255,255,255,0.08))`,
          }}>
            {card.set} · {card.num}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────
function Button({ children, variant = 'default', size = 'md', icon, iconRight, onClick, disabled, style = {}, fullWidth, ...rest }) {
  const variants = {
    default:     { bg: 'var(--surface)',        color: 'var(--ink)',        border: 'var(--rule-strong)', hoverBg: 'var(--bg-sunk)', hoverBorder: 'var(--ink-3)' },
    primary:     { bg: 'var(--accent-hot)',     color: 'var(--accent-hot-ink)', border: 'var(--accent-hot)', hoverBg: 'var(--accent-hot-hi)', hoverBorder: 'var(--accent-hot-hi)' },
    ink:         { bg: 'var(--ink)',            color: 'var(--bg)',         border: 'var(--ink)',         hoverBg: 'var(--ink-2)', hoverBorder: 'var(--ink-2)' },
    ghost:       { bg: 'transparent',           color: 'var(--ink-2)',      border: 'transparent',        hoverBg: 'var(--bg-sunk)', hoverBorder: 'transparent' },
    outline:     { bg: 'transparent',           color: 'var(--ink)',        border: 'var(--rule-strong)', hoverBg: 'var(--surface)', hoverBorder: 'var(--ink-3)' },
    success:     { bg: 'color-mix(in srgb, var(--signal-green) 12%, transparent)', color: 'var(--signal-green)', border: 'color-mix(in srgb, var(--signal-green) 30%, transparent)', hoverBg: 'color-mix(in srgb, var(--signal-green) 20%, transparent)', hoverBorder: 'var(--signal-green)' },
    destructive: { bg: 'transparent',           color: 'var(--accent-hot)', border: 'color-mix(in srgb, var(--accent-hot) 30%, transparent)', hoverBg: 'color-mix(in srgb, var(--accent-hot) 8%, transparent)', hoverBorder: 'var(--accent-hot)' },
  };
  const sizes = {
    sm: { padding: '6px 10px', fontSize: 11, minHeight: 30, gap: 5 },
    md: { padding: '8px 14px', fontSize: 12.5, minHeight: 36, gap: 6 },
    lg: { padding: '10px 18px', fontSize: 13, minHeight: 42, gap: 8 },
  };
  const v = variants[variant] || variants.default;
  const s = sizes[size];

  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, padding: s.padding, minHeight: s.minHeight,
        fontSize: s.fontSize, fontWeight: 500,
        letterSpacing: '-0.005em',
        borderRadius: 'var(--radius)',
        background: hover && !disabled ? v.hoverBg : v.bg,
        color: v.color,
        border: `1px solid ${hover && !disabled ? v.hoverBorder : v.border}`,
        transition: 'background .15s, border-color .15s, transform .1s',
        whiteSpace: 'nowrap', width: fullWidth ? '100%' : 'auto',
        transform: hover && !disabled ? 'translateY(-0.5px)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.fontSize + 2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.fontSize + 2} />}
    </button>
  );
}

// ─── Empty state — bespoke per context ────────────────────────
function EmptyState({ icon = 'package', title, body, action, illustration }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 24px', textAlign: 'center',
    }}>
      {illustration || (
        <div style={{
          width: 72, height: 72, borderRadius: 16,
          background: 'var(--bg-sunk)',
          border: '1px solid var(--rule)',
          display: 'grid', placeItems: 'center',
          color: 'var(--ink-3)', marginBottom: 18,
        }}>
          <Icon name={icon} size={26} />
        </div>
      )}
      <div className="serif" style={{ fontSize: 28, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-0.02em' }}>{title}</div>
      {body && <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 380, lineHeight: 1.55 }}>{body}</div>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

Object.assign(window, { Icon, Avatar, GameChip, ConditionChip, StatusPill, CardArt, Button, EmptyState });
