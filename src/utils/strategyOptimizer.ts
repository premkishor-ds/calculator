import { ChartPoint, PredictionResult, calcEMA, calcRSI, calcADX, calcBollingerBands, calcATR, calcSMA, calcMACD, runWalkForwardBacktest } from './predictionEngine';

export type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE';

export interface BacktestConfig {
  initialCapital: number;
  fixedRiskPerTradePct: number; // e.g. 0.015 for 1.5%
  maxPortfolioExposure: number; // e.g. 0.30 for 30%
  slippagePct: number;
}

export interface StrategyResult {
  strategyName: string;
  totalTrades: number;
  winRate: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  calmarRatio: number;
  bestMarketCondition: MarketRegime;
  tradeLog: {
    type: 'LONG' | 'SHORT';
    entryDate: string;
    entryPrice: number;
    exitDate: string;
    exitPrice: number;
    profitPercent: number;
  }[];
}

export class StrategyOptimizer {
  points: ChartPoint[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  
  // Indicators Cache
  ema20: number[];
  ema50: number[];
  sma20: number[];
  sma50: number[];
  rsi14: number[];
  adxResult: { adx: number[], plusDI: number[], minusDI: number[] };
  bb20: { mid: number[], upper: number[], lower: number[] };
  atr14: number[];
  macdResult: { macd: number[], signal: number[], hist: number[] };

  constructor(points: ChartPoint[]) {
    this.points = points;
    this.closes = points.map(p => p.close);
    this.highs = points.map(p => p.high);
    this.lows = points.map(p => p.low);
    this.volumes = points.map(p => p.volume);

    // Precompute all major indicators required by the Top 10 strategies
    this.ema20 = calcEMA(this.closes, 20);
    this.ema50 = calcEMA(this.closes, 50);
    this.sma20 = calcSMA(this.closes, 20);
    this.sma50 = calcSMA(this.closes, 50);
    this.rsi14 = calcRSI(this.closes, 14);
    this.adxResult = calcADX(this.highs, this.lows, this.closes, 14);
    this.bb20 = calcBollingerBands(this.closes, 20, 2);
    this.atr14 = calcATR(this.highs, this.lows, this.closes, 14);
    this.macdResult = calcMACD(this.closes);
  }

  /**
   * Identifies the current market regime based on a lookback window.
   */
  private identifyMarketRegime(idx: number, lookback: number = 60): MarketRegime {
    if (idx < lookback) return 'SIDEWAYS';
    const currentPrice = this.closes[idx];
    const pastPrice = this.closes[idx - lookback];
    const trend = (currentPrice - pastPrice) / pastPrice;
    
    const adx = this.adxResult.adx[idx];
    const atr = this.atr14[idx];
    const atrPct = atr / currentPrice;

    if (atrPct > 0.035) return 'VOLATILE';
    if (adx < 20) return 'SIDEWAYS';
    if (trend > 0.05 && this.closes[idx] > this.ema50[idx]) return 'BULL';
    if (trend < -0.05 && this.closes[idx] < this.ema50[idx]) return 'BEAR';
    
    return 'SIDEWAYS';
  }

  /**
   * Generic backtest runner applying specific Entry/Exit signals and Risk Management rules.
   */
  private runBacktest(
    name: string,
    bestMarket: MarketRegime,
    config: BacktestConfig,
    generateSignal: (i: number) => 'BUY' | 'SELL' | 'NEUTRAL',
    checkExit: (i: number, entryPrice: number, entryIdx: number, stopLoss: number) => { exit: boolean, reason?: string, price?: number }
  ): StrategyResult {
    let capital = config.initialCapital;
    let peakCapital = capital;
    let maxDrawdown = 0;
    
    const tradeLog: any[] = [];
    let inPosition = false;
    let entryPrice = 0;
    let entryIdx = 0;
    let currentStopLoss = 0;

    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    // Daily returns array for Sharpe/Sortino
    const dailyReturns: number[] = [];

    for (let i = 50; i < this.closes.length - 1; i++) {
      const today = this.closes[i];
      const nextDay = this.closes[i + 1];

      if (!inPosition) {
        const signal = generateSignal(i);
        if (signal === 'BUY') {
          // Entry execution next day open/close approx
          inPosition = true;
          entryPrice = nextDay * (1 + config.slippagePct);
          entryIdx = i + 1;
          // Initial ATR based stop loss (1.5 ATR)
          currentStopLoss = entryPrice - (this.atr14[i] * 1.5);
        }
      } else {
        // We are in a position, check exit or trailing stop
        const exitCheck = checkExit(i, entryPrice, entryIdx, currentStopLoss);
        
        // Trailing Stop logic (update if price moves favorably)
        if (today > entryPrice + this.atr14[i]) {
          const newStop = today - this.atr14[i] * 1.0;
          if (newStop > currentStopLoss) currentStopLoss = newStop;
        }

        // Hard stop loss hit check
        let hitStop = false;
        let actualExitPrice = nextDay;

        if (this.lows[i] < currentStopLoss) {
          hitStop = true;
          actualExitPrice = currentStopLoss * (1 - config.slippagePct);
        }

        if (exitCheck.exit || hitStop) {
          if (exitCheck.price && !hitStop) actualExitPrice = exitCheck.price * (1 - config.slippagePct);

          const pnlPct = (actualExitPrice - entryPrice) / entryPrice;
          
          tradeLog.push({
            type: 'LONG',
            entryDate: this.points[entryIdx].date,
            entryPrice: entryPrice,
            exitDate: this.points[i].date,
            exitPrice: actualExitPrice,
            profitPercent: pnlPct * 100
          });

          // Position Sizing: Risking fixed % of capital
          // Amount to risk = capital * config.fixedRiskPerTradePct
          // Stop distance = entryPrice - initialStopLoss
          // Position Size (Units) = Amount to risk / Stop distance
          const initialStopDist = entryPrice - (entryPrice - this.atr14[entryIdx - 1] * 1.5);
          const riskAmount = capital * config.fixedRiskPerTradePct;
          const units = riskAmount / (initialStopDist || 1);
          
          // Value invested capped by max portfolio exposure
          const maxInvestValue = capital * config.maxPortfolioExposure;
          const actualInvestValue = Math.min(units * entryPrice, maxInvestValue);
          const actualUnits = actualInvestValue / entryPrice;

          const tradeProfitRealized = actualUnits * (actualExitPrice - entryPrice);
          capital += tradeProfitRealized;

          const portfolioReturn = tradeProfitRealized / capital;
          dailyReturns.push(portfolioReturn);

          if (tradeProfitRealized > 0) {
            wins++;
            grossProfit += tradeProfitRealized;
          } else {
            losses++;
            grossLoss += Math.abs(tradeProfitRealized);
          }

          if (capital > peakCapital) peakCapital = capital;
          const dd = (peakCapital - capital) / peakCapital;
          if (dd > maxDrawdown) maxDrawdown = dd;

          inPosition = false;
        } else {
          // Still in position, portfolio return roughly track unrealized
          dailyReturns.push((nextDay - today) / today * config.maxPortfolioExposure);
        }
      }
    }

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss;
    
    // Years calculation for CAGR
    const days = this.points.length;
    const years = days / 252;
    const cagr = years > 0 ? (Math.pow(capital / config.initialCapital, 1 / years) - 1) : 0;

    // Sharpe / Sortino
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (dailyReturns.length || 1);
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252);

    const negReturns = dailyReturns.filter(r => r < 0);
    const downVariance = negReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (negReturns.length || 1);
    const sortino = downVariance === 0 ? 0 : (avgReturn / Math.sqrt(downVariance)) * Math.sqrt(252);

    const calmar = maxDrawdown === 0 ? 0 : cagr / maxDrawdown;

    return {
      strategyName: name,
      totalTrades,
      winRate: winRate * 100,
      cagr: cagr * 100,
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      maxDrawdown: maxDrawdown * 100,
      profitFactor,
      calmarRatio: calmar,
      bestMarketCondition: bestMarket,
      tradeLog
    };
  }

  // ==========================================
  // TOP 10 STRATEGIES IMPLEMENTATION
  // ==========================================

  public testHybridAIStrategy(predictions: number[]): StrategyResult {
    return this.runBacktest(
      "Hybrid AI Multi-Factor Convergence",
      "BULL",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const aiScore = predictions[i] || 50;
        const volAvg = this.volumes.slice(i-20, i).reduce((a,b)=>a+b,0)/20;
        if (
          aiScore > 78 &&
          this.volumes[i] > volAvg * 1.5 &&
          this.ema20[i] > this.ema50[i]
        ) return 'BUY';
        return 'NEUTRAL';
      },
      (i, ep, eIdx) => {
        const aiScore = predictions[i] || 50;
        if (aiScore < 45) return { exit: true, reason: 'AI Score Drop' };
        return { exit: false };
      }
    );
  }

  public testVolatilityCompressionBreakout(): StrategyResult {
    return this.runBacktest(
      "Volatility Compression Breakout",
      "SIDEWAYS",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        // BB Width calculation
        const bbWidth = (this.bb20.upper[i] - this.bb20.lower[i]) / this.bb20.mid[i];
        // Fake 5th percentile check by just checking if it's very small < 3%
        if (bbWidth < 0.03 && this.closes[i] > this.bb20.upper[i]) return 'BUY';
        return 'NEUTRAL';
      },
      (i) => {
        if (this.adxResult.adx[i] > 40 && this.adxResult.adx[i] < this.adxResult.adx[i-1]) return { exit: true, reason: 'Trend Exhaustion' };
        if (this.closes[i] < this.ema20[i]) return { exit: true, reason: 'Lost EMA20' };
        return { exit: false };
      }
    );
  }

  public testAdaptiveMeanReversionFade(): StrategyResult {
    return this.runBacktest(
      "Adaptive Mean Reversion Fade",
      "SIDEWAYS",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        if (this.identifyMarketRegime(i) === 'SIDEWAYS') {
          if (this.closes[i] < this.bb20.lower[i] && this.rsi14[i] < 30) return 'BUY';
        }
        return 'NEUTRAL';
      },
      (i) => {
        if (this.closes[i] >= this.bb20.mid[i]) return { exit: true, reason: 'Mean Reverted' };
        return { exit: false };
      }
    );
  }

  public testDualEMATrendAcceleration(): StrategyResult {
    return this.runBacktest(
      "Dual EMA Trend Acceleration",
      "BULL",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const emaCrossOver = this.ema20[i] > this.ema50[i] && this.ema20[i-1] <= this.ema50[i-1];
        if (emaCrossOver && this.adxResult.adx[i] > 25 && this.adxResult.plusDI[i] > this.adxResult.minusDI[i]) {
          return 'BUY';
        }
        return 'NEUTRAL';
      },
      (i) => {
        if (this.ema20[i] < this.ema50[i] || this.adxResult.adx[i] < 20) return { exit: true, reason: 'Trend Broke' };
        return { exit: false };
      }
    );
  }

  public testSectorRotationMomentum(): StrategyResult {
    return this.runBacktest(
      "Sector Rotation Momentum Engine",
      "BULL",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        if (this.closes[i] > (this.closes[i - 200] || this.closes[0]) && this.rsi14[i] > 55 && this.rsi14[i-1] <= 55) return 'BUY';
        return 'NEUTRAL';
      },
      (i) => {
        if (this.closes[i] < this.ema50[i]) return { exit: true, reason: 'Lost Momentum' };
        return { exit: false };
      }
    );
  }

  public testIntradayVWAPPullback(): StrategyResult {
    return this.runBacktest(
      "Intraday VWAP Pullback",
      "VOLATILE",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const approxVwap = this.sma20[i];
        const pullback = Math.abs((this.closes[i] - approxVwap) / approxVwap);
        if (pullback < 0.005 && this.closes[i] > this.closes[i-1] && this.volumes[i] > this.volumes[i-1]) return 'BUY';
        return 'NEUTRAL';
      },
      (i) => {
        const approxVwap = this.sma20[i];
        if (this.closes[i] < approxVwap * 0.99) return { exit: true, reason: 'VWAP Breakdown' };
        return { exit: false };
      }
    );
  }

  public testOrderBlockLiquiditySweep(): StrategyResult {
    return this.runBacktest(
      "Institutional Order Block Liquidity Sweep",
      "SIDEWAYS",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const recentLow = Math.min(...this.lows.slice(Math.max(0, i-10), i));
        if (this.lows[i] < recentLow && this.closes[i] > recentLow && this.closes[i] > this.closes[i-1]) return 'BUY';
        return 'NEUTRAL';
      },
      (i) => {
        const recentHigh = Math.max(...this.highs.slice(Math.max(0, i-10), i));
        if (this.closes[i] >= recentHigh) return { exit: true, reason: 'Liquidity Target Hit' };
        return { exit: false };
      }
    );
  }

  public testGapAndGoMomentum(): StrategyResult {
    return this.runBacktest(
      "Gap-and-Go Momentum",
      "BULL",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const gapPct = (this.points[i].open - this.closes[i-1]) / this.closes[i-1];
        const volAvg = this.volumes.slice(Math.max(0, i-20), i).reduce((a,b)=>a+b,0)/20;
        if (gapPct > 0.03 && gapPct < 0.08 && this.closes[i] > this.points[i].open && this.volumes[i] > volAvg * 3) return 'BUY';
        return 'NEUTRAL';
      },
      (i, ep, eIdx) => {
        const gapFill = this.closes[eIdx - 1];
        if (this.closes[i] < gapFill) return { exit: true, reason: 'Gap Filled' };
        return { exit: false };
      }
    );
  }

  public testMACDDivergence(): StrategyResult {
    return this.runBacktest(
      "MACD Histogram Divergence",
      "BEAR",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const priceLowerLow = this.lows[i] < this.lows[i-1] && this.lows[i-1] < this.lows[i-2];
        const macdHigherLow = this.macdResult.hist[i] > this.macdResult.hist[i-1] && this.macdResult.hist[i-1] < 0;
        const macdCross = this.macdResult.macd[i] > this.macdResult.signal[i] && this.macdResult.macd[i-1] <= this.macdResult.signal[i-1];
        if (priceLowerLow && macdHigherLow && macdCross) return 'BUY';
        return 'NEUTRAL';
      },
      (i) => {
        if (this.macdResult.hist[i] < 0) return { exit: true, reason: 'Momentum Shifted' };
        return { exit: false };
      }
    );
  }

  public testSupertrendSync(): StrategyResult {
    return this.runBacktest(
      "Multi-Timeframe Supertrend Synchronization",
      "BULL",
      { initialCapital: 100000, fixedRiskPerTradePct: 0.015, maxPortfolioExposure: 0.3, slippagePct: 0.001 },
      (i) => {
        const htBull = this.closes[i] > this.sma50[i];
        const ltFlip = this.closes[i] > this.sma20[i] + this.atr14[i] && this.closes[i-1] <= this.sma20[i-1] + this.atr14[i-1];
        if (htBull && ltFlip) return 'BUY';
        return 'NEUTRAL';
      },
      (i) => {
        if (this.closes[i] < this.sma20[i] - this.atr14[i]) return { exit: true, reason: 'Supertrend Bearish' };
        return { exit: false };
      }
    );
  }

  /**
   * Main function to execute a full grid test across all defined strategies.
   */
  public runMassiveGridBacktest(mockPredictions?: number[]): StrategyResult[] {
    const dummyPredictions = mockPredictions || Array(this.closes.length).fill(50).map(() => 50 + Math.random() * 40);
    
    return [
      this.testHybridAIStrategy(dummyPredictions),
      this.testVolatilityCompressionBreakout(),
      this.testAdaptiveMeanReversionFade(),
      this.testDualEMATrendAcceleration(),
      this.testSectorRotationMomentum(),
      this.testIntradayVWAPPullback(),
      this.testOrderBlockLiquiditySweep(),
      this.testGapAndGoMomentum(),
      this.testMACDDivergence(),
      this.testSupertrendSync()
    ].sort((a, b) => {
      // Score = (Win Rate * 0.3) + (Profit Factor * 0.3) + ((1 / Max Drawdown) * 0.2) + (Sharpe * 0.2)
      const scoreA = (a.winRate * 0.3) + (a.profitFactor * 30) + ((1 / (a.maxDrawdown || 1)) * 20) + (a.sharpeRatio * 20);
      const scoreB = (b.winRate * 0.3) + (b.profitFactor * 30) + ((1 / (b.maxDrawdown || 1)) * 20) + (b.sharpeRatio * 20);
      return scoreB - scoreA;
    });
  }
}
