import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Wrench, 
  Zap, 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Layers, 
  ChevronRight, 
  Activity, 
  Users, 
  Sparkles, 
  X,
  MessageSquare,
  Check,
  Download,
  ExternalLink,
  Menu,
  Calculator,
  ChevronDown,
  Clock,
  ShieldAlert,
  BarChart3,
  Sliders,
  CheckSquare,
  ArrowUp,
  BookOpen
} from 'lucide-react';
import AdminDashboard, { 
  getStoredTeamMembers, 
  getStoredProjects, 
  getStoredSiteSettings,
  DEFAULT_SITE_SETTINGS 
} from './components/AdminDashboard';
import BlogPage, { INITIAL_BLOG_ARTICLES, getStoredArticles } from './components/BlogPage';
import WhatsAppWidget from './components/WhatsAppWidget';
import { 
  MwGroupLogoSVG, 
  DmtLogoSVG, 
  ShitsudoLogoSVG, 
  LdpGroupLogoSVG, 
  OriLogoSVG, 
  MceLogoSVG, 
  MmaLogoSVG 
} from './components/MWGroupLogos';
import { 
  submitConsultationLead,
  fetchTeamMembersFromSupabase,
  fetchWhatsAppContactsFromSupabase,
  fetchProjectsFromSupabase,
  fetchSiteSettingsFromSupabase,
  fetchArticlesFromSupabase,
  isSupabaseConfigured
} from './lib/supabaseClient';
import {
  subscribeToSync,
  broadcastSync,
  STORAGE_KEYS,
  SYNC_EVENTS
} from './utils/syncManager';

export default function App() {
  // Admin Mode State
  const [isAdminMode, setIsAdminMode] = useState(false);
  // Blog Page State
  const [isBlogMode, setIsBlogMode] = useState(false);

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'consultation', 'project', 'legal'
  const [selectedProject, setSelectedProject] = useState(null);
  const [portfolioFilter, setPortfolioFilter] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Dynamic WhatsApp Phone State
  const [waPhone, setWaPhone] = useState('6283874078144');

  const loadWaPhone = (incomingContacts) => {
    try {
      const list = incomingContacts || (() => {
        const saved = localStorage.getItem(STORAGE_KEYS.WA);
        return saved ? JSON.parse(saved) : null;
      })();
      if (Array.isArray(list) && list.length > 0) {
        const activeFirst = list.find(c => c.active !== false);
        if (activeFirst && activeFirst.phone) {
          setWaPhone(activeFirst.phone.replace(/[^0-9]/g, ''));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronized Blog Articles State
  const [blogArticles, setBlogArticles] = useState(getStoredArticles);

  // Synchronized Team & Directors State
  const [teamMembers, setTeamMembers] = useState(getStoredTeamMembers);

  // Synchronized Projects Portfolio State
  const [projectsList, setProjectsList] = useState(getStoredProjects);

  // Synchronized Site & Legality Settings State
  const [siteSettings, setSiteSettings] = useState(getStoredSiteSettings);

  // Real-Time Cross-Tab & Supabase Synchronization
  useEffect(() => {
    // 1. Initial WhatsApp phone load
    loadWaPhone();

    // 2. Subscribe to syncManager events (BroadcastChannel + CustomEvents + Storage)
    const unsubWa = subscribeToSync(SYNC_EVENTS.WA, (updatedWa) => {
      loadWaPhone(updatedWa);
    });

    const unsubTeam = subscribeToSync(SYNC_EVENTS.TEAM, (updatedTeam) => {
      setTeamMembers(updatedTeam && updatedTeam.length > 0 ? updatedTeam : getStoredTeamMembers());
    });

    const unsubBlog = subscribeToSync(SYNC_EVENTS.BLOG, (updatedArticles) => {
      setBlogArticles(updatedArticles && updatedArticles.length > 0 ? updatedArticles : getStoredArticles());
    });

    const unsubProjects = subscribeToSync(SYNC_EVENTS.PROJECTS, (updatedProjects) => {
      setProjectsList(updatedProjects && updatedProjects.length > 0 ? updatedProjects : getStoredProjects());
    });

    const unsubSettings = subscribeToSync(SYNC_EVENTS.SETTINGS, (updatedSettings) => {
      setSiteSettings(updatedSettings ? { ...DEFAULT_SITE_SETTINGS, ...updatedSettings } : getStoredSiteSettings());
    });

    // 3. Cloud fetch from Supabase if configured (only populates if local is empty)
    if (isSupabaseConfigured()) {
      fetchTeamMembersFromSupabase().then((data) => {
        if (data && data.length > 0) {
          const hasLocal = localStorage.getItem(STORAGE_KEYS.TEAM);
          if (!hasLocal) {
            setTeamMembers(data);
            localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(data));
          }
        }
      });
      fetchWhatsAppContactsFromSupabase().then((data) => {
        if (data && data.length > 0) {
          const hasLocal = localStorage.getItem(STORAGE_KEYS.WA);
          if (!hasLocal) {
            localStorage.setItem(STORAGE_KEYS.WA, JSON.stringify(data));
            loadWaPhone(data);
          }
        }
      });
      fetchProjectsFromSupabase().then((data) => {
        if (data && data.length > 0) {
          const hasLocal = localStorage.getItem(STORAGE_KEYS.PROJECTS);
          if (!hasLocal) {
            setProjectsList(data);
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(data));
          }
        }
      });
      fetchSiteSettingsFromSupabase().then((data) => {
        if (data) {
          const hasLocal = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          if (!hasLocal) {
            const merged = { ...DEFAULT_SITE_SETTINGS, ...data };
            setSiteSettings(merged);
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
          }
        }
      });
      fetchArticlesFromSupabase().then((data) => {
        if (data && data.length > 0) {
          const hasLocal = localStorage.getItem(STORAGE_KEYS.BLOG);
          if (!hasLocal) {
            setBlogArticles(data);
            localStorage.setItem(STORAGE_KEYS.BLOG, JSON.stringify(data));
          }
        }
      });
    }

    return () => {
      unsubWa();
      unsubTeam();
      unsubBlog();
      unsubProjects();
      unsubSettings();
    };
  }, []);

  // When returning from Admin mode, refresh all states from local storage immediately
  useEffect(() => {
    if (!isAdminMode) {
      loadWaPhone();
      setTeamMembers(getStoredTeamMembers());
      setBlogArticles(getStoredArticles());
      setProjectsList(getStoredProjects());
      setSiteSettings(getStoredSiteSettings());
    }
  }, [isAdminMode]);

  // Calculator State
  const [calcBuildingType, setCalcBuildingType] = useState('office'); // office, factory, hospital, datacenter, mall
  const [calcArea, setCalcArea] = useState(1500); // m²

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Separate Route Detection (#admin, #blog)
  useEffect(() => {
    const checkRoutes = () => {
      const isHashAdmin = window.location.hash === '#admin';
      const isPathAdmin = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
      const isHashBlog = window.location.hash === '#blog' || window.location.hash.startsWith('#blog');
      const isPathBlog = window.location.pathname === '/blog' || window.location.pathname === '/blog/';

      if (isHashAdmin) {
        setIsAdminMode(true);
        setIsBlogMode(false);
      } else if (isPathAdmin && (!window.location.hash || window.location.hash === '' || window.location.hash === '#')) {
        setIsAdminMode(true);
        setIsBlogMode(false);
      } else if (isHashBlog || isPathBlog) {
        setIsBlogMode(true);
        setIsAdminMode(false);
      } else {
        if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/blog')) {
          window.history.pushState({}, '', '/' + (window.location.hash || ''));
        }
        setIsAdminMode(false);
        setIsBlogMode(false);
      }
    };

    checkRoutes();
    window.addEventListener('hashchange', checkRoutes);
    window.addEventListener('popstate', checkRoutes);
    return () => {
      window.removeEventListener('hashchange', checkRoutes);
      window.removeEventListener('popstate', checkRoutes);
    };
  }, []);

  // Auto-scroll to section on hash anchor (e.g., #direksi, #portofolio, #kontak)
  useEffect(() => {
    if (!isAdminMode && !isBlogMode && window.location.hash) {
      const hash = window.location.hash;
      if (hash && hash !== '#' && hash !== '#admin' && !hash.startsWith('#blog')) {
        const timer = setTimeout(() => {
          try {
            const el = document.querySelector(hash);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          } catch (e) {
            // invalid selector
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isAdminMode, isBlogMode]);

  // Set browser tab title dynamically
  useEffect(() => {
    if (isAdminMode) {
      document.title = "Portal Admin | LDP Technical Consultant";
    } else if (isBlogMode) {
      document.title = "Blog & Publikasi Teknik | LDP Technical Consultant";
    } else {
      document.title = "LDP Technical Consultant";
    }
  }, [isAdminMode, isBlogMode]);

  const handleReturnToSite = () => {
    setIsAdminMode(false);
    setIsBlogMode(false);
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/blog')) {
      window.history.pushState({}, '', '/');
    }
    if (window.location.hash === '#admin' || window.location.hash === '#blog') {
      window.location.hash = '';
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectType: 'Gedung Komersial',
    message: ''
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.log(err);
    }
    
    // Submit lead to Supabase (or localStorage fallback)
    submitConsultationLead({
      name: formData.name,
      email: formData.email,
      service_type: formData.projectType,
      message: formData.message
    });

    setToastMessage("Permintaan konsultasi Anda telah berhasil dikirim! Tim konsultan LDP akan menghubungi Anda dalam 1x24 jam.");
    setActiveModal(null);
    setFormData({ name: '', email: '', projectType: 'Gedung Komersial', message: '' });

    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const openProjectModal = (project) => {
    setSelectedProject(project);
    setActiveModal('project');
  };

  // Dynamic Portfolio Projects (Synchronized with Admin & Supabase)
  const filteredProjects = portfolioFilter === 'all' 
    ? projectsList 
    : projectsList.filter(p => p.category === portfolioFilter);

  // Services Data
  const services = [
    {
      id: "mep",
      icon: <Zap className="w-6 h-6" />,
      title: "MEP Planning & Design Consultation",
      description: "Perencanaan elektrikal, plumbing, hidran, proteksi kebakaran, grounding & proteksi petir bangunan komersial maupun industri.",
      bullets: [
        "Engineering Design & Schematics 2D/3D",
        "Technical Calculation (Short Circuit & Drop Voltage)",
        "Penyusunan Spesifikasi Teknis & Dokumentasi Tender"
      ]
    },
    {
      id: "hvac",
      icon: <Building2 className="w-6 h-6" />,
      title: "HVAC Planning & Chiller Design",
      description: "Desain VRF/VRV, Chiller plant sentral, ducting presisi, ventilasi industri, dan kontrol kelembaban udara ruangan steril sesuai standar ASHRAE.",
      bullets: [
        "Chiller System & Air Handler Unit (AHU) Design",
        "Heat Load Calculation & Psychrometric Analysis",
        "Energy Efficiency & Precision Thermal Control"
      ]
    },
    {
      id: "audit",
      icon: <Activity className="w-6 h-6" />,
      title: "Technical Assessment & Audit Performa",
      description: "Audit performa sistem HVAC, identifikasi kelemahan termal, efisiensi energi, dan audit kelayakan teknis keselamatan bangunan gedung.",
      bullets: [
        "Thermal Inspection & Infrared Thermal Imaging",
        "Performance Analysis & Power Savings Advisory",
        "Safety Code & Regulatory Compliance Audit"
      ]
    },
    {
      id: "supervision",
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Project Supervision & QA/QC Commissioning",
      description: "Pengawasan pelaksanaan teknik konstruksi dilapangan, penjaminan mutu komponen, supervisi instalasi, hingga pengujian commissioning.",
      bullets: [
        "Installation Inspection & Quality Control Protocol",
        "HSE Safety & Code Compliance Verification",
        "Testing, Adjusting, Balancing (TAB) & Commissioning"
      ]
    },
    {
      id: "qs",
      icon: <FileText className="w-6 h-6" />,
      title: "Quantity Surveying (QS) & BoQ Estimation",
      description: "Perhitungan BoQ (Bill of Quantities) akurat, estimasi biaya MEP, audit RAB, dan manajemen strategi pengadaan material berkualitas.",
      bullets: [
        "Cost Estimation & Capital Budgeting",
        "Detailed Quantity Take-Off (BoQ MEP & HVAC)",
        "Value Engineering Strategy for Cost Savings"
      ]
    },
    {
      id: "advisory",
      icon: <Award className="w-6 h-6" />,
      title: "Technical Advisory & Feasibility Study",
      description: "Pendampingan regulasi, kesesuaian standar SNI/ASHRAE, advis teknis untuk bangunan pencakar langit, fasilitas publik, & pabrik manufaktur.",
      bullets: [
        "Technical Advisory & SLF Compliance Assistance",
        "Feasibility Study & Environmental Impact Assessment",
        "Standard Safety & Code Enforcement Strategy"
      ]
    }
  ];

  // FAQ Data
  const faqs = [
    {
      q: "Mengapa penting memilih Konsultan Teknik MEP & HVAC independen?",
      a: "Konsultan independen seperti LDP Technical Consultant memastikan perancangan sistem dilakukan murni berbasis kebutuhan efisiensi dan keamanan gedung tanpa konflik kepentingan penualan merek material. Kami mengoptimalkan spesifikasi (Value Engineering) sehingga investasi aset Anda menjadi efisien dan berumur panjang."
    },
    {
      q: "Berapa lama estimasi pengerjaan desain awal & BoQ MEP?",
      a: "Tergantung pada skala dan kompleksitas proyek. Untuk gedung perkantoran atau komersial menengah (5.000 - 15.000 m²), konsep awal dan perhitungan BoQ umumnya diselesaikan dalam waktu 10-14 hari kerja."
    },
    {
      q: "Apakah PT Lentang Duta Perkasa terverifikasi secara hukum di Indonesia?",
      a: "Ya. Kami terdaftar resmi di OSS Kementerian Investasi RI dengan NIB 0129116242975 dan memiliki sertifikasi manajemen mutu ISO 9001:2015 serta ISO 45001:2018 (K3). Seluruh insinyur kami memegang sertifikasi keahlian STRA / SKA LPJK Utama."
    },
    {
      q: "Apakah LDP Consultant melayani proyek di luar wilayah Jabodetabek?",
      a: "Tentu saja. Portofolio kami mencakup proyek-proyek strategis di seluruh Indonesia, seperti Pembangkit Panas Bumi di Sumatera Barat hingga Kompleks Fasilitas Freeport di Timika, Papua."
    },
    {
      q: "Bagaimana cara memulai konsultasi pertama dengan tim ahli LDP?",
      a: "Anda dapat mengisi formulir jadwal konsultasi gratis di website ini atau menghubungi WhatsApp resmi kami di +62 821 1162 4297. Tim konsultan kami siap menjadwalkan diskusi teknis dalam 1x24 jam."
    }
  ];

  // Calculation Logic for Calculator Widget
  const getCalcResults = () => {
    let factor = 0.08; // default TR per m² for office
    let powerFactor = 1.1; // kW per TR
    
    if (calcBuildingType === 'factory') { factor = 0.11; powerFactor = 1.3; }
    else if (calcBuildingType === 'hospital') { factor = 0.12; powerFactor = 1.45; }
    else if (calcBuildingType === 'datacenter') { factor = 0.22; powerFactor = 1.6; }
    else if (calcBuildingType === 'mall') { factor = 0.095; powerFactor = 1.25; }

    const tonsRefrigeration = Math.round(calcArea * factor);
    const estimatedKW = Math.round(tonsRefrigeration * powerFactor);
    const estimatedMonthlySavings = Math.round(estimatedKW * 24 * 30 * 1500 * 0.22); // 22% energy optimization savings in IDR

    return {
      tr: tonsRefrigeration,
      kw: estimatedKW,
      savingsIDR: estimatedMonthlySavings.toLocaleString('id-ID')
    };
  };

  // Corporate Clients Data (17 Clients from Company Profile)
  const corporateClients = [
    { name: 'Pupuk Kujang Cikampek', logo: '/images/clients/pupuk_kujang.png', cat: 'Industri Kimia & Pupuk BUMN' },
    { name: 'Kapal Api Group', logo: '/images/clients/kapal_api.png', cat: 'Industri Pengolahan Kopi & F&B' },
    { name: 'Bio Farma', logo: '/images/clients/biofarma.png', cat: 'Industri Farmasi & Vaksin' },
    { name: 'PT. Marin Liza Farmasi', logo: '/images/clients/marin_liza.png', cat: 'Industri Farmasi & Lab Steril' },
    { name: 'MAYORA', logo: '/images/clients/mayora.png', cat: 'Manufaktur Makanan & Minuman' },
    { name: 'British American Tobacco', logo: '/images/clients/bat.png', cat: 'Manufaktur Industri Multinasional' },
    { name: 'Kino Indonesia', logo: '/images/clients/kino.png', cat: 'Fast-Moving Consumer Goods (FMCG)' },
    { name: 'Abbott Laboratories', logo: '/images/clients/abbott.png', cat: 'Fasilitas Kesehatan Multinasional' },
    { name: 'SANTOSA HOSPITAL', logo: '/images/clients/santosa_hospital.png', cat: 'Rumah Sakit & Ruang Steril' },
    { name: 'SOHO Global Health', logo: '/images/clients/soho.png', cat: 'Industri Farmasi & Herbal' },
    { name: 'Otsuka', logo: '/images/clients/otsuka.png', cat: 'Cleanroom & Nutraceuticals' },
    { name: 'Kalbe', logo: '/images/clients/kalbe.png', cat: 'Farmasi & Layanan Kesehatan' },
    { name: 'Sido Muncul', logo: '/images/clients/sidomuncul.png', cat: 'Manufaktur Farmasi Herbal' },
    { name: 'Sakafarma Laboratories', logo: '/images/clients/sakafarma.png', cat: 'Healthcare & OTC (A Kalbe Co.)' },
    { name: 'Supreme Energy', logo: '/images/clients/supreme_energy.png', cat: 'Pembangkit Listrik Geothermal' },
    { name: 'PDG Data Center', logo: '/images/clients/pdg.png', cat: 'Critical Data Center Infrastructure' },
    { name: 'PT Freeport Indonesia', logo: '/images/clients/freeport.png', cat: 'Pertambangan & Industri Berat' }
  ];

  const calcRes = getCalcResults();

  if (isAdminMode) {
    return <AdminDashboard onReturnToSite={handleReturnToSite} />;
  }

  if (isBlogMode) {
    return (
      <>
        <BlogPage 
          onReturnToSite={handleReturnToSite}
          onOpenConsultation={(topic) => {
            setIsBlogMode(false);
            setActiveModal('consultation');
            if (topic) {
              setFormData(prev => ({ ...prev, message: `${topic}\n\n` }));
            }
          }}
        />
        <WhatsAppWidget />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans relative">
      

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-sm text-emerald-300">Permintaan Terkirim!</h5>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* TOP BAR / HEADER */}
      <header className="navbar">
        <div className="container navbar-container">
          <a href="#" className="brand-logo" aria-label="Beranda LDP Technical Consultant">
            <img 
              src="/images/ldp_logo.png" 
              alt="PT Lentang Duta Perkasa - LDP Technical Consultant" 
              className="brand-logo-img" 
            />
          </a>

          {/* Desktop Nav */}
          <ul className="nav-links">
            <li><a href="#beranda" className="nav-link active">Beranda</a></li>
            <li><a href="#profil" className="nav-link">Profil</a></li>
            <li><a href="#layanan" className="nav-link">Layanan</a></li>
            <li><a href="#kalkulator" className="nav-link">Kalkulator</a></li>
            <li><a href="#portofolio" className="nav-link">Portofolio</a></li>
            <li><a href="#direksi" className="nav-link">Tim</a></li>
            <li><a href="#blog" onClick={() => { setIsBlogMode(true); window.scrollTo({ top: 0 }); }} className="nav-link">Blog</a></li>
            <li><a href="#faq" className="nav-link">FAQ</a></li>
          </ul>

          <div className="navbar-actions">
            <button 
              onClick={() => setActiveModal('consultation')}
              className="nav-cta-btn"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Konsultasi Gratis</span>
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="mobile-menu-btn"
              aria-label={mobileMenuOpen ? "Tutup Menu" : "Buka Menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="mobile-nav-drawer" aria-label="Navigasi Menu Mobile">
            <div className="mobile-nav-links">
              <a href="#beranda" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Beranda</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#profil" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Profil Perusahaan</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#layanan" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Layanan MEP & HVAC</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#kalkulator" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Kalkulator Beban</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#portofolio" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Portofolio Proyek</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#direksi" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Tim & Direksi</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#blog" onClick={() => { setMobileMenuOpen(false); setIsBlogMode(true); window.scrollTo({ top: 0 }); }} className="mobile-nav-link">
                <span>Blog & Artikel Teknik</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Pertanyaan FAQ</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
              <a href="#kontak" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">
                <span>Hubungi Kami</span>
                <ChevronRight className="w-4 h-4 mobile-nav-arrow" />
              </a>
            </div>
            <div className="mobile-nav-cta">
              <button 
                onClick={() => { setMobileMenuOpen(false); setActiveModal('consultation'); }}
                className="btn-primary mobile-cta-btn"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Konsultasi Gratis</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* HERO SECTION */}
      <section id="beranda" className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="container">
          <div className="hero-grid">
            {/* Left Content */}
            <div className="hero-content">
              
              <h1>
                Professional Engineering <br />
                <span className="blue-highlight">Consultant for MEP & HVAC</span> Systems
              </h1>

              <p className="hero-description">
                Mitra andalan rekayasa teknik terpercaya untuk perancangan, audit termal, dan supervisi sistem kelistrikan, mekanikal, pendingin udara (HVAC), serta infrastruktur gedung di Indonesia. Memberikan kepastian performa presisi tinggi & efisiensi daya jangka panjang.
              </p>

              <div className="hero-actions">
                <a href="#layanan" className="btn-primary">
                  <span>Eksplorasi Layanan</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button onClick={() => setActiveModal('consultation')} className="btn-secondary">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span>Jadwal Diskusi Teknik</span>
                </button>
              </div>

              {/* Stats Bar */}
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">100+</span>
                  <span className="stat-label">Proyek Selesai</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">CFD 3D</span>
                  <span className="stat-label">Simulasi Aliran Udara</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Kepatuhan SNI/ASHRAE</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">&lt; 2%</span>
                  <span className="stat-label">Margin Desain Error</span>
                </div>
              </div>
            </div>

            {/* Right Media Card */}
            <div className="hero-image-container">
              <img 
                src="/images/hero_engineer.jpg" 
                alt="Assistant Director Head of MEP Engineering" 
                className="hero-image"
              />
              <div className="hero-floating-card">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-[11px] font-bold text-emerald-400 tracking-wider">LIVE STATUS: ACTIVE CONSULTANT</span>
                  </div>
                  <div className="floating-title">Assistant Director</div>
                  <div className="floating-sub">Head of MEP & HVAC Engineering</div>
                </div>
                <div className="floating-badge-icon">
                  <Award className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ABOUT SECTION / PROFIL */}
      <section id="profil" className="about-section">
        <div className="container">
          <div className="about-grid">
            {/* Left Image Collage */}
            <div className="collage-grid">
              <div className="collage-item collage-item-1">
                <img src="/images/office_presentation.jpg" alt="MEP Team Presentation" />
              </div>
              <div className="collage-item collage-item-2">
                <img src="/images/building_architecture.jpg" alt="Modern Architecture Tower" />
              </div>
              <div className="collage-item collage-item-3">
                <img src="/images/cad_workstation.jpg" alt="BIM CAD Workstation" />
              </div>
            </div>

            {/* Right Text Content */}
            <div className="about-text">
              <div className="section-badge blue">
                <Layers className="w-3.5 h-3.5" />
                <span>ABOUT US - LDP CONSULTANT</span>
              </div>

              <h2>LDP Technical Consultant <br /><span className="text-blue-600">Part of MW Group</span></h2>

              <p>
                <strong>PT Lentang Duta Perkasa (LDP Technical Consultant)</strong> adalah entitas konsultan teknik profesional yang berfokus pada perancangan sistem MEP (Mechanical, Electrical & Plumbing) serta HVAC Engineering modern. Kami mendampingi pemilik gedung, kontraktor EPC, dan pengembang industri dari tahap konsep awal hingga pengujian commissioning.
              </p>

              <p>
                Sebagai bagian dari MW Group, kami menghadirkan solusi rekayasa terpadu, menerapkan regulasi keselamatan standar tinggi, efisiensi energi terkini, serta optimasi anggaran (Value Engineering) untuk memastikan investasi aset Anda bekerja dengan performa maksimal.
              </p>

              {/* 3 Pillars */}
              <div className="about-features">
                <div className="feature-box">
                  <div className="feature-title flex items-center gap-2">
                    <Award className="w-4 h-4 text-orange-500" />
                    <span>Keahlian</span>
                  </div>
                  <div className="feature-desc">Tim insinyur bersertifikat nasional & internasional (SKA / STRA Utama LPJK).</div>
                </div>
                <div className="feature-box">
                  <div className="feature-title flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span>Presisi Tinggi</span>
                  </div>
                  <div className="feature-desc">Simulasi CFD & modeling BIM 3D presisi untuk nihil benturan (clash detection).</div>
                </div>
                <div className="feature-box">
                  <div className="feature-title flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Profesional</span>
                  </div>
                  <div className="feature-desc">Pelayanan terintegrasi, pengerjaan tepat waktu, dan laporan teknis transparan.</div>
                </div>
              </div>

              {/* Our Vision & Mission */}
              <div className="vision-mission-grid">
                
                {/* Vision Card */}
                <div className="vision-card">
                  <div className="vm-badge-header">
                    <div className="vm-arrow-icon blue"></div>
                    <div>
                      <h4 className="vm-title blue">Vision / Visi</h4>
                      <p className="vm-subtitle">Trusted Partner in MEP & HVAC Engineering</p>
                    </div>
                  </div>
                  <p className="vision-text">
                    "Menjadi konsultan MEP & HVAC yang terpercaya, profesional, dan inovatif."
                  </p>
                </div>

                {/* Mission Card */}
                <div className="mission-card">
                  <div className="vm-badge-header">
                    <div className="vm-arrow-icon orange"></div>
                    <div>
                      <h4 className="vm-title orange">Mission / Misi</h4>
                      <p className="vm-subtitle">Komitmen Layanan & Mutu Rekayasa</p>
                    </div>
                  </div>
                  <ul className="mission-list">
                    <li>
                      <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>Memberikan solusi engineering yang berkualitas.</span>
                    </li>
                    <li>
                      <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>Mengutamakan profesionalisme dan kepuasan klien.</span>
                    </li>
                    <li>
                      <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>Menciptakan solusi yang efisien dan berkelanjutan.</span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MW GROUP ECOSYSTEM SECTION */}
      <section id="ekosistem" className="mw-ecosystem-section">
        <div className="container">
          
          {/* Header */}
          <div className="section-header center" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="section-badge blue" style={{ display: 'inline-flex', margin: '0 auto 12px' }}>
              <Building2 className="w-3.5 h-3.5" />
              <span>MW GROUP ECOSYSTEM</span>
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Ekosistem Rekayasa Teknik MW Group</h2>
            <p style={{ color: '#64748B', maxWidth: '680px', margin: '0 auto', fontSize: '0.95rem', leading: 1.6 }}>
              Satu ekosistem terpadu dari hulu ke hilir — menghadirkan solusi komprehensif mulai dari konsultasi perencanaan, manufaktur unit HVAC, kontraktor MEP, kelistrikan, instrumen kalibrasi, hingga ritel.
            </p>
          </div>

          {/* Holding Banner & SBU Grid Layout */}
          <div className="mw-ecosystem-container">
            
            {/* Left Main Holding Card */}
            <div className="mw-holding-card">
              <div className="mw-holding-glow"></div>
              <div className="mw-holding-content">
                <span className="mw-holding-badge">PARENT HOLDING GROUP</span>
                <div className="mw-holding-logo-wrap" style={{ marginBottom: '24px' }}>
                  <MwGroupLogoSVG />
                </div>
                <p className="mw-holding-desc">
                  Grup induk usaha rekayasa teknik terkemuka di Indonesia yang membawahi 6 anak perusahaan strategis di bidang MEP, HVAC, otomasi daya, instrumen presisi, dan ritel industri.
                </p>
                <div className="mw-holding-stats">
                  <div>
                    <strong>6+</strong>
                    <span>Unit Bisnis Strategis</span>
                  </div>
                  <div>
                    <strong>100%</strong>
                    <span>Solusi Terintegrasi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 6 SBUs Grid */}
            <div className="mw-sbu-grid">
              
              {/* SBU 1: DMT */}
              <div className="mw-sbu-card">
                <div>
                  <div className="mw-sbu-header" style={{ marginBottom: '16px' }}>
                    <div className="mw-sbu-logo-box">
                      <DmtLogoSVG />
                    </div>
                    <span className="mw-sbu-tag orange">Contractor</span>
                  </div>
                  <h4 className="mw-sbu-role">Contractor HVAC & MEP</h4>
                  <p className="mw-sbu-desc">Pelaksanaan konstruksi, instalasi sistem pendingin gedung, ducting sentral, piping & mekanikal elektrikal.</p>
                </div>
              </div>

              {/* SBU 2: Shitsudo */}
              <div className="mw-sbu-card">
                <div>
                  <div className="mw-sbu-header" style={{ marginBottom: '16px' }}>
                    <div className="mw-sbu-logo-box">
                      <ShitsudoLogoSVG />
                    </div>
                    <span className="mw-sbu-tag cyan">Manufacturing</span>
                  </div>
                  <h4 className="mw-sbu-role">Manufacturing HVAC Unit</h4>
                  <p className="mw-sbu-desc">Pabrikasi & perakitan Air Handling Unit (AHU), FCU, Precision Air Conditioner (PAC) & unit thermal industri.</p>
                </div>
              </div>

              {/* SBU 3: LDP Group */}
              <div className="mw-sbu-card active-ldp">
                <div>
                  <div className="mw-sbu-header" style={{ marginBottom: '16px' }}>
                    <div className="mw-sbu-logo-box">
                      <LdpGroupLogoSVG />
                    </div>
                    <span className="mw-sbu-tag blue">Consultant</span>
                  </div>
                  <h4 className="mw-sbu-role">Consultant HVAC & MEP</h4>
                  <p className="mw-sbu-desc">Perencanaan rekayasa teknik, audit termal, simulasi CFD 3D BIM, Quantity Surveying & supervisi QA/QC.</p>
                </div>
              </div>

              {/* SBU 4: ORI */}
              <div className="mw-sbu-card">
                <div>
                  <div className="mw-sbu-header" style={{ marginBottom: '16px' }}>
                    <div className="mw-sbu-logo-box">
                      <OriLogoSVG />
                    </div>
                    <span className="mw-sbu-tag purple">Validation</span>
                  </div>
                  <h4 className="mw-sbu-role">Instrument & Validation Company</h4>
                  <p className="mw-sbu-desc">Pengujian kalibrasi instrumen presisi, komisioning cleanroom tekanan positif, & validasi standar fasilitas.</p>
                </div>
              </div>

              {/* SBU 5: MCE */}
              <div className="mw-sbu-card">
                <div>
                  <div className="mw-sbu-header" style={{ marginBottom: '16px' }}>
                    <div className="mw-sbu-logo-box">
                      <MceLogoSVG />
                    </div>
                    <span className="mw-sbu-tag amber">Electrical</span>
                  </div>
                  <h4 className="mw-sbu-role">Electrical & Power Control Company</h4>
                  <p className="mw-sbu-desc">Perakitan panel listrik LVMDP/SDP, sistem otomasi Building Management System (BMS), & power control.</p>
                </div>
              </div>

              {/* SBU 6: MMA */}
              <div className="mw-sbu-card">
                <div>
                  <div className="mw-sbu-header" style={{ marginBottom: '16px' }}>
                    <div className="mw-sbu-logo-box">
                      <MmaLogoSVG />
                    </div>
                    <span className="mw-sbu-tag emerald">HVAC Retail</span>
                  </div>
                  <h4 className="mw-sbu-role">HVAC Retail Company</h4>
                  <p className="mw-sbu-desc">Pemasok & ritel unit pendingin udara komersial, sparepart HVAC, kompresor, & peralatan pendukung.</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="layanan" className="services-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge blue">
              <Wrench className="w-3.5 h-3.5" />
              <span>OUR INTEGRATED SERVICES</span>
            </div>
            <h2>Layanan Konsultasi Teknik Terpadu</h2>
            <p>Menyediakan layanan komprehensif mulai dari konsep desain, kalkulasi beban termal, supervisi konstruksi, hingga evaluasi sistem fasilitas industri.</p>
          </div>

          <div className="services-grid">
            {services.map((svc) => (
              <div key={svc.id} className="service-card group">
                <div className="service-icon-wrap">
                  {svc.icon}
                </div>
                <h3>{svc.title}</h3>
                <p>{svc.description}</p>
                
                <ul className="service-bullets">
                  {svc.bullets.map((bullet, idx) => (
                    <li key={idx} className="service-bullet">
                      <span className="bullet-dot"></span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => setActiveModal('consultation')}
                  className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-600 group-hover:text-orange-700 transition-colors pt-4 border-t border-slate-100"
                >
                  <span>Minta Penawaran Service</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW INTERACTIVE CALCULATOR SECTION */}
      <section id="kalkulator" className="calculator-section">
        <div className="container">
          <div className="calculator-card">
            <div className="calc-header">
              <div className="section-badge amber">
                <Calculator className="w-3.5 h-3.5" />
                <span>INTERACTIVE ESTIMATION TOOL</span>
              </div>
              <h2>Kalkulator Beban Pendinginan & Sensitivitas Daya HVAC</h2>
              <p>Hitung estimasi awal kapasitas pendinginan (Tons of Refrigeration) & proyeksi penghematan daya untuk gedung Anda.</p>
            </div>

            <div className="calc-grid">
              {/* Inputs Column */}
              <div className="calc-inputs">
                <div className="form-group">
                  <label className="form-label flex items-center justify-between">
                    <span>1. Pilih Tipe Bangunan</span>
                    <span className="text-xs text-orange-600 font-semibold">Standar ASHRAE</span>
                  </label>
                  <select 
                    value={calcBuildingType}
                    onChange={(e) => setCalcBuildingType(e.target.value)}
                    className="form-select font-medium"
                  >
                    <option value="office">Gedung Perkantoran / Perbankan</option>
                    <option value="factory">Pabrik & Manufaktur Industri</option>
                    <option value="hospital">Rumah Sakit & Ruang Cleanroom</option>
                    <option value="datacenter">Data Center / Server Facility</option>
                    <option value="mall">Pusat Perbelanjaan / Commercial Mall</option>
                  </select>
                </div>

                <div className="form-group mt-6">
                  <label className="form-label flex items-center justify-between">
                    <span>2. Luas Total Area Gedung (m²)</span>
                    <span className="text-sm font-extrabold text-blue-600">{calcArea.toLocaleString()} m²</span>
                  </label>
                  <input 
                    type="range" 
                    min="100" 
                    max="15000" 
                    step="100"
                    value={calcArea}
                    onChange={(e) => setCalcArea(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-semibold">
                    <span>100 m²</span>
                    <span>7,500 m²</span>
                    <span>15,000 m²</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Perhatian Insinyur:</strong> Perhitungan di atas adalah estimasi awal teknis. Audit termal mendalam (CFD Load Calculation) diperlukan untuk memperhitungkan orientasi kaca, densitas occupants, dan heat gain peralatan.
                  </div>
                </div>
              </div>

              {/* Output Results Card */}
              <div className="calc-results-box">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">HASIL ESTIMASI TEKNIS</div>
                <h4 className="text-lg font-bold text-white mb-6">Proyeksi Sistem HVAC Gedung</h4>

                <div className="space-y-4">
                  <div className="calc-res-item">
                    <span className="text-xs text-slate-300">Estimasi Beban Chiller/VRF:</span>
                    <span className="text-xl font-extrabold text-amber-400">{calcRes.tr} TR <span className="text-xs font-normal text-slate-400">(Tons of Refrigeration)</span></span>
                  </div>

                  <div className="calc-res-item">
                    <span className="text-xs text-slate-300">Estimasi Daya Listrik HVAC:</span>
                    <span className="text-xl font-extrabold text-sky-400">{calcRes.kw} kW <span className="text-xs font-normal text-slate-400">(Electrical Power)</span></span>
                  </div>

                  <div className="calc-res-item border-t border-slate-700 pt-4">
                    <span className="text-xs text-slate-300">Potensi Hemat Daya Desain LDP / Bulan:</span>
                    <span className="text-2xl font-extrabold text-emerald-400">Rp {calcRes.savingsIDR} <span className="text-xs font-normal text-slate-400">/ bln</span></span>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveModal('consultation')}
                  className="btn-primary w-full justify-center mt-6 text-xs shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Dapatkan Detail Perhitungan Lengkap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO SECTION */}
      <section id="portofolio" className="portfolio-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge amber">
              <Award className="w-3.5 h-3.5" />
              <span>SELECTED CASE STUDIES</span>
            </div>
            <h2>Studi Kasus & Portofolio Unggulan</h2>
            <p>Bukti nyata keberhasilan konsultan teknik kami dalam menangani proyek strategis, komersial, dan fasilitas industri berskala nasional.</p>

            {/* Category Filters */}
            <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
              <button 
                onClick={() => setPortfolioFilter('all')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${portfolioFilter === 'all' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Semua Proyek
              </button>
              <button 
                onClick={() => setPortfolioFilter('industrial')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${portfolioFilter === 'industrial' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Industri & Power Plant
              </button>
              <button 
                onClick={() => setPortfolioFilter('commercial')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${portfolioFilter === 'commercial' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Gedung & Komersial
              </button>
            </div>
          </div>

          {/* Portfolio Grid */}
          <div className="portfolio-grid">
            {filteredProjects.map((project) => (
              <div key={project.id} className="portfolio-card">
                <div className="portfolio-image-wrap">
                  <img src={project.image} alt={project.title} />
                  <span className="portfolio-overlay-tag">{project.badge}</span>
                </div>
                
                <div className="portfolio-content">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">{project.tag}</span>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  
                  <div className="portfolio-footer">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{project.role}</span>
                    </div>
                    
                    <button 
                      onClick={() => openProjectModal(project)}
                      className="portfolio-link"
                    >
                      <span>Lihat Detail</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM & DIRECTORS SECTION */}
      <section id="direksi" className="team-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge blue">
              <Users className="w-3.5 h-3.5" />
              <span>LEADERSHIP & EXECUTIVE TEAM</span>
            </div>
            <h2>Jajaran Direksi & Dewan Pakar Rekayasa</h2>
            <p>Dipimpin oleh para insinyur senior dan eksekutif berpengalaman tinggi untuk memastikan integritas dan presisi teknis.</p>
          </div>

          <div className="team-grid">
            {teamMembers.map((member) => (
              <div key={member.id} className="team-card">
                <div className="team-avatar-wrap">
                  {member.image ? (
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span 
                    className="team-avatar-initials" 
                    style={{ display: member.image ? 'none' : 'flex' }}
                  >
                    {member.initials || (member.name ? member.name.substring(0, 2).toUpperCase() : 'LD')}
                  </span>
                </div>
                {member.badge && (
                  <div className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">
                    {member.badge}
                  </div>
                )}
                <h3>{member.name}</h3>
                <div className="team-role">{member.role}</div>
                <p className="team-bio">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG & KNOWLEDGE TEASER SECTION */}
      <section id="blog-preview" className="blog-teaser-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge amber">
              <BookOpen className="w-3.5 h-3.5" />
              <span>ENGINEERING INSIGHTS & JOURNAL</span>
            </div>
            <h2>Artikel & Publikasi Teknik MEP HVAC</h2>
            <p>Wawasan profesional, standar regulasi SNI/ASHRAE, dan studi kasus efisiensi energi fasilitas gedung dari para dewan pakar LDP.</p>
          </div>

          <div className="blog-grid">
            {blogArticles.slice(0, 3).map((art) => (
              <div 
                key={art.id}
                onClick={() => { 
                  window.location.hash = `#blog/${art.slug}`; 
                  setIsBlogMode(true); 
                  window.scrollTo({ top: 0, behavior: 'smooth' }); 
                }}
                className="blog-card group cursor-pointer"
              >
                <div className="blog-card-img-wrap">
                  <img src={art.image} alt={art.title} className="blog-card-img" />
                  <span className="blog-category-tag">{art.category}</span>
                </div>
                <div className="blog-card-body">
                  <div>
                    <div className="blog-meta">
                      <span>{art.publishedAt}</span>
                      <span>•</span>
                      <span>{art.readTime}</span>
                    </div>
                    <h3 className="blog-card-title">{art.title}</h3>
                    <p className="blog-card-desc">{art.summary}</p>
                  </div>
                  <div className="blog-card-footer">
                    <div className="blog-author">
                      <img src={art.author.avatar} alt={art.author.name} className="blog-author-avatar" />
                      <span className="blog-author-name">{art.author.name}</span>
                    </div>
                    <span className="blog-read-more">
                      <span>Baca</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => { setIsBlogMode(true); window.scrollTo({ top: 0 }); }}
              className="btn-secondary py-3.5 px-8 inline-flex items-center gap-2 font-bold shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span>Jelajahi Semua Artikel di Blog LDP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="faq-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge amber">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>FREQUENTLY ASKED QUESTIONS</span>
            </div>
            <h2>Pertanyaan Sering Diajukan</h2>
            <p>Informasi seputar proses kerja konsultan MEP & HVAC, legalitas, serta jangkauan layanan LDP Consultant.</p>
          </div>

          <div className="faq-container">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className={`faq-item ${activeFaq === idx ? 'open' : ''}`}
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              >
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${activeFaq === idx ? 'rotate-180 text-orange-500' : 'text-slate-400'}`} />
                </div>
                {activeFaq === idx && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR CLIENTS SECTION */}
      <section id="klien" className="clients-section">
        <div className="container">
          
          {/* Header */}
          <div className="section-header center" style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="section-badge blue" style={{ display: 'inline-flex', margin: '0 auto 12px' }}>
              <Award className="w-3.5 h-3.5" />
              <span>PROVEN TRACK RECORD</span>
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>Klien & Kemitraan Strategis</h2>
            <p style={{ color: '#64748B', maxWidth: '680px', margin: '0 auto', fontSize: '0.95rem' }}>
              Kepercayaan dari perusahaan nasional dan multinasional terkemuka dalam proyek rekayasa sistem MEP, pendingin udara presisi HVAC, dan audit fasilitas industri.
            </p>
          </div>

          <div className="clients-container">
            
            {/* Left Banner Box */}
            <div className="clients-banner-card">
              <div className="clients-banner-glow"></div>
              <div>
                <div className="clients-banner-number">140+</div>
                <div className="clients-banner-title">Proyek Berhasil Diselesaikan</div>
                <p className="clients-banner-text">
                  Kami telah berhasil mendesain, melayani, dan merekayasa lebih dari 140 proyek infrastruktur kritis, pabrik manufaktur, rumah sakit, dan pusat data di seluruh Indonesia.
                </p>
              </div>
              <div className="clients-banner-pill">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>KEPUASAN KLIEN 100%</span>
              </div>
            </div>

            {/* Right Client Grid (17 Corporate Clients from Company Profile) */}
            <div className="clients-grid">
              {corporateClients.map((client, idx) => (
                <div key={idx} className="client-logo-card">
                  <div className="client-logo-wrap">
                    <img 
                      src={client.logo} 
                      alt={client.name} 
                      className="client-logo-img" 
                      loading="lazy"
                    />
                  </div>
                  <div className="client-brand-cat">{client.cat}</div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* CONTACT & CONSULTATION FORM SECTION */}
      <section id="kontak" className="contact-section">
        <div className="contact-bg-glow"></div>
        <div className="container">
          <div className="contact-grid">
            {/* Left Info */}
            <div className="contact-info">
              <div className="section-badge amber">
                <Zap className="w-3.5 h-3.5" />
                <span>LDP TECHNICAL CONSULTANT</span>
              </div>

              <h2>Konsultasikan Tantangan Sistem MEP & HVAC Proyek Anda</h2>
              <p>
                Tim konsultan kami siap membantu merencanakan, mendesain, dan melakukan evaluasi teknis untuk meningkatkan performa gedung Anda.
              </p>

              <div className="contact-buttons">
                <a 
                  href={`https://wa.me/${waPhone}?text=Halo%20LDP%20Technical%20Consultant,%20saya%20ingin%20konsultasi%20mengenai%20proyek%20MEP/HVAC`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                >
                  <Phone className="w-4 h-4" />
                  <span>Hubungi via WhatsApp</span>
                </a>

                <a 
                  href={`mailto:${siteSettings.email || 'consultant@ldpgroup.co.id'}?subject=Permintaan%20Konsultasi%20Teknik%20MEP%20HVAC%20-%20PT%20Lentang%20Duta%20Perkasa`}
                  className="btn-email-outline"
                >
                  <Mail className="w-4 h-4" />
                  <span>Kirim Email Resmi ({siteSettings.email || 'consultant@ldpgroup.co.id'})</span>
                </a>
              </div>
            </div>

            {/* Right Form Card */}
            <div className="form-card">
              <h3>Minta Penawaran Kebutuhan</h3>
              <p className="form-sub">Isi formulir di bawah ini untuk jadwal diskusi gratis 15 menit bersama tim ahli kami.</p>

              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap / Instansi</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Budi Santoso - PT Pembangunan Perkasa"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email / Telepon Kontak</label>
                  <input 
                    type="text" 
                    required
                    placeholder="budi@perusahaan.com / 08123456789"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jenis Proyek</label>
                  <select 
                    value={formData.projectType}
                    onChange={(e) => setFormData({...formData, projectType: e.target.value})}
                    className="form-select"
                  >
                    <option value="Gedung Komersial">Gedung Perkantoran / Komersial</option>
                    <option value="Pabrik & Manufaktur">Pabrik & Manufaktur Industri</option>
                    <option value="Pembangkit Listrik">Pembangkit Listrik & Substation</option>
                    <option value="Data Center">Data Center / Cleanroom</option>
                    <option value="Rumah Sakit">Rumah Sakit & Fasilitas Kesehatan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ringkasan Kebutuhan Proyek</label>
                  <textarea 
                    rows="3"
                    required
                    placeholder="Jelaskan secara singkat rencana proyek, lokasi, atau tantangan HVAC/MEP Anda..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="form-textarea"
                  ></textarea>
                </div>

                <button type="submit" className="form-submit-btn">
                  Kirim Permintaan Konsultasi
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            {/* Col 1: Brand & Profile */}
            <div className="footer-brand">
              <a href="#" className="brand-logo footer-logo mb-4" aria-label="Beranda LDP Technical Consultant">
                <img 
                  src="/images/ldp_logo_white.png" 
                  alt="PT Lentang Duta Perkasa - LDP Technical Consultant" 
                  className="brand-logo-img footer-logo-img" 
                />
              </a>
              <p className="footer-desc">
                Konsultan teknik profesional spesialis perancangan sistem MEP (Mechanical, Electrical, Plumbing) dan HVAC Engineering terpercaya di Indonesia. Berkomitmen pada keselamatan K3, presisi desain, dan efisiensi energi.
              </p>
              <div className="footer-part-of">
                <span className="text-orange-400 font-bold">PART OF MW GROUP</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">NIB: {siteSettings.nib || '0129116242975'}</span>
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="footer-col">
              <h4>Navigasi Utama</h4>
              <ul className="footer-links">
                <li><a href="#beranda"><span>Beranda Utama</span></a></li>
                <li><a href="#profil"><span>Profil Perusahaan</span></a></li>
                <li><a href="#layanan"><span>Layanan MEP & HVAC</span></a></li>
                <li><a href="#kalkulator"><span>Kalkulator Beban</span></a></li>
                <li><a href="#portofolio"><span>Portofolio Proyek</span></a></li>
                <li><a href="#direksi"><span>Tim & Direksi</span></a></li>
                <li><a href="#blog" onClick={() => { setIsBlogMode(true); window.scrollTo({ top: 0 }); }}><span>Blog & Artikel Teknik</span></a></li>
                <li><a href="#faq"><span>Pertanyaan FAQ</span></a></li>
              </ul>
            </div>

            {/* Col 3: Expertise & Certification */}
            <div className="footer-col">
              <h4>Keahlian & Standar</h4>
              <ul className="footer-links">
                <li><a href="#layanan"><span>Spesialis Chiller & VRF</span></a></li>
                <li><a href="#profil"><span>Audit Termal Aliran CFD</span></a></li>
                <li><a href="#profil"><span>Sertifikasi ISO 9001:2015</span></a></li>
                <li><a href="#profil"><span>Sertifikasi ISO 45001:2018</span></a></li>
                <li><a href="#profil"><span>Sertifikasi STRA / SKA Utama</span></a></li>
                <li><a href="#profil"><span>Standar ASHRAE & SNI</span></a></li>
              </ul>
            </div>

            {/* Col 4: Office Contact Info */}
            <div className="footer-col">
              <h4>Kantor & Kontak Resmi</h4>
              <ul className="footer-contact-list">
                <li className="footer-contact-item">
                  <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Indonesia Head Office:</strong>
                    <span>{siteSettings.address || 'Tangerang Selatan, Banten - Indonesia'}</span>
                  </div>
                </li>
                <li className="footer-contact-item">
                  <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Telepon & WhatsApp:</strong>
                    <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">+{waPhone.startsWith('62') ? `62 ${waPhone.slice(2, 5)} ${waPhone.slice(5, 9)} ${waPhone.slice(9)}` : waPhone}</a>
                  </div>
                </li>
                <li className="footer-contact-item">
                  <Mail className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Email Resmi:</strong>
                    <a href={`mailto:${siteSettings.email || 'consultant@ldpgroup.co.id'}`} className="hover:text-sky-400 transition-colors">{siteSettings.email || 'consultant@ldpgroup.co.id'}</a>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="text-slate-400">
              © 2026 <strong>PT Lentang Duta Perkasa</strong> (LDP Technical Consultant). All Rights Reserved.
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-xs">
              <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
              <span>•</span>
              <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
              <span>•</span>
              <a href="#admin" className="hover:text-orange-400 transition-colors opacity-50 hover:opacity-100">Portal Admin</a>
            </div>
          </div>
        </div>
      </footer>

      {/* FLOATING ACTION WIDGETS (FIXED AT BOTTOM RIGHT) */}
      {showBackToTop && (
        <button 
          onClick={scrollToTop}
          className="back-to-top-btn"
          aria-label="Kembali ke Atas"
          title="Kembali ke Atas"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* MODAL SYSTEM */}

      {/* 1. CONSULTATION MODAL */}
      {activeModal === 'consultation' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <div className="section-badge blue mb-2">FREE CONSULTATION</div>
              <h3 className="text-2xl font-extrabold text-slate-900">Jadwal Konsultasi Gratis</h3>
              <p className="text-sm text-slate-600 mt-1">Diskusikan kebutuhan proyek MEP / HVAC bersama Engineering Director kami.</p>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap / Instansi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nama Anda atau Nama Perusahaan"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email / Telepon WhatsApp</label>
                <input 
                  type="text" 
                  required
                  placeholder="Email aktif atau nomor WhatsApp"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jenis Layanan Yang Dibutuhkan</label>
                <select 
                  value={formData.projectType}
                  onChange={(e) => setFormData({...formData, projectType: e.target.value})}
                  className="form-select"
                >
                  <option value="MEP Planning & Design">MEP Planning & Design Consultation</option>
                  <option value="HVAC Design & Chiller">HVAC Planning & Chiller System Design</option>
                  <option value="Audit & Assessment">Technical Assessment & Energy Audit</option>
                  <option value="Supervision QA/QC">Supervision & QA/QC Commissioning</option>
                  <option value="Quantity Surveying">Quantity Surveying & BoQ Estimation</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <textarea 
                  rows="3"
                  placeholder="Tuliskan gambaran singkat lokasi gedung, luas area, atau target waktu..."
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="form-textarea"
                ></textarea>
              </div>

              <button type="submit" className="form-submit-btn">
                Konfirmasi Permintaan Konsultasi
              </button>

              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748B' }}>
                <Mail className="w-4 h-4 text-sky-500" />
                <span>Atau kirim dokumen via email:</span>
                <a href={`mailto:${siteSettings.email || 'consultant@ldpgroup.co.id'}?subject=Permintaan%20Konsultasi%20Teknik%20MEP%20HVAC%20-%20PT%20Lentang%20Duta%20Perkasa`} className="text-sky-600 font-bold hover:underline">
                  {siteSettings.email || 'consultant@ldpgroup.co.id'}
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PROJECT DETAIL MODAL */}
      {activeModal === 'project' && selectedProject && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
              <X className="w-5 h-5" />
            </button>

            <div className="rounded-xl overflow-hidden mb-6 h-64 border border-slate-200">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>

            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedProject.badge}</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1 mb-3">{selectedProject.title}</h3>
            
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {selectedProject.description}
            </p>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl mb-6 text-xs border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold">Klien Proyek</span>
                <span className="font-bold text-slate-800">{selectedProject.client}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Lokasi</span>
                <span className="font-bold text-slate-800">{selectedProject.location}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Peran LDP Consultant</span>
                <span className="font-bold text-slate-800">{selectedProject.role}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Tahun Pelaksanaan</span>
                <span className="font-bold text-slate-800">{selectedProject.year}</span>
              </div>
            </div>

            <h4 className="font-bold text-sm text-slate-900 mb-3">Lingkup Pekerjaan Rekayasa (Scope of Work):</h4>
            <ul className="space-y-2 mb-6">
              {selectedProject.scope.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => { setActiveModal('consultation'); }}
              className="btn-primary w-full justify-center text-xs"
            >
              <span>Konsultasi Proyek Serupa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. LEGAL NIB PDF PREVIEW MODAL */}
      {activeModal === 'legal' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Dokumen Legalitas & Verifikasi NIB</h3>
              <p className="text-xs text-slate-500 mt-1">PT Lentang Duta Perkasa - LDP Technical Consultant</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 mb-6 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Nomor Induk Berusaha (NIB)</span>
                <span className="font-bold text-slate-900">{siteSettings.nib || '0129116242975'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Lembaga Terdaftar / Status</span>
                <span className="font-bold text-emerald-600">{siteSettings.institution || 'OSS Kementerian Investasi RI'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Sertifikasi Acuan</span>
                <span className="font-bold text-slate-900">{siteSettings.sni_cert || 'SNI 03-6572-2001 (HVAC)'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Supervisi Tenaga Ahli</span>
                <span className="font-bold text-slate-900">{siteSettings.expert_supervision || 'Sertifikat SKA Utama MEP'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-semibold">Kualifikasi Usaha</span>
                <span className="font-bold text-slate-900">{siteSettings.qualification || 'Konsultan Teknik MEP & HVAC'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  alert("Pengunduhan salinan Sertifikat NIB & ISO dimulai...");
                }}
                className="btn-primary flex-1 justify-center text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Legalitas (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-CONTACT WHATSAPP WIDGET */}
      <WhatsAppWidget />

    </div>
  );
}
