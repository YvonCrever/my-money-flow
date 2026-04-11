import { Navigate, useNavigate, useParams } from 'react-router-dom';

import '@/features/finance/styles/finance.css';
import FinancePage from '@/features/finance/page/FinancePage';
import { isFinancePageTab, normalizeFinancePageTab } from '@/features/finance/financeTabs';
import useFinanceData from '@/hooks/useFinanceData';

export default function FinanceRoute() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const financeData = useFinanceData();

  if (!tab) {
    return <Navigate to="/finance/dashboard" replace />;
  }

  if (!isFinancePageTab(tab)) {
    return <Navigate to={`/finance/${normalizeFinancePageTab(tab)}`} replace />;
  }

  return (
    <FinancePage
      data={financeData}
      activeTab={tab}
      onTabChange={(nextTab) => navigate(`/finance/${nextTab}`)}
    />
  );
}
