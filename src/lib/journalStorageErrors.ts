export type JournalStorageErrorCode =
  | 'unsupported'
  | 'unavailable'
  | 'quota'
  | 'read'
  | 'write'
  | 'transaction'
  | 'not-found';

export class JournalStorageError extends Error {
  code: JournalStorageErrorCode;
  cause?: unknown;

  constructor(code: JournalStorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'JournalStorageError';
    this.code = code;
    this.cause = cause;
  }
}

export function isQuotaExceededLikeError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }

  if (!(error instanceof Error)) return false;
  return /quota|space|storage/i.test(error.message);
}

export function wrapJournalStorageError(
  error: unknown,
  fallbackCode: Exclude<JournalStorageErrorCode, 'quota'>,
  fallbackMessage: string,
) {
  if (error instanceof JournalStorageError) return error;

  if (isQuotaExceededLikeError(error)) {
    return new JournalStorageError(
      'quota',
      "Le navigateur n'a plus assez d'espace pour enregistrer les medias du Journal.",
      error,
    );
  }

  return new JournalStorageError(fallbackCode, fallbackMessage, error);
}

export function getJournalStorageErrorMessage(error: unknown) {
  if (error instanceof JournalStorageError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Une erreur de stockage a interrompu l'operation.";
}
