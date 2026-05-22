'use client';
import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed within 7 days
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Don't show if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[200] bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-slide-up">
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-lg">
        📈
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">Install Vision Wealth</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          Add to home screen for instant access and offline support.
        </p>
        <button
          onClick={handleInstall}
          className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Install App
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
