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
}

export const Controls: React.FC<ControlsProps> = (props) => {
  const { 
    initialLumpsum, setInitialLumpsum, 
    startSip, setStartSip, 
    stepUp, setStepUp, 
    cagr, setCagr, 
    years, setYears, 
    inflation, setInflation, 
    targetGoal, handleReverseSip 
  } = props;

  return (
    <section className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
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
                Target CAGR % <span title="Compound Annual Growth Rate."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
              </label>
              <span className="text-lg font-bold text-blue-600">{cagr}%</span>
            </div>
            <input 
              type="range" min="5" max="40" step="1" 
              value={cagr} onChange={(e) => setCagr(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setCagr(12)} className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Safe (12%)</button>
              <button onClick={() => setCagr(18)} className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Growth (18%)</button>
              <button onClick={() => setCagr(25)} className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-colors">Alpha (25%)</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                Investment Period <span title="How long you intend to stay invested."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
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
              type="number" value={initialLumpsum} onChange={(e) => setInitialLumpsum(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step-Up %</label>
            <input 
              type="number" value={stepUp} onChange={(e) => setStepUp(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Inflation %</label>
            <input 
              type="number" value={inflation} onChange={(e) => setInflation(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-orange-500 transition-all text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Target Goal (₹)</label>
            <input 
              type="number" value={targetGoal} onChange={(e) => handleReverseSip(e.target.value)}
              placeholder="Goal ₹"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-purple-500 transition-all placeholder:text-slate-600 text-sm font-bold"
            />
          </div>
        </div>

      </div>
    </section>
  );
};
