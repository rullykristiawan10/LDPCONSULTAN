import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { subscribeToSync, SYNC_EVENTS } from '../utils/syncManager';
import { fetchWhatsAppContactsFromSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

const DEFAULT_CONTACTS = [
  {
    id: 1,
    name: "Abdul Wahid, A.Md. S.Pd",
    role: "Operational Director",
    image: "/images/avatar_habib.jpg",
    phone: "6283874078144",
    active: true
  },
  {
    id: 2,
    name: "Tito Riyanto, S.T",
    role: "Engineering Director",
    image: "/images/avatar_rizky.jpg",
    phone: "6281573713348",
    active: true
  },
  {
    id: 3,
    name: "Ir. Ade Maulana, S.T. M.M.T",
    role: "Commercial & Sales Director",
    image: "/images/avatar_ade.jpg",
    phone: "6281389713127",
    active: true
  }
];

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState(DEFAULT_CONTACTS);

  const loadContacts = () => {
    try {
      const saved = localStorage.getItem('ldp_whatsapp_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContacts(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse WhatsApp contacts from localStorage", e);
    }
    setContacts(DEFAULT_CONTACTS);
  };

  useEffect(() => {
    loadContacts();

    // Fetch from Supabase if connected and local is empty
    if (isSupabaseConfigured()) {
      fetchWhatsAppContactsFromSupabase().then(cloudContacts => {
        if (cloudContacts && cloudContacts.length > 0) {
          const hasLocal = localStorage.getItem('ldp_whatsapp_contacts');
          if (!hasLocal) {
            setContacts(cloudContacts);
            try {
              localStorage.setItem('ldp_whatsapp_contacts', JSON.stringify(cloudContacts));
            } catch (e) {}
          }
        }
      });
    }

    const unsubscribe = subscribeToSync(SYNC_EVENTS.WA, (updated) => {
      if (Array.isArray(updated) && updated.length > 0) {
        setContacts(updated);
      } else {
        loadContacts();
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const activeContacts = contacts.filter(c => c.active !== false);

  const handleContactClick = (contact) => {
    const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Halo ${contact.name} (${contact.role}), saya ingin berkonsultasi mengenai layanan teknik LDP Consultant.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="wa-widget-wrapper">
      
      {/* POPUP CARD BOX */}
      {isOpen && (
        <div className="wa-popup-box">
          {/* Header */}
          <div className="wa-popup-header">
            <div className="wa-header-left">
              <div className="wa-header-logo">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-0.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
              <div className="wa-header-titles">
                <h4 className="wa-title">Start a Conversation</h4>
                <p className="wa-subtitle">Chat with us</p>
              </div>
            </div>
          </div>

          {/* Contact List */}
          <div className="wa-contact-list">
            {activeContacts.length > 0 ? (
              activeContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="wa-contact-card"
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="wa-card-left">
                    {contact.image ? (
                      <img 
                        src={contact.image} 
                        alt={contact.name} 
                        className="wa-contact-img" 
                        onError={(e) => { 
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="wa-contact-img-initials"
                      style={{
                        display: contact.image ? 'none' : 'flex',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF6600, #EA580C)',
                        color: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0
                      }}
                    >
                      {contact.name ? contact.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'WA'}
                    </div>
                    <div className="wa-contact-info">
                      <h5 className="wa-contact-name">{contact.name}</h5>
                      <p className="wa-contact-role">{contact.role}</p>
                    </div>
                  </div>

                  <div className="wa-card-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-0.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                Tidak ada kontak aktif.
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      <button 
        className="wa-float-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle WhatsApp Chat"
        title="Hubungi Kami via WhatsApp"
      >
        {isOpen ? (
          <X size={26} color="#FFFFFF" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" style={{ color: '#FFFFFF' }}>
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-0.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        )}
      </button>

    </div>
  );
}

