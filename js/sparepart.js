// ===================================================================
//  Kelontong Bapak EV — Spare Part Page Logic
//  by nugrohoandri.ev
// ===================================================================

let allParts = [];
let activeCategory = 'Semua';
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

// ── Format Rupiah
function formatRupiah(val) {
  if (!val) return 'Hubungi Admin';
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return val;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ── Status Normalizer
function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('habis') || s.includes('terjual') || s.includes('sold')) return 'terjual';
  if (s.includes('preorder') || s.includes('po') || s.includes('booking')) return 'booking';
  return 'tersedia';
}

function getStatusLabel(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('habis') || s.includes('terjual') || s.includes('sold')) return 'Stok Habis';
  if (s.includes('preorder') || s.includes('po')) return 'Pre-Order';
  if (s.includes('booking')) return 'Booking';
  return 'Ready Stok';
}

// ── Skeleton Loader
function renderSkeletons(count = 6) {
  const grid = document.getElementById('sparepartGrid');
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

// ── Build Dynamic Category Filter Pills
function buildCategoryFilters(items) {
  const container = document.getElementById('categoryFilters');
  if (!container) return;

  const categories = ['Semua', ...new Set(items.map(p => p.kategori || 'Lainnya').filter(Boolean))];

  container.innerHTML = categories.map(cat => `
    <button class="filter-pill ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');

  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSpareparts(allParts);
    });
  });
}

// ── Filter & Sort
function applyFilters(items) {
  return items.filter(item => {
    // Category filter
    if (activeCategory !== 'Semua') {
      const itemCat = (item.kategori || 'Lainnya').toLowerCase();
      if (itemCat !== activeCategory.toLowerCase()) return false;
    }

    // Status filter
    const statusClass = getStatusClass(item.status);
    if (activeStatus === 'tersedia' && statusClass !== 'tersedia') return false;
    if (activeStatus === 'terjual' && statusClass !== 'terjual') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        item.nama,
        item.kategori,
        item.kompatibilitas,
        item.kondisi,
        item.deskripsi
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchable.includes(q)) return false;
    }

    return true;
  }).sort((a, b) => {
    const priceA = parseInt(String(a.harga || 0).replace(/\D/g, ''), 10) || 0;
    const priceB = parseInt(String(b.harga || 0).replace(/\D/g, ''), 10) || 0;

    if (activeSort === 'termurah') return priceA - priceB;
    if (activeSort === 'termahal') return priceB - priceA;
    return 0;
  });
}

// ── Render Spareparts Cards
function renderSpareparts(items) {
  const grid = document.getElementById('sparepartGrid');
  const countEl = document.getElementById('filterCount');
  if (!grid) return;

  const filtered = applyFilters(items);

  if (countEl) {
    countEl.textContent = `${filtered.length} produk`;
  }

  // Update nav badge count
  const navCount = document.getElementById('navPartCount');
  if (navCount) {
    const readyCount = items.filter(p => getStatusClass(p.status) === 'tersedia').length;
    navCount.textContent = readyCount > 0 ? `${readyCount} item` : `${items.length}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚙️</div>
        <h3>Spare Part Tidak Ditemukan</h3>
        <p>Coba kata kunci lain atau pilih kategori komponen yang berbeda.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((p, index) => {
    const statusCls = getStatusClass(p.status);
    const statusLbl = getStatusLabel(p.status);
    const photo = p.foto && p.foto.startsWith('http') 
      ? p.foto 
      : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80';

    const waText = encodeURIComponent(
      `Halo mas Andri (Kelontong Bapak EV), saya mau tanya / order sparepart *${p.nama}* (Harga: ${formatRupiah(p.harga)}). Apakah barang masih ready? Terima kasih!`
    );

    return `
      <article class="ev-card" data-index="${index}">
        <div class="card-media">
          <img src="${photo}" alt="${p.nama}" class="card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80'">
          <div class="card-badges-top">
            <span class="badge-brand">${p.kategori || 'Spare Part'}</span>
            <span class="badge-status ${statusCls}">${statusLbl}</span>
          </div>
        </div>

        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${p.nama}</h3>
            <div class="card-year-tag">${p.kondisi || 'Baru'} • ${p.kompatibilitas || 'Universal'}</div>
          </div>

          <div class="specs-micro-grid">
            <div class="spec-cell" title="Kategori: ${p.kategori || '-'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>${p.kategori || 'Part EV'}</span>
            </div>
            <div class="spec-cell" title="Kompatibilitas: ${p.kompatibilitas || '-'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <span>${p.kompatibilitas || 'Universal EV'}</span>
            </div>
          </div>

          ${p.deskripsi ? `<p class="card-desc-preview">${p.deskripsi}</p>` : ''}

          <div class="card-footer">
            <div class="price-wrap">
              <span class="price-label">Harga</span>
              <span class="price-value text-emerald">${formatRupiah(p.harga)}</span>
            </div>
            <div class="card-action-btns">
              <button class="btn-detail" onclick="openPartModal(${index})">Detail</button>
              <a href="https://wa.me/${CONFIG.whatsapp}?text=${waText}" target="_blank" rel="noopener" class="btn-wa-card" title="Pesan via WA">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                Order
              </a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ── Open Modal Detail
window.openPartModal = function(index) {
  const filtered = applyFilters(allParts);
  const p = filtered[index];
  if (!p) return;

  const photo = p.foto && p.foto.startsWith('http') 
    ? p.foto 
    : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80';

  const statusCls = getStatusClass(p.status);
  const statusLbl = getStatusLabel(p.status);

  const waText = encodeURIComponent(
    `Halo mas Andri (Kelontong Bapak EV), saya berminat beli sparepart *${p.nama}* (Harga: ${formatRupiah(p.harga)}). Bisa info stok, garansi, atau cara pengiriman? Terima kasih!`
  );

  document.getElementById('modalImage').src = photo;
  document.getElementById('modalTitle').textContent = p.nama;
  document.getElementById('modalPrice').textContent = formatRupiah(p.harga);
  document.getElementById('modalStatus').className = `badge-status ${statusCls}`;
  document.getElementById('modalStatus').textContent = statusLbl;

  document.getElementById('modalSpecsBody').innerHTML = `
    <tr><th>Kategori Komponen</th><td>${p.kategori || '-'}</td></tr>
    <tr><th>Kondisi Barang</th><td>${p.kondisi || 'Baru (Gress)'}</td></tr>
    <tr><th>Kompatibilitas Kendaraan</th><td>${p.kompatibilitas || 'Universal / Konsultasikan ke Admin'}</td></tr>
    ${p.tanggal ? `<tr><th>Update Stok</th><td>${p.tanggal}</td></tr>` : ''}
  `;

  document.getElementById('modalDesc').textContent = p.deskripsi || 'Silakan hubungi WhatsApp kami untuk konsultasi teknis dan kecocokan sparepart.';
  document.getElementById('modalWaBtn').href = `https://wa.me/${CONFIG.whatsapp}?text=${waText}`;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// ── Fetch Spareparts from Google Sheets or Demo
async function fetchSpareparts() {
  renderSkeletons(6);

  if (!CONFIG.sheetUrlSparepart || CONFIG.sheetUrlSparepart.includes('SHEET_ID')) {
    showConfigBanner();
    allParts = getDemoSpareparts();
    buildCategoryFilters(allParts);
    renderSpareparts(allParts);
    return;
  }

  try {
    const res = await fetch(CONFIG.sheetUrlSparepart + '&t=' + Date.now());
    if (!res.ok) throw new Error('Respon sheet sparepart tidak berhasil');
    const text = await res.text();
    allParts = parseCSV(text);

    if (allParts.length === 0) {
      allParts = getDemoSpareparts();
    }

    buildCategoryFilters(allParts);
    renderSpareparts(allParts);
  } catch (err) {
    console.warn('Gagal memuat sheet sparepart, pakai demo data:', err);
    showConfigBanner();
    allParts = getDemoSpareparts();
    buildCategoryFilters(allParts);
    renderSpareparts(allParts);
  }
}

function showConfigBanner() {
  const banner = document.getElementById('configBanner');
  if (banner) banner.classList.add('show');
}

// ── Realistic Demo Spareparts Data
function getDemoSpareparts() {
  return [
    {
      nama: 'Baterai Pack LiFePO4 72V 45Ah Smart BMS Bluetooth',
      kategori: 'Baterai & BMS',
      kompatibilitas: 'Universal Motor Listrik 72V (Fox R, Gesits, Alva, Konversi)',
      kondisi: 'Baru (Garansi Cell 1 Tahun)',
      harga: '8750000',
      deskripsi: 'Dirakit rapi dengan plat busbar laser cut tebal & cell LiFePO4 Grade A prismatic 3.2V. Dilengkapi Smart BMS JK 24S 150A Bluetooth active balancing 2A (bisa monitoring voltase tiap sel lewat HP). Case stainless waterproof + Anderson plug SB50.',
      foto: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&q=80',
      status: 'Ready Stok',
      tanggal: '28-10-2026'
    },
    {
      nama: 'Controller VOTOL EM-150-2 SP (Sine Wave Programmable)',
      kategori: 'Controller',
      kompatibilitas: 'Motor 2000W - 4000W BLDC Hub & Mid-Drive',
      kondisi: 'Baru Original SIAECOSYS',
      harga: '2350000',
      deskripsi: 'Controller gelombang sinus paling stabil dan dingin di kelasnya. Sudah ada kabel USB data untuk setting parameter torsi, flux weakening (top speed boost), regen brake, dan 3 speed gear via laptop.',
      foto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
      status: 'Ready Stok',
      tanggal: '27-10-2026'
    },
    {
      nama: 'Dinamo BLDC QS Motor 205 V3 3000W Ring 12/14 Inch',
      kategori: 'Dinamo & Motor',
      kompatibilitas: 'Motor Konversi Beat, Mio, Vario, atau Upgrade Gesits',
      kondisi: 'Baru Original QS Motor',
      harga: '4600000',
      deskripsi: 'QS Motor tipe V3 super torque. Magnet 50H, kawat tembaga tahan panas 200°C, dual sensor hall sensor. Cocok buat yang mau bangun motor listrik bertenaga tembus 100+ km/jam.',
      foto: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80',
      status: 'Ready Stok',
      tanggal: '26-10-2026'
    },
    {
      nama: 'Smart Fast Charger 72V 10A Adjustable Cut-Off',
      kategori: 'Charger & Adaptor',
      kompatibilitas: 'Baterai LiFePO4 24S / Ternary NMC 20S',
      kondisi: 'Baru (Include Fan Cooling)',
      harga: '850000',
      deskripsi: 'Charger pintar dengan layar display tegangan & arus real-time. Otomatis memutus arus saat baterai 100% penuh untuk menjaga kesehatan sel. Colokan Anderson / C13 heavy duty.',
      foto: 'https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=800&q=80',
      status: 'Ready Stok',
      tanggal: '25-10-2026'
    },
    {
      nama: 'BMS JK Smart Bluetooth 24S 150A + Active Balancer 2A',
      kategori: 'Baterai & BMS',
      kompatibilitas: 'LiFePO4, Li-Ion, LTO (8S sampai 24S)',
      kondisi: 'Baru Original JK',
      harga: '1250000',
      deskripsi: 'BMS nomor satu pilihan builder EV. Dilengkapi active balancer super cepat 2A (sel baterai dijamin seimbang presisi), proteksi overcharge, overdischarge, short circuit, dan sensor suhu ganda.',
      foto: 'https://images.unsplash.com/photo-1608755728617-aefab37d45f6?w=800&q=80',
      status: 'Ready Stok',
      tanggal: '24-10-2026'
    },
    {
      nama: 'Gas Throttle Magura Style + Saklar 3 Speed & Tombol Mundur (Reverse)',
      kategori: 'Gas & Saklar',
      kompatibilitas: 'Semua Controller VOTOL, Kelly, FarDriver, Universal EV',
      kondisi: 'Baru Waterproof IP67',
      harga: '195000',
      deskripsi: 'Tarikan gas presisi halus anti nyentak. Dilengkapi tombol switch 3 kecepatan (Eco/Normal/Sport) dan tombol mundur elektrik yang sangat praktis saat parkir di tanjakan.',
      foto: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
      status: 'Ready Stok',
      tanggal: '22-10-2026'
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
      if (clearBtn) clearBtn.classList.toggle('visible', searchQuery.length > 0);
      renderSpareparts(allParts);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.classList.remove('visible');
        renderSpareparts(allParts);
      }
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeSort = e.target.value;
      renderSpareparts(allParts);
    });
  }

  // Status buttons
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatus = btn.dataset.status;
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSpareparts(allParts);
    });
  });

  // Modal close
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
    btn.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Halo mas Andri (Kelontong Bapak EV), saya mau konsultasi sparepart motor listrik.')}`;
  });

  const igLink = document.getElementById('footerIg');
  if (igLink && CONFIG.instagram) igLink.href = `https://instagram.com/${CONFIG.instagram}`;
  const ttLink = document.getElementById('footerTiktok');
  if (ttLink && CONFIG.tiktok) ttLink.href = `https://tiktok.com/@${CONFIG.tiktok}`;
  const ytLink = document.getElementById('footerYt');
  if (ytLink && CONFIG.youtube) ytLink.href = `https://youtube.com/@${CONFIG.youtube}`;
}

// ── Init
document.addEventListener('DOMContentLoaded', () => {
  injectBranding();
  setupEventListeners();
  fetchSpareparts();
});
