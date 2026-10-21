import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  Eye, 
  EyeOff,
  Trash2, 
  Edit, 
  LogOut, 
  ShieldCheck, 
  Calculator, 
  Download, 
  Layers, 
  Activity, 
  Sparkles,
  X,
  ChevronRight,
  ArrowUpRight,
  Zap,
  Lock,
  MessageSquare,
  RotateCcw,
  Edit3,
  Check,
  Upload,
  Camera,
  Image as ImageIcon,
  BookOpen,
  Tag,
  Calendar,
  Star,
  ExternalLink,
  Share2,
  Folder,
  Database,
  Key,
  ShieldAlert,
  UserCheck,
  UserPlus,
  UserX,
  KeyRound,
  Shield,
  Copy
} from 'lucide-react';
import { INITIAL_BLOG_ARTICLES, getStoredArticles } from './BlogPage';
import { 
  validateAndSanitizeArticle, 
  analyzeArticleSeo, 
  generateSeoSlug, 
  calculateReadingStats 
} from '../utils/articleSecurityAndSeo';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  syncArticleToSupabase, 
  deleteArticleFromSupabase,
  fetchArticlesFromSupabase,
  fetchTeamMembersFromSupabase,
  syncTeamMembersToSupabase,
  fetchWhatsAppContactsFromSupabase,
  syncWhatsAppContactsToSupabase,
  fetchProjectsFromSupabase,
  syncProjectsToSupabase,
  fetchSiteSettingsFromSupabase,
  syncSiteSettingsToSupabase,
  fetchAdminUsersFromSupabase,
  syncAdminUsersToSupabase,
  deleteAdminUserFromSupabase,
  isSupabaseConfigured
} from '../lib/supabaseClient';
import {
  broadcastSync,
  subscribeToSync,
  STORAGE_KEYS,
  SYNC_EVENTS
} from '../utils/syncManager';

// ==========================================
// DEFAULT USERS & ROLES (RBAC)
// ==========================================
export const DEFAULT_ADMIN_USERS = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@ldpconsultant.co.id',
    fullName: 'Administrator LDP',
    role: 'super_admin',
    passwordHash: '13147744cdcbe6901a917ee6e6992fee86d732afe4884af9d1665a9f55b782de', // default master: LDP@2026#Consultant
    titlePosition: 'System & Engineering Director',
    avatar: '/images/avatar_ade.jpg',
    isActive: true,
    createdAt: '2026-10-01'
  },
  {
    id: 2,
    username: 'penulis',
    email: 'penulis@ldpconsultant.co.id',
    fullName: 'Tito Riyanto, S.T.',
    role: 'author',
    passwordHash: '766a1ac91dc2c3a86c8f2d826ae02f75de2d7c66f3d23dab797b21c314a37d91', // default: penulis123
    titlePosition: 'Engineering Director / Lead Author',
    avatar: '/images/avatar_rizky.jpg',
    isActive: true,
    createdAt: '2026-10-10'
  }
];

export const getStoredAdminUsers = () => {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_USERS;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(u => {
          let avatar = typeof u.avatar === 'string' ? u.avatar.trim() : '';
          const isMaster = u.username?.toLowerCase() === 'admin' || u.id === 1;
          if (isMaster) {
            if (!avatar || avatar === '/images/admin.jpg' || !avatar.startsWith('/') && !avatar.startsWith('http') && !avatar.startsWith('data:')) {
              avatar = '/images/avatar_ade.jpg';
            }
          } else if (!avatar) {
            avatar = u.role === 'author' ? '/images/avatar_rizky.jpg' : '/images/avatar_ade.jpg';
          }

          return {
            ...u,
            avatar,
            email: u.email || (u.username === 'admin' ? 'admin@ldpconsultant.co.id' : `${u.username}@ldpconsultant.co.id`)
          };
        });
      }
    }
  } catch (e) {
    console.error("Error reading users from storage:", e);
  }
  return DEFAULT_ADMIN_USERS;
};

// ==========================================
// SECURITY & CRYPTOGRAPHY (SHA-256 ENCRYPTED)
// ==========================================
const ADMIN_SALT = 'LDP_SALT_2026_SECURE';
// Salted SHA-256 for default master password: "LDP@2026#Consultant"
const DEFAULT_ADMIN_HASH = '13147744cdcbe6901a917ee6e6992fee86d732afe4884af9d1665a9f55b782de';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 Menit

async function computeAdminHash(pwd) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const data = new TextEncoder().encode(ADMIN_SALT + pwd);
      const buf = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.error("Crypto error:", e);
  }
  let hash = 0;
  const str = ADMIN_SALT + pwd;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash);
}

// Preset Avatars
const PRESET_AVATARS = [
  { id: 'ade', name: 'Ade Maulana', url: '/images/avatar_ade.jpg' },
  { id: 'fajar', name: 'Fajar Abdilah', url: '/images/avatar_fajar.jpg' },
  { id: 'hasbi', name: 'Hasbi Ash', url: '/images/avatar_hasbi.jpg' },
  { id: 'dian', name: 'Dian Pratiwi', url: '/images/avatar_dian.jpg' },
  { id: 'alfi', name: 'Alfi Syahrin', url: '/images/avatar_alfi.jpg' },
  { id: 'habib', name: 'Habib Rizky', url: '/images/avatar_habib.jpg' },
  { id: 'rizky', name: 'Rizky Pratama', url: '/images/avatar_rizky.jpg' }
];

// Preset Authors for Blog Articles
const PRESET_AUTHORS = [
  { name: "Tito Riyanto, S.T.", role: "Engineering Director", avatar: "/images/tito_riyanto.jpg" },
  { name: "Abdul Wahid, A.Md. S.Pd", role: "Operational Director", avatar: "/images/abdul_wahid.jpg" },
  { name: "Ir. Ade Maulana, S.T. M.M.T", role: "Commercial & Sales Director", avatar: "/images/ade_maulana.jpg" },
  { name: "Fajar Abdilah, S.T.", role: "Lead Fire Protection Engineer", avatar: "/images/avatar_fajar.jpg" },
  { name: "Dian Pratiwi, S.T.", role: "Senior Green Building Engineer", avatar: "/images/avatar_dian.jpg" },
  { name: "Hasbi Ash, S.T.", role: "Data Center Infrastructure Engineer", avatar: "/images/avatar_hasbi.jpg" },
  { name: "Alfi Syahrin, S.T.", role: "Senior Electrical Consultant", avatar: "/images/avatar_alfi.jpg" }
];

// Preset Cover Images for Articles
const PRESET_ARTICLE_COVERS = [
  { label: 'Presentasi & Rapat Teknik', url: '/images/office_presentation.jpg' },
  { label: 'Insinyur & Site Engineer', url: '/images/hero_engineer.jpg' },
  { label: 'Desain CAD & Workstation', url: '/images/cad_workstation.jpg' },
  { label: 'Pembangkit Industri', url: '/images/geothermal_plant.jpg' },
  { label: 'Gedung Arsitektur Modern', url: '/images/building_architecture.jpg' },
  { label: 'Kompleks Fasilitas Bandara', url: '/images/airport_complex.jpg' }
];

// Categories for Blog Articles
const ARTICLE_CATEGORIES = [
  'HVAC & Efisiensi Energi',
  'Cleanroom & Farmasi',
  'MEP Electrical',
  'Data Center & CFD',
  'Plumbing & Fire Safety'
];

// Helper to convert and compress uploaded image to lightweight Base64 (~20-40KB)
const handleImageFileUpload = (e, callback) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    alert("Ukuran file foto terlalu besar (maksimal 15MB)");
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 400; // 400x400 is ideal for crisp avatars with tiny storage footprint
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.82 quality -> resulting in ~20-35 KB
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(compressedDataUrl);
      } catch (err) {
        callback(event.target.result);
      }
      e.target.value = '';
    };
    img.onerror = () => {
      alert("Format gambar tidak didukung atau file rusak.");
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

// Helper to convert and compress content images/diagrams up to 1200px
const handleContentImageFileUpload = (e, callback, maxDim = 1200) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (file.size > 20 * 1024 * 1024) {
    alert("Ukuran file foto terlalu besar (maksimal 20MB)");
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.85 quality for crisp schematics and diagrams (~80-140KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(compressedDataUrl);
      } catch (err) {
        callback(event.target.result);
      }
      e.target.value = '';
    };
    img.onerror = () => {
      alert("Format gambar tidak didukung atau file rusak.");
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};


// Default WhatsApp Contacts
export const DEFAULT_WA_CONTACTS = [
  {
    id: 1,
    name: "Abdul Wahid, A.Md. S.Pd",
    role: "Operational Director",
    image: "/images/abdul_wahid.jpg",
    phone: "6283874078144",
    active: true
  },
  {
    id: 2,
    name: "Tito Riyanto, S.T",
    role: "Engineering Director",
    image: "/images/tito_riyanto.jpg",
    phone: "6281573713348",
    active: true
  },
  {
    id: 3,
    name: "Ir. Ade Maulana, S.T. M.M.T",
    role: "Commercial & Sales Director",
    image: "/images/ade_maulana.jpg",
    phone: "6281389713127",
    active: true
  }
];

export const getStoredWaContacts = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.WA);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(c => {
          if (!c.image || c.image.includes('/images/avatar_')) {
            const def = DEFAULT_WA_CONTACTS.find(d => d.id === c.id || d.name === c.name);
            if (def && def.image) return { ...c, image: def.image };
          }
          return c;
        });
      }
    }
  } catch (e) {
    console.error("Error reading WhatsApp contacts from localStorage:", e);
  }
  return DEFAULT_WA_CONTACTS;
};

// Initial Leadership / Team Members Data
export const INITIAL_TEAM_MEMBERS = [
  {
    id: 1,
    name: "Tito Riyanto, S.T.",
    badge: "TECHNICAL DIRECTOR",
    role: "Engineering Director",
    initials: "TR",
    image: "/images/tito_riyanto.jpg",
    bio: "Memiliki pengalaman lebih dari 18 tahun dalam perencanaan sistem MEP & HVAC komersial & industri. Bersertifikat Ahli Utama STRA & SKA LPJK."
  },
  {
    id: 2,
    name: "Abdul Wahid, A.Md. S.Pd",
    badge: "OPERATIONAL LEAD",
    role: "Operational Director",
    initials: "AW",
    image: "/images/abdul_wahid.jpg",
    bio: "Mengelola manajemen operasional proyek, integrasi teknologi informasi, efisiensi rantai pasok, serta kemitraan strategis MW Group."
  },
  {
    id: 3,
    name: "Ir. Ade Maulana, S.T. M.M.T.",
    badge: "SENIOR ADVISOR",
    role: "Commercial & Sales Director",
    initials: "AM",
    image: "/images/ade_maulana.jpg",
    bio: "Pakar konsultan dan penasihat teknik MEP senior dengan pengalaman menangani berbagai gedung pencakar langit dan pusat data nasional."
  }
];

export const getStoredTeamMembers = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TEAM);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load team from storage', e);
  }
  return INITIAL_TEAM_MEMBERS;
};

export const saveTeamMembersToStorage = (members) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(members));
    broadcastSync(SYNC_EVENTS.TEAM, members);
    if (isSupabaseConfigured()) {
      syncTeamMembersToSupabase(members);
    }
  } catch (e) {
    console.error('Failed to save team to storage', e);
  }
};

// Initial Projects Data
export const INITIAL_PROJECTS = [
  {
    id: 1,
    title: "Muara Laboh Geothermal Power Plant",
    category: "industrial",
    badge: "MEP & HVAC CONSULTANT",
    tag: "POWER PLANT",
    image: "/images/geothermal_plant.jpg",
    description: "Perencanaan dan supervisi instalasi sistem HVAC pengkondisian udara area control room & electrical room serta sistem pemadam hidran bertekanan tinggi untuk pembangkit listrik tenaga panas bumi.",
    role: "Procurement & Construction Manager",
    location: "Muara Laboh, Sumatera Barat",
    client: "PT Supreme Energy Muara Laboh",
    year: "2024 - 2025",
    progress: 95,
    budget: "Rp 1.45 Miliar",
    status: "Commissioning",
    scope: [
      "Desain sistem HVAC Control Room & Electrical Substation",
      "Perhitungan Heat Load & Ventilasi Industri Bertekanan Positive",
      "Sistem Proteksi Kebakaran FM200 & Hydrant Loop",
      "Supervisi & Testing Commissioning Tahap Akhir"
    ]
  },
  {
    id: 2,
    title: "Portim Accommodation Complex Freeport",
    category: "commercial",
    badge: "AIRPORT INFRASTRUCTURE",
    tag: "COMMERCIAL COMPLEX",
    image: "/images/airport_complex.jpg",
    description: "Konsultasi desain sistem HVAC khusus untuk area Mess karyawan Freeport di Timika Papua dengan memperhatikan kelembaban tinggi dan efisiensi energi maksimum.",
    role: "Technical Safety & Compliance Team",
    location: "Timika, Papua",
    client: "PT Freeport Indonesia",
    year: "2023 - 2024",
    progress: 88,
    budget: "Rp 2.10 Miliar",
    status: "Pelaksanaan",
    scope: [
      "Audit Termal Kelembaban Udara Tropis (Dehumidification System)",
      "Desain Chiller Plant Sentral Redundan N+1",
      "Integrasi Building Management System (BMS)",
      "Studi Kelayakan Efisiensi Konsumsi Daya Listrik HVAC"
    ]
  },
  {
    id: 3,
    title: "Wisma Barito Pacific MEP Overhaul",
    category: "commercial",
    badge: "HIGH-RISE TOWER",
    tag: "COMMERCIAL BUILDING",
    image: "/images/building_architecture.jpg",
    description: "Modernisasi & perancangan ulang sistem distribusi kelistrikan, sistem tata udara VRV/VRF, serta audit keselamatan hidran proteksi kebakaran gedung perkantoran 28 lantai.",
    role: "Lead Engineering Consultant",
    location: "Jakarta Selatan",
    client: "Barito Pacific Group",
    year: "2023",
    progress: 100,
    budget: "Rp 850 Juta",
    status: "Selesai",
    scope: [
      "Redesain Distribusi Panel Listrik Utama LVMDP",
      "Retrofit Chiller R22 ke VRF Inverter Ramah Lingkungan",
      "Simulasi CFD Aliran Udara & Smoke Extraction Staircase",
      "Penyusunan BoQ & Dokumentasi Tender EPC"
    ]
  },
  {
    id: 4,
    title: "Data Center Precision HVAC Facility",
    category: "industrial",
    badge: "CRITICAL INFRASTRUCTURE",
    tag: "DATA CENTER",
    image: "/images/cad_workstation.jpg",
    description: "Perencanaan sistem pendingin presisi (CRAC/CRAH) dengan toleransi suhu ketat ±0.5°C dan kelembaban terjaga untuk ruang server pusat data tier-III.",
    role: "Commissioning & Advisory Consultant",
    location: "BSD City, Tangerang",
    client: "PT Technology Data Center Indonesia",
    year: "2024",
    progress: 70,
    budget: "Rp 1.80 Miliar",
    status: "Desain 3D CFD",
    scope: [
      "Desain Redundansi N+2 Precision Air Conditioner",
      "CFD Modeling Thermal Hot/Cold Aisle Containment",
      "Grounding & Surge Protection Grade A",
      "Audit ISO 27001 & TIA-942 Compliance"
    ]
  }
];

export const getStoredProjects = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading projects from localStorage:", e);
  }
  return INITIAL_PROJECTS;
};

export const saveProjectsToStorage = (projects) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    broadcastSync(SYNC_EVENTS.PROJECTS, projects);
    if (isSupabaseConfigured()) {
      syncProjectsToSupabase(projects);
    }
  } catch (e) {
    console.error("Error saving projects to localStorage:", e);
  }
};

// Site & Legality Settings
export const DEFAULT_SITE_SETTINGS = {
  nib: "0129116242975",
  institution: "OSS Kementerian Investasi RI",
  qualification: "Konsultan Teknik MEP & HVAC",
  sni_cert: "SNI 03-6572-2001 (HVAC)",
  expert_supervision: "Sertifikat SKA Utama MEP",
  hotline: "+62 838-7407-8144",
  email: "consultant@ldpgroup.co.id",
  address: "Menara Batavia Lt. 12, Jl. K.H. Mas Mansyur Kav. 126, Jakarta Pusat"
};

export const getStoredSiteSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return { ...DEFAULT_SITE_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Error reading site settings from localStorage:", e);
  }
  return DEFAULT_SITE_SETTINGS;
};

export const saveSiteSettingsToStorage = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    broadcastSync(SYNC_EVENTS.SETTINGS, settings);
    if (isSupabaseConfigured()) {
      syncSiteSettingsToSupabase(settings);
    }
  } catch (e) {
    console.error("Error saving site settings to localStorage:", e);
  }
};

export default function AdminDashboard({ onClose, onReturnToSite }) {
  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('ldp_admin_session');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.auth && p.user && p.expiresAt > Date.now()) return p.user;
      }
    } catch (e) {}
    return null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // User Management State (RBAC Multi-User)
  const [usersList, setUsersList] = useState(getStoredAdminUsers);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    role: 'author',
    password: '',
    titlePosition: 'Consultant Engineer & Technical Writer',
    avatar: '/images/avatar_ade.jpg',
    isActive: true
  });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userToast, setUserToast] = useState('');
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [pwdResetModalOpen, setPwdResetModalOpen] = useState(false);
  const [resetPwdTargetUser, setResetPwdTargetUser] = useState(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);

  // My Profile Modal State (Bisa edit foto & data diri sendiri)
  const [myProfileModalOpen, setMyProfileModalOpen] = useState(false);
  const [myProfileData, setMyProfileData] = useState({
    fullName: '',
    email: '',
    titlePosition: '',
    avatar: ''
  });
  const [myProfileToast, setMyProfileToast] = useState('');

  // Change Password State (in Settings tab)
  const [pwdChangeForm, setPwdChangeForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdChangeToast, setPwdChangeToast] = useState({ type: '', message: '' });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Authentication Session & Lockout Monitoring
  useEffect(() => {
    // 1. Session check (sessionStorage expires on browser close)
    try {
      const rawSession = sessionStorage.getItem('ldp_admin_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed.auth && parsed.expiresAt > Date.now()) {
          setIsAuthenticated(true);
          if (parsed.user) {
            setCurrentUser(parsed.user);
            if (parsed.user.role === 'author') {
              setActiveTab('articles');
            }
          }
        } else {
          sessionStorage.removeItem('ldp_admin_session');
          setCurrentUser(null);
        }
      }
    } catch (e) {
      sessionStorage.removeItem('ldp_admin_session');
      setCurrentUser(null);
    }

    // 2. Lockout check
    const checkLockStatus = () => {
      try {
        const lockUntil = parseInt(localStorage.getItem('ldp_admin_lockout_until') || '0', 10);
        const now = Date.now();
        if (lockUntil > now) {
          const rem = Math.ceil((lockUntil - now) / 1000);
          setIsLocked(true);
          setLockoutRemaining(rem);
        } else {
          setIsLocked(false);
          setLockoutRemaining(0);
        }
      } catch (e) {
        setIsLocked(false);
      }
    };

    checkLockStatus();
    const interval = setInterval(checkLockStatus, 1000);

    // 3. Sync users from storage / BroadcastChannel
    const unsubUsers = subscribeToSync(SYNC_EVENTS.USERS, (updatedUsers) => {
      if (updatedUsers && Array.isArray(updatedUsers) && updatedUsers.length > 0) {
        setUsersList(updatedUsers);
      }
    });

    return () => {
      clearInterval(interval);
      unsubUsers();
    };
  }, []);

  // Dashboard Tabs & Filter States
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const raw = sessionStorage.getItem('ldp_admin_session');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.user && p.user.role === 'author') return 'articles';
      }
    } catch (e) {}
    return 'overview';
  });

  // Guard: if logged in as author, prevent switching to non-article tabs
  useEffect(() => {
    if (currentUser?.role === 'author' && activeTab !== 'articles') {
      setActiveTab('articles');
    }
  }, [currentUser, activeTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  // WhatsApp Management State
  const [waContacts, setWaContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('ldp_whatsapp_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => {
            if (!c.image || c.image.includes('/images/avatar_')) {
              const def = DEFAULT_WA_CONTACTS.find(d => d.id === c.id || d.name === c.name);
              if (def && def.image) return { ...c, image: def.image };
            }
            return c;
          });
        }
      }
    } catch (e) {
      console.error("Error reading WhatsApp contacts from localStorage:", e);
    }
    return DEFAULT_WA_CONTACTS;
  });

  const [editingWaContact, setEditingWaContact] = useState(null);
  const [showAddWaModal, setShowAddWaModal] = useState(false);
  const [newWaContact, setNewWaContact] = useState({
    name: '',
    role: '',
    phone: '628',
    image: '',
    active: true
  });
  const [waToast, setWaToast] = useState('');

  const saveWaContactsToStorage = (updatedList) => {
    setWaContacts(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.WA, JSON.stringify(updatedList));
      broadcastSync(SYNC_EVENTS.WA, updatedList);
      if (isSupabaseConfigured()) {
        syncWhatsAppContactsToSupabase(updatedList);
      }
      setWaToast('Pengaturan WhatsApp berhasil diperbarui & tersinkronisasi ke web utama!');
    } catch (e) {
      console.error("Error saving WhatsApp contacts to storage:", e);
      alert('Peringatan: Gagal menyimpan data (memori penyimpanan browser penuh). Mohon gunakan foto dengan resolusi lebih kecil.');
    }
    setTimeout(() => setWaToast(''), 4000);
  };

  const handleToggleWaStatus = (id) => {
    const updated = waContacts.map(c => String(c.id) === String(id) ? { ...c, active: c.active === false ? true : false } : c);
    saveWaContactsToStorage(updated);
  };

  const handleDeleteWaContact = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kontak WhatsApp ini?')) {
      const updated = waContacts.filter(c => String(c.id) !== String(id));
      saveWaContactsToStorage(updated);
    }
  };

  const handleResetWaContacts = () => {
    if (window.confirm('Kembalikan daftar kontak WhatsApp ke susunan bawaan (3 Engineer)?')) {
      saveWaContactsToStorage(DEFAULT_WA_CONTACTS);
    }
  };

  const handleSaveWaEdit = (e) => {
    e.preventDefault();
    if (!editingWaContact || !editingWaContact.name || !editingWaContact.phone) return;
    const cleanPhone = String(editingWaContact.phone).replace(/[^0-9]/g, '');
    const updated = waContacts.map(c => 
      String(c.id) === String(editingWaContact.id) 
        ? { ...c, ...editingWaContact, phone: cleanPhone } 
        : c
    );
    saveWaContactsToStorage(updated);
    setEditingWaContact(null);
  };

  const handleAddWaContact = (e) => {
    e.preventDefault();
    if (!newWaContact.name || !newWaContact.phone) return;
    const cleanPhone = newWaContact.phone.replace(/[^0-9]/g, '');
    const newContactObj = {
      id: Date.now(),
      ...newWaContact,
      phone: cleanPhone
    };
    saveWaContactsToStorage([...waContacts, newContactObj]);
    setNewWaContact({
      name: '',
      role: '',
      phone: '628',
      image: '',
      active: true
    });
    setShowAddWaModal(false);
  };

  const handleFinishWaChanges = () => {
    saveWaContactsToStorage(waContacts);
    alert('✅ Selesai! Seluruh perubahan kontak WhatsApp telah berhasil disimpan dan langsung aktif di website.');
  };

  // Team & Leadership Management State
  const [teamMembers, setTeamMembers] = useState(getStoredTeamMembers);
  const [teamToast, setTeamToast] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeamMemberId, setEditingTeamMemberId] = useState(null);
  
  const initialTeamForm = {
    name: '',
    badge: 'TECHNICAL DIRECTOR',
    role: 'Engineering Director',
    initials: '',
    image: '',
    bio: ''
  };
  const [teamFormData, setTeamFormData] = useState(initialTeamForm);

  // Realtime cross-tab listener for all entities
  useEffect(() => {
    const unsubTeam = subscribeToSync(SYNC_EVENTS.TEAM, (updated) => {
      if (Array.isArray(updated) && updated.length > 0) setTeamMembers(updated);
      else setTeamMembers(getStoredTeamMembers());
    });
    const unsubWa = subscribeToSync(SYNC_EVENTS.WA, (updated) => {
      if (Array.isArray(updated) && updated.length > 0) setWaContacts(updated);
      else setWaContacts(getStoredWaContacts());
    });
    const unsubBlog = subscribeToSync(SYNC_EVENTS.BLOG, (updated) => {
      if (Array.isArray(updated) && updated.length > 0) setArticles(updated);
      else setArticles(getStoredArticles());
    });
    const unsubProjects = subscribeToSync(SYNC_EVENTS.PROJECTS, (updated) => {
      if (Array.isArray(updated) && updated.length > 0) setProjectsList(updated);
      else setProjectsList(getStoredProjects());
    });
    const unsubSettings = subscribeToSync(SYNC_EVENTS.SETTINGS, (updated) => {
      if (updated && typeof updated === 'object') setSiteSettings(updated);
      else setSiteSettings(getStoredSiteSettings());
    });

    return () => {
      unsubTeam();
      unsubWa();
      unsubBlog();
      unsubProjects();
      unsubSettings();
    };
  }, []);

  const handleOpenAddMember = () => {
    setEditingTeamMemberId(null);
    setTeamFormData(initialTeamForm);
    setShowTeamModal(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingTeamMemberId(member.id);
    setTeamFormData({
      name: member.name || '',
      badge: member.badge || '',
      role: member.role || '',
      initials: member.initials || '',
      image: member.image || '',
      bio: member.bio || ''
    });
    setShowTeamModal(true);
  };

  const handleSaveMemberSubmit = (e) => {
    e.preventDefault();
    if (!teamFormData.name.trim()) return;

    // Auto-generate initials if empty
    const computedInitials = teamFormData.initials.trim() || 
      teamFormData.name
        .replace(/^(Ir\.|Dr\.|Drs\.|Prof\.)\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

    let updatedList;
    if (editingTeamMemberId) {
      updatedList = teamMembers.map(m => m.id === editingTeamMemberId ? {
        ...m,
        ...teamFormData,
        initials: computedInitials
      } : m);
      setTeamToast(`Profil ${teamFormData.name} berhasil diperbarui!`);
    } else {
      const newMember = {
        id: Date.now(),
        ...teamFormData,
        initials: computedInitials
      };
      updatedList = [...teamMembers, newMember];
      setTeamToast(`Profil ${teamFormData.name} berhasil ditambahkan ke jajaran direksi!`);
    }

    setTeamMembers(updatedList);
    saveTeamMembersToStorage(updatedList);
    setShowTeamModal(false);

    setTimeout(() => {
      setTeamToast('');
    }, 4000);
  };

  const handleDeleteMember = (id, name) => {
    if (window.confirm(`Hapus ${name} dari daftar jajaran direksi? Profil tidak akan tampil lagi di halaman website.`)) {
      const updatedList = teamMembers.filter(m => m.id !== id);
      setTeamMembers(updatedList);
      saveTeamMembersToStorage(updatedList);
      setTeamToast(`Profil ${name} berhasil dihapus.`);
      setTimeout(() => setTeamToast(''), 3000);
    }
  };

  const handleResetTeam = () => {
    if (window.confirm('Kembalikan susunan jajaran direksi ke 3 dewan pakar awal (Eka Supriatna, Anwar Abidin, Ir. Edy Mulyana)?')) {
      setTeamMembers(INITIAL_TEAM_MEMBERS);
      saveTeamMembersToStorage(INITIAL_TEAM_MEMBERS);
      setTeamToast('Jajaran direksi berhasil di-reset ke bawaan sistem.');
      setTimeout(() => setTeamToast(''), 3000);
    }
  };

  const handleFinishTeamChanges = () => {
    saveTeamMembersToStorage(teamMembers);
    alert('✅ Selesai! Seluruh data Jajaran Direksi & Pakar telah berhasil disimpan dan langsung aktif di website utama.');
  };

  // Blog Articles Management State
  const [articles, setArticles] = useState(getStoredArticles);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleCategoryFilter, setArticleCategoryFilter] = useState('all');
  const [articleFeaturedFilter, setArticleFeaturedFilter] = useState('all');
  const [articleToast, setArticleToast] = useState('');

  // Modals for Articles
  const [showArticleEditorModal, setShowArticleEditorModal] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null); // null = Write new, number = Edit
  const [previewingArticle, setPreviewingArticle] = useState(null); // for quick preview modal
  const [editorTab, setEditorTab] = useState('write'); // 'write' or 'preview'

  const initialArticleForm = {
    title: '',
    slug: '',
    category: 'HVAC & Efisiensi Energi',
    isCustomCategory: false,
    customCategory: '',
    summary: '',
    featured: false,
    image: '/images/office_presentation.jpg',
    authorName: 'Tito Riyanto, S.T.',
    authorRole: 'Engineering Director',
    authorAvatar: '/images/avatar_rizky.jpg',
    isCustomAuthor: false,
    publishedAt: '',
    readTime: '5 menit',
    views: 0,
    tags: 'HVAC, Efisiensi Energi, Konsultan MEP',
    content: ''
  };

  const [articleFormData, setArticleFormData] = useState(initialArticleForm);

  // State for Article Content Images (Insert / Edit / Manage)
  const [contentImageModalOpen, setContentImageModalOpen] = useState(false);
  const [contentImageForm, setContentImageForm] = useState({
    url: '',
    caption: '',
    isEditingExisting: false,
    originalMatch: ''
  });

  const contentImages = useMemo(() => {
    if (!articleFormData.content) return [];
    const regex = /!\[(.*?)\]\((.*?)\)/g;
    const list = [];
    let match;
    while ((match = regex.exec(articleFormData.content)) !== null) {
      list.push({
        fullMatch: match[0],
        alt: match[1],
        url: match[2],
        index: match.index
      });
    }
    return list;
  }, [articleFormData.content]);

  const handleOpenAddContentImage = () => {
    setContentImageForm({
      url: '',
      caption: '',
      isEditingExisting: false,
      originalMatch: ''
    });
    setContentImageModalOpen(true);
  };

  const handleOpenEditContentImage = (imgItem) => {
    setContentImageForm({
      url: imgItem.url,
      caption: imgItem.alt,
      isEditingExisting: true,
      originalMatch: imgItem.fullMatch
    });
    setContentImageModalOpen(true);
  };

  const handleSaveContentImageSubmit = (e) => {
    e.preventDefault();
    if (!contentImageForm.url.trim()) {
      alert("Harap pilih atau masukkan gambar terlebih dahulu!");
      return;
    }
    const cleanCaption = contentImageForm.caption.trim() || 'Ilustrasi Teknis';
    const cleanUrl = contentImageForm.url.trim();
    const newMarkdown = `![${cleanCaption}](${cleanUrl})`;

    if (contentImageForm.isEditingExisting && contentImageForm.originalMatch) {
      const updatedContent = articleFormData.content.replace(contentImageForm.originalMatch, newMarkdown);
      setArticleFormData(prev => ({ ...prev, content: updatedContent }));
      setArticleToast('Gambar dalam konten artikel berhasil diperbarui!');
    } else {
      const textarea = document.getElementById('admin-article-content-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        const insertText = `\n\n${newMarkdown}\n`;
        const updated = before + insertText + after;
        setArticleFormData(prev => ({ ...prev, content: updated }));
      } else {
        setArticleFormData(prev => ({ ...prev, content: `${prev.content}\n\n${newMarkdown}\n` }));
      }
      setArticleToast('Gambar berhasil disisipkan ke dalam konten artikel!');
    }

    setContentImageModalOpen(false);
    setTimeout(() => setArticleToast(''), 4000);
  };

  const handleDeleteContentImage = (imgItem) => {
    if (window.confirm(`Hapus gambar "${imgItem.alt || 'ini'}" dari konten artikel?`)) {
      const updated = articleFormData.content.replace(imgItem.fullMatch, '').replace(/\n{3,}/g, '\n\n');
      setArticleFormData(prev => ({ ...prev, content: updated }));
      setArticleToast('Gambar berhasil dihapus dari konten.');
      setTimeout(() => setArticleToast(''), 3000);
    }
  };

  const handleDirectSwapContentImage = (imgItem, newUrl) => {
    const newMarkdown = `![${imgItem.alt}](${newUrl})`;
    const updated = articleFormData.content.replace(imgItem.fullMatch, newMarkdown);
    setArticleFormData(prev => ({ ...prev, content: updated }));
    setArticleToast('Foto gambar konten berhasil diganti!');
    setTimeout(() => setArticleToast(''), 3000);
  };


  // Sync Articles with Storage
  useEffect(() => {
    const handleSyncArticles = () => {
      setArticles(getStoredArticles());
    };
    window.addEventListener('blog-articles-updated', handleSyncArticles);
    window.addEventListener('storage', handleSyncArticles);
    return () => {
      window.removeEventListener('blog-articles-updated', handleSyncArticles);
      window.removeEventListener('storage', handleSyncArticles);
    };
  }, []);

  // Supabase Database Management State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig);
  const [supabaseInputUrl, setSupabaseInputUrl] = useState(() => getSupabaseConfig().url);
  const [supabaseInputKey, setSupabaseInputKey] = useState(() => getSupabaseConfig().key);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState({ tested: false, loading: false, success: false, message: '' });
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);

  // Check initial supabase connectivity on dashboard open & load cloud data
  useEffect(() => {
    if (isSupabaseConfigured()) {
      testSupabaseConnection().then(res => {
        setSupabaseTestStatus({ tested: true, loading: false, success: res.success, message: res.message });
        if (res.success && !res.needsMigration) {
          fetchArticlesFromSupabase().then(cloudArticles => {
            if (cloudArticles && cloudArticles.length > 0) {
              setArticles(cloudArticles);
              saveArticlesToStorage(cloudArticles, 'Artikel tersinkronisasi dari Supabase Cloud.');
            }
          });
          fetchTeamMembersFromSupabase().then(cloudTeam => {
            if (cloudTeam && cloudTeam.length > 0) {
              setTeamMembers(cloudTeam);
              saveTeamMembersToStorage(cloudTeam);
            }
          });
          fetchWhatsAppContactsFromSupabase().then(cloudWa => {
            if (cloudWa && cloudWa.length > 0) {
              setWaContacts(cloudWa);
              saveWaContactsToStorage(cloudWa);
            }
          });
          fetchProjectsFromSupabase().then(cloudProjects => {
            if (cloudProjects && cloudProjects.length > 0) {
              setProjectsList(cloudProjects);
              saveProjectsToStorage(cloudProjects);
            }
          });
          fetchSiteSettingsFromSupabase().then(cloudSettings => {
            if (cloudSettings) {
              setSiteSettings(cloudSettings);
              saveSiteSettingsToStorage(cloudSettings);
            }
          });
          fetchAdminUsersFromSupabase().then(cloudUsers => {
            if (cloudUsers && cloudUsers.length > 0) {
              setUsersList(cloudUsers);
              try {
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudUsers));
              } catch (e) {}
            }
          });
        }
      });
    }
  }, []);

  const handleSaveSupabaseConfig = async (e) => {
    e?.preventDefault();
    saveSupabaseConfig(supabaseInputUrl, supabaseInputKey);
    setSupabaseConfig(getSupabaseConfig());
    setSupabaseTestStatus({ tested: true, loading: true, success: false, message: 'Menguji koneksi ke Supabase...' });
    
    const result = await testSupabaseConnection();
    setSupabaseTestStatus({ tested: true, loading: false, success: result.success, message: result.message });
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Putuskan koneksi Supabase? Sistem akan kembali menggunakan penyimpanan lokal (localStorage).')) {
      saveSupabaseConfig('', '');
      setSupabaseInputUrl('');
      setSupabaseInputKey('');
      setSupabaseConfig(getSupabaseConfig());
      setSupabaseTestStatus({ tested: true, loading: false, success: false, message: 'Supabase terputus. Sistem kembali ke mode lokal.' });
    }
  };

  const handleSyncAllToSupabase = async () => {
    setIsSyncingData(true);
    let successCount = 0;
    try {
      for (const art of articles) {
        const res = await syncArticleToSupabase(art);
        if (res.success) successCount++;
      }
      await syncTeamMembersToSupabase(teamMembers);
      await syncWhatsAppContactsToSupabase(waContacts);
      await syncProjectsToSupabase(projectsList);
      await syncSiteSettingsToSupabase(siteSettings);
      await syncAdminUsersToSupabase(usersList);
      setArticleToast(`Berhasil menyinkronkan seluruh data (${successCount} artikel, ${teamMembers.length} dewan direksi, ${waContacts.length} kontak WA, ${projectsList.length} proyek, ${usersList.length} pengguna) ke Cloud Supabase!`);
    } catch (e) {
      setArticleToast(`Sinkronisasi sebagian berhasil (${successCount} artikel).`);
    } finally {
      setIsSyncingData(false);
      setTimeout(() => setArticleToast(''), 4000);
    }
  };

  const handleCopySqlSchema = () => {
    const sql = `-- PT LENTANG DUTA PERKASA - Supabase Database Schema
CREATE TABLE IF NOT EXISTS public.articles (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Engineering',
    summary TEXT,
    featured BOOLEAN DEFAULT FALSE,
    image TEXT DEFAULT '/images/office_presentation.jpg',
    author JSONB DEFAULT '{"name": "Tim Ahli LDP", "role": "Consultant Engineer", "avatar": "/images/avatar_ade.jpg"}'::jsonb,
    published_at TEXT,
    read_time TEXT DEFAULT '5 menit',
    views BIGINT DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public articles are viewable by everyone" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Enable insert for anon/service" ON public.articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for anon/service" ON public.articles FOR UPDATE USING (true);
CREATE POLICY "Enable delete for anon/service" ON public.articles FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.consultations (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    service_type TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit consultation inquiry" ON public.consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "Dashboard can view consultations" ON public.consultations FOR SELECT USING (true);
CREATE POLICY "Dashboard can update consultations" ON public.consultations FOR UPDATE USING (true);

-- Table: admin_users (Super Admin & Penulis Artikel)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'author',
    password_hash TEXT NOT NULL,
    title_position TEXT DEFAULT 'Technical Writer',
    avatar TEXT DEFAULT '/images/avatar_ade.jpg',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public admin_users viewable for dashboard" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Dashboard can modify admin_users" ON public.admin_users FOR ALL USING (true);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const saveArticlesToStorage = (updatedList, toastMsg = 'Artikel berhasil disimpan!') => {
    setArticles(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.BLOG, JSON.stringify(updatedList));
      broadcastSync(SYNC_EVENTS.BLOG, updatedList);
    } catch (e) {
      console.error("Gagal menyimpan artikel ke localStorage:", e);
    }
    setArticleToast(toastMsg);
    setTimeout(() => setArticleToast(''), 4000);
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleOpenNewArticle = () => {
    setEditingArticleId(null);
    const authorDefaultName = currentUser?.role === 'author' 
      ? (currentUser.fullName || 'Penulis LDP') 
      : 'Tito Riyanto, S.T.';
    const authorDefaultRole = currentUser?.role === 'author'
      ? (currentUser.titlePosition || 'Consultant Engineer & Technical Writer')
      : 'Engineering Director';
    const authorDefaultAvatar = currentUser?.role === 'author'
      ? (currentUser.avatar || '/images/avatar_rizky.jpg')
      : '/images/avatar_rizky.jpg';

    setArticleFormData({
      ...initialArticleForm,
      authorName: authorDefaultName,
      authorRole: authorDefaultRole,
      authorAvatar: authorDefaultAvatar,
      isCustomAuthor: currentUser?.role === 'author',
      publishedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      views: Math.floor(Math.random() * 250) + 120,
      content: `### Latar Belakang & Analisis Permasalahan
Dalam pengelolaan gedung dan fasilitas industri modern, konsumsi energi sistem tata udara (HVAC) dan keandalan sistem kelistrikan (MEP) memegang peranan krusial terhadap total biaya operasional gedung...

---

### Solusi Rekayasa Berbasis Engineering LDP
1. **Audit Termal & Simulasi Akurat**: Menggunakan instrumen berkalibrasi dan pemodelan komputasi untuk mengidentifikasi titik kebocoran energi.
2. **Optimasi Sistem Hidronik & Distribusi Udara**: Menyelaraskan kapasitas chiller, pompa VFD, dan balancing katup PICV.
3. **Kepatuhan Standar Regulasi**: Memastikan implementasi memenuhi standar SNI dan ASHRAE.

---

> **Rekomendasi Insinyur LDP:** "Perencanaan teknis yang terukur di awal mampu menghemat biaya perawatan dan memperpanjang usia pakai aset mekanikal hingga belasan tahun."

---

### Hasil & Kesimpulan Evaluasi
Melalui pendekatan rekayasa yang komprehensif, efisiensi operasional gedung dapat ditingkatkan secara signifikan tanpa mengorbankan kenyamanan penghuni.`
    });
    setEditorTab('write');
    setShowArticleEditorModal(true);
  };

  const handleOpenEditArticle = (art) => {
    setEditingArticleId(art.id);
    const isCustomCat = !ARTICLE_CATEGORIES.includes(art.category);
    const isCustomAuth = !PRESET_AUTHORS.some(a => a.name === art.author?.name);
    setArticleFormData({
      title: art.title || '',
      slug: art.slug || generateSlug(art.title || ''),
      category: isCustomCat ? 'Kustom' : art.category,
      isCustomCategory: isCustomCat,
      customCategory: isCustomCat ? art.category : '',
      summary: art.summary || '',
      featured: !!art.featured,
      image: art.image || '/images/office_presentation.jpg',
      authorName: art.author?.name || 'Tito Riyanto, S.T.',
      authorRole: art.author?.role || 'Engineering Director',
      authorAvatar: art.author?.avatar || '/images/avatar_rizky.jpg',
      isCustomAuthor: isCustomAuth,
      publishedAt: art.publishedAt || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      readTime: art.readTime || '5 menit',
      views: art.views || 0,
      tags: Array.isArray(art.tags) ? art.tags.join(', ') : (art.tags || ''),
      content: art.content || ''
    });
    setEditorTab('write');
    setShowArticleEditorModal(true);
  };

  const handleDeleteArticle = (id, title) => {
    if (window.confirm(`Hapus artikel "${title}"? Tindakan ini tidak dapat dibatalkan.`)) {
      const updated = articles.filter(a => a.id !== id);
      saveArticlesToStorage(updated, 'Artikel berhasil dihapus dari sistem!');
    }
  };

  const handleToggleFeatured = (id) => {
    const target = articles.find(a => a.id === id);
    if (!target) return;
    const willBeFeatured = !target.featured;
    const updated = articles.map(a => a.id === id ? { ...a, featured: willBeFeatured } : a);
    saveArticlesToStorage(updated, willBeFeatured ? 'Artikel ditetapkan sebagai Artikel Utama (Featured)!' : 'Status Artikel Utama dinonaktifkan.');
  };

  const handleResetArticles = () => {
    if (window.confirm('Kembalikan semua artikel ke daftar bawaan awal (8 Artikel Publikasi)?')) {
      saveArticlesToStorage(INITIAL_BLOG_ARTICLES, 'Daftar artikel dikembalikan ke susunan bawaan!');
    }
  };

  const handleSaveArticleSubmit = (e) => {
    e.preventDefault();
    if (!articleFormData.title.trim()) {
      alert("Judul artikel wajib diisi!");
      return;
    }

    const finalCategory = articleFormData.isCustomCategory && articleFormData.customCategory.trim()
      ? articleFormData.customCategory.trim()
      : articleFormData.category;

    const finalSlug = (articleFormData.slug.trim() || generateSlug(articleFormData.title)).trim();

    const tagsArray = articleFormData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const articlePayload = {
      id: editingArticleId ? editingArticleId : Date.now(),
      title: articleFormData.title.trim(),
      slug: finalSlug,
      category: finalCategory,
      summary: articleFormData.summary.trim(),
      featured: articleFormData.featured,
      image: articleFormData.image,
      author: {
        name: articleFormData.authorName.trim(),
        role: articleFormData.authorRole.trim(),
        avatar: articleFormData.authorAvatar
      },
      publishedAt: articleFormData.publishedAt.trim(),
      readTime: articleFormData.readTime.trim() || '5 menit',
      views: Number(articleFormData.views) || 0,
      tags: tagsArray.length > 0 ? tagsArray : ['MEP', 'HVAC', 'Engineering'],
      content: articleFormData.content
    };

    // Validasi & Proteksi Keamanan XSS
    const validation = validateAndSanitizeArticle(articlePayload, articles);
    if (!validation.isValid) {
      alert("Peringatan Keamanan & Validasi Artikel:\n\n• " + validation.errors.join("\n• "));
      return;
    }
    const cleanPayload = validation.sanitizedArticle;

    let updatedList;
    if (editingArticleId) {
      updatedList = articles.map(a => a.id === editingArticleId ? cleanPayload : a);
    } else {
      updatedList = [cleanPayload, ...articles];
    }

    saveArticlesToStorage(updatedList, editingArticleId ? 'Perubahan artikel berhasil disimpan & dipublikasikan!' : 'Artikel baru berhasil ditulis & dipublikasikan ke blog!');
    if (isSupabaseConfigured()) {
      syncArticleToSupabase(cleanPayload);
    }
    setShowArticleEditorModal(false);
  };

  const handleInsertMarkdown = (prefix, suffix = '', defaultPlaceholder = '') => {
    const textarea = document.getElementById('admin-article-content-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setArticleFormData(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const renderPreviewMarkdown = (content) => {
    if (!content) return <p style={{ color: '#94A3B8', fontStyle: 'italic' }}>Belum ada konten artikel...</p>;

    const blocks = content.split('\n\n');
    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Handle Markdown Images: ![alt](url)
      if (trimmed.includes('![') && trimmed.includes('](')) {
        const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          const alt = imgMatch[1];
          const url = imgMatch[2];
          const before = trimmed.substring(0, imgMatch.index).trim();
          const after = trimmed.substring(imgMatch.index + imgMatch[0].length).trim();
          return (
            <React.Fragment key={idx}>
              {before && (
                <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, marginBottom: '14px' }}>
                  {before}
                </p>
              )}
              <figure style={{ margin: '24px 0', textAlign: 'center' }}>
                <img 
                  src={url} 
                  alt={alt} 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '480px',
                    borderRadius: '12px', 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
                    objectFit: 'cover',
                    border: '1px solid #E2E8F0',
                    display: 'inline-block'
                  }} 
                  onError={(e) => { e.target.src = "/images/cad_workstation.jpg"; }}
                />
                {alt && (
                  <figcaption style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '8px', fontStyle: 'italic' }}>
                    📷 {alt}
                  </figcaption>
                )}
              </figure>
              {after && (
                <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, marginBottom: '14px' }}>
                  {after}
                </p>
              )}
            </React.Fragment>
          );
        }
      }

      if (trimmed.startsWith('### ')) {
        return <h3 key={idx}>{trimmed.replace('### ', '')}</h3>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx}>{trimmed.replace('## ', '')}</h3>;
      }
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx}>
            {trimmed.replace('> ', '').replace(/\*\*/g, '')}
          </blockquote>
        );
      }
      if (trimmed.startsWith('---')) {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #CBD5E1', margin: '20px 0' }} />;
      }
      if (trimmed.startsWith('| ')) {
        const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
        if (lines.length >= 2) {
          const headers = lines[0].split('|').slice(1, -1).map(c => c.trim().replace(/\*\*/g, ''));
          const rows = lines.slice(2);
          return (
            <div key={idx} style={{ overflowX: 'auto', margin: '16px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px' }}>
                <thead>
                  <tr style={{ background: '#0B192C', color: '#FFFFFF' }}>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, rIdx) => {
                    const cells = r.split('|').slice(1, -1).map(c => c.trim());
                    return (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        {cells.map((c, cIdx) => (
                          <td key={cIdx} style={{ padding: '8px 12px', color: '#1E293B' }}>{c.replace(/\*\*/g, '')}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
      }
      if (trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n');
        return (
          <ul key={idx} style={{ paddingLeft: '20px', margin: '10px 0' }}>
            {items.map((item, iIdx) => {
              const cleanItem = item.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
              return (
                <li key={iIdx} style={{ marginBottom: '6px', fontSize: '0.88rem', color: '#334155' }}>
                  {cleanItem.includes('**') ? (
                    <span>
                      <strong>{cleanItem.split('**')[1]}</strong>
                      {cleanItem.split('**')[2]}
                    </span>
                  ) : cleanItem}
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <p key={idx} style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, marginBottom: '14px' }}>
          {trimmed.includes('**') ? (
            trimmed.split('**').map((part, pIdx) => (
              pIdx % 2 === 1 ? <strong key={pIdx}>{part}</strong> : part
            ))
          ) : trimmed}
        </p>
      );
    });
  };


  // Multi-User Secure Login Handler (SHA-256 Verified + Brute-force Protected)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    const trimmedPwd = passwordInput.trim();
    if (!trimmedPwd) {
      setLoginError('Password akses wajib diisi!');
      return;
    }

    const trimmedInput = usernameInput.trim().toLowerCase();
    if (!trimmedInput) {
      setLoginError('Alamat email atau username wajib diisi!');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const inputHash = await computeAdminHash(trimmedPwd);
      const storedCustomHash = localStorage.getItem('ldp_admin_pwd_hash');
      const targetMasterHash = storedCustomHash || DEFAULT_ADMIN_HASH;

      // 1. Search for matching user in usersList by EMAIL or USERNAME
      let matchedUser = usersList.find(u => 
        (u.email && u.email.toLowerCase() === trimmedInput) || 
        (u.username && u.username.toLowerCase() === trimmedInput)
      );

      // 2. If input is 'admin' or 'admin@ldpconsultant.co.id' and password matches master admin hash:
      if ((trimmedInput === 'admin' || trimmedInput === 'admin@ldpconsultant.co.id') && inputHash === targetMasterHash) {
        matchedUser = usersList.find(u => u.username.toLowerCase() === 'admin' || u.email?.toLowerCase() === 'admin@ldpconsultant.co.id') || {
          id: 1,
          username: 'admin',
          email: 'admin@ldpconsultant.co.id',
          fullName: 'Administrator LDP',
          role: 'super_admin',
          titlePosition: 'System & Engineering Admin',
          avatar: '/images/avatar_ade.jpg',
          isActive: true
        };
      } else if (matchedUser) {
        // For specific user, check password
        const isMaster = matchedUser.username.toLowerCase() === 'admin' || matchedUser.email?.toLowerCase() === 'admin@ldpconsultant.co.id';
        const validHash = isMaster 
          ? (matchedUser.passwordHash === inputHash || targetMasterHash === inputHash)
          : (matchedUser.passwordHash === inputHash);

        if (!validHash) {
          matchedUser = null;
        }
      }

      if (matchedUser) {
        if (!matchedUser.isActive) {
          setLoginError('Akses ditolak! Akun ini telah dinonaktifkan oleh Administrator.');
          setIsLoggingIn(false);
          return;
        }

        // Login Berhasil
        localStorage.removeItem('ldp_admin_failed_count');
        localStorage.removeItem('ldp_admin_lockout_until');

        const sessionUser = {
          id: matchedUser.id,
          username: matchedUser.username,
          email: matchedUser.email || (matchedUser.username === 'admin' ? 'admin@ldpconsultant.co.id' : `${matchedUser.username}@ldpconsultant.co.id`),
          fullName: matchedUser.fullName,
          role: matchedUser.role, // 'super_admin' or 'author'
          titlePosition: matchedUser.titlePosition,
          avatar: matchedUser.avatar
        };

        sessionStorage.setItem('ldp_admin_session', JSON.stringify({
          auth: true,
          user: sessionUser,
          loginTime: Date.now(),
          expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 Jam sesi aktif
        }));

        setCurrentUser(sessionUser);
        setIsAuthenticated(true);
        if (sessionUser.role === 'author') {
          setActiveTab('articles');
        } else {
          setActiveTab('overview');
        }
        setUsernameInput('');
        setPasswordInput('');
        setLoginError('');
        setFailedAttempts(0);
      } else {
        // Login Gagal -> Catat Percobaan
        const currentFailed = parseInt(localStorage.getItem('ldp_admin_failed_count') || '0', 10) + 1;
        localStorage.setItem('ldp_admin_failed_count', currentFailed.toString());
        setFailedAttempts(currentFailed);

        if (currentFailed >= MAX_LOGIN_ATTEMPTS) {
          const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
          localStorage.setItem('ldp_admin_lockout_until', lockoutEnd.toString());
          setIsLocked(true);
          setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
          setLoginError('Akses ditolak! Terlalu banyak percobaan salah. Portal dikunci selama 15 menit untuk mencegah peretasan.');
        } else {
          const remaining = MAX_LOGIN_ATTEMPTS - currentFailed;
          setLoginError(`Email atau password salah! Sisa percobaan: ${remaining} kali sebelum sistem otomatis terkunci.`);
        }
      }
    } catch (err) {
      console.error("Login verification error:", err);
      setLoginError("Terjadi kendala saat memproses verifikasi keamanan.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Secure Logout Handler
  const handleLogout = () => {
    sessionStorage.removeItem('ldp_admin_session');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
  };

  // User Management Handlers (RBAC Multi-User)
  const saveUsersToStorage = (updatedUsers, toastMsg = '') => {
    setUsersList(updatedUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      broadcastSync(SYNC_EVENTS.USERS, updatedUsers);
    } catch (e) {
      console.error("Failed to save users:", e);
    }
    if (isSupabaseConfigured()) {
      syncAdminUsersToSupabase(updatedUsers).catch(err => console.warn("Supabase user sync error:", err));
    }
    if (toastMsg) {
      setUserToast(toastMsg);
      setTimeout(() => setUserToast(''), 4000);
    }
  };

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setUserFormData({
      fullName: '',
      email: '',
      username: '',
      role: 'author',
      password: '',
      titlePosition: 'Consultant Engineer & Technical Writer',
      avatar: '/images/avatar_ade.jpg',
      isActive: true
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUserId(u.id);
    setUserFormData({
      fullName: u.fullName,
      email: u.email || (u.username === 'admin' ? 'admin@ldpconsultant.co.id' : `${u.username}@ldpconsultant.co.id`),
      username: u.username,
      role: u.role,
      password: '',
      titlePosition: u.titlePosition || 'Consultant Engineer',
      avatar: u.avatar || '/images/avatar_ade.jpg',
      isActive: u.isActive !== false
    });
    setUserModalOpen(true);
  };

  // Helper Foto Upload dengan Kompresi Ringan Client-Side (< 35KB)
  const handleUserPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar! Maksimal 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        setUserFormData(prev => ({ ...prev, avatar: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handlers untuk "Profil Saya" (edit foto dan data diri sendiri dari header)
  const handleOpenMyProfile = () => {
    if (!currentUser) return;
    const userInList = usersList.find(u => u.id === currentUser.id) || currentUser;
    setMyProfileData({
      fullName: userInList.fullName || '',
      email: userInList.email || (userInList.username === 'admin' ? 'admin@ldpconsultant.co.id' : `${userInList.username}@ldpconsultant.co.id`),
      titlePosition: userInList.titlePosition || '',
      avatar: userInList.avatar || '/images/avatar_ade.jpg'
    });
    setMyProfileToast('');
    setMyProfileModalOpen(true);
  };

  const handleMyProfilePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar! Maksimal 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 360;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        setMyProfileData(prev => ({ ...prev, avatar: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveMyProfileSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const cleanFull = myProfileData.fullName.trim();
    const cleanEmail = myProfileData.email.trim().toLowerCase();

    if (!cleanFull) {
      alert("Nama lengkap wajib diisi!");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert("Alamat email tidak valid! Contoh: nama@ldpconsultant.co.id");
      return;
    }

    const dup = usersList.find(u => u.email && u.email.toLowerCase() === cleanEmail && u.id !== currentUser.id);
    if (dup) {
      alert(`Alamat email "${cleanEmail}" sudah digunakan oleh akun lain!`);
      return;
    }

    const updatedUser = {
      ...(usersList.find(u => u.id === currentUser.id) || currentUser),
      fullName: cleanFull,
      email: cleanEmail,
      titlePosition: myProfileData.titlePosition.trim() || currentUser.titlePosition,
      avatar: myProfileData.avatar || currentUser.avatar
    };

    const updatedList = usersList.map(u => u.id === currentUser.id ? updatedUser : u);
    saveUsersToStorage(updatedList, "Profil & foto Anda berhasil diperbarui!");

    const newSessionUser = {
      ...currentUser,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      titlePosition: updatedUser.titlePosition,
      avatar: updatedUser.avatar
    };
    setCurrentUser(newSessionUser);

    try {
      const currentRaw = sessionStorage.getItem('ldp_admin_session');
      if (currentRaw) {
        const p = JSON.parse(currentRaw);
        p.user = newSessionUser;
        sessionStorage.setItem('ldp_admin_session', JSON.stringify(p));
      }
    } catch (err) {}

    setMyProfileToast("Foto profil & data Anda berhasil disimpan!");
    setTimeout(() => {
      setMyProfileToast('');
      setMyProfileModalOpen(false);
    }, 1200);
  };

  const handleSaveUserSubmit = async (e) => {
    e.preventDefault();
    const cleanFull = userFormData.fullName.trim();
    const cleanEmail = (userFormData.email || '').trim().toLowerCase();
    let cleanUser = (userFormData.username || '').trim().toLowerCase();

    if (!cleanFull) {
      alert("Nama lengkap pengguna wajib diisi!");
      return;
    }
    if (!cleanEmail) {
      alert("Alamat email wajib diisi untuk login pengguna!");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert("Format email tidak valid! Contoh: penulis@ldpconsultant.co.id");
      return;
    }

    // Auto-derive username if empty
    if (!cleanUser) {
      cleanUser = cleanEmail.split('@')[0].replace(/[^a-z0-9_.-]/g, '');
    }

    if (!cleanUser || cleanUser.length < 3) {
      alert("Username minimal harus 3 karakter huruf / angka!");
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      alert("Username hanya boleh berisi huruf kecil, angka, garis bawah (_), atau titik (.)!");
      return;
    }

    // Check duplicate email
    const duplicateEmail = usersList.find(u => 
      u.email && u.email.toLowerCase() === cleanEmail && u.id !== editingUserId
    );
    if (duplicateEmail) {
      alert(`Alamat email "${cleanEmail}" sudah digunakan oleh pengguna lain! Silakan gunakan email yang berbeda.`);
      return;
    }

    // Check duplicate username
    const duplicate = usersList.find(u => u.username.toLowerCase() === cleanUser && u.id !== editingUserId);
    if (duplicate) {
      alert(`Username "${cleanUser}" sudah digunakan oleh pengguna lain! Silakan pilih username yang berbeda.`);
      return;
    }

    if (!editingUserId) {
      // New user: password required
      if (!userFormData.password || userFormData.password.length < 6) {
        alert("Password baru untuk pengguna minimal 6 karakter!");
        return;
      }
      const hashed = await computeAdminHash(userFormData.password.trim());
      const newUser = {
        id: Date.now(),
        fullName: cleanFull,
        email: cleanEmail,
        username: cleanUser,
        role: userFormData.role,
        passwordHash: hashed,
        titlePosition: userFormData.titlePosition.trim() || (userFormData.role === 'author' ? 'Technical Writer' : 'System Admin'),
        avatar: userFormData.avatar || '/images/avatar_ade.jpg',
        isActive: userFormData.isActive,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const updated = [...usersList, newUser];
      saveUsersToStorage(updated, `Akun baru "${newUser.fullName}" (${newUser.email}) dengan role ${newUser.role === 'author' ? 'Penulis' : 'Super Admin'} berhasil ditambahkan!`);
    } else {
      // Edit user
      const existing = usersList.find(u => u.id === editingUserId);
      if (!existing) return;
      let finalHash = existing.passwordHash;
      if (userFormData.password && userFormData.password.trim()) {
        if (userFormData.password.trim().length < 6) {
          alert("Password baru minimal 6 karakter!");
          return;
        }
        finalHash = await computeAdminHash(userFormData.password.trim());
      }
      const updatedUser = {
        ...existing,
        fullName: cleanFull,
        email: cleanEmail,
        username: cleanUser,
        role: userFormData.role,
        passwordHash: finalHash,
        titlePosition: userFormData.titlePosition.trim() || existing.titlePosition,
        avatar: userFormData.avatar || existing.avatar,
        isActive: userFormData.isActive
      };
      const updated = usersList.map(u => u.id === editingUserId ? updatedUser : u);
      saveUsersToStorage(updated, `Data pengguna "${updatedUser.fullName}" berhasil diperbarui!`);

      // If updating current user's profile, update currentUser session
      if (currentUser && currentUser.id === editingUserId) {
        const newSessionUser = {
          ...currentUser,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          username: updatedUser.username,
          role: updatedUser.role,
          titlePosition: updatedUser.titlePosition,
          avatar: updatedUser.avatar
        };
        setCurrentUser(newSessionUser);
        const currentRaw = sessionStorage.getItem('ldp_admin_session');
        if (currentRaw) {
          try {
            const p = JSON.parse(currentRaw);
            p.user = newSessionUser;
            sessionStorage.setItem('ldp_admin_session', JSON.stringify(p));
          } catch (e) {}
        }
      }
    }
    setUserModalOpen(false);
  };

  const handleToggleUserActive = (u) => {
    if (u.username === 'admin') {
      alert("Akun Administrator Utama tidak boleh dinonaktifkan!");
      return;
    }
    if (currentUser && currentUser.id === u.id) {
      alert("Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif!");
      return;
    }
    const newStatus = !u.isActive;
    const updated = usersList.map(item => item.id === u.id ? { ...item, isActive: newStatus } : item);
    saveUsersToStorage(updated, `Status akun "${u.fullName}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}.`);
  };

  const handleDeleteUser = (u) => {
    if (u.username === 'admin') {
      alert("Akun Administrator Utama tidak dapat dihapus demi keamanan!");
      return;
    }
    if (currentUser && currentUser.id === u.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri!");
      return;
    }
    if (window.confirm(`Hapus akun pengguna "${u.fullName}" (@${u.username})? Tindakan ini tidak dapat dibatalkan.`)) {
      const updated = usersList.filter(item => item.id !== u.id);
      saveUsersToStorage(updated, `Pengguna "${u.fullName}" berhasil dihapus dari sistem!`);
      if (isSupabaseConfigured()) {
        deleteAdminUserFromSupabase(u.username);
      }
    }
  };

  const handleOpenResetUserPassword = (u) => {
    setResetPwdTargetUser(u);
    setResetNewPassword('');
    setShowResetNewPassword(false);
    setPwdResetModalOpen(true);
  };

  const handleSaveResetUserPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPwdTargetUser) return;
    if (!resetNewPassword || resetNewPassword.trim().length < 6) {
      alert("Password baru minimal harus 6 karakter!");
      return;
    }
    const newHash = await computeAdminHash(resetNewPassword.trim());
    const updated = usersList.map(item => item.id === resetPwdTargetUser.id ? { ...item, passwordHash: newHash } : item);
    saveUsersToStorage(updated, `Password untuk pengguna "${resetPwdTargetUser.fullName}" (@${resetPwdTargetUser.username}) berhasil diperbarui!`);
    
    // If master admin password reset
    if (resetPwdTargetUser.username === 'admin') {
      localStorage.setItem('ldp_admin_pwd_hash', newHash);
    }
    setPwdResetModalOpen(false);
    setResetPwdTargetUser(null);
    setResetNewPassword('');
  };

  const handleSyncUsersToSupabaseNow = async () => {
    if (!isSupabaseConfigured()) {
      alert("Supabase belum terkonfigurasi. Buka tab Database & Supabase untuk memasukkan URL & Key.");
      return;
    }
    setIsSyncingUsers(true);
    try {
      const res = await syncAdminUsersToSupabase(usersList);
      if (res.success) {
        setUserToast(`Berhasil menyinkronkan ${usersList.length} akun pengguna ke Cloud Supabase!`);
      } else {
        alert("Gagal sinkronisasi: " + (res.error || res.message));
      }
    } catch (err) {
      alert("Kendala sinkronisasi: " + err.message);
    } finally {
      setIsSyncingUsers(false);
      setTimeout(() => setUserToast(''), 4000);
    }
  };


  // Change Password Handler (SHA-256 Encrypted)
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdChangeToast({ type: '', message: '' });

    if (!pwdChangeForm.current || !pwdChangeForm.newPwd) {
      setPwdChangeToast({ type: 'error', message: 'Semua kolom password wajib diisi.' });
      return;
    }

    if (pwdChangeForm.newPwd.length < 8) {
      setPwdChangeToast({ type: 'error', message: 'Password baru minimal harus 8 karakter dengan kombinasi angka & simbol.' });
      return;
    }

    if (pwdChangeForm.newPwd !== pwdChangeForm.confirm) {
      setPwdChangeToast({ type: 'error', message: 'Konfirmasi password baru tidak cocok!' });
      return;
    }

    setIsChangingPwd(true);
    try {
      const currentInputHash = await computeAdminHash(pwdChangeForm.current.trim());
      const storedCustomHash = localStorage.getItem('ldp_admin_pwd_hash');
      const targetHash = storedCustomHash || DEFAULT_ADMIN_HASH;

      if (currentInputHash !== targetHash) {
        setPwdChangeToast({ type: 'error', message: 'Password saat ini salah!' });
        setIsChangingPwd(false);
        return;
      }

      const newHash = await computeAdminHash(pwdChangeForm.newPwd.trim());
      localStorage.setItem('ldp_admin_pwd_hash', newHash);
      setPwdChangeToast({ type: 'success', message: 'Password admin berhasil diganti! Gunakan password baru ini untuk login berikutnya.' });
      setPwdChangeForm({ current: '', newPwd: '', confirm: '' });
    } catch (err) {
      console.error(err);
      setPwdChangeToast({ type: 'error', message: 'Gagal memperbarui password.' });
    } finally {
      setIsChangingPwd(false);
    }
  };

  // Reset to default password handler
  const handleResetDefaultPassword = () => {
    if (window.confirm("Kembalikan password admin ke password default sistem (LDP@2026#Consultant)?")) {
      localStorage.removeItem('ldp_admin_pwd_hash');
      setPwdChangeToast({ type: 'success', message: 'Password admin telah dikembalikan ke kata sandi bawaan sistem!' });
    }
  };

  // Sample Inquiries / Leads Data
  const [leads, setLeads] = useState([
    {
      id: "LD-2026-001",
      name: "Budi Santoso",
      company: "PT Pembangunan Perkasa",
      email: "budi@pembangunanperkasa.co.id",
      phone: "+62 812 3456 7890",
      projectType: "Gedung Komersial",
      serviceNeeded: "HVAC Design & Chiller",
      areaSize: "8,500 m²",
      location: "Jakarta Selatan",
      date: "10 Okt 2026",
      status: "Baru",
      message: "Membutuhkan redesain sistem Chiller sentral 24 lantai dan audit termal kelembaban udara."
    },
    {
      id: "LD-2026-002",
      name: "Ir. Hendra Wijaya",
      company: "PT Central Data Indonesia",
      email: "hendra@centraldata.id",
      phone: "+62 818 9012 3456",
      projectType: "Data Center",
      serviceNeeded: "Precision Air Conditioning (CRAC)",
      areaSize: "3,200 m²",
      location: "BSD City, Tangerang",
      date: "09 Okt 2026",
      status: "Diproses",
      message: "Konsultasi sistem pendingin redundansi N+2 untuk ruang server tier-III."
    },
    {
      id: "LD-2026-003",
      name: "Dewi Kartika",
      company: "PT Medika Hospitalia",
      email: "dewi.k@medikahospital.com",
      phone: "+62 857 1122 3344",
      projectType: "Rumah Sakit",
      serviceNeeded: "MEP Planning & Cleanroom",
      areaSize: "12,000 m²",
      location: "Surabaya, Jawa Timur",
      date: "08 Okt 2026",
      status: "Terjadwal",
      message: "Perencanaan sistem tata udara tekanan positif ruang operasi & gas medis."
    },
    {
      id: "LD-2026-004",
      name: "Agus Pratama",
      company: "PT Industri Nusantara",
      email: "agus.p@industrinusantara.co.id",
      phone: "+62 811 8899 0011",
      projectType: "Pabrik Manufaktur",
      serviceNeeded: "Audit Termal & Energy Saving",
      areaSize: "15,000 m²",
      location: "Karawang, Jawa Barat",
      date: "06 Okt 2026",
      status: "Selesai",
      message: "Audit penggunaan daya chiller industri dan studi kelayakan penghematan listrik."
    },
    {
      id: "LD-2026-005",
      name: "Siti Rahmawati",
      company: "Grand City Mall Group",
      email: "siti@grandcitymall.com",
      phone: "+62 878 5544 3322",
      projectType: "Gedung Komersial",
      serviceNeeded: "Quantity Surveying (BoQ MEP)",
      areaSize: "22,000 m²",
      location: "Bandung, Jawa Barat",
      date: "04 Okt 2026",
      status: "Diproses",
      message: "Estimasi biaya BoQ MEP retrofit ducting & pemadam kebakaran FM200."
    }
  ]);

  // Projects Data
  const [projectsList, setProjectsList] = useState(getStoredProjects);

  // Site & Legality Settings State
  const [siteSettings, setSiteSettings] = useState(getStoredSiteSettings);
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState(siteSettings);
  const [settingsToast, setSettingsToast] = useState('');

  const handleOpenEditSettings = () => {
    setSettingsFormData(siteSettings);
    setShowEditSettingsModal(true);
  };

  const handleSaveSettingsSubmit = (e) => {
    e.preventDefault();
    setSiteSettings(settingsFormData);
    saveSiteSettingsToStorage(settingsFormData);
    setShowEditSettingsModal(false);
    setSettingsToast('Dokumen legalitas & profil perusahaan berhasil disimpan & terupdate di web utama!');
    setTimeout(() => setSettingsToast(''), 4000);
  };

  // Add project modal handler
  const [newProject, setNewProject] = useState({ title: '', client: '', category: 'commercial', budget: '', status: 'Desain 3D CFD' });

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProject.title || !newProject.client) return;
    const addedPrj = {
      id: Date.now(),
      title: newProject.title,
      client: newProject.client,
      category: (newProject.category || 'commercial').toLowerCase(),
      badge: (newProject.category || 'commercial').toUpperCase(),
      tag: 'PROJECT',
      image: '/images/office_presentation.jpg',
      description: `Perencanaan dan supervisi sistem MEP & HVAC untuk ${newProject.title}.`,
      role: 'Lead Engineering Consultant',
      location: 'Indonesia',
      year: new Date().getFullYear().toString(),
      progress: 20,
      budget: newProject.budget || 'Rp 1 Miliar',
      status: newProject.status || 'Desain 3D CFD',
      scope: ['Perencanaan Teknis', 'Supervisi Lapangan']
    };
    const updated = [addedPrj, ...projectsList];
    setProjectsList(updated);
    saveProjectsToStorage(updated);
    setNewProject({ title: '', client: '', category: 'commercial', budget: '', status: 'Desain 3D CFD' });
    setShowAddProjectModal(false);
  };

  const handleDeleteProject = (id, title) => {
    if (window.confirm(`Hapus proyek "${title}" dari portofolio? Proyek ini tidak akan tampil lagi di website utama.`)) {
      const updated = projectsList.filter(p => p.id !== id);
      setProjectsList(updated);
      saveProjectsToStorage(updated);
    }
  };

  const handleDeleteLead = (id) => {
    if (confirm("Hapus data konsultasi ini?")) {
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  const handleUpdateLeadStatus = (id, newStatus) => {
    setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.serviceNeeded.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // SCREEN 1: LOGIN PROTECTION SCREEN
  if (!isAuthenticated) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-login-logo" style={{ marginBottom: '20px' }}>
            <img 
              src="/images/ldp_logo_white.png" 
              alt="PT Lentang Duta Perkasa - LDP Technical Consultant" 
              style={{ height: '48px', width: 'auto', objectFit: 'contain', margin: '0 auto' }} 
            />
          </div>
          <h2 className="admin-login-title" style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}>Portal Keamanan Admin</h2>
          <p className="admin-login-subtitle">PT LENTANG Duta Perkasa — LDP Technical Consultant</p>

          {isLocked && (
            <div className="admin-alert-error" style={{ marginBottom: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '12px 14px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem' }}>Akses Terkunci Sementara</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Terlalu banyak kesalahan. Sistem dikunci selama <strong>{Math.floor(lockoutRemaining / 60)} menit {lockoutRemaining % 60} detik</strong> untuk mencegah akses ilegal.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="admin-login-form">
            <div className="admin-form-group">
              <label className="admin-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} style={{ color: '#FF6600' }} />
                  <span>Email Akun Pengguna</span>
                </span>
              </label>
              <div className="admin-input-wrapper">
                <input 
                  type="text" 
                  disabled={isLocked || isLoggingIn}
                  placeholder="Contoh: nama@ldpconsultant.co.id atau admin..."
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="admin-input"
                  autoComplete="email username"
                  autoFocus
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Kata Sandi (Password)</label>
              <div className="admin-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLocked || isLoggingIn}
                  placeholder={isLocked ? "Sistem sedang dikunci..." : "Masukkan kata sandi..."}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="admin-input"
                  style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  autoComplete="current-password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-eye-btn"
                  disabled={isLocked}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div style={{
                marginTop: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#94A3B8'
              }}>
                <ShieldCheck size={15} style={{ color: '#3B82F6', flexShrink: 0 }} />
                <span>Multi-User RBAC aktif. Proteksi brute-force otomatis mengunci setelah 5x gagal.</span>
              </div>
            </div>

            {loginError && !isLocked && (
              <div className="admin-alert-error">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="admin-btn-primary full-width"
              disabled={isLocked || isLoggingIn}
              style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Lock size={16} />
              <span>{isLoggingIn ? "Memverifikasi..." : isLocked ? `Terkunci (${Math.floor(lockoutRemaining / 60)}m ${lockoutRemaining % 60}s)` : "Masuk ke Admin Dashboard"}</span>
            </button>
          </form>

          <div className="admin-login-footer">
            <button onClick={onReturnToSite} className="admin-btn-link">
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
              <span>Kembali ke Website Utama</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="admin-portal-wrapper">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          {/* Brand Header */}
          <div className="admin-brand-header" style={{ paddingBottom: '18px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onReturnToSite(); }} 
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', textDecoration: 'none' }}
              title="Klik untuk kembali ke beranda website"
            >
              <img 
                src="/images/ldp_logo_white.png" 
                alt="PT Lentang Duta Perkasa" 
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#FF6600', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                ADMIN & EDITORIAL PORTAL
              </span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="admin-nav-list">
            {currentUser?.role !== 'author' && (
              <>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <BarChart3 size={18} />
                    <span>Ringkasan Analytics</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('leads')}
                  className={`admin-nav-item ${activeTab === 'leads' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <FileText size={18} />
                    <span>Konsultasi Masuk</span>
                  </div>
                  <span className="admin-count-pill">{leads.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab('projects')}
                  className={`admin-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <Building2 size={18} />
                    <span>Portofolio Proyek</span>
                  </div>
                  <span className="admin-count-pill blue">{projectsList.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <ShieldCheck size={18} />
                    <span>Pengaturan Legalitas</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className={`admin-nav-item ${activeTab === 'whatsapp' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <MessageSquare size={18} />
                    <span>Pengaturan WhatsApp</span>
                  </div>
                  <span className="admin-count-pill green">{waContacts.filter(c => c.active !== false).length}</span>
                </button>

                <button
                  onClick={() => setActiveTab('team')}
                  className={`admin-nav-item ${activeTab === 'team' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <Users size={18} />
                    <span>Jajaran Direksi & Tim</span>
                  </div>
                  <span className="admin-count-pill blue">{teamMembers.length}</span>
                </button>
              </>
            )}

            {/* KELOLA ARTIKEL & BLOG (ACCESSIBLE TO BOTH SUPER ADMIN & AUTHORS) */}
            <button
              onClick={() => setActiveTab('articles')}
              className={`admin-nav-item ${activeTab === 'articles' ? 'active' : ''}`}
            >
              <div className="admin-nav-left">
                <BookOpen size={18} />
                <span>Kelola Artikel & Blog</span>
              </div>
              <span className="admin-count-pill orange">{articles.length}</span>
            </button>

            {currentUser?.role !== 'author' && (
              <>
                {/* USER MANAGEMENT (SUPER ADMIN ONLY) */}
                <button
                  onClick={() => setActiveTab('users')}
                  className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <UserCheck size={18} />
                    <span>Manajemen Pengguna</span>
                  </div>
                  <span className="admin-count-pill blue">{usersList.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab('database')}
                  className={`admin-nav-item ${activeTab === 'database' ? 'active' : ''}`}
                >
                  <div className="admin-nav-left">
                    <Database size={18} />
                    <span>Database & Supabase</span>
                  </div>
                  <span className={`admin-count-pill ${supabaseConfig.isConfigured ? 'green' : 'orange'}`}>
                    {supabaseConfig.isConfigured ? 'CLOUD' : 'LOCAL'}
                  </span>
                </button>
              </>
            )}

            {/* AUTHOR MODE BADGE NOTICE IN SIDEBAR */}
            {currentUser?.role === 'author' && (
              <div style={{
                margin: '18px 12px 10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 102, 0, 0.08)',
                border: '1px solid rgba(255, 102, 0, 0.25)',
                fontSize: '0.73rem',
                color: '#64748B',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, color: '#FF8800', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Shield size={14} /> Mode Akses Penulis
                </div>
                Anda login dengan hak akses khusus menulis & mengelola artikel publikasi website.
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Actions */}
        <div className="admin-sidebar-bottom">
          <button onClick={handleLogout} className="admin-btn-logout">
            <LogOut size={16} />
            <span>Keluar (Logout)</span>
          </button>

          <button onClick={onReturnToSite} className="admin-btn-back">
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            <span>Kembali ke Website</span>
          </button>
        </div>
      </aside>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="admin-main-content">
        
        {/* TOP BAR HEADER */}
        <header className="admin-header-bar">
          <div>
            <h1 className="admin-header-title">
              {activeTab === 'overview' && 'Ringkasan Kinerja & Analytics'}
              {activeTab === 'leads' && 'Daftar Konsultasi & Penawaran Masuk'}
              {activeTab === 'projects' && 'Manajemen Portofolio Proyek'}
              {activeTab === 'calculator' && 'Log Perhitungan Beban HVAC Gedung'}
              {activeTab === 'settings' && 'Pengaturan Perusahaan & Legalitas'}
              {activeTab === 'whatsapp' && 'Kelola Nomor & Widget WhatsApp'}
              {activeTab === 'team' && 'Manajemen Jajaran Direksi & Dewan Pakar'}
              {activeTab === 'articles' && 'Manajemen Publikasi Artikel & Blog'}
              {activeTab === 'users' && 'Manajemen Akun Pengguna & Hak Akses (RBAC)'}
              {activeTab === 'database' && 'Konfigurasi & Sinkronisasi Database Supabase'}
            </h1>
            <p className="admin-header-desc">
              {currentUser?.role === 'author'
                ? 'PT LENTANG Duta Perkasa — Tulis, edit, pratinjau, dan publikasikan artikel wawasan teknik MEP HVAC langsung ke website.'
                : activeTab === 'team'
                ? 'PT LENTANG Duta Perkasa — Atur data pimpinan, gelar teknik, peran eksekutif, foto/avatar inisial, dan kredensial rekayasa.'
                : activeTab === 'articles' 
                ? 'PT LENTANG Duta Perkasa — Tulis, edit, dan publikasikan wawasan teknik & jurnal MEP HVAC.'
                : activeTab === 'users'
                ? 'PT LENTANG Duta Perkasa — Kelola akun login administrator dan kontributor/penulis artikel teknik.'
                : 'PT LENTANG Duta Perkasa — Sistem Manajemen Internal Konsultan Teknik MEP & HVAC.'}
            </p>
          </div>

          <div className="admin-header-right">
            <div className="admin-status-online">
              <span className="admin-pulse-dot"></span>
              <span>SYSTEM ONLINE</span>
            </div>

            <div 
              onClick={handleOpenMyProfile}
              className="admin-header-profile-badge"
              title="Klik untuk mengedit foto & profil akun Anda"
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {currentUser?.fullName || (currentUser?.role === 'author' ? 'Penulis Artikel' : 'Administrator')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '3px' }}>
                  <span className={`admin-role-badge ${currentUser?.role === 'author' ? 'author' : 'super_admin'}`}>
                    {currentUser?.role === 'author' ? '✍️ Penulis' : '🛡️ Super Admin'}
                  </span>
                </div>
              </div>

              <div className="admin-user-avatar" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.fullName} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  (currentUser?.fullName || 'AD').substring(0, 2).toUpperCase()
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'rgba(4, 14, 28, 0.85)',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,102,0,0.5)'
                }}>
                  <Camera size={9} style={{ color: '#FF6600' }} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="admin-tab-content">
            
            {/* STAT CARDS GRID */}
            <div className="admin-stats-grid cols-5">
              
              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Total Konsultasi</span>
                  <div className="admin-stat-icon-wrap orange">
                    <FileText size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{leads.length}</span>
                  <span className="admin-stat-badge green">+18% bln ini</span>
                </div>
                <p className="admin-stat-sub">Permintaan masuk via website</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Proyek Berjalan</span>
                  <div className="admin-stat-icon-wrap blue">
                    <Building2 size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{projectsList.length}</span>
                  <span className="admin-stat-badge blue">4 Aktif</span>
                </div>
                <p className="admin-stat-sub">Supervisi & Desain MEP</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Total Biaya BoQ</span>
                  <div className="admin-stat-icon-wrap green">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">Rp 6.2 M</span>
                  <span className="admin-stat-badge green">Estimasi</span>
                </div>
                <p className="admin-stat-sub">Nilai proyek MEP & HVAC</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Legalitas NIB</span>
                  <div className="admin-stat-icon-wrap purple">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value font-sm">0129116242975</span>
                </div>
                <p className="admin-stat-sub text-green">✓ Status OSS Terverifikasi</p>
              </div>

              <div 
                className="admin-stat-card" 
                onClick={() => setActiveTab('articles')}
                style={{ cursor: 'pointer' }}
                title="Buka Manajemen Artikel Blog"
              >
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Artikel & Jurnal</span>
                  <div className="admin-stat-icon-wrap orange">
                    <BookOpen size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{articles.length}</span>
                  <span className="admin-stat-badge green">Aktif Web</span>
                </div>
                <p className="admin-stat-sub">Klik untuk tulis & kelola</p>
              </div>

            </div>

            {/* TWO COLUMN DASHBOARD GRID */}
            <div className="admin-two-cols">
              
              {/* LEFT COLUMN: RECENT LEADS */}
              <div className="admin-box col-left">
                <div className="admin-box-header">
                  <div>
                    <h3 className="admin-box-title">Konsultasi Terbaru Masuk</h3>
                    <p className="admin-box-sub">Permintaan penawaran teknis terbaru dari klien.</p>
                  </div>
                  <button onClick={() => setActiveTab('leads')} className="admin-link-btn">
                    <span>Lihat Semua</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="admin-leads-list">
                  {leads.slice(0, 3).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedLead(item)}
                      className="admin-lead-card"
                    >
                      <div className="admin-lead-left">
                        <div className="admin-avatar">
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="admin-lead-name">{item.name}</h4>
                          <p className="admin-lead-meta">{item.company} • <span className="text-highlight">{item.serviceNeeded}</span></p>
                        </div>
                      </div>

                      <div className="admin-lead-right">
                        <span className={`admin-status-tag ${
                          item.status === 'Baru' ? 'orange' :
                          item.status === 'Diproses' ? 'blue' :
                          item.status === 'Terjadwal' ? 'purple' : 'green'
                        }`}>
                          {item.status}
                        </span>
                        <span className="admin-lead-date">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN: DISTRIBUTION CHART CARD */}
              <div className="admin-box col-right">
                <div className="admin-box-header">
                  <h3 className="admin-box-title">Distribusi Layanan</h3>
                  <Sparkles size={18} className="text-orange" />
                </div>
                <p className="admin-box-sub">Persentase permintaan spesialisasi teknik MEP di Indonesia.</p>

                <div className="admin-progress-list">
                  <div className="admin-progress-item">
                    <div className="admin-progress-labels">
                      <span>HVAC Chiller & VRF System</span>
                      <strong className="text-orange">45%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill orange" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  <div className="admin-progress-item">
                    <div className="admin-progress-labels">
                      <span>MEP Electrical & Hydrant</span>
                      <strong className="text-blue">30%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill blue" style={{ width: '30%' }}></div>
                    </div>
                  </div>

                  <div className="admin-progress-item">
                    <div className="admin-progress-labels">
                      <span>Audit Termal & CFD Analysis</span>
                      <strong className="text-green">15%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill green" style={{ width: '15%' }}></div>
                    </div>
                  </div>

                  <div className="admin-progress-item">
                    <div className="admin-progress-labels">
                      <span>BoQ & Quantity Surveying</span>
                      <strong className="text-purple">10%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill purple" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="admin-box-footer">
                  <span>Standar Pengujian:</span>
                  <strong>SNI / ASHRAE 2026</strong>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: LEADS TABLE */}
        {activeTab === 'leads' && (
          <div className="admin-tab-content space-y">
            
            {/* SEARCH & FILTER BAR */}
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="admin-search-icon" />
                <input 
                  type="text" 
                  placeholder="Cari nama, perusahaan, atau layanan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div className="admin-filter-select-wrap">
                <Filter size={16} className="admin-filter-icon" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">Semua Status</option>
                  <option value="Baru">Baru</option>
                  <option value="Diproses">Diproses</option>
                  <option value="Terjadwal">Terjadwal</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            {/* TABLE CARD */}
            <div className="admin-table-box">
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>Klien / Perusahaan</th>
                      <th style={{ minWidth: '220px' }}>Layanan & Tipe Gedung</th>
                      <th style={{ minWidth: '110px' }}>Luas Area</th>
                      <th style={{ minWidth: '120px' }}>Tanggal</th>
                      <th style={{ minWidth: '120px' }}>Status</th>
                      <th style={{ minWidth: '130px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="font-bold text-white">{item.name}</div>
                          <div className="text-sub">{item.company}</div>
                          <div className="text-muted">{item.email}</div>
                        </td>
                        <td>
                          <div className="font-semibold text-orange">{item.serviceNeeded}</div>
                          <div className="text-sub">{item.projectType} • {item.location}</div>
                        </td>
                        <td>
                          <span className="font-semibold text-white">{item.areaSize}</span>
                        </td>
                        <td className="text-sub">
                          {item.date}
                        </td>
                        <td>
                          <select
                            value={item.status}
                            onChange={(e) => handleUpdateLeadStatus(item.id, e.target.value)}
                            className="admin-status-select"
                          >
                            <option value="Baru">Baru</option>
                            <option value="Diproses">Diproses</option>
                            <option value="Terjadwal">Terjadwal</option>
                            <option value="Selesai">Selesai</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-action-btns">
                            <button onClick={() => setSelectedLead(item)} className="admin-act-btn view" title="Detail">
                              <Eye size={16} />
                            </button>
                            <a
                              href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(item.name)},%20kami%20dari%20LDP%20Technical%20Consultant`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-act-btn wa"
                              title="WhatsApp Klien"
                            >
                              <Phone size={16} />
                            </a>
                            <button onClick={() => handleDeleteLead(item.id)} className="admin-act-btn del" title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="admin-tab-content space-y">
            <div className="admin-box-top-actions">
              <div>
                <h3 className="admin-box-title">Daftar Portofolio Proyek Rekayasa</h3>
                <p className="admin-box-sub">Manajemen status proyek dan progress supervisi di lapangan.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a 
                  href="/#portfolio" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="admin-btn-secondary"
                >
                  <ExternalLink size={15} />
                  <span>Lihat di Beranda</span>
                </a>
                <button onClick={() => setShowAddProjectModal(true)} className="admin-btn-primary">
                  <Plus size={16} />
                  <span>Tambah Proyek</span>
                </button>
              </div>
            </div>

            <div className="admin-projects-grid">
              {projectsList.map((prj) => (
                <div key={prj.id} className="admin-project-card">
                  <div className="admin-prj-header">
                    <div>
                      <span className="admin-status-tag orange">{prj.category}</span>
                      <h4 className="admin-prj-title">{prj.title}</h4>
                      <p className="admin-prj-client">{prj.client}</p>
                    </div>
                    <span className="admin-status-tag green">{prj.status}</span>
                  </div>

                  <div className="admin-prj-progress">
                    <div className="admin-progress-labels">
                      <span className="text-sub">Progress Pengerjaan:</span>
                      <strong className="text-white">{prj.progress}%</strong>
                    </div>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill orange" style={{ width: `${prj.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="admin-prj-footer">
                    <span className="text-sub">Estimasi BoQ: <strong className="text-white">{prj.budget}</strong></span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleDeleteProject(prj.id, prj.title)}
                        className="admin-act-btn del"
                        title="Hapus Proyek"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CALCULATOR LOGS */}
        {activeTab === 'calculator' && (
          <div className="admin-tab-content space-y">
            <div className="admin-box">
              <div className="admin-calc-box-header">
                <div className="admin-stat-icon-wrap orange">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="admin-box-title">Kalkulator Beban HVAC & Daya Listrik</h3>
                  <p className="admin-box-sub">Log simulasi beban pendinginan (TR) yang dihitung oleh pengunjung website.</p>
                </div>
              </div>

              <div className="admin-calc-stats">
                <div className="admin-calc-stat-item">
                  <span className="admin-calc-stat-sub">Total Simulasi</span>
                  <span className="admin-calc-stat-val text-white">124 Perhitungan</span>
                </div>
                <div className="admin-calc-stat-item">
                  <span className="admin-calc-stat-sub">Rata-rata Kapasitas</span>
                  <span className="admin-calc-stat-val text-orange">180 TR / Gedung</span>
                </div>
                <div className="admin-calc-stat-item">
                  <span className="admin-calc-stat-sub">Proyeksi Hemat Listrik</span>
                  <span className="admin-calc-stat-val text-green">Rp 184 Juta / Bln</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LEGALITY SETTINGS */}
        {activeTab === 'settings' && (
          <div className="admin-tab-content space-y">
            {settingsToast && (
              <div className="admin-toast-success" style={{
                background: 'rgba(37, 211, 102, 0.15)',
                border: '1px solid #25D366',
                color: '#25D366',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <Check size={18} />
                <span>{settingsToast}</span>
              </div>
            )}
            <div className="admin-box">
              <div className="admin-box-header">
                <div>
                  <h3 className="admin-box-title">Verifikasi Legalitas & NIB Perusahaan</h3>
                  <p className="admin-box-sub">Pengaturan dokumen verifikasi hukum PT LENTANG Duta Perkasa yang tersinkronisasi langsung ke modal informasi website.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <a 
                    href="/#kontak" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="admin-btn-secondary"
                  >
                    <ExternalLink size={15} />
                    <span>Lihat di Beranda</span>
                  </a>
                  <button onClick={handleOpenEditSettings} className="admin-btn-primary">
                    <Edit3 size={15} />
                    <span>Edit Dokumen Legalitas</span>
                  </button>
                </div>
              </div>

              <div className="admin-legal-grid">
                <div className="admin-legal-card">
                  <div className="admin-legal-row">
                    <span className="text-sub">Nomor NIB:</span>
                    <strong className="text-white">{siteSettings.nib}</strong>
                  </div>
                  <div className="admin-legal-row">
                    <span className="text-sub">Lembaga Terdaftar:</span>
                    <strong className="text-white">{siteSettings.institution}</strong>
                  </div>
                  <div className="admin-legal-row">
                    <span className="text-sub">Kualifikasi:</span>
                    <strong className="text-white">{siteSettings.qualification}</strong>
                  </div>
                </div>

                <div className="admin-legal-card">
                  <div className="admin-legal-row">
                    <span className="text-sub">Sertifikasi SNI:</span>
                    <strong className="text-green">{siteSettings.sni_cert}</strong>
                  </div>
                  <div className="admin-legal-row">
                    <span className="text-sub">Supervisi Ahli:</span>
                    <strong className="text-white">{siteSettings.expert_supervision}</strong>
                  </div>
                  <div className="admin-legal-row">
                    <span className="text-sub">Kontak Hotline Legal:</span>
                    <strong className="text-orange">{siteSettings.hotline}</strong>
                  </div>
                  <div className="admin-legal-row">
                    <span className="text-sub">Email Korespondensi:</span>
                    <a href={`mailto:${siteSettings.email}`} className="text-blue" style={{ textDecoration: 'none', fontWeight: 'bold' }}>{siteSettings.email}</a>
                  </div>
                </div>
              </div>
            </div>

            {/* KEAMANAN & GANTI PASSWORD ADMIN */}
            <div className="admin-box" style={{ marginTop: '24px' }}>
              <div className="admin-box-header">
                <div>
                  <h3 className="admin-box-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} style={{ color: '#3B82F6' }} />
                    <span>Keamanan Akses & Kata Sandi Admin</span>
                  </h3>
                  <p className="admin-box-sub">Ubah kata sandi dashboard admin LDP Consultant. Sandi dienkripsi dengan standar kriptografi SHA-256 + Salt.</p>
                </div>
              </div>

              {pwdChangeToast.message && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  background: pwdChangeToast.type === 'success' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: pwdChangeToast.type === 'success' ? '1px solid #25D366' : '1px solid #EF4444',
                  color: pwdChangeToast.type === 'success' ? '#25D366' : '#EF4444'
                }}>
                  {pwdChangeToast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                  <span>{pwdChangeToast.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Password Saat Ini</label>
                  <input 
                    type="password"
                    required
                    placeholder="Masukkan password saat ini..."
                    value={pwdChangeForm.current}
                    onChange={(e) => setPwdChangeForm({ ...pwdChangeForm, current: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Password Baru (Minimal 8 karakter)</label>
                  <input 
                    type="password"
                    required
                    placeholder="Kombinasi huruf besar, kecil, angka, dan simbol..."
                    value={pwdChangeForm.newPwd}
                    onChange={(e) => setPwdChangeForm({ ...pwdChangeForm, newPwd: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Konfirmasi Password Baru</label>
                  <input 
                    type="password"
                    required
                    placeholder="Ketik ulang password baru..."
                    value={pwdChangeForm.confirm}
                    onChange={(e) => setPwdChangeForm({ ...pwdChangeForm, confirm: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                  <button type="submit" className="admin-btn-primary" disabled={isChangingPwd}>
                    <Lock size={15} />
                    <span>{isChangingPwd ? "Menyimpan..." : "Simpan Password Baru"}</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={handleResetDefaultPassword}
                    className="admin-btn-secondary"
                    title="Reset ke password sistem bawaan"
                  >
                    <RotateCcw size={14} />
                    <span>Reset Default</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: WHATSAPP MANAGEMENT */}
        {activeTab === 'whatsapp' && (
          <div className="admin-tab-content space-y">
            
            {/* SUCCESS TOAST ALERT */}
            {waToast && (
              <div className="admin-toast-success" style={{
                background: 'rgba(37, 211, 102, 0.15)',
                border: '1px solid #25D366',
                color: '#25D366',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <Check size={18} />
                <span>{waToast}</span>
              </div>
            )}

            {/* TOP ACTIONS */}
            <div className="admin-box-top-actions">
              <div>
                <h3 className="admin-box-title">Manajemen Kontak WhatsApp Live Widget</h3>
                <p className="admin-box-sub">Atur tim engineer/CS, nomor WhatsApp aktif, dan foto profil yang tampil pada widget floating website.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <a 
                  href="/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="admin-btn-secondary"
                >
                  <ExternalLink size={15} />
                  <span>Lihat di Beranda</span>
                </a>
                <button 
                  onClick={() => {
                    if (window.confirm('Hapus semua foto profil kontak WhatsApp? Kontak akan beralih ke inisial badge yang rapi.')) {
                      const cleared = waContacts.map(c => ({ ...c, image: '' }));
                      saveWaContactsToStorage(cleared);
                      alert('Semua foto profil kontak WhatsApp telah berhasil dihapus!');
                    }
                  }} 
                  className="admin-btn-secondary" 
                  style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title="Hapus foto dari semua kontak WhatsApp (Gunakan Inisial Badge)"
                >
                  <Trash2 size={15} />
                  <span>Hapus Semua Foto WA</span>
                </button>
                <button onClick={handleResetWaContacts} className="admin-btn-secondary" title="Kembalikan ke 3 kontak default">
                  <RotateCcw size={15} />
                  <span>Reset Default</span>
                </button>
                <button onClick={() => setShowAddWaModal(true)} className="admin-btn-primary">
                  <Plus size={16} />
                  <span>Tambah Kontak WA</span>
                </button>
                <button 
                  onClick={handleFinishWaChanges} 
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Klik Selesai ketika selesai mengubah kontak untuk memastikan data tersimpan & aktif di website"
                >
                  <CheckCircle2 size={16} />
                  <span>Selesai</span>
                </button>
              </div>
            </div>

            {/* 2 COLUMNS: CONTACT LIST & LIVE WIDGET PREVIEW */}
            <div className="admin-two-cols">
              
              {/* LEFT COLUMN: CONTACT CARDS LIST */}
              <div className="admin-box col-left" style={{ flex: '1.2' }}>
                <div className="admin-box-header">
                  <div>
                    <h3 className="admin-box-title">Daftar Kontak Konsultan (Live)</h3>
                    <p className="admin-box-sub">Total {waContacts.length} kontak terdaftar ({waContacts.filter(c => c.active !== false).length} aktif).</p>
                  </div>
                </div>

                <div className="admin-wa-contacts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                  {waContacts.map((contact) => (
                    <div 
                      key={contact.id} 
                      className={`admin-wa-card ${contact.active === false ? 'disabled' : ''}`}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        opacity: contact.active === false ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {contact.image ? (
                          <img 
                            src={contact.image} 
                            alt={contact.name} 
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #25D366' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div 
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #128C7E, #25D366)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1rem',
                              border: '2px solid #25D366',
                              flexShrink: 0
                            }}
                          >
                            {contact.name ? contact.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'WA'}
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, color: '#0F172A', fontSize: '0.95rem', fontWeight: 700 }}>{contact.name}</h4>
                            <span className={`admin-status-tag ${contact.active !== false ? 'green' : 'orange'}`} style={{ fontSize: '0.7rem' }}>
                              {contact.active !== false ? 'Aktif' : 'Non-Aktif'}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 4px', color: '#0284C7', fontSize: '0.8rem', fontWeight: 600 }}>{contact.role}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.78rem' }}>
                            <Phone size={13} className="text-green" />
                            <span>+{contact.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="admin-action-btns" style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleToggleWaStatus(contact.id)}
                          className={`admin-act-btn ${contact.active !== false ? 'view' : 'wa'}`}
                          title={contact.active !== false ? "Non-aktifkan kontak" : "Aktifkan kontak"}
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingWaContact(contact)} 
                          className="admin-act-btn wa"
                          title="Edit Kontak"
                        >
                          <Edit3 size={16} />
                        </button>
                        <a 
                          href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${contact.name}, tes koneksi dari Admin Dashboard`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-act-btn wa"
                          title="Tes Chat WhatsApp"
                          style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}
                        >
                          <Phone size={16} />
                        </a>
                        <button 
                          onClick={() => handleDeleteWaContact(contact.id)} 
                          className="admin-act-btn del"
                          title="Hapus Kontak"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selesai / Konfirmasi Bar */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '14px 18px', 
                  background: 'rgba(16, 185, 129, 0.08)', 
                  border: '1px solid rgba(16, 185, 129, 0.25)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.85rem', fontWeight: 500 }}>
                    <CheckCircle2 size={18} />
                    <span>Sudah selesai mengubah? Klik tombol untuk konfirmasi dan sinkronisasi ke website.</span>
                  </div>
                  <button 
                    onClick={handleFinishWaChanges}
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Selesai</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE PREVIEW OF THE FLOATING WIDGET */}
              <div className="admin-box col-right" style={{ flex: '0.8' }}>
                <div className="admin-box-header">
                  <h3 className="admin-box-title">Pratinjau Live Widget</h3>
                  <Sparkles size={18} className="text-green" />
                </div>
                <p className="admin-box-sub">Tampilan nyata popup widget WhatsApp di sudut kanan bawah website.</p>

                {/* SIMULATED WIDGET POPUP */}
                <div style={{ 
                  background: '#FFFFFF', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  marginTop: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)' 
                }}>
                  {/* Simulated Header */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)', 
                    padding: '16px 18px', 
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-0.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Start a Conversation</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Chat with us</p>
                    </div>
                  </div>

                  {/* Simulated Body Contacts */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#FFFFFF' }}>
                    {waContacts.filter(c => c.active !== false).map(c => (
                      <div key={c.id} style={{ 
                        background: '#F8FAFC', 
                        border: '1px solid #E2E8F0',
                        padding: '10px 12px', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {c.image ? (
                            <img 
                              src={c.image} 
                              alt={c.name} 
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div 
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #128C7E, #25D366)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}
                            >
                              {c.name ? c.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'WA'}
                            </div>
                          )}
                          <div>
                            <div style={{ color: '#0F172A', fontSize: '0.82rem', fontWeight: 700 }}>{c.name}</div>
                            <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{c.role}</div>
                          </div>
                        </div>
                        <div style={{ background: '#25D366', color: '#FFFFFF', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                          <Phone size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(37, 211, 102, 0.08)', borderRadius: '10px', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                  <p style={{ margin: 0, color: '#25D366', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} />
                    <span>Setiap perubahan kontak otomatis disinkronisasi ke seluruh pengunjung website secara realtime.</span>
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 7: TEAM & LEADERSHIP MANAGEMENT (activeTab === 'team') */}
        {activeTab === 'team' && (
          <div className="admin-tab-content space-y">
            
            {/* SUCCESS TOAST ALERT */}
            {teamToast && (
              <div className="admin-toast-success" style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid #38BDF8',
                color: '#38BDF8',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <Check size={18} />
                <span>{teamToast}</span>
              </div>
            )}

            {/* STAT CARDS ROW */}
            <div className="admin-stats-grid">
              
              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Total Pimpinan & Pakar</span>
                  <div className="admin-stat-icon-wrap blue">
                    <Users size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{teamMembers.length}</span>
                  <span className="admin-stat-badge blue">Profil Aktif</span>
                </div>
                <p className="admin-stat-sub">Tampil di beranda website</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Direktur Teknik (MEP)</span>
                  <div className="admin-stat-icon-wrap orange">
                    <Building2 size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {teamMembers.filter(m => (m.role || '').toLowerCase().includes('engineering') || (m.badge || '').toLowerCase().includes('technical')).length}
                  </span>
                  <span className="admin-stat-badge green">Expert STRA</span>
                </div>
                <p className="admin-stat-sub">Supervisi desain & engineering</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Dewan Penasihat / Advisory</span>
                  <div className="admin-stat-icon-wrap purple">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {teamMembers.filter(m => (m.role || '').toLowerCase().includes('advis') || (m.badge || '').toLowerCase().includes('advisor')).length}
                  </span>
                  <span className="admin-stat-badge purple">Senior Advisor</span>
                </div>
                <p className="admin-stat-sub">Konsultasi strategis nasional</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Sertifikasi & Kualifikasi</span>
                  <div className="admin-stat-icon-wrap green">
                    <Sparkles size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value font-sm">LPJK / SKA Utama</span>
                </div>
                <p className="admin-stat-sub text-green">✓ Terdaftar & Tersertifikasi</p>
              </div>

            </div>

            {/* TOP BAR ACTIONS */}
            <div className="admin-box-top-actions">
              <div>
                <h3 className="admin-box-title">Daftar Jajaran Direksi & Dewan Pakar Rekayasa</h3>
                <p className="admin-box-sub">Atur nama, gelar akademik, peran pimpinan, inisial/foto avatar, dan deskripsi kepakaran yang tampil di section "Tim & Direksi".</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <a 
                  href="/#direksi" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="admin-btn-secondary"
                >
                  <ExternalLink size={15} />
                  <span>Lihat di Beranda</span>
                </a>
                <button onClick={handleResetTeam} className="admin-btn-secondary" title="Kembalikan ke susunan awal 3 direktur">
                  <RotateCcw size={15} />
                  <span>Reset Bawaan</span>
                </button>
                <button onClick={handleOpenAddMember} className="admin-btn-primary">
                  <Plus size={16} />
                  <span>Tambah Direksi / Pakar</span>
                </button>
                <button 
                  onClick={handleFinishTeamChanges} 
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Klik Selesai ketika selesai mengubah data direksi & tim untuk memastikan data tersimpan & aktif di website"
                >
                  <CheckCircle2 size={16} />
                  <span>Selesai</span>
                </button>
              </div>
            </div>

            {/* TEAM CARDS GRID */}
            <div className="admin-team-grid">
              {teamMembers.map((member) => (
                <div key={member.id} className="admin-team-card">
                  <span className={`admin-status-tag ${
                    (member.badge || '').includes('TECHNICAL') ? 'orange' :
                    (member.badge || '').includes('OPERATIONAL') ? 'blue' : 'purple'
                  }`}>
                    {member.badge}
                  </span>

                  <div className="admin-team-avatar-wrap">
                    {member.image ? (
                      <img 
                        src={member.image} 
                        alt={member.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="admin-team-initials">{member.initials || 'ES'}</span>
                    )}
                  </div>

                  <h4 className="admin-team-name">{member.name}</h4>
                  <div className="admin-team-role">{member.role}</div>
                  <p className="admin-team-bio">{member.bio}</p>

                  <div className="admin-team-footer">
                    <button 
                      onClick={() => handleOpenEditMember(member)}
                      className="admin-btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.75rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38BDF8' }}
                      title="Edit Data Pimpinan Ini"
                    >
                      <Edit3 size={14} />
                      <span>Edit Profil</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="admin-act-btn del"
                      style={{ width: '36px', height: '36px' }}
                      title="Hapus dari Susunan Direksi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Selesai / Konfirmasi Bar */}
            <div style={{ 
              marginTop: '20px', 
              padding: '14px 18px', 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.25)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.85rem', fontWeight: 500 }}>
                <CheckCircle2 size={18} />
                <span>Sudah selesai mengubah susunan direksi & dewan pakar? Klik tombol untuk konfirmasi dan sinkronisasi ke website.</span>
              </div>
              <button 
                onClick={handleFinishTeamChanges}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Selesai</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 8: ARTICLE MANAGEMENT (activeTab === 'articles') */}
        {activeTab === 'articles' && (
          <div className="admin-tab-content space-y">
            
            {/* SUCCESS TOAST ALERT */}
            {articleToast && (
              <div className="admin-toast-success" style={{
                background: 'rgba(255, 102, 0, 0.15)',
                border: '1px solid #FF6600',
                color: '#FF6600',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <Check size={18} />
                <span>{articleToast}</span>
              </div>
            )}

            {/* STAT CARDS ROW FOR ARTICLES */}
            <div className="admin-stats-grid">
              
              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Total Publikasi</span>
                  <div className="admin-stat-icon-wrap orange">
                    <BookOpen size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{articles.length}</span>
                  <span className="admin-stat-badge green">Aktif Web</span>
                </div>
                <p className="admin-stat-sub">Jurnal & Panduan Teknik MEP</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Total Pembaca</span>
                  <div className="admin-stat-icon-wrap blue">
                    <Eye size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {articles.reduce((acc, a) => acc + (Number(a.views) || 0), 0).toLocaleString('id-ID')}
                  </span>
                  <span className="admin-stat-badge blue">Views Riil</span>
                </div>
                <p className="admin-stat-sub">Akumulasi pembaca artikel</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Kategori Teknik</span>
                  <div className="admin-stat-icon-wrap green">
                    <Folder size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{new Set(articles.map(a => a.category)).size}</span>
                  <span className="admin-stat-badge green">Disiplin MEP</span>
                </div>
                <p className="admin-stat-sub">HVAC, Cleanroom, Fire, dll</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Artikel Utama</span>
                  <div className="admin-stat-icon-wrap purple">
                    <Star size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {articles.filter(a => a.featured).length}
                  </span>
                  <span className="admin-stat-badge amber">Featured</span>
                </div>
                <p className="admin-stat-sub">Highlight di beranda blog</p>
              </div>

            </div>

            {/* TOP BAR ACTIONS */}
            <div className="admin-box-top-actions">
              <div>
                <h3 className="admin-box-title">Daftar Publikasi Artikel & Jurnal Engineering</h3>
                <p className="admin-box-sub">Tulis artikel baru, edit isi konten, tentukan kategori, ganti foto cover, dan terbitkan langsung ke website.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <a 
                  href="/#blog" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="admin-btn-secondary"
                >
                  <ExternalLink size={15} />
                  <span>Buka Blog Website</span>
                </a>
                <button onClick={handleResetArticles} className="admin-btn-secondary" title="Kembalikan ke artikel bawaan sistem">
                  <RotateCcw size={15} />
                  <span>Reset Bawaan</span>
                </button>
                <button onClick={handleOpenNewArticle} className="admin-btn-primary">
                  <Plus size={16} />
                  <span>Tulis Artikel Baru</span>
                </button>
              </div>
            </div>

            {/* FILTER & SEARCH ROW */}
            <div className="admin-filter-bar">
              <div className="admin-search-wrap" style={{ flex: 1, minWidth: '280px', maxWidth: 'none' }}>
                <Search size={16} className="admin-search-icon" />
                <input 
                  type="text" 
                  placeholder="Cari judul artikel, topik tag, ringkasan, atau nama penulis..." 
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div className="admin-filter-select-wrap">
                  <Filter size={16} className="admin-filter-icon" />
                  <select
                    value={articleCategoryFilter}
                    onChange={(e) => setArticleCategoryFilter(e.target.value)}
                    className="admin-select"
                    style={{ minWidth: '175px' }}
                  >
                    <option value="all">Semua Kategori</option>
                    {ARTICLE_CATEGORIES.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-filter-select-wrap">
                  <Star size={16} className="admin-filter-icon" />
                  <select
                    value={articleFeaturedFilter}
                    onChange={(e) => setArticleFeaturedFilter(e.target.value)}
                    className="admin-select"
                    style={{ minWidth: '185px' }}
                  >
                    <option value="all">Semua Status Featured</option>
                    <option value="featured">Hanya Artikel Utama (Featured)</option>
                    <option value="standard">Artikel Standar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ARTICLES DATA TABLE */}
            <div className="admin-table-box">
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '260px' }}>Cover & Judul Artikel</th>
                      <th style={{ minWidth: '145px' }}>Kategori Disiplin</th>
                      <th style={{ minWidth: '150px' }}>Penulis & Posisi</th>
                      <th style={{ minWidth: '95px' }}>Statistik</th>
                      <th style={{ minWidth: '110px' }}>Terbit</th>
                      <th style={{ minWidth: '85px', textAlign: 'center' }}>Featured</th>
                      <th style={{ minWidth: '135px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.filter(art => {
                      const q = articleSearch.toLowerCase().trim();
                      const matchSearch = q === '' ||
                        art.title?.toLowerCase().includes(q) ||
                        art.summary?.toLowerCase().includes(q) ||
                        art.category?.toLowerCase().includes(q) ||
                        (Array.isArray(art.tags) && art.tags.some(t => t.toLowerCase().includes(q))) ||
                        art.author?.name?.toLowerCase().includes(q);

                      const matchCategory = articleCategoryFilter === 'all' || art.category === articleCategoryFilter;
                      const matchFeatured = articleFeaturedFilter === 'all' || 
                        (articleFeaturedFilter === 'featured' && art.featured) ||
                        (articleFeaturedFilter === 'standard' && !art.featured);

                      return matchSearch && matchCategory && matchFeatured;
                    }).map((art) => (
                      <tr key={art.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img 
                              src={art.image || "/images/office_presentation.jpg"} 
                              alt={art.title} 
                              className="admin-article-img-col"
                              onClick={() => setPreviewingArticle(art)}
                              style={{ cursor: 'pointer' }}
                              onError={(e) => { e.target.src = "/images/office_presentation.jpg"; }}
                              title="Klik untuk pratinjau"
                            />
                            <div style={{ minWidth: 0 }}>
                              <div 
                                className="admin-article-title-link"
                                onClick={() => handleOpenEditArticle(art)}
                                title="Klik untuk mengedit artikel ini"
                              >
                                {art.title}
                              </div>
                              <div className="admin-article-slug">
                                #blog/{art.slug}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {art.summary}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className={`admin-status-tag ${
                            art.category.includes('HVAC') ? 'orange' : 
                            art.category.includes('Cleanroom') ? 'blue' : 
                            art.category.includes('Plumbing') ? 'green' : 
                            art.category.includes('Data Center') ? 'purple' : 'blue'
                          }`}>
                            {art.category}
                          </span>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #E2E8F0', background: '#F1F5F9' }}>
                              <img 
                                src={art.author?.avatar || "/images/avatar_ade.jpg"} 
                                alt={art.author?.name} 
                                style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', objectFit: 'cover', display: 'block' }}
                                onError={(e) => { e.target.onerror = null; e.target.src = "/images/avatar_ade.jpg"; }}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-white" style={{ fontSize: '0.78rem' }}>{art.author?.name}</div>
                              <div className="text-sub" style={{ fontSize: '0.7rem' }}>{art.author?.role}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#CBD5E1' }}>
                              <Eye size={12} className="text-blue" />
                              <span>{art.views?.toLocaleString('id-ID') || 0} views</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#94A3B8' }}>
                              <Clock size={11} />
                              <span>{art.readTime || '5 menit'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="text-sub" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>{art.publishedAt}</span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(art.id)}
                            className={`admin-featured-star-btn ${art.featured ? 'is-featured' : 'not-featured'}`}
                            title={art.featured ? "Artikel Pilihan Utama (Klik untuk batalkan)" : "Klik untuk jadikan Artikel Utama"}
                          >
                            <Star size={14} fill={art.featured ? "currentColor" : "none"} />
                            <span>{art.featured ? "Utama" : "Standar"}</span>
                          </button>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-action-btns">
                            <button 
                              onClick={() => setPreviewingArticle(art)} 
                              className="admin-act-btn view" 
                              title="Pratinjau Artikel Lengkap"
                            >
                              <Eye size={15} />
                            </button>
                            <button 
                              onClick={() => handleOpenEditArticle(art)} 
                              className="admin-act-btn wa" 
                              title="Edit Konten & Pengaturan"
                              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                            >
                              <Edit3 size={15} />
                            </button>
                            <a
                              href={`#blog/${art.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-act-btn view"
                              title="Buka Live di Halaman Blog"
                            >
                              <ArrowUpRight size={15} />
                            </a>
                            <button 
                              onClick={() => handleDeleteArticle(art.id, art.title)} 
                              className="admin-act-btn del" 
                              title="Hapus Artikel"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 8: DATABASE & SUPABASE */}
        {activeTab === 'database' && (
          <div className="admin-tab-content">
            
            {/* Supabase Status Banner */}
            <div style={{
              background: supabaseConfig.isConfigured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${supabaseConfig.isConfigured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: supabaseConfig.isConfigured ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: supabaseConfig.isConfigured ? '#10B981' : '#F59E0B'
                }}>
                  <Database size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {supabaseConfig.isConfigured ? '🟢 PostgreSQL Cloud Supabase Terhubung' : '🟡 Mode Penyimpanan Lokal (Offline Fallback)'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                    {supabaseConfig.isConfigured 
                      ? `Terhubung ke target: ${supabaseConfig.url}`
                      : 'Data tersimpan di browser (localStorage). Hubungkan ke Supabase agar tersimpan permanen di cloud.'}
                  </p>
                </div>
              </div>

              {supabaseConfig.isConfigured && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleSyncAllToSupabase}
                    disabled={isSyncingData}
                    className="admin-btn-primary"
                    style={{ background: '#3B82F6', borderColor: '#3B82F6' }}
                  >
                    <Upload size={15} />
                    <span>{isSyncingData ? 'Menyinkronkan...' : 'Sinkronkan Data ke Cloud'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="admin-act-btn del"
                    style={{ padding: '8px 14px', width: 'auto', borderRadius: '8px', fontSize: '0.82rem' }}
                  >
                    Putuskan
                  </button>
                </div>
              )}
            </div>

            {/* Test Status Message */}
            {supabaseTestStatus.tested && (
              <div style={{
                background: supabaseTestStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${supabaseTestStatus.success ? '#10B981' : '#EF4444'}`,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                color: supabaseTestStatus.success ? '#10B981' : '#EF4444',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {supabaseTestStatus.loading ? <Activity className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                <span>{supabaseTestStatus.message}</span>
              </div>
            )}

            {/* TWO COLUMNS CONFIG & SQL GUIDE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
              
              {/* Form Input Kredensial */}
              <div className="admin-content-card">
                <div className="admin-card-header">
                  <div className="admin-card-title-wrap">
                    <h2 className="admin-card-title">Kredensial API Supabase</h2>
                    <p className="admin-card-sub">Dapatkan kredensial ini di dashboard Supabase (Project Settings &gt; API)</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSupabaseConfig} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Project URL (Supabase URL)</label>
                    <input
                      type="url"
                      placeholder="https://xyzcompany.supabase.co"
                      value={supabaseInputUrl}
                      onChange={(e) => setSupabaseInputUrl(e.target.value)}
                      className="admin-form-input"
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Contoh: https://abcdefghijkl.supabase.co</span>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Anon / Public API Key</label>
                    <textarea
                      rows={3}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseInputKey}
                      onChange={(e) => setSupabaseInputKey(e.target.value)}
                      className="admin-form-input font-mono"
                      style={{ fontSize: '0.78rem', resize: 'vertical' }}
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Gunakan key bertuliskan "anon" / "public" (bukan service_role).</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button type="submit" className="admin-btn-primary" style={{ flex: 1 }}>
                      <Check size={16} />
                      <span>Simpan & Uji Koneksi</span>
                    </button>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-secondary"
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ExternalLink size={15} />
                      <span>Buka Supabase</span>
                    </a>
                  </div>
                </form>
              </div>

              {/* SQL Migration Quick Action */}
              <div className="admin-content-card">
                <div className="admin-card-header">
                  <div className="admin-card-title-wrap">
                    <h2 className="admin-card-title">Setup Tabel Database (SQL Schema)</h2>
                    <p className="admin-card-sub">Jalankan SQL query berikut di SQL Editor Supabase untuk membuat tabel otomatis</p>
                  </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    background: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '14px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#38BDF8',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
{`CREATE TABLE public.articles (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  author JSONB,
  ...
);`}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleCopySqlSchema}
                      className="admin-btn-primary"
                      style={{ flex: 1, background: copiedSql ? '#10B981' : '#F97316' }}
                    >
                      {copiedSql ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedSql ? '✓ Berhasil Disalin ke Clipboard!' : 'Salin Script SQL Schema Lengkap'}</span>
                    </button>
                  </div>

                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', padding: '14px', fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.6 }}>
                    <strong style={{ color: '#F8FAFC' }}>Cara Menjalankan di Supabase:</strong>
                    <ol style={{ paddingLeft: '18px', margin: '8px 0 0' }}>
                      <li>Buka dashboard proyek Anda di <strong>Supabase</strong>.</li>
                      <li>Di menu samping kiri, klik icon <strong>SQL Editor</strong>.</li>
                      <li>Klik <strong>New Query</strong>, paste script yang telah disalin di atas.</li>
                      <li>Klik tombol hijau <strong>Run</strong> di kanan bawah. Selesai!</li>
                    </ol>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 9: USER MANAGEMENT (activeTab === 'users' && currentUser?.role !== 'author') */}
        {activeTab === 'users' && currentUser?.role !== 'author' && (
          <div className="admin-tab-content space-y">
            
            {/* TOAST ALERT */}
            {userToast && (
              <div className="admin-toast-success" style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid #3B82F6',
                color: '#60A5FA',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <Check size={18} />
                <span>{userToast}</span>
              </div>
            )}

            {/* STAT CARDS ROW FOR USERS */}
            <div className="admin-stats-grid">
              
              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Total Pengguna</span>
                  <div className="admin-stat-icon-wrap blue">
                    <Users size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">{usersList.length}</span>
                  <span className="admin-stat-badge blue">Akun Terdaftar</span>
                </div>
                <p className="admin-stat-sub">Semua pengguna portal admin</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Super Administrator</span>
                  <div className="admin-stat-icon-wrap purple">
                    <Shield size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {usersList.filter(u => u.role === 'super_admin').length}
                  </span>
                  <span className="admin-stat-badge purple">Full Akses</span>
                </div>
                <p className="admin-stat-sub">Akses seluruh menu & database</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Penulis Artikel</span>
                  <div className="admin-stat-icon-wrap orange">
                    <BookOpen size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {usersList.filter(u => u.role === 'author').length}
                  </span>
                  <span className="admin-stat-badge amber">Khusus Blog</span>
                </div>
                <p className="admin-stat-sub">Akses posting & edit artikel</p>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card-header">
                  <span className="admin-stat-label">Pengguna Aktif</span>
                  <div className="admin-stat-icon-wrap green">
                    <UserCheck size={18} />
                  </div>
                </div>
                <div className="admin-stat-val-row">
                  <span className="admin-stat-value">
                    {usersList.filter(u => u.isActive !== false).length}
                  </span>
                  <span className="admin-stat-badge green">Diizinkan</span>
                </div>
                <p className="admin-stat-sub">Bisa login ke portal admin</p>
              </div>

            </div>

            {/* TOP BAR ACTIONS */}
            <div className="admin-box-top-actions">
              <div>
                <h3 className="admin-box-title">Daftar Akun Pengguna & Hak Akses Portal</h3>
                <p className="admin-box-sub">Buat akun untuk tim penulis atau rekan direksi. Penulis hanya bisa membuka menu artikel & blog demi menjaga privasi data klien.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {isSupabaseConfigured() && (
                  <button 
                    onClick={handleSyncUsersToSupabaseNow} 
                    className="admin-btn-secondary"
                    disabled={isSyncingUsers}
                    title="Kirim dan sinkronkan daftar akun ini ke Cloud Supabase"
                  >
                    <Database size={15} />
                    <span>{isSyncingUsers ? "Menyinkronkan..." : "Sinkron ke Supabase"}</span>
                  </button>
                )}
                <button onClick={handleOpenNewUser} className="admin-btn-primary">
                  <UserPlus size={16} />
                  <span>Tambah Pengguna Baru</span>
                </button>
              </div>
            </div>

            {/* FILTER & SEARCH ROW */}
            <div className="admin-filter-bar">
              <div className="admin-search-wrap" style={{ flex: 1, minWidth: '280px', maxWidth: 'none' }}>
                <Search size={16} className="admin-search-icon" />
                <input 
                  type="text" 
                  placeholder="Cari nama pengguna, username (@id), atau spesialisasi jabatan..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div className="admin-filter-select-wrap">
                  <Filter size={16} className="admin-filter-icon" />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="admin-select"
                    style={{ minWidth: '175px' }}
                  >
                    <option value="all">Semua Hak Akses</option>
                    <option value="super_admin">🛡️ Super Admin</option>
                    <option value="author">✍️ Penulis Artikel</option>
                  </select>
                </div>

                <div className="admin-filter-select-wrap">
                  <UserCheck size={16} className="admin-filter-icon" />
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="admin-select"
                    style={{ minWidth: '150px' }}
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">🟢 Aktif</option>
                    <option value="inactive">⚪ Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            {/* USERS DATA TABLE */}
            <div className="admin-table-box">
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>Nama & Profil Pengguna</th>
                      <th style={{ minWidth: '180px' }}>Email Login</th>
                      <th style={{ minWidth: '120px' }}>Username</th>
                      <th style={{ minWidth: '140px' }}>Peran / Hak Akses</th>
                      <th style={{ minWidth: '170px' }}>Spesialisasi Jabatan</th>
                      <th style={{ minWidth: '90px', textAlign: 'center' }}>Status</th>
                      <th style={{ minWidth: '100px' }}>Terdaftar</th>
                      <th style={{ minWidth: '150px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.filter(u => {
                      const q = userSearch.toLowerCase().trim();
                      const matchSearch = q === '' ||
                        u.fullName?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.username?.toLowerCase().includes(q) ||
                        u.titlePosition?.toLowerCase().includes(q);

                      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                      const matchStatus = userStatusFilter === 'all' ||
                        (userStatusFilter === 'active' && u.isActive !== false) ||
                        (userStatusFilter === 'inactive' && u.isActive === false);

                      return matchSearch && matchRole && matchStatus;
                    }).map((u) => {
                      const isMasterAdmin = u.username.toLowerCase() === 'admin';
                      const isSelf = currentUser && currentUser.id === u.id;
                      const userEmail = u.email || (u.username === 'admin' ? 'admin@ldpconsultant.co.id' : `${u.username}@ldpconsultant.co.id`);

                      const defaultFallbackAvatar = (isMasterAdmin || u.role === 'super_admin') 
                        ? '/images/avatar_ade.jpg' 
                        : '/images/avatar_rizky.jpg';
                      const cleanAvatarSrc = (u.avatar && typeof u.avatar === 'string' && u.avatar.trim() && u.avatar !== '/images/admin.jpg')
                        ? u.avatar.trim()
                        : defaultFallbackAvatar;

                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div 
                                style={{ 
                                  width: '42px', 
                                  height: '42px', 
                                  minWidth: '42px', 
                                  minHeight: '42px', 
                                  borderRadius: '50%', 
                                  overflow: 'hidden', 
                                  flexShrink: 0, 
                                  border: '2px solid #E2E8F0', 
                                  background: '#F1F5F9',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                                  position: 'relative'
                                }}
                              >
                                <img 
                                  src={cleanAvatarSrc} 
                                  alt={u.fullName} 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    minWidth: '100%',
                                    minHeight: '100%',
                                    objectFit: 'cover', 
                                    display: 'block' 
                                  }}
                                  onError={(e) => { 
                                    e.target.onerror = null; 
                                    e.target.src = defaultFallbackAvatar; 
                                  }}
                                />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong className="text-white" style={{ fontSize: '0.86rem' }}>{u.fullName}</strong>
                                  {isSelf && (
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      Anda
                                    </span>
                                  )}
                                  {isMasterAdmin && (
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      Master
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                                  ID: #{u.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontSize: '0.82rem' }}>
                              <Mail size={13} style={{ flexShrink: 0, color: '#FF6600' }} />
                              <span>{userEmail}</span>
                            </div>
                          </td>

                          <td>
                            <code style={{ 
                              background: '#F1F5F9', 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              color: '#0F172A', 
                              fontSize: '0.78rem',
                              border: '1px solid #E2E8F0',
                              fontWeight: 600
                            }}>
                              @{u.username}
                            </code>
                          </td>

                          <td>
                            <span className={`admin-role-badge ${u.role === 'author' ? 'author' : 'super_admin'}`}>
                              {u.role === 'author' ? '✍️ Penulis Artikel' : '🛡️ Super Admin'}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
                              {u.titlePosition || (u.role === 'author' ? 'Technical Writer' : 'Engineering Admin')}
                            </span>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span className={`admin-status-tag ${u.isActive !== false ? 'green' : 'gray'}`}>
                              {u.isActive !== false ? '🟢 Aktif' : '⚪ Nonaktif'}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                              {u.createdAt || '2026-10-01'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <button 
                                onClick={() => handleOpenEditUser(u)} 
                                className="admin-action-btn edit"
                                title="Edit Data Pengguna"
                              >
                                <Edit size={14} />
                              </button>

                              <button 
                                onClick={() => handleOpenResetUserPassword(u)} 
                                className="admin-action-btn"
                                style={{ color: '#F59E0B' }}
                                title="Ganti Password Pengguna Ini"
                              >
                                <KeyRound size={14} />
                              </button>

                              <button 
                                onClick={() => handleToggleUserActive(u)} 
                                className="admin-action-btn"
                                style={{ color: u.isActive !== false ? '#94A3B8' : '#10B981', opacity: (isMasterAdmin || isSelf) ? 0.35 : 1, cursor: (isMasterAdmin || isSelf) ? 'not-allowed' : 'pointer' }}
                                title={isMasterAdmin ? 'Master admin tidak bisa dinonaktifkan' : isSelf ? 'Tidak bisa menonaktifkan akun sendiri' : u.isActive !== false ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                disabled={isMasterAdmin || isSelf}
                              >
                                {u.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>

                              <button 
                                onClick={() => handleDeleteUser(u)} 
                                className="admin-action-btn delete"
                                style={{ opacity: (isMasterAdmin || isSelf) ? 0.35 : 1, cursor: (isMasterAdmin || isSelf) ? 'not-allowed' : 'pointer' }}
                                title={isMasterAdmin ? 'Master admin tidak bisa dihapus' : isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Pengguna'}
                                disabled={isMasterAdmin || isSelf}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {usersList.filter(u => {
                      const q = userSearch.toLowerCase().trim();
                      const matchSearch = q === '' ||
                        u.fullName?.toLowerCase().includes(q) ||
                        u.username?.toLowerCase().includes(q) ||
                        u.titlePosition?.toLowerCase().includes(q);
                      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                      const matchStatus = userStatusFilter === 'all' ||
                        (userStatusFilter === 'active' && u.isActive !== false) ||
                        (userStatusFilter === 'inactive' && u.isActive === false);
                      return matchSearch && matchRole && matchStatus;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#94A3B8' }}>
                          <AlertCircle size={24} style={{ margin: '0 auto 8px', color: '#F59E0B' }} />
                          <div>Tidak ditemukan akun pengguna yang cocok dengan pencarian / filter.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* INFORMATION BANNER ON RBAC */}
            <div style={{
              background: 'rgba(15, 32, 56, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
              <ShieldCheck size={24} style={{ color: '#FF6600', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 700, margin: '0 0 6px' }}>
                  Panduan Hak Akses Pengguna (Role-Based Access Control)
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 6px' }}>
                    <strong style={{ color: '#60A5FA' }}>🛡️ Super Admin:</strong> Memiliki wewenang penuh mengakses seluruh 10 menu portal admin, termasuk data calon klien (Leads), WhatsApp konsultan, profil direksi, legalitas, manajemen pengguna, dan sinkronisasi database cloud.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#FF8800' }}>✍️ Penulis Artikel:</strong> Dikhususkan untuk tim konten/penulis. Saat login, sistem hanya menampilkan menu <strong>"Kelola Artikel & Blog"</strong>. Menu sensitif perusahaan disembunyikan dan dikunci demi menjaga keamanan informasi bisnis.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* LEAD DETAIL MODAL */}
      {selectedLead && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Detail Permintaan Konsultasi</h3>
              <button onClick={() => setSelectedLead(null)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-detail-row">
                <span className="admin-detail-label">ID Transaksi:</span>
                <span className="admin-detail-val font-mono">{selectedLead.id}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Nama Klien:</span>
                <span className="admin-detail-val font-bold">{selectedLead.name}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Perusahaan:</span>
                <span className="admin-detail-val">{selectedLead.company}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Kontak WhatsApp:</span>
                <span className="admin-detail-val text-green font-bold">{selectedLead.phone}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Email:</span>
                <span className="admin-detail-val">{selectedLead.email}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Kebutuhan Spesialisasi:</span>
                <span className="admin-detail-val text-orange font-bold">{selectedLead.serviceNeeded}</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Tipe Gedung & Lokasi:</span>
                <span className="admin-detail-val">{selectedLead.projectType} ({selectedLead.location})</span>
              </div>
              <div className="admin-detail-row">
                <span className="admin-detail-label">Luas Bangunan:</span>
                <span className="admin-detail-val">{selectedLead.areaSize}</span>
              </div>
              
              <div className="admin-detail-msg-box">
                <span className="admin-detail-label">Pesan Catatan Klien:</span>
                <p className="admin-detail-msg">{selectedLead.message}</p>
              </div>
            </div>

            <div className="admin-modal-footer">
              <a
                href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(selectedLead.name)},%20kami%20dari%20LDP%20Technical%20Consultant`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn-primary"
              >
                <Phone size={16} />
                <span>Hubungi via WhatsApp</span>
              </a>
              <button onClick={() => setSelectedLead(null)} className="admin-btn-back">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROJECT MODAL */}
      {showAddProjectModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Tambah Proyek Rekayasa Baru</h3>
              <button onClick={() => setShowAddProjectModal(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Nama Proyek</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Muara Laboh Power Plant Overhaul"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Nama Klien / Perusahaan</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: PT Supreme Energy"
                  value={newProject.client}
                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Kategori Proyek</label>
                <select 
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                  className="admin-select"
                >
                  <option value="Commercial">Commercial (Gedung)</option>
                  <option value="Industrial">Industrial (Pabrik)</option>
                  <option value="Critical Infra">Critical Infra (Data Center / RS)</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Estimasi Nilai BoQ</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Rp 1.5 Miliar"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-modal-footer">
                <button type="submit" className="admin-btn-primary full-width">
                  Simpan Proyek Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WHATSAPP CONTACT MODAL */}
      {editingWaContact && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit Kontak WhatsApp</h3>
              <button onClick={() => setEditingWaContact(null)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWaEdit} className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Nama Lengkap & Gelar</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Ir Ade Maulana ST MMT"
                  value={editingWaContact.name}
                  onChange={(e) => setEditingWaContact({ ...editingWaContact, name: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Jabatan / Spesialisasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Manager Engineer / Sales Engineer"
                  value={editingWaContact.role}
                  onChange={(e) => setEditingWaContact({ ...editingWaContact, role: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Nomor Telepon WhatsApp (Format Internasional)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: 6282111624297 (Awali dengan 62)"
                  value={editingWaContact.phone}
                  onChange={(e) => setEditingWaContact({ ...editingWaContact, phone: e.target.value })}
                  className="admin-input"
                />
                <p className="admin-hint">Gunakan format angka tanpa spasi (contoh: <strong>6282111624297</strong>)</p>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Foto Profil / Avatar Konsultan</label>
                
                {/* Current Avatar Preview & Upload Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0 12px' }}>
                  <div style={{ position: 'relative' }}>
                    {editingWaContact.image ? (
                      <img 
                        src={editingWaContact.image} 
                        alt="Preview" 
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: '3px solid #25D366',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #128C7E, #25D366)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        border: '3px solid #25D366',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                      }}>
                        {editingWaContact.name ? editingWaContact.name.substring(0, 2).toUpperCase() : 'WA'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <label 
                        className="admin-btn-primary" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '6px', 
                          cursor: 'pointer',
                          padding: '7px 14px',
                          fontSize: '0.8rem',
                          width: 'fit-content'
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload Foto dari Komputer</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageFileUpload(e, (base64) => setEditingWaContact({ ...editingWaContact, image: base64 }))}
                        />
                      </label>

                      {editingWaContact.image && (
                        <button
                          type="button"
                          onClick={() => setEditingWaContact({ ...editingWaContact, image: '' })}
                          className="admin-act-btn del"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.78rem', 
                            width: 'auto', 
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Hapus foto ini (gunakan inisial)"
                        >
                          <Trash2 size={13} />
                          <span>Hapus Foto</span>
                        </button>
                      )}

                      {/* Tombol Kembalikan Foto Asli */}
                      {String(editingWaContact.id) === '1' && editingWaContact.image !== '/images/abdul_wahid.jpg' && (
                        <button
                          type="button"
                          onClick={() => setEditingWaContact({ ...editingWaContact, image: '/images/abdul_wahid.jpg' })}
                          className="admin-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Kembalikan ke foto asli Abdul Wahid (jas hitam)"
                        >
                          <RotateCcw size={13} />
                          <span>Foto Asli Abdul Wahid</span>
                        </button>
                      )}
                      {String(editingWaContact.id) === '2' && editingWaContact.image !== '/images/tito_riyanto.jpg' && (
                        <button
                          type="button"
                          onClick={() => setEditingWaContact({ ...editingWaContact, image: '/images/tito_riyanto.jpg' })}
                          className="admin-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Kembalikan ke foto asli Tito Riyanto"
                        >
                          <RotateCcw size={13} />
                          <span>Foto Asli Tito</span>
                        </button>
                      )}
                      {String(editingWaContact.id) === '3' && editingWaContact.image !== '/images/ade_maulana.jpg' && (
                        <button
                          type="button"
                          onClick={() => setEditingWaContact({ ...editingWaContact, image: '/images/ade_maulana.jpg' })}
                          className="admin-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Kembalikan ke foto asli Ade Maulana"
                        >
                          <RotateCcw size={13} />
                          <span>Foto Asli Ade</span>
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>File foto (JPG/PNG, Maks 15MB) atau pilih galeri di bawah:</span>
                  </div>
                </div>

                {/* Preset Avatars Selection Grid */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 2px 10px' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditingWaContact({ ...editingWaContact, image: av.url })}
                      style={{
                        background: 'none',
                        border: editingWaContact.image === av.url ? '2px solid #25D366' : '1px solid #1E293B',
                        borderRadius: '50%',
                        padding: '2px',
                        cursor: 'pointer',
                        transform: editingWaContact.image === av.url ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      title={av.name}
                    >
                      <img 
                        src={av.url} 
                        alt={av.name} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </button>
                  ))}
                </div>

                {/* Custom URL Input Fallback */}
                <input 
                  type="text" 
                  placeholder="Atau masukkan URL / path gambar..."
                  value={editingWaContact.image}
                  onChange={(e) => setEditingWaContact({ ...editingWaContact, image: e.target.value })}
                  className="admin-input"
                  style={{ fontSize: '0.8rem', marginTop: '6px' }}
                />
              </div>

              <div className="admin-modal-footer">
                <button type="submit" className="admin-btn-primary full-width" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>Selesai & Simpan Kontak</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD WHATSAPP CONTACT MODAL */}
      {showAddWaModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Tambah Kontak WhatsApp Baru</h3>
              <button onClick={() => setShowAddWaModal(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddWaContact} className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Nama Lengkap & Gelar</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Budi Prasetyo ST"
                  value={newWaContact.name}
                  onChange={(e) => setNewWaContact({ ...newWaContact, name: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Jabatan / Spesialisasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: HVAC Senior Engineer"
                  value={newWaContact.role}
                  onChange={(e) => setNewWaContact({ ...newWaContact, role: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Nomor WhatsApp (Format 62...)</label>
                <input 
                  type="text" 
                  required
                  placeholder="6282111624297"
                  value={newWaContact.phone}
                  onChange={(e) => setNewWaContact({ ...newWaContact, phone: e.target.value })}
                  className="admin-input"
                />
                <p className="admin-hint">Gunakan format angka tanpa spasi (contoh: <strong>6282111624297</strong>)</p>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Foto Profil / Avatar Konsultan</label>
                
                {/* Current Avatar Preview & Upload Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0 12px' }}>
                    {newWaContact.image ? (
                      <img 
                        src={newWaContact.image} 
                        alt="Preview" 
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: '3px solid #25D366',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #128C7E, #25D366)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        border: '3px solid #25D366',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                      }}>
                        {newWaContact.name ? newWaContact.name.substring(0, 2).toUpperCase() : 'WA'}
                      </div>
                    )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label 
                      className="admin-btn-primary" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '6px', 
                        cursor: 'pointer',
                        padding: '8px 14px',
                        fontSize: '0.8rem',
                        width: 'fit-content'
                      }}
                    >
                      <Upload size={14} />
                      <span>Upload Foto dari Komputer</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageFileUpload(e, (base64) => setNewWaContact({ ...newWaContact, image: base64 }))}
                      />
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>File foto (JPG/PNG, Maks 5MB) atau pilih galeri di bawah:</span>
                  </div>
                </div>

                {/* Preset Avatars Selection Grid */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 2px 10px' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setNewWaContact({ ...newWaContact, image: av.url })}
                      style={{
                        background: 'none',
                        border: newWaContact.image === av.url ? '2px solid #25D366' : '1px solid #1E293B',
                        borderRadius: '50%',
                        padding: '2px',
                        cursor: 'pointer',
                        transform: newWaContact.image === av.url ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      title={av.name}
                    >
                      <img 
                        src={av.url} 
                        alt={av.name} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </button>
                  ))}
                </div>

                {/* Custom URL Input Fallback */}
                <input 
                  type="text" 
                  placeholder="Atau masukkan URL / path gambar..."
                  value={newWaContact.image}
                  onChange={(e) => setNewWaContact({ ...newWaContact, image: e.target.value })}
                  className="admin-input"
                  style={{ fontSize: '0.8rem', marginTop: '6px' }}
                />
              </div>

              <div className="admin-modal-footer">
                <button type="submit" className="admin-btn-primary full-width" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>Selesai & Tambah Kontak</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARTICLE EDITOR MODAL (WRITE / EDIT WITH LIVE PREVIEW) */}
      {showArticleEditorModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card admin-modal-xl">
            {/* Modal Header */}
            <div className="admin-modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid #1E293B', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} className="text-orange" />
                  <span>{editingArticleId ? 'Edit Publikasi Artikel' : 'Tulis Artikel & Jurnal Rekayasa Baru'}</span>
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  {editingArticleId ? `ID Artikel: ${editingArticleId} • Perubahan akan langsung tampil di website` : 'Buat publikasi teknis baru untuk mengedukasi klien & meningkatkan reputasi engineering LDP'}
                </p>
              </div>

              {/* Subtabs Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="admin-editor-subtabs">
                  <button 
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={`admin-editor-tab-btn ${editorTab === 'write' ? 'active' : ''}`}
                  >
                    <Edit3 size={14} />
                    <span>Tulis & Atur</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`admin-editor-tab-btn ${editorTab === 'preview' ? 'active' : ''}`}
                  >
                    <Eye size={14} />
                    <span>Pratinjau Live</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditorTab('seo')}
                    className={`admin-editor-tab-btn ${editorTab === 'seo' ? 'active' : ''}`}
                    title="Audit Skor SEO & Pemeriksaan Keamanan Konten"
                  >
                    <ShieldCheck size={14} />
                    <span>Audit SEO & Keamanan</span>
                  </button>
                </div>

                <button 
                  onClick={() => setShowArticleEditorModal(false)} 
                  className="admin-modal-close"
                  title="Tutup Modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {editorTab === 'write' ? (
              <form onSubmit={handleSaveArticleSubmit} className="admin-modal-body" style={{ gap: '16px' }}>
                
                {/* Judul & Slug */}
                <div className="admin-form-two-col">
                  <div className="admin-form-group">
                    <label className="admin-label">Judul Artikel Teknik <span style={{ color: '#FF6600' }}>*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Panduan Lengkap Audit Energi & Optimasi Chiller HVAC"
                      value={articleFormData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setArticleFormData(prev => ({
                          ...prev,
                          title: newTitle,
                          slug: !editingArticleId && (!prev.slug || prev.slug === generateSlug(prev.title)) 
                            ? generateSlug(newTitle) 
                            : prev.slug
                        }));
                      }}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Slug URL Website (SEO Friendly)</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 12px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748B', whiteSpace: 'nowrap' }}>#blog/</span>
                      <input 
                        type="text" 
                        required
                        placeholder="slug-artikel-anda"
                        value={articleFormData.slug}
                        onChange={(e) => setArticleFormData({ ...articleFormData, slug: generateSlug(e.target.value) })}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#38BDF8', width: '100%', padding: '10px 4px', fontSize: '0.82rem', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Kategori, Featured, Waktu Baca */}
                <div className="admin-form-two-col">
                  <div className="admin-form-group">
                    <label className="admin-label">Kategori Disiplin Engineering</label>
                    <select
                      value={articleFormData.isCustomCategory ? 'custom' : articleFormData.category}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setArticleFormData({ ...articleFormData, isCustomCategory: true });
                        } else {
                          setArticleFormData({ ...articleFormData, isCustomCategory: false, category: e.target.value });
                        }
                      }}
                      className="admin-select"
                    >
                      {ARTICLE_CATEGORIES.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                      <option value="custom">+ Kategori Kustom Baru...</option>
                    </select>

                    {articleFormData.isCustomCategory && (
                      <input 
                        type="text"
                        placeholder="Ketik nama kategori baru..."
                        value={articleFormData.customCategory}
                        onChange={(e) => setArticleFormData({ ...articleFormData, customCategory: e.target.value })}
                        className="admin-input"
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Status & Konfigurasi Baca</label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '12px',
                      padding: '8px 14px',
                      minHeight: '44px',
                      flexWrap: 'wrap'
                    }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#0F172A', fontWeight: 600 }}>
                        <input 
                          type="checkbox" 
                          checked={articleFormData.featured}
                          onChange={(e) => setArticleFormData({ ...articleFormData, featured: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#FF6600' }}
                        />
                        <span>Artikel Utama (Featured)</span>
                      </label>

                      <div style={{ width: '1px', height: '18px', background: '#1E293B' }} />

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} className="text-blue" />
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Waktu:</span>
                        <input 
                          type="text" 
                          placeholder="5 menit"
                          value={articleFormData.readTime}
                          onChange={(e) => setArticleFormData({ ...articleFormData, readTime: e.target.value })}
                          className="admin-input"
                          style={{ width: '85px', padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      </div>

                      <div style={{ width: '1px', height: '18px', background: '#1E293B' }} />

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={13} className="text-orange" />
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Views:</span>
                        <input 
                          type="number" 
                          value={articleFormData.views}
                          onChange={(e) => setArticleFormData({ ...articleFormData, views: Number(e.target.value) })}
                          className="admin-input"
                          style={{ width: '85px', padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ringkasan Eksekutif (Excerpt) */}
                <div className="admin-form-group">
                  <label className="admin-label">Ringkasan Eksekutif (Excerpt Singkat) <span style={{ color: '#FF6600' }}>*</span></label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Tuliskan 1-3 kalimat intisari artikel yang menarik minat insinyur dan pemilik gedung..."
                    value={articleFormData.summary}
                    onChange={(e) => setArticleFormData({ ...articleFormData, summary: e.target.value })}
                    className="admin-input"
                    style={{ resize: 'vertical', minHeight: '60px' }}
                  />
                  <p className="admin-hint">Ringkasan ini tampil di kartu artikel beranda dan callout pembuka artikel.</p>
                </div>

                {/* Gambar Sampul (Cover Image) */}
                <div className="admin-form-group">
                  <label className="admin-label">Foto Sampul Utama (Cover Image)</label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '4px 0 8px' }}>
                    <img 
                      src={articleFormData.image || "/images/office_presentation.jpg"} 
                      alt="Preview Cover" 
                      style={{ 
                        width: '110px', 
                        height: '68px', 
                        borderRadius: '10px', 
                        objectFit: 'cover', 
                        border: '2px solid #FF6600',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}
                      onError={(e) => { e.target.src = "/images/office_presentation.jpg"; }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <label 
                        className="admin-btn-primary" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          cursor: 'pointer',
                          padding: '7px 14px',
                          fontSize: '0.8rem',
                          width: 'fit-content'
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload Foto dari Komputer</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageFileUpload(e, (base64) => setArticleFormData({ ...articleFormData, image: base64 }))}
                        />
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Pilih foto berkualitas tinggi (Maks 5MB) atau klik galeri preset proyek di bawah:</span>
                    </div>
                  </div>

                  {/* Preset Covers Grid */}
                  <div className="admin-cover-preset-grid">
                    {PRESET_ARTICLE_COVERS.map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => setArticleFormData({ ...articleFormData, image: preset.url })}
                        className={`admin-cover-preset-card ${articleFormData.image === preset.url ? 'active' : ''}`}
                      >
                        <img src={preset.url} alt={preset.label} />
                        <span className="admin-cover-preset-label">{preset.label}</span>
                      </div>
                    ))}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Atau ketik URL / path gambar kustom..."
                    value={articleFormData.image}
                    onChange={(e) => setArticleFormData({ ...articleFormData, image: e.target.value })}
                    className="admin-input"
                    style={{ marginTop: '8px', fontSize: '0.78rem' }}
                  />
                </div>

                {/* Penulis, Tanggal, dan Tags */}
                <div className="admin-form-two-col">
                  <div className="admin-form-group">
                    <label className="admin-label">Penulis Artikel</label>
                    <select
                      value={articleFormData.isCustomAuthor ? 'custom' : articleFormData.authorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setArticleFormData({ ...articleFormData, isCustomAuthor: true });
                        } else {
                          const found = PRESET_AUTHORS.find(a => a.name === val);
                          if (found) {
                            setArticleFormData({
                              ...articleFormData,
                              isCustomAuthor: false,
                              authorName: found.name,
                              authorRole: found.role,
                              authorAvatar: found.avatar
                            });
                          }
                        }
                      }}
                      className="admin-select"
                    >
                      {PRESET_AUTHORS.map((auth, idx) => (
                        <option key={idx} value={auth.name}>
                          {auth.name} — {auth.role}
                        </option>
                      ))}
                      <option value="custom">+ Penulis Khusus / Baru...</option>
                    </select>

                    {articleFormData.isCustomAuthor ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        <input 
                          type="text" 
                          placeholder="Nama Lengkap Penulis"
                          value={articleFormData.authorName}
                          onChange={(e) => setArticleFormData({ ...articleFormData, authorName: e.target.value })}
                          className="admin-input"
                        />
                        <input 
                          type="text" 
                          placeholder="Jabatan / Peran (misal: Senior MEP Engineer)"
                          value={articleFormData.authorRole}
                          onChange={(e) => setArticleFormData({ ...articleFormData, authorRole: e.target.value })}
                          className="admin-input"
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <img 
                          src={articleFormData.authorAvatar || "/images/avatar_rizky.jpg"} 
                          alt={articleFormData.authorName} 
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #FF6600' }}
                        />
                        <div>
                          <div style={{ color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600 }}>{articleFormData.authorName}</div>
                          <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{articleFormData.authorRole}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Tanggal Terbit & Tags Topik</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Contoh: 14 Oktober 2026"
                        value={articleFormData.publishedAt}
                        onChange={(e) => setArticleFormData({ ...articleFormData, publishedAt: e.target.value })}
                        className="admin-input"
                      />

                      <input 
                        type="text" 
                        placeholder="Topik Tags (pisahkan dengan koma, misal: HVAC, Chiller, ASHRAE, Audit Energi)"
                        value={articleFormData.tags}
                        onChange={(e) => setArticleFormData({ ...articleFormData, tags: e.target.value })}
                        className="admin-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Editor Konten Markdown */}
                <div className="admin-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="admin-label" style={{ margin: 0 }}>
                      Konten Lengkap Artikel (Format Markdown) <span style={{ color: '#FF6600' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      Gunakan tombol toolbar di bawah untuk format cepat
                    </span>
                  </div>

                  {/* Toolbar */}
                  <div className="admin-toolbar-wrap">
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('\n\n### ', '\n', 'Subjudul Bagian Baru')}
                      className="admin-tool-btn"
                      title="Tambah Subjudul H3"
                    >
                      <strong>H3 Subjudul</strong>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('**', '**', 'teks penting')}
                      className="admin-tool-btn"
                      title="Format Teks Tebal"
                    >
                      <strong>B Tebal</strong>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('*', '*', 'teks miring')}
                      className="admin-tool-btn"
                      title="Format Teks Miring"
                    >
                      <em>I Miring</em>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('\n> **Rekomendasi Insinyur LDP:** "', '"\n', 'Kutipan panduan teknis dari konsultan...')}
                      className="admin-tool-btn"
                      title="Sisipkan Kotak Kutipan LDP"
                    >
                      <span>💬 Kutipan Rekayasa</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('\n1. **Poin Pertama**: Penjelasan detail...\n2. **Poin Kedua**: Penjelasan detail...\n3. **Poin Ketiga**: Penjelasan detail...\n')}
                      className="admin-tool-btn"
                      title="Sisipkan Daftar Bernomor"
                    >
                      <span>📋 Daftar Poin</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('\n---\n')}
                      className="admin-tool-btn"
                      title="Sisipkan Garis Pembatas"
                    >
                      <span>➖ Pembatas</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('\n| Parameter Evaluasi | Sistem Standar | Solusi Rekayasa LDP |\n| :--- | :--- | :--- |\n| **Konsumsi Daya** | 0.95 kW/TR | 0.62 kW/TR |\n| **Siklus Hidup Aset** | 10 - 15 Tahun | 20 - 25+ Tahun |\n')}
                      className="admin-tool-btn"
                      title="Sisipkan Tabel Perbandingan Standar"
                    >
                      <span>📊 Tabel Komparasi</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleInsertMarkdown('\n### Hasil Studi Kasus: Fasilitas Industri\n- **Kondisi Awal:** Tagihan listrik dan beban operasional tinggi sebelum audit.\n- **Implementasi LDP:** Balancing hidronik, optimasi VFD, dan konfigurasi setpoint.\n- **Hasil Akhir:** Penghematan daya listrik tercapai 26.5% dengan payback period 1.8 tahun.\n')}
                      className="admin-tool-btn"
                      title="Sisipkan Template Studi Kasus ROI"
                    >
                      <span>🏢 Studi Kasus ROI</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleOpenAddContentImage}
                      className="admin-tool-btn"
                      title="Sisipkan atau unggah gambar baru ke dalam konten artikel"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(255,102,0,0.2) 0%, rgba(255,102,0,0.3) 100%)', 
                        borderColor: '#FF6600', 
                        color: '#FFB088',
                        fontWeight: 700
                      }}
                    >
                      <span>🖼️ Sisipkan Gambar</span>
                    </button>
                  </div>

                  {/* Textarea */}
                  <textarea 
                    id="admin-article-content-textarea"
                    required
                    rows={12}
                    placeholder="Tulis isi artikel teknis di sini menggunakan Markdown..."
                    value={articleFormData.content}
                    onChange={(e) => setArticleFormData({ ...articleFormData, content: e.target.value })}
                    className="admin-editor-textarea"
                  />

                  <div style={{ marginTop: '8px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      💡 Tip: Anda dapat beralih ke tab <strong>Pratinjau Live</strong> di kanan atas kapan saja untuk melihat wujud tampilannya saat dibaca klien.
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setEditorTab('preview')}
                      style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Lihat Pratinjau Sekarang</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>

                  {/* Visual Content Image Editor & Gallery */}
                  <div className="admin-content-images-manager" style={{ marginTop: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(255,102,0,0.15)', padding: '5px', borderRadius: '8px', color: '#FF6600', display: 'flex' }}>
                          <ImageIcon size={16} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.84rem', color: '#0F172A', fontWeight: 700 }}>
                            Gambar Dalam Konten Artikel ({contentImages.length})
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            Kelola, edit keterangan, ganti foto, atau hapus gambar yang disisipkan di dalam artikel
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenAddContentImage}
                        className="admin-btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.76rem', gap: '6px' }}
                      >
                        <Plus size={14} />
                        <span>Tambah Gambar Konten</span>
                      </button>
                    </div>

                    {contentImages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '18px 12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', border: '1px dashed #334155' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#94A3B8' }}>
                          Belum ada gambar yang disisipkan di dalam teks artikel.
                        </p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>
                          Tambahkan skema sistem HVAC, denah MEP, grafik efisiensi, atau foto lapangan untuk memperkaya visual artikel teknis Anda.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                        {contentImages.map((imgItem, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              background: '#0B192C', 
                              border: '1px solid #1E293B', 
                              borderRadius: '10px', 
                              padding: '10px', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '8px',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div style={{ width: '70px', height: '54px', borderRadius: '6px', overflow: 'hidden', background: '#000', flexShrink: 0, border: '1px solid #334155' }}>
                                <img 
                                  src={imgItem.url} 
                                  alt={imgItem.alt || 'Gambar Konten'} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = "/images/cad_workstation.jpg"; }}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,102,0,0.18)', color: '#FF8533', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    Gambar #{idx + 1}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#E2E8F0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={imgItem.alt}>
                                  {imgItem.alt || '(Tanpa Keterangan)'}
                                </p>
                                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={imgItem.url}>
                                  {imgItem.url.startsWith('data:') ? 'Foto Upload (Base64)' : imgItem.url}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #1E293B', paddingTop: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditContentImage(imgItem)}
                                className="admin-btn-secondary"
                                style={{ flex: 1, padding: '5px 8px', fontSize: '0.72rem', justifyContent: 'center', gap: '4px' }}
                                title="Edit keterangan atau ganti URL gambar"
                              >
                                <Edit size={12} />
                                <span>Edit Detail</span>
                              </button>

                              <label
                                className="admin-btn-secondary"
                                style={{ padding: '5px 8px', fontSize: '0.72rem', cursor: 'pointer', gap: '4px', display: 'inline-flex', alignItems: 'center' }}
                                title="Ganti foto langsung dari komputer"
                              >
                                <Upload size={12} />
                                <span>Ganti</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleContentImageFileUpload(e, (base64) => handleDirectSwapContentImage(imgItem, base64))}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => handleDeleteContentImage(imgItem)}
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                title="Hapus gambar dari konten artikel"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowArticleEditorModal(false)}
                    className="admin-btn-secondary"
                  >
                    Batal
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setEditorTab('preview')}
                    className="admin-btn-secondary"
                    style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38BDF8' }}
                  >
                    <Eye size={15} />
                    <span>Cek Tampilan</span>
                  </button>

                  <button 
                    type="submit" 
                    className="admin-btn-primary"
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                  >
                    <Check size={16} />
                    <span>{editingArticleId ? 'Simpan Perubahan' : 'Terbitkan Artikel'}</span>
                  </button>
                </div>

              </form>
            ) : editorTab === 'seo' ? (
              /* TAB 3: SEO & KEAMANAN AUDIT PANEL */
              (() => {
                const seoAudit = analyzeArticleSeo(articleFormData);
                return (
                  <div className="admin-seo-audit-container">
                    {/* Skor & Status Keamanan Banner */}
                    <div className="admin-seo-score-banner">
                      <div className="admin-seo-score-left">
                        <div className={`admin-seo-score-badge ${
                          seoAudit.score >= 80 ? 'excellent' : seoAudit.score >= 60 ? 'good' : 'warning'
                        }`}>
                          <span className="admin-seo-score-num">{seoAudit.score}</span>
                          <span className="admin-seo-score-max">/ 100</span>
                        </div>
                        <div className="admin-seo-score-text">
                          <h4>
                            {seoAudit.score >= 80 ? 'Kualitas SEO Sangat Baik (Siap Terindeks)' : seoAudit.score >= 60 ? 'Kualitas SEO Cukup Baik' : 'Perlu Optimasi SEO & Konten'}
                          </h4>
                          <p>
                            {seoAudit.stats.wordCount} kata • Estimasi {seoAudit.stats.text} • {seoAudit.stats.charCount} karakter
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div className="admin-seo-security-seal">
                          <ShieldCheck size={16} />
                          <span>XSS Shield: Bebas Skrip Berbahaya</span>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            const newSlug = generateSeoSlug(articleFormData.title, articles, editingArticleId);
                            const stats = calculateReadingStats(articleFormData.content);
                            setArticleFormData(prev => ({
                              ...prev,
                              slug: newSlug,
                              readTime: stats.text
                            }));
                            setArticleToast('Slug SEO & Estimasi Waktu Baca berhasil dioptimalkan!');
                            setTimeout(() => setArticleToast(''), 3000);
                          }}
                          className="admin-btn-secondary"
                          style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38BDF8', fontSize: '0.75rem' }}
                        >
                          <Sparkles size={14} />
                          <span>Otomatisasi Slug & Waktu Baca</span>
                        </button>
                      </div>
                    </div>

                    {/* Google SERP Snippet Preview */}
                    <div className="admin-serp-preview-box">
                      <div className="admin-serp-header">
                        <div className="admin-serp-header-title">
                          <Search size={14} />
                          <span>Simulasi Cuplikan Hasil Pencarian Google (SERP Preview)</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Judul: {articleFormData.title.length}/70 kar • Deskripsi: {articleFormData.summary.length}/160 kar
                        </span>
                      </div>

                      <div className="admin-serp-card">
                        <div className="admin-serp-meta-row">
                          <div className="admin-serp-favicon">LDP</div>
                          <div className="admin-serp-site-info">
                            <span className="admin-serp-sitename">PT LENTANG Duta Perkasa</span>
                            <span className="admin-serp-url">{seoAudit.serpPreview.url}</span>
                          </div>
                        </div>
                        <h4 className="admin-serp-title">
                          {seoAudit.serpPreview.title}
                        </h4>
                        <p className="admin-serp-desc">
                          {seoAudit.serpPreview.description}
                        </p>
                      </div>
                    </div>

                    {/* Checklist SEO & Keamanan */}
                    <div className="admin-seo-checklist">
                      {seoAudit.checklist.map((item, idx) => (
                        <div key={idx} className="admin-seo-check-item">
                          <div className="admin-seo-check-header">
                            <div className="admin-seo-check-title">
                              {item.status === 'success' ? (
                                <CheckCircle2 size={16} color="#34D399" />
                              ) : item.status === 'warning' ? (
                                <AlertCircle size={16} color="#FCD34D" />
                              ) : (
                                <X size={16} color="#F87171" />
                              )}
                              <span>{item.metric}</span>
                            </div>
                            <span className={`admin-seo-check-score ${item.status}`}>
                              +{item.score} Poin
                            </span>
                          </div>
                          <p className="admin-seo-check-msg">{item.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Footer in SEO Tab */}
                    <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
                      <button 
                        type="button" 
                        onClick={() => setEditorTab('write')}
                        className="admin-btn-secondary"
                      >
                        <Edit3 size={14} />
                        <span>Kembali Tulis Konten</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setEditorTab('preview')}
                        className="admin-btn-secondary"
                        style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38BDF8' }}
                      >
                        <Eye size={15} />
                        <span>Lihat Pratinjau Tampilan</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={handleSaveArticleSubmit}
                        className="admin-btn-primary"
                        style={{ minWidth: '180px', justifyContent: 'center' }}
                      >
                        <Check size={16} />
                        <span>{editingArticleId ? 'Simpan Perubahan' : 'Terbitkan Artikel'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* TAB 2: LIVE PREVIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                    <Sparkles size={16} className="text-orange" />
                    <span>Ini adalah pratinjau nyata dari artikel saat dibuka oleh pengunjung di <strong>#blog/{articleFormData.slug || 'slug'}</strong></span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditorTab('write')}
                    className="admin-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    <Edit3 size={13} />
                    <span>Kembali Edit Konten</span>
                  </button>
                </div>

                <div className="admin-preview-box">
                  {/* Category & Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ background: '#FF6600', color: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      {articleFormData.isCustomCategory && articleFormData.customCategory ? articleFormData.customCategory : articleFormData.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>• {articleFormData.publishedAt}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>• {articleFormData.readTime || '5 menit'} membaca</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>• {articleFormData.views || 0} pembaca</span>
                  </div>

                  {/* Title */}
                  <h1>{articleFormData.title || "Judul Artikel Belum Diisi"}</h1>

                  {/* Author Card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F1F5F9', borderRadius: '10px', margin: '14px 0', border: '1px solid #E2E8F0' }}>
                    <img 
                      src={articleFormData.authorAvatar || "/images/avatar_rizky.jpg"} 
                      alt={articleFormData.authorName} 
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6600' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>{articleFormData.authorName}</div>
                      <div style={{ color: '#FF6600', fontSize: '0.76rem', fontWeight: 700 }}>{articleFormData.authorRole}</div>
                      <div style={{ color: '#64748B', fontSize: '0.7rem' }}>PT LENTANG Duta Perkasa — Konsultan MEP & HVAC</div>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div style={{ width: '100%', height: '260px', borderRadius: '12px', overflow: 'hidden', margin: '16px 0', border: '1px solid #E2E8F0' }}>
                    <img 
                      src={articleFormData.image || "/images/office_presentation.jpg"} 
                      alt={articleFormData.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = "/images/office_presentation.jpg"; }}
                    />
                  </div>

                  {/* Executive Summary */}
                  <div style={{ background: '#EFF6FF', borderLeft: '4px solid #007ACC', padding: '12px 16px', borderRadius: '0 8px 8px 0', margin: '16px 0', fontSize: '0.86rem', color: '#1E3A8A' }}>
                    <strong>Ringkasan Eksekutif:</strong>
                    <p style={{ margin: '4px 0 0', color: '#1E40AF' }}>{articleFormData.summary || "Ringkasan artikel belum diisi."}</p>
                  </div>

                  {/* Rendered Body Content */}
                  <div>
                    {renderPreviewMarkdown(articleFormData.content)}
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Topik Terkait:</span>
                    {articleFormData.tags.split(',').map((tag, tIdx) => {
                      const trimmedTag = tag.trim();
                      if (!trimmedTag) return null;
                      return (
                        <span key={tIdx} style={{ background: '#F1F5F9', color: '#334155', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #E2E8F0' }}>
                          #{trimmedTag}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Footer in Preview Tab */}
                <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => setEditorTab('write')}
                    className="admin-btn-secondary"
                  >
                    <Edit3 size={14} />
                    <span>Kembali Edit</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={handleSaveArticleSubmit}
                    className="admin-btn-primary"
                    style={{ minWidth: '180px', justifyContent: 'center' }}
                  >
                    <Check size={16} />
                    <span>{editingArticleId ? 'Simpan Perubahan' : 'Terbitkan Artikel'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL SISIPKAN / EDIT GAMBAR KONTEN ARTIKEL */}
      {contentImageModalOpen && (
        <div className="admin-modal-overlay" style={{ zIndex: 10005 }}>
          <div className="admin-modal-card" style={{ maxWidth: '560px' }}>
            <div className="admin-modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(255,102,0,0.15)', padding: '6px', borderRadius: '10px', color: '#FF6600' }}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    {contentImageForm.isEditingExisting ? 'Edit Gambar Konten' : 'Sisipkan Gambar ke Konten'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8' }}>
                    Unggah diagram, skema denah, foto instalasi, atau gunakan URL eksternal
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setContentImageModalOpen(false)} 
                className="admin-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContentImageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Preview Gambar */}
              {contentImageForm.url ? (
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #FF6600', background: '#000' }}>
                  <img 
                    src={contentImageForm.url} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.src = "/images/office_presentation.jpg"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setContentImageForm(prev => ({ ...prev, url: '' }))}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FFF', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Ganti Foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ border: '2px dashed #334155', borderRadius: '12px', padding: '24px 16px', textAlign: 'center', background: 'rgba(15,23,42,0.4)' }}>
                  <ImageIcon size={32} style={{ color: '#64748B', margin: '0 auto 8px' }} />
                  <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#94A3B8' }}>
                    Pilih file gambar beresolusi tinggi dari komputer Anda
                  </p>
                  <label 
                    className="admin-btn-primary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    <Upload size={14} />
                    <span>Upload Foto / Skema Teknis</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => handleContentImageFileUpload(e, (base64) => setContentImageForm(prev => ({ ...prev, url: base64 })))}
                    />
                  </label>
                  <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#64748B' }}>
                    Mendukung JPG, PNG, WEBP, SVG (Otomatis dioptimasi hingga 1200px)
                  </p>
                </div>
              )}

              {/* Input URL Alternatif */}
              <div className="admin-form-group">
                <label className="admin-label">Atau Ketik / Tempel URL Gambar</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="https://... atau /images/nama_foto.jpg"
                    value={contentImageForm.url}
                    onChange={(e) => setContentImageForm(prev => ({ ...prev, url: e.target.value }))}
                    className="admin-input"
                    style={{ fontSize: '0.78rem' }}
                  />
                  <label 
                    className="admin-btn-secondary" 
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 12px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                  >
                    <Upload size={13} />
                    <span>Upload</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => handleContentImageFileUpload(e, (base64) => setContentImageForm(prev => ({ ...prev, url: base64 })))}
                    />
                  </label>
                </div>
              </div>

              {/* Preset Gambar Teknis Cepat */}
              <div className="admin-form-group">
                <label className="admin-label" style={{ fontSize: '0.74rem' }}>Preset Gambar Proyek Cepat</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {PRESET_ARTICLE_COVERS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setContentImageForm(prev => ({ 
                        ...prev, 
                        url: preset.url,
                        caption: prev.caption || preset.label
                      }))}
                      style={{
                        background: '#040E1C',
                        border: contentImageForm.url === preset.url ? '2px solid #FF6600' : '1px solid #1E293B',
                        borderRadius: '8px',
                        padding: '4px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        textAlign: 'left',
                        width: '100px'
                      }}
                    >
                      <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      <span style={{ fontSize: '0.65rem', color: '#94A3B8', display: 'block', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan / Caption Gambar */}
              <div className="admin-form-group">
                <label className="admin-label">
                  Keterangan Gambar / Caption (Alt Text) <span style={{ color: '#FF6600' }}>*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Diagram Alir Sistem Tata Udara & Chiller Plant Sentral"
                  value={contentImageForm.caption}
                  onChange={(e) => setContentImageForm(prev => ({ ...prev, caption: e.target.value }))}
                  className="admin-input"
                />
                <p className="admin-hint" style={{ fontSize: '0.7rem' }}>
                  Keterangan ini akan tampil di bawah gambar artikel serta membantu indeks Google Image SEO.
                </p>
              </div>

              {/* Footer */}
              <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '14px', marginTop: '4px' }}>
                <button 
                  type="button" 
                  onClick={() => setContentImageModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary"
                  style={{ minWidth: '150px', justifyContent: 'center' }}
                >
                  <Check size={15} />
                  <span>{contentImageForm.isEditingExisting ? 'Simpan Perubahan' : 'Sisipkan ke Konten'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ARTICLE PREVIEW MODAL (FULL VIEWER) */}
      {previewingArticle && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card admin-modal-xl">
            {/* Header */}
            <div className="admin-modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid #1E293B' }}>
              <div>
                <span className="admin-status-tag orange" style={{ marginBottom: '6px' }}>{previewingArticle.category}</span>
                <h3 className="admin-modal-title">{previewingArticle.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  Ditulis oleh {previewingArticle.author?.name} • Terbit {previewingArticle.publishedAt} • {previewingArticle.views || 0} views
                </p>
              </div>

              <button onClick={() => setPreviewingArticle(null)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="admin-preview-box">
              <div style={{ width: '100%', height: '240px', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <img 
                  src={previewingArticle.image || "/images/office_presentation.jpg"} 
                  alt={previewingArticle.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = "/images/office_presentation.jpg"; }}
                />
              </div>

              <div style={{ background: '#EFF6FF', borderLeft: '4px solid #007ACC', padding: '12px 16px', borderRadius: '0 8px 8px 0', margin: '14px 0', fontSize: '0.86rem', color: '#1E3A8A' }}>
                <strong>Ringkasan Eksekutif:</strong>
                <p style={{ margin: '4px 0 0', color: '#1E40AF' }}>{previewingArticle.summary}</p>
              </div>

              <div>
                {renderPreviewMarkdown(previewingArticle.content)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Topik:</span>
                {(previewingArticle.tags || []).map((t, idx) => (
                  <span key={idx} style={{ background: '#F1F5F9', color: '#334155', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #E2E8F0' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
              <button onClick={() => setPreviewingArticle(null)} className="admin-btn-secondary">
                Tutup
              </button>
              <button 
                onClick={() => {
                  const toEdit = previewingArticle;
                  setPreviewingArticle(null);
                  handleOpenEditArticle(toEdit);
                }} 
                className="admin-btn-secondary"
                style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38BDF8' }}
              >
                <Edit3 size={15} />
                <span>Edit Artikel Ini</span>
              </button>
              <a 
                href={`#blog/${previewingArticle.slug}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="admin-btn-primary"
              >
                <ExternalLink size={15} />
                <span>Buka di Halaman Blog</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SITE & LEGALITY SETTINGS MODAL */}
      {showEditSettingsModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit Dokumen Legalitas & Kontak Perusahaan</h3>
              <button onClick={() => setShowEditSettingsModal(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSettingsSubmit}>
              <div className="admin-form-two-col">
                <div className="admin-form-group">
                  <label className="admin-label">Nomor NIB <span style={{ color: '#FF6600' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: 0129116242975"
                    value={settingsFormData.nib || ''}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, nib: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Lembaga Terdaftar / Penerbit <span style={{ color: '#FF6600' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: OSS Kementerian Investasi RI"
                    value={settingsFormData.institution || ''}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, institution: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-two-col">
                <div className="admin-form-group">
                  <label className="admin-label">Kualifikasi Usaha <span style={{ color: '#FF6600' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Konsultan Teknik MEP & HVAC"
                    value={settingsFormData.qualification || ''}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, qualification: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Sertifikasi SNI / Standar Acuan</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: SNI 03-6572-2001 (HVAC)"
                    value={settingsFormData.sni_cert || ''}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, sni_cert: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-two-col">
                <div className="admin-form-group">
                  <label className="admin-label">Supervisi Tenaga Ahli</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Sertifikat SKA Utama MEP"
                    value={settingsFormData.expert_supervision || ''}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, expert_supervision: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Kontak Hotline Legal / Kantor</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: +62 838-7407-8144"
                    value={settingsFormData.hotline || ''}
                    onChange={(e) => setSettingsFormData({ ...settingsFormData, hotline: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Email Korespondensi Resmi</label>
                <input 
                  type="email" 
                  placeholder="Contoh: consultant@ldpgroup.co.id"
                  value={settingsFormData.email || ''}
                  onChange={(e) => setSettingsFormData({ ...settingsFormData, email: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Alamat Domisili Kantor Operasional</label>
                <textarea 
                  rows={2}
                  placeholder="Alamat kantor konsultan..."
                  value={settingsFormData.address || ''}
                  onChange={(e) => setSettingsFormData({ ...settingsFormData, address: e.target.value })}
                  className="admin-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="admin-modal-footer" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowEditSettingsModal(false)}
                  className="admin-btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary"
                  style={{ minWidth: '160px', justifyContent: 'center' }}
                >
                  <Check size={16} />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MEMBER MODAL (ADD / EDIT) */}
      {showTeamModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingTeamMemberId ? 'Edit Profil Direksi / Pakar Rekayasa' : 'Tambah Direksi / Pakar Rekayasa Baru'}
              </h3>
              <button onClick={() => setShowTeamModal(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMemberSubmit}>
              <div className="admin-form-two-col">
                <div className="admin-form-group">
                  <label className="admin-label">Nama Lengkap & Gelar Akademik <span style={{ color: '#FF6600' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Eka Supriatna, S.T."
                    value={teamFormData.name}
                    onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Inisial Avatar (2-3 Huruf)</label>
                  <input 
                    type="text" 
                    maxLength={3}
                    placeholder="Contoh: ES (Otomatis jika kosong)"
                    value={teamFormData.initials}
                    onChange={(e) => setTeamFormData({ ...teamFormData, initials: e.target.value.toUpperCase() })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-two-col">
                <div className="admin-form-group">
                  <label className="admin-label">Badge Label Kategori <span style={{ color: '#FF6600' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: TECHNICAL DIRECTOR / OPERATIONAL LEAD"
                    value={teamFormData.badge}
                    onChange={(e) => setTeamFormData({ ...teamFormData, badge: e.target.value.toUpperCase() })}
                    className="admin-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Jabatan Struktural / Peran <span style={{ color: '#FF6600' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Engineering Director"
                    value={teamFormData.role}
                    onChange={(e) => setTeamFormData({ ...teamFormData, role: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              {/* Foto Profil Opsional / Avatar Preview */}
              <div className="admin-form-group">
                <label className="admin-label">Foto Profil (Opsional - Jika kosong akan menggunakan inisial)</label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '6px 0 10px' }}>
                  <div className="admin-team-avatar-wrap" style={{ margin: 0, width: '64px', height: '64px', flexShrink: 0 }}>
                    {teamFormData.image ? (
                      <img 
                        src={teamFormData.image} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="admin-team-initials" style={{ fontSize: '1.2rem' }}>
                        {teamFormData.initials || teamFormData.name?.slice(0, 2).toUpperCase() || 'ES'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <label 
                        className="admin-btn-primary" 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          cursor: 'pointer',
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          width: 'fit-content'
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload Foto dari Komputer</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageFileUpload(e, (base64) => setTeamFormData({ ...teamFormData, image: base64 }))}
                        />
                      </label>

                      {teamFormData.image && (
                        <button
                          type="button"
                          onClick={() => setTeamFormData({ ...teamFormData, image: '' })}
                          className="admin-act-btn del"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.78rem', 
                            width: 'auto', 
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Hapus foto ini (gunakan inisial)"
                        >
                          <Trash2 size={13} />
                          <span>Hapus Foto</span>
                        </button>
                      )}

                      {String(editingTeamMemberId) === '1' && teamFormData.image !== '/images/tito_riyanto.jpg' && (
                        <button
                          type="button"
                          onClick={() => setTeamFormData({ ...teamFormData, image: '/images/tito_riyanto.jpg' })}
                          className="admin-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Kembalikan ke foto asli Tito Riyanto"
                        >
                          <RotateCcw size={13} />
                          <span>Foto Asli Tito</span>
                        </button>
                      )}

                      {String(editingTeamMemberId) === '2' && teamFormData.image !== '/images/abdul_wahid.jpg' && (
                        <button
                          type="button"
                          onClick={() => setTeamFormData({ ...teamFormData, image: '/images/abdul_wahid.jpg' })}
                          className="admin-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Kembalikan ke foto asli Abdul Wahid (jas hitam)"
                        >
                          <RotateCcw size={13} />
                          <span>Foto Asli Abdul Wahid</span>
                        </button>
                      )}

                      {String(editingTeamMemberId) === '3' && teamFormData.image !== '/images/ade_maulana.jpg' && (
                        <button
                          type="button"
                          onClick={() => setTeamFormData({ ...teamFormData, image: '/images/ade_maulana.jpg' })}
                          className="admin-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Kembalikan ke foto asli Ade Maulana"
                        >
                          <RotateCcw size={13} />
                          <span>Foto Asli Ade</span>
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Atau ketik path / URL gambar di bawah:</span>
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="URL atau path gambar kustom..."
                  value={teamFormData.image}
                  onChange={(e) => setTeamFormData({ ...teamFormData, image: e.target.value })}
                  className="admin-input"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* Bio Deskripsi */}
              <div className="admin-form-group">
                <label className="admin-label">Biografi, Pengalaman & Sertifikasi LPJK/SKA <span style={{ color: '#FF6600' }}>*</span></label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Deskripsikan pengalaman teknik, sertifikasi keahlian, dan rekam jejak proyek..."
                  value={teamFormData.bio}
                  onChange={(e) => setTeamFormData({ ...teamFormData, bio: e.target.value })}
                  className="admin-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowTeamModal(false)}
                  className="admin-btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary"
                  style={{ minWidth: '160px', justifyContent: 'center' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{editingTeamMemberId ? 'Selesai & Simpan Perubahan' : 'Selesai & Tambahkan Direksi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT USER MODAL (RBAC) */}
      {userModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setUserModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="admin-stat-icon-wrap blue" style={{ width: '36px', height: '36px' }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="admin-modal-title">
                    {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Pengguna & Penulis Baru'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8' }}>
                    {editingUserId ? 'Perbarui informasi profil dan hak akses akun ini' : 'Buat kredensial login baru untuk tim administrator atau penulis artikel'}
                  </p>
                </div>
              </div>
              <button onClick={() => setUserModalOpen(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="admin-modal-body space-y">
              {/* Nama Lengkap */}
              <div className="admin-form-group">
                <label className="admin-label">Nama Lengkap & Gelar <span style={{ color: '#FF6600' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Budi Santoso, S.T. / Sarah Pratami"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="admin-input"
                />
              </div>

              {/* Email & Username Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                <div className="admin-form-group">
                  <label className="admin-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} style={{ color: '#FF6600' }} />
                      <span>Alamat Email (Login) <span style={{ color: '#FF6600' }}>*</span></span>
                    </span>
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="Contoh: penulis@ldpconsultant.co.id"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value.toLowerCase().trim() })}
                    className="admin-input"
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px' }}>
                    Email utama untuk login portal
                  </span>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Username Login (Opsional)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: budi_penulis"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="admin-input"
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px' }}>
                    ID singkat (huruf kecil/angka)
                  </span>
                </div>
              </div>

              {/* Jabatan / Spesialisasi */}
              <div className="admin-form-group">
                <label className="admin-label">Jabatan / Spesialisasi Teknik</label>
                <input 
                  type="text" 
                  placeholder="Contoh: HVAC Specialist / Consultant Engineer / Writer"
                  value={userFormData.titlePosition}
                  onChange={(e) => setUserFormData({ ...userFormData, titlePosition: e.target.value })}
                  className="admin-input"
                />
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px' }}>
                  Ditampilkan di profil header & kartu penulis artikel
                </span>
              </div>

              {/* Hak Akses / Role Selector */}
              <div className="admin-form-group">
                <label className="admin-label">Pilih Peran & Hak Akses (Role) <span style={{ color: '#FF6600' }}>*</span></label>
                <div className="admin-role-selector-grid">
                  <div 
                    onClick={() => setUserFormData({ ...userFormData, role: 'author' })}
                    className={`admin-role-selector-card ${userFormData.role === 'author' ? 'active' : ''}`}
                  >
                    <div className="admin-role-card-header">
                      <span className="admin-role-card-title">
                        ✍️ Penulis Artikel
                      </span>
                      {userFormData.role === 'author' && <Check size={16} style={{ color: '#FF6600' }} />}
                    </div>
                    <p className="admin-role-card-desc">
                      <strong>Khusus Kelola Artikel & Blog.</strong> Menu sensitif (Leads klien, WhatsApp, legalitas, database) disembunyikan demi privasi.
                    </p>
                  </div>

                  <div 
                    onClick={() => setUserFormData({ ...userFormData, role: 'super_admin' })}
                    className={`admin-role-selector-card ${userFormData.role === 'super_admin' ? 'active blue' : ''}`}
                  >
                    <div className="admin-role-card-header">
                      <span className="admin-role-card-title">
                        🛡️ Super Admin
                      </span>
                      {userFormData.role === 'super_admin' && <Check size={16} style={{ color: '#3B82F6' }} />}
                    </div>
                    <p className="admin-role-card-desc">
                      <strong>Akses Penuh.</strong> Bisa membuka seluruh 10 menu portal, leads, legalitas, database, dan kelola akun pengguna lain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="admin-form-group">
                <label className="admin-label">
                  {editingUserId ? 'Ganti Password (Opsional)' : 'Password Akun Baru'} {!editingUserId && <span style={{ color: '#FF6600' }}>*</span>}
                </label>
                <div className="admin-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required={!editingUserId}
                    minLength={6}
                    placeholder={editingUserId ? "Biarkan kosong jika password tidak ingin diubah..." : "Minimal 6 karakter..."}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="admin-input"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="admin-eye-btn"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px' }}>
                  Kata sandi otomatis dienkripsi dengan standar salted SHA-256
                </span>
              </div>

              {/* FOTO PROFIL (BISA UPLOAD / GANTI / EDIT FOTO) */}
              <div className="admin-form-group">
                <label className="admin-label">Foto Profil Pengguna</label>
                
                <div className="admin-photo-upload-box">
                  <div className="admin-avatar-preview-wrap">
                    <img 
                      src={userFormData.avatar || "/images/avatar_ade.jpg"} 
                      alt="Preview Foto" 
                      onError={(e) => { e.target.src = "/images/avatar_ade.jpg"; }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label 
                        htmlFor="user-photo-upload-input"
                        className="admin-btn-secondary"
                        style={{ cursor: 'pointer', padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Camera size={15} style={{ color: '#FF6600' }} />
                        <span>Unggah Foto dari Perangkat</span>
                      </label>
                      <input 
                        id="user-photo-upload-input"
                        type="file" 
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleUserPhotoUpload}
                      />

                      {userFormData.avatar && (
                        <button
                          type="button"
                          onClick={() => setUserFormData(prev => ({ ...prev, avatar: '/images/avatar_ade.jpg' }))}
                          className="admin-btn-secondary"
                          style={{ padding: '7px 12px', fontSize: '0.78rem', color: '#94A3B8' }}
                          title="Kembalikan ke avatar default"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '6px' }}>
                      Pilih foto dari komputer/HP (JPG, PNG, WEBP). Foto otomatis dikompres agar tajam & hemat memori.
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', margin: '10px 0 6px' }}>
                  Atau pilih dari avatar preset:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setUserFormData({ ...userFormData, avatar: av.url })}
                      className={`admin-avatar-preset-btn ${userFormData.avatar === av.url ? 'active' : ''}`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} onError={(e) => { e.target.src = "/images/avatar_ade.jpg"; }} />
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Atau ketik URL foto langsung:
                </div>
                <input 
                  type="text" 
                  placeholder="https://... atau /images/..."
                  value={userFormData.avatar}
                  onChange={(e) => setUserFormData({ ...userFormData, avatar: e.target.value })}
                  className="admin-input"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* Status Aktif */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0F172A' }}>Izinkan Akun Ini Login</div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Jika dinonaktifkan, akun tidak dapat masuk ke portal admin</div>
                </div>
                <input 
                  type="checkbox" 
                  id="user-is-active-toggle"
                  checked={userFormData.isActive}
                  onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#FF6600', cursor: 'pointer' }}
                />
              </div>

              <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setUserModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary"
                  style={{ minWidth: '160px', justifyContent: 'center' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{editingUserId ? 'Simpan Perubahan' : 'Buat Pengguna Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MY PROFILE MODAL (EDIT FOTO & PROFIL SAYA) */}
      {myProfileModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setMyProfileModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="admin-stat-icon-wrap orange" style={{ width: '36px', height: '36px' }}>
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Edit Foto & Profil Saya</h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8' }}>
                    Perbarui foto profil dan data akun login Anda
                  </p>
                </div>
              </div>
              <button onClick={() => setMyProfileModalOpen(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            {myProfileToast && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22C55E',
                color: '#86EFAC',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                margin: '14px 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Check size={16} />
                <span>{myProfileToast}</span>
              </div>
            )}

            <form onSubmit={handleSaveMyProfileSubmit} className="admin-modal-body space-y">
              {/* UPLOAD FOTO PROFIL SECTION */}
              <div className="admin-form-group">
                <label className="admin-label">Foto Profil Anda</label>
                
                <div className="admin-photo-upload-box">
                  <div className="admin-avatar-preview-wrap" style={{ width: '74px', height: '74px' }}>
                    <img 
                      src={myProfileData.avatar || "/images/avatar_ade.jpg"} 
                      alt="Foto Saya" 
                      onError={(e) => { e.target.src = "/images/avatar_ade.jpg"; }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label 
                        htmlFor="my-profile-photo-input"
                        className="admin-btn-secondary"
                        style={{ cursor: 'pointer', padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Camera size={15} style={{ color: '#FF6600' }} />
                        <span>Ganti / Unggah Foto</span>
                      </label>
                      <input 
                        id="my-profile-photo-input"
                        type="file" 
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleMyProfilePhotoUpload}
                      />

                      {myProfileData.avatar && (
                        <button
                          type="button"
                          onClick={() => setMyProfileData(prev => ({ ...prev, avatar: '/images/avatar_ade.jpg' }))}
                          className="admin-btn-secondary"
                          style={{ padding: '7px 12px', fontSize: '0.78rem', color: '#94A3B8' }}
                          title="Reset ke foto default"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '6px' }}>
                      Unggah foto asli Anda dari komputer atau galeri ponsel.
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', margin: '10px 0 6px' }}>
                  Atau pilih avatar cepat:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setMyProfileData(prev => ({ ...prev, avatar: av.url }))}
                      className={`admin-avatar-preset-btn ${myProfileData.avatar === av.url ? 'active' : ''}`}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} onError={(e) => { e.target.src = "/images/avatar_ade.jpg"; }} />
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Atau masukkan URL foto:
                </div>
                <input 
                  type="text" 
                  placeholder="https://... atau /images/..."
                  value={myProfileData.avatar}
                  onChange={(e) => setMyProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                  className="admin-input"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* Nama Lengkap */}
              <div className="admin-form-group">
                <label className="admin-label">Nama Lengkap & Gelar <span style={{ color: '#FF6600' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={myProfileData.fullName}
                  onChange={(e) => setMyProfileData({ ...myProfileData, fullName: e.target.value })}
                  className="admin-input"
                />
              </div>

              {/* Alamat Email (Login) */}
              <div className="admin-form-group">
                <label className="admin-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} style={{ color: '#FF6600' }} />
                    <span>Alamat Email (Login) <span style={{ color: '#FF6600' }}>*</span></span>
                  </span>
                </label>
                <input 
                  type="email" 
                  required
                  value={myProfileData.email}
                  onChange={(e) => setMyProfileData({ ...myProfileData, email: e.target.value.toLowerCase().trim() })}
                  className="admin-input"
                />
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px' }}>
                  Digunakan untuk masuk ke akun Anda
                </span>
              </div>

              {/* Jabatan / Spesialisasi */}
              <div className="admin-form-group">
                <label className="admin-label">Jabatan / Spesialisasi Teknik</label>
                <input 
                  type="text" 
                  value={myProfileData.titlePosition}
                  onChange={(e) => setMyProfileData({ ...myProfileData, titlePosition: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setMyProfileModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary"
                  style={{ minWidth: '160px', justifyContent: 'center' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Simpan Profil & Foto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {pwdResetModalOpen && resetPwdTargetUser && (
        <div className="admin-modal-overlay" onClick={() => setPwdResetModalOpen(false)}>
          <div className="admin-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="admin-stat-icon-wrap orange" style={{ width: '36px', height: '36px' }}>
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="admin-modal-title">Ganti Password Pengguna</h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8' }}>
                    Ubah kata sandi untuk akun @{resetPwdTargetUser.username}
                  </p>
                </div>
              </div>
              <button onClick={() => setPwdResetModalOpen(false)} className="admin-modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveResetUserPasswordSubmit} className="admin-modal-body space-y">
              <div style={{
                padding: '12px 14px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                fontSize: '0.8rem',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ width: '38px', height: '38px', minWidth: '38px', minHeight: '38px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #CBD5E1', background: '#F1F5F9' }}>
                  <img 
                    src={resetPwdTargetUser.avatar || "/images/avatar_ade.jpg"} 
                    alt={resetPwdTargetUser.fullName}
                    style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = "/images/avatar_ade.jpg"; }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{resetPwdTargetUser.fullName}</div>
                  <div style={{ fontSize: '0.72rem', color: '#38BDF8' }}>@{resetPwdTargetUser.username} • {resetPwdTargetUser.role === 'author' ? 'Penulis' : 'Super Admin'}</div>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Password Baru <span style={{ color: '#FF6600' }}>*</span></label>
                <div className="admin-input-wrapper">
                  <input 
                    type={showResetNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Masukkan password baru (min. 6 karakter)..."
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="admin-input"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                    className="admin-eye-btn"
                  >
                    {showResetNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="admin-modal-footer" style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setPwdResetModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary"
                >
                  <KeyRound size={16} />
                  <span>Simpan Password Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
