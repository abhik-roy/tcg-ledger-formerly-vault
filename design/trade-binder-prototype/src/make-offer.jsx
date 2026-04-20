// src/make-offer.jsx — Editorial offer composer: cash + cards → their card

const MO_D = window.TCGData;

function MakeOfferModal({ holdingId, currentUser, onClose, onSubmit }) {
  const holding = MO_D.HOLDINGS.find(h => h.id === holdingId);
  const card = MO_D.findCard(holding.cardId);
  const owner = MO_D.findUser(holding.userId);
  const askValue = holding.askType === 'trade_only' ? card.market : holding.askValue;

  const [cash, setCash] = React.useState(0);
  const [selectedCards, setSelectedCards] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [step, setStep] = React.useState(1);
  const [hSearch, setHSearch] = React.useState('');

  const myHoldings = MO_D.HOLDINGS.filter(h => h.userId === currentUser.id && h.id !== holdingId);
  const filteredMyHoldings = myHoldings.filter(h => {
    if (!hSearch.trim()) return true;
    const c = MO_D.findCard(h.cardId);
    return c.name.toLowerCase().includes(hSearch.toLowerCase()) ||
           c.setName.toLowerCase().includes(hSearch.toLowerCase());
  });

  const totalFromCards = selectedCards.reduce((s, sc) => {
    const h = MO_D.HOLDINGS.find(hh => hh.id === sc.holdingId);
    return s + MO_D.findCard(h.cardId).market * sc.qty;
  }, 0);
  const offerTotal = totalFromCards + cash;
  const delta = offerTotal - askValue;
  const deltaPct = askValue > 0 ? (delta / askValue) * 100 : 0;

  const fairness = Math.abs(deltaPct) < 5 ? 'fair' : deltaPct < -10 ? 'low' : deltaPct > 15 ? 'over' : deltaPct < 0 ? 'under' : 'slight-over';
  const fairnessMeta = {
    'fair':       { c: 'var(--signal-green)', label: 'Fair trade',    body: 'Within 5% of ask. These usually close fast.' },
    'under':      { c: 'var(--signal-amber)', label: 'Below ask',     body: 'A short note explaining why helps these land.' },
    'low':        { c: 'var(--accent-hot)',   label: 'Lowball',       body: 'More than 10% below. Owners often decline silently.' },
    'slight-over':{ c: 'var(--accent-cool)',  label: 'Slightly over', body: 'A touch over ask — likely to close quickly.' },
    'over':       { c: 'var(--accent-cool)',  label: 'Over ask',      body: 'Generous. Expect a quick yes.' },
  }[fairness];

  const addHolding = (h) => {
    setSelectedCards(prev => {
      const existing = prev.find(p => p.holdingId === h.id);
      if (existing) return prev.map(p => p.holdingId === h.id ? { ...p, qty: Math.min(p.qty + 1, h.qty) } : p);
      return [...prev, { holdingId: h.id, qty: 1 }];
    });
  };
  const removeHolding = (hId) => setSelectedCards(prev => prev.filter(p => p.holdingId !== hId));
  const setQty = (hId, qty) => {
    const h = MO_D.HOLDINGS.find(hh => hh.id === hId);
    qty = Math.max(1, Math.min(qty, h.qty));
    setSelectedCards(prev => prev.map(p => p.holdingId === hId ? { ...p, qty } : p));
  };

  const canSubmit = selectedCards.length > 0 || cash > 0;

  return (
    <ModalShell onClose={onClose} width={1080}>
      {/* Header */}
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{step === 1 ? 'Compose — Step 01 of 02' : 'Review — Step 02 of 02'}</div>
          <h1 style={{ fontSize: 18, marginTop: 4 }}>
            Offer on <span className="serif-italic" style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{card.name}</span>
          </h1>
        </div>
        <StepDots step={step} total={2} />
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', border: '1px solid var(--rule)' }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      {step === 1 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: 560, maxHeight: 'calc(100vh - 200px)' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--rule)', minHeight: 0 }}>
            {/* Cash */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--rule)' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Cash · in escrow</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span className="serif" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 22 }}>$</span>
                  <input type="number" min="0" step="5" value={cash || ''} onChange={(e) => setCash(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    style={{
                      width: '100%', height: 48, padding: '0 14px 0 32px',
                      background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)',
                      fontSize: 22, fontWeight: 500, fontFamily: 'var(--font-display)',
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--ink)',
                    }} />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 25, 50, 100, 250].map(v => (
                    <button key={v} onClick={() => setCash(v)} style={{
                      height: 48, padding: '0 12px', borderRadius: 'var(--radius-sm)',
                      background: cash === v ? 'var(--ink)' : 'transparent',
                      color: cash === v ? 'var(--bg)' : 'var(--ink-2)',
                      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
                      border: '1px solid ' + (cash === v ? 'var(--ink)' : 'var(--rule)'),
                    }}>{v === 0 ? 'NONE' : '$' + v}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="shield" size={11} color="var(--signal-green)" /> Held in escrow, released on confirmed delivery both ways.
              </div>
            </div>

            {/* Card picker */}
            <div style={{ padding: '16px 24px 10px', borderBottom: '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="eyebrow">Your collection</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  {selectedCards.length === 0 ? `${myHoldings.length} available` : `${selectedCards.length} added`}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
                  <Icon name="search" size={13} />
                </div>
                <input value={hSearch} onChange={(e) => setHSearch(e.target.value)} placeholder="Search your binder…"
                  style={{
                    width: '100%', height: 34, padding: '0 12px 0 34px',
                    background: 'var(--bg-sunk)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
                    fontSize: 12, color: 'var(--ink)',
                  }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 20px' }}>
              {filteredMyHoldings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)', fontSize: 12 }}>
                  No matching cards in your binder.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {filteredMyHoldings.map(h => {
                    const c = MO_D.findCard(h.cardId);
                    const selected = selectedCards.find(s => s.holdingId === h.id);
                    return (
                      <button key={h.id} onClick={() => selected ? removeHolding(h.id) : addHolding(h)}
                        style={{
                          display: 'flex', gap: 10, alignItems: 'center', padding: 10,
                          background: selected ? 'var(--surface)' : 'transparent',
                          border: '1px solid ' + (selected ? 'var(--ink)' : 'var(--rule)'),
                          borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer',
                          transition: 'border-color .12s, background .12s',
                        }}>
                        <CardArt card={c} size="xs" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 1 }}>
                            {c.set} · {h.condition} · ×{h.qty}
                          </div>
                          <div className="price" style={{ fontSize: 11, marginTop: 2 }}>{MO_D.usd(c.market)}</div>
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: 4,
                          background: selected ? 'var(--ink)' : 'transparent',
                          color: selected ? 'var(--bg)' : 'var(--ink-3)',
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                          border: '1px solid ' + (selected ? 'var(--ink)' : 'var(--rule-strong)'),
                        }}>
                          <Icon name={selected ? 'check' : 'plus'} size={12} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: summary ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-sunk)', minHeight: 0 }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--rule)' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>You want</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)' }}>
                <CardArt card={card} size="xs" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{card.set} · {holding.condition}</div>
                  <div className="price" style={{ fontSize: 11.5, marginTop: 2 }}>Ask · {MO_D.formatAsk(holding, card)}</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', minHeight: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>You give</div>
              {cash === 0 && selectedCards.length === 0 ? (
                <div style={{
                  padding: '28px 16px', textAlign: 'center',
                  border: '1px dashed var(--rule-strong)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', fontSize: 12,
                }}>
                  <div className="serif" style={{ fontSize: 22, color: 'var(--ink-2)', marginBottom: 4 }}>Empty</div>
                  Add cash, cards, or both.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cash > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 4, background: 'color-mix(in srgb, var(--signal-green) 15%, transparent)', color: 'var(--signal-green)', display: 'grid', placeItems: 'center' }}>
                        <Icon name="dollar" size={13} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="price" style={{ fontSize: 12.5, fontWeight: 500 }}>{MO_D.usd(cash)}</div>
                        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>Cash · escrow</div>
                      </div>
                      <button onClick={() => setCash(0)} style={{ color: 'var(--ink-3)' }}>
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  )}
                  {selectedCards.map(sc => {
                    const h = MO_D.HOLDINGS.find(hh => hh.id === sc.holdingId);
                    const c = MO_D.findCard(h.cardId);
                    return (
                      <div key={sc.holdingId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)' }}>
                        <CardArt card={c} size="xs" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{c.set} · {h.condition} · {MO_D.usd(c.market * sc.qty)}</div>
                        </div>
                        {h.qty > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--rule)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                            <button onClick={() => setQty(sc.holdingId, sc.qty - 1)} style={{ width: 22, height: 22, color: 'var(--ink-2)' }}>−</button>
                            <span className="mono" style={{ width: 20, textAlign: 'center', fontSize: 11 }}>{sc.qty}</span>
                            <button onClick={() => setQty(sc.holdingId, sc.qty + 1)} style={{ width: 22, height: 22, color: 'var(--ink-2)' }}>+</button>
                          </div>
                        )}
                        <button onClick={() => removeHolding(sc.holdingId)} style={{ color: 'var(--ink-3)' }}>
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--rule)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Their ask</span>
                <span className="price" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{MO_D.usd(askValue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your offer</span>
                <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>{MO_D.usd(offerTotal)}</span>
              </div>

              {canSubmit && (
                <div style={{
                  padding: 10, borderRadius: 'var(--radius-sm)',
                  background: `color-mix(in srgb, ${fairnessMeta.c} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${fairnessMeta.c} 25%, transparent)`,
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: fairnessMeta.c }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: fairnessMeta.c }}>{fairnessMeta.label}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginLeft: 'auto' }}>
                      {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{fairnessMeta.body}</div>
                </div>
              )}

              <Button variant="primary" fullWidth iconRight="arrow-right" onClick={() => setStep(2)} disabled={!canSubmit}>
                {canSubmit ? 'Review offer' : 'Add something to trade'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: 28 }}>
          <div className="eyebrow" style={{ marginBottom: 18, textAlign: 'center' }}>The exchange</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'stretch' }}>
            <SideSummary title="You send" user={currentUser} cash={cash} cards={selectedCards.map(sc => {
              const h = MO_D.HOLDINGS.find(hh => hh.id === sc.holdingId);
              return { card: MO_D.findCard(h.cardId), qty: sc.qty, condition: h.condition };
            })} total={offerTotal} />
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--ink)', color: 'var(--bg)',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="swap" size={20} />
              </div>
            </div>
            <SideSummary title="You receive" user={owner} cards={[{ card, qty: 1, condition: holding.condition }]} total={card.market} flip />
          </div>

          <div style={{ marginTop: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>A short note (optional)</div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hey ${owner.displayName.split(' ')[0]} — been hunting this one. Let me know if that works.`}
              style={{
                width: '100%', minHeight: 80,
                padding: '12px 14px', background: 'var(--bg-sunk)',
                border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
                fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-display)',
                fontStyle: 'italic', lineHeight: 1.5,
                resize: 'vertical',
              }} />
          </div>

          <div style={{
            marginTop: 16, padding: 14, borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-sunk)',
            border: '1px solid var(--rule)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <Icon name="shield" size={16} color="var(--signal-green)" />
            <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Ledger escrow.</span> Cards and cash ({MO_D.usd(cash)}) are locked when {owner.displayName.split(' ')[0]} accepts. Both sides ship with tracking within 3 days; funds release on confirmed delivery.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center' }}>
            <Button variant="ghost" icon="arrow-left" onClick={() => setStep(1)}>Back</Button>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon="send" onClick={() => onSubmit({ cash, selectedCards, message })}>
              Send offer
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function SideSummary({ title, user, cash, cards, total, flip }) {
  return (
    <div style={{
      padding: 16, background: 'var(--bg-sunk)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
      textAlign: flip ? 'right' : 'left',
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="eyebrow" style={{ justifyContent: flip ? 'flex-end' : 'flex-start', display: 'flex' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 12px', flexDirection: flip ? 'row-reverse' : 'row' }}>
        <Avatar user={user} size={30} />
        <div style={{ textAlign: flip ? 'right' : 'left' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{user.displayName}</div>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>★ {user.rating.toFixed(1)} · {user.tradeCount} trades</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {cash > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)', flexDirection: flip ? 'row-reverse' : 'row' }}>
            <div style={{ width: 26, height: 26, borderRadius: 4, background: 'color-mix(in srgb, var(--signal-green) 15%, transparent)', color: 'var(--signal-green)', display: 'grid', placeItems: 'center' }}>
              <Icon name="dollar" size={13} />
            </div>
            <div style={{ flex: 1, textAlign: flip ? 'right' : 'left' }}>
              <div className="price" style={{ fontSize: 12, fontWeight: 500 }}>{window.TCGData.usd(cash)}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>Escrow cash</div>
            </div>
          </div>
        )}
        {cards.map((ci, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)', flexDirection: flip ? 'row-reverse' : 'row' }}>
            <CardArt card={ci.card} size="xs" />
            <div style={{ flex: 1, minWidth: 0, textAlign: flip ? 'right' : 'left' }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ci.qty > 1 && `${ci.qty}× `}{ci.card.name}
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{ci.card.set} · {ci.condition}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--rule-strong)',
        display: 'flex', justifyContent: 'space-between',
        flexDirection: flip ? 'row-reverse' : 'row',
      }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</span>
        <span className="serif" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>{window.TCGData.usd(total)}</span>
      </div>
    </div>
  );
}

function StepDots({ step, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? 22 : 6, height: 4, borderRadius: 2,
          background: i + 1 <= step ? 'var(--accent-hot)' : 'var(--rule-strong)',
          transition: 'all .25s cubic-bezier(.2,.85,.25,1.05)',
        }} />
      ))}
    </div>
  );
}

Object.assign(window, { MakeOfferModal });
