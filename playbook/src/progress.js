/* ============ motore delle progressioni ============
   Una riga = un esercizio. row.w[i] = valori della settimana i della fase.
   La settimana 0 è la base; le altre sono calcolate dalla progressione,
   tranne i campi corretti a mano (row.w[i].m[campo] = true), che restano.
   row.ath = true → i kg restano vuoti: li scrive l'atleta.

   Tipi di progressione (row.prog.type):
   none      costante (eventualmente solo RPE che sale)
   load_kg   +step kg ogni `every` settimane (step anche negativo)
   load_pct  +step % ogni `every` settimane, arrotondato a `round` kg
   rm        % del massimale: rm kg × (start% + step% × settimana), arrotondato
   sets      +inc serie ogni `every` settimane, fino a `max`
   reps      +inc ripetizioni o secondi ("30s") ogni `every` settimane, fino a `max` (o giù fino a `max` se inc < 0)
   inverse   −dec ripetizioni a settimana (non sotto `min`) e +step kg a settimana
   double    doppia progressione: rip +1 fino a repMax, poi +step kg e si riparte
   Per tutti: rpeStep (RPE in più a settimana), deload (ultima settimana di scarico:
   deloadPct % del carico, deloadSets = una serie in meno, RPE −1). */
const FIELDS = ['sets', 'reps', 'load', 'rest', 'rpe'];
const FIELD_LABEL = { sets: 'Serie', reps: 'Rip', load: 'Kg', rest: 'Rec', rpe: 'RPE' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PRESETS = [
  { k: 'none', name: 'Costante', p: { type: 'none' } },
  { k: 'kg25', name: '+2,5 kg a settimana', p: { type: 'load_kg', step: 2.5 } },
  { k: 'kg5', name: '+5 kg a settimana', p: { type: 'load_kg', step: 5 } },
  { k: 'pct', name: '+2,5% a settimana', p: { type: 'load_pct', step: 2.5, round: 2.5 } },
  { k: 'wave', name: 'Onda con scarico finale', p: { type: 'load_pct', step: 5, round: 2.5, deload: true, deloadPct: 85 } },
  { k: 'setsw', name: '+1 serie a settimana', p: { type: 'sets', inc: 1, every: 1, max: 6 } },
  { k: 'sets2', name: '+1 serie ogni 2 settimane', p: { type: 'sets', inc: 1, every: 2, max: 6 } },
  { k: 'reps', name: '+1 ripetizione a settimana', p: { type: 'reps', inc: 1, every: 1, max: 0 } },
  { k: 'secs', name: '+5 secondi a settimana', p: { type: 'reps', inc: 5, every: 1, max: 0 } },
  { k: 'inv', name: 'Rip giù, carico su (−1 rip, +2,5 kg)', p: { type: 'inverse', dec: 1, min: 1, step: 2.5 } },
  { k: 'dbl', name: 'Doppia progressione', p: { type: 'double', repMax: 0, step: 2.5 } },
  { k: 'rpe', name: 'RPE +0,5 a settimana', p: { type: 'none', rpeStep: 0.5 } }
];
/* forma normalizzata: due progressioni sono uguali se producono gli stessi numeri */
function progNorm(p) {
  p = p || {}; const t = p.type || 'none', n = x => num(x) || 0;
  const o = { t, rpe: n(p.rpeStep), dl: !!p.deload };
  if (o.dl) { o.dp = n(p.deloadPct) || 90; o.ds = !!p.deloadSets; }
  if (t === 'load_kg') { o.st = n(p.step); o.ev = n(p.every) || 1; }
  if (t === 'load_pct') { o.st = n(p.step); o.ev = n(p.every) || 1; o.rd = n(p.round) || 2.5; }
  if (t === 'rm') { o.rm = n(p.rm); o.sp = n(p.start); o.st = n(p.step); o.rd = n(p.round) || 2.5; }
  if (t === 'sets' || t === 'reps') { o.inc = n(p.inc) || 1; o.ev = n(p.every) || 1; o.mx = n(p.max); }
  if (t === 'inverse') { o.dec = n(p.dec) || 1; o.mn = n(p.min) || 1; o.st = n(p.step); }
  if (t === 'double') { o.rm = n(p.repMax); o.st = n(p.step); }
  return o;
}
function progEq(a, b) { const x = progNorm(a), y = progNorm(b); return Object.keys(x).length === Object.keys(y).length && Object.keys(x).every(k => x[k] === y[k]); }
function presetKeyOf(p) { const f = PRESETS.find(x => progEq(x.p, p || { type: 'none' })); return f ? f.k : 'custom'; }
const presetBy = k => PRESETS.find(x => x.k === k);
/* le progressioni che toccano i kg: incompatibili con "kg vuoti, li scrive l'atleta" */
const progUsesLoad = p => /^(load_kg|load_pct|rm|inverse|double)$/.test((p && p.type) || '');

/* ripetizioni o tempo: "8", "30s", "45\"" → { n: 30, suf: 's' }; intervalli e testo → null */
function repParts(v) {
  const m = /^\s*(\d+)\s*(s|sec|secondi|"|''|m|mt|metri)?\s*$/i.exec(String(v ?? ''));
  return m ? { n: +m[1], suf: m[2] ? (m[2] === "''" ? '"' : m[2]) : '' } : null;
}
const repStr = (n, suf) => String(n) + (suf || '');
function rmLoad(p, i) {
  const rm = num(p.rm), pc = (num(p.start) || 0) + (num(p.step) || 0) * i;
  return rm && pc > 0 ? fmtN(roundTo(rm * pc / 100, num(p.round) || 2.5)) : null;
}
const stepsAt = (i, every) => Math.floor(i / (Math.max(1, num(every) || 1)));

function progVals(row, i) {
  const b = row.w[0], p = row.prog || {};
  const v = { sets: b.sets, reps: b.reps, load: b.load, rest: b.rest, rpe: b.rpe };
  if (p.type === 'rm') { const l = rmLoad(p, i); if (l != null) v.load = l; }
  if (i === 0) return v;
  const L = num(b.load), S = intOnly(b.sets), R = repParts(b.reps), E = num(b.rpe);
  switch (p.type) {
    case 'load_kg': if (L != null) v.load = fmtN(L + (num(p.step) || 0) * stepsAt(i, p.every)); break;
    case 'load_pct': if (L != null) v.load = fmtN(roundTo(L * (1 + ((num(p.step) || 0) / 100) * stepsAt(i, p.every)), num(p.round) || 2.5)); break;
    case 'sets':
      if (S != null) { let s = S + stepsAt(i, p.every) * (num(p.inc) || 1); if (num(p.max)) s = Math.min(s, Math.max(num(p.max), S)); v.sets = String(Math.max(1, s)); }
      break;
    case 'reps':
      if (R) {
        const inc = num(p.inc) || 1, mx = num(p.max);
        let r = R.n + stepsAt(i, p.every) * inc;
        if (mx) r = inc > 0 ? Math.min(r, Math.max(mx, R.n)) : Math.max(r, Math.min(mx, R.n));
        v.reps = repStr(Math.max(1, r), R.suf);
      }
      break;
    case 'inverse':
      if (R) v.reps = repStr(Math.max(num(p.min) || 1, R.n - (num(p.dec) || 1) * i), R.suf);
      if (L != null) v.load = fmtN(L + (num(p.step) || 0) * i);
      break;
    case 'double':
      if (R) {
        const max = num(p.repMax) > R.n ? num(p.repMax) : R.n + 3;
        let reps = R.n, load = L;
        for (let j = 0; j < i; j++) { if (reps < max) reps++; else { reps = R.n; if (load != null) load += (num(p.step) || 0); } }
        v.reps = repStr(reps, R.suf); if (load != null) v.load = fmtN(load);
      }
      break;
  }
  if (num(p.rpeStep) && E != null) v.rpe = fmtN(Math.min(10, E + num(p.rpeStep) * i));
  return v;
}
function autoVals(row, i, W) {
  const p = row.prog || {};
  let v;
  if (p.deload && W >= 3 && i === W - 1) {
    v = progVals(row, W - 2);
    const L = num(v.load); if (L != null) v.load = fmtN(roundTo(L * ((num(p.deloadPct) || 90) / 100), num(p.round) || 2.5));
    if (p.deloadSets) { const s = intOnly(v.sets); if (s != null) v.sets = String(Math.max(1, s - 1)); }
    const E = num(v.rpe); if (E != null) v.rpe = fmtN(Math.max(1, E - 1));
  } else v = progVals(row, i);
  if (row.ath) v.load = '';
  return v;
}
function recompute(row, W) {
  row.w = row.w || [];
  if (!row.w.length) row.w.push({ sets: '', reps: '', load: '', rest: '', rpe: '', m: {} });
  while (row.w.length < W) row.w.push({ m: {} });
  row.w.length = Math.max(1, W);
  row.w[0].m = {};
  if (row.ath) row.w[0].load = '';
  else if (row.prog && row.prog.type === 'rm') { const l = rmLoad(row.prog, 0); if (l != null) row.w[0].load = l; }
  for (let i = 1; i < row.w.length; i++) {
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
/* descrizione leggibile, anche per le progressioni personalizzate */
function progLabel(p) {
  p = p || { type: 'none' };
  const k = presetKeyOf(p); if (k !== 'custom') return presetBy(k).name;
  const n = x => fmtN(num(x) || 0), ev = e => (num(e) || 1) > 1 ? ` ogni ${num(e)} sett.` : ' a settimana', sg = x => (num(x) || 0) >= 0 ? '+' : '';
  let s;
  switch (p.type) {
    case 'load_kg': s = `${sg(p.step)}${n(p.step)} kg${ev(p.every)}`; break;
    case 'load_pct': s = `${sg(p.step)}${n(p.step)}%${ev(p.every)}`; break;
    case 'rm': s = `${n(p.start)}% di ${n(p.rm)} kg, ${sg(p.step)}${n(p.step)}% a sett.`; break;
    case 'sets': s = `${sg(p.inc)}${n(p.inc || 1)} serie${ev(p.every)}${num(p.max) ? ` (max ${num(p.max)})` : ''}`; break;
    case 'reps': s = `${sg(p.inc)}${n(p.inc || 1)} rip/sec${ev(p.every)}`; break;
    case 'inverse': s = `−${n(p.dec || 1)} rip e ${sg(p.step)}${n(p.step)} kg a sett.`; break;
    case 'double': s = `Doppia progressione${num(p.repMax) ? ` fino a ${num(p.repMax)} rip` : ''}, ${sg(p.step)}${n(p.step)} kg`; break;
    default: s = 'Costante';
  }
  if (num(p.rpeStep)) s += ` · RPE +${n(p.rpeStep)}`;
  if (p.deload) s += ` · scarico ${n(p.deloadPct || 90)}%`;
  return s;
}
