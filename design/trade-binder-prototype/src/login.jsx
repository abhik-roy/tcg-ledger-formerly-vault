// src/login.jsx — Editorial login, fluid motion, ambient gradient

function LoginScreen({ users, onSignIn }) {
  const [selectedId, setSelectedId] = React.useState(users[0]?.id);
  const [focused, setFocused] = React.useState(false);
  const [passphrase, setPassphrase] = React.useState('');
  const [signingIn, setSigningIn] = React.useState(false);

  const selected = users.find((u) => u.id === selectedId);

  const handleSignIn = () => {
    setSigningIn(true);
    setTimeout(() => onSignIn(selectedId), 900);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'grid', gridTemplateColumns: '1.15fr 1fr',
      overflow: 'hidden',
      color: 'var(--ink)',
    }}>
      {/* ── Left: ambient stage ───────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRight: '1px solid var(--rule)',
        background: 'var(--bg-sunk)',
      }}>
        <div className="aurora" />

        {/* top masthead */}
        <div style={{
          position: 'absolute', top: 32, left: 40, right: 40,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          zIndex: 2,
        }}>
          <div className="serif" style={{ fontSize: 28, letterSpacing: '-0.025em', lineHeight: 0.9 }}>
            Binder<span style={{ color: 'var(--accent-hot)', fontStyle: 'italic' }}>.</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Edition 12 · Winter
          </div>
        </div>

        {/* centerpiece card cascade */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', placeItems: 'center',
          perspective: 1400,
          zIndex: 1,
        }}>
          <div style={{ position: 'relative', width: 440, height: 460 }} className="anim-page">
            <FanCard offset={-2} hue={220} delay={0.0} />
            <FanCard offset={-1} hue={12}  delay={0.08} />
            <FanCard offset={0}  hue={280} delay={0.16} primary />
            <FanCard offset={1}  hue={160} delay={0.24} />
            <FanCard offset={2}  hue={45}  delay={0.32} />
          </div>
        </div>

        {/* Floating tagline */}
        <div style={{
          position: 'absolute', bottom: 40, left: 40, right: 40,
          zIndex: 2, display: 'flex', alignItems: 'flex-end', gap: 24,
        }} className="anim-slide" >
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Since 2022 · 41,230 trades closed</div>
            <div className="serif" style={{
              fontSize: 'clamp(30px, 3vw, 44px)', lineHeight: 1.05, letterSpacing: '-0.025em',
              maxWidth: 460,
            }}>
              Every card has a <span className="serif-italic" style={{ color: 'var(--accent-hot)' }}>story</span>.<br/>
              The ledger remembers it.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 26, fontSize: 11 }}>
            <HeroStat n="41.2k" label="trades" />
            <HeroStat n="98.4%" label="settled" />
            <HeroStat n="0" label="disputes open" />
          </div>
        </div>
      </div>

      {/* ── Right: sign-in form ───────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'auto',
      }}>
        {/* top right meta */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="anim-fade">
          <div className="mono" style={{
            fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="live-dot" /> Ledger · synced 2s ago
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 440 }} className="anim-page">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Sign in · No. 01</div>

          <h1 className="serif" style={{
            fontSize: 'clamp(40px, 4.2vw, 60px)',
            fontWeight: 400, letterSpacing: '-0.03em',
            lineHeight: 0.95, marginBottom: 16,
          }}>
            Welcome<br/>
            <span className="serif-italic flow-text">back to the binder.</span>
          </h1>

          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 34, maxWidth: 380 }}>
            Sign in to see what's new in the binder, review offers on your cards, and settle open trades.
          </p>

          {/* Persona selector */}
          <div style={{ marginBottom: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Choose a persona · demo</div>
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {users.map((u) => {
                const active = u.id === selectedId;
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px',
                      borderRadius: 'var(--radius)',
                      background: active ? 'var(--surface)' : 'transparent',
                      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule)'),
                      textAlign: 'left',
                      transition: 'background .25s cubic-bezier(.2,.85,.25,1.05), border-color .2s, transform .25s',
                      transform: active ? 'translateX(3px)' : 'translateX(0)',
                      boxShadow: active ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {active && <span style={{
                      position: 'absolute', left: -12, top: '50%',
                      width: 4, height: 20, marginTop: -10,
                      background: 'var(--accent-hot)', borderRadius: '0 2px 2px 0',
                      animation: 'stagger-in .4s cubic-bezier(.2,.85,.25,1.05) both',
                    }} />}
                    <Avatar user={u} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{u.displayName}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 3 }}>
                        {u.tradeCount} trades · ★ {u.rating.toFixed(1)} · {u.location}
                      </div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-strong)'),
                      background: active ? 'var(--ink)' : 'transparent',
                      display: 'grid', placeItems: 'center',
                      transition: 'all .2s',
                    }}>
                      {active && <Icon name="check" size={10} color="var(--bg)" stroke={2.4} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passphrase */}
          <div style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Passphrase</div>
            <div style={{
              position: 'relative',
              border: '1px solid ' + (focused ? 'var(--ink)' : 'var(--rule-strong)'),
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              transition: 'border-color .2s, box-shadow .2s',
              boxShadow: focused ? '0 0 0 4px color-mix(in srgb, var(--ink) 8%, transparent)' : 'none',
            }}>
              <input
                type="password"
                value={passphrase}
                placeholder="•  •  •  •  •  •  •  •"
                onChange={(e) => setPassphrase(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                style={{
                  width: '100%', height: 46, padding: '0 48px 0 14px',
                  background: 'transparent', border: 0,
                  fontSize: 15, letterSpacing: '0.1em',
                  color: 'var(--ink)', fontFamily: 'var(--font-mono)',
                }}
              />
              <div style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
              }}>
                <Icon name="shield" size={15} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>
              <span>Demo · any passphrase signs you in.</span>
              <a href="#" style={{ color: 'var(--ink-2)' }}>Forgot?</a>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{
              width: '100%', height: 52,
              background: signingIn ? 'var(--accent-hot-hi)' : 'var(--ink)',
              color: 'var(--bg)',
              border: '1px solid ' + (signingIn ? 'var(--accent-hot-hi)' : 'var(--ink)'),
              borderRadius: 'var(--radius)',
              fontSize: 14, fontWeight: 500, letterSpacing: '-0.005em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: signingIn ? 'wait' : 'pointer',
              transition: 'background .3s cubic-bezier(.2,.85,.25,1.05), transform .1s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseDown={(e) => !signingIn && (e.currentTarget.style.transform = 'scale(.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {signingIn ? (
              <>
                <SpinnerDots />
                <span>Opening the binder…</span>
              </>
            ) : (
              <>
                Enter the binder
                <Icon name="arrow-right" size={16} stroke={2} />
              </>
            )}
          </button>

          <div style={{
            marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--rule)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--ink-3)',
          }}>
            <span>New here? <a href="#" style={{ color: 'var(--ink)' }}>Request an invite</a></span>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em' }}>{selected?.location}</span>
          </div>
        </div>

        {/* footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 10.5, color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
        }}>
          <span>© Binder Ledger Co.</span>
          <span>Escrowed · Insured · Audited</span>
        </div>
      </div>
    </div>
  );
}

// Small components ───────────────────────────────────────

function FanCard({ offset, hue, delay, primary }) {
  const deg = offset * 8;
  const x = offset * 44;
  const y = Math.abs(offset) * 14;
  const z = primary ? 1 : 0;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      width: 220, height: 308,
      marginLeft: -110, marginTop: -154,
      transform: `translate(${x}px, ${y}px) rotateZ(${deg}deg) rotateY(${offset * -2}deg)`,
      transformOrigin: 'center 85%',
      zIndex: primary ? 10 : 5 - Math.abs(offset),
      borderRadius: 14,
      background: `linear-gradient(145deg, hsl(${hue}, 18%, 14%) 0%, hsl(${hue}, 22%, 8%) 100%)`,
      boxShadow: primary
        ? '0 30px 60px -20px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.1)'
        : '0 12px 24px -8px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.04)',
      animation: `card-lift .8s cubic-bezier(.15,.85,.25,1.05) both ${delay}s, fan-float 8s ease-in-out infinite alternate ${delay}s`,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 10,
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,.1)',
        background: `
          radial-gradient(ellipse at 30% 20%, hsla(${hue}, 70%, 60%, .45) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 85%, hsla(${hue}, 60%, 40%, .35) 0%, transparent 55%)
        `,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '8px 12px',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
          color: 'rgba(255,255,255,.9)', letterSpacing: '-0.01em',
          borderBottom: '1px solid rgba(255,255,255,.12)',
          background: `linear-gradient(180deg, hsla(${hue}, 70%, 50%, .3), transparent)`,
        }}>
          {['Blacklotus', 'Pikachu · Illustrator', 'Dark Magician', 'Ursula Holo', 'Serra Angel'][Math.abs(offset) % 5] || 'Foil'}
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <svg width="70" height="70" viewBox="0 0 24 24" fill="none"
               stroke="rgba(255,255,255,.85)" strokeWidth="1" opacity="0.9">
            <path d="M12 2 L4 8 L4 16 L12 22 L20 16 L20 8 Z"/>
          </svg>
        </div>
        <div style={{
          padding: '6px 12px',
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
          color: 'rgba(255,255,255,.55)', textTransform: 'uppercase',
          borderTop: '1px solid rgba(255,255,255,.08)',
        }}>
          {['LEA · 001', 'PRO · P05', 'LOB · 000', 'ROF · 188', '2ED · 021'][Math.abs(offset) % 5]}
        </div>
      </div>
      {/* foil sheen */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,.13) 50%, transparent 60%)',
        mixBlendMode: 'screen',
      }} />
    </div>
  );
}

function HeroStat({ n, label }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1 }}>{n}</div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SpinnerDots() {
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--bg)',
          animation: `pulse-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
          opacity: 0.85,
        }} />
      ))}
    </div>
  );
}

// Inject fan-float keyframe once
(function injectLoginKF() {
  if (document.getElementById('login-kf')) return;
  const s = document.createElement('style');
  s.id = 'login-kf';
  s.textContent = `
    @keyframes fan-float {
      0%   { transform: translate(var(--fx, 0), var(--fy, 0)) rotateZ(var(--fr, 0deg)); }
      100% { transform: translate(0, -6px) rotateZ(0deg); }
    }
  `;
  document.head.appendChild(s);
})();

Object.assign(window, { LoginScreen });
