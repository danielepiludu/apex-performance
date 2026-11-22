/* ============ utilità comuni ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isMob = () => window.matchMedia('(max-width: 759px)').matches;
function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function intOnly(v) {
  const s = String(v ?? '').trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}
function fmtN(n) {
  if (n == null || !Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100).replace('.', ',');
}
const roundTo = (x, step) => (step > 0 ? Math.round(x / step) * step : x);
function debounce(fn, ms) { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.now = (...a) => { clearTimeout(t); fn(...a); }; return d; }
function toast(m) { $$('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
function age(d) { if (!d) return ''; const b = new Date(d); if (isNaN(b)) return ''; const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a + ' anni'; }
function initials(n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
const stripId = o => { const c = { ...o }; delete c.id; return c; };
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function fmtDate(iso, short) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return short ? `${d}/${m}` : `${d}/${m}/${y}`; }
function nextMonday() { const t = todayISO(), d = new Date(t + 'T12:00:00').getDay(); return addDays(t, ((8 - d) % 7) || 7); }
