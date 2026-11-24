/* ============ Programmi: elenco, calendario, fasi ============ */
const saveP = debounce(() => {
  if (!S.P || !S.pid) return;
  Store.set('programs', S.pid, { ...S.P, updatedAt: Date.now() });
}, 450);
/* ---------- annulla / ripristina (Ctrl+Z, Ctrl+Shift+Z) ---------- */
const U = { stack: [], redo: [], cur: null };
function undoReset() { U.stack = []; U.redo = []; U.cur = S.P ? JSON.stringify(S.P) : null; undoBtns(); }
const commitU = debounce(() => {
  if (!S.P) return; const j = JSON.stringify(S.P); if (j === U.cur) return;
  if (U.cur) { U.stack.push(U.cur); if (U.stack.length > 150) U.stack.shift(); }
  U.redo = []; U.cur = j; undoBtns();
}, 400);
/* changed(true) = azione completa (un passo di annullamento); changed() = scrittura, raggruppata */
const changed = hard => { saveP(); hard ? commitU.now() : commitU(); };
function undoBtns() { $$('[data-undo]').forEach(b => { b.disabled = !(b.dataset.undo === 'u' ? U.stack.length : U.redo.length); }); }
function undoRedo(dir) {
  if (!S.P) return; commitU.now();
  const from = dir < 0 ? U.stack : U.redo, to = dir < 0 ? U.redo : U.stack;
  if (!from.length) { toast(dir < 0 ? 'Niente da annullare' : 'Niente da ripristinare'); return; }
  to.push(U.cur); U.cur = from.pop(); S.P = JSON.parse(U.cur); saveP.now();
  $$('.pop').forEach(x => x.remove());
  const wed = $('#wed');
  if (wed) { if (weCur().wo) weRender(); else { const c = wed.closest('.ov').querySelector('[data-close]'); c && c.click(); } }
  const pg = $('#page'); if (pg && S.view === 'editor') editorView(pg);
  undoBtns(); toast(dir < 0 ? 'Annullato' : 'Ripristinato');
}
document.addEventListener('keydown', e => {
  if (S.view !== 'editor' || !(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase(); if (k !== 'z' && k !== 'y') return;
  const ovs = $$('.ov'); if (ovs.length && !(ovs.length === 1 && $('#wed'))) return;
  e.preventDefault(); undoRedo(k === 'y' || e.shiftKey ? 1 : -1);
});

/* ---------- a chi è assegnato ---------- */
const athById = id => S.athletes.find(a => a.id === id);
function progVisible(p) {
  if (S.team === 'all') return true;
  if (p.athleteId) { const a = athById(p.athleteId); return !!a && (a.teamIds || []).includes(S.team); }
  return p.teamId === S.team;
}
function ownerOf(p) {
  if (p.athleteId) { const a = athById(p.athleteId), t = a && teamById((a.teamIds || [])[0]); return { kind: 'ath', name: a ? a.name : 'Atleta eliminato', color: t ? t.color : '#777' }; }
  const t = teamById(p.teamId); return t ? { kind: 'team', name: t.name, color: t.color } : { kind: '', name: 'Nessuno', color: 'var(--line)' };
}
const ownerKey = p => p.athleteId ? 'a:' + p.athleteId : p.teamId ? 't:' + p.teamId : '';
function setOwner(p, v) { p.athleteId = v.startsWith('a:') ? v.slice(2) : ''; p.teamId = v.startsWith('t:') ? v.slice(2) : ''; }
function ownerOptions(sel) {
  return `<option value="">Nessuno</option><optgroup label="Squadre e clienti">${S.teams.map(t => `<option value="t:${t.id}" ${sel === 't:' + t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</optgroup>` +
    `<optgroup label="Atleti">${S.athletes.slice().sort(byName).map(a => `<option value="a:${a.id}" ${sel === 'a:' + a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</optgroup>`;
}
function progDates(p) { if (!p.start) return ''; const W = totalWeeks(p); return `${fmtDate(p.start)} → ${fmtDate(addDays(p.start, W * 7 - 1))}`; }
function progStatus(p) {
  if (!p.start) return ''; const t = todayISO(), end = addDays(p.start, totalWeeks(p) * 7 - 1);
  return t < p.start ? 'Da iniziare' : t > end ? 'Concluso' : 'In corso';
}

function chipIntoView(el) { const c = el && el.querySelector('.wkc [aria-pressed="true"]'); if (c && c.parentElement) c.parentElement.scrollLeft = c.offsetLeft - c.parentElement.clientWidth / 2 + c.offsetWidth / 2; }
/* ---------- piccolo menu a comparsa ---------- */
function popMenu(anchor, items) {
  $$('.pop').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'pop'; d.setAttribute('role', 'menu');
  d.innerHTML = items.filter(Boolean).map((it, k) => it.sep ? '<hr>' : `<button role="menuitem" data-k="${k}" class="${it.danger ? 'danger' : ''}" ${it.disabled ? 'disabled' : ''}>${it.check != null ? `<span class="ck">${it.check ? '✓' : ''}</span>` : ''}${esc(it.label)}</button>`).join('');
  document.body.appendChild(d);
  const r = anchor.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
  d.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
  d.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  const list = items.filter(Boolean);
  d.onclick = e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    const it = list[+b.dataset.k];
    if (it.confirm && !b.dataset.ok) { b.dataset.ok = 1; b.textContent = it.confirm; return; }
    d.remove(); it.fn && it.fn();
  };
  setTimeout(() => { const off = e => { if (!d.contains(e.target)) { d.remove(); document.removeEventListener('mousedown', off, true); document.removeEventListener('touchstart', off, true); } }; document.addEventListener('mousedown', off, true); document.addEventListener('touchstart', off, true); }, 0);
  return d;
}

/* ---------- elenco programmi ---------- */
function programsView(el) {
  const list = S.programs.filter(progVisible).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const cur = teamById(S.team);
  el.innerHTML = `<div class="ph"><div><h1>Programmi</h1><div class="sub">${list.length} ${list.length === 1 ? 'programma' : 'programmi'}${cur ? ' · ' + esc(cur.name) : ''}</div></div><div class="grow"></div>
    <button class="btn pri" data-x="newprog">${ic('plus').replace('<svg', '<svg width="16" height="16" style="stroke:#fff;fill:none;stroke-width:2"')}Nuovo programma</button></div>
    ${list.length ? `<div class="grid">${list.map(p => {
      const o = ownerOf(p), W = totalWeeks(p), st = progStatus(p), days = new Set(); p.phases.forEach(ph => ph.workouts.forEach(w => days.add(w.day)));
      return `<button class="card pcard" data-x="openprog" data-id="${p.id}" style="--tc:${o.color}">
        <h3>${esc(p.name)}</h3><div class="rs">${o.kind === 'ath' ? '<span class="tag">Atleta</span> ' : ''}${esc(o.name)}${st ? ` · <span class="st st-${st[0]}">${st}</span>` : ''}</div>${p.start ? `<div class="rs small">${progDates(p)}</div>` : ''}
        <div class="pstats"><span><b>${W}</b> settimane</span><span><b>${p.phases.length}</b> ${p.phases.length === 1 ? 'fase' : 'fasi'}</span><span><b>${days.size}</b> giorni/sett.</span></div>
        <div class="rs">${p.loadMode === 'ath' ? 'Kg vuoti: li scrive l\'atleta' : 'Progressione automatica dei carichi'}</div></button>`;
    }).join('')}</div>` : `<div class="empty"><b>${cur ? 'Nessun programma per ' + esc(cur.name) : 'Ancora nessun programma'}</b>Crea il primo con il pulsante in alto.</div>`}`;
  el.onclick = e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'newprog') newProgramForm();
    if (b.dataset.x === 'openprog') openEditor(b.dataset.id);
  };
}
function newProgramForm() {
  const days = new Set([1, 2, 4, 5]); let mode = 'auto';
  modal('Nuovo programma', `
    <div class="fld"><label for="p-n">Nome</label><input id="p-n" class="inp" placeholder="Es. Off-season 8 settimane" autocomplete="off"></div>
    <div class="two"><div class="fld"><label for="p-t">Per chi è</label><select id="p-t" class="inp">${ownerOptions(S.team !== 'all' ? 't:' + S.team : '')}</select></div>
    <div class="fld"><label for="p-w">Settimane</label><input id="p-w" class="inp" type="number" min="1" max="24" value="4" inputmode="numeric"></div></div>
    <div class="fld"><label for="p-s">Data di inizio (facoltativa)</label><input id="p-s" class="inp" type="date"></div>
    <div class="fld"><label>Giorni di allenamento</label><div class="chk" id="p-d">${[1, 2, 3, 4, 5, 6, 7].map(d => `<button type="button" data-d="${d}" aria-pressed="${days.has(d)}">Giorno ${d}</button>`).join('')}</div></div>
    <div class="fld"><label>Carichi</label><div class="chk" id="p-m"><button type="button" data-m="auto" aria-pressed="true">Progressione automatica</button><button type="button" data-m="ath" aria-pressed="false">Kg vuoti: li scrive l'atleta</button></div></div>`,
    `<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="p-ok">Crea</button>`,
    (el, m) => {
      $$('#p-d button', el).forEach(b => b.onclick = () => { const d = +b.dataset.d; days.has(d) ? days.delete(d) : days.add(d); b.setAttribute('aria-pressed', days.has(d)); });
      $$('#p-m button', el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#p-m button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); });
      $('#p-ok', el).onclick = async () => {
        const name = $('#p-n', el).value.trim(); if (!name) { $('#p-n', el).focus(); return; }
        const W = Math.max(1, Math.min(24, intOnly($('#p-w', el).value) || 4));
        const P = newProgram({ name, weeks: W, days: [...days].sort(), loadMode: mode, start: $('#p-s', el).value }); setOwner(P, $('#p-t', el).value);
        const id = uid(); await Store.set('programs', id, P);
        m.el.remove(); openEditor(id);
      };
    });
}

/* ---------- editor: calendario ---------- */
function openEditor(id) {
  const p = S.programs.find(x => x.id === id); if (!p) return;
  S.pid = id; S.P = stripId(clone(p)); S.view = 'editor'; S.mw = 0; undoReset(); shell();
}
function closeEditor() { saveP.now(); S.P = null; S.pid = null; }
function editorView(el) {
  const P = S.P; if (!P) { S.view = 'programs'; return programsView(el); }
  const W = totalWeeks(P), mob = isMob(), own = ownerOf(P);
  const dens = [['compact', 'Compatta'], ['normal', 'Normale'], ['expanded', 'Espansa']];
  el.innerHTML = `<div class="edbar">
      <button class="btn sm ghost" data-x="back" aria-label="Torna ai programmi">${ic('back')}<span class="hm">Programmi</span></button>
      <input class="pname" data-x="pname" value="${esc(P.name)}" aria-label="Nome del programma">
      <select class="inp sel tsel" data-x="pteam" aria-label="Per chi è il programma" style="--tc:${own.color}">${ownerOptions(ownerKey(P))}</select>
      <div class="grow"></div>
      ${mob ? '' : `<div class="seg" role="group" aria-label="Vista">${dens.map(([k, l]) => `<button data-x="dens" data-k="${k}" aria-pressed="${S.density === k}">${l}</button>`).join('')}</div>`}
      <div class="edacts"><button class="btn sm ico" data-x="undo" data-undo="u" aria-label="Annulla" title="Annulla (Ctrl+Z)">↶</button><button class="btn sm ico" data-x="redo" data-undo="r" aria-label="Ripristina" title="Ripristina (Ctrl+Shift+Z)">↷</button>
      <button class="btn sm" data-x="addweek">＋ Settimana</button>
      <button class="btn sm" data-x="phases">Fasi</button>
      <button class="btn sm" data-x="assign">Assegna</button>
      <button class="btn sm pri" data-x="print">Stampa</button>
      <button class="btn sm ico" data-x="pmenu" aria-label="Altre azioni">${ic('more')}</button></div>
    </div>
    <div class="edsub"><label class="sdate">Inizio <input type="date" data-x="pstart" value="${esc(P.start || '')}" aria-label="Data di inizio"></label> · ${W} settimane · ${P.phases.length} ${P.phases.length === 1 ? 'fase' : 'fasi'} · ${P.loadMode === 'ath' ? 'kg vuoti, li scrive l\'atleta' : 'carichi in progressione automatica'}${mob ? '' : ' · trascina un allenamento per spostarlo (tieni premuto Alt per copiarlo)'}</div>
    ${mob ? calMobile(P) : calDesktop(P)}`;
  wireEditor(el); undoBtns(); chipIntoView(el);
}
function phaseHead(P, ph, pi) {
  const s = phaseStart(P, pi);
  return `<div class="phh"><b>${esc(ph.name)}</b><span>${ph.weeks === 1 ? 'settimana ' + (s + 1) : `settimane ${s + 1}–${s + ph.weeks}`}</span><span class="muted">· stessi esercizi, carichi che salgono settimana per settimana</span><button class="lnk" data-x="phases">Modifica fasi</button></div>`;
}
function calDesktop(P) {
  let h = '<div class="cal">', g = 0;
  P.phases.forEach((ph, pi) => {
    h += phaseHead(P, ph, pi);
    for (let i = 0; i < ph.weeks; i++, g++) {
      h += `<div class="wk"><div class="wl"><span>Sett. ${g + 1}</span><button class="ibtn sm" data-x="wkmenu" data-g="${g}" aria-label="Azioni settimana ${g + 1}">${ic('more')}</button></div>`;
      for (let d = 1; d <= 7; d++) {
        const wo = ph.workouts.find(w => w.day === d);
        h += `<div class="dc" data-g="${g}" data-d="${d}"><div class="dn">Giorno ${g * 7 + d}</div>${wo ? cardHTML(ph, wo, i, g, S.density) : `<button class="addwo" data-x="addwo" data-g="${g}" data-d="${d}" aria-label="Aggiungi allenamento al giorno ${d}">＋</button>`}</div>`;
      }
      h += '</div>';
    }
  });
  return h + '</div>';
}
function calMobile(P) {
  const W = totalWeeks(P); if (S.mw >= W) S.mw = 0;
  const { ph, pi, i } = weekRef(P, S.mw), g = S.mw;
  let h = `<div class="wkc">${Array.from({ length: W }, (_, k) => { const r = weekRef(P, k); return `<button class="fc${r.i === 0 && k ? ' ps' : ''}" data-x="mw" data-g="${k}" aria-pressed="${k === S.mw}"><b>Sett. ${k + 1}</b><small>${esc(r.ph.name)}</small></button>`; }).join('')}</div>`;
  h += `<div class="mwh"><div><b>Settimana ${g + 1}</b><span class="muted"> · ${esc(ph.name)}</span></div><button class="ibtn" data-x="wkmenu" data-g="${g}" aria-label="Azioni settimana">${ic('more')}</button></div>`;
  const wos = ph.workouts.slice().sort((a, b) => a.day - b.day);
  h += wos.map(wo => `<div class="mday"><div class="dn">Giorno ${g * 7 + wo.day}</div>${cardHTML(ph, wo, i, g, 'expanded')}<button class="btn sm logb" data-x="logwo" data-g="${g}" data-wid="${wo.id}">✓ Registra allenamento svolto</button></div>`).join('') || '<div class="empty"><b>Nessun allenamento</b>Aggiungine uno qui sotto.</div>';
  if (wos.length < 7) h += `<button class="btn wide" data-x="addwo-m" data-g="${g}">＋ Allenamento</button>`;
  return h;
}
function valStr(r, w) {
  const p = [`${w.sets || '–'}×${w.reps || '–'}`];
  if (r.ath) p.push('kg ✎'); else if (w.load) p.push(w.load + ' kg');
  if (w.rpe) p.push('RPE ' + w.rpe);
  return p.join(' · ');
}
function cardHTML(ph, wo, i, g, den) {
  const man = wo.blocks.some(b => b.rows.some(r => i > 0 && Object.values(r.w[i].m || {}).some(Boolean)));
  let body = '';
  if (den === 'compact') {
    body = `<div class="cbars">${wo.blocks.map((b, bi) => b.rows.length ? `<i style="--bc:${bColor(bi)}">${LETTERS[bi]}${b.rows.length > 1 ? '×' + b.rows.length : ''}</i>` : '').join('')}</div>`;
  } else {
    body = wo.blocks.map((b, bi) => !b.rows.length ? '' : `<div class="cb" style="--bc:${bColor(bi)}"><div class="cbh">${blockName(b, bi)}</div>${b.rows.map((r, ri) =>
      `<div class="cr"><b>${rowCode(b, bi, ri)}</b><span>${esc(r.name || 'Senza nome')}${den === 'expanded' ? `<em>${esc(valStr(r, r.w[i]))}</em>` : ''}</span></div>`).join('')}</div>`).join('');
    if (!body) body = '<div class="cempty">Nessun esercizio: tocca per scriverli</div>';
  }
  return `<div class="wcard" draggable="true" data-x="openwo" data-wid="${wo.id}" data-g="${g}" tabindex="0" role="button" aria-label="Apri ${esc(wo.title)}">
    <div class="wt">${esc(wo.title || 'Allenamento')}${(() => { const n = S.pid ? logsOf(S.pid, g, wo.id).length : 0; return n ? `<span class="done" title="Registrato nello storico">✓${n > 1 ? ' ' + n : ''}</span>` : ''; })()}${man ? '<i class="mdot" title="Contiene correzioni a mano"></i>' : ''}</div>${body}</div>`;
}
function wireEditor(el) {
  const P = S.P, rerender = () => { changed(true); editorView(el); };
  el.onclick = e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x, g = b.dataset.g != null ? +b.dataset.g : null;
    if (x === 'back') { closeEditor(); S.view = 'programs'; shell(); }
    else if (x === 'undo') undoRedo(-1);
    else if (x === 'redo') undoRedo(1);
    else if (x === 'assign') assignDialog();
    else if (x === 'print') { saveP.now(); S.view = 'print'; shell(); }
    else if (x === 'dens') { S.density = b.dataset.k; try { localStorage.setItem('pb_density', S.density); } catch (e2) { } editorView(el); }
    else if (x === 'addweek') { addWeek(P); rerender(); toast(`Settimana ${totalWeeks(P)} aggiunta`); if (isMob()) { S.mw = totalWeeks(P) - 1; editorView(el); } }
    else if (x === 'phases') phasesDialog();
    else if (x === 'pmenu') progMenu(b);
    else if (x === 'mw') { S.mw = g; editorView(el); }
    else if (x === 'wkmenu') weekMenu(b, g, el);
    else if (x === 'addwo') { const { ph, pi, i } = weekRef(P, g); const wo = newWorkout(+b.dataset.d, 'Allenamento'); ph.workouts.push(wo); rerender(); openWorkout(pi, wo.id, i); }
    else if (x === 'addwo-m') {
      const { ph, pi, i } = weekRef(P, g);
      popMenu(b, [1, 2, 3, 4, 5, 6, 7].filter(d => !ph.workouts.some(w => w.day === d)).map(d => ({ label: 'Giorno ' + (g * 7 + d), fn: () => { const wo = newWorkout(d, 'Allenamento'); ph.workouts.push(wo); rerender(); openWorkout(pi, wo.id, i); } })));
    }
    else if (x === 'logwo') { saveP.now(); logDialog({ P: S.P, pid: S.pid, g, wid: b.dataset.wid }); }
    else if (x === 'openwo') { const { pi, i } = weekRef(P, g); openWorkout(pi, b.dataset.wid, i); }
  };
  el.onkeydown = e => { if (e.key === 'Enter' && e.target.matches('.wcard')) e.target.click(); };
  const nm = $('[data-x="pname"]', el);
  if (nm) nm.oninput = () => { P.name = nm.value.trim() || 'Programma'; changed(); };
  const ts = $('[data-x="pteam"]', el);
  if (ts) ts.onchange = () => { setOwner(P, ts.value); rerender(); };
  const sd = $('[data-x="pstart"]', el);
  if (sd) sd.onchange = () => { P.start = sd.value; changed(true); };
  /* trascina e rilascia (PC) */
  let drag = null;
  el.ondragstart = e => { const c = e.target.closest('.wcard'); if (!c) return; drag = { wid: c.dataset.wid, g: +c.dataset.g }; e.dataTransfer.effectAllowed = 'copyMove'; try { e.dataTransfer.setData('text/plain', drag.wid); } catch (e2) { } c.classList.add('dragging'); };
  el.ondragend = () => { drag = null; $$('.dragging,.over', el).forEach(x => x.classList.remove('dragging', 'over')); };
  el.ondragover = e => { const c = e.target.closest('.dc'); if (!c || !drag) return; e.preventDefault(); e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'; $$('.over', el).forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); };
  el.ondrop = e => {
    const c = e.target.closest('.dc'); if (!c || !drag) return; e.preventDefault();
    const src = weekRef(P, drag.g), dst = weekRef(P, +c.dataset.g), d = +c.dataset.d;
    const busy = dst.ph.workouts.some(w => w.day === d);
    if (src.ph === dst.ph && !e.altKey) { moveWorkout(src.ph, drag.wid, d); toast(busy ? 'Allenamenti scambiati in tutta la fase' : 'Spostato in tutta la fase'); }
    else if (busy) { toast('Quel giorno ha già un allenamento'); drag = null; return; }
    else { copyWorkout(src.ph, drag.wid, d, dst.ph); toast(src.ph === dst.ph ? 'Copiato' : 'Copiato in ' + dst.ph.name); }
    drag = null; rerender();
  };
}
function weekMenu(b, g, el) {
  const P = S.P, { ph, i } = weekRef(P, g), W = totalWeeks(P), done = m => { changed(true); editorView(el); toast(m); };
  popMenu(b, [
    { label: 'Duplica settimana (stessi valori)', fn: () => { dupWeek(P, g); if (isMob()) S.mw = g + 1; done(`Settimana ${g + 1} duplicata`); } },
    i > 0 && { label: 'Inizia una nuova fase da qui', fn: () => { splitPhase(P, g); done('Nuova fase creata: ora puoi cambiare gli esercizi'); } },
    { sep: true },
    { label: ph.weeks === 1 && P.phases.length > 1 ? `Elimina settimana (e la fase ${ph.name})` : 'Elimina settimana', danger: true, disabled: W === 1, confirm: 'Confermi l\'eliminazione?', fn: () => { if (delWeek(P, g)) { if (S.mw >= totalWeeks(P)) S.mw = totalWeeks(P) - 1; done('Settimana eliminata'); } } }
  ]);
}
function progMenu(b) {
  const P = S.P;
  popMenu(b, [
    { label: 'Kg vuoti in tutto il programma (li scrive l\'atleta)', check: P.loadMode === 'ath', fn: () => { setAllAth(P, P.loadMode !== 'ath'); changed(true); page(); toast(P.loadMode === 'ath' ? 'Kg vuoti: li scrive l\'atleta' : 'Carichi di nuovo automatici: inserisci i kg della prima settimana'); } },
    { label: 'Duplica programma', fn: async () => { saveP.now(); const C = duplicateProgram(S.P), id = uid(); await Store.set('programs', id, C); openEditor(id); toast('Copia creata'); } },
    { sep: true },
    { label: 'Elimina programma', danger: true, confirm: 'Confermi? Non si può annullare', fn: async () => { const id = S.pid; S.P = null; S.pid = null; await Store.del('programs', id); S.view = 'programs'; shell(); toast('Programma eliminato'); } }
  ]);
}

/* ---------- fasi ---------- */
function phasesDialog() {
  const P = S.P;
  const m = modal('Fasi del programma', '<div id="phl"></div>', '<div class="grow"></div><button class="btn pri" data-close>Fatto</button>', (el) => {
    const box = $('#phl', el);
    const draw = () => {
      let s = 0;
      box.innerHTML = `<p class="hint">In una fase le settimane hanno gli stessi esercizi e i carichi salgono da soli. Con una nuova fase cambi gli esercizi: parte dai valori dell'ultima settimana della fase precedente.</p>` +
        P.phases.map((ph, pi) => { const a = s + 1; s += ph.weeks; return `<div class="phr">
        <input class="inp" data-pn="${pi}" value="${esc(ph.name)}" aria-label="Nome fase">
        <label class="wkn"><input class="inp" type="number" min="1" max="24" data-pw="${pi}" value="${ph.weeks}" inputmode="numeric" aria-label="Settimane"><span>sett.</span></label>
        <span class="muted rng">${a === s ? 'sett. ' + a : `sett. ${a}–${s}`}</span>
        ${pi > 0 ? `<button class="btn sm" data-pm="${pi}" title="Unisci alla fase precedente">Unisci ↑</button>` : '<span></span>'}
        ${P.phases.length > 1 ? `<button class="btn sm danger" data-pd="${pi}" aria-label="Elimina fase">✕</button>` : '<span></span>'}</div>`; }).join('') +
        `<div class="mf" style="flex-wrap:wrap"><button class="btn" data-pa="copy">＋ Nuova fase (copia esercizi dell'ultima)</button><button class="btn" data-pa="empty">＋ Nuova fase vuota</button></div>`;
    };
    draw();
    box.oninput = e => { const t = e.target; if (t.dataset.pn != null) { P.phases[+t.dataset.pn].name = t.value; changed(); } };
    box.onchange = e => { const t = e.target; if (t.dataset.pw != null) { const ph = P.phases[+t.dataset.pw]; ph.weeks = Math.max(1, Math.min(24, intOnly(t.value) || ph.weeks)); recomputePhase(ph); changed(); draw(); } };
    box.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.pm) { mergePhaseUp(P, +t.dataset.pm); changed(); draw(); toast('Fasi unite'); }
      else if (t.dataset.pd) { if (!t.dataset.ok) { t.dataset.ok = 1; t.textContent = 'Confermi?'; return; } P.phases.splice(+t.dataset.pd, 1); changed(); draw(); }
      else if (t.dataset.pa) { appendPhase(P, 'Fase ' + (P.phases.length + 1), 4, t.dataset.pa === 'copy'); changed(); draw(); toast('Fase aggiunta'); }
    };
  }, { onClose: () => { saveP.now(); page(); }, noFocus: true });
  return m;
}

/* ---------- assegna a uno o più atleti: ognuno riceve la sua copia ---------- */
function assignDialog() {
  saveP.now();
  const P = S.P, src = S.pid, sel = new Set();
  let filter = P.teamId || (P.athleteId ? '' : (S.team !== 'all' ? S.team : '')) || 'all';
  modal('Assegna a uno o più atleti', `
    <p class="hint">Ogni atleta riceve la sua copia del programma, che trovi nella sua scheda. Puoi modificarla per lui senza toccare questo programma.</p>
    <div class="two"><div class="fld"><label for="as-t">Mostra</label><select id="as-t" class="inp"><option value="all">Tutti gli atleti</option>${S.teams.map(t => `<option value="${t.id}" ${t.id === filter ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
    <div class="fld"><label for="as-d">Data di inizio</label><input id="as-d" type="date" class="inp" value="${esc(P.start || nextMonday())}"></div></div>
    <div class="fld"><div class="lrow"><span class="lab">Atleti</span><button type="button" class="lnk" id="as-all">Seleziona tutti</button></div><div class="chk" id="as-l"></div></div>`,
    `<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="as-ok" disabled>Assegna</button>`,
    (el, m) => {
      const list = () => S.athletes.filter(a => filter === 'all' || (a.teamIds || []).includes(filter)).sort(byName);
      const ok = $('#as-ok', el);
      const upd = () => { ok.disabled = !sel.size; ok.textContent = sel.size > 1 ? `Assegna a ${sel.size} atleti` : 'Assegna'; };
      const draw = () => {
        const box = $('#as-l', el), L = list();
        box.innerHTML = L.map(a => { const t = teamById((a.teamIds || [])[0]); return `<button type="button" data-aid="${a.id}" style="--tc:${t ? t.color : '#777'}" aria-pressed="${sel.has(a.id)}"><i></i>${esc(a.name)}</button>`; }).join('') || '<span class="rs">Nessun atleta in questo gruppo.</span>';
        $$('button', box).forEach(b => b.onclick = () => { const id = b.dataset.aid; sel.has(id) ? sel.delete(id) : sel.add(id); b.setAttribute('aria-pressed', sel.has(id)); upd(); });
        upd();
      };
      draw();
      $('#as-t', el).onchange = e => { filter = e.target.value; draw(); };
      $('#as-all', el).onclick = () => { list().forEach(a => sel.add(a.id)); draw(); };
      ok.onclick = async () => {
        const start = $('#as-d', el).value, names = [];
        for (const id of sel) {
          const C = duplicateProgram(P); C.name = P.name; C.athleteId = id; C.teamId = ''; C.start = start; C.sourceId = src;
          await Store.set('programs', uid(), C); names.push((athById(id) || {}).name);
        }
        m.el.remove();
        toast(names.length === 1 ? `Assegnato a ${names[0]}: lo trovi nella sua scheda` : `Assegnato a ${names.length} atleti`);
      };
    }, { noFocus: true, onClose: () => { } });
}
/* storico personale nella scheda atleta */
function athProgramsHTML(id) {
  const L = S.programs.filter(p => p.athleteId === id).sort((a, b) => (b.start || '').localeCompare(a.start || '') || (b.createdAt || 0) - (a.createdAt || 0));
  const nl = S.logs.filter(l => l.athleteId === id), last = nl.reduce((m, l) => l.date > m ? l.date : m, '');
  return `<div class="fld"><label>Storico</label><button type="button" class="apr" data-openhist="${id}"><b>${nl.length ? `${nl.length} ${nl.length === 1 ? 'allenamento registrato' : 'allenamenti registrati'}` : 'Nessun allenamento registrato'}</b><span>${last ? 'Ultimo: ' + fmtDate(last) + ' · ' : ''}Apri lo storico con carichi e andamento</span></button></div>
  <div class="fld"><label>Programmi</label>${L.length ? `<div class="aplist">${L.map(p => { const st = progStatus(p); return `<button type="button" class="apr" data-openprog="${p.id}"><b>${esc(p.name)}</b><span>${p.start ? progDates(p) : 'Senza data'} · ${totalWeeks(p)} sett.${st ? ` · <span class="st st-${st[0]}">${st}</span>` : ''}</span></button>`; }).join('')}</div>`
    : '<div class="rs">Nessun programma. Apri un programma e premi "Assegna".</div>'}</div>`;
}
