'use client';

import { Activity, Layers, Play } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

/* ─── Interfaces ─────────────────────────────────────────────── */

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

type StrategyKey =
  | 'EMA_Cross' | 'SMA_Cross' | 'Triple_EMA' | 'MACD_Cross' | 'Supertrend'
  | 'Hull_MA' | 'ADX_Trend' | 'Parabolic_SAR'
  | 'BB_Reversion' | 'Keltner_Reversion' | 'VWAP_Reversion' | 'Mean_Reversion'
  | 'RSI_Breakout' | 'Stochastic_Cross' | 'CCI_Breakout' | 'Williams_R'
  | 'Dual_RSI' | 'Momentum'
  | 'Donchian_Breakout' | 'Price_Volume';

const STRATEGY_LIST: { key: StrategyKey; label: string; group: string }[] = [
  /* Trend Following */
  { key: 'EMA_Cross',         label: 'EMA Golden Cross',          group: 'Trend Following' },
  { key: 'SMA_Cross',         label: 'SMA Price Crossover',        group: 'Trend Following' },
  { key: 'Triple_EMA',        label: 'Triple EMA Alignment',       group: 'Trend Following' },
  { key: 'MACD_Cross',        label: 'MACD Signal Cross',          group: 'Trend Following' },
  { key: 'Supertrend',        label: 'SuperTrend (ATR)',            group: 'Trend Following' },
  { key: 'Hull_MA',           label: 'Hull Moving Average',        group: 'Trend Following' },
  { key: 'ADX_Trend',         label: 'ADX Trend Strength',         group: 'Trend Following' },
  { key: 'Parabolic_SAR',     label: 'Parabolic SAR',              group: 'Trend Following' },
  /* Mean Reversion */
  { key: 'BB_Reversion',      label: 'Bollinger Band Reversion',   group: 'Mean Reversion' },
  { key: 'Keltner_Reversion', label: 'Keltner Channel Reversion',  group: 'Mean Reversion' },
  { key: 'VWAP_Reversion',    label: 'VWAP Mean Reversion',        group: 'Mean Reversion' },
  { key: 'Mean_Reversion',    label: 'Z-Score Mean Reversion',     group: 'Mean Reversion' },
  /* Oscillators */
  { key: 'RSI_Breakout',      label: 'RSI Oversold Breakout',      group: 'Oscillators' },
  { key: 'Stochastic_Cross',  label: 'Stochastic %K/%D Cross',     group: 'Oscillators' },
  { key: 'CCI_Breakout',      label: 'CCI Extreme Breakout',       group: 'Oscillators' },
  { key: 'Williams_R',        label: 'Williams %R Reversal',       group: 'Oscillators' },
  { key: 'Dual_RSI',          label: 'Dual RSI Crossover',         group: 'Oscillators' },
  { key: 'Momentum',          label: 'Price Momentum (ROC)',       group: 'Oscillators' },
  /* Breakout */
  { key: 'Donchian_Breakout', label: 'Donchian Channel Breakout',  group: 'Breakout' },
  { key: 'Price_Volume',      label: 'Volume Spike Breakout',      group: 'Breakout' },
];

interface BacktesterProps {
  chartData: ChartPoint[];
  theme: 'dark' | 'light';
  symbol: string;
  onMarkersChange?: (_markers: any[]) => void;
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

/* ─── Pure indicator helpers (defined outside component) ─────── */

function calcEMA(arr: number[], period: number): number[] {
  if (!arr.length) return [];
  const out: number[] = [];
  let ema = arr[0];
  const k = 2 / (period + 1);
  out.push(ema);
  for (let i = 1; i < arr.length; i++) {
    ema = arr[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

function calcWMA(arr: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) { out.push(arr[i]); continue; }
    let num = 0, den = 0;
    for (let j = 0; j < period; j++) { num += arr[i - j] * (period - j); den += (period - j); }
    out.push(num / den);
  }
  return out;
}

function calcRSI(closes: number[], period: number): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  const warmup = Math.min(closes.length - 1, period);
  for (let i = 1; i <= warmup; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

/* ─── Component ──────────────────────────────────────────────── */

export default function Backtester({ chartData, theme: _theme, symbol, onMarkersChange }: BacktesterProps) {
  const [strategy, setStrategy] = useState<StrategyKey>('EMA_Cross');

  /* Strategy parameters */
  const [fastPeriod,       setFastPeriod]       = useState(9);
  const [slowPeriod,       setSlowPeriod]       = useState(21);
  const [rsiOversold,      setRsiOversold]      = useState(30);
  const [rsiOverbought,    setRsiOverbought]    = useState(70);
  const [bbPeriod,         setBbPeriod]         = useState(20);
  const [macdFast,         setMacdFast]         = useState(12);
  const [macdSlow,         setMacdSlow]         = useState(26);
  const [macdSignal,       setMacdSignal]       = useState(9);
  const [smaPeriod,        setSmaPeriod]        = useState(200);
  const [stochK,           setStochK]           = useState(14);
  const [stochD,           setStochD]           = useState(3);
  const [atrPeriod,        setAtrPeriod]        = useState(10);
  const [supertrendMult,   setSupertrendMult]   = useState(3);
  const [vwapDev,          setVwapDev]          = useState(2);
  const [donchianPeriod,   setDonchianPeriod]   = useState(20);
  const [cciPeriod,        setCciPeriod]        = useState(20);
  const [cciThreshold,     setCciThreshold]     = useState(100);
  const [williamsRPeriod,  setWilliamsRPeriod]  = useState(14);
  const [adxPeriod,        setAdxPeriod]        = useState(14);
  const [adxThreshold,     setAdxThreshold]     = useState(25);
  const [momentumPeriod,   setMomentumPeriod]   = useState(10);
  const [tripleEmaFast,    setTripleEmaFast]    = useState(5);
  const [tripleEmaMid,     setTripleEmaMid]     = useState(13);
  const [tripleEmaSlow,    setTripleEmaSlow]    = useState(34);
  const [keltnerPeriod,    setKeltnerPeriod]    = useState(20);
  const [keltnerMult,      setKeltnerMult]      = useState(2);
  const [hullPeriod,       setHullPeriod]       = useState(14);
  const [dualRsiShort,     setDualRsiShort]     = useState(5);
  const [dualRsiLong,      setDualRsiLong]      = useState(14);
  const [volumePeriod,     setVolumePeriod]     = useState(20);
  const [volumeMult,       setVolumeMult]       = useState(2);
  const [sarStep,          setSarStep]          = useState(0.02);
  const [sarMax,           setSarMax]           = useState(0.2);
  const [zscorePeriod,     setZscorePeriod]     = useState(20);
  const [zscoreThreshold,  setZscoreThreshold]  = useState(2);

  const [backtesting, setBacktesting] = useState(false);
  const [runTrigger,  setRunTrigger]  = useState(0);

  /* ── All indicator computations ── */
  const indicators = useMemo(() => {
    if (chartData.length < 50) return null;
    const closes  = chartData.map(p => p.close);
    const highs   = chartData.map(p => p.high);
    const lows    = chartData.map(p => p.low);
    const volumes = chartData.map(p => p.volume);

    /* EMA */
    const fastEMA = calcEMA(closes, fastPeriod);
    const slowEMA = calcEMA(closes, slowPeriod);

    /* SMA */
    const sma: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < smaPeriod - 1) { sma.push(closes[i]); continue; }
      sma.push(closes.slice(i - smaPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / smaPeriod);
    }

    /* Triple EMA */
    const triEmaFast = calcEMA(closes, tripleEmaFast);
    const triEmaMid  = calcEMA(closes, tripleEmaMid);
    const triEmaSlow = calcEMA(closes, tripleEmaSlow);

    /* MACD */
    const macdFastEMA = calcEMA(closes, macdFast);
    const macdSlowEMA = calcEMA(closes, macdSlow);
    const macdLine    = macdFastEMA.map((v, i) => v - macdSlowEMA[i]);
    const signalLine  = calcEMA(macdLine, macdSignal);

    /* ATR */
    const atr: number[] = [highs[0] - lows[0]];
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      atr.push((atr[atr.length - 1] * (atrPeriod - 1) + tr) / atrPeriod);
    }

    /* SuperTrend */
    type STDir = 1 | -1;
    const stDir: STDir[] = [];
    let stUp = closes[0] - supertrendMult * atr[0];
    let stDn = closes[0] + supertrendMult * atr[0];
    let curDir: STDir = 1;
    stDir.push(curDir);
    for (let i = 1; i < closes.length; i++) {
      const nUp = closes[i] - supertrendMult * atr[i];
      const nDn = closes[i] + supertrendMult * atr[i];
      stUp = nUp > stUp || closes[i - 1] < stUp ? nUp : stUp;
      stDn = nDn < stDn || closes[i - 1] > stDn ? nDn : stDn;
      curDir = curDir === 1 ? (closes[i] < stUp ? -1 : 1) : (closes[i] > stDn ? 1 : -1);
      stDir.push(curDir);
    }

    /* Hull MA */
    const hullHalf = Math.max(2, Math.floor(hullPeriod / 2));
    const hullSqrt = Math.max(2, Math.round(Math.sqrt(hullPeriod)));
    const wmaHalf  = calcWMA(closes, hullHalf);
    const wmaFull  = calcWMA(closes, hullPeriod);
    const hullRaw  = wmaHalf.map((v, i) => 2 * v - wmaFull[i]);
    const hullArr  = calcWMA(hullRaw, hullSqrt);

    /* Parabolic SAR */
    const psarArr: Array<{ value: number; bullish: boolean }> = [];
    let psarVal  = lows[0];
    let psarBull = true;
    let psarEP   = highs[0];
    let psarAF   = sarStep;
    psarArr.push({ value: psarVal, bullish: psarBull });
    for (let i = 1; i < closes.length; i++) {
      const prev = psarVal;
      if (psarBull) {
        psarVal = prev + psarAF * (psarEP - prev);
        psarVal = Math.min(psarVal, lows[i - 1], i >= 2 ? lows[i - 2] : lows[i - 1]);
        if (lows[i] < psarVal) { psarBull = false; psarVal = psarEP; psarEP = lows[i]; psarAF = sarStep; }
        else if (highs[i] > psarEP) { psarEP = highs[i]; psarAF = Math.min(psarAF + sarStep, sarMax); }
      } else {
        psarVal = prev - psarAF * (prev - psarEP);
        psarVal = Math.max(psarVal, highs[i - 1], i >= 2 ? highs[i - 2] : highs[i - 1]);
        if (highs[i] > psarVal) { psarBull = true; psarVal = psarEP; psarEP = highs[i]; psarAF = sarStep; }
        else if (lows[i] < psarEP) { psarEP = lows[i]; psarAF = Math.min(psarAF + sarStep, sarMax); }
      }
      psarArr.push({ value: psarVal, bullish: psarBull });
    }

    /* ADX + DI */
    const adxArr: number[] = new Array(closes.length).fill(20);
    const plusDI: number[] = new Array(closes.length).fill(25);
    const minusDI: number[] = new Array(closes.length).fill(25);
    let smTR = 0, smPlus = 0, smMinus = 0;
    for (let i = 1; i <= Math.min(adxPeriod, closes.length - 1); i++) {
      const tr  = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      const pdm = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? Math.max(highs[i] - highs[i - 1], 0) : 0;
      const ndm = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? Math.max(lows[i - 1] - lows[i], 0) : 0;
      smTR += tr; smPlus += pdm; smMinus += ndm;
    }
    let adxSmooth = 20;
    for (let i = adxPeriod + 1; i < closes.length; i++) {
      const tr  = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      const pdm = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? Math.max(highs[i] - highs[i - 1], 0) : 0;
      const ndm = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? Math.max(lows[i - 1] - lows[i], 0) : 0;
      smTR = smTR - smTR / adxPeriod + tr;
      smPlus = smPlus - smPlus / adxPeriod + pdm;
      smMinus = smMinus - smMinus / adxPeriod + ndm;
      const pdi = smTR > 0 ? 100 * smPlus / smTR : 0;
      const ndi = smTR > 0 ? 100 * smMinus / smTR : 0;
      plusDI[i] = pdi; minusDI[i] = ndi;
      const dx = (pdi + ndi) > 0 ? Math.abs(pdi - ndi) / (pdi + ndi) * 100 : 0;
      adxSmooth = (adxSmooth * (adxPeriod - 1) + dx) / adxPeriod;
      adxArr[i] = adxSmooth;
    }

    /* Bollinger Bands */
    const bbUpper: number[] = [], bbLower: number[] = [], bbMiddle: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < bbPeriod - 1) { bbMiddle.push(closes[i]); bbUpper.push(closes[i] * 1.05); bbLower.push(closes[i] * 0.95); continue; }
      const sl   = closes.slice(i - bbPeriod + 1, i + 1);
      const mean = sl.reduce((a, b) => a + b, 0) / bbPeriod;
      const std  = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / bbPeriod) || 1;
      bbMiddle.push(mean); bbUpper.push(mean + 2 * std); bbLower.push(mean - 2 * std);
    }

    /* Keltner Channel */
    const keltMid: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < keltnerPeriod - 1) { keltMid.push(closes[i]); continue; }
      keltMid.push(closes.slice(i - keltnerPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / keltnerPeriod);
    }
    const keltUpper = keltMid.map((m, i) => m + keltnerMult * atr[i]);
    const keltLower = keltMid.map((m, i) => m - keltnerMult * atr[i]);

    /* VWAP */
    const vwapArr: number[] = [];
    let cumTPV = 0, cumVol = 0;
    for (let i = 0; i < chartData.length; i++) {
      const tp = (highs[i] + lows[i] + closes[i]) / 3;
      cumTPV += tp * volumes[i]; cumVol += volumes[i];
      vwapArr.push(cumVol > 0 ? cumTPV / cumVol : tp);
    }

    /* Z-Score */
    const zscoreArr: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < zscorePeriod - 1) { zscoreArr.push(0); continue; }
      const sl   = closes.slice(i - zscorePeriod + 1, i + 1);
      const mean = sl.reduce((a, b) => a + b, 0) / zscorePeriod;
      const std  = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / zscorePeriod) || 1;
      zscoreArr.push((closes[i] - mean) / std);
    }

    /* RSI (14 fixed for RSI_Breakout strategy) */
    const rsi14 = calcRSI(closes, 14);

    /* Stochastic */
    const stochKArr: number[] = [];
    const stochDArr: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < stochK - 1) { stochKArr.push(50); continue; }
      const hh = Math.max(...highs.slice(i - stochK + 1, i + 1));
      const ll = Math.min(...lows.slice(i - stochK + 1, i + 1));
      stochKArr.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
    }
    for (let i = 0; i < stochKArr.length; i++) {
      if (i < stochD - 1) { stochDArr.push(stochKArr[i]); continue; }
      stochDArr.push(stochKArr.slice(i - stochD + 1, i + 1).reduce((a, b) => a + b, 0) / stochD);
    }

    /* CCI */
    const cciArr: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < cciPeriod - 1) { cciArr.push(0); continue; }
      const sl     = chartData.slice(i - cciPeriod + 1, i + 1);
      const tps    = sl.map(p => (p.high + p.low + p.close) / 3);
      const meanTp = tps.reduce((a, b) => a + b, 0) / cciPeriod;
      const meanDev = tps.reduce((a, b) => a + Math.abs(b - meanTp), 0) / cciPeriod;
      cciArr.push(meanDev === 0 ? 0 : (tps[tps.length - 1] - meanTp) / (0.015 * meanDev));
    }

    /* Williams %R */
    const wRArr: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < williamsRPeriod - 1) { wRArr.push(-50); continue; }
      const hh = Math.max(...highs.slice(i - williamsRPeriod + 1, i + 1));
      const ll = Math.min(...lows.slice(i - williamsRPeriod + 1, i + 1));
      wRArr.push(hh === ll ? -50 : ((hh - closes[i]) / (hh - ll)) * -100);
    }

    /* Dual RSI */
    const rsiShort = calcRSI(closes, dualRsiShort);
    const rsiLong  = calcRSI(closes, dualRsiLong);

    /* Momentum (ROC) */
    const momentumArr: number[] = new Array(closes.length).fill(0);
    for (let i = momentumPeriod; i < closes.length; i++) {
      momentumArr[i] = closes[i - momentumPeriod] > 0
        ? ((closes[i] - closes[i - momentumPeriod]) / closes[i - momentumPeriod]) * 100 : 0;
    }

    /* Donchian Channel */
    const donchHigh: number[] = [], donchLow: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const start = Math.max(0, i - donchianPeriod);
      donchHigh.push(Math.max(...highs.slice(start, i + 1)));
      donchLow.push(Math.min(...lows.slice(start, i + 1)));
    }

    /* Volume SMA */
    const volSMA: number[] = [];
    for (let i = 0; i < volumes.length; i++) {
      if (i < volumePeriod - 1) { volSMA.push(volumes[i]); continue; }
      volSMA.push(volumes.slice(i - volumePeriod + 1, i + 1).reduce((a, b) => a + b, 0) / volumePeriod);
    }

    return {
      fastEMA, slowEMA, sma, triEmaFast, triEmaMid, triEmaSlow,
      macdLine, signalLine, atr, stDir, hullArr, psarArr,
      adxArr, plusDI, minusDI,
      bbUpper, bbLower, keltUpper, keltLower, vwapArr, zscoreArr,
      rsi14, stochKArr, stochDArr, cciArr, wRArr, rsiShort, rsiLong,
      momentumArr, donchHigh, donchLow, volSMA, volumes,
    };
  }, [
    chartData,
    fastPeriod, slowPeriod, smaPeriod, tripleEmaFast, tripleEmaMid, tripleEmaSlow,
    macdFast, macdSlow, macdSignal, atrPeriod, supertrendMult,
    hullPeriod, sarStep, sarMax, adxPeriod, bbPeriod, keltnerPeriod, keltnerMult,
    zscorePeriod, stochK, stochD, cciPeriod, williamsRPeriod,
    dualRsiShort, dualRsiLong, momentumPeriod, donchianPeriod, volumePeriod,
    runTrigger,
  ]);

  /* ── Backtest simulation ── */
  const report = useMemo(() => {
    if (!indicators || chartData.length < 50) return null;
    const trades: SimulatedTrade[] = [];
    let holding = false, entryPrice = 0, cumProfit = 0;
    const initialBalance = 100000;
    let balance = initialBalance, qty = 0;

    for (let i = 25; i < chartData.length; i++) {
      const price = chartData[i].close;
      const date  = chartData[i].date;
      let buy = false, sell = false;

      switch (strategy) {
        case 'EMA_Cross':
          buy  = indicators.fastEMA[i]  > indicators.slowEMA[i]  && indicators.fastEMA[i-1]  <= indicators.slowEMA[i-1];
          sell = indicators.fastEMA[i]  < indicators.slowEMA[i]  && indicators.fastEMA[i-1]  >= indicators.slowEMA[i-1];
          break;
        case 'SMA_Cross':
          buy  = price > indicators.sma[i] && chartData[i-1].close <= indicators.sma[i-1];
          sell = price < indicators.sma[i] && chartData[i-1].close >= indicators.sma[i-1];
          break;
        case 'Triple_EMA': {
          const bull     = indicators.triEmaFast[i]   > indicators.triEmaMid[i]   && indicators.triEmaMid[i]   > indicators.triEmaSlow[i];
          const prevBull = indicators.triEmaFast[i-1] > indicators.triEmaMid[i-1] && indicators.triEmaMid[i-1] > indicators.triEmaSlow[i-1];
          const bear     = indicators.triEmaFast[i]   < indicators.triEmaMid[i]   && indicators.triEmaMid[i]   < indicators.triEmaSlow[i];
          const prevBear = indicators.triEmaFast[i-1] < indicators.triEmaMid[i-1] && indicators.triEmaMid[i-1] < indicators.triEmaSlow[i-1];
          buy  = bull && !prevBull;
          sell = bear && !prevBear;
          break;
        }
        case 'MACD_Cross':
          buy  = indicators.macdLine[i] > indicators.signalLine[i] && indicators.macdLine[i-1] <= indicators.signalLine[i-1];
          sell = indicators.macdLine[i] < indicators.signalLine[i] && indicators.macdLine[i-1] >= indicators.signalLine[i-1];
          break;
        case 'Supertrend':
          buy  = indicators.stDir[i] === 1  && indicators.stDir[i-1] === -1;
          sell = indicators.stDir[i] === -1 && indicators.stDir[i-1] === 1;
          break;
        case 'Hull_MA':
          if (i >= 2) {
            buy  = indicators.hullArr[i] > indicators.hullArr[i-1] && indicators.hullArr[i-1] <= indicators.hullArr[i-2];
            sell = indicators.hullArr[i] < indicators.hullArr[i-1] && indicators.hullArr[i-1] >= indicators.hullArr[i-2];
          }
          break;
        case 'ADX_Trend':
          buy  = indicators.adxArr[i] > adxThreshold && indicators.plusDI[i]  > indicators.minusDI[i]  && indicators.plusDI[i-1]  <= indicators.minusDI[i-1];
          sell = indicators.adxArr[i] > adxThreshold && indicators.plusDI[i]  < indicators.minusDI[i]  && indicators.plusDI[i-1]  >= indicators.minusDI[i-1];
          break;
        case 'Parabolic_SAR':
          buy  = indicators.psarArr[i].bullish  && !indicators.psarArr[i-1].bullish;
          sell = !indicators.psarArr[i].bullish && indicators.psarArr[i-1].bullish;
          break;
        case 'BB_Reversion':
          buy  = price < indicators.bbLower[i]   && chartData[i-1].close >= indicators.bbLower[i-1];
          sell = price > indicators.bbUpper[i]   && chartData[i-1].close <= indicators.bbUpper[i-1];
          break;
        case 'Keltner_Reversion':
          buy  = price < indicators.keltLower[i] && chartData[i-1].close >= indicators.keltLower[i-1];
          sell = price > indicators.keltUpper[i] && chartData[i-1].close <= indicators.keltUpper[i-1];
          break;
        case 'VWAP_Reversion': {
          const dev = vwapDev / 100;
          buy  = price < indicators.vwapArr[i] * (1 - dev) && chartData[i-1].close >= indicators.vwapArr[i-1] * (1 - dev);
          sell = price > indicators.vwapArr[i] * (1 + dev) && chartData[i-1].close <= indicators.vwapArr[i-1] * (1 + dev);
          break;
        }
        case 'Mean_Reversion':
          buy  = indicators.zscoreArr[i] > -zscoreThreshold && indicators.zscoreArr[i-1] <= -zscoreThreshold;
          sell = indicators.zscoreArr[i] <  zscoreThreshold && indicators.zscoreArr[i-1] >=  zscoreThreshold;
          break;
        case 'RSI_Breakout':
          buy  = indicators.rsi14[i] > rsiOversold  && indicators.rsi14[i-1] <= rsiOversold;
          sell = indicators.rsi14[i] < rsiOverbought && indicators.rsi14[i-1] >= rsiOverbought;
          break;
        case 'Stochastic_Cross':
          buy  = indicators.stochKArr[i] > indicators.stochDArr[i] && indicators.stochKArr[i-1] <= indicators.stochDArr[i-1] && indicators.stochKArr[i] < 80;
          sell = indicators.stochKArr[i] < indicators.stochDArr[i] && indicators.stochKArr[i-1] >= indicators.stochDArr[i-1] && indicators.stochKArr[i] > 20;
          break;
        case 'CCI_Breakout':
          buy  = indicators.cciArr[i] > -cciThreshold && indicators.cciArr[i-1] <= -cciThreshold;
          sell = indicators.cciArr[i] <  cciThreshold && indicators.cciArr[i-1] >=  cciThreshold;
          break;
        case 'Williams_R':
          buy  = indicators.wRArr[i] > -80 && indicators.wRArr[i-1] <= -80;
          sell = indicators.wRArr[i] < -20 && indicators.wRArr[i-1] >= -20;
          break;
        case 'Dual_RSI':
          buy  = indicators.rsiShort[i] > indicators.rsiLong[i] && indicators.rsiShort[i-1] <= indicators.rsiLong[i-1];
          sell = indicators.rsiShort[i] < indicators.rsiLong[i] && indicators.rsiShort[i-1] >= indicators.rsiLong[i-1];
          break;
        case 'Momentum':
          buy  = indicators.momentumArr[i] > 0 && indicators.momentumArr[i-1] <= 0;
          sell = indicators.momentumArr[i] < 0 && indicators.momentumArr[i-1] >= 0;
          break;
        case 'Donchian_Breakout':
          buy  = price > indicators.donchHigh[i-1] && chartData[i-1].close <= indicators.donchHigh[i-1];
          sell = price < indicators.donchLow[i-1]  && chartData[i-1].close >= indicators.donchLow[i-1];
          break;
        case 'Price_Volume':
          buy  = price > chartData[i-1].close * 1.01 && indicators.volumes[i] > indicators.volSMA[i] * volumeMult;
          sell = price < chartData[i-1].close * 0.99 && indicators.volumes[i] > indicators.volSMA[i] * volumeMult;
          break;
      }

      if (buy && !holding) {
        qty = Math.floor(balance / price);
        if (qty > 0) { entryPrice = price; holding = true; balance -= qty * price; trades.push({ type: 'BUY', date, price, qty, cumProfit }); }
      } else if (sell && holding) {
        const proceeds = qty * price;
        const pnl = proceeds - qty * entryPrice;
        const pnlPercent = ((price - entryPrice) / entryPrice) * 100;
        cumProfit += pnl; balance += proceeds; holding = false;
        trades.push({ type: 'SELL', date, price, qty, pnl, pnlPercent, cumProfit });
      }
    }

    if (holding) {
      const lp = chartData[chartData.length - 1];
      const proceeds = qty * lp.close;
      const pnl = proceeds - qty * entryPrice;
      const pnlPercent = ((lp.close - entryPrice) / entryPrice) * 100;
      cumProfit += pnl; balance += proceeds;
      trades.push({ type: 'SELL', date: lp.date, price: lp.close, qty, pnl, pnlPercent, cumProfit });
    }

    const sellTrades = trades.filter(t => t.type === 'SELL');
    const wins = sellTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = sellTrades.length > 0 ? (wins.length / sellTrades.length) * 100 : 0;
    const grossProfit = sellTrades.reduce((s, t) => s + Math.max(0, t.pnl || 0), 0);
    const grossLoss   = sellTrades.reduce((s, t) => s + Math.abs(Math.min(0, t.pnl || 0)), 0);
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 9.9 : 1.0) : parseFloat((grossProfit / grossLoss).toFixed(2));
    const overallReturn = (cumProfit / initialBalance) * 100;

    return { trades: trades.reverse(), winRate, profitFactor, overallReturn, totalTrades: sellTrades.length, finalValue: balance, winningTradesCount: wins.length };
  }, [indicators, strategy, chartData, runTrigger, rsiOversold, rsiOverbought, cciThreshold, adxThreshold, vwapDev, volumeMult, zscoreThreshold]);

  useEffect(() => {
    if (report && onMarkersChange) {
      const markers = report.trades.map(t => {
        const pt = chartData.find(p => p.date === t.date);
        if (!pt) return null;
        return { time: pt.time, position: t.type === 'BUY' ? 'belowBar' : 'aboveBar', color: t.type === 'BUY' ? '#10b981' : '#ef4444', shape: t.type === 'BUY' ? 'arrowUp' : 'arrowDown', text: t.type === 'BUY' ? 'BUY' : 'SELL' };
      }).filter(Boolean);
      onMarkersChange(markers);
    }
  }, [report, onMarkersChange, chartData]);

  const handleRunBacktest = () => {
    setBacktesting(true);
    setTimeout(() => { setRunTrigger(p => p + 1); setBacktesting(false); }, 600);
  };

  /* ── Inline parameter input helper ── */
  const PI = ({ label, value, onChange, step = 1, min = 0.001 }: { label: string; value: number; onChange: (_v: number) => void; step?: number; min?: number }) => (
    <div>
      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{label}</span>
      <input
        type="number" value={value} step={step} min={min}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 text-xs font-bold text-slate-800 dark:text-white pt-1 focus:outline-none"
      />
    </div>
  );

  const groupedStrategies = STRATEGY_LIST.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {} as Record<string, typeof STRATEGY_LIST>);

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            Strategy Backtesting Engine
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            20 Strategies · Testing on <span className="font-extrabold text-blue-500">{symbol.split('.')[0]}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={strategy}
            onChange={e => setStrategy(e.target.value as StrategyKey)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {Object.entries(groupedStrategies).map(([group, strats]) => (
              <optgroup key={group} label={`── ${group} ──`}>
                {strats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </optgroup>
            ))}
          </select>

          <button
            onClick={handleRunBacktest}
            disabled={backtesting || chartData.length < 50}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-[0.98]"
          >
            <Play className={`w-3.5 h-3.5 ${backtesting ? 'animate-spin' : ''}`} />
            {backtesting ? 'Evaluating...' : 'Run Backtest'}
          </button>
        </div>
      </div>

      {/* Dynamic parameters panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-905/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
        {strategy === 'EMA_Cross'         && (<><PI label="Fast EMA"        value={fastPeriod}      onChange={setFastPeriod}/><PI label="Slow EMA"        value={slowPeriod}      onChange={setSlowPeriod}/></>)}
        {strategy === 'SMA_Cross'         && (<PI label="SMA Period"        value={smaPeriod}       onChange={setSmaPeriod}/>)}
        {strategy === 'Triple_EMA'        && (<><PI label="Fast EMA"        value={tripleEmaFast}   onChange={setTripleEmaFast}/><PI label="Mid EMA"         value={tripleEmaMid}    onChange={setTripleEmaMid}/><PI label="Slow EMA"        value={tripleEmaSlow}   onChange={setTripleEmaSlow}/></>)}
        {strategy === 'MACD_Cross'        && (<><PI label="Fast"            value={macdFast}        onChange={setMacdFast}/><PI label="Slow"            value={macdSlow}        onChange={setMacdSlow}/><PI label="Signal"          value={macdSignal}      onChange={setMacdSignal}/></>)}
        {strategy === 'Supertrend'        && (<><PI label="ATR Period"      value={atrPeriod}       onChange={setAtrPeriod}/><PI label="Multiplier"      value={supertrendMult}  onChange={setSupertrendMult} step={0.5}/></>)}
        {strategy === 'Hull_MA'           && (<PI label="HMA Period"        value={hullPeriod}      onChange={setHullPeriod}/>)}
        {strategy === 'ADX_Trend'         && (<><PI label="ADX Period"      value={adxPeriod}       onChange={setAdxPeriod}/><PI label="Min Strength"    value={adxThreshold}    onChange={setAdxThreshold}/></>)}
        {strategy === 'Parabolic_SAR'     && (<><PI label="Step"            value={sarStep}         onChange={setSarStep} step={0.01}/><PI label="Max AF"          value={sarMax}          onChange={setSarMax} step={0.05}/></>)}
        {strategy === 'BB_Reversion'      && (<PI label="BB Period"         value={bbPeriod}        onChange={setBbPeriod}/>)}
        {strategy === 'Keltner_Reversion' && (<><PI label="EMA Period"      value={keltnerPeriod}   onChange={setKeltnerPeriod}/><PI label="ATR Mult"        value={keltnerMult}     onChange={setKeltnerMult} step={0.5}/></>)}
        {strategy === 'VWAP_Reversion'    && (<PI label="Deviation %"       value={vwapDev}         onChange={setVwapDev} step={0.5}/>)}
        {strategy === 'Mean_Reversion'    && (<><PI label="Z-Score Period"  value={zscorePeriod}    onChange={setZscorePeriod}/><PI label="Threshold (σ)"   value={zscoreThreshold} onChange={setZscoreThreshold} step={0.5}/></>)}
        {strategy === 'RSI_Breakout'      && (<><PI label="Oversold (Buy)"  value={rsiOversold}     onChange={setRsiOversold}/><PI label="Overbought (Sell)" value={rsiOverbought}   onChange={setRsiOverbought}/></>)}
        {strategy === 'Stochastic_Cross'  && (<><PI label="%K Period"       value={stochK}          onChange={setStochK}/><PI label="%D Smoothing"    value={stochD}          onChange={setStochD}/></>)}
        {strategy === 'CCI_Breakout'      && (<><PI label="CCI Period"      value={cciPeriod}       onChange={setCciPeriod}/><PI label="Threshold"        value={cciThreshold}    onChange={setCciThreshold}/></>)}
        {strategy === 'Williams_R'        && (<PI label="Period"            value={williamsRPeriod} onChange={setWilliamsRPeriod}/>)}
        {strategy === 'Dual_RSI'          && (<><PI label="Short RSI"       value={dualRsiShort}    onChange={setDualRsiShort}/><PI label="Long RSI"         value={dualRsiLong}     onChange={setDualRsiLong}/></>)}
        {strategy === 'Momentum'          && (<PI label="ROC Period"        value={momentumPeriod}  onChange={setMomentumPeriod}/>)}
        {strategy === 'Donchian_Breakout' && (<PI label="Channel Period"    value={donchianPeriod}  onChange={setDonchianPeriod}/>)}
        {strategy === 'Price_Volume'      && (<><PI label="Vol SMA Period"  value={volumePeriod}    onChange={setVolumePeriod}/><PI label="Vol Multiplier"   value={volumeMult}      onChange={setVolumeMult} step={0.5}/></>)}

        {/* Always-visible info cells */}
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Initial Balance</span>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">₹1,00,000</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Historical Rows</span>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">{chartData.length} Candles</p>
        </div>
      </div>

      {/* Results */}
      {chartData.length < 50 ? (
        <div className="p-8 text-center text-xs text-slate-500 font-medium">Insufficient historical candle data to backtest (Minimum 50 candles required).</div>
      ) : report ? (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Overall Return',       val: `${report.overallReturn >= 0 ? '+' : ''}${report.overallReturn.toFixed(2)}%`, cls: report.overallReturn >= 0 ? 'text-emerald-500' : 'text-red-500' },
              { label: 'Win Rate',             val: `${report.winRate.toFixed(1)}%`,     cls: 'text-blue-500' },
              { label: 'Profit Factor',        val: `${report.profitFactor}`,             cls: 'text-slate-900 dark:text-white' },
              { label: 'Closed Trades',        val: `${report.totalTrades}`,              cls: 'text-slate-900 dark:text-white' },
            ].map(card => (
              <div key={card.label} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">{card.label}</span>
                <h4 className={`text-base font-black mt-1 ${card.cls}`}>{card.val}</h4>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Simulated Trades Ledger
            </h4>
            {report.trades.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">Strategy triggered zero trades in this timeframe.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs font-semibold">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800/80 text-slate-400 uppercase tracking-widest font-black text-[9px]">
                      <th className="p-3">Action</th><th className="p-3">Date</th>
                      <th className="p-3 text-right">Price (₹)</th><th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">P&amp;L (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-mono text-slate-700 dark:text-slate-350">
                    {report.trades.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/10">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${t.type === 'BUY' ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>{t.type}</span>
                        </td>
                        <td className="p-3 font-sans font-medium">{t.date}</td>
                        <td className="p-3 text-right">₹{t.price.toFixed(2)}</td>
                        <td className="p-3 text-right">{t.qty.toLocaleString()}</td>
                        <td className={`p-3 text-right font-black ${t.pnl === undefined ? 'text-slate-400' : t.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {t.pnl === undefined || t.pnlPercent === undefined ? '--' : `₹${t.pnl.toFixed(2)} (${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent.toFixed(1)}%)`}
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
