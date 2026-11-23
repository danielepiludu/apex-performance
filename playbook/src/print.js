/* ============ Stampa per l'atleta ============
   Pagina separata dall'editor: foglio bianco A4, solo quello che serve all'atleta.
   Si stampa con la stampa del browser ("Salva come PDF"): funziona anche offline. */
const PR = { pid: null, fmt: 'cols', pi: 0, wid: 'all', g: 'all', kg: 'filled', write: false, head: '', style: 'color', pics: true, tid: null };
function prDefaultHead(P) { if (P.athleteId) { const a = athById(P.athleteId); return a ? a.name : ''; } return ''; }
function printView(el) {
  const P = S.P; if (!P) { S.view = 'programs'; return programsView(el); }
  if (PR.pid !== S.pid) Object.assign(PR, { pid: S.pid, pi: 0, wid: 'all', g: 'all', head: prDefaultHead(P), tid: null });
  if (PR.pi >= P.phases.length) PR.pi = 0;
  const ph = P.phases[PR.pi], W = totalWeeks(P);
  if (PR.wid !== 'all' && !ph.workouts.some(w => w.id === PR.wid)) PR.wid = 'all';
  const seg = (k, opts) => `<div class="seg full">${opts.map(([v, l]) => `<button type="button" data-pr="${k}" data-val="${v}" aria-pressed="${PR[k] === v}">${l}</button>`).join('')}</div>`;
  const opts = `
    <div class="fld"><label for="pr-h">Intestazione</label><input id="pr-h" class="inp" value="${esc(PR.head)}" placeholder="Vuoto = riga per scrivere il nome" autocomplete="off"></div>
    <div class="fld"><label>Foglio</label>${seg('fmt', [['cols', 'Settimane affiancate'], ['week', 'Una settimana']])}
      <span class="rs small">${PR.fmt === 'cols' ? 'Un foglio per allenamento, con tutte le settimane della fase in colonna. A4 orizzontale.' : 'Tutti gli allenamenti della settimana uno sotto l\'altro. A4 verticale.'}</span></div>
    ${PR.fmt === 'cols' ? `
      ${P.phases.length > 1 ? `<div class="fld"><label for="pr-ph">Fase</label><select id="pr-ph" class="inp">${P.phases.map((p, i) => `<option value="${i}" ${i === PR.pi ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : ''}
      <div class="fld"><label for="pr-w">Allenamenti</label><select id="pr-w" class="inp"><option value="all">Tutti (${ph.workouts.length})</option>${ph.workouts.slice().sort((a, b) => a.day - b.day).map(w => `<option value="${w.id}" ${w.id === PR.wid ? 'selected' : ''}>Giorno ${w.day} · ${esc(w.title)}</option>`).join('')}</select></div>`
    : `<div class="fld"><label for="pr-g">Settimana</label><select id="pr-g" class="inp"><option value="all">Tutte (${W} fogli)</option>${Array.from({ length: W }, (_, g) => `<option value="${g}" ${String(g) === String(PR.g) ? 'selected' : ''}>Settimana ${g + 1}${P.start ? ' · ' + fmtDate(addDays(P.start, g * 7), true) : ''}</option>`).join('')}</select></div>`}
    <div class="fld"><label>Stile</label>${seg('style', [['color', 'A colori'], ['bw', 'Bianco e nero']])}</div>
    ${prTeamChoices(P).length > 1 ? `<div class="fld"><label for="pr-t">Squadra sul foglio</label><select id="pr-t" class="inp">${prTeamChoices(P).map(t => `<option value="${t ? t.id : ''}" ${(prTeamObj(P) || {}).id === (t || {}).id ? 'selected' : ''}>${t ? esc(t.name) : 'Nessuna'}</option>`).join('')}</select></div>` : ''}
    <label class="cbx"><input type="checkbox" id="pr-pic" ${PR.pics ? 'checked' : ''}> Logo della squadra e foto dell'atleta</label>
    ${prPicHint(P)}
    <div class="fld"><label>Kg</label>${seg('kg', [['filled', 'Scritti'], ['blank', 'Vuoti, li scrive l\'atleta']])}</div>
    <label class="cbx"><input type="checkbox" id="pr-wr" ${PR.write ? 'checked' : ''}> Spazio per scrivere i kg usati</label>
    <p class="hint">Premi "Stampa o salva PDF" e nella finestra di stampa scegli la stampante oppure "Salva come PDF".</p>`;
  const pages = prPages(P);
  el.innerHTML = `<div class="prbar"><button class="btn sm ghost" data-pr="back">${ic('back')}<span>Torna al programma</span></button>
      <div class="prt"><b>Stampa per l'atleta</b><span class="muted small">${esc(P.name)} · ${pages.length} ${pages.length === 1 ? 'foglio' : 'fogli'} A4</span></div><div class="grow"></div>
      <button class="btn pri" data-pr="print">Stampa o salva PDF</button></div>
    <div class="prwrap"><aside class="propts">${opts}</aside><div class="prprev" id="prprev"><div class="pages" id="pages"><div class="pw-print">Powered by ${esc(POWERED)}</div>${pages.join('') || '<div class="empty"><b>Niente da stampare</b>Questa scelta non contiene allenamenti.</div>'}</div></div></div>`;
  let st = $('#pgsize'); if (!st) { st = document.createElement('style'); st.id = 'pgsize'; document.head.appendChild(st); }
  st.textContent = `@page{size:A4 ${PR.fmt === 'cols' ? 'landscape' : 'portrait'};margin:9mm}`;
  prFit();
  el.onclick = e => {
    const b = e.target.closest('[data-pr]'); if (!b) return;
    const k = b.dataset.pr;
    if (k === 'back') { S.view = 'editor'; shell(); return; }
    if (k === 'print') { prFit(1); window.print(); setTimeout(prFit, 300); return; }
    PR[k] = b.dataset.val; printView(el);
  };
  el.onchange = e => {
    const t = e.target;
    if (t.id === 'pr-ph') { PR.pi = +t.value; PR.wid = 'all'; }
    else if (t.id === 'pr-w') PR.wid = t.value;
    else if (t.id === 'pr-g') PR.g = t.value;
    else if (t.id === 'pr-wr') PR.write = t.checked;
    else if (t.id === 'pr-pic') PR.pics = t.checked;
    else if (t.id === 'pr-t') PR.tid = t.value;
    else return;
    printView(el);
  };
  const h = $('#pr-h', el);
  h.oninput = () => { PR.head = h.value; $$('.sh-n', el).forEach(x => { x.innerHTML = prName(); }); };
}
/* anteprima: rimpicciolisce i fogli per farli stare nello schermo */
function prFit(force1) {
  const box = $('#prprev'), pg = $('#pages'); if (!box || !pg) return;
  const sh = pg.querySelector('.sheet'); if (!sh) return;
  pg.style.zoom = 1;
  pg.style.zoom = force1 ? 1 : Math.min(1, (box.clientWidth - 8) / sh.offsetWidth).toFixed(3);
}
window.addEventListener('resize', () => { if (S.view === 'print') prFit(); });
window.addEventListener('afterprint', () => { if (S.view === 'print') prFit(); });

const prName = () => PR.head ? esc(PR.head) : '<span class="nline">Nome</span>';
const sxr = w => (w.sets || w.reps) ? `${w.sets || '–'} × ${w.reps || '–'}` : '';
const prKg = (r, w) => (PR.kg === 'blank' || r.ath) ? '' : (w.load || '');
/* casella da compilare solo dove l'atleta deve scrivere i kg (non per gli esercizi a corpo libero) */
const prBox = (r, w) => (PR.kg === 'blank' || r.ath) ? 'bx' : '';
/* squadra mostrata sul foglio: quella del programma, o la prima dell'atleta */
function prTeamChoices(P) {
  if (P.athleteId) { const a = athById(P.athleteId); return [...((a && a.teamIds) || []).map(teamById).filter(Boolean), null]; }
  return P.teamId && teamById(P.teamId) ? [teamById(P.teamId), null] : [];
}
function prTeamObj(P) {
  if (PR.tid === '') return null;
  if (PR.tid) return teamById(PR.tid) || null;
  return prTeamChoices(P)[0] || null;
}
function prPicHint(P) {
  const t = prTeamObj(P), a = P.athleteId ? athById(P.athleteId) : null, miss = [];
  if (t && !t.logo) miss.push(`il logo di ${esc(t.name)}`);
  if (a && !a.photo) miss.push(`la foto di ${esc(a.name)}`);
  return miss.length && PR.pics ? `<p class="hint">Puoi aggiungere ${miss.join(' e ')} da "Atleti e squadre".</p>` : '';
}
/* colori del foglio: quelli della squadra */
function prSheet(P, cls) {
  const t = prTeamObj(P), ac = (t && t.color) || '#E5262D';
  const st = PR.style === 'color' ? `--ac:${ac};--acd:${shade(ac, isLight(ac) ? 0.55 : 0.25)};--acl:${tint(ac, 0.12)};--act:${isLight(ac) ? '#111' : '#fff'}` : '';
  return `<section class="sheet ${cls} ${PR.style}" style="${st}">`;
}
const bVars = bi => { const c = bColor(bi); return `--bc:${c};--bcd:${shade(c, isLight(c) ? 0.5 : 0.25)};--bcl:${tint(c, 0.16)}`; };
function prHead(P, title, sub) {
  const t = prTeamObj(P), a = P.athleteId ? athById(P.athleteId) : null;
  const logo = PR.pics && t && t.logo ? `<div class="sh-logo"><img src="${t.logo}" alt=""></div>` : '';
  const photo = PR.pics && a && a.photo ? `<img class="sh-ph" src="${a.photo}" alt="">` : '';
  return `<header class="sh-h">${logo}<div class="sh-id">${photo}<div><div class="sh-n">${prName()}</div><div class="sh-p">${esc(P.name)}${t ? ' · ' + esc(t.name) : ''}</div></div></div><div class="sh-r"><div class="sh-w">${esc(title)}</div><div class="sh-d">${esc(sub)}</div></div></header>`;
}
function blockRow(b, bi, span) {
  const k = blockKind(b);
  return `<tr class="bk" style="${bVars(bi)}"><td colspan="${span}">Blocco ${LETTERS[bi % 26]}${k ? ' · ' + k : ''}${b.rest && b.rows.length > 1 ? ` · recupero tra i giri ${esc(b.rest)}` : ''}</td></tr>`;
}
function prPages(P) {
  if (PR.fmt === 'cols') {
    const ph = P.phases[PR.pi];
    return ph.workouts.filter(w => PR.wid === 'all' || w.id === PR.wid).sort((a, b) => a.day - b.day).map(wo => pageCols(P, ph, PR.pi, wo));
  }
  const W = totalWeeks(P);
  return (PR.g === 'all' ? [...Array(W).keys()] : [+PR.g]).map(g => pageWeek(P, g));
}
/* foglio con le settimane della fase affiancate */
function pageCols(P, ph, pi, wo) {
  const s = phaseStart(P, pi), W = ph.weeks, wr = PR.write, per = wr ? 3 : 2;
  const notes = wo.blocks.some(b => b.rows.some(r => (r.note || '').trim()));
  const span = 3 + W * per + (notes ? 1 : 0);
  const sub = `${ph.name} · ${W === 1 ? 'settimana ' + (s + 1) : `settimane ${s + 1}–${s + W}`}${P.start ? ' · dal ' + fmtDate(addDays(P.start, s * 7)) : ''}`;
  /* il foglio riempie la pagina A4 orizzontale: altezza delle righe e caratteri in base al numero di esercizi */
  const N = wo.blocks.reduce((n, b) => n + b.rows.length, 0), B = wo.blocks.filter(b => b.rows.length).length;
  const avail = 192 - 24 - 14 - 7; // mm: pagina meno margini, intestazione, testata tabella, firma
  const rh = Math.max(7.5, Math.min(15, (avail - B * 6) / Math.max(N, 1)));
  const fs = Math.max(3.1, Math.min(4.6, rh * 0.36)), wkCols = W * per;
  const fsw = wkCols > 12 ? Math.min(fs, 3.4) : fs; // tante colonne: numeri un po' più piccoli
  let h = `${prSheet(P, 'land')}${prHead(P, `Giorno ${wo.day} · ${wo.title}`, sub)}<table class="sh fit" style="--rh:${rh.toFixed(2)}mm;--fs:${fs.toFixed(2)}mm;--fsw:${fsw.toFixed(2)}mm"><thead><tr>
    <th rowspan="2" class="cod"></th><th rowspan="2" class="l">Esercizio</th><th rowspan="2">Rec</th>
    ${Array.from({ length: W }, (_, k) => `<th colspan="${per}" class="wc">Sett. ${s + k + 1}${P.start ? ' · ' + fmtDate(addDays(P.start, (s + k) * 7), true) : ''}</th>`).join('')}
    ${notes ? '<th rowspan="2" class="l">Note</th>' : ''}</tr>
    <tr>${Array.from({ length: W }, () => `<th class="wc">Serie × Rip</th><th>Kg</th>${wr ? '<th>Usati</th>' : ''}`).join('')}</tr></thead><tbody>`;
  wo.blocks.forEach((b, bi) => {
    if (!b.rows.length) return;
    h += blockRow(b, bi, span);
    b.rows.forEach((r, ri) => {
      h += `<tr style="${bVars(bi)}"><td class="cod">${rowCode(b, bi, ri)}</td><td class="l ex">${esc(r.name)}</td><td>${esc(r.w[0].rest || '')}</td>`;
      r.w.forEach(w => { const kg = prKg(r, w); h += `<td class="wc">${esc(sxr(w))}</td><td class="${kg ? '' : prBox(r, w)}">${esc(kg)}</td>${wr ? '<td class="bx"></td>' : ''}`; });
      h += `${notes ? `<td class="l nt">${esc(r.note || '')}</td>` : ''}</tr>`;
    });
  });
  return h + `</tbody></table><footer class="sh-pw">Powered by ${esc(POWERED)}</footer></section>`;
}
/* foglio di una settimana: tutti gli allenamenti */
function pageWeek(P, g) {
  const { ph, i } = weekRef(P, g), wos = ph.workouts.slice().sort((a, b) => a.day - b.day);
  let N = 0;
  if (PR.write) { N = 3; wos.forEach(wo => wo.blocks.forEach(b => b.rows.forEach(r => { const n = intOnly(r.w[i].sets); if (n && n > N) N = n; }))); N = Math.min(N, 6); }
  let h = `${prSheet(P, 'port')}${prHead(P, `Settimana ${g + 1}`, `${ph.name}${P.start ? ' · dal ' + fmtDate(addDays(P.start, g * 7)) : ''}`)}`;
  wos.forEach(wo => {
    const notes = wo.blocks.some(b => b.rows.some(r => (r.note || '').trim()));
    const span = 6 + N + (notes ? 1 : 0);
    h += `<div class="wo"><div class="wo-t">Giorno ${wo.day} · ${esc(wo.title)}</div><table class="sh"><thead><tr><th class="cod"></th><th class="l">Esercizio</th><th>Serie</th><th>Rip</th><th>Kg</th><th>Rec</th>
      ${N ? `<th colspan="${N}" class="wc">Kg usati</th>` : ''}${notes ? '<th class="l">Note</th>' : ''}</tr></thead><tbody>`;
    wo.blocks.forEach((b, bi) => {
      if (!b.rows.length) return;
      h += blockRow(b, bi, span);
      b.rows.forEach((r, ri) => {
        const w = r.w[i], kg = prKg(r, w), n = intOnly(w.sets) || N;
        h += `<tr style="${bVars(bi)}"><td class="cod">${rowCode(b, bi, ri)}</td><td class="l ex">${esc(r.name)}</td><td>${esc(w.sets || '')}</td><td>${esc(w.reps || '')}</td><td class="${kg ? '' : prBox(r, w)}">${esc(kg)}</td><td>${esc(w.rest || '')}</td>
          ${Array.from({ length: N }, (_, k) => `<td class="${k < n ? 'bx' : 'off'}${k === 0 ? ' wc' : ''}"></td>`).join('')}${notes ? `<td class="l nt">${esc(r.note || '')}</td>` : ''}</tr>`;
      });
    });
    h += '</tbody></table></div>';
  });
  return h + `<footer class="sh-pw">Powered by ${esc(POWERED)}</footer></section>`;
}
