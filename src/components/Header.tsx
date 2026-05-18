import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => (
  <header className="relative flex flex-col items-center mb-8 text-center px-12 sm:px-16">
    <button 
      onClick={toggleTheme}
      className="absolute right-0 top-0 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition-transform touch-manipulation"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
    </button>
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-4 border border-blue-500/20">
      <Zap className="w-3 h-3" /> Professional Wealth Engine
    </div>
    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-4">
      Vision Wealth
    </h1>
    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
      The ultimate roadmap for high-conviction Indian equity investors targeting multibagger compounding.
    </p>
  </header>
);

export const QuickStart = () => {
  const items = [
    { title: "1. Set Your Inputs", desc: "Enter your SIP, Step-up %, and growth (CAGR).", icon: "🏛️", bg: "bg-blue-500/5", border: "border-blue-500/10", badge: "bg-blue-500" },
    { title: "2. Define a Goal", desc: "Use 'Target Goal' to reverse-calculate your SIP.", icon: "🎯", bg: "bg-cyan-500/5", border: "border-cyan-500/10", badge: "bg-cyan-500" },
    { title: "3. Check Reality", desc: "View 'Purchasing Power' to see the real value.", icon: "☀️", bg: "bg-orange-500/5", border: "border-orange-500/10", badge: "bg-orange-500" },
  ];

  return (
    <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl ${item.bg} border ${item.border}`}>
          <div className={`p-2 rounded-lg ${item.badge} text-white text-sm shrink-0`}>{item.icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold">{item.title}</p>
            <p className="text-xs text-slate-500">{item.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
};
