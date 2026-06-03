"use client";

import { Activity,Info } from 'lucide-react';
import React, { useMemo,useState } from 'react';

interface OptionStrike {
  strike: number;
  callOI: number;
  callChgOI: number;
  callVolume: number;
  callLtp: number;
  callBid: number;
  callAsk: number;
  callIv: number;
  putOI: number;
  putChgOI: number;
  putVolume: number;
  putLtp: number;
  putBid: number;
  putAsk: number;
  putIv: number;
}

// BSM Cumulative Normal Distribution helper
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp(-x * x / 2);
  const p = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - d * p : d * p;
}

// BSM Probability Density Function helper
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Black-Scholes Greeks Calculator
function calculateBSGreeks(
  s: number, // Spot price
  k: number, // Strike price
  t: number, // Time to expiration (years)
  r: number, // Risk-free rate (decimal)
  v: number, // Volatility (decimal)
  isCall: boolean
) {
  if (t <= 0) return { price: Math.max(0, isCall ? s - k : k - s), delta: isCall ? (s >= k ? 1 : 0) : (s <= k ? -1 : 0), gamma: 0, theta: 0, vega: 0 };
  
  const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
  const d2 = d1 - v * Math.sqrt(t);
  
  const nd1 = normalCDF(d1);
  const nd2 = normalCDF(d2);
  const npd1 = normalPDF(d1);
  
  const price = isCall 
    ? s * nd1 - k * Math.exp(-r * t) * nd2 
    : k * Math.exp(-r * t) * normalCDF(-d2) - s * normalCDF(-d1);
    
  const delta = isCall ? nd1 : nd1 - 1;
  const gamma = npd1 / (s * v * Math.sqrt(t));
  const vega = s * Math.sqrt(t) * npd1 * 0.01; // per 1% change in IV
  
  const thetaCall = -(s * npd1 * v) / (2 * Math.sqrt(t)) - r * k * Math.exp(-r * t) * nd2;
  const thetaPut = -(s * npd1 * v) / (2 * Math.sqrt(t)) + r * k * Math.exp(-r * t) * normalCDF(-d2);
  const theta = (isCall ? thetaCall : thetaPut) / 365; // daily theta decay
  
  return { price, delta, gamma, theta, vega };
}

export default function OptionsStrategyBuilder({
  spotPrice = 18200,
  theme: _theme = 'light',
  symbol: _symbol = 'NIFTY'
}: {
  spotPrice?: number;
  theme?: 'dark' | 'light';
  symbol?: string;
}) {
  const [selectedStrategy, setSelectedStrategy] = useState<'naked' | 'bull_call' | 'bear_put' | 'iron_condor'>('naked');
  const [targetSpot, setTargetSpot] = useState<number>(spotPrice);
  const [ivMultiplier, _setIvMultiplier] = useState<number>(1.0); // Adjust IV simulation
  
  // Custom option positions state
  const [positions, setPositions] = useState<Array<{ strike: number; type: 'call' | 'put'; action: 'buy' | 'sell'; qty: number; entryPrice: number }>>([
    { strike: Math.round(spotPrice / 100) * 100, type: 'call', action: 'buy', qty: 50, entryPrice: 120 }
  ]);

  // Generate deterministic option strikes around spot price
  const strikes: OptionStrike[] = useMemo(() => {
    const baseStrike = Math.round(spotPrice / 100) * 100;
    const array: OptionStrike[] = [];
    for (let i = -6; i <= 6; i++) {
      const strike = baseStrike + i * 100;
      const dist = Math.abs(strike - spotPrice) / spotPrice;
      const callIv = 0.12 + dist * 0.1;
      const putIv = 0.13 + dist * 0.12;
      
      const callGreeks = calculateBSGreeks(spotPrice, strike, 0.08, 0.07, callIv, true);
      const putGreeks = calculateBSGreeks(spotPrice, strike, 0.08, 0.07, putIv, false);
      
      const callOI = Math.max(100, Math.round(15000 - Math.abs(i) * 2200));
      const putOI = Math.max(100, Math.round(14000 - Math.abs(i) * 2000));
      
      array.push({
        strike,
        callOI,
        callChgOI: Math.round(callOI * 0.1),
        callVolume: callOI * 3,
        callLtp: callGreeks.price,
        callBid: callGreeks.price - 0.5,
        callAsk: callGreeks.price + 0.5,
        callIv: callIv * 100,
        putOI,
        putChgOI: Math.round(putOI * 0.12),
        putVolume: putOI * 3.2,
        putLtp: putGreeks.price,
        putBid: putGreeks.price - 0.5,
        putAsk: putGreeks.price + 0.5,
        putIv: putIv * 100
      });
    }
    return array;
  }, [spotPrice]);

  // Automatically configure strategies
  const applyStrategy = (strat: 'naked' | 'bull_call' | 'bear_put' | 'iron_condor') => {
    setSelectedStrategy(strat);
    const baseStrike = Math.round(spotPrice / 100) * 100;
    if (strat === 'naked') {
      setPositions([{ strike: baseStrike, type: 'call', action: 'buy', qty: 50, entryPrice: 120 }]);
    } else if (strat === 'bull_call') {
      setPositions([
        { strike: baseStrike, type: 'call', action: 'buy', qty: 50, entryPrice: 120 },
        { strike: baseStrike + 200, type: 'call', action: 'sell', qty: 50, entryPrice: 35 }
      ]);
    } else if (strat === 'bear_put') {
      setPositions([
        { strike: baseStrike, type: 'put', action: 'buy', qty: 50, entryPrice: 115 },
        { strike: baseStrike - 200, type: 'put', action: 'sell', qty: 50, entryPrice: 32 }
      ]);
    } else if (strat === 'iron_condor') {
      setPositions([
        { strike: baseStrike - 200, type: 'put', action: 'buy', qty: 50, entryPrice: 30 },
        { strike: baseStrike - 100, type: 'put', action: 'sell', qty: 50, entryPrice: 65 },
        { strike: baseStrike + 100, type: 'call', action: 'sell', qty: 50, entryPrice: 70 },
        { strike: baseStrike + 200, type: 'call', action: 'buy', qty: 50, entryPrice: 35 }
      ]);
    }
  };

  // Compute portfolio payoff metrics
  const payoffData = useMemo(() => {
    const range = 1000;
    const steps = 100;
    const startPrice = spotPrice - range / 2;
    const points: Array<{ price: number; pnl: number }> = [];
    
    for (let i = 0; i <= steps; i++) {
      const simSpot = startPrice + (range / steps) * i;
      let totalPnl = 0;
      
      positions.forEach(pos => {
        const isCall = pos.type === 'call';
        const multiplier = pos.action === 'buy' ? 1 : -1;
        const expiryVal = isCall ? Math.max(0, simSpot - pos.strike) : Math.max(0, pos.strike - simSpot);
        const pnlPerUnit = expiryVal - pos.entryPrice;
        totalPnl += pnlPerUnit * pos.qty * multiplier;
      });
      
      points.push({ price: simSpot, pnl: totalPnl });
    }
    
    // Greeks summary at spot
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    
    positions.forEach(pos => {
      const isCall = pos.type === 'call';
      const mult = pos.action === 'buy' ? 1 : -1;
      const greeks = calculateBSGreeks(spotPrice, pos.strike, 0.08, 0.07, 0.14 * ivMultiplier, isCall);
      totalDelta += greeks.delta * pos.qty * mult;
      totalGamma += greeks.gamma * pos.qty * mult;
      totalTheta += greeks.theta * pos.qty * mult;
      totalVega += greeks.vega * pos.qty * mult;
    });

    return { points, totalDelta, totalGamma, totalTheta, totalVega };
  }, [positions, spotPrice, ivMultiplier]);

  // SVG drawing specs for the Payoff Matrix Graph
  const svgWidth = 500;
  const svgHeight = 220;
  const maxPnl = Math.max(...payoffData.points.map(p => Math.abs(p.pnl))) || 1000;
  
  const pointsString = payoffData.points.map(p => {
    const x = ((p.price - (spotPrice - 500)) / 1000) * svgWidth;
    const y = svgHeight / 2 - (p.pnl / maxPnl) * (svgHeight / 2 - 20);
    return `${x},${y}`;
  }).join(' ');

  // Current targeted PnL estimate
  const currentTargetPnl = useMemo(() => {
    let sum = 0;
    positions.forEach(pos => {
      const isCall = pos.type === 'call';
      const multiplier = pos.action === 'buy' ? 1 : -1;
      const expiryVal = isCall ? Math.max(0, targetSpot - pos.strike) : Math.max(0, pos.strike - targetSpot);
      sum += (expiryVal - pos.entryPrice) * pos.qty * multiplier;
    });
    return sum;
  }, [positions, targetSpot]);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-3xl p-5 border border-slate-900 shadow-3xl font-sans space-y-5">
      {/* Header Strategy Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Strategy Builder & Option Chain</h3>
            <span className="text-[9px] text-slate-500 block font-mono">Spot Reference: ₹{spotPrice.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          {(['naked', 'bull_call', 'bear_put', 'iron_condor'] as const).map(strat => (
            <button
              key={strat}
              onClick={() => applyStrategy(strat)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase transition-all ${
                selectedStrategy === strat
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {strat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Payoff Visualizer & Strategy Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* SVG Payoff Matrix Path */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payoff Profile at Expiration</span>
            <span className="text-[10px] font-bold font-mono text-emerald-500">Max Loss bounded</span>
          </div>
          
          <div className="relative w-full h-[220px] bg-slate-950/80 rounded-xl overflow-hidden border border-slate-900/80">
            {/* Zero Line */}
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-slate-800"
              style={{ top: `${svgHeight / 2}px` }}
            />
            {/* Target price slider overlay line */}
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-emerald-500/50 flex flex-col items-center justify-start pointer-events-none"
              style={{ left: `${((targetSpot - (spotPrice - 500)) / 1000) * 100}%` }}
            >
              <span className="bg-emerald-500 text-slate-950 font-bold font-mono text-[8px] px-1 rounded mt-1 shadow-md">
                ₹{targetSpot.toFixed(0)}
              </span>
            </div>

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                points={pointsString}
              />
            </svg>
          </div>

          {/* Payoff Simulation target spot sliders */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>Simulated Spot Target</span>
              <span className={`font-mono font-black ${currentTargetPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                ₹{targetSpot.toFixed(0)} (PnL: {currentTargetPnl >= 0 ? '+' : ''}₹{currentTargetPnl.toFixed(0)})
              </span>
            </div>
            <input
              type="range"
              min={spotPrice - 400}
              max={spotPrice + 400}
              value={targetSpot}
              onChange={e => setTargetSpot(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-850 rounded-lg appearance-none accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Dynamic Options Greeks Ledger & Active legs */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Delta', val: payoffData.totalDelta.toFixed(1), color: 'text-blue-400' },
              { label: 'Gamma', val: payoffData.totalGamma.toFixed(4), color: 'text-indigo-400' },
              { label: 'Theta', val: payoffData.totalTheta.toFixed(1), color: 'text-rose-400' },
              { label: 'Vega', val: payoffData.totalVega.toFixed(1), color: 'text-amber-400' }
            ].map(greek => (
              <div key={greek.label} className="bg-slate-900/60 border border-slate-900 p-2.5 rounded-xl">
                <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">{greek.label}</span>
                <span className={`text-xs font-mono font-black ${greek.color} block mt-0.5`}>{greek.val}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-2xl flex-1 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Active Options Strategy Legs</span>
            <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1 select-none">
              {positions.map((pos, idx) => (
                <div key={idx} className="bg-slate-950/80 border border-slate-850 p-2 rounded-xl flex items-center justify-between text-[10px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      pos.action === 'buy' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {pos.action}
                    </span>
                    <span className="text-white font-mono">{pos.strike} {pos.type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="font-mono text-slate-450">₹{pos.entryPrice} × {pos.qty} Qty</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-900/80 pt-2.5 mt-3 flex items-center justify-between text-[9px] text-slate-500 font-bold font-mono">
              <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5 text-slate-500" /> Max Risk bounded dynamically</span>
              <span className="text-emerald-500">Calculated using BSM Model</span>
            </div>
          </div>

        </div>
      </div>

      {/* Institutional Options Chain Grid */}
      <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Institutional Option Chain (Strike Matrix)</span>
          <div className="flex items-center gap-4 font-mono text-[9px] font-bold text-slate-500">
            <span>PCR: <span className="text-emerald-500 font-black">1.12</span></span>
            <span>Max Pain Strike: <span className="text-white font-black">18200</span></span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-900 max-h-[220px]">
          <table className="w-full text-left whitespace-nowrap text-[9px]">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-black">
                <th className="py-2 px-3 text-center bg-slate-900/10 text-emerald-400">Call OI</th>
                <th className="py-2 px-3 text-right">Call IV</th>
                <th className="py-2 px-3 text-right">LTP</th>
                <th className="py-2 px-3 text-center bg-slate-950 text-white font-bold font-mono">STRIKE</th>
                <th className="py-2 px-3 text-left">LTP</th>
                <th className="py-2 px-3 text-left">Put IV</th>
                <th className="py-2 px-3 text-center bg-slate-900/10 text-emerald-400">Put OI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold font-mono text-slate-300 select-none">
              {strikes.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-1.5 px-3 text-center text-emerald-500/90 bg-emerald-500/[0.02]">{s.callOI.toLocaleString()}</td>
                  <td className="py-1.5 px-3 text-right text-slate-400">{s.callIv.toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-right text-white">₹{s.callLtp.toFixed(1)}</td>
                  <td className="py-1.5 px-3 text-center bg-slate-950/80 text-white font-black text-xs">
                    {s.strike}
                  </td>
                  <td className="py-1.5 px-3 text-left text-white">₹{s.putLtp.toFixed(1)}</td>
                  <td className="py-1.5 px-3 text-left text-slate-400">{s.putIv.toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-center text-emerald-500/90 bg-emerald-500/[0.02]">{s.putOI.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
