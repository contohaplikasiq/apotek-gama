'use strict';
/* APOTEK GAMA · util.js — helper kecil tanpa dependensi · © Arraihan Academy */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const fmt = n => Math.round(num(n)).toLocaleString('id-ID');
const rp = n => (num(n) < 0 ? '-Rp ' : 'Rp ') + fmt(Math.abs(num(n)));
const qf = n => String(Math.round(num(n) * 1000) / 1000).replace('.', ',');
const parseRp = s => num(String(s == null ? '' : s).replace(/[^\d]/g, ''));
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const nowStr = () => { const d = new Date(); return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
const addDaysStr = (n, from) => { const d = from ? new Date(from + 'T00:00:00') : new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtDate = s => { s = String(s || ''); if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s || '—'; if (s.startsWith('9999')) return 'Tanpa ED'; return Number(s.substr(8, 2)) + ' ' + BLN[Number(s.substr(5, 2)) - 1] + ' ' + s.substr(0, 4); };
const fmtDT = s => { s = String(s || ''); return s.length >= 16 ? fmtDate(s.substr(0, 10)) + ' ' + s.substr(11, 5) : fmtDate(s); };
const uid = p => p + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ACT = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = ACT[el.dataset.act]; if (f) { if (el.tagName !== 'INPUT') e.preventDefault(); f(el, e); }
});

function toast(msg, type = 'ok', ms = 3200) {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, ms);
}
const MODALS = [];
function openModal(html, cls = '') {
  const w = document.createElement('div'); w.className = 'mwrap';
  w.innerHTML = '<div class="modal ' + cls + '" role="dialog" aria-modal="true">' + html + '</div>';
  w.addEventListener('mousedown', e => { if (e.target === w && !w.dataset.lock) closeModal(w); });
  $('#mroot').appendChild(w); MODALS.push(w);
  const f = $('[autofocus]', w) || $('input,select,textarea', w); if (f && innerWidth > 800) setTimeout(() => f.focus(), 30);
  return w;
}
function closeModal(w) { w = w || MODALS[MODALS.length - 1]; if (!w) return; const i = MODALS.indexOf(w); if (i >= 0) MODALS.splice(i, 1); w.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && MODALS.length) closeModal(); });
ACT.close = el => closeModal(el.closest('.mwrap'));
function mhead(title, sub) { return '<div class="mh"><div><h3>' + esc(title) + '</h3>' + (sub ? '<div class="muted xs">' + esc(sub) + '</div>' : '') + '</div><button class="ibtn" data-act="close" aria-label="Tutup">✕</button></div>'; }
function confirmBox(title, msg, okLabel, cb, danger) {
  const w = openModal(mhead(title) + '<div class="mb"><p>' + msg + '</p></div><div class="mf"><button class="btn" data-act="close">Batal</button><button class="btn ' + (danger ? 'dng' : 'pri') + '" id="cbOk">' + esc(okLabel || 'Ya') + '</button></div>', 'sm');
  $('#cbOk', w).onclick = () => { closeModal(w); cb(); };
}
function promptBox(title, label, cb, o = {}) {
  const w = openModal(mhead(title) + '<div class="mb"><div class="fld"><label>' + esc(label) + '</label><input class="in" id="pbIn" type="' + (o.type || 'text') + '" value="' + esc(o.val || '') + '" placeholder="' + esc(o.ph || '') + '" autofocus></div></div><div class="mf"><button class="btn" data-act="close">Batal</button><button class="btn ' + (o.danger ? 'dng' : 'pri') + '" id="pbOk">' + esc(o.ok || 'Simpan') + '</button></div>', 'sm');
  const go = () => { const v = $('#pbIn', w).value.trim(); if (o.min && v.length < o.min) { toast('Isi minimal ' + o.min + ' karakter', 'err'); return; } closeModal(w); cb(v); };
  $('#pbOk', w).onclick = go; $('#pbIn', w).onkeydown = e => { if (e.key === 'Enter') go(); };
}
function download(name, text, mime) {
  const b = new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function parseCSV(text) {
  text = String(text).replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}
function toCSV(rows) { return '\uFEFF' + rows.map(r => r.map(c => { c = c == null ? '' : String(c); return /[",;\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\r\n'); }
// Cetak lewat iframe tersembunyi (struk, etiket, laporan)
function printHTML(html, paper) {
  const root = $('#print-root'); root.innerHTML = '';
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); root.appendChild(f);
  const w = paper === 'A4' ? 'size:A4;margin:12mm' : 'size:' + paper + (paper.indexOf(' ') > 0 ? '' : ' auto') + ';margin:2mm';
  f.contentDocument.open();
  f.contentDocument.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{' + w + '}*{box-sizing:border-box}body{margin:0;font:12px/1.35 "Courier New",monospace;color:#000}.c{text-align:center}.r{text-align:right}.b{font-weight:700}.hr{border-top:1px dashed #000;margin:5px 0}.row{display:flex;justify-content:space-between;gap:6px}table{width:100%;border-collapse:collapse}td,th{padding:2px 3px;text-align:left;font:12px/1.3 Arial,sans-serif}th{border-bottom:1px solid #000}.lbl{page-break-after:always;padding:2mm;border:1px solid #000}.xs{font-size:10px}.lg{font-size:15px}</style></head><body>' + html + '</body></html>');
  f.contentDocument.close(); setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Cetak tidak tersedia di perangkat ini', 'err'); } }, 250);
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
function normDate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return ymd(new Date(v.getTime() - v.getTimezoneOffset() * 60000 + 12 * 3600e3)).replace(/^(\d{4})/, '$1'), new Date(v.getTime() - v.getTimezoneOffset() * 60000 + 12 * 3600e3).toISOString().slice(0, 10);
  let s = String(v).trim(), m;
  if (/^\d{5}(\.\d+)?$/.test(s) && Number(s) > 20000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 864e5).toISOString().slice(0, 10);
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + pad(m[2]) + '-' + pad(m[1]); }
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{4})$/))) { const last = new Date(Number(m[2]), Number(m[1]), 0).getDate(); return m[2] + '-' + pad(m[1]) + '-' + pad(last); }
  return s;
}
// Grafik batang SVG ringan
function barSVG(labels, vals, o = {}) {
  const W = 560, H = o.h || 170, pl = 8, pb = 22, n = vals.length, max = Math.max(1, ...vals), bw = (W - pl * 2) / Math.max(1, n);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="Grafik">';
  vals.forEach((v, i) => {
    const h = Math.round((H - pb - 14) * v / max), x = pl + i * bw + bw * .18, y = H - pb - h;
    s += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw * .64).toFixed(1) + '" height="' + h + '" rx="3" class="bar"><title>' + esc(labels[i]) + ': ' + esc(o.fmt ? o.fmt(v) : fmt(v)) + '</title></rect>';
    if (n <= 16 || i % Math.ceil(n / 12) === 0) s += '<text x="' + (x + bw * .32).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="axl">' + esc(labels[i]) + '</text>';
  });
  return s + '</svg>';
}
