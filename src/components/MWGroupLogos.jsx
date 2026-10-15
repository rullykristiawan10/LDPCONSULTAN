import React from 'react';

// 1. MW GROUP Holding Logo (Parent Holding Emblem + Monogram + Typography)
export const MwGroupLogoSVG = ({ className = '', style = {} }) => (
  <svg 
    viewBox="0 0 260 54" 
    height="48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ height: '48px', width: 'auto', display: 'block', ...style }}
  >
    <defs>
      <linearGradient id="mwGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="mwGradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>
    
    {/* Holding Crest Monogram */}
    <g transform="translate(2, 3)">
      <rect x="0" y="0" width="48" height="48" rx="12" fill="rgba(56, 189, 248, 0.12)" stroke="rgba(56, 189, 248, 0.28)" strokeWidth="1.2" />
      {/* Interlocking MW Geometry */}
      <path d="M 12 33 L 12 17 L 19 25 L 24 20 L 29 25 L 36 17 L 36 33" stroke="url(#mwGradCyan)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 16 33 L 24 25 L 32 33" stroke="url(#mwGradOrange)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="15" r="2.2" fill="#38BDF8" />
    </g>

    {/* Brand Typography */}
    <text x="62" y="31" fontFamily="'Outfit', sans-serif" fontWeight="900" fontSize="27" fill="#38BDF8" letterSpacing="1.2">MW</text>
    <text x="118" y="31" fontFamily="'Outfit', sans-serif" fontWeight="900" fontSize="27" fill="#FFFFFF" letterSpacing="1.2">GROUP</text>
    <text x="63" y="46" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="600" fontSize="11" fill="#FB923C" fontStyle="italic" letterSpacing="0.3">Man Jadda Wa Jadda</text>
  </svg>
);

// 2. DMT Logo (PT. Dwi Mitra Teknindo - High Res Clean Asset)
export const DmtLogoSVG = ({ className = '', style = {} }) => (
  <img 
    src="/images/dmt_logo_clean.png" 
    alt="PT. Dwi Mitra Teknindo (DMT)" 
    className={className}
    style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block', ...style }} 
  />
);

export const DmtLogo = DmtLogoSVG;

// 3. Shitsudo Logo (Shitsudo Thermal Engineering - Trimmed Clean Asset)
export const ShitsudoLogoSVG = ({ className = '', style = {} }) => (
  <img 
    src="/images/shitsudo_trimmed.png" 
    alt="Shitsudo Thermal Engineering" 
    className={className}
    style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block', ...style }} 
  />
);

export const ShitsudoLogo = ShitsudoLogoSVG;

// 4. LDP Group Logo (LDP Technical Consultant - High Res Asset)
export const LdpGroupLogoSVG = ({ className = '', style = {} }) => (
  <img 
    src="/images/ldp_group_logo.png" 
    alt="LDP Technical Consultant" 
    className={className}
    style={{ height: '38px', width: 'auto', objectFit: 'contain', display: 'block', ...style }} 
  />
);

export const LdpGroupLogo = LdpGroupLogoSVG;

// 5. ORI Logo (Okta Rekananda Instrument - Optically Balanced Height)
export const OriLogoSVG = ({ className = '', style = {} }) => (
  <img 
    src="/images/ori_logo.png" 
    alt="Okta Rekananda Instrument (ORI)" 
    className={className}
    style={{ height: '44px', width: 'auto', objectFit: 'contain', display: 'block', ...style }} 
  />
);

export const OriLogo = OriLogoSVG;

// 6. MCE Logo (Mitra Clima Electrindo - High Res Asset)
export const MceLogoSVG = ({ className = '', style = {} }) => (
  <img 
    src="/images/mce_logo.png" 
    alt="Mitra Clima Electrindo (MCE)®" 
    className={className}
    style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block', ...style }} 
  />
);

export const MceLogo = MceLogoSVG;

// 7. MMA Logo (Mulki Mitra Aircon - Official Vector Brand Logo)
export const MmaLogoSVG = ({ className = '', style = {} }) => (
  <svg 
    viewBox="0 0 216 55" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ height: '32px', width: 'auto', display: 'block', ...style }}
  >
    {/* Peak 1 (Left Blue Shape) */}
    <polygon points="21,2 31,2 41,18.5 30,18.5 20,35 2,35" fill="#0080C6" />
    
    {/* Peak 2 (Right Blue Shape) */}
    <polygon points="52,2 62,2 72,18.5 61,18.5 51,35 33,35" fill="#0080C6" />
    
    {/* Red Triangle */}
    <polygon points="72,18.5 63,35 82,35" fill="#D32027" />
    
    {/* MMA Text */}
    <text x="87" y="34.5" fontFamily="'Outfit', 'Montserrat', 'Inter', sans-serif" fontWeight="900" fontSize="41" fill="#2B333E" letterSpacing="-0.5">MMA</text>
    
    {/* MULKI MITRA AIRCON Text */}
    <text x="2" y="52" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="12" fill="#2B333E" textLength="212" lengthAdjust="spacing">MULKI MITRA AIRCON</text>
  </svg>
);

export const MmaLogo = MmaLogoSVG;

