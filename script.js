// GANTI DENGAN URL WEB APP APPS SCRIPT ANDA SETELAH DI-DEPLOY
const API_URL = 'https://script.google.com/macros/s/AKfycbzOg72W2KRNKKeXU5L57tIWScMoeVBLeD3KcZoX0QmuA842tw6y5BHfhq77L3GKYL7b/exec'; 

let appData = {};
let currentView = 'home';
let sessionTimer;

// --- UTILITIES ---

// Fungsi untuk memformat tanggal ke format Indonesia
function formatIDDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    try {
        // Cek jika string tanggal valid (bisa jadi kosong atau '-' dari sheet)
        if (!dateString || dateString === '-') return '-'; 
        return new Date(dateString).toLocaleDateString('id-ID', options);
    } catch (e) {
        console.error("Gagal format tanggal:", e);
        return dateString; // Kembali ke teks asli jika gagal
    }
}

// --- 1. Manajemen Sesi dan Pemuatan Awal ---

document.addEventListener('DOMContentLoaded', () => {
    // Memuat data pertama kali
    loadAllData();
    // Mengatur tombol kembali browser
    window.addEventListener('popstate', handlePopState);
});

// Fungsi untuk menampilkan loader
function showLoader() {
    document.getElementById('loader').style.opacity = '1';
    document.getElementById('loader').style.display = 'flex';
}

// Fungsi untuk menyembunyikan loader
function hideLoader() {
    document.getElementById('loader').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
    }, 500);
}

// Memuat semua data yang dibutuhkan di awal
async function loadAllData() {
    showLoader();
    try {
        const homeResponse = await fetch(`${API_URL}?action=getHomeData`);
        const kompetisiResponse = await fetch(`${API_URL}?action=getKompetisi`);
        const klubResponse = await fetch(`${API_URL}?action=getKlub`);
        const tentangResponse = await fetch(`${API_URL}?action=getTentang`);

        const [homeJson, kompetisiJson, klubJson, tentangJson] = await Promise.all([
            homeResponse.json(), 
            kompetisiResponse.json(), 
            klubResponse.json(), 
            tentangResponse.json()
        ]);
        
        // Memastikan status sukses sebelum menyimpan data
        if (homeJson.status === 'success') appData.home = homeJson.data; else throw new Error(homeJson.message);
        if (kompetisiJson.status === 'success') appData.kompetisi = kompetisiJson.data; else throw new Error(kompetisiJson.message);
        if (klubJson.status === 'success') appData.klub = klubJson.data; else throw new Error(klubJson.message);
        if (tentangJson.status === 'success') appData.tentang = tentangJson.data; else throw new Error(tentangJson.message);

        // Inisialisasi tampilan
        renderHeader(appData.home.kepala_halaman, appData.home.org_name);
        
        // Cek hash di URL untuk menentukan halaman awal
        const initialView = window.location.hash.substring(1) || 'home';
        navigate(initialView, false); // Jangan push state jika memuat awal
        
        // Mulai timer sesi
        startSessionTimer();

    } catch (e) {
        console.error("Gagal memuat data:", e);
        document.getElementById('content-container').innerHTML = `<p style="text-align:center; color:red; padding: 20px;">
            🚨 Gagal memuat data dari API. Cek:
            <br>1. URL Apps Script di file script.js sudah benar.
            <br>2. Deployment Apps Script diatur ke "Who has access: Anyone".
            <br>Detail Error: ${e.message}
        </p>`;
    } finally {
        hideLoader();
    }
}

// Timer 30 Menit
function startSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer); // Gunakan clearTimeout untuk interval yang tidak berulang
    const sessionDuration = 30 * 60 * 1000; // 30 menit dalam ms
    
    sessionTimer = setTimeout(() => {
        alert("Waktu sesi Anda telah habis (30 menit). Halaman akan dimuat ulang.");
        window.location.reload();
    }, sessionDuration);
}


// --- 2. Fungsi Navigasi dan Render Halaman ---

// Mengganti konten utama dan memperbarui Navigasi
function navigate(viewName, pushState = true) {
    if (currentView === viewName && viewName !== 'home' && pushState) return; 
    currentView = viewName;
    const container = document.getElementById('content-container');
    
    // Perbarui state browser untuk navigasi single-page
    if (pushState) {
        history.pushState({ view: viewName }, '', `#${viewName}`);
    } else {
        history.replaceState({ view: viewName }, '', `#${viewName}`);
    }
    
    // Perbarui navigasi bawah
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${viewName}`) {
            item.classList.add('active');
        }
    });

    // Reset pencarian saat pindah halaman
    document.getElementById('global-search').value = '';

    // Render halaman yang diminta
    switch (viewName) {
        case 'home':
            renderHome(container);
            break;
        case 'kompetisi':
            renderKompetisi(container);
            break;
        case 'klub':
            renderKlub(container);
            break;
        case 'tentang':
            renderTentang(container);
            break;
        default:
            renderHome(container);
    }
    window.scrollTo(0, 0); // Gulir ke atas
}

// Menangani tombol kembali browser
function handlePopState(event) {
    const view = event.state && event.state.view ? event.state.view : 'home';
    // Gunakan navigate dengan pushState = false agar tidak membuat entri histori baru
    navigate(view, false); 
}

// Render Kepala Halaman
function renderHeader(headerData, orgName) {
    const headerEl = document.getElementById('main-header');
    headerEl.innerHTML = `
        <img src="${headerData.logo_pssi || ''}" alt="Logo PSSI" class="header-logo">
        <h1 class="header-title">${headerData.judul_kepala || orgName}</h1>
        <img src="${headerData.logo_askab || ''}" alt="Logo ASKAB" class="header-logo header-askab">
    `;
}

// Render Halaman Home
function renderHome(container) {
    const data = appData.home;
    if (!data) return;
    
    // Batasi 5 berita untuk tampilan awal home
    const latestBerita = data.berita_home.slice(0, 5); 
    
    // Tentukan lebar slider (misal 300% untuk 3 slide jika hanya ada 3 banner)
    const totalBannerSlides = data.banner.length;
    const sliderWidth = totalBannerSlides > 0 ? totalBannerSlides * 100 : 0;
    
    container.innerHTML = `
        <div id="home-content">
            <div class="banner-slider-container">
                <div id="banner-slider" class="banner-slider" style="width: ${sliderWidth}%;">
                    ${data.banner.map(b => `
                        <div class="banner-slide" style="width: ${100 / totalBannerSlides}%;">
                            <img src="${b['poto-1'] || b['poto-2'] || b['poto-3'] || ''}" alt="Banner Image">
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <h3 style="margin-bottom: 10px;">Ringkasan Berita Terbaru</h3>
            <div id="berita-list">
                ${latestBerita.map(berita => `
                    <div class="card-berita" data-id="${berita.id_berita}" onclick="showBeritaModal('${berita.id_berita}')">
                        <div class="berita-image-container">
                             <img src="${berita.gambar_1 || berita.gambar_2 || berita.gambar_3 || ''}" alt="${berita.judul_berita}">
                        </div>
                        <div class="card-body">
                            <small>${formatIDDate(berita.tanggal)}</small>
                            <h4>${berita.judul_berita}</h4>
                            <p>${berita.isi_berita ? berita.isi_berita.substring(0, 150) + '...' : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Aktifkan Banner Slider
    if (totalBannerSlides > 1) {
        startBannerSlider('banner-slider', totalBannerSlides);
    }
}

// Render Halaman Kompetisi
function renderKompetisi(container) {
    const data = appData.kompetisi || [];
    // Filter dan urutkan kompetisi unik berdasarkan tanggal terbaru
    const uniqueKompetisiMap = data.reduce((acc, k) => {
        if (!acc[k.nama_kompetisi] || new Date(acc[k.nama_kompetisi].tanggal) < new Date(k.tanggal)) {
            acc[k.nama_kompetisi] = k; // Simpan data pertandingan terbaru
        }
        return acc;
    }, {});

    const uniqueKompetisi = Object.keys(uniqueKompetisiMap).sort((a, b) => {
        return new Date(uniqueKompetisiMap[b].tanggal) - new Date(uniqueKompetisiMap[a].tanggal);
    });

    container.innerHTML = `
        <div id="kompetisi-content">
            <h3 style="margin-bottom: 10px;">Daftar Kompetisi</h3>
            <div class="grid-kompetisi" id="kompetisi-grid">
                ${uniqueKompetisi.map(nama => `
                    <div class="kompetisi-item" data-name="${nama.toLowerCase()}" onclick="showKompetisiModal('${nama}')">
                        ${nama}
                    </div>
                `).join('')}
            </div>
            <div id="kompetisi-list-detail"></div>
        </div>
    `;
}

// Render Halaman Klub
function renderKlub(container) {
    const data = appData.klub || [];
    
    container.innerHTML = `
        <div id="klub-content">
            <h3 style="margin-bottom: 10px;">Daftar Klub</h3>
            <div class="grid-klub" id="klub-grid">
                ${data.map(klub => `
                    <div class="klub-card" data-name="${(klub.nama_klub + ' ' + klub.julukan).toLowerCase()}" onclick="showKlubModal('${klub.id_klub}')">
                        <img src="${klub.logo_klub || ''}" alt="Logo ${klub.nama_klub}">
                        <h5>${klub.nama_klub}</h5>
                        <p>${klub.julukan}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render Halaman Tentang
function renderTentang(container) {
    const profil = appData.tentang ? appData.tentang.profil : {};
    const struktur = appData.tentang ? appData.tentang.struktur_organisasi : {};
    
    container.innerHTML = `
        <div id="tentang-content">
            <div class="about-section">
                <h3>Profil Organisasi</h3>
                <p><strong>Nama Organisasi:</strong> ${profil.nama_organisasi || '-'}</p>
                <p><strong>Tanggal Berdiri:</strong> ${formatIDDate(profil.tanggal_berdiri)}</p>
                <h4>Visi</h4>
                <p>${profil.visi || '-'}</p>
                <h4>Misi</h4>
                <p>${profil.misi ? profil.misi.replace(/\n/g, '<br>') : '-'}</p>
            </div>

            <div class="about-section">
                <h3>Struktur Organisasi Inti</h3>
                <ul class="structure-list">
                    <li><strong>Ketua:</strong> ${struktur.ketua || '-'}</li>
                    <li><strong>Wakil Ketua:</strong> ${struktur.wakil_ketua || '-'}</li>
                    <li><strong>Sekretaris:</strong> ${struktur.sekretaris || '-'}</li>
                    <li><strong>Bendahara:</strong> ${struktur.bendahara || '-'}</li>
                    <li><strong>Humas:</strong> ${struktur.humas || '-'}</li>
                    <li><strong>Media:</strong> ${struktur.media || '-'}</li>
                </ul>
            </div>
        </div>
    `;
}


// --- 3. Fungsi Pencarian dan Filter ---

function filterContent(query) {
    const lowerQuery = query.toLowerCase();
    
    // Hanya filter pada view yang aktif
    switch (currentView) {
        case 'home':
            filterBerita(lowerQuery);
            break;
        case 'kompetisi':
            filterKompetisi(lowerQuery);
            break;
        case 'klub':
            filterKlub(lowerQuery);
            break;
    }
}

function filterBerita(query) {
    const listContainer = document.getElementById('berita-list');
    if (!listContainer) return;

    // Filter dari semua berita (tidak hanya 5 di home)
    const allBerita = appData.home.berita_home || [];

    const filteredBerita = allBerita.filter(b => 
        (b.judul_berita && b.judul_berita.toLowerCase().includes(query)) ||
        (b.isi_berita && b.isi_berita.toLowerCase().includes(query))
    );

    listContainer.innerHTML = filteredBerita.map(berita => `
        <div class="card-berita" data-id="${berita.id_berita}" onclick="showBeritaModal('${berita.id_berita}')">
            <div class="berita-image-container">
                 <img src="${berita.gambar_1 || berita.gambar_2 || berita.gambar_3 || ''}" alt="${berita.judul_berita}">
            </div>
            <div class="card-body">
                <small>${formatIDDate(berita.tanggal)}</small>
                <h4>${berita.judul_berita}</h4>
                <p>${berita.isi_berita ? berita.isi_berita.substring(0, 150) + '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

function filterKompetisi(query) {
    const listContainer = document.getElementById('kompetisi-grid');
    if (!listContainer) return;

    const items = listContainer.querySelectorAll('.kompetisi-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name');
        if (name && name.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterKlub(query) {
    const listContainer = document.getElementById('klub-grid');
    if (!listContainer) return;

    const items = listContainer.querySelectorAll('.klub-card');
    items.forEach(item => {
        const name = item.getAttribute('data-name');
        if (name && name.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}


// --- 4. Fungsi Modal dan Detail ---

function closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
    document.getElementById('modal-body').innerHTML = '';
}

// 4.1 Modal Berita
function showBeritaModal(id) {
    const berita = (appData.home.berita_home || []).find(b => b.id_berita === id);
    if (!berita) return;

    // Kumpulkan semua gambar yang ada
    const images = [berita.gambar_1, berita.gambar_2, berita.gambar_3].filter(img => img && img.startsWith('http'));
    let sliderHTML = '';

    if (images.length > 0) {
        const totalImages = images.length;
        sliderHTML = `
            <div class="modal-image-slider-container">
                <div id="berita-modal-slider" class="modal-image-slider" style="width: ${totalImages * 100}%;">
                    ${images.map(img => `<div class="modal-image-slide" style="width: ${100 / totalImages}%;"><img src="${img}" alt="Gambar Berita"></div>`).join('')}
                </div>
            </div>
            <div id="berita-slider-dots" class="slider-dots">
                ${images.map((_, index) => `<span class="dot ${index === 0 ? 'active' : ''}"></span>`).join('')}
            </div>
        `;
    }

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        ${sliderHTML}
        <h3>${berita.judul_berita}</h3>
        <div class="detail-meta">
            <p>Tanggal: <strong>${formatIDDate(berita.tanggal)}</strong></p>
        </div>
        <div class="detail-content">
            <p>${berita.isi_berita ? berita.isi_berita.replace(/\n/g, '<br>') : 'Tidak ada isi berita.'}</p>
        </div>
    `;
    
    document.getElementById('detail-modal').style.display = 'block';

    // Aktifkan slider jika ada > 1 gambar
    if (images.length > 1) {
        startSlider('berita-modal-slider', 'berita-slider-dots', images.length, true);
    }
}


// 4.2 Modal Kompetisi
function showKompetisiModal(namaKompetisi) {
    const kompetisiData = (appData.kompetisi || [])
                            .filter(k => k.nama_kompetisi === namaKompetisi)
                            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); // Urutkan terbaru

    const listHTML = kompetisiData.map(k => `
        <li class="kompetisi-detail-card">
            <div class="match-info">
                ${formatIDDate(k.tanggal)} | ${k.jenis_pertandingan} di ${k.lokasi}
            </div>
            
            <div class="match-score">
                <div class="club-side">
                    <img src="${k.logo_klub1 || ''}" alt="Logo Klub 1">
                    <p>${k.nama_klub1}</p>
                </div>
                <span class="score-text">${k.goal1 || 0} - ${k.goal2 || 0}</span>
                <div class="club-side">
                    <img src="${k.logo_klub2 || ''}" alt="Logo Klub 2">
                    <p>${k.nama_klub2}</p>
                </div>
            </div>

            <div class="match-details">
                <p><strong>Detail Gol:</strong> Klub 1: ${k.ket_goal1 || '-'} | Klub 2: ${k.ket_goal2 || '-'}</p>
                <p><strong>Kartu Kuning:</strong> Klub 1: ${k.kartu_kuning1 || 0} (${k.ket_kartu_kuning1 || '-'}) | Klub 2: ${k.kartu_kuning2 || 0} (${k.ket_kartu_kuning2 || '-'})</p>
                <p><strong>Kartu Merah:</strong> Klub 1: ${k.kartu_merah1 || 0} (${k.ket_kartu_merah1 || '-'}) | Klub 2: ${k.kartu_merah2 || 0} (${k.ket_kartu_merah2 || '-'})</p>
            </div>
        </li>
    `).join('') || '<p style="text-align:center; padding-top: 20px;">Belum ada data pertandingan untuk kompetisi ini.</p>';

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>Detail Kompetisi: ${namaKompetisi}</h3>
        <ul class="kompetisi-list-detail">
            ${listHTML}
        </ul>
    `;
    document.getElementById('detail-modal').style.display = 'block';
}

// 4.3 Modal Klub
function showKlubModal(idKlub) {
    const klub = (appData.klub || []).find(k => k.id_klub === idKlub);
    if (!klub) return;

    // Filter kompetisi yang melibatkan klub ini
    const kompetisiKlub = (appData.kompetisi || [])
                            .filter(k => k.nama_klub1 === klub.nama_klub || k.nama_klub2 === klub.nama_klub)
                            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); // Urutkan terbaru
    
    const kompetisiListHTML = kompetisiKlub.map(k => `
        <li class="kompetisi-detail-card">
            <div class="match-info">(${k.nama_kompetisi}) - ${formatIDDate(k.tanggal)}</div>
            <div class="match-score">
                <div class="club-side">
                    <img src="${k.logo_klub1 || ''}" alt="Logo Klub 1">
                    <p>${k.nama_klub1}</p>
                </div>
                <span class="score-text">${k.goal1 || 0} - ${k.goal2 || 0}</span>
                <div class="club-side">
                    <img src="${k.logo_klub2 || ''}" alt="Logo Klub 2">
                    <p>${k.nama_klub2}</p>
                </div>
            </div>
        </li>
    `).join('') || '<p style="text-align:center;">Klub ini belum memiliki riwayat pertandingan.</p>';

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="klub-detail-card">
            <img src="${klub.logo_klub || ''}" alt="Logo ${klub.nama_klub}" class="klub-detail-logo">
            <h3>${klub.nama_klub} (${klub.julukan})</h3>

            <table class="klub-info-table">
                <tr><td>Tanggal Berdiri</td><td>${formatIDDate(klub.tanggal_berdiri)}</td></tr>
                <tr><td>Alamat</td><td>${klub.alamat || '-'}</td></tr>
                <tr><td>Manajer</td><td>${klub.manejer || '-'}</td></tr>
                <tr><td>Asisten Manajer</td><td>${klub.asisten_manejer || '-'}</td></tr>
                <tr><td>Pelatih</td><td>${klub.pelatih || '-'}</td></tr>
                <tr><td>Asisten Pelatih</td><td>${klub.asisten_pelatih || '-'}</td></tr>
                <tr><td>Staff Lainnya</td><td>${klub.staff_lainnya || '-'}</td></tr>
                <tr><td>No. HP</td><td>${klub.no_handphone_klub || '-'}</td></tr>
            </table>
            
            <h4 style="margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Riwayat Pertandingan</h4>
            <ul class="kompetisi-list-detail">
                ${kompetisiListHTML}
            </ul>
        </div>
    `;
    document.getElementById('detail-modal').style.display = 'block';
}


// --- 5. Fungsi Slider (Banner dan Gambar Berita) ---

let currentSlideIndex = {}; // Untuk melacak slide index untuk multiple sliders

function startBannerSlider(sliderId, totalSlides) {
    if (totalSlides <= 1) return;
    currentSlideIndex[sliderId] = 0;
    const slider = document.getElementById(sliderId);

    function moveSlider() {
        currentSlideIndex[sliderId]++;
        if (currentSlideIndex[sliderId] >= totalSlides) {
            currentSlideIndex[sliderId] = 0;
        }
        slider.style.transform = `translateX(-${currentSlideIndex[sliderId] * (100 / totalSlides)}%)`;
    }

    // Clear interval sebelumnya jika ada
    if (slider.dataset.intervalId) {
        clearInterval(slider.dataset.intervalId);
    }

    // Set interval 3 detik
    const intervalId = setInterval(moveSlider, 3000);
    slider.dataset.intervalId = intervalId;
}

function startSlider(sliderId, dotsId, totalSlides, autoSlide = false) {
    if (totalSlides <= 1) return;
    currentSlideIndex[sliderId] = 0;
    const slider = document.getElementById(sliderId);
    const dotsContainer = document.getElementById(dotsId);
    const dots = dotsContainer ? dotsContainer.querySelectorAll('.dot') : [];
    
    function showSlides(n) {
        slider.style.transform = `translateX(-${n * (100 / totalSlides)}%)`;
        dots.forEach((dot, index) => {
            dot.classList.remove('active');
            if (index === n) {
                dot.classList.add('active');
            }
        });
        currentSlideIndex[sliderId] = n;
    }

    function moveSlider() {
        let n = currentSlideIndex[sliderId] + 1;
        if (n >= totalSlides) {
            n = 0;
        }
        showSlides(n);
    }
    
    showSlides(0); // Tampilkan slide pertama
    
    // Clear interval sebelumnya jika ada
    if (slider.dataset.intervalId) {
        clearInterval(slider.dataset.intervalId);
    }

    if (autoSlide) {
        // Set interval 3 detik
        const intervalId = setInterval(moveSlider, 3000);
        slider.dataset.intervalId = intervalId;
    }
}
