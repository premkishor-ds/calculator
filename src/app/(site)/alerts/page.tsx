'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, ShieldAlert, Sparkles, RefreshCw, Mail, Smartphone, Globe } from 'lucide-react';

interface AlertItem {
  _id: string;
  symbol: string;
  condition: 'price_crosses' | 'price_above' | 'price_below' | 'volume_spike' | 'rsi_above' | 'rsi_below';
  value: number;
  isTriggered: boolean;
  isActive: boolean;
  delivery: 'in_app' | 'email' | 'webhook' | 'sms';
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState('price_above');
  const [value, setValue] = useState('');
  const [delivery, setDelivery] = useState('in_app');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/alerts`);
      if (!res.ok) throw new Error('Failed to fetch trigger alerts');
      const data = await res.json();
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading alert rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !condition || !value) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          condition,
          value: parseFloat(value),
          delivery,
        }),
      });

      if (!res.ok) throw new Error('Failed to create alert trigger');

      setSymbol('');
      setValue('');
      setShowAddForm(false);
      await fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/alerts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete alert rule');
      await fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete alert');
    }
  };

  const getConditionLabel = (cond: string) => {
    switch (cond) {
      case 'price_crosses': return 'Price Crosses';
      case 'price_above': return 'Price Above';
      case 'price_below': return 'Price Below';
      case 'volume_spike': return 'Volume Breakout';
      case 'rsi_above': return 'RSI Above';
      case 'rsi_below': return 'RSI Below';
      default: return cond;
    }
  };

  const getDeliveryIcon = (del: string) => {
    switch (del) {
      case 'email': return <Mail className="w-3.5 h-3.5 text-cyan-400" />;
      case 'sms': return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
      case 'webhook': return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Bell className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Advanced Triggers & Alerts Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure real-time server triggers for breakouts, volume spikes, and technical indicator overrides.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Set Live Trigger
            </button>
          </div>
        </div>

        {/* Dynamic Add Trigger Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateAlert}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl max-w-xl animate-in slide-in-from-top duration-300"
          >
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              🔔 Set Custom Trigger Rules
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stock Symbol</label>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Trigger Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                >
                  <option value="price_above">Price Above</option>
                  <option value="price_below">Price Below</option>
                  <option value="price_crosses">Price Crosses</option>
                  <option value="volume_spike">Volume Spike (10d avg)</option>
                  <option value="rsi_above">RSI crosses above</option>
                  <option value="rsi_below">RSI crosses below</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Threshold Target Value</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="200.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Delivery Channel</label>
                <select
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                >
                  <option value="in_app">In-App Cockpit</option>
                  <option value="email">Email Notification</option>
                  <option value="sms">SMS Text Alert</option>
                  <option value="webhook">Webhook Endpoint</option>
                </select>
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
              >
                {submitting ? 'Creating...' : 'Launch Trigger'}
              </button>
            </div>
          </form>
        )}

        {/* Main Interface Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Alerts List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-4">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              🛡️ Active Triggers
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Fetching active triggers from Mongo...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-semibold">No rules configured in this cockpit.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl text-xs font-bold transition-all"
                >
                  Create Custom Price Trigger
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between gap-3 group hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{alert.symbol}</div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                          {getConditionLabel(alert.condition)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(alert._id)}
                        className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete alert trigger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        {alert.condition.startsWith('rsi') ? '' : '₹'}{alert.value}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-400">
                        {getDeliveryIcon(alert.delivery)}
                        <span className="uppercase">{alert.delivery}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trigger Intel Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-6">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                ✨ Live Signal Hub
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Simulated trigger statuses and conditions.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                  <ShieldAlert className="w-4 h-4" /> Dynamic Indexing
                </div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Triggers are cross-referenced with your live TradingView feeds every block cycle. If thresholds break, signals dispatch via selected channels.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Trigger Intel</h3>
                <div className="flex justify-between text-[11px] font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400">Price Cross</span>
                  <span className="text-slate-800 dark:text-slate-200">Triggers on boundary crossover</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-400">Volume Spike</span>
                  <span className="text-slate-800 dark:text-slate-200">Spikes 200% above 10-day average</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold pb-1">
                  <span className="text-slate-400">RSI Break</span>
                  <span className="text-slate-800 dark:text-slate-200">Signals overbought (&gt;70) or oversold (&lt;30)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
