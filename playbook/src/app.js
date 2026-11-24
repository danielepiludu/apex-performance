const COLORS = ['#E5262D', '#3B82F6', '#F5B02A', '#A855F7', '#22C55E', '#EC4899', '#14B8A6', '#F97316'];
const ICON = {
  agent: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  ath: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/>',
  team: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 14.5c2.8 0 5 1.6 5 4.5"/>',
  ex: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  wk: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4v2h6V4M9 11h6M9 15h6"/>',
  prog: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', side: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', hist: '<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7"/><path d="M4 4v4.7h4.7M12 8v4l3 2"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', back: '<path d="M15 5l-7 7 7 7"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>'
};
const ic = k => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;
const NAV = [
  ['athletes', 'Atleti e squadre', 'ath'],
  ['programs', 'Programmi', 'prog'], ['history', 'Storico', 'hist']
];
/* ---------- store: offline-first (local copy + queue), syncs to the shared db when online ---------- */
const Store = {
  mode: 'init', hadDb: false, failed: false, db: null, cols: {}, subs: {}, pend: [], flushing: false, remote: {}, idb: null, listeners: [], watching: {},
  note() { this.listeners.forEach(f => f()); },
  key: 'local',
  status() {
    if (this.mode === 'mem') return ['ok', Cloud.on ? 'Solo su questo dispositivo' : 'Salvato su questo dispositivo'];
    const off = navigator.onLine === false || this.failed;
    if (off) return ['off', this.pend.length ? `Offline · ${this.pend.length} ${this.pend.length === 1 ? 'modifica' : 'modifiche'} da sincronizzare` : 'Offline · dati sul dispositivo'];
    if (this.pend.length) return ['pend', `Sincronizzo ${this.pend.length}…`];
    return ['ok', 'Sincronizzato'];
  },
  async idbOpen() {
    if (this.idb) return this.idb;
    this.idb = await new Promise((res, rej) => { const r = indexedDB.open('playbook', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); setTimeout(() => rej(new Error('idb timeout')), 1500); });
    return this.idb;
  },
  async peek(key) {
    try { const db = await this.idbOpen(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; }
  },
  /* ogni account ha la sua copia sul dispositivo: 'cache:local' senza account, 'cache:<uid>' con Google */
  async open(key) {
    this.key = key || 'local';
    try {
      let v = await this.peek('cache:' + this.key);
      if (!v && this.key === 'local') v = await this.peek('cache'); // dati salvati dalle versioni precedenti
      if (v) { this.cols = v.cols || {}; this.pend = v.pend || []; this.hadDb = !!v.hadDb; return true; }
    } catch (e) { this.idb = null; try { const v = JSON.parse(localStorage.getItem('pb_cache:' + this.key) || 'null'); if (v) { this.cols = v.cols || {}; this.pend = v.pend || []; return true; } } catch (e2) { } }
    return false;
  },
  persist() {
    const v = { cols: this.cols, pend: this.pend, hadDb: this.hadDb };
    try { if (this.idb) { this.idb.transaction('kv', 'readwrite').objectStore('kv').put(v, 'cache:' + this.key); return; } } catch (e) { }
    try { localStorage.setItem('pb_cache:' + this.key, JSON.stringify(v)); } catch (e) { }
  },
  async connect() {
    if (Cloud.on && Cloud.user) { this.db = cloudDb(Cloud.user.uid); this.mode = 'db'; this.hadDb = true; this.failed = false; }
    else this.mode = 'mem';
    Object.keys(this.subs).forEach(c => this.watch(c)); this.flush(); this.note();
  },
  watch(col) {
    if (!this.db || this.watching[col]) return; this.watching[col] = true;
    this.db.collection(col).onSnapshot(s => {
      // finché il server non ha risposto, la cache di Firestore può essere vuota: teniamo la nostra copia
      if (s.fromCache && !this.remote[col] && !s.docs.length && Object.keys(this.cols[col] || {}).length) return;
      const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); });
      for (const p of this.pend) if (p.col === col) { if (p.op === 'set') m[p.id] = clone(p.data); else delete m[p.id]; }
      if (!s.fromCache) { this.remote[col] = true; this.failed = false; }
      this.cols[col] = m; this.persist(); this.emit(col); this.note();
    }, e => { console.error(e); this.failed = true; this.watching[col] = false; this.note(); setTimeout(() => this.watch(col), 20000); });
  },
  sub(col, cb) {
    (this.subs[col] = this.subs[col] || []).push(cb);
    this.watch(col); setTimeout(() => this.emit(col), 0);
  },
  emit(col) { const docs = Object.entries(this.cols[col] || {}).map(([id, d]) => ({ id, ...clone(d) })); (this.subs[col] || []).forEach(cb => cb(docs)); },
  queue(op) {
    // tiene solo l'ultima modifica in attesa per lo stesso documento (non quella già in invio)
    const from = this.flushing ? 1 : 0;
    this.pend = this.pend.filter((p, k) => k < from || !(p.col === op.col && p.id === op.id));
    this.pend.push(op);
  },
  async set(col, id, data) { (this.cols[col] = this.cols[col] || {})[id] = clone(data); this.queue({ op: 'set', col, id, data: clone(data) }); this.persist(); this.emit(col); this.note(); this.flush(); },
  async del(col, id) { delete (this.cols[col] || {})[id]; this.queue({ op: 'del', col, id }); this.persist(); this.emit(col); this.note(); this.flush(); },
  async flush() {
    if (this.flushing || !this.db || this.mode === 'mem') return; this.flushing = true;
    try {
      while (this.pend.length) {
        const p = this.pend[0], d = this.db.collection(p.col).doc(p.id);
        await (p.op === 'set' ? d.set(p.data) : d.delete());
        this.pend.shift(); this.failed = false; this.persist(); this.note();
      }
    } catch (e) {
      console.error(e);
      const code = (e && e.code) || '';
      if (/invalid-argument|permission-denied|failed-precondition|out-of-range/.test(code)) {
        // rifiuto definitivo (es. documento troppo grande): si scarta e si prosegue con le altre modifiche
        const bad = this.pend.shift(); this.persist();
        toast(`Una modifica non è stata salvata online (${bad && bad.col === 'athletes' ? 'scheda persona' : bad && bad.col === 'programs' ? 'programma' : 'dati'}): ${code}`);
        this.flushing = false; return this.flush();
      }
      this.failed = true; setTimeout(() => this.flush(), 15000);
    }
    this.flushing = false; this.note();
  }
};
window.addEventListener('online', () => { Store.failed = false; Store.flush(); Store.note(); });
window.addEventListener('offline', () => Store.note());
/* ---------- state ---------- */
const S = { view: 'athletes', team: 'all', teams: [], athletes: [], programs: [], logs: [], q: '', min: false, open: false, loaded: { teams: false, athletes: false }, pid: null, P: null, density: 'normal', mw: 0 };
try { S.density = localStorage.getItem('pb_density') || 'normal'; } catch (e) { }
try { S.team = localStorage.getItem('cd_team') || 'all'; S.min = localStorage.getItem('cd_min') === '1'; } catch (e) { }
const teamById = id => S.teams.find(t => t.id === id);
const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'it');
const inTeam = a => S.team === 'all' || (a.teamIds || []).includes(S.team);
/* ---------- modal ---------- */
function modal(title, body, footer, onMount, opts = {}) {
  const bg = document.createElement('div'); bg.className = 'ov';
  bg.innerHTML = `<div class="modal${opts.cls ? ' ' + opts.cls : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${body}<div class="mf">${footer}</div></div>`;
  document.body.appendChild(bg);
  const m = { el: bg, close() { bg.remove(); if (opts.onClose) opts.onClose(); else if (S.loaded.teams) shell(); } };
  bg.addEventListener('mousedown', e => { if (e.target === bg) m.close(); });
  bg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.close());
  onMount && onMount(bg, m);
  if (!opts.noFocus) { const f = bg.querySelector('input,textarea'); if (f) f.focus({ preventScroll: true }); }
  return m;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const pm = $$('.pop'); if (pm.length) { pm.forEach(x => x.remove()); return; } const o = $$('.ov').pop(); if (o) { const c = o.querySelector('[data-close]'); c ? c.click() : o.remove(); } } });
/* ---------- render shell ---------- */
function shell() {
  try { localStorage.setItem('pb_last', JSON.stringify({ view: S.view, pid: S.pid })); } catch (e) { }
  const cur = S.teams.find(t => t.id === S.team);
  $('#app').innerHTML = `
  ${S.open ? '<div class="scrim" data-a="menu"></div>' : ''}
  <aside class="side ${S.min ? 'min' : ''} ${S.open ? 'open' : ''}">
    <div class="logo"><img class="lmark" src="${LOGO}" alt=""><span>${APP_NAME}</span></div>
    ${NAV.map(([k, l, i, ph]) => `<button class="nv" data-v="${k}" ${S.view === k || (k === 'programs' && (S.view === 'editor' || S.view === 'print')) ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${ph ? `<em class="soon" style="font-style:normal"><span>Fase ${ph}</span></em>` : ''}</button>`).join('')}
    <div class="spacer"></div>
    ${poweredHTML()}
    <div class="sfoot"><button class="nv" data-v="settings" ${S.view === 'settings' ? 'aria-current="page"' : ''}>${ic('gear')}<span>Impostazioni</span></button><button class="nv" data-a="min" aria-label="Comprimi la barra laterale">${ic('side')}<span>Comprimi</span></button></div>
  </aside>
  <div class="main">
    <header class="bar">
      <button class="ibtn hmenu" data-a="menu" aria-label="Menu">${ic('menu')}</button><img class="lmark mlogo" src="${LOGO}" alt="">
      <div class="teamsel" style="--tc:${cur ? cur.color : 'var(--muted)'}"><i></i>
        <select id="teamsel" aria-label="Squadra o cliente"><option value="all">Tutti</option>${S.teams.map(t => `<option value="${t.id}" ${t.id === S.team ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}<option disabled>──────────</option><option value="__new">＋ Nuova squadra o cliente…</option></select></div>
      <div class="grow"></div>
      <span class="stat" id="mode"></span>
    </header>
    <main class="content${S.view === 'editor' || S.view === 'print' ? ' wide' : ''}"><div class="page" id="page"></div></main>
  </div>
  <nav class="tabbar" aria-label="Sezioni">${[...NAV.map(([k, l, i]) => [k, l.split(' ')[0], i]), ['settings', 'Altro', 'gear']].map(([k, l, i]) => `<button data-v="${k}" ${S.view === k || (k === 'programs' && (S.view === 'editor' || S.view === 'print')) ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
  showStat(); page();
}
function showStat() {
  const m = $('#mode'); if (!m) return; const [k, t] = Store.status();
  m.innerHTML = `<i class="sd ${k}"></i><span>${esc(t)}</span>`;
}
Store.listeners.push(showStat);
function page() {
  const el = $('#page'); if (!el) return;
  if (!S.loaded.teams || !S.loaded.athletes) { el.innerHTML = '<div class="soonp">Caricamento…</div>'; return; }
  if (S.view === 'athletes') return athletesView(el);
  if (S.view === 'programs') return programsView(el);
  if (S.view === 'editor') return editorView(el);
  if (S.view === 'print') return printView(el);
  if (S.view === 'settings') return settingsView(el);
  if (S.view === 'history') return historyView(el);
  S.view = 'athletes'; return athletesView(el);
}
/* ---------- athletes ---------- */
function athletesView(el) {
  const list = S.athletes.filter(inTeam).filter(a => !S.q || [a.name, a.role, a.goal].filter(Boolean).join(' ').toLowerCase().includes(S.q.toLowerCase())).sort(byName);
  const cur = S.teams.find(t => t.id === S.team);
  el.innerHTML = `<div class="ph"><div><h1>${cur ? `${cur.logo ? `<img class="glogo" src="${cur.logo}" alt="">` : `<span class="gdot" style="background:${cur.color}"></span>`}${esc(cur.name)}` : 'Tutti gli atleti'}</h1><div class="sub">${list.length} ${list.length === 1 ? 'atleta' : 'atleti'}${cur ? '' : ' · ' + S.teams.length + ' tra squadre e clienti'}</div></div>${cur ? '<button class="btn sm" data-a="editgrp" aria-label="Modifica squadra o cliente">Modifica gruppo</button>' : ''}<div class="grow"></div>
    <input class="inp search" id="q" type="search" placeholder="Cerca per nome o ruolo" value="${esc(S.q)}" aria-label="Cerca">
    <button class="btn pri" data-a="newath">${ic('plus').replace('<svg', '<svg width="16" height="16" style="stroke:#fff;fill:none;stroke-width:2"')}Aggiungi</button></div>
    ${list.length ? athGroupsHTML(list, cur) : `<div class="empty"><b>${S.q ? 'Nessun risultato' : 'Ancora nessun atleta'}</b>${S.q ? 'Prova con un altro nome.' : 'Aggiungi il primo atleta con il pulsante in alto: puoi creare la squadra o il cliente direttamente nella scheda.'}</div>`}`;
  el.onclick = e => { const g = e.target.closest('[data-grp]'); if (!g) return; const k = g.dataset.grp; S.coll.has(k) ? S.coll.delete(k) : S.coll.add(k); try { localStorage.setItem('pb_coll', JSON.stringify([...S.coll])); } catch (e2) { } athletesView(el); };
  const q = $('#q'); if (q) q.oninput = () => { S.q = q.value; const p = q.selectionStart; athletesView(el); const n = $('#q'); n.focus(); n.setSelectionRange(p, p); };
}
/* atleti divisi per squadra o cliente, in ordine alfabetico; chi è in più gruppi compare in ognuno */
S.coll = new Set(); try { S.coll = new Set(JSON.parse(localStorage.getItem('pb_coll') || '[]')); } catch (e) { }
function athRowHTML(a, skipTeam) {
  const ts = (a.teamIds || []).map(teamById).filter(Boolean), c = (teamById(skipTeam) || ts[0] || {}).color || '#444', other = ts.filter(t => t.id !== skipTeam);
  return `<div class="row" data-ath="${a.id}" tabindex="0"><div class="av" style="--ac:${c}">${a.photo ? `<img src="${a.photo}" alt="">` : esc(initials(a.name))}</div>
      <div><div class="rn">${esc(a.name)}</div><div class="rs">${esc((a.kind === 'client' ? ['Cliente', a.goal, a.level, age(a.birth)] : [a.role, age(a.birth)]).filter(Boolean).join(' · ') || 'Nessun dettaglio')}${a.injuries ? ' · <span style="color:#ff8a8f">infortunio/note</span>' : ''}</div></div>
      <div class="chips">${other.map(t => `<span class="chip" style="--tc:${t.color}" title="È anche in ${esc(t.name)}"><i></i>anche ${esc(t.name)}</span>`).join('')}</div></div>`;
}
function athGroupsHTML(list, cur) {
  if (cur) return `<div class="list">${list.map(a => athRowHTML(a, cur.id)).join('')}</div>`;
  const groups = S.teams.slice().sort(byName).map(t => ({ id: t.id, t, items: list.filter(a => (a.teamIds || []).includes(t.id)) }));
  groups.push({ id: '_none', t: null, items: list.filter(a => !(a.teamIds || []).some(teamById)) });
  return groups.filter(g => g.items.length || (g.t && !S.q)).map(g => {
    const open = !S.coll.has(g.id) || S.q, n = g.items.length;
    const mark = g.t ? (g.t.logo ? `<img class="glogo" src="${g.t.logo}" alt="">` : `<span class="gdot" style="background:${g.t.color}"></span>`) : '<span class="gdot" style="background:#555"></span>';
    return `<section class="agrp" style="--tc:${g.t ? g.t.color : '#555'}">
      <button class="agh" data-grp="${g.id}" aria-expanded="${!!open}">${mark}<b>${g.t ? esc(g.t.name) : 'Senza squadra o cliente'}</b><span class="muted">${n} ${n === 1 ? 'atleta' : 'atleti'}</span><span class="grow"></span><span class="chev">${open ? '▾' : '▸'}</span></button>
      ${open ? (n ? `<div class="list">${g.items.map(a => athRowHTML(a, g.t && g.t.id)).join('')}</div>` : '<div class="rs agempty">Nessun atleta in questo gruppo.</div>') : ''}</section>`;
  }).join('');
}
/* scheda persona: Atleta (ruolo, sport) oppure Cliente di personal (obiettivo, misure antropometriche con storico) */
const GOALS = ['Dimagrimento', 'Tonificazione', 'Ipertrofia', 'Forza', 'Salute e benessere', 'Postura e mal di schiena', 'Preparazione a un evento', 'Ritorno dopo un infortunio'];
function isClientDefault() {
  if (S.team === 'all') return false;
  const t = teamById(S.team), mem = S.athletes.filter(a => (a.teamIds || []).includes(S.team));
  const typed = mem.filter(a => a.kind);
  if (typed.length) return typed.filter(a => a.kind === 'client').length > typed.length / 2;
  return !!(t && /client|personal|privat/i.test(t.name));
}
function athleteForm(id) {
  const a = id ? clone(S.athletes.find(x => x.id === id)) : { name: '', birth: '', role: '', injuries: '', contact: '', teamIds: S.team !== 'all' ? [S.team] : [], kind: isClientDefault() ? 'client' : 'athlete' };
  a.kind = a.kind || 'athlete';
  const sel = new Set(a.teamIds || []);
  let kind = a.kind;
  const m = modal(id ? (kind === 'client' ? 'Modifica cliente' : 'Modifica atleta') : 'Nuovo atleta o cliente', `
    <div class="seg full kseg" role="group" aria-label="Tipo"><button type="button" data-k="athlete" aria-pressed="${kind === 'athlete'}">Atleta</button><button type="button" data-k="client" aria-pressed="${kind === 'client'}">Cliente personal</button></div>
    ${id ? athProgramsHTML(id) : ''}
    ${imgField('f-img', a.photo, 'Foto', 'photo')}
    <div class="fld"><label for="f-n">Nome e cognome</label><input id="f-n" class="inp" value="${esc(a.name)}" autocomplete="off"></div>
    <div class="two"><div class="fld"><label for="f-b">Data di nascita</label><input id="f-b" type="date" class="inp" value="${esc(a.birth)}"></div>
      <div class="fld k-ath"><label for="f-r">Ruolo / sport</label><input id="f-r" class="inp" value="${esc(a.role)}" autocomplete="off"></div></div>
    <div class="two k-cli"><div class="fld"><label for="f-o">Obiettivo</label><input id="f-o" class="inp" list="f-ol" value="${esc(a.goal || '')}" placeholder="Es. Dimagrimento" autocomplete="off"><datalist id="f-ol">${GOALS.map(g => `<option value="${g}">`).join('')}</datalist></div>
      <div class="fld"><label for="f-l">Livello</label><select id="f-l" class="inp">${['', 'Principiante', 'Intermedio', 'Avanzato'].map(l => `<option value="${l}" ${a.level === l ? 'selected' : ''}>${l || '—'}</option>`).join('')}</select></div></div>
    <div class="fld"><label>Gruppo (squadra o clienti)</label><div class="chk" id="f-t"></div>
      <div class="addg"><input id="f-g" class="inp" placeholder="Nuovo gruppo" autocomplete="off"><button type="button" class="btn" id="f-ga">＋ Aggiungi</button></div></div>
    <div class="fld"><label for="f-i" id="f-il">${kind === 'client' ? 'Patologie, infortuni e note' : 'Infortuni e note'}</label><textarea id="f-i" class="inp" rows="3">${esc(a.injuries)}</textarea></div>
    <div class="fld"><label for="f-c">Contatti</label><input id="f-c" class="inp" value="${esc(a.contact)}" placeholder="Telefono o email" autocomplete="off"></div>`,
    `${id ? '<button class="btn danger" id="f-del">Elimina</button>' : ''}<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="f-ok">Salva</button>`,
    (el, m) => {
      const setKind = k => {
        kind = k; $$('.kseg button', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
        $$('.k-ath', el).forEach(x => { x.hidden = k !== 'athlete'; }); $$('.k-cli', el).forEach(x => { x.hidden = k !== 'client'; });
        $('#f-il', el).textContent = k === 'client' ? 'Patologie, infortuni e note' : 'Infortuni e note';
        if (!id) $('h3', el).textContent = k === 'client' ? 'Nuovo cliente' : 'Nuovo atleta';
      };
      $$('.kseg button', el).forEach(b => b.onclick = () => setKind(b.dataset.k));
      setKind(kind);
      el.querySelectorAll('[data-openprog]').forEach(b => b.onclick = () => { el.remove(); openEditor(b.dataset.openprog); });
      el.querySelectorAll('[data-openhist]').forEach(b => b.onclick = () => { el.remove(); H.ath = b.dataset.openhist; H.ex = ''; S.view = 'history'; shell(); });
      const draw = () => {
        const box = $('#f-t', el); box.innerHTML = S.teams.map(t => `<button type="button" data-t="${t.id}" style="--tc:${t.color}" aria-pressed="${sel.has(t.id)}"><i></i>${esc(t.name)}</button>`).join('') || '<span class="rs">Nessuno ancora: scrivi un nome qui sotto.</span>';
        box.querySelectorAll('button').forEach(b => b.onclick = () => { const t = b.dataset.t; sel.has(t) ? sel.delete(t) : sel.add(t); b.setAttribute('aria-pressed', sel.has(t)); });
      };
      draw();
      const addG = async () => {
        const inp = $('#f-g', el), name = inp.value.trim(); if (!name) return;
        const ex = S.teams.find(x => x.name.toLowerCase() === name.toLowerCase()); let tid = ex && ex.id;
        if (!tid) { tid = uid(); await Store.set('teams', tid, { name, color: COLORS[S.teams.length % COLORS.length], createdAt: Date.now() }); }
        sel.add(tid); inp.value = ''; draw();
      };
      $('#f-ga', el).onclick = addG; $('#f-g', el).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addG(); } };
      const img = wireImg(el, 'f-img', a.photo, 'photo');
      $('#f-ok', el).onclick = async () => {
        const name = $('#f-n', el).value.trim(); if (!name) { $('#f-n', el).focus(); return; }
        const d = { name, kind, birth: $('#f-b', el).value, injuries: $('#f-i', el).value.trim(), contact: $('#f-c', el).value.trim(), teamIds: [...sel], photo: img.get(), updatedAt: Date.now() };
        if (kind === 'athlete') Object.assign(d, { role: $('#f-r', el).value.trim() });
        else Object.assign(d, { role: '', goal: $('#f-o', el).value.trim(), level: $('#f-l', el).value });
        const keep = id ? stripId(a) : {};
        await Store.set('athletes', id || uid(), { ...keep, ...(id ? { createdAt: a.createdAt } : { createdAt: Date.now() }), ...d }); m.close(); toast('Salvato');
      };
      const del = $('#f-del', el);
      if (del) del.onclick = () => {
        const progs = S.programs.filter(p => p.athleteId === id), logs = S.logs.filter(l => l.athleteId === id);
        const extra = [progs.length ? `${progs.length} ${progs.length === 1 ? 'programma' : 'programmi'}` : '', logs.length ? `${logs.length} ${logs.length === 1 ? 'allenamento registrato' : 'allenamenti registrati'}` : ''].filter(Boolean).join(' e ');
        del.textContent = extra ? `Elimina anche ${extra}. Confermi?` : 'Confermi l\'eliminazione?';
        del.onclick = async () => {
          for (const p of progs) await Store.del('programs', p.id);
          for (const l of logs) await Store.del('logs', l.id);
          await Store.del('athletes', id); m.close(); toast('Eliminato');
        };
      };
    });
}
/* ---------- groups (squadre e clienti) ---------- */
function teamForm(id, after) {
  const t = id ? clone(S.teams.find(x => x.id === id)) : { name: '', color: COLORS[S.teams.length % COLORS.length] };
  let col = t.color;
  modal(id ? 'Modifica squadra o cliente' : 'Nuova squadra o cliente', `
    ${imgField('t-img', t.logo, 'Logo', 'logo')}
    <div class="fld"><label for="t-n">Nome</label><input id="t-n" class="inp" value="${esc(t.name)}" autocomplete="off"></div>
    <div class="fld"><label>Colore</label><div class="sw" id="t-c">${COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-pressed="${c === col}" aria-label="Colore ${c}"></button>`).join('')}</div></div>`,
    `${id ? '<button class="btn danger" id="t-del">Elimina</button>' : ''}<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="t-ok">Salva</button>`,
    (el, m) => {
      el.querySelectorAll('#t-c button').forEach(b => b.onclick = () => { col = b.dataset.c; el.querySelectorAll('#t-c button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
      const img = wireImg(el, 't-img', t.logo, 'logo');
      $('#t-ok', el).onclick = async () => { const name = $('#t-n', el).value.trim(); if (!name) { $('#t-n', el).focus(); return; } const tid = id || uid(); await Store.set('teams', tid, { name, color: col, logo: img.get(), createdAt: t.createdAt || Date.now() }); m.close(); toast('Salvato'); after && after(tid); };
      const del = $('#t-del', el);
      if (del) del.onclick = () => { del.textContent = 'Gli atleti restano. Confermi?'; del.onclick = async () => {
        for (const a of S.athletes.filter(x => (x.teamIds || []).includes(id))) await Store.set('athletes', a.id, { ...stripId(a), teamIds: a.teamIds.filter(x => x !== id) });
        await Store.del('teams', id); if (S.team === id) setTeam('all'); m.close(); toast('Eliminata');
      }; };
    });
}
function setTeam(id) { S.team = id; try { localStorage.setItem('cd_team', id); } catch (e) { } shell(); }
/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const nv = t.closest('[data-v]'); if (nv) { if (S.view === 'editor' || S.view === 'print') closeEditor(); S.view = nv.dataset.v; S.open = false; shell(); return; }
  const a = t.closest('[data-a]');
  if (a) {
    const k = a.dataset.a;
    if (k === 'menu') { S.open = !S.open; shell(); } else if (k === 'min') { S.min = !S.min; try { localStorage.setItem('cd_min', S.min ? '1' : '0'); } catch (e) { } shell(); }
    else if (k === 'newath') athleteForm(null); else if (k === 'editgrp') teamForm(S.team);
    return;
  }
  const r = t.closest('[data-ath]'); if (r) athleteForm(r.dataset.ath);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-ath]')) e.target.click(); });
document.addEventListener('change', e => {
  if (e.target.id !== 'teamsel') return;
  if (e.target.value === '__new') { teamForm(null, id => setTeam(id)); e.target.value = S.team; return; }
  setTeam(e.target.value);
});
