/**
 * Plugin Marketplace & Developer Packaging Studio
 * Allows developers to package and distribute plugins, and users to browse, install,
 * update, uninstall, and configure extensions across language support, linters, debuggers, and UI.
 * 100% FontAwesome iconography - Zero emojis.
 */

import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { PluginCategory, PluginDefinition, PluginPackageDraft } from '../types';
import { MARKETPLACE_CATALOGUE, packagePlugin } from '../lib/plugins';

interface PluginMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  installedPlugins: PluginDefinition[];
  onInstall: (plugin: PluginDefinition) => void;
  onUninstall: (pluginId: string) => void;
  onUpdate: (pluginId: string, targetVersion: string) => void;
  onToggle: (pluginId: string) => void;
}

export const PluginMarketplaceModal: React.FC<PluginMarketplaceModalProps> = ({
  isOpen,
  onClose,
  installedPlugins,
  onInstall,
  onUninstall,
  onUpdate,
  onToggle,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'installed' | 'developer'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginDefinition | null>(null);

  // Developer packaging state
  const [draftId, setDraftId] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftVersion, setDraftVersion] = useState('1.0.0');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftCategory, setDraftCategory] = useState<PluginCategory>('Language Support');
  const [draftPermissions, setDraftPermissions] = useState<string[]>(['workspace:read', 'editor:decorations']);
  const [draftCode, setDraftCode] = useState(`export function activate(context) {\n  console.log('[CustomPlugin] Activated');\n}\nexport function deactivate() {}`);
  const [packagingResult, setPackagingResult] = useState<{ isValid: boolean; errors: string[]; manifestJson: string } | null>(null);

  const categories = [
    'All',
    'AI Tools',
    'Language Support',
    'Linters',
    'Debuggers',
    'UI Enhancements',
    'Themes',
    'Keymaps'
  ];

  // Merge marketplace catalogue with installed plugin states
  const allMarketplacePlugins = useMemo(() => {
    const installedMap = new Map(installedPlugins.map((p) => [p.id, p]));
    return MARKETPLACE_CATALOGUE.map((item) => {
      const installed = installedMap.get(item.id);
      if (installed) {
        return {
          ...item,
          installed: true,
          enabled: installed.enabled,
          installedVersion: installed.version,
        };
      }
      return {
        ...item,
        installed: false,
        enabled: false,
      };
    });
  }, [installedPlugins]);

  // Filtered plugins
  const filteredPlugins = useMemo(() => {
    let list = activeTab === 'installed' ? installedPlugins : allMarketplacePlugins;

    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, allMarketplacePlugins, installedPlugins, selectedCategory, searchQuery]);

  const handlePackageAndPublish = () => {
    const draft: PluginPackageDraft = {
      id: draftId.trim().toLowerCase(),
      name: draftName.trim(),
      version: draftVersion.trim(),
      author: draftAuthor.trim(),
      description: draftDesc.trim(),
      category: draftCategory,
      permissions: draftPermissions,
      entryCode: draftCode,
      icon: 'cube',
    };

    const res = packagePlugin(draft);
    setPackagingResult(res);

    if (res.isValid && res.packagedPlugin) {
      onInstall(res.packagedPlugin);
      setSelectedPlugin(res.packagedPlugin);
    }
  };

  const togglePermission = (perm: string) => {
    setDraftPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] bg-[#0f1118] border border-rose-900/40 rounded-xl shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="h-14 px-5 bg-[#131520] border-b border-[#202334] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-950/70 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <FontAwesomeIcon icon={ICONS.store} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                CsCode Extension Marketplace
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Browse, distribute, and package extensions
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Tabs */}
            <div className="flex items-center bg-[#0a0b10] p-1 rounded-lg border border-[#202232] text-xs font-mono">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'browse' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setActiveTab('installed')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'installed' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Installed ({installedPlugins.length})
              </button>
              <button
                onClick={() => setActiveTab('developer')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'developer' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Package Plugin
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-[#202334] transition-colors"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab !== 'developer' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Plugin List */}
            <div className="w-3/5 border-r border-[#202334] flex flex-col">
              {/* Filter & Search Bar */}
              <div className="p-3 border-b border-[#202334] space-y-2 bg-[#11131c]">
                <div className="relative">
                  <FontAwesomeIcon
                    icon={ICONS.search}
                    className="absolute left-3 top-2.5 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search extensions by name, category, or author..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#090a10] border border-[#232638] rounded-md text-xs text-slate-200 font-mono outline-none focus:border-rose-500"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-0.5 rounded-full shrink-0 border transition-colors ${
                        selectedCategory === cat
                          ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-semibold'
                          : 'bg-[#171924] border-[#252839] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plugin Items Scroll View */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#1a1c2a] p-2 space-y-1">
                {filteredPlugins.map((plugin) => {
                  const isInstalled = plugin.installed;
                  const hasUpdate = isInstalled && plugin.latestVersion && plugin.installedVersion && plugin.latestVersion !== plugin.installedVersion;
                  const isSelected = selectedPlugin?.id === plugin.id;

                  return (
                    <div
                      key={plugin.id}
                      onClick={() => setSelectedPlugin(plugin)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-start space-x-3 ${
                        isSelected
                          ? 'bg-[#1c1f2e] border border-rose-900/50'
                          : 'hover:bg-[#151722]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#0c0d14] border border-[#25283a] flex items-center justify-center text-rose-400 text-base shrink-0">
                        <FontAwesomeIcon icon={(ICONS as any)[plugin.icon] || ICONS.cube} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-xs font-bold text-slate-200 font-mono truncate">
                              {plugin.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              v{plugin.latestVersion || plugin.version}
                            </span>
                          </div>

                          {/* Quick Action Button */}
                          <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {hasUpdate && (
                              <button
                                onClick={() => onUpdate(plugin.id, plugin.latestVersion!)}
                                className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 hover:bg-amber-900 text-[10px] font-mono font-semibold"
                              >
                                Update to v{plugin.latestVersion}
                              </button>
                            )}

                            {isInstalled ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => onToggle(plugin.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                    plugin.enabled
                                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                                      : 'bg-[#181a24] text-slate-400 border-[#2a2c3a]'
                                  }`}
                                >
                                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                                <button
                                  onClick={() => onUninstall(plugin.id)}
                                  title="Uninstall Extension"
                                  className="p-1 hover:text-rose-400 text-slate-400 rounded transition-colors text-xs"
                                >
                                  <FontAwesomeIcon icon={ICONS.trash} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => onInstall(plugin)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-mono font-semibold shadow-sm transition-colors"
                              >
                                Install
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-normal">
                          {plugin.description}
                        </p>

                        <div className="flex items-center space-x-3 mt-2 text-[10px] text-slate-400 font-mono">
                          <span className="text-slate-300">{plugin.author}</span>
                          <span className="flex items-center space-x-1">
                            <FontAwesomeIcon icon={ICONS.download} className="text-slate-400 text-[9px]" />
                            <span>{plugin.downloads}</span>
                          </span>
                          <span className="flex items-center space-x-1 text-amber-400">
                            <FontAwesomeIcon icon={ICONS.star} className="text-[9px]" />
                            <span>{plugin.rating}</span>
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#171924] text-slate-300">
                            {plugin.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredPlugins.length === 0 && (
                  <div className="p-8 text-center text-slate-400 font-mono text-xs">
                    No extensions found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Selected Plugin Detail Drawer */}
            <div className="w-2/5 flex flex-col bg-[#0b0c12] p-4 overflow-y-auto">
              {selectedPlugin ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#202334]">
                    <div className="w-12 h-12 rounded-xl bg-[#141622] border border-rose-900/40 flex items-center justify-center text-rose-400 text-xl">
                      <FontAwesomeIcon icon={(ICONS as any)[selectedPlugin.icon] || ICONS.cube} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 font-mono">
                        {selectedPlugin.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        by {selectedPlugin.author} • v{selectedPlugin.version}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center space-x-2">
                    {selectedPlugin.installed ? (
                      <>
                        <button
                          onClick={() => onToggle(selectedPlugin.id)}
                          className={`flex-1 py-1.5 rounded text-xs font-mono font-semibold border ${
                            selectedPlugin.enabled
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-[#1c1e2a] text-slate-300 border-[#2a2d3c]'
                          }`}
                        >
                          {selectedPlugin.enabled ? 'Disable Extension' : 'Enable Extension'}
                        </button>
                        <button
                          onClick={() => onUninstall(selectedPlugin.id)}
                          className="px-3 py-1.5 bg-[#1f212f] hover:bg-rose-950 hover:text-rose-300 border border-[#2b2e40] rounded text-xs text-slate-300 font-mono font-semibold transition-colors"
                        >
                          Uninstall
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onInstall(selectedPlugin)}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-semibold shadow-md transition-colors"
                      >
                        Install Extension
                      </button>
                    )}
                  </div>

                  {/* Security Permissions Notice */}
                  {selectedPlugin.permissions && selectedPlugin.permissions.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#12141e] border border-[#242738] space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-300 font-mono">
                        <FontAwesomeIcon icon={ICONS.shield} />
                        <span>Permissions Requested</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedPlugin.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded bg-[#1c1f2e] border border-[#2c3044] text-[10px] text-slate-300 font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Readme / Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Documentation & Details
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {selectedPlugin.description}
                    </p>
                    {selectedPlugin.readme && (
                      <div className="p-3 bg-[#07080c] border border-[#1b1c28] rounded-md font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedPlugin.readme}
                      </div>
                    )}
                  </div>

                  {/* Changelog */}
                  {selectedPlugin.changelog && (
                    <div className="space-y-1 pt-2 border-t border-[#1e202c]">
                      <h4 className="text-[11px] font-semibold text-slate-400 font-mono">
                        Release Notes
                      </h4>
                      <p className="text-[11px] text-slate-300 font-mono italic">
                        {selectedPlugin.changelog}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs font-mono text-center">
                  <FontAwesomeIcon icon={ICONS.cube} className="text-3xl text-slate-600 mb-2" />
                  <p>Select an extension to review details, documentation, and permissions.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Developer Hub: Package & Distribute Extension */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-3 bg-gradient-to-r from-rose-950/40 to-transparent border border-rose-900/40 rounded-lg">
              <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                Developer Packaging Tool
              </h3>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Package and distribute custom extensions for the CsCode Crimson Code ecosystem. Define metadata, validate permissions, and publish directly to the IDE runtime.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Plugin Identifier (ID)</label>
                <input
                  type="text"
                  value={draftId}
                  onChange={(e) => setDraftId(e.target.value)}
                  placeholder="e.g. crimson-graphql-inspector"
                  className="w-full bg-[#12141e] border border-[#292c3d] rounded p-2 text-slate-200 outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Display Name</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. GraphQL Inspector Pro"
                  className="w-full bg-[#12141e] border border-[#292c3d] rounded p-2 text-slate-200 outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Version (SemVer)</label>
                <input
                  type="text"
                  value={draftVersion}
                  onChange={(e) => setDraftVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full bg-[#12141e] border border-[#292c3d] rounded p-2 text-slate-200 outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Author or Organization</label>
                <input
                  type="text"
                  value={draftAuthor}
                  onChange={(e) => setDraftAuthor(e.target.value)}
                  placeholder="e.g. Acme DevTools"
                  className="w-full bg-[#12141e] border border-[#292c3d] rounded p-2 text-slate-200 outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Category</label>
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value as PluginCategory)}
                  className="w-full bg-[#12141e] border border-[#292c3d] rounded p-2 text-slate-200 outline-none focus:border-rose-500"
                >
                  <option value="Language Support">Language Support</option>
                  <option value="Linters">Linters</option>
                  <option value="Debuggers">Debuggers</option>
                  <option value="UI Enhancements">UI Enhancements</option>
                  <option value="AI Tools">AI Tools</option>
                  <option value="Themes">Themes</option>
                  <option value="Productivity">Productivity</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Permissions Sandbox</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['workspace:read', 'workspace:write', 'editor:decorations', 'diagnostics', 'terminal:exec', 'debugger:control'].map((p) => {
                    const isChecked = draftPermissions.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePermission(p)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          isChecked
                            ? 'bg-rose-950 text-rose-300 border-rose-700 font-semibold'
                            : 'bg-[#151722] text-slate-400 border-[#272a3a]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <label className="text-slate-300 font-semibold">Short Description</label>
              <textarea
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="High-performance extension that provides schema auto-completion and query validation..."
                rows={2}
                className="w-full bg-[#12141e] border border-[#292c3d] rounded p-2 text-slate-200 outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="space-y-1 text-xs font-mono">
              <label className="text-slate-300 font-semibold">Extension Entry Code (TypeScript / JavaScript)</label>
              <textarea
                value={draftCode}
                onChange={(e) => setDraftCode(e.target.value)}
                rows={4}
                className="w-full bg-[#0a0b10] border border-[#25283a] rounded p-2 text-slate-200 font-mono outline-none focus:border-rose-500 resize-none text-[11px]"
              />
            </div>

            {/* Packaging Errors / Success Banner */}
            {packagingResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  packagingResult.isValid
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {packagingResult.isValid ? (
                  <div>
                    <span className="font-bold">Package Generated Successfully!</span>
                    <p className="mt-1 text-[11px] text-emerald-200">
                      Extension has been validated, packaged, and registered to your local IDE runtime.
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold">Validation Issues:</span>
                    <ul className="list-disc pl-4 mt-1 text-[11px]">
                      {packagingResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handlePackageAndPublish}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-semibold flex items-center space-x-2 shadow-md transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.upload} />
                <span>Package & Publish Extension</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
