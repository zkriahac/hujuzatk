import { useEffect, useState } from 'react';

// Shared PWA install state. `beforeinstallprompt` fires once on page load and the
// event is consumed when called — so we have to capture it at module load and stash
// it where multiple components (the bottom banner + the Settings card) can subscribe.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  // Chrome fires this after a successful install. We clear the prompt so
  // the UI hides the install button.
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// iOS Safari never fires `beforeinstallprompt`. We detect it so the UI can show
// the Share→Add to Home Screen instructions instead of an Install button that
// would do nothing. iOS Chrome/Firefox can't install PWAs at all → false.
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isIpadOs = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
  if (!isIos && !isIpadOs) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  return true;
}

export interface PwaInstallState {
  /** Already installed and running in standalone mode — hide all install UI. */
  standalone: boolean;
  /** iOS Safari — install is manual via Share → Add to Home Screen. */
  ios: boolean;
  /** Chrome/Edge/etc has surfaced an install prompt we can fire. */
  canPrompt: boolean;
  /** Trigger the native install prompt. Resolves true if the user accepted. */
  install: () => Promise<boolean>;
}

export function usePwaInstall(): PwaInstallState {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return {
    standalone: isStandalone(),
    ios: isIosSafari(),
    canPrompt: !!deferredPrompt,
    install: async () => {
      if (!deferredPrompt) return false;
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          deferredPrompt = null;
          notify();
          return true;
        }
      } catch {
        // Some browsers throw if prompt() is called more than once. Swallow.
      }
      return false;
    },
  };
}
