/**
 * Offline Connectivity Status Indicator & Banner
 * Alerts developers when working offline while reassuring them that
 * local workspace files, syntax highlighting, and Git history remain 100% active.
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // If online or user temporarily dismissed, don't show the banner
  if (isOnline || isDismissed) {
    return null;
  }

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-9 right-4 z-50 max-w-sm rounded-lg border border-amber-800/80 bg-[#121016]/95 backdrop-blur-md p-2.5 shadow-2xl text-xs font-mono text-slate-200 select-none animate-fadeIn"
      style={{
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(245, 158, 11, 0.2)',
      }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start space-x-2">
          <div className="w-5 h-5 rounded-full bg-amber-950/80 border border-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 font-semibold text-amber-300">
              <span>Offline Mode Active</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-900/60 border border-amber-800/60 text-amber-200">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug">
              Network disconnected. Your editor, workspace files, syntax engine, and local Git history are cached and fully operational offline.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
          title="Dismiss notice"
        >
          <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
        </button>
      </div>
    </div>
  );
};
