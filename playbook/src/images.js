/* ============ logo squadra e foto atleta ============
   L'immagine scelta viene rimpicciolita sul dispositivo (max 360 px) e salvata con i dati,
   così funziona offline e pesa poco. */
function imgField(id, src, label, kind) {
  return `<div class="fld"><label>${label}</label><div class="imgf" id="${id}">
    <div class="imgp ${kind}">${src ? `<img src="${src}" alt="">` : `<span>${kind === 'photo' ? 'Foto' : 'Logo'}</span>`}</div>
    <div class="imgb"><div class="imgbtn"><label class="btn sm">${src ? 'Cambia' : 'Carica'}<input type="file" accept="image/*" hidden></label><button type="button" class="btn sm ghost danger" data-rm ${src ? '' : 'hidden'}>Rimuovi</button></div>
    <span class="rs small">Facoltativo. Se c'è, compare sul foglio stampato.</span></div></div></div>`;
}
function wireImg(el, id, initial, kind) {
  let val = initial || '';
  const box = $('#' + id, el), prev = $('.imgp', box), inp = $('input[type=file]', box), rm = $('[data-rm]', box), lab = $('label.btn', box);
  const show = () => {
    prev.innerHTML = val ? `<img src="${val}" alt="">` : `<span>${kind === 'photo' ? 'Foto' : 'Logo'}</span>`;
    rm.hidden = !val; lab.firstChild.textContent = val ? 'Cambia' : 'Carica';
  };
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
    try { val = await shrinkImage(f, kind); show(); } catch (e) { toast('Immagine non leggibile: prova con un JPG o PNG'); }
  };
  rm.onclick = () => { val = ''; show(); };
  return { get: () => val };
}
function shrinkImage(file, kind) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const M = 360, c = document.createElement('canvas'), x = c.getContext('2d');
      if (kind === 'photo') { // ritaglio quadrato centrato
        const s = Math.min(im.width, im.height), d = Math.min(M, s);
        c.width = c.height = d; x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, d, d);
        res(c.toDataURL('image/jpeg', 0.85));
      } else { // logo: proporzioni originali, sfondo trasparente
        const k = Math.min(1, M / Math.max(im.width, im.height));
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        x.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/png'));
      }
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    im.src = url;
  });
}
/* ---- colori ---- */
function hexRgb(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return Number.isFinite(n) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [229, 38, 45]; }
function mixHex(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join(''); }
const tint = (h, a) => mixHex(h, '#ffffff', 1 - a);
const shade = (h, a = 0.35) => mixHex(h, '#000000', a);
function isLight(h) { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45; }
