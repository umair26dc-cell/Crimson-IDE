/**
 * Edit Layout Mode Overlay & Interactive Control Bar
 * Allows users to move and rearrange any IDE panel in real-time:
 * Activity Bar, Sidebar, Bottom Panel docking (bottom/right/left),
 * Status Bar (top/bottom), and Minimap position.
 * Zero emojis - 100% FontAwesome iconography.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { IdeLayoutConfig } from '../types';

interface EditLayoutOverlayProps {
  layoutConfig: IdeLayoutConfig;
  onUpdateLayout: (newConfig: Partial<IdeLayoutConfig>) => void;
  onCloseLayoutMode: () => void;
  onResetLayout: () => void;
  onSwapSplitPanes: () => void;
}

export const EditLayoutOverlay: React.FC<EditLayoutOverlayProps> = ({
  layoutConfig,
  onUpdateLayout,
  onCloseLayoutMode,
  onResetLayout,
  onSwapSplitPanes,
}) => {
  if (!layoutConfig.isEditLayoutMode) return null;

  return (
    <div
      id="edit-layout-banner"
      className="bg-[#141624] border-b border-rose-500/80 px-4 py-2 text-xs font-mono text-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xl z-40 select-none animate-fadeIn"
    >
      {/* Title & Mode Status */}
      <div className="flex items-center space-x-2.5">
        <div className="w-6 h-6 rounded bg-rose-600 flex items-center justify-center text-white shadow-sm animate-pulse">
          <FontAwesomeIcon icon={ICONS.layout} className="text-xs" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-rose-300 uppercase tracking-wider text-[11px]">
              Edit Layout Mode Active
            </span>
            <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
              Customizable Workspace
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans">
            Click dock controls below or use panel badges to move panels to any side of the screen.
          </p>
        </div>
      </div>

      {/* Dock Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Activity Bar Position */}
        <div className="flex items-center space-x-1 bg-[#0d0e15] px-2 py-1 rounded border border-[#222538]">
          <span className="text-[10px] text-slate-400 mr-1">Activity Bar:</span>
          <button
            onClick={() => onUpdateLayout({ activityBarPosition: 'left' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.activityBarPosition === 'left'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Left
          </button>
          <button
            onClick={() => onUpdateLayout({ activityBarPosition: 'right' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.activityBarPosition === 'right'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Right
          </button>
        </div>

        {/* Primary Sidebar Position */}
        <div className="flex items-center space-x-1 bg-[#0d0e15] px-2 py-1 rounded border border-[#222538]">
          <span className="text-[10px] text-slate-400 mr-1">Sidebar:</span>
          <button
            onClick={() => onUpdateLayout({ sidebarPosition: 'left' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.sidebarPosition === 'left'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Left
          </button>
          <button
            onClick={() => onUpdateLayout({ sidebarPosition: 'right' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.sidebarPosition === 'right'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Right
          </button>
        </div>

        {/* Terminal / Bottom Panel Dock Position */}
        <div className="flex items-center space-x-1 bg-[#0d0e15] px-2 py-1 rounded border border-[#222538]">
          <span className="text-[10px] text-slate-400 mr-1">Terminal Dock:</span>
          <button
            onClick={() => onUpdateLayout({ bottomPanelPosition: 'bottom' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.bottomPanelPosition === 'bottom'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bottom
          </button>
          <button
            onClick={() => onUpdateLayout({ bottomPanelPosition: 'right' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.bottomPanelPosition === 'right'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Right
          </button>
          <button
            onClick={() => onUpdateLayout({ bottomPanelPosition: 'left' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.bottomPanelPosition === 'left'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Left
          </button>
        </div>

        {/* Minimap Position */}
        <div className="flex items-center space-x-1 bg-[#0d0e15] px-2 py-1 rounded border border-[#222538]">
          <span className="text-[10px] text-slate-400 mr-1">Minimap:</span>
          <button
            onClick={() => onUpdateLayout({ minimapPosition: 'left' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.minimapPosition === 'left'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Left
          </button>
          <button
            onClick={() => onUpdateLayout({ minimapPosition: 'right' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.minimapPosition === 'right'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Right
          </button>
        </div>

        {/* Status Bar Position */}
        <div className="flex items-center space-x-1 bg-[#0d0e15] px-2 py-1 rounded border border-[#222538]">
          <span className="text-[10px] text-slate-400 mr-1">Status Bar:</span>
          <button
            onClick={() => onUpdateLayout({ statusBarPosition: 'bottom' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.statusBarPosition === 'bottom'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bottom
          </button>
          <button
            onClick={() => onUpdateLayout({ statusBarPosition: 'top' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              layoutConfig.statusBarPosition === 'top'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Top
          </button>
        </div>

        {/* Swap Split Panes */}
        <button
          onClick={onSwapSplitPanes}
          title="Swap Left and Right editor panes"
          className="px-2.5 py-1 bg-[#1a1c2a] hover:bg-[#25283c] border border-[#2c3047] text-slate-300 hover:text-white rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={ICONS.swap} className="text-rose-400 text-xs" />
          <span>Swap Panes</span>
        </button>

        {/* Reset Layout */}
        <button
          onClick={onResetLayout}
          title="Reset to default IDE layout"
          className="px-2.5 py-1 bg-[#1a1c2a] hover:bg-[#25283c] border border-[#2c3047] text-slate-400 hover:text-rose-300 rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={ICONS.reset} className="text-xs" />
          <span>Reset</span>
        </button>

        {/* Exit Layout Mode Button */}
        <button
          onClick={onCloseLayoutMode}
          className="px-3.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-semibold flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer ml-1"
        >
          <FontAwesomeIcon icon={ICONS.circleCheck} />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
