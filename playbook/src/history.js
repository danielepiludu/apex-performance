/* ============ Fase 3: storico degli allenamenti svolti ============
   Log { athleteId, date, title, programId?, phaseId?, workoutId?, week?, day?, rpe, note,
         entries: [{ code, name, plan, planLoad, sets, reps, load, done, note }], createdAt, updatedAt }
   I carichi reali si registrano partendo dall'allenamento previsto (valori già compilati)
   oppure liberi, per allenamenti passati fatti fuori dall'app. */
const H = { ath: 'all', range: '90', from: '', to: '', ex: '', mode: 'list', month: '' };
try { Object.assign(H, JSON.parse(localStorage.getItem('pb_hist') || '{}')); } catch (e) { }
const saveH = () => { try { localStorage.setItem('pb_hist', JSON.stringify({ ath: H.ath, range: H.range, mode: H.mode })); } catch (e) { } };
const numMax = v => { const ns = String(v || '').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g); return ns ? Math.max(...ns.map(Number)) : null; };
const logsOf = (pid, g, wid) => S.logs.filter(l => l.programId === pid && l.week === g && l.workoutId === wid);
const athName = id => (athById(id) || {}).name || 'Atleta eliminato';
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const DOW = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
function dateLong(iso) { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return `${['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; }

/* ---------- registra un allenamento svolto ---------- */
function entriesFromWorkout(wo, i) {
  const out = [];
  wo.blocks.forEach((b, bi) => b.rows.forEach((r, ri) => {
    const w = r.w[i] || r.w[0];
    out.push({ code: rowCode(b, bi, ri), name: r.name, plan: valStr(r, w), planLoad: r.ath ? '' : (w.load || ''), sets: w.sets || '', reps: w.reps || '', load: r.ath ? '' : (w.load || ''), done: true, note: '' });
  }));
  return out;
}
/* ctx: { log (esistente) } oppure { P, pid, g, wid } oppure { athleteId, date } per un allenamento libero */
function logDialog(ctx) {
  let L;
  if (ctx.log) L = clone(ctx.log);
  else if (ctx.P) {
    const P = ctx.P, { ph, i } = weekRef(P, ctx.g), wo = ph.workouts.find(w => w.id === ctx.wid);
    L = { athleteId: P.athleteId || '', date: P.start ? addDays(P.start, ctx.g * 7 + wo.day - 1) : todayISO(), title: wo.title, programId: ctx.pid, programName: P.name, phaseId: ph.id, workoutId: wo.id, week: ctx.g, day: wo.day, rpe: '', note: '', entries: entriesFromWorkout(wo, i) };
    if (L.date > todayISO()) L.date = todayISO();
  } else L = { athleteId: ctx.athleteId || '', date: ctx.date || todayISO(), title: '', rpe: '', note: '', entries: [] };
  const id = ctx.log ? ctx.log.id : null;
  const P = ctx.P || null;
  const athOpts = () => {
    let list = S.athletes.slice().sort(byName);
    if (P && P.teamId && !P.athleteId) list = list.filter(a => (a.teamIds || []).includes(P.teamId));
    return `<option value="">Scegli l'atleta…</option>` + list.map(a => `<option value="${a.id}" ${a.id === L.athleteId ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  };
  const origin = L.programId ? `${esc(L.programName || 'Programma')} · settimana ${L.week + 1} · giorno ${L.day}` : 'Allenamento libero';
  modal('Allenamento svolto', `
    <p class="hint">${origin}. ${L.programId ? 'I valori previsti sono già compilati: correggi solo quello che è andato diversamente.' : 'Scrivi gli esercizi come nel programma, una riga alla volta.'}</p>
    <div class="lgh">
      <div class="fld"><label for="lg-a">Atleta</label><select id="lg-a" class="inp" ${ctx.lockAth ? 'disabled' : ''}>${athOpts()}</select></div>
      <div class="fld"><label for="lg-d">Data</label><input id="lg-d" type="date" class="inp" value="${esc(L.date)}"></div>
      <div class="fld wide"><label for="lg-t">Titolo</label><input id="lg-t" class="inp" value="${esc(L.title)}" placeholder="Es. Forza arto inferiore" autocomplete="off"></div>
    </div>
    <div id="lg-rows"></div>
    <div class="lgf"><div class="fld"><label for="lg-r">RPE sessione (1-10)</label><input id="lg-r" class="inp" inputmode="decimal" value="${esc(L.rpe)}" placeholder="Es. 7"></div>
      <div class="fld wide"><label for="lg-n">Note</label><input id="lg-n" class="inp" value="${esc(L.note)}" placeholder="Come è andata, dolori, sensazioni…" autocomplete="off"></div></div>`,
    `${id ? '<button class="btn danger" id="lg-del">Elimina</button>' : ''}<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="lg-ok">Salva</button>`,
    (el, m) => {
      const rows = $('#lg-rows', el);
      const draw = () => {
        rows.innerHTML = `<div class="lgt">${L.entries.map((e, k) => {
          const a = numMax(e.load), p = numMax(e.planLoad), cmp = e.done && a != null && p != null ? (a > p ? 'up' : a < p ? 'dn' : '') : '';
          return `<div class="lgr${e.done ? '' : ' skip'}" data-k="${k}">
            <label class="lgc" title="Fatto"><input type="checkbox" data-f="done" ${e.done ? 'checked' : ''} aria-label="Fatto"><span class="code">${esc(e.code || '•')}</span></label>
            <div class="lgn"><input data-f="name" value="${esc(e.name)}" aria-label="Esercizio" autocomplete="off">${e.plan ? `<small>Previsto: ${esc(e.plan)}</small>` : ''}</div>
            <label><span>Serie</span><input data-f="sets" value="${esc(e.sets)}" inputmode="numeric" autocomplete="off"></label>
            <label><span>Rip</span><input data-f="reps" value="${esc(e.reps)}" autocomplete="off"></label>
            <label class="kg ${cmp}"><span>Kg fatti</span><input data-f="load" value="${esc(e.load)}" inputmode="decimal" placeholder="kg" title="Un valore (60) o uno per serie (60/65/70)" autocomplete="off"></label>
            <label class="nt"><span>Note</span><input data-f="note" value="${esc(e.note)}" autocomplete="off"></label>
            <button type="button" class="ibtn sm" data-rm="${k}" aria-label="Togli esercizio">✕</button></div>`;
        }).join('')}</div>
        <div class="ghost mg"><span class="code">＋</span><input id="lg-add" placeholder="Aggiungi esercizio: Nordic 3x6  ·  Back squat 4x5 100kg  ·  Invio" autocomplete="off" enterkeyhint="done"></div>`;
      };
      draw();
      rows.oninput = e => {
        const r = e.target.closest('.lgr'); if (!r || !e.target.dataset.f) return;
        const en = L.entries[+r.dataset.k], f = e.target.dataset.f;
        en[f] = f === 'done' ? e.target.checked : e.target.value;
        if (f === 'done') r.classList.toggle('skip', !en.done);
        if (f === 'load') { const a = numMax(en.load), p = numMax(en.planLoad), c = r.querySelector('.kg'); c.classList.toggle('up', a != null && p != null && a > p); c.classList.toggle('dn', a != null && p != null && a < p); }
      };
      rows.onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { L.entries.splice(+b.dataset.rm, 1); draw(); } };
      rows.onkeydown = e => {
        if (e.key !== 'Enter' || e.target.id !== 'lg-add') return; e.preventDefault();
        const p = parseLine(e.target.value); if (!p.name) return;
        L.entries.push({ code: '', name: p.name, plan: '', planLoad: '', sets: p.sets, reps: p.reps, load: p.load, done: true, note: '' });
        draw(); $('#lg-add', el).focus();
      };
      $('#lg-ok', el).onclick = async () => {
        const a = $('#lg-a', el).value || L.athleteId; if (!a) { $('#lg-a', el).focus(); toast('Scegli l\'atleta'); return; }
        const pend = $('#lg-add', el).value.trim(); if (pend) { const p = parseLine(pend); if (p.name) L.entries.push({ code: '', name: p.name, plan: '', planLoad: '', sets: p.sets, reps: p.reps, load: p.load, done: true, note: '' }); }
        Object.assign(L, { athleteId: a, date: $('#lg-d', el).value || todayISO(), title: $('#lg-t', el).value.trim() || 'Allenamento', rpe: $('#lg-r', el).value.trim(), note: $('#lg-n', el).value.trim(), updatedAt: Date.now() });
        if (!id) L.createdAt = Date.now();
        await Store.set('logs', id || uid(), stripId(L)); m.close(); toast('Allenamento salvato nello storico');
      };
      const del = $('#lg-del', el);
      if (del) del.onclick = async () => { if (!del.dataset.ok) { del.dataset.ok = 1; del.textContent = 'Confermi?'; return; } await Store.del('logs', id); m.close(); toast('Eliminato'); };
    }, { cls: 'wide', noFocus: true, onClose: () => { if (S.view === 'history') page(); else if (S.view === 'editor') { const pg = $('#page'); if (pg && !$('#wed')) editorView(pg); else if ($('#wed')) weRender(); } } });
}

/* ---------- pagina Storico ---------- */
function histFiltered() {
  const today = todayISO();
  let from = '', to = '';
  if (H.range === 'custom') { from = H.from; to = H.to; }
  else if (H.range !== 'all') from = addDays(today, -(+H.range));
  const ex = H.ex.trim().toLowerCase();
  return S.logs.filter(l => {
    const a = athById(l.athleteId);
    if (H.ath !== 'all' && l.athleteId !== H.ath) return false;
    if (S.team !== 'all' && !(a && (a.teamIds || []).includes(S.team))) return false;
    if (from && l.date < from) return false;
    if (to && l.date > to) return false;
    if (ex && !l.entries.some(e => (e.name || '').toLowerCase().includes(ex))) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
}
function historyView(el) {
  const aths = S.athletes.filter(inTeam).sort(byName);
  if (H.ath !== 'all' && !aths.some(a => a.id === H.ath)) H.ath = 'all';
  const list = histFiltered();
  const exNames = [...new Set(S.logs.flatMap(l => l.entries.map(e => e.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  el.innerHTML = `<div class="ph"><div><h1>Storico</h1><div class="sub">${list.length} ${list.length === 1 ? 'allenamento' : 'allenamenti'}${H.ath !== 'all' ? ' · ' + esc(athName(H.ath)) : ''}</div></div><div class="grow"></div>
    <button class="btn pri" data-h="new">${ic('plus').replace('<svg', '<svg width="16" height="16" style="stroke:#fff;fill:none;stroke-width:2"')}Registra allenamento</button></div>
    <div class="hfil">
      <select class="inp sel" id="h-a" aria-label="Atleta"><option value="all">Tutti gli atleti</option>${aths.map(a => `<option value="${a.id}" ${a.id === H.ath ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <select class="inp sel" id="h-r" aria-label="Periodo">${[['30', 'Ultimi 30 giorni'], ['90', 'Ultimi 3 mesi'], ['365', 'Ultimo anno'], ['all', 'Sempre'], ['custom', 'Dal… al…']].map(([v, l]) => `<option value="${v}" ${H.range === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${H.range === 'custom' ? `<input type="date" class="inp sel" id="h-f" value="${esc(H.from)}" aria-label="Dal"><input type="date" class="inp sel" id="h-t" value="${esc(H.to)}" aria-label="Al">` : ''}
      <input class="inp sel hex" id="h-x" list="h-xl" value="${esc(H.ex)}" placeholder="Filtra per esercizio" aria-label="Esercizio" autocomplete="off"><datalist id="h-xl">${exNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="grow"></div>
      <div class="seg" role="group" aria-label="Vista"><button data-h="mode" data-m="list" aria-pressed="${H.mode === 'list'}">Elenco</button><button data-h="mode" data-m="cal" aria-pressed="${H.mode === 'cal'}">Calendario</button></div>
    </div>
    ${H.ex && H.ath !== 'all' ? trendHTML(list, H.ex) : ''}
    ${H.mode === 'cal' ? histCal(list) : histList(list)}`;
  el.onclick = e => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const k = b.dataset.h;
    if (k === 'new') newLogChooser(b);
    else if (k === 'mode') { H.mode = b.dataset.m; saveH(); historyView(el); }
    else if (k === 'open') { const l = S.logs.find(x => x.id === b.dataset.id); if (l) logDialog({ log: l }); }
    else if (k === 'mon') { H.month = b.dataset.v; historyView(el); }
    else if (k === 'day') logDialog({ athleteId: H.ath !== 'all' ? H.ath : '', date: b.dataset.d });
  };
  el.onchange = e => {
    const t = e.target;
    if (t.id === 'h-a') H.ath = t.value; else if (t.id === 'h-r') H.range = t.value; else if (t.id === 'h-f') H.from = t.value; else if (t.id === 'h-t') H.to = t.value; else if (t.id === 'h-x') H.ex = t.value; else return;
    saveH(); historyView(el);
  };
  const x = $('#h-x', el); if (x) x.onkeydown = e => { if (e.key === 'Enter') { H.ex = x.value; historyView(el); } };
  wireTrend(el);
}
function logSummary(l, hl) {
  const ex = hl ? hl.toLowerCase() : '';
  return l.entries.filter(e => e.done !== false).map(e => {
    const a = numMax(e.load), p = numMax(e.planLoad), c = a != null && p != null ? (a > p ? 'up' : a < p ? 'dn' : '') : '';
    const v = [e.sets || e.reps ? `${e.sets || '–'}×${e.reps || '–'}` : '', e.load ? e.load + ' kg' : ''].filter(Boolean).join(' · ');
    return `<li class="${ex && (e.name || '').toLowerCase().includes(ex) ? 'hl' : ''}"><b>${esc(e.code || '•')}</b><span>${esc(e.name)}</span><em class="${c}">${esc(v)}${c === 'up' ? ' ▲' : c === 'dn' ? ' ▼' : ''}</em></li>`;
  }).join('');
}
function histList(list) {
  if (!list.length) return `<div class="empty"><b>Nessun allenamento registrato</b>Apri un programma assegnato a un atleta e, dal menu ⋯ dell'allenamento, scegli "Registra allenamento svolto". Oppure premi "Registra allenamento" qui sopra per uno fatto fuori dall'app.</div>`;
  let h = '', curM = '';
  for (const l of list) {
    const m = l.date.slice(0, 7);
    if (m !== curM) { curM = m; const [y, mm] = m.split('-'); h += `<h3 class="hm">${MONTHS[+mm - 1]} ${y}</h3>`; }
    const skipped = l.entries.filter(e => e.done === false).length;
    h += `<button class="hcard" data-h="open" data-id="${l.id}"><div class="hd"><b>${dateLong(l.date)}</b><span class="muted">${esc(fmtDate(l.date))}</span></div>
      <div class="hb"><div class="ht"><b>${esc(l.title || 'Allenamento')}</b>${H.ath === 'all' ? `<span class="tag">${esc(athName(l.athleteId))}</span>` : ''}${l.rpe ? `<span class="tag">RPE ${esc(l.rpe)}</span>` : ''}${skipped ? `<span class="tag">${skipped} saltati</span>` : ''}</div>
      <div class="rs small">${l.programId ? `${esc(l.programName || 'Programma')} · sett. ${l.week + 1}` : 'Allenamento libero'}${l.note ? ' · ' + esc(l.note) : ''}</div>
      <ul class="hex">${logSummary(l, H.ex)}</ul></div></button>`;
  }
  return `<div class="hlist">${h}</div>`;
}
function histCal(list) {
  const base = H.month || todayISO().slice(0, 7), [y, m] = base.split('-').map(Number);
  const first = new Date(y, m - 1, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m, 0).getDate();
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`, next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const by = {}; list.forEach(l => { (by[l.date] = by[l.date] || []).push(l); });
  let h = `<div class="hcal"><div class="hch"><button class="btn sm" data-h="mon" data-v="${prev}" aria-label="Mese precedente">‹</button><b>${MONTHS[m - 1]} ${y}</b><button class="btn sm" data-h="mon" data-v="${next}" aria-label="Mese successivo">›</button></div><div class="hcg">${DOW.map(d => `<div class="hdw">${d}</div>`).join('')}`;
  for (let k = 0; k < off; k++) h += '<div class="hcd out"></div>';
  const today = todayISO();
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, L = by[iso] || [];
    h += `<div class="hcd${iso === today ? ' today' : ''}"><button class="hdn" data-h="day" data-d="${iso}" aria-label="Registra il ${d}">${d}</button>${L.map(l => `<button class="hev" data-h="open" data-id="${l.id}">${H.ath === 'all' ? `<b>${esc(initials(athName(l.athleteId)))}</b> ` : ''}${esc(l.title || 'Allenamento')}</button>`).join('')}</div>`;
  }
  return h + '</div></div>';
}
function newLogChooser(b) {
  const ath = H.ath !== 'all' ? H.ath : '';
  const progs = S.programs.filter(p => ath ? p.athleteId === ath : progVisible(p)).sort((a, c) => (c.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  popMenu(b, [
    { label: 'Allenamento libero (fatto fuori dall\'app)', fn: () => logDialog({ athleteId: ath }) },
    progs.length && { sep: true },
    ...progs.map(p => ({ label: 'Da: ' + p.name + (p.athleteId ? ' · ' + athName(p.athleteId) : ''), fn: () => pickWorkoutDialog(p) }))
  ]);
}
/* scegli settimana e giorno di un programma, poi registra */
function pickWorkoutDialog(p) {
  const P = stripId(clone(p)), W = totalWeeks(P);
  let g = 0;
  if (P.start) { const d = Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(P.start + 'T12:00:00')) / 864e5); g = Math.max(0, Math.min(W - 1, Math.floor(d / 7))); }
  modal('Quale allenamento?', `<div class="two"><div class="fld"><label for="pk-w">Settimana</label><select id="pk-w" class="inp">${Array.from({ length: W }, (_, k) => `<option value="${k}" ${k === g ? 'selected' : ''}>Settimana ${k + 1}${P.start ? ' · ' + fmtDate(addDays(P.start, k * 7), true) : ''}</option>`).join('')}</select></div>
    <div class="fld"><label for="pk-d">Allenamento</label><select id="pk-d" class="inp"></select></div></div>`,
    '<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="pk-ok">Continua</button>', (el, m) => {
      const fill = () => { const { ph } = weekRef(P, +$('#pk-w', el).value); $('#pk-d', el).innerHTML = ph.workouts.slice().sort((a, b) => a.day - b.day).map(w => `<option value="${w.id}">Giorno ${w.day} · ${esc(w.title)}</option>`).join(''); };
      fill(); $('#pk-w', el).onchange = fill;
      $('#pk-ok', el).onclick = () => { const gg = +$('#pk-w', el).value, wid = $('#pk-d', el).value; m.el.remove(); if (wid) logDialog({ P, pid: p.id, g: gg, wid }); };
    }, { onClose: () => { } });
}

/* ---------- andamento del carico di un esercizio (un atleta) ---------- */
function trendPoints(list, ex) {
  const q = ex.toLowerCase(), pts = [];
  list.slice().reverse().forEach(l => {
    const es = l.entries.filter(e => e.done !== false && (e.name || '').toLowerCase().includes(q));
    let best = null; es.forEach(e => { const v = numMax(e.load); if (v != null && (best == null || v > best.v)) best = { v, e }; });
    if (best) pts.push({ date: l.date, v: best.v, label: `${best.e.sets || '–'}×${best.e.reps || '–'} · ${fmtN(best.v)} kg`, plan: numMax(best.e.planLoad) });
  });
  return pts;
}
function trendHTML(list, ex) {
  const pts = trendPoints(list, ex);
  if (pts.length < 2) return pts.length ? `<div class="trend"><div class="trh"><b>${esc(ex)}</b><span class="muted small">Serve almeno un altro allenamento per vedere l'andamento.</span></div></div>` : '';
  const Wd = 720, Ht = 190, pl = 44, pr = 16, pt = 28, pb = 26;
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs);
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50].find(s => (hi - lo) / s <= 4) || 100;
  const y0 = Math.floor(lo / step) * step - (lo === hi ? step : 0), y1 = Math.ceil(hi / step) * step + (lo === hi ? step : 0);
  const X = k => pl + (pts.length === 1 ? 0 : k * (Wd - pl - pr) / (pts.length - 1)), Y = v => pt + (1 - (v - y0) / (y1 - y0 || 1)) * (Ht - pt - pb);
  let grid = ''; for (let v = y0; v <= y1 + 1e-9; v += step) grid += `<line x1="${pl}" x2="${Wd - pr}" y1="${Y(v)}" y2="${Y(v)}" class="tg"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" class="tl">${fmtN(v)}</text>`;
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${X(k).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const first = pts[0], last = pts[pts.length - 1], diff = last.v - first.v;
  const xl = [0, pts.length - 1].map(k => `<text x="${X(k)}" y="${Ht - 6}" text-anchor="${k ? 'end' : 'start'}" class="tl">${fmtDate(pts[k].date, true)}</text>`).join('');
  return `<div class="trend"><div class="trh"><b>${esc(ex)} · kg</b><span class="muted small">${pts.length} allenamenti · da ${fmtN(first.v)} a ${fmtN(last.v)} kg (${diff >= 0 ? '+' : ''}${fmtN(diff)} kg)</span></div>
    <div class="trw"><svg viewBox="0 0 ${Wd} ${Ht}" class="tsvg" role="img" aria-label="Andamento del carico di ${esc(ex)}: da ${fmtN(first.v)} a ${fmtN(last.v)} kg">${grid}${xl}
      <path d="${path}" class="tline"/>${pts.map((p, k) => `<circle cx="${X(k)}" cy="${Y(p.v)}" r="5" class="tdot"/><circle cx="${X(k)}" cy="${Y(p.v)}" r="14" class="thit" data-k="${k}"/>`).join('')}
      <text x="${X(pts.length - 1) - 8}" y="${Y(last.v) - 10}" text-anchor="end" class="tv">${fmtN(last.v)} kg</text></svg>
    <div class="ttip" hidden></div></div>
    <script type="application/json" class="tdata">${JSON.stringify(pts.map(p => ({ d: fmtDate(p.date), l: p.label, p: p.plan }))).replace(/</g, '\\u003c')}<\/script></div>`;
}
function wireTrend(el) {
  const svg = $('.tsvg', el); if (!svg) return;
  const tip = $('.ttip', el), data = JSON.parse($('.tdata', el).textContent);
  const show = c => { const d = data[+c.dataset.k], r = c.getBoundingClientRect(), w = svg.parentElement.getBoundingClientRect(); tip.innerHTML = `<b>${esc(d.d)}</b><br>${esc(d.l)}${d.p != null ? `<br><span class="muted">previsto ${fmtN(d.p)} kg</span>` : ''}`; tip.hidden = false; tip.style.left = Math.min(w.width - 150, Math.max(0, r.left - w.left - 60)) + 'px'; tip.style.top = Math.max(0, r.top - w.top - 62) + 'px'; };
  $$('.thit', svg).forEach(c => { c.onmouseenter = () => show(c); c.onclick = () => show(c); c.onmouseleave = () => { tip.hidden = true; }; });
}
