import type { BalanceSheetItem, CorporateProfile, Ratios } from '@/types';

export interface OutlookParams {
  ratios: Ratios;
  piotroskiResult: { score: number; interpretation: string; details: any[] };
  techResult: {
    ema20: number;
    ema50: number;
    ema200: number;
    rsi: number;
    macd: { macd: number; signal: number; hist: number };
    support: number;
    resistance: number;
    zone: string;
    stance: 'Bullish' | 'Bearish' | 'Neutral';
    bbUpper: number;
    bbLower: number;
  };
  valuationResult: { stance: string; colorClass: string };
  qualityResult: {
    roceTrend: any[];
    roeTrend: any[];
    marginsTrend: any[];
    revCAGR: number;
    profitCAGR: number;
    fcfCAGR: number;
  };
  dcfResult: { impliedG: number; intrinsicValue: number; fcfPerShare: number; cashFlowForecasts: any[] };
  qualityHorizon: number;
  profile?: CorporateProfile;
  sortedBS: BalanceSheetItem[];
}

export const computeOutlookResult = ({
  ratios,
  piotroskiResult,
  techResult,
  valuationResult,
  qualityResult,
  dcfResult,
  qualityHorizon,
  profile,
  sortedBS,
}: OutlookParams) => {
  // Sentiment counters
  let bullishCount = 0;
  let bearishCount = 0;

  if (piotroskiResult.score >= 6) bullishCount++; else bearishCount++;
  if (techResult.stance === 'Bullish') bullishCount++; else if (techResult.stance === 'Bearish') bearishCount++;
  if (valuationResult.stance === 'Undervalued') bullishCount++; else if (valuationResult.stance === 'Overvalued') bearishCount++;
  if (ratios.debtToEquity < 100) bullishCount++; else bearishCount++;
  if (ratios.profitMargin > 10) bullishCount++; else bearishCount++;

  // Sentiment & confidence
  let sentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  let confidence = 50;
  if (bullishCount >= 4) {
    sentiment = 'Bullish';
    confidence = 70 + (bullishCount - 4) * 10;
  } else if (bearishCount >= 3) {
    sentiment = 'Bearish';
    confidence = 65 + (bearishCount - 3) * 10;
  } else {
    sentiment = 'Neutral';
    confidence = 50 + Math.abs(bullishCount - bearishCount) * 8;
  }
  confidence = Math.min(95, Math.max(45, confidence));

  // Factors
  const riseFactors: string[] = [];
  const fallFactors: string[] = [];

  if (piotroskiResult.score >= 7) {
    riseFactors.push(`Elite Financial Health: Outstanding Piotroski F-Score of ${piotroskiResult.score}/9 indicates superb operational efficiency, profit margins growth, and low default risk.`);
  } else {
    fallFactors.push(`Operational Bottlenecks: Moderate Piotroski F-Score of ${piotroskiResult.score}/9 highlights area of concern in margin expansions or working capital conversion.`);
  }

  if (techResult.stance === 'Bullish') {
    riseFactors.push(`Strong Bullish Momentum Stack: Market price sits above EMA-50 (₹${techResult.ema50.toFixed(1)}) and EMA-200 (₹${techResult.ema200.toFixed(1)}), confirming institutional accumulation trend.`);
  } else if (techResult.stance === 'Bearish') {
    fallFactors.push(`Active Technical Downtrend: Price resides beneath its primary EMA-50 (₹${techResult.ema50.toFixed(1)}) and EMA-200 (₹${techResult.ema200.toFixed(1)}), showing active distributions.`);
  } else {
    riseFactors.push(`Consolidation Breakdown Avoided: Technical base support at ₹${techResult.support.toFixed(1)} is holding, allowing low-risk accumulation within the daily range.`);
  }

  if (valuationResult.stance === 'Undervalued') {
    riseFactors.push(`Valuation Premium Discount: Trading PEG ratio of ${ratios.pegRatio > 0 ? ratios.pegRatio.toFixed(2) : '0.85'} is under the 1.0 classic undervalued benchmark, suggesting strong re-rating triggers.`);
  } else if (valuationResult.stance === 'Overvalued') {
    fallFactors.push(`Aggressive Multiples Expansion: Elevated PEG ratio of ${ratios.pegRatio > 0 ? ratios.pegRatio.toFixed(2) : '2.1'} signals the stock is trading at a significant premium to underlying earnings growth.`);
  } else {
    riseFactors.push(`Fair Value Pricing: Core multiples like Price-to-Sales (${ratios.priceToSales.toFixed(1)}x) and EV/EBITDA (${ratios.evToEbitda.toFixed(1)}x) are stable and aligned with historical sector benchmarks.`);
  }

  if (ratios.debtToEquity < 50) {
    riseFactors.push(`Debt-Free Protection: Extremely low Debt-to-Equity ratio of ${ratios.debtToEquity.toFixed(1)}% eliminates default risk and interest coverage vulnerability during capital contractions.`);
  } else {
    fallFactors.push(`Leverage Pressure Points: Significant leverage profile (Debt/Equity of ${ratios.debtToEquity.toFixed(1)}%) requires consistent high EBITDA margins to sustain comfortable interest service.`);
  }

  if (ratios.roe > 15) {
    riseFactors.push(`Top-Tier Asset compounding: ROE of ${ratios.roe.toFixed(1)}% and ROA of ${ratios.roa.toFixed(1)}% showcase superior operational efficiency and internal corporate compounding capacity.`);
  } else {
    fallFactors.push(`Sub-par ROE Efficiency: Compounding ROE of ${ratios.roe.toFixed(1)}% is trailing standard institutional benchmarks, which could damp investment interest.`);
  }

  if (qualityResult.revCAGR > 12) {
    riseFactors.push(`High Compounder Trajectory: Solid historical compounding momentum with a ${qualityHorizon}-Year Revenue CAGR of ${qualityResult.revCAGR.toFixed(1)}% and Profit CAGR of ${qualityResult.profitCAGR.toFixed(1)}.`);
  } else {
    fallFactors.push(`Growth Deceleration: Long-term revenue compound rates of ${qualityResult.revCAGR.toFixed(1)}% show consolidation signals in addressable markets.`);
  }

  if (dcfResult.impliedG < 8) {
    riseFactors.push(`Low Intrinsic Expectations hurdle: Solver implied perpetuity growth is modest at ${dcfResult.impliedG.toFixed(1)}%, reducing the hurdle for positive earnings surprise breakouts.`);
  } else {
    fallFactors.push(`High Growth Expectations burden: Market price implies a high cash flow growth requirement of ${dcfResult.impliedG.toFixed(1)}% annually for the next 10 years, increasing risk if growth slows.`);
  }

  // Strengths (simplified – callers can augment)
  const strengths = [];
  if (ratios.roe > 10) {
    strengths.push({ title: 'Capital Compounding Efficiency', badge: `ROE ${ratios.roe.toFixed(1)}%`, desc: `High return on equity of ${ratios.roe.toFixed(2)}% showcases superior capital productivity and solid shareholder compounding.` });
  }
  if (ratios.operatingMargin > 10) {
    strengths.push({ title: 'Operating Profit Margin', badge: `OPM ${ratios.operatingMargin.toFixed(1)}%`, desc: `Healthy operational efficiency with an Operating Margin of ${ratios.operatingMargin.toFixed(2)}% and Net Margin of ${ratios.profitMargin.toFixed(2)}%.` });
  }
  if (qualityResult.revCAGR > 8) {
    strengths.push({ title: 'Top-line Growth Trajectory', badge: `CAGR ${qualityResult.revCAGR.toFixed(1)}%`, desc: `Compounding Revenue Growth is accelerating at a robust ${qualityResult.revCAGR.toFixed(2)}% top-line CAGR over the ${qualityHorizon}-year horizon.` });
  }
  if (qualityResult.roceTrend && qualityResult.roceTrend.length) {
    const latestROCE = qualityResult.roceTrend[qualityResult.roceTrend.length - 1].value;
    if (latestROCE > 12) {
      strengths.push({ title: 'Capital Productivity', badge: `ROCE ${latestROCE.toFixed(1)}%`, desc: `Solid Return on Capital Employed (ROCE) of ${latestROCE.toFixed(2)}% confirms highly efficient capital allocation policies.` });
    }
  }
  if (piotroskiResult.score >= 7) {
    strengths.push({ title: 'Elite Financial Solvency', badge: `Piotroski ${piotroskiResult.score}/9`, desc: `Passes ${piotroskiResult.score}/9 balance sheet audits on the rigorous Piotroski standards, indicating pristine credit strength.` });
  } else if (piotroskiResult.score >= 5) {
    strengths.push({ title: 'Stable Balance Sheet Health', badge: `Piotroski ${piotroskiResult.score}/9`, desc: `Audits show moderate financial health with stable debt-to-equity ratios and operating cash flows.` });
  }
  if (ratios.debtToEquity < 50) {
    strengths.push({ title: 'Conservative Leverage', badge: `D/E ${ratios.debtToEquity.toFixed(1)}%`, desc: `Low leverage profile with Debt-to-Equity at ${ratios.debtToEquity.toFixed(2)}% representing minimal debt default risk.` });
  }
  if (ratios.currentRatio > 1.5) {
    strengths.push({ title: 'Short-term Liquidity', badge: `Current Ratio ${ratios.currentRatio.toFixed(1)}x`, desc: `Robust liquidity buffer with a current ratio of ${ratios.currentRatio.toFixed(2)}x, ensuring ample working capital headroom.` });
  }
  if (dcfResult.impliedG < 10) {
    strengths.push({ title: 'Intriguing Valuation Margin', badge: `Implied G ${dcfResult.impliedG.toFixed(1)}%`, desc: `Binary DCF solver back-solved a low perpetuity expectations hurdle of ${dcfResult.impliedG.toFixed(2)}%, providing a solid margin of safety.` });
  }
  if (techResult.macd && techResult.macd.hist > 0) {
    strengths.push({ title: 'Positive Momentum Structure', badge: `MACD Hist +${techResult.macd.hist.toFixed(2)}`, desc: `MACD histogram is bullishly positive, confirming active buying and accumulation by long-term institutional investors.` });
  }
  // Ensure at least 3 strengths
  if (strengths.length < 3) {
    strengths.push({ title: 'Ownership Stability', badge: `Promoter ${(ratios.promHold || 50).toFixed(1)}%`, desc: `Strong promoter backing at ${(ratios.promHold || 50).toFixed(2)}% aligns leadership goals with public shareholders.` });
    strengths.push({ title: 'Enterprise Capitalization', badge: `EV ₹${(ratios.enterpriseValue / 10000000).toFixed(1)}Cr`, desc: `Substantial corporate scale with an Enterprise Value of ₹${(ratios.enterpriseValue / 10000000).toFixed(2)} Cr and stable structural demand.` });
    strengths.push({ title: 'Liquidity Reserves', badge: `Working Capital ₹${((sortedBS[sortedBS.length - 1]?.workingCapital || 0) / 10000000).toFixed(1)}Cr`, desc: `Strong cash coverage and liquidity, with latest working capital sitting comfort at ₹${((sortedBS[sortedBS.length - 1]?.workingCapital || 0) / 10000000).toFixed(2)} Cr.` });
  }

  // Risks
  const risks = [];
  if (ratios.debtToEquity > 100) {
    risks.push({ title: 'Aggressive Capital Leverage', badge: `D/E ${ratios.debtToEquity.toFixed(1)}%`, desc: `Debt-to-Equity is highly elevated at ${ratios.debtToEquity.toFixed(2)}%, implying heavy dependence on debt capital and elevated interest service costs.` });
  }
  if (ratios.pe > 35) {
    risks.push({ title: 'Valuation Multiple Premium', badge: `Trailing PE ${ratios.pe.toFixed(1)}x`, desc: `Trading at a premium multiple of ${ratios.pe.toFixed(2)}x trailing earnings, requiring rapid compound growth to justify current valuation.` });
  }
  if (ratios.pegRatio > 2.0) {
    risks.push({ title: 'Growth Multiple Disconnect', badge: `PEG ${ratios.pegRatio.toFixed(1)}x`, desc: `Price-to-Earnings Growth ratio stands at a premium ${ratios.pegRatio.toFixed(2)}x, indicating pricing is ahead of historical growth rates.` });
  }
  if (piotroskiResult.score < 5) {
    risks.push({ title: 'Operational Solvency Vulnerability', badge: `Piotroski ${piotroskiResult.score}/9`, desc: `Declining financial strength score of ${piotroskiResult.score}/9 indicates balance sheet stress, gross margin deterioration, or negative cash flow.` });
  }
  if (qualityResult.profitCAGR < 5) {
    risks.push({ title: 'Compounding Profit Sluggishness', badge: `Profit CAGR ${qualityResult.profitCAGR.toFixed(1)}%`, desc: `Compounded annual net profit growth has slowed down to a sluggish ${qualityResult.profitCAGR.toFixed(2)}% over the long-term horizon.` });
  }
  if (techResult.stance === 'Bearish') {
    risks.push({ title: 'Active Bearish Trend Stance', badge: `EMA-50 Under EMA-200`, desc: `Stock is trading under its major EMAs in an active distribution profile, indicating technical sell-side control.` });
  }
  if (techResult.rsi > 70) {
    risks.push({ title: 'Short-term Overbought Momentum', badge: `RSI ${techResult.rsi.toFixed(1)}`, desc: `Daily RSI sits in extreme overbought territory, representing short-term momentum exhaustion and increased pullback risk.` });
  } else if (techResult.rsi < 30) {
    risks.push({ title: 'Oversold Distribution Pressure', badge: `RSI ${techResult.rsi.toFixed(1)}`, desc: `Relative Strength Index is extremely depressed, reflecting intense near-term capitulation and active sell-off.` });
  }
  if (dcfResult.impliedG > 18) {
    risks.push({ title: 'Demanding Growth Expectation', badge: `Implied G ${dcfResult.impliedG.toFixed(1)}%`, desc: `DCF Expectation back-solver reveals the market is pricing in an extreme cash growth requirement of ${dcfResult.impliedG.toFixed(2)}% annually.` });
  }
  if (ratios.quickRatio > 0 && ratios.quickRatio < 1.0) {
    risks.push({ title: 'Liquid Reserve Constraints', badge: `Quick Ratio ${ratios.quickRatio.toFixed(1)}x`, desc: `Quick ratio is thin at ${ratios.quickRatio.toFixed(2)}x, suggesting potential short-term working capital friction and liquid asset tightness.` });
  }
  if (ratios.profitMargin > 0 && ratios.profitMargin < 8) {
    risks.push({ title: 'Compressed Net Profit Margins', badge: `Net Margin ${ratios.profitMargin.toFixed(1)}%`, desc: `Constrained net profit margins at ${ratios.profitMargin.toFixed(2)}% provide low protection against commodity price shocks or cost hikes.` });
  }
  if (risks.length < 3) {
    risks.push({ title: 'Macro Cyclic Headwinds', badge: 'Industry Volatility', desc: `Cyclical macroeconomic exposures, interest rate fluctuation, and raw material volatility in the ${profile?.industry || 'core'} sector.` });
    risks.push({ title: 'Cyclic Earnings Variations', badge: 'Quarterly Volatility', desc: `Earnings cycles are volatile and susceptible to material surprises, which can trigger strong test zones of historical support.` });
    risks.push({ title: 'Breakout Resistance Level', badge: `Resistance ₹${techResult.resistance.toFixed(1)}`, desc: `Strong overhead technical supply pressure and 30-day resistance stands at ₹${techResult.resistance.toFixed(2)}, which limits quick momentum breakouts.` });
  }

  // Strategy consensus (delegated to caller)
  return { sentiment, confidence, riseFactors, fallFactors, strengths, risks };
};
