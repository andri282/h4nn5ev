# ⚡ Kelontong Bapak EV (nugrohoandri.ev)

Website katalog bursa motor listrik bekas teruji, spare part upgrade/konversi EV, dan kumpulan link rekomendasi tools affiliate pilihan milik **nugrohoandri.ev**.

Dibangun dengan arsitektur yang sama dengan web apps `byhannavi`: **100% Static Web + Google Sheets (Database Gratis & Real-time) + Bot Telegram Admin + WhatsApp Direct Inquiry**.

---

## 🛵 Fitur Utama

### 1. 🛵 Katalog Motor Listrik Bekas (`index.html`)
- Filter pintar berdasarkan Merek/Brand (Polytron, Alva, Gesits, Uwinfly, Smoot, Konversi Custom).
- Filter status unit: **Tersedia**, **Booking**, dan **Terjual**.
- Micro-grid spesifikasi teknis: Kapasitas Baterai (SOH %), Jarak Tempuh Real, Kelengkapan Surat (STNK/BPKB/Faktur), Lokasi Unit.
- Modal detail komprehensif + Tombol WhatsApp otomatis dengan template pesan ramah pembeli.
- Live search instan dan fitur pengurutan (harga terendah/termahal/tahun).

### 2. ⚙️ Katalog Spare Part & Komponen EV (`sparepart.html`)
- Display komponen: Baterai LiFePO4/NMC, Smart BMS JK Bluetooth, Controller VOTOL/Kelly/FarDriver, Dinamo Hub QS Motor, Fast Charger, Gas Throttle, Kabel AWG silikon tahan panas.
- Tag kompatibilitas kendaraan (Universal, Plug & Play, Konversi).
- Tombol order langsung via WhatsApp.

### 3. 🔗 Kumpulan Link Affiliate & Racun Tools (`affiliate.html`)
- Kurasi peralatan garasi EV: Mesin spot welder baterai, multimeter True RMS, tang crimping hidrolik, konektor Anderson, breaker MCB DC.
- Filter platform toko (**Shopee**, **Tokopedia**, **TikTok Shop**).
- **Catatan & Ulasan Teknis Bapak EV**: Mengapa produk ini direkomendasikan dan dipakai sendiri di garasi.
- Tombol direct link affiliate sekali klik.

### 4. 🧾 Modul Kasir & Cetak Nota Thermal (`invoice.html`)
- **Format Struk Kasir Thermal (58mm / 80mm)**: Didesain presisi untuk printer thermal kasir bluetooth / POS layaknya struk belanja Indomaret / Alfamart.
- **Rincian Transaksi Lengkap**: Item belanja, qty, harga satuan, subtotal, diskon, ongkir/jasa, total tagihan, jumlah bayar, dan kembalian.
- **Klausul Wajib Toko**: Tercantum tegas & rapi di bagian bawah struk: `*** BARANG YANG DIBELI TIDAK DAPAT DIKEMBALIKAN ***`.
- **Shortcut & Presets**: Tombol cepat pilih unit motor bekas dan spare part populer.
- **1-Klik Salin ke WhatsApp**: Buat teks struk rapi berformat WA untuk langsung dikirim ke chat pelanggan.
- **Riwayat Transaksi Lokal**: Tersimpan di browser sehingga Anda bisa cetak ulang struk kapan saja.

### 5. 🤖 Bot Telegram Admin (`google-apps-script/Code.gs`)
- Tambah unit motor bekas step-by-step: `/motor`
- Tambah spare part: `/sparepart`
- Tambah affiliate link: `/affiliate`
- Update status instan: `/sold <nama>`, `/booking <nama>`, `/ready <nama>`
- Hapus item: `/hapus <nama>`
- Cek stok langsung di Telegram: `/listmotor`, `/listsparepart`, `/listaffiliate`
- **Kirim foto motor langsung dari kamera/galeri Telegram** tanpa repot upload manual ke cloud!

### 6. ☁️ Google Sheets sebagai Database
- Menampung ribuan data secara gratis dan aman di akun Google Anda.
- Update data langsung tercermin di website secara real-time.

---

## 🛠️ Tech Stack
- **Frontend**: Semantic HTML5, Modern Vanilla CSS (Cyber Dark EV Aesthetic, Thermal Print Stylesheet `@media print`), Vanilla JavaScript ES6+.
- **Database**: Google Sheets (Published CSV endpoint) & LocalStorage (Riwayat Nota).
- **Backend / Bot**: Google Apps Script (Serverless, gratis).
- **Communication**: WhatsApp API & Telegram Bot API.
- **Hosting**: GitHub Pages / Cloudflare Pages / Vercel (100% Static).

---

## 📂 Struktur Folder
```
kelontong/
├── index.html              # Halaman Motor Listrik Bekas
├── sparepart.html          # Halaman Spare Part & Komponen EV
├── affiliate.html          # Halaman Kumpulan Link Affiliate & Rekomendasi
├── invoice.html            # Halaman Kasir & Cetak Nota Thermal (58mm / 80mm)
├── css/
│   └── style.css           # Design system, cyber dark theme, print stylesheet
├── js/
│   ├── config.js           # Konfigurasi WA, Brand, dan URL spreadsheet
│   ├── app.js              # Logika data Motor Bekas & Modal Spek
│   ├── sparepart.js        # Logika data Spare Part
│   ├── affiliate.js        # Logika data Affiliate
│   └── invoice.js          # Logika Kasir, kalkulasi nota & cetak thermal
├── google-apps-script/
│   └── Code.gs             # Backend Webhook Telegram Bot & Google Sheets
├── images/                 # Folder aset gambar & logo
├── README.md               # Dokumentasi project
└── SETUP.md                # Panduan instalasi langkah-demi-langkah
```

---

## 🚀 Panduan Setup Singkat

1. **Baca [SETUP.md](SETUP.md)** untuk panduan lengkap pembuatan Google Sheets, Bot Telegram di BotFather, dan Google Apps Script.
2. Edit file `js/config.js` untuk mengganti nomor WhatsApp dan ID Spreadsheet Google Anda.
3. Deploy folder ini ke GitHub Pages atau hosting static pilihan Anda!

---

*Curated with ⚡ for Kelontong Bapak EV by nugrohoandri.ev*
