import React, { useState } from 'react';
import { RotateCw, Layers, Sparkles, Check, DollarSign, Calendar, TrendingUp, Lock } from 'lucide-react';
import { formatINR } from '@/utils/calculations';

interface ControlsProps {
  activeTab: 'corpus' | 'years' | 'cagr' | 'target' | 'fire';
  setActiveTab: (tab: 'corpus' | 'years' | 'cagr' | 'target' | 'fire') => void;

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
  considerInflation: boolean;
  setConsiderInflation: (v: boolean) => void;
  sipFrequency: 'monthly' | 'quarterly' | 'yearly';
  setSipFrequency: (v: 'monthly' | 'quarterly' | 'yearly') => void;
  compoundingFrequency: 'monthly' | 'quarterly' | 'yearly';
  setCompoundingFrequency: (v: 'monthly' | 'quarterly' | 'yearly') => void;
  considerTax: boolean;
  setConsiderTax: (v: boolean) => void;
  taxRate: number;
  setTaxRate: (v: number) => void;
  taxExemption: number;
  setTaxExemption: (v: number) => void;

  targetGoal: number;
  setTargetGoal: (v: number) => void;
  targetMode: 'sip' | 'lumpsum' | 'combo';
  setTargetMode: (v: 'sip' | 'lumpsum' | 'combo') => void;

  // FIRE Calculator States
  currentAge: number;
  setCurrentAge: (v: number) => void;
  retirementAge: number;
  setRetirementAge: (v: number) => void;
  currentMonthlyExpenses: number;
  setCurrentMonthlyExpenses: (v: number) => void;
  swr: number;
  setSwr: (v: number) => void;
  healthcareBuffer: boolean;
  setHealthcareBuffer: (v: boolean) => void;
  emergencyBuffer: boolean;
  setEmergencyBuffer: (v: boolean) => void;

  resetAll: () => void;
}

export const Controls: React.FC<ControlsProps> = (props) => {
  const { 
    activeTab, setActiveTab,
    initialLumpsum, setInitialLumpsum, 
    startSip, setStartSip, 
    stepUp, setStepUp, 
    cagr, setCagr, 
    years, setYears, 
    inflation, setInflation,
    considerInflation, setConsiderInflation,
    sipFrequency, setSipFrequency,
    compoundingFrequency, setCompoundingFrequency,
    considerTax, setConsiderTax,
    taxRate, setTaxRate,
    taxExemption, setTaxExemption,
    targetGoal, setTargetGoal,
    targetMode, setTargetMode,
    currentAge, setCurrentAge,
    retirementAge, setRetirementAge,
    currentMonthlyExpenses, setCurrentMonthlyExpenses,
    swr, setSwr,
    healthcareBuffer, setHealthcareBuffer,
    emergencyBuffer, setEmergencyBuffer,
    resetAll
  } = props;

  const [activePreset, setActivePreset] = useState<string | null>(null);
  const requiredRetirementCorpus = (currentMonthlyExpenses * 12) / (swr / 100 || 0.04);

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

  const presets = [
    {
      id: 'it_pro',
      label: '🚀 IT Pro Wealth Builder',
      desc: 'High returns & high step-up',
      config: () => {
        setStartSip(30000);
        setInitialLumpsum(100000);
        setStepUp(15);
        setCagr(18);
        setYears(15);
      }
    },
    {
      id: 'child_edu',
      label: '🎓 Child Education Plan',
      desc: 'Safe & steady compounding',
      config: () => {
        setStartSip(15000);
        setInitialLumpsum(50000);
        setStepUp(10);
        setCagr(13);
        setYears(12);
      }
    },
    {
      id: 'home_buyer',
      label: '🏡 Dream Home Fund',
      desc: 'Short term targeted growth',
      config: () => {
        setStartSip(40000);
        setInitialLumpsum(500000);
        setStepUp(10);
        setCagr(12);
        setYears(8);
      }
    },
    {
      id: 'early_retire',
      label: '🔥 Early Retirement FIRE',
      desc: 'Maximize compounding duration',
      config: () => {
        setStartSip(50000);
        setInitialLumpsum(200000);
        setStepUp(12);
        setCagr(15);
        setYears(20);
        setActiveTab('fire');
        setCurrentAge(28);
        setRetirementAge(48);
        setCurrentMonthlyExpenses(60000);
      }
    }
  ];

  const handlePresetSelect = (id: string, configFn: () => void) => {
    configFn();
    setActivePreset(id);
  };

  return (
    <section className="bg-white dark:bg-zinc-900 p-5 sm:p-8 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-2xl mb-12">
      
      {/* 🧭 Master Tab Selector - Segmented Capsule Pill Style */}
      <div className="bg-slate-100 dark:bg-zinc-950 p-1.5 rounded-2xl flex gap-1 mb-8 overflow-x-auto scrollbar-none border border-slate-200/40 dark:border-zinc-800/50">
        {(['corpus', 'years', 'cagr', 'target', 'fire'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            {tab === 'corpus' && '💰 Corpus Calculator'}
            {tab === 'years' && '🕒 Years Calculator'}
            {tab === 'cagr' && '📈 CAGR Calculator'}
            {tab === 'target' && '🎯 Target Solver'}
            {tab === 'fire' && '🔥 FIRE Calculator'}
          </button>
        ))}
      </div>



      <div className="flex justify-between items-center gap-3 mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-550 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          Calculator Parameters
        </h3>
        <button 
          onClick={resetAll}
          className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-550 dark:text-zinc-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center gap-1"
        >
          <RotateCw className="w-3 h-3" />
          Reset Configs
        </button>
      </div>

      {/* 🚀 Single Unified Configurations Column Flow */}
      <div className="space-y-8 bg-slate-50/50 dark:bg-zinc-950/20 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/40">
        
        {/* Row 1: Core Sliders (Gorgeously Rounded, Indigo accents) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-200/40 dark:border-zinc-800/40">
          {activeTab !== 'fire' ? (
            <>
              {/* Standard SIP slider */}
              {activeTab !== 'target' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-slate-555">Monthly SIP</span>
                    <div className="flex items-center gap-1 font-black text-indigo-650 dark:text-indigo-400 text-base">
                      <span>₹</span>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={startSip === 0 ? '' : startSip.toLocaleString('en-IN')}
                        onChange={(e) => {
                          const num = Number(e.target.value.replace(/[^0-9]/g, ''));
                          setStartSip(isNaN(num) ? 0 : Math.min(100000000, num));
                          setActivePreset(null);
                        }}
                        className="w-24 bg-transparent border-b border-dashed border-indigo-400 focus:border-indigo-650 outline-none text-right font-black"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" min="1000" max="500000" step="1000" 
                    value={startSip} onChange={(e) => { setStartSip(Number(e.target.value)); setActivePreset(null); }}
                    className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-pink-500 block">Target Solver Mode</label>
                  <select 
                    value={targetMode} 
                    onChange={(e) => setTargetMode(e.target.value as any)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 outline-none text-xs font-bold text-pink-650"
                  >
                    <option value="sip">Mode A: Solve Required SIP</option>
                    <option value="lumpsum">Mode B: Solve Required Lump Sum</option>
                    <option value="combo">Mode C: 50/50 Combo Split</option>
                  </select>
                </div>
              )}

              {/* Expected return slider */}
              {activeTab !== 'cagr' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-slate-555">Expected Return (CAGR)</span>
                    <div className="flex items-center gap-1 font-black text-indigo-655 dark:text-indigo-400 text-base">
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={cagr === 0 ? '' : cagr}
                        onChange={(e) => {
                          const num = Number(e.target.value.replace(/[^0-9.]/g, ''));
                          setCagr(isNaN(num) ? 0 : Math.min(100, num));
                          setActivePreset(null);
                        }}
                        className="w-12 bg-transparent border-b border-dashed border-indigo-400 focus:border-indigo-655 outline-none text-right font-black"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="5" max="30" step="1" 
                    value={cagr} onChange={(e) => { setCagr(Number(e.target.value)); setActivePreset(null); }}
                    className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">CAGR Solver Enabled</span>
                  <span className="text-xs text-slate-500 font-semibold leading-normal">System is dynamically solving for the required compounding rate.</span>
                </div>
              )}

              {/* Duration slider */}
              {activeTab !== 'years' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-slate-555">Duration (Years)</span>
                    <div className="flex items-center gap-1 font-black text-indigo-655 dark:text-indigo-400 text-base">
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={years === 0 ? '' : years}
                        onChange={(e) => {
                          const num = Number(e.target.value.replace(/[^0-9]/g, ''));
                          setYears(isNaN(num) ? 0 : Math.min(100, num));
                          setActivePreset(null);
                        }}
                        className="w-12 bg-transparent border-b border-dashed border-indigo-400 focus:border-indigo-655 outline-none text-right font-black"
                      />
                      <span>Years</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="1" max="50" step="1" 
                    value={years} onChange={(e) => { setYears(Number(e.target.value)); setActivePreset(null); }}
                    className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Duration Solver Enabled</span>
                  <span className="text-xs text-slate-500 font-semibold leading-normal">System is dynamically solving for the required compounding duration.</span>
                </div>
              )}
            </>
          ) : (
            // FIRE Calculator Sliders
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-orange-555">Current Age</span>
                  <div className="flex items-center gap-1 font-black text-orange-600 dark:text-orange-450 text-base">
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={currentAge === 0 ? '' : currentAge}
                      onChange={(e) => {
                        const num = Number(e.target.value.replace(/[^0-9]/g, ''));
                        setCurrentAge(isNaN(num) ? 0 : Math.min(100, num));
                        setActivePreset(null);
                      }}
                      className="w-12 bg-transparent border-b border-dashed border-orange-400 focus:border-orange-600 outline-none text-right font-black"
                    />
                    <span>Years</span>
                  </div>
                </div>
                <input 
                  type="range" min="18" max="75" step="1" 
                  value={currentAge} onChange={(e) => { setCurrentAge(Number(e.target.value)); setActivePreset(null); }}
                  className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-orange-555">Retirement Age</span>
                  <div className="flex items-center gap-1 font-black text-orange-600 dark:text-orange-455 text-base">
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={retirementAge === 0 ? '' : retirementAge}
                      onChange={(e) => {
                        const num = Number(e.target.value.replace(/[^0-9]/g, ''));
                        setRetirementAge(isNaN(num) ? 0 : Math.min(100, num));
                        setActivePreset(null);
                      }}
                      className="w-12 bg-transparent border-b border-dashed border-orange-400 focus:border-orange-600 outline-none text-right font-black"
                    />
                    <span>Years</span>
                  </div>
                </div>
                <input 
                  type="range" min={Math.max(25, currentAge + 1)} max="85" step="1" 
                  value={retirementAge} onChange={(e) => { setRetirementAge(Number(e.target.value)); setActivePreset(null); }}
                  className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-orange-555">Monthly Expenses</span>
                  <div className="flex items-center gap-1 font-black text-orange-600 dark:text-orange-455 text-base">
                    <span>₹</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={currentMonthlyExpenses === 0 ? '' : currentMonthlyExpenses.toLocaleString('en-IN')}
                      onChange={(e) => {
                        const num = Number(e.target.value.replace(/[^0-9]/g, ''));
                        setCurrentMonthlyExpenses(isNaN(num) ? 0 : Math.min(10000000, num));
                        setActivePreset(null);
                      }}
                      className="w-24 bg-transparent border-b border-dashed border-orange-400 focus:border-orange-600 outline-none text-right font-black"
                    />
                  </div>
                </div>
                <input 
                  type="range" min="10000" max="1000000" step="5000" 
                  value={currentMonthlyExpenses} onChange={(e) => { setCurrentMonthlyExpenses(Number(e.target.value)); setActivePreset(null); }}
                  className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </>
          )}
        </div>
        
        {/* Row 2: Standard Financial Inputs (Beautifully Spacious, Premium Grays) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8 border-b border-slate-200/40 dark:border-zinc-800/40">
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Initial Lumpsum</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={initialLumpsum === 0 ? '' : initialLumpsum} 
              onChange={(e) => { handleNumberChange(e.target.value, setInitialLumpsum, 1000000000); setActivePreset(null); }}
              onFocus={(e) => e.target.select()}
              placeholder="₹0"
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 outline-none focus:ring-2 ring-indigo-500 transition-all text-xs font-semibold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Step-Up % (Annual)</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={stepUp === 0 ? '' : stepUp} 
              onChange={(e) => { handleNumberChange(e.target.value, setStepUp, 100); setActivePreset(null); }}
              onFocus={(e) => e.target.select()}
              placeholder="10%"
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 outline-none focus:ring-2 ring-indigo-500 transition-all text-xs font-semibold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1">
              Expected Inflation (%)
            </label>
            <div className="flex gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-1">
              <input 
                type="text" 
                inputMode="numeric"
                disabled={!considerInflation}
                value={considerInflation ? (inflation === 0 ? '' : inflation) : 'OFF'} 
                onChange={(e) => handleNumberChange(e.target.value, setInflation, 50)}
                className="flex-1 bg-transparent px-3 outline-none text-xs font-semibold disabled:opacity-50"
              />
              <button 
                onClick={() => setConsiderInflation(!considerInflation)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                  considerInflation ? 'bg-orange-500 text-white shadow' : 'text-slate-400'
                }`}
              >
                Toggle
              </button>
            </div>
          </div>

          {/* Tab specific dynamic input fields */}
          {activeTab !== 'fire' ? (
            (activeTab === 'years' || activeTab === 'cagr' || activeTab === 'target') && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-purple-500">Target Corpus (₹)</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={targetGoal === 0 ? '' : targetGoal} 
                  onChange={(e) => { handleNumberChange(e.target.value, setTargetGoal, 10000000000); setActivePreset(null); }}
                  onFocus={(e) => e.target.select()}
                  placeholder="₹1,00,00,000"
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 outline-none focus:ring-2 ring-purple-500 transition-all text-xs font-bold text-purple-600 dark:text-purple-400"
                />
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-orange-500">Retirement Yield (SWR)</label>
              <select 
                value={swr} 
                onChange={(e) => { setSwr(parseFloat(e.target.value)); setActivePreset(null); }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 outline-none text-xs font-bold text-orange-600"
              >
                <option value="3.0">3.0% (Lean / Safe)</option>
                <option value="3.5">3.5% (Conservative)</option>
                <option value="4.0">4.0% (Standard FIRE)</option>
                <option value="4.5">4.5% (Aggressive)</option>
                <option value="5.0">5.0% (Fat FIRE / Yield)</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Row 3: Frequencies & Tax Rule Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* SIP Frequency Configuration */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-550">SIP Investment Frequency</label>
            <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
              {(['monthly', 'quarterly', 'yearly'] as const).map((freq) => (
                <button 
                  key={freq}
                  onClick={() => setSipFrequency(freq)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${
                    sipFrequency === freq 
                      ? 'bg-indigo-650 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Compounding Frequency Configuration */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-555">Compounding Frequency</label>
            <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
              {(['monthly', 'quarterly', 'yearly'] as const).map((freq) => (
                <button 
                  key={freq}
                  onClick={() => setCompoundingFrequency(freq)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${
                    compoundingFrequency === freq 
                      ? 'bg-indigo-650 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-655'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tax Rules Panel */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
              LTCG Tax Configurations
            </label>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4">
              <span className="text-[9px] font-black text-slate-400 uppercase">Consider Taxes</span>
              <div className="flex gap-2">
                <input 
                  type="checkbox" 
                  checked={considerTax} 
                  onChange={(e) => setConsiderTax(e.target.checked)}
                  className="w-4 h-4 accent-red-500 cursor-pointer"
                />
                {considerTax && (
                  <span className="text-[9px] font-black text-red-500">({taxRate}% LTCG)</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* FIRE Buffers and Target Corpus HUD */}
        {activeTab === 'fire' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-orange-500/5 border border-orange-500/10">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Target Safety Buffers</span>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={healthcareBuffer} 
                    onChange={(e) => setHealthcareBuffer(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  +15% Healthcare
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={emergencyBuffer} 
                    onChange={(e) => setEmergencyBuffer(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  +10% Emergency
                </label>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-550 block">Required FIRE Target Corpus</span>
              <span className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1 block">{formatINR(requiredRetirementCorpus)}</span>
            </div>
          </div>
        )}

      </div>

      {/* 🔒 100% Private Sandbox Badge */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400">
          <span className="text-xl"><Lock className="w-5 h-5 text-slate-400" /></span>
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">100% Client-Side Private Sandbox</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold leading-relaxed">All computations run locally on your device. Your financial worth asset details are never recorded or sent to any server.</p>
          </div>
        </div>
        <div className="shrink-0 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider rounded-xl">
          Zero Server-Data Logs
        </div>
      </div>

    </section>
  );
};
