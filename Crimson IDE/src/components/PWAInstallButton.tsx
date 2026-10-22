/**
 * PWA Install Button & Guided Modal Component
 * Displays in TitleBar / Settings with seamless native app installation.
 * Automatically disappears completely once installed or dismissed.
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'menu-item';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isStandalone, isDismissed, isIOS, install, markAsInstalled, dismiss } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed, running in standalone mode, or dismissed, disappear completely
  if (isInstalled || isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success) {
          return;
        }
      } finally {
        setIsInstalling(false);
      }
    }
    // If not directly installable via beforeinstallprompt, show the guided instructions
    setShowGuideModal(true);
  };

  const handleConfirmInstalled = () => {
    setShowGuideModal(false);
    markAsInstalled();
  };

  const handleDismissForever = () => {
    setShowGuideModal(false);
    dismiss();
  };

  const renderButtonContent = () => {
    if (variant === 'menu-item') {
      return (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          id="btn-pwa-install-menu"
          className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2 text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-xs font-mono ${className}`}
          title="Install CsCode Crimson IDE as a standalone desktop/mobile app"
        >
          <FontAwesomeIcon icon={ICONS.laptop} className="text-rose-400 text-xs" />
          <span>{isInstalling ? 'Installing...' : 'Install CsCode App'}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 ml-auto font-mono">
            PWA
          </span>
        </button>
      );
    }

    if (variant === 'full') {
      return (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          id="btn-pwa-install-full"
          className={`py-2 px-3 rounded-md bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-medium flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer ${className}`}
          title="Install CsCode Crimson IDE as a standalone desktop/mobile app"
        >
          <FontAwesomeIcon icon={ICONS.laptop} className="text-xs" />
          <span>{isInstalling ? 'Installing...' : 'Install Standalone App'}</span>
        </button>
      );
    }

    // Default compact titlebar button - clean, refined, harmonious with IDE theme
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        id="btn-pwa-install-titlebar"
        className={`h-6 px-2 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-rose-500/40 text-slate-300 hover:text-rose-200 flex items-center space-x-1.5 transition-colors cursor-pointer text-[11px] font-sans shrink-0 ${className}`}
        title="Install CsCode as standalone desktop/mobile application"
      >
        <FontAwesomeIcon icon={ICONS.laptop} className="text-[10px] text-rose-400" />
        <span className="hidden md:inline font-medium">Install App</span>
      </button>
    );
  };

  return (
    <>
      {renderButtonContent()}

      {/* Guided Install Instructions Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl border border-[#2a2c3d] bg-[#10111a] p-5 shadow-2xl text-xs font-sans text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2130]">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                <FontAwesomeIcon icon={ICONS.laptop} />
                <span>Install CsCode IDE</span>
              </div>
              <button
                onClick={handleDismissForever}
                className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors cursor-pointer"
                title="Close"
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-medium text-slate-100">
                    To install on iPhone or iPad:
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-slate-300">
                    <li>
                      Tap the <strong className="text-rose-300 font-semibold">Share</strong> button in Safari toolbar.
                    </li>
                    <li>
                      Scroll down and tap <strong className="text-rose-300 font-semibold">Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong className="text-rose-300 font-semibold">Add</strong> in the top-right corner to launch CsCode as a standalone app.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-100">
                    To install CsCode on your desktop:
                  </p>
                  <p className="text-slate-300">
                    Click the install icon in your browser address bar (top-right), or open the browser menu and select <strong className="text-rose-300 font-semibold">Install CsCode</strong>.
                  </p>
                  <div className="p-2.5 rounded bg-[#171824] border border-[#26283b] text-[11px] text-slate-400 font-mono">
                    Standalone mode features: zero browser navigation bars, offline file persistence, and dedicated windowing.
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[#1f2130] flex items-center justify-between">
              <button
                onClick={handleDismissForever}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Don&apos;t show again
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleConfirmInstalled}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-medium cursor-pointer transition-colors shadow-xs"
                >
                  I&apos;ve Installed It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
