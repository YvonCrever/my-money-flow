export type DateSortDirection = 'asc' | 'desc';

type DateSortable = {
  date: string;
};

export function sortEntriesByIsoDate<T extends DateSortable>(entries: readonly T[], direction: DateSortDirection): T[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const dateComparison = direction === 'asc'
        ? left.entry.date.localeCompare(right.entry.date)
        : right.entry.date.localeCompare(left.entry.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
}
