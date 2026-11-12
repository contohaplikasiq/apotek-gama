'use strict';
/* APOTEK GAMA · shell.js — login (online/offline), navigasi, tema, notifikasi, shift · © Arraihan Academy */
const PAGES = [];
const BUILT = {};
function commit() { reindex(); saveSnap(); refreshCurrent(); updateBell(); }
function refreshCurrent() { const pg = PAGES.find(p => p.id === S.cur); if (pg && BUILT[pg.id] && pg.refresh) pg.refresh($('#pg-' + pg.id)); }
function go(id) {
  const pg = PAGES.find(p => p.id === id && p.roles.indexOf(S.user.role) >= 0) || PAGES.find(p => p.roles.indexOf(S.user.role) >= 0);
  S.cur = pg.id; $$('#pages .pg').forEach(e => e.classList.toggle('on', e.id === 'pg-' + pg.id));
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === pg.id));
  $('#pTitle').textContent = pg.ttl; $('#pSub').textContent = pg.sub || '';
  const el = $('#pg-' + pg.id); if (!BUILT[pg.id]) { pg.build(el); BUILT[pg.id] = true; } if (pg.refresh) pg.refresh(el);
  $('#side').classList.remove('open'); $('#scrim').classList.remove('on');
  if (location.hash !== '#/' + pg.id) history.replaceState(null, '', '#/' + pg.id);
  const m = $('#main'); if (m) m.scrollTop = 0;
}
ACT.go = el => go(el.dataset.p);
window.addEventListener('hashchange', () => { if (S.user) { const id = location.hash.replace('#/', ''); if (id && id !== S.cur) go(id); } });

function buildNav() {
  $('#nav').innerHTML = PAGES.filter(p => p.roles.indexOf(S.user.role) >= 0).map(p => '<a href="#/' + p.id + '" data-act="go" data-p="' + p.id + '"><span class="ni">' + p.ico + '</span><span>' + esc(p.ttl) + '</span></a>').join('');
  $('#uAv').textContent = (S.user.nama || S.user.username).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('#uName').textContent = S.user.nama || S.user.username; $('#uSub').textContent = S.user.role + (S.shift ? ' · Shift ' + (S.shift.shift || '') : '');
  $('#sSia').textContent = S.cfg.no_sia ? 'SIA: ' + S.cfg.no_sia : 'Kasir & Inventaris';
}
function enterApp(mustChange) {
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); buildNav();
  const want = location.hash.replace('#/', ''); go(want || (S.user.role === 'Kasir' ? 'pos' : S.user.role === 'Gudang' ? 'gudang' : 'dashboard'));
  updateStatus(); updateBell(); $('#shiftPill').classList.toggle('hidden', !S.shift);
  if (mustChange) Auth.changePin(true);
  document.title = (S.cfg.namaApotek || 'APOTEK GAMA') + ' — Kasir & Inventaris';
}
function showLogin() {
  $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); $('#lgErr').classList.add('hidden');
  $('#lgCfg').classList.toggle('hidden', cfgOK()); $('#lgPass').value = ''; setTimeout(() => $('#lgUser').focus(), 50);
}
function setLoginErr(m) { const e = $('#lgErr'); e.textContent = m; e.classList.toggle('hidden', !m); }

const Auth = {
  async verifier(username, pin, user) { const ou = (await IDB.get('ou')) || {}, salt = uid('S'); ou[username.toLowerCase()] = { salt, h: await sha256(salt + ':' + pin), user }; await IDB.set('ou', ou); },
  retag(oldId, newId) { Q.forEach(o => { if (o.type === 'trx' && o.payload.shift_id === oldId) o.payload.shift_id = newId; if (o.type === 'shiftclose' && o.payload.id_shift === oldId) o.payload.id_shift = newId; }); S.trx.forEach(t => { if (t.shift_id === oldId) t.shift_id = newId; }); saveQ(); },
  async loginOnline(username, pin, shift, modal, silent) {
    const idShift = S.shift && S.shift._local && S.shift.username === username ? S.shift.id_shift : uid('SHF');
    const r = await call('auth.login', { username, pin, shift, modal, id_shift: idShift }, { noToken: true }), d = r.data;
    if (S.owner && S.owner !== d.user.username) resetData();
    S.owner = d.user.username; S.token = d.token; S.user = d.user;
    if (d.shift) { if (S.shift && S.shift._local && S.shift.id_shift !== d.shift.id_shift) Auth.retag(S.shift.id_shift, d.shift.id_shift); S.shift = d.shift; } else S.shift = null;
    REAUTH = null; await Auth.verifier(username, pin, d.user); saveAuth();
    if (!waiting().length) applySync(d.sync); else { S.vers = Object.assign({}, S.vers); commit(); }
    if (!silent) enterApp(d.mustChange); else { buildNav(); updateStatus(); }
    flush(); return d;
  },
  async loginOffline(username, pin, shift, modal) {
    const ou = (await IDB.get('ou')) || {}, v = ou[username.toLowerCase()];
    if (!v) throw { message: 'Perangkat sedang offline dan akun ini belum pernah masuk di perangkat ini. Sambungkan internet untuk masuk pertama kali.' };
    if ((await sha256(v.salt + ':' + pin)) !== v.h) throw { message: 'ID karyawan atau PIN salah.' };
    if (!S.products.length && !S.owner) throw { message: 'Belum ada data tersimpan di perangkat. Sambungkan internet untuk memuat data pertama kali.' };
    if (S.owner && S.owner !== v.user.username) throw { message: 'Data di perangkat ini milik pengguna lain. Sambungkan internet untuk berganti pengguna.' };
    S.user = v.user; S.token = ''; S.owner = v.user.username;
    if (R_JUAL.indexOf(v.user.role) >= 0 && !(S.shift && S.shift.username === username && S.shift.status !== 'TUTUP')) S.shift = { id_shift: uid('SHF'), username: v.user.username, nama: v.user.nama, shift, mulai: nowStr(), modal_awal: num(modal), status: 'BUKA', _local: true };
    REAUTH = { username, pin, shift, modal }; saveAuth(); enterApp(false);
    toast('Mode offline: transaksi disimpan di perangkat & dikirim otomatis saat internet kembali.', 'warn', 5000);
  },
  async submit(e) {
    e.preventDefault(); const u = $('#lgUser').value.trim(), p = $('#lgPass').value, sh = $('#lgShift').value, md = parseRp($('#lgCash').value), b = $('#lgBtn');
    setLoginErr(''); b.disabled = true; b.textContent = 'Memeriksa…';
    try { if (ONLINE && cfgOK()) { try { await Auth.loginOnline(u, p, sh, md); } catch (er) { if (er.offline) await Auth.loginOffline(u, p, sh, md); else throw er; } } else await Auth.loginOffline(u, p, sh, md); }
    catch (er) { setLoginErr(er.message || 'Gagal masuk'); }
    b.disabled = false; b.innerHTML = '🔓 MASUK &amp; BUKA SHIFT';
  },
  reloginModal() {
    if ($('#reloginPin')) return;
    const w = openModal(mhead('Sesi berakhir', 'Masuk ulang untuk menyinkronkan data') + '<div class="mb"><p class="muted">Data & transaksi Anda aman di perangkat. Masukkan PIN untuk akun <b>' + esc(S.user.username) + '</b>.</p><div class="fld"><label>PIN</label><input id="reloginPin" class="in" type="password" autofocus></div><div id="reloginErr" class="err hidden"></div></div><div class="mf"><button class="btn" id="reloginOut">Keluar</button><button class="btn pri" id="reloginOk">Masuk</button></div>', 'sm'); w.dataset.lock = '1';
    $('#reloginOut', w).onclick = () => { closeModal(w); Auth.logout(); };
    const go = async () => { try { await Auth.loginOnline(S.user.username, $('#reloginPin', w).value, S.shift && S.shift.shift, S.shift && S.shift.modal_awal, true); closeModal(w); toast('Tersambung kembali ✓'); } catch (er) { const x = $('#reloginErr', w); x.textContent = er.message; x.classList.remove('hidden'); } };
    $('#reloginOk', w).onclick = go; $('#reloginPin', w).onkeydown = e => { if (e.key === 'Enter') go(); };
  },
  changePin(force) {
    const w = openModal(mhead('Ganti PIN', force ? 'Wajib untuk keamanan akun Anda' : '') + '<div class="mb"><div class="fld"><label>PIN lama</label><input id="pnOld" class="in" type="password" autofocus></div><div class="fld"><label>PIN baru (min. 6 karakter)</label><input id="pnNew" class="in" type="password"></div><div class="fld"><label>Ulangi PIN baru</label><input id="pnNew2" class="in" type="password"></div><div id="pnErr" class="err hidden"></div></div><div class="mf">' + (force ? '' : '<button class="btn" data-act="close">Batal</button>') + '<button class="btn pri" id="pnOk">Simpan PIN</button></div>', 'sm'); if (force) w.dataset.lock = '1';
    $('#pnOk', w).onclick = async () => {
      const a = $('#pnOld', w).value, b = $('#pnNew', w).value, c = $('#pnNew2', w).value, er = $('#pnErr', w); er.classList.add('hidden');
      if (b.length < 6) { er.textContent = 'PIN baru minimal 6 karakter.'; er.classList.remove('hidden'); return; } if (b !== c) { er.textContent = 'Konfirmasi PIN tidak sama.'; er.classList.remove('hidden'); return; }
      try { const r = await call('pin.ganti', { lama: a, baru: b }); S.token = r.data.token; saveAuth(); await Auth.verifier(S.user.username, b, S.user); closeModal(w); toast('PIN berhasil diganti ✓'); } catch (x) { er.textContent = x.message; er.classList.remove('hidden'); }
    };
  },
  darurat() {
    const w = openModal(mhead('Akses darurat', 'Untuk pemilik sistem bila akun Admin tidak bisa masuk') + '<div class="mb"><p class="muted xs">Kredensial ini dibuat saat setup (lihat Log eksekusi Apps Script). Butuh internet.</p><div class="fld"><label>Nama pengguna</label><input id="dzU" class="in" autocapitalize="off" autofocus></div><div class="fld"><label>Kata sandi</label><input id="dzP" class="in" type="password"></div><div id="dzErr" class="err hidden"></div></div><div class="mf"><button class="btn" data-act="close">Batal</button><button class="btn pri" id="dzOk">Masuk</button></div>', 'sm');
    $('#dzOk', w).onclick = async () => { try { const r = await call('auth.darurat', { username: $('#dzU', w).value, password: $('#dzP', w).value }, { noToken: true }); const d = r.data; if (S.owner && S.owner !== 'darurat') resetData(); S.owner = 'darurat'; S.token = d.token; S.user = d.user; S.shift = null; saveAuth(); applySync(d.sync); closeModal(w); enterApp(false); } catch (x) { const e = $('#dzErr', w); e.textContent = x.message; e.classList.remove('hidden'); } };
  },
  closeShift() {
    const sh = S.shift, jual = R_JUAL.indexOf(S.user.role) >= 0 && sh;
    let kas = 0, trxN = 0; if (jual) { const list = S.trx.filter(t => t.shift_id === sh.id_shift && t.status !== 'VOID'); trxN = list.length; kas = num(sh.modal_awal) + list.filter(t => t.metode_bayar === 'Tunai').reduce((a, t) => a + num(t.total_belanja), 0); }
    const w = openModal(mhead(jual ? 'Tutup shift & keluar' : 'Keluar') + '<div class="mb">' + (jual ? '<div class="kv"><span>Modal awal</span><b>' + rp(sh.modal_awal) + '</b></div><div class="kv"><span>Transaksi shift ini</span><b>' + trxN + '</b></div><div class="kv"><span>Kas seharusnya (modal + tunai)</span><b>' + rp(kas) + '</b></div><div class="fld"><label>Uang fisik di laci (Rp)</label><input id="csFis" class="in m" inputmode="numeric" value="' + fmt(kas) + '" autofocus></div><div class="kv"><span>Selisih</span><b id="csSel">Rp 0</b></div>' + ((Q.length) ? '<p class="warn-t xs">⚠ Masih ada ' + Q.length + ' operasi belum tersinkron. Data aman di perangkat dan dikirim saat online.</p>' : '') : '<p>Keluar dari akun ini?</p>') + '</div><div class="mf"><button class="btn" data-act="close">Batal</button>' + (jual ? '<button class="btn" id="csOut">Keluar saja</button><button class="btn pri" id="csOk">Tutup shift</button>' : '<button class="btn pri" id="csOut">Keluar</button>') + '</div>', 'sm');
    if (jual) { const sel = () => { const d = parseRp($('#csFis', w).value) - kas; $('#csSel', w).textContent = rp(d); $('#csSel', w).style.color = d === 0 ? 'var(--grn-x)' : 'var(--red-x)'; }; $('#csFis', w).oninput = sel; sel();
      $('#csOk', w).onclick = () => { const fis = parseRp($('#csFis', w).value); enqueue('shiftclose', { id_shift: sh.id_shift, kas_fisik: fis }, 'Tutup shift ' + sh.shift); S.shifts.push(Object.assign({}, sh, { kas_seharusnya: kas, kas_fisik: fis, selisih: fis - kas, selesai: nowStr(), status: 'TUTUP' })); S.shift = null; closeModal(w); Auth.logout(); }; }
    $('#csOut', w).onclick = () => { closeModal(w); Auth.logout(); };
  },
  async logout() { S.token = ''; S.user = null; S.shift = S.shift; REAUTH = null; await IDB.del('auth'); saveSnap(); Object.keys(BUILT).forEach(k => { delete BUILT[k]; $('#pg-' + k).innerHTML = ''; }); history.replaceState(null, '', location.pathname); showLogin(); }
};
ACT.logout = () => Auth.closeShift();

// ── Notifikasi stok & hutang ──
function computeAlerts() {
  const a = { expired: [], near: [], low: [], out: [], tempo: [] };
  S.products.forEach(p => {
    batchesOf(p.id_produk).forEach(b => { if (b.status === 'RETUR' || num(b.qty_etalase) + num(b.qty_gudang) <= 0 || String(b.tgl_exp).startsWith('9999')) return; const d = edDays(b.tgl_exp); if (d < 0) a.expired.push({ p, b, d }); else if (d <= (num(p.ed_alert_hari) || num(S.cfg.ed_alert_hari) || 90)) a.near.push({ p, b, d }); });
    const lv = stockLevel(p); if (lv === 'out') a.out.push(p); else if (lv === 'low') a.low.push(p);
  });
  S.purchases.forEach(f => { if (f.status === 'BELUM LUNAS' && f.jatuh_tempo && edDays(f.jatuh_tempo) <= 3) a.tempo.push(f); });
  a.near.sort((x, y) => x.d - y.d); return a;
}
function updateBell() { if (!S.user) return; const a = computeAlerts(), n = a.expired.length + a.near.length + a.low.length + a.out.length + (isRole(...R_STOK) ? a.tempo.length : 0), b = $('#bellN'); if (b) { b.textContent = n > 99 ? '99+' : n; b.classList.toggle('hidden', !n); } }
function bellPanel() {
  const a = computeAlerts(), sec = (t, c, rows) => rows.length ? '<h4 class="sech">' + t + ' <span class="badge ' + c + '">' + rows.length + '</span></h4>' + rows.slice(0, 12).join('') + (rows.length > 12 ? '<div class="muted xs">+' + (rows.length - 12) + ' lainnya</div>' : '') : '';
  const li = (l, r) => '<div class="al"><span>' + l + '</span><span class="muted xs">' + r + '</span></div>';
  const html = sec('Kedaluwarsa (masih ada stok)', 'red', a.expired.map(x => li(esc(x.p.nama_produk) + ' · ' + esc(x.b.no_batch), fmtDate(x.b.tgl_exp)))) + sec('Segera kedaluwarsa', 'amb', a.near.map(x => li(esc(x.p.nama_produk) + ' · ' + esc(x.b.no_batch), x.d + ' hari'))) + sec('Stok habis', 'red', a.out.map(p => li(esc(p.nama_produk), ''))) + sec('Stok menipis', 'amb', a.low.map(p => li(esc(p.nama_produk), 'E ' + qf(p.stok_etalase) + ' · G ' + qf(p.stok_gudang)))) + (isRole(...R_STOK) ? sec('Hutang jatuh tempo', 'amb', a.tempo.map(f => li(esc(f.supplier) + ' · ' + esc(f.no_faktur), fmtDate(f.jatuh_tempo)))) : '');
  openModal(mhead('Notifikasi') + '<div class="mb">' + (html || '<p class="muted c">Semua aman ✓</p>') + '</div><div class="mf"><button class="btn" data-act="close">Tutup</button></div>');
}
ACT.bell = bellPanel;
ACT.theme = () => { const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('gama_theme', n); } catch (e) {} $('#btnTheme').textContent = n === 'dark' ? '☀️' : '🌙'; };
ACT.burger = () => { $('#side').classList.toggle('open'); $('#scrim').classList.toggle('on'); };
ACT.pin = () => Auth.changePin(false);

// ── Boot ──
async function boot() {
  $('#btnTheme').textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  $('#loginForm').addEventListener('submit', Auth.submit);
  $('#lgEye').onclick = () => { const i = $('#lgPass'); i.type = i.type === 'password' ? 'text' : 'password'; };
  $('#lgCash').addEventListener('input', e => { e.target.value = fmt(parseRp(e.target.value)); });
  $('#lgDarurat').onclick = e => { e.preventDefault(); Auth.darurat(); };
  await IDB.open();
  const [auth, snap, q] = await Promise.all([IDB.get('auth'), IDB.get('snap'), IDB.get('queue')]);
  Q = Array.isArray(q) ? q : []; if (snap) DATA_KEYS.forEach(k => { if (snap[k] !== undefined) S[k] = snap[k]; });
  S.cfg = Object.assign({}, CFG0, S.cfg); reindex();
  if (auth && auth.user && snap) { S.token = auth.token || ''; S.user = auth.user; S.shift = auth.shift || null; enterApp(false); if (S.token) { flush(); sync(); } else if (ONLINE) toast('Masuk ulang untuk menyinkronkan data.', 'warn'); } else showLogin();
  $('#boot').classList.add('gone'); setTimeout(() => $('#boot').remove(), 400);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').then(reg => { reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Versi baru tersedia — muat ulang halaman untuk memperbarui.', 'warn', 8000); }); }); }).catch(() => {});
}
