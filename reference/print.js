/* ============ print: shared sheet model, HTML preview, PDF ============ */
function printPages(P, o) {
  const sess = o.si === 'all' ? P.sessions.map((_, i) => i) : [Number(o.si)];
  const weeks = o.wk === 'all' ? [...Array(P.weeks).keys()] : o.wk === 'ov' ? ['ov'] : [Number(o.wk)];
  const pages = [];
  for (const si of sess) for (const w of weeks) pages.push({ si, w });
  return pages;
}
const isNumStr = v => num(v) != null;
const kgStr = v => (v === '' || v == null ? '' : isNumStr(v) ? v + ' kg' : String(v));
const repStr = w => `${w.sets || '-'}x${w.reps || '-'}`;

function sheetModel(P, pg, o) {
  const ses = P.sessions[pg.si], W = P.weeks, codes = rowCodes(ses);
  const m = {
    athlete: P.athleteName, title: P.title, session: ses.name,
    right: pg.w === 'ov' ? `${ses.name} · ${W} settimane` : `${ses.name} · settimana ${pg.w + 1}/${W}`,
    sub: pg.w === 'ov' ? `dal ${fmtDate(P.start)}` : `settimana dal ${fmtDate(weekDate(P, pg.w))}`,
    head: [], align: [], widths: [], rows: [], empty: ses.blocks.every(b => !b.rows.length)
  };
  const blocks = ses.blocks.filter(b => b.rows.length);
  const bt = b => BLOCK_TYPES[b.type] || BLOCK_TYPES.free;
  const blockRow = (b, bi) => ({ block: true, label: `${LETTERS[ses.blocks.indexOf(b) % 26]}  ${blockLabel(b)}`, color: bt(b).color, rgb: bt(b).rgb });
  if (pg.w === 'ov') {
    const mode = o.mode || 'filled';
    const sub = mode === 'both' ? ['Serie x Rip', 'Kg', 'Reale'] : ['Serie x Rip', 'Kg', 'RPE'];
    const left = [9, 50, 11, 13], lw = left.reduce((x, y) => x + y, 0), wk = (277 - lw) / W;
    m.fs = W > 6 ? 7 : 8;
    m.group = { leftN: 4, labels: Array.from({ length: W }, (_, i) => `Sett. ${i + 1} · ${fmtDate(weekDate(P, i), false)}`), span: 3 };
    m.head = ['Cod', 'Esercizio', 'Rec', 'Tempo']; m.align = ['center', 'left', 'center', 'center']; m.widths = [...left];
    for (let i = 0; i < W; i++) { m.head.push(...sub); m.align.push('center', 'center', 'center'); m.widths.push(wk * 0.4, wk * 0.32, wk * 0.28); }
    m.boxStart = -1;
    blocks.forEach(b => {
      m.rows.push(blockRow(b));
      b.rows.forEach(r => {
        const cells = [codes[r.id], r.name, r.w[0].rest, r.w[0].tempo];
        r.w.forEach(w => { cells.push(repStr(w), mode === 'blank' ? '' : (w.load || ''), mode === 'both' ? '' : (w.rpe || '')); });
        m.rows.push({ cells, tall: mode !== 'filled' });
      });
    });
    return m;
  }
  const wi = pg.w, mode = o.mode || 'filled';
  const showKg = mode !== 'blank', showBox = mode !== 'filled';
  let N = 4;
  ses.blocks.forEach(b => b.rows.forEach(r => { const s = intOnly(r.w[wi].sets); if (s && s > N) N = s; }));
  N = Math.min(8, Math.max(3, N));
  const boxW = Math.min(13, 70 / N);
  m.head = ['Cod', 'Esercizio', 'Serie', 'Rip'];
  m.align = ['center', 'left', 'center', 'center'];
  m.widths = [11, showBox ? 58 : 84, 12, 14];
  if (showKg) { m.head.push('Kg'); m.align.push('center'); m.widths.push(17); }
  m.head.push('Rec', 'Tempo', 'RPE'); m.align.push('center', 'center', 'center'); m.widths.push(14, 15, 11);
  if (showBox) for (let i = 1; i <= N; i++) { m.head.push('S' + i); m.align.push('center'); m.widths.push(boxW); }
  m.head.push('Note'); m.align.push('left');
  m.widths.push(277 - m.widths.reduce((a, b) => a + b, 0));
  m.boxStart = showBox ? m.head.length - 1 - N : -1; m.N = N;
  blocks.forEach(b => {
    m.rows.push(blockRow(b));
    b.rows.forEach(r => {
      const w = r.w[wi];
      const c = [codes[r.id], r.name, w.sets, w.reps];
      if (showKg) c.push(kgStr(w.load));
      c.push(w.rest, w.tempo, w.rpe);
      if (showBox) for (let i = 0; i < N; i++) c.push('');
      c.push(r.note || '');
      m.rows.push({ cells: c, tall: showBox });
    });
  });
  return m;
}

function sheetHTML(P, pg, o) {
  const m = sheetModel(P, pg, o);
  const total = 277;
  const colgroup = '<colgroup>' + m.widths.map(w => `<col style="width:${(w / total * 100).toFixed(2)}%">`).join('') + '</colgroup>';
  let head;
  if (m.group) {
    const L = m.group.leftN;
    head = '<tr>' + m.head.slice(0, L).map(h => `<th rowspan="2">${esc(h)}</th>`).join('') + m.group.labels.map(l => `<th colspan="${m.group.span}">${esc(l)}</th>`).join('') + '</tr><tr>' + m.head.slice(L).map(h => `<th>${esc(h)}</th>`).join('') + '</tr>';
  } else head = '<tr>' + m.head.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>';
  const body = m.rows.map(r => {
    if (r.block) return `<tr class="bk" style="--bc:${r.color}"><td colspan="${m.head.length}">${esc(r.label)}</td></tr>`;
    return '<tr>' + r.cells.map((c, i) => {
      const cls = [m.align[i] === 'left' ? 'n' : '', (m.boxStart >= 0 && i >= m.boxStart && i < m.boxStart + m.N) ? 'bx' : ''].join(' ');
      const st = r.strong ? ' style="font-weight:700;background:#f2f2f2"' : '';
      return `<td class="${cls}"${st}>${esc(c).replace(/\n/g, '<br>')}</td>`;
    }).join('') + '</tr>';
  }).join('');
  return `<section class="sheet"><div class="sh-head"><div><h1>${esc(m.athlete)}</h1><small>${esc(m.title)}</small></div>
  <div style="text-align:right"><div class="sh-r">${esc(m.right)}</div><small>${esc(m.sub)}</small></div></div>
  ${m.empty ? '<p style="padding:24px;color:#6b7686">Nessun esercizio in questa sessione.</p>' : `<table class="sh">${colgroup}<thead>${head}</thead><tbody>${body}</tbody></table>`}
  <div class="sh-foot"><span>${esc(m.athlete)} · ${esc(m.title)}</span><span>Programmi Don Bosco</span></div></section>`;
}

function standaloneHTML(P, o) {
  const pages = printPages(P, o).map(pg => sheetHTML(P, pg, o).replace('class="sheet"', 'class="sheet pg"')).join('');
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>${esc(P.athleteName)} - ${esc(P.title)}</title>
<style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e5e8ee;font-family:Arial,sans-serif}
.sheet{background:#fff;color:#0e1a2b;width:100%;max-width:1100px;margin:12px auto;font-size:12px}
.sh-head{background:#000;color:#fff;padding:12px 18px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:5px solid #d0121b}
.sh-head h1{margin:0;font-size:26px;text-transform:uppercase;letter-spacing:.03em}.sh-head small{display:block;color:#ccc;margin-top:3px}
.sh-r{font-size:17px;font-weight:700;text-transform:uppercase}
table.sh{width:100%;border-collapse:collapse;table-layout:fixed}
table.sh th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:#ececec;color:#5a6779;padding:5px 4px;border:1px solid #999}
table.sh td{border:1px solid #999;padding:5px 4px;text-align:center;word-wrap:break-word}table.sh td.n{text-align:left;font-weight:700}
table.sh td.bx{height:30px}table.sh tr.bk td{background:var(--bc);color:#fff;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-align:left;border-color:var(--bc)}
.sh-foot{padding:6px 10px;font-size:10px;color:#6b7686;display:flex;justify-content:space-between}
@media print{body{background:#fff}.sheet{margin:0;max-width:none;page-break-after:always;break-after:page}.sheet:last-child{page-break-after:auto;break-after:auto}}</style></head><body>${pages}</body></html>`;
}

function drawBand(doc, m) {
  doc.setFillColor(0, 0, 0); doc.rect(0, 0, 297, 22, 'F');
  doc.setFillColor(208, 18, 27); doc.rect(0, 22, 297, 1.6, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(String(m.athlete).toUpperCase(), 10, 12.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 200, 200);
  doc.text(String(m.title), 10, 18.3);
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(String(m.right).toUpperCase().replace(/·/g, '-'), 287, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 200, 200);
  doc.text(String(m.sub), 287, 18.3, { align: 'right' });
}
function pdfHead(m) {
  if (!m.group) return [m.head];
  const L = m.group.leftN;
  return [
    [...m.head.slice(0, L).map(h => ({ content: h, rowSpan: 2 })), ...m.group.labels.map(l => ({ content: l.replace(/·/g, '-'), colSpan: m.group.span }))],
    m.head.slice(L)
  ];
}
function drawPdfPage(doc, P, pg, o) {
  const m = sheetModel(P, pg, o);
  drawBand(doc, m);
  if (m.empty) {
    doc.setTextColor(107, 118, 134); doc.setFontSize(11); doc.text('Nessun esercizio in questa sessione.', 10, 36);
    return;
  }
  const ncol = m.head.length;
  const body = m.rows.map(r => {
    if (r.block) return [{ content: r.label.toUpperCase(), colSpan: ncol, styles: { fillColor: r.rgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, halign: 'left', minCellHeight: 7 } }];
    return r.cells.map((c, i) => {
      const st = { halign: m.align[i] };
      if (i === 1 || r.strong) st.fontStyle = 'bold';
      if (r.strong) st.fillColor = [246, 248, 251];
      if (r.tall) st.minCellHeight = 10;
      return { content: String(c ?? ''), styles: st };
    });
  });
  const columnStyles = {};
  m.widths.forEach((w, i) => { columnStyles[i] = { cellWidth: w, halign: m.align[i] }; });
  doc.__at({
    head: pdfHead(m), body, startY: 28,
    margin: { top: 28, left: 10, right: 10, bottom: 12 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: m.fs || 9.5, cellPadding: m.fs ? { top: 1.4, bottom: 1.4, left: 1, right: 1 } : { top: 2, bottom: 2, left: 1.8, right: 1.8 }, lineColor: [207, 214, 223], lineWidth: 0.2, valign: 'middle', textColor: [14, 26, 43], overflow: 'linebreak' },
    headStyles: { fillColor: [230, 230, 230], textColor: [60, 60, 60], fontStyle: 'bold', fontSize: m.fs ? 7 : 8, halign: 'center', valign: 'middle' },
    columnStyles,
    didDrawPage: d => { if (d.pageNumber > 1) drawBand(doc, m); }
  });
}
function makePDF(P, o) {
  if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error('La libreria PDF non è stata caricata. Controlla la connessione e riprova.');
  const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const at = typeof doc.autoTable === 'function' ? o => doc.autoTable(o) : (typeof window.autoTable === 'function' ? o => window.autoTable(doc, o) : (window.jspdf.autoTable ? o => window.jspdf.autoTable(doc, o) : null));
  if (!at) throw new Error('Il modulo tabelle del PDF non è stato caricato.');
  doc.__at = at;
  const pages = printPages(P, o);
  pages.forEach((pg, i) => { if (i > 0) doc.addPage(); drawPdfPage(doc, P, pg, o); });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(107, 118, 134);
    doc.text(`${P.athleteName} - ${P.title}`, 10, 204);
    doc.text(`Pag. ${i}/${n}`, 287, 204, { align: 'right' });
  }
  return doc.output('blob');
}
async function saveFile(filename, data) {
  try {
    const dl = window.claude && claude.use ? await claude.use('downloads') : null;
    if (!dl) { toast('Il download non è disponibile in questa vista'); return false; }
    await dl.save({ filename, data });
    return true;
  } catch (e) {
    if (e && e.code === 'declined') return false;
    toast('Download non riuscito: ' + ((e && e.message) || 'errore'));
    return false;
  }
}
