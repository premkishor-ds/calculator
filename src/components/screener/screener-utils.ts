import { ActiveFilters } from './FilterSidebar';

export interface StockRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  eps: number;
  cmpBv: number;
  divYield: number;
  promHold: number;
  profitGrowth: number;
  salesGrowth: number;
  roe?: number;
  roa?: number;
}

export function applyFilters(stocks: StockRow[], filters: ActiveFilters): StockRow[] {
  return stocks.filter((s) => {
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      const fieldMap: Record<string, number | undefined> = {
        pe: s.pe,
        forwardPe: s.pe,
        peg: undefined,
        pb: s.cmpBv,
        ps: undefined,
        evEbitda: undefined,
        divYield: s.divYield,
        roe: s.roe,
        roa: s.roa,
        grossMargin: undefined,
        operatingMargin: undefined,
        netMargin: undefined,
        revenueGrowth: s.salesGrowth,
        profitGrowth: s.profitGrowth,
        epsGrowth: undefined,
        salesGrowth: s.salesGrowth,
        debtEquity: undefined,
        currentRatio: undefined,
        quickRatio: undefined,
        interestCoverage: undefined,
        promoterHolding: s.promHold,
        fiiHolding: undefined,
        diiHolding: undefined,
        publicHolding: undefined,
        rsi: undefined,
        changePercent: s.changePercent,
        distFrom52wHigh: undefined,
        distFrom52wLow: undefined,
        marketCap: s.marketCap / 10000000,
        volume: undefined,
        price: s.price,
      };
      const fieldVal = fieldMap[key];
      if (fieldVal === undefined) continue;
      if (val.min !== undefined && fieldVal < val.min) return false;
      if (val.max !== undefined && fieldVal > val.max) return false;
    }
    return true;
  });
}
