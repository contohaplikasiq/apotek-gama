'use strict';
/* APOTEK GAMA · pos.js — Kasir, struk/resep/etiket, riwayat & void · © Arraihan Academy */
const SEARCH = new WeakMap();
const sstr = p => { let s = SEARCH.get(p); if (!s) { s = (p.nama_produk + ' ' + (p.zat_aktif || '') + ' ' + p.kode_sku + ' ' + (p.produsen || '')).toLowerCase(); SEARCH.set(p, s); } return s; };
const matchQ = (p, q) => !q || q.toLowerCase().split(/\s+/).every(w => sstr(p).indexOf(w) >= 0);

const Scan = {
  async open(cb) {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { toast('Scan kamera tidak didukung browser ini. Gunakan scanner USB: arahkan kursor ke kolom cari lalu scan.', 'warn', 5000); return; }
    let stream, stop = false, det;
    try { det = new BarcodeDetector(); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch (e) { toast('Kamera tidak dapat diakses (perlu izin & HTTPS).', 'err'); return; }
    const w = openModal(mhead('Scan barcode') + '<div class="mb"><video id="scV" playsinline muted style="width:100%;border-radius:10px;background:#000"></video><p class="muted xs c">Arahkan barcode ke kamera</p></div>', 'sm');
    const v = $('#scV', w); v.srcObject = stream; v.play();
    const end = () => { stop = true; stream.getTracks().forEach(t => t.stop()); };
    new MutationObserver(() => { if (!document.body.contains(w)) end(); }).observe($('#mroot'), { childList: true });
    (async function loop() { while (!stop) { try { const r = await det.detect(v); if (r.length) { end(); closeModal(w); cb(r[0].rawValue); return; } } catch (e) {} await sleep(250); } })();
  }
};

const Pos = {
  cart: [], resep: false, cat: 'Semua', q: '', limit: 60, metode: 'Tunai',
  build(el) {
    el.innerHTML = '<div class="pos"><div class="pos-l"><div class="pos-bar"><input id="pQ" class="in" placeholder="Cari nama / zat aktif / barcode  (F2)" autocomplete="off" oninput="Pos.search(this.value)" onkeydown="Pos.key(event)"><button class="btn" data-act="pscan" title="Scan dengan kamera">📷</button></div><div id="pCats" class="chips"></div><div id="pGrid" class="pgrid"></div></div>' +
      '<aside class="pos-r" id="pCart"><div class="seg"><button data-act="pmode" data-m="0" class="on">Umum</button><button data-act="pmode" data-m="1">Resep</button></div>' +
      '<div id="pResep" class="hidden resep"><input id="rPas" class="in" placeholder="Nama pasien *"><input id="rDok" class="in" placeholder="Nama dokter *"><input id="rJml" class="in" type="number" min="1" value="1" title="Jumlah resep (R/)" oninput="Pos.recalc()"></div>' +
      '<div id="pLines" class="lines"></div>' +
      '<div class="tot"><div class="kv"><span>Subtotal</span><b id="tSub">Rp 0</b></div><div class="kv hidden" id="tBiayaR"><span>Tuslah + Embalase</span><b id="tBiaya">Rp 0</b></div><div class="kv"><span>Diskon (Rp)</span><input id="pDisk" class="in sm m r" inputmode="numeric" value="0" oninput="this.value=fmt(parseRp(this.value));Pos.recalc()"></div><div class="kv big"><span>TOTAL</span><b id="tTotal">Rp 0</b></div></div>' +
      '<div class="seg" id="pMet">' + ['Tunai', 'QRIS', 'Debit', 'Transfer'].map((m, i) => '<button data-act="pmet" data-m="' + m + '" class="' + (i ? '' : 'on') + '">' + m + '</button>').join('') + '</div>' +
      '<div id="pCash"><input id="pTunai" class="in m r" inputmode="numeric" placeholder="Uang diterima" oninput="this.value=fmt(parseRp(this.value));Pos.recalc()"><div id="pQuick" class="chips"></div><div class="kv"><span>Kembalian</span><b id="tKemb">Rp 0</b></div></div>' +
      '<button id="pPay" class="btn pri lg" data-act="ppay">💳 BAYAR <kbd>F9</kbd></button><button class="btn gh sm" data-act="pclear">Kosongkan keranjang</button></aside></div><button class="fab" id="pFab" data-act="pfab">🛒 <span id="pFabN">0</span> · <b id="pFabT">Rp 0</b></button>';
    $('#pQ').focus();
  },
  refresh() { this.cats(); this.grid(); if (!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#pLines'))) this.lines(); },
  cats() {
    const c = ['Semua', ...Array.from(new Set(S.products.map(p => p.kategori || 'Obat'))).sort()];
    $('#pCats').innerHTML = c.map(x => '<button class="chip ' + (x === this.cat ? 'on' : '') + '" data-act="pcat" data-c="' + esc(x) + '">' + esc(x) + '</button>').join('');
  },
  search: debounce(v => { Pos.q = v; Pos.limit = 60; Pos.grid(); }, 120),
  filtered() { return S.products.filter(p => (this.cat === 'Semua' || (p.kategori || 'Obat') === this.cat) && matchQ(p, this.q)).sort((a, b) => a.nama_produk.localeCompare(b.nama_produk)); },
  grid() {
    const all = this.filtered(), list = all.slice(0, this.limit);
    $('#pGrid').innerHTML = list.map(p => {
      const e = sellable(p, 'qty_etalase'), g = sellable(p, 'qty_gudang'), lv = e <= 0;
      const ed = nearestEd(p), d = ed && !String(ed).startsWith('9999') ? edDays(ed) : 999;
      return '<button class="pc ' + (lv ? 'out' : '') + '" data-act="padd" data-id="' + esc(p.id_produk) + '"><b>' + esc(p.nama_produk) + '</b><span class="muted xs">' + esc(p.zat_aktif || p.produsen || '') + '</span><span class="pcf"><span class="pr">' + rp(p.harga_jual) + '<small>/' + esc(p.satuan_kecil) + '</small></span><span class="st ' + (lv ? 'red' : e < num(p.stok_min_etalase) ? 'amb' : '') + '">' + (lv ? (g > 0 ? 'Gudang ' + qf(g) : 'Habis') : qf(e)) + '</span></span>' + (needResep(p) ? '<i class="tag rx">℞</i>' : '') + (d <= 30 ? '<i class="tag ed">ED</i>' : '') + '</button>';
    }).join('') + (all.length > this.limit ? '<button class="btn" data-act="pmore" style="grid-column:1/-1">Tampilkan lebih banyak (' + (all.length - this.limit) + ' lagi)</button>' : '') + (!all.length ? '<div class="empty" style="grid-column:1/-1">' + (S.products.length ? 'Tidak ada obat yang cocok.' : 'Belum ada data obat. Tambahkan lewat menu Inventori atau Import Data.') + '</div>' : '');
  },
  key(e) {
    if (e.key !== 'Enter') return; const v = e.target.value.trim(); if (!v) return;
    const p = IX.SKU[v] || (this.filtered().length === 1 ? this.filtered()[0] : null);
    if (p) { this.add(p.id_produk); e.target.value = ''; this.q = ''; this.grid(); } else toast('Obat tidak ditemukan: ' + v, 'warn');
  },
  add(id) {
    const p = IX.P[id]; if (!p) return;
    if (sellable(p, 'qty_etalase') <= 0) { toast(sellable(p, 'qty_gudang') > 0 ? p.nama_produk + ': etalase kosong — mutasi dari gudang dahulu (menu Gudang).' : p.nama_produk + ': stok habis / batch expired.', 'warn', 4500); return; }
    if (needResep(p) && !this.resep) { this.setMode(true); toast('Obat keras — mode Resep diaktifkan (isi nama pasien & dokter).', 'warn', 4000); }
    const ex = this.cart.find(c => c.pid === id && c.unit === p.satuan_kecil); if (ex) ex.qty = r3(ex.qty + 1); else this.cart.push({ pid: id, unit: p.satuan_kecil, qty: 1, signa: p.signa || '' });
    this.lines();
  },
  setMode(r) { this.resep = !!r; $$('#pCart .seg:first-child button').forEach(b => b.classList.toggle('on', (b.dataset.m === '1') === this.resep)); $('#pResep').classList.toggle('hidden', !this.resep); this.lines(); },
  unit(i, u) { this.cart[i].unit = u; this.lines(); },
  qty(i, v) { const q = num(String(v).replace(',', '.')); if (q <= 0) this.cart.splice(i, 1); else this.cart[i].qty = q; this.lines(); },
  step(i, d) { this.qty(i, r3(this.cart[i].qty + d)); },
  signa(i, v) { this.cart[i].signa = v; },
  lines() {
    const box = $('#pLines'); if (!box) return;
    box.innerHTML = this.cart.length ? this.cart.map((c, i) => {
      const p = IX.P[c.pid]; if (!p) return ''; const us = unitsOf(p), u = us.find(x => x.n === c.unit) || us[0], base = r3(c.qty * u.f), over = base > sellable(p, 'qty_etalase') + 1e-9;
      return '<div class="ln' + (over ? ' over' : '') + '"><div class="lt"><b>' + esc(p.nama_produk) + '</b><button class="ibtn sm" data-act="pdel" data-i="' + i + '" aria-label="Hapus">✕</button></div><div class="lc">' + (us.length > 1 ? '<select class="sel sm" onchange="Pos.unit(' + i + ',this.value)">' + us.map(x => '<option ' + (x.n === c.unit ? 'selected' : '') + '>' + esc(x.n) + '</option>').join('') + '</select>' : '<span class="muted xs">' + esc(p.satuan_kecil) + '</span>') + '<div class="qty"><button data-act="pstep" data-i="' + i + '" data-d="-1">−</button><input value="' + qf(c.qty).replace(',', '.') + '" inputmode="decimal" onchange="Pos.qty(' + i + ',this.value)"><button data-act="pstep" data-i="' + i + '" data-d="1">+</button></div><span class="muted xs">× ' + fmt(u.price) + '</span><b>' + rp(Math.round(c.qty * u.price)) + '</b></div>' + (over ? '<div class="xs red-t">Melebihi stok etalase (' + qtyLabel(p, sellable(p, 'qty_etalase')) + ')</div>' : '') + (this.resep ? '<input class="in sm" placeholder="Aturan pakai (mis. 3 x 1 sesudah makan)" value="' + esc(c.signa) + '" onchange="Pos.signa(' + i + ',this.value)">' : '') + '</div>';
    }).join('') : '<div class="empty">Keranjang kosong<br><span class="xs">Klik obat atau scan barcode</span></div>';
    this.recalc();
  },
  totals() {
    let sub = 0; this.cart.forEach(c => { const p = IX.P[c.pid]; if (p) sub += Math.round(c.qty * (unitsOf(p).find(x => x.n === c.unit) || unitsOf(p)[0]).price); });
    const biaya = Math.round(biayaResep({ resep: this.resep, jml_resep: num($('#rJml') && $('#rJml').value) || 1 }, this.cart.length)), disk = Math.min(parseRp($('#pDisk').value), sub + biaya);
    return { sub, biaya, disk, total: sub + biaya - disk };
  },
  recalc() {
    if (!$('#tSub')) return; const t = this.totals();
    $('#tSub').textContent = rp(t.sub); $('#tBiaya').textContent = rp(t.biaya); $('#tBiayaR').classList.toggle('hidden', !this.resep); $('#tTotal').textContent = rp(t.total);
    const tun = parseRp($('#pTunai').value); $('#tKemb').textContent = rp(Math.max(0, tun - t.total)); $('#tKemb').style.color = this.metode === 'Tunai' && tun < t.total ? 'var(--red-x)' : '';
    $('#pCash').classList.toggle('hidden', this.metode !== 'Tunai');
    const q = [t.total], steps = [5000, 10000, 50000, 100000]; steps.forEach(s => { const v = Math.ceil(t.total / s) * s; if (v > t.total && q.indexOf(v) < 0) q.push(v); });
    $('#pQuick').innerHTML = t.total ? q.slice(0, 4).map((v, i) => '<button class="chip" data-act="pcash" data-v="' + v + '">' + (i ? fmt(v) : 'Uang pas') + '</button>').join('') : '';
    $('#pFabN').textContent = this.cart.length; $('#pFabT').textContent = rp(t.total);
  },
  pay() {
    if (!this.cart.length) { toast('Keranjang masih kosong', 'warn'); return; }
    if (R_JUAL.indexOf(S.user.role) < 0) { toast('Peran Anda tidak boleh bertransaksi', 'err'); return; }
    const tt = this.totals(), t = { id_transaksi: uid('TRX'), tanggal_waktu: nowStr(), shift_id: S.shift ? S.shift.id_shift : '', resep: this.resep, nama_pasien: $('#rPas').value.trim(), nama_dokter: $('#rDok').value.trim(), jml_resep: num($('#rJml').value) || 1,
      items: this.cart.map(c => ({ id_produk: c.pid, satuan: c.unit, qty: c.qty, signa: this.resep ? c.signa : '' })), metode_bayar: this.metode, tunai: this.metode === 'Tunai' ? parseRp($('#pTunai').value) : tt.total, diskon: tt.disk };
    let rec; try { rec = applyTrxLocal(t); } catch (e) { toast(e.message, 'err', 6000); return; }
    enqueue('trx', t, 'Transaksi ' + rec.id_transaksi.slice(-8) + ' · ' + rp(rec.total_belanja)); commit();
    this.cart = []; $('#pTunai').value = ''; $('#pDisk').value = '0'; $('#rPas').value = ''; $('#rDok').value = ''; $('#rJml').value = '1'; this.setMode(false); this.grid(); $('#pQ').focus();
    Receipt.show(rec, true);
  }
};
ACT.padd = el => Pos.add(el.dataset.id);
ACT.pdel = el => { Pos.cart.splice(+el.dataset.i, 1); Pos.lines(); };
ACT.pstep = el => Pos.step(+el.dataset.i, +el.dataset.d);
ACT.pcat = el => { Pos.cat = el.dataset.c; Pos.limit = 60; Pos.cats(); Pos.grid(); };
ACT.pmore = () => { Pos.limit += 80; Pos.grid(); };
ACT.pmode = el => Pos.setMode(el.dataset.m === '1');
ACT.pmet = el => { Pos.metode = el.dataset.m; $$('#pMet button').forEach(b => b.classList.toggle('on', b === el)); Pos.recalc(); };
ACT.pcash = el => { $('#pTunai').value = fmt(+el.dataset.v); Pos.recalc(); };
ACT.ppay = () => Pos.pay();
ACT.pclear = () => { Pos.cart = []; Pos.lines(); };
ACT.pscan = () => Scan.open(code => { const p = IX.SKU[code]; if (p) Pos.add(p.id_produk); else { $('#pQ').value = code; Pos.q = code; Pos.grid(); toast('Barcode ' + code + ' tidak terdaftar', 'warn'); } });
ACT.pfab = () => $('#pCart').scrollIntoView({ behavior: 'smooth' });
document.addEventListener('keydown', e => { if (S.cur !== 'pos' || !S.user) return; if (e.key === 'F2') { e.preventDefault(); $('#pQ').focus(); } if (e.key === 'F9') { e.preventDefault(); Pos.pay(); } });
PAGES.push({ id: 'pos', ttl: 'Kasir', sub: 'Penjualan & resep', ico: '🛒', roles: R_JUAL, build: el => Pos.build(el), refresh: () => Pos.refresh() });

// ── Struk, salinan resep, etiket ──
const Receipt = {
  w() { return S.cfg.kertas === '58' ? { mm: '58mm', body: '48mm' } : { mm: '80mm', body: '72mm' }; },
  head() { const c = S.cfg; return '<div class="c b lg">' + esc(c.namaApotek || 'APOTEK') + '</div><div class="c xs">' + esc(c.alamat || '') + (c.telp ? '<br>Telp ' + esc(c.telp) : '') + (c.no_sia ? '<br>SIA: ' + esc(c.no_sia) : '') + '</div>'; },
  struk(t) {
    const c = S.cfg, w = this.w();
    return '<div style="width:' + w.body + '">' + this.head() + '<div class="hr"></div><div class="row"><span>' + esc(fmtDT(t.tanggal_waktu)) + '</span><span>' + esc(t.kasir) + '</span></div><div>No: ' + esc(t.id_transaksi) + '</div>' + (t.nama_pasien ? '<div>Pasien: ' + esc(t.nama_pasien) + '</div><div>Dokter: ' + esc(t.nama_dokter) + '</div>' : '') + '<div class="hr"></div>' +
      (t.items || []).map(l => '<div>' + esc(l.nama) + '</div><div class="row"><span>&nbsp;&nbsp;' + qf(l.qty) + ' ' + esc(l.satuan) + ' x ' + fmt(l.harga) + '</span><span>' + fmt(l.subtotal) + '</span></div>').join('') + '<div class="hr"></div>' +
      '<div class="row"><span>Subtotal</span><span>' + fmt(t.subtotal_obat) + '</span></div>' + (num(t.biaya_resep) ? '<div class="row"><span>Tuslah+Embalase</span><span>' + fmt(t.biaya_resep) + '</span></div>' : '') + (num(t.diskon) ? '<div class="row"><span>Diskon</span><span>-' + fmt(t.diskon) + '</span></div>' : '') +
      '<div class="row b lg"><span>TOTAL</span><span>' + fmt(t.total_belanja) + '</span></div><div class="row"><span>' + esc(t.metode_bayar) + '</span><span>' + fmt(t.tunai) + '</span></div>' + (t.metode_bayar === 'Tunai' ? '<div class="row"><span>Kembali</span><span>' + fmt(t.kembalian) + '</span></div>' : '') + (t.status === 'VOID' ? '<div class="c b">*** VOID ***</div>' : '') +
      '<div class="hr"></div><div class="c xs">' + esc(c.footer || '') + '</div><div class="c xs" style="margin-top:4px">APOTEK GAMA · © Arraihan Academy</div></div>';
  },
  resep(t) {
    const c = S.cfg, w = this.w();
    return '<div style="width:' + w.body + '">' + this.head() + '<div class="hr"></div><div class="c b">SALINAN RESEP (COPY RESEP)</div><div>No: ' + esc(t.id_transaksi) + '</div><div>Tgl: ' + esc(fmtDT(t.tanggal_waktu)) + '</div><div>Pasien: ' + esc(t.nama_pasien) + '</div><div>Dokter: ' + esc(t.nama_dokter) + '</div><div class="hr"></div>' +
      (t.items || []).map(l => '<div class="b">R/ ' + esc(l.nama) + '</div><div>&nbsp;&nbsp;No. ' + qf(l.qty) + ' ' + esc(l.satuan) + '</div>' + (l.signa ? '<div>&nbsp;&nbsp;S ' + esc(l.signa) + '</div>' : '') + '<div class="xs">&nbsp;&nbsp;Batch: ' + esc(l.batch || '-') + '</div>').join('') + '<div class="hr"></div><div class="c xs">Apoteker Pengelola: ' + esc(c.nama_apa || '................') + '<br>SIPA: ' + esc(c.no_sipa || '................') + '</div><br><div class="c xs">( tanda tangan / stempel )</div><div class="c xs" style="margin-top:4px">APOTEK GAMA · © Arraihan Academy</div></div>';
  },
  etiket(t) {
    return (t.items || []).map(l => { const b = (l.alok && l.alok[0] && S.batches.find(x => x.id_batch === l.alok[0].b)) || null; return '<div class="lbl"><div class="c b">' + esc(S.cfg.namaApotek || '') + '</div><div class="xs c">' + esc(S.cfg.alamat || '') + '</div><div class="hr"></div><div class="xs">Nama: <b>' + esc(t.nama_pasien || '________') + '</b> · ' + esc(fmtDate(String(t.tanggal_waktu).substr(0, 10))) + '</div><div class="b">' + esc(l.nama) + '</div><div class="xs">Jumlah: ' + qf(l.qty) + ' ' + esc(l.satuan) + (b ? ' · ED ' + esc(fmtDate(b.tgl_exp)) : '') + '</div><div class="lg b" style="margin-top:3px">' + esc(l.signa || 'Sesuai petunjuk dokter') + '</div></div>'; }).join('');
  },
  wa(t) {
    let s = '*' + (S.cfg.namaApotek || 'APOTEK') + '*\n' + fmtDT(t.tanggal_waktu) + '\nNo: ' + t.id_transaksi + '\n';
    (t.items || []).forEach(l => { s += '• ' + l.nama + ' ' + qf(l.qty) + ' ' + l.satuan + ' = Rp' + fmt(l.subtotal) + '\n'; });
    return s + '*TOTAL Rp' + fmt(t.total_belanja) + '* (' + t.metode_bayar + ')\n' + (S.cfg.footer || '');
  },
  show(t, baru) {
    const isR = !!(t.nama_dokter || num(t.jml_resep) > 0), pend = Q.some(o => o.type === 'trx' && o.payload.id_transaksi === t.id_transaksi);
    const w = openModal(mhead(baru ? '✅ Transaksi berhasil' : 'Detail transaksi', t.id_transaksi) + '<div class="mb"><div class="rcp">' + this.struk(t) + '</div>' + (pend ? '<p class="xs warn-t c">⏳ Menunggu sinkron ke server</p>' : '') + '</div><div class="mf wrap"><button class="btn" data-act="close">Tutup</button><button class="btn" id="rcWa">WhatsApp</button>' + (isR ? '<button class="btn" id="rcRes">Salinan resep</button><button class="btn" id="rcEt">Etiket</button>' : '') + '<button class="btn pri" id="rcPr">🖨 Cetak struk</button></div>', 'sm');
    $('#rcPr', w).onclick = () => printHTML(this.struk(t), this.w().mm);
    if (isR) { $('#rcRes', w).onclick = () => printHTML(this.resep(t), this.w().mm); $('#rcEt', w).onclick = () => printHTML(this.etiket(t), '60mm 40mm'); }
    $('#rcWa', w).onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(this.wa(t)), '_blank', 'noopener');
  }
};

// ── Riwayat & void ──
const Riw = {
  from: ymd(), to: ymd(), q: '', page: 0,
  build(el) {
    el.innerHTML = '<div class="card"><div class="bar"><label class="xs muted">Dari</label><input id="rwF" type="date" class="in sm" value="' + this.from + '"><label class="xs muted">Sampai</label><input id="rwT" type="date" class="in sm" value="' + this.to + '"><input id="rwQ" class="in sm" placeholder="Cari no / pasien / kasir" style="min-width:180px"><span class="grow"></span><span id="rwInfo" class="muted xs"></span></div><div class="tw"><table class="tbl"><thead><tr><th>Waktu</th><th>No. transaksi</th><th>Kasir</th><th>Pasien</th><th class="r">Total</th><th>Bayar</th><th>Status</th><th></th></tr></thead><tbody id="rwBody"></tbody></table></div><div id="rwPg" class="pager"></div></div>';
    ['rwF', 'rwT'].forEach(i => $('#' + i).onchange = () => { Riw.from = $('#rwF').value; Riw.to = $('#rwT').value; Riw.page = 0; Riw.refresh(); });
    $('#rwQ').oninput = debounce(e => { Riw.q = e.target.value.toLowerCase(); Riw.page = 0; Riw.refresh(); }, 150);
  },
  refresh() {
    const pend = {}; Q.forEach(o => { if (o.type === 'trx') pend[o.payload.id_transaksi] = o.st; });
    const all = S.trx.filter(t => String(t.tanggal_waktu).substr(0, 10) >= this.from && String(t.tanggal_waktu).substr(0, 10) <= this.to && (!this.q || (t.id_transaksi + ' ' + (t.nama_pasien || '') + ' ' + t.kasir).toLowerCase().indexOf(this.q) >= 0)).sort((a, b) => String(b.tanggal_waktu).localeCompare(String(a.tanggal_waktu)));
    const per = 40, pg = all.slice(this.page * per, this.page * per + per);
    $('#rwBody').innerHTML = pg.map(t => '<tr class="' + (t.status === 'VOID' ? 'void' : '') + '"><td>' + esc(fmtDT(t.tanggal_waktu)) + '</td><td class="m">' + esc(t.id_transaksi) + '</td><td>' + esc(t.kasir) + '</td><td>' + esc(t.nama_pasien || '—') + '</td><td class="r b">' + fmt(t.total_belanja) + '</td><td>' + esc(t.metode_bayar) + '</td><td>' + (t.status === 'VOID' ? '<span class="badge red" title="' + esc(t.void_alasan || '') + '">VOID</span>' : pend[t.id_transaksi] ? '<span class="badge amb">' + (pend[t.id_transaksi] === 'ERR' ? 'Perlu tinjau' : 'Menunggu') + '</span>' : '<span class="badge grn">Sukses</span>') + '</td><td class="r"><button class="btn sm" data-act="rwview" data-id="' + esc(t.id_transaksi) + '">Lihat</button>' + (isRole(...R_APT) && t.status !== 'VOID' ? ' <button class="btn sm dng" data-act="rwvoid" data-id="' + esc(t.id_transaksi) + '">Void</button>' : '') + '</td></tr>').join('') || '<tr><td colspan="8" class="empty">Tidak ada transaksi pada rentang ini</td></tr>';
    const tot = all.filter(t => t.status !== 'VOID').reduce((a, t) => a + num(t.total_belanja), 0); $('#rwInfo').textContent = all.length + ' transaksi · ' + rp(tot);
    const np = Math.ceil(all.length / per); $('#rwPg').innerHTML = np > 1 ? '<button class="btn sm" data-act="rwp" data-d="-1" ' + (this.page ? '' : 'disabled') + '>‹</button><span>' + (this.page + 1) + ' / ' + np + '</span><button class="btn sm" data-act="rwp" data-d="1" ' + (this.page < np - 1 ? '' : 'disabled') + '>›</button>' : '';
  }
};
ACT.rwp = el => { Riw.page += +el.dataset.d; Riw.refresh(); };
ACT.rwview = el => { const t = S.trx.find(x => x.id_transaksi === el.dataset.id); if (t) Receipt.show(t, false); };
ACT.rwvoid = el => { const id = el.dataset.id; promptBox('Void transaksi', 'Alasan void (wajib) — stok akan dikembalikan ke batch asal', al => { applyVoidLocal(id, al); enqueue('void', { id, alasan: al }, 'Void ' + id.slice(-8)); commit(); toast('Transaksi di-void, stok dikembalikan', 'ok'); }, { min: 3, danger: true, ok: 'Void transaksi', ph: 'mis. salah input obat' }); };
PAGES.push({ id: 'riwayat', ttl: 'Riwayat', sub: 'Transaksi & void', ico: '🧾', roles: R_JUAL, build: el => Riw.build(el), refresh: () => Riw.refresh() });
