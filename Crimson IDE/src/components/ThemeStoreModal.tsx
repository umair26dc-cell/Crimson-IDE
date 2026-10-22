/**
 * Theme Store, Custom Theme Studio & Terminal Palette Modal
 * Allows browsing, searching, and previewing curated color themes,
 * designing custom user themes, and customizing the terminal's
 * background colors and font color settings independently of the main editor theme.
 * Zero emojis - 100% FontAwesome iconography.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { ThemeCategory, ThemeDefinition, UserSettings } from '../types';
import { 
  BUILTIN_THEMES, 
  getAllThemes, 
  createDefaultCustomTheme, 
  exportThemeJSON, 
  importThemeJSON, 
  saveStoredCustomThemes 
} from '../lib/themeEngine';
import { TERMINAL_THEME_PRESETS, TerminalThemePreset } from '../lib/terminalThemes';

interface ThemeStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
  customThemes?: ThemeDefinition[];
  onUpdateCustomThemes?: (themes: ThemeDefinition[]) => void;
  userSettings?: UserSettings;
  onUpdateSettings?: (settings: Partial<UserSettings>) => void;
}

type TerminalPreset = TerminalThemePreset;
const TERMINAL_PRESETS: TerminalPreset[] = TERMINAL_THEME_PRESETS;

export const ThemeStoreModal: React.FC<ThemeStoreModalProps> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
  customThemes = [],
  onUpdateCustomThemes,
  userSettings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'creator' | 'terminal'>('store');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Theme Creator State
  const [draftTheme, setDraftTheme] = useState<ThemeDefinition>(() => createDefaultCustomTheme());

  // Independent Terminal Customization State
  const [terminalDraft, setTerminalDraft] = useState({
    background: userSettings?.terminalBackground || '#090a0f',
    foreground: userSettings?.terminalForeground || '#cbd5e1',
    cursorColor: userSettings?.terminalCursorColor || '#f43f5e',
    promptColor: userSettings?.terminalPromptColor || '#fb7185',
    fontSize: userSettings?.terminalFontSize || 12,
    fontFamily: userSettings?.terminalFontFamily || "'JetBrains Mono', monospace",
  });
  const [terminalSaveToast, setTerminalSaveToast] = useState<string | null>(null);
  const [testCommandInput, setTestCommandInput] = useState<string>('');

  // Sync draft when userSettings changes or modal opens
  useEffect(() => {
    if (userSettings) {
      setTerminalDraft({
        background: userSettings.terminalBackground || '#090a0f',
        foreground: userSettings.terminalForeground || '#cbd5e1',
        cursorColor: userSettings.terminalCursorColor || '#f43f5e',
        promptColor: userSettings.terminalPromptColor || '#fb7185',
        fontSize: userSettings.terminalFontSize || 12,
        fontFamily: userSettings.terminalFontFamily || "'JetBrains Mono', monospace",
      });
    }
  }, [userSettings, isOpen]);

  const allThemes = useMemo(() => {
    return getAllThemes(customThemes);
  }, [customThemes]);

  const filteredThemes = useMemo(() => {
    return allThemes.filter((t) => {
      const matchCat =
        categoryFilter === 'All'
          ? true
          : categoryFilter === 'Custom'
          ? t.isCustom
          : t.category === categoryFilter;

      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [allThemes, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  const handleForkTheme = (theme: ThemeDefinition) => {
    setDraftTheme(createDefaultCustomTheme(theme));
    setActiveTab('creator');
  };

  const handleSaveDraftTheme = () => {
    if (!draftTheme.name.trim()) return;

    const existingIdx = customThemes.findIndex((t) => t.id === draftTheme.id);
    let updated: ThemeDefinition[];
    if (existingIdx >= 0) {
      updated = [...customThemes];
      updated[existingIdx] = draftTheme;
    } else {
      updated = [...customThemes, draftTheme];
    }

    onUpdateCustomThemes?.(updated);
    saveStoredCustomThemes(updated);
    onSelectTheme(draftTheme.id);
    setActiveTab('store');
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    const updated = customThemes.filter((t) => t.id !== themeId);
    onUpdateCustomThemes?.(updated);
    saveStoredCustomThemes(updated);
    if (activeThemeId === themeId) {
      onSelectTheme(BUILTIN_THEMES[0].id);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = importThemeJSON(content);
      if (imported) {
        const updated = [...customThemes, imported];
        onUpdateCustomThemes?.(updated);
        saveStoredCustomThemes(updated);
        onSelectTheme(imported.id);
        setImportError(null);
      } else {
        setImportError('Invalid theme JSON structure. Please check the file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportTheme = (theme: ThemeDefinition) => {
    const json = exportThemeJSON(theme);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedId(theme.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Terminal actions
  const handleApplyTerminalPreset = (preset: TerminalPreset) => {
    const updated = {
      ...terminalDraft,
      background: preset.background,
      foreground: preset.foreground,
      cursorColor: preset.cursorColor,
      promptColor: preset.promptColor,
    };
    setTerminalDraft(updated);
    onUpdateSettings?.({
      terminalTheme: preset.name,
      terminalThemeId: preset.id,
      terminalBackground: updated.background,
      terminalForeground: updated.foreground,
      terminalCursorColor: updated.cursorColor,
      terminalPromptColor: updated.promptColor,
    });
    setTerminalSaveToast(`Preset "${preset.name}" applied and saved!`);
    setTimeout(() => setTerminalSaveToast(null), 3000);
  };

  const handleSaveTerminalSettings = () => {
    onUpdateSettings?.({
      terminalBackground: terminalDraft.background,
      terminalForeground: terminalDraft.foreground,
      terminalCursorColor: terminalDraft.cursorColor,
      terminalPromptColor: terminalDraft.promptColor,
      terminalFontSize: terminalDraft.fontSize,
      terminalFontFamily: terminalDraft.fontFamily,
    });
    setTerminalSaveToast('Terminal colors & font settings saved to User Settings!');
    setTimeout(() => setTerminalSaveToast(null), 3000);
  };

  const handleResetTerminalDefaults = () => {
    const defaults = {
      background: '#090a0f',
      foreground: '#cbd5e1',
      cursorColor: '#f43f5e',
      promptColor: '#fb7185',
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
    };
    setTerminalDraft(defaults);
    onUpdateSettings?.({
      terminalBackground: defaults.background,
      terminalForeground: defaults.foreground,
      terminalCursorColor: defaults.cursorColor,
      terminalPromptColor: defaults.promptColor,
      terminalFontSize: defaults.fontSize,
      terminalFontFamily: defaults.fontFamily,
    });
    setTerminalSaveToast('Terminal settings reset to default Crimson palette!');
    setTimeout(() => setTerminalSaveToast(null), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        id="theme-store-modal"
        className="w-full max-w-4xl bg-[#101118] border border-rose-900/60 rounded-xl shadow-2xl shadow-rose-950/40 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-[#1f212f] bg-[#0c0d14] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
              <FontAwesomeIcon icon={activeTab === 'terminal' ? ICONS.terminal : ICONS.palette} className="text-sm" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-100 font-mono">
                  {activeTab === 'terminal' ? 'Terminal Palette & Font Studio' : 'Theme Store & Studio'}
                </h2>
                {activeTab !== 'terminal' ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {allThemes.length} Themes Available
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Independent from Editor Theme
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {activeTab === 'terminal'
                  ? 'Customize the terminal background colors, font colors, and caret independently of the main IDE theme.'
                  : 'Explore curated IDE color palettes or design and share your own custom theme.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switchers */}
            <div className="flex bg-[#161824] p-0.5 rounded-lg border border-[#25283b] text-xs font-mono">
              <button
                onClick={() => setActiveTab('store')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'store'
                    ? 'bg-rose-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.store} className="mr-1.5 text-[10px]" />
                Explore Store
              </button>
              <button
                onClick={() => setActiveTab('creator')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'creator'
                    ? 'bg-rose-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.wand} className="mr-1.5 text-[10px]" />
                Theme Studio
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1 rounded transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'terminal'
                    ? 'bg-rose-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.terminal} className="text-[10px]" />
                <span>Terminal Colors</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1c1e2b] rounded transition-colors ml-2 cursor-pointer"
              title="Close (Esc)"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>
        </div>

        {/* TAB 1: THEME STORE EXPLORER */}
        {activeTab === 'store' && (
          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {['All', 'Crimson', 'Dark', 'Neon', 'Modern', 'Custom'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                        : 'bg-[#151722] text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a] border border-[#212330]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <FontAwesomeIcon
                    icon={ICONS.search}
                    className="absolute left-2.5 top-2.5 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Search themes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#141622] border border-[#242636] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono outline-none focus:border-rose-500"
                  />
                </div>

                <label
                  htmlFor="import-theme-file"
                  className="px-3 py-1.5 bg-[#171926] hover:bg-[#202334] border border-[#2b2e42] text-slate-300 rounded-lg text-xs font-mono cursor-pointer flex items-center space-x-1.5 whitespace-nowrap transition-colors"
                  title="Import a theme from JSON file"
                >
                  <FontAwesomeIcon icon={ICONS.upload} className="text-rose-400 text-xs" />
                  <span>Import JSON</span>
                </label>
                <input
                  id="import-theme-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
              </div>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono flex items-center justify-between">
                <span>{importError}</span>
                <button onClick={() => setImportError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">
                  <FontAwesomeIcon icon={ICONS.close} />
                </button>
              </div>
            )}

            {/* Themes Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1">
              {filteredThemes.map((theme) => {
                const isActive = activeThemeId === theme.id;
                return (
                  <div
                    key={theme.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                      isActive
                        ? 'border-rose-600 bg-[#161724] ring-2 ring-rose-500/40'
                        : 'border-[#222436] bg-[#12131d] hover:border-slate-600 hover:bg-[#151724]'
                    }`}
                  >
                    {/* Theme Preview Swatch Bar */}
                    <div className="h-20 p-3 flex flex-col justify-between" style={{ backgroundColor: theme.colors.bgEditor }}>
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.colors.keyword }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.colors.function }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.colors.string }} />
                        </div>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white shadow-sm">
                            Active Theme
                          </span>
                        )}
                      </div>

                      {/* Mock Code Snippet Preview */}
                      <div className="text-[11px] font-mono truncate space-x-1.5">
                        <span style={{ color: theme.colors.keyword }}>const</span>
                        <span style={{ color: theme.colors.variable }}>crimson</span>
                        <span style={{ color: theme.colors.keyword }}>=</span>
                        <span style={{ color: theme.colors.string }}>"online"</span>;
                      </div>
                    </div>

                    {/* Theme Details Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-100 font-mono truncate">{theme.name}</h3>
                          <span className="text-[10px] text-slate-500 font-mono">{theme.category}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{theme.description}</p>
                      </div>

                      <div className="space-y-2">
                        {/* Author & Tags */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>by {theme.author}</span>
                          <div className="flex space-x-1">
                            {theme.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.2 rounded bg-[#1c1e2e] text-slate-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Theme Action Buttons */}
                        <div className="flex items-center space-x-1.5 pt-1">
                          <button
                            onClick={() => onSelectTheme(theme.id)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer ${
                              isActive
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-md ring-1 ring-rose-500/40'
                                : 'bg-rose-700 hover:bg-rose-600 text-white shadow hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                          >
                            <FontAwesomeIcon icon={isActive ? ICONS.circleCheck : ICONS.palette} className="text-xs" />
                            <span>{isActive ? 'Applied' : 'Apply'}</span>
                          </button>

                          {/* Fork / Edit in Studio */}
                          <button
                            onClick={() => handleForkTheme(theme)}
                            title="Fork into Theme Studio"
                            className="p-2 bg-[#171926] hover:bg-[#202334] border border-[#2b2e42] text-slate-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            <FontAwesomeIcon icon={ICONS.wand} />
                          </button>

                          {/* Export Theme */}
                          <button
                            onClick={() => handleExportTheme(theme)}
                            title="Download Theme JSON"
                            className="p-2 bg-[#171926] hover:bg-[#202334] border border-[#2b2e42] text-slate-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            <FontAwesomeIcon icon={copiedId === theme.id ? ICONS.check : ICONS.download} />
                          </button>

                          {/* Delete custom themes */}
                          {theme.isCustom && (
                            <button
                              onClick={() => handleDeleteCustomTheme(theme.id)}
                              title="Delete Custom Theme"
                              className="p-2 bg-[#171926] hover:bg-rose-950 border border-[#2b2e42] hover:border-rose-800 text-rose-400 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              <FontAwesomeIcon icon={ICONS.trash} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: THEME STUDIO / CREATOR */}
        {activeTab === 'creator' && (
          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pr-1">
              {/* Left Column: Color Token Customizer */}
              <div className="lg:col-span-7 space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#12131d] border border-[#202230]">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Theme Name</label>
                    <input
                      type="text"
                      value={draftTheme.name}
                      onChange={(e) => setDraftTheme({ ...draftTheme, name: e.target.value })}
                      placeholder="My Custom Crimson"
                      className="w-full bg-[#141622] border border-[#242636] rounded px-3 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Author Name</label>
                    <input
                      type="text"
                      value={draftTheme.author}
                      onChange={(e) => setDraftTheme({ ...draftTheme, author: e.target.value })}
                      placeholder="Your Name / Handle"
                      className="w-full bg-[#141622] border border-[#242636] rounded px-3 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                    <input
                      type="text"
                      value={draftTheme.description}
                      onChange={(e) => setDraftTheme({ ...draftTheme, description: e.target.value })}
                      placeholder="Brief description of the palette vibe"
                      className="w-full bg-[#141622] border border-[#242636] rounded px-3 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Section 1: Surface & Background Colors */}
                <div className="p-4 rounded-xl bg-[#12131d] border border-[#202230] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-300 font-mono uppercase tracking-wider block">
                      1. Interface & Canvas Surfaces
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'accent', label: 'Primary Accent' },
                      { key: 'accentHover', label: 'Accent Hover' },
                      { key: 'bgEditor', label: 'Editor Canvas' },
                      { key: 'bgSidebar', label: 'Sidebar Surface' },
                      { key: 'bgPanel', label: 'Bottom Panel' },
                      { key: 'bgStatusBar', label: 'Status Bar' },
                      { key: 'cursor', label: 'Caret / Cursor' },
                      { key: 'border', label: 'Borders & Rules' },
                      { key: 'fgPrimary', label: 'Main Text' },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1">
                        <span className="text-[10px] text-slate-400 block font-mono">{item.label}</span>
                        <div className="flex items-center space-x-1.5 bg-[#0a0b12] border border-[#232536] rounded p-1">
                          <input
                            type="color"
                            value={(draftTheme.colors as any)[item.key] || '#e11d48'}
                            onChange={(e) =>
                              setDraftTheme({
                                ...draftTheme,
                                colors: {
                                  ...draftTheme.colors,
                                  [item.key]: e.target.value,
                                },
                              })
                            }
                            className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                          />
                          <input
                            type="text"
                            value={(draftTheme.colors as any)[item.key] || ''}
                            onChange={(e) =>
                              setDraftTheme({
                                ...draftTheme,
                                colors: {
                                  ...draftTheme.colors,
                                  [item.key]: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-transparent text-[11px] font-mono text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Terminal shortcut notification card */}
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-rose-200">
                      <FontAwesomeIcon icon={ICONS.terminal} className="text-rose-400" />
                      <span>Want to customize terminal backgrounds & fonts independently?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('terminal')}
                      className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-mono font-semibold transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      Terminal Colors →
                    </button>
                  </div>
                </div>

                {/* Section 2: Syntax Highlighting Tokens */}
                <div className="p-4 rounded-xl bg-[#12131d] border border-[#202230] space-y-3">
                  <span className="text-[11px] font-bold text-rose-300 font-mono uppercase tracking-wider block">
                    2. Syntax Highlighting Token Colors
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'keyword', label: 'Keywords (if, const)' },
                      { key: 'function', label: 'Functions & Methods' },
                      { key: 'string', label: 'Strings & Literals' },
                      { key: 'number', label: 'Numbers & Constants' },
                      { key: 'comment', label: 'Comments' },
                      { key: 'type', label: 'Types & Interfaces' },
                      { key: 'variable', label: 'Variables' },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1">
                        <span className="text-[10px] text-slate-400 block font-mono">{item.label}</span>
                        <div className="flex items-center space-x-1.5 bg-[#0a0b12] border border-[#232536] rounded p-1">
                          <input
                            type="color"
                            value={(draftTheme.colors as any)[item.key] || '#f43f5e'}
                            onChange={(e) =>
                              setDraftTheme({
                                ...draftTheme,
                                colors: {
                                  ...draftTheme.colors,
                                  [item.key]: e.target.value,
                                },
                              })
                            }
                            className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                          />
                          <input
                            type="text"
                            value={(draftTheme.colors as any)[item.key] || ''}
                            onChange={(e) =>
                              setDraftTheme({
                                ...draftTheme,
                                colors: {
                                  ...draftTheme.colors,
                                  [item.key]: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-transparent text-[11px] font-mono text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview Stage */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                      Live Studio Sandbox Preview
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                      style={{
                        backgroundColor: draftTheme.colors.accent,
                        color: '#ffffff',
                      }}
                    >
                      Real-Time
                    </span>
                  </div>

                  {/* Simulated IDE Window */}
                  <div
                    className="rounded-xl border overflow-hidden shadow-2xl transition-all"
                    style={{
                      borderColor: draftTheme.colors.border,
                      backgroundColor: draftTheme.colors.bgApp,
                    }}
                  >
                    {/* Simulated Title Bar */}
                    <div
                      className="h-8 px-3 flex items-center justify-between border-b text-[11px] font-mono"
                      style={{
                        backgroundColor: draftTheme.colors.bgSidebar,
                        borderColor: draftTheme.colors.border,
                        color: draftTheme.colors.fgMuted,
                      }}
                    >
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 font-semibold text-slate-200">
                          {draftTheme.name || 'Untitled Theme'}
                        </span>
                      </div>
                      <span style={{ color: draftTheme.colors.accent }}>TS</span>
                    </div>

                    {/* Simulated Body: Sidebar & Editor */}
                    <div className="flex h-64 text-xs font-mono">
                      {/* Sidebar */}
                      <div
                        className="w-24 p-2 border-r space-y-2 text-[10px]"
                        style={{
                          backgroundColor: draftTheme.colors.bgSidebar,
                          borderColor: draftTheme.colors.border,
                          color: draftTheme.colors.fgMuted,
                        }}
                      >
                        <div className="font-bold uppercase tracking-wider text-[9px]">Explorer</div>
                        <div
                          className="px-1.5 py-0.5 rounded font-semibold"
                          style={{
                            backgroundColor: draftTheme.colors.accentMuted,
                            color: draftTheme.colors.accentHover,
                          }}
                        >
                          main.ts
                        </div>
                        <div className="px-1.5 py-0.5">types.ts</div>
                        <div className="px-1.5 py-0.5">style.css</div>
                      </div>

                      {/* Code Editor */}
                      <div
                        className="flex-1 p-3 overflow-hidden space-y-1"
                        style={{
                          backgroundColor: draftTheme.colors.bgEditor,
                          color: draftTheme.colors.fgPrimary,
                        }}
                      >
                        <div>
                          <span style={{ color: draftTheme.colors.comment }}>// Live custom code preview</span>
                        </div>
                        <div>
                          <span style={{ color: draftTheme.colors.keyword, fontWeight: 600 }}>import</span>{' '}
                          &#123; <span style={{ color: draftTheme.colors.type }}>AppConfig</span> &#125;{' '}
                          <span style={{ color: draftTheme.colors.keyword, fontWeight: 600 }}>from</span>{' '}
                          <span style={{ color: draftTheme.colors.string }}>'./config'</span>;
                        </div>
                        <div className="pt-1">
                          <span style={{ color: draftTheme.colors.keyword, fontWeight: 600 }}>export</span>{' '}
                          <span style={{ color: draftTheme.colors.keyword, fontWeight: 600 }}>const</span>{' '}
                          <span style={{ color: draftTheme.colors.function }}>initApplication</span> = (
                          <span style={{ color: draftTheme.colors.variable }}>port</span>:{' '}
                          <span style={{ color: draftTheme.colors.type }}>number</span>) =&gt; &#123;
                        </div>
                        <div className="pl-4">
                          <span style={{ color: draftTheme.colors.keyword, fontWeight: 600 }}>const</span>{' '}
                          <span style={{ color: draftTheme.colors.variable }}>status</span> ={' '}
                          <span style={{ color: draftTheme.colors.string }}>`Online on port $&#123;port&#125;`</span>;
                        </div>
                        <div className="pl-4 flex items-center">
                          <span style={{ color: draftTheme.colors.keyword, fontWeight: 600 }}>return</span>{' '}
                          <span style={{ color: draftTheme.colors.number }}>200</span>;
                          <span
                            className="inline-block w-1.5 h-3.5 ml-1 animate-pulse"
                            style={{ backgroundColor: draftTheme.colors.cursor }}
                          />
                        </div>
                        <div>&#125;;</div>
                      </div>
                    </div>

                    {/* Simulated Status Bar */}
                    <div
                      className="h-6 px-3 flex items-center justify-between text-[10px] font-mono text-white"
                      style={{
                        backgroundColor: draftTheme.colors.bgStatusBar,
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <span>main</span>
                        <span>0 errors</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>Ln 6, Col 14</span>
                        <span>TypeScript</span>
                      </div>
                    </div>
                  </div>

                  {/* Creator Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleSaveDraftTheme}
                      className="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-colors shadow-lg cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.circleCheck} />
                      <span>Save & Apply Theme</span>
                    </button>

                    <button
                      onClick={() => handleExportTheme(draftTheme)}
                      className="w-full py-2 bg-[#171926] hover:bg-[#202334] border border-[#2b2e42] text-slate-300 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.download} className="text-slate-400" />
                      <span>Export Theme JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INDEPENDENT TERMINAL CUSTOMIZER */}
        {activeTab === 'terminal' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Feedback Toast */}
            {terminalSaveToast && (
              <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.circleCheck} className="text-emerald-400" />
                  <span>{terminalSaveToast}</span>
                </div>
                <button
                  onClick={() => setTerminalSaveToast(null)}
                  className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.close} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Preset Palettes, Color Pickers & Typography */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Curated Quick Presets */}
                <div className="p-4 rounded-xl bg-[#12131d] border border-[#202230] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-300 font-mono uppercase tracking-wider block">
                      1. Curated Terminal Presets (1-Click)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {TERMINAL_PRESETS.length} palettes
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TERMINAL_PRESETS.map((preset) => {
                      const isMatch =
                        terminalDraft.background === preset.background &&
                        terminalDraft.foreground === preset.foreground;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyTerminalPreset(preset)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                            isMatch
                              ? 'border-rose-500 bg-[#191b29] ring-1 ring-rose-500'
                              : 'border-[#222436] bg-[#0c0d15] hover:border-slate-600 hover:bg-[#151624]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-slate-200 truncate">
                              {preset.name}
                            </span>
                          </div>

                          {/* Mini Terminal Color Swatch */}
                          <div
                            className="h-8 rounded p-1.5 flex items-center justify-between border border-[#25283b]"
                            style={{ backgroundColor: preset.background }}
                          >
                            <span
                              className="text-[10px] font-mono font-bold"
                              style={{ color: preset.promptColor }}
                            >
                              $
                            </span>
                            <span
                              className="text-[10px] font-mono truncate"
                              style={{ color: preset.foreground }}
                            >
                              echo "hi"
                            </span>
                            <div
                              className="w-1.5 h-3 rounded-xs"
                              style={{ backgroundColor: preset.cursorColor }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Color Swatches & Custom Pickers */}
                <div className="p-4 rounded-xl bg-[#12131d] border border-[#202230] space-y-4">
                  <span className="text-[11px] font-bold text-rose-300 font-mono uppercase tracking-wider block">
                    2. Custom Terminal Colors
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Background Color */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 font-mono">
                          Canvas Background
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {terminalDraft.background}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#0a0b12] border border-[#232536] rounded-lg p-1.5">
                        <input
                          type="color"
                          value={terminalDraft.background}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, background: e.target.value })
                          }
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={terminalDraft.background}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, background: e.target.value })
                          }
                          className="w-full bg-transparent text-xs font-mono text-slate-200 outline-none"
                          placeholder="#090a0f"
                        />
                      </div>
                      {/* Quick swatches */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        {['#090a0f', '#000000', '#040d06', '#0e0b04', '#080514', '#191a24', '#002b36'].map(
                          (color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setTerminalDraft({ ...terminalDraft, background: color })}
                              title={`Use ${color}`}
                              style={{ backgroundColor: color }}
                              className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Font / Foreground Color */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 font-mono">
                          Main Font / Text
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {terminalDraft.foreground}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#0a0b12] border border-[#232536] rounded-lg p-1.5">
                        <input
                          type="color"
                          value={terminalDraft.foreground}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, foreground: e.target.value })
                          }
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={terminalDraft.foreground}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, foreground: e.target.value })
                          }
                          className="w-full bg-transparent text-xs font-mono text-slate-200 outline-none"
                          placeholder="#cbd5e1"
                        />
                      </div>
                      {/* Quick swatches */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        {['#cbd5e1', '#ffffff', '#4ade80', '#fbbf24', '#f472b6', '#38bdf8', '#f8f8f2'].map(
                          (color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setTerminalDraft({ ...terminalDraft, foreground: color })}
                              title={`Use ${color}`}
                              style={{ backgroundColor: color }}
                              className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Prompt Color */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 font-mono">
                          Prompt Header Color
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {terminalDraft.promptColor}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#0a0b12] border border-[#232536] rounded-lg p-1.5">
                        <input
                          type="color"
                          value={terminalDraft.promptColor}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, promptColor: e.target.value })
                          }
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={terminalDraft.promptColor}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, promptColor: e.target.value })
                          }
                          className="w-full bg-transparent text-xs font-mono text-slate-200 outline-none"
                          placeholder="#fb7185"
                        />
                      </div>
                      {/* Quick swatches */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        {['#fb7185', '#22c55e', '#f59e0b', '#38bdf8', '#bd93f9', '#88c0d0'].map(
                          (color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setTerminalDraft({ ...terminalDraft, promptColor: color })}
                              title={`Use ${color}`}
                              style={{ backgroundColor: color }}
                              className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Caret / Cursor Color */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 font-mono">
                          Terminal Cursor / Caret
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {terminalDraft.cursorColor}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#0a0b12] border border-[#232536] rounded-lg p-1.5">
                        <input
                          type="color"
                          value={terminalDraft.cursorColor}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, cursorColor: e.target.value })
                          }
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={terminalDraft.cursorColor}
                          onChange={(e) =>
                            setTerminalDraft({ ...terminalDraft, cursorColor: e.target.value })
                          }
                          className="w-full bg-transparent text-xs font-mono text-slate-200 outline-none"
                          placeholder="#f43f5e"
                        />
                      </div>
                      {/* Quick swatches */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        {['#f43f5e', '#22c55e', '#f59e0b', '#ec4899', '#bd93f9', '#ffffff'].map(
                          (color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setTerminalDraft({ ...terminalDraft, cursorColor: color })}
                              title={`Use ${color}`}
                              style={{ backgroundColor: color }}
                              className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Typography & Sizing */}
                <div className="p-4 rounded-xl bg-[#12131d] border border-[#202230] space-y-3">
                  <span className="text-[11px] font-bold text-rose-300 font-mono uppercase tracking-wider block">
                    3. Terminal Font & Sizing
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Font Size */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 font-mono block">
                        Font Size: {terminalDraft.fontSize}px
                      </label>
                      <div className="flex items-center space-x-1">
                        {[10, 11, 12, 13, 14, 16].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setTerminalDraft({ ...terminalDraft, fontSize: size })}
                            className={`flex-1 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                              terminalDraft.fontSize === size
                                ? 'bg-rose-700 text-white font-bold'
                                : 'bg-[#151724] text-slate-400 hover:text-white border border-[#232536]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 font-mono block">
                        Font Family
                      </label>
                      <select
                        value={terminalDraft.fontFamily}
                        onChange={(e) =>
                          setTerminalDraft({ ...terminalDraft, fontFamily: e.target.value })
                        }
                        className="w-full bg-[#141622] border border-[#242636] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                        <option value="'Source Code Pro', monospace">Source Code Pro</option>
                        <option value="'Courier New', monospace">Courier New</option>
                        <option value="monospace">Standard Monospace</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Terminal Sandbox & Action Buttons */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                      <FontAwesomeIcon icon={ICONS.terminal} className="text-rose-400" />
                      <span>Live Terminal Sandbox</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Real-Time Preview
                    </span>
                  </div>

                  {/* Simulated Terminal Window */}
                  <div className="rounded-xl border border-[#222436] overflow-hidden shadow-2xl bg-[#0c0d14]">
                    {/* Simulated Panel Tab Header */}
                    <div className="h-8 bg-[#0f1016] border-b border-[#202230] flex items-center justify-between px-3 text-xs font-mono">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-rose-400 border-b-2 border-rose-500 font-semibold px-2 py-1 flex items-center space-x-1">
                          <FontAwesomeIcon icon={ICONS.terminal} className="text-[10px]" />
                          <span>Terminal</span>
                        </span>
                        <span className="text-slate-500 px-2 py-1">Problems (0)</span>
                        <span className="text-slate-500 px-2 py-1">Output</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-[#181926] text-slate-300">bash</span>
                        <span>×</span>
                      </div>
                    </div>

                    {/* Terminal Canvas Body */}
                    <div
                      className="p-3.5 h-64 overflow-y-auto space-y-1.5 transition-colors"
                      style={{
                        backgroundColor: terminalDraft.background,
                        color: terminalDraft.foreground,
                        fontFamily: terminalDraft.fontFamily,
                        fontSize: `${terminalDraft.fontSize}px`,
                      }}
                    >
                      <div className="opacity-70 text-[11px]">
                        CsCode Crimson Terminal — v2.5.0 (x86_64-linux)
                      </div>

                      <div className="space-y-1 pt-1">
                        <div>
                          <span style={{ color: terminalDraft.promptColor, fontWeight: 700 }}>
                            cscode@crimson:~/workspace${' '}
                          </span>
                          <span className="font-semibold" style={{ color: terminalDraft.foreground }}>
                            npm run build
                          </span>
                        </div>
                        <div className="text-emerald-400 text-[11px]">
                          ✓ Built applet artifacts in 128ms
                        </div>

                        <div className="pt-1">
                          <span style={{ color: terminalDraft.promptColor, fontWeight: 700 }}>
                            ccode@crimson:~/workspace${' '}
                          </span>
                          <span className="font-semibold" style={{ color: terminalDraft.foreground }}>
                            git status
                          </span>
                        </div>
                        <div className="opacity-80 text-[11px]">
                          On branch main: Working tree clean (all changes committed)
                        </div>

                        {/* Interactive Sandbox Test Input Line */}
                        <div className="pt-2 flex items-center space-x-1.5 border-t border-white/10">
                          <span
                            style={{ color: terminalDraft.promptColor, fontWeight: 700 }}
                            className="select-none shrink-0"
                          >
                            ccode@crimson:~/workspace${' '}
                          </span>
                          <input
                            type="text"
                            placeholder="Type to test font & caret..."
                            value={testCommandInput}
                            onChange={(e) => setTestCommandInput(e.target.value)}
                            style={{
                              color: terminalDraft.foreground,
                              caretColor: terminalDraft.cursorColor,
                              fontFamily: terminalDraft.fontFamily,
                              fontSize: `${terminalDraft.fontSize}px`,
                            }}
                            className="w-full bg-transparent outline-none border-none p-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveTerminalSettings}
                      className="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition-colors shadow-lg cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.circleCheck} />
                      <span>Save & Apply Terminal Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetTerminalDefaults}
                      className="w-full py-2 bg-[#171926] hover:bg-[#202334] border border-[#2b2e42] text-slate-300 hover:text-white rounded-lg text-xs font-mono flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.sync} className="text-slate-400 text-xs" />
                      <span>Reset to Crimson Defaults</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
