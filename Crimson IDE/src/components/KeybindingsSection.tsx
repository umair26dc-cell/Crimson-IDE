/**
 * Keybindings & Keyboard Shortcuts Manager Section
 * Enables developers to view, remap, record, and reset shortcuts across the IDE.
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { UserSettings } from '../types';
import { DEFAULT_KEYBINDINGS, KeybindingDef, getEffectiveKeybinding } from '../lib/keybindingsEngine';

interface KeybindingsSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

export const KeybindingsSection: React.FC<KeybindingsSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const customBindings = settings.customKeybindings || {};
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Key recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't record modifier alone
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let mainKey = e.key.toUpperCase();
      if (e.key === ' ') mainKey = 'Space';
      if (e.key === '`') mainKey = '`';
      if (e.key === ',') mainKey = ',';
      if (e.key === '\\') mainKey = '\\';

      parts.push(mainKey);
      const newShortcut = parts.join('+');

      const nextBindings = { ...customBindings, [recordingId]: newShortcut };
      onUpdateSettings({ customKeybindings: nextBindings });
      setRecordingId(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [recordingId, customBindings, onUpdateSettings]);

  const handleResetBinding = (actionId: string) => {
    const next = { ...customBindings };
    delete next[actionId];
    onUpdateSettings({ customKeybindings: next });
  };

  const handleResetAll = () => {
    onUpdateSettings({ customKeybindings: {} });
  };

  const filtered = DEFAULT_KEYBINDINGS.filter((kb) => {
    const matchesSearch =
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.defaultKey.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || kb.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 text-slate-200 text-xs">
      {/* Header */}
      <div className="bg-[#12131c] p-4 rounded-lg border border-[#222432] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={ICONS.keyboard} className="text-rose-400 text-sm" />
            <h3 className="text-sm font-semibold text-slate-100">Keyboard Shortcuts & Keymap</h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">
            Customize key combinations for every core command. Click 'Record' and press your desired shortcut keys.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded bg-[#1c1d2a] hover:bg-slate-700 text-slate-300 border border-[#2d3044] text-[11px] font-semibold transition-colors"
          >
            Reset All to Defaults
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands or keys (e.g. Save, Diff, Ctrl+S)..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#10111a] text-slate-200 text-xs rounded border border-[#222432] focus:outline-none focus:border-rose-500"
          />
          <FontAwesomeIcon icon={ICONS.search} className="absolute left-2.5 top-2.5 text-slate-500 text-xs" />
        </div>

        <div className="flex space-x-1 overflow-x-auto w-full sm:w-auto">
          {['All', 'File', 'Editor', 'View', 'Navigation', 'Tools'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                selectedCategory === cat
                  ? 'bg-rose-950/40 border border-rose-500/50 text-rose-300 font-semibold'
                  : 'bg-[#10111a] border border-[#222432] text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Shortcuts */}
      <div className="bg-[#10111a] rounded-lg border border-[#222432] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#161724] border-b border-[#222432] text-[11px] text-slate-400">
              <th className="py-2.5 px-3 font-semibold">Command</th>
              <th className="py-2.5 px-3 font-semibold">Category</th>
              <th className="py-2.5 px-3 font-semibold">Keybinding</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1e2c]">
            {filtered.map((item) => {
              const currentKey = getEffectiveKeybinding(item.id, customBindings);
              const isCustomized = !!customBindings[item.id];
              const isRecording = recordingId === item.id;

              return (
                <tr key={item.id} className="hover:bg-[#141522] transition-colors">
                  <td className="py-2 px-3">
                    <div className="font-semibold text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-500">{item.description}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-[#1a1b26] border border-[#2a2d3e] text-[10px] font-mono text-slate-400">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono">
                    {isRecording ? (
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-400 text-rose-200 text-[11px] animate-pulse">
                        Press key combo...
                      </span>
                    ) : (
                      <kbd
                        className={`px-2 py-0.5 rounded text-[11px] border shadow-xs ${
                          isCustomized
                            ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                            : 'bg-[#1b1c28] border-[#2e3144] text-slate-300'
                        }`}
                      >
                        {currentKey}
                      </kbd>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {isRecording ? (
                        <button
                          type="button"
                          onClick={() => setRecordingId(null)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px]"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRecordingId(item.id)}
                          className="px-2.5 py-1 rounded bg-[#1d1f2e] hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-[#2e3144] text-[10px] font-semibold transition-colors"
                        >
                          Record Key
                        </button>
                      )}
                      {isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetBinding(item.id)}
                          title="Reset to default"
                          className="px-2 py-1 rounded bg-[#1a1b26] hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-[#2a2d3e] text-[10px]"
                        >
                          <FontAwesomeIcon icon={ICONS.reset} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
