"use client";

import dynamicImport from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useDeferredValue,useEffect, useMemo, useState } from 'react';

import { Controls } from '@/components/Controls';
import { Header, QuickStart } from '@/components/Header';
import { CapitalComposition, ExecutiveSummary, FIREResults,GoalMilestones, SummaryCards } from '@/components/WealthVisuals';
import { calculateScenario, getSummary } from '@/utils/calculations';
import { calculateFIRE,solveRequiredCAGR, solveRequiredYears, solveTargetSIPCombo } from '@/utils/solvers';

const WealthChart = dynamicImport(() => import('@/components/WealthVisuals').then(m => m.WealthChart), { 
  ssr: false, 
  loading: () => <div className="w-full h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
});

const ComparisonMatrix = dynamicImport(() => import('@/components/Tables').then(m => m.ComparisonMatrix), { 
  ssr: false,
  loading: () => <div className="w-full h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
});

const DetailedLedger = dynamicImport(() => import('@/components/Tables').then(m => m.DetailedLedger), { 
  ssr: false,
  loading: () => <div className="w-full h-60 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
});

const KnowledgeBase = dynamicImport(() => import('@/components/KnowledgeBase').then(m => m.KnowledgeBase), { 
  ssr: false 
});

function WealthDashboardContent() {
  const searchParams = useSearchParams();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'corpus' | 'years' | 'cagr' | 'target' | 'fire'>('corpus');

  // Input states
  const [initialLumpsum, setInitialLumpsum] = useState(0);
  const [startSip, setStartSip] = useState(10000);
  const [stepUp, setStepUp] = useState(10);
  const [cagr, setCagr] = useState(12);
  const [years, setYears] = useState(15);
  const [inflation, setInflation] = useState(6);
  const [considerInflation, setConsiderInflation] = useState(true);
  
  // Advanced configs
  const [sipFrequency, setSipFrequency] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [compoundingFrequency, setCompoundingFrequency] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [considerTax, setConsiderTax] = useState(true);
  const [taxRate, setTaxRate] = useState(12.5);
  const [taxExemption, setTaxExemption] = useState(125000);
  
  // Tab-specific parameters
  const [targetGoal, setTargetGoal] = useState<number>(10000000); // Default 1 Crore target
  const [targetMode, setTargetMode] = useState<'sip' | 'lumpsum' | 'combo'>('sip');

  // FIRE Calculator States
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(50);
  const [currentMonthlyExpenses, setCurrentMonthlyExpenses] = useState(50000);
  const [swr, setSwr] = useState(4.0);
  const [healthcareBuffer, setHealthcareBuffer] = useState(true);
  const [emergencyBuffer, setEmergencyBuffer] = useState(true);

  // Common UI States
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Extract from query parameters or localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const qLumpsum = searchParams.get('lumpsum');
      const qSip = searchParams.get('sip');
      const qStepUp = searchParams.get('stepup');
      const qCagr = searchParams.get('cagr');
      const qYears = searchParams.get('years');
      const qInflation = searchParams.get('inflation');
      const qSymbol = searchParams.get('symbol');

      if (qLumpsum) {
        setInitialLumpsum(Math.max(0, parseInt(qLumpsum)));
      } else {
        const stored = localStorage.getItem('wealth_initialLumpsum');
        if (stored) setInitialLumpsum(Math.max(0, parseInt(stored)));
      }

      if (qSip) {
        setStartSip(Math.max(0, parseInt(qSip)));
      } else {
        const stored = localStorage.getItem('wealth_startSip');
        if (stored) setStartSip(Math.max(0, parseInt(stored)));
      }

      if (qStepUp) {
        setStepUp(Math.min(100, Math.max(0, parseInt(qStepUp))));
      } else {
        const stored = localStorage.getItem('wealth_stepUp');
        if (stored) setStepUp(Math.min(100, Math.max(0, parseInt(stored))));
      }

      if (qCagr) {
        setCagr(Math.min(100, Math.max(1, parseInt(qCagr))));
      } else {
        const stored = localStorage.getItem('wealth_cagr');
        if (stored) setCagr(Math.min(100, Math.max(1, parseInt(stored))));
      }

      if (qYears) {
        setYears(Math.min(50, Math.max(1, parseInt(qYears))));
      } else {
        const stored = localStorage.getItem('wealth_years');
        if (stored) setYears(Math.min(50, Math.max(1, parseInt(stored))));
      }

      if (qInflation) {
        setInflation(Math.min(20, Math.max(0, parseInt(qInflation))));
      } else {
        const stored = localStorage.getItem('wealth_inflation');
        if (stored) setInflation(Math.min(20, Math.max(0, parseInt(stored))));
      }

      if (qSymbol) setSelectedSymbol(qSymbol);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Synchronise parameters state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wealth_initialLumpsum', String(initialLumpsum));
      localStorage.setItem('wealth_startSip', String(startSip));
      localStorage.setItem('wealth_stepUp', String(stepUp));
      localStorage.setItem('wealth_cagr', String(cagr));
      localStorage.setItem('wealth_years', String(years));
      localStorage.setItem('wealth_inflation', String(inflation));
    } catch {}
  }, [initialLumpsum, startSip, stepUp, cagr, years, inflation]);

  const resetAll = () => {
    setInitialLumpsum(0);
    setStartSip(10000);
    setStepUp(10);
    setCagr(12);
    setYears(15);
    setInflation(6);
    setConsiderInflation(true);
    setSipFrequency('monthly');
    setCompoundingFrequency('monthly');
    setConsiderTax(true);
    setTaxRate(12.5);
    setTaxExemption(125000);
    setActiveTab('corpus');
    setTargetGoal(10000000);
    setTargetMode('sip');
    setCurrentAge(30);
    setRetirementAge(50);
    setCurrentMonthlyExpenses(50000);
    setSwr(4.0);
    setHealthcareBuffer(true);
    setEmergencyBuffer(true);
    setSelectedSymbol('');
    try {
      localStorage.removeItem('wealth_initialLumpsum');
      localStorage.removeItem('wealth_startSip');
      localStorage.removeItem('wealth_stepUp');
      localStorage.removeItem('wealth_cagr');
      localStorage.removeItem('wealth_years');
      localStorage.removeItem('wealth_inflation');
    } catch {}
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

  // Deferring States for High Performance Calculation Debouncing
  const dLumpsum = useDeferredValue(initialLumpsum);
  const dSip = useDeferredValue(startSip);
  const dStepUp = useDeferredValue(stepUp);
  const dCagr = useDeferredValue(cagr);
  const dYears = useDeferredValue(years);
  const dInflation = useDeferredValue(inflation);
  const dConsiderInflation = useDeferredValue(considerInflation);
  const dSipFrequency = useDeferredValue(sipFrequency);
  const dCompoundingFrequency = useDeferredValue(compoundingFrequency);
  const dConsiderTax = useDeferredValue(considerTax);
  const dTaxRate = useDeferredValue(taxRate);
  const dTaxExemption = useDeferredValue(taxExemption);
  
  const dTargetGoal = useDeferredValue(targetGoal);
  const dTargetMode = useDeferredValue(targetMode);

  // Dynamic Routing Calculations based on the active tab mode
  const solvedParameters = useMemo(() => {
    let activeYears = dYears;
    let activeCagr = dCagr;
    let activeSip = dSip;
    let activeLumpsum = dLumpsum;

    if (activeTab === 'years') {
      const yearsSolution = solveRequiredYears(
        dTargetGoal, dLumpsum, dSip, dStepUp / 100, dCagr / 100, dInflation,
        dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation
      );
      activeYears = Math.max(1, yearsSolution.years);
    } else if (activeTab === 'cagr') {
      const cagrSolution = solveRequiredCAGR(
        dTargetGoal, dLumpsum, dSip, dStepUp / 100, dYears, dInflation,
        dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation
      );
      activeCagr = cagrSolution;
    } else if (activeTab === 'target') {
      const comboSolution = solveTargetSIPCombo(
        dTargetMode, dTargetGoal, dYears, dCagr / 100, dLumpsum, dSip, dStepUp / 100, dInflation,
        dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation
      );
      activeSip = comboSolution.requiredSip;
      activeLumpsum = comboSolution.requiredLumpsum;
    } else if (activeTab === 'fire') {
      activeYears = Math.max(1, retirementAge - currentAge);
    }

    return {
      activeYears,
      activeCagr,
      activeSip,
      activeLumpsum
    };
  }, [activeTab, dYears, dCagr, dSip, dLumpsum, dTargetGoal, dTargetMode, dStepUp, dInflation, dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation, currentAge, retirementAge]);

  // Compounding Projections Logic
  const ledger = useMemo(() => 
    calculateScenario(
      solvedParameters.activeLumpsum, 
      solvedParameters.activeSip, 
      dStepUp / 100, 
      solvedParameters.activeCagr / 100, 
      solvedParameters.activeYears, 
      dInflation,
      dSipFrequency, 
      dCompoundingFrequency, 
      dConsiderTax, 
      dTaxRate, 
      dTaxExemption, 
      dConsiderInflation
    ),
    [solvedParameters, dStepUp, dInflation, dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation]
  );

  const totalInvested = useMemo(() => {
    if (ledger.length === 0) return solvedParameters.activeLumpsum;
    return ledger[ledger.length - 1].investedTillDate;
  }, [ledger, solvedParameters]);

  const summary = useMemo(() => 
    getSummary(
      ledger, totalInvested, solvedParameters.activeLumpsum, dConsiderTax, dTaxRate, dTaxExemption, 
      dConsiderInflation, dInflation, solvedParameters.activeCagr, solvedParameters.activeYears
    ), 
    [ledger, totalInvested, solvedParameters, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation, dInflation]
  );

  // Special retirement calculations for FIRE
  const fireSummary = useMemo(() => {
    if (activeTab !== 'fire') return null;
    return calculateFIRE(
      currentAge, retirementAge, currentMonthlyExpenses, dInflation, dCagr, swr, 
      dLumpsum, dSip, dStepUp, dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation,
      healthcareBuffer, emergencyBuffer
    );
  }, [activeTab, currentAge, retirementAge, currentMonthlyExpenses, dInflation, dCagr, swr, dLumpsum, dSip, dStepUp, dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation, healthcareBuffer, emergencyBuffer]);

  const chartData = useMemo(() => {
    return ledger
      .filter((m) => m.month === 1 || m.month % 6 === 0 || m.month === ledger.length)
      .map((m) => {
        const sliceEnd = m.month;
        const totalInvestedAtMonth = ledger[sliceEnd - 1]?.investedTillDate || solvedParameters.activeLumpsum;
        const currentBalance = m.closingBalance;
        
        const gains = Math.max(0, currentBalance - totalInvestedAtMonth);
        const taxableGains = Math.max(0, gains - dTaxExemption);
        const tax = dConsiderTax ? taxableGains * (dTaxRate / 100) : 0;
        
        return {
          name: `M${m.month}`,
          year: `Year ${m.year}`,
          balance: Math.round(currentBalance),
          realValue: Math.round(m.inflationAdjusted),
          invested: Math.round(totalInvestedAtMonth),
          afterTax: Math.round(currentBalance - tax)
        };
      });
  }, [ledger, solvedParameters, dConsiderTax, dTaxRate, dTaxExemption]);

  const matrix = useMemo(() => {
    const stepOptions = [10, 15, 20];
    const cagrOptions = [15, 18, 20, 22, 25];
    return stepOptions.map(s => ({
      step: s,
      results: cagrOptions.map(c => {
        const res = calculateScenario(
          solvedParameters.activeLumpsum, solvedParameters.activeSip, s / 100, c / 100, solvedParameters.activeYears, dInflation,
          dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation
        );
        const final = res[res.length - 1]?.closingBalance || 0;
        const totalInv = res[res.length - 1]?.investedTillDate || solvedParameters.activeLumpsum;
        
        const gains = Math.max(0, final - totalInv);
        const taxableGains = Math.max(0, gains - dTaxExemption);
        const tax = dConsiderTax ? taxableGains * (dTaxRate / 100) : 0;
        const postTax = final - tax;

        return {
          cagr: c,
          corpus: postTax,
          swp6: (postTax * 0.06) / 12,
          isSelected: s === stepUp && c === cagr
        };
      })
    }));
  }, [solvedParameters, stepUp, cagr, dInflation, dSipFrequency, dCompoundingFrequency, dConsiderTax, dTaxRate, dTaxExemption, dConsiderInflation]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans animate-fadeIn">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-8 sm:py-12 max-w-[1600px] mx-auto min-w-0">
        
        <Header />
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
          activeTab={activeTab} setActiveTab={setActiveTab}
          initialLumpsum={initialLumpsum} setInitialLumpsum={setInitialLumpsum}
          startSip={startSip} setStartSip={setStartSip}
          stepUp={stepUp} setStepUp={setStepUp}
          cagr={cagr} setCagr={setCagr}
          years={years} setYears={setYears}
          inflation={inflation} setInflation={setInflation}
          considerInflation={considerInflation} setConsiderInflation={setConsiderInflation}
          sipFrequency={sipFrequency} setSipFrequency={setSipFrequency}
          compoundingFrequency={compoundingFrequency} setCompoundingFrequency={setCompoundingFrequency}
          considerTax={considerTax} setConsiderTax={setConsiderTax}
          taxRate={taxRate} setTaxRate={setTaxRate}
          taxExemption={taxExemption} setTaxExemption={setTaxExemption}
          targetGoal={targetGoal} setTargetGoal={setTargetGoal}
          targetMode={targetMode} setTargetMode={setTargetMode}
          currentAge={currentAge} setCurrentAge={setCurrentAge}
          retirementAge={retirementAge} setRetirementAge={setRetirementAge}
          currentMonthlyExpenses={currentMonthlyExpenses} setCurrentMonthlyExpenses={setCurrentMonthlyExpenses}
          swr={swr} setSwr={setSwr}
          healthcareBuffer={healthcareBuffer} setHealthcareBuffer={setHealthcareBuffer}
          emergencyBuffer={emergencyBuffer} setEmergencyBuffer={setEmergencyBuffer}
          resetAll={resetAll}
        />

        {activeTab !== 'fire' ? (
          <>
            <SummaryCards summary={summary} inflation={inflation} years={solvedParameters.activeYears} chartData={chartData} theme={theme} />
            <ExecutiveSummary summary={summary} inflation={inflation} years={solvedParameters.activeYears} chartData={chartData} theme={theme} />
            <CapitalComposition summary={summary} theme={theme} />
            <WealthChart summary={summary} inflation={inflation} years={solvedParameters.activeYears} chartData={chartData} theme={theme} />
            <GoalMilestones ledger={ledger} />
          </>
        ) : (
          fireSummary && (
            <>
              <FIREResults summary={fireSummary} inflation={inflation} swr={swr} />
              <WealthChart summary={summary} inflation={inflation} years={solvedParameters.activeYears} chartData={chartData} theme={theme} />
            </>
          )
        )}
        
        <ComparisonMatrix matrix={matrix} years={solvedParameters.activeYears} />
        <DetailedLedger ledger={ledger} years={solvedParameters.activeYears} />
        
        {/* 🧠 GEO & Conversational AI Reference: How Worth is Calculated */}
        <section className="my-12 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
            How is Website and Personal Worth Calculated?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            This dashboard uses strict mathematical formulas to project your future corpus and purchasing power. Modern search engines and AI advisors rely on these standardized models to evaluate compounding efficiency.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-600 dark:text-slate-350">
            <div className="space-y-4">
              <h3 className="font-extrabold text-blue-500 uppercase tracking-wider text-[10px]">1. The Compound Wealth Formula</h3>
              <p>
                Your future wealth is calculated using a dynamic monthly compounding model that incorporates both your initial lumpsum and stepped-up monthly SIP:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium">
                <li><strong className="text-slate-800 dark:text-slate-200">Stepped-up Monthly Contribution:</strong> Your monthly SIP increases annually by the step-up percentage to offset salary increases.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">CAGR (Compound Annual Growth Rate):</strong> The expected rate of return is converted to a monthly equivalent rate: <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-blue-500 font-semibold font-mono">r = (1 + CAGR)^(1/12) - 1</code>.</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-extrabold text-orange-500 uppercase tracking-wider text-[10px]">2. Inflation & Tax Adjustments</h3>
              <p>
                True financial worth is measured by actual purchasing power in today&apos;s money after tax deductions:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium">
                <li><strong className="text-slate-800 dark:text-slate-200">Real Purchasing Power:</strong> Adjusted for inflation by dividing the future value by <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-orange-500 font-semibold font-mono">(1 + Inflation)^n</code>.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Long-Term Capital Gains (LTCG) Tax:</strong> Effective tax of 12.5% applied exclusively on capital gains exceeding the ₹1.25 Lakh threshold.</li>
              </ul>
            </div>
          </div>
        </section>

        <KnowledgeBase />

      </div>
    </div>
  );
}

export default function WealthDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Initializing Wealth Cockpit...</div>
      </div>
    }>
      <WealthDashboardContent />
    </Suspense>
  );
}
