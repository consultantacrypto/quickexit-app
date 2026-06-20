/**
 * Date legale publice ale operatorului platformei — sursă unică de adevăr.
 * NU include adrese personale ale membrilor din LLC Operating Agreement sau alte documente interne confidențiale.
 *
 * TODO (admin intern): orice rezidență adresă privată membri / annex — doar în sistem securizat, nu în acest bundle.
 */
export const companyInfo = {
  legalName: "QuickExit, LLC",
  brandName: "Quick Exit",
  entityType: "Delaware Limited Liability Company",
  jurisdiction: "Delaware, United States",
  registeredOffice: {
    line1: "131 Continental Dr, Suite 305",
    city: "Newark",
    state: "DE",
    postalCode: "19713",
    county: "New Castle County",
    country: "United States",
  },
  registeredAgent: "Legalinc Corporate Services Inc.",
  filing: {
    document: "Certificate of Formation",
    state: "Delaware",
    filingDate: "April 27, 2026",
    fileNumber: "10599896",
    authentication: "203770430",
  },
  authorizedPerson: "Mihai Daniel",
  manager: "Mihai Daniel",
  publicEmail: "office@quickexit.ro",
  copyright: "© 2026 QuickExit, LLC. Toate drepturile rezervate.",
} as const;

export function formatRegisteredOfficeFull(): string {
  const o = companyInfo.registeredOffice;
  return `${o.line1}, ${o.city}, ${o.state} ${o.postalCode}, ${o.county}, ${o.country}`;
}
