import { BarChart3, Shield, TrendingUp, Users,Zap } from 'lucide-react';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'About Our Financial Engineering | Vision Wealth - DataForger.com',
  description: 'Deep dive into the methodology, mission, and financial logic behind the Vision Wealth engine on dataforger.com.',
};

export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-24">
      <section className="mb-20">
        <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
          The Engineering of Financial Freedom.
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 leading-relaxed max-w-3xl">
          At Vision Wealth, we don&apos;t just calculate numbers; we forge roadmaps for the next generation of Indian wealth creators.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">The DataForger Philosophy</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            DataForger was born out of a simple frustration: most financial tools are too simple for the complex reality of the Indian market. They ignore inflation, they skip taxes, and they assume growth is linear.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Our philosophy is rooted in <strong>&quot;Techno-Fundamental&quot;</strong> analysis. We believe that by combining the power of compounding math with high-conviction equity selection, any disciplined investor can achieve &quot;Alpha&quot; (market-beating returns).
          </p>
        </div>
        <div className="bg-blue-500/5 rounded-3xl p-8 border border-blue-500/10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Our Methodology
          </h3>
          <ul className="space-y-4 text-sm text-slate-500">
            <li className="flex gap-3">
              <span className="font-bold text-blue-500">01.</span>
              <span><strong>Geometric Compounding:</strong> Our engine uses monthly compounding intervals to accurately reflect how mutual funds and stocks actually grow.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-500">02.</span>
              <span><strong>Inflation Normalization:</strong> We use the 10-year average CPI (Consumer Price Index) to discount future wealth into &quot;Today&apos;s Purchasing Power.&quot;</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-500">03.</span>
              <span><strong>Tax-Adjusted Real Returns:</strong> We automatically factor in the 12.5% LTCG tax on gains above ₹1.25L, giving you the only true &quot;In-Hand&quot; number.</span>
            </li>
          </ul>
        </div>
      </div>

      <section className="mb-24">
        <h2 className="text-3xl font-bold mb-12 text-center">Who We Serve</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Users, t: "Retail Visionaries", d: "Individuals looking to transition from 8% FDs to 18%+ Equity growth safely." },
            { icon: Zap, t: "Alpha Seekers", d: "High-conviction investors targeting midcap multibaggers and 25% CAGR portfolios." },
            { icon: Shield, t: "Retirement Architects", d: "Planning for a inflation-proof retirement through the power of Step-Up SIPs." }
          ].map((item, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all">
              <item.icon className="w-10 h-10 text-blue-500 mb-6" />
              <h4 className="font-bold text-lg mb-3">{item.t}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-24">
        <h2 className="text-3xl font-bold mb-12 text-center">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 border-l-4 border-blue-500 bg-white dark:bg-slate-900 rounded-r-3xl">
            <h4 className="font-bold text-xl mb-3 text-blue-500">Radical Transparency</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              We don&apos;t hide the ugly truths of investing. That&apos;s why our dashboard prominently features inflation and taxes. A ₹10 Crore portfolio sounds amazing, but if it only buys ₹3 Crores worth of goods in the future, you need to know that today, not 15 years from now.
            </p>
          </div>
          <div className="p-8 border-l-4 border-cyan-500 bg-white dark:bg-slate-900 rounded-r-3xl">
            <h4 className="font-bold text-xl mb-3 text-cyan-500">Data Over Emotion</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              The stock market is a mechanism for transferring wealth from the impatient to the patient. By providing you with a 240-month visual ledger, we aim to anchor your expectations in mathematical reality, helping you survive bear markets without panicking.
            </p>
          </div>
          <div className="p-8 border-l-4 border-orange-500 bg-white dark:bg-slate-900 rounded-r-3xl">
            <h4 className="font-bold text-xl mb-3 text-orange-500">100% Privacy First</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Vision Wealth is a client-side application. This means none of your financial scenarios, goal inputs, or SIP amounts are ever sent to our servers. Your financial dreams are processed entirely within your own browser.
            </p>
          </div>
          <div className="p-8 border-l-4 border-indigo-500 bg-white dark:bg-slate-900 rounded-r-3xl">
            <h4 className="font-bold text-xl mb-3 text-indigo-500">Continuous Evolution</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              As the Indian tax code changes and market dynamics shift, our engineering team immediately updates the underlying engine. We are committed to maintaining the most accurate and up-to-date compounding tool on the internet.
            </p>
          </div>
        </div>
      </section>

      <section className="p-12 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl font-bold mb-6">Built for the Indian Context.</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            The Indian economy is at a historic pivot point. As the country moves toward a $10 Trillion economy, the equity markets represent the single greatest wealth-creation opportunity of our lifetime. DataForger is here to ensure you don&apos;t just participate—you dominate.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest">#MakeInIndia</div>
            <div className="px-4 py-2 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest">#EquityCulture</div>
          </div>
        </div>
        <BarChart3 className="absolute -right-20 -bottom-20 w-96 h-96 text-white/5 rotate-12" />
      </section>
    </main>
  );
}
