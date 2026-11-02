# ⚡ Panduan Setup Lengkap: Kelontong Bapak EV

Panduan ini memandu Anda menghubungkan **Website Static**, **Google Sheets**, dan **Bot Telegram** agar website dapat berjalan otomatis dengan database gratis seumur hidup.

---

## 🏛️ Arsitektur Alur Kerja
```
[Admin di Telegram] ──> [Google Apps Script Webhook] ──> [Google Sheets Database]
                                                                  │
                                                        (Published CSV Live)
                                                                  ▼
[Pengunjung Web]    <── [WhatsApp Admin]        <───   [Website GitHub Pages]
```

---

## TAHAP 1: Setup Google Sheets

### 1.1 Buat Spreadsheet Baru
1. Buka [sheets.google.com](https://sheets.google.com)
2. Buat spreadsheet baru bernama: **kelontong-ev-data**
3. Salin **ID Spreadsheet** dari URL di browser:  
   `https://docs.google.com/spreadsheets/d/`**`[ID_SPREADSHEET_ANDA]`**`/edit`

### 1.2 Buat 3 Sheet (Tab) di Bagian Bawah
Buat tiga tab dengan nama persis seperti berikut:

#### Sheet 1: `MotorBekas`
Header di baris 1:
| nama | brand | tahun | jarak_tempuh | baterai | surat | kondisi | harga | deskripsi | foto | status | lokasi | tanggal |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

#### Sheet 2: `Sparepart`
Header di baris 1:
| nama | kategori | kompatibilitas | kondisi | harga | deskripsi | foto | status | tanggal |
|---|---|---|---|---|---|---|---|---|

#### Sheet 3: `Affiliate`
Header di baris 1:
| nama | kategori | platform | harga | catatan | link | foto | tanggal |
|---|---|---|---|---|---|---|---|

> 💡 **Tips Cepat:** Anda juga bisa menjalankan fungsi `/setup` via bot Telegram setelah terhubung, dan bot akan otomatis membuatkan header di atas!

### 1.3 Publish Spreadsheet ke Web (Publikasikan)
1. Di Google Sheets, klik menu **File → Bagikan (Share) → Publikasikan ke web (Publish to web)**.
2. Di opsi pertama, pilih **Seluruh dokumen (Entire Document)**.
3. Di tipe format, pilih **Nilai yang dipisahkan koma (.csv)**.
4. Klik tombol hijau **Publikasikan (Publish)** → Konfirmasi **OK**.

---

## TAHAP 2: Update Konfigurasi Website

Buka file [js/config.js](file:///home/andri/Documents/kelontong/js/config.js):

1. Masukkan nomor WhatsApp Anda (format tanpa +, contoh: `6282136538487`):
   ```javascript
   whatsapp: '6282136538487',
   ```
2. Ganti `SHEET_ID` dengan ID spreadsheet Anda dari Tahap 1.1:
   ```javascript
   sheetUrlMotor: 'https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_ANDA/gviz/tq?tqx=out:csv&sheet=MotorBekas',
   sheetUrlSparepart: 'https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_ANDA/gviz/tq?tqx=out:csv&sheet=Sparepart',
   sheetUrlAffiliate: 'https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_ANDA/gviz/tq?tqx=out:csv&sheet=Affiliate',
   ```
3. Sesuaikan nama toko jika diinginkan:
   ```javascript
   storeName: 'Kelontong Bapak EV',
   storeHandle: 'nugrohoandri.ev',
   storeTagline: 'Bursa Motor Listrik Bekas Teruji, Spare Part Upgrade, & Kumpulan Link Affiliate Pilihan.',
   storeLocation: 'Solo, Jawa Tengah (Bisa COD & Bantu Kirim se-Indonesia)',
   ```

---

## TAHAP 3: Setup Bot Telegram & Google Apps Script

### 3.1 Buat Bot Telegram
1. Buka aplikasi Telegram, cari [@BotFather](https://t.me/BotFather).
2. Kirim perintah `/newbot`.
3. Beri nama bot, contoh: `Kelontong Bapak EV Bot`.
4. Beri username bot berakhiran `_bot`, contoh: `kelontongbapakev_bot` atau `nugrohoandri_ev_bot`.
5. Salin **Token API** yang diberikan BotFather (contoh format: `7123456789:AAHxxxxx...`).

### 3.2 Cari Chat ID Telegram Anda
1. Buka [@userinfobot](https://t.me/userinfobot) di Telegram.
2. Klik **Start**.
3. Salin angka **Id** Anda (contoh: `123456789`).

### 3.3 Setup Google Apps Script
1. Buka [script.google.com](https://script.google.com) → Klik **New Project**.
2. Beri judul project: **Kelontong EV Backend**.
3. Buka file [google-apps-script/Code.gs](file:///home/andri/Documents/kelontong/google-apps-script/Code.gs) di project ini, salin seluruh kodenya, dan paste ke script editor Google.
4. Edit 3 baris konfigurasi di baris teratas:
   ```javascript
   const TELEGRAM_TOKEN = 'TOKEN_DARI_BOTFATHER';
   const SPREADSHEET_ID = 'ID_SPREADSHEET_ANDA';
   const ADMIN_CHAT_ID  = 'CHAT_ID_TELEGRAM_ANDA';
   ```
5. Klik ikon **Simpan (Save)** 💾.

### 3.4 Deploy Web App
1. Klik tombol biru **Deploy → New deployment** di pojok kanan atas.
2. Di sebelah *Select type*, klik ikon roda gigi ⚙️ → pilih **Web app**.
3. Konfigurasi:
   - **Description**: `Kelontong EV Bot v1`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` (Penting agar webhook Telegram bisa masuk)
4. Klik **Deploy** → Klik **Authorize access** (izinkan akses akun Google Anda).
5. Salin **Web app URL** yang dihasilkan.

### 3.5 Aktifkan Webhook Telegram
1. Di editor Google Apps Script, pada dropdown fungsi di atas (sebelah tombol *Debug*), pilih fungsi: **`setWebhook`**.
2. Klik tombol **▶ Run**.
3. Cek log eksekusi di bawah editor, pastikan ada output `{"ok":true, "description":"Webhook was set"}`.

### 3.6 Tes Bot Telegram
1. Buka bot Telegram yang telah Anda buat di Langkah 3.1.
2. Kirim perintah `/start` atau `/menu`.
3. Menu interaktif dengan tombol inline akan langsung muncul! ✨

---

## TAHAP 4: Deploy Website ke GitHub Pages

### 4.1 Inisialisasi Git & Push ke GitHub
Di terminal folder `kelontong`:
```bash
git init
git add .
git commit -m "🚀 Launch Kelontong Bapak EV Website"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/kelontong.git
git push -u origin main
```

### 4.2 Aktifkan GitHub Pages
1. Buka repository di browser: `https://github.com/USERNAME_ANDA/kelontong`
2. Klik tab **Settings → Pages**.
3. Pada bagian *Build and deployment*:
   - Source: **Deploy from a branch**
   - Branch: **main** | Folder: **/ (root)**
4. Klik **Save**.
5. Dalam 1-2 menit, website Anda sudah aktif di:  
   `https://USERNAME_ANDA.github.io/kelontong/`

---

## 📱 Panduan Penggunaan Harian Bot Telegram

| Perintah | Deskripsi |
|---|---|
| `/menu` atau `/start` | Membuka menu utama & tombol inline |
| `/motor` | Wizard tambah motor listrik bekas (nama, baterai, tahun, harga, foto) |
| `/sparepart` | Wizard tambah komponen/spare part baru |
| `/affiliate` | Wizard tambah link rekomendasi Shopee/Tokopedia |
| `/sold <nama>` | Mengubah status barang menjadi **Terjual** |
| `/booking <nama>` | Mengubah status menjadi **Booking** |
| `/ready <nama>` | Mengembalikan status menjadi **Tersedia** |
| `/listmotor` | Melihat seluruh stok motor saat ini langsung dari Telegram |
| `/listsparepart` | Melihat daftar stok spare part |
| `/listaffiliate` | Melihat daftar link affiliate |
| `/hapus <nama>` | Menghapus baris produk dari Google Sheets |
| `/batal` | Membatalkan langkah penambahan yang sedang berjalan |

---

*Curated with ⚡ for Kelontong Bapak EV by nugrohoandri.ev*
