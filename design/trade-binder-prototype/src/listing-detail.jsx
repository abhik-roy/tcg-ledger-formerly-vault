// src/listing-detail.jsx — The "hold the card" moment. Editorial detail view.

const { USERS: _U, HOLDINGS: _H, OFFERS: _O, findUser: fU, findCard: fC, formatAsk: fA, usd: _usd, relTime: _rt, GAME_COLORS: _GC } = window.TCGData;

function ListingDetail({ holdingId, currentUser, onClose, onMakeOffer, onAcceptOffer, onDeclineOffer, onCounter }) {
  const holding = _H.find(h => h.id === holdingId);
  if (!holding) return null;
  const card = fC(holding.cardId);
  const owner = fU(holding.userId);
  const offers = _O.filter(o => o.holdingId === holdingId).sort((a, b) => b.createdAt - a.createdAt);
  const isOwn = owner.id === currentUser.id;
  const myOffer = offers.find(o => o.offerUserId === currentUser.id);
  const color = _GC[card.game];

  return (
    <ModalShell onClose={onClose} width={1080}>
      <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', minHeight: 640 }}>
        {/* ── Left: held card, dark stage ─────────────────── */}
        <div style={{
          padding: '36px 32px 32px',
          background: `
            radial-gradient(ellipse at 50% 38%, color-mix(in srgb, ${color} 30%, #0a0a0c) 0%, #0a0a0c 65%),
            #0a0a0c
          `,
          color: '#fafafa',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Fine grain */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.015) 3px 4px)",
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Listing № {holdingId.slice(-5).toUpperCase()}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em' }}>
              {card.game === 'yugioh' ? 'YU-GI-OH' : card.game.toUpperCase()}
            </div>
          </div>

          {/* Card on stage */}
          <div style={{
            flex: 1, display: 'grid', placeItems: 'center',
            padding: '20px 0', position: 'relative',
            perspective: 1400,
          }}>
            <CardArt card={card} size="xl" tilt style={{
              filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))',
            }} />
          </div>

          {/* Card identity */}
          <div style={{ marginTop: 24, position: 'relative' }}>
            <div className="serif" style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: '-0.022em', color: '#fff' }}>
              {card.name}
            </div>
            <div className="mono" style={{
              fontSize: 10.5, letterSpacing: '0.14em', marginTop: 8,
              color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
            }}>
              {card.setName} · № {card.num} · {card.rarity}
            </div>

            <div style={{
              display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap',
            }}>
              <div style={{
                padding: '3px 9px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999,
                fontSize: 10, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {holding.condition}
              </div>
              {holding.foil && (
                <div style={{
                  padding: '3px 9px', border: '1px solid rgba(255,200,80,0.4)', borderRadius: 999,
                  fontSize: 10, color: 'rgb(255,200,80)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>Foil</div>
              )}
            </div>

            {holding.notes && (
              <div className="serif-italic" style={{
                marginTop: 20, paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,0.12)',
                fontSize: 16, lineHeight: 1.5,
                color: 'rgba(255,255,255,0.78)',
              }}>
                &ldquo;{holding.notes}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* ── Right: offer thread ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)' }}>
          {/* Header */}
          <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="eyebrow">
                {isOwn ? 'Your listing' : 'Offer thread'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <h1 style={{ fontSize: 18 }}>
                  {offers.length === 0 ? 'No offers yet' : `${offers.length} offer${offers.length > 1 ? 's' : ''}`}
                </h1>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  {offers.filter(o => o.status === 'pending').length} pending
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
              border: '1px solid var(--rule)',
            }}><Icon name="x" size={14} /></button>
          </div>

          {/* Price panel */}
          <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <div>
                <div className="stat-label">Ask</div>
                <div className="serif" style={{ fontSize: 26, lineHeight: 1, marginTop: 4, color: holding.askType === 'trade_only' ? 'var(--signal-green)' : 'var(--ink)' }}>
                  {fA(holding, card)}
                </div>
              </div>
              <div>
                <div className="stat-label">Market</div>
                <div className="serif" style={{ fontSize: 26, lineHeight: 1, marginTop: 4, color: 'var(--ink-2)' }}>
                  {_usd(card.market)}
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 4 }}>
                  30-DAY MEDIAN
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 20, display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar user={owner} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {owner.displayName}{isOwn && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · you</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                    ★ {owner.rating.toFixed(1)} · {owner.tradeCount} trades
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Offers list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
            {offers.length === 0 ? (
              <DetailEmpty isOwn={isOwn} owner={owner} onMakeOffer={onMakeOffer} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {offers.map(o => (
                  <OfferCard key={o.id} offer={o} holding={holding} card={card}
                    currentUser={currentUser}
                    viewAs={isOwn ? 'owner' : (o.offerUserId === currentUser.id ? 'mine' : 'other')}
                    onAccept={() => onAcceptOffer(o.id)}
                    onDecline={() => onDeclineOffer(o.id)}
                    onCounter={() => onCounter(o.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div style={{
            padding: '14px 22px', borderTop: '1px solid var(--rule)',
            background: 'var(--bg-sunk)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {isOwn ? (
              <>
                <div style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="info" size={12} /> Edit or unlist from your Collection.
                </div>
                <Button variant="outline" icon="pencil">Edit listing</Button>
              </>
            ) : myOffer ? (
              <>
                <div style={{ flex: 1, fontSize: 12 }}>
                  You have an active offer — <span style={{ color: 'var(--ink-3)' }}>revise it below.</span>
                </div>
                <Button variant="ghost" icon="x">Withdraw</Button>
                <Button variant="primary" icon="pencil" onClick={onMakeOffer}>Revise offer</Button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="shield" size={12} color="var(--signal-green)" />
                  Escrow-protected · both sides ship before release.
                </div>
                <Button variant="outline" icon="message">Message</Button>
                <Button variant="primary" icon="handshake" onClick={onMakeOffer}>Make an offer</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function DetailEmpty({ isOwn, owner, onMakeOffer }) {
  return (
    <div style={{ padding: '50px 24px 40px', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 18px',
        borderRadius: '50%', background: 'var(--bg-sunk)',
        border: '1px solid var(--rule)',
        display: 'grid', placeItems: 'center', color: 'var(--ink-3)',
      }}>
        <Icon name="inbox" size={22} />
      </div>
      <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
        {isOwn ? <>The binder is <span className="serif-italic">quiet</span>.</> : <>Be the <span className="serif-italic">first</span>.</>}
      </div>
      <p style={{ maxWidth: 340, margin: '8px auto 0', fontSize: 13, color: 'var(--ink-3)' }}>
        {isOwn
          ? 'Your listing is live. Offers from other collectors will land here.'
          : `No one has offered yet. Send a cash, card, or mixed offer to start the conversation with ${owner.displayName.split(' ')[0]}.`}
      </p>
      {!isOwn && (
        <div style={{ marginTop: 20 }}>
          <Button variant="primary" icon="handshake" onClick={onMakeOffer}>Open the offer composer</Button>
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer, holding, card, currentUser, viewAs, onAccept, onDecline, onCounter }) {
  const offerer = fU(offer.offerUserId);
  const status = offer.status;

  const cashPart = offer.cashCents || offer.cash || 0;
  const cardsOfferedValue = (offer.cards || []).reduce((s, oc) => s + (fC(oc.cardId)?.market || 0) * oc.qty, 0);
  const offeredTotal = cashPart + cardsOfferedValue;
  const askValue = holding.askType === 'trade_only' ? card.market : holding.askValue;
  const delta = offeredTotal - askValue;
  const deltaPct = askValue > 0 ? (delta / askValue) * 100 : 0;
  const fair = Math.abs(deltaPct) < 5;

  const deltaColor = fair ? 'var(--signal-green)' : deltaPct < 0 ? 'var(--accent-hot)' : 'var(--accent-cool)';
  const deltaLabel = fair ? 'Fair trade' : deltaPct < 0 ? `${deltaPct.toFixed(0)}% below ask` : `+${deltaPct.toFixed(0)}% over ask`;

  return (
    <div className="anim-slide" style={{
      background: 'var(--surface)',
      border: '1px solid ' + (viewAs === 'mine' ? 'color-mix(in srgb, var(--accent-hot) 35%, transparent)' : 'var(--rule)'),
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* Header strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <Avatar user={offerer} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {offerer.displayName}
            {viewAs === 'mine' && <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> · you</span>}
          </div>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 1 }}>
            {_rt(offer.createdAt)}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Trade diagram */}
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 36px 1fr', gap: 10, alignItems: 'stretch' }}>
        {/* They give */}
        <div style={{
          padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)',
          border: '1px solid var(--rule)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div className="stat-label" style={{ fontSize: 9 }}>They offer</div>
          {cashPart > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)' }}>
              <div style={{
                width: 26, height: 26, borderRadius: 4,
                background: 'color-mix(in srgb, var(--signal-green) 15%, transparent)',
                color: 'var(--signal-green)', display: 'grid', placeItems: 'center',
              }}>
                <Icon name="dollar" size={13} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="price" style={{ fontSize: 12.5, fontWeight: 500 }}>{_usd(cashPart)}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>Cash · escrow</div>
              </div>
            </div>
          )}
          {(offer.cards || []).map((oc, i) => {
            const c = fC(oc.cardId);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)' }}>
                <CardArt card={c} size="xs" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {oc.qty > 1 && <span style={{ color: 'var(--accent-hot)' }}>{oc.qty}× </span>}{c.name}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                    {c.set} · {oc.condition} · {_usd(c.market * oc.qty)}
                  </div>
                </div>
              </div>
            );
          })}
          {cashPart === 0 && (offer.cards || []).length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic', padding: 6 }}>—</div>
          )}
          <div style={{
            marginTop: 4, paddingTop: 8, borderTop: '1px dashed var(--rule)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span className="stat-label" style={{ fontSize: 9 }}>Value</span>
            <span className="price" style={{ fontSize: 13, fontWeight: 500 }}>{_usd(offeredTotal)}</span>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--bg)', border: '1px solid var(--rule-strong)',
            display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
          }}>
            <Icon name="swap" size={13} />
          </div>
        </div>

        {/* They get */}
        <div style={{
          padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius)',
          border: '1px solid var(--rule)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div className="stat-label" style={{ fontSize: 9 }}>For your</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rule)' }}>
            <CardArt card={card} size="xs" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                {card.set} · {holding.condition}
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            marginTop: 4, paddingTop: 8, borderTop: '1px dashed var(--rule)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span className="stat-label" style={{ fontSize: 9 }}>Market</span>
            <span className="price" style={{ fontSize: 13, fontWeight: 500 }}>{_usd(card.market)}</span>
          </div>
        </div>
      </div>

      {/* Delta bar */}
      <div style={{
        margin: '0 14px 14px', padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        background: `color-mix(in srgb, ${deltaColor} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${deltaColor} 25%, transparent)`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Icon name={fair ? 'check' : deltaPct < 0 ? 'trend-up' : 'trend-up'} size={13} color={deltaColor} />
        <span style={{ fontSize: 12, color: deltaColor, fontWeight: 500 }}>{deltaLabel}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginLeft: 'auto' }}>
          Δ {delta >= 0 ? '+' : ''}{_usd(delta)}
        </span>
      </div>

      {offer.message && (
        <div style={{ margin: '0 14px 14px', padding: '10px 12px', background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--ink-3)' }}>
          <div className="serif-italic" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            &ldquo;{offer.message}&rdquo;
          </div>
        </div>
      )}

      {/* Actions */}
      {status === 'pending' && viewAs === 'owner' && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderTop: '1px solid var(--rule)', background: 'var(--bg-sunk)' }}>
          <Button variant="ghost" size="sm" onClick={onDecline}>Decline</Button>
          <Button variant="outline" size="sm" icon="swap" onClick={onCounter}>Counter</Button>
          <div style={{ flex: 1 }} />
          <Button variant="primary" size="sm" icon="check" onClick={onAccept}>Accept trade</Button>
        </div>
      )}
      {status === 'pending' && viewAs === 'mine' && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderTop: '1px solid var(--rule)', alignItems: 'center', background: 'var(--bg-sunk)' }}>
          <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" /> Awaiting reply from {fU(holding.userId).displayName.split(' ')[0]}…
          </span>
          <Button variant="ghost" size="sm">Withdraw</Button>
          <Button variant="outline" size="sm" icon="pencil">Revise</Button>
        </div>
      )}
    </div>
  );
}

function ModalShell({ children, onClose, width = 880 }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="anim-fade" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,10,11,0.55)',
      backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center',
      padding: 24, overflow: 'auto',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="anim-pop" style={{
        width: '100%', maxWidth: width,
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-2xl)',
        overflow: 'hidden',
        border: '1px solid var(--rule-strong)',
        maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { ListingDetail, ModalShell });
