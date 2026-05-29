'use client';

import React, { useState } from 'react';
import { DollarSign, ShieldAlert, TrendingUp, Sparkles, Scale, Info } from 'lucide-react';

export default function PlaybookPage() {
  // Compounding Inputs
  const [initialInvestment, setInitialInvestment] = useState('100000');
  const [monthlySip, setMonthlySip] = useState('10000');
  const [stepUpPercent, setStepUpPercent] = useState('10');
  const [cagr, setCagr] = useState('15');
  const [inflation, setInflation] = useState('6');
  const [years, setYears] = useState('15');

  // Parse values
  const P = parseFloat(initialInvestment) || 0;
  const S = parseFloat(monthlySip) || 0;
  const stepUp = (parseFloat(stepUpPercent) || 0) / 100;
  const rate = (parseFloat(cagr) || 0) / 100;
  const inflRate = (parseFloat(inflation) || 0) / 100;
  const n = parseInt(years, 10) || 1;

  // Compute compound interest year by year with annual step-up on SIP
  let totalInvested = P;
  let futureValue = P;
  let currentMonthlySip = S;

  for (let year = 1; year <= n; year++) {
    // Grow existing balance for the year (CAGR)
    futureValue = futureValue * (1 + rate);
    
    // Add monthly SIP contributions during this year and compound them
    let yearlySipInvested = 0;
    for (let month = 1; month <= 12; month++) {
      const monthsRemaining = 12 - month + 1;
      // SIP compounded monthly for the remaining months in the year
      const sipContribution = currentMonthlySip;
      const compoundedSip = sipContribution * Math.pow(1 + rate / 12, monthsRemaining);
      futureValue += compoundedSip;
      yearlySipInvested += sipContribution;
    }
    
    totalInvested += yearlySipInvested;
    // Step up SIP for the next year
    currentMonthlySip = currentMonthlySip * (1 + stepUp);
  }

  // Inflation adjusted future value
  const realValue = futureValue / Math.pow(1 + inflRate, n);

  // Capital Gains Tax Estimator (latest Indian union budget)
  const gains = futureValue - totalInvested;
  
  let stcgTax = 0;
  let ltcgTax = 0;
  let afterTaxWealth = futureValue;

  if (n < 1) {
    // Short term holding: flat 20% on all gains
    stcgTax = Math.max(0, gains * 0.20);
    afterTaxWealth = futureValue - stcgTax;
  } else {
    // Long term holding: flat 12.5% on gains exceeding ₹1.25L exemption threshold
    const taxableGains = Math.max(0, gains - 125000);
    ltcgTax = taxableGains * 0.125;
    afterTaxWealth = futureValue - ltcgTax;
  }

  return (
    <div className="min-h-screen bg-slate-55 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Compounding Playbook & Goal Architect
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate advanced step-up SIP curves, index inflation, and compute exact after-tax wealth models.
          </p>
        </div>

        {/* Dynamic Sandbox Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Inputs Cockpit */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-5">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              🎛️ Sandbox Controls
            </h2>

            <div className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1">Initial Lumpsum Capital (₹)</label>
                <input
                  type="number"
                  value={initialInvestment}
                  onChange={(e) => setInitialInvestment(e.target.value)}
                  className="w-full text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block uppercase mb-1">Starting Monthly SIP (₹)</label>
                <input
                  type="number"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(e.target.value)}
                  className="w-full text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block uppercase mb-1">Annual SIP Step-Up (%)</label>
                <input
                  type="number"
                  value={stepUpPercent}
                  onChange={(e) => setStepUpPercent(e.target.value)}
                  className="w-full text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase mb-1">Expected CAGR (%)</label>
                  <input
                    type="number"
                    value={cagr}
                    onChange={(e) => setCagr(e.target.value)}
                    className="w-full text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1">Avg Inflation (%)</label>
                  <input
                    type="number"
                    value={inflation}
                    onChange={(e) => setInflation(e.target.value)}
                    className="w-full text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1">Duration Horizon (Years)</label>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[10px] text-blue-500 block text-right font-black mt-1">{years} Years</span>
              </div>
            </div>
          </div>

          {/* Results Analytics Ledger */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual compounding cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Principal Outlay</span>
                <div className="text-xl font-black mt-2">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-[10px] text-slate-500 mt-1">Cumulative cost basis</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Compounded Valuation</span>
                <div className="text-xl font-black mt-2 text-blue-500">₹{futureValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-[10px] text-slate-500 mt-1">Grows to these nominal terms</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Purchasing Power Value</span>
                <div className="text-xl font-black mt-2 text-green-500">₹{realValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="text-[10px] text-slate-500 mt-1">Inflation adjusted purchasing base</p>
              </div>
            </div>

            {/* Indian Capital Gains Tax Ledger */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-500" /> Indian Union Budget Capital Gains Tax
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tax Calculations */}
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between text-xs font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-slate-400">Total Unrealized Gains</span>
                    <span className="text-slate-800 dark:text-slate-200">₹{gains.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  
                  {n >= 1 ? (
                    <>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">LTCG Tax Exemption Limit</span>
                        <span className="text-emerald-500">- ₹1,25,000</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-slate-400">Taxable Profits</span>
                        <span className="text-slate-800 dark:text-slate-200">₹{Math.max(0, gains - 125000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-red-500">
                        <span>LTCG Tax Obligation (12.5%)</span>
                        <span>₹{ltcgTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-xs font-black text-red-500">
                      <span>STCG Tax Obligation (20%)</span>
                      <span>₹{stcgTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between text-sm font-black">
                    <span className="text-blue-500">After-Tax Net Wealth</span>
                    <span className="text-green-500">₹{afterTaxWealth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Tax Informational Rules */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-500 uppercase tracking-wider">
                      <Info className="w-4 h-4" /> Latest Union Budget Rules
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                      Equity asset tax rates have been updated to reflect current regulations:
                      <span className="block mt-1">• **LTCG**: Increased from 10% to 12.5% on holding horizons exceeding 12 months. Tax exemption raised from ₹1 Lakh to ₹1.25 Lakh.</span>
                      <span className="block mt-1">• **STCG**: Increased from 15% to 20% flat on holding horizons under 12 months.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
