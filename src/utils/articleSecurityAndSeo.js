/**
 * PT LENTANG DUTA PERKASA - Article Security & SEO Engine
 * Module for content sanitization, XSS prevention, SEO metadata injection,
 * Schema.org JSON-LD structured data, and SEO health auditing.
 */

// Default site metadata for restoring on page unmount
export const DEFAULT_SITE_METADATA = {
  title: "LDP Technical Consultant - PT LENTANG Duta Perkasa",
  description: "LDP Technical Consultant (PT LENTANG Duta Perkasa) adalah konsultan teknik profesional terpercaya untuk perencanaan, audit, dan supervisi sistem MEP & HVAC Engineering di Indonesia.",
  keywords: "LDP Technical Consultant, PT LENTANG Duta Perkasa, MEP Engineering, HVAC System, MW Group, Konsultan Teknik, Audit HVAC, Feasibility Study, BoQ",
  siteUrl: "https://ldpconsultant.co.id",
  logoUrl: "/images/logo.svg"
};

/* =========================================================================
   1. SECURITY & XSS SANITIZATION
   ========================================================================= */

/**
 * Validates if a URL is safe from dangerous protocols (javascript:, vbscript:, etc.)
 */
export const isSafeUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript:|vbscript:|data:text\/html|data:application\/)/i;
  if (dangerousProtocols.test(trimmed)) return false;

  // Allow relative paths, http/https, and safe image data URIs
  const safePatterns = /^(\/|#|\.\/|\.\.\/|https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,)/i;
  return safePatterns.test(trimmed);
};

/**
 * Sanitizes plain text input (e.g., titles, authors, categories)
 */
export const sanitizePlainText = (input, maxLength = 250) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // Remove <script> tags
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')   // Remove <style> tags
    .replace(/<[^>]+>/g, '')                             // Strip all HTML tags
    .replace(/javascript:/gi, '')                        // Strip inline javascript protocol
    .replace(/on\w+\s*=/gi, '')                          // Strip inline event handlers
    .trim()
    .slice(0, maxLength);
};

/**
 * Sanitizes markdown content, removing dangerous script/iframe tags while preserving formatting
 */
export const sanitizeMarkdownContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  
  return content
    // Remove script tags and contents
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Remove dangerous style or link tags
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    // Remove dangerous object/embed/applet tags
    .replace(/<(object|embed|applet|meta|base|form|input|button)[\s\S]*?>/gi, '')
    // Remove inline event handlers (e.g. onerror=, onload=)
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: in markdown links [text](javascript:...)
    .replace(/\[([^\]]+)\]\((?:javascript|vbscript):[^\)]*\)/gi, '[$1](#)')
    // Prevent data:text/html in links
    .replace(/\[([^\]]+)\]\(data:text\/html[^\)]*\)/gi, '[$1](#)');
};

/**
 * Validates and sanitizes entire article payload before saving
 */
export const validateAndSanitizeArticle = (payload, existingArticles = []) => {
  const errors = [];

  // Title validation
  const rawTitle = payload.title || '';
  const sanitizedTitle = sanitizePlainText(rawTitle, 200);
  if (!sanitizedTitle) {
    errors.push('Judul artikel wajib diisi.');
  }

  // Slug generation / validation
  let slug = (payload.slug || generateSeoSlug(sanitizedTitle, existingArticles, payload.id)).trim();
  slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) {
    slug = `artikel-${Date.now()}`;
  }

  // Summary validation
  const sanitizedSummary = sanitizePlainText(payload.summary || '', 600);
  if (!sanitizedSummary) {
    errors.push('Ringkasan / summary artikel wajib diisi.');
  }

  // Category validation
  const sanitizedCategory = sanitizePlainText(payload.category || 'Teknik & Rekayasa', 100);

  // Author validation
  const authorName = sanitizePlainText(payload.author?.name || 'Tim Insinyur LDP', 100);
  const authorRole = sanitizePlainText(payload.author?.role || 'Konsultan Teknik', 100);
  const authorAvatar = isSafeUrl(payload.author?.avatar) ? payload.author.avatar : '/images/avatar_ade.jpg';

  // Image validation
  const image = isSafeUrl(payload.image) ? payload.image : '/images/office_presentation.jpg';

  // Tags validation
  let tags = [];
  if (Array.isArray(payload.tags)) {
    tags = payload.tags.map(t => sanitizePlainText(t, 40)).filter(Boolean);
  } else if (typeof payload.tags === 'string') {
    tags = payload.tags.split(',').map(t => sanitizePlainText(t, 40)).filter(Boolean);
  }
  if (tags.length === 0) {
    tags = ['MEP', 'HVAC', 'Engineering'];
  }

  // Content sanitization
  const sanitizedContent = sanitizeMarkdownContent(payload.content || '');
  if (!sanitizedContent) {
    errors.push('Konten artikel tidak boleh kosong.');
  }

  // Word count & read time calculation
  const words = sanitizedContent.replace(/[#*`_~>[\]()|]/g, ' ').split(/\s+/).filter(Boolean).length;
  const computedMinutes = Math.max(1, Math.ceil(words / 180));
  const readTime = `${computedMinutes} menit`;

  const sanitizedArticle = {
    id: payload.id || Date.now(),
    title: sanitizedTitle,
    slug,
    category: sanitizedCategory,
    summary: sanitizedSummary,
    featured: Boolean(payload.featured),
    image,
    author: {
      name: authorName,
      role: authorRole,
      avatar: authorAvatar
    },
    publishedAt: sanitizePlainText(payload.publishedAt || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 50),
    readTime: payload.readTime ? sanitizePlainText(payload.readTime, 30) : readTime,
    views: Math.max(0, parseInt(payload.views, 10) || 0),
    tags,
    content: sanitizedContent
  };

  return {
    isValid: errors.length === 0,
    sanitizedArticle,
    errors
  };
};

/* =========================================================================
   2. SEO SLUG GENERATION & ANALYSIS
   ========================================================================= */

/**
 * Generates clean, URL-safe SEO slug and ensures uniqueness
 */
export const generateSeoSlug = (title, existingArticles = [], currentArticleId = null) => {
  if (!title) return `artikel-${Date.now()}`;

  let baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric except space and hyphen
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-');          // collapse multi hyphens

  if (!baseSlug) baseSlug = 'artikel';

  // Ensure slug uniqueness among other articles
  let uniqueSlug = baseSlug;
  let counter = 1;
  const isSlugTaken = (slugCandidate) => {
    return existingArticles.some(art => 
      art.id !== currentArticleId && art.slug === slugCandidate
    );
  };

  while (isSlugTaken(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
};

/**
 * Calculates reading statistics (word count, reading time, character count)
 */
export const calculateReadingStats = (content) => {
  if (!content) return { wordCount: 0, charCount: 0, minutes: 1, text: '1 menit' };
  
  const clean = content.replace(/[#*`_~>[\]()|]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = clean.length;
  const minutes = Math.max(1, Math.ceil(wordCount / 180));

  return {
    wordCount,
    charCount,
    minutes,
    text: `${minutes} menit`
  };
};

/**
 * Comprehensive SEO Health Audit for article editor
 */
export const analyzeArticleSeo = (article) => {
  const title = (article.title || '').trim();
  const summary = (article.summary || '').trim();
  const slug = (article.slug || '').trim();
  const content = (article.content || '').trim();
  const tags = Array.isArray(article.tags) ? article.tags : (article.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  let score = 0;
  const checklist = [];

  // 1. Title Length Audit (Optimal: 40 - 70 chars)
  const titleLen = title.length;
  if (titleLen >= 40 && titleLen <= 70) {
    score += 25;
    checklist.push({
      metric: 'Panjang Judul (SEO Title)',
      status: 'success',
      score: 25,
      message: `Sempurna (${titleLen} karakter). Panjang judul ideal untuk indeks Google (40-70 karakter).`
    });
  } else if (titleLen > 0 && titleLen < 40) {
    score += 15;
    checklist.push({
      metric: 'Panjang Judul (SEO Title)',
      status: 'warning',
      score: 15,
      message: `Terlalu singkat (${titleLen} karakter). Tambahkan kata kunci spesifik seperti 'Sistem HVAC' atau 'Standar SNI/ASHRAE'.`
    });
  } else if (titleLen > 70) {
    score += 15;
    checklist.push({
      metric: 'Panjang Judul (SEO Title)',
      status: 'warning',
      score: 15,
      message: `Terlalu panjang (${titleLen} karakter). Google mungkin memotong judul ini di hasil pencarian (> 70 karakter).`
    });
  } else {
    checklist.push({
      metric: 'Panjang Judul (SEO Title)',
      status: 'danger',
      score: 0,
      message: 'Judul artikel belum diisi.'
    });
  }

  // 2. Meta Description / Summary Audit (Optimal: 120 - 160 chars)
  const summaryLen = summary.length;
  if (summaryLen >= 120 && summaryLen <= 165) {
    score += 25;
    checklist.push({
      metric: 'Meta Description (Ringkasan)',
      status: 'success',
      score: 25,
      message: `Sempurna (${summaryLen} karakter). Snippet deskripsi pas untuk cuplikan Google SERP (120-160 karakter).`
    });
  } else if (summaryLen > 0 && summaryLen < 120) {
    score += 15;
    checklist.push({
      metric: 'Meta Description (Ringkasan)',
      status: 'warning',
      score: 15,
      message: `Sedikit singkat (${summaryLen} karakter). Perluas ringkasan hingga 120-160 karakter untuk CTR klik yang lebih tinggi.`
    });
  } else if (summaryLen > 165) {
    score += 15;
    checklist.push({
      metric: 'Meta Description (Ringkasan)',
      status: 'warning',
      score: 15,
      message: `Cukup panjang (${summaryLen} karakter). Cuplikan akan terpotong elipsis (...) di layar mobile.`
    });
  } else {
    checklist.push({
      metric: 'Meta Description (Ringkasan)',
      status: 'danger',
      score: 0,
      message: 'Ringkasan artikel wajib diisi untuk meta description mesin pencari.'
    });
  }

  // 3. Slug Quality Audit
  const isValidSlug = /^[a-z0-9-]+$/.test(slug) && !slug.startsWith('-') && !slug.endsWith('-');
  if (slug && isValidSlug) {
    score += 15;
    checklist.push({
      metric: 'URL Slug SEO Friendly',
      status: 'success',
      score: 15,
      message: `Format URL valid (#blog/${slug}). Huruf kecil, bebas simbol ilegal, mudah diindeks.`
    });
  } else {
    checklist.push({
      metric: 'URL Slug SEO Friendly',
      status: 'danger',
      score: 0,
      message: 'Slug URL mengandung karakter tidak valid atau belum dibuat.'
    });
  }

  // 4. Content Depth Audit (Optimal: > 300 words)
  const stats = calculateReadingStats(content);
  if (stats.wordCount >= 300) {
    score += 20;
    checklist.push({
      metric: 'Kedalaman Konten & Readability',
      status: 'success',
      score: 20,
      message: `Sangat berbobot (${stats.wordCount} kata, estimasi baca ${stats.text}). Menyediakan konten teknis komprehensif.`
    });
  } else if (stats.wordCount >= 100) {
    score += 10;
    checklist.push({
      metric: 'Kedalaman Konten & Readability',
      status: 'warning',
      score: 10,
      message: `Cukup (${stats.wordCount} kata). Disarankan minimal 300 kata untuk peringkat teratas kata kunci rekayasa.`
    });
  } else {
    checklist.push({
      metric: 'Kedalaman Konten & Readability',
      status: 'danger',
      score: 0,
      message: `Konten terlalu pendek (${stats.wordCount} kata). Tulisan minimal 100 kata.`
    });
  }

  // 5. Tags & Topics Audit
  if (tags.length >= 3) {
    score += 15;
    checklist.push({
      metric: 'Tag Kategori & Kata Kunci Terkait',
      status: 'success',
      score: 15,
      message: `Lengkap (${tags.length} tag disematkan). Memudahkan navigasi silang topik rekayasa.`
    });
  } else if (tags.length > 0) {
    score += 8;
    checklist.push({
      metric: 'Tag Kategori & Kata Kunci Terkait',
      status: 'warning',
      score: 8,
      message: `Hanya ${tags.length} tag. Disarankan menambahkan minimal 3 tag kata kunci.`
    });
  } else {
    checklist.push({
      metric: 'Tag Kategori & Kata Kunci Terkait',
      status: 'danger',
      score: 0,
      message: 'Belum ada tag kata kunci yang ditambahkan.'
    });
  }

  // Security Check Status
  const hasScriptTags = /<script[\s\S]*?>/i.test(content) || /javascript:/i.test(content);
  const isImageSafe = isSafeUrl(article.image);
  const securityStatus = (!hasScriptTags && isImageSafe) ? 'safe' : 'flagged';

  return {
    score: Math.min(100, score),
    checklist,
    stats,
    securityStatus,
    serpPreview: {
      title: title || 'Judul Publikasi Rekayasa MEP HVAC | PT LENTANG Duta Perkasa',
      url: `https://ldpconsultant.co.id/#blog/${slug || 'audit-energi-chiller'}`,
      description: summary || 'Baca ulasan profesional dan panduan standar rekayasa teknik dari konsultan ahli PT LENTANG Duta Perkasa.'
    }
  };
};

/* =========================================================================
   3. RUNTIME SEO & STRUCTURED DATA (JSON-LD) INJECTION
   ========================================================================= */

const getOrCreateMetaTag = (attributeName, attributeValue) => {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  return element;
};

/**
 * Updates all browser and search engine metadata for active article
 */
export const applyArticleSeo = (article) => {
  if (!article) {
    resetSeoToDefault();
    return;
  }

  const siteTitle = `${article.title} | PT LENTANG Duta Perkasa`;
  document.title = siteTitle;

  // Primary Meta Tags
  getOrCreateMetaTag('name', 'description').setAttribute('content', article.summary || DEFAULT_SITE_METADATA.description);
  getOrCreateMetaTag('name', 'keywords').setAttribute('content', (article.tags && article.tags.length > 0) ? article.tags.join(', ') : DEFAULT_SITE_METADATA.keywords);
  getOrCreateMetaTag('name', 'author').setAttribute('content', article.author?.name || 'PT LENTANG Duta Perkasa');

  // Open Graph / Facebook / LinkedIn
  getOrCreateMetaTag('property', 'og:type').setAttribute('content', 'article');
  getOrCreateMetaTag('property', 'og:site_name').setAttribute('content', 'PT LENTANG Duta Perkasa');
  getOrCreateMetaTag('property', 'og:title').setAttribute('content', article.title);
  getOrCreateMetaTag('property', 'og:description').setAttribute('content', article.summary);
  getOrCreateMetaTag('property', 'og:url').setAttribute('content', window.location.href);

  const fullImageUrl = article.image.startsWith('http') 
    ? article.image 
    : `${window.location.origin}${article.image.startsWith('/') ? '' : '/'}${article.image}`;
  getOrCreateMetaTag('property', 'og:image').setAttribute('content', fullImageUrl);
  getOrCreateMetaTag('property', 'article:author').setAttribute('content', article.author?.name || 'Insinyur LDP');
  getOrCreateMetaTag('property', 'article:section').setAttribute('content', article.category || 'Engineering');
  getOrCreateMetaTag('property', 'article:published_time').setAttribute('content', article.publishedAt || new Date().toISOString());

  // Twitter Cards
  getOrCreateMetaTag('name', 'twitter:card').setAttribute('content', 'summary_large_image');
  getOrCreateMetaTag('name', 'twitter:title').setAttribute('content', article.title);
  getOrCreateMetaTag('name', 'twitter:description').setAttribute('content', article.summary);
  getOrCreateMetaTag('name', 'twitter:image').setAttribute('content', fullImageUrl);

  // Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', window.location.href.split('#')[0] + `#blog/${article.slug}`);

  // Schema.org JSON-LD Structured Data
  let jsonLdScript = document.getElementById('ldp-article-jsonld');
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'ldp-article-jsonld';
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${window.location.href}#article`,
        "headline": article.title,
        "description": article.summary,
        "image": [fullImageUrl],
        "inLanguage": "id-ID",
        "datePublished": article.publishedAt || new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": article.author?.name || "Tim Insinyur LDP",
          "jobTitle": article.author?.role || "Engineering Consultant",
          "worksFor": {
            "@type": "Organization",
            "name": "PT LENTANG Duta Perkasa"
          }
        },
        "publisher": {
          "@type": "Organization",
          "name": "PT LENTANG Duta Perkasa",
          "url": window.location.origin,
          "logo": {
            "@type": "ImageObject",
            "url": `${window.location.origin}/images/logo.svg`
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": window.location.href
        },
        "keywords": (article.tags || []).join(', '),
        "articleSection": article.category
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${window.location.href}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Beranda",
            "item": `${window.location.origin}/`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Jurnal & Artikel Teknik",
            "item": `${window.location.origin}/#blog`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": article.category,
            "item": `${window.location.origin}/#blog`
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": article.title,
            "item": window.location.href
          }
        ]
      }
    ]
  };

  jsonLdScript.textContent = JSON.stringify(structuredData);
};

/**
 * Resets metadata to default website values
 */
export const resetSeoToDefault = () => {
  document.title = DEFAULT_SITE_METADATA.title;

  getOrCreateMetaTag('name', 'description').setAttribute('content', DEFAULT_SITE_METADATA.description);
  getOrCreateMetaTag('name', 'keywords').setAttribute('content', DEFAULT_SITE_METADATA.keywords);
  getOrCreateMetaTag('name', 'author').setAttribute('content', 'PT LENTANG Duta Perkasa');

  getOrCreateMetaTag('property', 'og:type').setAttribute('content', 'website');
  getOrCreateMetaTag('property', 'og:site_name').setAttribute('content', 'PT LENTANG Duta Perkasa');
  getOrCreateMetaTag('property', 'og:title').setAttribute('content', DEFAULT_SITE_METADATA.title);
  getOrCreateMetaTag('property', 'og:description').setAttribute('content', DEFAULT_SITE_METADATA.description);
  getOrCreateMetaTag('property', 'og:url').setAttribute('content', window.location.origin);

  // Clean canonical and JSON-LD
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    canonicalLink.setAttribute('href', window.location.origin);
  }

  const jsonLdScript = document.getElementById('ldp-article-jsonld');
  if (jsonLdScript) {
    jsonLdScript.remove();
  }
};
