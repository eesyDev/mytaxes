// Предварительный сценарий. Не импортировать в действующие калькуляторы 2026 года.
// После подписания бюджета сверить показатели с законом, обновить статус и дату.
export const PLANNING_2027 = {
  mrp: 4693,
  mzp: 110000,
  opvr: 0.045,
  checkedAt: '2026-11-17',
  status: 'project',
  budgetSource: 'https://legalacts.egov.kz/npa/view?id=15900691',
  mzpSource: 'https://primeminister.kz/assets/media/ism-realizaciia-poslaniia.pdf',
};

export const money = (value) => `${Math.round(value).toLocaleString('ru-KZ')} ₸`;

// Иллюстрация для статей: резидент без льгот, полный месяц, ИПН 10%,
// базовый вычет у этого работодателя, отдельные платежи, без единого платежа.
// Не универсальный зарплатный калькулятор: подходит для приведённых окладов.
export function salaryExample(gross, { mrp, mzp, opvr }) {
  const opv = gross * 0.10;
  const vosms = gross * 0.02;
  const ipn = Math.max(0, gross - opv - vosms - 30 * mrp) * 0.10;
  const so = Math.max(mzp, Math.min(gross - opv, 7 * mzp)) * 0.05;
  const pensionEmployer = gross * opvr;
  const oosms = gross * 0.03;
  const sn = Math.max(gross - opv - vosms, 14 * mrp) * 0.06;
  const simplified = gross + so + pensionEmployer + oosms;
  return { gross, opv, vosms, ipn, so, opvr: pensionEmployer, oosms, sn,
    net: gross - opv - vosms - ipn, simplified, our: simplified + sn };
}
