import { IdeLayoutConfig, LayoutPreset } from '../types';

export const BUILTIN_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'default-view',
    name: 'Default IDE View',
    description: 'Standard arrangement with left Activity Bar, left File Explorer, bottom Terminal dock, and right Minimap.',
    isBuiltIn: true,
    layout: {
      activityBarPosition: 'left',
      sidebarPosition: 'left',
      bottomPanelPosition: 'bottom',
      statusBarPosition: 'bottom',
      minimapPosition: 'right',
      sidebarWidth: 260,
      bottomPanelHeight: 220,
    },
  },
  {
    id: 'debugging-view',
    name: 'Debugging View',
    description: 'Optimized for debugging: Right-docked Bottom Panel for inspecting execution logs & terminal side-by-side, with top Status Bar.',
    isBuiltIn: true,
    layout: {
      activityBarPosition: 'left',
      sidebarPosition: 'left',
      bottomPanelPosition: 'right',
      statusBarPosition: 'top',
      minimapPosition: 'right',
      sidebarWidth: 260,
      bottomPanelHeight: 320,
    },
  },
  {
    id: 'minimalist-view',
    name: 'Minimalist View',
    description: 'Distraction-free environment: Hidden Activity Bar, left File Explorer, bottom Terminal, and left-docked Minimap.',
    isBuiltIn: true,
    layout: {
      activityBarPosition: 'hidden',
      sidebarPosition: 'left',
      bottomPanelPosition: 'bottom',
      statusBarPosition: 'bottom',
      minimapPosition: 'left',
      sidebarWidth: 240,
      bottomPanelHeight: 180,
    },
  },
  {
    id: 'terminal-split-view',
    name: 'Terminal-Centric View',
    description: 'Right-aligned Explorer & Activity Bar with bottom shell dock for heavy command-line and scripting workflows.',
    isBuiltIn: true,
    layout: {
      activityBarPosition: 'right',
      sidebarPosition: 'right',
      bottomPanelPosition: 'bottom',
      statusBarPosition: 'bottom',
      minimapPosition: 'right',
      sidebarWidth: 280,
      bottomPanelHeight: 300,
    },
  },
  {
    id: 'zen-focus-view',
    name: 'Zen Focus View',
    description: 'Full canvas code immersion: Hidden Activity Bar, right-aligned Explorer, bottom status bar, and right minimap.',
    isBuiltIn: true,
    layout: {
      activityBarPosition: 'hidden',
      sidebarPosition: 'right',
      bottomPanelPosition: 'bottom',
      statusBarPosition: 'bottom',
      minimapPosition: 'right',
      sidebarWidth: 220,
      bottomPanelHeight: 160,
    },
  },
];

export function getAvailableLayoutPresets(userSavedPresets?: LayoutPreset[]): LayoutPreset[] {
  const custom = Array.isArray(userSavedPresets) ? userSavedPresets : [];
  return [...BUILTIN_LAYOUT_PRESETS, ...custom];
}

export function isMatchingLayout(a: IdeLayoutConfig, b: IdeLayoutConfig): boolean {
  if (!a || !b) return false;
  return (
    a.activityBarPosition === b.activityBarPosition &&
    a.sidebarPosition === b.sidebarPosition &&
    a.bottomPanelPosition === b.bottomPanelPosition &&
    a.statusBarPosition === b.statusBarPosition &&
    a.minimapPosition === b.minimapPosition
  );
}

export function saveLayoutPreset(
  name: string,
  layout: IdeLayoutConfig,
  existingPresets?: LayoutPreset[]
): { presets: LayoutPreset[]; newPreset: LayoutPreset } {
  const custom = Array.isArray(existingPresets) ? [...existingPresets] : [];
  const cleanName = name.trim() || 'Custom Layout';
  const id = `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const newPreset: LayoutPreset = {
    id,
    name: cleanName,
    description: `User-saved arrangement (${layout.activityBarPosition} bar, ${layout.sidebarPosition} sidebar, ${layout.bottomPanelPosition} dock)`,
    isBuiltIn: false,
    layout: {
      activityBarPosition: layout.activityBarPosition,
      sidebarPosition: layout.sidebarPosition,
      bottomPanelPosition: layout.bottomPanelPosition,
      statusBarPosition: layout.statusBarPosition,
      minimapPosition: layout.minimapPosition,
      sidebarWidth: layout.sidebarWidth || 260,
      bottomPanelHeight: layout.bottomPanelHeight || 220,
    },
  };

  const updated = [...custom, newPreset];
  return { presets: updated, newPreset };
}

export function deleteLayoutPreset(id: string, existingPresets?: LayoutPreset[]): LayoutPreset[] {
  const custom = Array.isArray(existingPresets) ? existingPresets : [];
  return custom.filter((p) => p.id !== id);
}
