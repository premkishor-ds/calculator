import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

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

    // Fetch live summary and historical statements in parallel
    const [summaryRes, balanceSheetRes, financialsRes] = await Promise.allSettled([
      yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'majorHoldersBreakdown']
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: '2021-01-01',
        module: 'balance-sheet',
        type: 'annual'
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: '2021-01-01',
        module: 'financials',
        type: 'annual'
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

    // Format historical statements
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

    return NextResponse.json({
      ratios,
      balanceSheet: balanceSheetData,
      profitLoss: profitLossData,
    });
  } catch (error) {
    console.error('Failed to fetch dynamic stock details:', error);
    return NextResponse.json({ error: 'Failed to fetch dynamic stock details' }, { status: 500 });
  }
}
