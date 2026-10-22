/**
 * Status Bar Component
 * CsCode Crimson Code bottom status bar with FontAwesome icons (NO EMOJIS)
 * Clean, modern dark surface with precise tabular figures and real diagnostics
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { LanguageId, UserSettings } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface StatusBarProps {
  currentLanguage: LanguageId | string;
  cursorLine: number;
  cursorCol: number;
  tabSize: number;
  isVimEnabled: boolean;
  vimMode?: 'NORMAL' | 'INSERT' | 'VISUAL';
  errorCount: number;
  warningCount: number;
  gitBranch: string;
  branches?: string[];
  onSwitchBranch?: (branch: string) => void;
  onCreateBranch?: (newBranch: string) => void;
  onDeleteBranch?: (branch: string) => void;
  isBranchSwitcherOpen?: boolean;
  onToggleBranchSwitcher?: () => void;
  onCloseBranchSwitcher?: () => void;
  onToggleTerminal: () => void;
  onToggleSettings: () => void;
  currentThemeName?: string;
  onOpenThemeStore?: () => void;
  isEditLayoutMode?: boolean;
  onToggleLayoutMode?: () => void;
  statusBarPosition?: 'bottom' | 'top';
  onOpenStats?: () => void;
  onRunCode?: () => void;
  isRunningCode?: boolean;
  onConfigureEslint?: () => void;
  onOpenGitHub?: () => void;
  isGitHubAuthenticated?: boolean;
  connectedGitHubRepo?: string;
  userSettings?: UserSettings;
  activeFileContent?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentLanguage,
  cursorLine,
  cursorCol,
  tabSize,
  isVimEnabled,
  vimMode = 'NORMAL',
  errorCount,
  warningCount,
  gitBranch,
  branches = ['main'],
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
  isBranchSwitcherOpen,
  onToggleBranchSwitcher,
  onCloseBranchSwitcher,
  onToggleTerminal,
  onToggleSettings,
  currentThemeName,
  onOpenThemeStore,
  isEditLayoutMode = false,
  onToggleLayoutMode,
  statusBarPosition = 'bottom',
  onOpenStats,
  onRunCode,
  isRunningCode = false,
  onConfigureEslint,
  onOpenGitHub,
  isGitHubAuthenticated = false,
  connectedGitHubRepo = '',
  userSettings,
  activeFileContent = '',
}) => {
  const isOnline = useOnlineStatus();

  // Clock
  const [timeString, setTimeString] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeString(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Live Word & Char statistics
  const wordStats = useMemo(() => {
    if (!activeFileContent) return { words: 0, chars: 0 };
    const trimmed = activeFileContent.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { words, chars: activeFileContent.length };
  }, [activeFileContent]);

  // Branch switcher state (supports both internal and external control)
  const [internalSwitcherOpen, setInternalSwitcherOpen] = useState(false);
  const isSwitcherOpen = isBranchSwitcherOpen !== undefined ? isBranchSwitcherOpen : internalSwitcherOpen;

  const toggleSwitcher = () => {
    if (onToggleBranchSwitcher) {
      onToggleBranchSwitcher();
    } else {
      setInternalSwitcherOpen((prev) => !prev);
    }
  };

  const closeSwitcher = () => {
    if (onCloseBranchSwitcher) {
      onCloseBranchSwitcher();
    } else {
      setInternalSwitcherOpen(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allBranches = useMemo(() => {
    const list = branches && branches.length > 0 ? branches : ['main'];
    if (!list.includes(gitBranch)) {
      return [gitBranch, ...list];
    }
    return list;
  }, [branches, gitBranch]);

  const cleanBranchName = (val: string): string => {
    return val.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\.\/]/g, '');
  };

  const trimmedQuery = searchQuery.trim();
  const cleanedQuery = cleanBranchName(trimmedQuery);

  const filteredBranches = useMemo(() => {
    if (!trimmedQuery) return allBranches;
    const q = trimmedQuery.toLowerCase();
    return allBranches.filter((b) => b.toLowerCase().includes(q));
  }, [allBranches, trimmedQuery]);

  const isNewBranchCandidate = Boolean(
    cleanedQuery &&
    !allBranches.some((b) => b.toLowerCase() === cleanedQuery.toLowerCase())
  );

  useEffect(() => {
    if (isSwitcherOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSwitcherOpen]);

  const handleCreate = (name: string) => {
    const clean = cleanBranchName(name);
    if (!clean) return;
    onCreateBranch?.(clean);
    setSearchQuery('');
    closeSwitcher();
  };

  const handleSelectBranch = (branch: string) => {
    if (branch !== gitBranch) {
      onSwitchBranch?.(branch);
    }
    closeSwitcher();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSwitcher();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isNewBranchCandidate && filteredBranches.length === 0) {
        handleCreate(searchQuery);
      } else if (filteredBranches.length > 0) {
        const target = filteredBranches[Math.min(selectedIndex, filteredBranches.length - 1)];
        handleSelectBranch(target);
      } else if (isNewBranchCandidate) {
        handleCreate(searchQuery);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredBranches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const statusBarStyle = userSettings?.statusBarStyle || 'default';
  const showBranch = userSettings?.statusBarShowBranch !== false;
  const showDiagnostics = userSettings?.statusBarShowDiagnostics !== false;
  const showLineCol = userSettings?.statusBarShowLineCol !== false;
  const showIndent = userSettings?.statusBarShowIndent !== false;
  const showEncoding = userSettings?.statusBarShowEncoding !== false;
  const showLanguage = userSettings?.statusBarShowLanguage !== false;
  const showWordCount = !!userSettings?.statusBarShowWordCount;
  const showClock = userSettings?.statusBarShowClock !== false;

  const bgStyleClass =
    statusBarStyle === 'translucent'
      ? 'backdrop-blur-md bg-[#0a0b10]/75 border-slate-700/40 text-slate-300'
      : statusBarStyle === 'accent'
      ? 'bg-rose-950/90 text-rose-200 border-rose-800'
      : statusBarStyle === 'minimal'
      ? 'bg-transparent border-transparent text-slate-400'
      : 'bg-[#0a0b10] text-slate-400 border-[#1a1b24]';

  return (
    <footer 
      id="crimson-status-bar"
      className={`h-6 flex items-center justify-between px-3 text-[11px] font-mono select-none z-30 shrink-0 transition-colors ${bgStyleClass} ${
        statusBarPosition === 'top' ? 'border-b' : 'border-t'
      } ${
        isEditLayoutMode ? 'ring-1 ring-rose-500/80 ring-inset' : ''
      }`}
    >
      {/* Left Section: Brand, Git Branch, Diagnostics */}
      <div className="flex items-center space-x-3 tabular-nums">
        {/* Brand / Ready Indicator */}
        <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span className="font-semibold text-rose-400">CsCode</span>
        </div>

        {/* Git Branch Switcher */}
        {showBranch && (
          <div className="relative">
          <button
            id="status-bar-git-branch-btn"
            onClick={toggleSwitcher}
            title={`Current Git Branch: ${gitBranch}. Click to switch or create branches.`}
            className={`flex items-center space-x-1.5 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              isSwitcherOpen
                ? 'bg-rose-950/90 text-rose-300 border border-rose-800 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.git} className="text-[10px] text-rose-400" />
            <span className="font-semibold text-slate-300">{gitBranch}</span>
            <FontAwesomeIcon icon={ICONS.chevronDown} className={`text-[8px] text-slate-500 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Branch Switcher Popover */}
          {isSwitcherOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[0.5px]" 
                onClick={closeSwitcher} 
              />

              <div
                id="status-bar-git-branch-popover"
                className={`absolute left-0 z-50 w-72 sm:w-80 bg-[#0f1017] border border-rose-900/80 shadow-2xl rounded-xl p-2.5 text-xs font-mono text-slate-200 select-none animate-fadeIn ${
                  statusBarPosition === 'top' ? 'top-full mt-2' : 'bottom-full mb-2'
                }`}
                style={{
                  boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(225, 29, 72, 0.25)',
                }}
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#202230]">
                  <div className="flex items-center space-x-1.5 text-rose-300 font-bold text-[11px]">
                    <FontAwesomeIcon icon={ICONS.git} className="text-rose-400 text-xs" />
                    <span>Switch Branch</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {allBranches.length} {allBranches.length === 1 ? 'branch' : 'branches'}
                    </span>
                    <button
                      onClick={closeSwitcher}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title="Close"
                    >
                      <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
                    </button>
                  </div>
                </div>

                {/* Filter / New Branch Input */}
                <div className="relative my-2">
                  <FontAwesomeIcon icon={ICONS.search} className="absolute left-2.5 top-2 text-[10px] text-slate-500" />
                  <input
                    ref={inputRef}
                    id="branch-switcher-search-input"
                    type="text"
                    placeholder="Search or enter new branch name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleInputKeyDown}
                    className="w-full bg-[#08090d] border border-[#26283a] focus:border-rose-500 rounded-lg pl-7 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
                    </button>
                  )}
                </div>

                {/* Action: Create New Branch item */}
                {isNewBranchCandidate ? (
                  <button
                    id="status-bar-create-new-branch-btn"
                    onClick={() => handleCreate(searchQuery)}
                    className="w-full text-left px-2.5 py-1.5 mb-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FontAwesomeIcon icon={ICONS.plus} className="text-[10px] text-rose-400" />
                      <span className="truncate">Create branch &ldquo;<strong className="text-white">{cleanedQuery}</strong>&rdquo;</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/90 text-rose-200 font-mono font-bold shrink-0 ml-1">
                      from {gitBranch}
                    </span>
                  </button>
                ) : !searchQuery.trim() && (
                  <div className="flex items-center justify-between px-1 py-1 mb-1 text-[11px] text-slate-400 border-b border-[#1c1d29]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Existing Branches
                    </span>
                    <button
                      onClick={() => {
                        inputRef.current?.focus();
                        setSearchQuery('feature/');
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.plus} className="text-[9px]" />
                      <span>New Branch</span>
                    </button>
                  </div>
                )}

                {/* Branches List */}
                <div className="max-h-52 overflow-y-auto space-y-0.5 py-0.5">
                  {filteredBranches.map((branch, idx) => {
                    const isCurrent = branch === gitBranch;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={branch}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-rose-950/80 text-rose-200 font-bold border border-rose-800/80 shadow-xs'
                            : isSelected
                            ? 'bg-[#1e202f] text-white cursor-pointer'
                            : 'hover:bg-[#181a26] text-slate-300 hover:text-white cursor-pointer'
                        }`}
                        onClick={() => handleSelectBranch(branch)}
                      >
                        <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
                          <FontAwesomeIcon
                            icon={isCurrent ? ICONS.check : ICONS.git}
                            className={`text-[10px] shrink-0 ${isCurrent ? 'text-rose-400' : 'text-slate-500'}`}
                          />
                          <span className="truncate">{branch}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 font-mono font-bold shrink-0">
                              CURRENT
                            </span>
                          )}
                        </div>

                        {/* Delete Branch Button */}
                        {!isCurrent && branch !== 'main' && onDeleteBranch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBranch(branch);
                            }}
                            title={`Delete branch "${branch}"`}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-opacity ml-1 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={ICONS.trash} className="text-[9px]" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {filteredBranches.length === 0 && !isNewBranchCandidate && (
                    <div className="text-center py-4 text-slate-500 text-[11px]">
                      No branches found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 mt-1 border-t border-[#1f212f] flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate">Current: <strong className="text-rose-300 font-semibold">{gitBranch}</strong></span>
                  <span>Enter to checkout</span>
                </div>
              </div>
            </>
          )}
        </div>
        )}

        {/* GitHub Remote Sync Button */}
        {onOpenGitHub && (
          <button
            id="status-bar-github-sync-btn"
            onClick={onOpenGitHub}
            title={
              isGitHubAuthenticated
                ? `Connected to GitHub (${connectedGitHubRepo || 'workspace'}) - Click to push/pull branches`
                : 'Connect workspace to GitHub via OAuth'
            }
            className="flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <FontAwesomeIcon
              icon={ICONS.github}
              className={`text-[10px] ${isGitHubAuthenticated ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span className="hidden sm:inline text-[11px] font-mono">
              {isGitHubAuthenticated ? (connectedGitHubRepo ? connectedGitHubRepo.split('/')[1] || connectedGitHubRepo : 'GitHub') : 'GitHub'}
            </span>
            {isGitHubAuthenticated && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            )}
          </button>
        )}

        {/* Offline Connectivity Indicator (only displayed when offline) */}
        {!isOnline && (
          <div
            id="status-bar-pwa-network"
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 select-none text-[11px] font-mono animate-pulse"
            title="Offline Mode — Local workspace files and Git history active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-medium">Offline</span>
          </div>
        )}

        {/* Diagnostics Counter / ESLint */}
        {showDiagnostics && (
          <div
            id="status-bar-diagnostics-btn"
            onClick={onConfigureEslint}
            title={`${errorCount} Errors, ${warningCount} Warnings - Click to configure ESLint & Ignore Patterns`}
            className="flex items-center space-x-2.5 px-1 py-0.5 rounded hover:bg-[#181926] cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-1 text-slate-400 hover:text-slate-200">
              <FontAwesomeIcon icon={ICONS.error} className={`text-[10px] ${errorCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
              <span className={errorCount > 0 ? 'text-rose-300 font-medium' : ''}>{errorCount}</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400 hover:text-slate-200">
              <FontAwesomeIcon icon={ICONS.warning} className={`text-[10px] ${warningCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className={warningCount > 0 ? 'text-amber-300 font-medium' : ''}>{warningCount}</span>
            </div>
          </div>
        )}

        {/* Current Theme */}
        {currentThemeName && onOpenThemeStore && (
          <button
            onClick={onOpenThemeStore}
            title="Theme: Click to open Theme Store & Studio"
            className="hidden sm:flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.palette} className="text-[9px] text-rose-400/80" />
            <span className="truncate max-w-[130px]">{currentThemeName}</span>
          </button>
        )}
      </div>

      {/* Center Section: Vim Mode or Layout Mode Notice */}
      <div className="flex items-center space-x-2">
        {isVimEnabled && (
          <div className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 font-bold tracking-widest text-[10px] border border-rose-800/60">
            -- {vimMode} --
          </div>
        )}
        {isEditLayoutMode && (
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider animate-pulse hidden md:inline">
            Layout Edit Active
          </span>
        )}
      </div>

      {/* Right Section: Actions & Metrics */}
      <div className="flex items-center space-x-3 tabular-nums">
        {/* Layout Toggle Button */}
        {onToggleLayoutMode && (
          <button
            onClick={onToggleLayoutMode}
            title={isEditLayoutMode ? 'Exit Layout Edit Mode' : 'Enter Interactive Layout Edit Mode'}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-colors text-[10px] cursor-pointer ${
              isEditLayoutMode
                ? 'bg-rose-600 text-white font-semibold'
                : 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.layout} className="text-[9px]" />
            <span className="hidden md:inline">{isEditLayoutMode ? 'Done' : 'Layout'}</span>
          </button>
        )}

        {/* Code Runner Action Button */}
        {onRunCode && (
          <button
            onClick={onRunCode}
            disabled={isRunningCode}
            title="Execute Active File (Ctrl+Enter)"
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FontAwesomeIcon icon={isRunningCode ? ICONS.syncSpin : ICONS.play} className={isRunningCode ? 'animate-spin text-[8px]' : 'text-[8px]'} />
            <span className="hidden sm:inline font-semibold">{isRunningCode ? 'Running' : 'Run'}</span>
          </button>
        )}

        {/* Code Stats & Metrics Button */}
        {onOpenStats && (
          <button
            onClick={onOpenStats}
            title="Inspect Workspace & Code Statistics"
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.chartBar} className="text-[9px]" />
            <span className="hidden md:inline">Stats</span>
          </button>
        )}

        {/* Cursor Position */}
        {showLineCol && (
          <span 
            title="Line and Column"
            className="text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            Ln {cursorLine}, Col {cursorCol}
          </span>
        )}

        {/* Tab Size */}
        {showIndent && (
          <span 
            title="Indentation"
            className="hidden sm:inline text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
          >
            Spaces: {tabSize}
          </span>
        )}

        {/* Word and Character Count */}
        {showWordCount && (
          <span 
            title={`Active document length: ${wordStats.words} words, ${wordStats.chars} characters`}
            className="hidden lg:inline text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
          >
            {wordStats.words}w, {wordStats.chars}c
          </span>
        )}

        {/* Encoding */}
        {showEncoding && (
          <span 
            title="File Encoding"
            className="hidden md:inline text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
          >
            UTF-8
          </span>
        )}

        {/* Active Language */}
        {showLanguage && (
          <span 
            title="Select Language Mode"
            className="capitalize text-slate-300 hover:text-rose-400 cursor-pointer font-medium transition-colors"
          >
            {currentLanguage}
          </span>
        )}

        {/* Local Clock */}
        {showClock && (
          <span 
            title="Local System Time"
            className="hidden xl:inline text-slate-500 font-mono text-[10px]"
          >
            {timeString}
          </span>
        )}

        {/* Terminal Toggle Button */}
        <button
          onClick={onToggleTerminal}
          title="Toggle Bottom Terminal & Console"
          className="text-slate-400 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={ICONS.terminal} className="text-[10px]" />
        </button>

        {/* Settings Toggle Button */}
        <button
          onClick={onToggleSettings}
          title="Open Settings"
          className="text-slate-400 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={ICONS.settings} className="text-[10px]" />
        </button>
      </div>
    </footer>
  );
};
