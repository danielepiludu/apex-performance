/* ============ editor dell'allenamento: scheda con le settimane affiancate ============ */
const WE = { pi: 0, wid: null, i: 0, rpe: false };
try { WE.rpe = localStorage.getItem('pb_rpe') === '1'; } catch (e) { }
function weCur() {
  const ph = S.P && S.P.phases[WE.pi]; const wo = ph && ph.workouts.find(w => w.id === WE.wid);
  return { ph, wo, W: ph ? ph.weeks : 1, s: ph ? phaseStart(S.P, WE.pi) : 0 };
}
function findRowIn(wo, rid) {
  for (let bi = 0; bi < wo.blocks.length; bi++) { const b = wo.blocks[bi], ri = b.rows.findIndex(r => r.id === rid); if (ri >= 0) return { b, bi, r: b.rows[ri], ri }; }
  return null;
}
function openWorkout(pi, wid, i) {
  Object.assign(WE, { pi, wid, i });
  modal('Allenamento', '<div id="wed"></div>', '<span class="muted small" id="wsave">Le modifiche si salvano da sole</span><div class="grow"></div><button class="btn pri" data-close>Fatto</button>',
    (el) => { el.querySelector('h3').remove(); weRender(); weWire(el); },
    { cls: 'wide', noFocus: true, onClose: () => { saveP.now(); page(); } });
}
function progOptions(r) {
  const k = presetKeyOf(r.prog), athOnly = r.ath && k === 'none';
  return PRESETS.map(x => `<option value="${x.k}" ${!athOnly && x.k === k ? 'selected' : ''}>${esc(x.name)}</option>`).join('') +
    (k === 'custom' ? '<option value="custom" selected disabled>Personalizzata</option>' : '') +
    `<option value="__ath" ${athOnly ? 'selected' : ''}>Kg vuoti: li scrive l'atleta</option>`;
}
function cellHTML(r, k, f, cls = '') {
  const w = r.w[k];
  if (f === 'load' && r.ath) return `<input class="ce ath ${cls}" disabled placeholder="atleta" aria-label="Kg: li scrive l'atleta">`;
  const st = k === 0 ? 'base' : (w.m && w.m[f] ? 'man' : 'au');
  const mode = f === 'sets' ? 'numeric' : (f === 'load' || f === 'rpe') ? 'decimal' : 'text';
  return `<input class="ce ${st} ${cls}" data-r="${r.id}" data-wi="${k}" data-f="${f}" value="${esc(w[f] ?? '')}" inputmode="${mode}" autocomplete="off" spellcheck="false" aria-label="${FIELD_LABEL[f]} settimana ${k + 1}">`;
}
function weRender() {
  const box = $('#wed'); if (!box) return;
  const { ph, wo, W, s } = weCur(); if (!wo) { box.innerHTML = '<p>Allenamento non trovato.</p>'; return; }
  const mob = isMob(), fl = ['sets', 'reps', 'load', ...(WE.rpe ? ['rpe'] : [])];
  if (WE.i >= W) WE.i = 0;
  const taken = new Set(ph.workouts.filter(w => w !== wo).map(w => w.day));
  let h = `<div class="weh">
    <input class="wtitle" data-e="title" value="${esc(wo.title)}" aria-label="Titolo allenamento" placeholder="Titolo">
    <select class="inp sel" data-e="day" aria-label="Giorno">${[1, 2, 3, 4, 5, 6, 7].map(d => `<option value="${d}" ${d === wo.day ? 'selected' : ''}>Giorno ${d}${taken.has(d) ? ' (scambia)' : ''}</option>`).join('')}</select>
    <span class="muted">${esc(ph.name)} · ${W === 1 ? 'sett. ' + (s + 1) : `sett. ${s + 1}–${s + W}`}</span>
    <div class="grow"></div>
    <button class="btn sm" data-e="rpe" aria-pressed="${WE.rpe}">RPE</button>
    <button class="btn sm" data-e="paste">Scrivi più righe</button>
    <button class="btn sm ico" data-e="womenu" aria-label="Azioni allenamento">${ic('more')}</button></div>`;
  if (mob) {
    h += `<div class="wkc">${Array.from({ length: W }, (_, k) => `<button class="fc" data-e="wk" data-k="${k}" aria-pressed="${k === WE.i}"><b>Sett. ${s + k + 1}</b>${k === 0 ? '<small>base</small>' : '<small>auto</small>'}</button>`).join('')}</div>`;
    h += `<p class="hint">${WE.i === 0 ? 'Settimana base: le altre si calcolano da qui.' : 'Valori calcolati in grigio. Se ne cambi uno resta tuo (in bianco).'}</p>`;
    wo.blocks.forEach((b, bi) => {
      h += blockHead(wo, b, bi);
      b.rows.forEach((r, ri) => {
        const k = WE.i;
        h += `<div class="mrow" data-row="${r.id}" style="--bc:${bColor(bi)}"><div class="mt"><span class="code">${rowCode(b, bi, ri)}</span><input class="nm" data-r="${r.id}" data-rf="name" value="${esc(r.name)}" aria-label="Esercizio" autocomplete="off"><button class="ibtn sm" data-e="rmenu" data-r="${r.id}" aria-label="Azioni esercizio">${ic('more')}</button></div>
          <div class="mfl">${fl.map(f => `<label><span>${FIELD_LABEL[f]}</span>${cellHTML(r, k, f)}</label>`).join('')}<label><span>Rec</span>${cellHTML(r, 0, 'rest')}</label></div>
          <div class="mfl2"><label><span>Progressione</span><select class="inp sel" data-r="${r.id}" data-rf="prog">${progOptions(r)}</select></label><label><span>Note</span><input class="inp" data-r="${r.id}" data-rf="note" value="${esc(r.note || '')}" autocomplete="off"></label></div></div>`;
      });
      h += ghostHTML(b, bi);
    });
  } else {
    const ncol = 5 + W * fl.length + 1;
    h += `<p class="hint">Scrivi i valori della <b>settimana ${s + 1}</b>: le altre si calcolano con la progressione (in grigio). Se cambi a mano una cella, resta tua (in bianco).</p>`;
    h += `<div class="tscroll"><table class="wtab"><thead><tr><th rowspan="2" class="c0">Cod</th><th rowspan="2" class="c1">Esercizio</th><th rowspan="2">Progressione</th><th rowspan="2">Rec</th>
      ${Array.from({ length: W }, (_, k) => `<th colspan="${fl.length}" class="wkh${k === WE.i ? ' cur' : ''}">Sett. ${s + k + 1}${k === 0 ? ' · base' : ''}</th>`).join('')}<th rowspan="2">Note</th><th rowspan="2"></th></tr>
      <tr>${Array.from({ length: W }, (_, k) => fl.map((f, fi) => `<th class="sub${fi === 0 ? ' wsep' : ''}${k === WE.i ? ' cur' : ''}">${FIELD_LABEL[f]}</th>`).join('')).join('')}</tr></thead><tbody>`;
    wo.blocks.forEach((b, bi) => {
      h += `<tr class="bh" data-bid="${b.id}" style="--bc:${bColor(bi)}"><td colspan="${ncol}">${blockHead(wo, b, bi)}</td></tr>`;
      b.rows.forEach((r, ri) => {
        h += `<tr class="er" data-row="${r.id}" style="--bc:${bColor(bi)}"><td class="c0"><span class="code" draggable="true" data-drag="${r.id}" title="Trascina per spostare">${rowCode(b, bi, ri)}</span></td>
          <td class="c1"><input class="nm" data-r="${r.id}" data-rf="name" value="${esc(r.name)}" aria-label="Esercizio" autocomplete="off"></td>
          <td><select class="pgs" data-r="${r.id}" data-rf="prog" aria-label="Progressione">${progOptions(r)}</select></td>
          <td>${cellHTML(r, 0, 'rest', 'rest')}</td>
          ${Array.from({ length: W }, (_, k) => fl.map((f, fi) => `<td class="${fi === 0 ? 'wsep' : ''}${k === WE.i ? ' cur' : ''}">${cellHTML(r, k, f)}</td>`).join('')).join('')}
          <td><input class="nt" data-r="${r.id}" data-rf="note" value="${esc(r.note || '')}" aria-label="Note" autocomplete="off"></td>
          <td><button class="ibtn sm" data-e="rmenu" data-r="${r.id}" aria-label="Azioni esercizio">${ic('more')}</button></td></tr>`;
      });
      h += `<tr class="gh" style="--bc:${bColor(bi)}"><td class="c0"></td><td colspan="${ncol - 1}">${ghostHTML(b, bi, true)}</td></tr>`;
    });
    h += '</tbody></table></div>';
  }
  h += `<div class="wefoot"><button class="btn" data-e="addblk">＋ Blocco ${LETTERS[wo.blocks.length % 26]}</button><span class="muted small">Più esercizi nello stesso blocco = superset (2), triset (3), circuito (4+).</span></div>`;
  box.innerHTML = h;
}
function blockHead(wo, b, bi) {
  return `<div class="bhin" style="--bc:${bColor(bi)}"><b>${blockName(b, bi)}</b>${b.rows.length > 1 ? `<label class="brest">Rec. tra i giri <input data-b="${b.id}" data-bf="rest" value="${esc(b.rest || '')}" placeholder="es. 2'" autocomplete="off"></label>` : ''}<span class="grow"></span>
    <button class="ibtn sm" data-e="bup" data-b="${b.id}" ${bi === 0 ? 'disabled' : ''} aria-label="Sposta blocco su">↑</button><button class="ibtn sm" data-e="bdn" data-b="${b.id}" ${bi === wo.blocks.length - 1 ? 'disabled' : ''} aria-label="Sposta blocco giù">↓</button><button class="ibtn sm" data-e="bdel" data-b="${b.id}" aria-label="Elimina blocco">✕</button></div>`;
}
function ghostHTML(b, bi, inTable) {
  const next = LETTERS[bi % 26] + (b.rows.length ? b.rows.length + 1 : '');
  return `<div class="ghost${inTable ? '' : ' mg'}" style="--bc:${bColor(bi)}"><span class="code">${next}</span><input data-ghost="${b.id}" placeholder="Scrivi: Back squat 4x5 100kg +5kg rec 2'  ·  Invio per aggiungere" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="done"></div>`;
}
function refreshRow(r, W) {
  $$(`#wed input[data-r="${r.id}"][data-f]`).forEach(inp => {
    const k = +inp.dataset.wi, f = inp.dataset.f; if (k === 0) return;
    if (inp !== document.activeElement) inp.value = r.w[k][f] ?? '';
    inp.classList.toggle('man', !!(r.w[k].m && r.w[k].m[f])); inp.classList.toggle('au', !(r.w[k].m && r.w[k].m[f]));
  });
}
function weWire(el) {
  const box = $('#wed', el);
  const redraw = (focusSel) => { changed(); const sc = $('.tscroll', box), sl = sc ? sc.scrollLeft : 0, mt = el.querySelector('.modal').scrollTop; weRender(); const sc2 = $('.tscroll', box); if (sc2) sc2.scrollLeft = sl; el.querySelector('.modal').scrollTop = mt; if (focusSel) { const f = $(focusSel, box); if (f) f.focus(); } };
  box.oninput = e => {
    const t = e.target, { wo, W } = weCur(); if (!wo) return;
    if (t.dataset.e === 'title') { wo.title = t.value; return changed(); }
    if (t.dataset.bf) { const b = wo.blocks.find(x => x.id === t.dataset.b); if (b) b.rest = t.value; return changed(); }
    if (!t.dataset.r) return;
    const f0 = findRowIn(wo, t.dataset.r); if (!f0) return; const r = f0.r;
    if (t.dataset.rf === 'name') { r.name = t.value; return changed(); }
    if (t.dataset.rf === 'note') { r.note = t.value; return changed(); }
    if (t.dataset.f) {
      const k = +t.dataset.wi, f = t.dataset.f, v = t.value.trim();
      if (k === 0) { r.w[0][f] = v; recompute(r, W); refreshRow(r, W); }
      else { r.w[k][f] = v; const a = autoVals(r, k, W)[f] ?? ''; r.w[k].m = r.w[k].m || {}; r.w[k].m[f] = v !== String(a); t.classList.toggle('man', r.w[k].m[f]); t.classList.toggle('au', !r.w[k].m[f]); }
      changed();
    }
  };
  box.onchange = e => {
    const t = e.target, { ph, wo, W } = weCur(); if (!wo) return;
    if (t.dataset.e === 'day') { moveWorkout(ph, wo.id, +t.value); redraw(); toast('Giorno cambiato in tutta la fase'); return; }
    if (t.dataset.rf === 'prog') {
      const r = findRowIn(wo, t.dataset.r).r;
      if (t.value === '__ath') { r.ath = true; if (/^load|double/.test(r.prog.type)) r.prog = { type: 'none' }; }
      else { r.prog = clone(presetBy(t.value).p); if (/^load|double/.test(r.prog.type)) r.ath = false; }
      recompute(r, W); redraw();
    }
  };
  box.onkeydown = e => {
    const t = e.target;
    if (e.key === 'Enter' && t.dataset.ghost) {
      e.preventDefault(); const v = t.value.trim(); if (!v) return;
      const { wo, W } = weCur(), b = wo.blocks.find(x => x.id === t.dataset.ghost);
      const r = rowFromText(v, W); if (!r) return;
      if (S.P.loadMode === 'ath' && !r.w[0].load) { r.ath = true; recompute(r, W); }
      b.rows.push(r); redraw(`[data-ghost="${b.id}"]`);
      return;
    }
    if (e.key === 'Enter' && t.dataset.f) {
      e.preventDefault();
      const same = $$(`#wed input[data-f="${t.dataset.f}"][data-wi="${t.dataset.wi}"]`), n = same[same.indexOf(t) + 1];
      if (n) { n.focus(); n.select(); } else t.blur();
    }
  };
  box.onfocusin = e => { if (e.target.matches('.ce')) e.target.select(); };
  box.onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    const x = b.dataset.e, { ph, wo, W } = weCur(); if (!wo) return;
    const bi = b.dataset.b ? wo.blocks.findIndex(q => q.id === b.dataset.b) : -1;
    if (x === 'wk') { WE.i = +b.dataset.k; weRender(); }
    else if (x === 'rpe') { WE.rpe = !WE.rpe; try { localStorage.setItem('pb_rpe', WE.rpe ? '1' : '0'); } catch (e2) { } weRender(); }
    else if (x === 'addblk') { const nb = newBlock(); wo.blocks.push(nb); redraw(`[data-ghost="${nb.id}"]`); }
    else if (x === 'bup' && bi > 0) { [wo.blocks[bi - 1], wo.blocks[bi]] = [wo.blocks[bi], wo.blocks[bi - 1]]; redraw(); }
    else if (x === 'bdn' && bi < wo.blocks.length - 1) { [wo.blocks[bi + 1], wo.blocks[bi]] = [wo.blocks[bi], wo.blocks[bi + 1]]; redraw(); }
    else if (x === 'bdel') {
      if (wo.blocks[bi].rows.length && !b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Elimina?'; b.classList.add('danger'); return; }
      wo.blocks.splice(bi, 1); redraw();
    }
    else if (x === 'paste') pasteDialog();
    else if (x === 'womenu') {
      const free = [1, 2, 3, 4, 5, 6, 7].filter(d => !ph.workouts.some(w => w.day === d));
      popMenu(b, [
        ...free.map(d => ({ label: 'Duplica nel giorno ' + d, fn: () => { copyWorkout(ph, wo.id, d); changed(); toast('Duplicato nel giorno ' + d); } })),
        S.P.phases.length > 1 && { sep: true },
        ...S.P.phases.filter(p => p !== ph).map(p => ({ label: 'Copia in ' + p.name + (p.workouts.some(w => w.day === wo.day) ? ' (giorno occupato)' : ''), disabled: p.workouts.some(w => w.day === wo.day), fn: () => { copyWorkout(ph, wo.id, wo.day, p); changed(); toast('Copiato in ' + p.name); } })),
        { sep: true },
        { label: 'Elimina allenamento (tutta la fase)', danger: true, confirm: 'Confermi l\'eliminazione?', fn: () => { ph.workouts.splice(ph.workouts.indexOf(wo), 1); changed(); const c = el.querySelector('[data-close]'); c && c.click(); toast('Allenamento eliminato'); } }
      ]);
    }
    else if (x === 'rmenu') {
      const f = findRowIn(wo, b.dataset.r), r = f.r;
      popMenu(b, [
        { label: 'Kg vuoti: li scrive l\'atleta', check: !!r.ath, fn: () => { r.ath = !r.ath; if (r.ath && /^load|double/.test(r.prog.type)) r.prog = { type: 'none' }; recompute(r, W); redraw(); } },
        hasManual(r) && { label: 'Ripristina i valori automatici', fn: () => { resetManual(r, W); redraw(); toast('Correzioni a mano tolte'); } },
        { sep: true },
        { label: 'Sposta su', disabled: f.bi === 0 && f.ri === 0, fn: () => { moveRow(wo, f, -1); redraw(); } },
        { label: 'Sposta giù', disabled: f.bi === wo.blocks.length - 1 && f.ri === f.b.rows.length - 1, fn: () => { moveRow(wo, f, 1); redraw(); } },
        { label: 'Metti in un blocco nuovo', disabled: f.b.rows.length === 1, fn: () => { f.b.rows.splice(f.ri, 1); const nb = newBlock(); nb.rows.push(r); wo.blocks.splice(f.bi + 1, 0, nb); redraw(); } },
        { label: 'Duplica', fn: () => { const c = clone(r); c.id = uid(); f.b.rows.splice(f.ri + 1, 0, c); redraw(); } },
        { sep: true },
        { label: 'Elimina esercizio', danger: true, fn: () => { f.b.rows.splice(f.ri, 1); redraw(); } }
      ]);
    }
  };
  /* trascina gli esercizi tra righe e blocchi (PC) */
  let dr = null;
  box.ondragstart = e => { const c = e.target.closest('[data-drag]'); if (!c) return; dr = c.dataset.drag; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dr); } catch (e2) { } };
  box.ondragover = e => { if (!dr) return; const t = e.target.closest('tr.er,tr.bh,tr.gh'); if (!t) return; e.preventDefault(); $$('.over', box).forEach(x => x !== t && x.classList.remove('over')); t.classList.add('over'); };
  box.ondragend = () => { dr = null; $$('.over', box).forEach(x => x.classList.remove('over')); };
  box.ondrop = e => {
    const t = e.target.closest('tr.er,tr.bh,tr.gh'); if (!t || !dr) return; e.preventDefault();
    const { wo } = weCur(), src = findRowIn(wo, dr); if (!src) return;
    src.b.rows.splice(src.ri, 1);
    if (t.classList.contains('er')) { const d = findRowIn(wo, t.dataset.row); if (d) d.b.rows.splice(d.ri, 0, src.r); else src.b.rows.splice(src.ri, 0, src.r); }
    else {
      // header o riga "scrivi": in fondo a quel blocco
      let tr = t; while (tr && !tr.classList.contains('bh')) tr = tr.previousElementSibling;
      const b = tr && wo.blocks.find(x => x.id === tr.dataset.bid); (b || src.b).rows.push(src.r);
    }
    dr = null; redraw();
  };
}
function moveRow(wo, f, dir) {
  const { b, bi, ri, r } = f;
  b.rows.splice(ri, 1);
  if (dir < 0) { if (ri > 0) b.rows.splice(ri - 1, 0, r); else wo.blocks[bi - 1].rows.push(r); }
  else { if (ri < b.rows.length) b.rows.splice(ri + 1, 0, r); else wo.blocks[bi + 1].rows.unshift(r); }
}
/* più righe in una volta: una riga = un esercizio, riga vuota = nuovo blocco, "A1 / A2…" = stesso blocco */
function pasteDialog() {
  const ph = "Una riga per esercizio. Riga vuota = nuovo blocco.\n\nBox jump 3x5\nMed ball rotational throw 3x5 4kg\n\nBack squat 4x5 100kg +5kg rec 2'\n\nRDL 3x8 60kg +2,5kg\nPallof press 3x10 kg atleta";
  modal('Scrivi più righe', `<textarea id="pl" class="inp" rows="11" placeholder="${esc(ph)}" style="font-size:15px;line-height:1.5"></textarea>
    <p class="hint">Riconosco serie×rip, kg, recupero ("rec 2'"), RPE e progressioni ("+5kg", "+2,5%", "+1 serie", "onda", "doppia"). Scrivi "kg atleta" per lasciare i kg vuoti.</p>`,
    '<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="pl-ok">Aggiungi</button>',
    (el, m) => {
      $('#pl-ok', el).onclick = () => {
        const { wo, W } = weCur(), txt = $('#pl', el).value; let n = 0;
        const groups = []; let cur = null, lastLetter = null;
        for (const raw of txt.split('\n')) {
          const line = raw.trim();
          if (!line) { cur = null; lastLetter = null; continue; }
          const lm = /^([A-Za-z])\d[.):\-\s]/.exec(line), L = lm ? lm[1].toUpperCase() : null;
          if (!cur || (L && lastLetter && L !== lastLetter)) { cur = []; groups.push(cur); }
          lastLetter = L || lastLetter; cur.push(line);
        }
        if (wo.blocks.length === 1 && !wo.blocks[0].rows.length && groups.length) wo.blocks = [];
        for (const g of groups) {
          const b = newBlock();
          for (const line of g) { const r = rowFromText(line, W); if (r) { if (S.P.loadMode === 'ath' && !r.w[0].load) { r.ath = true; recompute(r, W); } b.rows.push(r); n++; } }
          if (b.rows.length) wo.blocks.push(b);
        }
        if (!wo.blocks.length) wo.blocks.push(newBlock());
        m.el.remove(); changed(); weRender(); toast(n ? `${n} esercizi aggiunti` : 'Nessun esercizio riconosciuto');
      };
    }, { onClose: () => { } });
}
