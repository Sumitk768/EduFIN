import { z } from 'zod';

export const CompoundInterestInputSchema = z.object({
  principal: z.number().min(0),
  annualRate: z.number().min(0).max(100),
  years: z.number().int().min(1).max(50),
  compoundFrequencyPerYear: z.number().int().min(1).max(365).default(12),
  monthlyContribution: z.number().min(0).default(0),
});

export const LoanAmortizationInputSchema = z.object({
  loanAmount: z.number().min(100),
  annualInterestRate: z.number().min(0.1).max(50),
  tenureYears: z.number().int().min(1).max(40),
});

export const InflationImpactInputSchema = z.object({
  currentAmount: z.number().min(1),
  expectedInflationRate: z.number().min(0).max(50).default(6),
  yearsInFuture: z.number().int().min(1).max(50).default(10),
});

export const EmergencyFundInputSchema = z.object({
  monthlyEssentialExpenses: z.number().min(1),
  targetMonths: z.number().int().min(1).max(24).default(6),
  currentSavings: z.number().min(0).default(0),
  monthlySavingsCapacity: z.number().min(0).default(0),
});

export const Budget503020InputSchema = z.object({
  monthlyIncome: z.number().min(1),
});

export type CompoundInterestInput = z.infer<typeof CompoundInterestInputSchema>;
export type LoanAmortizationInput = z.infer<typeof LoanAmortizationInputSchema>;
export type InflationImpactInput = z.infer<typeof InflationImpactInputSchema>;
export type EmergencyFundInput = z.infer<typeof EmergencyFundInputSchema>;
export type Budget503020Input = z.infer<typeof Budget503020InputSchema>;
