import { describe, expect, it } from 'vitest';
import { APP_DATASET_SCHEMA_VERSION } from '@/types/storage';
import { storedFinanceClientsSchema } from '@/lib/storageSchemas';
import { getClientDisplayName, resolveClientDisplayName } from '@/lib/clientDisplay';

describe('client display helpers', () => {
  it('falls back to the legal name when pseudo is missing', () => {
    expect(getClientDisplayName({
      name: 'Studio Legal',
    })).toBe('Studio Legal');
  });

  it('returns the pseudo when it is present', () => {
    expect(getClientDisplayName({
      name: 'Studio Legal',
      pseudo: 'Studio Visible',
    })).toBe('Studio Visible');
  });

  it('falls back to the raw revenue client name when no registered client matches', () => {
    expect(resolveClientDisplayName('Client inconnu', [{
      name: 'Studio Legal',
      pseudo: 'Studio Visible',
    }])).toBe('Client inconnu');
  });

  it('does not merge different legal clients when they share the same pseudo', () => {
    const clients = [
      { name: 'Legal A', pseudo: 'Collectif' },
      { name: 'Legal B', pseudo: 'Collectif' },
    ];

    expect([
      resolveClientDisplayName('Legal A', clients),
      resolveClientDisplayName('Legal B', clients),
    ]).toEqual(['Collectif', 'Collectif']);
  });

  it('accepts stored client datasets with or without a pseudo', () => {
    expect(storedFinanceClientsSchema.safeParse({
      key: 'singleton',
      schemaVersion: APP_DATASET_SCHEMA_VERSION,
      updatedAt: '2026-03-30T10:00:00.000Z',
      source: 'app',
      value: [
        {
          id: 'client-a',
          name: 'Client A',
          address: 'Paris',
          siren: '123456789',
          email: 'a@example.com',
        },
        {
          id: 'client-b',
          name: 'Client B',
          pseudo: 'Alias B',
          address: 'Lyon',
          siren: '987654321',
          email: 'b@example.com',
        },
      ],
    }).success).toBe(true);
  });
});
