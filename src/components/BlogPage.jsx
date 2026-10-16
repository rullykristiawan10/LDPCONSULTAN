import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Share2, 
  Tag, 
  ChevronRight, 
  BookOpen, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  Filter, 
  Building2, 
  Check, 
  Zap,
  Wrench,
  ShieldCheck,
  Flame,
  FileText,
  Eye,
  Mail,
  X
} from 'lucide-react';
import './BlogPage.css';
import { 
  applyArticleSeo, 
  resetSeoToDefault, 
  sanitizeMarkdownContent 
} from '../utils/articleSecurityAndSeo';
import { 
  fetchArticlesFromSupabase, 
  isSupabaseConfigured 
} from '../lib/supabaseClient';
import { subscribeToSync, SYNC_EVENTS } from '../utils/syncManager';

export const INITIAL_BLOG_ARTICLES = [
  {
    id: 1,
    title: "Panduan Lengkap Audit Energi & Optimasi Sistem Chiller HVAC Berstandar ASHRAE 90.1",
    slug: "audit-energi-optimasi-chiller-hvac-ashrae",
    category: "HVAC & Efisiensi Energi",
    summary: "Pelajari bagaimana audit termal dan simulasi CFD dapat memangkas konsumsi listrik chiller gedung perkantoran dan industri hingga 25% tanpa mengurangi kenyamanan termal occupants.",
    featured: true,
    image: "/images/office_presentation.jpg",
    author: {
      name: "Tito Riyanto, S.T.",
      role: "Engineering Director",
      avatar: "/images/avatar_rizky.jpg"
    },
    publishedAt: "12 Oktober 2026",
    readTime: "7 menit",
    views: 1420,
    tags: ["HVAC System", "ASHRAE 90.1", "Chiller Plant", "Energy Audit", "Value Engineering"],
    content: `
### Latar Belakang: Beban Operasional HVAC pada Gedung Komersial
Dalam gedung perkantoran, pusat perbelanjaan, maupun fasilitas industri di Indonesia, beban operasional sistem pendingin udara (HVAC) menyumbang antara **45% hingga 65% dari total tagihan listrik bulanan**. Sebagian besar gedung mengalami inefisiensi akibat ketidaktepatan *sizing* chiller, sistem pemompaan tanpa VFD (*Variable Frequency Drive*), serta delta T (*temperature difference*) yang rendah (*Low Delta T Syndrome*).

Dengan menerapkan metodologi audit energi berstandar **ASHRAE 90.1 & SNI 6389**, konsultan teknik PT Lintang Duta Perkasa mampu mengidentifikasi titik kebocoran energi dan merancang perbaikan sistem hidronik yang memberikan *Return on Investment (ROI)* di bawah 2 tahun.

---

### 4 Langkah Kunci Optimasi Chiller Plant Berbasis Engineering
1. **Pengukuran Real-Time kW/TR (Chiller Efficiency)**: Memasang sensor termal ultrasonik dan power meter portabel untuk mengukur efisiensi riil chiller pada berbagai kondisi beban parsial (30%, 50%, 75%, dan 100%).
2. **Koreksi Low Delta T Syndrome**: Banyak sistem chilled water mengalami perbedaan suhu pasok dan balik yang terlalu sempit (hanya 2-3°C dari idealnya 5.5-6°C). Hal ini memaksa pompa sekunder bekerja berlebihan memompa air yang belum menyerap panas secara maksimal.
3. **Penerapan Variable Primary Flow (VPF)**: Konversi dari sistem *Primary-Secondary Pumping* konvensional ke *Variable Primary Flow* dengan inverter cerdas dapat menghemat energi pompa hingga 35%.
4. **Optimasi Water Cooled Cooling Tower Approach**: Menurunkan temperatur kondensor air pendingin sebesar 1°C mampu meningkatkan efisiensi kompresor chiller hingga 2-3%.

---

> **Rekomendasi Insinyur LDP:** "Jangan terburu-buru mengganti unit chiller lama sebelum melakukan audit komprehensif pada katup AHU/FCU dan sistem balancing hidronik. Seringkali, pemborosan energi bukan disebabkan oleh kompresor chiller, melainkan sistem distribusi air dingin yang tidak ter-balancing dengan benar."

---

### Hasil Studi Kasus: Gedung Kantor 18 Lantai di Jakarta Selatan
- **Kondisi Awal:** Efisiensi chiller plant 0.98 kW/TR, tagihan listrik pendingin Rp 190.000.000 / bulan.
- **Implementasi LDP:** Balancing katup PICV, instalasi VFD pompa kondensor, dan pengaturan ulang setpoint chiller sequencing.
- **Hasil Akhir:** Efisiensi membaik menjadi 0.72 kW/TR. Penghematan daya listrik tercapai **26.5%** atau sekitar **Rp 50.350.000 per bulan**.
    `
  },
  {
    id: 2,
    title: "Pentingnya Desain Tata Udara Ruang Bersih (Cleanroom) ISO 14644 pada Industri Farmasi",
    slug: "desain-tata-udara-cleanroom-iso-14644-farmasi",
    category: "Cleanroom & Farmasi",
    summary: "Menjaga kaskade tekanan positif, pergantian udara per jam (ACH), dan filtrasi HEPA H14 guna memenuhi standar ketat BPOM dan cGMP pada fasilitas produksi steril.",
    featured: false,
    image: "/images/hero_engineer.jpg",
    author: {
      name: "Abdul Wahid, A.Md. S.Pd",
      role: "Operational Director",
      avatar: "/images/avatar_habib.jpg"
    },
    publishedAt: "08 Oktober 2026",
    readTime: "5 menit",
    views: 980,
    tags: ["Cleanroom", "ISO 14644", "Farmasi", "HEPA Filter", "BPOM cGMP"],
    content: `
### Persyaratan Kritis Ruang Bersih Farmasi
Industri farmasi dan laboratorium biologi menuntut kontrol lingkungan steril yang tanpa kompromi. Kesalahan rancangan HVAC tidak hanya berisiko menggagalkan proses produksi, namun juga berakibat pada pencabutan izin edar produk oleh **Badan Pengawas Obat dan Makanan (BPOM)**.

Sistem tata udara cleanroom harus mengendalikan 5 parameter kunci:
1. **Jumlah Partikel Udara per Meter Kubik**: Klasifikasi ISO Class 5 (Kelas A) hingga ISO Class 8 (Kelas D).
2. **Kaskade Perbedaan Tekanan Ruang**: Tekanan positif 10-15 Pascal antar ruang berdekatan untuk mencegah kontaminasi silang.
3. **Air Changes per Hour (ACH)**: Mulai dari 20 kali pergantian udara/jam hingga 60+ kali/jam.
4. **Suhu dan Kelembapan Relatif (RH)**: Stabil pada 20-22°C dan RH 45-55% untuk mencegah pertumbuhan spora mikrobiologi.
5. **Arah dan Pola Aliran Udara**: Aliran laminar unidirectional vs non-unidirectional turbulen.

---

### Peran Konsultan Teknik dalam Uji Kualifikasi (DQ, IQ, OQ, PQ)
Sebagai konsultan independen, PT Lintang Duta Perkasa mendampingi dari tahap *Design Qualification (DQ)* hingga sertifikasi kualifikasi performa *Operational & Performance Qualification (OQ & PQ)* dengan alat uji Particle Counter, Smoke Pattern Testing, dan Anemometer terkalibrasi KAN.
    `
  },
  {
    id: 3,
    title: "Strategi Value Engineering pada Sistem Distribusi Listrik (MEP Electrical) Fasilitas Pabrik",
    slug: "value-engineering-listrik-mep-pabrik-industri",
    category: "MEP Electrical",
    summary: "Cara mereduksi biaya investasi kabel trafo dan panel distribusi utama (MDB) dengan kalkulasi drop tegangan dan faktor diversitas beban yang presisi.",
    featured: false,
    image: "/images/geothermal_plant.jpg",
    author: {
      name: "Ir. Ade Maulana, S.T. M.M.T",
      role: "Commercial & Sales Director",
      avatar: "/images/avatar_ade.jpg"
    },
    publishedAt: "02 Oktober 2026",
    readTime: "6 menit",
    views: 1150,
    tags: ["MEP Electrical", "Value Engineering", "Panel MDB", "Transformator", "Drop Tegangan"],
    content: `
### Apa itu Value Engineering dalam Proyek MEP?
Value Engineering (VE) bukanlah pemotongan anggaran sembarangan yang menurunkan mutu teknis. Sebaliknya, VE adalah analisis fungsi sistemik untuk menghasilkan **kinerja keselamatan dan operasional yang sama persis (atau lebih baik) dengan biaya modal (Capex) yang jauh lebih hemat**.

Pada fasilitas manufaktur, rancangan kelistrikan sering kali mengalami *overdesign* hingga 40% akibat penggunaan faktor pengali keamanan (safety factor) bertingkat yang tidak rasional oleh perancang pemula.

---

### Contoh Nyata Optimasi yang Dilakukan LDP:
1. **Kalkulasi Faktor Diversitas Riil**: Menghitung beban simultan mesin produksi alih-alih menjumlahkan total daya nominal seluruh mesin secara bersamaan. Hal ini memungkinkan pengecilan kapasitas Trafo dari 2500 kVA menjadi 1600 kVA tanpa risiko overload.
2. **Penempatan Gardu Trafo Mendekati Titik Beban Utama (Center of Gravity Load)**: Mengurangi panjang kabel tegangan rendah (Low Voltage) berpenampang besar (300mm² CU) yang berbiaya sangat tinggi.
3. **Kompensasi Daya Reaktif (Capacitor Bank Otomatis)**: Menghindari denda kVARh PLN sekaligus memperbesar kapasitas riil jaringan listrik eksisting.
    `
  },
  {
    id: 4,
    title: "Simulasi Komputasi Aliran Udara (CFD 3D) untuk Mencegah Hot Spot pada Critical Data Center",
    slug: "simulasi-cfd-3d-aliran-udara-data-center",
    category: "Data Center & CFD",
    summary: "Analisis termal distribusi rak server high-density menggunakan cold aisle containment guna menjamin PUE di bawah 1.3 dan zero thermal downtime.",
    featured: false,
    image: "/images/cad_workstation.jpg",
    author: {
      name: "Hasbi Ash, S.T.",
      role: "Senior CFD Specialist",
      avatar: "/images/avatar_hasbi.jpg"
    },
    publishedAt: "25 September 2026",
    readTime: "8 menit",
    views: 890,
    tags: ["CFD 3D", "Data Center", "PUE", "Cold Aisle", "Precision Cooling"],
    content: `
### Tantangan Termal pada Fasilitas Data Center Modern
Kepadatan daya rak server modern yang melonjak dari 3 kW/rack menjadi 15-30 kW/rack memunculkan risiko *thermal hotspot* yang dapat mematikan server dalam hitungan detik. 

Pendekatan konvensional "menebak" hembusan pendingin PAC (*Precision Air Conditioning*) melalui raised floor sering kali berujung pada pemborosan daya dan sirkulasi udara pendek (*air recirculation*).

---

### Solusi Berbasis Simulasi CFD 3D LDP
Dengan perangkat lunak CFD (*Computational Fluid Dynamics*), konsultan LDP memodelkan seluruh geometri ruangan data center, server rack, perforated tiles, dan plenum ceiling:
1. Menghitung vektor kecepatan udara dan gradien temperatur 3D.
2. Menguji skenario *N+1 Redundancy Failure* jika salah satu unit pendingin mati mendadak.
3. Mengoptimalkan desain *Cold Aisle Containment* (CAC) sehingga udara dingin murni masuk ke intake server tanpa bercampur dengan udara panas exhaust.
4. Menekan angka Power Usage Effectiveness (PUE) gedung hingga mencapai target **PUE 1.25 - 1.30**.
    `
  },
  {
    id: 5,
    title: "Perbedaan Sistem VRF (Variable Refrigerant Flow) vs Chiller Plant untuk Gedung Komersial",
    slug: "perbedaan-sistem-vrf-vs-chiller-plant-gedung",
    category: "HVAC & Efisiensi Energi",
    summary: "Analisis Capex dan Opex jangka panjang: kapan waktu terbaik memilih sistem VRF multi-split dan kapan gedung wajib beralih ke central water-cooled chiller.",
    featured: false,
    image: "/images/building_architecture.jpg",
    author: {
      name: "Abdul Wahid, A.Md. S.Pd",
      role: "Operational Director",
      avatar: "/images/avatar_habib.jpg"
    },
    publishedAt: "18 September 2026",
    readTime: "6 menit",
    views: 1280,
    tags: ["VRF System", "Water Cooled Chiller", "Capex Opex", "Konsultan Gedung"],
    content: `
### Dilema Pemilik Gedung: VRF atau Central Chiller?
Pemilik gedung komersial sering dihadapkan pada pilihan sistem pendingin sentral. Masing-masing memiliki kelebihan dan kekurangan yang harus dinilai secara objektif oleh konsultan independen tanpa keberpihakan terhadap merek pabrikan.

---

### Perbandingan Komprehensif Antar Sistem:

| Parameter Evaluasi | Sistem VRF (Variable Refrigerant Flow) | Sistem Water-Cooled Chiller Sentral |
| :--- | :--- | :--- |
| **Luas Area Gedung Ideal** | Gedung < 5.000 m² (Low to Mid-Rise) | Gedung > 8.000 m² (High-Rise / Kawasan Kampus) |
| **Biaya Investasi Awal (Capex)** | Cenderung lebih rendah, tidak perlu ruang mesin sentral | Lebih tinggi (memerlukan cooling tower, pompa, & plant room) |
| **Efisiensi Beban Penuh (Opex)** | Efisien pada beban parsial terdistribusi | Paling efisien pada beban besar konstan (0.52 - 0.60 kW/TR) |
| **Media Distribusi Termal** | Pipa tembaga refrigeran bertekanan tinggi | Pipa baja hidronik air dingin terisolasi polyurethane |
| **Kebutuhan Ruang Pompa** | Minimal (cukup outdoor unit di dak atap) | Butuh chiller room bawah tanah dan cooling tower di atap |
| **Ekspektasi Umur Aset** | 10 - 15 Tahun | 20 - 25+ Tahun |

---

> **Kesimpulan Rekayasa LDP:** "Gunakan VRF untuk proyek renovasi gedung bertingkat rendah yang memiliki keterbatasan ruang ducting dan ruang pompa. Namun untuk gedung perkantoran di atas 10 lantai atau rumah sakit berkapasitas besar, Chiller Water-Cooled tetap menjadi pilihan terbaik dalam kalkulasi siklus hidup 20 tahun (*Life Cycle Cost Analysis*)."
    `
  },
  {
    id: 6,
    title: "Kepatuhan K3 dan Sertifikasi Laik Fungsi (SLF) Sistem Proteksi Kebakaran Gedung",
    slug: "kepatuhan-k3-sertifikasi-slf-proteksi-kebakaran-gedung",
    category: "Plumbing & Fire Safety",
    summary: "Integrasi pompa hidran berstandar NFPA 20, sprinkler otomatis, dan detector asap gedung bertingkat agar lolos verifikasi dinas damkar dan SLF daerah.",
    featured: false,
    image: "/images/airport_complex.jpg",
    author: {
      name: "Fajar Abdilah, S.T.",
      role: "Lead Fire Protection Engineer",
      avatar: "/images/avatar_fajar.jpg"
    },
    publishedAt: "10 September 2026",
    readTime: "5 menit",
    views: 760,
    tags: ["Fire Protection", "SLF Gedung", "NFPA 20", "Sprinkler", "Plumbing K3"],
    content: `
### Mengapa Sertifikat Laik Fungsi (SLF) Sangat Krusial?
Tanpa dokumen Sertifikat Laik Fungsi (SLF), sebuah gedung bertingkat dilarang beroperasi secara legal dan tidak dapat diasuransikan. Salah satu penyebab utama penundaan penerbitan SLF oleh Dinas Cipta Karya & Penataan Ruang adalah **ketidaksesuaian sistem pemadam kebakaran (Fire Fighting System) dengan standar SNI dan NFPA**.

---

### Parameter Verifikasi yang Wajib Dipenuhi:
1. **Performa Pompa Kebakaran (Fire Pump Testing NFPA 20)**: Jockey pump, Electric main pump, dan Diesel standby pump harus diuji kurva kinerjanya pada 100% dan 150% kapasitas flow dengan tekanan head yang sesuai standar.
2. **Kapasitas Cadangan Air Pemadam (Ground Water Tank)**: Volume tangki air bawah tanah harus mencukupi pasokan semburan hidran dan sprinkler minimal selama 45 hingga 90 menit operasi penuh.
3. **Zonasi & Flow Switch Sprinkler**: Setiap lantai gedung harus memiliki katup kendali lantai (*Floor Control Valve*) dengan tamper switch dan water motor gong yang terhubung ke panel FACP (*Fire Alarm Control Panel*).
4. **Sistem Pengendalian Asap Tangga Darurat (Staircase Pressurization Fan)**: Kipas pendorong harus menghasilkan tekanan positif 25 - 50 Pa di tangga darurat agar asap beracun kebakaran tidak memasuki jalur evakuasi penghuni gedung.
    `
  },
  {
    id: 7,
    title: "Kalkulasi Beban Pendingin Cooling Load (CLTD / RTS Method) untuk Sertifikasi Green Building",
    slug: "kalkulasi-cooling-load-cltd-rts-green-building",
    category: "HVAC & Efisiensi Energi",
    summary: "Metodologi perhitungan OTTV selubung bangunan, perolehan panas radiasi kaca, dan beban ventilasi udara segar untuk poin efisiensi energi GBCI Greenship.",
    featured: false,
    image: "/images/building_architecture.jpg",
    author: {
      name: "Dian Pratiwi, S.T.",
      role: "Senior Green Building Engineer",
      avatar: "/images/avatar_dian.jpg"
    },
    publishedAt: "05 September 2026",
    readTime: "6 menit",
    views: 1040,
    tags: ["Cooling Load", "CLTD", "Green Building", "OTTV", "ASHRAE RTS"],
    content: `
### Hubungan Antara Selubung Bangunan dan Kapasitas HVAC
Banyak konsultan perencana konvensional menggunakan metode praktis "rule of thumb" (misal: 1 PK per 15 m²) yang berujung pada chiller yang *oversized*. Dalam sertifikasi Bangunan Gedung Hijau (BGH) dan GBCI Greenship, perhitungan wajib menggunakan metode komputasi presisi seperti **CLTD/SCL/CLF** atau **Radiant Time Series (RTS) Method** berdasar ASHRAE Handbook of Fundamentals.

---

### 3 Parameter Kritis Optimasi Beban Pendingin:
1. **Nilai Perpindahan Termal Menyeluruh (OTTV)**: Sesuai SNI 6389, nilai OTTV dinding fasad gedung di Indonesia tidak boleh melebihi **35 Watt/m²**. Pemilihan kaca Low-E dengan koefisien SHGC (*Solar Heat Gain Coefficient*) rendah memangkas beban radiasi hingga 40%.
2. **Kebutuhan Udara Segar (Outdoor Air Ventilation)**: Menerapkan Demand Controlled Ventilation (DCV) dengan sensor CO2 di ruangan rapat dan ballroom agar tidak membebani evaporator pendingin dengan udara luar yang lembap saat okupansi sepi.
3. **Internal Load Profiling**: Menghitung heat dissipation dari pencahayaan LED modern (< 8 W/m²) dan komputer kantor alih-alih asumsi beban statis berlebihan.
    `
  },
  {
    id: 8,
    title: "Audit & Redesain Sistem Plumbing Air Bersih, Booster Pump & Greywater Gedung Tinggi",
    slug: "audit-redesain-plumbing-air-bersih-greywater-gedung",
    category: "Plumbing & Fire Safety",
    summary: "Mengatasi fluktuasi tekanan air pada lantai-lantai atas, mengurangi konsumsi air PDAM hingga 30%, dan mengimplementasikan water recycling STP ramah lingkungan.",
    featured: false,
    image: "/images/office_presentation.jpg",
    author: {
      name: "Abdul Wahid, A.Md. S.Pd",
      role: "Operational Director",
      avatar: "/images/avatar_habib.jpg"
    },
    publishedAt: "28 Agustus 2026",
    readTime: "5 menit",
    views: 820,
    tags: ["Plumbing", "Booster Pump", "Greywater", "STP Recycling", "Water Conservation"],
    content: `
### Masalah Klasik Plumbing pada Gedung Bertingkat
Tekanan air yang tidak stabil (terlalu kencang di lantai bawah sehingga merusak fitting pipa, atau terlalu lemah di lantai atas sehingga shower tidak mengalir) merupakan keluhan nomor satu pada gedung komersial dan hotel.

Selain masalah kenyamanan, pemborosan air bersih dari ketiadaan sistem daur ulang (*greywater recycling*) menambah beban biaya operasional bulanan hingga puluhan juta rupiah.

---

### Solusi Desain Plumbing Modern oleh LDP:
1. **Zonasi Tekanan Hidrolik (Pressure Reducing Valve - PRV)**: Membagi distribusi air menjadi beberapa zona tekanan gravitasi dan memasang PRV terkalibrasi agar tekanan kran di setiap lantai terjaga pada rentang ideal 1.5 - 2.5 Bar.
2. **Sistem Pompa Booster Inverter VFD**: Menggantikan pressure tank konvensional dengan sistem pompa multi-stage berpenggerak frekuensi variabel agar konsumsi daya listrik mengikuti fluktuasi debit pemakaian secara dinamis.
3. **Pengolahan Air Limbah STP untuk Cooling Tower & Flushing**: Air hasil olahan Sewage Treatment Plant (STP) dengan proses Ultra-Filtration (UF) dapat dialirkan kembali untuk *make-up water* pendingin chiller dan penyiraman tanaman, menghemat hingga 35% pasokan air baku gedung.
    `
  }
];

export const getStoredArticles = () => {
  try {
    const saved = localStorage.getItem('ldp_blog_articles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading stored articles:", e);
  }
  return INITIAL_BLOG_ARTICLES;
};

export default function BlogPage({ onReturnToSite, onOpenConsultation }) {
  const [articles, setArticles] = useState(getStoredArticles);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch articles from Supabase cloud database if configured
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchArticlesFromSupabase().then(cloudArticles => {
        if (cloudArticles && cloudArticles.length > 0) {
          setArticles(cloudArticles);
          try {
            localStorage.setItem('ldp_blog_articles', JSON.stringify(cloudArticles));
          } catch (e) {}
        }
      });
    }
  }, []);

  // Sync with realtime cross-tab events and updates from Admin Dashboard
  useEffect(() => {
    const handleUpdate = (updatedArticles) => {
      if (Array.isArray(updatedArticles) && updatedArticles.length > 0) {
        setArticles(updatedArticles);
      } else {
        setArticles(getStoredArticles());
      }
    };
    const unsubscribe = subscribeToSync(SYNC_EVENTS.BLOG, handleUpdate);
    return unsubscribe;
  }, []);

  // Synchronize dynamic SEO, OpenGraph tags & Schema.org JSON-LD
  useEffect(() => {
    if (selectedArticle) {
      applyArticleSeo(selectedArticle);
    } else {
      applyArticleSeo(null);
    }
    return () => {
      resetSeoToDefault();
    };
  }, [selectedArticle]);

  const categories = [
    'Semua',
    'HVAC & Efisiensi Energi',
    'Cleanroom & Farmasi',
    'MEP Electrical',
    'Data Center & CFD',
    'Plumbing & Fire Safety'
  ];

  // Synchronize URL hash with selected article (e.g. #blog/slug)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#blog/')) {
        const slug = hash.replace('#blog/', '').trim();
        const currentList = getStoredArticles();
        const found = currentList.find(a => a.slug === slug);
        if (found) {
          setSelectedArticle(found);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (hash === '#blog' || hash === '') {
        setSelectedArticle(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    window.location.hash = `#blog/${article.slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
    window.location.hash = '#blog';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchCategory = activeCategory === 'Semua' || article.category === activeCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = query === '' || 
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query) ||
        (article.tags && article.tags.some(t => t.toLowerCase().includes(query))) ||
        (article.author && article.author.name && article.author.name.toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [articles, activeCategory, searchQuery]);

  // Featured article
  const featuredArticle = useMemo(() => {
    return articles.find(a => a.featured) || articles[0];
  }, [articles]);

  const handleCopyShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Helper to parse markdown table blocks into real styled HTML table
  const renderTableBlock = (rawText, key) => {
    const lines = rawText.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;

    const parseCells = (line) => {
      return line.split('|')
        .slice(1, -1)
        .map(cell => cell.trim());
    };

    const headers = parseCells(lines[0]);
    const rowLines = lines.slice(2); // Skip separator (| :--- |)

    return (
      <div key={key} className="blog-table-container">
        <table className="blog-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h.replace(/\*\*/g, '')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLines.map((rowStr, rIdx) => {
              const cells = parseCells(rowStr);
              return (
                <tr key={rIdx}>
                  {cells.map((c, cIdx) => (
                    <td key={cIdx}>
                      {c.includes('**') ? (
                        <span>
                          <strong>{c.replace(/\*\*/g, '')}</strong>
                        </span>
                      ) : (
                        c
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // 1. ARTICLE DETAIL VIEW
  if (selectedArticle) {
    const relatedArticles = articles
      .filter(a => a.id !== selectedArticle.id && (a.category === selectedArticle.category || true))
      .slice(0, 2);

    return (
      <div className="blog-page">
        {/* Sticky Top Reader Navbar */}
        <header className="blog-navbar">
          <div className="blog-navbar-inner">
            <div className="blog-nav-left">
              <button 
                onClick={handleBackToList}
                className="blog-back-btn"
                title="Kembali ke Daftar Artikel"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Daftar Artikel</span>
              </button>
              <div className="blog-nav-divider"></div>
              <div className="blog-nav-brand">
                <div className="blog-brand-icon">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="blog-brand-titles">
                  <div className="blog-brand-title">
                    LDP <span>Journal</span>
                  </div>
                  <div className="blog-brand-subtitle">
                    Technical Knowledge Hub
                  </div>
                </div>
              </div>
            </div>

            <div className="blog-nav-right">
              <button 
                onClick={handleCopyShare}
                className={`blog-share-btn ${copiedLink ? 'copied' : ''}`}
                title="Salin Tautan Artikel Ini"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Tersalin!' : 'Bagikan'}</span>
              </button>
              <button 
                onClick={() => onOpenConsultation && onOpenConsultation(`Diskusi Topik Artikel: ${selectedArticle.title}`)}
                className="blog-nav-cta"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Konsultasi Teknik</span>
              </button>
            </div>
          </div>
        </header>

        {/* Article Reader Container */}
        <article className="blog-reader" itemScope itemType="https://schema.org/TechArticle">
          <meta itemProp="inLanguage" content="id-ID" />
          <meta itemProp="mainEntityOfPage" content={typeof window !== 'undefined' ? window.location.href : ''} />

          {/* Breadcrumbs */}
          <nav className="blog-breadcrumbs" aria-label="Breadcrumb">
            <button onClick={onReturnToSite} className="blog-breadcrumb-link">Beranda</button>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <button onClick={handleBackToList} className="blog-breadcrumb-link">Blog & Jurnal Teknik</button>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span style={{ color: '#0F172A', fontWeight: 700 }} itemProp="articleSection">{selectedArticle.category}</span>
          </nav>

          {/* Category Tag & Metadata */}
          <div className="blog-reader-meta-row">
            <span className="blog-reader-cat-badge">
              {selectedArticle.category}
            </span>
            <span className="blog-card-meta-item">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <time itemProp="datePublished" dateTime={selectedArticle.publishedAt}>{selectedArticle.publishedAt}</time>
            </span>
            <span className="blog-dot-divider">•</span>
            <span className="blog-card-meta-item">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedArticle.readTime} membaca</span>
            </span>
            <span className="blog-dot-divider">•</span>
            <span className="blog-card-meta-item">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedArticle.views} pembaca</span>
            </span>
          </div>

          {/* Article Title */}
          <h1 className="blog-reader-title" itemProp="headline">
            {selectedArticle.title}
          </h1>

          {/* Author Badge Card */}
          <div className="blog-author-card" itemProp="author" itemScope itemType="https://schema.org/Person">
            <img 
              src={selectedArticle.author.avatar} 
              alt={selectedArticle.author.name} 
              className="blog-author-avatar-lg"
              itemProp="image"
            />
            <div className="blog-author-details">
              <div className="blog-author-name-lg" itemProp="name">{selectedArticle.author.name}</div>
              <div className="blog-author-role-lg" itemProp="jobTitle">{selectedArticle.author.role}</div>
              <div className="blog-author-firm" itemProp="worksFor" itemScope itemType="https://schema.org/Organization">
                <span itemProp="name">PT Lintang Duta Perkasa</span> — Konsultan MEP & HVAC
              </div>
            </div>
          </div>

          {/* Security & Verification Seal */}
          <div className="blog-security-seal-wrap">
            <div className="blog-security-seal-badge">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Security Verified & Sanitized: Konten Dilindungi Enkripsi LDP System</span>
            </div>
            <div className="blog-security-seal-sub">
              Bebas Script Berbahaya • Memenuhi Standar ISO/ASHRAE • Standar Mutu Publikasi Rekayasa LDP
            </div>
          </div>

          {/* Hero Banner Image */}
          <div className="blog-reader-hero-img-wrap">
            <img 
              src={selectedArticle.image} 
              alt={selectedArticle.title} 
              className="blog-reader-hero-img"
              itemProp="image"
            />
          </div>

          {/* Executive Summary Box */}
          <div className="blog-summary-callout" itemProp="description">
            <strong>Ringkasan Eksekutif:</strong>
            <p>{selectedArticle.summary}</p>
          </div>

          {/* Main Article Content (Rendered Sanitized Markdown) */}
          <div className="blog-content-body" itemProp="articleBody">
            {sanitizeMarkdownContent(selectedArticle.content).split('\n\n').map((paragraph, index) => {
              const trimmed = paragraph.trim();
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={index} className="blog-content-heading">
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={index} className="blog-blockquote">
                    {trimmed.replace('> ', '').replace(/\*\*/g, '')}
                  </blockquote>
                );
              }
              if (trimmed.startsWith('---')) {
                return <hr key={index} className="blog-divider" />;
              }
              if (trimmed.startsWith('| ')) {
                return renderTableBlock(trimmed, index);
              }
              return (
                <p key={index} className="blog-content-p">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Tags Section */}
          <div className="blog-reader-tags">
            <span className="blog-reader-tags-label">
              <Tag className="w-4 h-4 text-slate-400" />
              <span>Topik Terkait:</span>
            </span>
            {selectedArticle.tags.map((tag, idx) => (
              <span 
                key={idx} 
                onClick={() => {
                  setSearchQuery(tag);
                  handleBackToList();
                }}
                className="blog-reader-tag-pill"
                title={`Cari artikel bertopik ${tag}`}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Bottom Consultation CTA Box */}
          <div className="blog-cta-box">
            <div className="blog-cta-glow"></div>
            <div className="blog-cta-inner">
              <span className="blog-cta-badge">
                <Sparkles className="w-3.5 h-3.5" />
                DISKUSI REKAYASA TEKNIK
              </span>
              <h4 className="blog-cta-title">
                Membutuhkan Analisis atau Audit Terkait Fasilitas Anda?
              </h4>
              <p className="blog-cta-desc">
                Tim insinyur spesialis MEP & HVAC dari PT Lintang Duta Perkasa siap memberikan pendampingan teknis independen, perhitungan beban detail, maupun review desain sistem fasilitas gedung Anda.
              </p>
              <div className="blog-cta-buttons">
                <button 
                  onClick={() => onOpenConsultation && onOpenConsultation(`Konsultasi Artikel: ${selectedArticle.title}`)}
                  className="blog-cta-btn-primary"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Jadwalkan Konsultasi Gratis</span>
                </button>
                <a 
                  href={`https://wa.me/6283874078144?text=${encodeURIComponent(`Halo Tim LDP Consultant, saya ingin berdiskusi mengenai topik artikel: "${selectedArticle.title}"`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blog-cta-btn-wa"
                >
                  <span>WhatsApp Engineering</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a 
                  href={`mailto:consultant@ldpgroup.co.id?subject=${encodeURIComponent(`Diskusi Teknis: ${selectedArticle.title}`)}`}
                  className="blog-cta-btn-wa"
                  style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38BDF8' }}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Insinyur</span>
                </a>
              </div>
            </div>
          </div>

          {/* Related Articles Section */}
          <div className="blog-related-section">
            <h3 className="blog-related-heading">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <span>Artikel Rekomendasi Terkait</span>
            </h3>
            <div className="blog-related-grid">
              {relatedArticles.map((art) => (
                <div 
                  key={art.id} 
                  onClick={() => handleSelectArticle(art)}
                  className="blog-card"
                >
                  <div className="blog-card-media" style={{ height: '180px' }}>
                    <img src={art.image} alt={art.title} className="blog-card-img" />
                    <span className="blog-card-cat-badge">{art.category}</span>
                  </div>
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <span className="blog-card-meta-item">
                        <Clock className="w-3 h-3" />
                        <span>{art.readTime}</span>
                      </span>
                      <span>•</span>
                      <span>{art.publishedAt}</span>
                    </div>
                    <h5 className="blog-card-title">{art.title}</h5>
                    <p className="blog-card-summary">{art.summary}</p>
                  </div>
                  <div className="blog-card-footer">
                    <div className="blog-card-author">
                      <img src={art.author.avatar} alt={art.author.name} className="blog-card-avatar" />
                      <span className="blog-card-author-name">{art.author.name}</span>
                    </div>
                    <span className="blog-card-action">
                      Baca <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    );
  }

  // 2. MAIN BLOG DIRECTORY / HUB VIEW
  return (
    <div className="blog-page">
      {/* Blog Top Header Bar */}
      <header className="blog-navbar">
        <div className="blog-navbar-inner">
          <div className="blog-nav-left">
            <button 
              onClick={onReturnToSite}
              className="blog-back-btn"
              title="Kembali ke Beranda Utama LDP"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ke Beranda Utama</span>
            </button>
            <div className="blog-nav-divider"></div>
            <div className="blog-nav-brand">
              <div className="blog-brand-icon">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="blog-brand-titles">
                <div className="blog-brand-title">
                  LDP <span>Engineering Journal</span>
                </div>
                <div className="blog-brand-subtitle">
                  Wawasan Konsultan MEP & HVAC
                </div>
              </div>
            </div>
          </div>

          <div className="blog-nav-right">
            <button 
              onClick={() => onOpenConsultation && onOpenConsultation('Konsultasi dari Blog LDP')}
              className="blog-nav-cta"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Konsultasi Gratis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="blog-hero">
        <div className="blog-hero-glow-1"></div>
        <div className="blog-hero-glow-2"></div>
        
        <div className="blog-hero-content">
          <div className="blog-hero-badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>KNOWLEDGE HUB & ENGINEERING INSIGHTS</span>
          </div>

          <h1 className="blog-hero-title">
            Artikel Teknik, Panduan HVAC &amp; <span>Analisis MEP Modern</span>
          </h1>

          <p className="blog-hero-desc">
            Wawasan profesional dari para direksi dan tim konsultan teknik PT Lintang Duta Perkasa mengenai efisiensi energi, audit termal, simulasi CFD 3D, dan kepatuhan standar industri.
          </p>

          {/* Search Box */}
          <div className="blog-search-container">
            <div className="blog-search-box">
              <Search className="blog-search-icon w-5 h-5" />
              <input 
                type="text"
                placeholder="Cari artikel (misal: Chiller, ASHRAE, Cleanroom, CFD, Pompa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="blog-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="blog-search-clear"
                >
                  ✕ Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="blog-main">
        {/* Category Filter Pills Bar */}
        <div className="blog-category-bar">
          <Filter className="blog-category-filter-icon w-4 h-4" />
          {categories.map((cat) => {
            const count = cat === 'Semua' 
              ? articles.length 
              : articles.filter(a => a.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`blog-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              >
                <span>{cat}</span>
                <span className="blog-cat-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Featured Article Card (Shown when on 'Semua' and no search query) */}
        {activeCategory === 'Semua' && searchQuery === '' && featuredArticle && (
          <div 
            onClick={() => handleSelectArticle(featuredArticle)}
            className="blog-featured-card"
          >
            <div className="blog-featured-image-wrap">
              <img 
                src={featuredArticle.image} 
                alt={featuredArticle.title} 
                className="blog-featured-image"
              />
              <span className="blog-featured-badge">
                <Flame className="w-3.5 h-3.5 fill-white" />
                ARTIKEL UTAMA MINGGU INI
              </span>
            </div>

            <div className="blog-featured-content">
              <div className="blog-featured-top">
                <div className="blog-featured-meta-row">
                  <span className="blog-category-tag">{featuredArticle.category}</span>
                  <span className="blog-dot-divider">•</span>
                  <span className="blog-card-meta-item">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{featuredArticle.publishedAt}</span>
                  </span>
                  <span className="blog-dot-divider">•</span>
                  <span className="blog-card-meta-item">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{featuredArticle.readTime}</span>
                  </span>
                </div>

                <h3 className="blog-featured-title">
                  {featuredArticle.title}
                </h3>

                <p className="blog-featured-summary">
                  {featuredArticle.summary}
                </p>
              </div>

              <div className="blog-featured-footer">
                <div className="blog-author-mini">
                  <img 
                    src={featuredArticle.author.avatar} 
                    alt={featuredArticle.author.name} 
                    className="blog-author-avatar-sm"
                  />
                  <div className="blog-author-info-sm">
                    <span className="blog-author-name-sm">{featuredArticle.author.name}</span>
                    <span className="blog-author-role-sm">{featuredArticle.author.role}</span>
                  </div>
                </div>

                <span className="blog-read-link">
                  <span>Baca Selengkapnya</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="blog-section-header">
          <h3 className="blog-section-title">
            <BookOpen className="w-5 h-5 text-orange-500" />
            <span>Koleksi Artikel Teknik</span>
            <span className="blog-results-badge">
              {filteredArticles.length} Artikel
            </span>
          </h3>

          {(searchQuery || activeCategory !== 'Semua') && (
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('Semua'); }}
              className="blog-cat-btn"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {filteredArticles.length === 0 ? (
          <div className="blog-empty-state">
            <div className="blog-empty-icon">
              <BookOpen className="w-8 h-8" />
            </div>
            <h4 className="blog-empty-title">Artikel Tidak Ditemukan</h4>
            <p className="blog-empty-desc">
              Tidak ada artikel yang cocok dengan kata kunci "{searchQuery}" pada kategori {activeCategory}. Coba gunakan kata kunci lain seperti "Chiller", "CFD", atau "ASHRAE".
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('Semua'); }}
              className="blog-cta-btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.82rem', margin: '0 auto' }}
            >
              Lihat Semua Artikel
            </button>
          </div>
        ) : (
          /* Article Cards Grid */
          <div className="blog-grid">
            {filteredArticles.map((article) => (
              <article 
                key={article.id}
                onClick={() => handleSelectArticle(article)}
                className="blog-card"
              >
                <div>
                  {/* Thumbnail Image */}
                  <div className="blog-card-media">
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      className="blog-card-img"
                    />
                    <span className="blog-card-cat-badge">
                      {article.category}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <span className="blog-card-meta-item">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{article.publishedAt}</span>
                      </span>
                      <span>•</span>
                      <span className="blog-card-meta-item">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{article.readTime}</span>
                      </span>
                    </div>

                    <h4 className="blog-card-title">
                      {article.title}
                    </h4>

                    <p className="blog-card-summary">
                      {article.summary}
                    </p>

                    {/* Tags */}
                    <div className="blog-card-tags">
                      {article.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="blog-tag-chip">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Meta */}
                <div className="blog-card-footer">
                  <div className="blog-card-author">
                    <img 
                      src={article.author.avatar} 
                      alt={article.author.name} 
                      className="blog-card-avatar"
                    />
                    <span className="blog-card-author-name">{article.author.name}</span>
                  </div>
                  <span className="blog-card-action">
                    Baca <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Consultation Banner in Directory */}
        <div className="blog-directory-banner">
          <div className="blog-dir-banner-left">
            <span className="blog-dir-banner-badge">KONSULTASI TEKNIS MEP &amp; HVAC</span>
            <h4 className="blog-dir-banner-title">
              Punya Studi Kasus Gedung yang Ingin Dibedah?
            </h4>
            <p className="blog-dir-banner-desc">
              Diskusikan perencanaan HVAC, review gambar CAD/BIM, dan audit efisiensi energi gedung Anda langsung bersama tim insinyur senior PT Lintang Duta Perkasa.
            </p>
          </div>
          <button 
            onClick={() => onOpenConsultation && onOpenConsultation('Konsultasi dari Banner Blog LDP')}
            className="blog-cta-btn-primary"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Minta Jadwal Diskusi</span>
          </button>
        </div>
      </main>
    </div>
  );
}
