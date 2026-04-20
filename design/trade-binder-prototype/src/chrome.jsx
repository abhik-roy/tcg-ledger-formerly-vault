// src/chrome.jsx — Editorial sidebar + header, with persona switcher

function Sidebar({ activePage, onNav, currentUser, pendingIncoming, onThemeToggle, theme }) {
  const navGroups = [
    { label: 'I · Collection', items: [
      { id: 'dashboard',  icon: 'dashboard', label: 'Dashboard',    num: '01' },
      { id: 'collection', icon: 'library',   label: 'Collection',   num: '02' },
      { id: 'targets',    icon: 'target',    label: 'Targets',      num: '03' },
      { id: 'ledger',     icon: 'history',   label: 'Ledger',       num: '04' },
    ]},
    { label: 'II · Exchange', items: [
      { id: 'trades', icon: 'repeat', label: 'Trade Binder', num: '05', badge: pendingIncoming > 0 ? pendingIncoming : undefined },
    ]},
    { label: 'III · System', items: [
      { id: 'users',    icon: 'users',    label: 'Members', num: '06' },
      { id: 'settings', icon: 'settings', label: 'Settings', num: '07' },
    ]},
  ];

  return (
    <aside style={{
      width: 228, minWidth: 228, height: '100%',
      background: 'var(--bg)',
      borderRight: '1px solid var(--rule)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <div style={{
        padding: '22px 20px 18px', display: 'flex', alignItems: 'baseline', gap: 8,
        borderBottom: '1px solid var(--rule)',
      }}>
        <div className="serif" style={{ fontSize: 26, lineHeight: 0.9, letterSpacing: '-0.025em' }}>
          Binder<span style={{ color: 'var(--accent-hot)', fontStyle: 'italic' }}>.</span>
        </div>
        <div className="mono" style={{
          fontSize: 9, letterSpacing: '0.2em',
          color: 'var(--ink-3)', textTransform: 'uppercase',
        }}>
          v2.0
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '18px 12px', overflowY: 'auto' }}>
        {navGroups.map((g) => (
          <div key={g.label} style={{ marginBottom: 22 }}>
            <div className="section-label" style={{ padding: '0 10px 8px' }}>{g.label}</div>
            {g.items.map((item) => {
              const active = activePage === item.id;
              return (
                <button key={item.id} onClick={() => onNav(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%',
                    padding: '7px 10px', marginBottom: 1,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12.5, fontWeight: active ? 600 : 450,
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    background: active ? 'var(--surface)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px var(--rule-strong)' : 'none',
                    textAlign: 'left',
                    position: 'relative',
                    transition: 'background .12s, color .12s',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {active && <span style={{
                    position: 'absolute', left: -12, top: '50%',
                    width: 3, height: 16, marginTop: -8,
                    background: 'var(--accent-hot)', borderRadius: '0 2px 2px 0',
                  }} />}
                  <span className="sidebar-index" style={{ width: 18, color: active ? 'var(--ink-3)' : 'var(--ink-4)' }}>
                    {item.num}
                  </span>
                  <Icon name={item.icon} size={14} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge != null && (
                    <span className="mono" style={{
                      background: 'var(--accent-hot)', color: 'var(--accent-hot-ink)',
                      padding: '1px 6px', borderRadius: 999, fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.04em',
                    }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer — user + theme */}
      <div style={{ borderTop: '1px solid var(--rule)' }}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={currentUser} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.displayName}
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 1 }}>
              {currentUser.tradeCount} trades · ★ {currentUser.rating.toFixed(1)}
            </div>
          </div>
          <button onClick={onThemeToggle} style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
            display: 'grid', placeItems: 'center',
            color: 'var(--ink-3)', border: '1px solid var(--rule)',
          }} title={`Switch to ${theme === 'light' ? 'dark' : 'light'}`}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header({ title, subtitle, eyebrow, pendingIncoming, onBellClick, onUserSwitch, currentUser, users, actions }) {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  return (
    <header style={{
      minHeight: 68,
      borderBottom: '1px solid var(--rule)',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', padding: '14px 28px', gap: 16,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 20 }}>{title}</h1>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {actions}

      {/* Notifications */}
      <button onClick={onBellClick} style={{
        width: 34, height: 34, borderRadius: 'var(--radius-sm)', position: 'relative',
        display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
        border: '1px solid var(--rule)',
      }}>
        <Icon name="bell" size={15} />
        {pendingIncoming > 0 && (
          <span className="mono" style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
            background: 'var(--accent-hot)', color: 'var(--accent-hot-ink)',
            fontSize: 9, fontWeight: 600,
            display: 'grid', placeItems: 'center',
            border: '2px solid var(--bg)',
          }}>{pendingIncoming}</span>
        )}
      </button>

      {/* Persona switcher */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setUserMenuOpen((v) => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 10px 4px 4px', borderRadius: 999,
          background: 'var(--surface)',
          border: '1px solid var(--rule-strong)',
          height: 34,
        }} title="Switch persona (demo)">
          <Avatar user={currentUser} size={26} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>{currentUser.displayName.split(' ')[0]}</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            paddingLeft: 6, borderLeft: '1px solid var(--rule)',
            color: 'var(--ink-3)',
          }}>
            <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em' }}>DEMO</span>
            <Icon name="chevron-down" size={11} />
          </div>
        </button>

        {userMenuOpen && (
          <>
            <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div className="anim-slide" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320, background: 'var(--surface-hi)',
              border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)', padding: 6,
              zIndex: 50,
            }}>
              <div style={{ padding: '12px 12px 10px' }}>
                <div className="eyebrow">Demo · Switch persona</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
                  Swap who you're signed in as to see the trade from any side.
                </div>
              </div>
              {users.map((u) => {
                const isMe = u.id === currentUser.id;
                return (
                  <button key={u.id} onClick={() => { onUserSwitch(u.id); setUserMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      background: isMe ? 'var(--bg-sunk)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isMe) e.currentTarget.style.background = 'var(--bg-sunk)'; }}
                    onMouseLeave={(e) => { if (!isMe) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar user={u} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{u.displayName}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                        {u.tradeCount} trades · ★ {u.rating.toFixed(1)} · {u.location}
                      </div>
                    </div>
                    {isMe && <Icon name="check" size={14} color="var(--accent-hot)" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Header });
