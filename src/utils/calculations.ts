export interface CalculationResult {
  month: number;
  year: number;
  sip: number;
  openingBalance: number;
  interest: number;
  closingBalance: number;
  inflationAdjusted: number;
  stepUpApplied: boolean;
  yearlyGain: number;
  cumulativeGain: number;
  taxLiability: number;
  investedTillDate: number;
}

export interface SummaryResult {
  finalCorpus: number;
  totalSIPInvested: number;
  totalLumpsumInvested: number;
  totalInvested: number;
  totalGains: number;
  corpusBeforeTax: number;
  taxableGains: number;
  exemptionApplied: number;
  taxPayable: number;
  corpusAfterTax: number;
  inflationAdjustedFinal: number;
  realPurchasingPower: number;
  realCagr: number;
  cagr: number;
  totalReturnPct: number;
  wealthMultiplier: number;
  monthlySwp6: number;
  monthlySwp3: number;
}

export function calculateScenario(
  initialLumpsum: number,
  startSip: number,
  stepUpPct: number,
  cagrPct: number,
  years: number,
  inflationPct: number = 6,
  sipFrequency: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  compoundingFrequency: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  considerTax: boolean = true,
  taxRate: number = 12.5,
  taxExemption: number = 125000,
  considerInflation: boolean = true
): CalculationResult[] {
  const months = years * 12;
  const monthlyRate = Math.pow(1 + cagrPct, 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + (considerInflation ? inflationPct : 0) / 100, 1 / 12) - 1;
  
  let balance = initialLumpsum;
  let currentSip = startSip;
  let totalInvested = initialLumpsum;
  const results: CalculationResult[] = [];

  let accumulatedInterest = 0;
  let yearGainsAccumulated = 0;

  for (let m = 1; m <= months; m++) {
    const isYearStart = m > 1 && (m - 1) % 12 === 0;
    const stepUpApplied = isYearStart && stepUpPct > 0;

    // Annual Step-up for SIP
    if (stepUpApplied) {
      currentSip = currentSip * (1 + stepUpPct);
    }
    
    const openingBalance = balance;
    
    // Determine if SIP investment happens this month
    let monthlyInvestment = 0;
    if (sipFrequency === 'monthly') {
      monthlyInvestment = currentSip;
    } else if (sipFrequency === 'quarterly' && m % 3 === 0) {
      monthlyInvestment = currentSip;
    } else if (sipFrequency === 'yearly' && m % 12 === 0) {
      monthlyInvestment = currentSip;
    }

    totalInvested += monthlyInvestment;

    // Compounding growth calculation
    const interest = (openingBalance + monthlyInvestment) * monthlyRate;
    accumulatedInterest += interest;
    
    // Apply compounding based on compounding frequency
    let compoundingInterestToApply = 0;
    if (compoundingFrequency === 'monthly') {
      compoundingInterestToApply = interest;
    } else if (compoundingFrequency === 'quarterly' && m % 3 === 0) {
      compoundingInterestToApply = accumulatedInterest;
      accumulatedInterest = 0;
    } else if (compoundingFrequency === 'yearly' && m % 12 === 0) {
      compoundingInterestToApply = accumulatedInterest;
      accumulatedInterest = 0;
    } else if (m === months) { // Ensure final month applies any remaining interest
      compoundingInterestToApply = accumulatedInterest;
      accumulatedInterest = 0;
    }

    balance = openingBalance + monthlyInvestment + compoundingInterestToApply;
    yearGainsAccumulated += compoundingInterestToApply;

    // Calculate purchasing power in today's money
    const inflationFactor = Math.pow(1 + monthlyInflation, m);
    const inflationAdjusted = balance / inflationFactor;

    // Temporary tax estimation for yearly/monthly projection
    const cumulativeGain = Math.max(0, balance - totalInvested);
    const taxableGain = Math.max(0, cumulativeGain - taxExemption);
    const taxLiability = considerTax ? taxableGain * (taxRate / 100) : 0;

    results.push({
      month: m,
      year: Math.ceil(m / 12),
      sip: currentSip,
      openingBalance,
      interest: compoundingInterestToApply,
      closingBalance: balance,
      inflationAdjusted,
      stepUpApplied,
      yearlyGain: yearGainsAccumulated,
      cumulativeGain,
      taxLiability,
      investedTillDate: totalInvested
    });

    if (m % 12 === 0) {
      yearGainsAccumulated = 0; // Reset yearly gains accumulator
    }
  }
  return results;
}

export function getSummary(
  results: CalculationResult[], 
  totalInvested: number,
  initialLumpsum: number,
  considerTax: boolean = true,
  taxRate: number = 12.5,
  taxExemption: number = 125000,
  considerInflation: boolean = true,
  inflationPct: number = 6,
  _cagrPct: number = 12,
  years: number = 15
): SummaryResult {
  const finalCorpus = results[results.length - 1]?.closingBalance || 0;
  const inflationAdjustedFinal = results[results.length - 1]?.inflationAdjusted || 0;
  
  const totalLumpsumInvested = initialLumpsum;
  const totalSIPInvested = Math.max(0, totalInvested - initialLumpsum);
  
  const totalGains = Math.max(0, finalCorpus - totalInvested);
  const taxableGains = Math.max(0, totalGains - taxExemption);
  const exemptionApplied = totalGains > 0 ? Math.min(totalGains, taxExemption) : 0;
  const taxPayable = considerTax ? taxableGains * (taxRate / 100) : 0;
  const corpusAfterTax = finalCorpus - taxPayable;

  const realPurchasingPower = considerInflation 
    ? corpusAfterTax / Math.pow(1 + inflationPct / 100, years)
    : corpusAfterTax;

  // CAGR Calculations
  const cagr = totalInvested > 0 
    ? (Math.pow(finalCorpus / totalInvested, 1 / years) - 1) * 100
    : 0;

  const realCagr = considerInflation
    ? (((1 + cagr / 100) / (1 + inflationPct / 100)) - 1) * 100
    : cagr;

  const totalReturnPct = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  const wealthMultiplier = totalInvested > 0 ? finalCorpus / totalInvested : 1;

  return {
    finalCorpus,
    totalSIPInvested,
    totalLumpsumInvested,
    totalInvested,
    totalGains,
    corpusBeforeTax: finalCorpus,
    taxableGains,
    exemptionApplied,
    taxPayable,
    corpusAfterTax,
    inflationAdjustedFinal,
    realPurchasingPower,
    realCagr,
    cagr,
    totalReturnPct,
    wealthMultiplier,
    monthlySwp6: (corpusAfterTax * 0.06) / 12,
    monthlySwp3: (corpusAfterTax * 0.03) / 12
  };
}

export const formatINR = (number: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number);
};
