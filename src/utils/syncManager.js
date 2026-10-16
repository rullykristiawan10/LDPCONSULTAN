/**
 * LDP Technical Consultant - Realtime Cross-Tab & Cross-View Sync Manager
 * Memastikan setiap perubahan pengaturan di Admin Dashboard langsung terupdate
 * secara instan (real-time) di Website Utama, baik di tab yang sama maupun tab lain.
 */

export const STORAGE_KEYS = {
  TEAM: 'ldp_team_members',
  WA: 'ldp_whatsapp_contacts',
  BLOG: 'ldp_blog_articles',
  PROJECTS: 'ldp_projects',
  SETTINGS: 'ldp_site_settings',
  LEADS: 'ldp_consultation_leads',
  SUPABASE_URL: 'ldp_supabase_url',
  SUPABASE_KEY: 'ldp_supabase_anon_key'
};

export const SYNC_EVENTS = {
  TEAM: 'ldp-team-updated',
  WA: 'wa-contacts-updated',
  BLOG: 'blog-articles-updated',
  PROJECTS: 'ldp-projects-updated',
  SETTINGS: 'ldp-settings-updated',
  LEADS: 'ldp-leads-updated'
};

// Singleton BroadcastChannel for ultra-fast cross-tab messaging
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('ldp_realtime_sync');
  } catch (e) {
    console.warn('BroadcastChannel not supported or restricted:', e);
  }
}

/**
 * Broadcast an update event across current tab and all other open tabs
 * @param {string} eventName - e.g. 'ldp-team-updated'
 * @param {any} payload - optional updated data
 */
export const broadcastSync = (eventName, payload = null) => {
  if (typeof window === 'undefined') return;

  // 1. Dispatch in the active tab (instant React state updates)
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  } catch (err) {
    console.error('Error dispatching CustomEvent:', err);
  }

  // 2. Broadcast to other tabs / windows via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        event: eventName,
        payload,
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('Error broadcasting sync message:', err);
    }
  }
};

/**
 * Subscribe to sync updates for a specific event
 * @param {string} eventName - e.g. 'ldp-team-updated'
 * @param {Function} callback - handler function
 * @returns {Function} cleanup unsubscribe function
 */
export const subscribeToSync = (eventName, callback) => {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  // Handler for in-tab CustomEvent
  const handleCustomEvent = (e) => {
    try {
      callback(e?.detail);
    } catch (err) {
      console.error(`Error in sync callback for ${eventName}:`, err);
    }
  };

  // Handler for cross-tab BroadcastChannel
  const handleBroadcastMessage = (e) => {
    if (e.data && e.data.event === eventName) {
      try {
        callback(e.data.payload);
      } catch (err) {
        console.error(`Error in broadcast callback for ${eventName}:`, err);
      }
    }
  };

  // Fallback for storage events from other tabs
  const handleStorageEvent = (e) => {
    // Check if relevant key changed
    const relevantKeys = Object.values(STORAGE_KEYS);
    if (!e.key || relevantKeys.includes(e.key)) {
      try {
        callback();
      } catch (err) {
        console.error(`Error in storage event for ${eventName}:`, err);
      }
    }
  };

  // Re-sync on window focus (user switches back to tab)
  const handleFocus = () => {
    try {
      callback();
    } catch (err) {
      console.error(`Error in focus sync for ${eventName}:`, err);
    }
  };

  window.addEventListener(eventName, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('focus', handleFocus);

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener(eventName, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('focus', handleFocus);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
};
