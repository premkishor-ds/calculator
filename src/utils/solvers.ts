import { calculateScenario } from './calculations';

// -------------------------------------------------------------
// 🕒 1. YEARS SOLVER (Iterative Compound Solver)
// -------------------------------------------------------------
export function solveRequiredYears(
  targetCorpus: number,
  initialLumpsum: number,
  startSip: number,
  stepUpPct: number,
  cagrPct: number,
  inflationPct: number,
  sipFrequency: 'monthly' | 'quarterly' | 'yearly',
  compoundingFrequency: 'monthly' | 'quarterly' | 'yearly',
  considerTax: boolean,
  taxRate: number,
  taxExemption: number,
  considerInflation: boolean
): { years: number; totalInvested: number; finalCorpus: number; postTaxCorpus: number; realCorpus: number } {
  if (targetCorpus <= initialLumpsum) {
    return { years: 0, totalInvested: initialLumpsum, finalCorpus: initialLumpsum, postTaxCorpus: initialLumpsum, realCorpus: initialLumpsum };
  }

  // Iterate year-by-year up to a maximum cap of 50 years to find when corpus is reached
  for (let y = 1; y <= 50; y++) {
    const res = calculateScenario(
      initialLumpsum, startSip, stepUpPct, cagrPct, y, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );
    
    const finalVal = res[res.length - 1]?.closingBalance || 0;
    const totalInv = res[res.length - 1]?.investedTillDate || initialLumpsum;
    
    // Calculate post-tax corpus
    const gains = Math.max(0, finalVal - totalInv);
    const taxableGains = Math.max(0, gains - taxExemption);
    const tax = considerTax ? taxableGains * (taxRate / 100) : 0;
    const postTax = finalVal - tax;

    if (postTax >= targetCorpus || y === 50) {
      const realPurchasingPower = considerInflation ? postTax / Math.pow(1 + inflationPct / 100, y) : postTax;
      return {
        years: y,
        totalInvested: totalInv,
        finalCorpus: finalVal,
        postTaxCorpus: postTax,
        realCorpus: realPurchasingPower
      };
    }
  }

  return { years: 50, totalInvested: 0, finalCorpus: 0, postTaxCorpus: 0, realCorpus: 0 };
}

// -------------------------------------------------------------
// 📈 2. CAGR SOLVER (Bisection Search Root Finder)
// -------------------------------------------------------------
export function solveRequiredCAGR(
  targetCorpus: number,
  initialLumpsum: number,
  startSip: number,
  stepUpPct: number,
  years: number,
  inflationPct: number,
  sipFrequency: 'monthly' | 'quarterly' | 'yearly',
  compoundingFrequency: 'monthly' | 'quarterly' | 'yearly',
  considerTax: boolean,
  taxRate: number,
  taxExemption: number,
  considerInflation: boolean
): number {
  let low = 0.001; // 0.1% CAGR
  let high = 3.0;  // 300% CAGR
  let steps = 0;
  const tolerance = 1; // within 1 Rupee accuracy

  while (steps < 40) {
    const mid = (low + high) / 2;
    const res = calculateScenario(
      initialLumpsum, startSip, stepUpPct, mid, years, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );
    const finalVal = res[res.length - 1]?.closingBalance || 0;
    const totalInv = res[res.length - 1]?.investedTillDate || initialLumpsum;

    const gains = Math.max(0, finalVal - totalInv);
    const taxableGains = Math.max(0, gains - taxExemption);
    const tax = considerTax ? taxableGains * (taxRate / 100) : 0;
    const postTax = finalVal - tax;

    if (Math.abs(postTax - targetCorpus) < tolerance) {
      return mid * 100; // Return as percentage
    }

    if (postTax > targetCorpus) {
      high = mid;
    } else {
      low = mid;
    }
    steps++;
  }

  return ((low + high) / 2) * 100;
}

// -------------------------------------------------------------
// 🎯 3. TARGET COMBINATION SOLVERS
// -------------------------------------------------------------
export function solveTargetSIPCombo(
  mode: 'sip' | 'lumpsum' | 'combo',
  targetCorpus: number,
  years: number,
  cagrPct: number,
  initialLumpsum: number,
  startSip: number,
  stepUpPct: number,
  inflationPct: number,
  sipFrequency: 'monthly' | 'quarterly' | 'yearly',
  compoundingFrequency: 'monthly' | 'quarterly' | 'yearly',
  considerTax: boolean,
  taxRate: number,
  taxExemption: number,
  considerInflation: boolean
): { requiredSip: number; requiredLumpsum: number } {
  
  if (mode === 'sip') {
    // 1. Calculate growth of Lumpsum
    const lumpsumGrowthRes = calculateScenario(
      initialLumpsum, 0, stepUpPct, cagrPct, years, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );
    const lumpsumPostTax = lumpsumGrowthRes[lumpsumGrowthRes.length - 1]?.closingBalance || initialLumpsum;
    const remainingTarget = Math.max(0, targetCorpus - lumpsumPostTax);

    // 2. Solve for SIP Multiplier (using ₹1 SIP)
    const multiplierRes = calculateScenario(
      0, 1, stepUpPct, cagrPct, years, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );
    const multiplierFinal = multiplierRes[multiplierRes.length - 1]?.closingBalance || 1;
    
    return {
      requiredSip: Math.ceil(remainingTarget / multiplierFinal),
      requiredLumpsum: initialLumpsum
    };
  }

  if (mode === 'lumpsum') {
    // 1. Calculate growth of SIP
    const sipGrowthRes = calculateScenario(
      0, startSip, stepUpPct, cagrPct, years, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );
    const sipPostTax = sipGrowthRes[sipGrowthRes.length - 1]?.closingBalance || 0;
    const remainingTarget = Math.max(0, targetCorpus - sipPostTax);

    // 2. Calculate Lumpsum growth multiplier
    const rawMultiplier = Math.pow(1 + cagrPct, years);
    
    return {
      requiredSip: startSip,
      requiredLumpsum: Math.ceil(remainingTarget / rawMultiplier)
    };
  }

  if (mode === 'combo') {
    // 50% solved via Lumpsum, 50% solved via SIP
    const halfTarget = targetCorpus / 2;

    const lumpsumRes = solveTargetSIPCombo(
      'lumpsum', halfTarget, years, cagrPct, 0, 0, stepUpPct, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );

    const sipRes = solveTargetSIPCombo(
      'sip', halfTarget, years, cagrPct, 0, 0, stepUpPct, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );

    return {
      requiredSip: sipRes.requiredSip,
      requiredLumpsum: lumpsumRes.requiredLumpsum
    };
  }

  return { requiredSip: startSip, requiredLumpsum: initialLumpsum };
}

// -------------------------------------------------------------
// 🔥 4. FIRE ENGINE (Financial Independence Early Retirement)
// -------------------------------------------------------------
export interface FIRESummary {
  currentAnnualExpenses: number;
  expensesAtRetirement: number;
  requiredFIRECorpus: number;
  projectedCorpus: number;
  gapShortfall: number;
  fireAchieved: boolean;
  yearsRemaining: number;
  additionalSipNeeded: number;
  
  leanFIRECorpus: number;
  fatFIRECorpus: number;
  baristaFIRECorpus: number;
  coastFIRECorpus: number;
}

export function calculateFIRE(
  currentAge: number,
  retirementAge: number,
  currentMonthlyExpenses: number,
  inflationPct: number,
  expectedReturn: number,
  swrPct: number,
  currentInvestments: number,
  monthlyInvestments: number,
  stepUpPct: number,
  sipFrequency: 'monthly' | 'quarterly' | 'yearly',
  compoundingFrequency: 'monthly' | 'quarterly' | 'yearly',
  considerTax: boolean,
  taxRate: number,
  taxExemption: number,
  considerInflation: boolean,
  healthcareBuffer: boolean = false,
  emergencyBuffer: boolean = false
): FIRESummary {
  const yearsRemaining = Math.max(0, retirementAge - currentAge);
  
  // Buffers allocation
  let bufferMultiplier = 1;
  if (healthcareBuffer) bufferMultiplier += 0.15; // 15% Healthcare buffer
  if (emergencyBuffer) bufferMultiplier += 0.10;  // 10% Emergency buffer

  const currentAnnualExpenses = currentMonthlyExpenses * 12 * bufferMultiplier;

  // 1. Inflation adjusted expenses at retirement
  const expensesAtRetirement = currentAnnualExpenses * Math.pow(1 + inflationPct / 100, yearsRemaining);

  // 2. FIRE Corpus Requirement (SWR)
  const requiredFIRECorpus = expensesAtRetirement / (swrPct / 100);

  // 3. Projected Retirement Corpus
  const projectionRes = calculateScenario(
    currentInvestments, monthlyInvestments, stepUpPct / 100, expectedReturn / 100, yearsRemaining, inflationPct,
    sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
  );
  
  const projectedCorpusRaw = projectionRes[projectionRes.length - 1]?.closingBalance || currentInvestments;
  
  // Calculate post-tax projected corpus
  const totalInv = projectionRes[projectionRes.length - 1]?.investedTillDate || currentInvestments;
  const gains = Math.max(0, projectedCorpusRaw - totalInv);
  const taxableGains = Math.max(0, gains - taxExemption);
  const tax = considerTax ? taxableGains * (taxRate / 100) : 0;
  const projectedCorpus = projectedCorpusRaw - tax;

  const gapShortfall = Math.max(0, requiredFIRECorpus - projectedCorpus);
  const fireAchieved = projectedCorpus >= requiredFIRECorpus;

  // Additional SIP Needed solver (solve target combo solver using FIRE gap)
  let additionalSipNeeded = 0;
  if (gapShortfall > 0 && yearsRemaining > 0) {
    const sipCombo = solveTargetSIPCombo(
      'sip', gapShortfall, yearsRemaining, expectedReturn / 100, 0, 0, stepUpPct / 100, inflationPct,
      sipFrequency, compoundingFrequency, considerTax, taxRate, taxExemption, considerInflation
    );
    additionalSipNeeded = sipCombo.requiredSip;
  }

  // FIRE Classifications
  const leanFIRECorpus = requiredFIRECorpus * 0.75;
  const fatFIRECorpus = requiredFIRECorpus * 1.50;
  const baristaFIRECorpus = requiredFIRECorpus * 0.50;
  const coastFIRECorpus = requiredFIRECorpus / Math.pow(1 + expectedReturn / 100, yearsRemaining);

  return {
    currentAnnualExpenses,
    expensesAtRetirement,
    requiredFIRECorpus,
    projectedCorpus,
    gapShortfall,
    fireAchieved,
    yearsRemaining,
    additionalSipNeeded,
    leanFIRECorpus,
    fatFIRECorpus,
    baristaFIRECorpus,
    coastFIRECorpus
  };
}
