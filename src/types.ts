export interface Ratios {
  price: number;
  change: number;
  changePercent: number;
  name: string;
  symbol: string;
  marketCap: number;
  volume: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  instHold: number;
  pubHold: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  roe: number;
  roa: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  pegRatio: number;
  priceToSales: number;
  enterpriseValue: number;
  evToEbitda: number;
  evToRevenue: number;
  operatingMargin: number;
  profitMargin: number;
  grossMargin: number;
}

export interface BalanceSheetItem {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cash: number;
  debt: number;
  workingCapital: number;
}

export interface ProfitLossItem {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
}

export interface QuarterlyItem {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
}

export interface CashFlowItem {
  date: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  capitalExpenditure: number; 
  netChangeInCash: number; 
  freeCashFlow: number;
}

export interface PeerItem {
  symbol: string;
  name: string;
  price: number;
  pe: number;
  marketCap: number;
  divYield: number;
}

export interface OfficerItem {
  name: string;
  title: string;
  age: number | null;
  pay: number | null;
}

export interface CorporateProfile {
  sector: string;
  industry: string;
  employees: number;
  website: string;
  city: string;
  summary: string;
  officers: OfficerItem[];
}

export interface ChartPoint {
  date: string;
  close: number;
  volume: number;
  pe?: number;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  date: string;
}

export interface StockDetails {
  ratios: Ratios;
  profile: CorporateProfile;
  balanceSheet: BalanceSheetItem[];
  profitLoss: ProfitLossItem[];
  cashFlow: CashFlowItem[];
  quarterlyProfitLoss: QuarterlyItem[];
  chartData: ChartPoint[];
  peers: PeerItem[];
  pros: string[];
  cons: string[];
  news?: NewsItem[];
}
