import React from 'react';
import { HelpCircle } from 'lucide-react';
import { formatINR } from '@/utils/calculations';

interface ControlsProps {
  initialLumpsum: number;
  setInitialLumpsum: (v: number) => void;
  startSip: number;
  setStartSip: (v: number) => void;
  stepUp: number;
  setStepUp: (v: number) => void;
  cagr: number;
  setCagr: (v: number) => void;
  years: number;
  setYears: (v: number) => void;
  inflation: number;
  setInflation: (v: number) => void;
  targetGoal: string;
  handleReverseSip: (v: string) => void;
  resetAll: () => void;
}

export const Controls: React.FC<ControlsProps> = (props) => {
  const { 
    initialLumpsum, setInitialLumpsum, 
    startSip, setStartSip, 
    stepUp, setStepUp, 
    cagr, setCagr, 
    years, setYears, 
    inflation, setInflation, 
    targetGoal, handleReverseSip,
    resetAll
  } = props;

  const handleNumberChange = (value: string, setter: (v: number) => void, maxVal: number) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean === '') {
      setter(0);
      return;
    }
    const parsed = parseInt(clean, 10);
    if (isNaN(parsed)) {
      setter(0);
    } else {
      setter(Math.min(maxVal, parsed));
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Calculator Parameters</h3>
        <button 
          onClick={resetAll}
          className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all touch-manipulation"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                Monthly SIP <span title="Monthly amount you will invest every month."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
              </label>
              <span className="text-lg font-bold text-blue-600">{formatINR(startSip)}</span>
            </div>
            <input 
              type="range" min="1000" max="500000" step="1000" 
              value={startSip} onChange={(e) => setStartSip(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                Target CAGR % <span title="Compound Annual Growth Rate - The average yearly growth of your investment over time."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
              </label>
              <span className="text-lg font-bold text-blue-600">{cagr}%</span>
            </div>
            <input 
              type="range" min="5" max="40" step="1" 
              value={cagr} onChange={(e) => setCagr(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCagr(12)} className="text-[10px] px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-colors touch-manipulation">Safe (12%)</button>
              <button onClick={() => setCagr(18)} className="text-[10px] px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-colors touch-manipulation">Growth (18%)</button>
              <button onClick={() => setCagr(25)} className="text-[10px] px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-colors touch-manipulation">Alpha (25%)</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                Investment Period <span title="How long you intend to stay invested in years."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
              </label>
              <span className="text-lg font-bold text-blue-600">{years} Years</span>
            </div>
            <input 
              type="range" min="1" max="25" step="1" 
              value={years} onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Initial Lumpsum</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={initialLumpsum === 0 ? '' : initialLumpsum} 
              onChange={(e) => handleNumberChange(e.target.value, setInitialLumpsum, 1000000000000)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step-Up %</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={stepUp === 0 ? '' : stepUp} 
              onChange={(e) => handleNumberChange(e.target.value, setStepUp, 100)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
              Inflation % <span title="Inflation Rate - The rate at which the purchasing power of money decreases (standard is 6%)."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
            </label>
            <input 
              type="text" 
              inputMode="numeric"
              value={inflation === 0 ? '' : inflation} 
              onChange={(e) => handleNumberChange(e.target.value, setInflation, 50)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-orange-500 transition-all text-sm font-semibold"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Target Goal (₹)</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={targetGoal} 
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '');
                handleReverseSip(clean);
              }}
              onFocus={(e) => e.target.select()}
              placeholder="Goal ₹"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-purple-500 transition-all placeholder:text-slate-650 text-sm font-bold"
            />
          </div>
        </div>

      </div>

      {/* 🔒 100% Private & Client-Side Wealth Intelligence Badge */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="text-xl">🔒</span>
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">100% Private & Client-Side Sandbox</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">All computations run locally on your device. Your financial worth, assets, and liabilities data are never stored or sent to any server.</p>
          </div>
        </div>
        <div className="shrink-0 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider rounded-xl">
          Zero Data Storage
        </div>
      </div>
    </section>
  );
};
