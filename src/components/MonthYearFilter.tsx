import { useState } from 'react';
import { MONTH_NAMES } from '@/types/finance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MonthYearFilterProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function MonthYearFilter({ selectedMonth, selectedYear, onMonthChange, onYearChange }: MonthYearFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={String(selectedMonth)} onValueChange={v => onMonthChange(Number(v))}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={i} value={String(i)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(selectedYear)} onValueChange={v => onYearChange(Number(v))}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
