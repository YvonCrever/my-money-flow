import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createUnsubscribe(): () => void {
  return () => undefined;
}

const financeHookState = vi.hoisted(() => ({
  addExpenseRecord: vi.fn(),
  addFinanceClient: vi.fn(),
  addRevenueRecord: vi.fn(),
  deleteExpenseRecord: vi.fn(),
  deleteRevenueRecord: vi.fn(),
  editExpenseRecord: vi.fn(),
  editFinanceClient: vi.fn(),
  editRevenueRecord: vi.fn(),
  ensureFinanceStoreReady: vi.fn(),
  readFinanceClients: vi.fn(() => []),
  readFinanceExpenses: vi.fn(() => []),
  readFinanceRevenues: vi.fn(() => []),
  removeFinanceClient: vi.fn(),
  subscribeFinanceStore: vi.fn((): (() => void) => createUnsubscribe()),
  writeFinanceExpenses: vi.fn(),
}));

vi.mock('@/lib/financeStore', () => ({
  addExpenseRecord: financeHookState.addExpenseRecord,
  addFinanceClient: financeHookState.addFinanceClient,
  addRevenueRecord: financeHookState.addRevenueRecord,
  deleteExpenseRecord: financeHookState.deleteExpenseRecord,
  deleteRevenueRecord: financeHookState.deleteRevenueRecord,
  editExpenseRecord: financeHookState.editExpenseRecord,
  editFinanceClient: financeHookState.editFinanceClient,
  editRevenueRecord: financeHookState.editRevenueRecord,
  ensureFinanceStoreReady: financeHookState.ensureFinanceStoreReady,
  readFinanceClients: financeHookState.readFinanceClients,
  readFinanceExpenses: financeHookState.readFinanceExpenses,
  readFinanceRevenues: financeHookState.readFinanceRevenues,
  removeFinanceClient: financeHookState.removeFinanceClient,
  subscribeFinanceStore: financeHookState.subscribeFinanceStore,
  writeFinanceExpenses: financeHookState.writeFinanceExpenses,
}));

import useFinanceData from '@/hooks/useFinanceData';

describe('useFinanceData', () => {
  beforeEach(() => {
    financeHookState.addExpenseRecord.mockReset();
    financeHookState.addFinanceClient.mockReset();
    financeHookState.addRevenueRecord.mockReset();
    financeHookState.deleteExpenseRecord.mockReset();
    financeHookState.deleteRevenueRecord.mockReset();
    financeHookState.editExpenseRecord.mockReset();
    financeHookState.editFinanceClient.mockReset();
    financeHookState.editRevenueRecord.mockReset();
    financeHookState.ensureFinanceStoreReady.mockReset();
    financeHookState.readFinanceClients.mockReset();
    financeHookState.readFinanceExpenses.mockReset();
    financeHookState.readFinanceRevenues.mockReset();
    financeHookState.removeFinanceClient.mockReset();
    financeHookState.subscribeFinanceStore.mockReset();
    financeHookState.writeFinanceExpenses.mockReset();

    financeHookState.readFinanceClients.mockReturnValue([]);
    financeHookState.readFinanceExpenses.mockReturnValue([]);
    financeHookState.readFinanceRevenues.mockReturnValue([]);
    financeHookState.subscribeFinanceStore.mockReturnValue(createUnsubscribe());
  });

  it('marks the hook as loaded and exposes a readable error when finance storage boot fails', async () => {
    financeHookState.ensureFinanceStoreReady.mockRejectedValueOnce(new Error('db offline'));

    const { result } = renderHook(() => useFinanceData());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.loadError).toContain('Finances');
    expect(result.current.revenues).toEqual([]);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.clients).toEqual([]);
  });
});
