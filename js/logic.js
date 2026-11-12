'use strict';
/* APOTEK GAMA · logic.js — satuan, FEFO, dan penerapan lokal (cermin server) · © Arraihan Academy */
const GOL_RESEP = ['Keras', 'Narkotika', 'Psikotropika'];
const r3 = v => Math.round(v * 1000) / 1000;
const roundPrice = x => Math.round(x / 50) * 50;
const edDays = ed => Math.floor((new Date(String(ed).substr(0, 10) + 'T00:00:00') - new Date(ymd() + 'T00:00:00')) / 864e5);
const needResep = p => p.wajib_resep === true || String(p.wajib_resep).toUpperCase() === 'TRUE' || GOL_RESEP.indexOf(p.golongan) >= 0;
function unitsOf(p) {
  const u = [{ n: p.satuan_kecil, f: 1, price: num(p.harga_jual) }];
  if (p.satuan_besar && p.satuan_besar !== p.satuan_kecil && num(p.isi_konversi) > 1) u.push({ n: p.satuan_besar, f: num(p.isi_konversi), price: unitPrice(p, p.satuan_besar) });
  if (p.satuan_terkecil && num(p.isi_terkecil) > 1 && p.satuan_terkecil !== p.satuan_kecil) u.push({ n: p.satuan_terkecil, f: 1 / num(p.isi_terkecil), price: unitPrice(p, p.satuan_terkecil) });
  return u;
}
function unitFactor(p, n) {
  if (n === p.satuan_kecil) return 1;
  if (n === p.satuan_besar) return num(p.isi_konversi) || 1;
  if (p.satuan_terkecil && n === p.satuan_terkecil) return 1 / (num(p.isi_terkecil) || 1);
  throw new Error('Satuan tidak dikenal: ' + n);
}
function unitPrice(p, n) {
  if (n === p.satuan_kecil) return num(p.harga_jual);
  if (n === p.satuan_besar) return num(p.harga_jual_besar) || roundPrice(num(p.harga_jual) * (num(p.isi_konversi) || 1));
  return num(p.harga_jual_terkecil) || roundPrice(num(p.harga_jual) / (num(p.isi_terkecil) || 1));
}
const batchesOf = pid => IX.BP[pid] || [];
const eligible = b => b.status === 'AKTIF' && String(b.tgl_exp) > ymd();
// stok yang benar-benar bisa dijual / dipindah (tanpa batch expired/karantina)
function sellable(p, field) {
  const bs = batchesOf(p.id_produk);
  if (!bs.length) return num(field === 'qty_gudang' ? p.stok_gudang : p.stok_etalase);
  return r3(bs.filter(eligible).reduce((a, b) => a + num(b[field]), 0));
}
function allocate(pid, need, field) {
  const all = batchesOf(pid); if (!all.length) return [];
  const el = all.filter(b => eligible(b) && num(b[field]) > 0); let left = need; const out = [];
  for (let i = 0; i < el.length && left > 1e-9; i++) { const t = Math.min(left, num(el[i][field])); out.push({ b: el[i], take: t }); left = r3(left - t); }
  return left > 1e-9 ? null : out;
}
function recalcP(p) {
  const bs = batchesOf(p.id_produk); if (!bs.length) return;
  let e = 0, g = 0; bs.forEach(b => { if (b.status === 'AKTIF') { e += num(b.qty_etalase); g += num(b.qty_gudang); } });
  p.stok_etalase = r3(e); p.stok_gudang = r3(g);
}
function nearestEd(p) { const b = batchesOf(p.id_produk).filter(x => x.status === 'AKTIF' && num(x.qty_etalase) + num(x.qty_gudang) > 0)[0]; return b ? b.tgl_exp : ''; }
function edBadge(ed, alert) {
  if (!ed) return '<span class="muted">—</span>';
  if (String(ed).startsWith('9999')) return '<span class="muted">Tanpa ED</span>';
  const d = edDays(ed), a = num(alert) || num(S.cfg.ed_alert_hari) || 90;
  if (d < 0) return '<span class="badge red">Expired ' + fmtDate(ed) + '</span>';
  if (d <= 30) return '<span class="badge red">' + fmtDate(ed) + ' · ' + d + 'h</span>';
  if (d <= a) return '<span class="badge amb">' + fmtDate(ed) + ' · ' + d + 'h</span>';
  return '<span class="badge grn">' + fmtDate(ed) + '</span>';
}
function stockLevel(p) {
  const e = sellable(p, 'qty_etalase'), g = sellable(p, 'qty_gudang');
  if (e + g <= 0) return 'out';
  if ((num(p.stok_min_etalase) && e < num(p.stok_min_etalase)) || (num(p.stok_min_gudang) && g < num(p.stok_min_gudang))) return 'low';
  return 'ok';
}
function qtyLabel(p, q) {
  q = num(q); const isi = num(p.isi_konversi);
  if (p.satuan_besar && p.satuan_besar !== p.satuan_kecil && isi > 1 && q >= isi) { const b = Math.floor(q / isi + 1e-9), s = r3(q - b * isi); return b + ' ' + p.satuan_besar + (s > 0 ? ' + ' + qf(s) + ' ' + p.satuan_kecil : ''); }
  return qf(q) + ' ' + p.satuan_kecil;
}
function biayaResep(t, nItems) { return t.resep ? Math.max(1, num(t.jml_resep) || 1) * num(S.cfg.tarif_tuslah) + nItems * num(S.cfg.tarif_embalase) : 0; }
function localLog(p, jenis, ket, dE, dG, cat, idb) {
  const l = { id_log: uid('LCL'), tanggal_waktu: nowStr(), id_produk: p.id_produk, nama_produk: p.nama_produk, jenis_aksi: jenis, input_qty_ket: ket, perubahan_etalase: r3(dE), perubahan_gudang: r3(dG), sisa_etalase: p.stok_etalase, sisa_gudang: p.stok_gudang, petugas: S.user.username, catatan: cat || '', id_batch: idb || '', _local: true };
  S.logs.push(l); return l;
}

// ── Transaksi kasir (lempar Error bila tidak valid; mutasi state bila lolos) ──
function applyTrxLocal(t) {
  const lines = [], touch = {}, snap = [];
  let sub = 0, perlu = false;
  const undo = () => snap.forEach(f => f());
  try {
    t.items.forEach(it => {
      const p = IX.P[it.id_produk]; if (!p) throw new Error('Obat tidak ditemukan');
      if (needResep(p)) perlu = true;
      const f = unitFactor(p, it.satuan), base = r3(num(it.qty) * f), harga = unitPrice(p, it.satuan);
      if (num(it.qty) <= 0) throw new Error('Jumlah tidak valid: ' + p.nama_produk);
      if (num(p.stok_etalase) + 1e-9 < base) throw new Error('Stok etalase ' + p.nama_produk + ' tidak cukup (sisa ' + qtyLabel(p, p.stok_etalase) + '). Mutasi dari gudang dahulu.');
      const al = allocate(p.id_produk, base, 'qty_etalase');
      if (al === null) throw new Error('Batch layak jual ' + p.nama_produk + ' tidak cukup (cek expired / karantina).');
      al.forEach(a => { const old = a.b.qty_etalase; a.b.qty_etalase = r3(num(old) - a.take); snap.push(() => a.b.qty_etalase = old); });
      if (!al.length) { const old = p.stok_etalase; p.stok_etalase = r3(num(old) - base); snap.push(() => p.stok_etalase = old); }
      touch[p.id_produk] = p;
      const line = { id_produk: p.id_produk, nama: p.nama_produk, satuan: it.satuan, faktor: f, qty: num(it.qty), harga, subtotal: Math.round(num(it.qty) * harga), gol: p.golongan,
        batch: al.map(a => a.b.no_batch).join(','), alok: al.map(a => ({ b: a.b.id_batch, n: a.b.no_batch, q: a.take })), modal: Math.round(base * num(p.harga_beli)), signa: it.signa || p.signa || '', jumlah_ket: it.jumlah_ket || '', produsen: p.produsen };
      sub += line.subtotal; lines.push({ line, p, base, al });
    });
    if (perlu && !t.resep) throw new Error('Ada obat keras/wajib resep — gunakan mode Resep.');
    if (t.resep && (!String(t.nama_pasien || '').trim() || !String(t.nama_dokter || '').trim())) throw new Error('Mode Resep: nama pasien dan dokter wajib diisi.');
  } catch (e) { undo(); throw e; }
  Object.values(touch).forEach(recalcP);
  const biaya = Math.round(biayaResep(t, lines.length)), diskon = Math.min(Math.max(0, Math.round(num(t.diskon))), sub + biaya), total = sub + biaya - diskon;
  const tunai = t.metode_bayar === 'Tunai' ? num(t.tunai) : total;
  if (t.metode_bayar === 'Tunai' && tunai < total) { undo(); Object.values(touch).forEach(recalcP); throw new Error('Uang diterima kurang dari total.'); }
  lines.forEach(x => localLog(x.p, 'JUAL', x.line.qty + ' ' + x.line.satuan, -x.base, 0, t.id_transaksi, x.al.length ? x.al[0].b.id_batch : ''));
  const rec = { id_transaksi: t.id_transaksi, tanggal_waktu: t.tanggal_waktu, kasir: S.user.username, shift_id: t.shift_id || '', nama_pasien: t.resep ? t.nama_pasien : '', nama_dokter: t.resep ? t.nama_dokter : '', jml_resep: t.resep ? num(t.jml_resep) || 1 : 0,
    items: lines.map(x => x.line), subtotal_obat: sub, biaya_resep: biaya, diskon, total_belanja: total, metode_bayar: t.metode_bayar, tunai, kembalian: tunai - total, status: 'SUKSES' };
  S.trx.push(rec); return rec;
}
function applyVoidLocal(id, alasan) {
  const t = S.trx.find(x => x.id_transaksi === id); if (!t || t.status === 'VOID') return;
  (t.items || []).forEach(l => {
    const p = IX.P[l.id_produk]; if (!p) return; const base = r3(num(l.qty) * (num(l.faktor) || 1)); let back = base;
    (l.alok || []).forEach(a => { const b = S.batches.find(x => x.id_batch === a.b); if (b) { b.qty_etalase = r3(num(b.qty_etalase) + num(a.q)); back = r3(back - num(a.q)); } });
    if (back > 1e-9) p.stok_etalase = r3(num(p.stok_etalase) + back);
    recalcP(p); localLog(p, 'VOID', l.qty + ' ' + l.satuan, base, 0, 'Void ' + id + ': ' + alasan);
  });
  t.status = 'VOID'; t.void_oleh = S.user.username; t.void_waktu = nowStr(); t.void_alasan = alasan;
}
// ── Operasi stok (mutasi / opname / status) ──
function applyStockOpsLocal(ops) {
  const copyB = S.batches.map(b => Object.assign({}, b)), copyP = S.products.map(p => ({ e: p.stok_etalase, g: p.stok_gudang }));
  const pending = [];
  try {
    ops.forEach(op => {
      if (op.type === 'MUTASI') {
        const p = IX.P[op.id_produk], act = r3(op.mode === 'BESAR' ? num(op.qty) * (num(p.isi_konversi) || 1) : num(op.qty));
        if (act <= 0) throw new Error('Jumlah mutasi tidak valid');
        if (num(p.stok_gudang) + 1e-9 < act) throw new Error('Stok gudang tidak mencukupi: ' + p.nama_produk);
        const al = allocate(p.id_produk, act, 'qty_gudang'); if (al === null) throw new Error('Stok gudang layak pindah tidak cukup: ' + p.nama_produk + ' (batch expired/karantina tidak dipindah)');
        if (!al.length) { p.stok_gudang = r3(num(p.stok_gudang) - act); p.stok_etalase = r3(num(p.stok_etalase) + act); }
        al.forEach(a => { a.b.qty_gudang = r3(num(a.b.qty_gudang) - a.take); a.b.qty_etalase = r3(num(a.b.qty_etalase) + a.take); });
        recalcP(p); pending.push([p, 'MUTASI_ETALASE', op.qty + ' ' + (op.mode === 'BESAR' ? p.satuan_besar : p.satuan_kecil), act, -act, op.catatan || 'Refill etalase', al[0] && al[0].b.id_batch]);
      } else if (op.type === 'OPNAME') {
        const b = S.batches.find(x => x.id_batch === op.id_batch), p = IX.P[b.id_produk], fe = num(op.fisik_etalase), fg = num(op.fisik_gudang);
        if (fe < 0 || fg < 0) throw new Error('Stok fisik tidak boleh negatif');
        const dE = r3(fe - num(b.qty_etalase)), dG = r3(fg - num(b.qty_gudang)); b.qty_etalase = fe; b.qty_gudang = fg; recalcP(p);
        pending.push([p, 'OPNAME', (op.alasan || 'Selisih hitung') + ' · batch ' + b.no_batch, dE, dG, op.catatan || '', b.id_batch]);
      } else if (op.type === 'STATUS') {
        const b = S.batches.find(x => x.id_batch === op.id_batch), p = IX.P[b.id_produk]; b.status = op.status; if (op.catatan) b.catatan = op.catatan; recalcP(p);
        pending.push([p, 'BATCH_' + op.status, 'Batch ' + b.no_batch, 0, 0, op.catatan || '', b.id_batch]);
      }
    });
  } catch (e) { S.batches.forEach((b, i) => Object.assign(b, copyB[i])); S.products.forEach((p, i) => { p.stok_etalase = copyP[i].e; p.stok_gudang = copyP[i].g; }); throw e; }
  pending.forEach(a => localLog(...a));
}
function applyProductLocal(p, saldo) {
  let rec = IX.P[p.id_produk];
  if (rec) Object.assign(rec, p);
  else {
    rec = Object.assign({ stok_etalase: 0, stok_gudang: 0, aktif: true }, p); S.products.push(rec); IX.P[rec.id_produk] = rec;
    if (saldo && (num(saldo.etalase) > 0 || num(saldo.gudang) > 0)) {
      const b = { id_batch: saldo.id_batch, id_produk: rec.id_produk, no_batch: saldo.no_batch || 'SALDO-AWAL', tgl_exp: saldo.tgl_exp || '9999-12-31', supplier: '', no_faktur: '', tgl_masuk: ymd(), qty_awal: num(saldo.etalase) + num(saldo.gudang), qty_etalase: num(saldo.etalase), qty_gudang: num(saldo.gudang), status: 'AKTIF', catatan: 'Saldo awal' };
      S.batches.push(b); rec.stok_etalase = b.qty_etalase; rec.stok_gudang = b.qty_gudang; localLog(rec, 'SALDO_AWAL', 'Registrasi SKU baru', b.qty_etalase, b.qty_gudang, 'Saldo awal', b.id_batch);
    }
  }
}
function applyPurchaseLocal(f) {
  const rows = [];
  f.items.forEach(it => {
    const p = IX.P[it.id_produk], fk = unitFactor(p, it.satuan), act = r3(num(it.qty) * fk);
    const b = { id_batch: it.id_batch, id_produk: p.id_produk, no_batch: it.no_batch, tgl_exp: it.tgl_exp, supplier: f.supplier, no_faktur: f.no_faktur, tgl_masuk: f.tgl_terima, qty_awal: act, qty_etalase: 0, qty_gudang: act, status: 'AKTIF', catatan: '' };
    S.batches.push(b); p.harga_beli = Math.round(num(it.harga) * (1 - num(it.disc) / 100) / fk); rows.push([p, 'MASUK_GUDANG', it.qty + ' ' + it.satuan, 0, act, 'Faktur ' + f.no_faktur, b.id_batch]);
  });
  reindex(); f.items.forEach(it => recalcP(IX.P[it.id_produk])); rows.forEach(a => localLog(...a));
  const sub = f.items.reduce((a, it) => a + Math.round(num(it.qty) * num(it.harga) * (1 - num(it.disc) / 100)), 0), dpp = sub - Math.round(num(f.diskon)), ppn = Math.round(dpp * num(f.ppn_persen) / 100), total = dpp + ppn, tempo = f.metode_bayar === 'Tempo';
  S.purchases.push(Object.assign({}, f, { subtotal: sub, ppn, total, dibayar: tempo ? 0 : total, status: tempo ? 'BELUM LUNAS' : 'LUNAS', petugas: S.user.username, dibuat: nowStr(), riwayat_bayar: '[]' }));
}
// Agregasi laporan penjualan dari daftar transaksi
function salesAgg(list) {
  const ok = list.filter(t => t.status !== 'VOID'), o = { omzet: 0, laba: 0, n: ok.length, resep: 0, byDay: {}, byProd: {}, byMetode: {}, byKasir: {}, voids: list.length - ok.length };
  ok.forEach(t => {
    const d = String(t.tanggal_waktu).substr(0, 10); o.omzet += num(t.total_belanja); if (num(t.jml_resep) > 0 || t.nama_dokter) o.resep++;
    o.byDay[d] = (o.byDay[d] || 0) + num(t.total_belanja); o.byMetode[t.metode_bayar] = (o.byMetode[t.metode_bayar] || 0) + num(t.total_belanja); o.byKasir[t.kasir] = (o.byKasir[t.kasir] || 0) + num(t.total_belanja);
    let modal = 0; (t.items || []).forEach(l => { modal += num(l.modal); const k = l.id_produk, r = o.byProd[k] = o.byProd[k] || { nama: l.nama, qty: 0, omzet: 0, laba: 0, satuan: l.satuan }; r.qty += num(l.qty); r.omzet += num(l.subtotal); r.laba += num(l.subtotal) - num(l.modal); });
    o.laba += num(t.subtotal_obat) - modal + num(t.biaya_resep) - num(t.diskon);
  });
  return o;
}
