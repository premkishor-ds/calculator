export interface CalculationResult {
  month: number;
  year: number;
  sip: number;
  openingBalance: number;
  interest: number;
  closingBalance: number;
  inflationAdjusted: number;
}

export interface SummaryResult {
  finalCorpus: number;
  totalInvested: number;
  monthlySwp6: number;
  monthlySwp3: number;
  inflationAdjustedFinal: number;
  postTaxCorpus: number;
}

export function calculateScenario(
  initialLumpsum: number,
  startSip: number,
  stepUpPct: number,
  cagrPct: number,
  years: number,
  inflationPct: number = 6
): CalculationResult[] {
  const months = years * 12;
  const monthlyRate = Math.pow(1 + cagrPct, 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + inflationPct / 100, 1 / 12) - 1;
  
  let balance = initialLumpsum;
  let currentSip = startSip;
  const results: CalculationResult[] = [];

  for (let m = 1; m <= months; m++) {
    // Annual Step-up for SIP
    if (m > 1 && (m - 1) % 12 === 0) {
      currentSip = currentSip * (1 + stepUpPct);
    }
    
    const openingBalance = balance;
    const monthlyInvestment = currentSip;
    const interest = (openingBalance + monthlyInvestment) * monthlyRate;
    balance = openingBalance + monthlyInvestment + interest;

    // Calculate purchasing power in today's money
    const inflationFactor = Math.pow(1 + monthlyInflation, m);
    const inflationAdjusted = balance / inflationFactor;

    results.push({
      month: m,
      year: Math.ceil(m / 12),
      sip: currentSip,
      openingBalance,
      interest,
      closingBalance: balance,
      inflationAdjusted
    });
  }
  return results;
}

export function getSummary(results: CalculationResult[], totalInvested: number): SummaryResult {
  const finalCorpus = results[results.length - 1]?.closingBalance || 0;
  const inflationAdjustedFinal = results[results.length - 1]?.inflationAdjusted || 0;
  
  // 12.5% LTCG Tax on Gains (Simplified for the dashboard)
  const gains = Math.max(0, finalCorpus - totalInvested);
  const tax = gains * 0.125; 
  const postTaxCorpus = finalCorpus - tax;

  return {
    finalCorpus,
    totalInvested,
    monthlySwp6: (finalCorpus * 0.06) / 12,
    monthlySwp3: (finalCorpus * 0.03) / 12,
    inflationAdjustedFinal,
    postTaxCorpus
  };
}

export const formatINR = (number: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number);
};
