type FileSystemPermissionMode = 'read' | 'readwrite';

interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode;
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  values?(): AsyncIterableIterator<FileSystemHandle>;
}

interface StorageManager {
  getDirectory?(): Promise<FileSystemDirectoryHandle>;
}

interface Window {
  showDirectoryPicker?(options?: { mode?: FileSystemPermissionMode }): Promise<FileSystemDirectoryHandle>;
}
