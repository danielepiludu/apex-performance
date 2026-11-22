/* ============ Programmi: elenco, calendario, fasi ============ */
const saveP = debounce(() => {
  if (!S.P || !S.pid) return;
  S.P.updatedAt = Date.now();
  Store.set('programs', S.pid, S.P);
}, 450);
const changed = () => saveP();

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
  const list = S.programs.filter(p => S.team === 'all' || p.teamId === S.team).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const cur = teamById(S.team);
  el.innerHTML = `<div class="ph"><div><h1>Programmi</h1><div class="sub">${list.length} ${list.length === 1 ? 'programma' : 'programmi'}${cur ? ' · ' + esc(cur.name) : ''}</div></div><div class="grow"></div>
    <button class="btn pri" data-x="newprog">${ic('plus').replace('<svg', '<svg width="16" height="16" style="stroke:#fff;fill:none;stroke-width:2"')}Nuovo programma</button></div>
    ${list.length ? `<div class="grid">${list.map(p => {
      const t = teamById(p.teamId), W = totalWeeks(p), days = new Set(); p.phases.forEach(ph => ph.workouts.forEach(w => days.add(w.day)));
      return `<button class="card pcard" data-x="openprog" data-id="${p.id}" style="--tc:${t ? t.color : 'var(--line)'}">
        <h3>${esc(p.name)}</h3><div class="rs">${t ? esc(t.name) : 'Nessuna squadra'}</div>
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
    <div class="two"><div class="fld"><label for="p-t">Squadra o cliente</label><select id="p-t" class="inp"><option value="">Nessuna</option>${S.teams.map(t => `<option value="${t.id}" ${t.id === S.team ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
    <div class="fld"><label for="p-w">Settimane</label><input id="p-w" class="inp" type="number" min="1" max="24" value="4" inputmode="numeric"></div></div>
    <div class="fld"><label>Giorni di allenamento</label><div class="chk" id="p-d">${[1, 2, 3, 4, 5, 6, 7].map(d => `<button type="button" data-d="${d}" aria-pressed="${days.has(d)}">Giorno ${d}</button>`).join('')}</div></div>
    <div class="fld"><label>Carichi</label><div class="chk" id="p-m"><button type="button" data-m="auto" aria-pressed="true">Progressione automatica</button><button type="button" data-m="ath" aria-pressed="false">Kg vuoti: li scrive l'atleta</button></div></div>`,
    `<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="p-ok">Crea</button>`,
    (el, m) => {
      $$('#p-d button', el).forEach(b => b.onclick = () => { const d = +b.dataset.d; days.has(d) ? days.delete(d) : days.add(d); b.setAttribute('aria-pressed', days.has(d)); });
      $$('#p-m button', el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#p-m button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); });
      $('#p-ok', el).onclick = async () => {
        const name = $('#p-n', el).value.trim(); if (!name) { $('#p-n', el).focus(); return; }
        const W = Math.max(1, Math.min(24, intOnly($('#p-w', el).value) || 4));
        const P = newProgram({ name, teamId: $('#p-t', el).value, weeks: W, days: [...days].sort(), loadMode: mode });
        const id = uid(); await Store.set('programs', id, P);
        m.el.remove(); openEditor(id);
      };
    });
}

/* ---------- editor: calendario ---------- */
function openEditor(id) {
  const p = S.programs.find(x => x.id === id); if (!p) return;
  S.pid = id; S.P = stripId(clone(p)); S.view = 'editor'; S.mw = 0; shell();
}
function closeEditor() { saveP.now(); S.P = null; S.pid = null; }
function editorView(el) {
  const P = S.P; if (!P) { S.view = 'programs'; return programsView(el); }
  const W = totalWeeks(P), mob = isMob(), t = teamById(P.teamId);
  const dens = [['compact', 'Compatta'], ['normal', 'Normale'], ['expanded', 'Espansa']];
  el.innerHTML = `<div class="edbar">
      <button class="btn sm ghost" data-x="back" aria-label="Torna ai programmi">${ic('back')}<span class="hm">Programmi</span></button>
      <input class="pname" data-x="pname" value="${esc(P.name)}" aria-label="Nome del programma">
      <select class="inp sel tsel" data-x="pteam" aria-label="Squadra o cliente" style="--tc:${t ? t.color : 'var(--muted)'}"><option value="">Nessuna squadra</option>${S.teams.map(x => `<option value="${x.id}" ${x.id === P.teamId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <div class="grow"></div>
      ${mob ? '' : `<div class="seg" role="group" aria-label="Vista">${dens.map(([k, l]) => `<button data-x="dens" data-k="${k}" aria-pressed="${S.density === k}">${l}</button>`).join('')}</div>`}
      <button class="btn sm" data-x="addweek">＋ Settimana</button>
      <button class="btn sm" data-x="phases">Fasi</button>
      <button class="btn sm ico" data-x="pmenu" aria-label="Altre azioni">${ic('more')}</button>
    </div>
    <div class="edsub">${W} settimane · ${P.phases.length} ${P.phases.length === 1 ? 'fase' : 'fasi'} · ${P.loadMode === 'ath' ? 'kg vuoti, li scrive l\'atleta' : 'carichi in progressione automatica'}${mob ? '' : ' · trascina un allenamento per spostarlo (tieni premuto Alt per copiarlo)'}</div>
    ${mob ? calMobile(P) : calDesktop(P)}`;
  wireEditor(el);
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
  h += wos.map(wo => `<div class="mday"><div class="dn">Giorno ${g * 7 + wo.day}</div>${cardHTML(ph, wo, i, g, 'expanded')}</div>`).join('') || '<div class="empty"><b>Nessun allenamento</b>Aggiungine uno qui sotto.</div>';
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
    <div class="wt">${esc(wo.title || 'Allenamento')}${man ? '<i class="mdot" title="Contiene correzioni a mano"></i>' : ''}</div>${body}</div>`;
}
function wireEditor(el) {
  const P = S.P, rerender = () => { changed(); editorView(el); };
  el.onclick = e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x, g = b.dataset.g != null ? +b.dataset.g : null;
    if (x === 'back') { closeEditor(); S.view = 'programs'; shell(); }
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
    else if (x === 'openwo') { const { pi, i } = weekRef(P, g); openWorkout(pi, b.dataset.wid, i); }
  };
  el.onkeydown = e => { if (e.key === 'Enter' && e.target.matches('.wcard')) e.target.click(); };
  const nm = $('[data-x="pname"]', el);
  if (nm) nm.oninput = () => { P.name = nm.value.trim() || 'Programma'; changed(); };
  const ts = $('[data-x="pteam"]', el);
  if (ts) ts.onchange = () => { P.teamId = ts.value; rerender(); };
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
  const P = S.P, { ph, i } = weekRef(P, g), W = totalWeeks(P), done = m => { changed(); editorView(el); toast(m); };
  popMenu(b, [
    { label: 'Duplica settimana (stessi valori)', fn: () => { dupWeek(P, g); if (isMob()) S.mw = g + 1; done(`Settimana ${g + 1} duplicata`); } },
    i > 0 && { label: 'Inizia una nuova fase da qui', fn: () => { splitPhase(P, g); done('Nuova fase creata: ora puoi cambiare gli esercizi'); } },
    { sep: true },
    { label: 'Elimina settimana', danger: true, disabled: W === 1, confirm: 'Confermi l\'eliminazione?', fn: () => { if (delWeek(P, g)) { if (S.mw >= totalWeeks(P)) S.mw = totalWeeks(P) - 1; done('Settimana eliminata'); } } }
  ]);
}
function progMenu(b) {
  const P = S.P;
  popMenu(b, [
    { label: 'Kg vuoti in tutto il programma (li scrive l\'atleta)', check: P.loadMode === 'ath', fn: () => { setAllAth(P, P.loadMode !== 'ath'); changed(); page(); toast(P.loadMode === 'ath' ? 'Kg vuoti: li scrive l\'atleta' : 'Carichi di nuovo automatici: inserisci i kg della prima settimana'); } },
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
