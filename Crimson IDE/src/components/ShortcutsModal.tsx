/**
 * Keyboard Shortcuts Cheat-Sheet Modal
 * Accessible via Ctrl+K or through the Command Palette.
 * Displays categorized, searchable list of all CsCode Crimson Code keybindings.
 */

import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';

export interface ShortcutItem {
  id: string;
  title: string;
  description: string;
  keys: string[];
  category: 'General' | 'Navigation' | 'Editor' | 'Terminal' | 'File Management';
  actionId?: string;
}

export const IDE_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'sc-shortcuts',
    title: 'Show Keyboard Shortcuts Cheat-Sheet',
    description: 'Opens this interactive cheat-sheet dialog',
    keys: ['Ctrl', 'K'],
    category: 'General',
  },
  {
    id: 'sc-quickopen',
    title: 'Go to File / Quick Open',
    description: 'Quickly fuzzy search and jump to any document in the workspace',
    keys: ['Ctrl', 'P'],
    category: 'Navigation',
    actionId: 'quick-open',
  },
  {
    id: 'sc-command-palette',
    title: 'Show Command Palette',
    description: 'Browse, search and trigger all editor tools, commands and settings',
    keys: ['Ctrl', 'Shift', 'P'],
    category: 'General',
    actionId: 'command-palette',
  },
  {
    id: 'sc-symbols',
    title: 'Workspace Symbol Search',
    description: 'Instant index lookup across functions, classes, interfaces and types',
    keys: ['Ctrl', 'T'],
    category: 'Navigation',
    actionId: 'symbol-search',
  },
  {
    id: 'sc-goto-def',
    title: 'Go to Definition',
    description: 'Jump directly to the declaration of the identifier under cursor',
    keys: ['F12'],
    category: 'Navigation',
  },
  {
    id: 'sc-peek-references',
    title: 'Peek References / CodeLens',
    description: 'Find all usages across files and display interactive references peek widget',
    keys: ['Shift', 'F12'],
    category: 'Navigation',
  },
  {
    id: 'sc-go-back',
    title: 'Go Back (Navigation History)',
    description: 'Navigate back to previously viewed file in the active editor pane',
    keys: ['Alt', 'Left'],
    category: 'Navigation',
    actionId: 'go-back',
  },
  {
    id: 'sc-go-forward',
    title: 'Go Forward (Navigation History)',
    description: 'Navigate forward to next file in active editor pane history stack',
    keys: ['Alt', 'Right'],
    category: 'Navigation',
    actionId: 'go-forward',
  },
  {
    id: 'sc-toggle-breadcrumbs',
    title: 'Toggle Editor Breadcrumbs',
    description: 'Show/hide path breadcrumbs and quick folder hierarchy navigation dropdown',
    keys: ['Ctrl', 'Shift', ';'],
    category: 'Navigation',
    actionId: 'toggle-breadcrumbs',
  },
  {
    id: 'sc-breadcrumbs-parent',
    title: 'Breadcrumbs: Navigate to Parent Folder',
    description: 'Jump up to parent folder hierarchy and browse directory contents',
    keys: ['Alt', 'Up'],
    category: 'Navigation',
  },
  {
    id: 'sc-search-files',
    title: 'Find & Replace in Files',
    description: 'Workspace-wide grep with multi-match line previews and replace-all',
    keys: ['Ctrl', 'Shift', 'F'],
    category: 'Navigation',
    actionId: 'open-search',
  },
  {
    id: 'sc-search-history',
    title: 'Search History',
    description: 'Open previous search queries stored in localStorage to quickly re-run them',
    keys: ['Alt', 'H'],
    category: 'Navigation',
    actionId: 'open-search-history',
  },
  {
    id: 'sc-explorer',
    title: 'Toggle File Explorer',
    description: 'Show or hide workspace files and drag-and-drop folder tree',
    keys: ['Ctrl', 'Shift', 'E'],
    category: 'Navigation',
    actionId: 'open-explorer',
  },
  {
    id: 'sc-git',
    title: 'Toggle Source Control (Git)',
    description: 'Inspect file diffs, staged files, branch status and commit history',
    keys: ['Ctrl', 'Shift', 'G'],
    category: 'Navigation',
    actionId: 'open-git',
  },
  {
    id: 'sc-git-branch',
    title: 'Switch Git Branch',
    description: 'Open the branch switcher to checkout or create branches',
    keys: ['Ctrl', 'Shift', 'B'],
    category: 'Navigation',
    actionId: 'switch-branch',
  },
  {
    id: 'sc-extensions',
    title: 'Toggle Extensions Panel',
    description: 'View active plugins, configuration fields, linters and keymaps',
    keys: ['Ctrl', 'Shift', 'X'],
    category: 'Navigation',
    actionId: 'open-plugins',
  },
  {
    id: 'sc-marketplace',
    title: 'Open Plugin Marketplace Hub',
    description: 'Package, distribute, rate and install community extensions',
    keys: ['Ctrl', 'Shift', 'M'],
    category: 'Navigation',
    actionId: 'open-marketplace',
  },
  {
    id: 'sc-git-diff',
    title: 'Show Changes (Git Diff)',
    description: 'Toggle line-by-line additions and deletions for the currently active file',
    keys: ['Alt', 'D'],
    category: 'Editor',
    actionId: 'toggle-git-diff',
  },
  {
    id: 'sc-split-vert',
    title: 'Toggle Split View (Side-by-Side)',
    description: 'Split the editor into dual independent panes',
    keys: ['Ctrl', '\\'],
    category: 'Editor',
    actionId: 'toggle-split',
  },
  {
    id: 'sc-terminal',
    title: 'Toggle Terminal & Bottom Panel',
    description: 'Open interactive bash/node shell, problems, and cloud logs',
    keys: ['Ctrl', '`'],
    category: 'Terminal',
    actionId: 'toggle-terminal',
  },
  {
    id: 'sc-settings',
    title: 'Open Settings & Preferences',
    description: 'Configure typography, auto-save, theme shades, and cloud sync',
    keys: ['Ctrl', ','],
    category: 'General',
    actionId: 'open-settings',
  },
  {
    id: 'sc-eslint',
    title: 'Configure ESLint & Workspace Ignore Patterns',
    description: 'Customize ESLint rule severities, define custom regex rules, and edit ignore patterns',
    keys: ['Ctrl', 'Shift', 'L'],
    category: 'Editor',
    actionId: 'configure-eslint',
  },
  {
    id: 'sc-github-remote',
    title: 'GitHub Remote Sync & Connect',
    description: 'Connect to GitHub via OAuth, push active branch commits, and pull updates',
    keys: ['Ctrl', 'Shift', 'G'],
    category: 'General',
    actionId: 'open-github-modal',
  },
  {
    id: 'sc-save',
    title: 'Save File (Auto-save every 30s)',
    description: 'Saves dirty files to local state and updates symbol indices',
    keys: ['Ctrl', 'S'],
    category: 'File Management',
    actionId: 'save-file',
  },
  {
    id: 'sc-format',
    title: 'Format Document (Prettier)',
    description: 'Automatically format code with consistent indentation',
    keys: ['Alt', 'F'],
    category: 'Editor',
    actionId: 'format-document',
  },
  {
    id: 'sc-goto-def',
    title: 'Go to Symbol Definition',
    description: 'Jump directly to the declaration of function, class, or interface',
    keys: ['F12'],
    category: 'Navigation',
  },
  {
    id: 'sc-drag-drop',
    title: 'Move Files / Folders (Drag & Drop)',
    description: 'Drag any file or folder and drop onto a destination folder or root',
    keys: ['Drag', 'Drop'],
    category: 'File Management',
  },
  {
    id: 'sc-breadcrumbs',
    title: 'Breadcrumb Navigation Bar',
    description: 'View complete path hierarchy above tabs and click segments',
    keys: ['Click', 'Segment'],
    category: 'Navigation',
  },
  {
    id: 'sc-fold-block',
    title: 'Fold / Collapse Code Block',
    description: 'Collapse the enclosing indented block at the current cursor line',
    keys: ['Ctrl', 'Shift', '['],
    category: 'Editor',
    actionId: 'fold-block',
  },
  {
    id: 'sc-unfold-block',
    title: 'Unfold / Expand Code Block',
    description: 'Expand the folded block at the current cursor line',
    keys: ['Ctrl', 'Shift', ']'],
    category: 'Editor',
    actionId: 'unfold-block',
  },
  {
    id: 'sc-fold-all',
    title: 'Fold All Code Blocks',
    description: 'Collapse all indentation blocks across the entire file',
    keys: ['Ctrl', 'K', '0'],
    category: 'Editor',
    actionId: 'fold-all',
  },
  {
    id: 'sc-unfold-all',
    title: 'Unfold All Code Blocks',
    description: 'Expand all collapsed code blocks across the file',
    keys: ['Ctrl', 'K', 'J'],
    category: 'Editor',
    actionId: 'unfold-all',
  },
  {
    id: 'sc-close-tab',
    title: 'Close Active Tab',
    description: 'Closes the current file tab in the active editor pane',
    keys: ['Ctrl', 'W'],
    category: 'Editor',
  }
];

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction?: (actionId: string) => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  onTriggerAction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'General', 'Navigation', 'Editor', 'AI Assistant', 'Terminal', 'File Management'];

  const filteredShortcuts = useMemo(() => {
    let list = IDE_SHORTCUTS;

    if (selectedCategory !== 'All') {
      list = list.filter((s) => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keys.some((k) => k.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      id="ccode-shortcuts-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="ccode-shortcuts-dialog"
        className="w-full max-w-2xl bg-[#0e1017] border border-[#262838] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#202232] bg-[#12141e] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400">
              <FontAwesomeIcon icon={ICONS.keyboard} className="text-sm" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                  CCode Keyboard Shortcuts
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/80 text-[10px] font-mono font-medium">
                  Cheat-Sheet
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Quick reference for all CsCode Crimson Code hotkeys. Press <span className="text-rose-400 font-mono font-medium">Ctrl+K</span> anytime to toggle.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 hover:bg-[#1f2130] text-slate-400 hover:text-rose-400 rounded-lg transition-colors text-sm"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3.5 border-b border-[#202232] bg-[#0c0d14] space-y-2.5">
          {/* Search Input */}
          <div className="relative flex items-center">
            <FontAwesomeIcon
              icon={ICONS.search}
              className="absolute left-3 text-slate-400 text-xs pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts by action or key (e.g. split, auto-save, terminal, AI, P)..."
              autoFocus
              className="w-full bg-[#151722] border border-[#252839] rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-400 font-mono outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-200 text-xs"
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-rose-950 text-rose-200 border border-rose-800 font-semibold'
                    : 'bg-[#151722] text-slate-400 hover:text-slate-200 border border-transparent hover:border-[#2a2c3d]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-[#0a0b11]">
          {filteredShortcuts.length > 0 ? (
            filteredShortcuts.map((sc) => (
              <div
                key={sc.id}
                onClick={() => {
                  if (sc.actionId && onTriggerAction) {
                    onTriggerAction(sc.actionId);
                    onClose();
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg border border-[#1b1d2a] bg-[#11121b] hover:bg-[#161824] hover:border-rose-900/60 transition-colors group ${
                  sc.actionId ? 'cursor-pointer' : ''
                }`}
              >
                <div className="space-y-0.5 pr-4 truncate">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-rose-300 transition-colors">
                      {sc.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider bg-[#1c1e2b] text-slate-400 border border-[#2a2c3d]">
                      {sc.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {sc.description}
                  </p>
                </div>

                {/* Key Badges */}
                <div className="flex items-center space-x-1 shrink-0">
                  {sc.keys.map((k, i) => (
                    <React.Fragment key={i}>
                      <kbd className="min-w-[22px] px-2 py-1 rounded bg-[#1c1e2b] border border-[#2e3146] text-rose-300 font-mono text-[11px] font-semibold text-center shadow-sm">
                        {k}
                      </kbd>
                      {i < sc.keys.length - 1 && (
                        <span className="text-slate-400 text-[10px] font-mono">+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <FontAwesomeIcon icon={ICONS.question} className="text-base text-slate-400 mb-1" />
              <p>No keyboard shortcuts matching &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-rose-400 hover:underline text-[11px] font-mono"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#0f1018] border-t border-[#1e202e] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Total: {filteredShortcuts.length} shortcuts</span>
          </div>

          <div className="flex items-center space-x-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[#181a24] text-slate-300 border border-[#282a3c] text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
