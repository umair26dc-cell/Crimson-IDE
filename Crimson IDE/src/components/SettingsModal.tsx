/**
 * Settings and Configuration Modal
 * Customize Crimson Palette, Editor Preferences, AI Assistant, and Cloud Sync. Zero emojis!
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { PluginDefinition, UserSettings, TerminalBookmark, LayoutPreset } from '../types';
import { themeEngine } from '../lib/themeEngine';
import { EslintConfigSection } from './EslintConfigSection';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { clearTerminalHistoryFromStorage } from '../lib/terminalHistory';
import { AudioSettingsSection } from './AudioSettingsSection';
import { CustomCssSection } from './CustomCssSection';
import { WallpaperSection } from './WallpaperSection';
import { KeybindingsSection } from './KeybindingsSection';
import { SnippetsSection } from './SnippetsSection';
import { UiElementsSection } from './UiElementsSection';
import {
  getAvailableLayoutPresets,
  saveLayoutPreset,
  deleteLayoutPreset,
  isMatchingLayout,
  BUILTIN_LAYOUT_PRESETS,
} from '../lib/layoutPresets';
import { 
  TERMINAL_THEME_PRESETS, 
  TerminalThemePreset, 
  DEFAULT_TERMINAL_THEME,
  getCrimsonTerminalPalette,
  CRIMSON_SHADE_TERMINAL_PALETTES 
} from '../lib/terminalThemes';
import {
  loadTerminalBookmarks,
  saveTerminalBookmarks,
  addTerminalBookmark,
  removeTerminalBookmark,
  DEFAULT_TERMINAL_BOOKMARKS,
  TERMINAL_BOOKMARKS_CHANGED_EVENT,
  normalizeDirectoryPath,
} from '../lib/terminalBookmarks';

interface SyntaxTokenDef {
  key: 'keyword' | 'function' | 'string' | 'number' | 'comment' | 'type' | 'variable';
  label: string;
  variableName: string;
  description: string;
  examples: string;
}

const SYNTAX_TOKENS: SyntaxTokenDef[] = [
  {
    key: 'keyword',
    label: 'token-keyword (Keywords & Flow)',
    variableName: '--ide-token-keyword',
    description: 'Language keywords and control statements',
    examples: 'const, let, function, if, return, import, export',
  },
  {
    key: 'function',
    label: 'token-function (Functions & Methods)',
    variableName: '--ide-token-function',
    description: 'Function declarations and method calls',
    examples: 'initializeApp(), formatCode(), render(), console.log',
  },
  {
    key: 'string',
    label: 'token-string (Strings & Literals)',
    variableName: '--ide-token-string',
    description: 'String literals and template strings',
    examples: '"Hello World", `port: ${port}`, \'dark\'',
  },
  {
    key: 'number',
    label: 'token-number (Numbers & Booleans)',
    variableName: '--ide-token-number',
    description: 'Numeric literals, booleans, and constants',
    examples: '42, 3.14159, true, false, 0xFF',
  },
  {
    key: 'comment',
    label: 'token-comment (Comments & Docs)',
    variableName: '--ide-token-comment',
    description: 'Single-line, multi-line, and docstrings',
    examples: '// single line comment, /** JSDoc annotation */',
  },
  {
    key: 'type',
    label: 'token-type (Types & Interfaces)',
    variableName: '--ide-token-type',
    description: 'TypeScript types, interfaces, and classes',
    examples: 'string, number, UserProfile, Promise<T>, React.FC',
  },
  {
    key: 'variable',
    label: 'token-variable (Variables & Identifiers)',
    variableName: '--ide-token-variable',
    description: 'Variable names, parameters, regex, identifiers',
    examples: 'activeTab, fileList, count, match, regex',
  },
];

const SYNTAX_PRESETS = [
  {
    id: 'crimson',
    name: 'Crimson Scarlet',
    colors: {
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
    id: 'neon',
    name: 'Cyberpunk Neon',
    colors: {
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
    id: 'emerald',
    name: 'Emerald Matrix',
    colors: {
      keyword: '#10b981',
      function: '#34d399',
      string: '#a7f3d0',
      number: '#fbbf24',
      comment: '#475569',
      type: '#2dd4bf',
      variable: '#6ee7b7',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula Velvet',
    colors: {
      keyword: '#ff79c6',
      function: '#50fa7b',
      string: '#f1fa8c',
      number: '#bd93f9',
      comment: '#6272a4',
      type: '#8be9fd',
      variable: '#ffb86c',
    },
  },
  {
    id: 'frost',
    name: 'Nordic Frost',
    colors: {
      keyword: '#81a1c1',
      function: '#88c0d0',
      string: '#a3be8c',
      number: '#b48ead',
      comment: '#616e88',
      type: '#8fbcbb',
      variable: '#d8dee9',
    },
  },
  {
    id: 'gold',
    name: 'Solar Amber',
    colors: {
      keyword: '#f59e0b',
      function: '#fbbf24',
      string: '#fde68a',
      number: '#f97316',
      comment: '#78716c',
      type: '#ea580c',
      variable: '#fcd34d',
    },
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  activePluginToConfig: PluginDefinition | null;
  onClosePluginConfig: () => void;
  onUpdatePluginConfig: (pluginId: string, key: string, value: any) => void;
  onTriggerSync: () => void;
  onOpenThemeStore?: () => void;
  onToggleEditLayoutMode?: () => void;
  defaultTab?: 'editor' | 'terminal' | 'syntax' | 'eslint' | 'theme' | 'layout' | 'sync' | 'audio' | 'customCss' | 'wallpaper' | 'keybindings' | 'snippets' | 'uiElements';
  onExportEslintFiles?: (rcJsonContent: string, ignoreContent: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  activePluginToConfig,
  onClosePluginConfig,
  onUpdatePluginConfig,
  onTriggerSync,
  onOpenThemeStore,
  onToggleEditLayoutMode,
  defaultTab,
  onExportEslintFiles,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'editor'
    | 'terminal'
    | 'syntax'
    | 'eslint'
    | 'theme'
    | 'layout'
    | 'sync'
    | 'audio'
    | 'customCss'
    | 'wallpaper'
    | 'keybindings'
    | 'snippets'
    | 'uiElements'
  >('editor');
  const [historyClearSuccess, setHistoryClearSuccess] = useState(false);
  const [terminalThemeToast, setTerminalThemeToast] = useState<string | null>(null);
  const { isInstalled: isPWAInstalled } = usePWAInstall();

  const handleSelectTerminalTheme = (preset: TerminalThemePreset) => {
    onUpdateSettings({
      terminalTheme: preset.name,
      terminalThemeId: preset.id,
      terminalBackground: preset.background,
      terminalForeground: preset.foreground,
      terminalCursorColor: preset.cursorColor,
      terminalPromptColor: preset.promptColor,
      linkTerminalToCrimsonTheme: false,
    });
    setTerminalThemeToast(`Terminal theme set to "${preset.name}" and saved to user settings!`);
    setTimeout(() => setTerminalThemeToast(null), 3500);
  };

  const isTerminalLinked = Boolean(settings.linkTerminalToCrimsonTheme);
  const activeCrimsonPalette = getCrimsonTerminalPalette(settings.crimsonShade);

  const handleToggleLinkTerminalToCrimson = () => {
    const nextState = !isTerminalLinked;
    if (nextState) {
      onUpdateSettings({
        linkTerminalToCrimsonTheme: true,
        terminalTheme: activeCrimsonPalette.name,
        terminalThemeId: activeCrimsonPalette.id,
        terminalBackground: activeCrimsonPalette.background,
        terminalForeground: activeCrimsonPalette.foreground,
        terminalPromptColor: activeCrimsonPalette.promptColor,
        terminalCursorColor: activeCrimsonPalette.cursorColor,
      });
      setTerminalThemeToast(`Terminal color palette linked to active Crimson theme (${activeCrimsonPalette.name})!`);
    } else {
      onUpdateSettings({
        linkTerminalToCrimsonTheme: false,
      });
      setTerminalThemeToast('Terminal unlinked from Crimson theme. Palette can now be customized independently.');
    }
    setTimeout(() => setTerminalThemeToast(null), 3500);
  };

  // Terminal Directory Bookmarks State & Handlers
  const [bookmarks, setBookmarks] = useState<TerminalBookmark[]>(() => loadTerminalBookmarks());
  const [newBmName, setNewBmName] = useState('');
  const [newBmPath, setNewBmPath] = useState('');
  const [bmToast, setBmToast] = useState<string | null>(null);

  useEffect(() => {
    const handleBmChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setBookmarks(e.detail);
      } else {
        setBookmarks(loadTerminalBookmarks());
      }
    };
    window.addEventListener(TERMINAL_BOOKMARKS_CHANGED_EVENT as any, handleBmChange);
    return () => window.removeEventListener(TERMINAL_BOOKMARKS_CHANGED_EVENT as any, handleBmChange);
  }, []);

  const handleAddBookmark = () => {
    if (!newBmPath.trim()) return;
    const norm = normalizeDirectoryPath(newBmPath);
    const dName = newBmName.trim() || norm.split('/').pop() || 'workspace';
    const res = addTerminalBookmark(dName, norm);
    setBookmarks(res.bookmarks);
    setNewBmName('');
    setNewBmPath('');
    setBmToast(`Added bookmark: ${dName}`);
    setTimeout(() => setBmToast(null), 3000);
  };

  const handleRemoveBookmark = (id: string) => {
    const updated = removeTerminalBookmark(id);
    setBookmarks(updated);
    setBmToast('Bookmark removed');
    setTimeout(() => setBmToast(null), 2500);
  };

  const handleResetBookmarks = () => {
    saveTerminalBookmarks(DEFAULT_TERMINAL_BOOKMARKS);
    setBookmarks([...DEFAULT_TERMINAL_BOOKMARKS]);
    setBmToast('Bookmarks restored to default list');
    setTimeout(() => setBmToast(null), 2500);
  };

  // Layout Presets State & Handlers
  const [newLayoutPresetName, setNewLayoutPresetName] = useState('');
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);
  const [layoutPresetToast, setLayoutPresetToast] = useState<string | null>(null);

  const handleLoadLayoutPreset = (preset: LayoutPreset) => {
    onUpdateSettings({
      layoutConfig: {
        ...(settings.layoutConfig || {}),
        ...preset.layout,
      },
      activeLayoutPresetId: preset.id,
    });
    setLayoutPresetToast(`Loaded layout preset: "${preset.name}"`);
    setTimeout(() => setLayoutPresetToast(null), 3000);
  };

  const handleSaveCurrentLayoutPreset = () => {
    if (!newLayoutPresetName.trim()) return;
    const currentLayout = settings.layoutConfig || {
      activityBarPosition: 'left',
      sidebarPosition: 'left',
      bottomPanelPosition: 'bottom',
      statusBarPosition: 'bottom',
      minimapPosition: 'right',
      sidebarWidth: 260,
      bottomPanelHeight: 220,
    };
    const { presets, newPreset } = saveLayoutPreset(
      newLayoutPresetName.trim(),
      currentLayout,
      settings.savedLayoutPresets
    );
    onUpdateSettings({
      savedLayoutPresets: presets,
      activeLayoutPresetId: newPreset.id,
    });
    setNewLayoutPresetName('');
    setShowSavePresetInput(false);
    setLayoutPresetToast(`Saved new layout preset: "${newPreset.name}"`);
    setTimeout(() => setLayoutPresetToast(null), 3500);
  };

  const handleDeleteLayoutPreset = (id: string) => {
    const updated = deleteLayoutPreset(id, settings.savedLayoutPresets);
    onUpdateSettings({
      savedLayoutPresets: updated,
      activeLayoutPresetId: settings.activeLayoutPresetId === id ? 'default-view' : settings.activeLayoutPresetId,
    });
    setLayoutPresetToast('Custom layout preset removed');
    setTimeout(() => setLayoutPresetToast(null), 2500);
  };

  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Syntax Highlighting Color Variables State
  const [syntaxColors, setSyntaxColors] = useState(() => {
    const active = themeEngine.getActiveTheme();
    return {
      keyword: active?.colors?.keyword || '#f43f5e',
      function: active?.colors?.function || '#fb7185',
      string: active?.colors?.string || '#fda4af',
      number: active?.colors?.number || '#f59e0b',
      comment: active?.colors?.comment || '#64748b',
      type: active?.colors?.type || '#f97316',
      variable: active?.colors?.variable || '#f43f5e',
    };
  });
  const [syntaxSaveStatus, setSyntaxSaveStatus] = useState<string | null>(null);

  // Sync syntax colors when modal opens or active theme changes
  useEffect(() => {
    if (isOpen) {
      const active = themeEngine.getActiveTheme();
      if (active?.colors) {
        setSyntaxColors({
          keyword: active.colors.keyword || '#f43f5e',
          function: active.colors.function || '#fb7185',
          string: active.colors.string || '#fda4af',
          number: active.colors.number || '#f59e0b',
          comment: active.colors.comment || '#64748b',
          type: active.colors.type || '#f97316',
          variable: active.colors.variable || '#f43f5e',
        });
      }
    }
  }, [isOpen, settings.activeThemeId]);

  const handleSyntaxColorChange = (key: keyof typeof syntaxColors, color: string) => {
    const updated = { ...syntaxColors, [key]: color };
    setSyntaxColors(updated);
    themeEngine.applySyntaxTokenCSSVariables(updated);
  };

  const handleSaveSyntaxColors = () => {
    const updatedTheme = themeEngine.updateSyntaxTokenColors(syntaxColors);
    onUpdateSettings({
      activeThemeId: updatedTheme.id,
      customThemes: themeEngine.getAllThemes().filter((t) => t.isCustom),
    });
    setSyntaxSaveStatus('Syntax token colors saved and persisted to Theme Engine!');
    setTimeout(() => setSyntaxSaveStatus(null), 3500);
  };

  const handleResetSyntaxColors = () => {
    const resetTheme = themeEngine.resetSyntaxTokenColors();
    if (resetTheme?.colors) {
      const fresh = {
        keyword: resetTheme.colors.keyword,
        function: resetTheme.colors.function,
        string: resetTheme.colors.string,
        number: resetTheme.colors.number,
        comment: resetTheme.colors.comment,
        type: resetTheme.colors.type,
        variable: resetTheme.colors.variable,
      };
      setSyntaxColors(fresh);
      onUpdateSettings({
        activeThemeId: resetTheme.id,
        customThemes: themeEngine.getAllThemes().filter((t) => t.isCustom),
      });
      setSyntaxSaveStatus('Reset syntax tokens to base theme defaults!');
      setTimeout(() => setSyntaxSaveStatus(null), 3500);
    }
  };

  const handleApplySyntaxPreset = (presetColors: typeof syntaxColors) => {
    setSyntaxColors(presetColors);
    themeEngine.applySyntaxTokenCSSVariables(presetColors);
    const updatedTheme = themeEngine.updateSyntaxTokenColors(presetColors);
    onUpdateSettings({
      activeThemeId: updatedTheme.id,
      customThemes: themeEngine.getAllThemes().filter((t) => t.isCustom),
    });
    setSyntaxSaveStatus('Preset applied & persisted to Theme Engine!');
    setTimeout(() => setSyntaxSaveStatus(null), 3500);
  };

  const handleClearHistoryFromSettings = () => {
    clearTerminalHistoryFromStorage();
    setHistoryClearSuccess(true);
    setTimeout(() => setHistoryClearSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        id="crimson-settings-dialog"
        className="w-full max-w-2xl bg-[#12131b] border border-rose-900/60 rounded-xl shadow-2xl shadow-rose-950/40 overflow-hidden flex flex-col max-h-[85vh] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-6 border-b border-[#222432] bg-[#0e0f16] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-500 font-semibold font-mono text-sm">
            <FontAwesomeIcon icon={activePluginToConfig ? ICONS.plugins : ICONS.settings} />
            <span className="text-slate-200">
              {activePluginToConfig ? `Configure Extension: ${activePluginToConfig.name}` : 'CsCode Preferences (Crimson Code)'}
            </span>
          </div>
          <button
            onClick={() => {
              if (activePluginToConfig) onClosePluginConfig();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1f202e] rounded transition-colors"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Content Body */}
        {activePluginToConfig ? (
          /* Extension Specific Config */
          <div className="p-6 space-y-4 overflow-y-auto">
            <p className="text-xs text-slate-400 font-mono">
              Adjust configuration parameters for {activePluginToConfig.name} (v{activePluginToConfig.version})
            </p>
            <div className="space-y-3">
              {activePluginToConfig.config?.map((field) => (
                <div key={field.key} className="p-3 rounded border border-[#222432] bg-[#161722] flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block">{field.label}</label>
                    <span className="text-[10px] text-slate-400 font-mono">{field.key}</span>
                  </div>

                  {field.type === 'boolean' && (
                    <button
                      onClick={() => onUpdatePluginConfig(activePluginToConfig.id, field.key, !field.value)}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        field.value ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#222432] text-slate-400'
                      }`}
                    >
                      {field.value ? 'ENABLED' : 'DISABLED'}
                    </button>
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={field.value}
                      onChange={(e) => onUpdatePluginConfig(activePluginToConfig.id, field.key, Number(e.target.value))}
                      className="w-24 bg-[#0d0e14] border border-[#2e3144] rounded px-2 py-1 text-xs text-slate-200 font-mono text-center outline-none focus:border-rose-500"
                    />
                  )}

                  {field.type === 'select' && field.options && (
                    <select
                      value={field.value}
                      onChange={(e) => onUpdatePluginConfig(activePluginToConfig.id, field.key, e.target.value)}
                      className="bg-[#0d0e14] border border-[#2e3144] rounded px-2.5 py-1 text-xs text-slate-200 font-mono outline-none focus:border-rose-500"
                    >
                      {field.options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => {
                  onClosePluginConfig();
                  onTriggerSync();
                }}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-mono font-medium"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* General Settings View */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Nav */}
            <div className="w-44 bg-[#0d0e14] border-r border-[#222432] p-2 space-y-1 font-mono text-xs">
              <button
                onClick={() => setActiveTab('editor')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'editor' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.code} className="text-xs" />
                <span>Text Editor</span>
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'terminal' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.terminal} className="text-xs" />
                <span>Terminal</span>
              </button>
              <button
                id="settings-nav-syntax-tab-btn"
                onClick={() => setActiveTab('syntax')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'syntax' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.wand} className="text-xs" />
                <span>Syntax Colors</span>
              </button>
              <button
                id="settings-nav-eslint-tab-btn"
                onClick={() => setActiveTab('eslint')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'eslint' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.check} className="text-xs text-rose-400" />
                <span>ESLint & Rules</span>
              </button>
              <button
                onClick={() => setActiveTab('theme')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'theme' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.palette} className="text-xs" />
                <span>Themes & Colors</span>
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'layout' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.layout} className="text-xs" />
                <span>Layout & Panels</span>
              </button>
              <button
                onClick={() => setActiveTab('sync')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'sync' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.cloud} className="text-xs" />
                <span>Cloud Settings</span>
              </button>
              <div className="pt-2 pb-1 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-t border-[#1d1f2c]">
                Customization
              </div>
              <button
                onClick={() => setActiveTab('audio')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'audio' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.volume} className="text-xs" />
                <span>Audio & Haptics</span>
              </button>
              <button
                onClick={() => setActiveTab('customCss')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'customCss' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.code} className="text-xs" />
                <span>Custom CSS</span>
              </button>
              <button
                onClick={() => setActiveTab('wallpaper')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'wallpaper' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.image} className="text-xs" />
                <span>Wallpaper & Aura</span>
              </button>
              <button
                onClick={() => setActiveTab('uiElements')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'uiElements' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.sliders} className="text-xs" />
                <span>Tabs & Rulers</span>
              </button>
              <button
                onClick={() => setActiveTab('keybindings')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'keybindings' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.keyboard} className="text-xs" />
                <span>Shortcuts / Keymap</span>
              </button>
              <button
                onClick={() => setActiveTab('snippets')}
                className={`w-full text-left px-3 py-2 rounded flex items-center space-x-2 transition-colors ${
                  activeTab === 'snippets' ? 'bg-[#1b1c28] text-rose-400 font-semibold' : 'text-slate-400 hover:bg-[#14151e]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.bolt} className="text-xs" />
                <span>Code Snippets</span>
              </button>
            </div>

            {/* Right Pane */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* TAB 1: TEXT EDITOR */}
              {activeTab === 'editor' && (
                <div className="space-y-4">
                  {/* Progressive Web App (PWA) Standalone Installation Card */}
                  <div className="p-3.5 rounded-xl border border-rose-900/60 bg-gradient-to-r from-rose-950/30 to-[#12131f] flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2 text-xs font-semibold text-rose-300">
                        <FontAwesomeIcon icon={ICONS.laptop} className="text-rose-400" />
                        <span>Progressive Web App (PWA) & Offline Access</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900/60 border border-rose-800 text-rose-200 font-mono">
                          Offline-Ready
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 max-w-md">
                        Install CsCode Crimson IDE as a native desktop or mobile application with offline workspace caching, zero browser bars, and instant launch.
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isPWAInstalled ? (
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-mono">
                          <FontAwesomeIcon icon={ICONS.circleCheck} className="text-emerald-400" />
                          <span>Installed & Active</span>
                        </div>
                      ) : (
                        <PWAInstallButton variant="full" />
                      )}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Font Size</div>
                      <div className="text-[11px] text-slate-400">Controls font size in pixels.</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {[12, 14, 16, 18].map((size) => (
                        <button
                          key={size}
                          onClick={() => onUpdateSettings({ fontSize: size })}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                            settings.fontSize === size 
                              ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                              : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Size */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Tab Size</div>
                      <div className="text-[11px] text-slate-400">Number of spaces equivalent to one tab.</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          onClick={() => onUpdateSettings({ tabSize: size })}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                            settings.tabSize === size 
                              ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                              : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Word Wrap Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                        <span>Editor: Word Wrap</span>
                        {settings.wordWrap ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                            ENABLED
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono font-bold">
                            DISABLED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Wrap long lines to fit the viewport width using CSS <code className="text-rose-300">white-space: pre-wrap</code>.
                      </div>
                    </div>
                    <button
                      id="settings-editor-wordwrap-toggle"
                      onClick={() => onUpdateSettings({ wordWrap: !settings.wordWrap })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                        settings.wordWrap ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.wordWrap ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Line Numbers Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Line Numbers</div>
                      <div className="text-[11px] text-slate-400">Render gutter with line numbers.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ lineNumbers: !settings.lineNumbers })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.lineNumbers ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.lineNumbers ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Breadcrumbs Navigation Bar Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Breadcrumbs</div>
                      <div className="text-[11px] text-slate-400">Show file path breadcrumbs with interactive folder navigation at top of editor.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ breadcrumbs: settings.breadcrumbs !== false ? false : true })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.breadcrumbs !== false ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.breadcrumbs !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Code Folding Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Code Folding</div>
                      <div className="text-[11px] text-slate-400">Collapse and expand code blocks based on indentation levels.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ codeFolding: !settings.codeFolding })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.codeFolding ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.codeFolding ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Code Lens Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Code Lens (References)</div>
                      <div className="text-[11px] text-slate-400">Display references count (e.g. &apos;3 references&apos;) above function definitions with interactive peek.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ codeLens: settings.codeLens === false ? true : false })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.codeLens !== false ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.codeLens !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Minimap Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Minimap</div>
                      <div className="text-[11px] text-slate-400">Displays visual code minimap to the right of the gutter for large file navigation.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ minimap: !settings.minimap })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.minimap ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.minimap ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Minimap Scale Factor (Zoom In / Zoom Out) */}
                  {settings.minimap && (
                    <div className="flex flex-col space-y-2.5 pb-3 border-b border-[#202230]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-200">Editor: Minimap Scale Factor</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              {(settings.minimapScale || 1.0).toFixed(1)}x
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Controls the overview zoom factor (0.5x to 2.5x) to zoom in or out of the code visualization.
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center space-x-1">
                          {[0.5, 0.75, 1.0, 1.5, 2.0].map((preset) => (
                            <button
                              key={preset}
                              onClick={() => onUpdateSettings({ minimapScale: preset })}
                              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                                Math.abs((settings.minimapScale || 1.0) - preset) < 0.05
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                                  : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200 hover:bg-[#202230]'
                              }`}
                              title={`Set zoom to ${preset}x`}
                            >
                              {preset}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Continuous Slider */}
                      <div className="flex items-center space-x-3 bg-[#0e0f17] px-3 py-2 rounded border border-[#1e202e]">
                        <span className="text-[10px] font-mono text-slate-400">0.5x (Zoom Out)</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={settings.minimapScale || 1.0}
                          onChange={(e) => onUpdateSettings({ minimapScale: parseFloat(e.target.value) })}
                          className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-[#1b1c28] rounded-lg appearance-none"
                        />
                        <span className="text-[10px] font-mono text-slate-400">2.5x (Zoom In)</span>
                      </div>
                    </div>
                  )}

                  {/* Auto-Save Toggle & Interval Setting */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Auto-Save</div>
                      <div className="text-[11px] text-slate-400">Periodically save any dirty files to local state every 30 seconds.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ autoSave: !settings.autoSave })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.autoSave ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.autoSave ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Auto-Save Interval */}
                  {settings.autoSave && (
                    <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Auto-Save Interval</div>
                        <div className="text-[11px] text-slate-400">Duration in seconds between automatic background saves.</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {[
                          { sec: 10, label: '10s' },
                          { sec: 30, label: '30s (Default)' },
                          { sec: 60, label: '60s' },
                          { sec: 120, label: '2m' }
                        ].map((interval) => (
                          <button
                            key={interval.sec}
                            onClick={() => onUpdateSettings({ autoSaveDelayMs: interval.sec * 1000 })}
                            className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                              (settings.autoSaveDelayMs || 30000) === interval.sec * 1000
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {interval.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Format on Save */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Editor: Format On Save</div>
                      <div className="text-[11px] text-slate-400">Automatically run code formatter on save.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ formatOnSave: !settings.formatOnSave })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.formatOnSave ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.formatOnSave ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Terminal: Command History Persistence (Editor View) */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Terminal: Command History Persistence</div>
                      <div className="text-[11px] text-slate-400">
                        Persist previously executed terminal commands across browser sessions in local storage.
                      </div>
                    </div>
                    <button
                      id="settings-terminal-persist-history-editor-toggle"
                      onClick={() =>
                        onUpdateSettings({
                          terminalPersistHistory: settings.terminalPersistHistory === false ? true : false,
                        })
                      }
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                        settings.terminalPersistHistory !== false
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                          : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.terminalPersistHistory !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: TERMINAL */}
              {activeTab === 'terminal' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                      <FontAwesomeIcon icon={ICONS.terminal} className="text-rose-400 text-xs" />
                      <span>Terminal & Shell Preferences</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure command history persistence, cycle controls, and terminal storage behavior.
                    </p>
                  </div>

                  {/* Feedback Toast for Terminal Theme */}
                  {terminalThemeToast && (
                    <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={ICONS.check} className="text-emerald-400" />
                        <span>{terminalThemeToast}</span>
                      </div>
                      <button
                        onClick={() => setTerminalThemeToast(null)}
                        className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={ICONS.close} />
                      </button>
                    </div>
                  )}

                  {/* Setting: Link Terminal's Color Palette to IDE Active Crimson Theme */}
                  <div className="p-4 bg-[#0e0f17] border border-[#202232] rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon
                            icon={isTerminalLinked ? ICONS.link : ICONS.unlink}
                            className={`text-xs ${isTerminalLinked ? 'text-rose-400' : 'text-slate-500'}`}
                          />
                          <h4 className="text-xs font-bold font-mono text-slate-100">
                            Link Terminal Color Palette to Active Crimson Theme
                          </h4>
                          {isTerminalLinked ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>LINKED: {activeCrimsonPalette.name}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#181924] text-slate-400 border border-[#26283b] font-mono">
                              INDEPENDENT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Synchronize terminal canvas, prompt, cursor, and text colors with the IDE's active crimson theme ({settings.crimsonShade || 'ruby'}). When changing crimson shades in settings or theme presets, the terminal dynamically updates in real-time.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="link-terminal-crimson-theme-toggle"
                        onClick={handleToggleLinkTerminalToCrimson}
                        className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
                          isTerminalLinked
                            ? 'bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900 shadow-md ring-1 ring-rose-500/50'
                            : 'bg-[#181926] hover:bg-[#222436] text-slate-300 border border-[#2c2f44]'
                        }`}
                      >
                        <FontAwesomeIcon icon={isTerminalLinked ? ICONS.link : ICONS.unlink} className="text-xs" />
                        <span>{isTerminalLinked ? 'LINKED TO THEME' : 'LINK PALETTE'}</span>
                      </button>
                    </div>

                    {/* Active Linked Tokens Strip */}
                    {isTerminalLinked && (
                      <div className="pt-2 border-t border-[#1b1c28] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <div className="flex items-center space-x-3">
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Synchronized Palette Tokens:</span>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1" title="Terminal Background">
                              <span className="w-3 h-3 rounded-xs border border-white/20 shadow-xs" style={{ backgroundColor: activeCrimsonPalette.background }} />
                              <span className="text-[10px] text-slate-300">Bg: {activeCrimsonPalette.background}</span>
                            </div>
                            <div className="flex items-center space-x-1" title="Terminal Prompt">
                              <span className="w-3 h-3 rounded-xs border border-white/20 shadow-xs" style={{ backgroundColor: activeCrimsonPalette.promptColor }} />
                              <span className="text-[10px] text-slate-300">Prompt: {activeCrimsonPalette.promptColor}</span>
                            </div>
                            <div className="flex items-center space-x-1" title="Terminal Cursor">
                              <span className="w-3 h-3 rounded-xs border border-white/20 shadow-xs" style={{ backgroundColor: activeCrimsonPalette.cursorColor }} />
                              <span className="text-[10px] text-slate-300">Cursor: {activeCrimsonPalette.cursorColor}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-rose-400 font-semibold">
                          Live Sync Active &bull; Matches {settings.crimsonShade || 'ruby'} shade
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Terminal Theme Selector Section */}
                  <div className="p-4 bg-[#0e0f17] border border-[#202232] rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#1b1c28]">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-slate-100 flex items-center space-x-2">
                          <FontAwesomeIcon icon={ICONS.wand} className="text-rose-400 text-xs" />
                          <span>Terminal Color Themes</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Choose between preset color themes like Crimson Night, Cyberpunk, and Monokai for the built-in terminal.
                        </p>
                      </div>

                      {/* Quick Dropdown and Reset controls */}
                      <div className="flex items-center space-x-2">
                        <select
                          id="terminal-theme-select"
                          value={
                            isTerminalLinked
                              ? 'linked'
                              : TERMINAL_THEME_PRESETS.find(
                                  (p) =>
                                    p.id === settings.terminalThemeId ||
                                    p.name === settings.terminalTheme ||
                                    (p.background === settings.terminalBackground && p.foreground === settings.terminalForeground)
                                )?.id || 'crimson-night'
                          }
                          onChange={(e) => {
                            if (e.target.value === 'linked') {
                              if (!isTerminalLinked) handleToggleLinkTerminalToCrimson();
                            } else {
                              const found = TERMINAL_THEME_PRESETS.find((p) => p.id === e.target.value);
                              if (found) handleSelectTerminalTheme(found);
                            }
                          }}
                          className="bg-[#141520] border border-[#2b2d40] text-slate-200 text-xs font-mono rounded px-2.5 py-1 outline-none focus:border-rose-500 cursor-pointer"
                        >
                          {isTerminalLinked && (
                            <option value="linked">
                              Linked: {activeCrimsonPalette.name}
                            </option>
                          )}
                          {TERMINAL_THEME_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          id="reset-terminal-theme-btn"
                          onClick={() => handleSelectTerminalTheme(DEFAULT_TERMINAL_THEME)}
                          title="Reset to default Crimson Night"
                          className="px-2.5 py-1 bg-[#181926] hover:bg-[#222436] border border-[#2c2f44] text-slate-300 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <FontAwesomeIcon icon={ICONS.sync} className="text-[10px]" />
                          <span>Default</span>
                        </button>
                      </div>
                    </div>

                    {/* Notification if palette is currently linked */}
                    {isTerminalLinked && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon icon={ICONS.link} className="text-rose-400 text-xs" />
                          <span>Terminal palette is currently linked to <strong>{activeCrimsonPalette.name}</strong>. Selecting any preset below will unlink the palette.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleLinkTerminalToCrimson}
                          className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-white text-[10px] font-mono cursor-pointer shrink-0"
                        >
                          Unlink
                        </button>
                      </div>
                    )}

                    {/* Presets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {TERMINAL_THEME_PRESETS.map((preset) => {
                        const isActive =
                          settings.terminalThemeId === preset.id ||
                          settings.terminalTheme === preset.name ||
                          (!settings.terminalThemeId &&
                            !settings.terminalTheme &&
                            preset.id === 'crimson-night' &&
                            (!settings.terminalBackground || settings.terminalBackground === '#090a0f')) ||
                          (settings.terminalBackground === preset.background &&
                            settings.terminalForeground === preset.foreground &&
                            settings.terminalPromptColor === preset.promptColor);

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectTerminalTheme(preset)}
                            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden group ${
                              isActive
                                ? 'border-rose-500 bg-[#161826] ring-1 ring-rose-500 shadow-lg'
                                : 'border-[#222434] bg-[#0b0c13] hover:border-slate-600 hover:bg-[#12131e]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold font-mono text-slate-200 group-hover:text-white truncate">
                                {preset.name}
                              </span>
                              {isActive ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {preset.id}
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-400 font-mono line-clamp-2 h-7 leading-3.5">
                              {preset.description}
                            </p>

                            {/* Mini Terminal Preview Canvas */}
                            <div
                              className="w-full rounded p-2 flex flex-col justify-between border border-[#25283a] transition-all"
                              style={{ backgroundColor: preset.background }}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                                <span style={{ color: preset.promptColor, fontWeight: 700 }}>
                                  ccode$
                                </span>
                                <div className="flex items-center space-x-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: preset.promptColor }}
                                    title="Prompt Color"
                                  />
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: preset.cursorColor }}
                                    title="Cursor Color"
                                  />
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: preset.foreground }}
                                    title="Foreground Color"
                                  />
                                </div>
                              </div>
                              <div className="pt-1.5 flex items-center space-x-1 text-[10px] font-mono">
                                <span style={{ color: preset.foreground }}>echo "OK"</span>
                                <span
                                  className="inline-block w-1.5 h-3"
                                  style={{ backgroundColor: preset.cursorColor }}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Live Sandbox Preview for Currently Selected Theme */}
                    <div className="p-3 bg-[#0a0b12] border border-[#222436] rounded-lg space-y-2 font-mono">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={ICONS.terminal} className="text-rose-400 text-[10px]" />
                          <span>Live Terminal Preview</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#161826] text-rose-300 border border-rose-900 font-mono flex items-center space-x-1">
                          {isTerminalLinked && <FontAwesomeIcon icon={ICONS.link} className="text-[9px] text-rose-400" />}
                          <span>Theme: {isTerminalLinked ? `${activeCrimsonPalette.name} (Linked)` : (settings.terminalTheme || 'Crimson Night')} &bull; {settings.terminalFontSize || 12}px</span>
                        </span>
                      </div>

                      <div
                        className="p-3 rounded-lg border border-[#1f2130] space-y-1.5 text-xs transition-colors"
                        style={{
                          backgroundColor: settings.terminalBackground || '#090a0f',
                          color: settings.terminalForeground || '#cbd5e1',
                          fontFamily: settings.terminalFontFamily || 'JetBrains Mono',
                          fontSize: `${settings.terminalFontSize || 12}px`,
                        }}
                      >
                        <div className="opacity-60 text-[11px]">
                          CsCode Terminal — Built-in shell initialized ({settings.terminalTheme || 'Crimson Night'})
                        </div>
                        <div className="flex items-center space-x-1">
                          <span style={{ color: settings.terminalPromptColor || '#fb7185', fontWeight: 700 }}>
                            ccode@crimson:~/workspace${' '}
                          </span>
                          <span style={{ color: settings.terminalForeground || '#cbd5e1' }}>
                            npm run build
                          </span>
                        </div>
                        <div className="text-emerald-400 text-[11px]">
                          ✓ Compiled workspace in 84ms
                        </div>
                        <div className="flex items-center space-x-1">
                          <span style={{ color: settings.terminalPromptColor || '#fb7185', fontWeight: 700 }}>
                            ccode@crimson:~/workspace${' '}
                          </span>
                          <span style={{ color: settings.terminalForeground || '#cbd5e1' }}>
                            git status
                          </span>
                          <span
                            className="inline-block w-2 h-3.5 align-middle animate-pulse"
                            style={{ backgroundColor: settings.terminalCursorColor || '#f43f5e' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Font Size Slider (Independent from Code Editor) */}
                  <div id="settings-terminal-font-size-section" className="p-4 bg-[#0e0f17] border border-[#202232] rounded-xl space-y-3 font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#1b1c28]">
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                          <FontAwesomeIcon icon={ICONS.font} className="text-rose-400 text-xs" />
                          <span>Terminal Font Size</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            {settings.terminalFontSize || 12}px
                          </span>
                          {(settings.terminalFontSize || 12) === 12 ? (
                            <span className="text-[9px] text-slate-500 font-normal">
                              (Default)
                            </span>
                          ) : (
                            <span className="text-[9px] text-rose-400 font-normal">
                              (Custom)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Adjust font size of the integrated terminal shell independently from the code editor (Editor font size: {settings.fontSize || 14}px).
                        </p>
                      </div>

                      {/* Quick Reset to Default Button */}
                      {(settings.terminalFontSize || 12) !== 12 && (
                        <button
                          type="button"
                          id="settings-terminal-font-size-reset-btn"
                          onClick={() => onUpdateSettings({ terminalFontSize: 12 })}
                          className="px-2.5 py-1 bg-[#181926] hover:bg-[#222436] border border-[#2c2f44] text-slate-300 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                          title="Reset terminal font size to default 12px"
                        >
                          <FontAwesomeIcon icon={ICONS.sync} className="text-[10px]" />
                          <span>Reset (12px)</span>
                        </button>
                      )}
                    </div>

                    {/* Continuous Range Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 bg-[#0a0b12] px-3.5 py-2.5 rounded-lg border border-[#1e202e]">
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">9px (Compact)</span>
                        <input
                          id="settings-terminal-font-size-slider"
                          type="range"
                          min="9"
                          max="24"
                          step="1"
                          value={settings.terminalFontSize || 12}
                          onChange={(e) => onUpdateSettings({ terminalFontSize: parseInt(e.target.value, 10) })}
                          className="flex-1 accent-rose-500 cursor-pointer h-2 bg-[#1b1c28] rounded-lg appearance-none"
                          title={`Terminal Font Size: ${settings.terminalFontSize || 12}px`}
                        />
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">24px (Large)</span>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-slate-500 uppercase">Presets:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[10, 11, 12, 14, 16, 18, 20].map((size) => {
                            const isCurrent = (settings.terminalFontSize || 12) === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => onUpdateSettings({ terminalFontSize: size })}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold shadow-xs'
                                    : 'bg-[#141522] text-slate-400 hover:text-slate-200 border border-[#232536]'
                                }`}
                              >
                                {size}px{size === 12 ? ' *' : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Live Terminal Specimen Preview */}
                    <div 
                      className="p-2.5 rounded border border-[#1b1d2a] bg-[#08080e] text-slate-300 transition-all overflow-x-auto truncate"
                      style={{
                        fontFamily: settings.terminalFontFamily || 'JetBrains Mono',
                        fontSize: `${settings.terminalFontSize || 12}px`,
                      }}
                    >
                      <span className="text-rose-400 font-bold">ccode@crimson:~$</span>{' '}
                      <span className="text-slate-200">echo "Terminal font scale preview: {settings.terminalFontSize || 12}px"</span>{' '}
                      <span className="text-emerald-400">&rarr; OK</span>
                    </div>
                  </div>

                  {/* Command History Persistence Toggle */}
                  <div className="p-3.5 bg-[#0f1017] border border-[#222434] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                        <span>Command History Persistence</span>
                        {settings.terminalPersistHistory !== false ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                            ENABLED
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                            DISABLED (SESSION ONLY)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                        When enabled, previously typed terminal commands are saved to local storage so they remain available when reloading or opening new sessions. When disabled, history is kept only in memory during the active session.
                      </div>
                    </div>

                    <button
                      id="settings-terminal-persist-history-toggle"
                      onClick={() =>
                        onUpdateSettings({
                          terminalPersistHistory: settings.terminalPersistHistory === false ? true : false,
                        })
                      }
                      className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                        settings.terminalPersistHistory !== false
                          ? 'bg-rose-950 text-rose-300 border border-rose-700 font-semibold shadow-xs'
                          : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200 border border-[#2a2c3d]'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={settings.terminalPersistHistory !== false ? ICONS.check : ICONS.close}
                        className="text-[10px]"
                      />
                      <span>{settings.terminalPersistHistory !== false ? 'PERSISTENCE ON' : 'PERSISTENCE OFF'}</span>
                    </button>
                  </div>

                  {/* Clear Command History Action Card */}
                  <div className="p-3.5 bg-[#0f1017] border border-[#222434] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Clear Terminal Command History</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Permanently purge stored command history entries from browser local storage and active recall buffer.
                      </div>
                      {historyClearSuccess && (
                        <div className="text-[10px] text-emerald-400 mt-1 font-mono flex items-center space-x-1 animate-fadeIn">
                          <FontAwesomeIcon icon={ICONS.check} className="text-[9px]" />
                          <span>Command history cleared from local storage successfully!</span>
                        </div>
                      )}
                    </div>

                    <button
                      id="settings-clear-terminal-history-btn"
                      onClick={handleClearHistoryFromSettings}
                      className="px-3.5 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 hover:border-rose-600 text-xs font-mono transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <FontAwesomeIcon icon={ICONS.trash} className="text-[10px]" />
                      <span>Clear History Now</span>
                    </button>
                  </div>

                  {/* Terminal Directory Bookmarks Management Card */}
                  <div id="settings-terminal-bookmarks-section" className="p-4 bg-[#0e0f17] border border-[#202232] rounded-xl space-y-3 font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#1b1c28]">
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                          <FontAwesomeIcon icon={ICONS.bookmark} className="text-rose-400 text-xs" />
                          <span>Terminal Directory Bookmarks</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            {bookmarks.length} saved
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Save workspace directory paths as named bookmarks for instant jumping using the terminal toolbar or the <code className="text-rose-300">bm go &lt;name&gt;</code> command.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="settings-reset-bookmarks-btn"
                        onClick={handleResetBookmarks}
                        className="px-2.5 py-1 bg-[#181926] hover:bg-[#222436] border border-[#2c2f44] text-slate-300 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                        title="Reset bookmarks to workspace defaults"
                      >
                        <FontAwesomeIcon icon={ICONS.sync} className="text-[10px]" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>

                    {bmToast && (
                      <div className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1.5 animate-fadeIn">
                        <FontAwesomeIcon icon={ICONS.check} className="text-[10px]" />
                        <span>{bmToast}</span>
                      </div>
                    )}

                    {/* Bookmarks List */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {bookmarks.map((bm, index) => (
                        <div
                          key={bm.id}
                          className="flex items-center justify-between p-2 rounded bg-[#0a0b12] border border-[#1d1f2d] hover:border-[#2a2d42] transition-colors"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-[10px] text-slate-500 font-mono w-4 shrink-0">#{index + 1}</span>
                            <FontAwesomeIcon icon={ICONS.folder} className="text-amber-400/80 text-[11px] shrink-0" />
                            <span className="text-xs font-semibold text-slate-200 truncate">{bm.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono truncate">&rarr; {bm.path}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveBookmark(bm.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded cursor-pointer shrink-0 ml-2"
                            title={`Remove bookmark "${bm.name}"`}
                          >
                            <FontAwesomeIcon icon={ICONS.trash} className="text-[10px]" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Bookmark Row */}
                    <div className="pt-2 border-t border-[#1b1c28] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={newBmName}
                        onChange={(e) => setNewBmName(e.target.value)}
                        placeholder="Bookmark Name (e.g. Utils)"
                        className="px-2.5 py-1.5 bg-[#0a0b12] border border-[#232537] rounded text-slate-200 text-xs font-mono outline-none focus:border-rose-500 sm:w-40"
                      />
                      <input
                        type="text"
                        value={newBmPath}
                        onChange={(e) => setNewBmPath(e.target.value)}
                        placeholder="Directory Path (e.g. ~/workspace/src/utils)"
                        className="flex-1 px-2.5 py-1.5 bg-[#0a0b12] border border-[#232537] rounded text-slate-200 text-xs font-mono outline-none focus:border-rose-500"
                      />
                      <button
                        type="button"
                        id="settings-add-bookmark-btn"
                        onClick={handleAddBookmark}
                        disabled={!newBmPath.trim()}
                        className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 disabled:opacity-40 text-rose-200 border border-rose-700 text-xs font-mono font-semibold rounded transition-colors cursor-pointer flex items-center justify-center space-x-1 shrink-0"
                      >
                        <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
                        <span>Add Bookmark</span>
                      </button>
                    </div>
                  </div>

                  {/* Terminal Styling Summary Card */}
                  <div className="p-3.5 bg-[#0a0b0f] border border-[#1f212f] rounded-lg space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-xs font-semibold">
                        Active Terminal Styling &mdash; <span className="text-rose-400">{settings.terminalTheme || 'Crimson Night'}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {settings.terminalFontFamily || 'JetBrains Mono'} ({settings.terminalFontSize || 12}px)
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[#090a0f] border border-[#1c1d28] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-4 h-4 rounded border border-slate-700 shadow-xs" 
                          style={{ backgroundColor: settings.terminalBackground || '#090a0f' }} 
                          title={`Background: ${settings.terminalBackground || '#090a0f'}`}
                        />
                        <span 
                          className="w-4 h-4 rounded border border-slate-700" 
                          style={{ backgroundColor: settings.terminalForeground || '#cbd5e1' }} 
                          title={`Foreground: ${settings.terminalForeground || '#cbd5e1'}`}
                        />
                        <span 
                          className="w-4 h-4 rounded border border-slate-700" 
                          style={{ backgroundColor: settings.terminalPromptColor || '#fb7185' }} 
                          title={`Prompt: ${settings.terminalPromptColor || '#fb7185'}`}
                        />
                        <span 
                          className="w-4 h-4 rounded border border-slate-700" 
                          style={{ backgroundColor: settings.terminalCursorColor || '#f43f5e' }} 
                          title={`Caret: ${settings.terminalCursorColor || '#f43f5e'}`}
                        />
                        <span className="text-[11px] text-slate-400 ml-1">
                          Terminal color tokens active
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Prompt: ccode@crimson:~$
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SYNTAX HIGHLIGHTING COLOR VARIABLES */}
              {activeTab === 'syntax' && (
                <div className="space-y-4 font-mono text-xs">
                  {/* Header Banner */}
                  <div className="flex items-start justify-between border-b border-[#202230] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                        <FontAwesomeIcon icon={ICONS.wand} className="text-rose-400 text-xs" />
                        <span>Syntax Highlighting Color Variables</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Customize CSS color variables for syntax tokens (<code className="text-rose-300">--ide-token-keyword</code>, <code className="text-rose-300">--ide-token-function</code>, <code className="text-rose-300">--ide-token-string</code>, etc.). Changes update the editor in real-time and persist across sessions via the Theme Engine.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      <button
                        id="syntax-reset-defaults-btn"
                        onClick={handleResetSyntaxColors}
                        title="Revert syntax tokens to original theme palette defaults"
                        className="px-2.5 py-1 rounded bg-[#161724] hover:bg-[#202334] text-slate-400 hover:text-slate-200 border border-[#2b2e40] text-[11px] font-mono transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={ICONS.rotateLeft} className="text-[10px]" />
                        <span>Reset Defaults</span>
                      </button>

                      <button
                        id="syntax-save-colors-btn"
                        onClick={handleSaveSyntaxColors}
                        className="px-3.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[11px] font-mono shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={ICONS.check} className="text-[10px]" />
                        <span>Save & Persist</span>
                      </button>
                    </div>
                  </div>

                  {/* Save Status Notification */}
                  {syntaxSaveStatus && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center space-x-2 animate-fadeIn font-mono">
                      <FontAwesomeIcon icon={ICONS.circleCheck} className="text-emerald-400" />
                      <span className="font-semibold">{syntaxSaveStatus}</span>
                    </div>
                  )}

                  {/* Quick Syntax Presets */}
                  <div className="p-3 bg-[#0d0e15] border border-[#1f212f] rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                        Quick Syntax Palettes
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        Click any preset to instantly apply and persist
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SYNTAX_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleApplySyntaxPreset(preset.colors)}
                          className="px-2.5 py-1 rounded bg-[#151724] hover:bg-rose-950/60 border border-[#27293d] hover:border-rose-700 text-slate-300 hover:text-rose-200 transition-colors flex items-center space-x-2 cursor-pointer text-[10px]"
                        >
                          <div className="flex space-x-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.colors.keyword }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.colors.function }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.colors.string }} />
                          </div>
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Interactive Code Preview */}
                  <div className="p-3 bg-[#08090d] border border-[#1c1d28] rounded-lg space-y-1.5 font-mono text-[11px] leading-relaxed shadow-inner">
                    <div className="flex items-center justify-between pb-1 border-b border-[#1b1c26] text-[10px] text-slate-500">
                      <span>Live Syntax Preview</span>
                      <span>active theme: {themeEngine.getActiveTheme()?.name || 'Crimson'}</span>
                    </div>
                    <div>
                      <span style={{ color: syntaxColors.comment }}>// Live interactive syntax highlighting sample</span>
                    </div>
                    <div>
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>import</span>{' '}
                      &#123; <span style={{ color: syntaxColors.type }}>AppConfig</span>,{' '}
                      <span style={{ color: syntaxColors.type }}>ThemeService</span> &#125;{' '}
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>from</span>{' '}
                      <span style={{ color: syntaxColors.string }}>'./core'</span>;
                    </div>
                    <div className="pt-0.5">
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>export</span>{' '}
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>const</span>{' '}
                      <span style={{ color: syntaxColors.function }}>initializeServer</span> ={' '}
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>async</span> (
                      <span style={{ color: syntaxColors.variable }}>port</span>:{' '}
                      <span style={{ color: syntaxColors.type }}>number</span>):{' '}
                      <span style={{ color: syntaxColors.type }}>Promise&lt;boolean&gt;</span> =&gt; &#123;
                    </div>
                    <div className="pl-4">
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>const</span>{' '}
                      <span style={{ color: syntaxColors.variable }}>statusMessage</span> ={' '}
                      <span style={{ color: syntaxColors.string }}>`Active on port $&#123;port&#125;`</span>;
                    </div>
                    <div className="pl-4">
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>const</span>{' '}
                      <span style={{ color: syntaxColors.variable }}>maxRetries</span>:{' '}
                      <span style={{ color: syntaxColors.type }}>number</span> ={' '}
                      <span style={{ color: syntaxColors.number }}>5</span>;
                    </div>
                    <div className="pl-4">
                      <span style={{ color: syntaxColors.keyword, fontWeight: 600 }}>return</span>{' '}
                      <span style={{ color: syntaxColors.number }}>true</span>;
                    </div>
                    <div>&#125;;</div>
                  </div>

                  {/* Token Color Variables Customizer Grid */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Token Color Variables
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SYNTAX_TOKENS.map((token) => {
                        const currentColor = syntaxColors[token.key];
                        return (
                          <div
                            key={token.key}
                            className="p-3 bg-[#0f1018] border border-[#212332] hover:border-slate-700 rounded-lg space-y-2 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                                  <span>{token.label}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  <span className="text-rose-400 font-semibold">{token.variableName}</span>
                                </div>
                              </div>
                              <span
                                className="w-5 h-5 rounded-md border border-slate-600 shadow-xs shrink-0"
                                style={{ backgroundColor: currentColor }}
                              />
                            </div>

                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              e.g. {token.examples}
                            </div>

                            {/* Color Input Controls */}
                            <div className="flex items-center space-x-2 bg-[#090a0f] border border-[#25283a] focus-within:border-rose-500 rounded p-1">
                              <input
                                type="color"
                                aria-label={`Color for ${token.label}`}
                                value={currentColor}
                                onChange={(e) => handleSyntaxColorChange(token.key, e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                              />
                              <input
                                type="text"
                                aria-label={`Hex color value for ${token.label}`}
                                value={currentColor}
                                onChange={(e) => handleSyntaxColorChange(token.key, e.target.value)}
                                className="flex-1 bg-transparent text-xs font-mono text-slate-200 outline-none uppercase"
                              />
                              <span
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                                style={{ color: currentColor, backgroundColor: `${currentColor}18` }}
                              >
                                {token.key}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: THEMES & COLORS */}
              {activeTab === 'theme' && (
                <div className="space-y-4">
                  {/* Theme Store Callout Banner */}
                  <div className="p-3.5 bg-gradient-to-r from-rose-950/60 to-[#161724] border border-rose-800/80 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-rose-300 font-bold font-mono text-xs">
                        <FontAwesomeIcon icon={ICONS.store} />
                        <span>Theme Store & Custom Studio</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Explore custom themes (Cyberpunk, Tokyo Night, Dracula, etc.) or design your own personalized palette!
                      </p>
                    </div>
                    {onOpenThemeStore && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenThemeStore();
                        }}
                        className="ml-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-bold shadow-md transition-colors whitespace-nowrap flex items-center space-x-1.5"
                      >
                        <FontAwesomeIcon icon={ICONS.palette} className="text-[11px]" />
                        <span>Open Store</span>
                      </button>
                    )}
                  </div>

                  {/* Syntax Color Variables Quick Access Banner */}
                  <div className="p-3 bg-[#0d0f17] border border-[#232638] rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5 font-mono">
                        <FontAwesomeIcon icon={ICONS.wand} className="text-rose-400 text-xs" />
                        <span>Syntax Highlighting Color Variables</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Customize token-keyword, token-function, token-string, token-number, token-comment, token-type, token-variable.
                      </div>
                    </div>
                    <button
                      id="theme-tab-to-syntax-colors-btn"
                      onClick={() => setActiveTab('syntax')}
                      className="ml-3 px-3 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-xs font-mono transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-1"
                    >
                      <span>Customize Tokens →</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Built-in Crimson Presets</div>
                      <div className="text-[11px] text-slate-400">Choose between curated high-contrast crimson variations.</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {[
                        { id: 'classic', label: 'Classic Crimson' },
                        { id: 'ruby', label: 'Deep Ruby' },
                        { id: 'garnet', label: 'High Contrast Garnet' },
                        { id: 'neon', label: 'Neon Crimson' }
                      ].map((th) => (
                        <button
                          key={th.id}
                          onClick={() => onUpdateSettings({ crimsonShade: th.id as any })}
                          className={`px-3 py-1 rounded text-xs font-mono ${
                            settings.crimsonShade === th.id 
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold' 
                              : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {th.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0b0e] border border-[#222432] rounded text-xs space-y-1 font-mono">
                    <span className="text-slate-400 text-[10px] uppercase">Active Palette Tokens</span>
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="w-4 h-4 rounded bg-rose-600 border border-rose-400 shadow-sm" title="Accent: #e11d48" />
                      <span className="w-4 h-4 rounded bg-[#0d0e14] border border-[#242636]" title="Editor Bg: #0d0e14" />
                      <span className="w-4 h-4 rounded bg-[#12131b] border border-[#242636]" title="Sidebar Bg: #12131b" />
                      <span className="w-4 h-4 rounded bg-[#f43f5e] border border-rose-300" title="Cursor: #f43f5e" />
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0b0e] border border-[#222432] rounded text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon
                          icon={isTerminalLinked ? ICONS.link : ICONS.unlink}
                          className={`text-xs ${isTerminalLinked ? 'text-rose-400' : 'text-slate-500'}`}
                        />
                        <span className="text-slate-200 text-xs font-semibold">
                          {isTerminalLinked ? 'Terminal Linked to Crimson Theme' : 'Independent Terminal Colors'}
                        </span>
                        {isTerminalLinked ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            SYNCED ({activeCrimsonPalette.name})
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#161722] text-slate-400 border border-[#242636]">
                            INDEPENDENT
                          </span>
                        )}
                      </div>

                      <button
                        id="link-terminal-crimson-theme-toggle-themetab"
                        type="button"
                        onClick={handleToggleLinkTerminalToCrimson}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center space-x-1.5 ${
                          isTerminalLinked
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 font-semibold'
                            : 'bg-[#181926] text-slate-300 hover:text-white border border-[#2c2f44]'
                        }`}
                      >
                        <FontAwesomeIcon icon={isTerminalLinked ? ICONS.link : ICONS.unlink} className="text-[10px]" />
                        <span>{isTerminalLinked ? 'LINKED' : 'LINK PALETTE'}</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <span 
                        className="w-4 h-4 rounded border border-slate-700 shadow-sm" 
                        style={{ backgroundColor: settings.terminalBackground || '#090a0f' }} 
                        title={`Terminal Background: ${settings.terminalBackground || '#090a0f'}`} 
                      />
                      <span 
                        className="w-4 h-4 rounded border border-slate-700" 
                        style={{ backgroundColor: settings.terminalForeground || '#cbd5e1' }} 
                        title={`Terminal Font: ${settings.terminalForeground || '#cbd5e1'}`} 
                      />
                      <span 
                        className="w-4 h-4 rounded border border-slate-700" 
                        style={{ backgroundColor: settings.terminalPromptColor || '#fb7185' }} 
                        title={`Terminal Prompt: ${settings.terminalPromptColor || '#fb7185'}`} 
                      />
                      <span 
                        className="w-4 h-4 rounded border border-slate-700" 
                        style={{ backgroundColor: settings.terminalCursorColor || '#f43f5e' }} 
                        title={`Terminal Caret: ${settings.terminalCursorColor || '#f43f5e'}`} 
                      />
                      <span className="text-[10px] text-slate-400 ml-2">
                        {isTerminalLinked
                          ? `Synchronized with ${settings.crimsonShade || 'ruby'} preset`
                          : `${settings.terminalFontSize || 12}px font (Customizable in Terminal tab)`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LAYOUT & PANELS */}
              {activeTab === 'layout' && (
                <div className="space-y-4">
                  {/* Edit Layout Mode Action Card */}
                  <div className="p-3.5 bg-gradient-to-r from-rose-950/50 to-[#141520] border border-rose-800/80 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-rose-300 font-bold font-mono text-xs">
                        <FontAwesomeIcon icon={ICONS.layout} />
                        <span>Interactive Edit Layout Mode</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Move anything around visually on the IDE canvas with live panel badges and swap buttons.
                      </p>
                    </div>
                    {onToggleEditLayoutMode && (
                      <button
                        onClick={() => {
                          onClose();
                          onToggleEditLayoutMode();
                        }}
                        className="ml-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-bold shadow-md transition-colors whitespace-nowrap flex items-center space-x-1.5"
                      >
                        <FontAwesomeIcon icon={ICONS.arrowsLeftRight} className="text-[11px]" />
                        <span>Enter Layout Mode</span>
                      </button>
                    )}
                  </div>

                  {/* IDE Layout Presets (Save & Load) Section */}
                  <div id="settings-layout-presets-section" className="p-4 bg-[#0d0e17] border border-[#232538] rounded-xl space-y-3 font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#1c1e2d]">
                      <div>
                        <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                          <FontAwesomeIcon icon={ICONS.layout} className="text-rose-400" />
                          <span>IDE Layout Presets (Save &amp; Load)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                          Switch between customized IDE arrangements like <strong>Debugging View</strong> or <strong>Minimalist View</strong>, or save your current panel layout.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          id="btn-toggle-save-layout-preset"
                          onClick={() => setShowSavePresetInput((prev) => !prev)}
                          className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800 text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <FontAwesomeIcon icon={ICONS.plus} className="text-[9px]" />
                          <span>Save Layout</span>
                        </button>
                      </div>
                    </div>

                    {/* Toast Notification for Layout Preset Actions */}
                    {layoutPresetToast && (
                      <div className="p-2 rounded bg-rose-950/90 border border-rose-700 text-rose-200 text-xs flex items-center space-x-2 animate-fadeIn">
                        <FontAwesomeIcon icon={ICONS.check} className="text-rose-400 text-xs shrink-0" />
                        <span>{layoutPresetToast}</span>
                      </div>
                    )}

                    {/* Save Current Layout Form */}
                    {showSavePresetInput && (
                      <div className="p-3 rounded-lg bg-[#12131e] border border-rose-800/60 space-y-2 animate-fadeIn">
                        <div className="text-[11px] font-semibold text-rose-300 flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={ICONS.layout} className="text-[10px]" />
                          <span>Save Current Panel Arrangement as Preset</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Preset name (e.g., Debugging View, Ultra Minimalist)..."
                            value={newLayoutPresetName}
                            onChange={(e) => setNewLayoutPresetName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCurrentLayoutPreset();
                              else if (e.key === 'Escape') setShowSavePresetInput(false);
                            }}
                            autoFocus
                            className="flex-1 px-2.5 py-1.5 bg-[#090a10] border border-[#2b2d42] rounded text-xs text-slate-200 outline-none focus:border-rose-500 font-mono"
                          />
                          <button
                            type="button"
                            id="btn-confirm-save-layout"
                            onClick={handleSaveCurrentLayoutPreset}
                            disabled={!newLayoutPresetName.trim()}
                            className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                          >
                            <FontAwesomeIcon icon={ICONS.check} className="text-[10px]" />
                            <span>Save Preset</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSavePresetInput(false);
                              setNewLayoutPresetName('');
                            }}
                            className="px-2.5 py-1.5 rounded bg-[#181a26] text-slate-400 hover:text-slate-200 border border-[#282a3d] text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Presets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {getAvailableLayoutPresets(settings.savedLayoutPresets).map((preset) => {
                        const currentLayout = settings.layoutConfig || {
                          activityBarPosition: 'left',
                          sidebarPosition: 'left',
                          bottomPanelPosition: 'bottom',
                          statusBarPosition: 'bottom',
                          minimapPosition: 'right',
                        };
                        const isActive = isMatchingLayout(preset.layout, currentLayout);

                        return (
                          <div
                            key={preset.id}
                            id={`layout-preset-card-${preset.id}`}
                            className={`p-3 rounded-lg border transition-all text-xs flex flex-col justify-between space-y-2 ${
                              isActive
                                ? 'bg-gradient-to-br from-rose-950/40 to-[#141522] border-rose-600/90 shadow-md ring-1 ring-rose-500/30'
                                : 'bg-[#10111a] border-[#222434] hover:border-[#32364c]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center space-x-1.5 truncate">
                                  <span className="font-bold text-slate-100 truncate">{preset.name}</span>
                                  {preset.isBuiltIn ? (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#181a26] text-slate-400 border border-[#2b2d40] shrink-0 font-bold">
                                      PRESET
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 shrink-0 font-bold">
                                      CUSTOM
                                    </span>
                                  )}
                                </div>

                                {isActive && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold shrink-0">
                                    ACTIVE
                                  </span>
                                )}
                              </div>

                              {preset.description && (
                                <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2 leading-relaxed">
                                  {preset.description}
                                </p>
                              )}

                              {/* Layout Badges */}
                              <div className="flex flex-wrap items-center gap-1 mt-2 text-[10px] font-mono text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-[#0a0b12] border border-[#1e2030]">
                                  Bar: <span className="text-rose-300 font-semibold">{preset.layout.activityBarPosition}</span>
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#0a0b12] border border-[#1e2030]">
                                  Sidebar: <span className="text-rose-300 font-semibold">{preset.layout.sidebarPosition}</span>
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#0a0b12] border border-[#1e2030]">
                                  Dock: <span className="text-rose-300 font-semibold">{preset.layout.bottomPanelPosition}</span>
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#0a0b12] border border-[#1e2030]">
                                  Minimap: <span className="text-rose-300 font-semibold">{preset.layout.minimapPosition}</span>
                                </span>
                              </div>
                            </div>

                            {/* Preset Action Buttons */}
                            <div className="flex items-center justify-between pt-1 border-t border-[#1a1c2a]">
                              <button
                                type="button"
                                id={`btn-load-preset-${preset.id}`}
                                onClick={() => handleLoadLayoutPreset(preset)}
                                disabled={isActive}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60 cursor-default opacity-80'
                                    : 'bg-[#181926] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-[#2b2d40] hover:border-rose-800'
                                }`}
                              >
                                <FontAwesomeIcon icon={isActive ? ICONS.check : ICONS.layout} className="text-[9px]" />
                                <span>{isActive ? 'Applied' : 'Load Layout'}</span>
                              </button>

                              {!preset.isBuiltIn && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLayoutPreset(preset.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-[#1a1c28] transition-colors cursor-pointer"
                                  title={`Delete custom preset "${preset.name}"`}
                                >
                                  <FontAwesomeIcon icon={ICONS.trash} className="text-[10px]" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar Position */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Sidebar Position</div>
                      <div className="text-[11px] text-slate-400">Position the Primary Sidebar on the left or right edge.</div>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      {(['left', 'right'] as const).map((pos) => {
                        const current = settings.layoutConfig?.sidebarPosition || 'left';
                        const isSel = current === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() =>
                              onUpdateSettings({
                                layoutConfig: {
                                  ...(settings.layoutConfig || {
                                    sidebarPosition: 'left',
                                    activityBarPosition: 'left',
                                    bottomPanelPosition: 'bottom',
                                    minimapPosition: 'right',
                                    statusBarPosition: 'bottom',
                                  }),
                                  sidebarPosition: pos,
                                },
                              })
                            }
                            className={`px-3 py-1 rounded capitalize transition-colors ${
                              isSel
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                                : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity Bar Position */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Activity Bar Position</div>
                      <div className="text-[11px] text-slate-400">Place navigation icons on the left, right, or hide entirely.</div>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      {(['left', 'right', 'hidden'] as const).map((pos) => {
                        const current = settings.layoutConfig?.activityBarPosition || 'left';
                        const isSel = current === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() =>
                              onUpdateSettings({
                                layoutConfig: {
                                  ...(settings.layoutConfig || {
                                    sidebarPosition: 'left',
                                    activityBarPosition: 'left',
                                    bottomPanelPosition: 'bottom',
                                    minimapPosition: 'right',
                                    statusBarPosition: 'bottom',
                                  }),
                                  activityBarPosition: pos,
                                },
                              })
                            }
                            className={`px-2.5 py-1 rounded capitalize transition-colors ${
                              isSel
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                                : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Panel Dock Position */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Terminal & Problems Dock</div>
                      <div className="text-[11px] text-slate-400">Dock the terminal panel at the bottom or as a side panel.</div>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      {(['bottom', 'right', 'left'] as const).map((pos) => {
                        const current = settings.layoutConfig?.bottomPanelPosition || 'bottom';
                        const isSel = current === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() =>
                              onUpdateSettings({
                                layoutConfig: {
                                  ...(settings.layoutConfig || {
                                    sidebarPosition: 'left',
                                    activityBarPosition: 'left',
                                    bottomPanelPosition: 'bottom',
                                    minimapPosition: 'right',
                                    statusBarPosition: 'bottom',
                                  }),
                                  bottomPanelPosition: pos,
                                },
                              })
                            }
                            className={`px-2.5 py-1 rounded capitalize transition-colors ${
                              isSel
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                                : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimap Position */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Minimap Position</div>
                      <div className="text-[11px] text-slate-400">Position the code minimap on the right or left of the code editor.</div>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      {(['right', 'left'] as const).map((pos) => {
                        const current = settings.layoutConfig?.minimapPosition || 'right';
                        const isSel = current === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() =>
                              onUpdateSettings({
                                layoutConfig: {
                                  ...(settings.layoutConfig || {
                                    sidebarPosition: 'left',
                                    activityBarPosition: 'left',
                                    bottomPanelPosition: 'bottom',
                                    minimapPosition: 'right',
                                    statusBarPosition: 'bottom',
                                  }),
                                  minimapPosition: pos,
                                },
                              })
                            }
                            className={`px-3 py-1 rounded capitalize transition-colors ${
                              isSel
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                                : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Bar Position */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Status Bar Placement</div>
                      <div className="text-[11px] text-slate-400">Dock the status bar at the bottom or top of the workspace.</div>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      {(['bottom', 'top'] as const).map((pos) => {
                        const current = settings.layoutConfig?.statusBarPosition || 'bottom';
                        const isSel = current === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() =>
                              onUpdateSettings({
                                layoutConfig: {
                                  ...(settings.layoutConfig || {
                                    sidebarPosition: 'left',
                                    activityBarPosition: 'left',
                                    bottomPanelPosition: 'bottom',
                                    minimapPosition: 'right',
                                    statusBarPosition: 'bottom',
                                  }),
                                  statusBarPosition: pos,
                                },
                              })
                            }
                            className={`px-3 py-1 rounded capitalize transition-colors ${
                              isSel
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                                : 'bg-[#1a1b26] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {pos}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ESLINT WORKSPACE RULES & IGNORES */}
              {activeTab === 'eslint' && (
                <div className="space-y-4">
                  <EslintConfigSection
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                    onExportEslintFiles={onExportEslintFiles}
                  />
                </div>
              )}

              {/* TAB 5: CLOUD SETTINGS SYNC */}
              {activeTab === 'sync' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Cloud Settings Synchronization</div>
                      <div className="text-[11px] text-slate-400">Automatically broadcast settings and keymaps to connected devices.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ syncEnabled: !settings.syncEnabled })}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        settings.syncEnabled ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-[#1a1b26] text-slate-400'
                      }`}
                    >
                      {settings.syncEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-[#202230]">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Sync Interval</div>
                      <div className="text-[11px] text-slate-400">Background synchronization heartbeat duration.</div>
                    </div>
                    <span className="text-xs font-mono text-slate-300">10 seconds (Automated)</span>
                  </div>

                  <button
                    onClick={() => {
                      onTriggerSync();
                      onClose();
                    }}
                    className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.sync} />
                    <span>Synchronize Across All Connected Devices Now</span>
                  </button>
                </div>
              )}

              {/* CUSTOMIZATION TABS */}
              {activeTab === 'audio' && (
                <AudioSettingsSection settings={settings} onUpdateSettings={onUpdateSettings} />
              )}

              {activeTab === 'customCss' && (
                <CustomCssSection settings={settings} onUpdateSettings={onUpdateSettings} />
              )}

              {activeTab === 'wallpaper' && (
                <WallpaperSection settings={settings} onUpdateSettings={onUpdateSettings} />
              )}

              {activeTab === 'uiElements' && (
                <UiElementsSection settings={settings} onUpdateSettings={onUpdateSettings} />
              )}

              {activeTab === 'keybindings' && (
                <KeybindingsSection settings={settings} onUpdateSettings={onUpdateSettings} />
              )}

              {activeTab === 'snippets' && (
                <SnippetsSection settings={settings} onUpdateSettings={onUpdateSettings} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
