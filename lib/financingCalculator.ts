import { financingConfig } from "./financingConfig";

export type FinancingCalculationInput = {
  vehiclePrice: number;
  depositPct: number;
  annualInterestPct: number;
  months: number;
};

export type FinancingCalculationResult = {
  vehiclePrice: number;
  depositAmount: number;
  financedAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  totalInstallments: number;
  totalCostIncludingDeposit: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateFinancing(
  input: FinancingCalculationInput,
): FinancingCalculationResult | null {
  const vehiclePrice = Number(input.vehiclePrice);
  const depositPct = Number(input.depositPct);
  const annualInterestPct = Number(input.annualInterestPct);
  const months = Math.round(Number(input.months));

  if (!isFinitePositive(vehiclePrice) || !Number.isFinite(months) || months <= 0) {
    return null;
  }

  if (
    !Number.isFinite(depositPct) ||
    depositPct < financingConfig.depositMin ||
    depositPct > financingConfig.depositMax
  ) {
    return null;
  }

  if (!financingConfig.interestOptions.includes(annualInterestPct)) {
    return null;
  }

  if (!financingConfig.termsMonths.includes(months)) {
    return null;
  }

  const depositAmount = round2(vehiclePrice * (depositPct / 100));
  const financedAmount = round2(vehiclePrice - depositAmount);

  if (financedAmount <= 0) {
    return null;
  }

  const monthlyRate = annualInterestPct / 100 / 12;
  let monthlyPayment: number;

  if (monthlyRate === 0) {
    monthlyPayment = financedAmount / months;
  } else {
    const factor = Math.pow(1 + monthlyRate, months);
    if (!Number.isFinite(factor) || factor <= 1) {
      return null;
    }
    monthlyPayment = (financedAmount * monthlyRate * factor) / (factor - 1);
  }

  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
    return null;
  }

  const monthlyPaymentDisplay = round2(monthlyPayment);
  const totalInstallments = round2(monthlyPayment * months);
  const totalInterest = round2(totalInstallments - financedAmount);
  const totalCostIncludingDeposit = round2(depositAmount + totalInstallments);

  if (
    !Number.isFinite(totalInterest) ||
    !Number.isFinite(totalInstallments) ||
    !Number.isFinite(totalCostIncludingDeposit)
  ) {
    return null;
  }

  return {
    vehiclePrice: round2(vehiclePrice),
    depositAmount,
    financedAmount,
    monthlyPayment: monthlyPaymentDisplay,
    totalInterest,
    totalInstallments,
    totalCostIncludingDeposit,
  };
}
