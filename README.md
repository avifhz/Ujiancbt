# CBT Enterprise - Versi Google Apps Script + Siap GitHub Pages

Paket 9 file ini sudah **terhubung langsung** ke Google Spreadsheet & akun Google Anda:
- **Google Spreadsheet ID**: `15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w`
- **Link Spreadsheet**: https://docs.google.com/spreadsheets/d/15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w/edit?hl=id&gid=2098441566#gid=2098441566
- **Akun Google Pemilik / Deployer**: `avifzein@gmail.com`

---

## Isi 9 File di Dalam ZIP
1. `Code.gs` — Backend Google Apps Script sudah terhubung ke Spreadsheet `15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w` (`SPREADSHEET_ID`) + API `doGet?api=1` & `doPost`.
2. `appsscript.json` — Manifes izin OAuth lengkap (`spreadsheets`, `drive`, `forms`, `documents`, `send_mail`, `external_request`).
3. `index.html` — Halaman **CBT Siswa** (huruf kecil untuk halaman utama GitHub Pages).
4. `Index.html` — Halaman **CBT Siswa** (untuk ditempel ke editor Apps Script).
5. `Admin.html` — Panel Admin CBT (Bank Soal, Data Siswa, Link Google Form per mapel, Pengaturan).
6. `Proktor.html` — Panel Proktor / Pengawas ujian.
7. `gas-config.js` — Konfigurasi URL Web App Apps Script (`/exec`) + ID Spreadsheet.
8. `gas-bridge.js` — Penghubung otomatis `google.script.run` agar berjalan di GitHub Pages (dilengkapi diagnosa & ganti URL langsung).
9. `README.md` — Panduan ini.

---

## Langkah Memasang (Wajib agar Data Sinkron ke Spreadsheet!)

### Langkah 1 — Pasang & Deploy `Code.gs` Terbaru di Apps Script (`avifzein@gmail.com`)
> **PENTING:** Website di GitHub Pages **tidak dapat membaca/menyimpan data ke Spreadsheet** jika Apps Script masih memakai `Code.gs` versi lama (yang belum memiliki fungsi `doPost` dan `doGet?api=1`) atau jika aksesnya bukan *"Siapa saja"*.

1. Login ke browser menggunakan akun Google **`avifzein@gmail.com`**.
2. Buka Google Spreadsheet: https://docs.google.com/spreadsheets/d/15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w/edit?hl=id&gid=2098441566#gid=2098441566
3. Klik menu **Ekstensi > Apps Script**.
4. Salin & ganti **SELURUH** isi file **`Code.gs`** dengan isi `Code.gs` dari ZIP ini, lalu klik **Simpan** (Ctrl+S). Ganti juga `Index.html`, `Admin.html`, `Proktor.html`, dan `appsscript.json` (aktifkan *Setelan Proyek > Tampilkan file manifes appsscript.json*).
5. Klik **Deploy > Kelola Deployment** (ikon pensil > **Versi Baru**) atau **Deploy > Deployment baru** (Aplikasi Web):
   - **Jalankan sebagai**: *Saya (`avifzein@gmail.com`)*
   - **Yang memiliki akses**: *Siapa saja (Anyone)*
6. Klik **Terapkan** dan setujui izin akses (Authorize).
7. **Salin URL Aplikasi Web (`https://script.google.com/macros/s/.../exec`)** hasil deploy tersebut.

### Langkah 2 — Pasang URL `/exec` ke `gas-config.js` & Upload ke GitHub Pages
1. Buka file **`gas-config.js`** dan pastikan `window.CBT_GAS_EXEC_URL` berisi **URL `/exec` baru hasil Langkah 1**.
2. Upload **semua 9 file** ke branch `main` repository GitHub Anda, lalu aktifkan **Settings > Pages > Deploy from a branch (`main / root`)**.
3. Jika halaman GitHub Pages sudah terlanjur dibuka namun belum sinkron, akan muncul kotak **"Koneksi GitHub ↔ Spreadsheet Belum Sinkron"** di bagian bawah layar — Anda cukup menempelkan URL `/exec` baru lalu klik **Simpan & Tes Koneksi** (dan perbarui `gas-config.js` di GitHub agar seluruh perangkat siswa otomatis terhubung).
