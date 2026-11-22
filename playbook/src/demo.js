/* ============ dati demo + avvio ============ */
const DEMO = {
  teams: { t1: { name: 'Baseball Demo', color: '#E5262D' }, t2: { name: 'Clienti privati', color: '#3B82F6' } },
  athletes: [
    ['Marco Bianchi', '2003-04-12', 'Lanciatore', 'Fastidio lieve alla spalla dx, gestire il volume di lancio.', ['t1']],
    ['Luca Ferrari', '2002-09-30', 'Ricevitore', '', ['t1']],
    ['Davide Romano', '2004-01-18', 'Esterno', 'Rientro da distorsione alla caviglia.', ['t1']],
    ['Andrea Conti', '2001-07-05', 'Interbase', '', ['t1', 't2']],
    ['Giulia Marino', '1994-11-22', 'Cliente - forza generale', '', ['t2']]
  ]
};
/* programma demo scritto con lo stesso inserimento rapido dell'app: un array = un blocco */
const DEMO_PROG = {
  name: 'Off-season baseball · 8 settimane',
  phases: [
    ['Accumulo', 4, [
      [1, 'Lower A – Unilaterale e rotazione', [
        ['Hip CAR 1x5', '90/90 Hip Switch 1x8', 'Thoracic Spine Rotation 1x8'],
        ['Box Jump 3x4', 'Rotational Med Ball Throw 3x5 4kg'],
        ["Trap Bar Deadlift 4x6 90kg onda rec 2'"],
        ['DB RFE Split Squat 3x8 16kg +2,5kg', 'Cable Pallof Press 3x10 kg atleta'],
        ['DB Calf Raise 3x12 kg atleta']]],
      [2, 'Upper A – Spinta orizzontale e scapole', [
        ['Shoulder CAR 1x5', 'Thoracic Spine Rotation 1x8'],
        ['DB Bench Press 4x8 26kg +2,5kg rec 90"', 'Single-Arm DB Row 4x10 26kg +2,5kg'],
        ['DB Shoulder Press 3x10 14kg', 'Cable Face Pull 3x12 kg atleta'],
        ['Cable External Rotation 2x12 kg atleta', 'Cable Rope Triceps Extension 3x12 kg atleta']]],
      [4, 'Lower B – Catena posteriore e potenza laterale', [
        ['Hip CAR 1x5', '90/90 Hip Switch 1x8'],
        ['Lateral Bound 3x4 +1 serie', 'Rotational Med Ball Throw 3x5 4kg'],
        ['DB Single-Leg RDL 3x8 20kg +2,5kg'],
        ['Nordic Hamstring 3x5', 'Copenhagen Plank 3x20s']]],
      [5, 'Upper B – Trazioni e cura del braccio', [
        ['Shoulder CAR 1x5', 'Thoracic Spine Rotation 1x8'],
        ['Chin-Up 4x6 +1 rip', 'Landmine Press 4x8 25kg +2,5kg'],
        ['DB Lateral Raise 3x12 kg atleta', 'Cable Face Pull 3x15 kg atleta'],
        ['Cable Rope Triceps Extension 3x12 kg atleta', 'Cable External Rotation 2x12 kg atleta']]]
    ]],
    ['Forza', 4, [
      [1, 'Lower A – Forza e reattività', [
        ['Hip CAR 1x5', '90/90 Hip Switch 1x8', 'Thoracic Spine Rotation 1x8'],
        ['Depth Jump 3x3', 'Rotational Med Ball Throw 4x4 4kg'],
        ["Trap Bar Deadlift 5x3 110kg onda rec 3'"],
        ['DB RFE Split Squat 3x6 22kg +2,5kg', 'Cable Pallof Press 3x10 kg atleta'],
        ['DB Calf Raise 3x10 kg atleta']]],
      [2, 'Upper A – Forza orizzontale', [
        ['Shoulder CAR 1x5', 'Thoracic Spine Rotation 1x8'],
        ["DB Bench Press 4x6 30kg +2,5kg rec 2'", 'Single-Arm DB Row 4x8 30kg +2,5kg'],
        ['DB Shoulder Press 3x8 16kg', 'Cable Face Pull 3x12 kg atleta'],
        ['Cable External Rotation 2x12 kg atleta', 'Cable Rope Triceps Extension 3x10 kg atleta']]],
      [4, 'Lower B – Potenza laterale', [
        ['Hip CAR 1x5', '90/90 Hip Switch 1x8'],
        ['Lateral Bound 4x3', 'Rotational Med Ball Throw 4x4 5kg'],
        ['DB Single-Leg RDL 3x6 24kg +2,5kg'],
        ['Nordic Hamstring 3x6', 'Copenhagen Plank 3x25s']]],
      [5, 'Upper B – Trazioni zavorrate', [
        ['Shoulder CAR 1x5', 'Thoracic Spine Rotation 1x8'],
        ['Chin-Up 4x5 5kg +2,5kg', 'Landmine Press 4x6 30kg +2,5kg'],
        ['DB Lateral Raise 3x12 kg atleta', 'Cable Face Pull 3x15 kg atleta'],
        ['Cable Rope Triceps Extension 3x10 kg atleta', 'Cable External Rotation 2x12 kg atleta']]]
    ]]
  ]
};
function demoProgram() {
  const P = { name: DEMO_PROG.name, teamId: 't1', loadMode: 'auto', phases: [], createdAt: Date.now(), updatedAt: Date.now() };
  for (const [name, W, wos] of DEMO_PROG.phases) {
    const ph = newPhase(name, W);
    for (const [day, title, blocks] of wos) {
      const wo = { id: uid(), day, title, blocks: [] };
      blocks.forEach((lines, k) => { const b = newBlock(); lines.forEach(l => { const r = rowFromText(l, W); if (r) b.rows.push(r); }); if (k > 0 && lines.length > 1) b.rest = "1'30\""; wo.blocks.push(b); });
      ph.workouts.push(wo);
    }
    P.phases.push(ph);
  }
  return P;
}
async function seed() {
  const meta = (Store.cols.meta || {}).app;
  const has = c => Object.keys(Store.cols[c] || {}).length > 0;
  if (!meta && !(has('teams') || has('athletes'))) {
    for (const [id, t] of Object.entries(DEMO.teams)) await Store.set('teams', id, { name: t.name, color: t.color, createdAt: Date.now() });
    for (const [i, a] of DEMO.athletes.entries()) await Store.set('athletes', 'd' + (i + 1), { name: a[0], birth: a[1], role: a[2], injuries: a[3], contact: '', teamIds: a[4], createdAt: Date.now() });
  }
  if ((!meta || (meta.v || 1) < 2) && !has('programs')) await Store.set('programs', 'demo1', demoProgram());
  if (!meta || (meta.v || 1) < 2) await Store.set('meta', 'app', { seeded: true, v: 2 });
}
async function boot() {
  let last = {}; try { last = JSON.parse(localStorage.getItem('pb_last') || '{}'); } catch (e) { }
  shell();
  const cached = await Store.open();
  let seeded = false;
  // il demo si crea solo quando i dati sono disponibili, mai da una cache vuota offline
  const maybeSeed = () => { if (seeded) return; if (Store.mode === 'mem' || (Store.remote.teams && Store.remote.athletes && Store.remote.meta && Store.remote.programs)) { seeded = true; seed(); } };
  Store.listeners.push(maybeSeed);
  Store.sub('meta', () => { });
  Store.sub('teams', d => { S.teams = d; S.loaded.teams = cached || !!Store.remote.teams || Store.mode === 'mem'; if (S.team !== 'all' && !teamById(S.team)) S.team = 'all'; if (S.view !== 'editor') shell(); });
  Store.sub('athletes', d => { S.athletes = d; S.loaded.athletes = cached || !!Store.remote.athletes || Store.mode === 'mem'; if (S.view === 'athletes') page(); });
  Store.sub('programs', d => { S.programs = d; if (S.view === 'programs') page(); });
  await Store.connect();
  S.loaded.teams = S.loaded.athletes = true;
  if (last.view === 'editor' && (Store.cols.programs || {})[last.pid]) { S.programs = Object.entries(Store.cols.programs).map(([id, d]) => ({ id, ...clone(d) })); openEditor(last.pid); }
  else { if (last.view === 'programs') S.view = 'programs'; shell(); }
  maybeSeed();
}
boot();
