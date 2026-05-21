'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ArrowUpDown, ChevronUp, ChevronDown, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { ActiveFilters } from './FilterSidebar';

interface StockRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  profitGrowth: number;
  salesGrowth: number;
  roe?: number;
  roa?: number;
}

type SortField = keyof StockRow;

function applyFilters(stocks: StockRow[], filters: ActiveFilters): StockRow[] {
  return stocks.filter(s => {
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      const fieldMap: Record<string, number | undefined> = {
        pe: s.pe,
        forwardPe: s.pe,
        peg: undefined,
        pb: s.cmpBv,
        ps: undefined,
        evEbitda: undefined,
        divYield: s.divYield,
        roe: s.roe,
        roa: s.roa,
        grossMargin: undefined,
        operatingMargin: undefined,
        netMargin: undefined,
        revenueGrowth: s.salesGrowth,
        profitGrowth: s.profitGrowth,
        epsGrowth: undefined,
        salesGrowth: s.salesGrowth,
        debtEquity: undefined,
        currentRatio: undefined,
        quickRatio: undefined,
        interestCoverage: undefined,
        promoterHolding: s.promHold,
        fiiHolding: undefined,
        diiHolding: undefined,
        publicHolding: undefined,
        rsi: undefined,
        changePercent: s.changePercent,
        distFrom52wHigh: undefined,
        distFrom52wLow: undefined,
        marketCap: s.marketCap / 10000000,
        volume: undefined,
        price: s.price,
      };
      const fieldVal = fieldMap[key];
      if (fieldVal === undefined) continue;
      if (val.min !== undefined && fieldVal < val.min) return false;
      if (val.max !== undefined && fieldVal > val.max) return false;
    }
    return true;
  });
}

export const ResultsTable = ({ activeFilters }: { activeFilters: ActiveFilters }) => {
  const router = useRouter();
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    fetch('/api/watchlist')
      .then(r => r.json())
      .then((data: StockRow[]) => { setStocks(Array.isArray(data) ? data : []); })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => applyFilters(stocks, activeFilters), [stocks, activeFilters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sortField] as number;
    const bv = b[sortField] as number;
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
    return 0;
  }), [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const headers = ['Symbol', 'Name', 'Price', 'Change%', 'MCap(Cr)', 'PE', 'EPS', 'CMP/BV', 'DivYield%', 'Promoter%', 'ProfitGr%', 'SalesGr%'];
    const rows = sorted.map(s => [
      s.symbol.replace('.NS', ''), s.name, s.price.toFixed(2), s.changePercent.toFixed(2),
      (s.marketCap / 10000000).toFixed(2), s.pe > 0 ? s.pe.toFixed(2) : 'N/A',
      s.eps > 0 ? s.eps.toFixed(2) : 'N/A', s.cmpBv > 0 ? s.cmpBv.toFixed(2) : 'N/A',
      s.divYield.toFixed(2), s.promHold.toFixed(2), s.profitGrowth.toFixed(2), s.salesGrowth.toFixed(2),
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = 'screener.csv'; a.click();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  const Th = ({ label, field, right = true }: { label: string; field: SortField; right?: boolean }) => (
    <th
      onClick={() => handleSort(field)}
      className={`p-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-500 select-none ${right ? 'text-right' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1 ${right ? 'justify-end' : ''}`}>
        {label} <SortIcon field={field} />
      </div>
    </th>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span className="text-sm font-semibold">Loading live data...</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Showing <span className="text-blue-500 font-bold">{filtered.length}</span> stocks
          {Object.keys(activeFilters).length > 0 && <span className="text-slate-400"> (filtered from {stocks.length})</span>}
        </span>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <Th label="Company" field="name" right={false} />
              <Th label="Price" field="price" />
              <Th label="Change %" field="changePercent" />
              <Th label="MCap (Cr)" field="marketCap" />
              <Th label="P/E" field="pe" />
              <Th label="EPS" field="eps" />
              <Th label="CMP/BV" field="cmpBv" />
              <Th label="Div Yield" field="divYield" />
              <Th label="Promoter %" field="promHold" />
              <Th label="Profit Gr." field="profitGrowth" />
              <Th label="Sales Gr." field="salesGrowth" />
              <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={12} className="p-12 text-center text-slate-400 text-sm">No stocks match the active filters.</td></tr>
            ) : paginated.map((s, i) => {
              const pos = s.changePercent >= 0;
              return (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="p-3 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{s.symbol.replace('.NS', '')}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[180px]">{s.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold text-sm">₹{s.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className={`p-3 text-right font-bold text-sm ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
                    <span className="flex items-center justify-end gap-1">
                      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pos ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-3 text-right text-sm text-slate-600 dark:text-slate-300">₹{(s.marketCap / 10000000).toFixed(0)}Cr</td>
                  <td className="p-3 text-right text-sm">{s.pe > 0 ? s.pe.toFixed(1) : '--'}</td>
                  <td className="p-3 text-right text-sm">{s.eps > 0 ? `₹${s.eps.toFixed(2)}` : '--'}</td>
                  <td className="p-3 text-right text-sm">{s.cmpBv > 0 ? s.cmpBv.toFixed(2) : '--'}</td>
                  <td className="p-3 text-right text-sm">{s.divYield > 0 ? `${s.divYield.toFixed(2)}%` : '0%'}</td>
                  <td className="p-3 text-right text-sm">{s.promHold > 0 ? `${s.promHold.toFixed(1)}%` : '--'}</td>
                  <td className={`p-3 text-right text-sm font-semibold ${s.profitGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {s.profitGrowth !== 0 ? `${s.profitGrowth.toFixed(1)}%` : '--'}
                  </td>
                  <td className={`p-3 text-right text-sm font-semibold ${s.salesGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {s.salesGrowth !== 0 ? `${s.salesGrowth.toFixed(1)}%` : '--'}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => router.push(`/watchlist/${encodeURIComponent(s.symbol)}`)}
                      className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Analyse
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg border font-bold transition-colors ${page === p ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{p}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold">›</button>
          </div>
        </div>
      )}
    </div>
  );
};
