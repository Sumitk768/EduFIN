import {
  calculateCompoundInterest,
  calculateLoanAmortization,
  calculateInflationImpact,
  calculateBudgetRule503020,
} from '../utils/math.util';
import {
  CompoundInterestInput,
  LoanAmortizationInput,
  InflationImpactInput,
  EmergencyFundInput,
  Budget503020Input,
} from '../models/simulator.model';
import { SIMULATOR_PRESETS } from '../data/initial-simulators';

export class SimulatorService {
  calculateCompound(input: CompoundInterestInput) {
    return calculateCompoundInterest(
      input.principal,
      input.annualRate,
      input.years,
      input.compoundFrequencyPerYear || 12,
      input.monthlyContribution || 0
    );
  }

  calculateLoan(input: LoanAmortizationInput) {
    return calculateLoanAmortization(
      input.loanAmount,
      input.annualInterestRate,
      input.tenureYears
    );
  }

  calculateInflation(input: InflationImpactInput) {
    return calculateInflationImpact(
      input.currentAmount,
      input.expectedInflationRate || 6,
      input.yearsInFuture || 10
    );
  }

  calculateEmergencyFund(input: EmergencyFundInput) {
    const targetMonths = input.targetMonths || 6;
    const requiredTotal = Math.round(input.monthlyEssentialExpenses * targetMonths * 100) / 100;
    const currentSavings = input.currentSavings || 0;
    const shortfall = Math.max(0, Math.round((requiredTotal - currentSavings) * 100) / 100);
    const fundedPercentage = Math.min(100, Math.round((currentSavings / requiredTotal) * 100));

    let monthsToReachTarget: number | null = null;
    if (input.monthlySavingsCapacity && input.monthlySavingsCapacity > 0 && shortfall > 0) {
      monthsToReachTarget = Math.ceil(shortfall / input.monthlySavingsCapacity);
    }

    return {
      monthlyEssentialExpenses: input.monthlyEssentialExpenses,
      targetMonths,
      targetEmergencyFundAmount: requiredTotal,
      currentSavings,
      shortfall,
      fundedPercentage,
      monthlySavingsCapacity: input.monthlySavingsCapacity || 0,
      estimatedMonthsToReachTarget: monthsToReachTarget,
      recommendedAllocation: 'Store in a high-yield savings account or liquid money market deposit.',
    };
  }

  calculate503020(input: Budget503020Input) {
    return calculateBudgetRule503020(input.monthlyIncome);
  }

  getPresets() {
    return SIMULATOR_PRESETS;
  }
}

export const simulatorService = new SimulatorService();
