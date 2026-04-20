// src/marketplace.jsx — Trade Binder: editorial hero + listings

const { USERS, HOLDINGS, OFFERS, findUser, findCard, formatAsk, usd, relTime, GAME_COLORS } = window.TCGData;

function Marketplace({ currentUser, onOpenListing, onCreateListing, layout, density }) {
  const [search, setSearch] = React.useState('');
  const [gameFilter, setGameFilter] = React.useState('all');
  const [conditionFilter, setConditionFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('new');
  const [onlyTradable, setOnlyTradable] = React.useState(false);

  const listings = React.useMemo(() => {
    return HOLDINGS.filter(h => h.listed && h.listedQty > 0).map(h => {
      const owner = findUser(h.userId);
      const card  = findCard(h.cardId);
      const listingOffers = OFFERS.filter(o => o.holdingId === h.id && o.status === 'pending');
      const myOffer = listingOffers.find(o => o.offerUserId === currentUser.id);
      return { holding: h, owner, card, offers: listingOffers, myOffer };
    });
  }, [currentUser.id]);

  const filtered = React.useMemo(() => {
    let r = listings;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l =>
        l.card.name.toLowerCase().includes(q) ||
        l.card.setName.toLowerCase().includes(q) ||
        l.owner.displayName.toLowerCase().includes(q)
      );
    }
    if (gameFilter !== 'all') r = r.filter(l => l.card.game === gameFilter);
    if (conditionFilter !== 'all') r = r.filter(l => l.holding.condition === conditionFilter);
    if (onlyTradable) r = r.filter(l => l.holding.askType === 'trade_only' || l.holding.askType === 'percent');

    r = [...r].sort((a, b) => {
      if (sortBy === 'price-high') return b.card.market - a.card.market;
      if (sortBy === 'price-low')  return a.card.market - b.card.market;
      if (sortBy === 'offers')     return b.offers.length - a.offers.length;
      return 0;
    });
    return r;
  }, [listings, search, gameFilter, conditionFilter, onlyTradable, sortBy]);

  const stats = {
    total: listings.length,
    totalValue: listings.reduce((s, l) => s + l.card.market, 0),
    games: new Set(listings.map(l => l.card.game)).size,
    myListings: listings.filter(l => l.owner.id === currentUser.id).length,
    myOffers: listings.filter(l => l.myOffer).length,
  };

  // Hero feature = highest-value listing not yours
  const feature = React.useMemo(() => {
    const others = filtered.filter(l => l.owner.id !== currentUser.id);
    return [...others].sort((a, b) => b.card.market - a.card.market)[0] || filtered[0];
  }, [filtered, currentUser.id]);

  return (
    <div style={{ padding: '0 0 48px', maxWidth: 1440, margin: '0 auto' }}>
      {/* ── Editorial masthead ─────────────────────────── */}
      <section style={{
        padding: '36px 32px 28px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'end' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Issue № {String(new Date().getMonth() + 1).padStart(2, '0')} · The Trading Floor
            </div>
            <h1 className="display-xl serif" style={{ margin: 0 }}>
              Cards <span className="serif-italic">open</span> for<br/>trade, today.
            </h1>
            <p style={{ marginTop: 18, maxWidth: 520, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              Browse {stats.total} listings across {stats.games} games. Every card is held in escrow
              the moment an offer is accepted — you trade with people, not strangers.
            </p>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0,
            borderLeft: '1px solid var(--rule)',
          }}>
            <MastheadStat label="Open listings" value={stats.total} sub={`${stats.games} games`} />
            <MastheadStat label="Total market" value={usd(stats.totalValue)} sub="at mid-price" />
            <MastheadStat label="Your offers out" value={stats.myOffers} sub="awaiting reply" />
            <MastheadStat label="Your listings live" value={stats.myListings} sub="in escrow queue" last />
          </div>
        </div>
      </section>

      {/* ── Hero feature card ──────────────────────────── */}
      {feature && <FeatureStrip listing={feature} onOpen={() => onOpenListing(feature.holding.id)} onCreateListing={onCreateListing} />}

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div style={{
        padding: '18px 32px 0',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <div>
          <div className="eyebrow">The Binder</div>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', marginTop: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
          </div>
        </div>
        <Button variant="primary" icon="plus" onClick={onCreateListing}>List a card</Button>
      </div>

      <div style={{
        margin: '0 32px 18px', padding: 4,
        display: 'flex', gap: 4, alignItems: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
            <Icon name="search" size={14} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards, sets, members…"
            style={{
              width: '100%', height: 34, padding: '0 12px 0 34px',
              background: 'transparent', border: 'none',
              fontSize: 13, color: 'var(--ink)',
            }}
          />
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />

        <FilterGroup value={gameFilter} onChange={setGameFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'magic', label: 'Magic' },
            { value: 'pokemon', label: 'Pokémon' },
            { value: 'yugioh', label: 'Yu-Gi-Oh' },
            { value: 'lorcana', label: 'Lorcana' },
          ]} />

        <div style={{ width: 1, height: 20, background: 'var(--rule)' }} />

        <Select value={conditionFilter} onChange={setConditionFilter}
          options={[
            { value: 'all', label: 'Any condition' },
            { value: 'NM', label: 'NM only' },
            { value: 'LP', label: 'LP or better' },
          ]} />
        <Select value={sortBy} onChange={setSortBy}
          options={[
            { value: 'new', label: 'Newest' },
            { value: 'price-high', label: 'Price ↓' },
            { value: 'price-low',  label: 'Price ↑' },
            { value: 'offers', label: 'Most offers' },
          ]} />

        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 12px', height: 34,
          fontSize: 11.5, color: 'var(--ink-2)',
          cursor: 'pointer',
        }}>
          <input type="checkbox" checked={onlyTradable} onChange={(e) => setOnlyTradable(e.target.checked)} />
          Trade-only
        </label>
      </div>

      {/* Results */}
      <div style={{ padding: '0 32px' }}>
        {filtered.length === 0 ? (
          <EmptyShelf onCreate={onCreateListing} />
        ) : layout === 'row' ? (
          <RowList listings={filtered} currentUser={currentUser} onOpenListing={onOpenListing} />
        ) : (
          <GridList listings={filtered} currentUser={currentUser} onOpenListing={onOpenListing} density={density} />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
function MastheadStat({ label, value, sub, last }) {
  return (
    <div style={{
      padding: '10px 18px',
      borderBottom: last ? 'none' : '1px dashed var(--rule)',
      borderRight: 'none',
      ...(typeof value === 'string' && value.length > 8 ? {} : {}),
    }}>
      <div className="stat-label" style={{ fontSize: 9 }}>{label}</div>
      <div className="stat-value" style={{ fontSize: 22, marginTop: 4 }}>{value}</div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function FeatureStrip({ listing, onOpen, onCreateListing }) {
  const { holding, owner, card, offers } = listing;
  const ask = formatAsk(holding, card);
  const color = GAME_COLORS[card.game];
  return (
    <section style={{
      padding: '28px 32px 36px',
      borderBottom: '1px solid var(--rule)',
      display: 'grid', gridTemplateColumns: '1fr 1.4fr',
      gap: 40, alignItems: 'center',
      background: `linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, ${color} 4%, var(--bg)) 100%)`,
    }}>
      <div style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: '8% 15%',
          background: `radial-gradient(ellipse at center, color-mix(in srgb, ${color} 30%, transparent), transparent 70%)`,
          filter: 'blur(40px)',
        }} />
        <button onClick={onOpen} style={{ background: 'transparent' }}>
          <CardArt card={card} size="xl" tilt style={{ cursor: 'pointer' }} />
        </button>
      </div>
      <div>
        <div className="eyebrow" style={{ color: color, marginBottom: 12 }}>
          Today's headline listing
        </div>
        <div className="display-lg serif" style={{ marginBottom: 6 }}>
          {card.name}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 20 }}>
          {card.setName.toUpperCase()} · № {card.num} · {card.rarity.toUpperCase()}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: 32,
          padding: '16px 0', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)',
          marginBottom: 20,
        }}>
          <FeatureStat label="Ask" value={ask} accent />
          <FeatureStat label="Market" value={usd(card.market)} />
          <FeatureStat label="Condition" value={holding.condition} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <Avatar user={owner} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Listed by {owner.displayName}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
              ★ {owner.rating.toFixed(1)} · {owner.tradeCount} trades · {owner.location}
            </div>
          </div>
          {offers.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>PENDING</div>
              <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>{offers.length} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>offer{offers.length > 1 ? 's' : ''}</span></div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ink" iconRight="arrow-right" onClick={onOpen}>Open listing</Button>
          <Button variant="outline" onClick={onCreateListing}>List your own</Button>
        </div>
      </div>
    </section>
  );
}

function FeatureStat({ label, value, accent }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="serif" style={{
        fontSize: 32, marginTop: 4,
        color: accent ? 'var(--accent-hot)' : 'var(--ink)',
        letterSpacing: '-0.025em', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

function FilterGroup({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 2 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
          fontSize: 11.5, fontWeight: value === o.value ? 600 : 450,
          color: value === o.value ? 'var(--ink)' : 'var(--ink-3)',
          background: value === o.value ? 'var(--bg-sunk)' : 'transparent',
          transition: 'background .1s, color .1s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      height: 30, padding: '0 26px 0 10px',
      background: 'transparent', border: 'none',
      fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)',
      appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a80' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")",
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function EmptyShelf({ onCreate }) {
  return (
    <div style={{
      padding: '72px 32px', textAlign: 'center',
      border: '1px dashed var(--rule-strong)', borderRadius: 'var(--radius-md)',
      background: 'var(--surface)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: -12, marginBottom: 20,
      }}>
        <div style={{ transform: 'rotate(-8deg)', marginRight: -16, opacity: 0.3 }}>
          <CardArt card={{ name: '—', set: '—', num: '—', game: 'magic' }} size="sm" />
        </div>
        <div style={{ opacity: 0.6, zIndex: 1 }}>
          <CardArt card={{ name: '—', set: '—', num: '—', game: 'pokemon' }} size="sm" />
        </div>
        <div style={{ transform: 'rotate(8deg)', marginLeft: -16, opacity: 0.3 }}>
          <CardArt card={{ name: '—', set: '—', num: '—', game: 'yugioh' }} size="sm" />
        </div>
      </div>
      <div className="serif" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
        Nothing on the <span className="serif-italic">binder today</span>
      </div>
      <p style={{ maxWidth: 400, margin: '10px auto 20px', fontSize: 13, color: 'var(--ink-3)' }}>
        Try clearing filters, or be the first to list. A quiet binder is an opportunity.
      </p>
      <Button variant="primary" icon="plus" onClick={onCreate}>List a card for trade</Button>
    </div>
  );
}

// ── Grid ──────────────────────────────────────────────────────
function GridList({ listings, currentUser, onOpenListing, density }) {
  const cols = density === 'compact' ? 5 : 4;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 0,
      borderTop: '1px solid var(--rule)',
      borderLeft: '1px solid var(--rule)',
    }}>
      {listings.map((l, i) => (
        <GridCard key={l.holding.id} listing={l} currentUser={currentUser}
          onClick={() => onOpenListing(l.holding.id)} index={i} />
      ))}
    </div>
  );
}

function GridCard({ listing, currentUser, onClick, index }) {
  const { holding, owner, card, offers, myOffer } = listing;
  const isOwn = owner.id === currentUser.id;
  const ask = formatAsk(holding, card);
  const color = GAME_COLORS[card.game];
  const [hover, setHover] = React.useState(false);

  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'var(--surface)' : 'var(--bg)',
        borderRight: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
        padding: '20px 18px 18px',
        display: 'flex', flexDirection: 'column',
        textAlign: 'left', cursor: 'pointer',
        transition: 'background .2s',
        position: 'relative',
        minHeight: 360,
      }}>
      {/* Plate number */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.14em' }}>
          № {String(index + 1).padStart(3, '0')}
        </span>
        <span className="mono" style={{ fontSize: 9.5, color, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
          {card.game === 'yugioh' ? 'Yu-Gi-Oh' : card.game}
        </span>
      </div>

      {/* Art — centered, floats on hover */}
      <div style={{
        display: 'grid', placeItems: 'center',
        marginBottom: 16,
        transition: 'transform .4s cubic-bezier(.2,.85,.25,1.05)',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
      }}>
        <CardArt card={card} size="md" />
      </div>

      {/* Title */}
      <div className="clamp-1" style={{
        fontSize: 15, fontWeight: 500, letterSpacing: '-0.015em',
        fontFamily: 'var(--font-display)', lineHeight: 1.1,
      }}>{card.name}</div>
      <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase' }}>
        {card.set} · № {card.num} · <ConditionChipInline condition={holding.condition} />
      </div>

      {/* Price — editorial stack */}
      <div style={{
        marginTop: 14, paddingTop: 12,
        borderTop: '1px solid var(--rule)',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
      }}>
        <div>
          <div className="stat-label" style={{ fontSize: 9 }}>Ask</div>
          <div className="serif" style={{
            fontSize: 22, lineHeight: 1, marginTop: 3,
            color: holding.askType === 'trade_only' ? 'var(--signal-green)' : 'var(--ink)',
          }}>{ask}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-label" style={{ fontSize: 9 }}>Market</div>
          <div className="price" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>{usd(card.market)}</div>
        </div>
      </div>

      {/* Owner */}
      <div style={{
        marginTop: 'auto', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Avatar user={owner} size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {owner.displayName}
          </div>
        </div>
        {offers.length > 0 && (
          <span className="mono" style={{
            fontSize: 9, padding: '2px 6px', letterSpacing: '0.08em',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 2,
          }}>
            {offers.length}●
          </span>
        )}
        {myOffer && (
          <span className="mono" style={{
            fontSize: 9, padding: '2px 6px', letterSpacing: '0.08em',
            border: '1px solid var(--accent-hot)', color: 'var(--accent-hot)', borderRadius: 2,
          }}>SENT</span>
        )}
        {isOwn && (
          <span className="mono" style={{
            fontSize: 9, padding: '2px 6px', letterSpacing: '0.08em',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 2,
          }}>YOU</span>
        )}
      </div>
    </button>
  );
}

function ConditionChipInline({ condition }) {
  const tones = { NM: 'var(--signal-green)', LP: 'var(--accent-cool)', MP: 'var(--signal-amber)', HP: 'var(--accent-hot)' };
  return <span style={{ color: tones[condition] || 'var(--ink-3)' }}>{condition}</span>;
}

// ── Row / table ──────────────────────────────────────────────
function RowList({ listings, currentUser, onOpenListing }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px 1.5fr 120px 70px 100px 130px 140px 80px',
        padding: '10px 16px', borderBottom: '1px solid var(--rule)',
        fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em',
        color: 'var(--ink-3)', textTransform: 'uppercase',
      }}>
        <div></div>
        <div>Card</div>
        <div>Set</div>
        <div>Cond</div>
        <div style={{ textAlign: 'right' }}>Market</div>
        <div style={{ textAlign: 'right' }}>Ask</div>
        <div>Owner</div>
        <div style={{ textAlign: 'right' }}>Offers</div>
      </div>
      {listings.map(l => <RowCard key={l.holding.id} listing={l} currentUser={currentUser} onClick={() => onOpenListing(l.holding.id)} />)}
    </div>
  );
}

function RowCard({ listing, currentUser, onClick }) {
  const { holding, owner, card, offers, myOffer } = listing;
  const ask = formatAsk(holding, card);
  const isOwn = owner.id === currentUser.id;
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1.5fr 120px 70px 100px 130px 140px 80px',
        width: '100%', padding: '12px 16px', textAlign: 'left',
        borderBottom: '1px solid var(--rule)',
        alignItems: 'center', gap: 12,
        background: hover ? 'var(--bg-sunk)' : 'transparent',
        transition: 'background .1s',
      }}>
      <CardArt card={card} size="xs" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
          <GameChip game={card.game} size="sm" />
          {isOwn && <span className="mono" style={{ fontSize: 9, padding: '1px 5px', background: 'var(--ink)', color: 'var(--bg)' }}>YOU</span>}
          {myOffer && <span className="mono" style={{ fontSize: 9, padding: '1px 5px', border: '1px solid var(--accent-hot)', color: 'var(--accent-hot)' }}>SENT</span>}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{card.set} · {card.num}</div>
      <div><ConditionChip condition={holding.condition} /></div>
      <div className="price" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)' }}>{usd(card.market)}</div>
      <div className="price" style={{ fontSize: 14, fontWeight: 500, textAlign: 'right', color: holding.askType === 'trade_only' ? 'var(--signal-green)' : 'var(--ink)' }}>{ask}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Avatar user={owner} size={22} />
        <span style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{owner.displayName.split(' ')[0]}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        {offers.length > 0 ? (
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--accent-hot)' }}>
            {offers.length} OFFER{offers.length > 1 ? 'S' : ''}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>—</span>
        )}
      </div>
    </button>
  );
}

Object.assign(window, { Marketplace });
