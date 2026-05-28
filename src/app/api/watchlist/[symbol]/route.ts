import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo-finance';
import { DEFAULT_SEEDS } from '@/utils/symbols';

// Curated sector map for peer comparison (small fixed list)
const PEER_SYMBOLS = DEFAULT_SEEDS.slice(0, 34).map(s => s.symbol);

function getSectorForSymbol(symbol: string, name?: string): string {
  const cleanSym = symbol.toUpperCase().trim();
  
  // Hardcoded sectors lookup for premium watchlist seeds
  const localSectorMap: Record<string, string> = {
    'E2E.NS': 'Tech',
    'AURIONPRO.NS': 'Tech',
    'COFORGE.NS': 'Tech',
    'NETWEB.NS': 'Tech',
    'VOLTAMP.NS': 'Power/Engineering',
    'TDPOWERSYS.NS': 'Power/Engineering',
    'TARIL.NS': 'Power/Engineering',
    'PRECWIRE.NS': 'Power/Engineering',
    'KIRLOSENG.NS': 'Power/Engineering',
    'KEI.NS': 'Power/Engineering',
    'APARINDS.NS': 'Power/Engineering',
    'GVT&D.NS': 'Power/Engineering',
    'CGPOWER.NS': 'Power/Engineering',
    'KRN.NS': 'Power/Engineering',
    'MAZDOCK.NS': 'Defense',
    'ZENTEC.NS': 'Defense',
    'GRSE.NS': 'Defense',
    'PARAS.NS': 'Defense',
    'ASTRAMICRO.NS': 'Defense',
    'DATAPATTNS.NS': 'Defense',
    'MTARTECH.NS': 'Defense',
    'IDEAFORGE.NS': 'Defense',
    'HSCL.NS': 'FMCG/Chemicals',
    'HFCL.NS': 'FMCG/Chemicals',
    'BECTORFOOD.NS': 'FMCG/Chemicals',
    'AEROFLEX.NS': 'FMCG/Chemicals',
    'SHILCTECH.NS': 'Healthcare',
    'APOLLO.NS': 'Healthcare'
  };

  if (localSectorMap[cleanSym]) return localSectorMap[cleanSym];
  const baseSym = cleanSym.replace('.NS', '');
  if (localSectorMap[baseSym]) return localSectorMap[baseSym];
  const suffixed = baseSym + '.NS';
  if (localSectorMap[suffixed]) return localSectorMap[suffixed];

  // Dynamic heuristic-based categorization based on stock name and symbol
  const searchStr = `${cleanSym} ${name || ''}`.toLowerCase();
  
  if (searchStr.includes('bank') || searchStr.includes('finance') || searchStr.includes('fin ') || searchStr.includes('capital') || searchStr.includes('insurance') || searchStr.includes('venture') || searchStr.includes('invest') || searchStr.includes('wealth')) {
    return 'Financial Services';
  }
  if (searchStr.includes('pharma') || searchStr.includes('health') || searchStr.includes('hospital') || searchStr.includes('medic') || searchStr.includes('biotech') || searchStr.includes('drug') || searchStr.includes('lab') || searchStr.includes('clinic')) {
    return 'Healthcare/Pharma';
  }
  if (searchStr.includes('tech') || searchStr.includes('software') || searchStr.includes('info') || searchStr.includes('digital') || searchStr.includes('telecom') || searchStr.includes('communication') || searchStr.includes('network') || searchStr.includes('system') || searchStr.includes('online')) {
    return 'Tech & Telecom';
  }
  if (searchStr.includes('power') || searchStr.includes('energy') || searchStr.includes('solonics') || searchStr.includes('solar') || searchStr.includes('gas') || searchStr.includes('petro') || searchStr.includes('oil') || searchStr.includes('coal') || searchStr.includes('wind') || searchStr.includes('fuel')) {
    return 'Energy & Power';
  }
  if (searchStr.includes('chem') || searchStr.includes('fertilizer') || searchStr.includes('carbon') || searchStr.includes('acid') || searchStr.includes('basic material')) {
    return 'Chemicals/Materials';
  }
  if (searchStr.includes('steel') || searchStr.includes('iron') || searchStr.includes('metal') || searchStr.includes('wire') || searchStr.includes('copper') || searchStr.includes('aluminum') || searchStr.includes('mining') || searchStr.includes('alloy') || searchStr.includes('gold') || searchStr.includes('silver')) {
    return 'Metals & Mining';
  }
  if (searchStr.includes('infra') || searchStr.includes('construct') || searchStr.includes('cement') || searchStr.includes('build') || searchStr.includes('developer') || searchStr.includes('realty') || searchStr.includes('estate') || searchStr.includes('housing') || searchStr.includes('engineering') || searchStr.includes('industr') || searchStr.includes('engine') || searchStr.includes('project')) {
    return 'Industrials & Infrastructure';
  }
  if (searchStr.includes('defense') || searchStr.includes('aero') || searchStr.includes('ship') || searchStr.includes('marine') || searchStr.includes('dock') || searchStr.includes('weapon') || searchStr.includes('radar')) {
    return 'Defense & Aerospace';
  }
  if (searchStr.includes('food') || searchStr.includes('agro') || searchStr.includes('agri') || searchStr.includes('sugar') || searchStr.includes('fmcg') || searchStr.includes('consumer') || searchStr.includes('retail') || searchStr.includes('fashion') || searchStr.includes('textile') || searchStr.includes('beverage') || searchStr.includes('brew') || searchStr.includes('distill') || searchStr.includes('hotel') || searchStr.includes('resort') || searchStr.includes('travel') || searchStr.includes('restaurant') || searchStr.includes('cafe')) {
    return 'Consumer/FMCG/Hospitality';
  }
  if (searchStr.includes('logistics') || searchStr.includes('shipping') || searchStr.includes('transport') || searchStr.includes('port') || searchStr.includes('cargo') || searchStr.includes('carrier') || searchStr.includes('rail') || searchStr.includes('delivery')) {
    return 'Logistics & Transport';
  }
  
  const categories = ['Tech & Telecom', 'Financial Services', 'Industrials & Infrastructure', 'Consumer/FMCG/Hospitality', 'Healthcare/Pharma', 'Energy & Power', 'Metals & Mining', 'Chemicals/Materials'];
  const charCode = cleanSym.charCodeAt(0) || 0;
  return categories[charCode % categories.length];
}

function normalizeSector(sector: string): string {
  const s = sector.trim().toLowerCase();
  if (s.includes('tech')) return 'tech';
  if (s.includes('power') || s.includes('engineer') || s.includes('industrial') || s.includes('machinery')) return 'industrials';
  if (s.includes('defense') || s.includes('aerospace') || s.includes('space')) return 'defense';
  if (s.includes('chemical') || s.includes('fmcg') || s.includes('consumer') || s.includes('food') || s.includes('basic materials')) return 'chemicals_fmcg';
  if (s.includes('health') || s.includes('medical') || s.includes('pharma')) return 'healthcare';
  return s;
}

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

    // Calculate dynamic 1 year ago date for chart high fidelity
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const chartPeriod1 = oneYearAgo.toISOString();

    // Fetch live summary, historical statements, chart data and latest news in parallel
    const [summaryRes, balanceSheetRes, financialsRes, cashFlowRes, quarterlyFinancialsRes, chartRes, newsRes] = await Promise.allSettled([
      yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'majorHoldersBreakdown', 'assetProfile']
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
      }),
      yahooFinance.chart(symbol, {
        period1: chartPeriod1,
        interval: '1d'
      }),
      yahooFinance.search(symbol)
    ]);

    if (summaryRes.status === 'rejected') {
      return NextResponse.json({ error: `Failed to fetch data for ${symbol}` }, { status: 502 });
    }

    const summary = summaryRes.value;
    const balanceSheets = balanceSheetRes.status === 'fulfilled' ? (balanceSheetRes.value as any[]) : [];
    const financials = financialsRes.status === 'fulfilled' ? (financialsRes.value as any[]) : [];
    const cashFlows = cashFlowRes.status === 'fulfilled' ? (cashFlowRes.value as any[]) : [];
    const quarterlyFinancials = quarterlyFinancialsRes.status === 'fulfilled' ? (quarterlyFinancialsRes.value as any[]) : [];
    const chartQuotes = chartRes.status === 'fulfilled' ? ((chartRes.value as any).quotes || []) : [];
    const rawNews = newsRes.status === 'fulfilled' ? ((newsRes.value as any).news || []) : [];

    const formattedNews = rawNews.slice(0, 10).map((n: any) => {
      const pubTime = n.providerPublishTime;
      const time = pubTime instanceof Date 
        ? pubTime 
        : new Date(Number(pubTime) * 1000);
      const dateStr = !isNaN(time.getTime()) 
        ? time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';
      return {
        title: n.title || 'Latest Corporate News Update',
        publisher: n.publisher || 'Financial Source',
        link: n.link || '#',
        date: dateStr
      };
    });

    const price = (summary.price || {}) as any;
    const detail = (summary.summaryDetail || {}) as any;
    const stats = (summary.defaultKeyStatistics || {}) as any;
    const financialData = (summary.financialData || {}) as any;
    const holders = (summary.majorHoldersBreakdown || {}) as any;
    const profile = (summary.assetProfile || {}) as any;

    const lastChartClose = chartQuotes.length > 0 
      ? Number(chartQuotes[chartQuotes.length - 1].close || chartQuotes[chartQuotes.length - 1].adjclose || 0)
      : 0;

    const lastChartOpen = chartQuotes.length > 0
      ? Number(chartQuotes[chartQuotes.length - 1].open || 0)
      : 0;

    const regularPrice = price.regularMarketPrice 
      || financialData.currentPrice 
      || detail.regularMarketPrice 
      || lastChartClose
      || detail.ask 
      || detail.bid 
      || detail.fiftyDayAverage
      || 0;

    const change = price.regularMarketChange 
      || detail.regularMarketChange 
      || (lastChartClose > 0 && lastChartOpen > 0 ? lastChartClose - lastChartOpen : 0);

    const changePercent = (price.regularMarketChangePercent || detail.regularMarketChangePercent || 0) * 100 
      || (lastChartClose > 0 && lastChartOpen > 0 ? ((lastChartClose - lastChartOpen) / lastChartOpen) * 100 : 0);

    const bv = stats.bookValue || 0;
    const cmpBv = bv > 0 ? Number((regularPrice / bv).toFixed(2)) : 0;
    const rawDivYield = detail.dividendYield || 0;
    const promHold = (holders.insidersPercentHeld || stats.heldPercentInsiders || 0) * 100;
    const instHold = (holders.institutionsPercentHeld || stats.heldPercentInstitutions || 0) * 100;
    const pubHold = Math.max(0, 100 - promHold - instHold);

    const ratios = {
      price: regularPrice,
      change,
      changePercent,
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
      
      // Expanded dynamic ratio additions
      pegRatio: stats.pegRatio || 0,
      priceToSales: detail.priceToSalesTrailing12Months || stats.priceToSalesTrailing12Months || 0,
      enterpriseValue: stats.enterpriseValue || 0,
      evToEbitda: stats.enterpriseToEbitda || 0,
      evToRevenue: stats.enterpriseToRevenue || 0,
      operatingMargin: (financialData.operatingMargins || 0) * 100,
      profitMargin: (financialData.profitMargins || 0) * 100,
      grossMargin: (financialData.grossMargins || 0) * 100,
    };

    // Format company profile info
    const corporateProfile = {
      sector: profile.sector || 'N/A',
      industry: profile.industry || 'N/A',
      employees: profile.fullTimeEmployees || 0,
      website: profile.website || '',
      city: profile.city || 'N/A',
      summary: profile.longBusinessSummary || 'No summary available.',
      officers: (profile.companyOfficers || []).map((off: any) => ({
        name: off.name || 'N/A',
        title: off.title || 'N/A',
        age: off.age || null,
        pay: off.totalPay || null,
      })).slice(0, 5),
    };

    // Format historical statements (10 years)
    const balanceSheetData = balanceSheets.map((item: any) => ({
      date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A',
      totalAssets: item.totalAssets || 0,
      totalLiabilities: item.totalLiabilitiesNetMinorityInterest || item.totalLiabilities || 0,
      equity: item.stockholdersEquity || item.commonStockEquity || 0,
      cash: item.cashCashEquivalentsAndShortTermInvestments || item.cashAndCashEquivalents || 0,
      debt: item.totalDebt || 0,
      workingCapital: item.workingCapital || 0,
    }));

    const profitLossData = financials.map((item: any) => ({
      date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A',
      revenue: item.totalRevenue || 0,
      costOfRevenue: item.costOfRevenue || 0,
      grossProfit: item.grossProfit || 0,
      operatingIncome: item.operatingIncome || 0,
      netIncome: item.netIncome || 0,
      eps: item.basicEPS || item.dilutedEPS || 0,
    }));

    const cashFlowData = cashFlows.map((item: any) => ({
      date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : 'N/A',
      operatingCashFlow: item.operatingCashFlow || item.netCashFromOperatingActivities || 0,
      investingCashFlow: item.investingCashFlow || item.netCashFromInvestingActivities || 0,
      financingCashFlow: item.financingCashFlow || item.netCashFromFinancingActivities || 0,
      capitalExpenditure: item.capitalExpenditure || item.capitalExpenditureReported || 0,
      netChangeInCash: item.changesInCash || 0,
      freeCashFlow: item.freeCashFlow || 0,
    }));

    // Format quarterly statements (last 12 quarters)
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

    // Format chart prices (reduce data density to ~60 points for high fidelity Line SVG)
    const step = Math.max(1, Math.floor(chartQuotes.length / 60));
    const chartData = chartQuotes.filter((_: any, idx: number) => idx % step === 0).map((q: any) => ({
      date: q.date ? new Date(q.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
      close: Number((q.close || q.adjclose || 0).toFixed(2)),
      volume: q.volume || 0,
    }));

    // Fetch peer values dynamically from WATCHLIST_SYMBOLS comparing within the same sector
    const normalizedSymbolUpper = symbol.toUpperCase();
    const cleanTarget = normalizedSymbolUpper.trim().replace('.NS', '') + '.NS';
    
    // 1. Determine target stock's sector dynamically from symbols catalog or profile details, and normalize it
    const targetSeed = DEFAULT_SEEDS.find(s => s.symbol.toUpperCase() === cleanTarget);
    const rawTargetSector = getSectorForSymbol(cleanTarget, targetSeed?.name || corporateProfile.sector);
    const targetSectorNorm = normalizeSector(rawTargetSector);
    
    // 2. Find all watchlist symbols in the same sector dynamically, excluding the target stock itself
    let sectorPeers = PEER_SYMBOLS.filter(s => {
      const formattedSym = (s.includes('.') ? s : `${s}.NS`).toUpperCase();
      if (formattedSym === cleanTarget) return false;
      const peerSeed = DEFAULT_SEEDS.find(p => p.symbol.toUpperCase() === formattedSym);
      const rawSector = getSectorForSymbol(formattedSym, peerSeed?.name);
      return rawSector !== 'N/A' && normalizeSector(rawSector) === targetSectorNorm;
    });

    // 3. Fallback: if there are less than 3 matching sector peers, pad it with other active watchlist symbols
    if (sectorPeers.length < 3) {
      const extraPeers = PEER_SYMBOLS.filter(s => {
        const formattedSym = (s.includes('.') ? s : `${s}.NS`).toUpperCase();
        return formattedSym !== cleanTarget && !sectorPeers.includes(s);
      });
      sectorPeers = [...sectorPeers, ...extraPeers].slice(0, 3);
    } else {
      sectorPeers = sectorPeers.slice(0, 3);
    }

    const peerSymbols = sectorPeers;

    const peersQuotes = await Promise.allSettled(
      peerSymbols.map(peerSym => {
        const trimmed = peerSym.trim();
        const formattedSym = (trimmed.includes('.') ? trimmed : `${trimmed}.NS`).toUpperCase();
        return yahooFinance.quoteSummary(formattedSym, { modules: ['price', 'summaryDetail'] });
      })
    );

    const peersData = peersQuotes.map((pRes, idx) => {
      if (pRes.status === 'rejected') return null;
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
      profile: corporateProfile,
      balanceSheet: balanceSheetData,
      profitLoss: profitLossData,
      cashFlow: cashFlowData,
      quarterlyProfitLoss: quarterlyProfitLossData,
      chartData: chartData,
      peers: peersData,
      pros,
      cons,
      news: formattedNews
    });
  } catch (error) {
    console.error('Failed to fetch dynamic stock details:', error);
    return NextResponse.json({ error: 'Failed to fetch dynamic stock details' }, { status: 500 });
  }
}
