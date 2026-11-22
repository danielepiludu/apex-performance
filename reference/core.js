/* ============ utilities ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));
function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function intOnly(v) {
  const s = String(v ?? '').trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}
function fmtN(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}
const roundTo = (x, step) => (step > 0 ? Math.round(x / step) * step : x);
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function fmtDate(iso, withYear = true) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}
function ageOf(iso) {
  if (!iso) return null;
  const b = new Date(iso + 'T12:00:00'), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return (p[0][0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase();
}
const AV_COLORS = ['#2B59C3', '#E4572E', '#17998A', '#8A4FD0', '#C2185B', '#D18A00', '#3C7A3E', '#007C9E'];
function avColor(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV_COLORS[h % AV_COLORS.length]; }

/* ============ constants ============ */
const BLOCK_TYPES = {
  bal: { label: 'Balistico', color: '#111111', rgb: [17, 17, 17], emph: 'Jump' },
  pow: { label: 'Potenza', color: '#111111', rgb: [17, 17, 17], emph: 'Ballistic' },
  str: { label: 'Forza arto inferiore + complementari', color: '#111111', rgb: [17, 17, 17], emph: 'Grinding' },
  acc: { label: 'Complementari', color: '#111111', rgb: [17, 17, 17], emph: 'Accessory' },
  warm: { label: 'Riscaldamento', color: '#111111', rgb: [17, 17, 17], emph: 'Warm Up' },
  spd: { label: 'Velocità', color: '#111111', rgb: [17, 17, 17], emph: 'Speed' },
  cond: { label: 'Condizionamento', color: '#111111', rgb: [17, 17, 17], emph: 'Condition' },
  free: { label: 'Libero', color: '#111111', rgb: [17, 17, 17], emph: '' }
};
const DEFAULT_TEMPLATE = ['bal', 'pow', 'str', 'acc'];
const EMPH_IT = { Ballistic: 'Balistico', Jump: 'Salti', Grinding: 'Forza', Accessory: 'Complementari', Speed: 'Velocità', Mobility: 'Mobilità', 'Warm Up': 'Riscaldamento', Technical: 'Tecnica', Condition: 'Condizionamento' };
const FIELDS = ['sets', 'reps', 'load', 'rest', 'tempo', 'rpe'];
const FIELD_LABEL = { sets: 'Serie', reps: 'Rip', load: 'Kg', rest: 'Rec', tempo: 'Tempo', rpe: 'RPE' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PRESETS = [
  { k: 'none', name: 'Costante', desc: 'Stessi valori ogni settimana', p: { type: 'none' } },
  { k: 'kg25', name: 'Carico +2,5 kg a settimana', desc: 'Complementari, arti superiori', p: { type: 'load_kg', step: 2.5 } },
  { k: 'kg5', name: 'Carico +5 kg a settimana', desc: 'Forza arto inferiore', p: { type: 'load_kg', step: 5 } },
  { k: 'pct', name: 'Carico +2,5% a settimana', desc: 'Incremento percentuale, arrotondato a 2,5 kg', p: { type: 'load_pct', step: 2.5, round: 2.5 } },
  { k: 'wave', name: 'Onda con scarico finale', desc: '+5% a settimana, ultima settimana al 85%', p: { type: 'load_pct', step: 5, round: 2.5, deload: true, deloadPct: 85 } },
  { k: 'setsw', name: 'Volume: +1 serie a settimana', desc: 'Fino a un massimo di 6 serie', p: { type: 'sets', inc: 1, every: 1, max: 6 } },
  { k: 'sets2', name: 'Volume: +1 serie ogni 2 settimane', desc: 'Salita più graduale', p: { type: 'sets', inc: 1, every: 2, max: 6 } },
  { k: 'reps', name: 'Volume: +1 ripetizione a settimana', desc: 'Solo se le rip sono un numero', p: { type: 'reps', inc: 1, every: 1, max: 0 } },
  { k: 'dbl', name: 'Doppia progressione', desc: 'Sale di rip fino al massimo, poi +carico e riparte', p: { type: 'double', repMax: 0, step: 2.5 } },
  { k: 'rpe', name: 'RPE crescente', desc: '+0,5 RPE a settimana, resto invariato', p: { type: 'none', rpeStep: 0.5 } }
];
const PSHORT = { none: '—', kg25: '+2,5 kg', kg5: '+5 kg', pct: '+2,5 %', wave: 'Onda', setsw: '+1 serie', sets2: '+1 serie/2 sett', reps: '+1 rip', dbl: 'Doppia', rpe: 'RPE +0,5' };
PRESETS.forEach(x => { x.short = PSHORT[x.k]; });
function progEq(a, b) {
  const n = p => {
    p = p || {}; const t = p.type || 'none', o = { t, dl: !!p.deload, dp: p.deload ? (p.deloadPct || 90) : 0, ds: p.deload ? !!p.deloadSets : false, rpe: p.rpeStep || 0 };
    if (t === 'load_kg') o.st = num(p.step) || 0;
    if (t === 'load_pct') { o.st = num(p.step) || 0; o.rd = p.round || 2.5; }
    if (t === 'sets' || t === 'reps') { o.inc = p.inc || 1; o.ev = p.every || 1; o.mx = p.max || 0; }
    if (t === 'double') { o.rm = p.repMax || 0; o.st = num(p.step) || 0; }
    return o;
  };
  const x = n(a), y = n(b); return Object.keys(x).length === Object.keys(y).length && Object.keys(x).every(k => x[k] === y[k]);
}
function presetKeyOf(p) { const f = PRESETS.find(x => progEq(x.p, p || { type: 'none' })); return f ? f.k : 'custom'; }
const PTYPE_LABEL = { none: 'Costante', load_kg: 'Carico in kg', load_pct: 'Carico in %', sets: 'Serie', reps: 'Ripetizioni', double: 'Doppia progressione' };

/* ============ progression engine ============ */
function progVals(row, i, W) {
  const b = row.w[0], p = row.prog || {};
  const v = { sets: b.sets, reps: b.reps, load: b.load, rest: b.rest, tempo: b.tempo, rpe: b.rpe };
  if (i === 0) return v;
  const L = num(b.load), S = intOnly(b.sets), R = intOnly(b.reps), E = num(b.rpe);
  const rnd = p.round || 2.5;
  switch (p.type) {
    case 'load_kg':
      if (L != null) v.load = fmtN(L + (num(p.step) || 0) * i);
      break;
    case 'load_pct':
      if (L != null) v.load = fmtN(roundTo(L * (1 + ((num(p.step) || 0) / 100) * i), rnd));
      break;
    case 'sets':
      if (S != null) {
        let s = S + Math.floor(i / (p.every || 1)) * (p.inc || 1);
        if (p.max) s = Math.min(s, Math.max(p.max, S));
        v.sets = String(s);
      }
      break;
    case 'reps':
      if (R != null) {
        let r = R + Math.floor(i / (p.every || 1)) * (p.inc || 1);
        if (p.max) r = Math.min(r, Math.max(p.max, R));
        v.reps = String(r);
      }
      break;
    case 'double':
      if (R != null) {
        const max = p.repMax && p.repMax > R ? p.repMax : R + 3;
        let reps = R, load = L;
        for (let j = 0; j < i; j++) {
          if (reps < max) reps++;
          else { reps = R; if (load != null) load = load + (num(p.step) || 0); }
        }
        v.reps = String(reps);
        if (load != null) v.load = fmtN(load);
      }
      break;
  }
  if (p.rpeStep && E != null) v.rpe = fmtN(Math.min(10, E + p.rpeStep * i));
  return v;
}
function autoVals(row, i, W) {
  const p = row.prog || {};
  if (p.deload && W >= 3 && i === W - 1) {
    const v = progVals(row, W - 2, W);
    const L = num(v.load);
    if (L != null) v.load = fmtN(roundTo(L * ((p.deloadPct || 90) / 100), p.round || 2.5));
    if (p.deloadSets) { const S = intOnly(v.sets); if (S != null) v.sets = String(Math.max(1, S - 1)); }
    const E = num(v.rpe); if (E != null) v.rpe = fmtN(Math.max(1, E - 1));
    return v;
  }
  return progVals(row, i, W);
}
function recompute(row, W) {
  row.w = row.w || [];
  while (row.w.length < W) row.w.push({ m: {} });
  row.w.length = W;
  row.w[0].m = {};
  for (let i = 1; i < W; i++) {
    const w = row.w[i]; w.m = w.m || {};
    const a = autoVals(row, i, W);
    for (const f of FIELDS) if (!w.m[f]) w[f] = a[f] ?? '';
  }
}
function newRow(name, W, extra) {
  const row = { id: uid(), name, note: '', prog: { type: 'none' }, w: [{ sets: '3', reps: '5', load: '', rest: '', tempo: '', rpe: '', m: {} }], ...extra };
  recompute(row, W);
  return row;
}
function progLabel(p) {
  p = p || { type: 'none' };
  let s = '';
  const st = num(p.step);
  switch (p.type) {
    case 'load_kg': s = `Carico ${st >= 0 ? '+' : ''}${fmtN(st)} kg/sett`; break;
    case 'load_pct': s = `Carico ${st >= 0 ? '+' : ''}${fmtN(st)}%/sett`; break;
    case 'sets': s = `+${p.inc || 1} serie ${p.every > 1 ? 'ogni ' + p.every + ' sett' : 'a sett'}`; break;
    case 'reps': s = `+${p.inc || 1} rip ${p.every > 1 ? 'ogni ' + p.every + ' sett' : 'a sett'}`; break;
    case 'double': s = 'Doppia progressione'; break;
    default: s = p.rpeStep ? `RPE +${fmtN(p.rpeStep)}/sett` : 'Costante';
  }
  if (p.type !== 'none' && p.rpeStep) s += ` · RPE +${fmtN(p.rpeStep)}`;
  if (p.deload) s += ' · scarico finale';
  return s;
}

/* ============ model helpers ============ */
function blockLabel(b) { return b.title || BLOCK_TYPES[b.type]?.label || 'Blocco'; }
function newBlock(type) { return { id: uid(), type, title: '', rows: [] }; }
function newSession(n, types) { return { id: uid(), name: 'Sessione ' + n, blocks: (types || DEFAULT_TEMPLATE).map(newBlock) }; }
function newProgram({ athlete, title, start, weeks, sessions, types }) {
  const P = {
    id: uid(), athleteId: athlete.id, athleteName: athlete.name, title, start, weeks, round: 2.5,
    sessions: [], createdAt: Date.now(), updatedAt: Date.now()
  };
  for (let i = 1; i <= sessions; i++) P.sessions.push(newSession(i, types));
  return P;
}
function setWeeks(P, W) {
  P.weeks = W;
  for (const s of P.sessions) for (const b of s.blocks) for (const r of b.rows) recompute(r, W);
}
function recomputeAll(P) { setWeeks(P, P.weeks); }
function eachRow(P, fn) {
  P.sessions.forEach((s, si) => s.blocks.forEach((b, bi) => b.rows.forEach((r, ri) => fn(r, b, s, si, bi, ri))));
}
function findRow(P, id) {
  let out = null;
  eachRow(P, (r, b, s, si, bi, ri) => { if (r.id === id) out = { r, b, s, si, bi, ri }; });
  return out;
}
function exCount(P) { let n = 0; eachRow(P, () => n++); return n; }
function programMeta(P) {
  return {
    athleteId: P.athleteId, athleteName: P.athleteName, title: P.title, start: P.start, weeks: P.weeks,
    sessions: P.sessions.length, exercises: exCount(P), createdAt: P.createdAt, updatedAt: P.updatedAt
  };
}
function rowCodes(session) {
  const map = {};
  session.blocks.forEach((b, bi) => b.rows.forEach((r, ri) => { map[r.id] = LETTERS[bi % 26] + (ri + 1); }));
  return map;
}
function weekStats(session, wi) {
  let sets = 0, vol = 0;
  for (const b of session.blocks) for (const r of b.rows) {
    const w = r.w[wi]; if (!w) continue;
    const S = intOnly(w.sets), R = intOnly(w.reps), L = num(w.load);
    if (S != null) sets += S;
    if (S != null && R != null && L != null) vol += S * R * L;
  }
  return { sets, vol };
}
function weekDate(P, wi) { return addDays(P.start, wi * 7); }
function duplicateProgram(P, athlete) {
  const C = clone(P);
  C.id = uid(); C.athleteId = athlete.id; C.athleteName = athlete.name;
  C.createdAt = Date.now(); C.updatedAt = Date.now();
  for (const s of C.sessions) { s.id = uid(); for (const b of s.blocks) { b.id = uid(); for (const r of b.rows) r.id = uid(); } }
  return C;
}

/* ============ store (shared database with in-memory fallback) ============ */
const Store = {
  mode: 'init', db: null, mem: {}, subs: {},
  async init() {
    try {
      if (window.claude && claude.use) {
        const db = await Promise.race([claude.use('db'), sleep(7000).then(() => null)]);
        if (db) { this.db = db; this.mode = 'db'; }
      }
    } catch (e) { /* stay in memory */ }
    if (this.mode !== 'db') { this.mode = 'mem'; if (window.__seed) window.__seed(this); }
    return this.mode;
  },
  sub(col, cb, onErr) {
    if (this.db) {
      return this.db.collection(col).onSnapshot(
        s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })), s.metadata && s.metadata.fromCache),
        e => onErr && onErr(e));
    }
    (this.subs[col] = this.subs[col] || []).push(cb);
    setTimeout(() => this._emit(col), 0);
    return () => { this.subs[col] = (this.subs[col] || []).filter(x => x !== cb); };
  },
  _emit(col) {
    const docs = Object.entries(this.mem[col] || {}).map(([id, d]) => ({ id, ...clone(d) }));
    (this.subs[col] || []).forEach(cb => cb(docs, false));
  },
  async set(col, id, data) {
    if (this.db) return this.db.collection(col).doc(id).set(data);
    (this.mem[col] = this.mem[col] || {})[id] = clone(data); this._emit(col);
  },
  async del(col, id) {
    if (this.db) return this.db.collection(col).doc(id).delete();
    delete (this.mem[col] || {})[id]; this._emit(col);
  },
  async get(col, id) {
    if (this.db) { const s = await this.db.collection(col).doc(id).get(); return s.exists ? { id, ...s.data() } : null; }
    const d = (this.mem[col] || {})[id]; return d ? { id, ...clone(d) } : null;
  },
  async all(col) {
    if (this.db) { const s = await this.db.collection(col).get(); return s.docs.map(d => ({ id: d.id, ...d.data() })); }
    return Object.entries(this.mem[col] || {}).map(([id, d]) => ({ id, ...clone(d) }));
  }
};
