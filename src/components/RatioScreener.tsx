"use client";

import React, { useState, useMemo } from 'react';
import { Search, Info, CheckCircle, AlertCircle, BarChart2 } from 'lucide-react';

interface StockMetric {
  symbol: string;
  name: string;
  pe: number;
  roe: number;
  salesGrowth: number;
  profitGrowth: number;
  promHold: number;
  marketCap: number;
  price: number;
  divYield: number;
}

interface QueryAST {
  field: keyof Omit<StockMetric, 'symbol' | 'name'>;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
}

const SAMPLE_STOCKS_DB: StockMetric[] = [
  { symbol: 'E2E', name: 'E2E Networks Ltd', pe: 42.5, roe: 28.6, salesGrowth: 45.2, profitGrowth: 58.1, promHold: 52.3, marketCap: 4120, price: 1250, divYield: 0.0 },
  { symbol: 'AURIONPRO', name: 'Aurionpro Solutions', pe: 32.1, roe: 22.4, salesGrowth: 32.5, profitGrowth: 41.2, promHold: 38.6, marketCap: 3850, price: 1840, divYield: 0.5 },
  { symbol: 'VOLTAMP', name: 'Voltamp Transformers', pe: 18.2, roe: 24.1, salesGrowth: 18.4, profitGrowth: 28.5, promHold: 44.2, marketCap: 5200, price: 5400, divYield: 1.8 },
  { symbol: 'TDPOWERSYS', name: 'TD Power Systems', pe: 24.6, roe: 19.5, salesGrowth: 22.1, profitGrowth: 32.4, promHold: 48.5, marketCap: 3100, price: 420, divYield: 1.2 },
  { symbol: 'KIRLOSENG', name: 'Kirloskar Oil Engines', pe: 14.8, roe: 16.2, salesGrowth: 12.5, profitGrowth: 18.9, promHold: 41.5, marketCap: 9400, price: 680, divYield: 2.1 },
  { symbol: 'CGPOWER', name: 'CG Power & Industrial', pe: 62.4, roe: 31.2, salesGrowth: 28.9, profitGrowth: 38.6, promHold: 58.1, marketCap: 84000, price: 610, divYield: 0.8 },
  { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders', pe: 28.5, roe: 34.2, salesGrowth: 24.5, profitGrowth: 56.4, promHold: 84.8, marketCap: 74000, price: 3600, divYield: 1.5 },
  { symbol: 'GRSE', name: 'Garden Reach Shipbuilders', pe: 22.1, roe: 26.8, salesGrowth: 21.2, profitGrowth: 38.2, promHold: 74.5, marketCap: 18500, price: 1620, divYield: 1.1 },
  { symbol: 'HSCL', name: 'Himadri Speciality Chem', pe: 38.4, roe: 18.5, salesGrowth: 15.6, profitGrowth: 48.9, promHold: 45.2, marketCap: 22000, price: 450, divYield: 0.4 },
  { symbol: 'BECTORFOOD', name: 'Mrs Bectors Food Special', pe: 48.2, roe: 21.8, salesGrowth: 18.9, profitGrowth: 32.1, promHold: 51.2, marketCap: 8200, price: 1400, divYield: 0.6 }
];

// Pure function parser logic
function parseQuery(queryString: string): { rules: QueryAST[]; error: string | null } {
  if (!queryString.trim()) return { rules: [], error: null };
  const clauses = queryString.toLowerCase().split(/\band\b/);
  const rules: QueryAST[] = [];

  for (let clause of clauses) {
    clause = clause.trim();
    if (!clause) continue;

    const match = clause.match(/^([a-z]+)\s*(>=|<=|>|<|=)\s*([0-9.]+)/);
    if (!match) {
      return { rules: [], error: `Invalid query block structure near: "${clause}"` };
    }

    const fieldRaw = match[1].trim();
    const operator = match[2].trim() as QueryAST['operator'];
    const valRaw = parseFloat(match[3].trim());

    let field: keyof Omit<StockMetric, 'symbol' | 'name'> | null = null;
    if (fieldRaw === 'pe' || fieldRaw === 'price_to_earning') field = 'pe';
    else if (fieldRaw === 'roe' || fieldRaw === 'return_on_equity') field = 'roe';
    else if (fieldRaw === 'salesgrowth' || fieldRaw === 'sales_growth') field = 'salesGrowth';
    else if (fieldRaw === 'profitgrowth' || fieldRaw === 'profit_growth') field = 'profitGrowth';
    else if (fieldRaw === 'promhold' || fieldRaw === 'promoter_holding') field = 'promHold';
    else if (fieldRaw === 'marketcap' || fieldRaw === 'market_cap') field = 'marketCap';
    else if (fieldRaw === 'price') field = 'price';
    else if (fieldRaw === 'divyield' || fieldRaw === 'dividend_yield') field = 'divYield';

    if (!field) {
      return { rules: [], error: `Unknown metric label: "${fieldRaw}". Use: pe, roe, salesGrowth, profitGrowth, promHold, marketCap` };
    }

    rules.push({ field, operator, value: valRaw });
  }

  return { rules, error: null };
}

export default function RatioScreener() {
  const [queryString, setQueryString] = useState<string>(
    'pe < 40 and roe > 20 and marketCap > 4000'
  );

  // Deriving compiled AST rules and error purely from input
  const { rules: astRules, error: parseError } = useMemo(() => parseQuery(queryString), [queryString]);

  // Apply parsed query criteria filters locally
  const filteredStocks = useMemo(() => {
    if (parseError || !astRules.length) return SAMPLE_STOCKS_DB;

    return SAMPLE_STOCKS_DB.filter(stock => {
      for (const rule of astRules) {
        const val = stock[rule.field];
        if (rule.operator === '>') {
          if (!(val > rule.value)) return false;
        } else if (rule.operator === '<') {
          if (!(val < rule.value)) return false;
        } else if (rule.operator === '>=') {
          if (!(val >= rule.value)) return false;
        } else if (rule.operator === '<=') {
          if (!(val <= rule.value)) return false;
        } else if (rule.operator === '=') {
          if (!(val === rule.value)) return false;
        }
      }
      return true;
    });
  }, [astRules, parseError]);

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl transition-colors duration-300">
      
      {/* Header DSL Query Title */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4 select-none">
        <BarChart2 className="w-5 h-5 text-indigo-500 animate-pulse" />
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            Screener.in-Style Custom Ratio Query DSL
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">
            Search stocks using custom mathematical filters
          </span>
        </div>
      </div>

      {/* Query input and Parser checks */}
      <div className="space-y-2">
        <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          Query Editor
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={queryString}
            onChange={e => setQueryString(e.target.value)}
            placeholder="pe < 25 and roe > 18 and marketCap > 5000"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
        </div>

        {parseError ? (
          <div className="flex items-center gap-1.5 p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/25 rounded-xl text-[10px] font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>{parseError}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/25 rounded-xl text-[10px] font-bold select-none">
            <CheckCircle className="w-4 h-4" />
            <span>Query parsed successfully: compiled into {astRules.length} AST rule nodes.</span>
          </div>
        )}
      </div>

      {/* Dynamic Filter Results datatable */}
      <div className="mt-4">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 select-none">
          Query Execution Output ({filteredStocks.length} Companies Matched)
        </span>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left whitespace-nowrap text-[10px] font-bold">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-extrabold">
                <th className="py-2.5 px-4">Ticker</th>
                <th className="py-2.5 px-4 text-right">P/E</th>
                <th className="py-2.5 px-4 text-right">ROE (%)</th>
                <th className="py-2.5 px-4 text-right">Sales Gr. (%)</th>
                <th className="py-2.5 px-4 text-right">Prom. Hold (%)</th>
                <th className="py-2.5 px-4 text-right">Mcap (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-330">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 font-bold">
                    No companies matches your query.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-2 px-4 font-sans font-extrabold text-slate-900 dark:text-white">
                      {stock.symbol}
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 block font-bold mt-0.5">{stock.name}</span>
                    </td>
                    <td className="py-2 px-4 text-right">₹{stock.pe.toFixed(1)}</td>
                    <td className="py-2 px-4 text-right text-emerald-500">{stock.roe.toFixed(1)}%</td>
                    <td className="py-2 px-4 text-right">{stock.salesGrowth.toFixed(1)}%</td>
                    <td className="py-2 px-4 text-right text-indigo-500">{stock.promHold.toFixed(1)}%</td>
                    <td className="py-2 px-4 text-right">₹{stock.marketCap.toLocaleString()}Cr</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info checks */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono select-none">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          Supports logical AND operations for peer comparisons
        </span>
        <span className="text-indigo-500">Tokenizer compiling</span>
      </div>

    </div>
  );
}
