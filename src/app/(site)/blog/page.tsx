import React from 'react';
import { Metadata } from 'next';
import { ArrowRight, Clock, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Equity Insights Blog | Multibagger Strategies - Vision Wealth',
  description: 'Learn the secrets of Indian stock market compounding, SIP step-ups, and portfolio building on dataforger.com.',
};

const posts = [
  {
    title: "The 25% CAGR Blueprint: How to Identify Multibaggers",
    excerpt: "In the world of Indian equities, achieving a 25% CAGR is the difference between being comfortable and being wealthy. This deep dive explores how to identify companies with high 'ROCE' and 'Pricing Power' before they become large-caps.",
    content: "The secret to 25% CAGR isn't finding a 'hot tip.' It's finding companies in the 'Sweet Spot' of their lifecycle—where revenues are growing at 20% and margins are expanding. We look at sectors like Specialty Chemicals, Digital Transformation, and Consumer Discretionary as the primary engines of this growth in the next decade.",
    category: "Alpha Strategy",
    date: "May 15, 2026",
    readTime: "8 min read"
  },
  {
    title: "SIP Step-up: The Hidden Math of Wealth Multiplication",
    excerpt: "Most investors keep their SIP static for 10 years. We prove why increasing your SIP by just 10% every year as your salary increases can result in a 2.5x larger final corpus. It's the most underrated wealth hack in India.",
    content: "Imagine starting a ₹20,000 SIP. If you keep it flat for 20 years at 15% CAGR, you get ₹3 Crores. But if you simply increase it by 10% every year—a 'Step-up'—your final corpus jumps to over ₹7.5 Crores. You haven't changed your lifestyle; you've just disciplined your increments.",
    category: "Math of Money",
    date: "May 12, 2026",
    readTime: "6 min read"
  },
  {
    title: "Navigating the 2024 LTCG Tax: A Survival Guide",
    excerpt: "The increase in LTCG tax to 12.5% caused a panic, but for the long-term investor, the impact is manageable. We break down the math of how to stay tax-efficient using 'Tax Harvesting' techniques.",
    content: "While the tax rate has increased, the ₹1.25 Lakh annual exemption remains a powerful tool. By 'Harvesting' your gains every year and reinvesting, you can reset your cost basis and significantly reduce your terminal tax liability on a 20-year portfolio.",
    category: "Tax Optimization",
    date: "May 08, 2026",
    readTime: "10 min read"
  },
  {
    title: "The Psychology of Bear Markets: Why 90% Fail",
    excerpt: "When the portfolio is down 30%, the math of compounding feels broken. Discover the behavioral finance strategies used by top 1% investors to stay invested during severe drawdowns.",
    content: "During a bear market, the 'nominal' corpus shrinks, but the 'share accumulation' accelerates. If you continue your Step-Up SIP during a 2-year bear market, you accumulate assets at distressed valuations. When the bull market returns, the geometric explosion in wealth is unprecedented.",
    category: "Behavioral Finance",
    date: "May 02, 2026",
    readTime: "7 min read"
  },
  {
    title: "Decoding the 6% SWP Rule for Early Retirement",
    excerpt: "Is the traditional 4% rule dead in India? We explore why a 6% Systematic Withdrawal Plan (SWP) might be the sweet spot for Indian equity portfolios targeting post-retirement income.",
    content: "In a high-inflation, high-growth economy like India, a 4% withdrawal rate is often too conservative if the underlying portfolio is compounding at 12-15%. A 6% SWP allows for a higher lifestyle while ensuring the principal corpus continues to beat inflation over a 30-year retirement span.",
    category: "Retirement Planning",
    date: "April 28, 2026",
    readTime: "9 min read"
  },
  {
    title: "Smallcap vs. Largecap: The Allocation Shift",
    excerpt: "You can't hold a 100% smallcap portfolio forever. Learn the exact framework for shifting assets from high-risk smallcaps to stable largecaps as you approach your target goal.",
    content: "We introduce the 'Glide Path' strategy. In the first 10 years, a heavy skew towards small and midcaps drives the 20-25% CAGR. In the final 5 years, as the corpus size becomes massive, capital preservation becomes more important than capital appreciation. This is when the shift to Nifty 50 and debt instruments must occur.",
    category: "Asset Allocation",
    date: "April 20, 2026",
    readTime: "12 min read"
  }
];

export default function BlogPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-24">
      <header className="mb-20">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
          Wealth Intelligence Library.
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl">
          Actionable strategies and data-driven insights for the modern Indian investor.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
        {posts.map((post, i) => (
          <article key={i} className="flex flex-col p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all shadow-sm hover:shadow-2xl group cursor-pointer">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">
                <Tag className="w-3 h-3" /> {post.category}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold mb-6 group-hover:text-blue-500 transition-colors">
              {post.title}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 flex-1">
              {post.excerpt}
            </p>

            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
                <span className="text-xs font-bold">DataForger Research</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-widest">
                Read More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="p-12 rounded-[3.5rem] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="max-w-xl">
          <h2 className="text-4xl font-bold mb-4">Join 10,000+ Investors.</h2>
          <p className="text-slate-400 mb-0">Get our weekly &quot;Alpha Report&quot; delivered to your inbox. No spam, just math-heavy wealth insights.</p>
        </div>
        <div className="flex w-full md:w-auto gap-4">
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="flex-1 md:w-64 bg-white/10 border border-white/20 rounded-full px-6 py-4 text-sm outline-none focus:ring-2 ring-blue-500 transition-all"
          />
          <button className="px-8 py-4 rounded-full bg-blue-500 font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30">
            Subscribe
          </button>
        </div>
      </section>
    </main>
  );
}
