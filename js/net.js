'use strict';
/* APOTEK GAMA · net.js — fetch ke GAS, antrean offline idempoten, sinkron berbasis versi · © Arraihan Academy */
let ONLINE = navigator.onLine, flushing = false, syncing = false, REAUTH = null;
const OPMAP = { trx: 'trx.save', stock: 'stock.ops', purchase: 'purchase.save', product: 'product.save', pdel: 'product.delete', void: 'trx.void', shiftclose: 'shift.close', pay: 'purchase.pay' };
function cfgOK() { const u = GAMA_CONFIG.GAS_URL; return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(u) && !/GANTI|XXXX/.test(u); }
async function call(action, data, o = {}) {
  if (!cfgOK()) throw { offline: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js lalu unggah ulang.' };
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), o.timeout || 40000);
  let res, j;
  try {
    res = await fetch(GAMA_CONFIG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: o.noToken ? '' : S.token, data: data || {} }), signal: ctl.signal, redirect: 'follow' });
    j = await res.json();
  } catch (e) { clearTimeout(to); setOnline(false); throw { offline: true, message: 'Tidak dapat terhubung ke server' }; }
  clearTimeout(to); setOnline(true);
  if (!j.success) { if (j.code === 'SESI_HABIS') onSessionExpired(); throw { offline: false, message: j.message, code: j.code }; }
  return j;
}
function setOnline(v) { if (v === ONLINE) return; ONLINE = v; updateStatus(); if (v) { tryReauth().then(() => { flush(); }); } }
function noteVers(v) { if (!v) return; Object.keys(v).forEach(t => { if (S.vers[t] === v[t][0]) S.vers[t] = v[t][1]; }); }
function enqueue(type, payload, label) {
  const op = { id: uid('OP'), type, payload, label: label || type, ts: nowStr(), st: 'WAIT', err: '' };
  Q.push(op); saveQ(); updateStatus(); flush(); return op;
}
const waiting = () => Q.filter(o => o.st === 'WAIT');
async function flush() {
  if (flushing || !S.token || !waiting().length) return;
  flushing = true; updateStatus();
  try {
    for (const op of waiting()) {
      try {
        const r = await call(OPMAP[op.type], op.type === 'stock' ? { opId: op.id, ops: op.payload } : op.payload);
        noteVers(r._v); Q = Q.filter(x => x !== op); saveQ();
        if (op.type === 'shiftclose' && r.data && r.data.shift && S.shift && S.shift.id_shift === r.data.shift.id_shift) { S.shift = null; }
      } catch (e) {
        if (e.offline || e.code === 'SESI_HABIS') throw e;
        op.st = 'ERR'; op.err = e.message; saveQ(); toast('Gagal sinkron: ' + op.label + ' — ' + e.message, 'err', 6000);
      }
    }
  } catch (e) { /* offline / sesi habis: antrean tetap tersimpan */ }
  flushing = false; updateStatus();
  if (!waiting().length) await sync();
}
const COLL = ['cfg', 'products', 'batches', 'suppliers', 'purchases', 'shifts', 'users'];
async function sync(force) {
  if (syncing || !S.token || waiting().length) return;
  syncing = true;
  try {
    const r = await call('sync', { vers: force ? {} : S.vers, trxRow: force ? 0 : S.trxRow, logRow: force ? 0 : S.logRow });
    applySync(r.data);
    if ((r.data.trx && r.data.trx.more) || (r.data.logs && r.data.logs.more)) { syncing = false; return sync(); }
  } catch (e) { /* diam: indikator status sudah menunjukkan */ }
  syncing = false;
}
function applySync(d) {
  COLL.forEach(k => { if (d[k] !== undefined) S[k] = d[k]; });
  S.vers = Object.assign({}, S.vers, d.vers || {});
  if (d.trx) {
    if (d.trx.reset) S.trx = d.trx.rows; else d.trx.rows.forEach(t => upsert(S.trx, t, 'id_transaksi'));
    (d.trx.voids || []).forEach(v => { const t = S.trx.find(x => x.id_transaksi === v.id_transaksi); if (t) Object.assign(t, v); });
    S.trxRow = d.trx.row;
    const lim = addDaysStr(isRole(...R_APT) ? -35 : -2); S.trx = S.trx.filter(t => String(t.tanggal_waktu) >= lim);
  }
  S.logs = S.logs.filter(l => !l._local);
  if (d.logs) { if (d.logs.reset) S.logs = d.logs.rows; else d.logs.rows.forEach(l => upsert(S.logs, l, 'id_log')); S.logRow = d.logs.row; if (S.logs.length > 900) S.logs = S.logs.slice(-900); }
  S.server = d.server; S.lastSync = nowStr();
  if (S.shift && !S.shift._local) { const sh = S.shifts.find(x => x.id_shift === S.shift.id_shift); if (sh && sh.status === 'TUTUP') S.shift = null; }
  saveAuth(); commit(); updateStatus();
}
function upsert(arr, row, key) { const i = arr.findIndex(x => x[key] === row[key]); if (i >= 0) arr[i] = row; else arr.push(row); }
function setSync() { updateStatus(); }
function updateStatus() {
  const w = waiting().length, e = Q.filter(o => o.st === 'ERR').length, st = $('#stSync'); if (!st) return;
  let cls = 'ok', txt = 'Online · tersinkron' + (S.lastSync ? ' ' + S.lastSync.substr(11, 5) : '');
  if (!ONLINE) { cls = 'off'; txt = 'Offline — transaksi tetap tersimpan di perangkat'; }
  else if (flushing || syncing) { cls = 'sync'; txt = 'Menyinkronkan…'; }
  else if (!S.token) { cls = 'off'; txt = 'Online — masuk ulang untuk menyinkronkan'; }
  if (w) txt += ' · ' + w + ' menunggu';
  if (e) { txt += ' · ' + e + ' perlu tinjau'; if (cls === 'ok') cls = 'warn'; }
  st.className = 'stsync ' + cls; $('span', st).textContent = txt;
  const b = $('#qBadge'); if (b) { b.textContent = w + e; b.classList.toggle('hidden', !(w + e)); }
  const pill = $('#netPill'); if (pill) { pill.className = 'pill ' + (ONLINE ? 'ok' : 'off'); pill.lastElementChild.textContent = ONLINE ? 'Online' : 'Offline'; }
}
function onSessionExpired() {
  if (!S.token) return; S.token = ''; saveAuth(); updateStatus();
  toast('Sesi berakhir. Data tetap aman — masuk lagi untuk menyinkronkan.', 'warn', 6000); if (S.user) Auth.reloginModal();
}
async function tryReauth() {
  if (!REAUTH || S.token || !ONLINE) return;
  try { await Auth.loginOnline(REAUTH.username, REAUTH.pin, REAUTH.shift, REAUTH.modal, true); } catch (e) { /* tunggu login manual */ }
}
// Panel antrean (lihat / coba lagi / buang)
function queuePanel() {
  const rows = Q.map(o => '<tr><td>' + esc(o.label) + '<div class="muted xs">' + esc(fmtDT(o.ts)) + '</div></td><td>' + (o.st === 'WAIT' ? '<span class="badge amb">Menunggu</span>' : '<span class="badge red">Perlu tinjau</span><div class="xs" style="max-width:260px">' + esc(o.err) + '</div>') + '</td><td class="r">' + (o.st === 'ERR' ? '<button class="btn sm" data-act="qretry" data-id="' + o.id + '">Coba lagi</button> <button class="btn sm dng" data-act="qdrop" data-id="' + o.id + '">Buang</button>' : '') + '</td></tr>').join('');
  openModal(mhead('Antrean sinkron', ONLINE ? 'Perangkat online' : 'Perangkat offline') + '<div class="mb">' + (Q.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Operasi</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="muted xs">“Perlu tinjau” = ditolak server (mis. stok sudah habis di terminal lain). Data lokal otomatis disesuaikan dengan server; Anda bisa coba lagi setelah stok diperbaiki, atau membuang operasi tersebut.</p>' : '<p class="muted c">Tidak ada antrean — semua data sudah tersinkron ✓</p>') + '</div><div class="mf"><button class="btn" data-act="close">Tutup</button><button class="btn pri" data-act="qsync">Sinkronkan sekarang</button></div>');
}
ACT.queue = () => queuePanel();
ACT.qsync = () => { closeModal(); flush().then(() => sync()); toast('Menyinkronkan…', 'ok', 1500); };
ACT.qretry = el => { const o = Q.find(x => x.id === el.dataset.id); if (o) { o.st = 'WAIT'; o.err = ''; saveQ(); } closeModal(); flush(); };
ACT.qdrop = el => { Q = Q.filter(x => x.id !== el.dataset.id); saveQ(); closeModal(); updateStatus(); sync(true); toast('Operasi dibuang & data disegarkan dari server', 'warn'); };
window.addEventListener('online', () => { ONLINE = true; updateStatus(); tryReauth().then(() => flush()); });
window.addEventListener('offline', () => { ONLINE = false; updateStatus(); });
setInterval(() => { if (S.token && ONLINE && document.visibilityState === 'visible') { flush(); sync(); } }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token && ONLINE) { flush(); sync(); } });
