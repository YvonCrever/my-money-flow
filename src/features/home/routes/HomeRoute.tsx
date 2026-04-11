import { useEffect } from 'react';
import HomePage from '@/features/home/page/HomePage';
import { markFirstVisibleRender } from '@/lib/devTimings';
import useFinanceData from '@/hooks/useFinanceData';

export default function HomeRoute() {
  const financeData = useFinanceData();

  useEffect(() => {
    markFirstVisibleRender();
  }, []);

  return (
    <HomePage
      financeLoadError={financeData.loadError}
      monthlySummary={financeData.monthlySummary}
      selectedYear={financeData.selectedYear}
      totalRevenue={financeData.totalRevenue}
    />
  );
}
