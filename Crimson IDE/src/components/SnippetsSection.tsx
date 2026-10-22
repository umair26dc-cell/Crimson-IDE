/**
 * Code Snippets Customization Section
 * Enables users to manage custom snippet templates, prefix triggers, and boilerplate expanders.
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { CustomCodeSnippet, LanguageId, UserSettings } from '../types';
import { DEFAULT_SNIPPETS } from '../lib/snippetsEngine';

interface SnippetsSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

export const SnippetsSection: React.FC<SnippetsSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const snippets = settings.customSnippets && settings.customSnippets.length > 0
    ? settings.customSnippets
    : DEFAULT_SNIPPETS;

  const [editingSnippet, setEditingSnippet] = useState<CustomCodeSnippet | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [filterLang, setFilterLang] = useState<string>('all');

  const handleSaveSnippet = (snippet: CustomCodeSnippet) => {
    let nextList: CustomCodeSnippet[];
    if (snippets.some((s) => s.id === snippet.id)) {
      nextList = snippets.map((s) => (s.id === snippet.id ? snippet : s));
    } else {
      nextList = [...snippets, snippet];
    }
    onUpdateSettings({ customSnippets: nextList });
    setEditingSnippet(null);
    setIsCreatingNew(false);
  };

  const handleDeleteSnippet = (id: string) => {
    const nextList = snippets.filter((s) => s.id !== id);
    onUpdateSettings({ customSnippets: nextList });
    if (editingSnippet?.id === id) {
      setEditingSnippet(null);
    }
  };

  const handleResetToDefaults = () => {
    onUpdateSettings({ customSnippets: DEFAULT_SNIPPETS });
    setEditingSnippet(null);
    setIsCreatingNew(false);
  };

  const handleStartNew = () => {
    const newSnippet: CustomCodeSnippet = {
      id: `snippet-${Date.now()}`,
      name: 'New Custom Snippet',
      prefix: 'mysnip',
      language: 'typescript',
      description: 'Quick boilerplate snippet',
      body: `// Custom snippet body\n`,
    };
    setEditingSnippet(newSnippet);
    setIsCreatingNew(true);
  };

  const filtered = snippets.filter(
    (s) => filterLang === 'all' || s.language === 'all' || s.language === filterLang
  );

  return (
    <div className="space-y-6 text-slate-200 text-xs">
      {/* Header */}
      <div className="bg-[#12131c] p-4 rounded-lg border border-[#222432] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={ICONS.bolt} className="text-rose-400 text-sm" />
            <h3 className="text-sm font-semibold text-slate-100">Code Snippets & Template Expander</h3>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">
            Define custom abbreviation triggers to expand code blocks and boilerplate across languages.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-2.5 py-1.5 rounded bg-[#1c1d2a] hover:bg-slate-700 text-slate-300 border border-[#2d3044] text-[11px] transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleStartNew}
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
            <span>New Snippet</span>
          </button>
        </div>
      </div>

      {/* Editor Modal / Form if Editing */}
      {editingSnippet && (
        <div className="bg-[#10111a] p-4 rounded-lg border border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.15)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-rose-300">
              {isCreatingNew ? 'Create New Code Snippet' : 'Edit Snippet'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setEditingSnippet(null);
                setIsCreatingNew(false);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Snippet Name</label>
              <input
                type="text"
                value={editingSnippet.name}
                onChange={(e) => setEditingSnippet({ ...editingSnippet, name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#1b1c28] text-slate-200 text-xs rounded border border-[#2e3144] focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Prefix Trigger</label>
              <input
                type="text"
                value={editingSnippet.prefix}
                onChange={(e) => setEditingSnippet({ ...editingSnippet, prefix: e.target.value })}
                placeholder="e.g. rfc, aaf"
                className="w-full px-2.5 py-1.5 bg-[#1b1c28] text-slate-200 text-xs font-mono rounded border border-[#2e3144] focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Target Language</label>
              <select
                value={editingSnippet.language}
                onChange={(e) => setEditingSnippet({ ...editingSnippet, language: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-[#1b1c28] text-slate-200 text-xs rounded border border-[#2e3144] focus:outline-none focus:border-rose-500"
              >
                <option value="all">All Languages</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Description</label>
            <input
              type="text"
              value={editingSnippet.description || ''}
              onChange={(e) => setEditingSnippet({ ...editingSnippet, description: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#1b1c28] text-slate-200 text-xs rounded border border-[#2e3144] focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Snippet Body Template</label>
            <textarea
              value={editingSnippet.body}
              onChange={(e) => setEditingSnippet({ ...editingSnippet, body: e.target.value })}
              className="w-full h-36 p-2.5 bg-[#0d0e14] text-slate-200 font-mono text-xs rounded border border-[#2e3144] focus:outline-none focus:border-rose-500 resize-y"
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-[#1d1f2d]">
            <button
              type="button"
              onClick={() => {
                setEditingSnippet(null);
                setIsCreatingNew(false);
              }}
              className="px-3 py-1.5 rounded bg-[#1e202f] hover:bg-slate-700 text-slate-300 text-[11px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveSnippet(editingSnippet)}
              className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px]"
            >
              Save Snippet
            </button>
          </div>
        </div>
      )}

      {/* Language Filter */}
      <div className="flex space-x-1 overflow-x-auto">
        {['all', 'typescript', 'javascript', 'python', 'html', 'css'].map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setFilterLang(lang)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              filterLang === lang
                ? 'bg-rose-950/40 border border-rose-500/50 text-rose-300 font-semibold'
                : 'bg-[#10111a] border border-[#222432] text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Snippet List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-[#10111a] rounded-lg border border-[#222432] hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{item.name}</span>
                <span className="px-2 py-0.5 rounded bg-[#1b1c28] border border-[#2e3144] font-mono text-rose-400 text-[10px] font-semibold">
                  {item.prefix}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">{item.description}</p>
              <div className="mt-2 p-2 bg-[#0d0e14] rounded border border-[#1e202e] font-mono text-[10px] text-slate-400 max-h-20 overflow-hidden line-clamp-3">
                {item.body}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[#1d1f2d] flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono uppercase">{item.language}</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSnippet(item);
                    setIsCreatingNew(false);
                  }}
                  className="px-2 py-0.5 rounded bg-[#1d1f2e] hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-[#2e3144] text-[10px]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSnippet(item.id)}
                  className="px-2 py-0.5 rounded bg-[#1d1f2e] hover:bg-red-950 text-slate-400 hover:text-red-300 border border-[#2e3144] text-[10px]"
                >
                  <FontAwesomeIcon icon={ICONS.trash} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
