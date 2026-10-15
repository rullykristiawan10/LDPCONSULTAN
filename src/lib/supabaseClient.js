import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite environment or localStorage override (configured via Admin Dashboard)
const getCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('ldp_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('ldp_supabase_anon_key') || '' : '';

  const url = (localUrl || envUrl).trim();
  const key = (localKey || envKey).trim();

  return { url, key, isConfigured: Boolean(url && key && url.startsWith('http')) };
};

let cachedClient = null;
let lastUrl = '';
let lastKey = '';

export const getSupabaseClient = () => {
  const { url, key, isConfigured } = getCredentials();
  
  if (!isConfigured) return null;

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

export const isSupabaseConfigured = () => {
  return getCredentials().isConfigured;
};

export const getSupabaseConfig = () => {
  return getCredentials();
};

export const saveSupabaseConfig = (url, key) => {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('ldp_supabase_url', url.trim());
    else localStorage.removeItem('ldp_supabase_url');

    if (key) localStorage.setItem('ldp_supabase_anon_key', key.trim());
    else localStorage.removeItem('ldp_supabase_anon_key');

    // Invalidate cached client
    cachedClient = null;
    lastUrl = '';
    lastKey = '';
  }
};

/**
 * Test connectivity to Supabase
 */
export const testSupabaseConnection = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL atau Anon Key Supabase belum diisi.' };
  }

  try {
    const { data, error } = await client.from('articles').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        return { 
          success: true, 
          needsMigration: true, 
          message: 'Terhubung ke Supabase! Tabel belum dibuat. Silakan jalankan script SQL schema di menu SQL Editor.' 
        };
      }
      return { success: false, error, message: `Error Supabase: ${error.message} (${error.code || ''})` };
    }

    return { 
      success: true, 
      needsMigration: false, 
      message: 'Koneksi ke Supabase berhasil dan database siap digunakan!' 
    };
  } catch (err) {
    return { success: false, error: err, message: `Gagal menghubungi Supabase: ${err.message}` };
  }
};

/* =========================================================================
   ARTICLE SERVICES
   ========================================================================= */

export const fetchArticlesFromSupabase = async () => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    if (!data) return null;

    return data.map(item => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      category: item.category,
      summary: item.summary,
      featured: item.featured || false,
      image: item.image || '/images/office_presentation.jpg',
      author: typeof item.author === 'string' ? JSON.parse(item.author) : (item.author || {
        name: 'Tim Ahli LDP',
        role: 'Consultant Engineer',
        avatar: '/images/avatar_ade.jpg'
      }),
      publishedAt: item.published_at || item.publishedAt || new Date().toLocaleDateString('id-ID'),
      readTime: item.read_time || item.readTime || '5 menit',
      views: item.views || 0,
      tags: Array.isArray(item.tags) ? item.tags : (item.tags ? JSON.parse(item.tags) : []),
      content: item.content || ''
    }));
  } catch (err) {
    console.warn('Fallback to local articles (Supabase fetch error):', err.message);
    return null;
  }
};

export const syncArticleToSupabase = async (article) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase belum terkonfigurasi' };

  try {
    const payload = {
      title: article.title,
      slug: article.slug,
      category: article.category,
      summary: article.summary,
      featured: Boolean(article.featured),
      image: article.image,
      author: article.author,
      published_at: article.publishedAt,
      read_time: article.readTime,
      views: article.views || 0,
      tags: article.tags,
      content: article.content,
      updated_at: new Date().toISOString()
    };

    if (article.id && typeof article.id === 'number' && article.id < 100000) {
      const { data: existing } = await client.from('articles').select('id').eq('id', article.id).maybeSingle();
      if (existing) {
        const { error } = await client.from('articles').update(payload).eq('id', article.id);
        if (error) throw error;
        return { success: true, action: 'updated' };
      }
    }

    const { data, error } = await client.from('articles').insert([payload]).select().single();
    if (error) throw error;
    return { success: true, action: 'inserted', data };
  } catch (err) {
    console.error('Supabase save error:', err);
    return { success: false, error: err.message };
  }
};

export const deleteArticleFromSupabase = async (articleId) => {
  const client = getSupabaseClient();
  if (!client) return { success: false };

  try {
    const { error } = await client.from('articles').delete().eq('id', articleId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Supabase delete error:', err);
    return { success: false, error: err.message };
  }
};

/* =========================================================================
   CONSULTATION LEADS (INQUIRIES)
   ========================================================================= */

export const submitConsultationLead = async (leadData) => {
  const client = getSupabaseClient();
  if (!client) {
    try {
      const existing = JSON.parse(localStorage.getItem('ldp_consultation_leads') || '[]');
      existing.unshift({
        ...leadData,
        id: Date.now(),
        created_at: new Date().toISOString(),
        status: 'new'
      });
      localStorage.setItem('ldp_consultation_leads', JSON.stringify(existing));
    } catch (e) {
      console.error(e);
    }
    return { success: true, mode: 'local' };
  }

  try {
    const { data, error } = await client.from('consultations').insert([{
      name: leadData.name,
      company: leadData.company,
      email: leadData.email,
      phone: leadData.phone,
      service_type: leadData.service || leadData.service_type || 'General MEP & HVAC',
      message: leadData.message,
      created_at: new Date().toISOString(),
      status: 'new'
    }]).select();

    if (error) {
      const existing = JSON.parse(localStorage.getItem('ldp_consultation_leads') || '[]');
      existing.unshift({ ...leadData, id: Date.now(), created_at: new Date().toISOString() });
      localStorage.setItem('ldp_consultation_leads', JSON.stringify(existing));
      return { success: true, mode: 'local-fallback' };
    }

    return { success: true, mode: 'supabase', data };
  } catch (err) {
    console.error('Consultation lead submission error:', err);
    return { success: true, mode: 'fallback' };
  }
};
