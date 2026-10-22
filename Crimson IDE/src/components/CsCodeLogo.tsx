import React from 'react';

interface CsCodeLogoProps {
  size?: number | string;
  className?: string;
  withGlow?: boolean;
  alt?: string;
}

/**
 * CsCode Crimson Code Official Brand Logo
 * Precision origami ribbon bracket emblem in crimson, ruby, and neon rose gradients.
 */
export const CsCodeLogo: React.FC<CsCodeLogoProps> = ({
  size = 20,
  className = '',
  withGlow = false,
  alt = 'CsCode Crimson Code Logo',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 relative ${className}`}
      style={{ width: size, height: size }}
      title={alt}
      role="img"
      aria-label={alt}
    >
      {withGlow && (
        <div
          className="absolute inset-0 bg-rose-600/30 rounded-full blur-md -z-10 pointer-events-none transform scale-125"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 128 128"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          {/* Subtle Ambient Radial Glow */}
          <radialGradient id="cscode-bg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0b0c11" stopOpacity={0} />
          </radialGradient>

          {/* Front Dynamic Diagonal Sash */}
          <linearGradient id="cscode-blade-front" x1="24" y1="20" x2="104" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff3b68" />
            <stop offset="40%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* Top Chevron Fold */}
          <linearGradient id="cscode-wing-top" x1="28" y1="16" x2="98" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="35%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          {/* Bottom Chevron Fold */}
          <linearGradient id="cscode-wing-bottom" x1="28" y1="112" x2="98" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="45%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* Left Fold Deep Shadow Underbelly */}
          <linearGradient id="cscode-fold-shadow" x1="20" y1="40" x2="68" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4c0519" />
            <stop offset="60%" stopColor="#881337" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          {/* Center Bridge Specular Shimmer */}
          <linearGradient id="cscode-bridge-gloss" x1="40" y1="24" x2="88" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
            <stop offset="30%" stopColor="#fda4af" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
          </linearGradient>

          {/* Back Spine Fold */}
          <linearGradient id="cscode-back-spine" x1="94" y1="26" x2="94" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="50%" stopColor="#9f1239" />
            <stop offset="100%" stopColor="#4c0519" />
          </linearGradient>
        </defs>

        {/* Ambient Halo */}
        <circle cx="64" cy="64" r="58" fill="url(#cscode-bg-glow)" />

        {/* 1. Right Spine Plate */}
        <path
          d="M86 28 L98 38 L98 90 L86 100 L76 86 L84 78 L84 50 L76 42 Z"
          fill="url(#cscode-back-spine)"
        />

        {/* 2. Lower Left Return Under-Fold */}
        <path
          d="M28 88 L52 108 L86 100 L68 84 L46 88 Z"
          fill="url(#cscode-fold-shadow)"
        />

        {/* 3. Bottom Forward Chevron / Loop Wing */}
        <path
          d="M24 78 L68 112 L98 90 L76 74 L48 94 L38 86 Z"
          fill="url(#cscode-wing-bottom)"
        />

        {/* 4. Upper Left Return Fold */}
        <path
          d="M28 40 L46 40 L68 44 L86 28 L52 20 Z"
          fill="url(#cscode-fold-shadow)"
        />

        {/* 5. Top Forward Chevron / Upper Code Bracket Wing */}
        <path
          d="M24 50 L38 42 L48 34 L76 54 L98 38 L68 16 Z"
          fill="url(#cscode-wing-top)"
        />

        {/* 6. Left Origami Bracket Apex (C-curve apex) */}
        <path
          d="M24 50 L42 64 L24 78 L18 64 Z"
          fill="#ff4b72"
        />

        {/* 7. Dynamic Diagonal Upper Crossing Sash */}
        <path
          d="M24 50 L76 14 L96 28 L42 78 L24 78 Z"
          fill="url(#cscode-blade-front)"
        />

        {/* 8. Dynamic Diagonal Lower Crossing Sash */}
        <path
          d="M24 78 L76 114 L96 100 L42 50 L24 50 Z"
          fill="url(#cscode-blade-front)"
          opacity="0.94"
        />

        {/* 9. Inner Negative Space Cutout (<) */}
        <path
          d="M28 64 L54 44 L54 84 Z"
          fill="#0c0d14"
          opacity="0.88"
        />

        {/* 10. Specular Shimmer Edge on the Crossing Ridge */}
        <path
          d="M24 50 L76 14 L80 18 L32 56 Z"
          fill="url(#cscode-bridge-gloss)"
        />
        <path
          d="M24 78 L76 114 L80 110 L32 72 Z"
          fill="url(#cscode-bridge-gloss)"
        />

        {/* 11. Center Glowing Core Vertex */}
        <circle cx="56" cy="64" r="3" fill="#ffe4e6" />
      </svg>
    </div>
  );
};
