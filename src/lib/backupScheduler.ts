let scheduleHandler: (() => void) | null = null;

export function registerAutoBackupHandler(handler: () => void) {
  scheduleHandler = handler;
}

export function notifyAppStorageMutation() {
  scheduleHandler?.();
}
