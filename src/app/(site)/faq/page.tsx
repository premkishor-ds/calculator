import React from 'react';
import { Metadata } from 'next';
import { CircleQuestionMark as HelpCircle, ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Advanced Wealth FAQ | Compounding & Tax Deep Dive - Vision Wealth',
  description: 'The ultimate guide to Indian equity compounding. FAQs on Step-Up SIP, CAGR growth, LTCG Tax, and Inflation adjustments.',
};

const faqs = [
  {
    q: "Is a 25% CAGR realistic for Indian stock portfolios?",
    a: "While the Nifty 50 averages 12-14%, a 25% CAGR is achievable in focused portfolios that invest in high-growth 'Alpha' stocks, smallcaps, and midcaps. However, this comes with higher volatility and requires a 10-year+ commitment. Our engine helps you visualize why even a 2% difference in CAGR can result in crores of difference over time."
  },
  {
    q: "What exactly is a Step-Up SIP and how do I use it?",
    a: "A Step-Up SIP is a strategy where you increase your monthly investment by a fixed percentage every year (typically 10-20%). This aligns with your annual salary increments. Our data shows that a 10% Step-Up can potentially double your final corpus compared to a flat SIP of the same starting amount."
  },
  {
    q: "How does the engine calculate the 12.5% LTCG Tax?",
    a: "Our algorithm calculates the total gains (Final Corpus minus Total Investment). It then subtracts the ₹1.25 Lakh exemption limit and applies a flat 12.5% tax on the remainder. This gives you the most realistic 'In-Hand' wealth figure after taxes."
  },
  {
    q: "Why is 'Purchasing Power' (Inflation) so important?",
    a: "Because of inflation (typically ~6% in India), the value of ₹1 today will not be the same in 20 years. If your goal is ₹10 Crore, our engine will show you that in 20 years, that ₹10 Crore will only buy what ₹3.1 Crore buys today. This 'Reality Check' ensures you don't under-plan for your future lifestyle."
  },
  {
    q: "What is the difference between XIRR and CAGR?",
    a: "CAGR (Compound Annual Growth Rate) is the average annual growth over a period. XIRR (Extended Internal Rate of Return) is used when you have multiple cash flows (like monthly SIPs) at different times. Our engine uses an underlying monthly geometric formula to provide a result that mimics XIRR precision."
  },
  {
    q: "Can I use this for Mutual Funds and Direct Stocks?",
    a: "Yes. The math remains the same. For Direct Stocks, you might target higher CAGR (20-25%), whereas for Index Funds, you might plan with a more conservative 12-14% CAGR."
  },
  {
    q: "What happens if I stop my SIP early?",
    a: "Compounding is back-loaded. Most of your wealth is created in the last 20% of your time horizon. Stopping even 2 years early can reduce your final corpus by 30-40%. Use our 'Detailed Ledger' to see how the growth explodes in the final years."
  },
  {
    q: "How should I choose my Target CAGR?",
    a: "Conservative: 12-14% (Index Funds). Moderate: 15-18% (Flexicap/Midcap Funds). Aggressive: 20-25% (Focused Smallcap/Direct Equity). Always plan with a 'Margin of Safety'."
  },
  {
    q: "What if the market crashes right before my target year?",
    a: "This is known as 'Sequence of Returns Risk'. To mitigate this, you should employ a 'Glide Path' strategy. If your goal is 20 years away, you shouldn't be holding 100% volatile equities in year 19. By year 15, you should gradually start moving your accumulated corpus into safer debt instruments (like Liquid Funds or FDs) to protect it from a sudden market crash."
  },
  {
    q: "Does this calculator account for Dividend Reinvestment?",
    a: "Yes. The CAGR (Compound Annual Growth Rate) assumption inherently includes the Total Return Index (TRI), which assumes that all dividends paid out by the companies are automatically reinvested back into the portfolio. This is a crucial component of long-term compounding."
  },
  {
    q: "Should I stop or reduce my SIP when the market is at an All-Time High (ATH)?",
    a: "No. Statistically, markets spend a significant amount of time near all-time highs during secular bull runs. Stopping your SIP means you miss out on share accumulation. The math of our dashboard assumes you continue your Step-Up SIP ruthlessly, regardless of market levels."
  },
  {
    q: "Is this engine only applicable to the Indian Stock Market?",
    a: "While the underlying math (geometric compounding, inflation discounting) is universal, certain defaults are specifically tailored for India: a 6% inflation assumption and the specific 12.5% Long-Term Capital Gains (LTCG) tax logic. Users from other countries can use the tool by adjusting the inflation and ignoring the tax block."
  },
  {
    q: "How do you calculate the 'Monthly SWP' target?",
    a: "We use a conservative 6% Systematic Withdrawal Plan (SWP) rule. Once you hit your final corpus, if you withdraw 6% of it annually (divided into monthly payouts), your remaining corpus should continue to grow faster than inflation, theoretically lasting forever without depleting the principal."
  }
];

export default function FAQPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-24">
      <header className="text-center mb-20">
        <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-500 mb-6">
          <HelpCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
          Wealth Intelligence FAQ
        </h1>
        <p className="text-lg text-slate-500">Every question you have about compounding, taxes, and the Indian market—answered by data.</p>
      </header>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details key={i} className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm open:shadow-xl transition-all">
            <summary className="flex justify-between items-center font-bold text-lg cursor-pointer list-none">
              <span className="pr-8">{faq.q}</span>
              <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
              {faq.a}
            </div>
          </details>
        ))}
      </div>

      <section className="mt-24 p-12 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center shadow-2xl shadow-blue-500/20">
        <h2 className="text-3xl font-bold mb-4">Master Your Money.</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">Still confused about your financial roadmap? Our engineers are ready to help you forge your data-driven strategy.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="px-8 py-4 rounded-full bg-white text-blue-600 font-bold hover:scale-105 transition-transform shadow-lg">
            Talk to an Expert
          </button>
          <button className="px-8 py-4 rounded-full bg-blue-500 border border-white/20 text-white font-bold hover:bg-blue-400 transition-all">
            View Case Studies
          </button>
        </div>
      </section>
    </main>
  );
}
