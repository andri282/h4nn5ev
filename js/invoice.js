// ===================================================================
//  Kelontong Bapak EV — Kasir & Cetak Nota Thermal (POS Invoice)
//  by nugrohoandri.ev
// ===================================================================

let invoiceItems = [];
let currentPaperSize = '58';
let availableProducts = [];

// ── Format Rupiah
function formatRupiah(val) {
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatAngka(val) {
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
}

// ── Generate Nomor Invoice Otomatis
function generateInvoiceNo() {
  const now = new Date();
  const yr = String(now.getFullYear()).slice(-2);
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const rnd = Math.floor(100 + Math.random() * 900); // 3 digit
  return `KEV-${yr}${mo}${da}-${rnd}`;
}

// ── Format Tanggal Waktu Sekarang
function getCurrentDateTime() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

// ── Tambah Baris Item Baru
function addItemRow(name = '', price = 0, qty = 1) {
  const itemId = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  invoiceItems.push({
    id: itemId,
    name: name,
    price: parseInt(price, 10) || 0,
    qty: parseInt(qty, 10) || 1
  });
  renderItemsTable();
  updateReceipt();
}

// ── Hapus Baris Item
function deleteItemRow(itemId) {
  invoiceItems = invoiceItems.filter(item => item.id !== itemId);
  if (invoiceItems.length === 0) {
    addItemRow('', 0, 1);
  } else {
    renderItemsTable();
    updateReceipt();
  }
}

// ── Render Form Items Table
function renderItemsTable() {
  const tbody = document.getElementById('itemsTableBody');
  if (!tbody) return;

  tbody.innerHTML = invoiceItems.map((item, index) => {
    const subtotal = item.price * item.qty;
    return `
      <tr data-id="${item.id}">
        <td style="width: 45%;">
          <input type="text" class="form-control item-name-input" 
            placeholder="Nama unit / sparepart / jasa..." 
            value="${escapeHtml(item.name)}" 
            oninput="handleItemChange('${item.id}', 'name', this.value)">
        </td>
        <td style="width: 15%;">
          <input type="number" min="1" class="form-control item-qty-input" 
            value="${item.qty}" 
            oninput="handleItemChange('${item.id}', 'qty', this.value)">
        </td>
        <td style="width: 25%;">
          <input type="number" min="0" step="1000" class="form-control item-price-input" 
            placeholder="Rp" 
            value="${item.price}" 
            oninput="handleItemChange('${item.id}', 'price', this.value)">
        </td>
        <td style="width: 15%; text-align: right; font-weight: 700; color: var(--cyan);" class="font-mono">
          ${formatRupiah(subtotal)}
        </td>
        <td style="width: 5%; text-align: center;">
          <button type="button" class="item-delete-btn" onclick="deleteItemRow('${item.id}')" title="Hapus item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Handle Perubahan Data Item
function handleItemChange(itemId, field, value) {
  const item = invoiceItems.find(i => i.id === itemId);
  if (!item) return;

  if (field === 'name') {
    item.name = value;
  } else if (field === 'qty') {
    item.qty = Math.max(1, parseInt(value, 10) || 1);
  } else if (field === 'price') {
    item.price = Math.max(0, parseInt(value, 10) || 0);
  }

  // Update subtotal cell in that row
  const row = document.querySelector(`tr[data-id="${itemId}"]`);
  if (row) {
    const subtotalEl = row.children[3];
    if (subtotalEl) subtotalEl.textContent = formatRupiah(item.price * item.qty);
  }

  updateReceipt();
}

function getGrandTotal() {
  const discount = Math.max(0, parseInt(document.getElementById('discountInput').value, 10) || 0);
  const otherFee = Math.max(0, parseInt(document.getElementById('otherFeeInput').value, 10) || 0);
  const subtotal = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  return Math.max(0, subtotal - discount + otherFee);
}

// ── Sync Status Toggle Buttons UI
function syncStatusButtons(status) {
  document.querySelectorAll('.pay-status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.paystatus === status);
  });
}

// ── Handle Input Manual Nominal Bayar
function handlePaidInputChange() {
  const paidVal = Math.max(0, parseInt(document.getElementById('paidInput').value, 10) || 0);
  const grandTotal = getGrandTotal();
  const hiddenInput = document.getElementById('payStatusInput');

  // Sinkronkan status tombol secara otomatis berdasarkan nominal yang diketik
  if (paidVal === 0) {
    if (hiddenInput) hiddenInput.value = 'BELUM LUNAS';
    syncStatusButtons('BELUM LUNAS');
  } else if (paidVal > 0 && paidVal < grandTotal) {
    if (hiddenInput) hiddenInput.value = 'DP';
    syncStatusButtons('DP');
  } else if (paidVal >= grandTotal && grandTotal > 0) {
    if (hiddenInput) hiddenInput.value = 'LUNAS';
    syncStatusButtons('LUNAS');
  }
  updateReceipt();
}

// ── Set Payment Status (BELUM LUNAS / DP / LUNAS)
function setPaymentStatus(status) {
  const hiddenInput = document.getElementById('payStatusInput');
  if (hiddenInput) hiddenInput.value = status;
  syncStatusButtons(status);

  const grandTotal = getGrandTotal();
  const paidInput = document.getElementById('paidInput');
  const paidLabel = document.getElementById('paidInputLabel');
  const paidHint = document.getElementById('paidInputHint');

  if (status === 'BELUM LUNAS') {
    if (paidInput) paidInput.value = 0;
    if (paidLabel) paidLabel.textContent = 'Jumlah Pembayaran Masuk (Rp)';
    if (paidHint) paidHint.textContent = 'Nilai 0 = Belum ada pembayaran (nota tagihan awal dikirim via WA ke pelanggan).';
  } else if (status === 'DP') {
    if (paidLabel) paidLabel.textContent = 'Jumlah Uang Muka / DP Diterima (Rp)';
    if (paidHint) paidHint.textContent = 'Masukkan nominal DP yang sudah ditransfer/diterima.';
    if (paidInput && (parseInt(paidInput.value, 10) === 0 || parseInt(paidInput.value, 10) === grandTotal)) {
      paidInput.value = '';
      paidInput.placeholder = 'Contoh: 500000';
      paidInput.focus();
    }
  } else if (status === 'LUNAS') {
    if (paidInput) paidInput.value = grandTotal;
    if (paidLabel) paidLabel.textContent = 'Jumlah Pembayaran Diterima (Rp)';
    if (paidHint) paidHint.textContent = 'Otomatis diisi lunas. Bisa disesuaikan jika uang tunai berlebih.';
  }

  updateReceipt();
}

// ── Update Thermal Receipt Real-time
function updateReceipt() {
  const invNo = document.getElementById('invNumber').value || 'KEV-NOTA-001';
  const invDate = document.getElementById('invDate').value || getCurrentDateTime();
  const invKasir = document.getElementById('invKasir').value || 'Mas Andri';
  const custName = document.getElementById('custName').value || 'Pelanggan Umum';
  const custPhone = document.getElementById('custPhone').value || '-';
  const custVehicle = document.getElementById('custVehicle').value || '-';
  const payMethod = document.getElementById('payMethod').value || 'Transfer BCA';
  const payStatus = document.getElementById('payStatusInput').value || 'BELUM LUNAS';

  const discount = Math.max(0, parseInt(document.getElementById('discountInput').value, 10) || 0);
  const otherFee = Math.max(0, parseInt(document.getElementById('otherFeeInput').value, 10) || 0);
  const paidAmount = Math.max(0, parseInt(document.getElementById('paidInput').value, 10) || 0);

  // Subtotal items
  const subtotal = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  const grandTotal = Math.max(0, subtotal - discount + otherFee);
  
  // Perhitungan sisa / kembalian berdasarkan status
  let remainingAmount = grandTotal;
  let changeAmount = 0;

  if (payStatus === 'BELUM LUNAS') {
    remainingAmount = grandTotal;
    changeAmount = 0;
  } else if (payStatus === 'DP') {
    remainingAmount = Math.max(0, grandTotal - paidAmount);
    changeAmount = 0;
  } else if (payStatus === 'LUNAS') {
    remainingAmount = 0;
    changeAmount = Math.max(0, paidAmount - grandTotal);
  }

  // Update calculation box on form
  document.getElementById('calcSubtotal').textContent = formatRupiah(subtotal);
  document.getElementById('calcGrandTotal').textContent = formatRupiah(grandTotal);
  
  const calcRemLabel = document.getElementById('calcRemainingLabel');
  const calcRem = document.getElementById('calcRemaining');
  if (payStatus === 'LUNAS') {
    calcRemLabel.textContent = 'Kembalian:';
    calcRemLabel.style.color = 'var(--emerald)';
    calcRem.textContent = formatRupiah(changeAmount);
    calcRem.style.color = 'var(--emerald)';
  } else {
    calcRemLabel.textContent = 'Sisa Tagihan:';
    calcRemLabel.style.color = 'var(--rose)';
    calcRem.textContent = formatRupiah(remainingAmount);
    calcRem.style.color = 'var(--rose)';
  }

  // Update Thermal Receipt Header Meta
  document.getElementById('receiptNo').textContent = invNo;
  document.getElementById('receiptDate').textContent = invDate;
  document.getElementById('receiptKasir').textContent = invKasir;
  document.getElementById('receiptCust').textContent = custName;
  document.getElementById('receiptPhone').textContent = custPhone;
  
  const vehicleRow = document.getElementById('receiptVehicleRow');
  if (custVehicle && custVehicle !== '-') {
    vehicleRow.style.display = 'flex';
    document.getElementById('receiptVehicle').textContent = custVehicle;
  } else {
    vehicleRow.style.display = 'none';
  }

  // Update Receipt Items List
  const itemsContainer = document.getElementById('receiptItemsList');
  itemsContainer.innerHTML = invoiceItems.map(item => {
    const itemSub = item.price * item.qty;
    const nameDisplay = item.name.trim() || 'Spare Part / Jasa';
    return `
      <div class="receipt-item-row">
        <div class="receipt-item-title">${escapeHtml(nameDisplay)}</div>
        <div class="receipt-item-details">
          <span>${item.qty} x ${formatAngka(item.price)}</span>
          <span>${formatAngka(itemSub)}</span>
        </div>
      </div>
    `;
  }).join('');

  // Update Totals on Receipt
  document.getElementById('receiptSubtotal').textContent = formatAngka(subtotal);
  
  const discountRow = document.getElementById('receiptDiscountRow');
  if (discount > 0) {
    discountRow.style.display = 'flex';
    document.getElementById('receiptDiscount').textContent = '-' + formatAngka(discount);
  } else {
    discountRow.style.display = 'none';
  }

  const feeRow = document.getElementById('receiptFeeRow');
  if (otherFee > 0) {
    feeRow.style.display = 'flex';
    document.getElementById('receiptFee').textContent = formatAngka(otherFee);
  } else {
    feeRow.style.display = 'none';
  }

  document.getElementById('receiptGrandTotal').textContent = 'Rp ' + formatAngka(grandTotal);

  // Status & Payment rows on Thermal Receipt
  const payLabel = document.getElementById('receiptPayMethodLabel');
  const payVal = document.getElementById('receiptPaid');
  const remLabel = document.getElementById('receiptRemainingLabel');
  const remVal = document.getElementById('receiptRemaining');
  const statusStamp = document.getElementById('receiptStatusStamp');
  const footerNote = document.getElementById('receiptFooterNote');

  if (payStatus === 'BELUM LUNAS') {
    payLabel.textContent = 'Status Bayar';
    payVal.textContent = 'BELUM LUNAS';
    remLabel.textContent = 'SISA TAGIHAN';
    remVal.textContent = 'Rp ' + formatAngka(grandTotal);
    
    statusStamp.textContent = '*** BELUM LUNAS (TAGIHAN) ***';
    statusStamp.style.borderStyle = 'dashed';
    statusStamp.style.color = '#000';
    footerNote.textContent = 'Simpan nota ini sebagai rincian pesanan & tagihan pembayaran.';
  } else if (payStatus === 'DP') {
    payLabel.textContent = 'DP / Uang Muka (' + payMethod + ')';
    payVal.textContent = 'Rp ' + formatAngka(paidAmount);
    remLabel.textContent = 'SISA TAGIHAN';
    remVal.textContent = 'Rp ' + formatAngka(remainingAmount);
    
    statusStamp.textContent = '*** STATUS: DP / UANG MUKA ***';
    statusStamp.style.borderStyle = 'dashed';
    statusStamp.style.color = '#000';
    footerNote.textContent = 'Uang muka diterima. Harap lunasi sisa tagihan saat barang diambil/kirim.';
  } else if (payStatus === 'LUNAS') {
    payLabel.textContent = 'Bayar (' + payMethod + ')';
    payVal.textContent = 'Rp ' + formatAngka(paidAmount || grandTotal);
    remLabel.textContent = 'Kembalian';
    remVal.textContent = 'Rp ' + formatAngka(changeAmount);
    
    statusStamp.textContent = '*** LUNAS ***';
    statusStamp.style.borderStyle = 'solid';
    statusStamp.style.color = '#000';
    footerNote.textContent = 'Terima Kasih atas Kepercayaan Anda!';
  }
}

// ── Set Paper Size (58mm vs 80mm)
function setPaperSize(size) {
  currentPaperSize = size;
  const receipt = document.getElementById('thermalReceipt');
  receipt.classList.remove('size-58', 'size-80');
  receipt.classList.add(`size-${size}`);

  document.querySelectorAll('.paper-size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

// ── Cetak Nota Thermal (Menggunakan Iframe Terisolasi — 100% Anti-Blank)
function printThermalReceipt() {
  updateReceipt();
  saveInvoiceToHistory(false);

  const receiptEl = document.getElementById('thermalReceipt');
  const is80 = currentPaperSize === '80';
  const receiptHtml = receiptEl.innerHTML;
  const invNo = document.getElementById('invNumber').value || 'KEV-NOTA';

  // Siapkan iframe terisolasi khusus cetak
  let printFrame = document.getElementById('thermalPrintIframe');
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'thermalPrintIframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Nota_${invNo}</title>
      <style>
        @page {
          margin: 0;
          size: ${is80 ? '80mm auto' : '58mm auto'};
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          color: #000000 !important;
          background-color: transparent !important;
        }
        html, body {
          background: #ffffff !important;
          color: #000000 !important;
          font-family: 'Courier New', Courier, monospace;
          margin: 0;
          padding: 0;
          width: ${is80 ? '80mm' : '58mm'};
        }
        .thermal-receipt {
          width: ${is80 ? '80mm' : '58mm'};
          max-width: ${is80 ? '80mm' : '58mm'};
          margin: 0;
          padding: 4mm 3mm;
          font-size: ${is80 ? '12px' : '10.5px'};
          line-height: 1.35;
          background: #ffffff !important;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .receipt-store-title {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .receipt-store-sub {
          font-size: 10.5px;
          line-height: 1.3;
        }
        .receipt-divider {
          border: none;
          border-top: 1px dashed #000000;
          margin: 6px 0;
        }
        .receipt-divider-double {
          border: none;
          border-top: 2px solid #000000;
          margin: 6px 0;
        }
        .receipt-meta {
          font-size: 10px;
          margin-bottom: 4px;
        }
        .receipt-meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .receipt-item-row {
          margin-bottom: 6px;
        }
        .receipt-item-title {
          font-weight: 700;
          font-size: 11px;
          word-break: break-word;
        }
        .receipt-item-details {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        .receipt-totals {
          margin-top: 4px;
        }
        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          margin-bottom: 3px;
        }
        .receipt-total-row.grand-total {
          font-size: 13px;
          font-weight: 900;
          border-top: 1px dashed #000000;
          border-bottom: 1px dashed #000000;
          padding: 4px 0;
          margin: 6px 0;
        }
        .receipt-disclaimer-box {
          border: 1px dashed #000000;
          padding: 6px 4px;
          margin: 8px 0 6px;
          text-align: center;
        }
        .receipt-disclaimer-text {
          font-size: 9.5px;
          font-weight: 900;
          line-height: 1.3;
        }
        .receipt-footer {
          text-align: center;
          font-size: 10px;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="thermal-receipt size-${is80 ? '80' : '58'}">
        ${receiptHtml}
      </div>
    </body>
    </html>
  `);
  frameDoc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      window.print();
    }
  }, 250);
}

// ── Helper Salin Teks ke Clipboard dengan Fallback
function copyTextToClipboard(textToCopy) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(textToCopy);
  } else {
    return new Promise((resolve, reject) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        successful ? resolve() : reject(new Error('execCommand copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  }
}

// ── Salin Format Struk ke Teks WhatsApp (Simpel, Bersih & Ramah)
function copyReceiptToWhatsApp() {
  const invNo = document.getElementById('invNumber').value || 'KEV-NOTA';
  const invDate = document.getElementById('invDate').value || getCurrentDateTime();
  const rawCustName = (document.getElementById('custName').value || '').trim();
  const custName = (rawCustName && rawCustName !== 'Pelanggan Umum') ? rawCustName : '';
  const custPhone = (document.getElementById('custPhone').value || '').trim();
  const custVehicle = (document.getElementById('custVehicle').value || '').trim();
  const payMethod = document.getElementById('payMethod').value || 'Transfer BCA';
  const payStatus = document.getElementById('payStatusInput').value || 'BELUM LUNAS';

  const discount = Math.max(0, parseInt(document.getElementById('discountInput').value, 10) || 0);
  const otherFee = Math.max(0, parseInt(document.getElementById('otherFeeInput').value, 10) || 0);
  const paidAmount = Math.max(0, parseInt(document.getElementById('paidInput').value, 10) || 0);

  const subtotal = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  const grandTotal = Math.max(0, subtotal - discount + otherFee);
  
  let remainingAmount = grandTotal;
  let changeAmount = 0;
  if (payStatus === 'BELUM LUNAS') {
    remainingAmount = grandTotal;
  } else if (payStatus === 'DP') {
    remainingAmount = Math.max(0, grandTotal - paidAmount);
  } else if (payStatus === 'LUNAS') {
    changeAmount = Math.max(0, paidAmount - grandTotal);
  }

  // Pilih rekening bank sesuai metode bayar yang dipilih di form
  let currentBank = CONFIG.bankName || 'BCA';
  let currentAccount = CONFIG.bankAccount || '079-xxxx-xxxx';
  let currentHolder = CONFIG.bankHolder || 'Andri Nugroho';

  if (CONFIG.bankAccounts) {
    if (payMethod.includes('Mandiri') && CONFIG.bankAccounts['Mandiri']) {
      currentBank = CONFIG.bankAccounts['Mandiri'].bank;
      currentAccount = CONFIG.bankAccounts['Mandiri'].no;
      currentHolder = CONFIG.bankAccounts['Mandiri'].name;
    } else if (payMethod.includes('BRI') && CONFIG.bankAccounts['BRI']) {
      currentBank = CONFIG.bankAccounts['BRI'].bank;
      currentAccount = CONFIG.bankAccounts['BRI'].no;
      currentHolder = CONFIG.bankAccounts['BRI'].name;
    } else if (payMethod.includes('BCA') && CONFIG.bankAccounts['BCA']) {
      currentBank = CONFIG.bankAccounts['BCA'].bank;
      currentAccount = CONFIG.bankAccounts['BCA'].no;
      currentHolder = CONFIG.bankAccounts['BCA'].name;
    }
  }

  // Susun pesan WhatsApp yang simpel, bersih, & mudah dibaca di layar HP
  let text = '';
  if (custName) {
    text += `Halo ${custName}, berikut invoicenya nggih:\n\n`;
  } else {
    text += `Halo, berikut invoicenya nggih:\n\n`;
  }

  text += `*Kelontong Bapak — EV Parts Shop*\n`;
  text += `No. Nota: ${invNo}\n`;
  text += `Tanggal: ${invDate}\n`;
  if (custVehicle && custVehicle !== '-') {
    text += `Catatan/Part: ${custVehicle}\n`;
  }
  text += `\n`;

  text += `*Rincian Pesanan:*\n`;
  invoiceItems.forEach((item, idx) => {
    const sub = item.price * item.qty;
    const itemName = item.name.trim() || 'Spare Part';
    text += `${idx + 1}. ${itemName} (${item.qty}x) : Rp ${formatAngka(sub)}\n`;
  });
  text += `\n`;

  // Tampilkan subtotal jika ada diskon atau biaya lain
  if (discount > 0 || otherFee > 0) {
    text += `Subtotal: Rp ${formatAngka(subtotal)}\n`;
    if (discount > 0) text += `Diskon: -Rp ${formatAngka(discount)}\n`;
    if (otherFee > 0) text += `Ongkir/Jasa: Rp ${formatAngka(otherFee)}\n`;
  }
  text += `*Total Tagihan: Rp ${formatAngka(grandTotal)}*\n`;

  if (payStatus === 'BELUM LUNAS') {
    text += `Status: *BELUM LUNAS*\n`;
    text += `*Sisa Tagihan: Rp ${formatAngka(grandTotal)}*\n\n`;

    if (payMethod.toLowerCase().includes('tunai') || payMethod.toLowerCase().includes('cash')) {
      text += `Pembayaran: *Tunai / Cash di Bengkel*\n`;
      text += `(Bolon, Colomadu, Karanganyar)\n\n`;
    } else if (payMethod.toLowerCase().includes('qris')) {
      text += `Pembayaran via *QRIS Kelontong Bapak*\n`;
      text += `(Scan QRIS saat ambil barang / QRIS dikirim di chat ini)\n\n`;
    } else {
      text += `Silakan transfer pembayaran ke:\n`;
      text += `Bank *${currentBank}*: *${currentAccount}*\n`;
      text += `A.n: *${currentHolder}*\n`;
      text += `_(Kirim bukti transfer ke chat ini nggih)_\n\n`;
    }
  } else if (payStatus === 'DP') {
    text += `Status: *DP / UANG MUKA*\n`;
    text += `DP Diterima: Rp ${formatAngka(paidAmount)} (${payMethod})\n`;
    text += `*Sisa Tagihan: Rp ${formatAngka(remainingAmount)}*\n\n`;

    text += `Sisa pembayaran dapat ditransfer ke:\n`;
    text += `Bank *${currentBank}*: *${currentAccount}* a.n *${currentHolder}*\n\n`;
  } else if (payStatus === 'LUNAS') {
    text += `Status: *LUNAS*\n`;
    text += `Pembayaran: Rp ${formatAngka(paidAmount || grandTotal)} (${payMethod})\n`;
    if (changeAmount > 0) {
      text += `Kembalian: Rp ${formatAngka(changeAmount)}\n`;
    }
    text += `\n`;
  }

  text += `_Catatan: Barang yang dibeli tidak dapat dikembalikan._\n\n`;
  text += `Matur suwun! 🙏⚡`;

  // Salin ke clipboard & buka WhatsApp otomatis jika no HP diisi
  copyTextToClipboard(text).then(() => {
    showToast('✅ Teks invoice WhatsApp disalin! Siap dikirim.');
    
    if (custPhone && custPhone.length >= 8) {
      let cleanPhone = custPhone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  }).catch(() => {
    showToast('Teks siap disalin, periksa izin clipboard browser.');
  });
}

// ── Simpan Nota Sebagai File PDF (Vector Direct PDF — 100% Anti-Blank di Lokal PC / file://)
function saveReceiptAsPDF() {
  updateReceipt();
  saveInvoiceToHistory(false);

  const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!jsPDFClass) {
    showToast('⚠️ Library jsPDF belum termuat, beralih ke dialog cetak...');
    printThermalReceipt();
    return;
  }

  showToast('⏳ Sedang memproses file PDF nota...');

  try {
    const is80 = currentPaperSize === '80';
    const pageWidth = is80 ? 80 : 58;
    const margin = is80 ? 5 : 3.5;
    const printableWidth = pageWidth - (margin * 2);
    const centerX = pageWidth / 2;
    const rightX = pageWidth - margin;
    const leftX = margin;

    // Ambil data transaksi dari form
    const invNo = document.getElementById('invNumber').value || 'KEV-NOTA';
    const invDate = document.getElementById('invDate').value || getCurrentDateTime();
    const invKasir = document.getElementById('invKasir').value || 'Mas Andri';
    const custName = document.getElementById('custName').value || 'Pelanggan Umum';
    const custPhone = document.getElementById('custPhone').value || '-';
    const custVehicle = document.getElementById('custVehicle').value || '-';
    const payMethod = document.getElementById('payMethod').value || 'Transfer BCA';
    const payStatus = document.getElementById('payStatusInput').value || 'BELUM LUNAS';

    const discount = Math.max(0, parseInt(document.getElementById('discountInput').value, 10) || 0);
    const otherFee = Math.max(0, parseInt(document.getElementById('otherFeeInput').value, 10) || 0);
    const paidAmount = Math.max(0, parseInt(document.getElementById('paidInput').value, 10) || 0);

    const subtotal = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    const grandTotal = Math.max(0, subtotal - discount + otherFee);
    
    let remainingAmount = grandTotal;
    let changeAmount = 0;
    if (payStatus === 'BELUM LUNAS') {
      remainingAmount = grandTotal;
    } else if (payStatus === 'DP') {
      remainingAmount = Math.max(0, grandTotal - paidAmount);
    } else if (payStatus === 'LUNAS') {
      changeAmount = Math.max(0, paidAmount - grandTotal);
    }

    const title = CONFIG.receiptTitle || 'Kelontong Bapak';
    const sub = CONFIG.receiptSub || 'EV Parts Shop';
    const addr = CONFIG.receiptAddress || 'Bolon, Colomadu, Karanganyar';
    let rawWa = CONFIG.whatsapp || '6282136538487';
    let prettyWa = rawWa.startsWith('62') ? '0' + rawWa.slice(2) : rawWa;
    if (prettyWa.length >= 11) {
      prettyWa = prettyWa.slice(0, 4) + '-' + prettyWa.slice(4, 8) + '-' + prettyWa.slice(8);
    }
    const waStr = 'WA: ' + prettyWa;

    // Hitung estimasi tinggi halaman secara proporsional sesuai jumlah baris
    let estItemsH = 0;
    invoiceItems.forEach(item => {
      const nameStr = item.name.trim() || 'Spare Part';
      const linesCount = Math.ceil(nameStr.length / (is80 ? 28 : 20)) || 1;
      estItemsH += (linesCount * 3.2) + 4.0;
    });

    const extraMetaCount = (custPhone && custPhone !== '-' ? 1 : 0) + (custVehicle && custVehicle !== '-' ? 1 : 0);
    const extraTotalsCount = (discount > 0 ? 1 : 0) + (otherFee > 0 ? 1 : 0);

    const pageHeight = Math.ceil(
      6 + // margin atas
      19 + // header toko
      (13 + extraMetaCount * 3.2) + // meta
      6 + // header items
      estItemsH + // rincian item
      (20 + extraTotalsCount * 3.4) + // totals
      16 + // disclaimer box
      9 + // footer note
      12 + // stamp
      8 // margin bawah
    );

    // Buat dokumen PDF murni (vektor teks tajam tanpa canvas)
    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    doc.setFont('courier', 'normal');
    doc.setTextColor(0, 0, 0);

    let y = 6;

    // Helper garis putus-putus
    function drawDashedLine(posY) {
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(leftX, posY, rightX, posY);
      doc.setLineDashPattern([], 0);
    }

    // Helper garis solid
    function drawSolidLine(posY, width) {
      doc.setLineWidth(width || 0.35);
      doc.setLineDashPattern([], 0);
      doc.line(leftX, posY, rightX, posY);
    }

    // ── 1. Header Toko
    doc.setFont('courier', 'bold');
    doc.setFontSize(is80 ? 13 : 11);
    doc.text(title, centerX, y, { align: 'center' });
    y += 4.2;

    doc.setFontSize(is80 ? 10 : 9);
    doc.text(sub, centerX, y, { align: 'center' });
    y += 3.8;

    doc.setFont('courier', 'normal');
    doc.setFontSize(is80 ? 8 : 7.2);
    doc.text(addr, centerX, y, { align: 'center' });
    y += 3.2;
    doc.text(waStr, centerX, y, { align: 'center' });
    y += 4;

    drawSolidLine(y, 0.4);
    y += 3.5;

    // ── 2. Meta Transaksi
    doc.setFontSize(is80 ? 8.5 : 7.5);
    function printMetaRow(label, val, isBoldVal) {
      doc.setFont('courier', 'normal');
      doc.text(label, leftX, y);
      if (isBoldVal) doc.setFont('courier', 'bold');
      doc.text(String(val), rightX, y, { align: 'right' });
      doc.setFont('courier', 'normal');
      y += 3.2;
    }

    printMetaRow('No. Nota :', invNo, true);
    printMetaRow('Tanggal  :', invDate, false);
    printMetaRow('Kasir    :', invKasir, false);
    printMetaRow('Pembeli  :', custName, true);
    if (custPhone && custPhone !== '-') printMetaRow('No. HP   :', custPhone, false);
    if (custVehicle && custVehicle !== '-') printMetaRow('Motor/Ket:', custVehicle, false);

    y += 1;
    drawDashedLine(y);
    y += 3.5;

    // ── 3. Header Item
    doc.setFont('courier', 'bold');
    doc.setFontSize(is80 ? 8.5 : 7.5);
    doc.text('ITEM BARANG', leftX, y);
    doc.text('TOTAL', rightX, y, { align: 'right' });
    y += 2;
    drawDashedLine(y);
    y += 3.5;

    // ── 4. Rincian Item
    doc.setFont('courier', 'normal');
    invoiceItems.forEach(item => {
      const subVal = item.price * item.qty;
      const nameStr = item.name.trim() || 'Spare Part';
      
      doc.setFont('courier', 'bold');
      const wrappedLines = doc.splitTextToSize(nameStr, printableWidth);
      wrappedLines.forEach(line => {
        doc.text(line, leftX, y);
        y += 3.2;
      });

      doc.setFont('courier', 'normal');
      doc.text(`${item.qty} x ${formatAngka(item.price)}`, leftX + 1.5, y);
      doc.text(formatAngka(subVal), rightX, y, { align: 'right' });
      y += 4;
    });

    y += 0.5;
    drawDashedLine(y);
    y += 3.5;

    // ── 5. Totals
    function printTotalRow(label, valStr, isBold) {
      if (isBold) doc.setFont('courier', 'bold');
      else doc.setFont('courier', 'normal');
      doc.text(label, leftX, y);
      doc.text(valStr, rightX, y, { align: 'right' });
      doc.setFont('courier', 'normal');
      y += 3.4;
    }

    printTotalRow('Subtotal', formatAngka(subtotal), false);
    if (discount > 0) printTotalRow('Diskon', '-' + formatAngka(discount), false);
    if (otherFee > 0) printTotalRow('Ongkir / Jasa', formatAngka(otherFee), false);

    y += 0.5;
    doc.setFont('courier', 'bold');
    doc.setFontSize(is80 ? 9.5 : 8.5);
    doc.text('TOTAL TAGIHAN', leftX, y);
    doc.text('Rp ' + formatAngka(grandTotal), rightX, y, { align: 'right' });
    doc.setFontSize(is80 ? 8.5 : 7.5);
    y += 4;

    if (payStatus === 'BELUM LUNAS') {
      printTotalRow('Status Bayar', 'BELUM LUNAS', false);
      doc.setFont('courier', 'bold');
      doc.text('SISA TAGIHAN', leftX, y);
      doc.text('Rp ' + formatAngka(grandTotal), rightX, y, { align: 'right' });
      y += 4;
    } else if (payStatus === 'DP') {
      printTotalRow('DP (' + payMethod + ')', 'Rp ' + formatAngka(paidAmount), false);
      doc.setFont('courier', 'bold');
      doc.text('SISA TAGIHAN', leftX, y);
      doc.text('Rp ' + formatAngka(remainingAmount), rightX, y, { align: 'right' });
      y += 4;
    } else if (payStatus === 'LUNAS') {
      printTotalRow('Bayar (' + payMethod + ')', 'Rp ' + formatAngka(paidAmount || grandTotal), false);
      if (changeAmount > 0) {
        printTotalRow('Kembalian', 'Rp ' + formatAngka(changeAmount), false);
      }
      y += 1;
    }

    y += 2;

    // ── 6. Kotak Disclaimer (2 Baris Rapi, Tidak Melebar Keluar Kotak)
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1, 1], 0);
    const boxH = 9.5;
    doc.rect(leftX, y, printableWidth, boxH);
    doc.setLineDashPattern([], 0);

    doc.setFont('courier', 'bold');
    doc.setFontSize(is80 ? 7.6 : 6.8);
    doc.text('BARANG YANG DIBELI', centerX, y + 3.8, { align: 'center' });
    doc.text('TIDAK DAPAT DIKEMBALIKAN', centerX, y + 7.4, { align: 'center' });
    y += boxH + 4;

    // ── 7. Catatan Kaki
    doc.setFont('courier', 'normal');
    doc.setFontSize(is80 ? 7 : 6.2);
    const footNote = payStatus === 'LUNAS' 
      ? 'Terima Kasih atas Kepercayaan Anda!' 
      : 'Simpan bukti nota tagihan & pembayaran ini.';
    doc.text(footNote, centerX, y, { align: 'center' });
    y += 3;
    doc.text('Kelontong Bapak — EV Parts Shop', centerX, y, { align: 'center' });
    y += 4.5;

    // ── 8. Stempel Status (Format Ringkas & Proporsional)
    let stampText = '*** BELUM LUNAS ***';
    let stampBorderDashed = true;
    if (payStatus === 'DP') {
      stampText = '*** DP / UANG MUKA ***';
    } else if (payStatus === 'LUNAS') {
      stampText = '*** LUNAS ***';
      stampBorderDashed = false;
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(is80 ? 8.5 : 7.2);
    const stampW = Math.min(printableWidth - 6, doc.getTextWidth(stampText) + 8);
    const stampX = centerX - (stampW / 2);
    const stampH = 7.0;

    doc.setLineWidth(0.3);
    if (stampBorderDashed) doc.setLineDashPattern([1.5, 1], 0);
    doc.rect(stampX, y, stampW, stampH);
    doc.setLineDashPattern([], 0);

    doc.text(stampText, centerX, y + 4.8, { align: 'center' });

    // ── 9. Simpan & Download File PDF
    doc.save(`Nota-${invNo}.pdf`);
    showToast(`📄 File Nota-${invNo}.pdf berhasil didownload!`);
  } catch (err) {
    console.error('jsPDF generation error:', err);
    showToast('Beralih ke dialog cetak browser...');
    printThermalReceipt();
  }
}

// ── Reset Invoice Baru
function resetInvoiceForm() {
  if (confirm('Mulai transaksi baru? Data yang belum disimpan akan direset.')) {
    document.getElementById('invNumber').value = generateInvoiceNo();
    document.getElementById('invDate').value = getCurrentDateTime();
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custVehicle').value = '';
    document.getElementById('discountInput').value = 0;
    document.getElementById('otherFeeInput').value = 0;
    document.getElementById('paidInput').value = 0;
    
    invoiceItems = [];
    addItemRow('', 0, 1);
    setPaymentStatus('BELUM LUNAS');
    showToast('✨ Form nota baru siap digunakan (Status: Belum Lunas)!');
  }
}

// ── Simpan Invoice ke LocalStorage History
function saveInvoiceToHistory(showNotification = true) {
  const invNo = document.getElementById('invNumber').value;
  const history = getInvoiceHistory();

  // Hitung total
  const subtotal = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  const discount = Math.max(0, parseInt(document.getElementById('discountInput').value, 10) || 0);
  const otherFee = Math.max(0, parseInt(document.getElementById('otherFeeInput').value, 10) || 0);
  const grandTotal = Math.max(0, subtotal - discount + otherFee);
  const payStatus = document.getElementById('payStatusInput').value || 'BELUM LUNAS';
  const paid = parseInt(document.getElementById('paidInput').value, 10) || 0;

  const newRecord = {
    no: invNo,
    date: document.getElementById('invDate').value,
    cust: document.getElementById('custName').value || 'Pelanggan Umum',
    phone: document.getElementById('custPhone').value || '',
    vehicle: document.getElementById('custVehicle').value || '',
    payMethod: document.getElementById('payMethod').value,
    payStatus: payStatus,
    items: JSON.parse(JSON.stringify(invoiceItems)),
    subtotal: subtotal,
    discount: discount,
    otherFee: otherFee,
    grandTotal: grandTotal,
    paid: paid,
    savedAt: Date.now()
  };

  // Cek apakah invoice nomor ini sudah ada, jika ya update, jika tidak prepend
  const existingIdx = history.findIndex(h => h.no === invNo);
  if (existingIdx >= 0) {
    history[existingIdx] = newRecord;
  } else {
    history.unshift(newRecord);
  }

  // Batasi riwayat 50 transaksi terakhir
  const trimmed = history.slice(0, 50);
  localStorage.setItem('kelontong_invoices', JSON.stringify(trimmed));
  renderInvoiceHistory();

  if (showNotification) {
    showToast('💾 Nota ' + invNo + ' berhasil disimpan ke riwayat!');
  }
}

function getInvoiceHistory() {
  try {
    const raw = localStorage.getItem('kelontong_invoices');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// ── Render Tabel Riwayat Transaksi
function renderInvoiceHistory() {
  const container = document.getElementById('invoiceHistoryBody');
  if (!container) return;

  const history = getInvoiceHistory();
  if (history.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
          Belum ada riwayat transaksi yang tersimpan.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = history.map((h, idx) => {
    const status = h.payStatus || (h.paid >= h.grandTotal && h.grandTotal > 0 ? 'LUNAS' : (h.paid > 0 ? 'DP' : 'BELUM LUNAS'));
    let badgeClass = 'belum-lunas';
    let statusLabel = '⏳ Belum Lunas';
    if (status === 'LUNAS') {
      badgeClass = 'lunas';
      statusLabel = '✅ Lunas';
    } else if (status === 'DP') {
      badgeClass = 'dp';
      statusLabel = '🟡 DP';
    }

    return `
      <tr>
        <td class="font-mono text-cyan" style="font-weight: 700;">${h.no}</td>
        <td style="font-size: 12.5px;">${h.date}</td>
        <td style="font-weight: 600;">${escapeHtml(h.cust)}</td>
        <td>
          <span class="badge-status ${badgeClass}" style="display:inline-block; font-size:10.5px; padding:3px 8px;">${statusLabel}</span>
        </td>
        <td style="font-size: 12px; color: var(--text-muted);">${h.items ? h.items.length : 0} item</td>
        <td style="font-weight: 700; color: var(--emerald);">${formatRupiah(h.grandTotal)}</td>
        <td style="text-align: right;">
          <button class="btn-detail" style="padding: 4px 10px; font-size: 11.5px;" onclick="loadInvoiceFromHistory(${idx})">
            Muat / Cetak Ulang
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Muat Invoice dari Riwayat
window.loadInvoiceFromHistory = function(idx) {
  const history = getInvoiceHistory();
  const h = history[idx];
  if (!h) return;

  document.getElementById('invNumber').value = h.no;
  document.getElementById('invDate').value = h.date;
  document.getElementById('custName').value = h.cust;
  document.getElementById('custPhone').value = h.phone || '';
  document.getElementById('custVehicle').value = h.vehicle || '';
  document.getElementById('payMethod').value = h.payMethod || 'Transfer BCA';
  document.getElementById('discountInput').value = h.discount || 0;
  document.getElementById('otherFeeInput').value = h.otherFee || 0;
  document.getElementById('paidInput').value = h.paid !== undefined ? h.paid : 0;

  invoiceItems = h.items && h.items.length > 0 
    ? JSON.parse(JSON.stringify(h.items))
    : [{ id: 'item_1', name: 'Produk EV', price: h.grandTotal, qty: 1 }];

  renderItemsTable();
  
  // Pulihkan status pembayaran yang tersimpan
  const savedStatus = h.payStatus || (h.paid >= h.grandTotal && h.grandTotal > 0 ? 'LUNAS' : (h.paid > 0 ? 'DP' : 'BELUM LUNAS'));
  const hiddenInput = document.getElementById('payStatusInput');
  if (hiddenInput) hiddenInput.value = savedStatus;
  syncStatusButtons(savedStatus);

  updateReceipt();
  showToast(`📂 Nota ${h.no} (${savedStatus}) dimuat ke form.`);
  window.scrollTo({ top: 300, behavior: 'smooth' });
};

// ── Quick Item Presets (Ambil data spare part untuk input cepat)
function setupQuickPresets() {
  const container = document.getElementById('quickPresetsWrap');
  if (!container) return;

  // Preset Khusus Penjualan Spare Part EV & Jasa
  const presets = [
    { name: 'Baterai Pack LiFePO4 72V 45Ah Smart BMS', price: 8750000 },
    { name: 'Controller VOTOL EM-150-2 SP Original', price: 2350000 },
    { name: 'BMS JK Smart Bluetooth 24S 150A 2A', price: 1250000 },
    { name: 'Dinamo QS Motor 205 3000W V3', price: 4600000 },
    { name: 'Smart Fast Charger 72V 10A Auto Cut', price: 850000 },
    { name: 'Gas Throttle 3 Speed + Reverse Switch', price: 195000 },
    { name: 'Breaker DC MCB Chint 125A 2P EV', price: 85000 },
    { name: 'Kabel Silikon 8 AWG Tahan Panas 200C', price: 28000 },
    { name: 'Konektor Anderson SB50 50A Original', price: 35000 },
    { name: 'Jasa Pasang & Setting Controller VOTOL', price: 250000 },
    { name: 'Jasa Rakit & Active Balancing Baterai', price: 350000 }
  ];

  container.innerHTML = presets.map(p => `
    <button type="button" class="quick-pick-btn" onclick="addPresetItem('${escapeHtml(p.name)}', ${p.price})">
      + ${escapeHtml(p.name)} (${formatRupiah(p.price)})
    </button>
  `).join('');
}

window.addPresetItem = function(name, price) {
  // Jika baris pertama masih kosong, timpa saja
  if (invoiceItems.length === 1 && !invoiceItems[0].name.trim() && invoiceItems[0].price === 0) {
    invoiceItems[0].name = name;
    invoiceItems[0].price = price;
    invoiceItems[0].qty = 1;
  } else {
    addItemRow(name, price, 1);
  }
  renderItemsTable();
  updateReceipt();
  showToast(`Ditambahkan: ${name}`);
};

// ── Toast Notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `<span>⚡</span> <span>${msg}</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Setup Form Listeners
function setupInvoiceListeners() {
  const inputsToListen = [
    'invNumber', 'invDate', 'invKasir', 'custName', 'custPhone', 
    'custVehicle', 'payMethod', 'discountInput', 'otherFeeInput'
  ];

  inputsToListen.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateReceipt);
      el.addEventListener('change', updateReceipt);
    }
  });

  // Listener khusus input nominal bayar agar sinkron dengan tombol status
  const paidEl = document.getElementById('paidInput');
  if (paidEl) {
    paidEl.addEventListener('input', handlePaidInputChange);
  }

  // Tombol Toggle Status Pembayaran (BELUM LUNAS / DP / LUNAS)
  document.querySelectorAll('.pay-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPaymentStatus(btn.dataset.paystatus);
    });
  });

  // Tombol Refresh Nomor Nota
  const refreshBtn = document.getElementById('btnRefreshInvNo');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      document.getElementById('invNumber').value = generateInvoiceNo();
      updateReceipt();
    });
  }

  // Tombol Tambah Item
  const addBtn = document.getElementById('btnAddItem');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addItemRow('', 0, 1);
    });
  }

  // Tombol Cetak Thermal
  const printBtn = document.getElementById('btnPrintReceipt');
  if (printBtn) {
    printBtn.addEventListener('click', printThermalReceipt);
  }

  // Tombol Simpan PDF
  const pdfBtn = document.getElementById('btnSavePdf');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', saveReceiptAsPDF);
  }

  // Tombol WhatsApp
  const waBtn = document.getElementById('btnCopyWa');
  if (waBtn) {
    waBtn.addEventListener('click', copyReceiptToWhatsApp);
  }

  // Tombol Reset
  const resetBtn = document.getElementById('btnReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetInvoiceForm);
  }

  // Tombol Simpan Riwayat
  const saveBtn = document.getElementById('btnSaveInvoice');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveInvoiceToHistory(true));
  }

  // Paper size toggle
  document.querySelectorAll('.paper-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPaperSize(btn.dataset.size);
    });
  });
}

// ── Inject Branding
function injectBranding() {
  document.querySelectorAll('.store-name').forEach(el => el.textContent = CONFIG.storeName);
  document.querySelectorAll('.store-handle').forEach(el => el.textContent = `@${CONFIG.storeHandle}`);
  document.querySelectorAll('.store-tagline').forEach(el => el.textContent = CONFIG.storeTagline);
  document.querySelectorAll('.store-location').forEach(el => el.textContent = CONFIG.storeLocation);

  // Header Khusus Cetak Nota Sesuai Permintaan
  const titleEl = document.getElementById('receiptStoreTitle');
  if (titleEl) titleEl.textContent = CONFIG.receiptTitle || 'Kelontong Bapak';

  const subEl = document.getElementById('receiptStoreSub');
  if (subEl) subEl.textContent = CONFIG.receiptSub || 'EV Parts Shop';

  const addrEl = document.getElementById('receiptStoreAddr');
  if (addrEl) addrEl.textContent = CONFIG.receiptAddress || 'Bolon, Colomadu, Karanganyar';

  const waEl = document.getElementById('receiptStoreWa');
  if (waEl) {
    const rawWa = CONFIG.whatsapp || '6282136538487';
    // Format ke bentuk cantik 0821-3653-8487
    let prettyWa = rawWa.startsWith('62') ? '0' + rawWa.slice(2) : rawWa;
    if (prettyWa.length >= 11) {
      prettyWa = prettyWa.slice(0, 4) + '-' + prettyWa.slice(4, 8) + '-' + prettyWa.slice(8);
    }
    waEl.textContent = 'WA: ' + prettyWa;
  }

  const waBtns = document.querySelectorAll('.wa-contact-link');
  waBtns.forEach(btn => {
    btn.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Halo mas Andri (Kelontong Bapak EV), saya mau konfirmasi nota part.')}`;
  });

  // Set default initial values
  document.getElementById('invNumber').value = generateInvoiceNo();
  document.getElementById('invDate').value = getCurrentDateTime();
  document.getElementById('invKasir').value = 'Mas Andri';
}

// ── Init on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  injectBranding();
  setupInvoiceListeners();
  setupQuickPresets();

  // Awali dengan contoh transaksi spare part & baterai realistis
  invoiceItems = [
    { id: 'item_1', name: 'Baterai Pack LiFePO4 72V 45Ah Smart BMS Bluetooth', price: 8750000, qty: 1 },
    { id: 'item_2', name: 'Jasa Pasang & Setting Baterai', price: 250000, qty: 1 }
  ];
  renderItemsTable();
  setPaymentStatus('BELUM LUNAS');
  renderInvoiceHistory();
});
