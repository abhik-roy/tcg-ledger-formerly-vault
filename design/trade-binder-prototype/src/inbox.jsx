// src/inbox.jsx — Editorial offers ledger (incoming + outgoing + settled)

const IN_D = window.TCGData;

function OffersInbox({ currentUser, onOpenListing, onMakeCounter }) {
  const [tab, setTab] = React.useState('incoming');

  const myListings = IN_D.HOLDINGS.filter(h => h.userId === currentUser.id).map(h => h.id);
  const incoming = IN_D.OFFERS.filter(o => myListings.includes(o.holdingId)).sort((a, b) => b.createdAt - a.createdAt);
  const outgoing = IN_D.OFFERS.filter(o => o.offerUserId === currentUser.id).sort((a, b) => b.createdAt - a.createdAt);
  const settled  = IN_D.OFFERS.filter(o => (myListings.includes(o.holdingId) || o.offerUserId === currentUser.id) &&
                     (o.status === 'accepted' || o.status === 'declined' || o.status === 'withdrawn'))
                    .sort((a, b) => b.createdAt - a.createdAt);

  const pendingIn = incoming.filter(o => o.status === 'pending').length;
  const pendingOut = outgoing.filter(o => o.status === 'pending').length;
  const accepted = IN_D.OFFERS.filter(o => o.status === 'accepted' &&
                     (myListings.includes(o.holdingId) || o.offerUserId === currentUser.id)).length;

  const tabs = [
    { id: 'incoming', label: 'Incoming', count: pendingIn, data: incoming },
    { id: 'outgoing', label: 'Sent',     count: pendingOut, data: outgoing },
    { id: 'settled',  label: 'Settled',  count: settled.length, data: settled },
  ];
  const active = tabs.find(t => t.id === tab);

  return (
    <div style={{ padding: '32px 48px 80px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Masthead */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Ledger · Offers in flight</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 54, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 0.95 }}>
          The <span className="serif-italic">ledger</span>.
        </h1>
        <div style={{ display: 'flex', gap: 40, marginTop: 20, fontSize: 12 }}>
          <LedgerStat n={pendingIn}   label="incoming pending" accent={pendingIn > 0} />
          <LedgerStat n={pendingOut}  label="sent, awaiting reply" />
          <LedgerStat n={accepted}    label="trades closed" />
          <LedgerStat n="7h"          label="your avg reply" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--rule)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 18px', position: 'relative',
            color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
            fontSize: 12, fontWeight: 500,
            fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {t.label}
            {t.count > 0 && (
              <span className="mono" style={{
                fontSize: 9.5, padding: '2px 6px', borderRadius: 3,
                background: tab === t.id ? 'var(--accent-hot)' : 'var(--rule)',
                color: tab === t.id ? '#fff' : 'var(--ink-3)',
                letterSpacing: '0.04em',
              }}>{t.count}</span>
            )}
            {tab === t.id && (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: 'var(--ink)' }} />
            )}
          </button>
        ))}
      </div>

      {active.data.length === 0 ? (
        <InboxEmpty tab={tab} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {active.data.map((o, i) => (
            <InboxRow key={o.id} offer={o} idx={i}
              direction={tab === 'incoming' ? 'in' : tab === 'outgoing' ? 'out' : (myListings.includes(o.holdingId) ? 'in' : 'out')}
              onOpen={() => onOpenListing(o.holdingId)}
              onCounter={() => onMakeCounter(o.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LedgerStat({ n, label, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <span className="serif" style={{
        fontSize: 28, letterSpacing: '-0.02em',
        color: accent ? 'var(--accent-hot)' : 'var(--ink)',
      }}>{n}</span>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function InboxRow({ offer, idx, direction, onOpen, onCounter }) {
  const holding = IN_D.HOLDINGS.find(h => h.id === offer.holdingId);
  const listingCard = IN_D.findCard(holding.cardId);
  const offerer = IN_D.findUser(offer.offerUserId);
  const listingOwner = IN_D.findUser(holding.userId);
  const otherUser = direction === 'in' ? offerer : listingOwner;

  const cashPart = offer.cashCents || 0;
  const cardsValue = (offer.cards || []).reduce((s, oc) => s + (IN_D.findCard(oc.cardId)?.market || 0) * oc.qty, 0);
  const offerTotal = cashPart + cardsValue;
  const askValue = holding.askType === 'trade_only' ? listingCard.market : holding.askValue;
  const deltaPct = askValue > 0 ? ((offerTotal - askValue) / askValue) * 100 : 0;

  const statusColors = {
    pending:   { c: 'var(--signal-amber)', label: 'Pending' },
    accepted:  { c: 'var(--signal-green)', label: 'Accepted' },
    declined:  { c: 'var(--ink-3)',        label: 'Declined' },
    countered: { c: 'var(--accent-cool)',  label: 'Countered' },
    withdrawn: { c: 'var(--ink-3)',        label: 'Withdrawn' },
  };
  const sc = statusColors[offer.status];
  const cardCount = (offer.cards || []).reduce((s, c) => s + c.qty, 0);

  return (
    <div style={{
      padding: '18px 0', borderBottom: '1px solid var(--rule)',
      display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 20, alignItems: 'center',
    }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', paddingLeft: 4 }}>
        {String(idx + 1).padStart(2, '0')}
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
        <CardArt card={listingCard} size="sm" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span className="serif" style={{ fontSize: 18, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{listingCard.name}</span>
            <ConditionChip condition={holding.condition} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar user={otherUser} size={16} />
              <span style={{ color: 'var(--ink-2)' }}>
                {direction === 'in' ? <>{otherUser.displayName} offered you</> : <>you offered {listingOwner.displayName}</>}
              </span>
            </span>
            <span>·</span>
            <span className="mono" style={{ letterSpacing: '0.04em' }}>{IN_D.relTime(offer.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Economics */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Composition</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            {cashPart > 0 && <span className="price">{IN_D.usd(cashPart)}</span>}
            {cashPart > 0 && cardCount > 0 && <span style={{ color: 'var(--ink-3)' }}>+</span>}
            {cardCount > 0 && <span className="price">{cardCount} card{cardCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>vs ask</span>
          <span className="serif" style={{
            fontSize: 20, letterSpacing: '-0.02em',
            color: Math.abs(deltaPct) < 5 ? 'var(--signal-green)' :
                   deltaPct < -10 ? 'var(--accent-hot)' :
                   deltaPct > 15 ? 'var(--accent-cool)' : 'var(--ink)',
          }}>
            {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}<span style={{ fontSize: 13, color: 'var(--ink-3)' }}>%</span>
          </span>
        </div>
        <div className="badge" style={{
          color: sc.c,
          background: `color-mix(in srgb, ${sc.c} 10%, transparent)`,
          borderColor: `color-mix(in srgb, ${sc.c} 35%, transparent)`,
        }}>{sc.label}</div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {offer.status === 'pending' && direction === 'in' && (
          <Button variant="ghost" size="sm" icon="repeat" onClick={(e) => { e.stopPropagation(); onCounter(); }}>Counter</Button>
        )}
        <Button variant={offer.status === 'pending' && direction === 'in' ? 'primary' : 'ghost'} size="sm" onClick={onOpen} iconRight="arrow-right">
          {offer.status === 'pending' ? 'Review' : 'Open'}
        </Button>
      </div>
    </div>
  );
}

function InboxEmpty({ tab }) {
  const copy = {
    incoming: {
      eyebrow: 'Nothing in the tray',
      head: 'No offers yet.',
      body: 'List a card in your binder and offers will arrive here, sorted by how close they come to your ask.',
    },
    outgoing: {
      eyebrow: 'You haven\u2019t written one',
      head: 'No offers sent.',
      body: 'Find something in the binder. The first offer is the hardest — it gets easier.',
    },
    settled: {
      eyebrow: 'A blank ledger',
      head: 'Nothing settled yet.',
      body: 'Accepted, declined, and withdrawn offers will accumulate here as a record of everything you traded.',
    },
  }[tab];
  return (
    <div style={{
      padding: '80px 24px', textAlign: 'center',
      border: '1px dashed var(--rule-strong)', borderRadius: 'var(--radius)',
      background: 'var(--bg-sunk)',
    }}>
      <div className="eyebrow" style={{ marginBottom: 12, justifyContent: 'center', display: 'flex' }}>{copy.eyebrow}</div>
      <h2 className="serif-italic" style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.02em', marginBottom: 10 }}>
        {copy.head}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
        {copy.body}
      </p>
    </div>
  );
}

Object.assign(window, { OffersInbox });
