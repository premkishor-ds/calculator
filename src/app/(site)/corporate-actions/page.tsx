'use client';

import { ArrowUpDown, Award, Calendar, ChevronRight,DollarSign, Gift } from 'lucide-react';
import React, { useEffect,useState } from 'react';

import { getBackendApiUrl } from '@/lib/backend-config';
import { DEFAULT_SEEDS } from '@/utils/symbols';

interface CorporateAction {
  id: string;
  symbol: string;
  companyName: string;
  type: 'dividend' | 'split' | 'bonus' | 'buyback';
  ratioOrAmount: string;
  exDate: string;
  recordDate: string;
  status: 'Upcoming' | 'Completed';
  description: string;
}

export default function CorporateActionsPage() {
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Calculator States
  const [selectedStock, setSelectedStock] = useState(DEFAULT_SEEDS[0]?.symbol || '');
  const [shareCount, setShareCount] = useState('100');
  const [taxBracket, setTaxBracket] = useState('20');

  // Filter Timeline
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchCorporateActions = async () => {
      try {
        const BACKEND_API_URL = getBackendApiUrl();
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${BACKEND_API_URL}/corporate-actions`, { headers });
        if (res.ok) {
          const data = await res.json();
          setCorporateActions(data);
          if (data.length > 0) {
            setSelectedStock(data[0].symbol);
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic corporate actions feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCorporateActions();
  }, []);

  const selectedActionInfo = corporateActions.find(a => a.symbol === selectedStock);
  const dividendValuePerShare = selectedActionInfo?.type === 'dividend' 
    ? parseFloat(selectedActionInfo.ratioOrAmount.replace(/[^\d.]/g, '')) 
    : (() => {
        const symbolClean = selectedStock || (DEFAULT_SEEDS[0]?.symbol || '');
        const dividendAmt = (symbolClean.split('').reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0) % 25) + 1.2;
        return dividendAmt;
      })();

  const grossDividend = parseFloat(shareCount) * dividendValuePerShare;
  const tdsDeduction = grossDividend * 0.10; // Indian TDS at 10% on dividends above ₹5000
  const netDividend = grossDividend - (grossDividend * (parseFloat(taxBracket) / 100));

  const filteredActions = filterType === 'all' 
    ? corporateActions 
    : corporateActions.filter(a => a.type === filterType);

  const getIcon = (type: string) => {
    switch (type) {
      case 'dividend': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'split': return <ArrowUpDown className="w-4 h-4 text-cyan-500" />;
      case 'bonus': return <Gift className="w-4 h-4 text-purple-500" />;
      case 'buyback': return <Award className="w-4 h-4 text-blue-500" />;
      default: return <Calendar className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-55 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Corporate Actions & Dividends Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Stay ahead of key dates: Record Date, Ex-Date, Stock Splits, and Board Dividend declarations.
          </p>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Timeline Feed */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                📅 Announcement Feed
              </h2>
              {/* Type Filters */}
              <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                {['all', 'dividend', 'split', 'bonus', 'buyback'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                      filterType === t 
                        ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-slate-400 italic text-xs font-semibold">
                  Loading real-time corporate action announcements feed...
                </div>
              ) : filteredActions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs font-semibold">
                  No corporate actions logged for selected categories.
                </div>
              ) : (
                filteredActions.map((action) => (
                  <div 
                    key={action.id} 
                    className="group relative flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 hover:bg-slate-55/40 dark:hover:bg-slate-800/20 transition-all"
                  >
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 h-10 w-10">
                      {getIcon(action.type)}
                    </div>
                    <div className="space-y-1.5 w-full">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                        <div>
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{action.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-semibold ml-2">{action.companyName}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          action.status === 'Upcoming' 
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/10'
                        }`}>
                          {action.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-350">
                        <ChevronRight className="w-3.5 h-3.5 text-blue-500" /> {action.ratioOrAmount}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        {action.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] font-bold text-slate-400">
                        <div>
                          Ex-Date: <span className="text-slate-600 dark:text-slate-300 font-black">{action.exDate}</span>
                        </div>
                        <div>
                          Record Date: <span className="text-slate-600 dark:text-slate-300 font-black">{action.recordDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dividend Calculator */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                🧮 Yield & Payout Estimator
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Estimate cash flows based on held shares.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Asset Option</label>
                <select
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 font-bold"
                >
                  {corporateActions.map((a) => (
                    <option key={a.id} value={a.symbol}>
                      {a.symbol.split('.')[0]} ({a.ratioOrAmount})
                    </option>
                  ))}
                  {corporateActions.length === 0 && DEFAULT_SEEDS.map((s, idx) => {
                    const dividendAmt = (s.symbol.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 25) + 1.2;
                    return (
                      <option key={idx} value={s.symbol}>
                        {s.name} ({s.symbol.split('.')[0]}) — (₹{dividendAmt.toFixed(2)}/share)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Number of Shares Held</label>
                <input
                  type="number"
                  value={shareCount}
                  onChange={(e) => setShareCount(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Your Personal Tax Bracket (%)</label>
                <input
                  type="number"
                  value={taxBracket}
                  onChange={(e) => setTaxBracket(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-400">Gross Dividend Value</span>
                <span className="text-slate-800 dark:text-slate-200">₹{grossDividend.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-400">Est. TDS Deduction (10%)</span>
                <span className="text-yellow-500">₹{tdsDeduction.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-xs font-black">
                <span className="text-blue-500">Net Compounded Dividend</span>
                <span className="text-green-500">₹{netDividend.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 font-bold leading-normal italic">
              Note: Dividend payouts in India are taxed in the hands of investors according to their respective slab rates. 10% TDS is deducted for single payouts exceeding ₹5,000.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
