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
 * @param {'residentRK'|'eaesPermanent'|'eaesTemp'|'nonResident'} params.options.residency
 * @param {boolean} params.options.partialMonth — месяц найма/увольнения (минимальные базы не применяются)
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
    residency = 'residentRK',
    statuses = {},
    // Месяц найма/увольнения: минимальные базы СО/ОПВР/ООСМС/СН не применяются,
    // берётся фактический доход (ст. НК РК). Оклад проратируется до вызова функции.
    partialMonth = false,
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
  // Резидентство. Практически 4 категории:
  //   residentRK     — гражданин РК / иностранец с ВНЖ (резидент)
  //   eaesPermanent  — гражданин ЕАЭС, постоянно пребывающий (резидент) → как гражданин РК
  //   eaesTemp       — гражданин ЕАЭС, временно пребывающий (нерезидент) → ИПН 10%, без соц. платежей
  //   nonResident    — третьи страны без ВНЖ (нерезидент) → ИПН 20%, без соц. платежей
  // Нерезиденты (eaesTemp / nonResident): не удерживаются ОПВ/ВОСМС/СО, работодатель не платит
  // ОПВР/ООСМС; остаётся только СН и ИПН. Вычеты не применяются.
  const isNonResident = residency === 'eaesTemp' || residency === 'nonResident';
  const nonResidentIpnRate = residency === 'eaesTemp' ? RATES.ipn : RATES.ipnNonResident;
  const isResidentForDeductions = residency === 'residentRK' || residency === 'eaesPermanent';

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
  const soBase = salaryGross > 0 ? clamp(salaryGross - standardOpv, partialMonth ? 0 : LIMITS.soMinBase, LIMITS.soMaxBase) : 0;
  const soEmployeeRate = gph && !isPensioner && !isNonResident ? RATES.so : 0;
  const soEmployee = soEmployeeRate * soBase;
  const soEmployerRate = !gph && !isPensioner && !isNonResident ? RATES.so : 0;
  const soEmployer = soEmployerRate * soBase;

  // ─── 5. ИПН ───
  let ipn = 0;
  let ipnSalary = 0;
  let ipnDividend = 0;

  if (isNonResident) {
    // Нерезидент: плоская ставка от gross, без вычетов, без ОПВ/ВОСМС.
    // Трудовой доход: ЕАЭС временно — 10%, третьи страны — 20%.
    ipnSalary = nonResidentIpnRate * (salaryGross + sickGross);
    // Дивиденды нерезидента облагаются у источника по 15% (ст. 646/682 НК), независимо
    // от трудовой ставки. Льготная прогрессия для владельцев ≥25% капитала не моделируется.
    ipnDividend = RATES.dividendNonResident * dividendGross;
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
  const opvr = salaryGross > 0 ? opvrRate * clamp(salaryGross, partialMonth ? 0 : LIMITS.opvrMinBase, LIMITS.opvrMaxBase) : 0;

  // ООСМС (нерезидент — не уплачивается)
  const oosmsRate = isPensioner || isStudent || gph || isNonResident ? 0 : RATES.oosms;
  const oosms = salaryGross > 0 ? oosmsRate * clamp(salaryGross, partialMonth ? 0 : LIMITS.oosmsMinBase, LIMITS.oosmsMaxBase) : 0;

  // СН (только ОУР, не при ГПХ, не при AstanaHub).
  // База — от стандартных ОПВ/ВОСМС (льготы по ним не должны завышать базу СН).
  const snRate = isAstanaHub || gph || employerMode === 'simplified' ? 0 : RATES.sn;
  const snBase = salaryGross > 0 ? Math.max(salaryGross - standardOpv - standardVosms, partialMonth ? 0 : LIMITS.snMinBase) : 0;
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
      ipnRateUsed: isNonResident ? nonResidentIpnRate : highIpn ? RATES.ipnHigh : RATES.ipn,
      dividendRateUsed: isNonResident
        ? RATES.dividendNonResident
        : highDividendIpn ? RATES.dividendHigh : RATES.dividend,
    },
  };
}

/**
 * Обратный расчёт: подбирает оклад (gross) по желаемой сумме «на руки».
 *
 * Прямая функция кусочно-линейна (пороги ИПН, лимиты баз, обнуление базы вычетами),
 * поэтому аналитическая инверсия неустойчива. «На руки» монотонно возрастает по окладу,
 * что гарантирует сходимость бинарного поиска.
 *
 * Подбирается только зарплатная часть (тип 'salary'). Больничные и дивиденды в обратном
 * режиме не участвуют — их take-home нельзя однозначно отделить от целевой суммы.
 *
 * @param {number} targetNet — желаемая сумма на руки
 * @param {Object} options — те же опции, что у calculateSalary
 * @returns {Object} результат calculateSalary при найденном окладе + { grossSalary }
 */
export function calculateGrossFromNet(targetNet, options = {}) {
  const netOf = (salary) =>
    calculateSalary({ incomeItems: [{ type: 'salary', amount: salary }], options }).naRuki;

  const resultAt = (salary) => {
    const result = calculateSalary({ incomeItems: [{ type: 'salary', amount: salary }], options });
    return { ...result, grossSalary: salary };
  };

  if (!(targetNet > 0)) return resultAt(0);

  // «На руки» монотонно возрастает по окладу и не превышает его → оклад ≥ targetNet.
  let lo = 0;
  let hi = targetNet * 3 + 1_000_000;

  // На случай экзотических ставок гарантируем, что верхняя граница перекрывает цель.
  let guard = 0;
  while (netOf(hi) < targetNet && guard < 40) {
    hi *= 2;
    guard++;
  }

  // Бисекция до точности < 0.001 ₸ (не больше 100 итераций — с запасом).
  for (let i = 0; i < 100 && hi - lo > 0.001; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < targetNet) lo = mid;
    else hi = mid;
  }

  return resultAt((lo + hi) / 2);
}
