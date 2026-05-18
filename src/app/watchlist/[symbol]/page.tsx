"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, FileText, PieChart, Info, Shield, Layers, Scale } from 'lucide-react';

interface Ratios {
  price: number;
  change: number;
  changePercent: number;
  name: string;
  symbol: string;
  marketCap: number;
  volume: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  instHold: number;
  pubHold: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  roe: number;
  roa: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface BalanceSheetItem {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cash: number;
  debt: number;
  workingCapital: number;
}

interface ProfitLossItem {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
}

interface StockDetails {
  ratios: Ratios;
  balanceSheet: BalanceSheetItem[];
  profitLoss: ProfitLossItem[];
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ratios' | 'pl' | 'bs' | 'shareholding'>('ratios');

  const decodedSymbol = decodeURIComponent(resolvedParams.symbol);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/watchlist/${encodeURIComponent(decodedSymbol)}`);
        if (!res.ok) throw new Error('Failed to fetch detailed stock data');
        const details = await res.json();
        if (active) {
          setData(details);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      active = false;
    };
  }, [decodedSymbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Compiling financial intelligence for {decodedSymbol.replace('.NS', '')}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-4 px-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl max-w-md text-center shadow-lg">
          <h2 className="font-bold text-lg mb-2">Error Loading Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error || 'Could not load fundamentals.'}</p>
          <Link href="/watchlist" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Watchlist
          </Link>
        </div>
      </div>
    );
  }

  const { ratios, balanceSheet, profitLoss } = data;
  const isPositive = ratios.change >= 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        {/* Navigation back */}
        <Link href="/watchlist" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Watchlist
        </Link>

        {/* Dashboard Header */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {ratios.symbol.replace('.NS', '')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  NSE India
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium">{ratios.name}</p>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="text-right lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  ₹{ratios.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center justify-end lg:justify-start gap-1 font-semibold text-sm mt-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{isPositive ? '+' : ''}{ratios.change.toFixed(2)} ({isPositive ? '+' : ''}{ratios.changePercent.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Market Cap</div>
                <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  ₹{(ratios.marketCap / 10000000).toFixed(2)}Cr
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Volume (Lakhs)</div>
                <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {(ratios.volume / 100000).toFixed(2)}L
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4 scrollbar-none">
          <button
            onClick={() => setActiveTab('ratios')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'ratios'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview & Ratios
          </button>
          <button
            onClick={() => setActiveTab('pl')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'pl'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab('bs')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'bs'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setActiveTab('shareholding')}
            className={`pb-4 px-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'shareholding'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Shareholding Pattern
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'ratios' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Fundamental Ratios Panel */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Scale className="w-5 h-5 text-blue-500" /> Key Fundamental Ratios
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">P/E Ratio</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.pe > 0 ? ratios.pe.toFixed(2) : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">EPS (12M)</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.eps > 0 ? `₹${ratios.eps.toFixed(2)}` : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">CMP/BV</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.cmpBv > 0 ? ratios.cmpBv.toFixed(2) : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Dividend Yield</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.divYield > 0 ? `${ratios.divYield.toFixed(2)}%` : '0.00%'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">ROE (%)</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.roe !== 0 ? `${ratios.roe.toFixed(2)}%` : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">ROA (%)</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.roa !== 0 ? `${ratios.roa.toFixed(2)}%` : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Debt-to-Equity</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.debtToEquity > 0 ? (ratios.debtToEquity / 100).toFixed(2) : '0.00'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Current Ratio</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.currentRatio > 0 ? ratios.currentRatio.toFixed(2) : '--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Quick Ratio</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{ratios.quickRatio > 0 ? ratios.quickRatio.toFixed(2) : '--'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical analysis cockpit */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Shield className="w-5 h-5 text-blue-500" /> Technical Indicators
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">50-Day Moving Avg</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">₹{ratios.fiftyDayAverage?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">200-Day Moving Avg</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">₹{ratios.twoHundredDayAverage?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">52-Week High</span>
                    <span className="text-sm font-bold text-emerald-500">₹{ratios.fiftyTwoWeekHigh?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-xs font-semibold text-slate-400">52-Week Low</span>
                    <span className="text-sm font-bold text-red-500">₹{ratios.fiftyTwoWeekLow?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}

        {activeTab === 'pl' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Annual Profit & Loss Statement (₹)</h3>
            </div>
            {profitLoss.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Historical P&L data is currently unavailable for this stock symbol.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Fiscal Period</th>
                      <th className="p-4 text-right">Total Revenue</th>
                      <th className="p-4 text-right">Cost of Revenue</th>
                      <th className="p-4 text-right">Gross Profit</th>
                      <th className="p-4 text-right">Operating Income</th>
                      <th className="p-4 text-right">Net Income</th>
                      <th className="p-4 text-right">Basic EPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {profitLoss.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className="p-4 text-right font-medium">₹{item.revenue ? (item.revenue / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{item.costOfRevenue ? (item.costOfRevenue / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">₹{item.grossProfit ? (item.grossProfit / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">₹{item.operatingIncome ? (item.operatingIncome / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className={`p-4 text-right font-semibold ${item.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{item.netIncome ? (item.netIncome / 10000000).toFixed(2) : '0.00'}Cr
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">₹{item.eps?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bs' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Annual Balance Sheet (₹)</h3>
            </div>
            {balanceSheet.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">Historical Balance Sheet is currently unavailable for this stock symbol.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Fiscal Period</th>
                      <th className="p-4 text-right">Total Assets</th>
                      <th className="p-4 text-right">Cash & Cash Equiv.</th>
                      <th className="p-4 text-right">Working Capital</th>
                      <th className="p-4 text-right">Total Liabilities</th>
                      <th className="p-4 text-right">Total Debt</th>
                      <th className="p-4 text-right">Shareholder Equity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {balanceSheet.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className="p-4 text-right font-medium">₹{(item.totalAssets / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right">₹{item.cash ? (item.cash / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{item.workingCapital ? (item.workingCapital / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right">₹{(item.totalLiabilities / 10000000).toFixed(2)}Cr</td>
                        <td className="p-4 text-right font-medium text-red-500">₹{item.debt ? (item.debt / 10000000).toFixed(2) : '0.00'}Cr</td>
                        <td className="p-4 text-right font-semibold text-emerald-500">₹{(item.equity / 10000000).toFixed(2)}Cr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shareholding' && (
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-900 dark:text-white">
              <PieChart className="w-5 h-5 text-blue-500" /> Shareholding Pattern Breakup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Progress bars representing slices */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Promoter Holding</span>
                    <span className="text-blue-500">{ratios.promHold.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratios.promHold}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Institutional Holding</span>
                    <span className="text-cyan-500">{ratios.instHold.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratios.instHold}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Public & Others</span>
                    <span className="text-emerald-500">{ratios.pubHold.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ratios.pubHold}%` }}></div>
                  </div>
                </div>
              </div>

              {/* High precision info block */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">Holding Classification Policy</h4>
                * **Promoter Equity**: Represents controlling interests held directly by original founders or core management entities. High promoter stakes indicate strong conviction and skin-in-the-game.
                <br /><br />
                * **Institutional Assets**: Mutual funds, pension accounts, insurance entities, and Foreign Portfolio Investors (FPI). High institutional density indicates institutional trust and validation.
                <br /><br />
                * **Retail & Public Allocation**: Represents open market equity held by retail investors and corporate treasuries.
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Disclaimer Banner */}
        <div className="mt-8 flex items-start gap-3 p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Stock Market Disclaimer:</span> Investment in securities market are subject to market risks, read all the related documents carefully before investing. Fundamental ratio analysis and technical indicators presented on this cockpit are fetched dynamically from active corporate filings and standard market quote tickers in real-time. Past performance is not indicative of future investment returns.
          </div>
        </div>

      </div>
    </div>
  );
}
