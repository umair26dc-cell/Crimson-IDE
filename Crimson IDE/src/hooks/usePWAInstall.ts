/**
 * PWA Installation Hook
 * Manages beforeinstallprompt event, standalone detection, iOS Safari instructions,
 * persistent installation state across reloads/iframes, and programmatic application installation.
 */

import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isSaved = localStorage.getItem('cscode_pwa_installed') === 'true';
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    if (isStandaloneMode && !isSaved) {
      try {
        localStorage.setItem('cscode_pwa_installed', 'true');
      } catch {
        // ignore storage errors
      }
    }
    return isSaved || isStandaloneMode;
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('cscode_pwa_install_dismissed') === 'true';
  });

  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      if (isStandaloneMode) {
        setIsInstalled(true);
        setIsStandalone(true);
        try {
          localStorage.setItem('cscode_pwa_installed', 'true');
        } catch {
          // ignore
        }
      }
    };

    checkStandalone();

    // Detect iOS devices (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // If already installed or dismissed, ignore
      if (localStorage.getItem('cscode_pwa_installed') === 'true') {
        return;
      }
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('cscode_pwa_installed', 'true');
      } catch {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('cscode_pwa_installed_change', { detail: { installed: true } }));
    };

    const handleStorageChange = () => {
      const installed = localStorage.getItem('cscode_pwa_installed') === 'true';
      const dismissed = localStorage.getItem('cscode_pwa_install_dismissed') === 'true';
      setIsInstalled(installed);
      setIsDismissed(dismissed);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cscode_pwa_installed_change', handleStorageChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cscode_pwa_installed_change', handleStorageChange);
    };
  }, []);

  const markAsInstalled = useCallback(() => {
    setIsInstalled(true);
    setDeferredPrompt(null);
    try {
      localStorage.setItem('cscode_pwa_installed', 'true');
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('cscode_pwa_installed_change', { detail: { installed: true } }));
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setDeferredPrompt(null);
    try {
      localStorage.setItem('cscode_pwa_install_dismissed', 'true');
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('cscode_pwa_installed_change', { detail: { dismissed: true } }));
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      markAsInstalled();
      return true;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        markAsInstalled();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      markAsInstalled();
      return false;
    }
  }, [deferredPrompt, markAsInstalled]);

  return {
    isInstallable: !!deferredPrompt && !isInstalled && !isDismissed,
    isInstalled: isInstalled || isStandalone,
    isStandalone,
    isDismissed,
    isIOS,
    install,
    markAsInstalled,
    dismiss,
    deferredPrompt,
  };
}
