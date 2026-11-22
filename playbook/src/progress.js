/* ============ motore delle progressioni (dal lavoro Don Bosco, reso neutro) ============
   Una riga = un esercizio. row.w[i] = valori della settimana i della fase.
   La settimana 0 è la base; le altre sono calcolate dalla progressione,
   tranne i campi corretti a mano (row.w[i].m[campo] = true), che restano.
   row.ath = true → i kg restano vuoti: li scrive l'atleta. */
const FIELDS = ['sets', 'reps', 'load', 'rest', 'rpe'];
const FIELD_LABEL = { sets: 'Serie', reps: 'Rip', load: 'Kg', rest: 'Rec', rpe: 'RPE' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PRESETS = [
  { k: 'none', name: 'Costante', short: '—', desc: 'Stessi valori ogni settimana', p: { type: 'none' } },
  { k: 'kg25', name: '+2,5 kg a settimana', short: '+2,5 kg', desc: 'Complementari, arti superiori', p: { type: 'load_kg', step: 2.5 } },
  { k: 'kg5', name: '+5 kg a settimana', short: '+5 kg', desc: 'Forza arto inferiore', p: { type: 'load_kg', step: 5 } },
  { k: 'pct', name: '+2,5% a settimana', short: '+2,5%', desc: 'Arrotondato a 2,5 kg', p: { type: 'load_pct', step: 2.5, round: 2.5 } },
  { k: 'wave', name: 'Onda con scarico finale', short: 'Onda', desc: '+5% a settimana, ultima settimana all\'85%', p: { type: 'load_pct', step: 5, round: 2.5, deload: true, deloadPct: 85 } },
  { k: 'setsw', name: '+1 serie a settimana', short: '+1 serie', desc: 'Fino a 6 serie', p: { type: 'sets', inc: 1, every: 1, max: 6 } },
  { k: 'sets2', name: '+1 serie ogni 2 settimane', short: '+1 s/2 sett', desc: 'Salita più graduale', p: { type: 'sets', inc: 1, every: 2, max: 6 } },
  { k: 'reps', name: '+1 ripetizione a settimana', short: '+1 rip', desc: 'Solo se le rip sono un numero', p: { type: 'reps', inc: 1, every: 1, max: 0 } },
  { k: 'dbl', name: 'Doppia progressione', short: 'Doppia', desc: 'Sale di rip fino a +3, poi +2,5 kg e riparte', p: { type: 'double', repMax: 0, step: 2.5 } },
  { k: 'rpe', name: 'RPE +0,5 a settimana', short: 'RPE +0,5', desc: 'Resto invariato', p: { type: 'none', rpeStep: 0.5 } }
];
function progEq(a, b) {
  const n = p => {
    p = p || {}; const t = p.type || 'none', o = { t, dl: !!p.deload, dp: p.deload ? (p.deloadPct || 90) : 0, rpe: p.rpeStep || 0 };
    if (t === 'load_kg') o.st = num(p.step) || 0;
    if (t === 'load_pct') { o.st = num(p.step) || 0; o.rd = p.round || 2.5; }
    if (t === 'sets' || t === 'reps') { o.inc = p.inc || 1; o.ev = p.every || 1; o.mx = p.max || 0; }
    if (t === 'double') { o.rm = p.repMax || 0; o.st = num(p.step) || 0; }
    return o;
  };
  const x = n(a), y = n(b); return Object.keys(x).length === Object.keys(y).length && Object.keys(x).every(k => x[k] === y[k]);
}
function presetKeyOf(p) { const f = PRESETS.find(x => progEq(x.p, p || { type: 'none' })); return f ? f.k : 'custom'; }
const presetBy = k => PRESETS.find(x => x.k === k);

function progVals(row, i) {
  const b = row.w[0], p = row.prog || {};
  const v = { sets: b.sets, reps: b.reps, load: b.load, rest: b.rest, rpe: b.rpe };
  if (i === 0) return v;
  const L = num(b.load), S = intOnly(b.sets), R = intOnly(b.reps), E = num(b.rpe);
  const rnd = p.round || 2.5;
  switch (p.type) {
    case 'load_kg': if (L != null) v.load = fmtN(L + (num(p.step) || 0) * i); break;
    case 'load_pct': if (L != null) v.load = fmtN(roundTo(L * (1 + ((num(p.step) || 0) / 100) * i), rnd)); break;
    case 'sets':
      if (S != null) { let s = S + Math.floor(i / (p.every || 1)) * (p.inc || 1); if (p.max) s = Math.min(s, Math.max(p.max, S)); v.sets = String(s); }
      break;
    case 'reps':
      if (R != null) { let r = R + Math.floor(i / (p.every || 1)) * (p.inc || 1); if (p.max) r = Math.min(r, Math.max(p.max, R)); v.reps = String(r); }
      break;
    case 'double':
      if (R != null) {
        const max = p.repMax && p.repMax > R ? p.repMax : R + 3;
        let reps = R, load = L;
        for (let j = 0; j < i; j++) { if (reps < max) reps++; else { reps = R; if (load != null) load += (num(p.step) || 0); } }
        v.reps = String(reps); if (load != null) v.load = fmtN(load);
      }
      break;
  }
  if (p.rpeStep && E != null) v.rpe = fmtN(Math.min(10, E + p.rpeStep * i));
  return v;
}
function autoVals(row, i, W) {
  const p = row.prog || {};
  let v;
  if (p.deload && W >= 3 && i === W - 1) {
    v = progVals(row, W - 2);
    const L = num(v.load); if (L != null) v.load = fmtN(roundTo(L * ((p.deloadPct || 90) / 100), p.round || 2.5));
    const E = num(v.rpe); if (E != null) v.rpe = fmtN(Math.max(1, E - 1));
  } else v = progVals(row, i);
  if (row.ath) v.load = '';
  return v;
}
function recompute(row, W) {
  row.w = row.w || [];
  if (!row.w.length) row.w.push({ sets: '', reps: '', load: '', rest: '', rpe: '', m: {} });
  while (row.w.length < W) row.w.push({ m: {} });
  row.w.length = W;
  row.w[0].m = {};
  if (row.ath) row.w[0].load = '';
  for (let i = 1; i < W; i++) {
    const w = row.w[i]; w.m = w.m || {};
    if (row.ath) delete w.m.load;
    const a = autoVals(row, i, W);
    for (const f of FIELDS) if (!w.m[f]) w[f] = a[f] ?? '';
  }
}
function newRow(name, W, base) {
  const row = { id: uid(), name: name || '', note: '', prog: { type: 'none' }, ath: false, w: [{ sets: '', reps: '', load: '', rest: '', rpe: '', m: {}, ...(base || {}) }] };
  recompute(row, W);
  return row;
}
function hasManual(row) { return row.w.some((w, i) => i > 0 && Object.values(w.m || {}).some(Boolean)); }
function resetManual(row, W) { row.w.forEach(w => { w.m = {}; }); recompute(row, W); }
function progLabel(p) {
  p = p || { type: 'none' };
  const k = presetKeyOf(p); if (k !== 'custom') return presetBy(k).name;
  return 'Personalizzata';
}
