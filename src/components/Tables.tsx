import React from 'react';
import { formatINR, CalculationResult } from '@/utils/calculations';
import { Download } from 'lucide-react';

interface MatrixResult {
  cagr: number;
  corpus: number;
  swp6: number;
  isSelected: boolean;
}

export interface MatrixRow {
  step: number;
  results: MatrixResult[];
}

interface TableProps {
  matrix?: MatrixRow[];
  ledger?: CalculationResult[];
  years: number;
}

export const ComparisonMatrix: React.FC<TableProps> = ({ matrix }) => (
  <section className="mb-12">
    <div className="flex items-center gap-4 mb-6 min-w-0">
      <h2 className="text-xl sm:text-2xl font-bold text-cyan-500 shrink-0">Master Comparison Matrix</h2>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
    </div>
    <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800/50">
            <th className="p-3 sm:p-4 font-bold text-blue-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase">Step-Up \ CAGR</th>
            {[15, 18, 20, 22, 25].map(c => (
              <th key={c} className="p-3 sm:p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase whitespace-nowrap">{c}%</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix?.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="p-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-sm whitespace-nowrap">{row.step}% Step-Up</td>
              {row.results.map((res: MatrixResult, ridx: number) => (
                <td key={ridx} className={`p-4 border-b border-slate-200 dark:border-slate-800 ${res.isSelected ? 'bg-cyan-500/10 ring-1 ring-inset ring-cyan-500' : ''}`}>
                  <div className="font-bold text-sm">{formatINR(res.corpus)}</div>
                  <div className="text-[10px] text-green-500 font-semibold">SWP: {formatINR(res.swp6)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export const DetailedLedger: React.FC<TableProps> = ({ ledger, years }) => {
  const handleCSVExport = () => {
    if (!ledger || ledger.length === 0) return;
    const headers = [
      "Month", "Year", "SIP Contribution", "Step-Up Applied", 
      "Total Invested Till Date", "Corpus Value (Nominal)", 
      "Yearly Gain", "Cumulative Gain", "Tax Liability", "Inflation Adjusted Corpus"
    ];
    const rows = ledger.map(m => [
      `M${m.month}`,
      `Y${m.year}`,
      m.sip,
      m.stepUpApplied ? "YES" : "NO",
      m.investedTillDate,
      m.closingBalance,
      m.yearlyGain,
      m.cumulativeGain,
      m.taxLiability,
      m.inflationAdjusted
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wealth_compound_plan_${new Date().getFullYear()}.csv`);
    link.click();
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-indigo-500">Detailed {years * 12}-Month Ledger</h2>
        <button 
          onClick={handleCSVExport}
          className="self-start sm:self-auto px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-indigo-500"
        >
          <Download className="w-3.5 h-3.5" />
          Export Ledger as CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Month</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Year</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">SIP Contribution</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Step-Up</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Total Invested</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Corpus Value</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Yearly Gain</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Cumulative Gain</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Est. Tax</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-800">Inflation Adjusted</th>
              </tr>
            </thead>
            <tbody>
              {ledger?.map((m, idx) => (
                <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-xs font-semibold ${m.month % 12 === 0 ? 'bg-blue-500/5' : ''}`}>
                  <td className="p-4 text-slate-450 border-b border-slate-200 dark:border-slate-800">M{m.month}</td>
                  <td className="p-4 text-slate-450 border-b border-slate-200 dark:border-slate-800">Y{m.year}</td>
                  <td className="p-4 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800">{formatINR(m.sip)}</td>
                  <td className="p-4 border-b border-slate-200 dark:border-slate-800">
                    {m.stepUpApplied ? (
                      <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[8px] font-black rounded-lg">STEPPED-UP</span>
                    ) : (
                      <span className="text-slate-350 dark:text-slate-650">-</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-800 dark:text-slate-150 border-b border-slate-200 dark:border-slate-800">{formatINR(m.investedTillDate)}</td>
                  <td className="p-4 font-extrabold text-blue-600 dark:text-cyan-400 border-b border-slate-200 dark:border-slate-800">{formatINR(m.closingBalance)}</td>
                  <td className="p-4 text-emerald-500 border-b border-slate-200 dark:border-slate-800">+{formatINR(m.yearlyGain)}</td>
                  <td className="p-4 text-slate-500 border-b border-slate-200 dark:border-slate-800">{formatINR(m.cumulativeGain)}</td>
                  <td className="p-4 text-red-500 border-b border-slate-200 dark:border-slate-800">{formatINR(m.taxLiability)}</td>
                  <td className="p-4 text-orange-500 border-b border-slate-200 dark:border-slate-800">{formatINR(m.inflationAdjusted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
