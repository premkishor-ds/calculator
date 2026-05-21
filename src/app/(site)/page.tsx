"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { calculateScenario, getSummary } from '@/utils/calculations';
import { Header, QuickStart } from '@/components/Header';
import { Controls } from '@/components/Controls';
import { SummaryCards, ExecutiveSummary, WealthChart } from '@/components/WealthVisuals';
import { ComparisonMatrix, DetailedLedger } from '@/components/Tables';
import { KnowledgeBase } from '@/components/KnowledgeBase';

function WealthDashboardContent() {
  const searchParams = useSearchParams();

  // State
  const [initialLumpsum, setInitialLumpsum] = useState(0);
  const [startSip, setStartSip] = useState(30000);
  const [stepUp, setStepUp] = useState(20);
  const [cagr, setCagr] = useState(25);
  const [years, setYears] = useState(12);
  const [inflation, setInflation] = useState(6);
  const [targetGoal, setTargetGoal] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Extract from query parameters on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const qLumpsum = searchParams.get('lumpsum');
      const qSip = searchParams.get('sip');
      const qStepUp = searchParams.get('stepup');
      const qCagr = searchParams.get('cagr');
      const qYears = searchParams.get('years');
      const qInflation = searchParams.get('inflation');
      const qSymbol = searchParams.get('symbol');

      if (qLumpsum) setInitialLumpsum(Math.max(0, parseInt(qLumpsum)));
      if (qSip) setStartSip(Math.max(0, parseInt(qSip)));
      if (qStepUp) setStepUp(Math.min(100, Math.max(0, parseInt(qStepUp))));
      if (qCagr) setCagr(Math.min(100, Math.max(1, parseInt(qCagr))));
      if (qYears) setYears(Math.min(50, Math.max(1, parseInt(qYears))));
      if (qInflation) setInflation(Math.min(20, Math.max(0, parseInt(qInflation))));
      if (qSymbol) setSelectedSymbol(qSymbol);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const resetAll = () => {
    setInitialLumpsum(0);
    setStartSip(30000);
    setStepUp(20);
    setCagr(25);
    setYears(12);
    setInflation(6);
    setTargetGoal('');
    setSelectedSymbol('');
  };

  // Load theme after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme = savedTheme || (isSystemDark ? 'dark' : 'light');

      setTheme(currentTheme);
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize when the theme changes externally
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<'dark' | 'light'>;
      setTheme(customEvent.detail);
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  // Logic
  const ledger = useMemo(() => 
    calculateScenario(initialLumpsum, startSip, stepUp / 100, cagr / 100, years, inflation),
    [initialLumpsum, startSip, stepUp, cagr, years, inflation]
  );

  const totalInvested = useMemo(() => 
    initialLumpsum + ledger.reduce((acc, curr) => acc + curr.sip, 0),
    [initialLumpsum, ledger]
  );

  const summary = useMemo(() => getSummary(ledger, totalInvested), [ledger, totalInvested]);

  const chartData = useMemo(() => {
    return ledger
      .filter((m) => m.month === 1 || m.month % 6 === 0 || m.month === ledger.length)
      .map((m) => ({
        name: `M${m.month}`,
        year: `Year ${m.year}`,
        balance: Math.round(m.closingBalance),
        realValue: Math.round(m.inflationAdjusted),
        invested: Math.round(initialLumpsum + ledger.slice(0, m.month).reduce((acc, curr) => acc + curr.sip, 0)),
      }));
  }, [ledger, initialLumpsum]);

  const matrix = useMemo(() => {
    const stepOptions = [10, 15, 20];
    const cagrOptions = [15, 18, 20, 22, 25];
    return stepOptions.map(s => ({
      step: s,
      results: cagrOptions.map(c => {
        const res = calculateScenario(initialLumpsum, startSip, s / 100, c / 100, years, inflation);
        const final = res[res.length - 1].closingBalance;
        return {
          cagr: c,
          corpus: final,
          swp6: (final * 0.06) / 12,
          isSelected: s === stepUp && c === cagr
        };
      })
    }));
  }, [initialLumpsum, startSip, years, stepUp, cagr, inflation]);

  const handleReverseSip = (val: string) => {
    setTargetGoal(val);
    const target = parseFloat(val);
    if (target > 0) {
      const multiplierRes = calculateScenario(0, 1, stepUp / 100, cagr / 100, years, inflation);
      const finalMultiplier = multiplierRes[multiplierRes.length - 1].closingBalance;
      const remainingTarget = Math.max(0, target - (initialLumpsum * Math.pow(1 + (cagr / 100), years)));
      setStartSip(Math.ceil(remainingTarget / finalMultiplier));
    }
  };

  const handleSharePlan = () => {
    if (typeof window === 'undefined') return;
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/?lumpsum=${initialLumpsum}&sip=${startSip}&stepup=${stepUp}&cagr=${cagr}&years=${years}&inflation=${inflation}${selectedSymbol ? `&symbol=${selectedSymbol}` : ''}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-8 sm:py-12 max-w-[1600px] mx-auto min-w-0">
        
        <Header theme={theme} toggleTheme={toggleTheme} />
        <QuickStart />

        {/* Global Action HUD */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          {selectedSymbol ? (
            <div className="px-5 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-2xl flex items-center gap-3">
              <span>🔮 Preloaded fundamentals for {selectedSymbol} (₹{initialLumpsum.toLocaleString('en-IN')} @ {cagr}% CAGR)</span>
              <button onClick={() => setSelectedSymbol('')} className="text-[9px] bg-blue-500/20 hover:bg-blue-500/30 px-2 py-0.5 rounded-lg uppercase transition-colors">Clear</button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
              Compound Intelligence Terminal
            </div>
          )}

          <button
            onClick={handleSharePlan}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-2xl text-xs font-bold transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800"
          >
            {copied ? '✓ Share Link Copied!' : '📋 Share Compounding Plan'}
          </button>
        </div>

        <Controls 
          initialLumpsum={initialLumpsum} setInitialLumpsum={setInitialLumpsum}
          startSip={startSip} setStartSip={setStartSip}
          stepUp={stepUp} setStepUp={setStepUp}
          cagr={cagr} setCagr={setCagr}
          years={years} setYears={setYears}
          inflation={inflation} setInflation={setInflation}
          targetGoal={targetGoal} handleReverseSip={handleReverseSip}
          resetAll={resetAll}
        />

        <SummaryCards summary={summary} inflation={inflation} years={years} chartData={chartData} theme={theme} />
        <ExecutiveSummary summary={summary} inflation={inflation} years={years} chartData={chartData} theme={theme} />
        <WealthChart summary={summary} inflation={inflation} years={years} chartData={chartData} theme={theme} />
        
        <ComparisonMatrix matrix={matrix} years={years} />
        <DetailedLedger ledger={ledger} years={years} />
        
        <KnowledgeBase />

      </div>
    </div>
  );
}

export default function WealthDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Initializing Wealth Cockpit...</div>
      </div>
    }>
      <WealthDashboardContent />
    </Suspense>
  );
}
