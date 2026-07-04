// src/lib/salary-calc.js
// Чистая функция расчёта зарплаты. Не зависит от UI.

import {
  MRP,
  MZP,
  DEDUCTIONS,
  RATES,
  LIMITS,
} from '../data/tax-rates-2026.js';

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Рассчитывает зарплату и налоги.
 *
 * @param {Object} params
 * @param {Array<{type: 'salary'|'sick'|'dividend', amount: number}>} params.incomeItems
 * @param {Object} params.options
 * @param {'our'|'simplified'} params.options.employerMode — ОУР или Упрощёнка
 * @param {boolean} params.options.gph — договор ГПХ
 * @param {boolean} params.options.highIpn — повышенная ставка ИПН (15%)
 * @param {boolean} params.options.highDividendIpn — повышенная ставка по дивидендам
 * @param {Object} params.options.deductions — флаги вычетов
 * @param {boolean} params.options.deductions.ded30
 * @param {boolean} params.options.deductions.ded882
 * @param {boolean} params.options.deductions.ded5000
 * @param {'citizenRK'|'taxResident'|'eaes'|'nonResident'} params.options.residency
 * @param {Object} params.options.statuses — социальные статусы
 * @param {boolean} params.options.statuses.pensioner
 * @param {'none'|'I'|'II'|'III'} params.options.statuses.disabled
 * @param {boolean} params.options.statuses.student
 * @param {boolean} params.options.statuses.astanaHub
 * @param {boolean} params.options.statuses.mfca
 * @param {boolean} params.options.statuses.exemptOpvr
 * @param {boolean} params.options.statuses.manyChildrenMother
 * @param {boolean} params.options.statuses.oppvReceiver
 * @returns {Object} полный результат расчёта
 */
export function calculateSalary(params) {
  const { incomeItems = [], options = {} } = params;

  const {
    employerMode = 'our',
    gph = false,
    highIpn = false,
    highDividendIpn = false,
    deductions: deductionFlags = {},
    residency = 'citizenRK',
    statuses = {},
  } = options;

  // ─── 1. Разбивка доходов по типам ───
  let salaryGross = 0;
  let sickGross = 0;
  let dividendGross = 0;

  for (const item of incomeItems) {
    if (item.type === 'salary') salaryGross += item.amount;
    else if (item.type === 'sick') sickGross += item.amount;
    else if (item.type === 'dividend') dividendGross += item.amount;
  }

  const totalGross = salaryGross + sickGross + dividendGross;

  // ─── 2. Флаги статусов ───
  const isPensioner = statuses.pensioner || false;
  const isDisabled12 = statuses.disabled === 'I' || statuses.disabled === 'II';
  const isDisabled3 = statuses.disabled === 'III';
  const isStudent = statuses.student || false;
  const isAstanaHub = statuses.astanaHub || false;
  const isMfca = statuses.mfca || false;
  const isExemptOpvr = statuses.exemptOpvr || false;
  const isNonResident = residency === 'nonResident';
  const isResidentForDeductions =
    !isNonResident &&
    (residency === 'citizenRK' || residency === 'taxResident' || residency === 'eaes');

  // ─── 3. Вычеты ───
  let deductions = 0;

  if (isResidentForDeductions) {
    if (deductionFlags.ded30) deductions += DEDUCTIONS.base;

    // Инвалид I/II — вычет 5000 МРП (годовой; в помесячном обнуляет базу)
    if (isDisabled12) deductions += DEDUCTIONS.disab12;

    // Инвалид III — вычет 882 МРП (годовой; в помесячном обнуляет базу)
    if (isDisabled3) deductions += DEDUCTIONS.disab3;

    // Чекбокс ded882 — для опекунов (если не выбран статус инвалида III, чтобы не дублировать)
    if (deductionFlags.ded882 && !isDisabled3) deductions += DEDUCTIONS.disab3;

    // Чекбокс ded5000 — для опекунов (если не выбран статус инвалида I/II)
    if (deductionFlags.ded5000 && !isDisabled12) deductions += DEDUCTIONS.disab12;
  }

  // ─── 4. Платежи работника (удержания) ───
  // «Стандартные» ОПВ/ВОСМС — суммы, которые удержал бы обычный работник без льгот.
  // Используются как база для СО и СН: эти платежи считаются от дохода за вычетом
  // стандартных ОПВ/ВОСМС независимо от того, освобождён ли работник от их уплаты.
  const standardOpv = RATES.opv * Math.min(salaryGross, LIMITS.opvMaxBase);
  const standardVosms = RATES.vosms * Math.min(salaryGross, LIMITS.vosmsMaxBase);

  // ОПВ (нерезидент третьих стран — не уплачивает)
  const opvRate = isPensioner || isDisabled12 || isNonResident ? 0 : RATES.opv;
  const opv = opvRate * Math.min(salaryGross, LIMITS.opvMaxBase);

  // ВОСМС (нерезидент третьих стран — не уплачивает)
  const vosmsRate = isPensioner || isDisabled12 || isStudent || isNonResident ? 0 : RATES.vosms;
  const vosms = vosmsRate * Math.min(salaryGross, LIMITS.vosmsMaxBase);

  // СО: при ГПХ удерживается из дохода исполнителя, при штате — платит работодатель.
  // База — от стандартных ОПВ (а не фактических), чтобы льготы по ОПВ не завышали базу СО.
  // При нулевой зарплате (доход только из дивидендов/больничных) минимальная база не применяется.
  const soBase = salaryGross > 0 ? clamp(salaryGross - standardOpv, LIMITS.soMinBase, LIMITS.soMaxBase) : 0;
  const soEmployeeRate = gph && !isPensioner ? RATES.so : 0;
  const soEmployee = soEmployeeRate * soBase;
  const soEmployerRate = !gph && !isPensioner ? RATES.so : 0;
  const soEmployer = soEmployerRate * soBase;

  // ─── 5. ИПН ───
  let ipn = 0;
  let ipnSalary = 0;
  let ipnDividend = 0;

  if (isNonResident) {
    // Нерезидент третьих стран: 20% от gross, без вычетов, без ОПВ/ВОСМС.
    // Разбиваем на зарплатную и дивидендную части, чтобы квитанция показывала ИПН с дивидендов.
    ipnSalary = RATES.ipnNonResident * (salaryGross + sickGross);
    ipnDividend = RATES.ipnNonResident * dividendGross;
    ipn = ipnSalary + ipnDividend;
  } else {
    // Astana Hub / МФЦА освобождают от ИПН только зарплатную часть; дивиденды облагаются.
    const salaryIpnExempt = isAstanaHub || isMfca;

    // Зарплатная база (salary + sick)
    const taxableBase = Math.max(0, salaryGross + sickGross - opv - vosms - deductions);
    const ipnRate = highIpn ? RATES.ipnHigh : RATES.ipn;
    ipnSalary = salaryIpnExempt ? 0 : taxableBase * ipnRate;

    // Дивиденды — отдельная ветка
    const divRate = highDividendIpn ? RATES.dividendHigh : RATES.dividend;
    ipnDividend = dividendGross * divRate;

    ipn = ipnSalary + ipnDividend;
  }

  // ─── 6. Платежи работодателя ───
  // ОПВР (нерезидент третьих стран — не уплачивается)
  const opvrRate = isPensioner || isDisabled12 || isExemptOpvr || isNonResident || gph ? 0 : RATES.opvr;
  const opvr = salaryGross > 0 ? opvrRate * clamp(salaryGross, LIMITS.opvrMinBase, LIMITS.opvrMaxBase) : 0;

  // ООСМС
  const oosmsRate = isPensioner || isStudent || gph ? 0 : RATES.oosms;
  const oosms = salaryGross > 0 ? oosmsRate * clamp(salaryGross, LIMITS.oosmsMinBase, LIMITS.oosmsMaxBase) : 0;

  // СН (только ОУР, не при ГПХ, не при AstanaHub).
  // База — от стандартных ОПВ/ВОСМС (льготы по ним не должны завышать базу СН).
  const snRate = isAstanaHub || gph || employerMode === 'simplified' ? 0 : RATES.sn;
  const snBase = salaryGross > 0 ? Math.max(salaryGross - standardOpv - standardVosms, LIMITS.snMinBase) : 0;
  const sn = snRate * snBase;

  // ─── 7. Итоги ───
  const employerCost = opvr + soEmployer + oosms + sn;
  const totalCost = totalGross + employerCost;
  const naRuki = totalGross - opv - vosms - soEmployee - ipn;

  return {
    gross: totalGross,
    salaryGross,
    sickGross,
    dividendGross,
    employee: {
      opv,
      vosms,
      so: soEmployee,      // при ГПХ — удержано из дохода
      ipn,
      ipnSalary,
      ipnDividend,
      totalDeductions: opv + vosms + soEmployee + ipn,
    },
    employer: {
      opvr,
      so: soEmployer,
      oosms,
      sn,
      employerCost,
    },
    totalCost,
    naRuki,
    meta: {
      deductionsApplied: deductions,
      baseIpn: isNonResident ? totalGross : Math.max(0, salaryGross + sickGross - opv - vosms - deductions),
      ipnRateUsed: isNonResident ? RATES.ipnNonResident : highIpn ? RATES.ipnHigh : RATES.ipn,
      dividendRateUsed: highDividendIpn ? RATES.dividendHigh : RATES.dividend,
    },
  };
}
