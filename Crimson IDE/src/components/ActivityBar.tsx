/**
 * Activity Bar Component
 * Ultra-clean left navigation bar with FontAwesome icons (NO EMOJIS)
 * Sleek 44px rail with subtle indicators and clean active states
 * Real tools only: Explorer, Search, Git, Extensions, Themes, Layout, Settings
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { ActiveSidebarTab } from '../types';

interface ActivityBarProps {
  activeTab: ActiveSidebarTab | null;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  gitChangesCount: number;
  pluginsCount: number;
  onOpenSettings: () => void;
  onOpenThemeStore?: () => void;
  onToggleLayoutMode?: () => void;
  isEditLayoutMode?: boolean;
  position?: 'left' | 'right';
  onTogglePosition?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  gitChangesCount,
  pluginsCount,
  onOpenSettings,
  onOpenThemeStore,
  onToggleLayoutMode,
  isEditLayoutMode = false,
  position = 'left',
}) => {
  const primaryTabs: { id: ActiveSidebarTab; label: string; icon: any; badge?: number }[] = [
    { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: ICONS.folder },
    { id: 'search', label: 'Search (Ctrl+Shift+F)', icon: ICONS.search },
    { id: 'git', label: 'Source Control (Ctrl+Shift+G)', icon: ICONS.git, badge: gitChangesCount },
    { id: 'github', label: 'GitHub (Remote Repositories & Tree)', icon: ICONS.github },
    { id: 'plugins', label: 'Extensions (Ctrl+Shift+X)', icon: ICONS.plugins, badge: pluginsCount },
  ];

  const borderClass = position === 'right' ? 'border-l border-[#1a1b24]' : 'border-r border-[#1a1b24]';
  const indicatorClass = position === 'right' ? 'right-0 rounded-l-sm' : 'left-0 rounded-r-sm';

  return (
    <aside 
      id="crimson-activity-bar"
      className={`w-11 bg-[#090a0f] ${borderClass} flex flex-col justify-between items-center py-2 select-none z-20 shrink-0 ${
        isEditLayoutMode ? 'ring-1 ring-rose-500/80 ring-inset' : ''
      }`}
    >
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-col items-center w-full space-y-0.5">
        {primaryTabs.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`activity-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              className={`relative w-full h-10 flex items-center justify-center transition-colors cursor-pointer group ${
                isActive 
                  ? 'text-rose-400 bg-white/[0.04]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              {/* Refined Active Indicator Line */}
              {isActive && (
                <span className={`absolute top-2 bottom-2 w-[2px] bg-rose-500 ${indicatorClass}`} />
              )}

              <FontAwesomeIcon 
                icon={item.icon} 
                className={`text-[15px] transition-transform group-hover:scale-105 ${
                  isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} 
              />

              {/* Minimal Numerical Badge */}
              {Boolean(item.badge && item.badge > 0) && (
                <span className="absolute bottom-1 right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-semibold font-mono flex items-center justify-center tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions: Theme Store, Edit Layout Mode, Settings */}
      <div className="flex flex-col items-center w-full space-y-0.5 pb-1">
        {/* Theme Store Button */}
        {onOpenThemeStore && (
          <button
            id="activity-btn-theme-store"
            onClick={onOpenThemeStore}
            title="Theme Store & Palette Studio"
            className="relative w-full h-9 flex items-center justify-center transition-colors text-slate-400 hover:text-rose-400 hover:bg-white/[0.03] cursor-pointer group"
          >
            <FontAwesomeIcon icon={ICONS.palette} className="text-[14px] group-hover:scale-105 transition-transform" />
          </button>
        )}

        {/* Toggle Edit Layout Mode Button */}
        {onToggleLayoutMode && (
          <button
            id="activity-btn-layout-mode"
            onClick={onToggleLayoutMode}
            title={isEditLayoutMode ? "Exit Edit Layout Mode" : "Rearrange Panels (Edit Layout)"}
            className={`relative w-full h-9 flex items-center justify-center transition-colors rounded cursor-pointer ${
              isEditLayoutMode 
                ? 'text-white bg-rose-600 shadow-xs' 
                : 'text-slate-400 hover:text-rose-400 hover:bg-white/[0.03]'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.layout} className="text-[14px]" />
          </button>
        )}

        {/* Settings Button */}
        <button
          id="activity-btn-settings"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          className={`relative w-full h-10 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] cursor-pointer ${
            activeTab === 'settings' ? 'text-rose-400 bg-white/[0.04]' : ''
          }`}
        >
          {activeTab === 'settings' && (
            <span className={`absolute top-2 bottom-2 w-[2px] bg-rose-500 ${indicatorClass}`} />
          )}
          <FontAwesomeIcon icon={ICONS.settings} className="text-[15px] group-hover:scale-105 transition-transform" />
        </button>
      </div>
    </aside>
  );
};
