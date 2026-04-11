import type { Client } from '@/types/finance';

type DisplayableClient = Pick<Client, 'name' | 'pseudo'>;

export function getClientDisplayName(client: DisplayableClient): string {
  return client.pseudo?.trim() || client.name;
}

export function resolveClientDisplayName(legalName: string, clients: readonly DisplayableClient[]): string {
  const client = clients.find((entry) => entry.name === legalName);
  return client ? getClientDisplayName(client) : legalName;
}
