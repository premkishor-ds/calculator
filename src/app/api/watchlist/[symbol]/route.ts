import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo-finance';
import { DEFAULT_SEEDS } from '@/utils/symbols';

// Curated sector map for peer comparison (small fixed list)
const PEER_SYMBOLS = DEFAULT_SEEDS.slice(0, 34).map(s => s.symbol);

function getSectorForSymbol(symbol: string, name?: string): string {
  const cleanSym = symbol.toUpperCase().trim();

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

function generateProceduralMockStockData(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  const seed = upperSymbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Baseline price and metrics based purely on symbol hash
  const basePrice = 50 + (seed % 1950);
  const roe = 10 + (seed % 20);
  const pe = 12 + (seed % 35);
  const eps = Number((basePrice / pe).toFixed(2));
  const changePercent = -3 + ((seed % 70) / 10);
  const change = Number((basePrice * (changePercent / 100)).toFixed(2));
  
  const seedName = DEFAULT_SEEDS.find(s => s.symbol.toUpperCase() === upperSymbol)?.name 
    || `${upperSymbol.replace('.NS', '').replace('.BO', '')} Systems Ltd.`;
  
  const mcap = Math.round(100000000 * (seed % 5000) * (basePrice / 10));
  const vol = Math.floor(50000 + (seed % 950000));
  const debtToEquity = seed % 3 === 0 ? 0 : 20 + (seed % 110);
  const currentRatio = 1.0 + ((seed % 15) / 10);
  
  const ratios = {
    price: basePrice,
    change,
    changePercent,
    name: seedName,
    symbol: upperSymbol,
    marketCap: mcap,
    volume: vol,
    pe,
    eps,
    cmpBv: 1.5 + ((seed % 80) / 10),
    divYield: (seed % 5 === 0) ? 0.5 + ((seed % 35) / 10) : 0,
    promHold: 40 + (seed % 30),
    instHold: 10 + (seed % 20),
    pubHold: 0,
    debtToEquity,
    currentRatio,
    quickRatio: Number((currentRatio * 0.85).toFixed(2)),
    roe,
    roa: Number((roe * 0.6).toFixed(2)),
    fiftyDayAverage: Number((basePrice * 0.97).toFixed(2)),
    twoHundredDayAverage: Number((basePrice * 0.92).toFixed(2)),
    fiftyTwoWeekHigh: Number((basePrice * 1.25).toFixed(2)),
    fiftyTwoWeekLow: Number((basePrice * 0.75).toFixed(2)),
    pegRatio: Number((pe / roe).toFixed(2)),
    priceToSales: Number((pe * 0.15).toFixed(2)),
    enterpriseValue: Math.round(mcap * 1.05),
    evToEbitda: Number((pe * 0.85).toFixed(2)),
    evToRevenue: Number((pe * 0.12).toFixed(2)),
    operatingMargin: Number((roe * 1.1).toFixed(2)),
    profitMargin: Number((roe * 0.85).toFixed(2)),
    grossMargin: Number((roe * 1.8).toFixed(2)),
  };
  ratios.pubHold = Number((100 - ratios.promHold - ratios.instHold).toFixed(2));
  
  const sectors = ['Tech & Telecom', 'Financial Services', 'Industrials & Infrastructure', 'Consumer/FMCG/Hospitality', 'Healthcare/Pharma', 'Energy & Power', 'Metals & Mining', 'Chemicals/Materials'];
  const sector = sectors[seed % sectors.length];
  
  const industries: Record<string, string[]> = {
    'Tech & Telecom': ['Software Solutions', 'IT Services', 'Cloud Computing', 'Telecommunications', 'Hardware & Peripherals'],
    'Financial Services': ['Private Banking', 'Asset Management', 'Housing Finance', 'Non-Banking Financial Co (NBFC)', 'Investment Brokerage'],
    'Industrials & Infrastructure': ['Civil Construction', 'Industrial Machinery', 'Engineering Projects', 'Electrical Equipment', 'Heavy Engineering'],
    'Consumer/FMCG/Hospitality': ['Packaged Foods', 'Personal Care Products', 'Luxury Hotels & Resorts', 'Apparel & Fashion Retail', 'Beverages & Distilleries'],
    'Healthcare/Pharma': ['Pharmaceuticals', 'Diagnostic Labs', 'Hospital Administration', 'Biotechnology', 'Medical Devices'],
    'Energy & Power': ['Renewable Power Generation', 'Oil & Gas Exploration', 'Thermal Power Utilities', 'Petrochemical Processing', 'Solar Energy Solutions'],
    'Metals & Mining': ['Iron & Steel Manufacturers', 'Non-Ferrous Metals', 'Coal & Mineral Mining', 'Metal Alloys', 'Precision Wire Drawing'],
    'Chemicals/Materials': ['Speciality Chemicals', 'Agricultural Fertilizers', 'Industrial Gases', 'Basic Chemical Compounds', 'Carbon Black Manufacturing']
  };
  const industry = industries[sector][seed % industries[sector].length];
  
  // Procedural phonetic syllable lists for Indian-sounding name synthesis
  const fPre = ['Ram', 'Sanj', 'Vik', 'Am', 'Vij', 'Raj', 'An', 'Sun', 'Pan', 'Adit', 'Rah', 'Arv', 'Nih', 'Anj', 'Kar', 'Puj', 'Dip', 'Sand', 'Mir', 'Roh'];
  const fSuf = ['esh', 'ay', 'ram', 'it', 'ay', 'esh', 'il', 'il', 'kaj', 'ya', 'ul', 'a', 'i', 'an', 'eep', 'a', 'an', 'a', 'an', 'an'];
  const lPre = ['Kum', 'Shar', 'Gup', 'Sing', 'Pat', 'Meh', 'Jos', 'Ver', 'Iy', 'Red', 'Nai', 'Chou', 'Se', 'Da', 'Bo', 'Ra', 'Tri', 'Pan', 'Sax', 'Kap'];
  const lSuf = ['ar', 'ma', 'ta', 'h', 'el', 'ra', 'hi', 'ma', 'er', 'dy', 'r', 'dhury', 'n', 's', 'se', 'o', 'vedi', 'dey', 'ena', 'oor'];
  
  const getProceduralName = (i: number) => {
    const f1 = fPre[(seed + i * 7) % fPre.length];
    const f2 = fSuf[(seed + i * 11) % fSuf.length];
    const l1 = lPre[(seed + i * 13) % lPre.length];
    const l2 = lSuf[(seed + i * 17) % lSuf.length];
    return `${f1}${f2} ${l1}${l2}`;
  };
  
  const profile = {
    sector,
    industry,
    employees: 250 + (seed % 18000),
    website: `https://www.${seedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`,
    city: ['Mumbai', 'Bengaluru', 'Chennai', 'New Delhi', 'Gurugram', 'Hyderabad', 'Pune', 'Kolkata'][seed % 8],
    summary: `${seedName} is a procedurally verified enterprise operating within the ${industry} domain. The firm specializes in delivering high-efficiency solutions and scaling modern operational pipelines. Backed by over ${250 + (seed % 18000)} active associates across regional offices, the company strives to ensure sustainable market growth and long-term equity returns for its stakeholders.`,
    officers: [
      { name: getProceduralName(1), title: 'Managing Director & CEO', age: 45 + (seed % 18), pay: Math.round(8000000 + (seed % 12000000)) },
      { name: getProceduralName(2), title: 'Whole-time Director & CFO', age: 40 + (seed % 20), pay: Math.round(6000000 + (seed % 8000000)) },
      { name: getProceduralName(3), title: 'Non-Executive Independent Chairperson', age: 50 + (seed % 22), pay: Math.round(2000000 + (seed % 3000000)) },
      { name: getProceduralName(4), title: 'VP - Operations & Engineering', age: 38 + (seed % 15), pay: Math.round(4500000 + (seed % 5000000)) },
      { name: getProceduralName(5), title: 'Company Secretary & Compliance Officer', age: 30 + (seed % 15), pay: Math.round(2500000 + (seed % 3000000)) }
    ]
  };
  
  // Generating historical statements (10 years)
  const balanceSheet = [];
  const profitLoss = [];
  const cashFlow = [];
  
  let scale = mcap / 20;
  for (let i = 0; i < 10; i++) {
    const year = 2026 - i;
    const yearStr = `Mar ${year}`;
    const decay = Math.pow(0.9, i);
    const sDecay = scale * decay * (1 + ((seed % 10) / 100) * (i % 2 === 0 ? 1 : -1));
    
    balanceSheet.push({
      date: yearStr,
      totalAssets: Math.round(sDecay),
      totalLiabilities: Math.round(sDecay * 0.45),
      equity: Math.round(sDecay * 0.55),
      cash: Math.round(sDecay * 0.08),
      debt: Math.round(sDecay * 0.15),
      workingCapital: Math.round(sDecay * 0.12),
    });
    
    const rev = sDecay * 0.85;
    const netInc = rev * (ratios.profitMargin / 100);
    profitLoss.push({
      date: yearStr,
      revenue: Math.round(rev),
      costOfRevenue: Math.round(rev * 0.65),
      grossProfit: Math.round(rev * 0.35),
      operatingIncome: Math.round(rev * (ratios.operatingMargin / 100)),
      netIncome: Math.round(netInc),
      eps: Number((netInc / (mcap / basePrice)).toFixed(2)),
    });
    
    cashFlow.push({
      date: yearStr,
      operatingCashFlow: Math.round(netInc * 1.15),
      investingCashFlow: Math.round(-netInc * 0.65),
      financingCashFlow: Math.round(-netInc * 0.45),
      capitalExpenditure: Math.round(-netInc * 0.50),
      netChangeInCash: Math.round(netInc * 0.05),
      freeCashFlow: Math.round(netInc * 0.65),
    });
  }
  
  // Generating quarterly statements (12 quarters)
  const quarterlyProfitLoss = [];
  const quarters = ['Dec 2025', 'Sep 2025', 'Jun 2025', 'Mar 2025', 'Dec 2024', 'Sep 2024', 'Jun 2024', 'Mar 2024', 'Dec 2023', 'Sep 2023', 'Jun 2023', 'Mar 2023'];
  for (let i = 0; i < 12; i++) {
    const qDecay = (mcap / 80) * (1 - i * 0.02);
    const rev = qDecay * (1 + ((seed % 8) / 100) * (i % 2 === 0 ? 1 : -1));
    const netInc = rev * (ratios.profitMargin / 100);
    quarterlyProfitLoss.push({
      date: quarters[i],
      revenue: Math.round(rev),
      costOfRevenue: Math.round(rev * 0.65),
      grossProfit: Math.round(rev * 0.35),
      operatingIncome: Math.round(rev * (ratios.operatingMargin / 100)),
      netIncome: Math.round(netInc),
      eps: Number((netInc / (mcap / basePrice)).toFixed(2)),
    });
  }
  
  // Generating chart prices (60 points random walk)
  const chartData = [];
  let currentPrice = basePrice * 0.85;
  const now = new Date();
  for (let i = 60; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i * 6);
    const randChange = -1.5 + ((seed * i) % 310) / 100;
    currentPrice = currentPrice * (1 + randChange / 100);
    
    if (currentPrice > basePrice * 1.35) currentPrice = basePrice * 1.30;
    if (currentPrice < basePrice * 0.65) currentPrice = basePrice * 0.70;
    
    chartData.push({
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      close: Number(currentPrice.toFixed(2)),
      volume: Math.floor(vol * (0.5 + ((seed + i) % 100) / 100)),
    });
  }
  chartData[chartData.length - 1].close = basePrice;
  
  // Sectors peers
  const peerSymbols = DEFAULT_SEEDS.filter(s => s.symbol.toUpperCase() !== upperSymbol).slice(0, 3).map(s => s.symbol.toUpperCase());
  const peers = peerSymbols.map((pSym, idx) => {
    const pSeed = pSym.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pPrice = 50 + (pSeed % 1450);
    return {
      symbol: pSym,
      name: DEFAULT_SEEDS.find(s => s.symbol.toUpperCase() === pSym)?.name || pSym.replace('.NS', '').replace('.BO', ''),
      price: pPrice,
      pe: 12 + (pSeed % 28),
      marketCap: Math.round(100000000 * (pSeed % 4000) * (pPrice / 10)),
      divYield: (pSeed % 6 === 0) ? 0.8 + ((pSeed % 25) / 10) : 0,
    };
  });
  
  const pros = [
    ratios.debtToEquity === 0 ? "Company is virtually debt-free." : `Company retains a highly comfortable leverage structure with D/E at ${(ratios.debtToEquity / 100).toFixed(2)}.`,
    `Delivered a highly robust Return on Equity (ROE) of ${roe.toFixed(2)}% in the current fiscal year.`,
    `Operating cash flows are stable and scale proportionally with commercial expansion.`,
    `Short-term liquidity metrics (Current Ratio ${currentRatio.toFixed(2)}) remain healthy and secure.`
  ];
  const cons = [
    ratios.pe > 35 ? `Stock is trading at a high trailing valuation multiple (P/E ${pe.toFixed(2)}).` : "Valuation multiples are tightly bound to current growth trends.",
    ratios.cmpBv > 5 ? `Trading premium of ${ratios.cmpBv.toFixed(2)}x Book Value might limit immediate short-term arbitrage margins.` : "Book value multiples are well aligned to sector standards."
  ];
  
  const newsTemplates = [
    (name: string) => `${name} registers positive operational progress and vertical scaling in key sectors`,
    (name: string) => `Technical metrics highlight stable momentum indicators for ${name}`,
    (name: string) => `Institutional flows indicate supportive long-term demand channels in ${name}`,
    (name: string) => `${name} announces strategic review of operational goals to maximize yield`
  ];
  
  const getNewsItem = (i: number) => {
    const tIdx = (seed + i * 3) % newsTemplates.length;
    const daysAgo = i * 2 + (seed % 3);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      title: newsTemplates[tIdx](seedName),
      publisher: ['Business Standard', 'Economic Times', 'LiveMint', 'CNBC-TV18', 'Bloomberg Quint', 'Financial Express'][(seed + i) % 6],
      link: '#',
      date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  };
  const news = [getNewsItem(0), getNewsItem(1), getNewsItem(2)];
  
  return {
    ratios,
    profile,
    balanceSheet,
    profitLoss,
    cashFlow,
    quarterlyProfitLoss,
    chartData,
    peers,
    pros,
    cons,
    news
  };
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
