// src/app.jsx — Main prototype app

function App() {
  const [currentUserId, setCurrentUserId] = React.useState(() => {
    const saved = localStorage.getItem('tcg-user');
    const valid = ['u_nia', 'u_marcus', 'u_priya', 'u_jonas'];
    return valid.includes(saved) ? saved : 'u_nia';
  });
  const [page, setPage] = React.useState(() => localStorage.getItem('tcg-page') || 'trades');
  const [openListingId, setOpenListingId] = React.useState(null);
  const [makingOfferOn, setMakingOfferOn] = React.useState(null);
  const [creatingListing, setCreatingListing] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  // Tweaks
  const [theme, setTheme] = React.useState(() => localStorage.getItem('tcg-theme') || 'paper');
  const [density, setDensity] = React.useState('comfortable');
  const [accent, setAccent] = React.useState(() => localStorage.getItem('tcg-accent') || 'vermilion');
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  const currentUser = window.TCGData.findUser(currentUserId);

  React.useEffect(() => { localStorage.setItem('tcg-user', currentUserId); }, [currentUserId]);
  React.useEffect(() => { localStorage.setItem('tcg-page', page); }, [page]);
  React.useEffect(() => {
    localStorage.setItem('tcg-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  React.useEffect(() => {
    localStorage.setItem('tcg-accent', accent);
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };

  const myListings = window.TCGData.HOLDINGS.filter(h => h.userId === currentUserId).map(h => h.id);
  const pendingIncoming = window.TCGData.OFFERS.filter(o => myListings.includes(o.holdingId) && o.status === 'pending').length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar
        activePage={page}
        onNav={setPage}
        currentUser={currentUser}
        pendingIncoming={pendingIncoming}
        onNewListing={() => setCreatingListing(true)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>
        <Header
          page={page}
          pendingIncoming={pendingIncoming}
          onBellClick={() => setPage('inbox')}
          currentUser={currentUser}
          onUserSwitch={setCurrentUserId}
          users={window.TCGData.USERS}
        />

        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {page === 'trades' && (
            <Marketplace
              currentUser={currentUser}
              onOpenListing={setOpenListingId}
              onCreateListing={() => setCreatingListing(true)}
              density={density}
            />
          )}
          {page === 'inbox' && (
            <OffersInbox
              currentUser={currentUser}
              onOpenListing={setOpenListingId}
              onMakeCounter={(oId) => {
                const o = window.TCGData.OFFERS.find(oo => oo.id === oId);
                if (o) setOpenListingId(o.holdingId);
              }}
            />
          )}
          {page !== 'trades' && page !== 'inbox' && (
            <PlaceholderPage page={page} onGoTrades={() => setPage('trades')} />
          )}
        </main>
      </div>

      {openListingId && (
        <ListingDetail
          holdingId={openListingId}
          currentUser={currentUser}
          onClose={() => setOpenListingId(null)}
          onMakeOffer={() => { setMakingOfferOn(openListingId); setOpenListingId(null); }}
          onAcceptOffer={(oId) => {
            const o = window.TCGData.OFFERS.find(oo => oo.id === oId);
            if (o) o.status = 'accepted';
            showToast('Trade accepted. Cards locked in escrow.', 'success');
            setOpenListingId(null);
          }}
          onDeclineOffer={(oId) => {
            const o = window.TCGData.OFFERS.find(oo => oo.id === oId);
            if (o) o.status = 'declined';
            showToast('Offer declined.', 'neutral');
          }}
          onCounter={() => showToast('Counter-offer flow coming soon.', 'neutral')}
        />
      )}
      {makingOfferOn && (
        <MakeOfferModal
          holdingId={makingOfferOn}
          currentUser={currentUser}
          onClose={() => setMakingOfferOn(null)}
          onSubmit={({ cash, selectedCards, message }) => {
            const newOffer = {
              id: 'o-' + Date.now(),
              holdingId: makingOfferOn,
              offerUserId: currentUser.id,
              status: 'pending',
              cashCents: cash,
              cards: selectedCards.map(sc => {
                const h = window.TCGData.HOLDINGS.find(hh => hh.id === sc.holdingId);
                return { cardId: h.cardId, qty: sc.qty, condition: h.condition };
              }),
              message,
              createdAt: Date.now(),
            };
            window.TCGData.OFFERS.unshift(newOffer);
            showToast('Offer sent. You\u2019ll hear back shortly.');
            setMakingOfferOn(null);
          }}
        />
      )}
      {creatingListing && (
        <CreateListingModal
          currentUser={currentUser}
          onClose={() => setCreatingListing(false)}
          onSubmit={({ holdingId, askType, askValue, notes }) => {
            const h = window.TCGData.HOLDINGS.find(hh => hh.id === holdingId);
            if (h) {
              h.listed = true;
              h.askType = askType;
              h.askValue = askValue;
              h.notes = notes || h.notes;
            }
            showToast('Listing published to the binder.');
            setCreatingListing(false);
          }}
        />
      )}

      {tweaksOpen && (
        <TweaksPanel
          theme={theme} setTheme={setTheme}
          accent={accent} setAccent={setAccent}
          density={density} setDensity={setDensity}
          onClose={() => setTweaksOpen(false)}
        />
      )}

      {toast && (
        <div className="anim-slide" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '14px 22px',
          background: toast.kind === 'success' ? 'var(--ink)' : 'var(--surface)',
          color: toast.kind === 'success' ? 'var(--bg)' : 'var(--ink)',
          border: toast.kind === 'success' ? 'none' : '1px solid var(--rule-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-xl)',
          fontSize: 13, fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 200,
        }}>
          <Icon name={toast.kind === 'success' ? 'check' : 'info'} size={14} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function PlaceholderPage({ page, onGoTrades }) {
  const titles = {
    dashboard: { eyebrow: 'Out of scope', title: 'Your dashboard', body: 'Portfolio, activity, watchlist — not in this prototype round.' },
    collection: { eyebrow: 'Out of scope', title: 'Your collection', body: 'Full binder view with filters and bulk edit — not in this prototype round.' },
    targets: { eyebrow: 'Out of scope', title: 'Wants & targets', body: 'Saved searches and auto-alerts — not in this prototype round.' },
    ledger: { eyebrow: 'Out of scope', title: 'Settled trades', body: 'Complete history of closed trades — not in this prototype round.' },
    users: { eyebrow: 'Admin', title: 'Users', body: 'Account administration — not in this prototype round.' },
    settings: { eyebrow: 'Out of scope', title: 'Settings', body: 'Shipping, notifications, payout — not in this prototype round.' },
  };
  const m = titles[page] || titles.dashboard;
  return (
    <div style={{ padding: '80px 48px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
      <div className="eyebrow" style={{ justifyContent: 'center', display: 'flex', marginBottom: 14 }}>{m.eyebrow}</div>
      <h1 className="serif-italic" style={{ fontFamily: 'var(--font-display)', fontSize: 54, fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.025em', marginBottom: 14 }}>
        {m.title}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 28 }}>{m.body}</p>
      <Button variant="primary" iconRight="arrow-right" onClick={onGoTrades}>Open the Trade Binder</Button>
    </div>
  );
}

function TweaksPanel({ theme, setTheme, accent, setAccent, density, setDensity, onClose }) {
  return (
    <div className="anim-slide" style={{
      position: 'fixed', bottom: 24, right: 24, width: 300,
      background: 'var(--surface)', border: '1px solid var(--rule-strong)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-xl)',
      padding: 18, zIndex: 150,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--rule)' }}>
        <div>
          <div className="eyebrow">Tweaks</div>
          <div className="serif" style={{ fontSize: 18, letterSpacing: '-0.01em', marginTop: 2 }}>Adjust the press</div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--ink-3)' }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <TweakRow label="Paper">
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {[
            { v: 'paper', label: 'Day' },
            { v: 'night', label: 'Night' },
          ].map(o => (
            <button key={o.v} onClick={() => setTheme(o.v)} style={{
              flex: 1, padding: '9px 8px', borderRadius: 'var(--radius-sm)',
              background: theme === o.v ? 'var(--ink)' : 'transparent',
              color: theme === o.v ? 'var(--bg)' : 'var(--ink-2)',
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid ' + (theme === o.v ? 'var(--ink)' : 'var(--rule)'),
            }}>{o.label}</button>
          ))}
        </div>
      </TweakRow>

      <TweakRow label="Accent">
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          {[
            { v: 'vermilion', c: '#D84A2C', label: 'Vermilion' },
            { v: 'cobalt',    c: '#2B5FA6', label: 'Cobalt' },
            { v: 'ochre',     c: '#B57A1C', label: 'Ochre' },
          ].map(o => (
            <button key={o.v} onClick={() => setAccent(o.v)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)',
              background: accent === o.v ? `color-mix(in srgb, ${o.c} 12%, var(--surface))` : 'transparent',
              border: '1px solid ' + (accent === o.v ? o.c : 'var(--rule)'),
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: o.c }} />
              <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase', color: accent === o.v ? 'var(--ink)' : 'var(--ink-3)' }}>{o.label}</span>
            </button>
          ))}
        </div>
      </TweakRow>

      <TweakRow label="Density">
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {[
            { v: 'comfortable', label: 'Editorial' },
            { v: 'compact',     label: 'Tight' },
          ].map(o => (
            <button key={o.v} onClick={() => setDensity(o.v)} style={{
              flex: 1, padding: '9px 8px', borderRadius: 'var(--radius-sm)',
              background: density === o.v ? 'var(--ink)' : 'transparent',
              color: density === o.v ? 'var(--bg)' : 'var(--ink-2)',
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
              border: '1px solid ' + (density === o.v ? 'var(--ink)' : 'var(--rule)'),
            }}>{o.label}</button>
          ))}
        </div>
      </TweakRow>

      <div style={{
        marginTop: 14, padding: 10, fontSize: 10.5, lineHeight: 1.55,
        background: 'var(--bg-sunk)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)',
        border: '1px solid var(--rule)',
      }}>
        <Icon name="info" size={11} /> Swap users in the header to see the same listing from both sides.
      </div>
    </div>
  );
}

function TweakRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
