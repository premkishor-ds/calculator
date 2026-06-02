import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Lock, RefreshCw, Layers } from 'lucide-react';
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

  const [showAdvanced, setShowAdvanced] = useState(false);

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
      
      {/* 🧭 Master Calculator Mode Tab Switcher */}
      <div className="flex border-b border-slate-150 dark:border-slate-800 mb-6 sm:mb-8 overflow-x-auto gap-2 scrollbar-none">
        <button 
          onClick={() => setActiveTab('corpus')} 
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'corpus' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          💰 Corpus Calculator
        </button>
        <button 
          onClick={() => setActiveTab('years')} 
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'years' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          🕒 Years Calculator
        </button>
        <button 
          onClick={() => setActiveTab('cagr')} 
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'cagr' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          📈 CAGR Calculator
        </button>
        <button 
          onClick={() => setActiveTab('target')} 
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'target' ? 'border-pink-500 text-pink-500' : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          🎯 Target Solver
        </button>
        <button 
          onClick={() => setActiveTab('fire')} 
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'fire' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          🔥 FIRE Calculator
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          {activeTab === 'corpus' && 'Corpus Modeling Parameters'}
          {activeTab === 'years' && 'Years Destination Parameters'}
          {activeTab === 'cagr' && 'Returns Requirement Configuration'}
          {activeTab === 'target' && 'Required Investment Solver'}
          {activeTab === 'fire' && 'FIRE early Retirement Parameters'}
        </h3>
        <button 
          onClick={resetAll}
          className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center gap-1.5 touch-manipulation"
        >
          <RefreshCw className="w-3 h-3" />
          Reset Configs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Core Inputs Section */}
        <div className="space-y-8">
          {activeTab !== 'fire' ? (
            <>
              {/* Standard SIP slider */}
              {activeTab !== 'target' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                      Monthly SIP <span title="Monthly savings contribution."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
                    </label>
                    <span className="text-lg font-bold text-blue-600 dark:text-cyan-400">{formatINR(startSip)}</span>
                  </div>
                  <input 
                    type="range" min="1000" max="500000" step="1000" 
                    value={startSip} onChange={(e) => setStartSip(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}

              {/* Expected return slider */}
              {activeTab !== 'cagr' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                      Expected Return % <span title="Expected Annual CAGR percentage."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
                    </label>
                    <span className="text-lg font-bold text-blue-600 dark:text-cyan-400">{cagr}%</span>
                  </div>
                  <input 
                    type="range" min="5" max="30" step="1" 
                    value={cagr} onChange={(e) => setCagr(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}

              {/* Tenure slider */}
              {activeTab !== 'years' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                      Investment Duration <span title="Target time period in years."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
                    </label>
                    <span className="text-lg font-bold text-blue-600 dark:text-cyan-400">{years} Years</span>
                  </div>
                  <input 
                    type="range" min="1" max="50" step="1" 
                    value={years} onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}
            </>
          ) : (
            // FIRE CALCULATOR CORE SLIDERS
            <>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                    Current Age <span title="Your current age."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
                  </label>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{currentAge} Years</span>
                </div>
                <input 
                  type="range" min="18" max="75" step="1" 
                  value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                    Retirement Age <span title="Target early retirement age."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
                  </label>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{retirementAge} Years</span>
                </div>
                <input 
                  type="range" min={Math.max(25, currentAge + 1)} max="85" step="1" 
                  value={retirementAge} onChange={(e) => setRetirementAge(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                    Current Monthly Expenses <span title="Your current typical monthly living budget."><HelpCircle className="w-3 h-3 cursor-help text-slate-400" /></span>
                  </label>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatINR(currentMonthlyExpenses)}</span>
                </div>
                <input 
                  type="range" min="10000" max="1000000" step="5000" 
                  value={currentMonthlyExpenses} onChange={(e) => setCurrentMonthlyExpenses(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Input Parameters Fields Box */}
        <div className="flex flex-col justify-between p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {activeTab !== 'fire' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Initial Lumpsum</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={initialLumpsum === 0 ? '' : initialLumpsum} 
                    onChange={(e) => handleNumberChange(e.target.value, setInitialLumpsum, 1000000000)}
                    onFocus={(e) => e.target.select()}
                    placeholder="₹0"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Step-Up % (Annual)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={stepUp === 0 ? '' : stepUp} 
                    onChange={(e) => handleNumberChange(e.target.value, setStepUp, 100)}
                    onFocus={(e) => e.target.select()}
                    placeholder="10%"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
                  />
                </div>

                {/* Target Corpus for CAGR and Years Solver */}
                {(activeTab === 'years' || activeTab === 'cagr') && (
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-purple-500">Target Corpus (₹)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={targetGoal === 0 ? '' : targetGoal} 
                      onChange={(e) => handleNumberChange(e.target.value, setTargetGoal, 10000000000)}
                      onFocus={(e) => e.target.select()}
                      placeholder="e.g. ₹1,00,00,000"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-purple-500 transition-all text-sm font-bold text-purple-600 dark:text-purple-400"
                    />
                  </div>
                )}

                {/* Mode Selector for Target Solver */}
                {activeTab === 'target' && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-pink-500">Target Solver Mode</label>
                      <select 
                        value={targetMode} 
                        onChange={(e) => setTargetMode(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none text-xs font-bold text-pink-600 dark:text-pink-400"
                      >
                        <option value="sip">Mode A: Solve Required SIP</option>
                        <option value="lumpsum">Mode B: Solve Required Lump Sum</option>
                        <option value="combo">Mode C: 50/50 Combo Split</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-pink-500">Target Corpus (₹)</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={targetGoal === 0 ? '' : targetGoal} 
                        onChange={(e) => handleNumberChange(e.target.value, setTargetGoal, 10000000000)}
                        onFocus={(e) => e.target.select()}
                        placeholder="₹5,00,00,000"
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-pink-500 transition-all text-sm font-bold text-pink-600 dark:text-pink-400"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              // FIRE CALCULATOR SPECIFIC CONFIGS
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Current Investments</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={initialLumpsum === 0 ? '' : initialLumpsum} 
                    onChange={(e) => handleNumberChange(e.target.value, setInitialLumpsum, 1000000000)}
                    onFocus={(e) => e.target.select()}
                    placeholder="₹0"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Monthly Savings (SIP)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={startSip === 0 ? '' : startSip} 
                    onChange={(e) => handleNumberChange(e.target.value, setStartSip, 1000000)}
                    onFocus={(e) => e.target.select()}
                    placeholder="₹10,000"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Savings Step-Up %</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={stepUp === 0 ? '' : stepUp} 
                    onChange={(e) => handleNumberChange(e.target.value, setStepUp, 100)}
                    onFocus={(e) => e.target.select()}
                    placeholder="10%"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                    Safe Withdrawal Rate (SWR)
                  </label>
                  <select 
                    value={swr} 
                    onChange={(e) => setSwr(parseFloat(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none text-xs font-bold text-orange-600 dark:text-orange-400"
                  >
                    <option value="3.0">3.0% (Ultra Conservative)</option>
                    <option value="3.5">3.5% (Conservative)</option>
                    <option value="4.0">4.0% (Standard FIRE Preset)</option>
                    <option value="4.5">4.5% (Aggressive)</option>
                    <option value="5.0">5.0% (High Withdrawal)</option>
                  </select>
                </div>

                {/* Extra Buffer settings for FIRE tab */}
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500">Target Safety Buffers</span>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={healthcareBuffer} 
                        onChange={(e) => setHealthcareBuffer(e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      +15% Healthcare Buffer
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emergencyBuffer} 
                        onChange={(e) => setEmergencyBuffer(e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      +10% Emergency Buffer
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Standard Inflation Switch */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                Expected Inflation (%)
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  inputMode="numeric"
                  disabled={!considerInflation}
                  value={considerInflation ? (inflation === 0 ? '' : inflation) : 'Disabled'} 
                  onChange={(e) => handleNumberChange(e.target.value, setInflation, 50)}
                  onFocus={(e) => e.target.select()}
                  placeholder="6%"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 ring-orange-500 transition-all text-sm font-semibold disabled:opacity-50"
                />
                <button 
                  onClick={() => setConsiderInflation(!considerInflation)}
                  className={`px-4 rounded-xl text-xs font-bold uppercase border transition-all ${
                    considerInflation 
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-600' 
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  {considerInflation ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ⚙️ Expandable Advanced configurations Panel */}
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-4">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced Calculator Configuration Settings
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 animate-slideDown">
            
            {/* SIP Frequency Configuration */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                SIP Frequency
              </label>
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                {(['monthly', 'quarterly', 'yearly'] as const).map((freq) => (
                  <button 
                    key={freq}
                    onClick={() => setSipFrequency(freq)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
                      sipFrequency === freq 
                        ? 'bg-blue-500 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Compounding Frequency Configuration */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                Compounding Frequency
              </label>
              <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                {(['monthly', 'quarterly', 'yearly'] as const).map((freq) => (
                  <button 
                    key={freq}
                    onClick={() => setCompoundingFrequency(freq)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
                      compoundingFrequency === freq 
                        ? 'bg-blue-500 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tax Rules Panel */}
            <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                LTCG Tax Configurations
              </label>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>CONSIDER LTCG TAX</span>
                  <input 
                    type="checkbox" 
                    checked={considerTax} 
                    onChange={(e) => setConsiderTax(e.target.checked)}
                    className="w-4 h-4 accent-red-500 cursor-pointer"
                  />
                </div>
                {considerTax && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-slate-455">TAX RATE %</span>
                      <input 
                        type="number" 
                        value={taxRate} 
                        onChange={(e) => setTaxRate(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1.5 outline-none font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-slate-455">EXEMPTION LIMIT</span>
                      <input 
                        type="number" 
                        value={taxExemption} 
                        onChange={(e) => setTaxExemption(Math.max(0, parseInt(e.target.value) || 0))}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1.5 outline-none font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 🔒 100% Private Sandbox Badge */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="text-xl"><Lock className="w-5 h-5 text-slate-400" /></span>
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">100% Client-Side Private Sandbox</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">All computations run locally on your device. Your financial worth asset details are never recorded or sent to any server.</p>
          </div>
        </div>
        <div className="shrink-0 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider rounded-xl">
          Zero Server-Data Logs
        </div>
      </div>

    </section>
  );
};
