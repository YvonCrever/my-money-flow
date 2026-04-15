/**
 * Utilitaires de calendrier pour le Habit Tracker
 *
 * Logique des semaines internes au mois :
 * - Week 1 commence au 1er du mois et se termine au premier dimanche
 * - Week 2 commence au lundi suivant et dure 7 jours (lun-dim)
 * - Les semaines suivantes durent 7 jours (lun-dim)
 * - La dernière semaine se termine au dernier jour du mois
 *
 * Exemple pour avril 2025 (le 1er est un mardi) :
 * - Week 1 : 1 (mar) à 6 (dim) = 6 jours
 * - Week 2 : 7 (lun) à 13 (dim) = 7 jours
 * - Week 3 : 14 (lun) à 20 (dim) = 7 jours
 * - Week 4 : 21 (lun) à 27 (dim) = 7 jours
 * - Week 5 : 28 (lun) à 30 (mer) = 3 jours
 */

/**
 * Retourne le nombre de jours dans un mois donné
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Retourne le jour de la semaine (0 = dimanche, 6 = samedi)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Retourne le nom court du jour de la semaine en français
 */
export function getDayOfWeekName(dayOfWeek: number): string {
  const names = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  return names[dayOfWeek];
}

/**
 * Calcule le numéro de semaine interne au mois pour un jour donné
 *
 * Algorithme :
 * 1. Week 1 commence au jour 1 et se termine au premier dimanche
 * 2. Week 2 commence au lundi suivant et dure 7 jours
 * 3. Les semaines suivantes durent 7 jours
 */
export function getWeekInternalMonth(dayOfMonth: number, firstDayOfWeek: number): number {
  if (dayOfMonth < 1) return 1;

  // Calculer le dernier jour de Week 1 (le premier dimanche du mois)
  // Si le 1er est un dimanche (0), Week 1 se termine au jour 1
  // Si le 1er est un lundi (1), Week 1 se termine au jour 7
  // Si le 1er est un mardi (2), Week 1 se termine au jour 6
  // Formule : (7 - firstDayOfWeek)
  const lastDayOfWeek1 = 7 - firstDayOfWeek;

  if (dayOfMonth <= lastDayOfWeek1) {
    return 1;
  }

  // Pour les jours après Week 1, chaque semaine dure 7 jours
  // Week 2 commence au jour (lastDayOfWeek1 + 1) et dure 7 jours
  const daysAfterWeek1 = dayOfMonth - lastDayOfWeek1;
  const weekNumber = 2 + Math.floor((daysAfterWeek1 - 1) / 7);

  return weekNumber;
}

/**
 * Retourne le nombre total de semaines dans le mois
 */
export function getWeeksInMonth(year: number, month: number): number {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getDayOfWeek(new Date(year, month, 1));

  // Le dernier jour du mois est le jour "daysInMonth"
  const lastWeek = getWeekInternalMonth(daysInMonth, firstDayOfWeek);

  return lastWeek;
}

/**
 * Information sur un jour du calendrier du mois
 */
export interface MonthDayInfo {
  dayNumber: number | null; // 1-31 si le jour existe, null si grisé
  dayOfWeek: number; // 0-6 (0=dimanche)
  dayOfWeekName: string; // "Lu", "Ma", etc.
  weekNumber: number; // 1-6
  exists: boolean; // true si ce jour existe dans le mois
}

/**
 * Retourne un array de 31 objets, un pour chaque colonne du tableau
 * Chaque objet contient les infos du jour ou null si la colonne est grisée
 */
export function getMonthDays(year: number, month: number): MonthDayInfo[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getDayOfWeek(new Date(year, month, 1));

  const days: MonthDayInfo[] = [];

  for (let dayNumber = 1; dayNumber <= 31; dayNumber++) {
    if (dayNumber <= daysInMonth) {
      // Le jour existe
      const date = new Date(year, month, dayNumber);
      const dow = getDayOfWeek(date);
      const week = getWeekInternalMonth(dayNumber, firstDayOfWeek);

      days.push({
        dayNumber,
        dayOfWeek: dow,
        dayOfWeekName: getDayOfWeekName(dow),
        weekNumber: week,
        exists: true,
      });
    } else {
      // La colonne est grisée (jour qui n'existe pas ce mois)
      days.push({
        dayNumber: null,
        dayOfWeek: -1,
        dayOfWeekName: '',
        weekNumber: -1,
        exists: false,
      });
    }
  }

  return days;
}
