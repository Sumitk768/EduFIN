/**
 * Financial calculation helper utilities
 */

export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundFrequencyPerYear: number = 12,
  monthlyContribution: number = 0
) {
  const r = annualRate / 100;
  const n = compoundFrequencyPerYear;
  const t = years;

  // Future value of principal: P * (1 + r/n)^(n*t)
  const principalFV = principal * Math.pow(1 + r / n, n * t);

  // Future value of periodic monthly deposits
  // FV = PMT * [((1 + r/n)^(n*t) - 1) / (r/n)]
  let contributionsFV = 0;
  let totalDeposited = principal;

  const totalPeriods = n * t;
  const ratePerPeriod = r / n;

  if (monthlyContribution > 0) {
    if (ratePerPeriod > 0) {
      contributionsFV = monthlyContribution * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
    } else {
      contributionsFV = monthlyContribution * totalPeriods;
    }
    totalDeposited += monthlyContribution * totalPeriods;
  }

  const finalAmount = Math.round((principalFV + contributionsFV) * 100) / 100;
  const totalInterest = Math.round((finalAmount - totalDeposited) * 100) / 100;

  // Generate yearly breakdown
  const yearlyBreakdown = [];
  let currentBalance = principal;
  let currentDeposited = principal;

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      currentBalance = currentBalance * (1 + r / 12) + monthlyContribution;
      currentDeposited += monthlyContribution;
    }
    yearlyBreakdown.push({
      year,
      totalDeposited: Math.round(currentDeposited * 100) / 100,
      totalInterestEarned: Math.round((currentBalance - currentDeposited) * 100) / 100,
      endingBalance: Math.round(currentBalance * 100) / 100,
    });
  }

  return {
    principal,
    annualRate,
    years,
    monthlyContribution,
    totalDeposited: Math.round(totalDeposited * 100) / 100,
    totalInterestEarned: totalInterest,
    finalAmount,
    yearlyBreakdown,
  };
}

export function calculateLoanAmortization(
  loanAmount: number,
  annualInterestRate: number,
  tenureYears: number
) {
  const principal = loanAmount;
  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = tenureYears * 12;

  let monthlyEMI = 0;
  if (monthlyRate === 0) {
    monthlyEMI = principal / totalMonths;
  } else {
    monthlyEMI =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);
  }

  monthlyEMI = Math.round(monthlyEMI * 100) / 100;
  const totalPayment = Math.round(monthlyEMI * totalMonths * 100) / 100;
  const totalInterest = Math.round((totalPayment - principal) * 100) / 100;

  const schedule = [];
  let remainingBalance = principal;

  for (let month = 1; month <= totalMonths; month++) {
    const interestForMonth = Math.round(remainingBalance * monthlyRate * 100) / 100;
    const principalForMonth = Math.round((monthlyEMI - interestForMonth) * 100) / 100;
    remainingBalance = Math.max(0, Math.round((remainingBalance - principalForMonth) * 100) / 100);

    // Keep schedule compact (first year, mid milestones, last month) or sample if large
    if (month <= 12 || month % 12 === 0 || month === totalMonths) {
      schedule.push({
        month,
        year: Math.ceil(month / 12),
        payment: monthlyEMI,
        principalPaid: principalForMonth,
        interestPaid: interestForMonth,
        remainingBalance,
      });
    }
  }

  return {
    loanAmount,
    annualInterestRate,
    tenureYears,
    totalMonths,
    monthlyEMI,
    totalInterestPaid: totalInterest,
    totalAmountPayable: totalPayment,
    scheduleSample: schedule,
  };
}

export function calculateInflationImpact(
  currentAmount: number,
  expectedInflationRate: number,
  yearsInFuture: number
) {
  const r = expectedInflationRate / 100;
  const futurePurchasingPower = currentAmount / Math.pow(1 + r, yearsInFuture);
  const futureCostEquivalent = currentAmount * Math.pow(1 + r, yearsInFuture);

  const lossInPurchasingPower = currentAmount - futurePurchasingPower;
  const percentageLoss = ((currentAmount - futurePurchasingPower) / currentAmount) * 100;

  return {
    currentAmount,
    expectedInflationRate,
    yearsInFuture,
    futurePurchasingPower: Math.round(futurePurchasingPower * 100) / 100,
    futureCostEquivalent: Math.round(futureCostEquivalent * 100) / 100,
    lossInPurchasingPower: Math.round(lossInPurchasingPower * 100) / 100,
    percentagePurchasingPowerLoss: Math.round(percentageLoss * 10) / 10,
  };
}

export function calculateBudgetRule503020(monthlyIncome: number) {
  return {
    monthlyIncome,
    needs_50: {
      percentage: 50,
      amount: Math.round(monthlyIncome * 0.5 * 100) / 100,
      description: 'Essential expenses (Rent, Groceries, Utilities, Healthcare, Debt Minimums)',
    },
    wants_30: {
      percentage: 30,
      amount: Math.round(monthlyIncome * 0.3 * 100) / 100,
      description: 'Lifestyle choices (Dining out, Entertainment, Hobbies, Subscriptions)',
    },
    savings_20: {
      percentage: 20,
      amount: Math.round(monthlyIncome * 0.2 * 100) / 100,
      description: 'Future wealth & security (Emergency fund, Investments, High-interest debt payoff)',
    },
  };
}
