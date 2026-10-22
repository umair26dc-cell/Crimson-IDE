/**
 * Title Bar Component
 * Clean modern top navigation bar adhering to the Top Bar Contract:
 * [Brand Wordmark & Menu Links] — [Fuzzy Command Search Bar] — [Action Controls]
 * CsCode Crimson Code branding
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { CsCodeLogo } from './CsCodeLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleBarProps {
  projectName: string;
  activeFileName?: string;
  isSplit: boolean;
  onToggleSplit: () => void;
  onOpenQuickOpen: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onOpenGitHub?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  projectName,
  activeFileName,
  isSplit,
  onToggleSplit,
  onOpenQuickOpen,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenGitHub,
}) => {
  return (
    <header 
      id="crimson-titlebar"
      className="h-10 bg-[#0a0b10] border-b border-[#1b1c26] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0 font-sans"
    >
      {/* Zone 1: Brand Wordmark & IDE Menus */}
      <div className="flex items-center space-x-3.5 min-w-0">
        {/* Brand Lockup */}
        <div className="flex items-center space-x-2 font-semibold tracking-tight group cursor-default shrink-0">
          <CsCodeLogo size={18} withGlow className="transition-transform group-hover:scale-105 duration-200" />
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-100 font-semibold text-[13px] tracking-tight">CsCode</span>
            <span className="text-rose-400/80 font-normal text-[11px] hidden lg:inline">Crimson</span>
          </div>
        </div>

        {/* Clean Nav Links */}
        <nav className="hidden md:flex items-center space-x-0.5 text-slate-400 text-xs">
          <button 
            id="menu-file" 
            onClick={onOpenQuickOpen} 
            className="px-2 py-1 rounded-md hover:bg-white/[0.06] hover:text-slate-100 transition-colors cursor-pointer"
          >
            File
          </button>
          <button 
            id="menu-edit" 
            onClick={onOpenCommandPalette} 
            className="px-2 py-1 rounded-md hover:bg-white/[0.06] hover:text-slate-100 transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button 
            id="menu-view" 
            onClick={onToggleSplit} 
            className="px-2 py-1 rounded-md hover:bg-white/[0.06] hover:text-slate-100 transition-colors cursor-pointer"
          >
            View
          </button>
          <button 
            id="menu-terminal" 
            onClick={onOpenCommandPalette} 
            className="px-2 py-1 rounded-md hover:bg-white/[0.06] hover:text-slate-100 transition-colors cursor-pointer"
          >
            Terminal
          </button>
          <button 
            id="menu-settings" 
            onClick={onOpenSettings} 
            className="px-2 py-1 rounded-md hover:bg-white/[0.06] hover:text-slate-100 transition-colors cursor-pointer"
          >
            Preferences
          </button>
        </nav>
      </div>

      {/* Zone 2: Centered Command / Quick-Open Pill Search */}
      <div className="flex-1 max-w-md mx-4 min-w-0">
        <button
          id="btn-global-quick-search"
          onClick={onOpenQuickOpen}
          className="w-full h-7 px-3 rounded-md bg-[#11131c] border border-[#212332] hover:border-rose-500/50 flex items-center justify-between text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer shadow-xs"
        >
          <div className="flex items-center space-x-2 truncate text-[11px]">
            <FontAwesomeIcon icon={ICONS.search} className="text-[10px] text-slate-500 group-hover:text-rose-400 transition-colors shrink-0" />
            <span className="truncate">
              {activeFileName ? `${activeFileName} — ${projectName}` : 'Search files or commands...'}
            </span>
          </div>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-[#0b0c11] border border-[#222434] text-[10px] font-mono text-slate-400 shadow-2xs">
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* Zone 3: Primary Actions (GitHub, PWA, Split, Settings) */}
      <div className="flex items-center space-x-1 text-slate-400 shrink-0">
        {/* PWA Install Action Button (Disappears completely once installed) */}
        <PWAInstallButton variant="compact" />

        {/* GitHub Remote Integration */}
        {onOpenGitHub && (
          <button
            id="btn-title-github"
            onClick={onOpenGitHub}
            title="GitHub Remote Sync (Push / Pull branches)"
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] hover:text-slate-200 text-slate-400 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.github} className="text-xs" />
          </button>
        )}

        {/* Split View Toggle */}
        <button
          id="btn-title-split"
          onClick={onToggleSplit}
          title={isSplit ? 'Single Editor View' : 'Split Editor View'}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
            isSplit ? 'text-rose-400 bg-rose-950/50 border border-rose-800/60' : 'hover:bg-white/[0.06] text-slate-400 hover:text-slate-200'
          }`}
        >
          <FontAwesomeIcon icon={ICONS.splitVertical} className="text-xs" />
        </button>

        {/* Settings Button */}
        <button
          id="btn-title-settings"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] hover:text-slate-200 text-slate-400 transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={ICONS.settings} className="text-xs" />
        </button>
      </div>
    </header>
  );
};
