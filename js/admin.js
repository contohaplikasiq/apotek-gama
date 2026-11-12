'use strict';
/* APOTEK GAMA · admin.js — Pengaturan, Pengguna, Akun & Perangkat, Tentang · © Arraihan Academy */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__bip = e; const b = $('#stInstall'); if (b) b.classList.remove('hidden'); });
const Adm = {
  t: 'akun',
  build(el) {
    const adm = isRole(...R_ADM); this.t = adm ? 'apotek' : 'akun';
    el.innerHTML = '<div class="tabs">' + (adm ? '<button data-act="sttab" data-t="apotek" class="on">Apotek</button><button data-act="sttab" data-t="user">Pengguna</button>' : '') + '<button data-act="sttab" data-t="akun" class="' + (adm ? '' : 'on') + '">Akun & Perangkat</button><button data-act="sttab" data-t="tentang">Tentang</button></div><div class="card"><div id="stBody" class="cb"></div></div>';
  },
  setTab(t) { this.t = t; $$('#pg-pengaturan .tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); this.refresh(true); },
  refresh(force) {
    const el = $('#stBody'); if (!el) return; if (!force && document.activeElement && el.contains(document.activeElement) && document.activeElement.tagName !== 'BODY') return;
    el[{ apotek: 'innerHTML', user: 'innerHTML', akun: 'innerHTML', tentang: 'innerHTML' }[this.t]] = this[this.t]();
  },
  apotek() {
    const c = S.cfg;
    return '<div class="grid2">' + fld('c_namaApotek', 'Nama apotek', c.namaApotek, { cls: 'full' }) + fld('c_alamat', 'Alamat', c.alamat, { cls: 'full' }) + fld('c_telp', 'Telepon', c.telp) + fld('c_wa', 'WhatsApp', c.wa) + fld('c_no_sia', 'No. SIA', c.no_sia) + fld('c_sia_berakhir', 'SIA berlaku s/d', c.sia_berakhir, { type: 'date' }) + fld('c_nama_apa', 'Apoteker Penanggung Jawab', c.nama_apa) + fld('c_no_sipa', 'No. SIPA', c.no_sipa) + fld('c_no_stra', 'No. STRA', c.no_stra) + fld('c_kertas', 'Lebar kertas struk', c.kertas, { sel: ['80', '58'] }) + fld('c_tarif_tuslah', 'Tarif tuslah / resep (Rp)', c.tarif_tuslah, { type: 'number', min: 0 }) + fld('c_tarif_embalase', 'Tarif embalase / item (Rp)', c.tarif_embalase, { type: 'number', min: 0 }) + fld('c_ppn_persen', 'PPN faktur default (%)', c.ppn_persen, { type: 'number', min: 0, step: 'any' }) + fld('c_ed_alert_hari', 'Peringatan ED default (hari)', c.ed_alert_hari, { type: 'number', min: 1 }) + fld('c_footer', 'Teks kaki struk', c.footer, { cls: 'full' }) + '</div><div class="row-g"><button class="btn pri" data-act="stsave">Simpan pengaturan</button></div><div id="stMsg"></div>';
  },
  user() {
    return '<div class="row-g"><span class="grow muted xs">Peran: Admin (semua), Apoteker (kasir, inventori, laporan, void), Kasir (kasir & riwayat), Gudang (inventori, mutasi, faktur).</span><button class="btn pri" data-act="usnew">＋ Pengguna</button></div><div class="tw"><table class="tbl"><thead><tr><th>ID karyawan</th><th>Nama</th><th>Peran</th><th>SIPA</th><th>Status</th><th></th></tr></thead><tbody>' + (S.users.map(u => '<tr><td class="m">' + esc(u.username) + '</td><td>' + esc(u.nama) + '</td><td>' + esc(u.role) + '</td><td>' + esc(u.no_sipa || '') + '</td><td><span class="badge ' + (u.aktif ? 'grn' : 'gry') + '">' + (u.aktif ? 'Aktif' : 'Nonaktif') + '</span></td><td class="r"><button class="btn sm" data-act="usedit" data-id="' + esc(u.id_user) + '">Ubah / reset PIN</button></td></tr>').join('') || '<tr><td colspan="6" class="empty">Memuat…</td></tr>') + '</tbody></table></div>';
  },
  akun() {
    const w = Q.filter(o => o.st === 'WAIT').length, e = Q.filter(o => o.st === 'ERR').length;
    return '<div class="kv"><span>Masuk sebagai</span><b>' + esc(S.user.nama) + ' (' + esc(S.user.username) + ' · ' + esc(S.user.role) + ')</b></div><div class="kv"><span>Koneksi</span><b>' + (ONLINE ? 'Online' : 'Offline') + '</b></div><div class="kv"><span>Antrean sinkron</span><b>' + w + ' menunggu · ' + e + ' perlu tinjau</b></div><div class="kv"><span>Sinkron terakhir</span><b>' + esc(S.lastSync ? fmtDT(S.lastSync) : '—') + '</b></div><div class="row-g"><button class="btn" data-act="pin">🔑 Ganti PIN</button><button class="btn" data-act="queue">📤 Lihat antrean</button><button class="btn" data-act="stresync">🔄 Sinkron ulang penuh</button><button class="btn hidden" id="stInstall" data-act="stinstall">📲 Pasang aplikasi</button><button class="btn dng" data-act="stwipe">🧹 Hapus data di perangkat</button></div><p class="muted xs">Data tersimpan di perangkat ini (IndexedDB) agar aplikasi tetap berjalan tanpa internet. “Hapus data di perangkat” hanya boleh bila antrean kosong; data di server tidak terpengaruh.</p>';
  },
  tentang() {
    return '<div class="about"><div class="logo big">💊</div><h2>' + esc(GAMA_CONFIG.APP) + '</h2><div class="muted">Kasir · Inventori · Gudang · FEFO · PBF — versi ' + esc(GAMA_CONFIG.VERSI) + '</div><p>Aplikasi POS & inventori apotek berbasis Google Apps Script + Google Sheets/Drive, dengan mode offline penuh (PWA).</p><div class="kv"><span>Hak cipta & lisensi</span><b>© ' + new Date().getFullYear() + ' ' + esc(GAMA_CONFIG.LISENSI) + '</b></div><p class="muted xs">Seluruh hak cipta aplikasi ini dimiliki ' + esc(GAMA_CONFIG.LISENSI) + '. Dilarang memperjualbelikan atau menghapus keterangan hak cipta tanpa izin tertulis.</p></div>';
  }
};
ACT.sttab = el => Adm.setTab(el.dataset.t);
ACT.stsave = async () => {
  const o = {}; ['namaApotek', 'alamat', 'telp', 'wa', 'no_sia', 'sia_berakhir', 'nama_apa', 'no_sipa', 'no_stra', 'kertas', 'tarif_tuslah', 'tarif_embalase', 'ppn_persen', 'ed_alert_hari', 'footer'].forEach(k => o[k] = $('#c_' + k).value);
  try { await call('config.save', o); Object.assign(S.cfg, o, { tarif_tuslah: num(o.tarif_tuslah), tarif_embalase: num(o.tarif_embalase), ppn_persen: num(o.ppn_persen), ed_alert_hari: num(o.ed_alert_hari) }); commit(); sync(); toast('Pengaturan tersimpan ✓'); } catch (e) { toast(e.offline ? 'Perlu internet untuk menyimpan pengaturan.' : e.message, 'err'); }
};
const userForm = u => {
  u = u || {}; const w = openModal(mhead(u.id_user ? 'Ubah pengguna' : 'Pengguna baru') + '<div class="mb">' + fld('uU', 'ID karyawan (untuk login)', u.username, { req: 1, auto: 1, hint: 'Huruf/angka/titik/strip, 3–30 karakter' }) + fld('uN', 'Nama lengkap', u.nama, { req: 1 }) + fld('uR', 'Peran', u.role || 'Kasir', { sel: ['Admin', 'Apoteker', 'Kasir', 'Gudang'] }) + fld('uS', 'No. SIPA (apoteker)', u.no_sipa) + fld('uP', u.id_user ? 'PIN baru (kosongkan bila tidak diubah)' : 'PIN awal (min. 6 karakter)', '', { type: 'password' }) + '<label class="chk"><input type="checkbox" id="uA" ' + (u.aktif !== false ? 'checked' : '') + '> Akun aktif</label><div id="uE" class="err hidden"></div></div><div class="mf"><button class="btn" data-act="close">Batal</button><button class="btn pri" id="uOk">Simpan</button></div>', 'sm');
  $('#uOk', w).onclick = async () => { try { await call('user.save', { id_user: u.id_user, username: $('#uU', w).value, nama: $('#uN', w).value, role: $('#uR', w).value, no_sipa: $('#uS', w).value, password: $('#uP', w).value, aktif: $('#uA', w).checked }); closeModal(w); toast('Pengguna tersimpan ✓'); await sync(); Adm.refresh(true); } catch (e) { const x = $('#uE', w); x.textContent = e.offline ? 'Perlu internet.' : e.message; x.classList.remove('hidden'); } };
};
ACT.usnew = () => userForm(); ACT.usedit = el => userForm(S.users.find(x => x.id_user === el.dataset.id));
ACT.stresync = () => { toast('Menyinkronkan penuh…', 'ok', 1500); flush().then(() => sync(true)); };
ACT.stinstall = async () => { if (window.__bip) { window.__bip.prompt(); window.__bip = null; } };
ACT.stwipe = () => { if (Q.length) return toast('Masih ada antrean sinkron. Selesaikan atau buang dahulu.', 'warn', 4500); confirmBox('Hapus data di perangkat?', 'Data lokal dihapus dan Anda keluar. Data di server aman. Untuk memakai lagi (terutama offline) perlu masuk online dahulu.', 'Hapus', async () => { await IDB.del('snap'); await IDB.del('auth'); resetData(); S.owner = ''; location.reload(); }, true); };
PAGES.push({ id: 'pengaturan', ttl: 'Pengaturan', sub: 'Apotek, pengguna, perangkat', ico: '⚙️', roles: ['Admin', 'Apoteker', 'Kasir', 'Gudang'], build: el => Adm.build(el), refresh: () => Adm.refresh() });
