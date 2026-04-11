import { describe, expect, it } from 'vitest';

import { getPageAnimationOwnerId, shouldAdvancePageAnimationToken } from '@/features/navigation/appRoutes';

describe('app route animation ownership', () => {
  it.each([
    ['/', null],
    ['/habits', null],
    ['/finance/dashboard', 'finance'],
    ['/reading', 'lecture'],
    ['/journal', 'journal'],
    ['/calendar', null],
  ])('maps %s to %s', (pathname, expectedOwnerId) => {
    expect(getPageAnimationOwnerId(pathname)).toBe(expectedOwnerId);
  });

  it.each([
    [null, 'finance', true],
    ['finance', 'finance', false],
    ['finance', 'lecture', true],
    ['lecture', null, false],
    [null, null, false],
  ] as const)('advances the animation token from %s to %s = %s', (previousOwnerId, nextOwnerId, expectedResult) => {
    expect(shouldAdvancePageAnimationToken(previousOwnerId, nextOwnerId)).toBe(expectedResult);
  });
});
