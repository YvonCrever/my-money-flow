import { MONTH_NAMES } from '@/types/finance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MonthYearFilterProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  compact?: boolean;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function MonthYearFilter({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  compact = false,
}: MonthYearFilterProps) {
  return (
    <div className={cn(
      compact
        ? 'app-masthead-filter-group'
        : 'surface-panel animate-rise-fade flex items-center gap-2 rounded-full px-1.5 py-1.5',
    )}>
      <Select value={String(selectedMonth)} onValueChange={v => onMonthChange(Number(v))}>
        <SelectTrigger className={cn(
          compact
            ? 'app-masthead-item app-masthead-filter-trigger h-[2rem] w-[8.55rem] px-2.5 text-[12px]'
            : 'h-9 w-[148px] rounded-full border border-white/8 bg-white/4 px-3 text-[13px] text-slate-100 transition hover:border-accent/30 hover:bg-white/8',
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={i} value={String(i)} className="transition-colors hover:bg-accent/15 focus:bg-accent/20">{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(selectedYear)} onValueChange={v => onYearChange(Number(v))}>
        <SelectTrigger className={cn(
          compact
            ? 'app-masthead-item app-masthead-filter-trigger h-[2rem] w-[5.8rem] px-2.5 text-[12px]'
            : 'h-9 w-[96px] rounded-full border border-white/8 bg-white/4 px-3 text-[13px] text-slate-100 transition hover:border-accent/30 hover:bg-white/8',
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)} className="transition-colors hover:bg-accent/15 focus:bg-accent/20">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
