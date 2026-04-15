import { type MonthDayInfo } from '@/features/habits/utils/calendarUtils';

export function getReferenceDate(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function createDateKey(year: number, month: number, dayNumber: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
}

export function getDateKeyForDate(value: Date) {
  return createDateKey(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getReferenceDateKey(referenceDate = getReferenceDate()) {
  return getDateKeyForDate(referenceDate);
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day);
}

export function getDateKeyFromTimestamp(value: string) {
  return getDateKeyForDate(new Date(value));
}

export function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

function compareMonthToReference(year: number, month: number, referenceDate: Date) {
  const referenceYear = referenceDate.getFullYear();
  const referenceMonth = referenceDate.getMonth();

  if (year < referenceYear || (year === referenceYear && month < referenceMonth)) return -1;
  if (year > referenceYear || (year === referenceYear && month > referenceMonth)) return 1;
  return 0;
}

function getWeekDays(monthDays: MonthDayInfo[], weekNumber: number) {
  return monthDays.filter((day) => day.exists && day.weekNumber === weekNumber);
}

export function isDayInCurrentMonth(year: number, month: number, referenceDate = getReferenceDate()) {
  return compareMonthToReference(year, month, referenceDate) === 0;
}

export function isDayFuture(year: number, month: number, dayNumber: number, referenceDate = getReferenceDate()) {
  const monthComparison = compareMonthToReference(year, month, referenceDate);
  if (monthComparison > 0) return true;
  if (monthComparison < 0) return false;
  return dayNumber > referenceDate.getDate();
}

export function isDayModifiable(year: number, month: number, dayNumber: number, referenceDate = getReferenceDate()) {
  return !isDayFuture(year, month, dayNumber, referenceDate);
}

export function isDateKeyFuture(dateKey: string, referenceDate = getReferenceDate()) {
  return compareDateKeys(dateKey, getReferenceDateKey(referenceDate)) > 0;
}

export function isDateKeyModifiable(dateKey: string, referenceDate = getReferenceDate()) {
  return !isDateKeyFuture(dateKey, referenceDate);
}

export function getElapsedDaysInMonth(
  year: number,
  month: number,
  daysInMonth: number,
  referenceDate = getReferenceDate(),
) {
  const monthComparison = compareMonthToReference(year, month, referenceDate);
  if (monthComparison < 0) return daysInMonth;
  if (monthComparison > 0) return 0;
  return Math.min(referenceDate.getDate(), daysInMonth);
}

export function isWeekFuture(
  year: number,
  month: number,
  weekNumber: number,
  monthDays: MonthDayInfo[],
  referenceDate = getReferenceDate(),
) {
  const monthComparison = compareMonthToReference(year, month, referenceDate);
  if (monthComparison > 0) return true;
  if (monthComparison < 0) return false;

  const daysInWeek = getWeekDays(monthDays, weekNumber);
  if (daysInWeek.length === 0) return false;

  const firstDayOfWeek = daysInWeek[0].dayNumber ?? 0;
  return firstDayOfWeek > referenceDate.getDate();
}

export function isWeekElapsed(
  year: number,
  month: number,
  weekNumber: number,
  monthDays: MonthDayInfo[],
  referenceDate = getReferenceDate(),
) {
  const monthComparison = compareMonthToReference(year, month, referenceDate);
  if (monthComparison < 0) return true;
  if (monthComparison > 0) return false;

  const daysInWeek = getWeekDays(monthDays, weekNumber);
  if (daysInWeek.length === 0) return false;

  const lastDayOfWeek = daysInWeek[daysInWeek.length - 1].dayNumber ?? 0;
  return lastDayOfWeek <= referenceDate.getDate();
}

export function isWeekModifiable(
  year: number,
  month: number,
  weekNumber: number,
  monthDays: MonthDayInfo[],
  referenceDate = getReferenceDate(),
) {
  return !isWeekFuture(year, month, weekNumber, monthDays, referenceDate);
}

export function getElapsedWeeksInMonth(
  weeksInMonth: number,
  year: number,
  month: number,
  monthDays: MonthDayInfo[],
  referenceDate = getReferenceDate(),
) {
  let elapsedWeeks = 0;

  for (let weekNumber = 1; weekNumber <= weeksInMonth; weekNumber += 1) {
    if (isWeekElapsed(year, month, weekNumber, monthDays, referenceDate)) {
      elapsedWeeks += 1;
    }
  }

  return elapsedWeeks;
}

export function getMonthBoundaryDateKeys(year: number, month: number, daysInMonth: number) {
  return {
    startDateKey: createDateKey(year, month, 1),
    endDateKey: createDateKey(year, month, daysInMonth),
  };
}
