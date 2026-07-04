// src/lib/salary-calc.test.js
// Юнит-тесты на calculateSalary. Можно запускать через Node.js или Jest.

import { calculateSalary } from './salary-calc.js';

function assertEqual(actual, expected, message) {
  const diff = Math.abs(actual - expected);
  if (diff > 0.01) {
    throw new Error(
      `${message}\n  Ожидалось: ${expected}\n  Получено:  ${actual}\n  Разница:   ${diff}`
    );
  }
}

function runTests() {
  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Базовый: 300 000, РК, ОУР, вычет 30 МРП, в штате',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
          statuses: {},
        },
      },
      expected: {
        opv: 30_000,
        vosms: 6_000,
        ipn: 13_425,
        naRuki: 250_575,
        so: 13_500,
        oosms: 9_000,
        opvr: 10_500,
        sn: 15_840,
        employerCost: 48_840,
        totalCost: 348_840,
      },
    },
    {
      name: 'Без вычета: 300 000, без 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          deductions: {},
          residency: 'citizenRK',
        },
      },
      expected: {
        ipn: 26_400,
        naRuki: 237_600,
      },
    },
    {
      name: 'Низкая зп: 85 000, вычет 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 85_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
        },
      },
      expected: {
        ipn: 0,
        naRuki: 74_800,
        so: 4_250,
        oosms: 2_550,
        opvr: 2_975,
      },
    },
    {
      name: 'Полная стоимость найма: 500 000',
      params: {
        incomeItems: [{ type: 'salary', amount: 500_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
        },
      },
      expected: {
        employerCost: 81_400,
        totalCost: 581_400,
      },
    },
    {
      name: 'Пенсионер: 300 000, ОУР, вычет 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
          statuses: { pensioner: true },
        },
      },
      expected: {
        opv: 0,
        vosms: 0,
        so: 0,
        oosms: 0,
        opvr: 0,
        ipn: 17_025,          // (300 000 - 129 750) * 10%
        naRuki: 282_975,      // 300 000 - 17 025
        sn: 15_840,
        employerCost: 15_840, // только СН
        totalCost: 315_840,
      },
    },
    {
      name: 'ГПХ: 300 000, без вычетов',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          gph: true,
          deductions: {},
          residency: 'citizenRK',
        },
      },
      expected: {
        opv: 30_000,
        vosms: 6_000,
        so: 13_500,           // удержано из дохода
        ipn: 26_400,          // (300 000 - 30 000 - 6 000) * 10%
        naRuki: 224_100,      // 300 000 - 30 000 - 6 000 - 13 500 - 26 400
        opvr: 0,
        oosms: 0,
        sn: 0,
        employerCost: 0,
        totalCost: 300_000,
      },
    },
    {
      name: 'Инвалид I/II: 300 000, ОУР, вычет 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
          statuses: { disabled: 'I' },
        },
      },
      expected: {
        opv: 0,
        vosms: 0,
        opvr: 0,
        so: 13_500,
        oosms: 9_000,         // стандартно (не 0)
        sn: 15_840,
        ipn: 0,               // вычет 30 + 5000 МРП обнуляет базу
        naRuki: 300_000,
        employerCost: 38_340, // so + oosms + sn
      },
    },
    {
      name: 'Студент: 300 000, ОУР, вычет 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
          statuses: { student: true },
        },
      },
      expected: {
        opv: 30_000,
        vosms: 0,
        oosms: 0,             // работодатель не платит
        so: 13_500,
        opvr: 10_500,
        sn: 15_840,
        ipn: 14_025,          // (300 000 - 30 000 - 0 - 129 750) * 10% — у студента ВОСМС=0, база ИПН выше
        naRuki: 255_975,      // 300 000 - 30 000 - 14 025
        employerCost: 39_840, // so + opvr + sn (без oosms)
      },
    },
    {
      name: 'Astana Hub: 300 000, ОУР, вычет 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
          statuses: { astanaHub: true },
        },
      },
      expected: {
        ipn: 0,
        sn: 0,
        opv: 30_000,
        vosms: 6_000,
        so: 13_500,
        oosms: 9_000,
        opvr: 10_500,
        naRuki: 264_000,      // 300 000 - 30 000 - 6 000 (СО платит работодатель сверху, ИПН=0)
        employerCost: 33_000, // so + oosms + opvr
      },
    },
    {
      name: 'Упрощёнка: 300 000, вычет 30 МРП',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'simplified',
          deductions: { ded30: true },
          residency: 'citizenRK',
        },
      },
      expected: {
        sn: 0,
        ipn: 13_425,
        employerCost: 33_000, // opvr + so + oosms (без СН)
      },
    },
    {
      name: 'Нерезидент (третьи страны): 300 000',
      params: {
        incomeItems: [{ type: 'salary', amount: 300_000 }],
        options: {
          employerMode: 'our',
          residency: 'nonResident',
        },
      },
      expected: {
        opv: 0,
        vosms: 0,
        ipn: 60_000,          // 300 000 * 20%
        naRuki: 240_000,
        so: 13_500,
        oosms: 9_000,
        opvr: 0,              // нерезидент — ОПВР 0
        sn: 15_840,
        employerCost: 38_340,
      },
    },
    {
      name: 'Только дивиденды (без зарплаты): 1 000 000',
      params: {
        incomeItems: [{ type: 'dividend', amount: 1_000_000 }],
        options: { employerMode: 'our', residency: 'citizenRK' },
      },
      expected: {
        opv: 0,
        vosms: 0,
        ipn: 50_000,          // 5% с дивидендов
        so: 0,                // нет зарплаты — база работодателя не начисляется
        oosms: 0,
        opvr: 0,
        sn: 0,
        employerCost: 0,
        naRuki: 950_000,
        totalCost: 1_000_000,
      },
    },
    {
      name: 'Astana Hub с дивидендами: зп 300 000 + дивиденды 1 000 000',
      params: {
        incomeItems: [
          { type: 'salary', amount: 300_000 },
          { type: 'dividend', amount: 1_000_000 },
        ],
        options: {
          employerMode: 'our',
          deductions: { ded30: true },
          residency: 'citizenRK',
          statuses: { astanaHub: true },
        },
      },
      expected: {
        ipn: 50_000,          // зарплатный ИПН освобождён, дивиденды 5% = 50 000
      },
    },
  ];

  for (const test of tests) {
    try {
      const result = calculateSalary(test.params);
      const exp = test.expected;

      if (exp.opv !== undefined) assertEqual(result.employee.opv, exp.opv, `${test.name} — ОПВ`);
      if (exp.vosms !== undefined) assertEqual(result.employee.vosms, exp.vosms, `${test.name} — ВОСМС`);
      // СО может удерживаться у работника (ГПХ) либо платиться работодателем (штат) —
      // сверяем суммарную величину независимо от стороны.
      if (exp.so !== undefined) assertEqual(result.employee.so + result.employer.so, exp.so, `${test.name} — СО (всего)`);
      if (exp.ipn !== undefined) assertEqual(result.employee.ipn, exp.ipn, `${test.name} — ИПН`);
      if (exp.naRuki !== undefined) assertEqual(result.naRuki, exp.naRuki, `${test.name} — На руки`);
      if (exp.opvr !== undefined) assertEqual(result.employer.opvr, exp.opvr, `${test.name} — ОПВР`);
      if (exp.oosms !== undefined) assertEqual(result.employer.oosms, exp.oosms, `${test.name} — ООСМС`);
      if (exp.sn !== undefined) assertEqual(result.employer.sn, exp.sn, `${test.name} — СН`);
      if (exp.employerCost !== undefined) assertEqual(result.employer.employerCost, exp.employerCost, `${test.name} — Расходы работодателя`);
      if (exp.totalCost !== undefined) assertEqual(result.totalCost, exp.totalCost, `${test.name} — Полная стоимость`);

      console.log(`✅ ${test.name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${test.name}`);
      console.error(err.message);
      failed++;
    }
  }

  console.log(`\nИтого: ${passed} пройдено, ${failed} не пройдено`);
  if (failed > 0) process.exit(1);
}

runTests();
