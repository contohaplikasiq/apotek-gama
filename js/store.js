'use strict';
/* APOTEK GAMA · store.js — IndexedDB, state, indeks · © Arraihan Academy */
const IDB = {
  db: null,
  open() { return new Promise(res => { try { const r = indexedDB.open('apotek-gama', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); } catch (e) { res(false); } }); },
  get(k) { return new Promise(res => { if (!this.db) return res(undefined); try { const q = this.db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch (e) { res(undefined); } }); },
  set(k, v) { return new Promise(res => { if (!this.db) return res(false); try { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); } catch (e) { res(false); } }); },
  del(k) { return new Promise(res => { if (!this.db) return res(false); try { const t = this.db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(true); t.onerror = () => res(false); } catch (e) { res(false); } }); }
};
const CFG0 = { namaApotek: 'APOTEK GAMA', alamat: '', telp: '', wa: '', no_sia: '', no_sipa: '', nama_apa: '', no_stra: '', sia_berakhir: '', tarif_tuslah: 1500, tarif_embalase: 750, ppn_persen: 11, ed_alert_hari: 90, kertas: '80', footer: 'Semoga Lekas Sembuh & Sehat Selalu' };
const DATA_KEYS = ['cfg', 'products', 'batches', 'suppliers', 'purchases', 'shifts', 'users', 'trx', 'logs', 'vers', 'trxRow', 'logRow', 'owner'];
const S = { cfg: Object.assign({}, CFG0), products: [], batches: [], suppliers: [], purchases: [], shifts: [], users: [], trx: [], logs: [], vers: {}, trxRow: 0, logRow: 0, owner: '', token: '', user: null, shift: null, server: '', lastSync: '', cur: 'dashboard' };
let Q = [];
const IX = { P: {}, SKU: {}, BP: {} };
function reindex() {
  IX.P = {}; IX.SKU = {}; IX.BP = {};
  S.products.forEach(p => { IX.P[p.id_produk] = p; IX.SKU[String(p.kode_sku)] = p; });
  S.batches.forEach(b => { (IX.BP[b.id_produk] = IX.BP[b.id_produk] || []).push(b); });
  Object.values(IX.BP).forEach(a => a.sort((x, y) => String(x.tgl_exp) < String(y.tgl_exp) ? -1 : 1));
}
const saveSnap = debounce(() => { const o = {}; DATA_KEYS.forEach(k => o[k] = S[k]); IDB.set('snap', o); }, 700);
function saveQ() { IDB.set('queue', Q); }
function saveAuth() { IDB.set('auth', { token: S.token, user: S.user, shift: S.shift }); }
function resetData() { S.cfg = Object.assign({}, CFG0); ['products', 'batches', 'suppliers', 'purchases', 'shifts', 'users', 'trx', 'logs'].forEach(k => S[k] = []); S.vers = {}; S.trxRow = 0; S.logRow = 0; reindex(); }
const isRole = (...r) => !!S.user && r.indexOf(S.user.role) >= 0;
const R_JUAL = ['Admin', 'Apoteker', 'Kasir'], R_STOK = ['Admin', 'Apoteker', 'Gudang'], R_APT = ['Admin', 'Apoteker'], R_ADM = ['Admin'];
