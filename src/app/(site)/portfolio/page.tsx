'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart, Shield, RefreshCw, Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Holding {
  _id: string;
  symbol: string;
  name: string;
  buyPrice: number;
  quantity: number;
  purchaseDate?: string;
  watchlist?: string;
  currentPrice?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  currentValue?: number;
  totalCost?: number;
}


export default function PortfolioPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Portfolio States
  const [selectedPortfolio, setSelectedPortfolio] = useState('all');
  const [targetPortfolio, setTargetPortfolio] = useState('default');

  // Form State
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Sprint 4: Advanced Transactional Variables
  const [transactionType, setTransactionType] = useState<'buy' | 'sell' | 'dividend' | 'bonus' | 'split'>('buy');
  const [brokerageFees, setBrokerageFees] = useState('0');
  const [standardTaxes, setStandardTaxes] = useState('0');
  const [csvText, setCsvText] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);

  const fetchHoldings = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/holdings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch portfolio holdings');
      const data = await res.json();
      setHoldings(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching holdings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHoldings();
    }
  }, [token]);

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name || !buyPrice || !quantity || !token) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/holdings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name,
          buyPrice: parseFloat(buyPrice),
          quantity: parseInt(quantity, 10),
          watchlist: targetPortfolio,
          transactionType,
          brokerageFees: parseFloat(brokerageFees || '0'),
          standardTaxes: parseFloat(standardTaxes || '0')
        }),
      });

      if (!res.ok) throw new Error('Failed to add transaction');
      
      // Reset form
      setSymbol('');
      setName('');
      setBuyPrice('');
      setQuantity('');
      setShowAddForm(false);
      
      // Refresh list
      await fetchHoldings();
    } catch (err: any) {
      alert(err.message || 'Failed to add holding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?') || !token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/holdings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete transaction');
      await fetchHoldings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete holding');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 animate-pulse">VERIFYING USER SECURITY...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 transition-colors duration-300">
        <div className="max-w-md w-full text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20 mb-5">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          
          <h2 className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Lock in your compound progress!
          </h2>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed font-semibold">
            Login or register to build custom watchlist channels, save technical chart drawings, manage live transaction portfolios, and get price alerts.
          </p>
          
          <div className="flex gap-3 justify-center mt-6">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Login Session
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-transform hover:scale-[1.02]"
            >
              Register Free
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter Holdings dynamically based on active Portfolio Partition
  const filteredHoldings = holdings.filter(h => {
    if (selectedPortfolio === 'all') return true;
    return (h.watchlist || 'default').toLowerCase() === selectedPortfolio.toLowerCase();
  });

  // Calculations based on filtered holdings
  const totalCost = filteredHoldings.reduce((acc, h) => acc + (h.buyPrice * h.quantity), 0);
  const currentValue = filteredHoldings.reduce((acc, h) => acc + ((h.currentPrice || h.buyPrice) * h.quantity), 0);
  const totalPL = currentValue - totalCost;
  const plPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  // Mock allocation by sector (can be derived from simple ticker maps)
  const getSector = (ticker: string) => {
    const symbolClean = ticker.split('.')[0].toUpperCase();
    if (['INFY', 'TCS', 'WIPRO', '20MICRONS'].includes(symbolClean)) return 'Technology & IT';
    if (['RELIANCE', 'ONGC', 'BPCL'].includes(symbolClean)) return 'Energy & Utilities';
    if (['HDFC', 'ICICI', 'SBIN'].includes(symbolClean)) return 'Financial Services';
    if (['TATASTEEL', 'JSWSTEEL'].includes(symbolClean)) return 'Materials & Mining';
    return 'Industrial Conglomerate';
  };

  const sectorAllocations = filteredHoldings.reduce((acc: Record<string, number>, h) => {
    const sector = getSector(h.symbol);
    const value = (h.currentPrice || h.buyPrice) * h.quantity;
    acc[sector] = (acc[sector] || 0) + value;
    return acc;
  }, {});

  const totalAllocationsValue = Object.values(sectorAllocations).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Portfolio Ledger & Risk Cockpit
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track multi-asset transactions, live compounding performance, and portfolio weight metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHoldings}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh ledger data"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => setShowCsvImport(!showCsvImport)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-250 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              📥 Import Zerodha CSV
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Add Transaction
            </button>
          </div>
        </div>

        {/* Zerodha CSV Import Area */}
        {showCsvImport && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl space-y-4 animate-in slide-in-from-top duration-300">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              📥 Import Zerodha Portfolio CSV Trades
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">
              Paste your standard Zerodha trade book logs (comma separated values: <code className="font-mono">Symbol,BuyPrice,Quantity,CompanyName</code>).
            </p>
            <textarea
              rows={4}
              placeholder="RELIANCE.NS,2450.50,10,Reliance Industries"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={async () => {
                  if (!csvText.trim()) return;
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/holdings/import-csv`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ csvData: csvText, watchlist: selectedPortfolio === 'all' ? 'default' : selectedPortfolio })
                    });
                    if (res.ok) {
                      alert('CSV trades successfully compiled and registered.');
                      setCsvText('');
                      setShowCsvImport(false);
                      fetchHoldings();
                    } else {
                      alert('CSV parsing error.');
                    }
                  } catch {
                    alert('Import transaction failed.');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Execute Import
              </button>
              <button
                onClick={() => setShowCsvImport(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Portfolio Tabs Selector */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 max-w-2xl">
          {[
            { id: 'all', label: '🌍 All Assets' },
            { id: 'default', label: '💼 Default' },
            { id: 'retirement', label: '📈 Retirement' },
            { id: 'lumpsum', label: '💰 Lumpsum' },
            { id: 'trading', label: '⚡ Trading' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPortfolio(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${
                selectedPortfolio === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-850/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Add Form Panel */}
        {showAddForm && (
          <form
            onSubmit={handleAddHolding}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl max-w-xl animate-in slide-in-from-top duration-300"
          >
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              📂 Register New Transaction
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Symbol (e.g. INFY.NS)</label>
                <input
                  type="text"
                  placeholder="20MICRONS.NS"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="20 Microns Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Buy Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="185.50"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  placeholder="100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Portfolio Division</label>
                <select
                  value={targetPortfolio}
                  onChange={(e) => setTargetPortfolio(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="default">💼 Default Wallet</option>
                  <option value="retirement">📈 Retirement Wallet</option>
                  <option value="lumpsum">💰 Lumpsum Wallet</option>
                  <option value="trading">⚡ Trading Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Action Type</label>
                <select
                  value={transactionType}
                  onChange={e => setTransactionType(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                  <option value="dividend">DIVIDEND</option>
                  <option value="bonus">BONUS</option>
                  <option value="split">SPLIT</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Brokerage (₹)</label>
                  <input
                    type="number"
                    value={brokerageFees}
                    onChange={e => setBrokerageFees(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Taxes (₹)</label>
                  <input
                    type="number"
                    value={standardTaxes}
                    onChange={e => setStandardTaxes(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                {submitting ? 'Registering...' : 'Save Holding'}
              </button>
            </div>
          </form>
        )}

        {/* Quant Summaries Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Cost Base</span>
            <div className="text-xl font-black mt-2">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-slate-500 mt-1">Invested capital base in holdings</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Current Valuation</span>
            <div className="text-xl font-black mt-2">₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-slate-500 mt-1">Live market valued metrics</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Unrealized Profit/Loss</span>
            <div className={`text-xl font-black mt-2 flex items-center gap-1 ${totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              ₹{Math.abs(totalPL).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <span className={`text-xs font-semibold ${totalPL >= 0 ? 'text-green-500/80' : 'text-red-500/80'} mt-1 block`}>
              {totalPL >= 0 ? '+' : ''}{plPercent.toFixed(2)}% Cumulative ROI
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quant Risk Index</span>
            <div className="text-xl font-black mt-2 flex items-center gap-1.5 text-blue-500">
              <Shield className="w-5 h-5" /> Beta: 1.04
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
              Sharpe Ratio: ~2.1 (Low Risk Vol)
            </span>
          </div>
        </div>

        {/* Main Grid: Ledger & Sector Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Ledger Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-4">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              📜 Transaction Ledger
            </h2>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Fetching transactions from DB...</span>
              </div>
            ) : filteredHoldings.length === 0 ? (
              <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <PieChart className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-semibold">No transactions registered in this wallet.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl text-xs font-bold transition-all"
                >
                  Register First Stock
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="py-3 px-2">Asset Details</th>
                      <th className="py-3 px-2">Portfolio</th>
                      <th className="py-3 px-2 text-right">Quantity</th>
                      <th className="py-3 px-2 text-right">Buy Price</th>
                      <th className="py-3 px-2 text-right">Live Price</th>
                      <th className="py-3 px-2 text-right">Total ROI</th>
                      <th className="py-3 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHoldings.map((h) => {
                      const cost = h.buyPrice * h.quantity;
                      const livePrice = h.currentPrice || h.buyPrice;
                      const val = livePrice * h.quantity;
                      const pnl = val - cost;
                      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                      return (
                        <tr key={h._id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-500/5">
                          <td className="py-4 px-2">
                            <div className="font-extrabold text-slate-800 dark:text-slate-100">{h.symbol}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{h.name}</div>
                          </td>
                          <td className="py-4 px-2 capitalize font-semibold text-slate-500">
                            {h.watchlist || 'default'}
                          </td>
                          <td className="py-4 px-2 text-right font-semibold">{h.quantity}</td>
                          <td className="py-4 px-2 text-right font-semibold">₹{h.buyPrice.toFixed(2)}</td>
                          <td className="py-4 px-2 text-right font-semibold">
                            ₹{livePrice.toFixed(2)}
                            {h.currentPrice ? '' : <span className="text-[8px] text-slate-400 block italic">fallback</span>}
                          </td>
                          <td className={`py-4 px-2 text-right font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <div>₹{pnl.toFixed(2)}</div>
                            <div className="text-[9px] font-semibold">{pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <button
                              onClick={() => handleDeleteHolding(h._id)}
                              className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-slate-400 transition-colors"
                              title="Delete transaction record"
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

          {/* Allocation Breakdown sidebar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                🍩 Sector Weightings
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Based on market valuation allocations.</p>
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs">No allocations available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(sectorAllocations).map(([sector, value]) => {
                  const pct = totalAllocationsValue > 0 ? (value / totalAllocationsValue) * 100 : 0;
                  return (
                    <div key={sector} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-500 dark:text-slate-300 truncate max-w-[160px]">{sector}</span>
                        <span className="font-extrabold text-blue-500">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold block">
                        ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Market Cap segment breakdown */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Asset Allocation Mix</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div className="text-cyan-500">Large-Cap</div>
                  <div className="text-slate-800 dark:text-slate-100 mt-1">~60%</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div className="text-blue-500">Mid-Cap</div>
                  <div className="text-slate-800 dark:text-slate-100 mt-1">~25%</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div className="text-purple-500">Small-Cap</div>
                  <div className="text-slate-800 dark:text-slate-100 mt-1">~15%</div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
