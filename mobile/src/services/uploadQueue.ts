import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { uploadSessionImage } from '../api/images';
import { classifyApiError } from '../api/client';
import { storage } from './storage';

export interface QueueItem {
  id: string;
  sessionId: number;
  blockId: number | string;
  uri: string;
  viewName?: string;
  sequenceNumber: number;
  timestamp: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed' | 'rejected';
  error?: string;
  errorType?: string;
  rejectionReason?: string;
  retryCount: number;
  fileSize?: number;
  forceAccept?: boolean;
}

const QUEUE_STORAGE_KEY = 'granitemeasure_upload_queue_v2';
const EVIDENCE_DIR = `${FileSystem.documentDirectory || ''}granite_evidence/`;
const MANIFEST_PATH = `${FileSystem.documentDirectory || ''}granite_upload_queue.json`;

type QueueListener = (items: QueueItem[]) => void;
const listeners = new Set<QueueListener>();

let memoryQueue: QueueItem[] = [];
let isInitialized = false;
let isProcessing = false;

async function ensureEvidenceDir(): Promise<void> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;
  try {
    const dirInfo = await FileSystem.getInfoAsync(EVIDENCE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('[UploadQueue] Could not create evidence directory:', err);
  }
}

async function loadQueue(): Promise<QueueItem[]> {
  if (isInitialized) return memoryQueue;
  try {
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      const manifestInfo = await FileSystem.getInfoAsync(MANIFEST_PATH);
      if (manifestInfo.exists) {
        const content = await FileSystem.readAsStringAsync(MANIFEST_PATH);
        memoryQueue = JSON.parse(content);
        isInitialized = true;
        return memoryQueue;
      }
    }

    // Fallback to storage
    const raw = await storage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      memoryQueue = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[UploadQueue] Failed to load queue:', e);
  }
  isInitialized = true;
  return memoryQueue;
}

async function saveQueue(): Promise<void> {
  try {
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      await FileSystem.writeAsStringAsync(MANIFEST_PATH, JSON.stringify(memoryQueue));
    } else {
      await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(memoryQueue));
    }
  } catch (e) {
    console.warn('[UploadQueue] Failed to save queue to persistent manifest:', e);
  }
  listeners.forEach((listener) => {
    try {
      listener([...memoryQueue]);
    } catch {}
  });
}

export const uploadQueue = {
  async getItems(): Promise<QueueItem[]> {
    await loadQueue();
    return [...memoryQueue];
  },

  async getPendingCount(): Promise<number> {
    await loadQueue();
    return memoryQueue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
  },

  async getFailedCount(): Promise<number> {
    await loadQueue();
    return memoryQueue.filter((item) => item.status === 'failed' || item.status === 'rejected').length;
  },

  subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    loadQueue().then((items) => listener([...items]));
    return () => {
      listeners.delete(listener);
    };
  },

  async enqueue(
    sessionId: number,
    blockId: number | string,
    tempUri: string,
    sequenceNumber: number,
    viewName?: string,
    forceAccept: boolean = false
  ): Promise<QueueItem> {
    await loadQueue();
    await ensureEvidenceDir();

    const itemId = `evidence_${sessionId}_${sequenceNumber}_${Date.now()}`;
    let persistentUri = tempUri;
    let fileSize: number | undefined;

    // Persist image copy to application-controlled document directory (avoids OS cache purges)
    if (Platform.OS !== 'web' && FileSystem.documentDirectory && tempUri.startsWith('file:')) {
      try {
        const rawExt = tempUri.split('.').pop()?.toLowerCase();
        const fileExt =
          rawExt === 'png'
            ? 'png'
            : rawExt === 'webp'
            ? 'webp'
            : rawExt === 'heic' || rawExt === 'heif'
            ? 'heic'
            : 'jpg';
        const destPath = `${EVIDENCE_DIR}${itemId}.${fileExt}`;
        await FileSystem.copyAsync({ from: tempUri, to: destPath });
        const info = await FileSystem.getInfoAsync(destPath);
        if (info.exists) {
          persistentUri = destPath;
          fileSize = (info as any).size;
        }
      } catch (copyErr) {
        console.warn('[UploadQueue] Could not copy image to permanent storage, using original URI:', copyErr);
      }
    }

    const newItem: QueueItem = {
      id: itemId,
      sessionId,
      blockId,
      uri: persistentUri,
      viewName,
      sequenceNumber,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      fileSize,
      forceAccept,
    };

    memoryQueue.push(newItem);
    await saveQueue();

    // Trigger asynchronous queue processor
    uploadQueue.processQueue().catch(() => {});
    return newItem;
  },

  async processQueue(): Promise<{ uploaded: number; failed: number; rejected: number }> {
    if (isProcessing) {
      return { uploaded: 0, failed: 0, rejected: 0 };
    }
    await loadQueue();
    isProcessing = true;

    let uploaded = 0;
    let failed = 0;
    let rejected = 0;

    try {
      for (let i = 0; i < memoryQueue.length; i++) {
        const item = memoryQueue[i];
        if (item.status === 'uploaded' || item.status === 'rejected') continue;

        item.status = 'uploading';
        await saveQueue();

        try {
          await uploadSessionImage(
            item.sessionId,
            item.uri,
            item.sequenceNumber,
            item.forceAccept || false
          );
          item.status = 'uploaded';
          item.error = undefined;
          item.errorType = undefined;
          uploaded++;
        } catch (err: any) {
          const classified = classifyApiError(err);

          if (classified.type === 'IMAGE_REJECTED') {
            item.status = 'rejected';
            item.rejectionReason = classified.messageEn;
            item.error = classified.messageEn;
            item.errorType = 'IMAGE_REJECTED';
            rejected++;
          } else {
            item.status = 'failed';
            item.error = classified.messageEn;
            item.errorType = classified.type;
            item.retryCount += 1;
            failed++;
          }
        }
        await saveQueue();
      }
    } finally {
      isProcessing = false;
    }

    return { uploaded, failed, rejected };
  },

  async retryFailed(): Promise<void> {
    await loadQueue();
    memoryQueue = memoryQueue.map((item) =>
      item.status === 'failed' || item.status === 'rejected'
        ? { ...item, status: 'pending', error: undefined, errorType: undefined }
        : item
    );
    await saveQueue();
    await uploadQueue.processQueue();
  },

  async removeItem(id: string): Promise<void> {
    await loadQueue();
    const target = memoryQueue.find((i) => i.id === id);
    if (target && Platform.OS !== 'web' && target.uri.includes('granite_evidence')) {
      try {
        await FileSystem.deleteAsync(target.uri, { idempotent: true });
      } catch {}
    }
    memoryQueue = memoryQueue.filter((item) => item.id !== id);
    await saveQueue();
  },

  async clearCompleted(): Promise<void> {
    await loadQueue();
    memoryQueue = memoryQueue.filter((item) => item.status !== 'uploaded');
    await saveQueue();
  },

  async clearAll(): Promise<void> {
    await loadQueue();
    for (const item of memoryQueue) {
      if (Platform.OS !== 'web' && item.uri.includes('granite_evidence')) {
        try {
          await FileSystem.deleteAsync(item.uri, { idempotent: true });
        } catch {}
      }
    }
    memoryQueue = [];
    await saveQueue();
  },
};
