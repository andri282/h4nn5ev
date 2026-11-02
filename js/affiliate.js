// ===================================================================
//  Kelontong Bapak EV — Kumpulan Link Affiliate & Rekomendasi
//  by nugrohoandri.ev
// ===================================================================

let allAffiliates = [];
let activePlatform = 'Semua';
let activeCategory = 'Semua';
let searchQuery = '';

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
  if (!val) return 'Cek di Toko';
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return val;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ── Platform Style Helper
function getPlatformClass(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('shopee')) return 'platform-shopee';
  if (p.includes('tokopedia') || p.includes('tokped')) return 'platform-tokopedia';
  return 'platform-other';
}

function getPlatformIcon(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('shopee')) return '🛒 Shopee';
  if (p.includes('tokopedia') || p.includes('tokped')) return '🟢 Tokopedia';
  if (p.includes('tiktok')) return '🎵 TikTok Shop';
  return '🔗 ' + (platform || 'Marketplace');
}

// ── Skeleton Loader
function renderSkeletons(count = 6) {
  const grid = document.getElementById('affiliateGrid');
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

// ── Build Filter Pills
function buildCategoryFilters(items) {
  const container = document.getElementById('categoryFilters');
  if (!container) return;

  const categories = ['Semua', ...new Set(items.map(a => a.kategori || 'Lainnya').filter(Boolean))];

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
      renderAffiliates(allAffiliates);
    });
  });
}

// ── Filter
function applyFilters(items) {
  return items.filter(item => {
    // Platform
    if (activePlatform !== 'Semua') {
      const p = (item.platform || '').toLowerCase();
      if (!p.includes(activePlatform.toLowerCase())) return false;
    }

    // Category
    if (activeCategory !== 'Semua') {
      const c = (item.kategori || 'Lainnya').toLowerCase();
      if (c !== activeCategory.toLowerCase()) return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        item.nama,
        item.kategori,
        item.platform,
        item.catatan
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

// ── Render Affiliate Cards
function renderAffiliates(items) {
  const grid = document.getElementById('affiliateGrid');
  const countEl = document.getElementById('filterCount');
  if (!grid) return;

  const filtered = applyFilters(items);

  if (countEl) {
    countEl.textContent = `${filtered.length} rekomendasi`;
  }

  // Update nav count
  const navCount = document.getElementById('navAffiliateCount');
  if (navCount) {
    navCount.textContent = `${items.length} link`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Tidak Ada Produk yang Cocok</h3>
        <p>Coba gunakan kata kunci lain atau pilih platform toko yang berbeda.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(a => {
    const platformCls = getPlatformClass(a.platform);
    const platformBadge = getPlatformIcon(a.platform);
    const photo = a.foto && a.foto.startsWith('http') 
      ? a.foto 
      : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80';

    const cleanLink = a.link && a.link.startsWith('http') ? a.link : '#';

    return `
      <article class="ev-card">
        <div class="card-media">
          <img src="${photo}" alt="${a.nama}" class="card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80'">
          <div class="card-badges-top">
            <span class="badge-brand">${a.kategori || 'Rekomendasi'}</span>
            <span class="affiliate-platform-tag ${platformCls}">${platformBadge}</span>
          </div>
        </div>

        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${a.nama}</h3>
          </div>

          ${a.catatan ? `
            <div class="affiliate-note">
              <strong>💡 Catatan Bapak EV:</strong> ${a.catatan}
            </div>
          ` : ''}

          <div class="card-footer" style="margin-top:auto; padding-top:14px;">
            <div class="price-wrap">
              <span class="price-label">Kisaran Harga</span>
              <span class="price-value text-cyan">${formatRupiah(a.harga)}</span>
            </div>
          </div>

          <div style="margin-top: 14px;">
            <a href="${cleanLink}" target="_blank" rel="noopener noreferrer sponsored" class="btn-affiliate-buy">
              Buka di ${a.platform || 'Toko Online'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ── Fetch Affiliate from Google Sheets or Demo
async function fetchAffiliate() {
  renderSkeletons(6);

  if (!CONFIG.sheetUrlAffiliate || CONFIG.sheetUrlAffiliate.includes('SHEET_ID')) {
    showConfigBanner();
    allAffiliates = getDemoAffiliates();
    buildCategoryFilters(allAffiliates);
    renderAffiliates(allAffiliates);
    return;
  }

  try {
    const res = await fetch(CONFIG.sheetUrlAffiliate + '&t=' + Date.now());
    if (!res.ok) throw new Error('Respon sheet affiliate gagal');
    const text = await res.text();
    allAffiliates = parseCSV(text);

    if (allAffiliates.length === 0) {
      allAffiliates = getDemoAffiliates();
    }

    buildCategoryFilters(allAffiliates);
    renderAffiliates(allAffiliates);
  } catch (err) {
    console.warn('Gagal memuat Google Sheet affiliate, pakai demo:', err);
    showConfigBanner();
    allAffiliates = getDemoAffiliates();
    buildCategoryFilters(allAffiliates);
    renderAffiliates(allAffiliates);
  }
}

function showConfigBanner() {
  const banner = document.getElementById('configBanner');
  if (banner) banner.classList.add('show');
}

// ── Realistic Demo Affiliate Items (Tools & EV Gear)
function getDemoAffiliates() {
  return [
    {
      nama: 'Mesin Spot Welder Baterai Portabel 80 Gears Layar OLED',
      kategori: 'Tools & Perakitan Baterai',
      platform: 'Shopee',
      harga: '345000',
      catatan: 'Wajib punya buat rakit baterai 18650/21700 atau pasang nikel strip ke LiFePO4. Titik las kuat dan baterai internalnya awet.',
      link: 'https://shopee.co.id',
      foto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
      tanggal: '28-10-2026'
    },
    {
      nama: 'Multimeter Digital True RMS Aneng 8009 Otomatis Presisi',
      kategori: 'Alat Ukur & Test Kelistrikan',
      platform: 'Tokopedia',
      harga: '215000',
      catatan: 'Dipakai di garasi untuk ukur tegangan DC s/d 1000V motor listrik, continuity kabel, dan cek voltase sel baterai presisi hingga 3 desimal.',
      link: 'https://tokopedia.com',
      foto: 'https://images.unsplash.com/photo-1608755728617-aefab37d45f6?w=800&q=80',
      tanggal: '27-10-2026'
    },
    {
      nama: 'Tang Press Crimping Skun Hidrolik YQK-70 (4mm - 70mm)',
      kategori: 'Tools Kelistrikan',
      platform: 'Shopee',
      harga: '285000',
      catatan: 'Press skun kabel AWG besar ke controller atau kutub baterai jadi super padat tanpa kendala panas/kebakar akibat hambatan tinggi.',
      link: 'https://shopee.co.id',
      foto: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80',
      tanggal: '26-10-2026'
    },
    {
      nama: 'Kabel Silikon Super Lentur 8 AWG Tahan Panas 200°C',
      kategori: 'Kabel & Konektor EV',
      platform: 'Tokopedia',
      harga: '28000',
      catatan: 'Kabel utama jalur baterai ke controller. Serat tembaga lapis timah (tinned copper) banyak banget, lentur dan tahan panas ekstrim.',
      link: 'https://tokopedia.com',
      foto: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
      tanggal: '25-10-2026'
    },
    {
      nama: 'Konektor Anderson Powerpole SB50 50A 600V Original',
      kategori: 'Kabel & Konektor EV',
      platform: 'Shopee',
      harga: '35000',
      catatan: 'Standar colokan baterai lepas-pasang motor listrik. Anti percik dan tahan arus kontinu tinggi tanpa meleleh.',
      link: 'https://shopee.co.id',
      foto: 'https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=800&q=80',
      tanggal: '24-10-2026'
    },
    {
      nama: 'Breaker DC MCB Chint 125A 2P Khusus Baterai Motor Listrik',
      kategori: 'Keamanan & Proteksi',
      platform: 'Tokopedia',
      harga: '85000',
      catatan: 'Wajib dipasang di antara baterai dan controller sebagai tombol darurat utama dan pemutus arus aman saat motor ditinggal lama.',
      link: 'https://tokopedia.com',
      foto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
      tanggal: '22-10-2026'
    }
  ];
}

// ── Search & Filter Listeners
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearBtn) clearBtn.classList.toggle('visible', searchQuery.length > 0);
      renderAffiliates(allAffiliates);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.classList.remove('visible');
        renderAffiliates(allAffiliates);
      }
    });
  }

  // Platform buttons
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activePlatform = btn.dataset.platform;
      document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAffiliates(allAffiliates);
    });
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
    btn.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Halo mas Andri (Kelontong Bapak EV), saya mau tanya seputar produk rekomendasi.')}`;
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
  fetchAffiliate();
});
