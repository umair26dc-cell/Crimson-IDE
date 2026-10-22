/**
 * Bottom Panel Component
 * Features Built-in Interactive Multi-Tabbed Terminal, Problems & Diagnostics,
 * Output Console, and Cloud Synchronization Logs. Zero emojis!
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { 
  BottomPanelTab, 
  Diagnostic, 
  FileItem, 
  PluginDefinition, 
  TerminalLine, 
  TerminalSession,
  TerminalSplitMode,
  TerminalBookmark,
  UserSettings,
  ExternalFileModification,
} from '../types';
import { getAllFilesList } from '../lib/defaultFiles';
import { ExecutionLog, executeCode } from '../lib/codeRunner';
import { TestingPanel } from './TestingPanel';
import {
  TERMINAL_HISTORY_STORAGE_KEY,
  MAX_TERMINAL_HISTORY,
  TERMINAL_HISTORY_CLEARED_EVENT,
  loadTerminalHistoryFromStorage,
  saveTerminalHistoryToStorage,
  appendCommandToHistory,
  clearTerminalHistoryFromStorage,
} from '../lib/terminalHistory';
import {
  TERMINAL_THEME_PRESETS,
  TerminalThemePreset,
  getTerminalThemeById,
  getCrimsonTerminalPalette,
} from '../lib/terminalThemes';
import {
  loadTerminalBookmarks,
  saveTerminalBookmarks,
  addTerminalBookmark,
  removeTerminalBookmark,
  findBookmarkByQuery,
  extractWorkspaceDirectories,
  normalizeDirectoryPath,
  TERMINAL_BOOKMARKS_CHANGED_EVENT,
  TERMINAL_BOOKMARKS_STORAGE_KEY,
  DEFAULT_TERMINAL_BOOKMARKS,
} from '../lib/terminalBookmarks';

interface BottomPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: BottomPanelTab;
  onSelectTab: (tab: BottomPanelTab) => void;
  files: FileItem[];
  diagnostics: Diagnostic[];
  onSelectDiagnostic: (d: Diagnostic) => void;
  plugins: PluginDefinition[];
  onTogglePlugin: (id: string) => void;
  onTriggerSync: () => void;
  crimsonShade?: 'classic' | 'ruby' | 'neon' | 'garnet';
  userSettings?: UserSettings;
  onUpdateSettings?: (newSettings: Partial<UserSettings>) => void;
  onSaveWorkspace?: () => void;
  isEditLayoutMode?: boolean;
  position?: 'bottom' | 'right' | 'left';
  onCycleDockPosition?: () => void;
  outputLogs?: ExecutionLog[];
  onClearOutput?: () => void;
  onRunCode?: () => void;
  isRunningCode?: boolean;
  activeFile?: FileItem | null;
  onCreateFile?: (name: string, isFolder?: boolean) => void;
  onDeleteFile?: (id: string) => void;
  onClearWorkspace?: () => void;
  onOpenStats?: () => void;
  gitBranch?: string;
  branches?: string[];
  onSwitchBranch?: (branch: string) => void;
  onCreateBranch?: (branch: string) => void;
  // File System Watcher Simulation
  externallyModifiedFiles?: Record<string, ExternalFileModification>;
  onSimulateExternalChange?: (fileId?: string) => void;
  onDismissAllExternalChanges?: () => void;
  onConfigureEslint?: () => void;
  onOpenFile?: (fileId: string, line?: number) => void;
  terminalSplitMode?: TerminalSplitMode;
  onToggleTerminalSplit?: (mode: TerminalSplitMode) => void;
  onOpenSettings?: (tab?: 'editor' | 'terminal' | 'syntax' | 'eslint' | 'theme' | 'layout' | 'sync') => void;
}

export interface CrimsonTerminalTheme {
  name: string;
  primary: string;
  secondary: string;
  accentBorder: string;
  tabActive: string;
  sessionActive: string;
  promptUser: string;
  promptHost: string;
  promptCwd: string;
  caret: string;
  outputNormal: string;
  outputInfo: string;
  outputSuccess: string;
  outputError: string;
  folderColor: string;
  badge: string;
}

export const CRIMSON_TERMINAL_THEMES: Record<string, CrimsonTerminalTheme> = {
  classic: {
    name: 'Classic Crimson',
    primary: 'text-rose-400',
    secondary: 'text-rose-300',
    accentBorder: 'border-rose-900/60',
    tabActive: 'text-rose-400 border-rose-500',
    sessionActive: 'bg-rose-950/80 text-rose-300 border border-rose-800',
    promptUser: 'text-rose-400',
    promptHost: 'text-rose-300',
    promptCwd: 'text-rose-200',
    caret: 'caret-rose-500',
    outputNormal: 'text-slate-300',
    outputInfo: 'text-rose-300/90',
    outputSuccess: 'text-emerald-400 font-medium',
    outputError: 'text-rose-400 font-semibold',
    folderColor: 'text-rose-400 font-semibold',
    badge: 'bg-rose-950 text-rose-300 border-rose-800',
  },
  ruby: {
    name: 'Ruby Vivid',
    primary: 'text-red-400',
    secondary: 'text-red-300',
    accentBorder: 'border-red-900/60',
    tabActive: 'text-red-400 border-red-500',
    sessionActive: 'bg-red-950/80 text-red-300 border border-red-800',
    promptUser: 'text-red-400',
    promptHost: 'text-red-300',
    promptCwd: 'text-red-200',
    caret: 'caret-red-500',
    outputNormal: 'text-slate-300',
    outputInfo: 'text-red-300/90',
    outputSuccess: 'text-emerald-400 font-medium',
    outputError: 'text-red-400 font-semibold',
    folderColor: 'text-red-400 font-semibold',
    badge: 'bg-red-950 text-red-300 border-red-800',
  },
  neon: {
    name: 'Neon Crimson',
    primary: 'text-pink-400',
    secondary: 'text-pink-300',
    accentBorder: 'border-pink-900/60',
    tabActive: 'text-pink-400 border-pink-500',
    sessionActive: 'bg-pink-950/80 text-pink-300 border border-pink-800',
    promptUser: 'text-pink-400',
    promptHost: 'text-pink-300',
    promptCwd: 'text-pink-200',
    caret: 'caret-pink-500',
    outputNormal: 'text-slate-300',
    outputInfo: 'text-pink-300/90',
    outputSuccess: 'text-emerald-400 font-medium',
    outputError: 'text-pink-400 font-semibold',
    folderColor: 'text-pink-400 font-semibold',
    badge: 'bg-pink-950 text-pink-300 border-pink-800',
  },
  garnet: {
    name: 'Deep Garnet',
    primary: 'text-rose-500',
    secondary: 'text-rose-400',
    accentBorder: 'border-rose-950',
    tabActive: 'text-rose-500 border-rose-600',
    sessionActive: 'bg-rose-950 text-rose-300 border border-rose-900',
    promptUser: 'text-rose-500',
    promptHost: 'text-rose-400',
    promptCwd: 'text-rose-300',
    caret: 'caret-rose-600',
    outputNormal: 'text-slate-300',
    outputInfo: 'text-rose-400/90',
    outputSuccess: 'text-emerald-400 font-medium',
    outputError: 'text-rose-500 font-semibold',
    folderColor: 'text-rose-500 font-semibold',
    badge: 'bg-rose-950 text-rose-300 border-rose-900',
  },
};

export interface TerminalHelpCommand {
  command: string;
  description: string;
  example?: string;
  category: 'File System' | 'Run & Build' | 'Git' | 'System';
}

export const COMMON_TERMINAL_COMMANDS: TerminalHelpCommand[] = [
  // File System
  { command: 'ls', description: 'List files and directories in current workspace', example: 'ls', category: 'File System' },
  { command: 'pwd', description: 'Print current working directory', example: 'pwd', category: 'File System' },
  { command: 'cat <file>', description: 'Display file contents in terminal', example: 'cat src/App.tsx', category: 'File System' },
  { command: 'touch <file>', description: 'Create a new file in workspace', example: 'touch newFile.ts', category: 'File System' },
  { command: 'rm <file>', description: 'Remove file from workspace', example: 'rm temp.ts', category: 'File System' },

  // Run & Build
  { command: 'node <file>', description: 'Run JavaScript or TypeScript file in runner', example: 'node src/App.tsx', category: 'Run & Build' },
  { command: 'npm run build', description: 'Execute production build verification', example: 'npm run build', category: 'Run & Build' },
  { command: 'npm test', description: 'Execute active workspace test suites', example: 'npm test', category: 'Run & Build' },
  { command: 'stats', description: 'Display workspace size and line metrics', example: 'stats', category: 'Run & Build' },

  // Git
  { command: 'git status', description: 'Check modified files and active branch', example: 'git status', category: 'Git' },
  { command: 'git branch', description: 'List existing branches or create new', example: 'git branch feature/new', category: 'Git' },
  { command: 'git checkout <branch>', description: 'Switch active git branch', example: 'git checkout main', category: 'Git' },
  { command: 'git log', description: 'Show recent commit log history', example: 'git log', category: 'Git' },

  // System
  { command: 'help', description: 'Show all terminal commands manual', example: 'help', category: 'System' },
  { command: 'clear', description: 'Clear terminal screen buffer', example: 'clear', category: 'System' },
  { command: 'history', description: 'View commands stored in local storage', example: 'history', category: 'System' },
  { command: 'history -c', description: 'Clear command history from local storage', example: 'history -c', category: 'System' },
  { command: 'theme', description: 'Display active crimson theme tokens', example: 'theme', category: 'System' },
  { command: 'split [side-by-side|stacked|off]', description: 'Split terminal into multiple instances side-by-side or stacked', example: 'split side-by-side', category: 'System' },
  { command: 'unsplit', description: 'Return terminal to single instance view', example: 'unsplit', category: 'System' },
  { command: 'save', description: 'Save dirty files to local storage snapshot', example: 'save', category: 'System' },
];

export interface CommandSuggestion {
  command: string;
  source: 'history' | 'builtin';
  description?: string;
  category?: string;
}

export const PREDEFINED_CLI_COMMANDS: Array<{ command: string; description: string; category: string }> = [
  // Common CLI tools explicitly requested
  { command: 'git', description: 'Distributed version control system', category: 'Git' },
  { command: 'git status', description: 'Show working tree status and branch', category: 'Git' },
  { command: 'git branch', description: 'List, create, or delete branches', category: 'Git' },
  { command: 'git checkout', description: 'Switch branches or restore files', category: 'Git' },
  { command: 'git log', description: 'Show commit history and log', category: 'Git' },
  { command: 'git diff', description: 'Show changes between commits/working tree', category: 'Git' },
  { command: 'git add', description: 'Stage file contents for commit', category: 'Git' },
  { command: 'git commit', description: 'Record changes to the repository', category: 'Git' },
  { command: 'npm', description: 'Node package manager and script runner', category: 'Node' },
  { command: 'npm run build', description: 'Build and compile workspace project', category: 'Node' },
  { command: 'npm test', description: 'Execute workspace test runner suites', category: 'Node' },
  { command: 'npm install', description: 'Install project packages & dependencies', category: 'Node' },
  { command: 'npm start', description: 'Start the workspace application server', category: 'Node' },
  { command: 'ls', description: 'List directory contents and files', category: 'File' },
  { command: 'ls -la', description: 'List all files with details & hidden files', category: 'File' },
  { command: 'cd', description: 'Change current working directory', category: 'Navigation' },
  { command: 'cd ..', description: 'Navigate to parent directory', category: 'Navigation' },
  { command: 'cd ~', description: 'Return to workspace root directory', category: 'Navigation' },
  { command: 'cd src', description: 'Navigate into src directory', category: 'Navigation' },
  { command: 'cat', description: 'Print and display file contents', category: 'File' },
  { command: 'cat package.json', description: 'Inspect workspace package.json', category: 'File' },
  { command: 'cat README.md', description: 'View repository documentation', category: 'File' },
  { command: 'node', description: 'Execute JavaScript/TypeScript code or file', category: 'Runtime' },
  { command: 'pwd', description: 'Print name of current working directory', category: 'Navigation' },
  { command: 'touch', description: 'Create a new empty file in workspace', category: 'File' },
  { command: 'rm', description: 'Remove file from the workspace', category: 'File' },
  { command: 'split', description: 'Split terminal into multiple instances', category: 'Terminal' },
  { command: 'split side-by-side', description: 'Split terminal instances horizontally into columns', category: 'Terminal' },
  { command: 'split stacked', description: 'Split terminal instances vertically into rows', category: 'Terminal' },
  { command: 'unsplit', description: 'Restore single terminal pane view', category: 'Terminal' },
  { command: 'clear', description: 'Clear the terminal output screen buffer', category: 'Terminal' },
  { command: 'history', description: 'Display persisted terminal command history', category: 'Terminal' },
  { command: 'history -c', description: 'Clear stored command history from storage', category: 'Terminal' },
  { command: 'stats', description: 'Display workspace size & file metrics', category: 'Metrics' },
  { command: 'theme', description: 'Inspect active Crimson theme palette', category: 'Settings' },
  { command: 'save', description: 'Save dirty workspace files to snapshot', category: 'File' },
  { command: 'bm', description: 'List saved directory bookmarks', category: 'Bookmarks' },
  { command: 'bm add', description: 'Bookmark active working directory', category: 'Bookmarks' },
  { command: 'bm list', description: 'Display all saved directory bookmarks', category: 'Bookmarks' },
  { command: 'bm go', description: 'Jump terminal to bookmarked directory', category: 'Bookmarks' },
  { command: 'bookmark', description: 'Terminal directory bookmarks manager', category: 'Bookmarks' },
  { command: 'help', description: 'Display terminal commands reference manual', category: 'Help' },
];

interface TerminalPaneViewProps {
  session: TerminalSession;
  isFocused: boolean;
  onFocus: () => void;
  paneLabel: string;
  splitMode: TerminalSplitMode;
  onCloseSplit?: () => void;
  sessions: TerminalSession[];
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onCloseSession: (id: string, e: React.MouseEvent) => void;
  onExecuteCommand: (cmd: string, sessionId: string) => void;
  onClearSession: (sessionId: string) => void;
  commandHistory: string[];
  userSettings?: UserSettings;
  currentTheme: typeof CRIMSON_TERMINAL_THEMES['ruby'];
  externalInsertCommand?: { text: string; timestamp: number } | null;
  bookmarks?: TerminalBookmark[];
  onJumpToBookmark?: (path: string, name?: string) => void;
  onBookmarkCwd?: (path: string) => void;
}

const TerminalPaneView: React.FC<TerminalPaneViewProps> = ({
  session,
  isFocused,
  onFocus,
  paneLabel,
  splitMode,
  onCloseSplit,
  sessions,
  onSelectSession,
  onNewSession,
  onExecuteCommand,
  onClearSession,
  commandHistory,
  userSettings,
  currentTheme,
  externalInsertCommand,
  bookmarks = [],
  onJumpToBookmark,
  onBookmarkCwd,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const tempInputRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.lines]);

  // Focus input when pane gains focus
  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
    }
  }, [isFocused]);

  // Handle external command insertion from Help popover
  useEffect(() => {
    if (externalInsertCommand && isFocused) {
      setInputVal(externalInsertCommand.text);
      setShowSuggestions(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(externalInsertCommand.text.length, externalInsertCommand.text.length);
        }
      }, 40);
    }
  }, [externalInsertCommand, isFocused]);

  // Compute live command suggestions from predefined CLI tools, bookmarks, and recent command history
  const suggestions: CommandSuggestion[] = useMemo(() => {
    const raw = inputVal.trim();
    if (!raw) return [];

    const lower = raw.toLowerCase();
    const results: CommandSuggestion[] = [];
    const seen = new Set<string>();

    // 1. History matches (recent command history from localStorage)
    for (const h of commandHistory) {
      const hTrim = h.trim();
      const hLower = hTrim.toLowerCase();
      if (!seen.has(hTrim) && hLower !== lower) {
        if (hLower.startsWith(lower)) {
          seen.add(hTrim);
          results.push({
            command: hTrim,
            source: 'history',
            description: 'Recent command history',
          });
          if (results.length >= 6) break;
        }
      }
    }

    // 2. Predefined common CLI tools (git, npm, ls, cd, cat, etc.)
    for (const item of PREDEFINED_CLI_COMMANDS) {
      const itemLower = item.command.toLowerCase();
      if (!seen.has(item.command) && itemLower !== lower) {
        if (itemLower.startsWith(lower)) {
          seen.add(item.command);
          results.push({
            command: item.command,
            source: 'builtin',
            description: item.description,
            category: item.category,
          });
          if (results.length >= 6) break;
        }
      }
    }

    // 3. Dynamic directory bookmark suggestions (e.g. "cd <bookmark>", "bm go <bookmark>")
    if (bookmarks && bookmarks.length > 0) {
      for (const bm of bookmarks) {
        const cdCmd = `cd ${bm.name}`;
        if (!seen.has(cdCmd) && (cdCmd.toLowerCase().includes(lower) || lower.startsWith('cd') || lower.startsWith('bm'))) {
          seen.add(cdCmd);
          results.push({
            command: cdCmd,
            source: 'builtin',
            description: `Bookmark: ${bm.path}`,
            category: 'Bookmarks',
          });
        }
      }
    }

    // 4. Fallback to substring matches if fewer than 4 prefix matches found
    if (results.length < 4) {
      for (const h of commandHistory) {
        const hTrim = h.trim();
        const hLower = hTrim.toLowerCase();
        if (!seen.has(hTrim) && hLower.includes(lower) && hLower !== lower) {
          seen.add(hTrim);
          results.push({
            command: hTrim,
            source: 'history',
            description: 'Recent command history',
          });
          if (results.length >= 6) break;
        }
      }

      for (const item of PREDEFINED_CLI_COMMANDS) {
        const itemLower = item.command.toLowerCase();
        if (!seen.has(item.command) && itemLower.includes(lower) && itemLower !== lower) {
          seen.add(item.command);
          results.push({
            command: item.command,
            source: 'builtin',
            description: item.description,
            category: item.category,
          });
          if (results.length >= 6) break;
        }
      }
    }

    return results.slice(0, 6);
  }, [inputVal, commandHistory]);

  // Top matching ghost suggestion for inline completion
  const ghostSuggestion: string | null = useMemo(() => {
    if (!inputVal || !inputVal.trim()) return null;
    const lower = inputVal.trim().toLowerCase();
    const match = suggestions.find((s) => s.command.toLowerCase().startsWith(lower));
    return match ? match.command : null;
  }, [inputVal, suggestions]);

  // Handle typing in terminal input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    setShowSuggestions(Boolean(val.trim()));
    setActiveSuggestionIndex(-1);
  };

  // Accept/complete selected suggestion
  const acceptSuggestion = (cmd: string) => {
    setInputVal(cmd);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cmd.length, cmd.length);
      }
    }, 20);
  };

  // Keyboard navigation for terminal input & live suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (showSuggestions && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        e.preventDefault();
        const selectedCmd = suggestions[activeSuggestionIndex].command;
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        setInputVal('');
        onExecuteCommand(selectedCmd, session.id);
        return;
      }
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      const cmdToRun = inputVal;
      setInputVal('');
      setHistoryIndex(-1);
      tempInputRef.current = '';
      onExecuteCommand(cmdToRun, session.id);
    } else if (e.key === 'Tab') {
      if (suggestions.length > 0) {
        e.preventDefault();
        const chosen = activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]
          ? suggestions[activeSuggestionIndex].command
          : (ghostSuggestion || suggestions[0].command);
        acceptSuggestion(chosen);
      }
    } else if (e.key === 'ArrowRight') {
      if (inputRef.current && ghostSuggestion && ghostSuggestion.toLowerCase().startsWith(inputVal.trim().toLowerCase())) {
        const cursor = inputRef.current.selectionStart;
        if (cursor === inputVal.length) {
          e.preventDefault();
          acceptSuggestion(ghostSuggestion);
        }
      }
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        e.preventDefault();
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    } else if (e.key === 'ArrowUp') {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        if (activeSuggestionIndex > 0) {
          setActiveSuggestionIndex(prev => prev - 1);
        } else if (activeSuggestionIndex === 0) {
          setActiveSuggestionIndex(-1);
        }
        return;
      }

      e.preventDefault();
      setShowSuggestions(false);
      if (commandHistory.length > 0) {
        if (historyIndex === -1) {
          tempInputRef.current = inputVal;
        }
        const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
        setTimeout(() => {
          if (inputRef.current) {
            const len = commandHistory[nextIdx].length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        if (activeSuggestionIndex === -1) {
          setActiveSuggestionIndex(0);
        } else {
          setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
        }
        return;
      }

      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
        setTimeout(() => {
          if (inputRef.current) {
            const len = commandHistory[nextIdx].length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        const restored = tempInputRef.current;
        setInputVal(restored);
        setTimeout(() => {
          if (inputRef.current) {
            const len = restored.length;
            inputRef.current.setSelectionRange(len, len);
          }
        }, 0);
      }
    }
  };

  return (
    <div
      className={`h-full flex flex-col cursor-text transition-colors relative ${
        splitMode !== 'none'
          ? isFocused
            ? 'bg-[#0a0b10]'
            : 'bg-[#08090d]'
          : ''
      }`}
      onClick={() => {
        onFocus();
        inputRef.current?.focus();
      }}
    >
      {/* Pane Sub-header in split mode */}
      {splitMode !== 'none' && (
        <div className="h-6 bg-[#0c0d15] border-b border-[#1b1d2a] px-2 flex items-center justify-between text-[11px] font-mono select-none shrink-0">
          <div className="flex items-center space-x-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isFocused ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-400 font-semibold">{paneLabel}:</span>

            {/* Session tabs for this pane */}
            <div className="flex items-center space-x-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus();
                    onSelectSession(s.id);
                  }}
                  className={`px-1.5 py-0.2 rounded text-[10px] transition-colors cursor-pointer ${
                    session.id === s.id
                      ? `${currentTheme.sessionActive} font-medium`
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.name}
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus();
                  onNewSession();
                }}
                title="New Session in this pane"
                className="px-1 text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.plus} />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-500">{session.cwd}</span>
            {onBookmarkCwd && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmarkCwd(session.cwd);
                }}
                title={
                  bookmarks.some((b) => b.path.toLowerCase() === session.cwd.toLowerCase())
                    ? `Directory bookmarked (${bookmarks.find((b) => b.path.toLowerCase() === session.cwd.toLowerCase())?.name}). Click to update/save.`
                    : `Bookmark this directory (${session.cwd})`
                }
                className={`p-0.5 transition-colors cursor-pointer text-[10px] ${
                  bookmarks.some((b) => b.path.toLowerCase() === session.cwd.toLowerCase())
                    ? 'text-rose-400 hover:text-rose-300'
                    : 'text-slate-600 hover:text-rose-400'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.bookmark} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearSession(session.id);
              }}
              title="Clear output in this pane"
              className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer text-[10px]"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
            {onCloseSplit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseSplit();
                }}
                title="Close Split Mode (Return to Single Pane)"
                className="p-0.5 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer text-[10px]"
              >
                <FontAwesomeIcon icon={ICONS.restore} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Output lines */}
      <div 
        className="flex-1 overflow-y-auto space-y-0.5 p-2 font-mono text-xs"
        style={{ fontSize: userSettings?.terminalFontSize ? `${userSettings.terminalFontSize}px` : undefined }}
      >
        {session.lines.map((line) => {
          let colorClass = currentTheme.outputNormal;
          let inlineColor: string | undefined = undefined;

          if (line.type === 'error') colorClass = currentTheme.outputError;
          else if (line.type === 'success') colorClass = currentTheme.outputSuccess;
          else if (line.type === 'info') colorClass = currentTheme.outputInfo;
          else if (line.type === 'input') {
            colorClass = 'font-semibold';
            inlineColor = userSettings?.terminalForeground || '#f8fafc';
          } else if (line.text.startsWith('>') || line.text.startsWith('MODE')) {
            colorClass = `${currentTheme.primary} font-medium`;
            if (userSettings?.terminalPromptColor) inlineColor = userSettings.terminalPromptColor;
          } else if (line.text.startsWith('  modified:')) {
            colorClass = currentTheme.secondary;
          } else {
            if (userSettings?.terminalForeground) {
              colorClass = '';
              inlineColor = userSettings.terminalForeground;
            }
          }

          return (
            <div key={line.id} className="leading-relaxed">
              <span className={colorClass} style={inlineColor ? { color: inlineColor } : undefined}>
                {line.text}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Prompt and Input */}
      <div 
        className={`relative flex items-center space-x-1.5 p-2 pt-1.5 border-t ${currentTheme.accentBorder} shrink-0 bg-[#07080d]`}
        style={userSettings?.terminalPromptColor ? { borderTopColor: `${userSettings.terminalPromptColor}40` } : undefined}
      >
        {/* Command Suggestions Dropdown Popup */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            className="absolute bottom-full left-0 mb-1.5 w-80 sm:w-96 max-h-56 bg-[#0c0d15] border border-[#23263a] rounded-lg shadow-2xl z-40 flex flex-col font-mono text-xs overflow-hidden select-none"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <div className="px-2.5 py-1 bg-[#10121c] border-b border-[#1f2233] text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <FontAwesomeIcon icon={ICONS.terminal} className="text-rose-400 text-[9px]" />
                <span className="font-semibold text-slate-300">Command Suggestions</span>
              </div>
              <div className="text-[9px] text-slate-500 flex items-center space-x-2">
                <span><kbd className="px-1 py-0.2 bg-[#191b26] rounded border border-[#2b2e40] text-slate-400">Tab</kbd> complete</span>
                <span><kbd className="px-1 py-0.2 bg-[#191b26] rounded border border-[#2b2e40] text-slate-400">↑↓</kbd> choose</span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-48 divide-y divide-[#171926] p-1 space-y-0.5">
              {suggestions.map((item, idx) => {
                const isSelected = idx === activeSuggestionIndex;
                return (
                  <div
                    key={`${item.source}-${item.command}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      acceptSuggestion(item.command);
                    }}
                    className={`px-2 py-1.5 rounded flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-rose-950/80 text-rose-200 border border-rose-800'
                        : 'hover:bg-[#141624] text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-semibold text-rose-300">
                        {item.command}
                      </span>
                      {item.description && (
                        <span className="text-[10px] text-slate-400 truncate">
                          - {item.description}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          item.source === 'history'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-900/60'
                            : 'bg-[#181a28] text-slate-400 border border-[#25283b]'
                        }`}
                      >
                        {item.source === 'history' ? (
                          <>
                            <FontAwesomeIcon icon={ICONS.clock} className="text-[8px] mr-1" />
                            History
                          </>
                        ) : (
                          item.category || 'CLI'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <span 
          className={`${currentTheme.promptUser} font-bold select-none text-[11px]`}
          style={{
            color: userSettings?.terminalPromptColor || undefined,
            fontSize: userSettings?.terminalFontSize ? `${userSettings.terminalFontSize}px` : undefined,
          }}
        >
          ccode@crimson:
        </span>
        <span 
          className={`${currentTheme.promptCwd} font-medium select-none text-[11px]`}
          style={{
            color: userSettings?.terminalPromptColor || undefined,
            opacity: 0.85,
            fontSize: userSettings?.terminalFontSize ? `${userSettings.terminalFontSize}px` : undefined,
          }}
        >
          {session.cwd}$
        </span>

        {/* Input & Inline Ghost Autocomplete Container */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              onFocus();
              if (inputVal.trim()) setShowSuggestions(true);
            }}
            autoFocus={isFocused}
            className={`w-full bg-transparent outline-none ${currentTheme.caret} font-mono text-xs z-10`}
            style={{
              color: userSettings?.terminalForeground || '#f8fafc',
              caretColor: userSettings?.terminalCursorColor || undefined,
              fontFamily: userSettings?.terminalFontFamily || undefined,
              fontSize: userSettings?.terminalFontSize ? `${userSettings.terminalFontSize}px` : undefined,
            }}
          />
          {ghostSuggestion && ghostSuggestion.toLowerCase().startsWith(inputVal.trim().toLowerCase()) && (
            <div
              className="absolute left-0 pointer-events-none font-mono text-xs select-none flex items-center z-0"
              style={{
                fontFamily: userSettings?.terminalFontFamily || undefined,
                fontSize: userSettings?.terminalFontSize ? `${userSettings.terminalFontSize}px` : undefined,
              }}
            >
              <span className="opacity-0">{inputVal}</span>
              <span className="text-slate-500/60 font-mono">
                {ghostSuggestion.slice(inputVal.length)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onSelectTab,
  files,
  diagnostics,
  onSelectDiagnostic,
  plugins,
  onTogglePlugin,
  onTriggerSync,
  crimsonShade = 'ruby',
  userSettings,
  onSaveWorkspace,
  isEditLayoutMode = false,
  position = 'bottom',
  onCycleDockPosition,
  outputLogs = [],
  onClearOutput,
  onRunCode,
  isRunningCode = false,
  activeFile,
  onCreateFile,
  onDeleteFile,
  onClearWorkspace,
  onOpenStats,
  gitBranch = 'main',
  branches = ['main'],
  onSwitchBranch,
  onCreateBranch,
  externallyModifiedFiles = {},
  onSimulateExternalChange,
  onDismissAllExternalChanges,
  onConfigureEslint,
  onOpenFile,
  terminalSplitMode: propTerminalSplitMode,
  onToggleTerminalSplit,
  onOpenSettings,
  onUpdateSettings,
}) => {
  const currentTheme = CRIMSON_TERMINAL_THEMES[crimsonShade] || CRIMSON_TERMINAL_THEMES.ruby;

  // Terminal Quick Theme Dropdown State
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  // Terminal Split View State
  const [terminalSplitMode, setTerminalSplitMode] = useState<TerminalSplitMode>(propTerminalSplitMode || 'none');
  const [primarySessionId, setPrimarySessionId] = useState<string>('term-bash');
  const [secondarySessionId, setSecondarySessionId] = useState<string>('term-node');
  const [focusedPane, setFocusedPane] = useState<'primary' | 'secondary'>('primary');

  // External command insertion (e.g. from Help popover)
  const [externalInsertCommand, setExternalInsertCommand] = useState<{ text: string; timestamp: number } | null>(null);

  // Sync with prop if passed
  useEffect(() => {
    if (propTerminalSplitMode) {
      setTerminalSplitMode(propTerminalSplitMode);
    }
  }, [propTerminalSplitMode]);

  // Terminal Sessions
  const [sessions, setSessions] = useState<TerminalSession[]>(() => {
    const storedHistory = loadTerminalHistoryFromStorage();
    const historyNotification: TerminalLine[] = storedHistory.length > 0 ? [
      {
        id: 'l-init-history',
        type: 'info',
        text: `[History] Loaded ${storedHistory.length} command${storedHistory.length === 1 ? '' : 's'} from local storage. Press ↑/↓ to recall previous commands.`,
        timestamp: '17:43:02',
      }
    ] : [];

    return [
      {
        id: 'term-bash',
        name: 'bash',
        shell: 'bash',
        cwd: '~/workspace',
        lines: [
          {
            id: 'l-init-1',
            type: 'info',
            text: 'CsCode Interactive Shell v2.5 (Crimson Code - Linux x86_64)',
            timestamp: '17:43:00'
          },
          {
            id: 'l-init-2',
            type: 'info',
            text: 'Inheriting CsCode Crimson Code Theme colors. Type "help", "theme", or "save".',
            timestamp: '17:43:01'
          },
          ...historyNotification,
        ]
      },
      {
        id: 'term-node',
        name: 'node',
        shell: 'node',
        cwd: '~/workspace',
        lines: [
          {
            id: 'l-node-1',
            type: 'info',
            text: 'Welcome to Node.js v22.14.0 (CCode Runtime). Type ".help" for more information.',
            timestamp: '17:43:05'
          }
        ]
      }
    ];
  });

  // Active session resolvers
  const primarySession = useMemo(() => {
    return sessions.find(s => s.id === primarySessionId) || sessions[0] || {
      id: 'term-bash',
      name: 'bash',
      shell: 'bash',
      cwd: '~/workspace',
      lines: []
    };
  }, [sessions, primarySessionId]);

  const secondarySession = useMemo(() => {
    return sessions.find(s => s.id === secondarySessionId) || sessions.find(s => s.id !== primarySessionId) || sessions[0];
  }, [sessions, secondarySessionId, primarySessionId]);

  const activeSession = terminalSplitMode === 'none'
    ? primarySession
    : (focusedPane === 'primary' ? primarySession : secondarySession);

  const activeSessionId = activeSession.id;
  const setActiveSessionId = (id: string) => {
    if (terminalSplitMode !== 'none' && focusedPane === 'secondary') {
      setSecondarySessionId(id);
    } else {
      setPrimarySessionId(id);
    }
  };
  
  // Check if command persistence across sessions is enabled in settings (defaults to true)
  const isPersistenceEnabled = userSettings?.terminalPersistHistory !== false;

  // Local storage-backed terminal command history
  const [commandHistory, setCommandHistory] = useState<string[]>(() => loadTerminalHistoryFromStorage());
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const tempInputRef = useRef<string>('');

  const saveCommandHistory = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setCommandHistory(prev => {
      const nextHistory = typeof updater === 'function' ? updater(prev) : updater;
      if (isPersistenceEnabled) {
        saveTerminalHistoryToStorage(nextHistory);
      }
      return nextHistory;
    });
  }, [isPersistenceEnabled]);

  // Sync when user toggles persistence in settings
  useEffect(() => {
    if (userSettings?.terminalPersistHistory === false) {
      // User disabled persistence across sessions: clean up localStorage snapshot
      clearTerminalHistoryFromStorage();
    } else if (userSettings?.terminalPersistHistory === true) {
      // User re-enabled persistence: persist current history
      setCommandHistory(prev => {
        if (prev.length > 0) {
          saveTerminalHistoryToStorage(prev);
        }
        return prev;
      });
    }
  }, [userSettings?.terminalPersistHistory]);

  // Synchronize history clearing across tabs and settings dialog
  useEffect(() => {
    const handleCustomClear = () => {
      setCommandHistory([]);
      setHistoryIndex(-1);
      tempInputRef.current = '';
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TERMINAL_HISTORY_STORAGE_KEY) {
        if (!e.newValue) {
          setCommandHistory([]);
          setHistoryIndex(-1);
          tempInputRef.current = '';
        } else {
          setCommandHistory(loadTerminalHistoryFromStorage());
        }
      }
    };

    window.addEventListener(TERMINAL_HISTORY_CLEARED_EVENT, handleCustomClear);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(TERMINAL_HISTORY_CLEARED_EVENT, handleCustomClear);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Clear command history handler
  const handleClearHistory = () => {
    const count = commandHistory.length;
    saveCommandHistory([]);
    setHistoryIndex(-1);
    tempInputRef.current = '';
    clearTerminalHistoryFromStorage();

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const feedbackLine: TerminalLine = {
      id: `out-${Date.now()}-${Math.random()}`,
      type: 'info',
      text: count > 0 
        ? `[Terminal] Command history cleared (${count} ${count === 1 ? 'entry' : 'entries'} removed${isPersistenceEnabled ? ' from local storage' : ''}).`
        : '[Terminal] Command history is already empty.',
      timestamp: now,
    };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, lines: [...s.lines, feedbackLine] } : s));
  };

  // Terminal Help Popover State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [selectedHelpCategory, setSelectedHelpCategory] = useState<string>('All');
  const helpPopoverRef = useRef<HTMLDivElement>(null);

  // Close help popover on click outside or Escape key
  useEffect(() => {
    if (!isHelpOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (helpPopoverRef.current && !helpPopoverRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpOpen]);

  // Close theme picker popover on click outside or Escape key
  useEffect(() => {
    if (!isThemePickerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setIsThemePickerOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsThemePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isThemePickerOpen]);

  // Terminal Directory Bookmarks State & Handlers
  const [bookmarks, setBookmarks] = useState<TerminalBookmark[]>(() => loadTerminalBookmarks());
  const [isBookmarksMenuOpen, setIsBookmarksMenuOpen] = useState(false);
  const [bookmarkSearchFilter, setBookmarkSearchFilter] = useState('');
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkPath, setNewBookmarkPath] = useState('');
  const [isAddingCustomBookmark, setIsAddingCustomBookmark] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const bookmarksMenuRef = useRef<HTMLDivElement>(null);

  // Sync bookmarks changes across tabs and custom events
  useEffect(() => {
    const handleBookmarksChanged = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setBookmarks(e.detail);
      } else {
        setBookmarks(loadTerminalBookmarks());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TERMINAL_BOOKMARKS_STORAGE_KEY) {
        setBookmarks(loadTerminalBookmarks());
      }
    };

    window.addEventListener(TERMINAL_BOOKMARKS_CHANGED_EVENT as any, handleBookmarksChanged);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(TERMINAL_BOOKMARKS_CHANGED_EVENT as any, handleBookmarksChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Close bookmarks popover on click outside or Escape key
  useEffect(() => {
    if (!isBookmarksMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (bookmarksMenuRef.current && !bookmarksMenuRef.current.contains(e.target as Node)) {
        setIsBookmarksMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBookmarksMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBookmarksMenuOpen]);

  // Jump terminal to bookmarked directory
  const handleJumpToBookmark = (path: string, name?: string) => {
    const targetId = activeSessionId;
    const norm = normalizeDirectoryPath(path);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const jumpLine: TerminalLine = {
      id: `out-${Date.now()}-${Math.random()}`,
      type: 'info',
      text: `[Bookmark Jump] Navigated to ${name || norm} (${norm})`,
      timestamp: now,
    };
    setSessions(prev => prev.map(s => s.id === targetId ? { ...s, cwd: norm, lines: [...s.lines, jumpLine] } : s));
    setBookmarkToast(`Jumped to bookmark: ${name || norm}`);
    setTimeout(() => setBookmarkToast(null), 3000);
    setIsBookmarksMenuOpen(false);
  };

  // Bookmark current working directory
  const handleBookmarkCwd = (cwd: string, customName?: string) => {
    const norm = normalizeDirectoryPath(cwd);
    const derivedName = customName?.trim() || norm.split('/').pop() || 'workspace';
    const res = addTerminalBookmark(derivedName, norm, `Bookmarked ${norm}`);
    setBookmarks(res.bookmarks);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const feedbackLine: TerminalLine = {
      id: `out-${Date.now()}-${Math.random()}`,
      type: 'success',
      text: `[Bookmark Saved] Bookmarked directory "${res.added.name}" (${res.added.path})`,
      timestamp: now,
    };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, lines: [...s.lines, feedbackLine] } : s));

    setBookmarkToast(`Bookmarked "${res.added.name}" (${res.added.path})`);
    setTimeout(() => setBookmarkToast(null), 3000);
  };

  // Remove a directory bookmark
  const handleRemoveBookmark = (idOrName: string) => {
    const targetBm = findBookmarkByQuery(idOrName, bookmarks);
    const name = targetBm?.name || idOrName;
    const updated = removeTerminalBookmark(idOrName);
    setBookmarks(updated);
    setBookmarkToast(`Removed bookmark "${name}"`);
    setTimeout(() => setBookmarkToast(null), 2500);
  };

  // Execute terminal command
  const executeCommand = (cmdText: string, targetSessionId?: string) => {
    const raw = cmdText.trim();
    if (!raw) return;

    const targetId = targetSessionId || activeSessionId;
    const targetSession = sessions.find(s => s.id === targetId) || activeSession;

    // Append to history and persist to localStorage (dedup consecutive, cap at MAX_TERMINAL_HISTORY)
    saveCommandHistory(prev => appendCommandToHistory(prev, raw));
    setHistoryIndex(-1);
    tempInputRef.current = '';

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userLine: TerminalLine = {
      id: `cmd-${Date.now()}`,
      type: 'input',
      text: `${targetSession.cwd}$ ${raw}`,
      timestamp: now
    };

    const args = raw.split(/\s+/);
    const cmd = args[0].toLowerCase();
    const resultLines: TerminalLine[] = [userLine];

    // Helper to add output line
    const addOut = (text: string, type: 'output' | 'error' | 'info' | 'success' = 'output') => {
      resultLines.push({
        id: `out-${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: now
      });
    };

    switch (cmd) {
      case 'help':
        addOut('CSCODE TERMINAL - CRIMSON CODE COMMANDS:');
        addOut('  ls, dir              List files and directories in current workspace');
        addOut('  pwd                  Print current working directory');
        addOut('  cat <file>           Display file contents in terminal');
        addOut('  clear                Clear terminal output buffer');
        addOut('  history              Show past commands stored in local storage');
        addOut('  history -c           Clear command history from local storage');
        addOut('  bm, bookmark         Directory bookmarks (list, go, add, rm, reset)');
        addOut('  theme                Show active CsCode Crimson Code theme tokens');
        addOut('  save                 Save all dirty files to local storage (Auto-Save 30s)');
        addOut('  node <file>          Run JavaScript or eval code');
        addOut('  npm run build        Execute production build script');
        addOut('  npm test             Run test runner suite');
        addOut('  git status           Check modified files and branch');
        addOut('  git branch [name]    List or create git branches');
        addOut('  git checkout <bname> Switch active git branch');
        addOut('  git log              Show recent commits');
        addOut('  plugins              List modular IDE plugins and state');
        addOut('  sync status          Show cloud synchronization state');
        addOut('  sync push            Push settings snapshot to cloud');
        addOut('  watcher [sim|clear]  File system watcher status & simulation');
        addOut('  touch <filename>     Touch or create file');
        addOut('  echo <text>          Print text to standard output');
        break;

      case 'theme': {
        const sub = args[1]?.toLowerCase();
        const activeCrimsonPal = getCrimsonTerminalPalette(crimsonShade);

        if (sub === 'link') {
          if (onUpdateSettings) {
            onUpdateSettings({
              linkTerminalToCrimsonTheme: true,
              terminalTheme: activeCrimsonPal.name,
              terminalThemeId: activeCrimsonPal.id,
              terminalBackground: activeCrimsonPal.background,
              terminalForeground: activeCrimsonPal.foreground,
              terminalCursorColor: activeCrimsonPal.cursorColor,
              terminalPromptColor: activeCrimsonPal.promptColor,
            });
            addOut(`[Theme Linked] Terminal color palette linked to active Crimson theme: ${activeCrimsonPal.name}`, 'success');
            addOut(`  Synchronized with IDE ${crimsonShade || 'ruby'} shade:`, 'info');
            addOut(`  Background: ${activeCrimsonPal.background} | Prompt: ${activeCrimsonPal.promptColor} | Caret: ${activeCrimsonPal.cursorColor}`, 'info');
          } else {
            addOut('Settings updater not available.', 'error');
          }
          break;
        }

        if (sub === 'unlink') {
          if (onUpdateSettings) {
            onUpdateSettings({ linkTerminalToCrimsonTheme: false });
            addOut('[Theme Unlinked] Terminal unlinked from IDE Crimson theme. Preset can now be selected independently.', 'info');
          } else {
            addOut('Settings updater not available.', 'error');
          }
          break;
        }

        if (sub && sub !== 'list' && sub !== 'status') {
          // Attempt to find preset by id or partial name
          const found = TERMINAL_THEME_PRESETS.find(
            (p) => p.id.toLowerCase() === sub || p.name.toLowerCase().includes(sub)
          );
          if (found) {
            if (onUpdateSettings) {
              onUpdateSettings({
                terminalTheme: found.name,
                terminalThemeId: found.id,
                terminalBackground: found.background,
                terminalForeground: found.foreground,
                terminalCursorColor: found.cursorColor,
                terminalPromptColor: found.promptColor,
                linkTerminalToCrimsonTheme: false,
              });
              addOut(`[Theme Switched] Terminal theme applied: ${found.name}`, 'success');
              addOut(`  ${found.description}`, 'info');
              addOut(`  Background: ${found.background} | Prompt: ${found.promptColor}`, 'info');
            } else {
              addOut(`Preset found (${found.name}), but settings updater not connected.`, 'info');
            }
          } else {
            addOut(`Unknown terminal theme: "${args[1]}". Available presets:`, 'error');
            TERMINAL_THEME_PRESETS.forEach((p) => {
              addOut(`  • ${p.name} (id: ${p.id})`);
            });
            addOut("Usage: 'theme <name>' (e.g. theme cyberpunk, theme monokai) or 'theme link'", 'info');
          }
          break;
        }

        if (sub === 'list') {
          addOut('[Available Terminal Theme Presets]', 'info');
          TERMINAL_THEME_PRESETS.forEach((p) => {
            const isCurrent = !userSettings?.linkTerminalToCrimsonTheme && (userSettings?.terminalThemeId || 'crimson-night') === p.id;
            addOut(`  ${isCurrent ? '★' : '•'} ${p.name.padEnd(18)} - ${p.description} ${isCurrent ? '[ACTIVE]' : ''}`);
          });
          addOut(`  ${userSettings?.linkTerminalToCrimsonTheme ? '★' : '•'} Linked to Crimson  - Synchronized with active ${crimsonShade || 'ruby'} IDE palette ${userSettings?.linkTerminalToCrimsonTheme ? '[ACTIVE]' : ''}`, 'info');
          addOut("Switch with: 'theme <name>' or 'theme link' / 'theme unlink'", 'info');
          break;
        }

        const termThemeName = userSettings?.linkTerminalToCrimsonTheme
          ? `${activeCrimsonPal.name} (Linked to Crimson)`
          : (userSettings?.terminalTheme || 'Crimson Night');
        addOut(`[Active Terminal Theme: ${termThemeName}]`, 'info');
        addOut(`  Linked to Crimson: ${userSettings?.linkTerminalToCrimsonTheme ? `YES (${crimsonShade || 'ruby'})` : 'NO'}`);
        addOut(`  Background:   ${userSettings?.terminalBackground || '#090a0f'}`);
        addOut(`  Foreground:   ${userSettings?.terminalForeground || '#cbd5e1'}`);
        addOut(`  Prompt Color: ${userSettings?.terminalPromptColor || '#fb7185'}`);
        addOut(`  Caret Color:  ${userSettings?.terminalCursorColor || '#f43f5e'}`);
        addOut(`  Font Family:  ${userSettings?.terminalFontFamily || 'JetBrains Mono'}`);
        addOut(`  Font Size:    ${userSettings?.terminalFontSize || 12}px`);
        addOut("Quick switch: type 'theme <name>', 'theme link', 'theme unlink', or click Palette in toolbar.", 'info');
        break;
      }

      case 'save':
        if (onSaveWorkspace) {
          onSaveWorkspace();
          addOut('[CCode Auto-Save] Workspace state saved to local storage snapshot.', 'success');
        } else {
          addOut('[CCode Auto-Save] No dirty files or workspace already up to date.', 'info');
        }
        break;

      case 'clear':
        setSessions(prev => prev.map(s => s.id === targetId ? { ...s, lines: [] } : s));
        return;

      case 'split': {
        const modeArg = args[1]?.toLowerCase();
        if (modeArg === 'stacked' || modeArg === 'stack' || modeArg === 'vertical' || modeArg === 'rows') {
          handleSetTerminalSplit('stacked');
          addOut('[Terminal Split] Switched terminal to stacked 2-pane view.', 'success');
        } else if (modeArg === 'off' || modeArg === 'none' || modeArg === 'single') {
          handleSetTerminalSplit('none');
          addOut('[Terminal Split] Returned terminal to single pane.', 'info');
        } else {
          handleSetTerminalSplit('side-by-side');
          addOut('[Terminal Split] Switched terminal to side-by-side 2-pane view.', 'success');
        }
        break;
      }

      case 'unsplit': {
        handleSetTerminalSplit('none');
        addOut('[Terminal Split] Returned terminal to single pane.', 'info');
        break;
      }

      case 'history': {
        const sub = args[1]?.toLowerCase();
        if (sub === '-c' || sub === 'clear') {
          handleClearHistory();
        } else if (commandHistory.length === 0) {
          addOut('No commands in history yet. Type commands and navigate with ↑ and ↓.', 'info');
        } else {
          addOut(`COMMAND HISTORY (${commandHistory.length} saved${isPersistenceEnabled ? ' in local storage' : ' in session memory'}):`);
          // Show in chronological order (oldest to newest)
          const chronological = [...commandHistory].reverse();
          chronological.forEach((c, idx) => {
            addOut(`  ${(idx + 1).toString().padStart(3, ' ')}  ${c}`);
          });
          addOut('Tip: Use ↑ / ↓ arrow keys to cycle through past commands, or click "Clear History".', 'info');
          if (!isPersistenceEnabled) {
            addOut('Note: Session persistence is currently disabled in Settings > Terminal.', 'info');
          }
        }
        break;
      }

      case 'bm':
      case 'bookmark': {
        const sub = args[1]?.toLowerCase();
        if (!sub || sub === 'list' || sub === 'ls') {
          if (bookmarks.length === 0) {
            addOut('No directory bookmarks saved yet. Use "bm add [name]" to bookmark current directory.', 'info');
          } else {
            addOut(`DIRECTORY BOOKMARKS (${bookmarks.length} saved in local storage):`);
            bookmarks.forEach((b, idx) => {
              const isCurrent = b.path.toLowerCase() === targetSession.cwd.toLowerCase();
              addOut(`  [${idx + 1}] ${b.name.padEnd(16, ' ')} ${b.path.padEnd(32, ' ')} ${b.description || ''} ${isCurrent ? '[CURRENT CWD]' : ''}`);
            });
            addOut("Commands: 'bm go <name|#>', 'bm add [name]', 'bm rm <name|#>', 'bm reset'", 'info');
          }
        } else if (sub === 'go' || sub === 'jump') {
          const query = args.slice(2).join(' ').trim();
          if (!query) {
            addOut('usage: bm go <name|#|path>', 'error');
            break;
          }
          const found = findBookmarkByQuery(query, bookmarks);
          if (found) {
            setSessions(prev => prev.map(s => s.id === targetId ? { ...s, cwd: found.path } : s));
            addOut(`[Bookmark Jump] Navigated to "${found.name}" (${found.path})`, 'success');
          } else {
            addOut(`bm: no bookmark found matching "${query}". Type "bm list" to view available bookmarks.`, 'error');
          }
        } else if (sub === 'add') {
          const rawName = args[2]?.trim();
          const rawPath = args[3]?.trim() || targetSession.cwd;
          const res = addTerminalBookmark(rawName || '', rawPath);
          setBookmarks(res.bookmarks);
          addOut(`[Bookmark Saved] Bookmarked "${res.added.name}" -> ${res.added.path}`, 'success');
        } else if (sub === 'rm' || sub === 'del' || sub === 'remove') {
          const query = args.slice(2).join(' ').trim();
          if (!query) {
            addOut('usage: bm rm <name|#|id>', 'error');
            break;
          }
          const found = findBookmarkByQuery(query, bookmarks);
          if (found) {
            const updated = removeTerminalBookmark(found.id);
            setBookmarks(updated);
            addOut(`[Bookmark Removed] Removed bookmark "${found.name}" (${found.path})`, 'info');
          } else {
            addOut(`bm: cannot remove "${query}" — bookmark not found.`, 'error');
          }
        } else if (sub === 'clear' || sub === 'reset') {
          saveTerminalBookmarks(DEFAULT_TERMINAL_BOOKMARKS);
          setBookmarks([...DEFAULT_TERMINAL_BOOKMARKS]);
          addOut(`[Bookmark Reset] Reset terminal bookmarks to defaults (${DEFAULT_TERMINAL_BOOKMARKS.length} bookmarks).`, 'info');
        } else if (sub === 'help') {
          addOut('DIRECTORY BOOKMARKS HELP:');
          addOut('  bm, bm list          List all saved directory bookmarks');
          addOut('  bm go <name|#|path>  Instantly jump terminal to bookmarked directory');
          addOut('  bm add [name] [path] Bookmark current working directory (or specific path)');
          addOut('  bm rm <name|#|id>    Remove a saved directory bookmark');
          addOut('  bm reset             Restore default directory bookmarks');
        } else {
          // If user typed "bm <name>" directly (e.g. "bm src" or "bm 2")
          const found = findBookmarkByQuery(sub, bookmarks);
          if (found) {
            setSessions(prev => prev.map(s => s.id === targetId ? { ...s, cwd: found.path } : s));
            addOut(`[Bookmark Jump] Navigated to "${found.name}" (${found.path})`, 'success');
          } else {
            addOut(`bm: unrecognized subcommand or bookmark "${sub}". Type "bm help" or "bm list".`, 'error');
          }
        }
        break;
      }

      case 'cd': {
        const targetDir = args[1]?.trim();
        if (!targetDir || targetDir === '~' || targetDir === '~/workspace') {
          setSessions(prev => prev.map(s => s.id === targetId ? { ...s, cwd: '~/workspace' } : s));
          addOut('~/workspace', 'info');
        } else if (targetDir === '..') {
          setSessions(prev => prev.map(s => {
            if (s.id !== targetId) return s;
            const parts = s.cwd.split('/').filter(Boolean);
            if (parts.length > 1) parts.pop();
            const newCwd = parts.length > 0 ? '~/' + parts.slice(1).join('/') : '~';
            return { ...s, cwd: newCwd === '~/' ? '~' : newCwd };
          }));
        } else {
          // Check if target matches a saved directory bookmark first!
          const bmMatch = findBookmarkByQuery(targetDir, bookmarks);
          if (bmMatch) {
            setSessions(prev => prev.map(s => s.id === targetId ? { ...s, cwd: bmMatch.path } : s));
            addOut(`[Bookmark Jump] ${bmMatch.name} (${bmMatch.path})`, 'info');
            break;
          }

          const cleanTarget = targetDir.replace(/^\.?\//, '');
          const folderExists = files.some(f => f.isFolder && (f.path === cleanTarget || f.name === cleanTarget));
          if (folderExists || cleanTarget === 'src' || cleanTarget === 'components' || cleanTarget === 'lib' || cleanTarget === 'public') {
            const newCwd = `~/workspace/${cleanTarget}`;
            setSessions(prev => prev.map(s => s.id === targetId ? { ...s, cwd: newCwd } : s));
          } else {
            addOut(`cd: no such file or directory: ${targetDir}`, 'error');
          }
        }
        break;
      }

      case 'pwd':
        addOut(targetSession.cwd);
        break;

      case 'ls':
      case 'dir': {
        const allFiles = getAllFilesList(files);
        addOut('MODE        BYTES   NAME');
        addOut('--------------------------------');
        allFiles.forEach(f => {
          const size = (f.content?.length || 0);
          addOut(`-rw-r--r--  ${size.toString().padStart(5, ' ')}   ${f.path}`);
        });
        break;
      }

      case 'cat': {
        const targetPath = args[1];
        if (!targetPath) {
          addOut('usage: cat <file_path>', 'error');
          break;
        }
        const found = getAllFilesList(files).find(f => f.path === targetPath || f.name === targetPath);
        if (found && found.content) {
          found.content.split('\n').forEach(line => addOut(line));
        } else {
          addOut(`cat: ${targetPath}: No such file or directory`, 'error');
        }
        break;
      }

      case 'run':
      case 'node': {
        const targetPath = args[1] || activeFile?.name;
        if (!targetPath) {
          addOut('usage: run <file_path> or node <file_path>', 'error');
          break;
        }
        if (args[1] === '-e' && args[2]) {
          try {
            const expr = args.slice(2).join(' ').replace(/^["']|["']$/g, '');
            // Evaluate safely
            const evaluated = Function(`"use strict"; return (${expr});`)();
            addOut(String(evaluated), 'success');
          } catch (err: any) {
            addOut(`Uncaught EvalError: ${err.message}`, 'error');
          }
          break;
        }

        const allFiles = getAllFilesList(files);
        const target = allFiles.find(f => f.path === targetPath || f.name === targetPath || f.id === targetPath);
        if (!target || !target.content) {
          addOut(`run: cannot find runnable file "${targetPath}"`, 'error');
          break;
        }

        addOut(`Executing ${target.path}...`, 'info');
        executeCode(target.content, target.language || 'typescript').then((res) => {
          setSessions(prev => prev.map(s => {
            if (s.id !== targetId) return s;
            const extraLines: TerminalLine[] = res.logs.map(l => ({
              id: l.id,
              type: l.type === 'error' ? 'error' : l.type === 'success' ? 'success' : l.type === 'warn' ? 'info' : 'output',
              text: l.message,
              timestamp: l.timestamp,
            }));
            return { ...s, lines: [...s.lines, ...extraLines] };
          }));
        });
        break;
      }

      case 'touch': {
        const fname = args[1];
        if (!fname) {
          addOut('usage: touch <filename>', 'error');
          break;
        }
        onCreateFile?.(fname, false);
        addOut(`Created file: ${fname}`, 'success');
        break;
      }

      case 'rm': {
        const targetPath = args[1];
        if (!targetPath) {
          addOut('usage: rm <filename>', 'error');
          break;
        }
        const all = getAllFilesList(files);
        const match = all.find(f => f.path === targetPath || f.name === targetPath);
        if (match) {
          onDeleteFile?.(match.id);
          addOut(`Removed: ${match.path}`, 'success');
        } else {
          addOut(`rm: ${targetPath}: No such file`, 'error');
        }
        break;
      }

      case 'clear-workspace': {
        onClearWorkspace?.();
        addOut('Workspace cleared. All files removed.', 'success');
        break;
      }

      case 'stats': {
        const all = getAllFilesList(files);
        let totalLines = 0;
        let totalBytes = 0;
        all.forEach(f => {
          if (f.content) {
            totalLines += f.content.split('\n').length;
            totalBytes += new Blob([f.content]).size;
          }
        });
        addOut('WORKSPACE METRICS:');
        addOut(`  Total Files: ${all.length}`);
        addOut(`  Total Lines: ${totalLines}`);
        addOut(`  Total Size:  ${totalBytes < 1024 ? totalBytes + ' B' : (totalBytes / 1024).toFixed(1) + ' KB'}`);
        break;
      }

      case 'npm': {
        const sub = args[1];
        if (sub === 'run' && args[2] === 'build') {
          addOut('> ccode@2.5.0 build');
          addOut('> vite build && esbuild server.ts --bundle --platform=node');
          addOut('transforming (18 modules)...');
          addOut('rendering chunks...');
          addOut('dist/index.html                     0.84 kB');
          addOut('dist/assets/index-D7b392a1.css     14.82 kB');
          addOut('dist/assets/index-C8a91b42.js     132.10 kB');
          addOut('[Success] Built in 286ms.', 'success');
        } else if (sub === 'test') {
          addOut('> ccode@2.5.0 test');
          addOut(' PASS  src/core/fuzzySearch.test.ts (4 tests)');
          addOut(' PASS  src/core/pluginLoader.test.ts (3 tests)');
          addOut(' PASS  src/sync/cloudSync.test.ts (5 tests)');
          addOut('Test Suites: 3 passed, 3 total');
          addOut('Tests:       12 passed, 12 total', 'success');
        } else {
          addOut(`npm: command not recognized for "${raw}"`, 'error');
        }
        break;
      }

      case 'git': {
        const sub = args[1]?.toLowerCase();
        if (sub === 'status') {
          addOut(`On branch ${gitBranch}`);
          addOut(`Your branch is up to date with "origin/${gitBranch}".`);
          addOut('Changes to be committed:');
          addOut('  modified:   src/main.ts', 'info');
          addOut('  modified:   config/ccode.settings.json', 'info');
        } else if (sub === 'branch') {
          const newBranch = args[2];
          if (newBranch) {
            onCreateBranch?.(newBranch);
            addOut(`Created and checked out branch '${newBranch}'`, 'success');
          } else {
            addOut(`GIT BRANCHES (${branches.length}):`);
            branches.forEach((b) => {
              if (b === gitBranch) {
                addOut(`* ${b} (HEAD)`, 'success');
              } else {
                addOut(`  ${b}`);
              }
            });
            addOut('Tip: Use the status bar branch switcher or "git branch <name>" to create branches.', 'info');
          }
        } else if (sub === 'checkout' || sub === 'switch') {
          if (args[2] === '-b' && args[3]) {
            onCreateBranch?.(args[3]);
            addOut(`Switched to a new branch '${args[3]}'`, 'success');
          } else if (args[2]) {
            const target = args[2];
            onSwitchBranch?.(target);
            addOut(`Switched to branch '${target}'`, 'success');
          } else {
            addOut('usage: git checkout <branch_name> or git checkout -b <new_branch>', 'error');
          }
        } else if (sub === 'log') {
          addOut(`commit a7b91d2 (HEAD -> ${gitBranch})`);
          addOut('Author: Developer <developer@workspace.local>');
          addOut('Date:   Sat Sep 19 17:40:00 2026 -0700');
          addOut('    feat: ccode crimson theme and breadcrumb navigation');
        } else {
          addOut(`git ${sub}: completed successfully.`, 'success');
        }
        break;
      }

      case 'plugins': {
        addOut('INSTALLED CCODE PLUGINS:');
        plugins.forEach(p => {
          const status = p.enabled ? '[ENABLED]' : '[DISABLED]';
          addOut(`  ${status.padEnd(12, ' ')} ${p.name} (v${p.version})`);
        });
        break;
      }

      case 'sync': {
        const sub = args[1];
        if (sub === 'push') {
          onTriggerSync();
          addOut('[CloudSync] Pushing local settings bundle to cloud registry...', 'info');
          addOut('[CloudSync] Snapshot CRM-7749 committed successfully.', 'success');
        } else {
          addOut('[CloudSync] Status: Synced | Pairing Code: CRM-7749 | Devices: 3 active');
        }
        break;
      }

      case 'echo':
        addOut(args.slice(1).join(' '));
        break;

      case 'watcher': {
        const sub = args[1]?.toLowerCase();
        if (sub === 'simulate' || sub === 'sim') {
          const targetName = args[2];
          const allFlat = getAllFilesList(files).filter((f) => !f.isFolder);
          const found = targetName ? allFlat.find((f) => f.name === targetName || f.path === targetName) : null;
          if (targetName && !found) {
            addOut(`watcher: file '${targetName}' not found in workspace`, 'error');
          } else {
            onSimulateExternalChange?.(found?.id);
            addOut(`[File Watcher] Simulated external modification on '${found ? found.name : 'workspace file'}'. Check the Sidebar indicator!`, 'success');
          }
        } else if (sub === 'clear' || sub === 'dismiss') {
          onDismissAllExternalChanges?.();
          addOut('[File Watcher] Cleared all external modification indicators.', 'info');
        } else {
          addOut('[File System Watcher: Active]');
          addOut('  Status: Monitoring workspace directory tree');
          const extCount = Object.keys(externallyModifiedFiles || {}).length;
          addOut(`  Pending external modifications: ${extCount}`);
          if (extCount > 0) {
            Object.values(externallyModifiedFiles || {}).forEach((mod) => {
              addOut(`    * ${mod.fileName} (${mod.filePath}) modified at ${mod.timeFormatted}`, 'info');
            });
          }
          addOut('  Commands: "watcher simulate [filename]", "watcher clear"', 'info');
        }
        break;
      }

      case 'touch': {
        const filename = args[1];
        if (!filename) {
          addOut('usage: touch <filename>', 'error');
        } else {
          const allFlat = getAllFilesList(files).filter((f) => !f.isFolder);
          const existing = allFlat.find((f) => f.name === filename || f.path === filename);
          if (existing && onSimulateExternalChange) {
            onSimulateExternalChange(existing.id);
            addOut(`Updated '${filename}' externally on disk (File System Watcher triggered)`, 'success');
          } else if (onCreateFile) {
            onCreateFile(filename, false);
            addOut(`Created file '${filename}'`, 'success');
          }
        }
        break;
      }

      default:
        addOut(`ccode: command not found: ${cmd}. Type "help" for command list.`, 'error');
        break;
    }

    // Update target session lines
    setSessions(prev => prev.map(s => {
      if (s.id === targetId) {
        return {
          ...s,
          lines: [...s.lines, ...resultLines]
        };
      }
      return s;
    }));
  };

  // Filter commands for the Help popover
  const filteredHelpCommands = useMemo(() => {
    const q = helpSearch.trim().toLowerCase();
    return COMMON_TERMINAL_COMMANDS.filter((cmd) => {
      const matchesCategory = selectedHelpCategory === 'All' || cmd.category === selectedHelpCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        cmd.command.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        (cmd.example && cmd.example.toLowerCase().includes(q))
      );
    });
  }, [helpSearch, selectedHelpCategory]);

  // Insert command template into focused terminal pane
  const handleInsertCommand = (cmd: string) => {
    setExternalInsertCommand({ text: cmd, timestamp: Date.now() });
    setIsHelpOpen(false);
  };

  // Run command directly in terminal
  const handleRunCommand = (cmd: string) => {
    setIsHelpOpen(false);
    executeCommand(cmd, activeSessionId);
  };

  const handleSetTerminalSplit = (mode: TerminalSplitMode) => {
    setTerminalSplitMode(mode);
    onToggleTerminalSplit?.(mode);
    if (mode !== 'none' && sessions.length < 2) {
      addNewTerminalSession('node');
    }
  };

  const clearSessionBuffer = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, lines: [] } : s));
  };

  const addNewTerminalSession = (shellName: string = 'bash') => {
    const newId = `term-${Date.now()}`;
    const newSession: TerminalSession = {
      id: newId,
      name: `${shellName} (${sessions.length + 1})`,
      shell: shellName,
      cwd: '~/workspace',
      lines: [
        {
          id: `l-${Date.now()}`,
          type: 'info',
          text: `Crimson Terminal session #${sessions.length + 1} (${shellName}) initialized`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    };
    setSessions(prev => [...prev, newSession]);
    if (terminalSplitMode !== 'none' && focusedPane === 'secondary') {
      setSecondarySessionId(newId);
    } else {
      setPrimarySessionId(newId);
    }
    return newId;
  };

  const closeTerminalSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (primarySessionId === id) {
      setPrimarySessionId(remaining[0].id);
    }
    if (secondarySessionId === id) {
      setSecondarySessionId(remaining[remaining.length - 1].id);
    }
  };

  if (!isOpen) return null;

  const containerClasses =
    position === 'right'
      ? 'w-80 md:w-96 h-full border-l border-[#1a1b24]'
      : position === 'left'
      ? 'w-80 md:w-96 h-full border-r border-[#1a1b24]'
      : 'h-56 w-full border-t border-[#1a1b24]';

  return (
    <div 
      id="crimson-bottom-panel"
      className={`${containerClasses} bg-[#0c0d12] flex flex-col select-none z-20 shrink-0 ${
        isEditLayoutMode ? 'ring-1 ring-rose-500/80 ring-inset' : ''
      }`}
    >
      {/* Panel Tab Header */}
      <div className="h-8 bg-[#0b0c11] border-b border-[#1a1b24] flex items-center justify-between px-3 text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          <button
            onClick={() => onSelectTab('terminal')}
            className={`px-2.5 py-1 font-mono text-xs flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'terminal' 
                ? `${currentTheme.tabActive} border-b-2 font-semibold` 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.terminal} className="text-[11px]" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => onSelectTab('problems')}
            className={`px-2.5 py-1 font-mono text-xs flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'problems' 
                ? `${currentTheme.tabActive} border-b-2 font-semibold` 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.error} className={`text-[11px] ${currentTheme.primary}`} />
            <span>Problems ({diagnostics.length})</span>
          </button>

          <button
            onClick={() => onSelectTab('output')}
            className={`px-2.5 py-1 font-mono text-xs flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'output' 
                ? `${currentTheme.tabActive} border-b-2 font-semibold` 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.code} className="text-[11px]" />
            <span>Output</span>
          </button>

          <button
            id="bottom-panel-tab-testing"
            onClick={() => onSelectTab('testing')}
            className={`px-2.5 py-1 font-mono text-xs flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'testing' 
                ? `${currentTheme.tabActive} border-b-2 font-semibold` 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.flask} className="text-[11px]" />
            <span>Testing</span>
          </button>
        </div>

        {/* Right Controls: Dock cycle, New Session, Clear, Close Panel */}
        <div className="flex items-center space-x-2 text-slate-400">
          {/* Dock position badge when in Edit Layout Mode */}
          {isEditLayoutMode && onCycleDockPosition && (
            <button
              onClick={onCycleDockPosition}
              title={`Currently docked: ${position}. Click to cycle: Bottom -> Right -> Left`}
              className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900/60 text-[10px] font-mono transition-colors flex items-center space-x-1 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={ICONS.layout} className="text-[9px]" />
              <span>Dock: <strong className="capitalize">{position}</strong></span>
            </button>
          )}

          {activeTab === 'terminal' && (
            <>
              {/* Terminal Split View Controls */}
              <div className="flex items-center space-x-0.5 bg-[#101118] border border-[#1e202c] rounded p-0.5 text-[10px] font-mono">
                <button
                  id="terminal-split-none-btn"
                  onClick={() => handleSetTerminalSplit('none')}
                  title="Single Terminal Pane"
                  className={`px-1.5 py-0.5 rounded flex items-center space-x-1 transition-colors cursor-pointer ${
                    terminalSplitMode === 'none'
                      ? `${currentTheme.sessionActive} font-medium`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1b26]'
                  }`}
                >
                  <FontAwesomeIcon icon={ICONS.terminal} className="text-[9px]" />
                  <span className="hidden xl:inline">Single</span>
                </button>
                <button
                  id="terminal-split-side-btn"
                  onClick={() => handleSetTerminalSplit('side-by-side')}
                  title="Split Side-by-Side (2 Panes Horizontal)"
                  className={`px-1.5 py-0.5 rounded flex items-center space-x-1 transition-colors cursor-pointer ${
                    terminalSplitMode === 'side-by-side'
                      ? `${currentTheme.sessionActive} font-medium`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1b26]'
                  }`}
                >
                  <FontAwesomeIcon icon={ICONS.splitVertical} className="text-[9px]" />
                  <span className="hidden xl:inline">Side-by-Side</span>
                </button>
                <button
                  id="terminal-split-stacked-btn"
                  onClick={() => handleSetTerminalSplit('stacked')}
                  title="Split Stacked (2 Panes Vertical)"
                  className={`px-1.5 py-0.5 rounded flex items-center space-x-1 transition-colors cursor-pointer ${
                    terminalSplitMode === 'stacked'
                      ? `${currentTheme.sessionActive} font-medium`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1b26]'
                  }`}
                >
                  <FontAwesomeIcon icon={ICONS.splitHorizontal} className="text-[9px]" />
                  <span className="hidden xl:inline">Stacked</span>
                </button>
              </div>

              {/* Terminal Session Selector */}
              <div className="flex items-center space-x-1 bg-[#101118] border border-[#1e202c] rounded px-1.5 py-0.5">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                      activeSessionId === s.id ? currentTheme.sessionActive : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{s.name}</span>
                    {sessions.length > 1 && (
                      <span 
                        onClick={(e) => closeTerminalSession(s.id, e)}
                        className="text-[9px] hover:text-rose-400 ml-1"
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => addNewTerminalSession('bash')}
                  title="New Terminal"
                  className="px-1 text-slate-400 hover:text-rose-400 text-xs cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
                </button>
              </div>

              {/* History Button / Indicator */}
              <button
                onClick={() => executeCommand('history')}
                title={`Command History: ${commandHistory.length} saved${isPersistenceEnabled ? ' in local storage' : ' in session'}. Click to view (or press ↑/↓ to cycle)`}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-amber-300 hover:bg-[#1a1b26] transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.clock} className="text-[9px]" />
                <span className="hidden sm:inline">History ({commandHistory.length})</span>
              </button>

              {/* Clear History Button */}
              <button
                id="terminal-clear-history-btn"
                onClick={handleClearHistory}
                disabled={commandHistory.length === 0}
                title={
                  commandHistory.length === 0
                    ? 'Command history is empty'
                    : `Clear Command History (${commandHistory.length} entries)${isPersistenceEnabled ? ' from local storage' : ''}`
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 transition-colors ${
                  commandHistory.length === 0
                    ? 'text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-[#1a1b26] cursor-pointer'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.trash} className="text-[9px]" />
                <span className="hidden md:inline">Clear History</span>
              </button>

              {/* Terminal Directory Bookmarks Dropdown */}
              <div className="relative" ref={bookmarksMenuRef}>
                <button
                  id="terminal-bookmarks-btn"
                  type="button"
                  onClick={() => setIsBookmarksMenuOpen((prev) => !prev)}
                  title={`Directory Bookmarks (${bookmarks.length} saved). Click to view, quickly jump to directories, or bookmark current folder.`}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                    isBookmarksMenuOpen
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'text-slate-400 hover:text-rose-300 hover:bg-[#1a1b26]'
                  }`}
                >
                  <FontAwesomeIcon icon={ICONS.bookmark} className="text-[10px] text-rose-400" />
                  <span className="hidden sm:inline">Bookmarks</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#181926] text-rose-300 border border-rose-900/60 font-mono">
                    {bookmarks.length}
                  </span>
                  <FontAwesomeIcon icon={ICONS.chevronDown} className="text-[8px] text-slate-500 ml-0.5" />
                </button>

                {/* Bookmarks Popover Menu */}
                {isBookmarksMenuOpen && (
                  <div
                    id="terminal-bookmarks-popover"
                    className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 max-h-[420px] bg-[#0c0d14] border border-[#23263a] rounded-lg shadow-2xl z-50 flex flex-col font-sans overflow-hidden text-xs text-slate-200"
                    style={{ backdropFilter: 'blur(12px)' }}
                  >
                    {/* Header */}
                    <div className="p-2.5 bg-[#10121c] border-b border-[#1f2233] flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2 truncate">
                        <FontAwesomeIcon icon={ICONS.bookmark} className="text-rose-400 text-xs shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-rose-300 text-xs">Directory Bookmarks</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            Active CWD: <span className="text-slate-200">{activeSession.cwd}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsBookmarksMenuOpen(false)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition-colors rounded cursor-pointer shrink-0"
                        title="Close Bookmarks"
                      >
                        <FontAwesomeIcon icon={ICONS.close} className="text-xs" />
                      </button>
                    </div>

                    {/* Quick Action: Bookmark Active Directory */}
                    <div className="p-2 border-b border-[#1b1d2b] bg-[#090a0f] flex items-center justify-between gap-2 shrink-0">
                      <div className="truncate">
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          Current: <span className="text-slate-300 font-bold">{activeSession.cwd}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="terminal-bookmark-cwd-btn"
                        onClick={() => handleBookmarkCwd(activeSession.cwd)}
                        className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/80 text-[10px] font-mono transition-colors flex items-center space-x-1 shrink-0 cursor-pointer shadow-xs"
                        title="Bookmark active directory in workspace"
                      >
                        <FontAwesomeIcon icon={ICONS.plus} className="text-[9px]" />
                        <span>Bookmark CWD</span>
                      </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="px-2 py-1.5 border-b border-[#1b1d2b] bg-[#0b0c13] shrink-0">
                      <div className="relative flex items-center">
                        <FontAwesomeIcon
                          icon={ICONS.search}
                          className="absolute left-2.5 text-[10px] text-slate-500 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={bookmarkSearchFilter}
                          onChange={(e) => setBookmarkSearchFilter(e.target.value)}
                          placeholder="Filter bookmarks by name or path..."
                          className="w-full pl-7 pr-7 py-1 rounded bg-[#131520] border border-[#25283b] text-slate-200 placeholder-slate-500 text-[11px] focus:outline-none focus:border-rose-500 font-mono"
                        />
                        {bookmarkSearchFilter && (
                          <button
                            onClick={() => setBookmarkSearchFilter('')}
                            className="absolute right-2 text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer"
                          >
                            <FontAwesomeIcon icon={ICONS.close} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bookmarks List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-[#181a28] p-1.5 space-y-1">
                      {bookmarks.filter(b => 
                        !bookmarkSearchFilter || 
                        b.name.toLowerCase().includes(bookmarkSearchFilter.toLowerCase()) || 
                        b.path.toLowerCase().includes(bookmarkSearchFilter.toLowerCase())
                      ).length > 0 ? (
                        bookmarks
                          .filter(b => 
                            !bookmarkSearchFilter || 
                            b.name.toLowerCase().includes(bookmarkSearchFilter.toLowerCase()) || 
                            b.path.toLowerCase().includes(bookmarkSearchFilter.toLowerCase())
                          )
                          .map((bm, index) => {
                            const isCurrent = bm.path.toLowerCase() === activeSession.cwd.toLowerCase();
                            return (
                              <div
                                key={bm.id}
                                className={`p-2 rounded hover:bg-[#141624] transition-colors group space-y-1 ${
                                  isCurrent ? 'bg-rose-950/20 border border-rose-900/40' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1.5 min-w-0">
                                    <span className="text-[10px] font-mono text-slate-500 font-bold w-4">
                                      #{index + 1}
                                    </span>
                                    <FontAwesomeIcon
                                      icon={ICONS.folder}
                                      className={`text-[11px] shrink-0 ${isCurrent ? 'text-rose-400' : 'text-amber-400/80'}`}
                                    />
                                    <span className="text-xs font-semibold text-slate-200 truncate">
                                      {bm.name}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold shrink-0">
                                        CURRENT
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleJumpToBookmark(bm.path, bm.name)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center space-x-1 cursor-pointer ${
                                        isCurrent
                                          ? 'bg-[#1a1c2b] text-slate-400 hover:text-white border border-[#2a2d42]'
                                          : 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700 font-semibold'
                                      }`}
                                      title={`Jump to ${bm.path}`}
                                    >
                                      <FontAwesomeIcon icon={ICONS.arrowRight} className="text-[9px]" />
                                      <span>{isCurrent ? 'Stay' : 'Jump'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBookmark(bm.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded cursor-pointer"
                                      title={`Remove bookmark "${bm.name}"`}
                                    >
                                      <FontAwesomeIcon icon={ICONS.trash} className="text-[9px]" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                  <span className="truncate text-rose-300/80">{bm.path}</span>
                                </div>
                                {bm.description && (
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {bm.description}
                                  </div>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <div className="py-6 text-center text-slate-500 text-xs">
                          {bookmarkSearchFilter ? `No bookmarks matching "${bookmarkSearchFilter}"` : 'No saved bookmarks.'}
                        </div>
                      )}
                    </div>

                    {/* Custom Add Form Toggle */}
                    <div className="p-2 bg-[#0a0b12] border-t border-[#1b1d2b] space-y-2 shrink-0 font-mono text-[11px]">
                      {isAddingCustomBookmark ? (
                        <div className="space-y-1.5 p-2 bg-[#12131d] rounded border border-[#232537]">
                          <div className="text-[10px] font-bold text-rose-300 uppercase">New Directory Bookmark</div>
                          <input
                            type="text"
                            value={newBookmarkName}
                            onChange={(e) => setNewBookmarkName(e.target.value)}
                            placeholder="Bookmark Name (e.g. Components, Utils)"
                            className="w-full px-2 py-1 bg-[#181a28] border border-[#2d3047] rounded text-slate-200 text-[11px] outline-none focus:border-rose-500"
                          />
                          <input
                            type="text"
                            value={newBookmarkPath}
                            onChange={(e) => setNewBookmarkPath(e.target.value)}
                            placeholder="Directory Path (e.g. ~/workspace/src/components)"
                            className="w-full px-2 py-1 bg-[#181a28] border border-[#2d3047] rounded text-slate-200 text-[11px] outline-none focus:border-rose-500"
                          />
                          <div className="flex items-center justify-end space-x-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCustomBookmark(false);
                                setNewBookmarkName('');
                                setNewBookmarkPath('');
                              }}
                              className="px-2 py-0.5 rounded text-slate-400 hover:text-white text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newBookmarkPath.trim()) return;
                                const norm = normalizeDirectoryPath(newBookmarkPath);
                                const dName = newBookmarkName.trim() || norm.split('/').pop() || 'workspace';
                                const res = addTerminalBookmark(dName, norm);
                                setBookmarks(res.bookmarks);
                                setNewBookmarkName('');
                                setNewBookmarkPath('');
                                setIsAddingCustomBookmark(false);
                                setBookmarkToast(`Added bookmark: ${dName}`);
                                setTimeout(() => setBookmarkToast(null), 3000);
                              }}
                              disabled={!newBookmarkPath.trim()}
                              className="px-2.5 py-0.5 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 text-[10px] font-semibold border border-rose-700 disabled:opacity-40 cursor-pointer"
                            >
                              Save Bookmark
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCustomBookmark(true);
                              setNewBookmarkPath(activeSession.cwd);
                              setNewBookmarkName(activeSession.cwd.split('/').pop() || '');
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={ICONS.plus} className="text-[9px]" />
                            <span>Add Custom Path Bookmark</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              saveTerminalBookmarks(DEFAULT_TERMINAL_BOOKMARKS);
                              setBookmarks([...DEFAULT_TERMINAL_BOOKMARKS]);
                              setBookmarkToast('Reset to default bookmarks');
                              setTimeout(() => setBookmarkToast(null), 2500);
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                            title="Reset to default workspace directory bookmarks"
                          >
                            Reset Defaults
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Footer Tip */}
                    <div className="p-2 bg-[#08090d] border-t border-[#171824] text-[10px] text-slate-500 flex items-center justify-between shrink-0 font-mono">
                      <span>CLI: <code className="text-rose-300">bm go &lt;name&gt;</code> &bull; <code className="text-rose-300">bm add</code></span>
                      <span>Esc to close</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Help Icon & Commands Popover */}
              <div className="relative" ref={helpPopoverRef}>
                <button
                  id="terminal-help-btn"
                  onClick={() => setIsHelpOpen((prev) => !prev)}
                  title="Terminal Commands Reference & Help"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                    isHelpOpen
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'text-slate-400 hover:text-rose-300 hover:bg-[#1a1b26]'
                  }`}
                >
                  <FontAwesomeIcon icon={ICONS.question} className="text-[10px]" />
                  <span className="hidden sm:inline">Help</span>
                </button>

                {/* Popover Listing Common Terminal Commands */}
                {isHelpOpen && (
                  <div
                    id="terminal-help-popover"
                    className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 max-h-[380px] bg-[#0c0d14] border border-[#23263a] rounded-lg shadow-2xl z-50 flex flex-col font-sans overflow-hidden text-xs text-slate-200"
                    style={{ backdropFilter: 'blur(12px)' }}
                  >
                    {/* Header */}
                    <div className="p-2.5 bg-[#10121c] border-b border-[#1f2233] flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={ICONS.question} className="text-rose-400 text-xs" />
                        <div>
                          <div className="font-semibold text-rose-300 text-xs">Terminal Commands Help</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Env: {activeSession.name} ({activeSession.cwd})
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsHelpOpen(false)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition-colors rounded cursor-pointer"
                        title="Close Help"
                      >
                        <FontAwesomeIcon icon={ICONS.close} className="text-xs" />
                      </button>
                    </div>

                    {/* Search Filter Bar */}
                    <div className="p-2 border-b border-[#1b1d2b] bg-[#090a0f] shrink-0">
                      <div className="relative flex items-center">
                        <FontAwesomeIcon
                          icon={ICONS.search}
                          className="absolute left-2.5 text-[10px] text-slate-500 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={helpSearch}
                          onChange={(e) => setHelpSearch(e.target.value)}
                          placeholder="Search commands (e.g. git, npm, ls, theme)..."
                          className="w-full pl-7 pr-7 py-1 rounded bg-[#131520] border border-[#25283b] text-slate-200 placeholder-slate-500 text-[11px] focus:outline-none focus:border-rose-500 font-mono"
                          autoFocus
                        />
                        {helpSearch && (
                          <button
                            onClick={() => setHelpSearch('')}
                            className="absolute right-2 text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer"
                          >
                            <FontAwesomeIcon icon={ICONS.close} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="px-2 py-1.5 bg-[#0b0c13] border-b border-[#1b1d2b] flex items-center space-x-1 overflow-x-auto shrink-0 text-[10px]">
                      {['All', 'File System', 'Run & Build', 'Git', 'System'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedHelpCategory(cat)}
                          className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
                            selectedHelpCategory === cat
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-[#161824]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Command List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-[#181a28] p-1.5 space-y-1">
                      {filteredHelpCommands.length > 0 ? (
                        filteredHelpCommands.map((item) => (
                          <div
                            key={item.command}
                            className="p-1.5 rounded hover:bg-[#141624] transition-colors group space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <code className="text-[11px] font-mono font-semibold text-rose-300 bg-rose-950/40 px-1 py-0.2 rounded border border-rose-900/40">
                                  {item.command}
                                </code>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#181a28] text-slate-400 border border-[#25283b]">
                                  {item.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleInsertCommand(item.example || item.command)}
                                  className="px-1.5 py-0.5 rounded bg-[#1a1c2b] hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-[#2a2d42] text-[9px] font-mono transition-colors cursor-pointer"
                                  title={`Insert "${item.example || item.command}" into input`}
                                >
                                  Insert
                                </button>
                                <button
                                  onClick={() => handleRunCommand(item.example || item.command)}
                                  className="px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/80 text-[9px] font-mono transition-colors flex items-center space-x-1 cursor-pointer"
                                  title={`Execute "${item.example || item.command}" immediately`}
                                >
                                  <FontAwesomeIcon icon={ICONS.play} className="text-[8px]" />
                                  <span>Run</span>
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight">
                              {item.description}
                            </div>
                            {item.example && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Example: <span className="text-slate-400">{item.example}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-slate-500 text-xs">
                          No commands matching &quot;{helpSearch}&quot;
                        </div>
                      )}
                    </div>

                    {/* Footer Tip */}
                    <div className="p-2 bg-[#090a0f] border-t border-[#1b1d2b] text-[10px] text-slate-500 flex items-center justify-between shrink-0">
                      <span>Click <strong>Insert</strong> to edit, <strong>Run</strong> to execute.</span>
                      <span className="font-mono">Esc to close</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Terminal Theme Dropdown */}
              <div className="relative" ref={themePickerRef}>
                <button
                  id="terminal-quick-theme-btn"
                  type="button"
                  onClick={() => setIsThemePickerOpen((prev) => !prev)}
                  title={
                    userSettings?.linkTerminalToCrimsonTheme
                      ? `Active Theme: ${getCrimsonTerminalPalette(crimsonShade).name} (Linked to IDE Crimson). Click to customize.`
                      : `Active Theme: ${userSettings?.terminalTheme || 'Crimson Night'}. Click to quickly switch terminal preset theme.`
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                    isThemePickerOpen
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : userSettings?.linkTerminalToCrimsonTheme
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900/60'
                      : 'text-slate-400 hover:text-rose-300 hover:bg-[#1a1b26]'
                  }`}
                >
                  <FontAwesomeIcon icon={userSettings?.linkTerminalToCrimsonTheme ? ICONS.link : ICONS.palette} className="text-[10px] text-rose-400" />
                  <span className="hidden sm:inline font-medium">
                    {userSettings?.linkTerminalToCrimsonTheme ? `Linked: ${getCrimsonTerminalPalette(crimsonShade).name}` : (userSettings?.terminalTheme || 'Crimson Night')}
                  </span>
                  <FontAwesomeIcon icon={ICONS.chevronDown} className="text-[8px] text-slate-500 ml-0.5" />
                </button>

                {isThemePickerOpen && (
                  <div
                    id="terminal-quick-theme-menu"
                    className="absolute right-0 bottom-full mb-1.5 w-64 bg-[#0c0d14] border border-[#23263a] rounded-lg shadow-2xl z-50 p-1.5 font-mono text-xs text-slate-200"
                    style={{ backdropFilter: 'blur(12px)' }}
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider border-b border-[#1f2233] mb-1 flex items-center justify-between">
                      <span>Terminal Presets</span>
                      <span className="text-slate-500 font-normal">8 themes</span>
                    </div>

                    {/* Quick Link to Crimson Theme Action */}
                    <div className="p-1 mb-1 border-b border-[#1f2233]">
                      <button
                        type="button"
                        id="terminal-quick-link-crimson-btn"
                        onClick={() => {
                          const pal = getCrimsonTerminalPalette(crimsonShade);
                          if (onUpdateSettings) {
                            if (!userSettings?.linkTerminalToCrimsonTheme) {
                              onUpdateSettings({
                                linkTerminalToCrimsonTheme: true,
                                terminalTheme: pal.name,
                                terminalThemeId: pal.id,
                                terminalBackground: pal.background,
                                terminalForeground: pal.foreground,
                                terminalCursorColor: pal.cursorColor,
                                terminalPromptColor: pal.promptColor,
                              });
                            } else {
                              onUpdateSettings({
                                linkTerminalToCrimsonTheme: false,
                              });
                            }
                          }
                          setIsThemePickerOpen(false);
                        }}
                        className={`w-full px-2 py-1.5 rounded text-left flex items-center justify-between transition-colors cursor-pointer ${
                          userSettings?.linkTerminalToCrimsonTheme
                            ? 'bg-rose-950/80 border border-rose-700 text-rose-200'
                            : 'hover:bg-[#181a28] text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <FontAwesomeIcon icon={userSettings?.linkTerminalToCrimsonTheme ? ICONS.link : ICONS.unlink} className="text-[10px] text-rose-400" />
                          <div className="truncate">
                            <div className="text-[11px] font-semibold truncate">Link to Crimson Theme</div>
                            <div className="text-[9px] text-slate-400 truncate">{getCrimsonTerminalPalette(crimsonShade).name}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${userSettings?.linkTerminalToCrimsonTheme ? 'bg-rose-900 text-rose-200 border border-rose-700' : 'bg-[#181926] text-slate-400'}`}>
                          {userSettings?.linkTerminalToCrimsonTheme ? 'LINKED' : 'LINK'}
                        </span>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {TERMINAL_THEME_PRESETS.map((preset) => {
                        const isCurrent =
                          !userSettings?.linkTerminalToCrimsonTheme &&
                          ((userSettings?.terminalThemeId || 'crimson-night') === preset.id ||
                          userSettings?.terminalTheme === preset.name);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              if (onUpdateSettings) {
                                onUpdateSettings({
                                  terminalTheme: preset.name,
                                  terminalThemeId: preset.id,
                                  terminalBackground: preset.background,
                                  terminalForeground: preset.foreground,
                                  terminalCursorColor: preset.cursorColor,
                                  terminalPromptColor: preset.promptColor,
                                  linkTerminalToCrimsonTheme: false,
                                });
                              }
                              setIsThemePickerOpen(false);
                            }}
                            className={`w-full px-2 py-1.5 rounded text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-rose-950/70 border border-rose-800 text-rose-200'
                                : 'hover:bg-[#181a28] text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                                style={{ backgroundColor: preset.promptColor }}
                              />
                              <span className="text-[11px] font-semibold truncate">{preset.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              <span
                                className="w-2.5 h-2.5 rounded-xs border border-slate-700"
                                style={{ backgroundColor: preset.background }}
                                title={`Background: ${preset.background}`}
                              />
                              <span
                                className="w-2.5 h-2.5 rounded-xs border border-slate-700"
                                style={{ backgroundColor: preset.foreground }}
                                title={`Text: ${preset.foreground}`}
                              />
                              {isCurrent && (
                                <span className="text-[9px] text-rose-400 font-bold ml-1">ACTIVE</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {onOpenSettings && (
                      <div className="pt-1 mt-1 border-t border-[#1f2233]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsThemePickerOpen(false);
                            onOpenSettings('terminal');
                          }}
                          className="w-full text-center py-1 text-[10px] text-slate-400 hover:text-rose-300 hover:bg-[#181a28] rounded cursor-pointer"
                        >
                          More Terminal Settings...
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Terminal Settings & Theme Selector button */}
              {onOpenSettings && (
                <button
                  id="terminal-settings-btn"
                  onClick={() => onOpenSettings('terminal')}
                  title="Open Terminal Settings & Theme Selector"
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 text-slate-400 hover:text-rose-300 hover:bg-[#1a1b26] transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.settings} className="text-[10px]" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              )}

              {/* Clear Terminal Output Buffer */}
              <button
                onClick={() => executeCommand('clear')}
                title="Clear Terminal Output Buffer (clear)"
                className="p-1 hover:text-rose-400 hover:bg-[#1a1b26] rounded transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.close} className="text-xs" />
              </button>
            </>
          )}

          <button
            onClick={onToggleOpen}
            title="Close Panel"
            className="p-1 hover:text-rose-400 hover:bg-[#1a1b26] rounded transition-colors"
          >
            <FontAwesomeIcon icon={ICONS.close} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div 
        className={`flex-1 overflow-y-auto ${activeTab === 'terminal' ? 'p-0' : 'p-2'} font-mono text-xs`}
        style={{
          backgroundColor: activeTab === 'terminal' && userSettings?.terminalBackground ? userSettings.terminalBackground : '#090a0f',
          color: activeTab === 'terminal' && userSettings?.terminalForeground ? userSettings.terminalForeground : undefined,
          fontFamily: activeTab === 'terminal' && userSettings?.terminalFontFamily ? userSettings.terminalFontFamily : undefined,
          fontSize: activeTab === 'terminal' && userSettings?.terminalFontSize ? `${userSettings.terminalFontSize}px` : undefined,
        }}
      >
        {/* TAB 1: TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="h-full flex flex-col relative">
            {bookmarkToast && (
              <div className="absolute top-2 right-4 z-40 bg-[#161826] border border-rose-700/80 text-rose-200 px-3 py-1.5 rounded-lg text-xs font-mono shadow-2xl flex items-center space-x-2 animate-fadeIn">
                <FontAwesomeIcon icon={ICONS.bookmark} className="text-rose-400 text-xs" />
                <span>{bookmarkToast}</span>
              </div>
            )}
            {terminalSplitMode === 'none' ? (
              <TerminalPaneView
                session={primarySession}
                isFocused={true}
                onFocus={() => setFocusedPane('primary')}
                paneLabel="Terminal"
                splitMode="none"
                sessions={sessions}
                onSelectSession={setActiveSessionId}
                onNewSession={() => addNewTerminalSession('bash')}
                onCloseSession={closeTerminalSession}
                onExecuteCommand={executeCommand}
                onClearSession={clearSessionBuffer}
                commandHistory={commandHistory}
                userSettings={userSettings}
                currentTheme={currentTheme}
                externalInsertCommand={externalInsertCommand}
                bookmarks={bookmarks}
                onJumpToBookmark={handleJumpToBookmark}
                onBookmarkCwd={handleBookmarkCwd}
              />
            ) : terminalSplitMode === 'side-by-side' ? (
              <div className="h-full flex flex-row divide-x divide-[#1e202c]">
                <div 
                  className={`flex-1 h-full min-w-0 flex flex-col transition-all ${
                    focusedPane === 'primary' ? 'ring-1 ring-inset ring-rose-500/40' : 'opacity-90'
                  }`}
                >
                  <TerminalPaneView
                    session={primarySession}
                    isFocused={focusedPane === 'primary'}
                    onFocus={() => setFocusedPane('primary')}
                    paneLabel="Pane 1"
                    splitMode="side-by-side"
                    onCloseSplit={() => handleSetTerminalSplit('none')}
                    sessions={sessions}
                    onSelectSession={(id) => setPrimarySessionId(id)}
                    onNewSession={() => addNewTerminalSession('bash')}
                    onCloseSession={closeTerminalSession}
                    onExecuteCommand={executeCommand}
                    onClearSession={clearSessionBuffer}
                    commandHistory={commandHistory}
                    userSettings={userSettings}
                    currentTheme={currentTheme}
                    externalInsertCommand={focusedPane === 'primary' ? externalInsertCommand : null}
                    bookmarks={bookmarks}
                    onJumpToBookmark={handleJumpToBookmark}
                    onBookmarkCwd={handleBookmarkCwd}
                  />
                </div>
                <div 
                  className={`flex-1 h-full min-w-0 flex flex-col transition-all ${
                    focusedPane === 'secondary' ? 'ring-1 ring-inset ring-rose-500/40' : 'opacity-90'
                  }`}
                >
                  <TerminalPaneView
                    session={secondarySession}
                    isFocused={focusedPane === 'secondary'}
                    onFocus={() => setFocusedPane('secondary')}
                    paneLabel="Pane 2"
                    splitMode="side-by-side"
                    onCloseSplit={() => handleSetTerminalSplit('none')}
                    sessions={sessions}
                    onSelectSession={(id) => setSecondarySessionId(id)}
                    onNewSession={() => addNewTerminalSession('node')}
                    onCloseSession={closeTerminalSession}
                    onExecuteCommand={executeCommand}
                    onClearSession={clearSessionBuffer}
                    commandHistory={commandHistory}
                    userSettings={userSettings}
                    currentTheme={currentTheme}
                    externalInsertCommand={focusedPane === 'secondary' ? externalInsertCommand : null}
                    bookmarks={bookmarks}
                    onJumpToBookmark={handleJumpToBookmark}
                    onBookmarkCwd={handleBookmarkCwd}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col divide-y divide-[#1e202c]">
                <div 
                  className={`flex-1 h-full min-h-0 flex flex-col transition-all ${
                    focusedPane === 'primary' ? 'ring-1 ring-inset ring-rose-500/40' : 'opacity-90'
                  }`}
                >
                  <TerminalPaneView
                    session={primarySession}
                    isFocused={focusedPane === 'primary'}
                    onFocus={() => setFocusedPane('primary')}
                    paneLabel="Pane 1"
                    splitMode="stacked"
                    onCloseSplit={() => handleSetTerminalSplit('none')}
                    sessions={sessions}
                    onSelectSession={(id) => setPrimarySessionId(id)}
                    onNewSession={() => addNewTerminalSession('bash')}
                    onCloseSession={closeTerminalSession}
                    onExecuteCommand={executeCommand}
                    onClearSession={clearSessionBuffer}
                    commandHistory={commandHistory}
                    userSettings={userSettings}
                    currentTheme={currentTheme}
                    externalInsertCommand={focusedPane === 'primary' ? externalInsertCommand : null}
                    bookmarks={bookmarks}
                    onJumpToBookmark={handleJumpToBookmark}
                    onBookmarkCwd={handleBookmarkCwd}
                  />
                </div>
                <div 
                  className={`flex-1 h-full min-h-0 flex flex-col transition-all ${
                    focusedPane === 'secondary' ? 'ring-1 ring-inset ring-rose-500/40' : 'opacity-90'
                  }`}
                >
                  <TerminalPaneView
                    session={secondarySession}
                    isFocused={focusedPane === 'secondary'}
                    onFocus={() => setFocusedPane('secondary')}
                    paneLabel="Pane 2"
                    splitMode="stacked"
                    onCloseSplit={() => handleSetTerminalSplit('none')}
                    sessions={sessions}
                    onSelectSession={(id) => setSecondarySessionId(id)}
                    onNewSession={() => addNewTerminalSession('node')}
                    onCloseSession={closeTerminalSession}
                    onExecuteCommand={executeCommand}
                    onClearSession={clearSessionBuffer}
                    commandHistory={commandHistory}
                    userSettings={userSettings}
                    currentTheme={currentTheme}
                    externalInsertCommand={focusedPane === 'secondary' ? externalInsertCommand : null}
                    bookmarks={bookmarks}
                    onJumpToBookmark={handleJumpToBookmark}
                    onBookmarkCwd={handleBookmarkCwd}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROBLEMS & DIAGNOSTICS */}
        {activeTab === 'problems' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#1c1e2a] text-[11px] text-slate-400 font-mono">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-rose-300">Workspace Diagnostics</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#161826] text-rose-300 border border-rose-900/60 font-mono">
                  {diagnostics.filter((d) => d.severity === 'error').length} Errors
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#161826] text-amber-300 border border-amber-900/60 font-mono">
                  {diagnostics.filter((d) => d.severity === 'warning').length} Warnings
                </span>
              </div>

              {onConfigureEslint && (
                <button
                  id="btn-configure-eslint-problems"
                  onClick={onConfigureEslint}
                  title="Configure custom ESLint rules & ignore patterns"
                  className="px-2.5 py-1 rounded bg-[#171926] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-[#2b2d42] hover:border-rose-800 text-[10px] font-mono flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.check} className="text-rose-400 text-[10px]" />
                  <span>Configure ESLint & Ignores</span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              {diagnostics.length > 0 ? (
              diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => onSelectDiagnostic(diag)}
                  className="px-2 py-1.5 rounded hover:bg-[#181a26] cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-rose-950"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FontAwesomeIcon
                      icon={diag.severity === 'error' ? ICONS.error : ICONS.warning}
                      className={diag.severity === 'error' ? 'text-rose-500' : 'text-amber-400'}
                    />
                    <span className="text-slate-200">{diag.message}</span>
                    <span className="text-[10px] text-slate-400">[{diag.source}]</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {diag.filePath} ({diag.line}:{diag.col})
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-400 py-6 text-center">
                <FontAwesomeIcon icon={ICONS.circleCheck} className="text-emerald-500 text-lg mb-1" />
                <p>No problems or syntax warnings detected in the workspace.</p>
              </div>
            )}
            </div>
          </div>
        )}

        {/* TAB 3: OUTPUT */}
        {activeTab === 'output' && (
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1c1e2a] text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-rose-300">Code Runner Output</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#161826] text-slate-400 border border-[#222436]">
                  {outputLogs && outputLogs.length > 0 ? `${outputLogs.length} events` : 'Ready'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {onRunCode && (
                  <button
                    onClick={onRunCode}
                    disabled={isRunningCode}
                    title="Run Active File (Ctrl+Enter)"
                    className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-[10px] flex items-center space-x-1 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={isRunningCode ? ICONS.syncSpin : ICONS.play} className={isRunningCode ? 'animate-spin' : ''} />
                    <span>{isRunningCode ? 'Running...' : 'Run Active File'}</span>
                  </button>
                )}
                {onClearOutput && outputLogs && outputLogs.length > 0 && (
                  <button
                    onClick={onClearOutput}
                    title="Clear Output"
                    className="p-1 hover:text-rose-300 hover:bg-[#1a1b28] rounded text-slate-400 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.trash} className="text-[10px]" />
                  </button>
                )}
              </div>
            </div>

            {outputLogs && outputLogs.length > 0 ? (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {outputLogs.map((log) => {
                  let badgeColor = 'text-slate-300';
                  let icon = ICONS.terminal;
                  if (log.type === 'error') {
                    badgeColor = 'text-rose-400 font-semibold';
                    icon = ICONS.error;
                  } else if (log.type === 'warn') {
                    badgeColor = 'text-amber-300';
                    icon = ICONS.warning;
                  } else if (log.type === 'success') {
                    badgeColor = 'text-emerald-400 font-semibold';
                    icon = ICONS.check;
                  } else if (log.type === 'system') {
                    badgeColor = 'text-rose-300/80 italic';
                    icon = ICONS.sparkles;
                  } else if (log.type === 'info') {
                    badgeColor = 'text-sky-300';
                    icon = ICONS.infoCircle;
                  }

                  return (
                    <div key={log.id} className="flex items-start space-x-2 py-0.5 leading-relaxed">
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono select-none">
                        {log.timestamp}
                      </span>
                      <FontAwesomeIcon icon={icon} className={`text-[10px] mt-1 shrink-0 ${badgeColor}`} />
                      <pre className={`flex-1 whitespace-pre-wrap font-mono text-[11px] ${badgeColor}`}>
                        {log.message}
                      </pre>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs italic space-y-2">
                <FontAwesomeIcon icon={ICONS.play} className="text-xl text-rose-500/50 mb-1" />
                <p>No active process output.</p>
                <p className="text-[11px] text-slate-400">
                  Press <kbd className="px-1 py-0.5 bg-[#181926] rounded text-rose-400 border border-[#23253a]">Ctrl+Enter</kbd> or click &quot;Run Code&quot; in the editor toolbar to execute your code.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TESTING */}
        {activeTab === 'testing' && (
          <TestingPanel
            files={files}
            onOpenFile={onOpenFile}
            onCreateFile={onCreateFile}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};
