import { Award, Briefcase,CheckCircle2, Circle, Heart, Landmark, ShieldAlert, TrendingUp, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';

import { formatINR, SummaryResult } from '@/utils/calculations';
import { FIRESummary } from '@/utils/solvers';

const WealthChartInner = dynamic(() => import('./WealthChartInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />,
});

const CapitalCompositionInner = dynamic(() => import('./CapitalCompositionInner'), {
  ssr: false,
  loading: () => <div className="w-full h-[220px] rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />,
});

export interface ChartDataPoint {
  name: string;
  year: string;
  balance: number;
  realValue: number;
  invested: number;
  afterTax?: number;
}

interface VisualsProps {
  summary: SummaryResult;
  years: number;
  inflation: number;
  chartData: ChartDataPoint[];
  theme: 'dark' | 'light';
}

export const SummaryCards: React.FC<VisualsProps> = ({ summary, inflation }) => (
  <section className="space-y-8 mb-12">
    
    {/* Part 1: Capital Allocation Summary */}
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6 text-blue-500">
        <Briefcase className="w-5 h-5" />
        <h4 className="text-sm font-black uppercase tracking-wider">Investment Summary</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Total SIP</span>
          <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200 mt-1 block">{formatINR(summary.totalSIPInvested)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Total Lump Sum</span>
          <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200 mt-1 block">{formatINR(summary.totalLumpsumInvested)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Total Principal</span>
          <span className="text-lg sm:text-xl font-black text-blue-500 mt-1 block">{formatINR(summary.totalInvested)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Estimated Gains</span>
          <span className="text-lg sm:text-xl font-black text-emerald-500 mt-1 block">{formatINR(summary.totalGains)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Corpus Before Tax</span>
          <span className="text-lg sm:text-xl font-black text-cyan-500 mt-1 block">{formatINR(summary.finalCorpus)}</span>
        </div>
      </div>
    </div>

    {/* Part 2: Tax Liability & Real Value Summary */}
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6 text-red-500">
        <Landmark className="w-5 h-5" />
        <h4 className="text-sm font-black uppercase tracking-wider">Tax & Purchasing Power Summary</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Taxable Gains</span>
          <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200 mt-1 block">{formatINR(summary.taxableGains)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">LTCG Exemption</span>
          <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200 mt-1 block">{formatINR(summary.exemptionApplied)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">LTCG Tax Payable</span>
          <span className="text-lg sm:text-xl font-black text-red-500 mt-1 block">{formatINR(summary.taxPayable)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Corpus After Tax</span>
          <span className="text-lg sm:text-xl font-black text-emerald-500 mt-1 block">{formatINR(summary.corpusAfterTax)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Real Value ({inflation}% Infl)</span>
          <span className="text-lg sm:text-xl font-black text-orange-500 mt-1 block">{formatINR(summary.realPurchasingPower)}</span>
        </div>
      </div>
    </div>

    {/* Part 3: Return Efficiency & Growth Metrics */}
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6 text-purple-500">
        <Award className="w-5 h-5" />
        <h4 className="text-sm font-black uppercase tracking-wider">Performance Metrics</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Nominal CAGR</span>
          <span className="text-xl font-black text-blue-500 mt-1 block">{summary.cagr.toFixed(2)}%</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Real CAGR (Infl-Adj)</span>
          <span className="text-xl font-black text-orange-500 mt-1 block">{summary.realCagr.toFixed(2)}%</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Total Return %</span>
          <span className="text-xl font-black text-emerald-500 mt-1 block">{summary.totalReturnPct.toFixed(1)}%</span>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">Wealth Multiplier</span>
          <span className="text-xl font-black text-purple-500 mt-1 block">{summary.wealthMultiplier.toFixed(2)}x</span>
        </div>
      </div>
    </div>

  </section>
);

export const ExecutiveSummary: React.FC<VisualsProps> = ({ summary, years, inflation }) => (
  <section className="mb-12 p-5 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 backdrop-blur-sm">
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30">
        <Zap className="w-6 h-6 text-white" />
      </div>
      <div>
        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Executive Summary</h4>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          By investing a total of <span className="font-bold text-blue-500">{formatINR(summary.totalInvested)}</span> over <span className="font-bold text-blue-500">{years} years</span>, 
          you build a pre-tax corpus of <span className="font-bold text-blue-500">{formatINR(summary.finalCorpus)}</span>. 
          Subtracting standard LTCG taxes results in <span className="font-bold text-red-500">{formatINR(summary.corpusAfterTax)}</span>. 
          Adjusted for <span className="font-bold text-orange-500">{inflation}% inflation</span>, your actual purchasing power is 
          <span className="font-bold text-orange-500"> {formatINR(summary.realPurchasingPower)}</span>. 
          Yields a post-retirement <span className="font-bold text-green-500">{formatINR(summary.monthlySwp6)}/mo</span> SWP.
        </p>
      </div>
    </div>
  </section>
);

export const WealthChart: React.FC<VisualsProps> = ({ chartData, theme }) => {
  const [chartMode, _setChartMode] = useState<'growth' | 'tax' | 'inflation' | 'yearly'>('growth');

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-500">Wealth Projections</h2>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-[280px] sm:h-[360px] lg:h-[400px] min-w-0">
        <WealthChartInner chartData={chartData} theme={theme} chartMode={chartMode} />
      </div>
    </section>
  );
};

interface CompositionProps {
  summary: SummaryResult;
  theme: 'dark' | 'light';
}

export const CapitalComposition: React.FC<CompositionProps> = ({ summary, theme }) => {
  const gains = Math.max(0, summary.finalCorpus - summary.totalInvested);
  return (
    <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
      <div className="flex-1 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          💰 Capital Composition
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          See the visual distribution between the principal capital you invest and the estimated compounding market gains generated over the target tenure. Over long investment horizons, compounding gains naturally dwarf your original principal contributions.
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold mt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Invested</span>
            <span className="text-base font-extrabold text-blue-500 block mt-0.5">{formatINR(summary.totalInvested)}</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Est. Gains</span>
            <span className="text-base font-extrabold text-emerald-500 block mt-0.5">{formatINR(gains)}</span>
          </div>
        </div>
      </div>
      <div className="w-full md:w-[280px]">
        <CapitalCompositionInner invested={summary.totalInvested} gains={gains} theme={theme} />
      </div>
    </section>
  );
};

interface MilestoneProps {
  ledger: any[];
}

export const GoalMilestones: React.FC<MilestoneProps> = ({ ledger }) => {
  const milestones = [
    { label: 'Starter Corpus', amount: 1000000, icon: '🌱' }, // 10L
    { label: 'Half-Crorepati', amount: 5000000, icon: '🎓' }, // 50L
    { label: 'Crorepati Club', amount: 10000000, icon: '🏡' }, // 1Cr
    { label: 'Multi-Crorepati (FIRE)', amount: 50000000, icon: '🔥' }, // 5Cr
  ];

  return (
    <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Financial Milestone Roadmap</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Exact time-frames required to scale key net-worth thresholds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {milestones.map((m) => {
          const match = ledger.find(item => item.closingBalance >= m.amount);
          const reached = !!match;
          const percentage = reached ? 100 : Math.round((ledger[ledger.length - 1]?.closingBalance / m.amount) * 100);

          return (
            <div 
              key={m.label} 
              className={`p-5 rounded-2xl border transition-all duration-350 ${
                reached 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-50' 
                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl">{m.icon}</span>
                {reached ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                )}
              </div>
              <h4 className="text-sm font-extrabold">{m.label}</h4>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{formatINR(m.amount)} Target</p>
              
              <div className="mt-4">
                {reached ? (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">Achieved!</span>
                    <p className="text-xs font-bold mt-0.5">Year {match.year}, Month {match.month % 12 || 12}</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Progress</span>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, percentage)}%` }} />
                    </div>
                    <p className="text-[10px] font-semibold mt-1 text-slate-500">{percentage}% of goal</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// -------------------------------------------------------------
// 🔥 5. FIRE CALCULATOR SUMMARY & VISUAL ROADMAP COMPONENTS
// -------------------------------------------------------------
interface FIREResultsProps {
  summary: FIRESummary;
  inflation: number;
  swr: number;
}

export const FIREResults: React.FC<FIREResultsProps> = ({ summary, inflation, swr }) => {
  const firePercentage = Math.min(100, Math.round((summary.projectedCorpus / summary.requiredFIRECorpus) * 100));

  return (
    <section className="space-y-8 mb-12 animate-fadeIn">
      
      {/* 🚀 FIRE Dashboard HUD Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-orange-500">
            <TrendingUp className="w-6 h-6 animate-bounce" />
            <h3 className="text-lg font-black uppercase tracking-wider">FIRE Readiness Forecast</h3>
          </div>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-normal">
            Based on monthly expenses of **{formatINR(summary.currentAnnualExpenses / 12)}**, expected inflation and SWR preset of **{swr}%**.
          </p>
        </div>
        
        {/* FIRE Progress Gauge */}
        <div className="shrink-0 flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" className="text-orange-500" strokeWidth="6" strokeDasharray={175} strokeDashoffset={175 - (175 * firePercentage) / 100} />
            </svg>
            <span className="absolute text-xs font-black">{firePercentage}%</span>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">FIRE Status</span>
            <span className={`text-sm font-black uppercase tracking-wider block ${summary.fireAchieved ? 'text-emerald-500' : 'text-orange-500 animate-pulse'}`}>
              {summary.fireAchieved ? '🔥 FIRE ACHIEVED!' : '⚠️ SCALING GAP'}
            </span>
          </div>
        </div>
      </div>

      {/* Target Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold block">Current Annual Exp.</span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 block">{formatINR(summary.currentAnnualExpenses)}</span>
          <span className="text-[10px] text-slate-400 mt-1 italic block">Incl. allocated buffers</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold block">Retirement Expenses</span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2 block">{formatINR(summary.expensesAtRetirement)}</span>
          <span className="text-[10px] text-slate-400 mt-1 italic block">Adjusted for {inflation}% inflation</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold block">Required FIRE Corpus</span>
          <span className="text-xl font-black text-orange-500 mt-2 block">{formatINR(summary.requiredFIRECorpus)}</span>
          <span className="text-[10px] text-slate-450 mt-1 italic block">The ultimate target goal</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold block">Projected Portfolio</span>
          <span className="text-xl font-black text-emerald-500 mt-2 block">{formatINR(summary.projectedCorpus)}</span>
          <span className="text-[10px] text-slate-400 mt-1 italic block">Estimated savings at retirement</span>
        </div>
      </div>

      {/* ⚠️ Shortfall GAP Alert Module */}
      {summary.gapShortfall > 0 ? (
        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex items-start gap-4 text-xs">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-500 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 leading-relaxed">
            <h5 className="font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider text-[10px]">Shortfall Gap Analysis</h5>
            <p className="font-medium text-slate-650 dark:text-slate-350 text-sm">
              Your projected portfolio is short by **{formatINR(summary.gapShortfall)}**. To bridge this deficit by retirement, you need to add an additional monthly SIP of **{formatINR(summary.additionalSipNeeded)}**.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-4 text-xs">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 leading-relaxed">
            <h5 className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">Surplus Target Reached!</h5>
            <p className="font-medium text-slate-650 dark:text-slate-350 text-sm">
              Congratulations! Your compounding assets will exceed your targets, leaving you with a surplus net worth of **{formatINR(Math.abs(summary.gapShortfall))}** at retirement.
            </p>
          </div>
        </div>
      )}

      {/* 👑 FIRE Categories Analysis Dashboard */}
      <div>
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-pink-500" />
          FIRE Categories Projections
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider">Lean FIRE (75% expenses)</span>
            <span className="text-base font-extrabold text-slate-850 dark:text-slate-100 block mt-1.5">{formatINR(summary.leanFIRECorpus)}</span>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Minimalist retirement corpus covering necessary base expenses only.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Barista FIRE (50% expenses)</span>
            <span className="text-base font-extrabold text-slate-850 dark:text-slate-100 block mt-1.5">{formatINR(summary.baristaFIRECorpus)}</span>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Required corpus assuming a part-time job will cover half of your living budget.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <span className="text-[9px] font-black uppercase text-purple-500 tracking-wider">Coast FIRE (No more savings needed)</span>
            <span className="text-base font-extrabold text-slate-850 dark:text-slate-100 block mt-1.5">{formatINR(summary.coastFIRECorpus)}</span>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">If you have this today, you can stop saving entirely; compound interest will carry you to the FIRE target by retirement age.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <span className="text-[9px] font-black uppercase text-orange-500 tracking-wider">Fat FIRE (150% expenses)</span>
            <span className="text-base font-extrabold text-slate-850 dark:text-slate-100 block mt-1.5">{formatINR(summary.fatFIRECorpus)}</span>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Abundant retirement corpus permitting extra travel, dining out, and higher quality of life buffers.</p>
          </div>

        </div>
      </div>

    </section>
  );
};
