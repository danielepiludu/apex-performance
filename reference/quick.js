/* ============ quick entry: one line per exercise ============ */
const BLK_WORDS = [
  [/^(balistic|ballistic)/i, 'bal'], [/^(potenz|power)/i, 'pow'], [/^(forza|strength)/i, 'str'],
  [/^(compl|accessor)/i, 'acc'], [/^(riscald|warm)/i, 'warm'], [/^(veloc|speed|sprint)/i, 'spd'],
  [/^(condiz|cond\b)/i, 'cond'], [/^(libero|free)/i, 'free']
];
function blockWordType(line) {
  const t = line.replace(/^[#\-*\s]+/, '').replace(/[:\s]+$/, '');
  if (!t || /\d\s*(x|×|per)\s*\d/i.test(t) || t.split(/\s+/).length > 3) return null;
  for (const [re, k] of BLK_WORDS) if (re.test(t)) return k;
  return null;
}
function parseLine(src) {
  let orig = String(src || '').replace(/[×✕]/g, 'x').replace(/[–—]/g, '-').trim();
  orig = orig.replace(/^[A-Za-z]\d[.):\-\s]\s*/, '');
  let w = orig; const cuts = []; const out = { name: '', sets: '', reps: '', load: '', rpe: '', rest: '', tempo: '', prog: null };
  const take = re => { const m = re.exec(w); if (!m) return null; cuts.push(m.index); w = w.slice(0, m.index) + ' '.repeat(m[0].length) + w.slice(m.index + m[0].length); return m; };
  const dec = s => String(s).replace(',', '.');
  // progression
  let m;
  if ((m = take(/\bonda\b/i))) out.prog = 'wave';
  else if ((m = take(/\bdoppia\b/i))) out.prog = 'dbl';
  else if ((m = take(/\+\s*(\d+(?:[.,]\d+)?)\s*(kg|chili|%|serie|sets?|s\b|rip\w*|r\b)(?:\s*\/\s*(?:sett\w*|w\w*))?/i))) {
    const v = parseFloat(dec(m[1])), u = m[2].toLowerCase();
    if (u === 'kg' || u === 'chili') out.prog = v === 5 ? 'kg5' : v === 2.5 ? 'kg25' : { type: 'load_kg', step: v };
    else if (u === '%') out.prog = v === 2.5 ? 'pct' : { type: 'load_pct', step: v, round: 2.5 };
    else if (/^(serie|set|s)/.test(u)) out.prog = 'setsw';
    else out.prog = 'reps';
  }
  // rest, tempo, rpe
  if ((m = take(/\b(?:rec|rest|r)\s*\.?\s*(\d+(?:'\d*)?)\s*(s|sec|min|m|"|')?/i))) {
    out.rest = m[1].includes("'") ? m[1] : (m[2] && /min|m/i.test(m[2]) ? m[1] + "'" : m[1] + '"');
  }
  if ((m = take(/\bt(?:empo)?\s*[:=]?\s*([\dxX]{3,4})\b/i))) out.tempo = m[1].toUpperCase();
  if ((m = take(/\brpe\s*(\d+(?:[.,]\d+)?)/i))) out.rpe = dec(m[1]).replace('.', ',');
  // sets x reps
  let after = -1;
  if ((m = take(/(\d+)\s*(?:x|per)\s*(\d+(?:\s*-\s*\d+)?[a-zA-Z]{0,3}|max)/i))) { out.sets = m[1]; out.reps = m[2].replace(/\s+/g, ''); after = m.index + m[0].length; }
  // load
  if ((m = take(/(\d+(?:[.,]\d+)?)\s*(?:kg|chili)\b/i)) || (m = take(/\bkg\s*(\d+(?:[.,]\d+)?)/i))) out.load = dec(m[1]).replace('.', ',');
  else if ((m = take(/@\s*(\d+(?:[.,]\d+)?)/))) { const v = parseFloat(dec(m[1])); if (v <= 10 && !out.rpe) out.rpe = dec(m[1]).replace('.', ','); else if (v > 10) out.load = dec(m[1]).replace('.', ','); }
  else if (after >= 0) { const rest = w.slice(after), mm = /(^|\s)(\d+(?:[.,]\d+)?)(\s|$)/.exec(rest); if (mm) { out.load = dec(mm[2]).replace('.', ','); const at = after + mm.index + mm[1].length; cuts.push(at); } }
  const cut = cuts.length ? Math.min(...cuts) : orig.length;
  out.name = orig.slice(0, cut).replace(/[\s,;:\-]+$/, '').trim();
  out.tail = orig.slice(cut).trim();
  return out;
}
function canonName(typed) { const t = (typed || '').trim(); return t.charAt(0).toUpperCase() + t.slice(1); }
function addParsedObj(blockId, p) {
  if (!p || !String(p.name || '').trim()) return null;
  const id = addExercise(blockId, canonName(String(p.name)));
  if (!id) return null;
  const r = findRow(S.P, id).r, w0 = r.w[0];
  for (const f of ['sets', 'reps', 'load', 'rpe', 'rest', 'tempo']) if (p[f] !== '' && p[f] != null) w0[f] = String(p[f]);
  if (p.prog) { const x = typeof p.prog === 'string' ? PRESETS.find(z => z.k === p.prog) : null; if (x) r.prog = clone(x.p); else if (typeof p.prog === 'object') r.prog = clone(p.prog); }
  recompute(r, S.P.weeks);
  return id;
}
function addParsed(blockId, text) { return addParsedObj(blockId, parseLine(text)); }

/* capabilities: Claude (sample) and voice (dictation) */
const CAP = { sample: null, dict: null, loaded: false };
async function loadCaps() {
  if (CAP.loaded || typeof claude === 'undefined' || !claude.use) return; CAP.loaded = true;
  try { CAP.sample = await claude.use('sample'); } catch (e) { CAP.sample = null; }
  try { CAP.dict = await claude.use('dictation'); } catch (e) { CAP.dict = null; }
}
const AI_PROMPT = `Sei l'assistente di un preparatore atletico di basket. Trasforma il testo seguente (dettato a voce o scritto) in una sessione di allenamento.
Rispondi SOLO con JSON valido in questo formato:
{"blocks":[{"type":"bal","exercises":[{"name":"","sets":"","reps":"","load":"","rpe":"","rest":"","tempo":"","prog":""}]}]}
Regole:
- type: bal=balistico/pliometria/salti, pow=potenza/olimpici, str=forza arto inferiore, acc=complementari/accessori, warm=riscaldamento, spd=velocità, cond=condizionamento, free=altro. Se il testo nomina un blocco, gli esercizi che seguono ci appartengono; se non ne nomina, usa l'ordine bal, pow, str, acc secondo il tipo di esercizio.
- Numeri detti a parole -> cifre. "quattro per cinque" = sets "4", reps "5". reps è una stringa ("5", "8-10", "30s"). load in kg, solo il numero, virgola decimale ("62,5").
- rest come 90" oppure 2'. tempo come 3010. rpe numero.
- prog: una di none, kg25 (+2,5 kg a settimana), kg5 (+5 kg a settimana), pct (+2,5% a settimana), wave (onda con scarico finale), setsw (+1 serie a settimana), sets2 (+1 serie ogni 2 settimane), reps (+1 ripetizione a settimana), dbl (doppia progressione), rpe (RPE crescente). Stringa vuota se non è detta nessuna progressione.
- Mantieni i nomi degli esercizi come detti, correggendo solo errori di trascrizione evidenti. Valori non detti: stringa vuota.
Testo:
`;
function applySession(ses, data) {
  let n = 0;
  for (const bl of (data && data.blocks) || []) {
    const type = BLOCK_TYPES[bl.type] ? bl.type : 'free';
    let b = ses.blocks.find(x => x.type === type);
    if (!b) { b = newBlock(type); ses.blocks.push(b); }
    for (const ex of bl.exercises || []) if (addParsedObj(b.id, ex)) n++;
  }
  return n;
}
function applyLocal(ses, text) {
  let cur = ses.blocks[0] && ses.blocks[0].id, n = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const bt = blockWordType(line);
    if (bt) { let b = ses.blocks.find(x => x.type === bt); if (!b) { b = newBlock(bt); ses.blocks.push(b); } cur = b.id; continue; }
    if (!cur) { const b = newBlock('free'); ses.blocks.push(b); cur = b.id; }
    if (addParsed(cur, line)) n++;
  }
  return n;
}
function quickSessionDialog(si) {
  const P = S.P, ses = P.sessions[si];
  const ph = "Detta o scrivi come parli, ad esempio:\nBalistico: hurdle jump quattro per cinque, box jump tre per cinque.\nPotenza: hang clean 4x3 a 60 chili, più due e mezzo a settimana.\nForza: back squat 4x5 a 100, più 5 chili a settimana, recupero due minuti.\nComplementari: nordic 3x6, plank 3x30 secondi.";
  modal({
    title: `Scrivi o detta la sessione · ${ses.name}`, wide: true,
    body: `<div class="row" style="margin-bottom:8px"><button class="btn mic" id="qmic" hidden>🎤 Detta a voce</button><span id="qst" class="small muted"></span></div>
      <textarea id="qs" class="inp" rows="10" placeholder="${esc(ph)}" style="font-size:16px;width:100%;line-height:1.5" data-noautofocus></textarea>
      <p class="small muted" style="margin:8px 0 0">Claude legge il testo e compila blocchi, serie, ripetizioni, carichi e progressioni. Poi correggi a mano nelle celle quello che serve.</p>`,
    footer: `<button class="btn" data-act="mclose">Annulla</button><button class="btn pri" id="qsok">Compila la scheda</button>`,
    onMount: (el, m) => {
      const ta = el.querySelector('#qs'), st = el.querySelector('#qst'), mic = el.querySelector('#qmic'), ok = el.querySelector('#qsok');
      setTimeout(() => ta.focus(), 50);
      let base = '';
      const setMic = on => { mic.classList.toggle('on', on); mic.textContent = on ? '■ Stop' : '🎤 Detta a voce'; };
      const wire = d => {
        if (!d) return; mic.hidden = false;
        d.onPartial(({ text }) => { ta.value = base + text; });
        d.onFinal(({ text }) => { base = (base + text + ' ').replace(/\s+$/, ' '); ta.value = base; });
        d.onState(({ state }) => { setMic(state === 'listening'); st.textContent = state === 'listening' ? 'Sto ascoltando…' : ''; st.className = 'small listen'; });
        mic.onclick = () => {
          if (mic.classList.contains('on')) { d.stop(); return; }
          base = ta.value && !/\s$/.test(ta.value) ? ta.value + ' ' : ta.value;
          d.start().catch(e => { if (e && e.code === 'not_granted') { mic.hidden = true; toast('Microfono non consentito'); } });
        };
      };
      if (CAP.dict) wire(CAP.dict); else loadCaps().then(() => wire(CAP.dict));
      ok.onclick = async () => {
        const text = ta.value.trim(); if (!text) return;
        if (mic.classList.contains('on') && CAP.dict) { try { await CAP.dict.stop(); } catch (e) { } }
        const txt = ta.value.trim();
        ok.disabled = true; ok.textContent = 'Claude sta compilando…';
        let n = 0, used = 'claude';
        try {
          if (!CAP.sample) await loadCaps();
          if (!CAP.sample) throw new Error('no sample');
          const data = await CAP.sample.json(AI_PROMPT + txt, { modelTier: 'quick', cache: false });
          n = applySession(ses, data);
          if (!n) throw new Error('empty');
        } catch (e) { used = 'local'; n = applyLocal(ses, txt); }
        m.close(); markDirty(); edBody();
        toast(n ? `${n} esercizi aggiunti` + (used === 'local' ? ' (lettura semplice)' : '') : 'Nessun esercizio riconosciuto');
      };
    }
  });
}

/* ============ session duration estimate ============ */
const REST_DEF = { bal: 90, pow: 120, str: 150, acc: 60, warm: 20, spd: 120, cond: 60, free: 60 };
function restSecs(s, def) {
  s = String(s || '').trim(); if (!s) return def;
  let m = /^(\d+)'(\d+)?/.exec(s); if (m) return (+m[1]) * 60 + (+m[2] || 0);
  m = /^(\d+(?:[.,]\d+)?)/.exec(s); if (!m) return def;
  const v = parseFloat(m[1].replace(',', '.')); return /min|m\b/i.test(s) ? v * 60 : v;
}
function sesMinutes(ses, wi) {
  let t = 0;
  ses.blocks.forEach(b => b.rows.forEach(r => {
    const w = r.w[wi] || r.w[0], n = intOnly(w.sets) || 0, rest = restSecs(r.w[0].rest, REST_DEF[b.type] || 60);
    t += n * (35 + rest);
  }));
  return Math.round(t / 60 / 5) * 5;
}

/* ============ mobile editor: cards, one week at a time ============ */
function wkChips() {
  const el = $('#wkchips'); if (!el) return;
  if (!isMob() || !S.P) { el.innerHTML = ''; return; }
  if (S.mw == null || S.mw >= S.P.weeks) S.mw = 0;
  el.innerHTML = `<div class="wkc">${Array.from({ length: S.P.weeks }, (_, i) => `<button class="fc" data-act="mw" data-w="${i}" aria-pressed="${i === S.mw}"><b>Sett. ${i + 1}</b><small>${fmtDate(weekDate(S.P, i), false)}</small></button>`).join('')}</div>`;
}
function mobSessionHTML(P, ses, si) {
  const c = S.cols, wi = S.mw < P.weeks ? S.mw : 0, codes = rowCodes(ses);
  let rs = 0;
  let h = `<section class="sess" data-sid="${ses.id}"><div class="sess-h"><input class="sname" data-sname="${ses.id}" value="${esc(ses.name)}" aria-label="Nome sessione">
    <button class="btn sm pri" data-act="qsess" data-si="${si}">✎ Scrivi</button><button class="btn sm" data-act="addblk" data-si="${si}">＋</button><button class="btn ico ghost" data-act="sessmenu" data-si="${si}" aria-label="Azioni sessione">⋯</button></div>
    <div class="gscroll card mobw"><div class="gt mob">`;
  ses.blocks.forEach((b, bi) => {
    const t = BLOCK_TYPES[b.type] || BLOCK_TYPES.free;
    h += `<div class="gr band" style="--bc:${t.color}"><div class="bandin"><span class="bl">${LETTERS[bi % 26]}</span>
      <input class="bt" data-bt="${b.id}" value="${esc(b.title || t.label)}" aria-label="Nome blocco">
      ${b.rows.length ? `<select class="inp sel" data-bpg="${b.id}" aria-label="Progressione per tutto il blocco"><option value="">Progressione blocco…</option>${PRESETS.map(x => `<option value="${x.k}">${esc(x.name)}</option>`).join('')}<option value="__dlg">Personalizza…</option></select>` : ''}
      <select class="inp sel" data-bty="${b.id}" aria-label="Tipo di blocco">${Object.entries(BLOCK_TYPES).map(([k, v]) => `<option value="${k}" ${k === b.type ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
      <button class="btn ico ghost" data-act="bup" data-id="${b.id}" aria-label="Sposta su" ${bi === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn ico ghost" data-act="bdn" data-id="${b.id}" aria-label="Sposta giù" ${bi === ses.blocks.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="btn ico ghost" data-act="bdel" data-id="${b.id}" aria-label="Elimina blocco">✕</button></div></div>`;
    b.rows.forEach(r => { h += mobRow(r, codes[r.id], t.color, wi, rs++); });
    h += `<div class="gr ghost mrow" style="--bc:${t.color}"><div class="mt"><input class="g nm" data-ghost="${b.id}" data-ci="0" data-rs="${rs++}" placeholder="Scrivi: Back squat 4x5 100kg" autocomplete="off" autocapitalize="sentences" spellcheck="false"></div></div>`;
  });
  h += `<div class="gr foot mfoot"><span>Sett. ${wi + 1}</span><span id="tot-${si}-${wi}">${totText(ses, wi)}</span></div></div></div></section>`;
  return h;
}
function mobRow(r, code, color, wi, rs) {
  const c = S.cols, w = r.w[wi], m = w.m || {}, w0 = r.w[0];
  const cell = (ci, val, wx, f, cls, mode) => `<input class="g ${cls}" data-ci="${ci}" data-rs="${rs}" data-r="${r.id}" data-wi="${wx}" data-f="${f}" value="${esc(val)}" inputmode="${mode || 'text'}" autocomplete="off" spellcheck="false">`;
  const wc = f => 'ce ' + (wi === 0 ? '' : (m[f] ? 'man' : 'au'));
  const lab = (t, inner, cls = '') => `<label class="${cls}"><span>${t}</span>${inner}</label>`;
  let h = `<div class="gr mrow" data-rid="${r.id}" style="--bc:${color}"><div class="mt"><button class="code" data-act="rmenu" data-r="${r.id}" aria-label="Azioni riga ${esc(code)}">${esc(code)}</button>
    <input class="g nm" data-ci="0" data-rs="${rs}" data-r="${r.id}" value="${esc(r.name)}" autocomplete="off" spellcheck="false"></div><div class="mf">`;
  h += lab('Serie', cell(3 + 4 * wi, w.sets ?? '', wi, 'sets', wc('sets'), 'numeric'));
  h += lab('Rip', cell(4 + 4 * wi, w.reps ?? '', wi, 'reps', wc('reps'), 'text'));
  h += lab('Kg', cell(5 + 4 * wi, w.load ?? '', wi, 'load', wc('load'), 'decimal'));
  if (c.rpe) h += lab('RPE', cell(6 + 4 * wi, w.rpe ?? '', wi, 'rpe', wc('rpe'), 'decimal'));
  if (c.rest) h += lab('Rec', cell(1, w0.rest, 0, 'rest', 'ce', 'text'));
  if (c.tempo) h += lab('Tempo', cell(2, w0.tempo, 0, 'tempo', 'ce', 'text'));
  h += lab('Progr.', `<select class="pgs" data-rpg="${r.id}" aria-label="Progressione">${progOptions(r.prog)}</select>`, 'pg');
  if (c.note) h += lab('Note', cell(3 + 4 * S.P.weeks, r.note || '', 0, 'note', 'nt'), 'nt');
  return h + '</div></div>';
}
let _wasMob = null;
window.addEventListener('resize', () => {
  const mb = isMob(); if (_wasMob === null) _wasMob = mb;
  if (mb !== _wasMob) { _wasMob = mb; if (S.view && S.view.name === 'editor' && S.P) { wkChips(); edBody(); } }
});
