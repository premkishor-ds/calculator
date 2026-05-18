import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { WATCHLIST_SYMBOLS } from '../route';

const yahooFinance = new YahooFinance();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Calculate dynamic period1 date representing the last 10 years dynamically (rolling)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const period1 = `${tenYearsAgo.getFullYear()}-01-01`;

    // Calculate dynamic period1 date representing the last 3 years (to cover last 12 quarters)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const quarterlyPeriod1 = `${threeYearsAgo.getFullYear()}-01-01`;

    // Fetch live summary, historical statements in parallel
    const [summaryRes, balanceSheetRes, financialsRes, cashFlowRes, quarterlyFinancialsRes] = await Promise.allSettled([
      yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'majorHoldersBreakdown']
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1,
        module: 'balance-sheet',
        type: 'annual'
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1,
        module: 'financials',
        type: 'annual'
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1,
        module: 'cash-flow',
        type: 'annual'
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: quarterlyPeriod1,
        module: 'financials',
        type: 'quarterly'
      })
    ]);

    if (summaryRes.status === 'rejected') {
      return NextResponse.json({ error: `Failed to fetch data for ${symbol}` }, { status: 502 });
    }

    const summary = summaryRes.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const balanceSheets = balanceSheetRes.status === 'fulfilled' ? (balanceSheetRes.value as any[]) : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const financials = financialsRes.status === 'fulfilled' ? (financialsRes.value as any[]) : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cashFlows = cashFlowRes.status === 'fulfilled' ? (cashFlowRes.value as any[]) : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quarterlyFinancials = quarterlyFinancialsRes.status === 'fulfilled' ? (quarterlyFinancialsRes.value as any[]) : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const price = (summary.price || {}) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (summary.summaryDetail || {}) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = (summary.defaultKeyStatistics || {}) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const financialData = (summary.financialData || {}) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const holders = (summary.majorHoldersBreakdown || {}) as any;

    const regularPrice = price.regularMarketPrice || 0;
    const bv = stats.bookValue || 0;
    const cmpBv = bv > 0 ? Number((regularPrice / bv).toFixed(2)) : 0;
    const rawDivYield = detail.dividendYield || 0;
    const promHold = (holders.insidersPercentHeld || stats.heldPercentInsiders || 0) * 100;
    const instHold = (holders.institutionsPercentHeld || stats.heldPercentInstitutions || 0) * 100;
    const pubHold = Math.max(0, 100 - promHold - instHold);

    // Dynamic fundamental indicators
    const ratios = {
      price: regularPrice,
      change: price.regularMarketChange || 0,
      changePercent: (price.regularMarketChangePercent || 0) * 100,
      name: price.shortName || price.longName || symbol,
      symbol: price.symbol || symbol,
      marketCap: price.marketCap || 0,
      volume: price.regularMarketVolume || 0,
      pe: detail.trailingPE || detail.forwardPE || stats.forwardPE || 0,
      eps: stats.trailingEps || stats.forwardEps || 0,
      cmpBv,
      divYield: Number((rawDivYield * 100).toFixed(2)),
      promHold: Number(promHold.toFixed(2)),
      instHold: Number(instHold.toFixed(2)),
      pubHold: Number(pubHold.toFixed(2)),
      debtToEquity: financialData.debtToEquity || 0,
      currentRatio: financialData.currentRatio || 0,
      quickRatio: financialData.quickRatio || 0,
      roe: (financialData.returnOnEquity || 0) * 100,
      roa: (financialData.returnOnAssets || 0) * 100,
      fiftyDayAverage: detail.fiftyDayAverage || stats.fiftyDayAverage || 0,
      twoHundredDayAverage: detail.twoHundredDayAverage || stats.twoHundredDayAverage || 0,
      fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh || stats.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: detail.fiftyTwoWeekLow || stats.fiftyTwoWeekLow || 0,
    };

    // Format historical statements (10 years)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const balanceSheetData = balanceSheets.map((item: any) => ({
      date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A',
      totalAssets: item.totalAssets || 0,
      totalLiabilities: item.totalLiabilitiesNetMinorityInterest || item.totalLiabilities || 0,
      equity: item.stockholdersEquity || item.commonStockEquity || 0,
      cash: item.cashCashEquivalentsAndShortTermInvestments || item.cashAndCashEquivalents || 0,
      debt: item.totalDebt || 0,
      workingCapital: item.workingCapital || 0,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profitLossData = financials.map((item: any) => ({
      date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A',
      revenue: item.totalRevenue || 0,
      costOfRevenue: item.costOfRevenue || 0,
      grossProfit: item.grossProfit || 0,
      operatingIncome: item.operatingIncome || 0,
      netIncome: item.netIncome || 0,
      eps: item.basicEPS || item.dilutedEPS || 0,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cashFlowData = cashFlows.map((item: any) => ({
      date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A',
      operatingCashFlow: item.operatingCashFlow || item.netCashFromOperatingActivities || 0,
      investingCashFlow: item.investingCashFlow || item.netCashFromInvestingActivities || 0,
      financingCashFlow: item.financingCashFlow || item.netCashFromFinancingActivities || 0,
      freeCashFlow: item.freeCashFlow || 0,
    }));

    // Format quarterly statements (last 12 quarters)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quarterlyProfitLossData = quarterlyFinancials.map((item: any) => {
      const dateObj = item.date ? new Date(item.date) : null;
      let dateStr = 'N/A';
      if (dateObj) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      }
      return {
        date: dateStr,
        rawDate: dateObj ? dateObj.getTime() : 0,
        revenue: item.totalRevenue || item.operatingRevenue || 0,
        costOfRevenue: item.costOfRevenue || 0,
        grossProfit: item.grossProfit || 0,
        operatingIncome: item.operatingIncome || 0,
        netIncome: item.netIncome || 0,
        eps: item.basicEPS || item.dilutedEPS || 0,
      };
    })
    .sort((a, b) => b.rawDate - a.rawDate)
    .slice(0, 12);

    // Fetch peer values dynamically from WATCHLIST_SYMBOLS
    const normalizedSymbolUpper = symbol.toUpperCase();
    const cleanTarget = normalizedSymbolUpper.trim().replace('.NS', '');
    const matchIndex = WATCHLIST_SYMBOLS.findIndex(s => {
      const cleanS = s.trim().toUpperCase().replace('.NS', '');
      return cleanS === cleanTarget;
    });

    const peerSymbols: string[] = [];
    if (matchIndex !== -1) {
      for (let i = 1; i <= 3; i++) {
        const nextIdx = (matchIndex + i) % WATCHLIST_SYMBOLS.length;
        peerSymbols.push(WATCHLIST_SYMBOLS[nextIdx]);
      }
    } else {
      peerSymbols.push(...WATCHLIST_SYMBOLS.slice(0, 3));
    }

    const peersQuotes = await Promise.allSettled(
      peerSymbols.map(peerSym => {
        const trimmed = peerSym.trim();
        const formattedSym = (trimmed.includes('.') ? trimmed : `${trimmed}.NS`).toUpperCase();
        return yahooFinance.quoteSummary(formattedSym, { modules: ['price', 'summaryDetail'] });
      })
    );

    const peersData = peersQuotes.map((pRes, idx) => {
      if (pRes.status === 'rejected') return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = pRes.value as any;
      const pPrice = val.price || {};
      const pDetail = val.summaryDetail || {};
      return {
        symbol: peerSymbols[idx],
        name: pPrice.shortName || peerSymbols[idx].replace('.NS', ''),
        price: pPrice.regularMarketPrice || 0,
        pe: pDetail.trailingPE || pDetail.forwardPE || 0,
        marketCap: pPrice.marketCap || 0,
        divYield: (pDetail.dividendYield || 0) * 100,
      };
    }).filter(Boolean);

    // Generate Pros & Cons
    const pros: string[] = [];
    const cons: string[] = [];

    const dte = ratios.debtToEquity;
    if (dte === 0) {
      pros.push("Company is virtually debt-free.");
    } else if (dte < 20) {
      pros.push(`Company has a low debt-to-equity ratio of ${(dte / 100).toFixed(2)}.`);
    } else if (dte > 150) {
      cons.push(`Company has a relatively high debt-to-equity ratio of ${(dte / 100).toFixed(2)}.`);
    }

    if (ratios.roe > 15) {
      pros.push(`Company has delivered an impressive Return on Equity (ROE) of ${ratios.roe.toFixed(2)}% over the past year.`);
    } else if (ratios.roe > 0 && ratios.roe < 10) {
      cons.push(`Company's Return on Equity (ROE) of ${ratios.roe.toFixed(2)}% is relatively low.`);
    }

    if (ratios.roa > 8) {
      pros.push(`Company maintains efficient asset returns with a Return on Assets (ROA) of ${ratios.roa.toFixed(2)}%.`);
    }

    if (ratios.divYield > 1.5) {
      pros.push(`Company offers a competitive dividend yield of ${ratios.divYield.toFixed(2)}%.`);
    }

    if (ratios.pe > 0 && ratios.pe < 22) {
      pros.push(`Stock is trading at a highly reasonable valuation with a P/E of ${ratios.pe.toFixed(2)}.`);
    } else if (ratios.pe > 60) {
      cons.push(`Stock is trading at a premium valuation with a high P/E ratio of ${ratios.pe.toFixed(2)}.`);
    }

    if (ratios.cmpBv > 10) {
      cons.push(`Stock is trading at a high valuation of ${ratios.cmpBv.toFixed(2)}x its book value.`);
    }

    if (ratios.currentRatio > 1.8) {
      pros.push(`Company has strong short-term liquidity with a current ratio of ${ratios.currentRatio.toFixed(2)}.`);
    } else if (ratios.currentRatio > 0 && ratios.currentRatio < 1.0) {
      cons.push(`Company has tight short-term liquidity with a current ratio of ${ratios.currentRatio.toFixed(2)}.`);
    }

    if (pros.length === 0) {
      pros.push("Company retains robust commercial operations and strong market presence.");
    }
    if (cons.length === 0) {
      cons.push("High capital premium may restrict massive immediate short-term trading margins.");
    }

    return NextResponse.json({
      ratios,
      balanceSheet: balanceSheetData,
      profitLoss: profitLossData,
      cashFlow: cashFlowData,
      quarterlyProfitLoss: quarterlyProfitLossData,
      peers: peersData,
      pros,
      cons,
    });
  } catch (error) {
    console.error('Failed to fetch dynamic stock details:', error);
    return NextResponse.json({ error: 'Failed to fetch dynamic stock details' }, { status: 500 });
  }
}
