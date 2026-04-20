// src/create-listing.jsx — Editorial listing composer

const CL_D = window.TCGData;

function CreateListingModal({ currentUser, onClose, onSubmit, prefillHoldingId }) {
  const available = CL_D.HOLDINGS.filter(h => h.userId === currentUser.id && !h.listed);
  const pool = available.length > 0 ? available : CL_D.HOLDINGS.filter(h => h.userId === currentUser.id);

  const [selected, setSelected] = React.useState(prefillHoldingId || (pool[0]?.id));
  const [askType, setAskType] = React.useState('cash');
  const [askPrice, setAskPrice] = React.useState(0);
  const [percent, setPercent] = React.useState(95);
  const [notes, setNotes] = React.useState('');
  const [search, setSearch] = React.useState('');

  const holding = CL_D.HOLDINGS.find(h => h.id === selected);
  const card = holding ? CL_D.findCard(holding.cardId) : null;

  React.useEffect(() => {
    if (card) setAskPrice(Math.round(card.market));
  }, [selected]);

  const filtered = pool.filter(h => {
    if (!search.trim()) return true;
    const c = CL_D.findCard(h.cardId);
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.setName.toLowerCase().includes(q);
  });

  const askValue = askType === 'cash' ? askPrice : askType === 'percent' ? (card ? Math.round(card.market * percent / 100) : 0) : 0;

  return (
    <ModalShell onClose={onClose} width={960}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">Edition 01 · New listing</div>
          <h1 style={{ fontSize: 20, marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 400 }}>
            Put a card <span className="serif-italic">on the shelf</span>
          </h1>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', border: '1px solid var(--rule)' }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 520, maxHeight: 'calc(100vh - 200px)' }}>
        {/* Left: pick */}
        <div style={{ padding: 20, borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-sunk)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>From your collection</div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
              <Icon name="search" size={13} />
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your binder…"
              style={{
                width: '100%', height: 34, padding: '0 12px 0 34px',
                background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
                fontSize: 12, color: 'var(--ink)',
              }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.map(h => {
              const c = CL_D.findCard(h.cardId);
              const active = selected === h.id;
              return (
                <button key={h.id} onClick={() => setSelected(h.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                    background: active ? 'var(--surface)' : 'transparent',
                    border: '1px solid ' + (active ? 'var(--ink)' : 'transparent'),
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <CardArt card={c} size="xs" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{c.set} · {h.condition} · ×{h.qty}</div>
                  </div>
                  {h.listed && <span className="badge" style={{ color: 'var(--signal-amber)', background: 'color-mix(in srgb, var(--signal-amber) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--signal-amber) 30%, transparent)' }}>Listed</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: form */}
        {holding && card ? (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Preview */}
              <div style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--bg-sunk)', borderRadius: 'var(--radius)', border: '1px solid var(--rule)' }}>
                <CardArt card={card} size="sm" />
                <div style={{ flex: 1 }}>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>The card</div>
                  <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{card.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 3, textTransform: 'uppercase' }}>{card.setName} · №{card.num}</div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                    <div>
                      <div className="eyebrow">Market</div>
                      <div className="price" style={{ fontSize: 15, marginTop: 2 }}>{CL_D.usd(card.market)}</div>
                    </div>
                    <div>
                      <div className="eyebrow">Condition</div>
                      <div style={{ marginTop: 4 }}><ConditionChip condition={holding.condition} /></div>
                    </div>
                    <div>
                      <div className="eyebrow">On hand</div>
                      <div className="price" style={{ fontSize: 15, marginTop: 2 }}>×{holding.qty}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ask type */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>What are you asking?</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { v: 'cash',       icon: 'dollar',   title: 'Fixed cash',  sub: 'A specific number' },
                    { v: 'percent',    icon: 'trend-up', title: 'Market %',    sub: 'Follows TCG price' },
                    { v: 'trade_only', icon: 'swap',     title: 'Trade only',  sub: 'Cards for cards' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => setAskType(opt.v)}
                      style={{
                        padding: 14, borderRadius: 'var(--radius-sm)', textAlign: 'left',
                        background: askType === opt.v ? 'var(--surface)' : 'transparent',
                        border: '1px solid ' + (askType === opt.v ? 'var(--ink)' : 'var(--rule)'),
                        cursor: 'pointer',
                      }}>
                      <Icon name={opt.icon} size={16} color={askType === opt.v ? 'var(--accent-hot)' : 'var(--ink-3)'} />
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8, fontFamily: 'var(--font-display)' }}>{opt.title}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ask value */}
              {askType === 'cash' && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Cash ask</div>
                  <div style={{ position: 'relative' }}>
                    <span className="serif" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 22 }}>$</span>
                    <input type="number" min="0" value={askPrice} onChange={(e) => setAskPrice(Math.max(0, Number(e.target.value) || 0))}
                      style={{
                        width: '100%', height: 52, padding: '0 14px 0 32px',
                        background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)',
                        fontSize: 24, fontWeight: 500, fontFamily: 'var(--font-display)',
                        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--ink)',
                      }} />
                  </div>
                  {askPrice > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
                      Market is <span className="price" style={{ color: 'var(--ink-2)' }}>{CL_D.usd(card.market)}</span>. Your ask is{' '}
                      <span style={{ color: askPrice > card.market ? 'var(--accent-cool)' : askPrice < card.market * 0.9 ? 'var(--accent-hot)' : 'var(--signal-green)', fontWeight: 600 }}>
                        {((askPrice / card.market - 1) * 100).toFixed(1)}% {askPrice >= card.market ? 'above' : 'below'} market
                      </span>.
                    </div>
                  )}
                </div>
              )}

              {askType === 'percent' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="eyebrow">Percent of market</span>
                    <span className="serif" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>
                      {percent}<span style={{ color: 'var(--ink-3)', fontSize: 14 }}>%</span>
                    </span>
                  </div>
                  <input type="range" min="70" max="130" step="1" value={percent} onChange={(e) => setPercent(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-hot)' }} />
                  <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.06em' }}>
                    <span>70%</span><span>MARKET</span><span>130%</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10 }}>
                    At current market, your ask is <span className="price">{CL_D.usd(card.market * percent / 100)}</span>.
                  </div>
                </div>
              )}

              {askType === 'trade_only' && (
                <div style={{
                  padding: 16, borderRadius: 'var(--radius)',
                  background: 'color-mix(in srgb, var(--accent-cool) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-cool) 25%, transparent)',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <Icon name="swap" size={18} color="var(--accent-cool)" />
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Trade-only.</span> Incoming offers must include cards of roughly equivalent market value. You can still decline anything.
                  </div>
                </div>
              )}

              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Wants list · Optional</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Chasing Scooby-Doo from Lorcana, vintage Charizards, or anything Bloodborne-adjacent…"
                  style={{
                    width: '100%', minHeight: 72, padding: '10px 14px',
                    background: 'var(--bg-sunk)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
                    fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-display)',
                    fontStyle: 'italic', lineHeight: 1.5, resize: 'vertical',
                  }} />
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
              <div style={{ flex: 1, fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="info" size={11} /> You can edit or retract anytime from your collection.
              </div>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" icon="check" onClick={() => onSubmit({ holdingId: selected, askType, askValue, notes })}>
                Publish listing
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Pick a card to continue.
          </div>
        )}
      </div>
    </ModalShell>
  );
}

Object.assign(window, { CreateListingModal });
