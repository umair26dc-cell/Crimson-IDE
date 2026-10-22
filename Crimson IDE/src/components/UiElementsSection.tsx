/**
 * Tab Bar, Rulers & UI Elements Deep Customization Section
 * Lets users customize tab shape, dirty indicators, column rulers,
 * status bar widget toggles, and breadcrumb separators.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import {
  TabStyle,
  TabDirtyStyle,
  TabCloseButton,
  StatusBarStyle,
  UserSettings,
} from '../types';

interface UiElementsSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

export const UiElementsSection: React.FC<UiElementsSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentTabStyle: TabStyle = settings.tabStyle || 'default';
  const currentDirtyStyle: TabDirtyStyle = settings.tabDirtyStyle || 'dot';
  const currentCloseBtn: TabCloseButton = settings.tabCloseButton || 'right';
  const showTabIcons = settings.showTabIcons !== false;

  const currentStatusBarStyle: StatusBarStyle = settings.statusBarStyle || 'default';
  const currentRulers = settings.editorRulers || [];
  const currentRulerPreset = currentRulers.length === 0
    ? 'none'
    : currentRulers.length === 1 && currentRulers[0] === 80
    ? '80'
    : currentRulers.length === 1 && currentRulers[0] === 100
    ? '100'
    : currentRulers.length === 2 && currentRulers[0] === 80 && currentRulers[1] === 120
    ? '80-120'
    : 'custom';

  const handleSetRulerPreset = (preset: string) => {
    if (preset === 'none') {
      onUpdateSettings({ editorRulers: [] });
    } else if (preset === '80') {
      onUpdateSettings({ editorRulers: [80] });
    } else if (preset === '100') {
      onUpdateSettings({ editorRulers: [100] });
    } else if (preset === '80-120') {
      onUpdateSettings({ editorRulers: [80, 120] });
    }
  };

  return (
    <div className="space-y-6 text-slate-200 text-xs">
      {/* Header */}
      <div className="bg-[#12131c] p-4 rounded-lg border border-[#222432] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={ICONS.sliders} className="text-rose-400 text-sm" />
            <h3 className="text-sm font-semibold text-slate-100">Tabs, Rulers & Chrome Elements</h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">
            Fine-tune tab styling, column guides, status bar components, and breadcrumbs navigation.
          </p>
        </div>
      </div>

      {/* Tab Shape & Aesthetics */}
      <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432] space-y-4">
        <h4 className="font-semibold text-slate-200">Editor Tab Bar Aesthetics</h4>

        {/* Tab Style Options */}
        <div>
          <label className="block text-slate-400 text-[11px] mb-2">Tab Aesthetic Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'default', label: 'Default Box', desc: 'Classic dark border tabs' },
              { id: 'pill', label: 'Floating Pill', desc: 'Modern rounded capsule tabs' },
              { id: 'underline', label: 'Underline Glow', desc: 'Bottom crimson glowing line' },
              { id: 'trapezoid', label: 'Trapezoid', desc: 'Browser-style slant tabs' },
              { id: 'minimal', label: 'Minimal Flat', desc: 'Borderless flush tabs' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onUpdateSettings({ tabStyle: t.id as TabStyle })}
                className={`p-2.5 rounded border text-left transition-all ${
                  currentTabStyle === t.id
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-[#151622] border-[#252838] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Dirty Indicator & Close Button */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1d1f2d]">
          {/* Dirty Indicator */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1.5">Unsaved (Dirty) Indicator</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'dot', label: 'Glowing Dot' },
                { id: 'asterisk', label: 'Asterisk (*)' },
                { id: 'bar', label: 'Left Bar' },
                { id: 'badge', label: 'Pill Badge' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onUpdateSettings({ tabDirtyStyle: d.id as TabDirtyStyle })}
                  className={`py-1 px-2 rounded border text-center text-[10px] font-mono transition-colors ${
                    currentDirtyStyle === d.id
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-[#171825] border-[#292c3e] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Close Button Position */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1.5">Close Button Placement</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'right', label: 'Right Side' },
                { id: 'left', label: 'Left Side' },
                { id: 'hover', label: 'Hover Only' },
                { id: 'hidden', label: 'Hidden' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onUpdateSettings({ tabCloseButton: c.id as TabCloseButton })}
                  className={`py-1 px-2 rounded border text-center text-[10px] font-mono transition-colors ${
                    currentCloseBtn === c.id
                      ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                      : 'bg-[#171825] border-[#292c3e] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Show Icons Toggle */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1.5">Tab File Icons</label>
            <div className="flex items-center justify-between p-2 rounded bg-[#151622] border border-[#252838]">
              <span className="text-slate-300 text-[11px]">Display File Type Icons</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ showTabIcons: !showTabIcons })}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  showTabIcons ? 'bg-rose-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    showTabIcons ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Column Rulers & Guides */}
      <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432] space-y-3">
        <h4 className="font-semibold text-slate-200">Editor Column Rulers & Code Margin Guides</h4>
        <p className="text-slate-400 text-[11px]">
          Display vertical alignment guidelines at standard character columns to avoid line overflow.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'none', label: 'No Rulers', desc: 'Clean editor canvas' },
            { id: '80', label: '80 Columns', desc: 'Standard PEP 8 & Unix' },
            { id: '100', label: '100 Columns', desc: 'Modern wide monitors' },
            { id: '80-120', label: '80 & 120 Columns', desc: 'Soft & Hard limits' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSetRulerPreset(r.id)}
              className={`p-2.5 rounded border text-left transition-all ${
                currentRulerPreset === r.id
                  ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-sm'
                  : 'bg-[#151622] border-[#252838] text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="font-semibold">{r.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Bar Customization */}
      <div className="bg-[#10111a] p-4 rounded-lg border border-[#222432] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200">Status Bar Widget Display & Styling</h4>
          <div className="flex space-x-1">
            {[
              { id: 'default', label: 'Solid Dark' },
              { id: 'translucent', label: 'Translucent' },
              { id: 'accent', label: 'Crimson Accent' },
              { id: 'minimal', label: 'Minimal Flush' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onUpdateSettings({ statusBarStyle: s.id as StatusBarStyle })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  currentStatusBarStyle === s.id
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                    : 'bg-[#151622] border-[#252838] text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {[
            { key: 'statusBarShowBranch', label: 'Git Branch' },
            { key: 'statusBarShowLineCol', label: 'Line & Column' },
            { key: 'statusBarShowLanguage', label: 'Language Mode' },
            { key: 'statusBarShowDiagnostics', label: 'Error Diagnostics' },
            { key: 'statusBarShowEncoding', label: 'UTF-8 Encoding' },
            { key: 'statusBarShowIndent', label: 'Spaces / Tab Size' },
            { key: 'statusBarShowWordCount', label: 'Word & Char Count' },
            { key: 'statusBarShowClock', label: 'Clock & Local Time' },
          ].map((widget) => {
            const isVisible = (settings as any)[widget.key] !== false;
            return (
              <label
                key={widget.key}
                className="flex items-center space-x-2 p-2 rounded bg-[#151622] border border-[#252838] cursor-pointer hover:bg-[#191b29] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => onUpdateSettings({ [widget.key]: e.target.checked })}
                  className="rounded bg-[#10111a] border-slate-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-300">{widget.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
