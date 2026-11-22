/* ============ modello del programma ============
   Program { name, teamId, loadMode: 'auto'|'ath', phases: [Phase], createdAt, updatedAt }
   Phase   { id, name, weeks, workouts: [Workout] }   le settimane di una fase hanno gli stessi esercizi
   Workout { id, day (1-7), title, blocks: [Block] }
   Block   { id, rest, rows: [Row] }                  1 esercizio = blocco singolo, 2 = superset, 3 = triset…
   Row     vedi progress.js (valori per ogni settimana della fase) */
const BLOCK_COLORS = ['#38BDF8', '#8B5CF6', '#FACC15', '#E879F9', '#22C55E', '#F97316', '#14B8A6', '#F43F5E'];
const bColor = bi => BLOCK_COLORS[bi % BLOCK_COLORS.length];
function blockKind(b) { const n = b.rows.length; return n === 2 ? 'Superset' : n === 3 ? 'Triset' : n >= 4 ? 'Circuito' : ''; }
function blockName(b, bi) { const k = blockKind(b); return `Blocco ${LETTERS[bi % 26]}${k ? ` (${k})` : ''}`; }
const rowCode = (b, bi, ri) => LETTERS[bi % 26] + (b.rows.length > 1 ? ri + 1 : '');

const totalWeeks = P => P.phases.reduce((a, p) => a + p.weeks, 0);
function phaseStart(P, pi) { let s = 0; for (let i = 0; i < pi; i++) s += P.phases[i].weeks; return s; }
function weekRef(P, g) {
  let s = 0;
  for (let pi = 0; pi < P.phases.length; pi++) { const ph = P.phases[pi]; if (g < s + ph.weeks) return { ph, pi, i: g - s }; s += ph.weeks; }
  return null;
}
function eachRow(P, fn) { P.phases.forEach(ph => ph.workouts.forEach(wo => wo.blocks.forEach(b => b.rows.forEach(r => fn(r, ph, wo, b))))); }
function recomputePhase(ph) { ph.workouts.forEach(wo => wo.blocks.forEach(b => b.rows.forEach(r => recompute(r, ph.weeks)))); }
function countEx(P) { let n = 0; eachRow(P, () => n++); return n; }

function newBlock() { return { id: uid(), rest: '', rows: [] }; }
function newWorkout(day, title) { return { id: uid(), day, title: title || 'Allenamento', blocks: [newBlock()] }; }
function newPhase(name, weeks) { return { id: uid(), name: name || 'Fase', weeks: weeks || 4, workouts: [] }; }
function newProgram({ name, teamId, weeks, days, loadMode, start }) {
  const ph = newPhase('Fase 1', weeks);
  ph.workouts = days.map((d, i) => newWorkout(d, 'Allenamento ' + LETTERS[i]));
  return { name, teamId: teamId || '', athleteId: '', start: start || '', loadMode: loadMode || 'auto', phases: [ph], createdAt: Date.now(), updatedAt: Date.now() };
}
function freshIds(wo) { wo.id = uid(); wo.blocks.forEach(b => { b.id = uid(); b.rows.forEach(r => { r.id = uid(); }); }); return wo; }

/* copia degli allenamenti partendo dai valori di una settimana: base della nuova fase */
function workoutsFromWeek(ph, i, weeks) {
  return ph.workouts.map(wo => {
    const c = freshIds(clone(wo));
    c.blocks.forEach(b => b.rows.forEach(r => { const src = r.w[i]; r.w = [{ sets: src.sets, reps: src.reps, load: src.load, rest: src.rest, rpe: src.rpe, m: {} }]; recompute(r, weeks); }));
    return c;
  });
}
/* ---- settimane ---- */
function addWeek(P) { const ph = P.phases[P.phases.length - 1]; ph.weeks++; recomputePhase(ph); }
function dupWeek(P, g) {
  const { ph, i } = weekRef(P, g);
  ph.workouts.forEach(wo => wo.blocks.forEach(b => b.rows.forEach(r => {
    const c = clone(r.w[i]); c.m = { sets: true, reps: true, load: !r.ath, rest: true, rpe: true };
    r.w.splice(i + 1, 0, c);
  })));
  ph.weeks++; recomputePhase(ph);
}
function delWeek(P, g) {
  const { ph, pi, i } = weekRef(P, g);
  if (ph.weeks === 1) { if (P.phases.length === 1) return false; P.phases.splice(pi, 1); return true; }
  ph.workouts.forEach(wo => wo.blocks.forEach(b => b.rows.forEach(r => {
    r.w.splice(i, 1);
    if (i === 0) r.w[0].m = {};
  })));
  ph.weeks--; recomputePhase(ph); return true;
}
/* ---- fasi ---- */
function splitPhase(P, g, name) {
  const { ph, pi, i } = weekRef(P, g); if (i === 0) return false;
  const np = newPhase(name || 'Fase ' + (P.phases.length + 1), ph.weeks - i);
  np.workouts = workoutsFromWeek(ph, i, np.weeks);
  ph.weeks = i; recomputePhase(ph);
  P.phases.splice(pi + 1, 0, np); return true;
}
function appendPhase(P, name, weeks, copy) {
  const last = P.phases[P.phases.length - 1];
  const np = newPhase(name, weeks);
  np.workouts = copy && last ? workoutsFromWeek(last, last.weeks - 1, weeks) : (last ? last.workouts.map(w => newWorkout(w.day, w.title)) : []);
  P.phases.push(np);
}
function mergePhaseUp(P, pi) {
  if (pi < 1) return false;
  const prev = P.phases[pi - 1], cur = P.phases[pi];
  prev.weeks += cur.weeks; recomputePhase(prev); P.phases.splice(pi, 1); return true;
}
/* ---- allenamenti nel calendario ---- */
function moveWorkout(ph, wid, day) {
  const wo = ph.workouts.find(w => w.id === wid); if (!wo || wo.day === day) return;
  const other = ph.workouts.find(w => w.day === day);
  if (other) other.day = wo.day;
  wo.day = day;
}
function copyWorkout(ph, wid, day, toPh) {
  const wo = ph.workouts.find(w => w.id === wid); toPh = toPh || ph;
  if (!wo || toPh.workouts.some(w => w.day === day)) return false;
  const c = freshIds(clone(wo)); c.day = day;
  if (toPh !== ph) c.blocks.forEach(b => b.rows.forEach(r => { r.w = [{ ...r.w[0], m: {} }]; recompute(r, toPh.weeks); }));
  toPh.workouts.push(c); return true;
}
/* ---- programma intero ---- */
function setAllAth(P, on) {
  P.loadMode = on ? 'ath' : 'auto';
  P.phases.forEach(ph => { ph.workouts.forEach(wo => wo.blocks.forEach(b => b.rows.forEach(r => { r.ath = on; }))); recomputePhase(ph); });
}
function duplicateProgram(P) {
  const C = clone(P); delete C.id;
  C.name = P.name + ' (copia)'; C.createdAt = C.updatedAt = Date.now();
  C.phases.forEach(ph => { ph.id = uid(); ph.workouts.forEach(freshIds); });
  return C;
}
