'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

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
  const closeMenu = () => setOpen(false);

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
                  : 'text-slate-550 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

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
