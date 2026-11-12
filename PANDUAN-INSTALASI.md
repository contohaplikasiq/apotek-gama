# APOTEK GAMA — Panduan Instalasi (v1.1.0)

Kasir · Inventori · Gudang · FEFO · PBF · Import · Backup · Mode Offline  
Lisensi / hak cipta © **Arraihan Academy**

Aplikasi terdiri dari dua bagian:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` + `appsscript.json` (berkas terpisah, bukan di ZIP) | Google Apps Script |
| **Frontend** | ZIP `apotek-gama` (`index.html`, `css/`, `js/`, `sw.js`, …) | GitHub Pages |

Semua data tersimpan di **satu folder Google Drive** milik akun Google Anda: `📁 APOTEK GAMA`.

---

## BAGIAN A — Pasang Backend (±5 menit)

1. Buka <https://script.google.com> → **Proyek baru**. Beri nama `APOTEK GAMA API`.
2. Hapus seluruh isi `Code.gs`, lalu **tempel isi `Kode.gs`**. (Boleh ganti nama berkas menjadi `Kode`.)
3. Klik ⚙ **Project Settings** → centang **Show "appsscript.json" manifest file in editor**. Kembali ke Editor, buka `appsscript.json`, **ganti seluruh isinya** dengan isi berkas `appsscript.json` yang diberikan. Simpan.
4. Pilih fungsi **`setupAppEnvironment`** di menu atas → **Run** → **Review permissions** → pilih akun → *Advanced* → *Go to … (unsafe)* → **Allow**.
5. Buka **Execution log** (bawah). **Catat dua hal yang hanya tampil sekali:**
   - 👤 `ID karyawan: admin` dan `PIN: ........` (akun Admin awal — wajib ganti PIN saat login pertama)
   - 🔐 `Nama pengguna: darurat` dan `Kata sandi: ................` (akses darurat bila semua akun terkunci)

   Setup membuat folder `📁 APOTEK GAMA` di Drive berisi: `🗃️ DB_ApotekGama` (database), `📂 Backup`, `📂 Import`, `📂 Exports`, serta memasang **backup otomatis tiap malam pukul 02.00**.
6. (Opsional, hanya untuk uji coba) jalankan **`isiDataDemo`** untuk memasukkan 5 obat contoh.
7. **Deploy → New deployment → ⚙ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → salin **Web app URL** yang berakhiran `/exec`.

> Setiap kali Anda mengubah `Kode.gs`: **Deploy → Manage deployments → ✏ → Version: New version → Deploy**. URL tidak berubah.

---

## BAGIAN B — Isi alamat backend di frontend

1. Ekstrak `apotek-gama.zip`. Folder hasil ekstraksi **`apotek-gama`** adalah folder proyek (di dalamnya langsung ada `index.html`).
2. Buka **`js/config.js`** dengan Notepad, ganti `GANTI_DENGAN_URL_EXEC` dengan URL `/exec` tadi:

```js
GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

URL ini bukan rahasia. Jangan ubah nilai lain.

---

## BAGIAN C — Pasang Frontend di GitHub Pages (lewat terminal)

> ⚠️ **Jangan** memakai tombol *Add file → Upload files* di web GitHub — struktur folder (`css/`, `js/`) akan rusak dan situs 404.

**C1. Install Git** — Windows: <https://git-scm.com/download/win> (pengaturan default). Mac: ketik `git --version` di Terminal. Cek: `git --version`.

**C2. Akun GitHub** — daftar di <https://github.com>. Username menjadi bagian alamat situs (`username.github.io`).

**C3. Identitas Git (sekali saja)**
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@akun-github-anda.com"
```

**C4. Buat repository** — github.com → **+** → **New repository** → nama `apotek-gama` → **Public** → *jangan* centang README/.gitignore/license → Create.

**C5. Masuk ke folder yang BENAR dan periksa isinya**

Folder kerja Anda adalah **folder `apotek-gama` hasil ekstraksi** (yang langsung berisi `index.html`), bukan folder di atasnya dan bukan di dalamnya.
```powershell
cd "C:\Users\NAMA\Downloads\apotek-gama"
dir
```
Harus terlihat: `index.html`, `sw.js`, `manifest.webmanifest`, folder `css`, `js`, `icons`. Tidak boleh ada berkas `.gs`. Jika yang terlihat hanya satu folder lagi bernama `apotek-gama`, masuk satu level (`cd apotek-gama`) sebelum lanjut.

**C6. Push pertama** (satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/apotek-gama.git
git push -u origin main
```
Saat diminta *Password*, tempel **Personal Access Token** (bukan password akun): GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate → centang **repo** → salin `ghp_...`. Saat mengetik/paste token layar tampak kosong — itu normal; tekan Enter.

**C7. Aktifkan Pages** — repo → **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main** / **(root)** → **Save**. Tunggu 1–2 menit; alamat situs: `https://USERNAME.github.io/apotek-gama/`

**C8. Memperbarui aplikasi** (mis. setelah mengubah `config.js`): di folder yang sama
```bash
git add .
git commit -m "Pembaruan"
git push
```
Jika Anda mengubah berkas aplikasi, naikkan `VER` di `sw.js` (mis. `gama-v1.0.1`) agar perangkat mengambil versi baru.

---

## BAGIAN D — Pemakaian pertama

1. Buka alamat situs → login `admin` + PIN dari log → **ganti PIN** saat diminta.
2. **Pengaturan → Apotek**: isi nama, alamat, SIA, apoteker penanggung jawab, tarif tuslah/embalase, lebar kertas struk.
3. **Pengaturan → Pengguna**: buat akun Kasir/Apoteker/Gudang (PIN min. 6 karakter).
4. Isi data obat: **Import & Backup** (Excel/CSV) atau **Inventori → Obat baru**.
5. Pasang sebagai aplikasi: menu browser → *Install app / Tambahkan ke layar utama*.

**Peran:** Admin (semua) · Apoteker (kasir, inventori, gudang, PBF, laporan, void) · Kasir (kasir, riwayat) · Gudang (inventori, mutasi, faktur).

### Mode offline
- Setelah login online **sekali** di sebuah perangkat, aplikasi dan data obat tersimpan di perangkat dan tetap terbuka tanpa internet.
- Saat offline: kasir, mutasi, opname, faktur tetap bisa dipakai. Indikator bawah menampilkan **Offline · N menunggu**.
- Saat internet kembali, antrean terkirim otomatis dan idempoten (tidak ada transaksi ganda). Jika server menolak (mis. stok sudah habis di terminal lain), item ditandai **Perlu tinjau** di panel antrean (ikon 📤) — Anda bisa coba lagi atau membuangnya.
- Login offline hanya untuk akun yang pernah masuk di perangkat itu.

### Aturan bisnis yang dijaga server
FEFO otomatis · batch expired/karantina/retur tidak bisa dijual atau dimutasi · harga, total, tuslah & embalase dihitung ulang server · stok etalase tidak boleh minus · obat keras wajib mode Resep + nama pasien & dokter · faktur ganda ditolak · batch & ED wajib saat barang masuk · void mengembalikan stok ke batch asal.

---

## BAGIAN E — Import data

### Dari komputer (Excel / CSV)
**Import & Backup → Import dari komputer** → pilih *Data obat + stok awal* atau *Supplier* → **Unduh template** → isi → pilih berkas → **Periksa dulu (simulasi)** → **Impor**.
- Nama kolom fleksibel (mis. `Kode`, `Nama Obat`, `Stok`, `ED`).
- Tanggal ED: `YYYY-MM-DD`, `31/12/2028`, atau `12/2027`.
- Kode/barcode adalah kunci: mengimpor ulang tidak membuat data ganda; batch yang sama tidak ditambah dua kali.
- Excel (.xlsx) memuat pustaka pembaca dari internet sekali; bila tidak tersedia, simpan sebagai CSV.

### Dari aplikasi lama (Apotek Kita)
1. Buka spreadsheet **DB_ApotekKita** → **Bagikan** → tambahkan akun Google pemilik APOTEK GAMA sebagai *Pelihat*.
2. **Import & Backup → Import dari aplikasi lama** → tempel link spreadsheet → **Simulasi** → periksa ringkasan → **Import sekarang**.
3. Obat, batch, transaksi, supplier, faktur, shift, log stok, dan pengaturan dipindahkan dengan ID aslinya (aman diulang; hanya data baru yang ditambah — centang *Perbarui* untuk menimpa).
4. **Pengguna** ikut dipindahkan dengan **PIN baru** yang tampil sekali di layar (PIN lama tidak bisa dibawa). Mereka wajib menggantinya saat login pertama.

---

## BAGIAN F — Backup & pemulihan
- **Otomatis** tiap malam 02.00 → file `💾 BACKUP_ApotekGama` di folder `📂 Backup` (selalu **1 salinan terbaru**).
- **Backup sekarang** (manual), **Ekspor Excel ke Drive** (folder `📂 Exports`), **Unduh CSV** obat/transaksi ke komputer.
- **Pulihkan dari backup**: mengganti semua data dengan isi backup (ketik `PULIHKAN`). Gunakan hanya bila data rusak.

---

## BAGIAN G — Keamanan
- ID spreadsheet/folder dan rahasia sesi disimpan di **Script Properties**, bukan di kode, Sheets, atau frontend.
- PIN disimpan sebagai hash bersalt; batas 5 percobaan salah lalu terkunci 10 menit.
- Jangan membagikan spreadsheet `DB_ApotekGama` (berisi hash PIN). Untuk memutus semua sesi: jalankan `rotasiSecretSesi`. Untuk membuat akses darurat baru: `resetAksesDarurat`.
- Frontend hanya memuat URL `/exec` (publik).

---

## BAGIAN H — Masalah umum
| Gejala | Penyebab / solusi |
|---|---|
| Login: "Konfigurasi belum lengkap" | `GAS_URL` di `js/config.js` belum diisi → isi, lalu `git add . && git commit -m x && git push` |
| Halaman putih / CSS tidak termuat (404) | Struktur folder salah saat push → pastikan `index.html` di root repo, folder `css/` & `js/` utuh |
| "Database belum dibuat" | Jalankan `setupAppEnvironment` di editor Apps Script |
| Ubah kode backend tapi tidak berefek | Deploy → Manage deployments → New version |
| Import lama: "tidak bisa dibuka" | Bagikan DB_ApotekKita ke akun pemilik APOTEK GAMA |
| Perangkat tidak memuat versi baru | Naikkan `VER` di `sw.js`, push, lalu muat ulang 2 kali |
| Email laporan tidak terkirim / muncul pesan "izin" | Jalankan `aktifkanLaporanEmail` di editor, lalu deploy New version (Bagian I) |
| Lupa PIN Admin | Pakai **Akses darurat** di halaman login, lalu reset PIN di Pengaturan → Pengguna |

---

## BAGIAN I — Laporan email otomatis ke owner (v1.1)

Tiga jenis laporan dikirim ke email owner:

| Laporan | Kapan | Isi |
|---|---|---|
| **Tutup kasir** | Setiap shift ditutup | Omzet, laba kotor, rekonsiliasi kas (modal, seharusnya, fisik, **selisih**), per metode bayar, produk terlaris |
| **Rekap mingguan** | Tiap **Senin 07.00** (Senin–Minggu lalu) | Omzet & tren vs minggu sebelumnya, omzet per hari/metode/kasir, 10 produk terlaris, nilai persediaan, ED mendekat/expired, stok perlu dipesan, hutang PBF jatuh tempo, selisih kas shift |
| **Rekap bulanan** | Tiap **tanggal 1, 07.00** (bulan lalu) | Isi sama dengan mingguan untuk satu bulan |

### Cara mengaktifkan (sekali saja)
1. **Perbarui backend**: ganti isi `Kode.gs` **dan** `appsscript.json` di Apps Script dengan versi terbaru (ada izin baru `script.send_mail`).
2. Pilih fungsi **`aktifkanLaporanEmail`** → **Run** → **Review permissions → Allow** (memberi izin kirim email & memasang jadwal Senin/tanggal 1).
3. **Deploy → Manage deployments → ✏ → Version: New version → Deploy** (URL tidak berubah).
4. **Perbarui frontend**: ganti berkas aplikasi dengan versi 1.1.0 (pertahankan `GAS_URL` di `js/config.js`), lalu `git add .` → `git commit -m "v1.1.0"` → `git push`.
5. Di aplikasi (login **Admin**): **Pengaturan → Laporan Email** → isi email owner → centang laporan yang diinginkan → **Simpan** → **Kirim email uji**.

Tombol **Kirim rekap mingguan/bulanan sekarang** dipakai untuk melihat contoh laporan kapan saja.

### Catatan
- Email dikirim lewat akun Google pemilik aplikasi (kuota akun Gmail biasa ±100 email/hari — jauh di atas kebutuhan).
- Jika shift ditutup saat kasir **offline**, laporan terkirim setelah data tersinkron ke server.
- Alamat email owner tersimpan di Script Properties (server), tidak terlihat oleh Kasir/Gudang. Email tidak masuk? Cek folder **Spam**.
- Mematikan laporan: hapus centang di Pengaturan → Laporan Email → Simpan.

© Arraihan Academy — seluruh hak cipta dilindungi.
