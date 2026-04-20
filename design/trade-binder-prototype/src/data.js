// src/data.js — Sample users, cards, listings, and offers for the Trades prototype
// No imports; attaches a single `TCGData` to window.

(function () {
  // ──────────────────────────────────────────────────────────
  // USERS — a small Tailnet of collectors
  // ──────────────────────────────────────────────────────────
  const USERS = [
    {
      id: 'u_nia',
      displayName: 'Nia Okafor',
      handle: 'nia@binder.local',
      initials: 'NO',
      avatarHue: 28,          // warm amber
      role: 'ADMIN',
      tradeCount: 147,
      rating: 4.9,
      joined: '2023-08-14',
      location: 'Boston, MA',
      bio: 'Modern Horizons enthusiast. Will always trade down for foils.',
    },
    {
      id: 'u_marcus',
      displayName: 'Marcus Chen',
      handle: 'marcus@binder.local',
      initials: 'MC',
      avatarHue: 168,          // teal
      role: 'USER',
      tradeCount: 63,
      rating: 4.8,
      joined: '2024-02-03',
      location: 'Portland, OR',
      bio: 'Pokémon TCG, English + Japanese. I ship same-day.',
    },
    {
      id: 'u_priya',
      displayName: 'Priya Shah',
      handle: 'priya@binder.local',
      initials: 'PS',
      avatarHue: 284,          // purple
      role: 'USER',
      tradeCount: 89,
      rating: 5.0,
      joined: '2023-11-20',
      location: 'Austin, TX',
      bio: 'Yu-Gi-Oh + Lorcana. Condition-snob in the best way.',
    },
    {
      id: 'u_jonas',
      displayName: 'Jonas Albrecht',
      handle: 'jonas@binder.local',
      initials: 'JA',
      avatarHue: 220,          // blue
      role: 'USER',
      tradeCount: 34,
      rating: 4.6,
      joined: '2024-06-11',
      location: 'Berlin, DE',
      bio: 'EU shipper. Long-term collector since Revised.',
    },
  ];

  // ──────────────────────────────────────────────────────────
  // CARDS — game / set / condition / market price in cents
  // ──────────────────────────────────────────────────────────
  const GAME_COLORS = {
    magic:   '#3b82f6',
    pokemon: '#ef4444',
    yugioh:  '#a855f7',
    lorcana: '#6366f1',
  };

  const CARDS = [
    { id:'c_sheol',  name:'Sheoldred, the Apocalypse', set:'DMU',  setName:'Dominaria United',   num:'107', game:'magic',   rarity:'Mythic', market:  8450 },
    { id:'c_ragavan',name:'Ragavan, Nimble Pilferer',  set:'MH2',  setName:'Modern Horizons 2',  num:'138', game:'magic',   rarity:'Mythic', market:  4200 },
    { id:'c_moxop',  name:'Mox Opal',                  set:'SOM',  setName:'Scars of Mirrodin', num:'181', game:'magic',   rarity:'Mythic', market:  6150 },
    { id:'c_liliana',name:'Liliana of the Veil',       set:'ISD',  setName:'Innistrad',         num:'105', game:'magic',   rarity:'Mythic', market:  5800 },
    { id:'c_fury',   name:'Fury',                       set:'MH2',  setName:'Modern Horizons 2', num:'082', game:'magic',   rarity:'Mythic', market:  2975 },
    { id:'c_wrenn',  name:'Wrenn and Six',             set:'MH1',  setName:'Modern Horizons',   num:'217', game:'magic',   rarity:'Mythic', market:  5400 },
    { id:'c_orcish', name:'Orcish Bowmasters',         set:'LTR',  setName:'LOTR: Tales of MR', num:'094', game:'magic',   rarity:'Rare',   market:  3100 },

    { id:'c_charizard',name:'Charizard ex — Holo',      set:'151',  setName:'Scarlet & Violet 151',  num:'199', game:'pokemon', rarity:'Special Illustration', market: 6200 },
    { id:'c_pikav',   name:'Pikachu V — Full Art',     set:'BST',  setName:'Brilliant Stars',      num:'170', game:'pokemon', rarity:'Full Art',             market: 1975 },
    { id:'c_rayquaza',name:'Rayquaza VMAX — Alt Art',  set:'EVS',  setName:'Evolving Skies',       num:'218', game:'pokemon', rarity:'Alt Art',              market: 9200 },
    { id:'c_umbreon', name:'Umbreon VMAX — Alt Art',   set:'EVS',  setName:'Evolving Skies',       num:'215', game:'pokemon', rarity:'Alt Art',              market:16400 },
    { id:'c_lugia',   name:'Lugia V — Alt Art',        set:'SIT',  setName:'Silver Tempest',       num:'186', game:'pokemon', rarity:'Alt Art',              market: 4800 },

    { id:'c_ashblos', name:'Ash Blossom & Joyous Spring',set:'MP19',setName:'Mega-Pack 2019',      num:'124', game:'yugioh',  rarity:'Ultra',   market: 3800 },
    { id:'c_kashtira',name:'Kashtira Fenrir',           set:'POTE',setName:'Power of the Elements',num:'008', game:'yugioh',  rarity:'Secret',  market: 2700 },
    { id:'c_effectv', name:'Effect Veiler',             set:'DUPO',setName:'Duel Power',          num:'092', game:'yugioh',  rarity:'Ultra',   market: 1450 },

    { id:'c_mickey',  name:'Mickey Mouse — Brave Little Tailor', set:'TFC', setName:'The First Chapter', num:'010', game:'lorcana', rarity:'Legendary', market: 5500 },
    { id:'c_elsa',    name:'Elsa — Spirit of Winter',   set:'RFB', setName:'Rise of the Floodborn', num:'002', game:'lorcana', rarity:'Legendary', market: 3200 },
    { id:'c_moonlit', name:'Moonlit Hunt',               set:'TFC', setName:'The First Chapter',  num:'209', game:'lorcana', rarity:'Rare',   market: 1675 },
  ];

  // ──────────────────────────────────────────────────────────
  // HOLDINGS — who owns what (holdingId is key for trades)
  //   askType: 'fixed' | 'percent' | 'trade_only'
  //   askValue: price in cents (fixed) or percent 0-100
  //   listed:  whether it's in the Trade Binder
  // ──────────────────────────────────────────────────────────
  const HOLDINGS = [
    // Nia's binder
    { id:'h_nia_sheol',    userId:'u_nia',    cardId:'c_sheol',    condition:'NM', qty:2, listedQty:1, listed:true,  askType:'fixed',    askValue:8500, notes:'Pack-fresh, sleeved+toploader.' },
    { id:'h_nia_umbreon',  userId:'u_nia',    cardId:'c_umbreon',  condition:'NM', qty:1, listedQty:1, listed:true,  askType:'trade_only', askValue:null, notes:'Looking for Charizard ex SIR or high-end MTG staples.' },
    { id:'h_nia_mickey',   userId:'u_nia',    cardId:'c_mickey',   condition:'NM', qty:1, listedQty:1, listed:true,  askType:'percent',  askValue:95, notes:'' },
    { id:'h_nia_moxop',    userId:'u_nia',    cardId:'c_moxop',    condition:'LP', qty:2, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_nia_ragavan',  userId:'u_nia',    cardId:'c_ragavan',  condition:'LP', qty:1, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_nia_liliana',  userId:'u_nia',    cardId:'c_liliana',  condition:'NM', qty:1, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_nia_orcish',   userId:'u_nia',    cardId:'c_orcish',   condition:'NM', qty:3, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },

    // Marcus's binder
    { id:'h_marcus_charizard', userId:'u_marcus', cardId:'c_charizard',condition:'NM', qty:1, listedQty:1, listed:true,  askType:'fixed', askValue:6200, notes:'Centering is excellent. PSA-worthy.' },
    { id:'h_marcus_pika',      userId:'u_marcus', cardId:'c_pikav',    condition:'NM', qty:2, listedQty:1, listed:true,  askType:'fixed', askValue:2000, notes:'' },
    { id:'h_marcus_lugia',     userId:'u_marcus', cardId:'c_lugia',    condition:'NM', qty:1, listedQty:1, listed:true,  askType:'percent', askValue:100, notes:'Price-check against TCGPlayer weekly.' },
    { id:'h_marcus_rayquaza',  userId:'u_marcus', cardId:'c_rayquaza', condition:'NM', qty:1, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_marcus_fury',      userId:'u_marcus', cardId:'c_fury',     condition:'NM', qty:4, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },

    // Priya's binder
    { id:'h_priya_ash',      userId:'u_priya',  cardId:'c_ashblos',   condition:'NM', qty:3, listedQty:2, listed:true, askType:'fixed', askValue:3800, notes:'1st Ed, Japanese available on request.' },
    { id:'h_priya_kashtira', userId:'u_priya',  cardId:'c_kashtira',  condition:'NM', qty:1, listedQty:1, listed:true, askType:'fixed', askValue:2750, notes:'' },
    { id:'h_priya_elsa',     userId:'u_priya',  cardId:'c_elsa',      condition:'NM', qty:1, listedQty:1, listed:true, askType:'percent', askValue:98, notes:'' },
    { id:'h_priya_effect',   userId:'u_priya',  cardId:'c_effectv',   condition:'LP', qty:4, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_priya_moonlit',  userId:'u_priya',  cardId:'c_moonlit',   condition:'NM', qty:2, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },

    // Jonas's binder
    { id:'h_jonas_wrenn',    userId:'u_jonas',  cardId:'c_wrenn',    condition:'NM', qty:1, listedQty:1, listed:true,  askType:'fixed', askValue:5500, notes:'From personal cube. Played sparingly.' },
    { id:'h_jonas_sheol',    userId:'u_jonas',  cardId:'c_sheol',    condition:'NM', qty:1, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_jonas_ragavan',  userId:'u_jonas',  cardId:'c_ragavan',  condition:'NM', qty:2, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
    { id:'h_jonas_liliana',  userId:'u_jonas',  cardId:'c_liliana',  condition:'LP', qty:1, listedQty:0, listed:false, askType:null, askValue:null, notes:'' },
  ];

  // ──────────────────────────────────────────────────────────
  // OFFERS — pending + historical
  //   status: pending | accepted | declined | withdrawn | voided
  //   cashCents: amount in cents
  //   cards: [{ holdingId, qty }] — offered from offerUserId
  // ──────────────────────────────────────────────────────────
  const OFFERS = [
    // On Nia's Sheoldred — Jonas offering cash + one card
    {
      id: 'o_jonas_sheol',
      holdingId: 'h_nia_sheol',
      offerUserId: 'u_jonas',
      ownerId: 'u_nia',
      cashCents: 3000,
      cards: [{ holdingId: 'h_jonas_liliana', qty: 1 }],
      message: 'Lili is LP but plays clean. Can ship Monday.',
      status: 'pending',
      createdAt: '2026-04-18T14:22:00Z',
    },
    // On Nia's Sheoldred — Marcus offering pure cash
    {
      id: 'o_marcus_sheol',
      holdingId: 'h_nia_sheol',
      offerUserId: 'u_marcus',
      ownerId: 'u_nia',
      cashCents: 8500,
      cards: [],
      message: 'Asking price, no hassle.',
      status: 'pending',
      createdAt: '2026-04-19T09:15:00Z',
    },
    // On Nia's Umbreon — Marcus offering Charizard + cash
    {
      id: 'o_marcus_umbreon',
      holdingId: 'h_nia_umbreon',
      offerUserId: 'u_marcus',
      ownerId: 'u_nia',
      cashCents: 10000,
      cards: [{ holdingId: 'h_marcus_charizard', qty: 1 }],
      message: 'Charizard is centered well. Adding cash to square it up.',
      status: 'pending',
      createdAt: '2026-04-19T18:44:00Z',
    },
    // On Marcus's Charizard — from Priya, straight cards swap
    {
      id: 'o_priya_chariz',
      holdingId: 'h_marcus_charizard',
      offerUserId: 'u_priya',
      ownerId: 'u_marcus',
      cashCents: 0,
      cards: [
        { holdingId: 'h_priya_ash', qty: 1 },
        { holdingId: 'h_priya_kashtira', qty: 1 },
      ],
      message: 'Fair-value swap on TCGPlayer prices as of today.',
      status: 'pending',
      createdAt: '2026-04-20T08:12:00Z',
    },
    // Historical — Nia's accepted offer on Jonas's Wrenn
    {
      id: 'o_nia_wrenn',
      holdingId: 'h_jonas_wrenn',
      offerUserId: 'u_nia',
      ownerId: 'u_jonas',
      cashCents: 2000,
      cards: [{ holdingId: 'h_nia_moxop', qty: 1 }],
      message: 'Mox + $20. Let me know.',
      status: 'accepted',
      createdAt: '2026-04-10T16:00:00Z',
      responseMessage: 'Done deal. Shipping tomorrow.',
      completedAt: '2026-04-11T12:30:00Z',
    },
    // Historical — declined
    {
      id: 'o_priya_elsa_declined',
      holdingId: 'h_priya_elsa',
      offerUserId: 'u_jonas',
      ownerId: 'u_priya',
      cashCents: 2500,
      cards: [],
      message: 'Lowballing a bit, appreciate you considering.',
      status: 'declined',
      createdAt: '2026-04-15T22:00:00Z',
      responseMessage: 'Need a bit closer to market — keep an eye on the list.',
    },
    // Historical — withdrawn (Marcus changed mind)
    {
      id: 'o_marcus_mickey_withdrawn',
      holdingId: 'h_nia_mickey',
      offerUserId: 'u_marcus',
      ownerId: 'u_nia',
      cashCents: 5000,
      cards: [],
      message: '',
      status: 'withdrawn',
      createdAt: '2026-04-08T09:45:00Z',
    },
  ];

  // ──────────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────────
  const usd = (cents) => {
    const sign = cents < 0 ? '-' : '';
    const n = Math.abs(cents) / 100;
    return sign + '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const relTime = (iso) => {
    const then = new Date(iso).getTime();
    // Treat "today" as 2026-04-20 for stable relative labels
    const now = new Date('2026-04-20T20:00:00Z').getTime();
    const diff = Math.max(0, now - then) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    const days = Math.floor(diff/86400);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days/7)}w ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatAsk = (holding, card) => {
    if (!holding.listed) return null;
    if (holding.askType === 'trade_only') return 'Trade only';
    if (holding.askType === 'fixed') return usd(holding.askValue);
    if (holding.askType === 'percent') {
      const cents = Math.round((card.market * holding.askValue) / 100);
      return `${holding.askValue}% mkt · ${usd(cents)}`;
    }
    return null;
  };

  // Find helpers
  const findUser    = (id) => USERS.find(u => u.id === id);
  const findCard    = (id) => CARDS.find(c => c.id === id);
  const findHolding = (id) => HOLDINGS.find(h => h.id === id);

  const holdingValue = (holding) => {
    const card = findCard(holding.cardId);
    return (card ? card.market : 0) * 1; // qty 1 for offer-line value
  };

  const offerCardsValue = (offer) => {
    return offer.cards.reduce((sum, oc) => {
      const h = findHolding(oc.holdingId);
      if (!h) return sum;
      const card = findCard(h.cardId);
      return sum + (card ? card.market : 0) * oc.qty;
    }, 0);
  };

  const offerTotalValue = (offer) => offer.cashCents + offerCardsValue(offer);

  window.TCGData = {
    USERS, CARDS, HOLDINGS, OFFERS, GAME_COLORS,
    usd, relTime, formatAsk, findUser, findCard, findHolding,
    holdingValue, offerCardsValue, offerTotalValue,
  };

  // ──────────────────────────────────────────────────────────
  // Compatibility shim — expose alias fields so component code
  // that expects dollar-level prices + denormalized offer cards
  // works without per-site rewrites.
  // ──────────────────────────────────────────────────────────
  // 1) Normalize CARDS: `market` was in cents → treat as-is (cents).
  //    Components use `card.market` via usd(cents) already, which matches.

  // 2) Normalize HOLDINGS: add `askPrice` alias that resolves % to cents,
  //    add `foil` default, ensure `listedQty` is set.
  HOLDINGS.forEach(h => {
    const card = findCard(h.cardId);
    if (h.askType === 'percent') {
      h.askPrice = Math.round((card.market * h.askValue) / 100);
    } else if (h.askType === 'fixed') {
      h.askPrice = h.askValue;
    } else {
      h.askPrice = 0;
    }
    if (h.foil == null) h.foil = false;
    if (h.listedQty == null) h.listedQty = h.listed ? 1 : 0;
  });

  // 3) Normalize OFFERS: denormalize cards to include cardId/condition,
  //    expose `cash` alias (cents), convert createdAt ISO → ms for relTime consistency.
  OFFERS.forEach(o => {
    o.cash = o.cashCents;
    o.cards = (o.cards || []).map(oc => {
      const h = findHolding(oc.holdingId);
      return h ? { cardId: h.cardId, condition: h.condition, qty: oc.qty, holdingId: oc.holdingId }
               : { cardId: null, condition: 'NM', qty: oc.qty, holdingId: oc.holdingId };
    });
    if (typeof o.createdAt === 'string') {
      o.createdAtIso = o.createdAt;
      o.createdAt = new Date(o.createdAt).getTime();
    }
  });

  // 4) Patch relTime to accept either ms or ISO.
  const origRelTime = window.TCGData.relTime;
  window.TCGData.relTime = (t) => {
    if (typeof t === 'number') {
      // Convert ms to the ISO the original fn expects
      return origRelTime(new Date(t).toISOString());
    }
    return origRelTime(t);
  };
})();
