// src/data/tax-rates-2026.js
// Константы и ставки налогов РК на 2026 год.
// Все денежные суммы в KZT.

export const TAX_YEAR = 2026;
export const VERIFIED_AT = '2026-10-10';

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
  dividendNonResident: 0.15, // дивиденды нерезидента у источника (общий случай, ст. 646/682 НК)
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

// Бизнес-режимы 2026. Патент, отдельный розничный налог и СНР через
// специальное мобильное приложение с 01.01.2026 не являются самостоятельными СНР.
export const BUSINESS_2026 = {
  simplified: {
    rate: 0.04,
    minRegionalRate: 0.02,
    maxRegionalRate: 0.06,
    annualIncomeMrp: 600_000,
    annualIncome: 600_000 * MRP,
    reporting: '910.00, полугодие',
    vatPayer: false,
  },
  selfEmployed: {
    ipnRate: 0,
    socialPaymentRate: 0.04,
    monthlyIncomeMrp: 300,
    monthlyIncome: 300 * MRP,
  },
  vat: {
    ourRegistrationThresholdMrp: 10_000,
    ourRegistrationThreshold: 10_000 * MRP,
  },
  discontinued: ['patent', 'retail-tax', 'special-mobile-app'],
};

export const OFFICIAL_SOURCES = {
  taxCode: 'https://adilet.zan.kz/rus/docs/K2500000214',
  simplified: 'https://www.gov.kz/memleket/entities/kgd-vko/press/article/details/219504?lang=ru',
  vat: 'https://www.gov.kz/memleket/entities/kgd/press/news/details/1096207?lang=ru',
  deductions: 'https://www.gov.kz/memleket/entities/minfin/documents/details/1030415?lang=ru',
  indicators: 'https://www.gov.kz/article/17157?lang=ru',
  declarations: 'https://www.gov.kz/memleket/entities/kgd-astana/press/news/details/1070739?lang=ru',
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
