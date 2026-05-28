'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, 
  Trash2, Briefcase, Plus, Calendar, Layers, PieChart, 
  FileText, ShieldCheck, Scale, ArrowLeftRight 
} from 'lucide-react';
import { getBackendApiUrl } from '@/lib/backend-config';

interface HoldingItem {
  _id: string;
  symbol: string;
  name: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  purchaseDate: string;
  watchlist: string;
}

interface PortfolioTrackerProps {
  theme: 'dark' | 'light';
  selectedWatchlist: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function PortfolioTracker({ theme, selectedWatchlist, showToast }: PortfolioTrackerProps) {
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Transaction entry form states
  const [symbol, setSymbol] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState<boolean>(false);

  // Fetch holdings
  const fetchHoldings = async () => {
    const BACKEND_API_URL = getBackendApiUrl();
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${BACKEND_API_URL}/holdings`);
      if (!res.ok) throw new Error('Failed to retrieve holdings list');
      const data: HoldingItem[] = await res.json();
      
      // Filter by active watchlist/portfolio workspace
      const filtered = data.filter(h => h.watchlist === selectedWatchlist);
      setHoldings(filtered);
    } catch (err: any) {
      setError(err.message || 'Network error fetching holdings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, [selectedWatchlist]);

  // Handle Add Transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSym = symbol.trim().toUpperCase();
    const cleanName = name.trim();
    const priceVal = parseFloat(buyPrice);
    const qtyVal = parseInt(quantity, 10);
    
    if (!cleanSym || !cleanName || isNaN(priceVal) || isNaN(qtyVal) || qtyVal <= 0 || priceVal < 0) {
      showToast('Please fill out all trade parameters correctly', 'error');
      return;
    }

    const formattedSym = cleanSym.includes('.') ? cleanSym : `${cleanSym}.NS`;

    try {
      setAdding(true);
      const BACKEND_API_URL = getBackendApiUrl();
      const res = await fetch(`${BACKEND_API_URL}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formattedSym,
          name: cleanName,
          buyPrice: priceVal,
          quantity: qtyVal,
          purchaseDate: purchaseDate || new Date().toISOString(),
          watchlist: selectedWatchlist,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record transaction');
      }

      showToast(`Logged buy transaction for ${qtyVal} shares of ${cleanSym}`, 'success');
      setSymbol('');
      setName('');
      setBuyPrice('');
      setQuantity('');
      fetchHoldings();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit transaction', 'error');
    } finally {
      setAdding(false);
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id: string, sym: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${sym} holding entry?`)) return;
    const BACKEND_API_URL = getBackendApiUrl();
    try {
      const res = await fetch(`${BACKEND_API_URL}/holdings/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Deletion failed');
      showToast('Holding entry successfully deleted', 'info');
      fetchHoldings();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete transaction', 'error');
    }
  };

  // Portfolio calculations
  const stats = useMemo(() => {
    let totalCost = 0;
    let marketValue = 0;
    
    holdings.forEach(h => {
      totalCost += h.buyPrice * h.quantity;
      marketValue += h.currentPrice * h.quantity;
    });

    const totalReturnVal = marketValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturnVal / totalCost) * 100 : 0;

    return {
      totalCost,
      marketValue,
      totalReturnVal,
      totalReturnPercent,
    };
  }, [holdings]);

  // Asset Weight allocation list
  const assetAllocations = useMemo(() => {
    const totalVal = stats.marketValue || 1;
    const map = new Map<string, number>();
    
    holdings.forEach(h => {
      const val = h.currentPrice * h.quantity;
      const existing = map.get(h.symbol) || 0;
      map.set(h.symbol, existing + val);
    });

    return Array.from(map.entries()).map(([symbol, value]) => ({
      symbol: symbol.split('.')[0],
      value,
      weight: (value / totalVal) * 100,
    })).sort((a, b) => b.value - a.value);
  }, [holdings, stats.marketValue]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* SECTION 1: Summary Holdings Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Total Capital Invested</span>
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">₹{stats.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Sum of all active buy transactions</p>
        </div>

        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Current Portfolio Value</span>
            <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl border border-purple-500/20 dark:border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">₹{stats.marketValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Live market value valuation</p>
        </div>

        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl relative overflow-hidden transition-all duration-300 sm:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Aggregate Returns (Gain / Loss)</span>
            <div className={`p-2 rounded-xl border text-xs font-black uppercase tracking-wider ${
              stats.totalReturnVal >= 0
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              {stats.totalReturnPercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-xl font-extrabold ${stats.totalReturnVal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ₹{stats.totalReturnVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
            <span className={`text-xs font-black ${stats.totalReturnVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              ({stats.totalReturnPercent >= 0 ? '+' : ''}{stats.totalReturnPercent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Unrealized absolute profit or loss statement</p>
        </div>
      </div>

      {/* SECTION 2: Split Grid (Holdings ledger + Weights + Add Transaction Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Holdings Table (Cols 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                Active Stock Holdings
              </h3>
              <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
                {holdings.length} Assets Logged
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 font-medium">Recalculating live portfolio valuation ledger...</div>
            ) : holdings.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Briefcase className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                No assets logged in current workspace portfolio yet. Log your first trade on the right panel!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Ticker</th>
                      <th className="p-4 text-right">Shares</th>
                      <th className="p-4 text-right">Avg Cost Price</th>
                      <th className="p-4 text-right">Current Live Price</th>
                      <th className="p-4 text-right">Market Value</th>
                      <th className="p-4 text-right">Unrealized P&amp;L</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-sm">
                    {holdings.map((item) => {
                      const cost = item.buyPrice * item.quantity;
                      const value = item.currentPrice * item.quantity;
                      const pnl = value - cost;
                      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                      return (
                        <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 font-bold text-slate-900 dark:text-white">
                            <div>{item.symbol.split('.')[0]}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.name}</div>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-850 dark:text-slate-200">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono font-medium">₹{item.buyPrice.toFixed(2)}</td>
                          <td className="p-4 text-right font-mono font-medium">₹{item.currentPrice.toFixed(2)}</td>
                          <td className="p-4 text-right font-mono font-bold">₹{value.toFixed(2)}</td>
                          <td className={`p-4 text-right font-mono font-black ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            <div>₹{pnl.toFixed(2)}</div>
                            <div className="text-[10px]">{pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%</div>
                          </td>
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(item._id, item.symbol)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right side form and Allocations (Col 1) */}
        <div className="space-y-6">
          
          {/* Add trade form */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              Log Equity Transaction
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Stock Ticker Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. CGPOWER, HSCL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Company Corporate Name</label>
                <input
                  type="text"
                  placeholder="e.g. CG Power"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Buy Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="500.00"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Quantity (Qty)</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-blue-500/20 active:scale-[0.98]"
              >
                {adding ? 'Logging Trade...' : 'Log Buy Trade'}
              </button>
            </form>
          </div>

          {/* Allocation Weights list */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500" />
              Portfolio Allocation Weighting
            </h3>
            {holdings.length === 0 ? (
              <p className="text-xs text-slate-500">Asset weights appear once trades are recorded.</p>
            ) : (
              <div className="space-y-4">
                {assetAllocations.map(alloc => (
                  <div key={alloc.symbol} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{alloc.symbol}</span>
                      <span>{alloc.weight.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${alloc.weight}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
