// ===================================================================
//  Kelontong Bapak EV — Google Apps Script Backend & Telegram Bot
//  by nugrohoandri.ev
//
//  FITUR:
//  1. Telegram Bot untuk tambah motor bekas, spare part, dan affiliate link
//  2. Otomatis simpan ke Google Sheets (Database Gratis & Real-time)
//  3. Update status unit: /sold (Terjual), /booking, /ready (Tersedia)
//  4. Support kirim foto langsung via Telegram chat
//  5. Inisialisasi otomatis header 3 sheet jika belum ada
// ===================================================================

// ── CONFIG — EDIT BAGIAN INI SAAT SETUP ──
const TELEGRAM_TOKEN = 'PASTE_BOT_TOKEN_DARI_BOTFATHER_DISINI';
const SPREADSHEET_ID = 'PASTE_ID_SPREADSHEET_GOOGLE_DISINI';
const ADMIN_CHAT_ID  = 'PASTE_CHAT_ID_ANDA_DISINI'; // Chat ID admin pemilik bot

// ── Nama Sheet di Spreadsheet
const SHEET_MOTOR     = 'MotorBekas';
const SHEET_SPAREPART = 'Sparepart';
const SHEET_AFFILIATE = 'Affiliate';

// ── Cache Service untuk state conversation wizard
const cache = CacheService.getScriptCache();

// ─────────────────────────────────────────────
//  WEBHOOK ENTRYPOINT (doPost)
// ─────────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return HtmlService.createHtmlOutput('OK');
    }
    const update = JSON.parse(e.postData.contents);

    // Anti duplikasi webhook Telegram
    if (update.update_id) {
      const lockKey = 'upd_' + update.update_id;
      if (cache.get(lockKey)) {
        return HtmlService.createHtmlOutput('OK');
      }
      cache.put(lockKey, '1', 120);
    }

    handleUpdate(update);
  } catch (err) {
    Logger.log('Error doPost: ' + err.toString());
  }
  return HtmlService.createHtmlOutput('OK');
}

// ─────────────────────────────────────────────
//  ROUTER UPDATE TELEGRAM
// ─────────────────────────────────────────────
function handleUpdate(update) {
  // Tangani callback query (tombol inline)
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
    return;
  }

  const msg = update.message;
  if (!msg) return;

  const chatId = String(msg.chat.id);

  // Security: batasi hanya admin jika ADMIN_CHAT_ID diset
  if (ADMIN_CHAT_ID && ADMIN_CHAT_ID !== 'PASTE_CHAT_ID_ANDA_DISINI' && chatId !== ADMIN_CHAT_ID) {
    sendMessage(chatId, '⛔ Maaf, bot ini khusus untuk manajemen toko *Kelontong Bapak EV*.');
    return;
  }

  // Handle Command
  const text = (msg.text || '').trim();
  if (text.startsWith('/')) {
    handleCommand(chatId, text, msg);
    return;
  }

  // Handle Foto
  if (msg.photo && msg.photo.length > 0) {
    handlePhoto(chatId, msg);
    return;
  }

  // Handle Text saat dalam Wizard
  const state = getState(chatId);
  if (state) {
    handleWizardStep(chatId, text, state);
  } else {
    sendMainMenu(chatId);
  }
}

// ─────────────────────────────────────────────
//  COMMAND HANDLER
// ─────────────────────────────────────────────
function handleCommand(chatId, text, msg) {
  const parts = text.split(' ');
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  switch (cmd) {
    case '/start':
    case '/menu':
      clearState(chatId);
      sendMainMenu(chatId);
      break;

    case '/batal':
      clearState(chatId);
      sendMessage(chatId, '❌ Input dibatalkan. Kembali ke menu utama.');
      sendMainMenu(chatId);
      break;

    case '/motor':
    case '/tambahmotor':
      clearState(chatId);
      startMotorFlow(chatId);
      break;

    case '/sparepart':
    case '/tambahsparepart':
      clearState(chatId);
      startSparepartFlow(chatId);
      break;

    case '/affiliate':
    case '/tambahaffiliate':
      clearState(chatId);
      startAffiliateFlow(chatId);
      break;

    case '/listmotor':
      sendListItems(chatId, SHEET_MOTOR, '🛵 *DAFTAR STOK MOTOR LISTRIK BEKAS:*');
      break;

    case '/listsparepart':
      sendListItems(chatId, SHEET_SPAREPART, '⚙️ *DAFTAR SPARE PART & KOMPONEN EV:*');
      break;

    case '/listaffiliate':
      sendListItems(chatId, SHEET_AFFILIATE, '🔗 *DAFTAR LINK REKOMENDASI AFFILIATE:*');
      break;

    case '/sold':
      if (!arg) {
        sendMessage(chatId, 'ℹ️ Gunakan format:\n`/sold Nama Produk/Motor`\nContoh: `/sold Polytron Fox-R 2024`');
      } else {
        updateItemStatus(chatId, arg, 'Terjual');
      }
      break;

    case '/booking':
      if (!arg) {
        sendMessage(chatId, 'ℹ️ Gunakan format:\n`/booking Nama Produk/Motor`');
      } else {
        updateItemStatus(chatId, arg, 'Booking');
      }
      break;

    case '/ready':
    case '/available':
      if (!arg) {
        sendMessage(chatId, 'ℹ️ Gunakan format:\n`/ready Nama Produk/Motor`');
      } else {
        updateItemStatus(chatId, arg, 'Tersedia');
      }
      break;

    case '/hapus':
      if (!arg) {
        sendMessage(chatId, 'ℹ️ Gunakan format:\n`/hapus Nama Produk`');
      } else {
        deleteItem(chatId, arg);
      }
      break;

    case '/setup':
      setupSheetHeaders();
      sendMessage(chatId, '✅ Header untuk 3 sheet (MotorBekas, Sparepart, Affiliate) berhasil diinisialisasi di Google Sheets!');
      break;

    default:
      sendMessage(chatId, '❓ Perintah tidak dikenal. Ketik /menu untuk melihat pilihan menu.');
      break;
  }
}

// ─────────────────────────────────────────────
//  MENU UTAMA DENGAN INLINE BUTTONS
// ─────────────────────────────────────────────
function sendMainMenu(chatId) {
  const text = 
    '⚡ *Kelontong Bapak EV Bot*\n' +
    '_Sistem Manajemen Katalog Motor Bekas, Spare Part & Affiliate_\n\n' +
    'Silakan pilih menu di bawah ini:';

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🛵 Tambah Motor Bekas', callback_data: 'cmd_motor' },
        { text: '⚙️ Tambah Spare Part', callback_data: 'cmd_sparepart' }
      ],
      [
        { text: '🔗 Tambah Affiliate Link', callback_data: 'cmd_affiliate' }
      ],
      [
        { text: '📋 List Motor', callback_data: 'cmd_listmotor' },
        { text: '📋 List Spare Part', callback_data: 'cmd_listsparepart' },
        { text: '📋 List Affiliate', callback_data: 'cmd_listaffiliate' }
      ],
      [
        { text: '🛠️ Inisialisasi Header Sheets', callback_data: 'cmd_setup' }
      ]
    ]
  };

  sendKeyboard(chatId, text, keyboard);
}

function handleCallbackQuery(cb) {
  const chatId = String(cb.message.chat.id);
  const data = cb.data;

  // Answer callback to remove spinner
  apiCall('answerCallbackQuery', { callback_query_id: cb.id });

  if (data === 'cmd_motor') startMotorFlow(chatId);
  else if (data === 'cmd_sparepart') startSparepartFlow(chatId);
  else if (data === 'cmd_affiliate') startAffiliateFlow(chatId);
  else if (data === 'cmd_listmotor') sendListItems(chatId, SHEET_MOTOR, '🛵 *DAFTAR STOK MOTOR BEKAS:*');
  else if (data === 'cmd_listsparepart') sendListItems(chatId, SHEET_SPAREPART, '⚙️ *DAFTAR SPARE PART:*');
  else if (data === 'cmd_listaffiliate') sendListItems(chatId, SHEET_AFFILIATE, '🔗 *DAFTAR LINK AFFILIATE:*');
  else if (data === 'cmd_setup') {
    setupSheetHeaders();
    sendMessage(chatId, '✅ Header 3 sheet telah siap di Google Sheets!');
  }
}

// ─────────────────────────────────────────────
//  WIZARD: TAMBAH MOTOR BEKAS
// ─────────────────────────────────────────────
function startMotorFlow(chatId) {
  setState(chatId, { flow: 'motor', step: 1, data: {} });
  sendMessage(chatId, 
    '🛵 *TAMBAH MOTOR LISTRIK BEKAS (1/11)*\n\n' +
    'Ketik *Nama & Varian Unit*:\n' +
    '_Contoh: Polytron Fox-R 2024 Red Glossy (Fast Charge Ready)_'
  );
}

// ─────────────────────────────────────────────
//  WIZARD: TAMBAH SPARE PART
// ─────────────────────────────────────────────
function startSparepartFlow(chatId) {
  setState(chatId, { flow: 'sparepart', step: 1, data: {} });
  sendMessage(chatId, 
    '⚙️ *TAMBAH SPARE PART EV (1/7)*\n\n' +
    'Ketik *Nama Spare Part / Komponen*:\n' +
    '_Contoh: Baterai Pack LiFePO4 72V 45Ah Smart BMS Bluetooth_'
  );
}

// ─────────────────────────────────────────────
//  WIZARD: TAMBAH AFFILIATE LINK
// ─────────────────────────────────────────────
function startAffiliateFlow(chatId) {
  setState(chatId, { flow: 'affiliate', step: 1, data: {} });
  sendMessage(chatId, 
    '🔗 *TAMBAH LINK AFFILIATE (1/7)*\n\n' +
    'Ketik *Nama Produk Rekomendasi*:\n' +
    '_Contoh: Mesin Spot Welder Baterai Portabel 80 Gears OLED_'
  );
}

// ─────────────────────────────────────────────
//  STEP ENGINE WIZARD
// ─────────────────────────────────────────────
function handleWizardStep(chatId, input, state) {
  if (input.toLowerCase() === '/batal') {
    clearState(chatId);
    sendMessage(chatId, '❌ Proses input dibatalkan.');
    sendMainMenu(chatId);
    return;
  }

  // Flow: Motor Bekas
  if (state.flow === 'motor') {
    switch (state.step) {
      case 1:
        state.data.nama = input;
        state.step = 2;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(2/11) Merek/Brand Motor:*\n_Contoh: Polytron / Alva / Gesits / Uwinfly / Konversi_');
        break;
      case 2:
        state.data.brand = input;
        state.step = 3;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(3/11) Tahun Pembuatan / Perakitan:*\n_Contoh: 2024 atau 2023_');
        break;
      case 3:
        state.data.tahun = input;
        state.step = 4;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(4/11) Baterai & Kapasitas (Kondisi SOH):*\n_Contoh: 72V 52Ah LiFePO4 (SOH 98%)_');
        break;
      case 4:
        state.data.baterai = input;
        state.step = 5;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(5/11) Estimasi Jarak Tempuh Sekali Cas:*\n_Contoh: 110-120 KM_');
        break;
      case 5:
        state.data.jarak_tempuh = input;
        state.step = 6;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(6/11) Kelengkapan Surat & Pajak:*\n_Contoh: STNK + BPKB Lengkap Plat AD / Pajak On_');
        break;
      case 6:
        state.data.surat = input;
        state.step = 7;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(7/11) Kondisi Fisik / KM Odometer:*\n_Contoh: Like New, KM 2.400, Siap Pakai_');
        break;
      case 7:
        state.data.kondisi = input;
        state.step = 8;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(8/11) Harga Jual (Angka saja):*\n_Contoh: 14500000_');
        break;
      case 8:
        state.data.harga = input.replace(/\D/g, '');
        state.step = 9;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(9/11) Lokasi Unit Motor:*\n_Contoh: Solo Kota (Bisa Test Ride)_');
        break;
      case 9:
        state.data.lokasi = input;
        state.step = 10;
        setState(chatId, state);
        sendMessage(chatId, '🛵 *(10/11) Deskripsi & Kelengkapan Charger/Kunci:*\n_Ketik catatan unit atau "-" jika tidak ada_');
        break;
      case 10:
        state.data.deskripsi = input === '-' ? '' : input;
        state.step = 11;
        setState(chatId, state);
        sendMessage(chatId, 
          '🛵 *(11/11) Foto Motor:*\n\n' +
          'Silakan *kirim foto motor langsung* ke chat ini, atau ketik *URL foto* (misal dari Google Drive / Imgur / web).'
        );
        break;
      case 11:
        // Input text URL foto
        state.data.foto = input;
        saveMotorToSheet(chatId, state.data);
        break;
    }
    return;
  }

  // Flow: Spare Part
  if (state.flow === 'sparepart') {
    switch (state.step) {
      case 1:
        state.data.nama = input;
        state.step = 2;
        setState(chatId, state);
        sendMessage(chatId, '⚙️ *(2/7) Kategori Komponen:*\n_Contoh: Baterai & BMS / Controller / Dinamo & Motor / Charger & Adaptor / Gas & Saklar_');
        break;
      case 2:
        state.data.kategori = input;
        state.step = 3;
        setState(chatId, state);
        sendMessage(chatId, '⚙️ *(3/7) Kompatibilitas Kendaraan:*\n_Contoh: Universal 72V / Plug & Play Fox R / Motor Konversi_');
        break;
      case 3:
        state.data.kompatibilitas = input;
        state.step = 4;
        setState(chatId, state);
        sendMessage(chatId, '⚙️ *(4/7) Kondisi Barang:*\n_Contoh: Baru (Garansi 1 Tahun) atau Like New_');
        break;
      case 4:
        state.data.kondisi = input;
        state.step = 5;
        setState(chatId, state);
        sendMessage(chatId, '⚙️ *(5/7) Harga (Angka saja):*\n_Contoh: 8750000_');
        break;
      case 5:
        state.data.harga = input.replace(/\D/g, '');
        state.step = 6;
        setState(chatId, state);
        sendMessage(chatId, '⚙️ *(6/7) Deskripsi & Spesifikasi Singkat:*\n_Ketik catatan atau "-" jika tidak ada_');
        break;
      case 6:
        state.data.deskripsi = input === '-' ? '' : input;
        state.step = 7;
        setState(chatId, state);
        sendMessage(chatId, '⚙️ *(7/7) Foto Spare Part:*\n_Kirim foto langsung atau ketik URL foto_');
        break;
      case 7:
        state.data.foto = input;
        saveSparepartToSheet(chatId, state.data);
        break;
    }
    return;
  }

  // Flow: Affiliate Link
  if (state.flow === 'affiliate') {
    switch (state.step) {
      case 1:
        state.data.nama = input;
        state.step = 2;
        setState(chatId, state);
        sendMessage(chatId, '🔗 *(2/7) Kategori Produk:*\n_Contoh: Tools & Perakitan Baterai / Alat Ukur / Kabel & Konektor / Apparel_');
        break;
      case 2:
        state.data.kategori = input;
        state.step = 3;
        setState(chatId, state);
        sendMessage(chatId, '🔗 *(3/7) Platform Toko:*\n_Contoh: Shopee / Tokopedia / TikTok Shop_');
        break;
      case 3:
        state.data.platform = input;
        state.step = 4;
        setState(chatId, state);
        sendMessage(chatId, '🔗 *(4/7) Kisaran Harga (Angka saja):*\n_Contoh: 345000_');
        break;
      case 4:
        state.data.harga = input.replace(/\D/g, '');
        state.step = 5;
        setState(chatId, state);
        sendMessage(chatId, '🔗 *(5/7) Catatan / Alasan Rekomendasi Bapak EV:*\n_Contoh: Wajib punya buat rakit LiFePO4, titik las kuat dan presisi._');
        break;
      case 5:
        state.data.catatan = input;
        state.step = 6;
        setState(chatId, state);
        sendMessage(chatId, '🔗 *(6/7) Link Produk / Affiliate:*\n_Paste link Shopee/Tokopedia Anda_');
        break;
      case 6:
        state.data.link = input;
        state.step = 7;
        setState(chatId, state);
        sendMessage(chatId, '🔗 *(7/7) Foto Produk:*\n_Kirim foto langsung atau ketik URL foto_');
        break;
      case 7:
        state.data.foto = input;
        saveAffiliateToSheet(chatId, state.data);
        break;
    }
    return;
  }
}

// ─────────────────────────────────────────────
//  FOTO HANDLER DARI TELEGRAM
// ─────────────────────────────────────────────
function handlePhoto(chatId, msg) {
  const state = getState(chatId);
  if (!state) {
    sendMessage(chatId, 'ℹ️ Kirim foto saat sedang berada di langkah terakhir penambahan produk. Ketik /menu untuk mulai.');
    return;
  }

  // Ambil file foto ukuran terbesar (elemen terakhir array photo)
  const photos = msg.photo;
  const bestPhoto = photos[photos.length - 1];
  const fileUrl = getTelegramFileUrl(bestPhoto.file_id);

  if (state.flow === 'motor' && state.step === 11) {
    state.data.foto = fileUrl;
    saveMotorToSheet(chatId, state.data);
  } else if (state.flow === 'sparepart' && state.step === 7) {
    state.data.foto = fileUrl;
    saveSparepartToSheet(chatId, state.data);
  } else if (state.flow === 'affiliate' && state.step === 7) {
    state.data.foto = fileUrl;
    saveAffiliateToSheet(chatId, state.data);
  } else {
    sendMessage(chatId, '⚠️ Belum saatnya kirim foto. Selesaikan langkah sebelumnya terlebih dahulu.');
  }
}

function getTelegramFileUrl(fileId) {
  const res = apiCall('getFile', { file_id: fileId });
  if (res && res.ok && res.result.file_path) {
    return 'https://api.telegram.org/file/bot' + TELEGRAM_TOKEN + '/' + res.result.file_path;
  }
  return '';
}

// ─────────────────────────────────────────────
//  SAVE DATA KE GOOGLE SHEETS
// ─────────────────────────────────────────────
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function getTodayStr() {
  const d = new Date();
  const day = ('0' + d.getDate()).slice(-2);
  const mon = ('0' + (d.getMonth() + 1)).slice(-2);
  const yr  = d.getFullYear();
  return `${day}-${mon}-${yr}`;
}

// 1. Simpan Motor
function saveMotorToSheet(chatId, d) {
  try {
    const sheet = getSheet(SHEET_MOTOR);
    sheet.appendRow([
      d.nama || '',
      d.brand || '',
      d.tahun || '',
      d.jarak_tempuh || '',
      d.baterai || '',
      d.surat || '',
      d.kondisi || '',
      d.harga || '',
      d.deskripsi || '',
      d.foto || '',
      'Tersedia',
      d.lokasi || 'Solo',
      getTodayStr()
    ]);

    clearState(chatId);
    sendMessage(chatId, 
      '🎉 *BERHASIL MENAMBAHKAN MOTOR!* 🛵⚡\n\n' +
      `*Unit:* ${d.nama}\n` +
      `*Merek:* ${d.brand} (${d.tahun})\n` +
      `*Baterai:* ${d.baterai}\n` +
      `*Harga:* Rp ${parseInt(d.harga || 0).toLocaleString('id-ID')}\n` +
      `*Status:* Tersedia\n\n` +
      'Data sudah masuk ke Google Sheets dan otomatis live di website!'
    );
    sendMainMenu(chatId);
  } catch (err) {
    sendMessage(chatId, '❌ Terjadi kesalahan saat menyimpan ke Sheets: ' + err.toString());
  }
}

// 2. Simpan Spare Part
function saveSparepartToSheet(chatId, d) {
  try {
    const sheet = getSheet(SHEET_SPAREPART);
    sheet.appendRow([
      d.nama || '',
      d.kategori || '',
      d.kompatibilitas || '',
      d.kondisi || '',
      d.harga || '',
      d.deskripsi || '',
      d.foto || '',
      'Ready Stok',
      getTodayStr()
    ]);

    clearState(chatId);
    sendMessage(chatId, 
      '🎉 *BERHASIL MENAMBAHKAN SPARE PART!* ⚙️\n\n' +
      `*Part:* ${d.nama}\n` +
      `*Kategori:* ${d.kategori}\n` +
      `*Harga:* Rp ${parseInt(d.harga || 0).toLocaleString('id-ID')}\n` +
      `*Status:* Ready Stok\n\n` +
      'Produk sudah langsung tampil di halaman Spare Part!'
    );
    sendMainMenu(chatId);
  } catch (err) {
    sendMessage(chatId, '❌ Gagal menyimpan sparepart: ' + err.toString());
  }
}

// 3. Simpan Affiliate
function saveAffiliateToSheet(chatId, d) {
  try {
    const sheet = getSheet(SHEET_AFFILIATE);
    sheet.appendRow([
      d.nama || '',
      d.kategori || '',
      d.platform || '',
      d.harga || '',
      d.catatan || '',
      d.link || '',
      d.foto || '',
      getTodayStr()
    ]);

    clearState(chatId);
    sendMessage(chatId, 
      '🎉 *BERHASIL MENAMBAHKAN LINK AFFILIATE!* 🔗\n\n' +
      `*Produk:* ${d.nama}\n` +
      `*Platform:* ${d.platform}\n` +
      `*Harga:* Rp ${parseInt(d.harga || 0).toLocaleString('id-ID')}\n\n` +
      'Link rekomendasi telah tersimpan!'
    );
    sendMainMenu(chatId);
  } catch (err) {
    sendMessage(chatId, '❌ Gagal menyimpan affiliate: ' + err.toString());
  }
}

// ─────────────────────────────────────────────
//  UPDATE STATUS (TERJUAL / BOOKING / TERSEDIA)
// ─────────────────────────────────────────────
function updateItemStatus(chatId, query, newStatus) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const q = query.toLowerCase();
  let found = false;

  // Cek Sheet Motor (Status ada di kolom 11 / index K)
  const sheetMotor = ss.getSheetByName(SHEET_MOTOR);
  if (sheetMotor) {
    const data = sheetMotor.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase().includes(q)) {
        sheetMotor.getRange(i + 1, 11).setValue(newStatus);
        sendMessage(chatId, `✅ Status unit *${data[i][0]}* diubah menjadi *${newStatus}*!`);
        found = true;
        break;
      }
    }
  }

  // Jika tidak ditemukan di Motor, cek Sheet Sparepart (Status kolom 8 / H)
  if (!found) {
    const sheetPart = ss.getSheetByName(SHEET_SPAREPART);
    if (sheetPart) {
      const data = sheetPart.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().toLowerCase().includes(q)) {
          sheetPart.getRange(i + 1, 8).setValue(newStatus);
          sendMessage(chatId, `✅ Status spare part *${data[i][0]}* diubah menjadi *${newStatus}*!`);
          found = true;
          break;
        }
      }
    }
  }

  if (!found) {
    sendMessage(chatId, `⚠️ Tidak ditemukan item dengan nama yang cocok dengan "${query}".`);
  }
}

// ─────────────────────────────────────────────
//  DELETE ITEM
// ─────────────────────────────────────────────
function deleteItem(chatId, query) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const q = query.toLowerCase();
  const sheets = [SHEET_MOTOR, SHEET_SPAREPART, SHEET_AFFILIATE];
  let deleted = false;

  for (let s = 0; s < sheets.length; s++) {
    const sheet = ss.getSheetByName(sheets[s]);
    if (!sheet) continue;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase().includes(q)) {
        const itemName = data[i][0];
        sheet.deleteRow(i + 1);
        sendMessage(chatId, `🗑️ Item *${itemName}* berhasil dihapus dari sheet ${sheets[s]}.`);
        deleted = true;
        break;
      }
    }
    if (deleted) break;
  }

  if (!deleted) {
    sendMessage(chatId, `⚠️ Produk dengan nama "${query}" tidak ditemukan.`);
  }
}

// ─────────────────────────────────────────────
//  LIST ITEMS KE TELEGRAM
// ─────────────────────────────────────────────
function sendListItems(chatId, sheetName, headerTitle) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sendMessage(chatId, `⚠️ Sheet ${sheetName} belum dibuat.`);
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      sendMessage(chatId, `ℹ️ Belum ada item di ${sheetName}.`);
      return;
    }

    let text = `${headerTitle}\n\n`;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nama = row[0];
      const harga = row[7] || row[4] || row[3] || '0';
      const status = row[10] || row[7] || '';
      
      text += `${i}. *${nama}*\n`;
      text += `   💰 Rp ${parseInt(harga || 0).toLocaleString('id-ID')}`;
      if (status) text += ` • _(${status})_`;
      text += '\n\n';
    }

    sendMessage(chatId, text);
  } catch (err) {
    sendMessage(chatId, '❌ Gagal mengambil daftar: ' + err.toString());
  }
}

// ─────────────────────────────────────────────
//  AUTO SETUP SHEET HEADERS
// ─────────────────────────────────────────────
function setupSheetHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. MotorBekas
  let s1 = ss.getSheetByName(SHEET_MOTOR);
  if (!s1) s1 = ss.insertSheet(SHEET_MOTOR);
  if (s1.getLastRow() === 0) {
    s1.appendRow([
      'nama', 'brand', 'tahun', 'jarak_tempuh', 'baterai', 'surat', 
      'kondisi', 'harga', 'deskripsi', 'foto', 'status', 'lokasi', 'tanggal'
    ]);
    s1.getRange(1, 1, 1, 13).setFontWeight('bold');
  }

  // 2. Sparepart
  let s2 = ss.getSheetByName(SHEET_SPAREPART);
  if (!s2) s2 = ss.insertSheet(SHEET_SPAREPART);
  if (s2.getLastRow() === 0) {
    s2.appendRow([
      'nama', 'kategori', 'kompatibilitas', 'kondisi', 'harga', 
      'deskripsi', 'foto', 'status', 'tanggal'
    ]);
    s2.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  // 3. Affiliate
  let s3 = ss.getSheetByName(SHEET_AFFILIATE);
  if (!s3) s3 = ss.insertSheet(SHEET_AFFILIATE);
  if (s3.getLastRow() === 0) {
    s3.appendRow([
      'nama', 'kategori', 'platform', 'harga', 'catatan', 'link', 'foto', 'tanggal'
    ]);
    s3.getRange(1, 1, 1, 8).setFontWeight('bold');
  }
}

// ─────────────────────────────────────────────
//  TELEGRAM API CALLS & HELPERS
// ─────────────────────────────────────────────
function apiCall(method, payload) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/' + method;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    const res = UrlFetchApp.fetch(url, options);
    return JSON.parse(res.getContentText());
  } catch (e) {
    Logger.log('Telegram API Error: ' + e.toString());
    return null;
  }
}

function sendMessage(chatId, text) {
  return apiCall('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });
}

function sendKeyboard(chatId, text, replyMarkup) {
  return apiCall('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup
  });
}

// State Helper (CacheService 10 menit per user)
function getState(chatId) {
  const val = cache.get('state_' + chatId);
  return val ? JSON.parse(val) : null;
}

function setState(chatId, obj) {
  cache.put('state_' + chatId, JSON.stringify(obj), 600);
}

function clearState(chatId) {
  cache.remove('state_' + chatId);
}

// ─────────────────────────────────────────────
//  SET WEBHOOK SATU KLIK DARI EDITOR
// ─────────────────────────────────────────────
function setWebhook() {
  const webAppUrl = ScriptApp.getService().getUrl();
  if (!webAppUrl) {
    Logger.log('Deploy project sebagai Web App terlebih dahulu untuk mendapatkan URL.');
    return;
  }
  const res = apiCall('setWebhook', { url: webAppUrl });
  Logger.log('Set Webhook Result: ' + JSON.stringify(res));
}
