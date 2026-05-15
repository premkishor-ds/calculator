"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { calculateScenario, getSummary } from '@/utils/calculations';
import { Header, QuickStart } from '@/components/Header';
import { Controls } from '@/components/Controls';
import { SummaryCards, ExecutiveSummary, WealthChart } from '@/components/WealthVisuals';
import { ComparisonMatrix, DetailedLedger } from '@/components/Tables';
import { KnowledgeBase } from '@/components/KnowledgeBase';

export default function WealthDashboard() {
  // State
  const [initialLumpsum, setInitialLumpsum] = useState(0);
  const [startSip, setStartSip] = useState(30000);
  const [stepUp, setStepUp] = useState(20);
  const [cagr, setCagr] = useState(25);
  const [years, setYears] = useState(12);
  const [inflation, setInflation] = useState(6);
  const [targetGoal, setTargetGoal] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const resetAll = () => {
    setInitialLumpsum(0);
    setStartSip(30000);
    setStepUp(20);
    setCagr(25);
    setYears(12);
    setInflation(6);
    setTargetGoal('');
  };


  // Load theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Logic: If system is dark, stay in dark. Otherwise, use saved theme or default dark.
    let currentTheme: 'dark' | 'light' = 'dark';
    if (isSystemDark) {
      currentTheme = 'dark';
    } else {
      currentTheme = savedTheme || 'dark';
    }
    
    setTheme(currentTheme);
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Requirement: "when click on toggle dark to light it will stay in dark if system theme is set to dark"
    if (isSystemDark) {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      return;
    }

    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-12">
        
        <Header theme={theme} toggleTheme={toggleTheme} />
        <QuickStart />

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
