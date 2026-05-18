import React from 'react';
import { Info } from 'lucide-react';

export const KnowledgeBase = () => (
  <section className="mt-12 p-8 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-indigo-500 text-white"><Info className="w-5 h-5" /></div>
      <h2 className="text-2xl font-bold">Wealth Intelligence Hub</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-indigo-500">The Power of 25% CAGR</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          In the Indian stock market, 25% CAGR is considered the &quot;Holy Grail&quot; of alpha. It typically comes from high-conviction small and midcap portfolios. 
          At this rate, your money doubles every ~2.9 years, creating a massive explosion in the final 5 years of your 20-year journey.
        </p>
      </div>
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-indigo-500">Why Step-Up SIP?</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          A static SIP is a losing battle against lifestyle inflation. By stepping up your SIP by just 10-20% annually, you are effectively 
          investing your salary increments. This one habit can potentially double your final corpus compared to a flat SIP.
        </p>
      </div>
    </div>
    <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">
      <div>#MultibaggerCompounding</div>
      <div>#VisionWealthPlanner</div>
      <div>#IndianEquityGrowth</div>
    </div>
  </section>
);
