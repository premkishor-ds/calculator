'use client';

import React, { useState, useMemo } from 'react';
import { 
  Play, TrendingUp, TrendingDown, Layers, Activity, 
  ChevronRight, Award, ShieldAlert, CheckCircle, BarChart2 
} from 'lucide-react';

interface ChartPoint {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pe: number;
}

interface BacktesterProps {
  chartData: ChartPoint[];
  theme: 'dark' | 'light';
  symbol: string;
}

interface SimulatedTrade {
  type: 'BUY' | 'SELL';
  date: string;
  price: number;
  qty: number;
  pnl?: number;
  pnlPercent?: number;
  cumProfit: number;
}

export default function Backtester({ chartData, theme, symbol }: BacktesterProps) {
  const [strategy, setStrategy] = useState<'EMA_Cross' | 'RSI_Breakout' | 'BB_Reversion'>('EMA_Cross');
  const [fastPeriod, setFastPeriod] = useState<number>(9);
  const [slowPeriod, setSlowPeriod] = useState<number>(21);
  const [rsiOversold, setRsiOversold] = useState<number>(30);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);
  
  const [backtesting, setBacktesting] = useState<boolean>(false);
  const [runTrigger, setRunTrigger] = useState<number>(0);

  // Compute indicators
  const indicators = useMemo(() => {
    if (chartData.length < 50) return null;
    const closes = chartData.map(p => p.close);
    
    // EMA helper
    const calcEMA = (period: number) => {
      const out: number[] = [];
      let ema = closes[0];
      const k = 2 / (period + 1);
      out.push(ema);
      for (let i = 1; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
        out.push(ema);
      }
      return out;
    };

    const fastEMA = calcEMA(fastPeriod);
    const slowEMA = calcEMA(slowPeriod);

    // RSI helper (14 periods)
    const rsi: number[] = new Array(closes.length).fill(50);
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 1; i < Math.min(closes.length, 15); i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) avgGain += diff;
      else avgLoss += Math.abs(diff);
    }
    avgGain /= 14;
    avgLoss /= 14;
    
    for (let i = 15; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    }

    // Bollinger Bands (20 periods, 2 stdDev)
    const bbUpper: number[] = [];
    const bbLower: number[] = [];
    const bbMiddle: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < 19) {
        bbMiddle.push(closes[i]);
        bbUpper.push(closes[i] * 1.05);
        bbLower.push(closes[i] * 0.95);
        continue;
      }
      const slice = closes.slice(i - 19, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / 20;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance) || 1;
      bbMiddle.push(mean);
      bbUpper.push(mean + 2 * stdDev);
      bbLower.push(mean - 2 * stdDev);
    }

    return { fastEMA, slowEMA, rsi, bbUpper, bbLower, bbMiddle };
  }, [chartData, fastPeriod, slowPeriod, rsiOversold, rsiOverbought, runTrigger]);

  // Backtester simulation engine
  const report = useMemo(() => {
    if (!indicators || chartData.length < 50) return null;
    
    const trades: SimulatedTrade[] = [];
    let holding = false;
    let entryPrice = 0;
    let entryDate = '';
    let cumProfit = 0;
    let initialBalance = 100000;
    let balance = initialBalance;
    let qty = 0;

    const { fastEMA, slowEMA, rsi, bbUpper, bbLower } = indicators;

    for (let i = 25; i < chartData.length; i++) {
      const price = chartData[i].close;
      const date = chartData[i].date;
      
      let buySignal = false;
      let sellSignal = false;

      // 1. EMA Cross
      if (strategy === 'EMA_Cross') {
        buySignal = fastEMA[i] > slowEMA[i] && fastEMA[i - 1] <= slowEMA[i - 1];
        sellSignal = fastEMA[i] < slowEMA[i] && fastEMA[i - 1] >= slowEMA[i - 1];
      }
      // 2. RSI Breakout
      else if (strategy === 'RSI_Breakout') {
        buySignal = rsi[i] > rsiOversold && rsi[i - 1] <= rsiOversold;
        sellSignal = rsi[i] < rsiOverbought && rsi[i - 1] >= rsiOverbought;
      }
      // 3. BB Reversion
      else if (strategy === 'BB_Reversion') {
        buySignal = price < bbLower[i] && chartData[i - 1].close >= bbLower[i - 1];
        sellSignal = price > bbUpper[i] && chartData[i - 1].close <= bbUpper[i - 1];
      }

      // Execute Trade
      if (buySignal && !holding) {
        qty = Math.floor(balance / price);
        if (qty > 0) {
          entryPrice = price;
          entryDate = date;
          holding = true;
          balance -= qty * price;
          trades.push({ type: 'BUY', date, price, qty, cumProfit });
        }
      } else if (sellSignal && holding) {
        const proceeds = qty * price;
        const pnl = proceeds - (qty * entryPrice);
        const pnlPercent = (price - entryPrice) / entryPrice * 100;
        cumProfit += pnl;
        balance += proceeds;
        holding = false;
        trades.push({ type: 'SELL', date, price, qty, pnl, pnlPercent, cumProfit });
      }
    }

    // Force close last trade if holding at end of data
    if (holding) {
      const lastPoint = chartData[chartData.length - 1];
      const proceeds = qty * lastPoint.close;
      const pnl = proceeds - (qty * entryPrice);
      const pnlPercent = (lastPoint.close - entryPrice) / entryPrice * 100;
      cumProfit += pnl;
      balance += proceeds;
      trades.push({ type: 'SELL', date: lastPoint.date, price: lastPoint.close, qty, pnl, pnlPercent, cumProfit });
    }

    const sellTrades = trades.filter(t => t.type === 'SELL');
    const winningTrades = sellTrades.filter(t => (t.pnl || 0) > 0);
    
    const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;
    
    const grossProfit = sellTrades.reduce((sum, t) => sum + Math.max(0, t.pnl || 0), 0);
    const grossLoss = sellTrades.reduce((sum, t) => sum + Math.abs(Math.min(0, t.pnl || 0)), 0);
    const profitFactor = grossLoss === 0 ? grossProfit > 0 ? 9.9 : 1.0 : parseFloat((grossProfit / grossLoss).toFixed(2));

    // Compounding growth percentage
    const overallReturn = (cumProfit / initialBalance) * 100;

    return {
      trades: trades.reverse(), // latest trades at top
      winRate,
      profitFactor,
      overallReturn,
      totalTrades: sellTrades.length,
      finalValue: balance,
      winningTradesCount: winningTrades.length,
    };
  }, [indicators, strategy, chartData, runTrigger]);

  const handleRunBacktest = () => {
    setBacktesting(true);
    setTimeout(() => {
      setRunTrigger(p => p + 1);
      setBacktesting(false);
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">
      
      {/* Header controls block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            Strategy Backtesting Engine
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Backtest technical rules against historical data for <span className="font-extrabold text-blue-500">{symbol.split('.')[0]}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as any)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="EMA_Cross">EMA Golden Cross</option>
            <option value="RSI_Breakout">RSI Oversold Breakout</option>
            <option value="BB_Reversion">Bollinger Mean Reversion</option>
          </select>

          <button
            onClick={handleRunBacktest}
            disabled={backtesting || chartData.length < 50}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-450 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-[0.98]"
          >
            <Play className={`w-3.5 h-3.5 ${backtesting ? 'animate-spin' : ''}`} />
            {backtesting ? 'Evaluating...' : 'Run Backtest'}
          </button>
        </div>
      </div>

      {/* Strategy settings block */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-905/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
        {strategy === 'EMA_Cross' && (
          <>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Fast EMA</span>
              <input 
                type="number" 
                value={fastPeriod} 
                onChange={(e) => setFastPeriod(parseInt(e.target.value) || 9)}
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-bold text-slate-800 dark:text-white pt-1 focus:outline-none" 
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Slow EMA</span>
              <input 
                type="number" 
                value={slowPeriod} 
                onChange={(e) => setSlowPeriod(parseInt(e.target.value) || 21)}
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-bold text-slate-800 dark:text-white pt-1 focus:outline-none" 
              />
            </div>
          </>
        )}
        {strategy === 'RSI_Breakout' && (
          <>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Oversold (Buy)</span>
              <input 
                type="number" 
                value={rsiOversold} 
                onChange={(e) => setRsiOversold(parseInt(e.target.value) || 30)}
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-bold text-slate-800 dark:text-white pt-1 focus:outline-none" 
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Overbought (Sell)</span>
              <input 
                type="number" 
                value={rsiOverbought} 
                onChange={(e) => setRsiOverbought(parseInt(e.target.value) || 70)}
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-bold text-slate-800 dark:text-white pt-1 focus:outline-none" 
              />
            </div>
          </>
        )}
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Initial Balance</span>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">₹1,00,000</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Historical Rows</span>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">{chartData.length} Candles</p>
        </div>
      </div>

      {chartData.length < 50 ? (
        <div className="p-8 text-center text-xs text-slate-500 font-medium">Insufficient historical candle data to perform backtest optimizations (Minimum 50 records required).</div>
      ) : report ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Performance scorecard grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Overall Return</span>
              <h4 className={`text-base font-black mt-1 ${report.overallReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {report.overallReturn >= 0 ? '+' : ''}{report.overallReturn.toFixed(2)}%
              </h4>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Win Rate</span>
              <h4 className="text-base font-black text-blue-500 mt-1">
                {report.winRate.toFixed(1)}%
              </h4>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Profit Factor</span>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                {report.profitFactor}
              </h4>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Total Trades Executed</span>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                {report.totalTrades} Closed
              </h4>
            </div>
          </div>

          {/* Trades ledger list */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Simulated Trades Ledger (Chronological)
            </h4>
            
            {report.trades.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">Strategy triggered zero trades in this timeframe.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800/80 text-slate-400 uppercase tracking-widest font-black text-[9px]">
                      <th className="p-3">Action</th>
                      <th className="p-3">Trigger Date</th>
                      <th className="p-3 text-right">Execute Price (₹)</th>
                      <th className="p-3 text-right">Shares (Qty)</th>
                      <th className="p-3 text-right">Profit / Loss (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-mono text-slate-700 dark:text-slate-350">
                    {report.trades.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            t.type === 'BUY' 
                              ? 'text-emerald-500 bg-emerald-500/10' 
                              : 'text-red-500 bg-red-500/10'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-medium">{t.date}</td>
                        <td className="p-3 text-right">₹{t.price.toFixed(2)}</td>
                        <td className="p-3 text-right">{t.qty.toLocaleString()}</td>
                        <td className={`p-3 text-right font-black ${
                          t.pnl === undefined ? 'text-slate-400' : t.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {t.pnl === undefined 
                            ? '--' 
                            : `₹${t.pnl.toFixed(2)} (${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent?.toFixed(1)}%)`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : null}

    </div>
  );
}
