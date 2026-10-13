import type { StoredFileRef } from '@/types';

/**
 * Uploaded files (bills, roof photos, interval CSVs) are kept in the browser's
 * IndexedDB for this demo. Do not upload real sensitive documents: this is
 * not secure storage.
 */
const DB = 'jiourja2-files';
const STORE = 'files';
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('File storage is not available in this browser.'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(file: File): Promise<StoredFileRef> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File is larger than 8 MB.');
  const id = `file_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return { id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, uploadedAt: new Date().toISOString() };
}

export async function getFile(id: string): Promise<Blob | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function openStoredFile(ref: StoredFileRef): Promise<boolean> {
  const blob = await getFile(ref.id).catch(() => null);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

export async function clearFiles(): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}
