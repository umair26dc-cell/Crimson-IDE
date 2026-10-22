export interface TerminalThemePreset {
  id: string;
  name: string;
  description: string;
  background: string;
  foreground: string;
  cursorColor: string;
  promptColor: string;
}

export const TERMINAL_THEME_PRESETS: TerminalThemePreset[] = [
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    description: 'Deep obsidian canvas with warm ruby prompts and clear text',
    background: '#090a0f',
    foreground: '#cbd5e1',
    cursorColor: '#f43f5e',
    promptColor: '#fb7185',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High contrast electric pink, neon cyan prompt, and deep night violet',
    background: '#080514',
    foreground: '#f472b6',
    cursorColor: '#ec4899',
    promptColor: '#38bdf8',
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Warm stone dark canvas with bright pastel highlights and golden cursor',
    background: '#1a191b',
    foreground: '#fcfcfa',
    cursorColor: '#ffd866',
    promptColor: '#a9dc76',
  },
  {
    id: 'matrix-green',
    name: 'Matrix Phosphor',
    description: 'Classic hacker green phosphor CRT terminal styling',
    background: '#040d06',
    foreground: '#4ade80',
    cursorColor: '#22c55e',
    promptColor: '#86efac',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Iconic gothic dark theme with lilac text and vivid orchid cursor',
    background: '#191a24',
    foreground: '#f8f8f2',
    cursorColor: '#bd93f9',
    promptColor: '#ff79c6',
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Precision low-contrast cyan and yellow balanced palette',
    background: '#002b36',
    foreground: '#93a1a1',
    cursorColor: '#2aa198',
    promptColor: '#b58900',
  },
  {
    id: 'nord',
    name: 'Nordic Frost',
    description: 'Arctic icy blues and cool slate background',
    background: '#242933',
    foreground: '#eceff4',
    cursorColor: '#88c0d0',
    promptColor: '#81a1c1',
  },
  {
    id: 'retro-amber',
    name: 'Retro Amber',
    description: 'Warm vintage 1980s amber mainframe terminal monitor',
    background: '#0e0b04',
    foreground: '#fbbf24',
    cursorColor: '#f59e0b',
    promptColor: '#fde68a',
  },
];

export const DEFAULT_TERMINAL_THEME = TERMINAL_THEME_PRESETS[0];

export function getTerminalThemeById(id?: string): TerminalThemePreset | undefined {
  if (!id) return undefined;
  const lower = id.toLowerCase();
  return TERMINAL_THEME_PRESETS.find(
    (t) => t.id.toLowerCase() === lower || t.name.toLowerCase() === lower
  );
}

export interface CrimsonTerminalPalette {
  id: string;
  name: string;
  description: string;
  background: string;
  foreground: string;
  cursorColor: string;
  promptColor: string;
}

export const CRIMSON_SHADE_TERMINAL_PALETTES: Record<'classic' | 'ruby' | 'neon' | 'garnet', CrimsonTerminalPalette> = {
  classic: {
    id: 'crimson-classic-linked',
    name: 'Classic Crimson (Linked)',
    description: 'Directly linked to IDE Classic Crimson theme — deep obsidian with rose highlights',
    background: '#090a0f',
    foreground: '#cbd5e1',
    cursorColor: '#f43f5e',
    promptColor: '#fb7185',
  },
  ruby: {
    id: 'crimson-ruby-linked',
    name: 'Ruby Vivid (Linked)',
    description: 'Directly linked to IDE Ruby Vivid theme — scarlet canvas with bright ruby prompt',
    background: '#0b080c',
    foreground: '#fecdd3',
    cursorColor: '#e11d48',
    promptColor: '#f43f5e',
  },
  neon: {
    id: 'crimson-neon-linked',
    name: 'Neon Crimson (Linked)',
    description: 'Directly linked to IDE Neon Crimson theme — night violet with electric pink prompt',
    background: '#090514',
    foreground: '#fbcfe8',
    cursorColor: '#ec4899',
    promptColor: '#f472b6',
  },
  garnet: {
    id: 'crimson-garnet-linked',
    name: 'Deep Garnet (Linked)',
    description: 'Directly linked to IDE Deep Garnet theme — volcanic dark with burnt garnet prompt',
    background: '#0a0507',
    foreground: '#fda4af',
    cursorColor: '#be123c',
    promptColor: '#e11d48',
  },
};

export function getCrimsonTerminalPalette(shade?: 'classic' | 'ruby' | 'neon' | 'garnet'): CrimsonTerminalPalette {
  const key = shade && CRIMSON_SHADE_TERMINAL_PALETTES[shade] ? shade : 'ruby';
  return CRIMSON_SHADE_TERMINAL_PALETTES[key];
}
