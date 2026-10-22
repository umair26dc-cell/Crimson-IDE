/**
 * Custom CSS Engine & Dynamic Style Injector
 * Lets users write and inject custom CSS rules directly into the IDE live,
 * with built-in presets and syntax validation.
 */

export interface CustomCssPreset {
  id: string;
  name: string;
  description: string;
  category: 'Aesthetic' | 'Retro' | 'Minimalist' | 'Effects';
  css: string;
}

export const CUSTOM_CSS_PRESETS: CustomCssPreset[] = [
  {
    id: 'cyberpunk-neon-glow',
    name: 'Cyberpunk Neon Glow & Scanlines',
    category: 'Effects',
    description: 'Intense glowing tokens, pulsing border accents, and subtle CRT scanline effect.',
    css: `/* Cyberpunk Neon Glow */
.token.keyword, .token.function {
  text-shadow: 0 0 8px currentColor;
}

/* Neon Active Line Glow */
.cursor-blink-smooth {
  filter: drop-shadow(0 0 6px var(--ide-accent, #e11d48));
}

/* Subtle CRT Scanline Scan */
body::after {
  content: " ";
  display: block;
  position: fixed;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
  background-size: 100% 4px;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.12;
}
`,
  },
  {
    id: 'ultra-frosted-glass',
    name: 'Ultra-Frosted Glass Floating Panels',
    category: 'Aesthetic',
    description: 'Modern macOS/iOS style deep backdrop blur with translucent floating tabs and panels.',
    css: `/* Ultra-Frosted Translucent Panels */
aside, .bg-\\[\\#0e0f16\\], .bg-\\[\\#0c0d13\\] {
  backdrop-filter: blur(20px) saturate(160%) !important;
  background-color: rgba(14, 15, 22, 0.72) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

/* Floating Rounded Tabs */
button.group.relative.border-r {
  border-radius: 8px 8px 0 0;
  margin-top: 3px;
  background-color: rgba(255, 255, 255, 0.03);
}
`,
  },
  {
    id: 'rainbow-active-border',
    name: 'Rainbow Gradient Active Borders',
    category: 'Effects',
    description: 'Dynamic animated animated RGB rainbow gradient outline on focused editor panes.',
    css: `/* Rainbow Animated Active Editor Outline */
@keyframes rainbowGlow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

.focus-within\\:ring-1 {
  border-color: #f43f5e !important;
  animation: rainbowGlow 6s linear infinite;
  box-shadow: 0 0 15px rgba(244, 63, 94, 0.25);
}
`,
  },
  {
    id: 'retro-green-phosphor',
    name: 'Retro Green Phosphor CRT',
    category: 'Retro',
    description: 'Old-school green phosphor terminal vibe with glowing monospace typography.',
    css: `/* Retro Green Phosphor Text */
textarea, pre, code {
  color: #39ff14 !important;
  text-shadow: 0 0 4px rgba(57, 255, 20, 0.45);
}

.token {
  color: #4ade80 !important;
  text-shadow: 0 0 5px rgba(74, 222, 128, 0.5) !important;
}

.token.comment {
  color: #15803d !important;
}
`,
  },
  {
    id: 'ultra-minimalist-borderless',
    name: 'Ultra-Minimalist Borderless Zen',
    category: 'Minimalist',
    description: 'Clean distraction-free look: hides dividing borders, simplifies tabs, maximizes code space.',
    css: `/* Ultra-Minimalist Zen */
* {
  border-color: transparent !important;
}

/* Slimmer scrollbars */
::-webkit-scrollbar {
  width: 3px !important;
  height: 3px !important;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15) !important;
  border-radius: 9999px !important;
}
`,
  },
  {
    id: 'clean-modern-rounded',
    name: 'Clean Modern Rounded & Shadowed',
    category: 'Aesthetic',
    description: 'Polished soft rounded surfaces, gentle elevation drop-shadows, and smooth typography.',
    css: `/* Modern Smooth Rounded Elevation */
.rounded, .rounded-lg, button, input {
  border-radius: 10px !important;
}

/* Soft ambient shadow for floating menus */
.shadow-2xl, .shadow-xl {
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6) !important;
}
`,
  },
];

const STYLE_TAG_ID = 'cscode-custom-user-css';

export function applyCustomCssToDOM(cssCode?: string, enabled: boolean = true): void {
  if (typeof document === 'undefined') return;

  let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;

  if (!enabled || !cssCode || !cssCode.trim()) {
    if (styleTag) {
      styleTag.textContent = '';
    }
    return;
  }

  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = STYLE_TAG_ID;
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = cssCode;
}
