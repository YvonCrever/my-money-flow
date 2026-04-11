import { isStorageBootError, normalizeAppError } from '@/lib/appRuntime';

export function getFeatureStorageLoadErrorMessage(featureLabel: string, error: unknown) {
  const normalizedError = normalizeAppError(error);

  if (isStorageBootError(normalizedError)) {
    return `Le stockage local de ${featureLabel} n'a pas pu etre ouvert correctement. Les donnees de cette section ne sont pas fiables pour le moment.`;
  }

  return `${featureLabel} n'a pas pu charger ses donnees locales. ${normalizedError.message}`;
}
