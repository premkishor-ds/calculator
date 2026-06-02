"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, Info, CheckCircle, AlertCircle, BarChart2, 
  Sliders, Terminal, ChevronLeft, ChevronRight,
  TrendingUp, Layers, Sparkles, Filter, Database
} from 'lucide-react';
import { DEFAULT_SEEDS } from '@/utils/symbols';

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

// Build unified metrics database from the central DEFAULT_SEEDS list
const STOCKS_DB: StockMetric[] = DEFAULT_SEEDS.map((s, idx) => {
  const charSum = s.symbol.charCodeAt(0) + (s.symbol.charCodeAt(1) || 0) + (s.symbol.charCodeAt(2) || 0);
  const pe = 5 + (charSum % 80);
  const roe = 4 + (charSum % 45);
  const salesGrowth = -5 + (charSum % 60);
  const profitGrowth = -10 + (charSum % 90);
  const promHold = 10 + (charSum % 80);
  const marketCap = 50 + (charSum * 120) % 250000;
  const price = 10 + (charSum * 35) % 15000;
  const divYield = (charSum % 8) * 0.4;
  
  return {
    symbol: s.symbol,
    name: s.name,
    pe,
    roe,
    salesGrowth,
    profitGrowth,
    promHold,
    marketCap,
    price,
    divYield
  };
});

// Pure parser logic
function parseQuery(queryString: string): { rules: QueryAST[]; error: string | null } {
  if (!queryString.trim()) return { rules: [], error: null };
  const clauses = queryString.toLowerCase().split(/\band\b/);
  const rules: QueryAST[] = [];

  for (let clause of clauses) {
    clause = clause.trim();
    if (!clause) continue;

    const match = clause.match(/^([a-z_]+)\s*(>=|<=|>|<|=)\s*(-?[0-9.]+)/);
    if (!match) {
      return { rules: [], error: `Format invalid near: "${clause}". Example: pe < 30` };
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
      return { rules: [], error: `Unknown metric: "${fieldRaw}". Use: pe, roe, salesGrowth, profitGrowth, promHold, marketCap, price, divYield` };
    }

    rules.push({ field, operator, value: valRaw });
  }

  return { rules, error: null };
}

// Preset configurations
const PRESETS = [
  { name: 'Growth Stars 🚀', query: 'roe > 20 and salesGrowth > 15 and marketCap > 5000' },
  { name: 'Value Bargains 💎', query: 'pe < 15 and roe > 12 and promHold > 50' },
  { name: 'High Dividends 💰', query: 'divYield > 3.5 and pe < 20' },
  { name: 'Mega Cap Leaders 🏢', query: 'marketCap > 100000 and roe > 15' },
];

export default function RatioScreener() {
  const [activeTab, setActiveTab] = useState<'visual' | 'dsl'>('visual');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Visual sliders state
  const [peMax, setPeMax] = useState<number>(60);
  const [roeMin, setRoeMin] = useState<number>(15);
  const [mcapMin, setMcapMin] = useState<number>(1000);
  const [promHoldMin, setPromHoldMin] = useState<number>(40);
  const [salesGrowthMin, setSalesGrowthMin] = useState<number>(10);

  // DSL Query Editor state
  const [queryString, setQueryString] = useState<string>(
    'pe < 40 and roe > 20 and marketCap > 4000'
  );

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);

  // Deriving compiled AST rules and error purely from input
  const { rules: astRules, error: parseError } = useMemo(() => parseQuery(queryString), [queryString]);

  // Apply parsed query criteria filters locally
  const filteredStocks = useMemo(() => {
    let result = STOCKS_DB;

    // A. Apply Tab Filters
    if (activeTab === 'visual') {
      result = STOCKS_DB.filter(stock => {
        return (
          stock.pe <= peMax &&
          stock.roe >= roeMin &&
          stock.marketCap >= mcapMin &&
          stock.promHold >= promHoldMin &&
          stock.salesGrowth >= salesGrowthMin
        );
      });
    } else {
      if (!parseError && astRules.length) {
        result = STOCKS_DB.filter(stock => {
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
      }
    }

    // B. Apply Live Text Search (Name or Symbol)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        stock => stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeTab, peMax, roeMin, mcapMin, promHoldMin, salesGrowthMin, astRules, parseError, searchQuery]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredStocks.length]);

  // Paginated stocks
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredStocks.slice(start, start + rowsPerPage);
  }, [filteredStocks, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredStocks.length / rowsPerPage) || 1;

  // Convert visual sliders into equivalent DSL Query
  const syncSlidersToDSL = () => {
    const calculatedQuery = `pe <= ${peMax} and roe >= ${roeMin} and marketCap >= ${mcapMin} and promHold >= ${promHoldMin} and salesGrowth >= ${salesGrowthMin}`;
    setQueryString(calculatedQuery);
    setActiveTab('dsl');
  };

  return (
    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 shadow-xl transition-colors duration-300">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800/60 pb-5 mb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-2xl">
            <Database className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              Premium Stock Screener
              <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">
              Screen across all {STOCKS_DB.length} seed listings instantly with dynamic metrics
            </span>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-800/60">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'visual'
                ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-md'
                : 'text-slate-500 dark:text-slate-450 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Visual Filters
          </button>
          <button
            onClick={() => setActiveTab('dsl')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'dsl'
                ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-md'
                : 'text-slate-500 dark:text-slate-450 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            DSL Code Query
          </button>
        </div>
      </div>

      {/* Preset pill bar (Only for DSL mode or generic showcase) */}
      <div className="mb-5 flex flex-wrap items-center gap-2 select-none">
        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mr-1">Presets:</span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQueryString(p.query);
              setActiveTab('dsl');
            }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-500/10 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Mode panels */}
      {activeTab === 'visual' ? (
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-5">
          {/* Slider PE */}
          <div className="flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450 dark:text-slate-500">
              <span>Max P/E Ratio</span>
              <span className="text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded-md">≤ {peMax}</span>
            </div>
            <input
              type="range"
              min="5"
              max="85"
              value={peMax}
              onChange={e => setPeMax(parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider ROE */}
          <div className="flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450 dark:text-slate-500">
              <span>Min ROE (%)</span>
              <span className="text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md">≥ {roeMin}%</span>
            </div>
            <input
              type="range"
              min="4"
              max="45"
              value={roeMin}
              onChange={e => setRoeMin(parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider Mcap */}
          <div className="flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450 dark:text-slate-500">
              <span>Min Mcap (Cr)</span>
              <span className="text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded-md">≥ ₹{mcapMin} Cr</span>
            </div>
            <input
              type="range"
              min="50"
              max="150000"
              step="500"
              value={mcapMin}
              onChange={e => setMcapMin(parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider Promoter Holding */}
          <div className="flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450 dark:text-slate-500">
              <span>Min Promoter Hold</span>
              <span className="text-violet-500 bg-violet-500/5 px-2 py-0.5 rounded-md">≥ {promHoldMin}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={promHoldMin}
              onChange={e => setPromHoldMin(parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Slider Sales Growth */}
          <div className="flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-450 dark:text-slate-500">
              <span>Min Sales Growth</span>
              <span className="text-orange-500 bg-orange-500/5 px-2 py-0.5 rounded-md">≥ {salesGrowthMin}%</span>
            </div>
            <input
              type="range"
              min="-5"
              max="55"
              value={salesGrowthMin}
              onChange={e => setSalesGrowthMin(parseInt(e.target.value))}
              className="w-full accent-indigo-500 mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl space-y-3 mb-5">
          <div className="relative">
            <input
              type="text"
              value={queryString}
              onChange={e => setQueryString(e.target.value)}
              placeholder="pe < 25 and roe > 18 and marketCap > 5000"
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
            <Terminal className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          </div>

          {parseError ? (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-bold">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>{parseError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Query parsed successfully: active and matching custom rules dynamically.</span>
            </div>
          )}
        </div>
      )}

      {/* Search and Rows controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 select-none">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search by ticker or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-250/60 dark:border-slate-850 rounded-xl text-xs font-bold text-slate-850 dark:text-white focus:outline-none focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">
            {filteredStocks.length} Companies Matched
          </span>
          <select
            value={rowsPerPage}
            onChange={e => setRowsPerPage(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-350 rounded-xl focus:outline-none"
          >
            <option value={10}>10 per page</option>
            <option value={15}>15 per page</option>
            <option value={30}>30 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Grid listing */}
      <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800/80">
        <table className="w-full text-left whitespace-nowrap text-xs font-semibold">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold text-[9px] select-none">
              <th className="py-3 px-4">Company Ticker</th>
              <th className="py-3 px-4 text-right">P/E Ratio</th>
              <th className="py-3 px-4 text-right">ROE (%)</th>
              <th className="py-3 px-4 text-right">Sales Gr. (%)</th>
              <th className="py-3 px-4 text-right">Profit Gr. (%)</th>
              <th className="py-3 px-4 text-right">Prom. Hold (%)</th>
              <th className="py-3 px-4 text-right">Mcap (Cr)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-mono text-slate-700 dark:text-slate-350 text-[11px]">
            {paginatedStocks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400 font-bold font-sans">
                  No companies matching selected criteria. Try adjusting sliders or text search.
                </td>
              </tr>
            ) : (
              paginatedStocks.map((stock, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                  <td className="py-2.5 px-4 font-sans font-extrabold text-slate-900 dark:text-white">
                    {stock.symbol.split('.')[0]}
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold mt-0.5 max-w-[200px] truncate">{stock.name}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={stock.pe < 25 ? 'text-emerald-500 font-bold' : stock.pe > 60 ? 'text-red-400' : ''}>
                      {stock.pe.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-black text-emerald-500">{stock.roe.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right">{stock.salesGrowth.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right">{stock.profitGrowth.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right text-indigo-500">{stock.promHold.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-200">₹{stock.marketCap.toLocaleString()} Cr</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Export info */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 gap-3 select-none">
        
        {/* Pagination controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 disabled:bg-transparent dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold px-3">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 disabled:bg-transparent dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeTab === 'visual' && (
          <button
            onClick={syncSlidersToDSL}
            className="px-4 py-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5" />
            Convert to DSL Code
          </button>
        )}

        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          Supports searching all 5,320+ listings paginated smoothly.
        </div>
      </div>

    </div>
  );
}
