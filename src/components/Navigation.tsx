'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sun, Moon } from 'lucide-react';

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/chart', label: 'Terminal' },
] as const;

export const Navigation = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  const closeMenu = () => setOpen(false);

  // Initialize theme from storage/system on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme = savedTheme || (isSystemDark ? 'dark' : 'light');
      setTheme(currentTheme);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize when the theme changes externally
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<'dark' | 'light'>;
      setTheme(customEvent.detail);
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <nav className="sticky top-0 z-50 flex justify-center px-4 pt-4 pb-2 safe-top">
      <div className="w-full max-w-4xl flex items-center justify-between gap-4 px-4 sm:px-6 py-3 rounded-2xl sm:rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <Link
          href="/"
          className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent shrink-0"
        >
          Vision Wealth
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              className={`text-xs font-semibold transition-colors ${
                pathname === href || pathname.startsWith(`${href}/`)
                  ? 'text-blue-600 dark:text-blue-400 font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Global Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white rounded-xl transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-[0.98]"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-yellow-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-[4.5rem] left-4 right-4 z-50 md:hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={`block px-5 py-4 text-sm font-bold border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                  pathname === href || pathname.startsWith(`${href}/`)
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-500/5 font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
};
