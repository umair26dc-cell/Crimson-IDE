/**
 * Custom CSS Editor & Dynamic Style Injector Section
 * Allows developers to inject custom CSS directly into the IDE with live DOM updates.
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { UserSettings } from '../types';
import { CUSTOM_CSS_PRESETS, applyCustomCssToDOM } from '../lib/customCssEngine';

interface CustomCssSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

export const CustomCssSection: React.FC<CustomCssSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const isEnabled = settings.customCssEnabled !== false;
  const [cssCode, setCssCode] = useState<string>(settings.customCssCode || '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleToggleEnabled = () => {
    const next = !isEnabled;
    onUpdateSettings({ customCssEnabled: next });
    applyCustomCssToDOM(cssCode, next);
  };

  const handleApply = (codeToApply: string = cssCode) => {
    onUpdateSettings({ customCssCode: codeToApply, customCssEnabled: true });
    applyCustomCssToDOM(codeToApply, true);
    setStatusMessage('Custom CSS applied successfully to live DOM!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectPreset = (presetCss: string) => {
    setCssCode(presetCss);
    handleApply(presetCss);
  };

  const handleClear = () => {
    setCssCode('');
    onUpdateSettings({ customCssCode: '', customCssEnabled: false });
    applyCustomCssToDOM('', false);
    setStatusMessage('Custom CSS cleared.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const lineCount = cssCode ? cssCode.split('\n').length : 1;

  return (
    <div className="space-y-6 text-slate-200 text-xs">
      {/* Header */}
      <div className="bg-[#12131c] p-4 rounded-lg border border-[#222432] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={ICONS.code} className="text-rose-400 text-sm" />
            <h3 className="text-sm font-semibold text-slate-100">Live Custom CSS Injection</h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">
            Write custom CSS rules to restyle any part of the IDE. Styles inject live into the DOM in real-time.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-slate-400">Inject Styles:</span>
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              isEnabled ? 'bg-rose-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center space-x-2 text-[11px]">
          <FontAwesomeIcon icon={ICONS.circleCheck} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Preset Buttons */}
      <div>
        <label className="block text-slate-300 font-semibold mb-2">Built-in Custom CSS Presets</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {CUSTOM_CSS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.css)}
              className="p-2.5 rounded bg-[#10111a] hover:bg-[#181a28] border border-[#222432] hover:border-rose-500/50 text-left transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="font-semibold text-slate-200">{preset.name}</div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{preset.description}</div>
              </div>
              <span className="mt-2 text-[9px] uppercase tracking-wider text-rose-400 font-mono font-semibold">
                Load Preset
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CSS Code Editor */}
      <div className="bg-[#10111a] rounded-lg border border-[#222432] overflow-hidden">
        <div className="bg-[#151622] px-3 py-2 border-b border-[#222432] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400 text-[11px] font-mono">
            <span>user-styles.css</span>
            <span>({lineCount} lines)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1 rounded bg-[#1f202e] hover:bg-slate-700 text-slate-300 text-[11px] border border-[#2e3144] transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] shadow-sm transition-colors flex items-center space-x-1"
            >
              <FontAwesomeIcon icon={ICONS.bolt} className="text-[10px]" />
              <span>Apply CSS</span>
            </button>
          </div>
        </div>

        <div className="p-2">
          <textarea
            value={cssCode}
            onChange={(e) => setCssCode(e.target.value)}
            placeholder={`/* Add custom CSS rules here... Example: */\n.token.keyword {\n  text-shadow: 0 0 6px currentColor;\n}\n\nbody {\n  letter-spacing: 0.2px;\n}`}
            className="w-full h-64 p-3 bg-[#0d0e14] text-slate-200 font-mono text-xs rounded border border-[#1e202e] focus:outline-none focus:border-rose-500 resize-y leading-relaxed"
            spellCheck={false}
          />
        </div>

        <div className="bg-[#12131d] px-3 py-2 border-t border-[#1e202e] flex items-center justify-between text-[11px] text-slate-500">
          <span>Target classes: .token, .token.keyword, textarea, aside, button, body</span>
          <span>Injected to: &lt;style id="cscode-custom-user-css"&gt;</span>
        </div>
      </div>
    </div>
  );
};
