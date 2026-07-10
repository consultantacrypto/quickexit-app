export type FinancingConfig = {
  partnerId: string;
  partnerName: string;
  interestOptions: readonly number[];
  defaultInterest: number;
  depositMin: number;
  depositMax: number;
  depositStep: number;
  defaultDeposit: number;
  termsMonths: readonly number[];
  defaultTerm: number;
  currency: "EUR";
};

export const financingConfig: FinancingConfig = {
  partnerId: "optimo",
  partnerName: "Optimo Autohaus",
  interestOptions: [4, 5, 6],
  defaultInterest: 5,
  depositMin: 15,
  depositMax: 50,
  depositStep: 5,
  defaultDeposit: 20,
  termsMonths: [12, 24, 36, 48, 60],
  defaultTerm: 48,
  currency: "EUR",
};
