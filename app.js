/* RSD Black Friday 2026 — My List. Plain JS, no build step.
   Everything the user taps is written to localStorage immediately. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const IMG = 'https://img.broadtime.com/Photo/';
  const KIND = { E: 'Exclusive', F: 'RSD First', L: 'Small run' };
  const KIND_LONG = {
    E: 'Exclusive · only at indie record stores',
    F: 'RSD First · indie stores get it first',
    L: 'Small run / regional · under 1,000 or regional',
  };
  const SORTS = { artist: 'A–Z', rare: 'Rarest', label: 'Label' };
  const FG_ORDER = ['LP', '2LP+', '7"', '10" & 12"', 'CD', 'Other'];
  const ICON = {
    plus: '<svg class="plus" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg class="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    star: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };

  let DATA, ALL = [], BY_ID = new Map(), ROWS = new Map(), KEY;
  let S = { list: {}, ui: { tab: 'all', sort: 'artist', k: [], fg: [], g: [], q: '' }, tipX: false };

  /* ---------- storage: save on every change ---------- */
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        S.list = saved.list || {};
        S.ui = Object.assign(S.ui, saved.ui || {});
        S.tipX = !!saved.tipX;
      }
    } catch (e) { /* corrupted or blocked storage: start fresh */ }
    for (const id of Object.keys(S.list)) if (!BY_ID.has(+id)) delete S.list[id];
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save. Is private browsing on?'); }
  }
  let askedPersist = false;
  function persistStorage() {
    if (askedPersist || !navigator.storage || !navigator.storage.persist) return;
    askedPersist = true;
    navigator.storage.persist().catch(() => {});
  }

  /* ---------- helpers ---------- */
  const fold = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sortName = s => fold(s).replace(/[^a-z0-9 ]/g, '').trim().replace(/^(the|a|an)\s+/, '');
  const qty = n => n ? n.toLocaleString('en-US') : '—';
  const isRare = r => r.q && r.q <= 1500;
  const thumb = r => r.img ? IMG + r.img + ':180' : '';
  const big = r => r.img ? IMG + r.img + ':800' : '';
  const buzz = () => navigator.vibrate && navigator.vibrate(8);
  const entry = id => S.list[id];

  /* ---------- rows ---------- */
  function rowHTML(r) {
    return `<button class="row-main" data-act="open" aria-label="${esc(r.a)}, ${esc(r.t)}. Details">
      <img class="art" src="${thumb(r)}" alt="" width="60" height="60" loading="lazy" decoding="async">
      <span class="txt">
        <span class="artist">${esc(r.a)}</span>
        <span class="title">${esc(r.t)}</span>
        <span class="meta"><b class="k k-${r.k}">${KIND[r.k]}</b><span>${esc(r.f)}</span>·<span class="${isRare(r) ? 'rare' : ''}">${qty(r.q)} made</span></span>
      </span>
    </button>
    <button class="want" data-act="want" aria-label="Add to my list" aria-pressed="false"><span class="ring">${ICON.plus}${ICON.check}</span></button>
    <button class="must" data-act="must" aria-label="Must-have" aria-pressed="false">${ICON.star}</button>
    <button class="got" data-act="got" aria-label="Got it" aria-pressed="false"><span class="box">${ICON.check}</span></button>`;
  }
  function buildRows() {
    const list = $('#list');
    const frag = document.createDocumentFragment();
    for (const r of ALL) {
      const li = document.createElement('li');
      li.className = 'row';
      li.dataset.id = r.id;
      li.innerHTML = rowHTML(r);
      ROWS.set(r.id, li);
      frag.appendChild(li);
    }
    const div = document.createElement('li');
    div.className = 'divider';
    div.id = 'gotDivider';
    div.textContent = 'In the bag';
    frag.appendChild(div);
    list.appendChild(frag);
  }
  function paintRow(id) {
    const li = ROWS.get(id), e = entry(id);
    li.classList.toggle('on', !!e);
    li.classList.toggle('is-must', !!(e && e.m));
    li.classList.toggle('is-got', !!(e && e.g));
    const w = li.querySelector('.want');
    w.setAttribute('aria-pressed', !!e);
    w.setAttribute('aria-label', e ? 'Remove from my list' : 'Add to my list');
    li.querySelector('.must').setAttribute('aria-pressed', !!(e && e.m));
    li.querySelector('.must').classList.toggle('is', !!(e && e.m));
    li.querySelector('.got').setAttribute('aria-pressed', !!(e && e.g));
  }

  /* ---------- list mutations (each one saves) ---------- */
  function setWant(id, on, { quiet } = {}) {
    const prev = entry(id);
    if (on && !prev) S.list[id] = { m: 0, g: 0, at: Date.now() };
    if (!on && prev) delete S.list[id];
    save();
    paintRow(id);
    afterListChange();
    if (on) { persistStorage(); bump(); }
    if (!quiet && !on && prev) toast('Removed from your list', 'Undo', () => { S.list[id] = prev; save(); paintRow(id); afterListChange(); refreshDetail(); });
    else if (!quiet && on) toast('Added to your list');
    buzz();
  }
  function setFlag(id, flag, val) {
    if (!entry(id)) S.list[id] = { m: 0, g: 0, at: Date.now() };
    S.list[id][flag] = val ? 1 : 0;
    save();
    paintRow(id);
    afterListChange();
    buzz();
  }
  function afterListChange() {
    updateCounts();
    if (S.ui.tab === 'mine') apply();
    warmArt();
  }

  /* ---------- filtering & sorting ---------- */
  function matches(r, terms) {
    if (!terms.length) return true;
    const hay = r._hay || (r._hay = fold([r.a, r.t, r.l, r.f, r.g, KIND[r.k]].join(' ')));
    return terms.every(t => hay.includes(t));
  }
  function filtered() {
    const u = S.ui, terms = fold(u.q).split(/\s+/).filter(Boolean);
    if (u.tab === 'mine') return ALL.filter(r => entry(r.id) && matches(r, terms));
    return ALL.filter(r =>
      (!u.k.length || u.k.includes(r.k)) &&
      (!u.fg.length || u.fg.includes(r.fg)) &&
      (!u.g.length || u.g.includes(r.g)) &&
      matches(r, terms));
  }
  function sorted(rs) {
    const by = S.ui.sort;
    const cmpName = (a, b) => a._sa.localeCompare(b._sa) || a._st.localeCompare(b._st);
    const cmp = by === 'rare' ? (a, b) => (a.q || 1e9) - (b.q || 1e9) || cmpName(a, b)
      : by === 'label' ? (a, b) => a._sl.localeCompare(b._sl) || cmpName(a, b)
      : cmpName;
    if (S.ui.tab === 'mine') {
      return rs.sort((a, b) => {
        const ea = entry(a.id), eb = entry(b.id);
        return (ea.g - eb.g) || (eb.m - ea.m) || cmp(a, b);
      });
    }
    return rs.sort(cmp);
  }
  function apply() {
    const mine = S.ui.tab === 'mine';
    document.body.classList.toggle('mine', mine);
    const rs = sorted(filtered());
    const list = $('#list'), div = $('#gotDivider');
    const show = new Set(rs.map(r => r.id));
    for (const [id, li] of ROWS) li.hidden = !show.has(id);
    const frag = document.createDocumentFragment();
    let divPlaced = false;
    for (const r of rs) {
      if (mine && !divPlaced && entry(r.id).g) { frag.appendChild(div); divPlaced = true; }
      frag.appendChild(ROWS.get(r.id));
    }
    if (!divPlaced) frag.appendChild(div);
    div.hidden = !divPlaced;
    list.appendChild(frag);

    // status + empty states
    const total = mine ? Object.keys(S.list).length : ALL.length;
    $('#status').textContent = rs.length === total
      ? (mine ? `${total} record${total === 1 ? '' : 's'}` : `${total} records`)
      : `${rs.length} of ${total} match`;
    $('#sortBtn').textContent = `Sort: ${SORTS[S.ui.sort]}`;
    $('#sortBtn').hidden = mine;
    const empty = $('#empty');
    if (!rs.length) {
      empty.classList.add('show');
      if (mine && !total) { $('#emptyH').textContent = 'Your list is empty'; $('#emptyP').innerHTML = 'Tap <b>+</b> next to any record in <b>All records</b> to add it here. Then check them off in the store.'; }
      else { $('#emptyH').textContent = 'No matches'; $('#emptyP').textContent = 'Try a different search or clear your filters.'; }
    } else empty.classList.remove('show');

    // tabs
    for (const t of document.querySelectorAll('.tab')) t.setAttribute('aria-selected', t.dataset.tab === S.ui.tab);
    paintFilterBits();
    if (mine) paintProgress();
  }
  function updateCounts() {
    const n = Object.keys(S.list).length;
    $('#mineN').textContent = n;
    $('#allN').textContent = ALL.length;
    if (S.ui.tab === 'mine') paintProgress();
  }
  function bump() {
    const b = $('#mineN');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }
  function paintProgress() {
    const ids = Object.keys(S.list), n = ids.length;
    const got = ids.filter(id => S.list[id].g).length;
    const must = ids.filter(id => S.list[id].m && !S.list[id].g).length;
    $('#progBig').innerHTML = n ? `${got} <small>of ${n} found</small>` : `0 <small>records yet</small>`;
    $('#progPct').textContent = n ? (got === n ? 'All found 🎉' : Math.round(got / n * 100) + '%') : '';
    $('#progBar').style.width = n ? (got / n * 100) + '%' : '0';
    const left = ids.filter(id => !S.list[id].g).map(id => BY_ID.get(+id));
    const spend = left.length;
    $('#progHint').innerHTML = !n ? 'Add records from All records.'
      : got === n ? 'Nice haul. Go home and play them.'
      : `${spend} to find${must ? ` · <b>${must} must-have${must === 1 ? '' : 's'}</b> up top` : ''}. Tap the box when it’s in your hands. Tap ★ for must-haves.`;
  }

  /* ---------- filter UI ---------- */
  function filterCount() { const u = S.ui; return u.k.length + u.fg.length + u.g.length; }
  function paintFilterBits() {
    const n = filterCount(), mine = S.ui.tab === 'mine';
    $('#filterBtn').classList.toggle('on', n > 0 && !mine);
    $('#filterBtn').hidden = mine;
    $('#filterN').textContent = n;
    const pills = $('#activePills');
    if (mine || !n) { pills.innerHTML = ''; return; }
    const u = S.ui;
    pills.innerHTML = [
      ...u.k.map(v => [`k`, v, KIND[v]]), ...u.fg.map(v => ['fg', v, v]), ...u.g.map(v => ['g', v, v]),
    ].map(([grp, v, label]) => `<button class="pill" data-grp="${grp}" data-v="${esc(v)}">${esc(label)} ${ICON.x.replace(/18/g, '13')}</button>`).join('')
      + `<button class="pill ghost" data-grp="all">Clear all</button>`;
  }
  function counts(field) {
    const m = new Map();
    for (const r of ALL) m.set(r[field], (m.get(r[field]) || 0) + 1);
    return m;
  }
  function chipGroup(title, grp, values, labels, cnt) {
    return `<h3>${title}</h3><div class="chips">${values.map(v =>
      `<button class="chip" data-grp="${grp}" data-v="${esc(v)}" aria-pressed="${S.ui[grp].includes(v)}">${esc(labels ? labels[v] : v)}<span>${cnt.get(v) || 0}</span></button>`).join('')}</div>`;
  }
  function renderFilters() {
    const gc = counts('g'), fc = counts('fg'), kc = counts('k');
    const genres = [...gc.keys()].sort((a, b) => gc.get(b) - gc.get(a));
    $('#filters').innerHTML = `<div class="grab"><i></i></div>
      <button class="sheet-x" data-close aria-label="Close">${ICON.x}</button>
      <div class="sheet-body">
        <h3>Sort</h3><div class="chips">${Object.entries(SORTS).map(([k, l]) =>
          `<button class="chip" data-sort="${k}" aria-pressed="${S.ui.sort === k}">${l}</button>`).join('')}</div>
        ${chipGroup('Release type', 'k', ['E', 'F', 'L'], KIND, kc)}
        ${chipGroup('Format', 'fg', FG_ORDER.filter(f => fc.has(f)), null, fc)}
        ${chipGroup('Genre', 'g', genres, null, gc)}
      </div>
      <div class="sheet-foot"><button class="btn quiet" data-reset>Reset</button><button class="btn primary" data-close id="showN"></button></div>`;
    paintShowN();
  }
  function paintShowN() {
    const b = $('#showN');
    if (b) { const n = filtered().length; b.textContent = n ? `Show ${n} record${n === 1 ? '' : 's'}` : 'No matches'; }
  }
  function toggleFilter(grp, v) {
    const arr = S.ui[grp], i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
    save(); apply();
  }

  /* ---------- detail sheet ---------- */
  let detailId = null;
  function openDetail(id) {
    detailId = id;
    renderDetail();
    openSheet($('#detail'));
  }
  function refreshDetail() { if (detailId && $('#detail').open) renderDetail(); }
  function renderDetail() {
    const r = BY_ID.get(detailId), e = entry(r.id);
    const q = encodeURIComponent(`${r.a} ${r.t}`.replace(/\s*\(.*?\)\s*/g, ' ').trim());
    const links = [
      ['RecordStoreDay.com', `https://recordstoreday.com/SpecialRelease/${r.id}`, '#ff5a2c'],
      ['Discogs', `https://www.discogs.com/search/?q=${q}&type=all`, '#bbb'],
      ['Spotify', `https://open.spotify.com/search/${q}`, '#1ed760'],
      ['Apple Music', `https://music.apple.com/us/search?term=${q}`, '#fa2d48'],
      ['YouTube', `https://www.youtube.com/results?search_query=${q}`, '#ff0033'],
      ['Bandcamp', `https://bandcamp.com/search?q=${q}`, '#1da0c3'],
    ];
    $('#detail').innerHTML = `<div class="grab"><i></i></div>
      <button class="sheet-x" data-close aria-label="Close">${ICON.x}</button>
      <div class="d-hero"><img class="d-art" src="${big(r)}" alt="Cover art for ${esc(r.t)}" width="420" height="420" style="background-image:url('${thumb(r)}')"></div>
      <div class="d-head"><div class="artist">${esc(r.a)}</div><div class="title">${esc(r.t)}</div></div>
      <div class="facts">
        <div class="fact"><b>${esc(r.f)}</b><small>Format</small></div>
        <div class="fact"><b class="${isRare(r) ? 'rare' : ''}">${qty(r.q)}</b><small>Made</small></div>
        <div class="fact"><b>${KIND[r.k]}</b><small>Type</small></div>
      </div>
      <div class="d-actions">
        <button class="btn ${e ? 'quiet' : 'primary'}" data-dact="want">${e ? ICON.check + ' On my list' : ICON.plus + ' Add to my list'}</button>
      </div>
      ${e ? `<div class="d-actions">
        <button class="btn quiet" data-dact="must" style="${e.m ? 'color:var(--must)' : ''}">${ICON.star} Must-have</button>
        <button class="btn got-btn ${e.g ? 'is' : ''}" data-dact="got">${ICON.check} ${e.g ? 'Got it!' : 'Got it?'}</button>
      </div>` : ''}
      <div class="d-sec">
        ${r.info.length ? `<h3>About</h3>${r.info.map(p => `<p>${esc(p)}</p>`).join('')}` : ''}
        ${r.tracks.length ? `<h3>Tracklist</h3><ul class="tracks">${r.tracks.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <h3>Listen & look up</h3>
        <div class="links">${links.map(([l, u, c]) => `<a href="${u}" target="_blank" rel="noopener"><i style="background:${c}"></i>${l}</a>`).join('')}</div>
        <p class="small-print">${esc(r.l)} · ${esc(r.g)} · ${KIND_LONG[r.k]} · Out Friday, Nov 27, 2026.</p>
      </div>`;
  }

  /* ---------- sheets with back-button support ---------- */
  let openCount = 0;
  function openSheet(d) {
    if (d.open) return;
    d.showModal();
    d.scrollTop = 0;
    d.focus({ preventScroll: true });
    openCount++;
    document.documentElement.classList.add('locked');
    history.pushState({ sheet: d.id }, '');
  }
  function closeSheet(d, fromPop) {
    if (!d.open) return;
    d.close();
    openCount = Math.max(0, openCount - 1);
    if (!openCount) document.documentElement.classList.remove('locked');
    if (!fromPop) history.back();
    if (d.id === 'detail') detailId = null;
  }
  window.addEventListener('popstate', () => {
    for (const d of document.querySelectorAll('dialog[open]')) closeSheet(d, true);
  });
  for (const d of document.querySelectorAll('dialog')) {
    d.addEventListener('cancel', ev => { ev.preventDefault(); closeSheet(d); });
    d.addEventListener('click', ev => { if (ev.target === d || ev.target.closest('[data-close]')) closeSheet(d); });
  }

  /* ---------- menu, sharing, import ---------- */
  function encodeList() {
    return Object.entries(S.list).map(([id, e]) => (+id).toString(36) + (e.m || e.g ? '~' + (e.m ? 'm' : '') + (e.g ? 'g' : '') : '')).join('.');
  }
  function decodeList(s) {
    const out = {};
    for (const part of s.split('.')) {
      const [b36, flags = ''] = part.split('~');
      const id = parseInt(b36, 36);
      if (BY_ID.has(id)) out[id] = { m: flags.includes('m') ? 1 : 0, g: flags.includes('g') ? 1 : 0, at: Date.now() };
    }
    return out;
  }
  function shareLink() { return location.origin + location.pathname + '#list=' + encodeList(); }
  function listText() {
    const rs = sorted(ALL.filter(r => entry(r.id)).slice());
    const lines = rs.map(r => { const e = entry(r.id); return `${e.g ? '✓' : e.m ? '★' : '•'} ${r.a} – ${r.t} (${r.f})`; });
    return `${DATA.name} · my list (${rs.length})\n\n${lines.join('\n')}\n\n★ must-have  ✓ got it`;
  }
  async function shareOrCopy(payload, copied) {
    try {
      if (navigator.share) { await navigator.share(payload); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(payload.url || payload.text); toast(copied); }
    catch (e) { prompt('Copy this:', payload.url || payload.text); }
  }
  function renderMenu() {
    const n = Object.keys(S.list).length;
    $('#menu').innerHTML = `<div class="grab"><i></i></div>
      <button class="sheet-x" data-close aria-label="Close">${ICON.x}</button>
      <div class="sheet-body">
        <h3>Your list · ${n} record${n === 1 ? '' : 's'}</h3>
        <div class="menu-list">
          <button data-m="link" ${n ? '' : 'disabled'}><span>🔗</span><span>Send my list to another device<span class="sub">A link that loads your picks, stars and checkmarks anywhere. Also a handy backup.</span></span></button>
          <button data-m="text" ${n ? '' : 'disabled'}><span>📝</span><span>Share as text<span class="sub">A plain list for Messages, Notes or the person at the counter.</span></span></button>
          <button data-m="reset-got" ${n ? '' : 'disabled'}><span>↺</span><span>Uncheck everything I got<span class="sub">Keeps the list, clears the checkmarks.</span></span></button>
          <button data-m="clear" class="danger" ${n ? '' : 'disabled'}><span>🗑</span><span>Clear my list</span></button>
        </div>
        <h3>About</h3>
        <p class="about">An unofficial, fan-made wish list for <b>RSD Black Friday</b>, Friday, November 27, 2026. Data comes from the official list at <a href="${DATA.source}" target="_blank" rel="noopener">recordstoreday.com</a> (${ALL.length} releases). Stores choose what they stock, so call ahead.</p>
        <p class="about">Your list lives on this device and saves with every tap. Nothing is sent anywhere. Add this page to your Home Screen and it works offline in the store.</p>
        <div class="menu-list" style="margin-top:12px"><a href="https://recordstoreday.com/Stores" target="_blank" rel="noopener"><span>📍</span><span>Find a participating store</span></a></div>
      </div>`;
  }
  function onMenu(act) {
    const m = $('#menu');
    if (act === 'link') shareOrCopy({ title: 'My RSD Black Friday list', url: shareLink() }, 'Link copied');
    if (act === 'text') shareOrCopy({ title: 'My RSD Black Friday list', text: listText() }, 'List copied');
    if (act === 'reset-got' && confirm('Uncheck every record you marked as got?')) {
      for (const e of Object.values(S.list)) e.g = 0;
      save(); ALL.forEach(r => paintRow(r.id)); afterListChange(); closeSheet(m); toast('Checkmarks cleared');
    }
    if (act === 'clear' && confirm('Remove every record from your list? This can’t be undone.')) {
      const ids = Object.keys(S.list); S.list = {}; save();
      ids.forEach(id => paintRow(+id)); afterListChange(); closeSheet(m); toast('List cleared');
    }
  }
  function checkImport() {
    const m = location.hash.match(/list=([0-9a-z.~]+)/i);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    const incoming = decodeList(m[1]);
    const n = Object.keys(incoming).length;
    if (!n) return;
    const have = Object.keys(S.list).length;
    const same = have === n && Object.keys(incoming).every(id => S.list[id]);
    let mode = 'replace';
    if (have && !same) {
      mode = confirm(`This link has ${n} records.\n\nOK = replace your current list (${have})\nCancel = add them to your list`) ? 'replace' : 'merge';
    }
    if (mode === 'replace') S.list = incoming;
    else for (const [id, e] of Object.entries(incoming)) S.list[id] = Object.assign(S.list[id] || {}, e);
    save();
    S.ui.tab = 'mine';
    toast(`Loaded ${n} record${n === 1 ? '' : 's'} from the link`);
  }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg, btn = '', fn = null) {
    const t = $('#toast');
    $('#toastMsg').textContent = msg;
    const b = $('#toastBtn');
    b.textContent = btn;
    b.onclick = fn ? () => { fn(); t.classList.remove('show'); } : null;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), btn ? 4500 : 1800);
  }

  /* ---------- countdown ---------- */
  function countdown() {
    const el = $('#countdown');
    const day = new Date(DATA.date);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const days = Math.round((startDay - startToday) / 864e5);
    el.innerHTML = days > 1 ? `<b>${days}</b> days` : days === 1 ? '<b>Tomorrow</b>' : days === 0 ? '<b>Today!</b>' : 'Nov 27';
  }

  /* ---------- offline art for your list ---------- */
  let warmT;
  function warmArt() {
    clearTimeout(warmT);
    warmT = setTimeout(() => {
      const c = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (!c) return;
      const urls = Object.keys(S.list).flatMap(id => { const r = BY_ID.get(+id); return r && r.img ? [thumb(r), big(r)] : []; });
      c.postMessage({ type: 'warm', urls });
    }, 1200);
  }

  /* ---------- install tip (iPhone Safari, not yet on Home Screen) ---------- */
  function installTip() {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    if (ios && !standalone && !S.tipX) $('#install').classList.add('show');
    $('#installX').onclick = () => { S.tipX = true; save(); $('#install').classList.remove('show'); };
  }

  /* ---------- events ---------- */
  function bind() {
    $('#list').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const id = +btn.closest('.row').dataset.id;
      const act = btn.dataset.act, e = entry(id);
      if (act === 'open') openDetail(id);
      if (act === 'want') setWant(id, !e);
      if (act === 'must') setFlag(id, 'm', !(e && e.m));
      if (act === 'got') setFlag(id, 'g', !(e && e.g));
    });
    $('#list').addEventListener('error', ev => {
      if (ev.target.tagName === 'IMG') ev.target.style.visibility = 'hidden';
    }, true);

    $('#detail').addEventListener('click', ev => {
      const b = ev.target.closest('[data-dact]');
      if (!b) return;
      const e = entry(detailId);
      if (b.dataset.dact === 'want') setWant(detailId, !e);
      if (b.dataset.dact === 'must') setFlag(detailId, 'm', !e.m);
      if (b.dataset.dact === 'got') setFlag(detailId, 'g', !e.g);
      renderDetail();
    });

    $('#filters').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (chip && chip.dataset.sort) {
        S.ui.sort = chip.dataset.sort; save(); apply();
        for (const c of $('#filters').querySelectorAll('[data-sort]')) c.setAttribute('aria-pressed', c.dataset.sort === S.ui.sort);
      } else if (chip) {
        toggleFilter(chip.dataset.grp, chip.dataset.v);
        chip.setAttribute('aria-pressed', S.ui[chip.dataset.grp].includes(chip.dataset.v));
      }
      if (ev.target.closest('[data-reset]')) {
        S.ui.k = []; S.ui.fg = []; S.ui.g = []; S.ui.sort = 'artist'; save(); apply(); renderFilters();
      }
      paintShowN();
    });
    $('#filterBtn').onclick = () => { renderFilters(); openSheet($('#filters')); };
    $('#activePills').addEventListener('click', ev => {
      const p = ev.target.closest('.pill');
      if (!p) return;
      if (p.dataset.grp === 'all') { S.ui.k = []; S.ui.fg = []; S.ui.g = []; save(); apply(); }
      else toggleFilter(p.dataset.grp, p.dataset.v);
    });
    $('#sortBtn').onclick = () => {
      const keys = Object.keys(SORTS);
      S.ui.sort = keys[(keys.indexOf(S.ui.sort) + 1) % keys.length];
      save(); apply();
    };

    const q = $('#q');
    q.value = S.ui.q;
    $('#searchWrap').classList.toggle('has', !!S.ui.q);
    q.addEventListener('input', () => {
      S.ui.q = q.value; save();
      $('#searchWrap').classList.toggle('has', !!q.value);
      apply();
    });
    q.addEventListener('keydown', ev => { if (ev.key === 'Enter') q.blur(); });
    $('#qClear').onclick = () => { q.value = ''; S.ui.q = ''; save(); $('#searchWrap').classList.remove('has'); apply(); };
    $('#main').addEventListener('touchstart', () => { if (document.activeElement === q) q.blur(); }, { passive: true });

    for (const t of document.querySelectorAll('.tab')) t.onclick = () => {
      if (S.ui.tab === t.dataset.tab) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
      S.ui.tab = t.dataset.tab; save(); apply(); scrollTo(0, 0);
    };

    $('#menuBtn').onclick = () => { renderMenu(); openSheet($('#menu')); };
    $('#menu').addEventListener('click', ev => { const b = ev.target.closest('[data-m]'); if (b) onMenu(b.dataset.m); });

    // another tab or window changed the list: pick it up
    window.addEventListener('storage', ev => {
      if (ev.key !== KEY) return;
      load(); ALL.forEach(r => paintRow(r.id)); updateCounts(); apply();
    });
    window.addEventListener('pagehide', save);
    window.addEventListener('hashchange', () => { checkImport(); ALL.forEach(r => paintRow(r.id)); updateCounts(); apply(); });
  }

  /* ---------- boot ---------- */
  async function boot() {
    const res = await fetch('data/releases.json');
    DATA = await res.json();
    KEY = 'rsd:' + DATA.event + ':v1';
    ALL = DATA.releases;
    for (const r of ALL) { r._sa = sortName(r.a); r._st = sortName(r.t); r._sl = sortName(r.l); BY_ID.set(r.id, r); }
    load();
    checkImport();
    buildRows();
    ALL.forEach(r => paintRow(r.id));
    bind();
    updateCounts();
    apply();
    countdown();
    installTip();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(warmArt).catch(() => {});
    }
  }
  boot().catch(err => {
    console.error(err);
    $('#empty').classList.add('show');
    $('#emptyH').textContent = 'Couldn’t load the list';
    $('#emptyP').textContent = 'Check your connection and reload.';
  });
})();
