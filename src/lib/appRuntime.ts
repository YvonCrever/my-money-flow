const CHUNK_LOAD_ERROR_PATTERNS = [
  'loading chunk',
  'chunkloaderror',
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'dynamically imported module',
];

export function normalizeAppError(error: unknown, fallbackMessage = 'Une erreur inattendue est survenue.') {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }

  return new Error(fallbackMessage);
}

export function isChunkLoadError(error: unknown) {
  const message = normalizeAppError(error).message.toLowerCase();
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function isIgnorableRuntimeError(error: unknown) {
  const message = normalizeAppError(error).message.toLowerCase();
  return (
    message.includes('resizeobserver loop limit exceeded')
    || message.includes('resizeobserver loop completed with undelivered notifications')
  );
}

export function isStorageBootError(error: unknown) {
  const message = normalizeAppError(error).message.toLowerCase();
  return (
    message.includes('indexeddb')
    || message.includes('storage')
    || message.includes('transaction aborted')
    || message.includes('transaction failed')
  );
}

export function getAppErrorDescription(error: unknown) {
  if (isChunkLoadError(error)) {
    return "Un module de l'application n'a pas pu etre recharge correctement. Un nouvel essai ou un rechargement complet doit corriger le probleme.";
  }

  if (isStorageBootError(error)) {
    return "Le stockage local de l'application n'a pas pu etre ouvert correctement. Ycaro ne peut pas charger ses donnees de maniere fiable pour l'instant.";
  }

  return "Ycaro a rencontre une erreur inattendue et ne peut pas afficher l'ecran demande de maniere fiable.";
}

export async function loadLazyImportWithRetry<T>(
  loader: () => Promise<T>,
  label: string,
  retries = 1,
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      console.error(`[app-lazy] ${label} failed to load on attempt ${attempt + 1}`, error);

      if (!isChunkLoadError(error) || attempt === retries) {
        break;
      }
    }
  }

  throw normalizeAppError(lastError, `Impossible de charger ${label}.`);
}
