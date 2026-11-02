// =============================================
//  Kelontong Bapak EV — Global Config
//  by nugrohoandri.ev
//  Edit file ini sesuai dengan kebutuhan Anda
// =============================================

const CONFIG = {
  // ── Nomor WhatsApp Admin / Penjual (format internasional tanpa tanda +)
  // Contoh: '6281234567890'
  whatsapp: '6282136538487',

  // ── Identitas Brand
  storeName: 'Kelontong Bapak EV',
  storeHandle: 'nugrohoandri.ev',
  storeTagline: 'Bursa Motor Listrik Bekas Teruji, Spare Part Upgrade, & Kumpulan Link Affiliate Pilihan.',
  storeLocation: 'Bolon, Colomadu, Karanganyar',

  // ── Header Khusus Cetak Nota Thermal
  receiptTitle: 'Kelontong Bapak',
  receiptSub: 'EV Parts Shop',
  receiptAddress: 'Bolon, Colomadu, Karanganyar',

  // ── Rekening Pembayaran (Ditampilkan pada pesan WA saat status Belum Lunas / DP)
  bankAccounts: {
    'BCA': { bank: 'BCA', no: '079-xxxx-xxxx', name: 'Andri Nugroho' },
    'Mandiri': { bank: 'Mandiri', no: '138-xxxx-xxxx', name: 'Andri Nugroho' },
    'BRI': { bank: 'BRI', no: '012-xxxx-xxxx', name: 'Andri Nugroho' }
  },
  bankName: 'BCA',
  bankAccount: '079-xxxx-xxxx',
  bankHolder: 'Andri Nugroho',

  // ── Google Sheets Published CSV URLs
  // Setelah publish spreadsheet ke web, ganti SHEET_ID dengan ID spreadsheet Google Anda.
  // Selama masih 'SHEET_ID', website akan otomatis memakai Mode Demo (data contoh realistis).
  sheetUrlMotor: 'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=MotorBekas',
  sheetUrlSparepart: 'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=Sparepart',
  sheetUrlAffiliate: 'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=Affiliate',

  // ── Media Sosial & Channel (opsional, tampil di header/footer)
  instagram: 'nugrohoandri.ev',
  tiktok: 'nugrohoandri.ev',
  youtube: 'nugrohoandri',
  telegram: 'nugrohoandri_ev',
};
