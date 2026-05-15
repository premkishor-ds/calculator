import React from 'react';
import { TrendingUp, Sun, Landmark, Zap } from 'lucide-react';
import { formatINR, SummaryResult } from '@/utils/calculations';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

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
      <h3 className="text-3xl font-bold text-blue-600 dark:text-cyan-400">{formatINR(summary.finalCorpus)}</h3>
      <p className="text-xs text-slate-500 mt-2 italic">The big number in the future</p>
    </div>

    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4 text-orange-500">
        <Sun className="w-5 h-5" />
        <p className="text-sm font-semibold">Today&apos;s Purchasing Power</p>
      </div>
      <h3 className="text-3xl font-bold text-orange-600 dark:text-orange-400">{formatINR(summary.inflationAdjustedFinal)}</h3>
      <p className="text-xs text-slate-500 mt-2 italic">Worth in today&apos;s money ({inflation}% inflation)</p>
    </div>

    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4 text-red-500">
        <Landmark className="w-5 h-5" />
        <p className="text-sm font-semibold">Net After-Tax (12.5% LTCG)</p>
      </div>
      <h3 className="text-3xl font-bold text-red-600 dark:text-red-400">{formatINR(summary.postTaxCorpus)}</h3>
      <p className="text-xs text-slate-500 mt-2 italic">Your actual &quot;In-Hand&quot; wealth</p>
    </div>
  </section>
);

export const ExecutiveSummary: React.FC<VisualsProps> = ({ summary, years, inflation }) => (
  <section className="mb-12 p-8 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 backdrop-blur-sm">
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
      <h2 className="text-2xl font-bold text-blue-500">Growth Trajectory</h2>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
    </div>
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} vertical={false} />
          <XAxis dataKey="year" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(Number(v) / 10000000).toFixed(1)}Cr`} />
          <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} formatter={(v) => formatINR(Number(v) || 0)} />
          <Area type="monotone" dataKey="balance" name="Nominal" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={3} />
          <Area type="monotone" dataKey="realValue" name="Inflation Adj." stroke="#f97316" fillOpacity={1} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="invested" name="Invested" stroke="#3b82f6" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorInvested)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
);
