'use strict';
/* APOTEK GAMA · data.js — Import (komputer & aplikasi lama), Backup & Pemulihan · © Arraihan Academy */
const nk = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const AL = {
  obat: { kode_sku: ['kodesku', 'kode', 'sku', 'barcode', 'kodebarcode', 'kodeobat', 'kodebarang'], nama_produk: ['namaproduk', 'namaobat', 'nama', 'namabarang', 'produk'], zat_aktif: ['zataktif', 'komposisi', 'generik'], produsen: ['produsen', 'pabrik', 'manufaktur'], no_nie: ['nonie', 'nie', 'noizinedar'], kategori: ['kategori'], golongan: ['golongan', 'jenis'], bentuk: ['bentuk', 'sediaan', 'bentuksediaan'], satuan_besar: ['satuanbesar', 'kemasan'], satuan_kecil: ['satuankecil', 'satuan', 'satuanjual'], isi_konversi: ['isikonversi', 'isi', 'isibesar', 'isikemasan'], satuan_terkecil: ['satuanterkecil'], isi_terkecil: ['isiterkecil'], harga_beli: ['hargabeli', 'hpp', 'hargamodal', 'modal'], harga_jual: ['hargajual', 'harga', 'hargaeceran'], harga_jual_besar: ['hargajualbesar', 'hargabesar'], harga_jual_terkecil: ['hargajualterkecil'], saldo_etalase: ['saldoetalase', 'stoketalase', 'stok'], saldo_gudang: ['saldogudang', 'stokgudang'], no_batch: ['nobatch', 'batch', 'nomorbatch'], tgl_exp: ['tglexp', 'ed', 'expired', 'expireddate', 'kadaluarsa', 'kedaluwarsa', 'tanggalexpired'], stok_min_etalase: ['stokminetalase', 'minetalase', 'minimum'], stok_min_gudang: ['stokmingudang', 'mingudang'], ed_alert_hari: ['edalerthari'], lokasi_etalase: ['lokasietalase', 'rak', 'raketalase'], lokasi_gudang: ['lokasigudang', 'rakgudang'], wajib_resep: ['wajibresep', 'resep'], bisa_racik: ['bisaracik'], signa: ['signa', 'aturanpakai'], kontraindikasi: ['kontraindikasi'], suhu: ['suhu'], supplier: ['supplier', 'pbf'] },
  sup: { nama: ['nama', 'namapbf', 'supplier', 'namasupplier'], no_izin: ['noizin', 'izin', 'noizinpbf'], telp: ['telp', 'telepon', 'hp', 'nohp'], alamat: ['alamat'] }
};
const NUMF = ['isi_konversi', 'isi_terkecil', 'harga_beli', 'harga_jual', 'harga_jual_besar', 'harga_jual_terkecil', 'saldo_etalase', 'saldo_gudang', 'stok_min_etalase', 'stok_min_gudang', 'ed_alert_hari'];
function toNum(v) {
  if (typeof v === 'number') return v; let s = String(v == null ? '' : v).replace(/rp/ig, '').replace(/\s/g, ''); if (!s) return 0;
  if (s.indexOf('.') >= 0 && s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else if (s.indexOf(',') >= 0) s = s.replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s); return isFinite(n) ? n : 0;
}
let _xlsxP = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve();
  if (_xlsxP) return _xlsxP;
  _xlsxP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => { _xlsxP = null; rej(new Error('Pustaka Excel belum termuat (butuh internet sekali; setelah itu tersimpan untuk offline). Atau simpan berkas sebagai CSV.')); }; document.head.appendChild(s); });
  return _xlsxP;
}
const TPL = {
  obat: [['kode_sku', 'nama_produk', 'zat_aktif', 'produsen', 'kategori', 'golongan', 'bentuk', 'satuan_besar', 'satuan_kecil', 'isi_konversi', 'harga_beli', 'harga_jual', 'saldo_etalase', 'saldo_gudang', 'no_batch', 'tgl_exp', 'stok_min_etalase', 'stok_min_gudang', 'lokasi_etalase', 'lokasi_gudang', 'signa'], ['8991002341', 'Paracetamol 500mg Tablet', 'Paracetamol', 'Sanbe Farma', 'Obat', 'Bebas', 'Tablet', 'Box', 'Strip', '10', '3200', '4500', '20', '100', 'PCT2601', '2028-06-30', '10', '5', 'A1', 'G-01', '3 x 1 sesudah makan']],
  sup: [['nama', 'no_izin', 'telp', 'alamat'], ['PBF Contoh Sejahtera', 'PBF-123/2024', '021-555123', 'Jl. Contoh No. 1']]
};
const Imp = {
  type: 'obat', rows: [], file: '', unk: [], busy: false,
  build(el) {
    const adm = isRole(...R_ADM);
    el.innerHTML = '<div class="card"><div class="ch">📥 Import dari komputer (Excel / CSV)</div><div class="cb"><div class="seg" id="imT"><button data-act="imtype" data-t="obat" class="on">Data obat + stok awal</button><button data-act="imtype" data-t="sup" data-t2="sup">Supplier / PBF</button></div><p class="muted xs">Kolom dikenali otomatis (nama kolom fleksibel). Kolom <b>tgl_exp</b> berformat YYYY-MM-DD atau DD/MM/YYYY. Kode/barcode dipakai sebagai kunci — import ulang <b>tidak membuat data ganda</b>. Batch yang sama tidak ditambah dua kali.</p><div class="row-g"><button class="btn" data-act="imtpl">⬇ Unduh template CSV</button><label class="btn pri">📂 Pilih berkas<input type="file" id="imFile" accept=".xlsx,.xls,.csv,.txt,.tsv" hidden></label><span id="imName" class="muted xs"></span></div><div id="imPrev"></div><div id="imRes"></div></div></div>' +
      (adm ? '<div class="card"><div class="ch">🔄 Import dari aplikasi lama (Apotek Kita)</div><div class="cb"><p class="muted xs">Tempel link / ID spreadsheet <b>DB_ApotekKita</b>. Bagikan spreadsheet itu (Pelihat) ke akun Google pemilik APOTEK GAMA. Obat, batch, transaksi, supplier, faktur, shift, dan pengguna dipindahkan dengan ID aslinya. Aman diulang: hanya data baru yang ditambah.</p><div class="fld"><input id="lgSrc" class="in" placeholder="https://docs.google.com/spreadsheets/d/…"></div><label class="chk"><input type="checkbox" id="lgUpd"> Perbarui juga data yang sudah ada (timpa dengan nilai dari aplikasi lama)</label><div class="row-g"><button class="btn" data-act="lgrun" data-dry="1">🔍 Simulasi (tanpa menyimpan)</button><button class="btn pri" data-act="lgrun" data-dry="0">Import sekarang</button></div><div id="lgRes"></div></div></div><div class="card"><div class="ch">💾 Backup & pemulihan</div><div class="cb" id="bkBox"><div class="muted">Memuat status backup…</div></div></div>' : '');
    $('#imFile').onchange = e => { if (e.target.files[0]) Imp.load(e.target.files[0]); e.target.value = ''; };
  },
  refresh() { if (isRole(...R_ADM) && !this._bk) { this._bk = 1; this.backupInfo(); } },
  setType(t) { this.type = t; this.rows = []; $$('#imT button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $('#imPrev').innerHTML = ''; $('#imRes').innerHTML = ''; $('#imName').textContent = ''; },
  async load(file) {
    $('#imRes').innerHTML = ''; $('#imName').textContent = 'Membaca ' + file.name + '…';
    try {
      const ext = file.name.split('.').pop().toLowerCase(); let aoa;
      if (['csv', 'txt', 'tsv'].indexOf(ext) >= 0) aoa = parseCSV(await file.text());
      else { await loadXLSX(); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }); }
      if (aoa.length < 2) throw new Error('Berkas kosong atau hanya berisi judul kolom.');
      const al = AL[this.type], map = {}, unk = [];
      aoa[0].forEach((h, j) => { const k = nk(h); if (!k) return; const f = Object.keys(al).find(f => f === h || al[f].indexOf(k) >= 0 || nk(f) === k); if (f && map[f] === undefined) map[f] = j; else unk.push(String(h)); });
      const need = this.type === 'obat' ? ['kode_sku', 'nama_produk', 'satuan_kecil', 'harga_jual'] : ['nama'], miss = need.filter(f => map[f] === undefined);
      if (miss.length) throw new Error('Kolom wajib tidak ditemukan: ' + miss.join(', ') + '. Unduh template untuk melihat format.');
      this.rows = aoa.slice(1).map((r, i) => { const o = { _baris: i + 2 }; Object.keys(map).forEach(f => { let v = r[map[f]]; if (f === 'tgl_exp') v = normDate(v); else if (NUMF.indexOf(f) >= 0) v = toNum(v); else if (v instanceof Date) v = normDate(v); else v = String(v == null ? '' : v).trim(); o[f] = v; }); return o; }).filter(o => this.type === 'obat' ? (o.kode_sku || o.nama_produk) : o.nama);
      this.unk = unk; this.file = file.name; $('#imName').textContent = file.name + ' · ' + this.rows.length + ' baris'; this.preview();
    } catch (e) { $('#imName').textContent = ''; $('#imPrev').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; this.rows = []; }
  },
  preview() {
    const cols = this.type === 'obat' ? ['kode_sku', 'nama_produk', 'satuan_kecil', 'harga_jual', 'saldo_etalase', 'saldo_gudang', 'no_batch', 'tgl_exp'] : ['nama', 'no_izin', 'telp', 'alamat'];
    $('#imPrev').innerHTML = '<div class="tw"><table class="tbl"><thead><tr><th>Baris</th>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + this.rows.slice(0, 8).map(r => '<tr><td>' + r._baris + '</td>' + cols.map(c => '<td>' + esc(r[c] == null ? '' : r[c]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (this.rows.length > 8 ? '<div class="muted xs">… dan ' + (this.rows.length - 8) + ' baris lainnya</div>' : '') + (this.unk.length ? '<div class="muted xs">Kolom diabaikan: ' + esc(this.unk.join(', ')) + '</div>' : '') + '<div class="row-g"><button class="btn" data-act="imrun" data-dry="1">🔍 Periksa dulu (simulasi)</button><button class="btn pri" data-act="imrun" data-dry="0">Impor ' + this.rows.length + ' baris</button></div>';
  },
  async run(dry) {
    if (this.busy || !this.rows.length) return; if (!ONLINE) return toast('Import membutuhkan koneksi internet.', 'warn');
    this.busy = true; const act = this.type === 'obat' ? 'import.products' : 'import.suppliers', tot = { baru: 0, diperbarui: 0, dilewati: 0, batch: 0, errors: [] }, res = $('#imRes'); let seen = {};
    try {
      for (let i = 0; i < this.rows.length; i += 300) {
        res.innerHTML = '<div class="muted">' + (dry ? 'Memeriksa' : 'Mengimpor') + '… ' + Math.min(i + 300, this.rows.length) + ' / ' + this.rows.length + '</div><div class="prog"><i style="width:' + Math.round(Math.min(i + 300, this.rows.length) / this.rows.length * 100) + '%"></i></div>';
        const r = (await call(act, { rows: this.rows.slice(i, i + 300), dry, perbarui: true, seenSku: seen }, { timeout: 120000 })).data; seen = r.seenSku || seen;
        ['baru', 'diperbarui', 'dilewati', 'batch'].forEach(k => tot[k] += r[k] || 0); tot.errors.push(...r.errors);
      }
      res.innerHTML = '<div class="' + (tot.errors.length ? 'warnbox' : 'okbox') + '"><b>' + (dry ? 'Hasil simulasi (belum disimpan)' : 'Import selesai ✓') + '</b><div class="kvs"><div class="kv"><span>Baru</span><b>' + tot.baru + '</b></div><div class="kv"><span>Diperbarui</span><b>' + tot.diperbarui + '</b></div>' + (this.type === 'obat' ? '<div class="kv"><span>Batch stok awal</span><b>' + tot.batch + '</b></div>' : '') + '<div class="kv"><span>Dilewati / error</span><b>' + tot.dilewati + '</b></div></div>' + (tot.errors.length ? '<details open><summary>' + tot.errors.length + ' baris bermasalah</summary><div class="tw" style="max-height:220px"><table class="tbl"><tbody>' + tot.errors.slice(0, 200).map(e => '<tr><td>Baris ' + e.baris + '</td><td>' + esc(e.pesan) + '</td></tr>').join('') + '</tbody></table></div><button class="btn sm" data-act="imerr">⬇ Unduh daftar error</button></details>' : '') + '</div>'; Imp.errs = tot.errors;
      if (!dry) { await sync(true); toast('Import selesai — data diperbarui ✓'); }
    } catch (e) { res.innerHTML = '<div class="err">' + esc(e.offline ? 'Koneksi terputus saat import. Data yang sudah terkirim tetap aman; ulangi import (tidak akan ganda).' : e.message) + '</div>'; }
    this.busy = false;
  },
  async legacy(dry) {
    const src = $('#lgSrc').value.trim(), res = $('#lgRes'); if (!src) return toast('Tempel link spreadsheet lama dahulu', 'warn'); if (!ONLINE) return toast('Butuh internet', 'warn');
    if (!dry && !confirm('Import data dari aplikasi lama sekarang? (Disarankan menjalankan Simulasi dahulu.)')) return;
    res.innerHTML = '<div class="muted">Memproses di server… (bisa beberapa menit untuk data besar)</div><div class="prog"><i class="ind"></i></div>';
    try {
      const d = (await call('import.legacy', { sumber: src, dry, perbarui: $('#lgUpd').checked }, { timeout: 330000 })).data, nm = { Suppliers: 'Supplier', Products: 'Obat', Batches: 'Batch', Purchases: 'Faktur PBF', Shifts: 'Shift', Transactions: 'Transaksi', StockLogs: 'Log stok', AppConfig: 'Pengaturan', Users: 'Pengguna' };
      res.innerHTML = '<div class="okbox"><b>' + (dry ? 'Simulasi selesai — belum ada data disimpan' : 'Import selesai ✓') + '</b><div class="tw"><table class="tbl"><thead><tr><th>Data</th><th class="r">Di aplikasi lama</th><th class="r">Baru</th><th class="r">Diperbarui</th><th class="r">Dilewati</th></tr></thead><tbody>' + Object.keys(d.ringkasan).map(k => '<tr><td>' + nm[k] + '</td><td class="r">' + d.ringkasan[k].sumber + '</td><td class="r b">' + d.ringkasan[k].baru + '</td><td class="r">' + d.ringkasan[k].diperbarui + '</td><td class="r">' + d.ringkasan[k].lewat + '</td></tr>').join('') + '</tbody></table></div>' + (d.pinBaru.length ? '<div class="warnbox"><b>PIN awal pengguna baru (catat sekarang — tidak ditampilkan lagi):</b>' + d.pinBaru.map(x => '<div class="kv"><span>' + esc(x.username) + '</span><b class="m">' + esc(x.pin) + '</b></div>').join('') + '<div class="xs">PIN lama tidak bisa dibawa (format hash berbeda). Pengguna wajib menggantinya saat masuk pertama.</div></div>' : '') + '</div>';
      if (!dry) { await sync(true); toast('Import dari aplikasi lama selesai ✓'); }
    } catch (e) { res.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  },
  async backupInfo() {
    const b = $('#bkBox'); if (!b) return; if (!ONLINE) { b.innerHTML = '<div class="muted">Status backup tersedia saat online.</div>'; this._bk = 0; return; }
    try {
      const d = (await call('backup.info')).data;
      b.innerHTML = '<p class="muted xs">Semua data aplikasi ada di <b>satu folder Drive</b> (database, backup, import, ekspor). Backup otomatis tiap malam pukul 02.00 — 1 salinan terbaru.</p><div class="kv"><span>Backup terakhir</span><b>' + (d.ada ? esc(fmtDT(d.waktu)) : 'Belum ada') + '</b></div><div class="row-g"><button class="btn pri" data-act="bknow">💾 Backup sekarang</button><button class="btn" data-act="bkxlsx">📗 Ekspor Excel ke Drive</button><a class="btn" href="' + esc(d.folderUrl) + '" target="_blank" rel="noopener">📁 Buka folder Drive</a></div><div class="row-g"><button class="btn" data-act="prcsv">⬇ Unduh data obat (CSV)</button><button class="btn" data-act="bktrx">⬇ Unduh transaksi (CSV)</button><button class="btn dng" data-act="bkrestore" ' + (d.ada ? '' : 'disabled') + '>♻ Pulihkan dari backup</button></div><div id="bkRes"></div>';
    } catch (e) { b.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; this._bk = 0; }
  }
};
ACT.imtype = el => Imp.setType(el.dataset.t);
ACT.imtpl = () => download('template_' + (Imp.type === 'obat' ? 'obat' : 'supplier') + '.csv', toCSV(TPL[Imp.type]), 'text/csv;charset=utf-8');
ACT.imrun = el => Imp.run(el.dataset.dry === '1');
ACT.imerr = () => download('error_import.csv', toCSV([['baris', 'pesan']].concat(Imp.errs.map(e => [e.baris, e.pesan]))), 'text/csv;charset=utf-8');
ACT.lgrun = el => Imp.legacy(el.dataset.dry === '1');
ACT.bknow = async () => { try { toast('Membuat backup…', 'ok', 1500); const d = (await call('backup.now', {}, { timeout: 120000 })).data; toast('Backup selesai ✓'); Imp._bk = 0; Imp.backupInfo(); } catch (e) { toast(e.message, 'err'); } };
ACT.bkxlsx = async () => { try { toast('Membuat ekspor Excel…', 'ok', 2000); const d = (await call('backup.xlsx', {}, { timeout: 180000 })).data; $('#bkRes').innerHTML = '<div class="okbox">Tersimpan: <a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.nama) + '</a> (folder Exports)</div>'; } catch (e) { toast(e.message, 'err'); } };
ACT.bktrx = () => download('transaksi_' + ymd() + '.csv', toCSV([['waktu', 'no_transaksi', 'kasir', 'pasien', 'dokter', 'subtotal', 'biaya_resep', 'diskon', 'total', 'metode', 'status']].concat(S.trx.map(t => [t.tanggal_waktu, t.id_transaksi, t.kasir, t.nama_pasien, t.nama_dokter, t.subtotal_obat, t.biaya_resep, t.diskon, t.total_belanja, t.metode_bayar, t.status]))), 'text/csv;charset=utf-8');
ACT.bkrestore = () => confirmBox('Pulihkan dari backup?', '<b>Semua data saat ini akan DIGANTI</b> dengan isi backup terakhir (transaksi setelah backup akan hilang). Aksi ini tidak dapat dibatalkan.', 'Lanjut', () => promptBox('Konfirmasi pemulihan', 'Ketik PULIHKAN untuk melanjutkan', async v => { if (v !== 'PULIHKAN') return toast('Konfirmasi tidak cocok', 'err'); try { await call('backup.restore', { konfirmasi: v }, { timeout: 300000 }); await sync(true); toast('Data dipulihkan dari backup ✓'); } catch (e) { toast(e.message, 'err'); } }, { ok: 'Pulihkan', danger: true }), true);
PAGES.push({ id: 'data', ttl: 'Import & Backup', sub: 'Pindahkan data, cadangkan', ico: '🗂️', roles: R_APT, build: el => Imp.build(el), refresh: () => Imp.refresh() });
