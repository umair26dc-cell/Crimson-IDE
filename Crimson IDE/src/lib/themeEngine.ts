/**
 * CsCode Crimson Code Theme Engine & User Theme Store
 * Provides rich color themes, live CSS variable injection,
 * custom user theme creation, JSON export/import, and theme persistence.
 */

import { ThemeColors, ThemeDefinition } from '../types';

export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'crimson-ruby',
    name: 'Crimson Ruby (Signature)',
    category: 'Crimson',
    author: 'Crimson Core Team',
    description: 'The definitive high-contrast dark palette with deep scarlet accents and crystal-clear syntax hierarchy.',
    downloads: '14.8k',
    rating: 4.9,
    tags: ['Crimson', 'High Contrast', 'Official', 'Dark'],
    colors: {
      accent: '#e11d48',
      accentHover: '#f43f5e',
      accentMuted: 'rgba(225, 29, 72, 0.18)',
      accentBorder: 'rgba(225, 29, 72, 0.45)',
      bgApp: '#090a0f',
      bgSidebar: '#0e0f16',
      bgActivityBar: '#0a0b10',
      bgEditor: '#0d0e14',
      bgGutter: '#090a0f',
      bgPanel: '#0c0d13',
      bgStatusBar: '#0a0b10',
      fgPrimary: '#e2e8f0',
      fgMuted: '#94a3b8',
      border: '#1e202e',
      cursor: '#f43f5e',
      selection: 'rgba(225, 29, 72, 0.35)',
      keyword: '#f43f5e',
      function: '#fb7185',
      string: '#fda4af',
      number: '#f59e0b',
      comment: '#64748b',
      type: '#f97316',
      variable: '#f43f5e',
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Crimson',
    category: 'Neon',
    author: 'NeoTokyo Labs',
    description: 'High-voltage electric pink and blood-crimson against deep obsidian with cybernetic cyan undertones.',
    downloads: '9.2k',
    rating: 4.8,
    tags: ['Cyberpunk', 'Neon', 'Electric', 'Vibrant'],
    colors: {
      accent: '#ec4899',
      accentHover: '#f472b6',
      accentMuted: 'rgba(236, 72, 153, 0.2)',
      accentBorder: 'rgba(236, 72, 153, 0.5)',
      bgApp: '#06060c',
      bgSidebar: '#0a0a14',
      bgActivityBar: '#05050a',
      bgEditor: '#0b0c16',
      bgGutter: '#070710',
      bgPanel: '#0a0b14',
      bgStatusBar: '#9d174d',
      fgPrimary: '#f1f5f9',
      fgMuted: '#a5b4fc',
      border: '#2a1b3d',
      cursor: '#06b6d4',
      selection: 'rgba(236, 72, 153, 0.4)',
      keyword: '#ec4899',
      function: '#06b6d4',
      string: '#a7f3d0',
      number: '#f43f5e',
      comment: '#6366f1',
      type: '#38bdf8',
      variable: '#f472b6',
    },
  },
  {
    id: 'garnet-obsidian',
    name: 'Garnet Obsidian',
    category: 'Crimson',
    author: 'Volcanic UI',
    description: 'Volcanic mineral dark background illuminated with burnt garnet, magma red, and fiery amber tokens.',
    downloads: '6.4k',
    rating: 4.7,
    tags: ['Garnet', 'Dark', 'Warm', 'Volcanic'],
    colors: {
      accent: '#be123c',
      accentHover: '#e11d48',
      accentMuted: 'rgba(190, 18, 60, 0.22)',
      accentBorder: 'rgba(190, 18, 60, 0.5)',
      bgApp: '#08080a',
      bgSidebar: '#101014',
      bgActivityBar: '#0b0b0e',
      bgEditor: '#0f0f13',
      bgGutter: '#0a0a0d',
      bgPanel: '#0d0d12',
      bgStatusBar: '#4c0519',
      fgPrimary: '#e2e8f0',
      fgMuted: '#94a3b8',
      border: '#261b22',
      cursor: '#fb923c',
      selection: 'rgba(190, 18, 60, 0.35)',
      keyword: '#fb7185',
      function: '#f97316',
      string: '#fdba74',
      number: '#eab308',
      comment: '#71717a',
      type: '#f43f5e',
      variable: '#fda4af',
    },
  },
  {
    id: 'dracula-velvet',
    name: 'Dracula Velvet Red',
    category: 'Dark',
    author: 'Nocturne Studio',
    description: 'Gothic midnight purple-slate canvas with lush crimson, orchid pink, and pastel lilac accents.',
    downloads: '11.3k',
    rating: 4.9,
    tags: ['Gothic', 'Purple', 'Velvet', 'Midnight'],
    colors: {
      accent: '#d946ef',
      accentHover: '#e879f9',
      accentMuted: 'rgba(217, 70, 239, 0.18)',
      accentBorder: 'rgba(217, 70, 239, 0.45)',
      bgApp: '#0f0e17',
      bgSidebar: '#161522',
      bgActivityBar: '#0d0c14',
      bgEditor: '#13121f',
      bgGutter: '#0f0e18',
      bgPanel: '#12111d',
      bgStatusBar: '#701a75',
      fgPrimary: '#f8fafc',
      fgMuted: '#cbd5e1',
      border: '#2b2640',
      cursor: '#f43f5e',
      selection: 'rgba(217, 70, 239, 0.32)',
      keyword: '#f43f5e',
      function: '#d946ef',
      string: '#a855f7',
      number: '#fbbf24',
      comment: '#6b7280',
      type: '#c084fc',
      variable: '#f472b6',
    },
  },
  {
    id: 'nord-frost',
    name: 'Nord Crimson Frost',
    category: 'Modern',
    author: 'Arctic Systems',
    description: 'Frosty arctic bluestone tones balanced with sharp crimson focal points and cool polar typography.',
    downloads: '7.8k',
    rating: 4.8,
    tags: ['Nord', 'Arctic', 'Slate', 'Clean'],
    colors: {
      accent: '#f43f5e',
      accentHover: '#fb7185',
      accentMuted: 'rgba(244, 63, 94, 0.18)',
      accentBorder: 'rgba(244, 63, 94, 0.4)',
      bgApp: '#0d1117',
      bgSidebar: '#131822',
      bgActivityBar: '#0e1219',
      bgEditor: '#111620',
      bgGutter: '#0c1016',
      bgPanel: '#10141d',
      bgStatusBar: '#1e293b',
      fgPrimary: '#eceff4',
      fgMuted: '#94a3b8',
      border: '#232b3b',
      cursor: '#38bdf8',
      selection: 'rgba(56, 189, 248, 0.25)',
      keyword: '#f43f5e',
      function: '#88c0d0',
      string: '#a3be8c',
      number: '#ebcb8b',
      comment: '#64748b',
      type: '#81a1c1',
      variable: '#d8dee9',
    },
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight Rose',
    category: 'Modern',
    author: 'Shibuya Devs',
    description: 'Deep midnight indigo with sakura rose, neon purple, and crisp moonlit syntax accents.',
    downloads: '10.5k',
    rating: 4.9,
    tags: ['Tokyo', 'Indigo', 'Rose', 'Modern'],
    colors: {
      accent: '#fb7185',
      accentHover: '#fda4af',
      accentMuted: 'rgba(251, 113, 133, 0.18)',
      accentBorder: 'rgba(251, 113, 133, 0.45)',
      bgApp: '#0c0e17',
      bgSidebar: '#121524',
      bgActivityBar: '#0a0c14',
      bgEditor: '#101220',
      bgGutter: '#0d0f1a',
      bgPanel: '#0f111d',
      bgStatusBar: '#431407',
      fgPrimary: '#e0e7ff',
      fgMuted: '#94a3b8',
      border: '#252945',
      cursor: '#fb7185',
      selection: 'rgba(251, 113, 133, 0.3)',
      keyword: '#fb7185',
      function: '#818cf8',
      string: '#34d399',
      number: '#fbbf24',
      comment: '#64748b',
      type: '#38bdf8',
      variable: '#c7d2fe',
    },
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix Dark',
    category: 'Modern',
    author: 'Operator 01',
    description: 'Pure cyberpunk terminal matrix vibe with glowing emerald, mint green, and jade status highlights.',
    downloads: '5.6k',
    rating: 4.7,
    tags: ['Green', 'Terminal', 'Matrix', 'High Tech'],
    colors: {
      accent: '#10b981',
      accentHover: '#34d399',
      accentMuted: 'rgba(16, 185, 129, 0.18)',
      accentBorder: 'rgba(16, 185, 129, 0.4)',
      bgApp: '#060a08',
      bgSidebar: '#0b1410',
      bgActivityBar: '#050806',
      bgEditor: '#09110d',
      bgGutter: '#060b08',
      bgPanel: '#080e0b',
      bgStatusBar: '#064e3b',
      fgPrimary: '#ecfdf5',
      fgMuted: '#6ee7b7',
      border: '#142e22',
      cursor: '#34d399',
      selection: 'rgba(16, 185, 129, 0.3)',
      keyword: '#34d399',
      function: '#10b981',
      string: '#a7f3d0',
      number: '#facc15',
      comment: '#4b5563',
      type: '#6ee7b7',
      variable: '#d1fae5',
    },
  },
  {
    id: 'solarized-amber',
    name: 'Solarized Dark Amber',
    category: 'Dark',
    author: 'Solar UI',
    description: 'Rich dark espresso stone paired with warm amber solar flares, brass highlights, and golden identifiers.',
    downloads: '4.9k',
    rating: 4.6,
    tags: ['Amber', 'Warm', 'Solarized', 'Low Eye Strain'],
    colors: {
      accent: '#f59e0b',
      accentHover: '#fbbf24',
      accentMuted: 'rgba(245, 158, 11, 0.18)',
      accentBorder: 'rgba(245, 158, 11, 0.45)',
      bgApp: '#0d0d0c',
      bgSidebar: '#151412',
      bgActivityBar: '#0b0b0a',
      bgEditor: '#12110f',
      bgGutter: '#0e0e0c',
      bgPanel: '#100f0d',
      bgStatusBar: '#78350f',
      fgPrimary: '#fef3c7',
      fgMuted: '#d97706',
      border: '#332717',
      cursor: '#f59e0b',
      selection: 'rgba(245, 158, 11, 0.3)',
      keyword: '#f59e0b',
      function: '#fbbf24',
      string: '#a3e635',
      number: '#f97316',
      comment: '#78716c',
      type: '#fdba74',
      variable: '#fef08a',
    },
  },
  {
    id: 'synthwave-84',
    name: 'Synthwave 84 Sunset',
    category: 'Neon',
    author: 'RetroWave Music',
    description: 'Retro 80s neon glow with laser magenta, sunset violet, and chrome cyan accents for night owls.',
    downloads: '13.1k',
    rating: 4.9,
    tags: ['Retro', '80s', 'Neon', 'Sunset'],
    colors: {
      accent: '#f43f5e',
      accentHover: '#fb7185',
      accentMuted: 'rgba(244, 63, 94, 0.2)',
      accentBorder: 'rgba(244, 63, 94, 0.5)',
      bgApp: '#120a1c',
      bgSidebar: '#1a0e28',
      bgActivityBar: '#0f0817',
      bgEditor: '#170c24',
      bgGutter: '#12091c',
      bgPanel: '#150a21',
      bgStatusBar: '#581c87',
      fgPrimary: '#fdf4ff',
      fgMuted: '#d8b4fe',
      border: '#3b185f',
      cursor: '#22d3ee',
      selection: 'rgba(244, 63, 94, 0.35)',
      keyword: '#f43f5e',
      function: '#22d3ee',
      string: '#fef08a',
      number: '#f472b6',
      comment: '#86198f',
      type: '#c084fc',
      variable: '#e879f9',
    },
  },
  {
    id: 'monokai-pro',
    name: 'Monokai Crimson Pro',
    category: 'Modern',
    author: 'Monokai Collective',
    description: 'Classic Monokai reimagined with charcoal carbon backdrop, lime green, peach, and vivid crimson.',
    downloads: '8.7k',
    rating: 4.8,
    tags: ['Monokai', 'Classic', 'Charcoal', 'Productive'],
    colors: {
      accent: '#ff0055',
      accentHover: '#ff3377',
      accentMuted: 'rgba(255, 0, 85, 0.18)',
      accentBorder: 'rgba(255, 0, 85, 0.45)',
      bgApp: '#111215',
      bgSidebar: '#17181c',
      bgActivityBar: '#0e0f11',
      bgEditor: '#141518',
      bgGutter: '#101113',
      bgPanel: '#131417',
      bgStatusBar: '#831843',
      fgPrimary: '#f8f8f2',
      fgMuted: '#a1a1aa',
      border: '#282a30',
      cursor: '#ff0055',
      selection: 'rgba(255, 0, 85, 0.3)',
      keyword: '#ff0055',
      function: '#a6e22e',
      string: '#e6db74',
      number: '#ae81ff',
      comment: '#75715e',
      type: '#66d9ef',
      variable: '#fd971f',
    },
  },
  {
    id: 'abyss-black',
    name: 'Abyss True OLED Black',
    category: 'Dark',
    author: 'OLED Master',
    description: 'True pitch black (#000000) canvas for OLED displays with high-contrast blood ruby highlights.',
    downloads: '15.4k',
    rating: 4.9,
    tags: ['OLED', 'Pure Black', 'High Contrast', 'Minimalist'],
    colors: {
      accent: '#e11d48',
      accentHover: '#f43f5e',
      accentMuted: 'rgba(225, 29, 72, 0.22)',
      accentBorder: 'rgba(225, 29, 72, 0.55)',
      bgApp: '#000000',
      bgSidebar: '#050505',
      bgActivityBar: '#020202',
      bgEditor: '#000000',
      bgGutter: '#000000',
      bgPanel: '#040404',
      bgStatusBar: '#5c071e',
      fgPrimary: '#ffffff',
      fgMuted: '#a3a3a3',
      border: '#1a1a1a',
      cursor: '#ff0055',
      selection: 'rgba(225, 29, 72, 0.4)',
      keyword: '#ff2d55',
      function: '#ff6482',
      string: '#ff94aa',
      number: '#ffb340',
      comment: '#525252',
      type: '#ff5277',
      variable: '#ff7090',
    },
  },
  {
    id: 'tokyo-neon',
    name: 'Tokyo Neon Midnight',
    category: 'Neon',
    author: 'Shibuya Night Code',
    description: 'Electric neon indigo nights, vivid magenta functions, cyan variables, and crisp amber numerals.',
    downloads: '18.2k',
    rating: 5.0,
    tags: ['Tokyo', 'Neon', 'Indigo', 'Cyberpunk'],
    colors: {
      accent: '#bb9af7',
      accentHover: '#c0caf5',
      accentMuted: 'rgba(187, 154, 247, 0.2)',
      accentBorder: 'rgba(187, 154, 247, 0.5)',
      bgApp: '#13141f',
      bgSidebar: '#161626',
      bgActivityBar: '#11121d',
      bgEditor: '#1a1b26',
      bgGutter: '#141520',
      bgPanel: '#151624',
      bgStatusBar: '#24283b',
      fgPrimary: '#c0caf5',
      fgMuted: '#7aa2f7',
      border: '#292e42',
      cursor: '#f7768e',
      selection: 'rgba(122, 162, 247, 0.35)',
      keyword: '#bb9af7',
      function: '#7aa2f7',
      string: '#9ece6a',
      number: '#ff9e64',
      comment: '#565f89',
      type: '#2ac3de',
      variable: '#f7768e',
    },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    category: 'Modern',
    author: 'Catppuccin Org',
    description: 'Soothing pastel mocha dark theme with flamingo pink, lavender accents, and warm peach typography.',
    downloads: '21.5k',
    rating: 5.0,
    tags: ['Catppuccin', 'Mocha', 'Pastel', 'Warm'],
    colors: {
      accent: '#f38ba8',
      accentHover: '#eba0ac',
      accentMuted: 'rgba(243, 139, 168, 0.2)',
      accentBorder: 'rgba(243, 139, 168, 0.5)',
      bgApp: '#181825',
      bgSidebar: '#1e1e2e',
      bgActivityBar: '#11111b',
      bgEditor: '#181825',
      bgGutter: '#14141e',
      bgPanel: '#1e1e2e',
      bgStatusBar: '#313244',
      fgPrimary: '#cdd6f4',
      fgMuted: '#a6adc8',
      border: '#313244',
      cursor: '#f5e0dc',
      selection: 'rgba(243, 139, 168, 0.35)',
      keyword: '#cba6f7',
      function: '#89b4fa',
      string: '#a6e3a1',
      number: '#fab387',
      comment: '#6c7086',
      type: '#f9e2af',
      variable: '#f38ba8',
    },
  },
  {
    id: 'rose-pine-moon',
    name: 'Rosé Pine Moon',
    category: 'Dark',
    author: 'Rosé Pine Collective',
    description: 'All natural pine palette with subtle muted rose accents and calming foam teal tokens.',
    downloads: '12.8k',
    rating: 4.9,
    tags: ['Rose Pine', 'Moon', 'Muted', 'Nordic'],
    colors: {
      accent: '#eb6f92',
      accentHover: '#ea9a97',
      accentMuted: 'rgba(235, 111, 146, 0.2)',
      accentBorder: 'rgba(235, 111, 146, 0.5)',
      bgApp: '#191724',
      bgSidebar: '#1f1d2e',
      bgActivityBar: '#151320',
      bgEditor: '#232136',
      bgGutter: '#1d1b2c',
      bgPanel: '#1f1d2e',
      bgStatusBar: '#2a273f',
      fgPrimary: '#e0def4',
      fgMuted: '#908caa',
      border: '#393552',
      cursor: '#ea9a97',
      selection: 'rgba(235, 111, 146, 0.3)',
      keyword: '#3e8fb0',
      function: '#ebbcba',
      string: '#f6c177',
      number: '#ea9a97',
      comment: '#6e6a86',
      type: '#9ccfd8',
      variable: '#eb6f92',
    },
  },
  {
    id: 'gruvbox-crimson',
    name: 'Gruvbox Crimson Hard',
    category: 'Dark',
    author: 'Retro Terminal',
    description: 'Retro groove aesthetic with warm dark amber backdrop, terracotta crimson, and brass accents.',
    downloads: '10.1k',
    rating: 4.8,
    tags: ['Gruvbox', 'Retro', 'Warm', 'Terracotta'],
    colors: {
      accent: '#fb4934',
      accentHover: '#fe8019',
      accentMuted: 'rgba(251, 73, 52, 0.22)',
      accentBorder: 'rgba(251, 73, 52, 0.5)',
      bgApp: '#1d2021',
      bgSidebar: '#282828',
      bgActivityBar: '#141617',
      bgEditor: '#282828',
      bgGutter: '#1d2021',
      bgPanel: '#202223',
      bgStatusBar: '#3c3836',
      fgPrimary: '#ebdbb2',
      fgMuted: '#a89984',
      border: '#3c3836',
      cursor: '#fe8019',
      selection: 'rgba(251, 73, 52, 0.35)',
      keyword: '#fb4934',
      function: '#b8bb26',
      string: '#fabd2f',
      number: '#d3869b',
      comment: '#928374',
      type: '#8ec07c',
      variable: '#ebdbb2',
    },
  },
  {
    id: 'matrix-green',
    name: 'Matrix Bio-Terminal',
    category: 'Neon',
    author: 'Operator',
    description: 'Bioluminescent green phosphor on obsidian black. The definitive matrix hacker aesthetic.',
    downloads: '14.2k',
    rating: 4.9,
    tags: ['Matrix', 'Green', 'Phosphor', 'Hacker'],
    colors: {
      accent: '#22c55e',
      accentHover: '#4ade80',
      accentMuted: 'rgba(34, 197, 94, 0.2)',
      accentBorder: 'rgba(34, 197, 94, 0.5)',
      bgApp: '#040d06',
      bgSidebar: '#07140a',
      bgActivityBar: '#030804',
      bgEditor: '#051108',
      bgGutter: '#040d06',
      bgPanel: '#061309',
      bgStatusBar: '#14532d',
      fgPrimary: '#86efac',
      fgMuted: '#22c55e',
      border: '#14381b',
      cursor: '#22c55e',
      selection: 'rgba(34, 197, 94, 0.35)',
      keyword: '#4ade80',
      function: '#a7f3d0',
      string: '#6ee7b7',
      number: '#fbbf24',
      comment: '#166534',
      type: '#34d399',
      variable: '#86efac',
    },
  },
  {
    id: 'monochrome-minimal',
    name: 'Monochrome Hyper-Minimal',
    category: 'Modern',
    author: 'Studio Zero',
    description: 'Ultra-pure grayscale with surgical typography clarity and pure white active tokens.',
    downloads: '9.6k',
    rating: 4.8,
    tags: ['Monochrome', 'Minimal', 'Grayscale', 'Clean'],
    colors: {
      accent: '#f8fafc',
      accentHover: '#ffffff',
      accentMuted: 'rgba(248, 250, 252, 0.15)',
      accentBorder: 'rgba(248, 250, 252, 0.4)',
      bgApp: '#09090b',
      bgSidebar: '#0f0f12',
      bgActivityBar: '#060608',
      bgEditor: '#0c0c0e',
      bgGutter: '#08080a',
      bgPanel: '#0e0e11',
      bgStatusBar: '#18181b',
      fgPrimary: '#f4f4f5',
      fgMuted: '#71717a',
      border: '#27272a',
      cursor: '#ffffff',
      selection: 'rgba(255, 255, 255, 0.25)',
      keyword: '#ffffff',
      function: '#e4e4e7',
      string: '#a1a1aa',
      number: '#d4d4d8',
      comment: '#52525b',
      type: '#f4f4f5',
      variable: '#ffffff',
    },
  },
];

const CUSTOM_THEMES_STORAGE_KEY = 'crimson_ide_custom_user_themes';

/**
 * Returns all custom themes stored locally in localStorage
 */
export function loadStoredCustomThemes(): ThemeDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists custom user themes into localStorage
 */
export function saveStoredCustomThemes(themes: ThemeDefinition[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
  } catch (e) {
    console.error('Failed to persist custom themes:', e);
  }
}

/**
 * Retrieves the full combined catalog of built-in and user custom themes
 */
export function getAllThemes(customThemes: ThemeDefinition[] = []): ThemeDefinition[] {
  const stored = loadStoredCustomThemes();
  const customMap = new Map<string, ThemeDefinition>();
  stored.forEach((t) => customMap.set(t.id, t));
  customThemes.forEach((t) => customMap.set(t.id, t));

  return [...BUILTIN_THEMES, ...Array.from(customMap.values())];
}

/**
 * Finds a specific theme by ID or falls back to Crimson Ruby
 */
export function getThemeById(themeId: string, customThemes: ThemeDefinition[] = []): ThemeDefinition {
  const all = getAllThemes(customThemes);
  const found = all.find((t) => t.id === themeId);
  return found || BUILTIN_THEMES[0];
}

let themeTransitionTimer: any = null;

export const THEME_CHANGE_EVENT = 'cscode_theme_changed';

/**
 * Injects CSS custom properties into document.documentElement
 * Dynamically updates UI accents, backgrounds, and Prism syntax token colors
 * with animated transitions across color properties!
 */
export function applyTheme(theme: ThemeDefinition, animate: boolean = true): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const c = theme.colors;

  if (animate) {
    root.classList.add('theme-transitioning');
    if (themeTransitionTimer) clearTimeout(themeTransitionTimer);
    themeTransitionTimer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 600);
  }

  root.style.setProperty('--ide-accent', c.accent);
  root.style.setProperty('--ide-accent-hover', c.accentHover);
  root.style.setProperty('--ide-accent-muted', c.accentMuted);
  root.style.setProperty('--ide-accent-border', c.accentBorder);
  root.style.setProperty('--ide-bg-app', c.bgApp);
  root.style.setProperty('--ide-bg-sidebar', c.bgSidebar);
  root.style.setProperty('--ide-bg-activity-bar', c.bgActivityBar);
  root.style.setProperty('--ide-bg-editor', c.bgEditor);
  root.style.setProperty('--ide-bg-gutter', c.bgGutter);
  root.style.setProperty('--ide-bg-panel', c.bgPanel);
  root.style.setProperty('--ide-bg-status-bar', c.bgStatusBar);
  root.style.setProperty('--ide-fg-primary', c.fgPrimary);
  root.style.setProperty('--ide-fg-muted', c.fgMuted);
  root.style.setProperty('--ide-border', c.border);
  root.style.setProperty('--ide-cursor', c.cursor);
  root.style.setProperty('--ide-selection', c.selection);

  // Syntax tokens
  root.style.setProperty('--ide-token-keyword', c.keyword);
  root.style.setProperty('--ide-token-function', c.function);
  root.style.setProperty('--ide-token-string', c.string);
  root.style.setProperty('--ide-token-number', c.number);
  root.style.setProperty('--ide-token-comment', c.comment);
  root.style.setProperty('--ide-token-type', c.type);
  root.style.setProperty('--ide-token-variable', c.variable);

  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
}

/**
 * Creates a blank custom theme starter object
 */
export function createDefaultCustomTheme(baseTheme?: ThemeDefinition): ThemeDefinition {
  const base = baseTheme || BUILTIN_THEMES[0];
  const uniqueId = `custom-theme-${Date.now()}`;
  return {
    id: uniqueId,
    name: baseTheme ? `${baseTheme.name} (Custom)` : 'My Custom Theme',
    category: 'Custom',
    author: 'You',
    description: 'Personalized IDE theme crafted in the Crimson Theme Studio.',
    downloads: '0',
    rating: 5.0,
    tags: ['Custom', 'User Created'],
    colors: { ...base.colors },
    isCustom: true,
  };
}

/**
 * Exports a theme to a JSON string for sharing
 */
export function exportThemeJSON(theme: ThemeDefinition): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Validates and parses a JSON string into a ThemeDefinition
 */
export function importThemeJSON(jsonString: string): ThemeDefinition | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.name || !parsed.colors || !parsed.colors.accent || !parsed.colors.bgEditor) {
      return null;
    }
    return {
      ...parsed,
      id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
      category: 'Custom',
    };
  } catch {
    return null;
  }
}

/**
 * High-level Theme Engine Service & Controller
 */
export class ThemeEngineService {
  private activeThemeId: string = 'crimson-ruby';

  init(): void {
    const theme = this.getActiveTheme();
    if (theme) {
      applyTheme(theme, false);
    }
  }

  getActiveTheme(): ThemeDefinition {
    return getThemeById(this.activeThemeId);
  }

  setActiveTheme(themeId: string, animate: boolean = true): void {
    this.activeThemeId = themeId;
    const theme = getThemeById(themeId);
    applyTheme(theme, animate);
  }

  getAllThemes(): ThemeDefinition[] {
    return getAllThemes();
  }

  saveCustomTheme(theme: ThemeDefinition): void {
    const customs = loadStoredCustomThemes();
    const existingIndex = customs.findIndex((t) => t.id === theme.id);
    if (existingIndex >= 0) {
      customs[existingIndex] = theme;
    } else {
      customs.push(theme);
    }
    saveStoredCustomThemes(customs);
  }

  /**
   * Applies syntax highlighting CSS variables directly to document.documentElement
   * for instant real-time live preview without saving
   */
  applySyntaxTokenCSSVariables(syntaxTokens: Partial<Record<'keyword' | 'function' | 'string' | 'number' | 'comment' | 'type' | 'variable', string>>): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (syntaxTokens.keyword) root.style.setProperty('--ide-token-keyword', syntaxTokens.keyword);
    if (syntaxTokens.function) root.style.setProperty('--ide-token-function', syntaxTokens.function);
    if (syntaxTokens.string) root.style.setProperty('--ide-token-string', syntaxTokens.string);
    if (syntaxTokens.number) root.style.setProperty('--ide-token-number', syntaxTokens.number);
    if (syntaxTokens.comment) root.style.setProperty('--ide-token-comment', syntaxTokens.comment);
    if (syntaxTokens.type) root.style.setProperty('--ide-token-type', syntaxTokens.type);
    if (syntaxTokens.variable) root.style.setProperty('--ide-token-variable', syntaxTokens.variable);
  }

  /**
   * Updates and persists custom syntax highlighting token color variables
   * (token-keyword, token-function, token-string, token-number, token-comment, token-type, token-variable)
   * using the theme engine, updates CSS variables, and stores in custom themes.
   */
  updateSyntaxTokenColors(
    syntaxTokens: Partial<Record<'keyword' | 'function' | 'string' | 'number' | 'comment' | 'type' | 'variable', string>>
  ): ThemeDefinition {
    const current = this.getActiveTheme();
    
    // If the active theme is already custom, update it in place; otherwise clone into a custom variant
    let targetTheme: ThemeDefinition;
    if (current.isCustom) {
      targetTheme = {
        ...current,
        colors: {
          ...current.colors,
          ...syntaxTokens,
        },
      };
    } else {
      const cleanName = current.name.replace(/\s*\(Custom Syntax\)/g, '');
      targetTheme = {
        ...current,
        id: `custom-syntax-${current.id}-${Date.now().toString(36)}`,
        name: `${cleanName} (Custom Syntax)`,
        isCustom: true,
        category: 'Custom',
        colors: {
          ...current.colors,
          ...syntaxTokens,
        },
      };
    }

    this.saveCustomTheme(targetTheme);
    this.activeThemeId = targetTheme.id;
    applyTheme(targetTheme);
    return targetTheme;
  }

  /**
   * Resets syntax token colors to the active theme's original base defaults
   */
  resetSyntaxTokenColors(): ThemeDefinition {
    const current = this.getActiveTheme();
    let baseTheme = BUILTIN_THEMES[0];
    if (current.id.startsWith('custom-syntax-')) {
      const parts = current.id.replace('custom-syntax-', '').split('-');
      const baseId = parts[0] ? `${parts[0]}-${parts[1] || ''}`.replace(/-$/, '') : '';
      baseTheme = BUILTIN_THEMES.find((t) => t.id === baseId) || BUILTIN_THEMES[0];
    } else {
      baseTheme = BUILTIN_THEMES.find((t) => t.id === current.id) || BUILTIN_THEMES[0];
    }

    return this.updateSyntaxTokenColors({
      keyword: baseTheme.colors.keyword,
      function: baseTheme.colors.function,
      string: baseTheme.colors.string,
      number: baseTheme.colors.number,
      comment: baseTheme.colors.comment,
      type: baseTheme.colors.type,
      variable: baseTheme.colors.variable,
    });
  }
}

export const themeEngine = new ThemeEngineService();

