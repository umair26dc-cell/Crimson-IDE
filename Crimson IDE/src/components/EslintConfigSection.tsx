/**
 * ESLint Workspace Configuration & Rules Studio
 * Comprehensive settings section for defining custom ESLint rules,
 * configuring standard rule severities, setting workspace ignore patterns,
 * testing regex patterns, and exporting .eslintrc.json / .eslintignore.
 */

import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { CustomEslintRule, EslintRuleSeverity, UserSettings } from '../types';
import {
  STANDARD_ESLINT_RULES,
  DEFAULT_ESLINT_RULES,
  STRICT_ESLINT_RULES,
  RELAXED_ESLINT_RULES,
  DEFAULT_ESLINT_IGNORE,
  DEFAULT_CUSTOM_RULES,
  isPathIgnored,
  generateEslintRcJson,
  generateEslintIgnore,
} from '../lib/eslintEngine';

interface EslintConfigSectionProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportEslintFiles?: (rcJsonContent: string, ignoreContent: string) => void;
  onClose?: () => void;
}

export const EslintConfigSection: React.FC<EslintConfigSectionProps> = ({
  settings,
  onUpdateSettings,
  onExportEslintFiles,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<'standard' | 'custom' | 'ignore' | 'export'>('standard');
  const [searchRuleQuery, setSearchRuleQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ignore Pattern Input
  const [newIgnorePattern, setNewIgnorePattern] = useState('');
  const [testPathInput, setTestPathInput] = useState('dist/bundle.min.js');

  // New Custom Rule Form State
  const [isCreatingCustomRule, setIsCreatingCustomRule] = useState(false);
  const [customRuleName, setCustomRuleName] = useState('');
  const [customRuleDescription, setCustomRuleDescription] = useState('');
  const [customRulePattern, setCustomRulePattern] = useState('');
  const [customRuleMessage, setCustomRuleMessage] = useState('');
  const [customRuleSeverity, setCustomRuleSeverity] = useState<'warning' | 'error'>('error');
  const [customRuleExtensions, setCustomRuleExtensions] = useState('ts, tsx, js, jsx');
  const [customRuleTestSnippet, setCustomRuleTestSnippet] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Active configurations with safe fallbacks
  const isEnabled = settings.eslintEnabled !== false;
  const currentRules = useMemo(() => settings.eslintRules || DEFAULT_ESLINT_RULES, [settings.eslintRules]);
  const currentCustomRules = useMemo(() => settings.eslintCustomRules || DEFAULT_CUSTOM_RULES, [settings.eslintCustomRules]);
  const currentIgnorePatterns = useMemo(() => settings.eslintIgnorePatterns || DEFAULT_ESLINT_IGNORE, [settings.eslintIgnorePatterns]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Rule Severity change
  const handleSetRuleSeverity = (ruleName: string, severity: EslintRuleSeverity) => {
    const updated = { ...currentRules, [ruleName]: severity };
    onUpdateSettings({ eslintRules: updated });
    showToast(`Rule '${ruleName}' set to '${severity}'`);
  };

  // Apply Rule Presets
  const handleApplyPreset = (presetType: 'strict' | 'recommended' | 'relaxed') => {
    let preset: Record<string, EslintRuleSeverity>;
    if (presetType === 'strict') preset = STRICT_ESLINT_RULES;
    else if (presetType === 'relaxed') preset = RELAXED_ESLINT_RULES;
    else preset = DEFAULT_ESLINT_RULES;

    onUpdateSettings({ eslintRules: preset });
    showToast(`Applied ${presetType.toUpperCase()} ESLint ruleset`);
  };

  // Reset standard rules
  const handleResetRules = () => {
    onUpdateSettings({
      eslintRules: DEFAULT_ESLINT_RULES,
      eslintIgnorePatterns: DEFAULT_ESLINT_IGNORE,
      eslintCustomRules: DEFAULT_CUSTOM_RULES,
    });
    showToast('Reset all ESLint rules and ignore patterns to defaults');
  };

  // Add Ignore Pattern
  const handleAddIgnorePattern = () => {
    const trimmed = newIgnorePattern.trim();
    if (!trimmed) return;
    if (currentIgnorePatterns.includes(trimmed)) {
      showToast(`Pattern '${trimmed}' already exists`);
      return;
    }
    const updated = [...currentIgnorePatterns, trimmed];
    onUpdateSettings({ eslintIgnorePatterns: updated });
    setNewIgnorePattern('');
    showToast(`Added ignore pattern: ${trimmed}`);
  };

  // Remove Ignore Pattern
  const handleRemoveIgnorePattern = (pattern: string) => {
    const updated = currentIgnorePatterns.filter((p) => p !== pattern);
    onUpdateSettings({ eslintIgnorePatterns: updated });
    showToast(`Removed ignore pattern: ${pattern}`);
  };

  // Quick Add Preset Ignore Pattern
  const handleQuickAddIgnore = (pattern: string) => {
    if (currentIgnorePatterns.includes(pattern)) return;
    const updated = [...currentIgnorePatterns, pattern];
    onUpdateSettings({ eslintIgnorePatterns: updated });
    showToast(`Added: ${pattern}`);
  };

  // Save / Update Custom Rule
  const handleSaveCustomRule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = customRuleName.trim();
    const pattern = customRulePattern.trim();
    const message = customRuleMessage.trim();

    if (!name || !pattern || !message) {
      showToast('Name, Regex Pattern, and Message are required');
      return;
    }

    // Verify regex syntax
    try {
      new RegExp(pattern);
    } catch (err: any) {
      showToast(`Invalid Regex Pattern: ${err.message || 'Syntax error'}`);
      return;
    }

    const exts = customRuleExtensions
      .split(',')
      .map((s) => s.trim().replace(/^\./, ''))
      .filter(Boolean);

    if (editingRuleId) {
      // Update existing
      const updated = currentCustomRules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              name,
              description: customRuleDescription.trim(),
              pattern,
              message,
              severity: customRuleSeverity,
              extensions: exts.length > 0 ? exts : ['ts', 'tsx', 'js', 'jsx'],
            }
          : r
      );
      onUpdateSettings({ eslintCustomRules: updated });
      showToast(`Updated custom rule '${name}'`);
    } else {
      // Add new
      const newRule: CustomEslintRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        description: customRuleDescription.trim(),
        pattern,
        message,
        severity: customRuleSeverity,
        isRegex: true,
        extensions: exts.length > 0 ? exts : ['ts', 'tsx', 'js', 'jsx'],
        enabled: true,
      };
      onUpdateSettings({ eslintCustomRules: [...currentCustomRules, newRule] });
      showToast(`Created custom rule '${name}'`);
    }

    resetCustomRuleForm();
  };

  const handleEditCustomRule = (rule: CustomEslintRule) => {
    setEditingRuleId(rule.id);
    setCustomRuleName(rule.name);
    setCustomRuleDescription(rule.description || '');
    setCustomRulePattern(rule.pattern);
    setCustomRuleMessage(rule.message);
    setCustomRuleSeverity(rule.severity || 'error');
    setCustomRuleExtensions((rule.extensions || ['ts', 'tsx', 'js', 'jsx']).join(', '));
    setIsCreatingCustomRule(true);
  };

  const handleDeleteCustomRule = (id: string, name: string) => {
    const updated = currentCustomRules.filter((r) => r.id !== id);
    onUpdateSettings({ eslintCustomRules: updated });
    showToast(`Deleted custom rule '${name}'`);
  };

  const handleToggleCustomRule = (id: string) => {
    const updated = currentCustomRules.map((r) =>
      r.id === id ? { ...r, enabled: r.enabled === false ? true : false } : r
    );
    onUpdateSettings({ eslintCustomRules: updated });
  };

  const resetCustomRuleForm = () => {
    setEditingRuleId(null);
    setCustomRuleName('');
    setCustomRuleDescription('');
    setCustomRulePattern('');
    setCustomRuleMessage('');
    setCustomRuleSeverity('error');
    setCustomRuleExtensions('ts, tsx, js, jsx');
    setCustomRuleTestSnippet('');
    setIsCreatingCustomRule(false);
  };

  // Test custom regex live
  const customRegexTestResult = useMemo(() => {
    if (!customRulePattern || !customRuleTestSnippet) return null;
    try {
      const reg = new RegExp(customRulePattern, 'g');
      const matches = Array.from(customRuleTestSnippet.matchAll(reg));
      return {
        valid: true,
        matchesCount: matches.length,
        matchValues: matches.map((m) => m[0]).slice(0, 5),
      };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }, [customRulePattern, customRuleTestSnippet]);

  // Ignore path evaluation test
  const isTestPathIgnored = useMemo(() => {
    return isPathIgnored(testPathInput, currentIgnorePatterns);
  }, [testPathInput, currentIgnorePatterns]);

  // Filtered standard rules
  const filteredRules = useMemo(() => {
    return STANDARD_ESLINT_RULES.filter((rule) => {
      const matchesCat = selectedCategory === 'All' || rule.category === selectedCategory;
      const matchesSearch =
        !searchRuleQuery.trim() ||
        rule.name.toLowerCase().includes(searchRuleQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchRuleQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchRuleQuery]);

  // Export configs
  const rcJsonOutput = useMemo(() => {
    return generateEslintRcJson(currentRules, currentCustomRules);
  }, [currentRules, currentCustomRules]);

  const ignoreOutput = useMemo(() => {
    return generateEslintIgnore(currentIgnorePatterns);
  }, [currentIgnorePatterns]);

  const handleExportToWorkspace = () => {
    if (onExportEslintFiles) {
      onExportEslintFiles(rcJsonOutput, ignoreOutput);
      showToast('Wrote .eslintrc.json and .eslintignore to workspace root!');
    } else {
      showToast('Export triggered');
    }
  };

  const handleCopyClipboard = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`Copied ${label} to clipboard!`);
    }
  };

  // Pre-made custom rule templates
  const applyCustomRuleTemplate = (tmpl: {
    name: string;
    description: string;
    pattern: string;
    message: string;
    severity: 'warning' | 'error';
    extensions: string;
  }) => {
    setCustomRuleName(tmpl.name);
    setCustomRuleDescription(tmpl.description);
    setCustomRulePattern(tmpl.pattern);
    setCustomRuleMessage(tmpl.message);
    setCustomRuleSeverity(tmpl.severity);
    setCustomRuleExtensions(tmpl.extensions);
    setIsCreatingCustomRule(true);
  };

  const categories = ['All', 'Variables', 'Best Practices', 'Style', 'TypeScript'];

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 right-6 z-50 px-3.5 py-2 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-mono rounded-lg shadow-xl shadow-black/60 flex items-center space-x-2 animate-fade-in">
          <FontAwesomeIcon icon={ICONS.circleCheck} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Master Toggle & Stats */}
      <div className="p-3.5 rounded-lg border border-[#26283a] bg-[#141522] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
            <FontAwesomeIcon icon={ICONS.check} className="text-sm" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100 text-sm">ESLint Workspace Engine</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                  isEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isEnabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live syntax analysis, custom regex patterns, and ignore filters applied in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onUpdateSettings({ eslintEnabled: !isEnabled })}
            id="btn-toggle-eslint-master"
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
              isEnabled
                ? 'bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700'
                : 'bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-700'
            }`}
          >
            {isEnabled ? 'Disable ESLint' : 'Enable ESLint'}
          </button>

          <button
            onClick={handleExportToWorkspace}
            title="Write .eslintrc.json and .eslintignore to workspace"
            className="px-3 py-1.5 bg-[#1e2030] hover:bg-[#282b40] text-slate-200 rounded border border-[#33364e] font-mono text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.download} className="text-rose-400 text-[11px]" />
            <span>Save to Files</span>
          </button>
        </div>
      </div>

      {/* Sub navigation tabs */}
      <div className="flex items-center justify-between border-b border-[#202232] pb-2">
        <div className="flex items-center space-x-1 font-mono text-xs">
          <button
            id="eslint-subtab-standard"
            onClick={() => setSubTab('standard')}
            className={`px-3 py-1 rounded transition-colors ${
              subTab === 'standard'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151622]'
            }`}
          >
            Standard Rules ({STANDARD_ESLINT_RULES.length})
          </button>

          <button
            id="eslint-subtab-custom"
            onClick={() => setSubTab('custom')}
            className={`px-3 py-1 rounded transition-colors flex items-center space-x-1.5 ${
              subTab === 'custom'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151622]'
            }`}
          >
            <span>Custom Rules</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-900/70 text-[10px] text-rose-300">
              {currentCustomRules.length}
            </span>
          </button>

          <button
            id="eslint-subtab-ignore"
            onClick={() => setSubTab('ignore')}
            className={`px-3 py-1 rounded transition-colors flex items-center space-x-1.5 ${
              subTab === 'ignore'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151622]'
            }`}
          >
            <span>Ignore Patterns</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#202235] text-[10px] text-slate-300">
              {currentIgnorePatterns.length}
            </span>
          </button>

          <button
            id="eslint-subtab-export"
            onClick={() => setSubTab('export')}
            className={`px-3 py-1 rounded transition-colors ${
              subTab === 'export'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151622]'
            }`}
          >
            Export & Files
          </button>
        </div>

        <button
          onClick={handleResetRules}
          title="Reset to default settings"
          className="text-[11px] font-mono text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={ICONS.sync} className="text-[10px]" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* SUBTAB 1: STANDARD RULES */}
      {subTab === 'standard' && (
        <div className="space-y-3">
          {/* Quick Presets & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#10111a] border border-[#1e202e]">
            {/* Presets */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400 font-mono">Presets:</span>
              <button
                onClick={() => handleApplyPreset('recommended')}
                className="px-2 py-0.8 bg-[#181926] hover:bg-rose-950 hover:text-rose-300 border border-[#2a2d40] text-slate-300 rounded font-mono text-[10px] transition-colors"
              >
                Recommended
              </button>
              <button
                onClick={() => handleApplyPreset('strict')}
                className="px-2 py-0.8 bg-[#181926] hover:bg-rose-950 hover:text-rose-300 border border-[#2a2d40] text-slate-300 rounded font-mono text-[10px] transition-colors"
              >
                Strict (Catch All)
              </button>
              <button
                onClick={() => handleApplyPreset('relaxed')}
                className="px-2 py-0.8 bg-[#181926] hover:bg-rose-950 hover:text-rose-300 border border-[#2a2d40] text-slate-300 rounded font-mono text-[10px] transition-colors"
              >
                Relaxed
              </button>
            </div>

            {/* Search */}
            <div className="relative min-w-[200px]">
              <FontAwesomeIcon icon={ICONS.search} className="absolute left-2.5 top-2 text-slate-500 text-[10px]" />
              <input
                type="text"
                placeholder="Search standard rules..."
                value={searchRuleQuery}
                onChange={(e) => setSearchRuleQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-[#090a0f] border border-[#25283c] rounded text-xs text-slate-200 placeholder-slate-500 font-mono outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 font-mono text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.8 rounded-full transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-rose-900/60 text-rose-200 border border-rose-700 font-medium'
                    : 'bg-[#141520] text-slate-400 hover:text-slate-200 border border-[#1e202e]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Rules List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredRules.map((rule) => {
              const currentSeverity: EslintRuleSeverity = currentRules[rule.name] || rule.defaultSeverity || 'off';

              return (
                <div
                  key={rule.name}
                  className="p-2.5 rounded-lg border border-[#1e202e] bg-[#12131d] hover:border-[#2f3248] transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-rose-300 text-xs">{rule.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#1c1e2d] text-slate-400 font-mono text-[10px]">
                        {rule.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{rule.description}</p>
                  </div>

                  {/* Severity Selector */}
                  <div className="flex items-center space-x-1 font-mono text-[10px] shrink-0">
                    {(['off', 'warn', 'error'] as const).map((sev) => {
                      const isSel = currentSeverity === sev;
                      let activeStyle = '';
                      if (sev === 'off') activeStyle = 'bg-slate-800 text-slate-200 border-slate-600 font-bold';
                      if (sev === 'warn') activeStyle = 'bg-amber-950 text-amber-300 border-amber-700 font-bold';
                      if (sev === 'error') activeStyle = 'bg-rose-950 text-rose-300 border-rose-700 font-bold';

                      return (
                        <button
                          key={sev}
                          onClick={() => handleSetRuleSeverity(rule.name, sev)}
                          className={`px-2.5 py-1 rounded uppercase transition-colors border ${
                            isSel ? activeStyle : 'bg-[#0e0f17] text-slate-500 border-[#202232] hover:text-slate-300'
                          }`}
                        >
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredRules.length === 0 && (
              <div className="text-center py-8 text-slate-500 font-mono">
                No rules match &quot;{searchRuleQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CUSTOM RULES STUDIO */}
      {subTab === 'custom' && (
        <div className="space-y-4">
          {/* Header & Quick Creation Button */}
          <div className="flex items-center justify-between pb-1 border-b border-[#1e202e]">
            <div>
              <h4 className="font-semibold text-slate-200 text-xs">Custom ESLint Regex Rules</h4>
              <p className="text-[11px] text-slate-400">
                Define specialized rules that scan workspace files with custom regular expressions and report squiggles.
              </p>
            </div>
            {!isCreatingCustomRule && (
              <button
                onClick={() => {
                  resetCustomRuleForm();
                  setIsCreatingCustomRule(true);
                }}
                id="btn-create-custom-eslint-rule"
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded font-mono text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
                <span>Define New Rule</span>
              </button>
            )}
          </div>

          {/* Quick rule templates when creating */}
          {isCreatingCustomRule && (
            <div className="p-3 rounded-lg border border-rose-900/60 bg-[#151624] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#25283c]">
                <span className="font-semibold font-mono text-xs text-rose-300">
                  {editingRuleId ? 'Edit Custom Rule' : 'New Custom ESLint Rule Definition'}
                </span>
                <button
                  onClick={resetCustomRuleForm}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                >
                  <FontAwesomeIcon icon={ICONS.close} />
                </button>
              </div>

              {/* Template quick picks */}
              {!editingRuleId && (
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px] font-mono pb-1">
                  <span className="text-slate-400 shrink-0">Templates:</span>
                  <button
                    type="button"
                    onClick={() =>
                      applyCustomRuleTemplate({
                        name: 'no-secret-tokens',
                        description: 'Flags accidental hardcoded API tokens or secret keys',
                        pattern: '(api[_-]?key|secret|password|bearer)\\s*[:=]\\s*[\'"][a-zA-Z0-9_\\-]{16,}[\'"]',
                        message: 'Potential secret credential or API key hardcoded in source file',
                        severity: 'error',
                        extensions: 'ts, tsx, js, jsx, json',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-[#1c1e2e] hover:bg-rose-950 text-slate-300 border border-[#2b2e44] whitespace-nowrap"
                  >
                    API Keys
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyCustomRuleTemplate({
                        name: 'no-inner-html',
                        description: 'Disallow dangerous innerHTML assignments to prevent XSS vulnerabilities',
                        pattern: '\\.innerHTML\\s*=',
                        message: 'Direct innerHTML assignment detected. Use textContent or sanitized markup.',
                        severity: 'error',
                        extensions: 'ts, tsx, js, jsx',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-[#1c1e2e] hover:bg-rose-950 text-slate-300 border border-[#2b2e44] whitespace-nowrap"
                  >
                    no-innerHTML
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyCustomRuleTemplate({
                        name: 'no-todo-prod',
                        description: 'Flag unresolved TODO markers before production releases',
                        pattern: '//\\s*TODO\\b',
                        message: 'Unresolved TODO comment found in production code',
                        severity: 'warning',
                        extensions: 'ts, tsx, js, jsx, py',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-[#1c1e2e] hover:bg-rose-950 text-slate-300 border border-[#2b2e44] whitespace-nowrap"
                  >
                    Flag TODO
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyCustomRuleTemplate({
                        name: 'no-window-alert',
                        description: 'Flag window.alert or alert() usage',
                        pattern: '\\balert\\s*\\(',
                        message: 'Unexpected alert() statement. Prefer custom IDE notifications.',
                        severity: 'error',
                        extensions: 'ts, tsx, js, jsx',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-[#1c1e2e] hover:bg-rose-950 text-slate-300 border border-[#2b2e44] whitespace-nowrap"
                  >
                    no-alert
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveCustomRule} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">
                      Rule Identifier / Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. no-hardcoded-credentials"
                      value={customRuleName}
                      onChange={(e) => setCustomRuleName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0b0c13] border border-[#272b3e] rounded font-mono text-xs text-slate-200 outline-none focus:border-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">Severity</label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCustomRuleSeverity('error')}
                        className={`flex-1 py-1.5 rounded font-mono text-xs border transition-colors ${
                          customRuleSeverity === 'error'
                            ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                            : 'bg-[#0d0e16] text-slate-400 border-[#222538]'
                        }`}
                      >
                        Error
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomRuleSeverity('warning')}
                        className={`flex-1 py-1.5 rounded font-mono text-xs border transition-colors ${
                          customRuleSeverity === 'warning'
                            ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                            : 'bg-[#0d0e16] text-slate-400 border-[#222538]'
                        }`}
                      >
                        Warning
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Short summary of what this custom rule enforces"
                    value={customRuleDescription}
                    onChange={(e) => setCustomRuleDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0b0c13] border border-[#272b3e] rounded text-xs text-slate-200 outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">
                      Regular Expression Pattern <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. \\.innerHTML\\s*= or console\\.log\\("
                      value={customRulePattern}
                      onChange={(e) => setCustomRulePattern(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0b0c13] border border-[#272b3e] rounded font-mono text-xs text-rose-300 outline-none focus:border-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">File Extensions</label>
                    <input
                      type="text"
                      placeholder="ts, tsx, js, jsx"
                      value={customRuleExtensions}
                      onChange={(e) => setCustomRuleExtensions(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0b0c13] border border-[#272b3e] rounded font-mono text-xs text-slate-200 outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Diagnostic Message <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dangerous innerHTML assignment detected. Use textContent instead."
                    value={customRuleMessage}
                    onChange={(e) => setCustomRuleMessage(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0b0c13] border border-[#272b3e] rounded text-xs text-slate-200 outline-none focus:border-rose-500"
                    required
                  />
                </div>

                {/* Interactive Regex Live Tester */}
                <div className="p-2.5 rounded border border-[#222536] bg-[#0c0d14] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center space-x-1.5 text-slate-300">
                      <FontAwesomeIcon icon={ICONS.play} className="text-rose-400 text-[10px]" />
                      <span>Live Pattern Sandbox Tester</span>
                    </span>
                    {customRegexTestResult && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          customRegexTestResult.valid
                            ? (customRegexTestResult.matchesCount || 0) > 0
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {customRegexTestResult.valid
                          ? `${customRegexTestResult.matchesCount || 0} match(es) detected`
                          : `Regex error: ${customRegexTestResult.error}`}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Type sample test code to test regex pattern live..."
                    value={customRuleTestSnippet}
                    onChange={(e) => setCustomRuleTestSnippet(e.target.value)}
                    className="w-full px-2.5 py-1 bg-[#141520] border border-[#242738] rounded font-mono text-xs text-slate-200 outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={resetCustomRuleForm}
                    className="px-3 py-1.5 rounded bg-[#1c1e2d] hover:bg-[#25283c] text-slate-300 font-mono text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <FontAwesomeIcon icon={ICONS.check} />
                    <span>{editingRuleId ? 'Update Rule' : 'Save Custom Rule'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Custom Rules */}
          <div className="space-y-2">
            {currentCustomRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-lg border border-[#222436] bg-[#12131e] hover:border-[#2f324b] transition-colors flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-mono font-semibold text-rose-300 text-xs">{rule.name}</span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-semibold ${
                        rule.severity === 'error'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {rule.severity}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        rule.enabled !== false ? 'bg-emerald-950/70 text-emerald-300' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rule.enabled !== false ? 'Active' : 'Disabled'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      [{ (rule.extensions || ['ts', 'tsx', 'js', 'jsx']).join(', ') }]
                    </span>
                  </div>

                  {rule.description && <p className="text-[11px] text-slate-400">{rule.description}</p>}

                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="text-slate-500">Pattern:</span>
                    <code className="text-rose-400/90 bg-[#0c0d15] px-1.5 py-0.5 rounded border border-[#212334]">
                      /{rule.pattern}/
                    </code>
                  </div>

                  <div className="text-[11px] text-slate-300 italic">
                    &ldquo;{rule.message}&rdquo;
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 pt-0.5">
                  <button
                    onClick={() => handleToggleCustomRule(rule.id)}
                    title={rule.enabled !== false ? 'Disable rule' : 'Enable rule'}
                    className={`px-2 py-1 rounded font-mono text-[10px] transition-colors ${
                      rule.enabled !== false
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                        : 'bg-[#1b1c2b] text-slate-400'
                    }`}
                  >
                    {rule.enabled !== false ? 'ENABLED' : 'DISABLED'}
                  </button>
                  <button
                    onClick={() => handleEditCustomRule(rule)}
                    title="Edit custom rule"
                    className="p-1.5 rounded hover:bg-[#202235] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <FontAwesomeIcon icon={ICONS.edit} className="text-xs" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomRule(rule.id, rule.name)}
                    title="Delete custom rule"
                    className="p-1.5 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <FontAwesomeIcon icon={ICONS.trash} className="text-xs" />
                  </button>
                </div>
              </div>
            ))}

            {currentCustomRules.length === 0 && (
              <div className="p-8 text-center border border-dashed border-[#25283c] rounded-lg text-slate-500 font-mono">
                No custom ESLint rules defined yet. Click &quot;Define New Rule&quot; to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: IGNORE PATTERNS */}
      {subTab === 'ignore' && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-200 text-xs">Workspace Ignore Patterns (.eslintignore)</h4>
            <p className="text-[11px] text-slate-400">
              Files and directories matching these patterns will be excluded from ESLint checks across the workspace.
            </p>
          </div>

          {/* Add Pattern Input */}
          <div className="p-3 rounded-lg border border-[#222538] bg-[#12131e] space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Enter glob or path pattern (e.g. dist/**, *.min.js, vendor/*)..."
                value={newIgnorePattern}
                onChange={(e) => setNewIgnorePattern(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIgnorePattern();
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-[#090a10] border border-[#26293e] rounded font-mono text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-rose-500"
              />
              <button
                onClick={handleAddIgnorePattern}
                id="btn-add-eslint-ignore-pattern"
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
                <span>Add Pattern</span>
              </button>
            </div>

            {/* Quick Add Suggestions */}
            <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px] font-mono pt-1">
              <span className="text-slate-500 shrink-0">Common:</span>
              {['dist/**', 'build/**', '*.min.js', '*.d.ts', 'coverage/**', '*.bundle.js', 'temp/**', 'vendor/**'].map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => handleQuickAddIgnore(p)}
                    className="px-2 py-0.5 bg-[#171826] hover:bg-rose-950 text-slate-300 hover:text-rose-300 rounded border border-[#26283a] whitespace-nowrap transition-colors"
                  >
                    + {p}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Interactive Pattern Tester */}
          <div className="p-3 rounded-lg border border-[#222538] bg-[#0e0f17] space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                <FontAwesomeIcon icon={ICONS.search} className="text-rose-400 text-[10px]" />
                <span>Ignore Pattern Matcher Tester</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  isTestPathIgnored
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {isTestPathIgnored ? 'EXCLUDED (File will be ignored)' : 'INCLUDED (File will be linted)'}
              </span>
            </div>
            <input
              type="text"
              placeholder="Test file path e.g. dist/app.min.js or src/main.ts..."
              value={testPathInput}
              onChange={(e) => setTestPathInput(e.target.value)}
              className="w-full px-2.5 py-1 bg-[#141522] border border-[#24273c] rounded font-mono text-xs text-slate-200 outline-none focus:border-rose-500"
            />
          </div>

          {/* List of Patterns */}
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {currentIgnorePatterns.map((pattern) => (
              <div
                key={pattern}
                className="px-3 py-1.5 rounded bg-[#131420] border border-[#1f2132] hover:border-[#2e314a] transition-colors flex items-center justify-between font-mono text-xs text-slate-300"
              >
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.file} className="text-slate-500 text-[10px]" />
                  <span>{pattern}</span>
                </div>
                <button
                  onClick={() => handleRemoveIgnorePattern(pattern)}
                  title="Remove ignore pattern"
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                >
                  <FontAwesomeIcon icon={ICONS.trash} className="text-[10px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: EXPORT & FILES */}
      {subTab === 'export' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-200 text-xs">Export & Workspace File Synchronization</h4>
              <p className="text-[11px] text-slate-400">
                Generate real standard configuration files that seamlessly reflect your custom rules and ignores.
              </p>
            </div>
            <button
              onClick={handleExportToWorkspace}
              id="btn-export-eslint-to-workspace"
              className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.download} />
              <span>Write to Workspace Root</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* .eslintrc.json */}
            <div className="p-3 rounded-lg border border-[#202236] bg-[#0c0d14] space-y-2 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1f2134]">
                <span className="font-mono font-semibold text-rose-300 text-xs">.eslintrc.json</span>
                <button
                  onClick={() => handleCopyClipboard(rcJsonOutput, '.eslintrc.json')}
                  className="text-[10px] font-mono text-slate-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <FontAwesomeIcon icon={ICONS.copy} className="text-[9px]" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="flex-1 max-h-[220px] overflow-y-auto p-2 rounded bg-[#07080d] border border-[#1b1d2c] font-mono text-[10px] text-slate-300 whitespace-pre">
                {rcJsonOutput}
              </pre>
            </div>

            {/* .eslintignore */}
            <div className="p-3 rounded-lg border border-[#202236] bg-[#0c0d14] space-y-2 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1f2134]">
                <span className="font-mono font-semibold text-rose-300 text-xs">.eslintignore</span>
                <button
                  onClick={() => handleCopyClipboard(ignoreOutput, '.eslintignore')}
                  className="text-[10px] font-mono text-slate-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <FontAwesomeIcon icon={ICONS.copy} className="text-[9px]" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="flex-1 max-h-[220px] overflow-y-auto p-2 rounded bg-[#07080d] border border-[#1b1d2c] font-mono text-[10px] text-slate-300 whitespace-pre">
                {ignoreOutput}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
