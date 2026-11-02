// ===================================================================
//  Kelontong Bapak EV — Motor Bekas Page Logic
//  by nugrohoandri.ev
// ===================================================================

let allMotors = [];
let activeBrand = 'Semua';
let activeStatus = 'Semua';
let searchQuery = '';
let activeSort = 'terbaru';

// ── Parse CSV dari Google Sheets
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      const key = h.trim().toLowerCase().replace(/\s+/g, '_');
      obj[key] = (vals[i] || '').trim();
    });
    return obj;
  }).filter(r => r.nama && r.nama.trim() !== '');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Format Harga Rupiah
function formatRupiah(val) {
  if (!val) return 'Hubungi Kami';
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return val;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ── Status Normalizer & Class
function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('terjual') || s.includes('sold')) return 'terjual';
  if (s.includes('booking') || s.includes('book')) return 'booking';
  return 'tersedia';
}

function getStatusLabel(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('terjual') || s.includes('sold')) return 'Terjual';
  if (s.includes('booking') || s.includes('book')) return 'Booking';
  return 'Tersedia';
}

// ── Skeleton Loader
function renderSkeletons(count = 6) {
  const grid = document.getElementById('motorGrid');
  if (!grid) return;
  grid.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-media"></div>
      <div class="skeleton skeleton-line w80"></div>
      <div class="skeleton skeleton-line w50"></div>
      <div style="height: 12px"></div>
      <div class="skeleton skeleton-line w30"></div>
    </div>
  `).join('');
}

// ── Build Dynamic Brand Filters
function buildBrandFilters(items) {
  const container = document.getElementById('brandFilters');
  if (!container) return;

  const brands = ['Semua', ...new Set(items.map(m => m.brand || 'Lainnya').filter(Boolean))];

  container.innerHTML = brands.map(brand => `
    <button class="filter-pill ${brand === activeBrand ? 'active' : ''}" data-brand="${brand}">
      ${brand}
    </button>
  `).join('');

  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeBrand = btn.dataset.brand;
      container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMotors(allMotors);
    });
  });
}

// ── Apply Filters & Sorting
function applyFilters(items) {
  return items.filter(item => {
    // Brand filter
    if (activeBrand !== 'Semua') {
      const itemBrand = (item.brand || 'Lainnya').toLowerCase();
      if (itemBrand !== activeBrand.toLowerCase()) return false;
    }

    // Status filter
    const statusClass = getStatusClass(item.status);
    if (activeStatus === 'tersedia' && statusClass !== 'tersedia') return false;
    if (activeStatus === 'terjual' && statusClass !== 'terjual') return false;
    if (activeStatus === 'booking' && statusClass !== 'booking') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        item.nama,
        item.brand,
        item.tahun,
        item.baterai,
        item.jarak_tempuh,
        item.surat,
        item.lokasi,
        item.deskripsi
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchable.includes(q)) return false;
    }

    return true;
  }).sort((a, b) => {
    const priceA = parseInt(String(a.harga || 0).replace(/\D/g, ''), 10) || 0;
    const priceB = parseInt(String(b.harga || 0).replace(/\D/g, ''), 10) || 0;
    const yearA = parseInt(String(a.tahun || 0).replace(/\D/g, ''), 10) || 0;
    const yearB = parseInt(String(b.tahun || 0).replace(/\D/g, ''), 10) || 0;

    if (activeSort === 'termurah') return priceA - priceB;
    if (activeSort === 'termahal') return priceB - priceA;
    if (activeSort === 'tahun_baru') return yearB - yearA;
    return 0; // Default order
  });
}

// ── Render Motor Cards
function renderMotors(items) {
  const grid = document.getElementById('motorGrid');
  const countEl = document.getElementById('filterCount');
  if (!grid) return;

  const filtered = applyFilters(items);

  if (countEl) {
    countEl.textContent = `${filtered.length} unit`;
  }

  // Update nav badge count
  const navCount = document.getElementById('navMotorCount');
  if (navCount) {
    const readyCount = items.filter(m => getStatusClass(m.status) === 'tersedia').length;
    navCount.textContent = readyCount > 0 ? `${readyCount} ready` : `${items.length}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛵</div>
        <h3>Belum Ada Unit yang Cocok</h3>
        <p>Coba ganti kata kunci pencarian, filter brand, atau pilih status lainnya.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((m, index) => {
    const statusCls = getStatusClass(m.status);
    const statusLbl = getStatusLabel(m.status);
    const photo = m.foto && m.foto.startsWith('http') 
      ? m.foto 
      : 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80';

    const waText = encodeURIComponent(
      `Halo mas Andri (Kelontong Bapak EV), saya tertarik dengan unit *${m.nama}* (Tahun: ${m.tahun || '-'}, Harga: ${formatRupiah(m.harga)}). Apakah unit ini masih ready untuk cek kondisi? Terima kasih!`
    );

    return `
      <article class="ev-card" data-index="${index}">
        <div class="card-media">
          <img src="${photo}" alt="${m.nama}" class="card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80'">
          <div class="card-badges-top">
            <span class="badge-brand">${m.brand || 'EV'}</span>
            <span class="badge-status ${statusCls}">${statusLbl}</span>
          </div>
        </div>

        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${m.nama}</h3>
            <div class="card-year-tag">${m.tahun ? 'Tahun ' + m.tahun : 'EV Unit'} • ${m.kondisi || 'Kondisi Baik'}</div>
          </div>

          <div class="specs-micro-grid">
            <div class="spec-cell" title="Baterai: ${m.baterai || '-'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"/><line x1="22" y1="11" x2="22" y2="13"/></svg>
              <span>${m.baterai || 'Baterai Standar'}</span>
            </div>
            <div class="spec-cell" title="Jarak Tempuh: ${m.jarak_tempuh || '-'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>${m.jarak_tempuh || '±60-80 KM'}</span>
            </div>
            <div class="spec-cell" title="Surat: ${m.surat || '-'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>${m.surat || 'Surat Lengkap'}</span>
            </div>
            <div class="spec-cell" title="Lokasi: ${m.lokasi || '-'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${m.lokasi || 'Solo'}</span>
            </div>
          </div>

          ${m.deskripsi ? `<p class="card-desc-preview">${m.deskripsi}</p>` : ''}

          <div class="card-footer">
            <div class="price-wrap">
              <span class="price-label">Harga Buka</span>
              <span class="price-value text-cyan">${formatRupiah(m.harga)}</span>
            </div>
            <div class="card-action-btns">
              <button class="btn-detail" onclick="openMotorModal(${index})">Detail</button>
              <a href="https://wa.me/${CONFIG.whatsapp}?text=${waText}" target="_blank" rel="noopener" class="btn-wa-card" title="Tanya Penjual">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                WA
              </a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ── Open Motor Modal Detail
window.openMotorModal = function(index) {
  const filtered = applyFilters(allMotors);
  const m = filtered[index];
  if (!m) return;

  const photo = m.foto && m.foto.startsWith('http') 
    ? m.foto 
    : 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80';

  const statusCls = getStatusClass(m.status);
  const statusLbl = getStatusLabel(m.status);

  const waText = encodeURIComponent(
    `Halo mas Andri (Kelontong Bapak EV), saya tertarik dengan unit *${m.nama}* (Tahun: ${m.tahun || '-'}, Harga: ${formatRupiah(m.harga)}). Bisa minta info lebih lanjut atau jadwalkan cek unit? Terima kasih!`
  );

  document.getElementById('modalImage').src = photo;
  document.getElementById('modalTitle').textContent = m.nama;
  document.getElementById('modalPrice').textContent = formatRupiah(m.harga);
  document.getElementById('modalStatus').className = `badge-status ${statusCls}`;
  document.getElementById('modalStatus').textContent = statusLbl;

  document.getElementById('modalSpecsBody').innerHTML = `
    <tr><th>Merek / Tipe</th><td>${m.brand || '-'}</td></tr>
    <tr><th>Tahun Pembuatan</th><td>${m.tahun || '-'}</td></tr>
    <tr><th>Baterai & Kapasitas</th><td>${m.baterai || '-'}</td></tr>
    <tr><th>Estimasi Jarak Tempuh</th><td>${m.jarak_tempuh || '-'}</td></tr>
    <tr><th>Kelengkapan Surat</th><td>${m.surat || '-'}</td></tr>
    <tr><th>Kondisi Fisik & Mesin</th><td>${m.kondisi || '-'}</td></tr>
    <tr><th>Lokasi Unit</th><td>${m.lokasi || 'Solo, Jawa Tengah'}</td></tr>
    ${m.tanggal ? `<tr><th>Tanggal Listing</th><td>${m.tanggal}</td></tr>` : ''}
  `;

  document.getElementById('modalDesc').textContent = m.deskripsi || 'Belum ada deskripsi tambahan untuk unit ini.';
  document.getElementById('modalWaBtn').href = `https://wa.me/${CONFIG.whatsapp}?text=${waText}`;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// ── Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `<span>⚡</span> <span>${msg}</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Fetch Products from Google Sheets or Fallback Demo
async function fetchMotors() {
  renderSkeletons(6);

  // If using placeholder ID, show demo data
  if (!CONFIG.sheetUrlMotor || CONFIG.sheetUrlMotor.includes('SHEET_ID')) {
    showConfigBanner();
    allMotors = getDemoMotors();
    buildBrandFilters(allMotors);
    renderMotors(allMotors);
    return;
  }

  try {
    const res = await fetch(CONFIG.sheetUrlMotor + '&t=' + Date.now());
    if (!res.ok) throw new Error('Respon sheets tidak berhasil');
    const text = await res.text();
    allMotors = parseCSV(text);

    if (allMotors.length === 0) {
      // Empty sheet
      allMotors = getDemoMotors();
      showToast('Sheet kosong, menampilkan unit contoh demo.');
    }

    buildBrandFilters(allMotors);
    renderMotors(allMotors);
  } catch (err) {
    console.warn('Gagal memuat Google Sheet, menggunakan data demo:', err);
    showConfigBanner();
    allMotors = getDemoMotors();
    buildBrandFilters(allMotors);
    renderMotors(allMotors);
  }
}

function showConfigBanner() {
  const banner = document.getElementById('configBanner');
  if (banner) banner.classList.add('show');
}

// ── Realistic Demo Motors Data (Indonesian Secondhand EV Market)
function getDemoMotors() {
  return [
    {
      nama: 'Polytron Fox-R 2024 Red Glossy (Fast Charge Ready)',
      brand: 'Polytron',
      tahun: '2024',
      jarak_tempuh: '110-120 KM',
      baterai: '72V 52Ah LiFePO4 (SOH 98%)',
      surat: 'STNK + BPKB Lengkap Plat AD',
      kondisi: 'Like New, KM Rendah 2.400',
      harga: '14500000',
      deskripsi: 'Unit Polytron Fox-R rawatan pribadi, baterai sehat walafiat SOH 98%. Kelengkapan charger original fast charging 5A, kunci kontak 2 pcs + kartu RFID. Bodi mulus 95%, ban tebal, siap pakai harian tanpa kendala.',
      foto: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      status: 'Tersedia',
      lokasi: 'Solo Kota',
      tanggal: '28-10-2026'
    },
    {
      nama: 'Alva Cervo 2023 Dual Battery Next-Gen Sport EV',
      brand: 'Alva',
      tahun: '2023',
      jarak_tempuh: '125 KM (Dual Batt)',
      baterai: 'Dual Battery 73.8V 24Ah (Total 48Ah)',
      surat: 'STNK + BPKB Hidup Plat B',
      kondisi: 'Sangat Mulus, KM 5.800',
      harga: '27500000',
      deskripsi: 'Motor listrik kencang torsi monster 53.5 Nm. Sudah dual battery asli bawaan Alva, top speed tembus 103 km/h. Fitur Boost Mode aktif normal, aplikasi My Alva tersambung. Servis berkala bengkel resmi.',
      foto: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
      status: 'Tersedia',
      lokasi: 'Sukoharjo / Solo',
      tanggal: '26-10-2026'
    },
    {
      nama: 'Gesits G1 2022 Black Solid (Upgrade Controller VOTOL)',
      brand: 'Gesits',
      tahun: '2022',
      jarak_tempuh: '65-70 KM',
      baterai: '72V 20Ah NMC Original',
      surat: 'Plat AD Solo, Pajak On',
      kondisi: 'Upgrade Halus, Siap Harian',
      harga: '16000000',
      deskripsi: 'Gesits G1 sudah diupgrade controller VOTOL EM-50-4 biar tarikan bawah lebih smooth dan irit baterai. Dinamo mid-drive belt baru diganti. Surat-surat aman lengkap faktur ada.',
      foto: 'https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=800&q=80',
      status: 'Booking',
      lokasi: 'Karanganyar',
      tanggal: '24-10-2026'
    },
    {
      nama: 'Uwinfly T3 Smart Retro EV (Upgrade Baterai LiFePO4 60V 30Ah)',
      brand: 'Uwinfly',
      tahun: '2023',
      jarak_tempuh: '70 KM Real',
      baterai: 'LiFePO4 60V 30Ah (Bukan SLA)',
      surat: 'Faktur Toko + Sertifikat Pabrik',
      kondisi: 'Baterai Baru Rakitan 4 Bulan',
      harga: '8800000',
      deskripsi: 'Model Vespa klasik retro warna Mint Green. Baterai bawaan timbal SLA sudah dibuang, diganti baterai Lithium LiFePO4 60V 30Ah Smart BMS Daly Bluetooth. Jarak tempuh jauh lebih mantap dan awet tahan 5-8 tahun.',
      foto: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80',
      status: 'Tersedia',
      lokasi: 'Solo',
      tanggal: '27-10-2026'
    },
    {
      nama: 'Smoot Tempur Facelift Swap Battery Ready',
      brand: 'Smoot',
      tahun: '2023',
      jarak_tempuh: '60 KM / Swap Instan',
      baterai: 'Swap Swap Energi (Tanpa Sewa Baterai)',
      surat: 'STNK + BPKB Lengkap Plat AB',
      kondisi: 'Mulus 90%, KM 8.100',
      harga: '9500000',
      deskripsi: 'Motor listrik anti ribet ngecas, tinggal swap baterai di Alfamart/pos SWAP terdekat dalam 9 detik! Sangat cocok buat kurir paket, ojek online, atau operasional kantor.',
      foto: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
      status: 'Terjual',
      lokasi: 'Yogyakarta / Solo',
      tanggal: '20-10-2026'
    },
    {
      nama: 'Custom Konversi Honda Beat EV 72V QS Motor 2000W',
      brand: 'Konversi Custom',
      tahun: '2024',
      jarak_tempuh: '90 KM',
      baterai: '72V 40Ah Smart BMS JK Active Balancer',
      surat: 'STNK + BPKB Motor Asli (Proses Uji Tipe)',
      kondisi: 'Pro Project, Siap Touring',
      harga: '18500000',
      deskripsi: 'Basis Honda Beat FI di-convert total ke full electric. Menggunakan Hub Motor QS 205 2000W, Controller FarDriver ND72360 programmable via HP Bluetooth, speedometer digital custom, rem cakram depan belakang.',
      foto: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
      status: 'Tersedia',
      lokasi: 'Bengkel Solo',
      tanggal: '28-10-2026'
    }
  ];
}

// ── Search & Filter Listeners
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const sortSelect = document.getElementById('sortSelect');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.classList.toggle('visible', searchQuery.length > 0);
      }
      renderMotors(allMotors);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.classList.remove('visible');
        renderMotors(allMotors);
      }
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeSort = e.target.value;
      renderMotors(allMotors);
    });
  }

  // Status buttons
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatus = btn.dataset.status;
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMotors(allMotors);
    });
  });

  // Modal close events
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── Inject Branding
function injectBranding() {
  document.querySelectorAll('.store-name').forEach(el => el.textContent = CONFIG.storeName);
  document.querySelectorAll('.store-handle').forEach(el => el.textContent = `@${CONFIG.storeHandle}`);
  document.querySelectorAll('.store-tagline').forEach(el => el.textContent = CONFIG.storeTagline);
  document.querySelectorAll('.store-location').forEach(el => el.textContent = CONFIG.storeLocation);

  const waBtns = document.querySelectorAll('.wa-contact-link');
  waBtns.forEach(btn => {
    btn.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Halo mas Andri (Kelontong Bapak EV), saya ingin konsultasi seputar unit motor listrik / spare part.')}`;
  });

  // Social links
  const igLink = document.getElementById('footerIg');
  if (igLink && CONFIG.instagram) igLink.href = `https://instagram.com/${CONFIG.instagram}`;
  const ttLink = document.getElementById('footerTiktok');
  if (ttLink && CONFIG.tiktok) ttLink.href = `https://tiktok.com/@${CONFIG.tiktok}`;
  const ytLink = document.getElementById('footerYt');
  if (ytLink && CONFIG.youtube) ytLink.href = `https://youtube.com/@${CONFIG.youtube}`;
}

// ── Init on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  injectBranding();
  setupEventListeners();
  fetchMotors();
});
