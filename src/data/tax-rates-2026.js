// src/data/tax-rates-2026.js
// Константы и ставки налогов РК на 2026 год.
// Все денежные суммы в KZT.

export const TAX_YEAR = 2026;

export const MRP = 4325;
export const MZP = 85000;

export const DEDUCTIONS = {
  base: 30 * MRP,        // 129 750
  disab12: 5000 * MRP,   // 21 625 000 (годовой)
  disab3: 882 * MRP,     // 3 814 650 (годовой)
};

export const THRESHOLDS = {
  ipnYear: 8500 * MRP,      // 36 762 500
  dividend: 230000 * MRP,   // 994 750 000
};

export const RATES = {
  opv: 0.10,
  vosms: 0.02,
  ipn: 0.10,
  ipnHigh: 0.15,
  opvr: 0.035,
  so: 0.05,
  oosms: 0.03,
  sn: 0.06,
  ipnNonResident: 0.20,
  dividend: 0.05,
  dividendHigh: 0.15,
};

export const LIMITS = {
  opvMaxBase: 50 * MZP,     // 4 250 000
  vosmsMaxBase: 20 * MZP,   // 1 700 000
  opvrMinBase: 1 * MZP,     // 85 000
  opvrMaxBase: 50 * MZP,    // 4 250 000
  soMinBase: 1 * MZP,       // 85 000
  soMaxBase: 7 * MZP,       // 595 000
  oosmsMinBase: 1 * MZP,    // 85 000
  oosmsMaxBase: 40 * MZP,   // 3 400 000
  snMinBase: 14 * MRP,      // 60 550
};

// Каждый платёж содержит ставку, сторону оплаты и лимиты базы.
// paidBy: 'employee' | 'employer'
// Это критично для корректной работы ГПХ и льготных статусов.
export const PAYMENTS = {
  opv: {
    rate: RATES.opv,
    paidBy: 'employee',
    maxBase: LIMITS.opvMaxBase,
  },
  vosms: {
    rate: RATES.vosms,
    paidBy: 'employee',
    maxBase: LIMITS.vosmsMaxBase,
  },
  ipn: {
    rate: RATES.ipn,
    paidBy: 'employee',
  },
  so: {
    rate: RATES.so,
    paidBy: 'employer',
    minBase: LIMITS.soMinBase,
    maxBase: LIMITS.soMaxBase,
  },
  opvr: {
    rate: RATES.opvr,
    paidBy: 'employer',
    minBase: LIMITS.opvrMinBase,
    maxBase: LIMITS.opvrMaxBase,
  },
  oosms: {
    rate: RATES.oosms,
    paidBy: 'employer',
    minBase: LIMITS.oosmsMinBase,
    maxBase: LIMITS.oosmsMaxBase,
  },
  sn: {
    rate: RATES.sn,
    paidBy: 'employer',
    minBase: LIMITS.snMinBase,
  },
};
