/**
 * Keybindings & Keyboard Shortcuts Engine
 * Handles shortcut definitions, user remapping, and key event matching.
 */

export interface KeybindingDef {
  id: string;
  name: string;
  category: 'File' | 'Editor' | 'View' | 'Navigation' | 'Tools';
  description: string;
  defaultKey: string;
}

export const DEFAULT_KEYBINDINGS: KeybindingDef[] = [
  {
    id: 'save',
    name: 'Save Active File',
    category: 'File',
    description: 'Saves current modifications and triggers format if enabled',
    defaultKey: 'Ctrl+S',
  },
  {
    id: 'commandPalette',
    name: 'Open Command Palette',
    category: 'Navigation',
    description: 'Quick launcher for all editor commands and files',
    defaultKey: 'Ctrl+P',
  },
  {
    id: 'gitDiffModal',
    name: 'Dedicated Git Diff Modal',
    category: 'Tools',
    description: 'Opens side-by-side Git diff modal against last commit',
    defaultKey: 'Alt+D',
  },
  {
    id: 'toggleTerminal',
    name: 'Toggle Terminal Panel',
    category: 'View',
    description: 'Toggles bottom panel with terminal and test runner',
    defaultKey: 'Ctrl+`',
  },
  {
    id: 'toggleSidebar',
    name: 'Toggle Primary Sidebar',
    category: 'View',
    description: 'Collapses or expands the file explorer and activity sidebar',
    defaultKey: 'Ctrl+B',
  },
  {
    id: 'quickSearch',
    name: 'Search Across Workspace',
    category: 'Navigation',
    description: 'Global text search and regex replace across all project files',
    defaultKey: 'Ctrl+Shift+F',
  },
  {
    id: 'formatDocument',
    name: 'Format Active Document',
    category: 'Editor',
    description: 'Beautifies and formats active code syntax with indentation',
    defaultKey: 'Shift+Alt+F',
  },
  {
    id: 'splitPane',
    name: 'Split Editor Pane',
    category: 'Editor',
    description: 'Opens side-by-side split editor for simultaneous editing',
    defaultKey: 'Ctrl+\\',
  },
  {
    id: 'toggleWrap',
    name: 'Toggle Word Wrap',
    category: 'Editor',
    description: 'Switches soft word wrapping on or off',
    defaultKey: 'Alt+Z',
  },
  {
    id: 'toggleMinimap',
    name: 'Toggle Minimap',
    category: 'View',
    description: 'Shows or hides the code minimap overview track',
    defaultKey: 'Alt+M',
  },
  {
    id: 'openSettings',
    name: 'Open Settings & Customizer',
    category: 'Tools',
    description: 'Opens the complete customization and configuration center',
    defaultKey: 'Ctrl+,',
  },
];

export function getEffectiveKeybinding(actionId: string, customBindings?: Record<string, string>): string {
  if (customBindings && customBindings[actionId]) {
    return customBindings[actionId];
  }
  const found = DEFAULT_KEYBINDINGS.find((k) => k.id === actionId);
  return found ? found.defaultKey : '';
}

/**
 * Checks if a keyboard event matches a given keybinding string (e.g. "Ctrl+Shift+F" or "Alt+D")
 */
export function matchesKeybinding(e: KeyboardEvent, keybindingStr: string): boolean {
  if (!keybindingStr) return false;
  const parts = keybindingStr.toLowerCase().split('+');

  const requiresCtrl = parts.includes('ctrl') || parts.includes('control') || parts.includes('cmd');
  const requiresShift = parts.includes('shift');
  const requiresAlt = parts.includes('alt') || parts.includes('option');

  const actualCtrl = e.ctrlKey || e.metaKey;
  const actualShift = e.shiftKey;
  const actualAlt = e.altKey;

  if (requiresCtrl !== actualCtrl) return false;
  if (requiresShift !== actualShift) return false;
  if (requiresAlt !== actualAlt) return false;

  const mainKey = parts[parts.length - 1];
  const eKey = e.key.toLowerCase();

  if (mainKey === '`' && (eKey === '`' || e.code === 'Backquote')) return true;
  if (mainKey === ',' && (eKey === ',' || e.code === 'Comma')) return true;
  if (mainKey === '\\' && (eKey === '\\' || e.code === 'Backslash')) return true;

  return eKey === mainKey || e.code.toLowerCase() === `key${mainKey}`;
}
