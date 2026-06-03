import { NextRequest, NextResponse } from 'next/server';

import { yahooFinance } from '@/lib/yahoo-finance';

// ─── Cache ────────────────────────────────────────────────────────────────────
const cache = new Map<string, { data: AIScoreResult; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AIScoreResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  sector: string;

  // 5-factor weighted score (0–100)
  aiScore: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'WEAK' | 'SELL';
  recommendationLabel: string;

  // Component scores (0–100 each)
  technicalScore: number;
  fundamentalScore: number;
  momentumScore: number;
  riskScore: number;       // inverted: higher = safer
  sentimentScore: number;

  // Score breakdown for explainability
  breakdown: {
    technical: { score: number; weight: number; signals: string[] };
    fundamental: { score: number; weight: number; signals: string[] };
    momentum: { score: number; weight: number; signals: string[] };
    risk: { score: number; weight: number; signals: string[] };
    sentiment: { score: number; weight: number; signals: string[] };
  };

  // Key metrics
  pe: number;
  roe: number;
  debtToEquity: number;
  rsi: number;
  relativeStrength52w: number; // % from 52w low
  distanceFrom52wHigh: number; // % below 52w high

  error?: string;
}

// ─── Weights (must sum to 1.0) ────────────────────────────────────────────────
const WEIGHTS = {
  technical:   0.35,
  fundamental: 0.35,
  momentum:    0.15,
  risk:        0.10,
  sentiment:   0.05,
};

// ─── Score → Recommendation ───────────────────────────────────────────────────
function scoreToRecommendation(score: number): AIScoreResult['recommendation'] {
  if (score >= 90) return 'STRONG_BUY';
  if (score >= 75) return 'BUY';
  if (score >= 60) return 'HOLD';
  if (score >= 40) return 'WEAK';
  return 'SELL';
}

const RECOMMENDATION_LABELS: Record<AIScoreResult['recommendation'], string> = {
  STRONG_BUY: 'Strong Buy',
  BUY: 'Buy',
  HOLD: 'Hold',
  WEAK: 'Weak',
  SELL: 'Sell',
};

// ─── Clamp helper ─────────────────────────────────────────────────────────────
function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// ─── Technical Score (35%) ────────────────────────────────────────────────────
// Inputs: price vs 50d/200d MA, 52w position, change%
function calcTechnicalScore(
  price: number,
  ma50: number,
  ma200: number,
  high52w: number,
  low52w: number,
  changePercent: number,
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let raw = 50; // neutral baseline

  // 1. Price vs 50-day MA (±15 pts)
  if (ma50 > 0) {
    const pct = (price - ma50) / ma50;
    if (pct > 0.05) { raw += 15; signals.push(`Price ${(pct*100).toFixed(1)}% above 50-day MA`); }
    else if (pct > 0)  { raw += 8;  signals.push(`Price above 50-day MA`); }
    else if (pct > -0.05) { raw -= 8; signals.push(`Price slightly below 50-day MA`); }
    else { raw -= 15; signals.push(`Price ${Math.abs(pct*100).toFixed(1)}% below 50-day MA`); }
  }

  // 2. Price vs 200-day MA (±12 pts) — golden/death cross proxy
  if (ma200 > 0) {
    const pct = (price - ma200) / ma200;
    if (pct > 0.10) { raw += 12; signals.push(`Price ${(pct*100).toFixed(1)}% above 200-day MA (Golden Zone)`); }
    else if (pct > 0) { raw += 6; signals.push(`Price above 200-day MA`); }
    else { raw -= 12; signals.push(`Price below 200-day MA (Death Zone)`); }
  }

  // 3. 52-week position (±10 pts)
  const range52w = high52w - low52w;
  if (range52w > 0) {
    const pos = (price - low52w) / range52w; // 0=at low, 1=at high
    if (pos > 0.75) { raw += 10; signals.push(`Trading in upper 25% of 52-week range`); }
    else if (pos > 0.50) { raw += 5; signals.push(`Trading above 52-week midpoint`); }
    else if (pos < 0.25) { raw -= 10; signals.push(`Trading near 52-week low`); }
    else { raw -= 5; signals.push(`Trading in lower half of 52-week range`); }
  }

  // 4. Recent momentum (±8 pts)
  if (changePercent > 2)       { raw += 8; signals.push(`Strong positive daily momentum +${changePercent.toFixed(1)}%`); }
  else if (changePercent > 0)  { raw += 3; signals.push(`Positive daily momentum`); }
  else if (changePercent < -2) { raw -= 8; signals.push(`Strong negative daily momentum ${changePercent.toFixed(1)}%`); }
  else                         { raw -= 3; signals.push(`Negative daily momentum`); }

  return { score: clamp(raw), signals };
}

// ─── Fundamental Score (35%) ──────────────────────────────────────────────────
// Inputs: PE, ROE, D/E, profit margin, revenue growth, EPS growth
function calcFundamentalScore(
  pe: number,
  roe: number,
  debtToEquity: number,
  profitMargin: number,
  revenueGrowth: number,
  earningsGrowth: number,
  pegRatio: number,
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let raw = 50;

  // 1. PE Ratio (±15 pts)
  if (pe > 0) {
    if (pe < 15)       { raw += 15; signals.push(`Attractive PE ratio of ${pe.toFixed(1)}x (< 15)`); }
    else if (pe < 25)  { raw += 8;  signals.push(`Reasonable PE ratio of ${pe.toFixed(1)}x`); }
    else if (pe < 40)  { raw -= 5;  signals.push(`Elevated PE ratio of ${pe.toFixed(1)}x`); }
    else               { raw -= 15; signals.push(`High PE ratio of ${pe.toFixed(1)}x (> 40)`); }
  }

  // 2. ROE (±12 pts)
  if (roe > 20)       { raw += 12; signals.push(`Excellent ROE of ${roe.toFixed(1)}% (> 20%)`); }
  else if (roe > 15)  { raw += 8;  signals.push(`Good ROE of ${roe.toFixed(1)}%`); }
  else if (roe > 8)   { raw += 3;  signals.push(`Moderate ROE of ${roe.toFixed(1)}%`); }
  else if (roe > 0)   { raw -= 8;  signals.push(`Low ROE of ${roe.toFixed(1)}%`); }
  else                { raw -= 12; signals.push(`Negative ROE`); }

  // 3. Debt/Equity (±10 pts)
  if (debtToEquity === 0)      { raw += 10; signals.push(`Debt-free company`); }
  else if (debtToEquity < 30)  { raw += 7;  signals.push(`Low D/E ratio of ${debtToEquity.toFixed(0)}%`); }
  else if (debtToEquity < 100) { raw += 2;  signals.push(`Moderate D/E ratio of ${debtToEquity.toFixed(0)}%`); }
  else if (debtToEquity < 200) { raw -= 7;  signals.push(`High D/E ratio of ${debtToEquity.toFixed(0)}%`); }
  else                         { raw -= 10; signals.push(`Very high D/E ratio of ${debtToEquity.toFixed(0)}%`); }

  // 4. Profit margin (±8 pts)
  if (profitMargin > 20)      { raw += 8; signals.push(`High profit margin of ${profitMargin.toFixed(1)}%`); }
  else if (profitMargin > 10) { raw += 4; signals.push(`Healthy profit margin of ${profitMargin.toFixed(1)}%`); }
  else if (profitMargin > 0)  { raw += 1; signals.push(`Thin profit margin of ${profitMargin.toFixed(1)}%`); }
  else                        { raw -= 8; signals.push(`Negative profit margin`); }

  // 5. Revenue growth (±5 pts)
  if (revenueGrowth > 20)      { raw += 5; signals.push(`Strong revenue growth of ${revenueGrowth.toFixed(1)}%`); }
  else if (revenueGrowth > 10) { raw += 3; signals.push(`Solid revenue growth of ${revenueGrowth.toFixed(1)}%`); }
  else if (revenueGrowth < 0)  { raw -= 5; signals.push(`Declining revenue ${revenueGrowth.toFixed(1)}%`); }

  // 6. PEG ratio bonus (±5 pts)
  if (pegRatio > 0 && pegRatio < 1)  { raw += 5; signals.push(`Undervalued PEG ratio of ${pegRatio.toFixed(2)}`); }
  else if (pegRatio > 2)             { raw -= 5; signals.push(`Overvalued PEG ratio of ${pegRatio.toFixed(2)}`); }

  return { score: clamp(raw), signals };
}

// ─── Momentum Score (15%) ─────────────────────────────────────────────────────
// Inputs: 52w relative strength, earnings growth, volume ratio proxy
function calcMomentumScore(
  relativeStrength52w: number, // % above 52w low
  earningsGrowth: number,
  changePercent: number,
  distanceFrom52wHigh: number, // % below 52w high (negative = below)
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let raw = 50;

  // 1. 52-week relative strength (±20 pts)
  if (relativeStrength52w > 80)      { raw += 20; signals.push(`Strong 52w RS: ${relativeStrength52w.toFixed(0)}% above 52w low`); }
  else if (relativeStrength52w > 50) { raw += 10; signals.push(`Moderate 52w RS: ${relativeStrength52w.toFixed(0)}% above 52w low`); }
  else if (relativeStrength52w < 20) { raw -= 20; signals.push(`Weak 52w RS: only ${relativeStrength52w.toFixed(0)}% above 52w low`); }
  else                               { raw -= 5;  signals.push(`Below-average 52w RS`); }

  // 2. Earnings growth momentum (±15 pts)
  if (earningsGrowth > 25)      { raw += 15; signals.push(`Accelerating earnings growth ${earningsGrowth.toFixed(1)}%`); }
  else if (earningsGrowth > 10) { raw += 8;  signals.push(`Positive earnings growth ${earningsGrowth.toFixed(1)}%`); }
  else if (earningsGrowth < -10){ raw -= 15; signals.push(`Earnings declining ${earningsGrowth.toFixed(1)}%`); }
  else if (earningsGrowth < 0)  { raw -= 5;  signals.push(`Slight earnings decline`); }

  // 3. Distance from 52w high (±10 pts) — closer to high = stronger momentum
  if (distanceFrom52wHigh > -5)       { raw += 10; signals.push(`Near 52-week high (${distanceFrom52wHigh.toFixed(1)}% below)`); }
  else if (distanceFrom52wHigh > -15) { raw += 5;  signals.push(`Within 15% of 52-week high`); }
  else if (distanceFrom52wHigh < -40) { raw -= 10; signals.push(`${Math.abs(distanceFrom52wHigh).toFixed(0)}% below 52-week high`); }

  return { score: clamp(raw), signals };
}

// ─── Risk Score (10%) — higher = lower risk ───────────────────────────────────
// Inputs: beta, D/E, current ratio, volatility proxy (52w range %)
function calcRiskScore(
  beta: number,
  debtToEquity: number,
  currentRatio: number,
  volatility52w: number, // (high-low)/low * 100
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let raw = 60; // start slightly above neutral (most stocks are investable)

  // 1. Beta (±20 pts)
  if (beta > 0) {
    if (beta < 0.8)      { raw += 20; signals.push(`Low beta of ${beta.toFixed(2)} (defensive)`); }
    else if (beta < 1.2) { raw += 10; signals.push(`Market-neutral beta of ${beta.toFixed(2)}`); }
    else if (beta < 1.8) { raw -= 10; signals.push(`High beta of ${beta.toFixed(2)} (volatile)`); }
    else                 { raw -= 20; signals.push(`Very high beta of ${beta.toFixed(2)} (speculative)`); }
  }

  // 2. Debt risk (±15 pts)
  if (debtToEquity === 0)      { raw += 15; signals.push(`Zero debt — minimal financial risk`); }
  else if (debtToEquity < 50)  { raw += 8;  signals.push(`Low leverage D/E ${debtToEquity.toFixed(0)}%`); }
  else if (debtToEquity > 200) { raw -= 15; signals.push(`Dangerous leverage D/E ${debtToEquity.toFixed(0)}%`); }
  else if (debtToEquity > 100) { raw -= 8;  signals.push(`High leverage D/E ${debtToEquity.toFixed(0)}%`); }

  // 3. Liquidity (±10 pts)
  if (currentRatio > 2)        { raw += 10; signals.push(`Strong liquidity ratio ${currentRatio.toFixed(1)}x`); }
  else if (currentRatio > 1.5) { raw += 5;  signals.push(`Adequate liquidity ratio ${currentRatio.toFixed(1)}x`); }
  else if (currentRatio < 1)   { raw -= 10; signals.push(`Liquidity risk: current ratio ${currentRatio.toFixed(1)}x`); }

  // 4. 52w volatility (±10 pts)
  if (volatility52w < 30)      { raw += 10; signals.push(`Low 52w volatility ${volatility52w.toFixed(0)}%`); }
  else if (volatility52w < 60) { raw += 3;  signals.push(`Moderate 52w volatility ${volatility52w.toFixed(0)}%`); }
  else if (volatility52w > 100){ raw -= 10; signals.push(`Extreme 52w volatility ${volatility52w.toFixed(0)}%`); }
  else                         { raw -= 5;  signals.push(`High 52w volatility ${volatility52w.toFixed(0)}%`); }

  return { score: clamp(raw), signals };
}

// ─── Sentiment Score (5%) ─────────────────────────────────────────────────────
// Inputs: analyst target vs price, insider/promoter holding, dividend yield
function calcSentimentScore(
  analystTargetPrice: number,
  price: number,
  promHold: number,
  divYield: number,
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let raw = 50;

  // 1. Analyst target upside (±25 pts)
  if (analystTargetPrice > 0 && price > 0) {
    const upside = ((analystTargetPrice - price) / price) * 100;
    if (upside > 30)       { raw += 25; signals.push(`Analyst target implies ${upside.toFixed(0)}% upside`); }
    else if (upside > 15)  { raw += 15; signals.push(`Analyst target implies ${upside.toFixed(0)}% upside`); }
    else if (upside > 0)   { raw += 5;  signals.push(`Analyst target implies ${upside.toFixed(0)}% upside`); }
    else if (upside < -10) { raw -= 25; signals.push(`Analyst target implies ${Math.abs(upside).toFixed(0)}% downside`); }
    else                   { raw -= 10; signals.push(`Analyst target near current price`); }
  }

  // 2. Promoter/insider holding (±15 pts)
  if (promHold > 60)       { raw += 15; signals.push(`High promoter holding ${promHold.toFixed(1)}%`); }
  else if (promHold > 40)  { raw += 8;  signals.push(`Moderate promoter holding ${promHold.toFixed(1)}%`); }
  else if (promHold < 20)  { raw -= 15; signals.push(`Low promoter holding ${promHold.toFixed(1)}%`); }

  // 3. Dividend yield (±10 pts)
  if (divYield > 3)        { raw += 10; signals.push(`Attractive dividend yield ${divYield.toFixed(1)}%`); }
  else if (divYield > 1)   { raw += 5;  signals.push(`Dividend yield ${divYield.toFixed(1)}%`); }

  return { score: clamp(raw), signals };
}

// ─── Score single symbol ──────────────────────────────────────────────────────
async function scoreSymbol(rawSymbol: string): Promise<AIScoreResult> {
  const symbol = (rawSymbol.trim().includes('.') ? rawSymbol.trim() : `${rawSymbol.trim()}.NS`).toUpperCase();

  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const qs = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryDetail',
        'defaultKeyStatistics',
        'financialData',
        'majorHoldersBreakdown',
        'assetProfile',
      ],
    }) as any;

    const price   = qs.price           || {};
    const detail  = qs.summaryDetail   || {};
    const stats   = qs.defaultKeyStatistics || {};
    const fin     = qs.financialData   || {};
    const holders = qs.majorHoldersBreakdown || {};
    const profile = qs.assetProfile    || {};

    const currentPrice   = price.regularMarketPrice || 0;
    const changePercent  = (price.regularMarketChangePercent || 0) * 100;
    const change         = price.regularMarketChange || 0;
    const marketCap      = price.marketCap || 0;
    const name           = price.shortName || price.longName || symbol;
    const sector         = profile.sector || 'N/A';

    const ma50           = detail.fiftyDayAverage || stats.fiftyDayAverage || 0;
    const ma200          = detail.twoHundredDayAverage || stats.twoHundredDayAverage || 0;
    const high52w        = detail.fiftyTwoWeekHigh || stats.fiftyTwoWeekHigh || currentPrice;
    const low52w         = detail.fiftyTwoWeekLow  || stats.fiftyTwoWeekLow  || currentPrice;
    const beta           = stats.beta || detail.beta || 1.0;
    const analystTarget  = fin.targetMeanPrice || fin.targetHighPrice || 0;

    const pe             = detail.trailingPE || detail.forwardPE || stats.forwardPE || 0;
    const roe            = (fin.returnOnEquity || 0) * 100;
    const debtToEquity   = fin.debtToEquity || 0;
    const profitMargin   = (fin.profitMargins || 0) * 100;
    const revenueGrowth  = (fin.revenueGrowth || 0) * 100;
    const earningsGrowth = (fin.earningsGrowth || stats.earningsQuarterlyGrowth || 0) * 100;
    const pegRatio       = stats.pegRatio || 0;
    const currentRatio   = fin.currentRatio || 0;
    const promHold       = (holders.insidersPercentHeld || stats.heldPercentInsiders || 0) * 100;
    const divYield       = (detail.dividendYield || 0) * 100;

    // Derived metrics
    const range52w           = high52w - low52w || 1;
    const relativeStrength52w = low52w > 0 ? ((currentPrice - low52w) / range52w) * 100 : 50;
    const distanceFrom52wHigh = high52w > 0 ? ((currentPrice - high52w) / high52w) * 100 : 0;
    const volatility52w       = low52w > 0 ? (range52w / low52w) * 100 : 50;

    // RSI proxy: use distance from 52w midpoint as a simple momentum proxy
    // (true RSI requires OHLCV history — not available in quoteSummary)
    const rsiProxy = clamp(50 + (relativeStrength52w - 50) * 0.6);

    // ── Compute component scores ──────────────────────────────────────────────
    const tech  = calcTechnicalScore(currentPrice, ma50, ma200, high52w, low52w, changePercent);
    const fund  = calcFundamentalScore(pe, roe, debtToEquity, profitMargin, revenueGrowth, earningsGrowth, pegRatio);
    const mom   = calcMomentumScore(relativeStrength52w, earningsGrowth, changePercent, distanceFrom52wHigh);
    const risk  = calcRiskScore(beta, debtToEquity, currentRatio, volatility52w);
    const sent  = calcSentimentScore(analystTarget, currentPrice, promHold, divYield);

    // ── Weighted AI Score ─────────────────────────────────────────────────────
    const aiScore = clamp(
      tech.score  * WEIGHTS.technical   +
      fund.score  * WEIGHTS.fundamental +
      mom.score   * WEIGHTS.momentum    +
      risk.score  * WEIGHTS.risk        +
      sent.score  * WEIGHTS.sentiment
    );

    const recommendation = scoreToRecommendation(aiScore);

    const result: AIScoreResult = {
      symbol,
      name,
      price: currentPrice,
      change,
      changePercent,
      marketCap,
      sector,
      aiScore,
      recommendation,
      recommendationLabel: RECOMMENDATION_LABELS[recommendation],
      technicalScore:   tech.score,
      fundamentalScore: fund.score,
      momentumScore:    mom.score,
      riskScore:        risk.score,
      sentimentScore:   sent.score,
      breakdown: {
        technical:   { score: tech.score,  weight: WEIGHTS.technical   * 100, signals: tech.signals  },
        fundamental: { score: fund.score,  weight: WEIGHTS.fundamental * 100, signals: fund.signals  },
        momentum:    { score: mom.score,   weight: WEIGHTS.momentum    * 100, signals: mom.signals   },
        risk:        { score: risk.score,  weight: WEIGHTS.risk        * 100, signals: risk.signals  },
        sentiment:   { score: sent.score,  weight: WEIGHTS.sentiment   * 100, signals: sent.signals  },
      },
      pe,
      roe,
      debtToEquity,
      rsi: rsiProxy,
      relativeStrength52w,
      distanceFrom52wHigh,
    };

    cache.set(symbol, { data: result, ts: Date.now() });
    return result;
  } catch (err: any) {
    return {
      symbol,
      name: symbol,
      price: 0, change: 0, changePercent: 0, marketCap: 0, sector: 'N/A',
      aiScore: 0, recommendation: 'HOLD', recommendationLabel: 'Hold',
      technicalScore: 0, fundamentalScore: 0, momentumScore: 0, riskScore: 0, sentimentScore: 0,
      breakdown: {
        technical:   { score: 0, weight: 35, signals: [] },
        fundamental: { score: 0, weight: 35, signals: [] },
        momentum:    { score: 0, weight: 15, signals: [] },
        risk:        { score: 0, weight: 10, signals: [] },
        sentiment:   { score: 0, weight: 5,  signals: [] },
      },
      pe: 0, roe: 0, debtToEquity: 0, rsi: 50, relativeStrength52w: 50, distanceFrom52wHigh: 0,
      error: err?.message || 'Failed to fetch',
    };
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20); // max 20

  // Parallel fetch with concurrency limit of 5
  const results: AIScoreResult[] = [];
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(scoreSymbol));
    results.push(...batchResults);
  }

  return NextResponse.json(results);
}
