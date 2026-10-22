/**
 * Customization Engine for CsCode Crimson IDE
 * Powers deep visual personalization:
 * - Dynamic custom accent color injection & palette generator
 * - UI density (compact, standard, spacious)
 * - Corner radii (sharp 0px, classic 6px, rounded 12px)
 * - Background darkness & contrast modes (Obsidian, OLED Pure Black, Deep Navy, Slate Dark, Crimson Obsidian)
 * - Glassmorphism & backdrop blur intensity
 * - Editor cursor styles (line, block, underline, smooth) & blinking animations
 * - Bracket pair colorization & Indent guide styling
 * - One-click aesthetic presets
 * - Full JSON profile export & import
 */

import { UserSettings } from '../types';

export interface AccentColorSwatch {
  id: string;
  name: string;
  hex: string;
  hover: string;
  muted: string;
  border: string;
}

export const ACCENT_SWATCHES: AccentColorSwatch[] = [
  { id: 'crimson-ruby', name: 'Crimson Ruby', hex: '#e11d48', hover: '#f43f5e', muted: 'rgba(225, 29, 72, 0.18)', border: 'rgba(225, 29, 72, 0.5)' },
  { id: 'cyber-neon', name: 'Cyber Neon Pink', hex: '#ec4899', hover: '#f472b6', muted: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.5)' },
  { id: 'electric-violet', name: 'Electric Violet', hex: '#8b5cf6', hover: '#a78bfa', muted: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.5)' },
  { id: 'horizon-cyan', name: 'Horizon Cyan', hex: '#06b6d4', hover: '#22d3ee', muted: 'rgba(6, 182, 212, 0.2)', border: 'rgba(6, 182, 212, 0.5)' },
  { id: 'emerald-mint', name: 'Emerald Mint', hex: '#10b981', hover: '#34d399', muted: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.5)' },
  { id: 'solar-amber', name: 'Solar Amber', hex: '#f59e0b', hover: '#fbbf24', muted: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.5)' },
  { id: 'sunset-coral', name: 'Sunset Coral', hex: '#f97316', hover: '#fb923c', muted: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.5)' },
  { id: 'royal-indigo', name: 'Royal Indigo', hex: '#6366f1', hover: '#818cf8', muted: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.5)' },
  { id: 'frost-ice', name: 'Nordic Ice', hex: '#38bdf8', hover: '#7dd3fc', muted: 'rgba(56, 189, 248, 0.2)', border: 'rgba(56, 189, 248, 0.5)' },
  { id: 'pure-silver', name: 'Monochrome Silver', hex: '#e2e8f0', hover: '#ffffff', muted: 'rgba(226, 232, 240, 0.15)', border: 'rgba(226, 232, 240, 0.4)' },
];

export interface AestheticPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  settings: Partial<UserSettings>;
}

export const AESTHETIC_PRESETS: AestheticPreset[] = [
  {
    id: 'cyberpunk-2077',
    name: 'Cyberpunk 2077',
    tagline: 'High voltage neon glow with pitch OLED blacks',
    description: 'Electric pink and cyan cursor, ligatures enabled, block cursor, medium glassmorphism blur.',
    accent: '#ec4899',
    settings: {
      customAccentColor: '#ec4899',
      cursorStyle: 'block',
      cursorBlinking: 'smooth',
      fontLigatures: true,
      fontWeight: '500',
      lineHeight: 1.6,
      bracketPairColorization: true,
      uiContrastMode: 'pure-black',
      uiDensity: 'standard',
      uiBorderRadius: 'classic',
      glassmorphism: 'medium',
      indentGuides: 'accent',
      activeLineHighlight: 'border',
      tabDirtyStyle: 'bar',
    },
  },
  {
    id: 'hacker-minimalist',
    name: 'Hacker Minimalist',
    tagline: 'Zero distraction, sharp neo-brutalist tech feel',
    description: 'Pure monochrome accents, 0px sharp edges, compact density, relative line numbers, high information density.',
    accent: '#f8fafc',
    settings: {
      customAccentColor: '#f8fafc',
      cursorStyle: 'line',
      cursorBlinking: 'blink',
      fontLigatures: false,
      fontWeight: '400',
      lineHeight: 1.4,
      relativeLineNumbers: true,
      bracketPairColorization: true,
      uiContrastMode: 'obsidian',
      uiDensity: 'compact',
      uiBorderRadius: 'sharp',
      glassmorphism: 'off',
      indentGuides: 'subtle',
      activeLineHighlight: 'line',
      tabDirtyStyle: 'dot',
    },
  },
  {
    id: 'warm-espresso',
    name: 'Warm Espresso Studio',
    tagline: 'Cozy dark slate with solar amber flare and soft curves',
    description: 'Amber accent, relaxed 1.8 line spacing, 12px rounded window corners, spacious touch-friendly layout.',
    accent: '#f59e0b',
    settings: {
      customAccentColor: '#f59e0b',
      cursorStyle: 'smooth',
      cursorBlinking: 'smooth',
      fontLigatures: true,
      fontWeight: '400',
      lineHeight: 1.8,
      bracketPairColorization: true,
      uiContrastMode: 'slate-dark',
      uiDensity: 'spacious',
      uiBorderRadius: 'rounded',
      glassmorphism: 'heavy',
      indentGuides: 'subtle',
      activeLineHighlight: 'background',
      tabDirtyStyle: 'badge',
    },
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    tagline: 'Bio-luminescent terminal green on obsidian granite',
    description: 'Vibrant emerald accent, underline cursor, subtle indent guides, high-contrast dark navy backdrop.',
    accent: '#10b981',
    settings: {
      customAccentColor: '#10b981',
      cursorStyle: 'underline',
      cursorBlinking: 'phase',
      fontLigatures: true,
      fontWeight: '500',
      lineHeight: 1.6,
      bracketPairColorization: true,
      uiContrastMode: 'deep-navy',
      uiDensity: 'standard',
      uiBorderRadius: 'classic',
      glassmorphism: 'subtle',
      indentGuides: 'accent',
      activeLineHighlight: 'background',
      tabDirtyStyle: 'dot',
    },
  },
  {
    id: 'signature-crimson',
    name: 'Signature Crimson Pro',
    tagline: 'The definitive CsCode crimson engineering experience',
    description: 'Balanced ruby scarlet accents, smooth blinking cursor, classic 6px radius, and standard studio density.',
    accent: '#e11d48',
    settings: {
      customAccentColor: '#e11d48',
      cursorStyle: 'line',
      cursorBlinking: 'smooth',
      fontLigatures: true,
      fontWeight: '400',
      lineHeight: 1.6,
      bracketPairColorization: true,
      uiContrastMode: 'obsidian',
      uiDensity: 'standard',
      uiBorderRadius: 'classic',
      glassmorphism: 'subtle',
      indentGuides: 'subtle',
      activeLineHighlight: 'background',
      tabDirtyStyle: 'dot',
    },
  },
];

/**
 * Converts a hex color into rgba with specified opacity
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) {
    return `rgba(225, 29, 72, ${alpha})`;
  }
  let r: number, g: number, b: number;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates an accent hover shade (slightly lighter or higher luminance)
 */
export function getLighterAccent(hex: string): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const r = Math.min(255, Math.round(parseInt(cleanHex.substring(0, 2), 16) * 1.15));
  const g = Math.min(255, Math.round(parseInt(cleanHex.substring(2, 4), 16) * 1.15));
  const b = Math.min(255, Math.round(parseInt(cleanHex.substring(4, 6), 16) * 1.15));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Injects all custom user styling variables and classes directly into document.documentElement
 */
export function applyCustomizationToDOM(settings: UserSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Custom Accent Color (if provided)
  if (settings.customAccentColor) {
    const hex = settings.customAccentColor;
    const hover = getLighterAccent(hex);
    const muted = hexToRgba(hex, 0.2);
    const border = hexToRgba(hex, 0.45);

    root.style.setProperty('--ide-accent', hex);
    root.style.setProperty('--ide-accent-hover', hover);
    root.style.setProperty('--ide-accent-muted', muted);
    root.style.setProperty('--ide-accent-border', border);
    root.style.setProperty('--ide-cursor', hex);
  }

  // 2. Editor Typography
  const lineHeight = settings.lineHeight || 1.6;
  const fontSize = settings.fontSize || 14;
  const calculatedLineHeightPx = Math.round(fontSize * lineHeight);

  root.style.setProperty('--ide-line-height-factor', `${lineHeight}`);
  root.style.setProperty('--ide-line-height-px', `${calculatedLineHeightPx}px`);
  root.style.setProperty('--ide-letter-spacing', `${settings.letterSpacing || 0}px`);
  root.style.setProperty('--ide-font-weight', settings.fontWeight || '400');
  root.style.setProperty(
    '--ide-font-ligatures',
    settings.fontLigatures !== false ? 'normal' : 'none'
  );

  // 3. UI Corner Radii
  const radiusMode = settings.uiBorderRadius || 'classic';
  let radiusPx = '6px';
  let radiusSmPx = '4px';
  let radiusLgPx = '10px';
  if (radiusMode === 'sharp') {
    radiusPx = '0px';
    radiusSmPx = '0px';
    radiusLgPx = '0px';
  } else if (radiusMode === 'rounded') {
    radiusPx = '12px';
    radiusSmPx = '8px';
    radiusLgPx = '16px';
  }
  root.style.setProperty('--ide-radius', radiusPx);
  root.style.setProperty('--ide-radius-sm', radiusSmPx);
  root.style.setProperty('--ide-radius-lg', radiusLgPx);

  // 4. UI Density
  const density = settings.uiDensity || 'standard';
  let tabHeightPx = '35px';
  let activityBarWidthPx = '48px';
  let buttonPaddingY = '6px';
  let rowHeightPx = '24px';

  if (density === 'compact') {
    tabHeightPx = '28px';
    activityBarWidthPx = '40px';
    buttonPaddingY = '3px';
    rowHeightPx = '20px';
  } else if (density === 'spacious') {
    tabHeightPx = '42px';
    activityBarWidthPx = '56px';
    buttonPaddingY = '8px';
    rowHeightPx = '28px';
  }
  root.style.setProperty('--ide-tab-height', tabHeightPx);
  root.style.setProperty('--ide-activity-bar-width', activityBarWidthPx);
  root.style.setProperty('--ide-density-py', buttonPaddingY);
  root.style.setProperty('--ide-row-height', rowHeightPx);

  // 5. Contrast & Darkness Mode
  const contrast = settings.uiContrastMode || 'obsidian';
  if (contrast === 'pure-black') {
    root.style.setProperty('--ide-bg-app', '#000000');
    root.style.setProperty('--ide-bg-sidebar', '#040404');
    root.style.setProperty('--ide-bg-activity-bar', '#020202');
    root.style.setProperty('--ide-bg-editor', '#000000');
    root.style.setProperty('--ide-bg-gutter', '#000000');
    root.style.setProperty('--ide-bg-panel', '#050505');
    root.style.setProperty('--ide-bg-status-bar', '#000000');
    root.style.setProperty('--ide-border', '#181818');
  } else if (contrast === 'deep-navy') {
    root.style.setProperty('--ide-bg-app', '#030712');
    root.style.setProperty('--ide-bg-sidebar', '#060d20');
    root.style.setProperty('--ide-bg-activity-bar', '#040917');
    root.style.setProperty('--ide-bg-editor', '#050b1a');
    root.style.setProperty('--ide-bg-gutter', '#040814');
    root.style.setProperty('--ide-bg-panel', '#060e22');
    root.style.setProperty('--ide-bg-status-bar', '#030610');
    root.style.setProperty('--ide-border', '#132144');
  } else if (contrast === 'slate-dark') {
    root.style.setProperty('--ide-bg-app', '#0f172a');
    root.style.setProperty('--ide-bg-sidebar', '#131e36');
    root.style.setProperty('--ide-bg-activity-bar', '#0c1322');
    root.style.setProperty('--ide-bg-editor', '#111a30');
    root.style.setProperty('--ide-bg-gutter', '#0e1628');
    root.style.setProperty('--ide-bg-panel', '#131e38');
    root.style.setProperty('--ide-bg-status-bar', '#090e1a');
    root.style.setProperty('--ide-border', '#263554');
  } else if (contrast === 'crimson-obsidian') {
    root.style.setProperty('--ide-bg-app', '#090306');
    root.style.setProperty('--ide-bg-sidebar', '#11050b');
    root.style.setProperty('--ide-bg-activity-bar', '#0a0307');
    root.style.setProperty('--ide-bg-editor', '#0e0409');
    root.style.setProperty('--ide-bg-gutter', '#0a0307');
    root.style.setProperty('--ide-bg-panel', '#12050c');
    root.style.setProperty('--ide-bg-status-bar', '#070205');
    root.style.setProperty('--ide-border', '#280d19');
  }

  // 6. Glassmorphism
  const glass = settings.glassmorphism || 'subtle';
  let blurAmount = '0px';
  let surfaceOpacity = '1.0';
  if (glass === 'subtle') {
    blurAmount = '8px';
    surfaceOpacity = '0.94';
  } else if (glass === 'medium') {
    blurAmount = '16px';
    surfaceOpacity = '0.82';
  } else if (glass === 'heavy') {
    blurAmount = '24px';
    surfaceOpacity = '0.68';
  }
  root.style.setProperty('--ide-backdrop-blur', blurAmount);
  root.style.setProperty('--ide-surface-opacity', surfaceOpacity);

  // 7. Dual Accent Gradient
  if (settings.accentGradientEnabled && settings.secondaryAccentColor) {
    const secHex = settings.secondaryAccentColor;
    const priHex = settings.customAccentColor || '#e11d48';
    root.style.setProperty('--ide-accent-secondary', secHex);
    root.style.setProperty('--ide-accent-gradient', `linear-gradient(135deg, ${priHex} 0%, ${secHex} 100%)`);
  } else {
    const priHex = settings.customAccentColor || '#e11d48';
    root.style.setProperty('--ide-accent-secondary', priHex);
    root.style.setProperty('--ide-accent-gradient', `linear-gradient(135deg, ${priHex} 0%, ${priHex} 100%)`);
  }

  // 8. Cursor Styling & Blinking Classes
  const cursorStyle = settings.cursorStyle || 'line';
  const cursorBlinking = settings.cursorBlinking || 'smooth';

  // Remove previous cursor classes
  root.classList.remove(
    'cursor-style-line',
    'cursor-style-block',
    'cursor-style-underline',
    'cursor-style-smooth',
    'cursor-blink-blink',
    'cursor-blink-smooth',
    'cursor-blink-solid',
    'cursor-blink-phase'
  );

  root.classList.add(`cursor-style-${cursorStyle}`);
  root.classList.add(`cursor-blink-${cursorBlinking}`);
}

/**
 * Exports complete customization settings to a formatted JSON string
 */
export function exportSettingsProfile(settings: UserSettings): string {
  const profile = {
    _exportVersion: 2,
    _appName: 'CsCode Crimson Code',
    _exportedAt: new Date().toISOString(),
    settings,
  };
  return JSON.stringify(profile, null, 2);
}

/**
 * Imports and validates a JSON string of user settings
 */
export function importSettingsProfile(jsonString: string): Partial<UserSettings> | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed) return null;
    if (parsed.settings && typeof parsed.settings === 'object') {
      return parsed.settings as Partial<UserSettings>;
    }
    if (typeof parsed === 'object') {
      return parsed as Partial<UserSettings>;
    }
    return null;
  } catch (e) {
    console.error('Failed to import settings profile:', e);
    return null;
  }
}
