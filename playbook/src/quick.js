/* ============ inserimento rapido: una riga per esercizio ============
   "Back squat 4x5 100kg +5kg rec 2'" → nome, serie, rip, kg, recupero, progressione.
   "Nordic 3x6 kg atleta" → kg vuoti, li scrive l'atleta. */
function parseLine(src) {
  let orig = String(src || '').replace(/[×✕]/g, 'x').replace(/[–—]/g, '-').trim();
  orig = orig.replace(/^[A-Za-z]\d[.):\-\s]\s*/, '');
  let w = orig; const cuts = [];
  const out = { name: '', sets: '', reps: '', load: '', rpe: '', rest: '', tempo: '', prog: null, ath: false };
  const take = re => { const m = re.exec(w); if (!m) return null; cuts.push(m.index); w = w.slice(0, m.index) + ' '.repeat(m[0].length) + w.slice(m.index + m[0].length); return m; };
  const dec = s => String(s).replace(',', '.');
  let m;
  if (take(/\b(?:kg|carico|carichi)\s*(?:atleta|liberi?|vuoti?)\b/i)) out.ath = true;
  if ((m = take(/\bonda\b/i))) out.prog = 'wave';
  else if ((m = take(/\bdoppia\b/i))) out.prog = 'dbl';
  else if ((m = take(/\+\s*(\d+(?:[.,]\d+)?)\s*(kg|chili|%|serie|sets?|s\b|rip\w*|r\b)(?:\s*\/\s*(?:sett\w*|w\w*))?/i))) {
    const v = parseFloat(dec(m[1])), u = m[2].toLowerCase();
    if (u === 'kg' || u === 'chili') out.prog = v === 5 ? 'kg5' : v === 2.5 ? 'kg25' : { type: 'load_kg', step: v };
    else if (u === '%') out.prog = v === 2.5 ? 'pct' : { type: 'load_pct', step: v, round: 2.5 };
    else if (/^(serie|set|s)/.test(u)) out.prog = 'setsw';
    else out.prog = 'reps';
  }
  if ((m = take(/\b(?:rec|rest|r)\s*\.?\s*(\d+(?:'\d*)?)\s*(s|sec|min|m|"|')?/i))) {
    out.rest = m[1].includes("'") ? m[1] : (m[2] && /min|m/i.test(m[2]) ? m[1] + "'" : m[1] + '"');
  }
  if ((m = take(/\bt(?:empo)?\s*[:=]?\s*([\dxX]{4})\b/i))) out.tempo = m[1].toUpperCase();
  if ((m = take(/\brpe\s*(\d+(?:[.,]\d+)?)/i))) out.rpe = dec(m[1]).replace('.', ',');
  let after = -1;
  if ((m = take(/(\d+)\s*(?:x|per)\s*(\d+(?:\s*-\s*\d+)?[a-zA-Z"']{0,3}|max)/i))) { out.sets = m[1]; out.reps = m[2].replace(/\s+/g, ''); after = m.index + m[0].length; }
  if ((m = take(/(\d+(?:[.,]\d+)?)\s*(?:kg|chili)\b/i)) || (m = take(/\bkg\s*(\d+(?:[.,]\d+)?)/i))) out.load = dec(m[1]).replace('.', ',');
  else if ((m = take(/@\s*(\d+(?:[.,]\d+)?)/))) { const v = parseFloat(dec(m[1])); if (v <= 10 && !out.rpe) out.rpe = dec(m[1]).replace('.', ','); else if (v > 10) out.load = dec(m[1]).replace('.', ','); }
  else if (after >= 0) { const rest = w.slice(after), mm = /(^|\s)(\d+(?:[.,]\d+)?)(\s|$)/.exec(rest); if (mm) { out.load = dec(mm[2]).replace('.', ','); cuts.push(after + mm.index + mm[1].length); } }
  const cut = cuts.length ? Math.min(...cuts) : orig.length;
  out.name = orig.slice(0, cut).replace(/[\s,;:\-]+$/, '').trim();
  out.name = out.name.charAt(0).toUpperCase() + out.name.slice(1);
  if (out.ath) out.load = '';
  return out;
}
/* crea una riga del programma da una riga di testo */
function rowFromText(text, W) {
  const p = parseLine(text); if (!p.name) return null;
  const r = newRow(p.name, W, { sets: p.sets, reps: p.reps, load: p.load, rest: p.rest, rpe: p.rpe });
  if (p.tempo) r.note = 'Tempo ' + p.tempo;
  r.ath = p.ath;
  if (p.prog) r.prog = typeof p.prog === 'string' ? clone(presetBy(p.prog).p) : clone(p.prog);
  recompute(r, W);
  return r;
}
