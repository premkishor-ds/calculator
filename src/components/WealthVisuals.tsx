import React from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Sun, Landmark, Zap, HelpCircle } from 'lucide-react';
import { formatINR, SummaryResult } from '@/utils/calculations';

const WealthChartInner = dynamic(() => import('./WealthChartInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />,
});

export interface ChartDataPoint {
  name: string;
  year: string;
  balance: number;
  realValue: number;
  invested: number;
}

interface VisualsProps {
  summary: SummaryResult;
  years: number;
  inflation: number;
  chartData: ChartDataPoint[];
  theme: 'dark' | 'light';
}

export const SummaryCards: React.FC<VisualsProps> = ({ summary, inflation }) => (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4 text-blue-500">
        <TrendingUp className="w-5 h-5" />
        <p className="text-sm font-semibold">Total Nominal Corpus</p>
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-cyan-400 break-words">{formatINR(summary.finalCorpus)}</h3>
      <p className="text-xs text-slate-500 mt-2 italic">The big number in the future</p>
    </div>

    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4 text-orange-500">
        <Sun className="w-5 h-5" />
        <p className="text-sm font-semibold">Today&apos;s Purchasing Power</p>
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400 break-words">{formatINR(summary.inflationAdjustedFinal)}</h3>
      <p className="text-xs text-slate-500 mt-2 italic">Worth in today&apos;s money ({inflation}% inflation)</p>
    </div>

    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4 text-red-500">
        <Landmark className="w-5 h-5" />
        <p className="text-sm font-semibold flex items-center gap-1">
          Net After-Tax (12.5% LTCG) 
          <span title="Long Term Capital Gains Tax - Tax applied on profits above ₹1.25 Lakh (effective 2024). Calculated as 12.5% on gains."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
        </p>
      </div>

      <h3 className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 break-words">{formatINR(summary.postTaxCorpus)}</h3>
      <p className="text-xs text-slate-500 mt-2 italic">Your actual &quot;In-Hand&quot; wealth</p>
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
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          By investing a total of <span className="font-bold text-blue-500">{formatINR(summary.totalInvested)}</span> over <span className="font-bold text-blue-500">{years} years</span>, 
          you build <span className="font-bold text-blue-500">{formatINR(summary.finalCorpus)}</span>. 
          Adjusted for <span className="font-bold text-orange-500">{inflation}% inflation</span>, your power is 
          <span className="font-bold text-orange-500"> {formatINR(summary.inflationAdjustedFinal)}</span>. 
          Targeting <span className="font-bold text-green-500">{formatINR(summary.monthlySwp6)}/mo</span> SWP.
        </p>
      </div>
    </div>
  </section>
);

export const WealthChart: React.FC<VisualsProps> = ({ chartData, theme }) => (
  <section className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-blue-500">Growth Trajectory</h2>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
    </div>
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-[280px] sm:h-[360px] lg:h-[400px] min-w-0">
      <WealthChartInner chartData={chartData} theme={theme} />
    </div>
  </section>
);
