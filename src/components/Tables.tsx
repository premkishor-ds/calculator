import React from 'react';
import { formatINR, CalculationResult } from '@/utils/calculations';

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
    <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl -mx-0">
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
              <td className="p-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-sm">{row.step}% Step-Up</td>
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

export const DetailedLedger: React.FC<TableProps> = ({ ledger, years }) => (
  <section>
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-2xl font-bold text-indigo-500">Detailed {years * 12}-Month Ledger</h2>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
    </div>
    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
      <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">Month</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">Year</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">SIP</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">Opening</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">Growth</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">Closing</th>
            </tr>
          </thead>
          <tbody>
            {ledger?.map((m, idx) => (
              <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${m.month % 12 === 0 ? 'bg-blue-500/5' : ''}`}>
                <td className="p-4 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-sm">M{m.month}</td>
                <td className="p-4 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-sm">Y{m.year}</td>
                <td className="p-4 font-semibold border-b border-slate-200 dark:border-slate-800 text-sm">{formatINR(m.sip)}</td>
                <td className="p-4 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-sm">{formatINR(m.openingBalance)}</td>
                <td className="p-4 text-green-500 font-medium border-b border-slate-200 dark:border-slate-800 text-sm">{formatINR(m.interest)}</td>
                <td className="p-4 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 text-sm">
                  {formatINR(m.closingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);
