/* ============ Firebase: accesso con Google + database sincronizzato ============
   La configurazione sta in config.js (window.FIREBASE_CONFIG). Se manca, l'app funziona
   solo sul dispositivo. Firestore tiene una copia offline: l'app parte anche senza rete. */
const Cloud = { on: false, app: null, auth: null, fs: null, user: null, installEvt: null };
function cloudInit() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || !window.FB) return false;
  try {
    Cloud.app = FB.initializeApp(cfg);
    Cloud.auth = FB.getAuth(Cloud.app);
    Cloud.fs = FB.initializeFirestore(Cloud.app, { localCache: FB.persistentLocalCache({ tabManager: FB.persistentMultipleTabManager() }) });
    const emu = window.FIREBASE_EMULATOR;
    if (emu) { FB.connectAuthEmulator(Cloud.auth, emu.auth, { disableWarnings: true }); FB.connectFirestoreEmulator(Cloud.fs, emu.host, emu.port); }
    Cloud.on = true;
  } catch (e) { console.error(e); Cloud.on = false; }
  return Cloud.on;
}
/* primo stato dell'accesso (anche offline: Firebase ricorda l'utente sul dispositivo) */
function cloudFirstUser(ms) {
  return new Promise(res => {
    let done = false; const fin = u => { if (!done) { done = true; Cloud.user = u || null; res(Cloud.user); } };
    FB.onAuthStateChanged(Cloud.auth, fin);
    setTimeout(() => fin(Cloud.auth.currentUser), ms);
  });
}
/* adattatore: stessa forma usata dallo Store (collection/doc/onSnapshot) */
function cloudDb(uid) {
  const col = c => FB.collection(Cloud.fs, 'users', uid, c), dref = (c, id) => FB.doc(Cloud.fs, 'users', uid, c, id);
  return {
    collection: c => ({
      onSnapshot: (cb, err) => FB.onSnapshot(col(c), { includeMetadataChanges: true }, s => cb({ fromCache: s.metadata.fromCache, docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }), err),
      doc: id => ({ set: data => FB.setDoc(dref(c, id), data), delete: () => FB.deleteDoc(dref(c, id)) })
    })
  };
}
const localOnly = () => { try { return localStorage.getItem('pb_localonly') === '1'; } catch (e) { return false; } };
const setLocalOnly = on => { try { on ? localStorage.setItem('pb_localonly', '1') : localStorage.removeItem('pb_localonly'); } catch (e) { } };
async function googleLogin(btn, msg) {
  const prov = new FB.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
  btn.disabled = true; msg.textContent = '';
  try { await FB.signInWithPopup(Cloud.auth, prov); setLocalOnly(false); location.reload(); }
  catch (e) {
    const c = e && e.code || '';
    if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(c)) { try { await FB.signInWithRedirect(Cloud.auth, prov); return; } catch (e2) { } }
    btn.disabled = false;
    msg.textContent = /popup-closed|cancelled-popup/.test(c) ? '' : /network/.test(c) ? 'Serve la connessione per il primo accesso. Riprova quando sei online.' : /unauthorized-domain/.test(c) ? 'Questo indirizzo non è autorizzato in Firebase (Authentication → Impostazioni → Domini autorizzati).' : 'Accesso non riuscito: ' + (c || 'errore');
  }
}
function loginScreen() {
  $('#app').innerHTML = `<div class="login"><div class="lcard">
    <div class="logo big"><img class="lmark" src="${LOGO}" alt=""><span>${APP_NAME}</span></div>
    <p class="muted">Programmi di allenamento. Accedi per avere gli stessi dati su PC, tablet e telefono.</p>
    <button class="btn gbtn" id="lg-go"><svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>Accedi con Google</button>
    <p class="lerr" id="lg-msg" role="alert"></p>
    <button class="lnk" id="lg-local">Usa senza account (dati solo su questo dispositivo)</button></div></div>`;
  $('#lg-go').onclick = () => googleLogin($('#lg-go'), $('#lg-msg'));
  $('#lg-local').onclick = () => { setLocalOnly(true); location.reload(); };
}
/* dopo un accesso con reindirizzamento (telefono) */
async function cloudRedirectResult() { try { await FB.getRedirectResult(Cloud.auth); } catch (e) { } }

/* ---------- app installabile + aggiornamenti ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); Cloud.installEvt = e; if (S.view === 'settings') page(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
}
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- impostazioni: account, app, backup, dati di esempio ---------- */
const DEMO_IDS = { teams: ['t1', 't2'], athletes: ['d1', 'd2', 'd3', 'd4', 'd5'], programs: ['demo1', 'demo1-d1'], logs: ['demo-log-1', 'demo-log-2', 'demo-log-3', 'demo-log-4', 'demo-log-5', 'demo-log-6'] };
function settingsView(el) {
  const [k, st] = Store.status(), u = Cloud.user;
  const demoLeft = Object.entries(DEMO_IDS).reduce((n, [c, ids]) => n + ids.filter(id => (Store.cols[c] || {})[id]).length, 0);
  el.innerHTML = `<div class="ph"><div><h1>Impostazioni</h1></div></div>
  <div class="sets">
    <section class="sbox"><h3>Account e sincronizzazione</h3>
      ${Cloud.on ? (u ? `<div class="srow"><div class="av sm">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="">` : esc(initials(u.displayName || u.email))}</div><div><b>${esc(u.displayName || '')}</b><div class="rs">${esc(u.email || '')}</div></div><div class="grow"></div><button class="btn sm" data-s="logout">Esci</button></div>
          <p class="rs"><i class="sd ${k}"></i> ${esc(st)}. I dati restano anche senza rete e si allineano da soli appena torna la connessione.</p>`
        : `<p class="rs">Stai usando l'app senza account: i dati sono solo su questo dispositivo.</p><button class="btn pri" data-s="login">Accedi con Google per sincronizzare</button><p class="lerr" id="s-msg"></p>`)
      : '<p class="rs">Sincronizzazione non ancora configurata: i dati sono solo su questo dispositivo.</p>'}
    </section>
    <section class="sbox"><h3>App sul telefono e sul PC</h3>
      ${isStandalone() ? '<p class="rs">Stai usando l\'app installata. Funziona anche senza rete.</p>'
        : Cloud.installEvt ? '<p class="rs">Installa ' + APP_NAME + ': avrai l\'icona sulla schermata Home e si aprirà anche senza rete.</p><button class="btn pri" data-s="install">Installa l\'app</button>'
        : isIOS() ? '<p class="rs">Su iPhone e iPad: apri questa pagina con Safari, tocca <b>Condividi</b> (il quadrato con la freccia) e poi <b>Aggiungi alla schermata Home</b>.</p>'
        : '<p class="rs">Dal menu del browser scegli <b>Installa app</b> o <b>Aggiungi a schermata Home</b>.</p>'}
    </section>
    <section class="sbox"><h3>Backup</h3>
      <p class="rs">Salva una copia di tutti i dati in un file, da tenere al sicuro o da reimportare.</p>
      <div class="mf" style="margin-top:8px"><button class="btn" data-s="export">Esporta backup</button><label class="btn">Importa backup<input type="file" accept=".json,application/json" id="s-imp" hidden></label></div>
    </section>
    ${demoLeft ? `<section class="sbox"><h3>Dati di esempio</h3><p class="rs">La squadra "Baseball Demo", i 5 atleti di prova e il programma di esempio servono solo per provare l'app.</p>
      <button class="btn danger" data-s="demo">Elimina i dati di esempio</button></section>` : ''}
  </div>`;
  el.onclick = async e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s;
    if (a === 'logout') { if (!b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Confermi?'; return; } await FB.signOut(Cloud.auth); location.reload(); }
    else if (a === 'login') googleLogin(b, $('#s-msg'));
    else if (a === 'install' && Cloud.installEvt) { Cloud.installEvt.prompt(); Cloud.installEvt = null; }
    else if (a === 'export') exportBackup();
    else if (a === 'demo') {
      if (!b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Confermi? Elimina squadra, atleti e programmi di esempio'; return; }
      for (const [c, ids] of Object.entries(DEMO_IDS)) for (const id of ids) if ((Store.cols[c] || {})[id]) await Store.del(c, id);
      if (S.team === 't1' || S.team === 't2') setTeam('all'); toast('Dati di esempio eliminati'); page();
    }
  };
  const imp = $('#s-imp', el); if (imp) imp.onchange = () => importBackup(imp);
}
const BACKUP_COLS = ['teams', 'athletes', 'programs', 'logs', 'meta'];
function exportBackup() {
  const data = { app: 'playbook', version: 1, exportedAt: new Date().toISOString(), cols: {} };
  BACKUP_COLS.forEach(c => { data.cols[c] = Store.cols[c] || {}; });
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `dp-performance-backup-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup salvato');
}
async function importBackup(inp) {
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
  let data; try { data = JSON.parse(await f.text()); } catch (e) { toast('File non valido'); return; }
  if (!data || data.app !== 'playbook' || !data.cols) { toast('Questo file non è un backup di ' + APP_NAME); return; }
  const n = BACKUP_COLS.reduce((s, c) => s + Object.keys(data.cols[c] || {}).length, 0);
  modal('Importa backup', `<p>Il file contiene ${n} elementi (squadre, atleti, programmi) del ${esc(fmtDate((data.exportedAt || '').slice(0, 10)))}.</p><p class="rs">Gli elementi con lo stesso identificativo vengono sostituiti; gli altri dati restano.</p>`,
    '<div class="grow"></div><button class="btn" data-close>Annulla</button><button class="btn pri" id="imp-ok">Importa</button>', (el, m) => {
      $('#imp-ok', el).onclick = async () => {
        for (const c of BACKUP_COLS) for (const [id, d] of Object.entries(data.cols[c] || {})) await Store.set(c, id, d);
        m.close(); toast('Backup importato');
      };
    });
}
