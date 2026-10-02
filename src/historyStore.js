import { formatLabelSize } from './labelSizes.js';

export const HISTORY_DATABASE_NAME = 'pimsaduak-print-history';
export const HISTORY_DATABASE_VERSION = 1;
export const HISTORY_STORE_NAME = 'print-requests';
export const DEFAULT_LABEL_BRAND_NAME = 'Pim Saduak';

let databasePromise;

function createHistoryId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createHistoryRecord({
  labels,
  brandName = DEFAULT_LABEL_BRAND_NAME,
  widthMm,
  heightMm,
  unit = 'cm',
  sizeText,
  source,
  id = createHistoryId(),
  createdAt = new Date().toISOString(),
}) {
  if (!Array.isArray(labels) || labels.length === 0) {
    throw new TypeError('A print history record must contain at least one label.');
  }
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) {
    throw new TypeError('A print history record must include valid label dimensions.');
  }
  const recordSource = source ?? (labels.length > 1 ? 'batch' : 'single');

  return {
    id,
    createdAt,
    source: recordSource,
    brandName: String(brandName ?? DEFAULT_LABEL_BRAND_NAME).trim().slice(0, 40),
    widthMm,
    heightMm,
    unit,
    sizeText: sizeText ?? formatLabelSize(widthMm, heightMm, unit),
    labelCount: labels.length,
    labels: labels.map((label) => ({
      form: Object.fromEntries(Object.entries(label.form ?? {}).filter(([key]) => (
        !['codeType', 'codeValue'].includes(key)
      ))),
      codeType: label.codeType ?? 'none',
      codeValue: label.codeValue ?? '',
    })),
  };
}

export function filterHistoryRecords(records, query) {
  const term = String(query ?? '').trim().toLocaleLowerCase();
  if (!term) return records;

  return records.filter((record) => {
    const searchableValues = [record.sizeText, ...record.labels.flatMap((label) => [
      ...Object.values(label.form),
      label.codeType,
      label.codeValue,
    ])];
    return searchableValues.some((value) => String(value ?? '').toLocaleLowerCase().includes(term));
  });
}

function openHistoryDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(HISTORY_DATABASE_NAME, HISTORY_DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        database.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };
      resolve(database);
    };

    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error('Could not open print history.'));
    };

    request.onblocked = () => {
      databasePromise = undefined;
      reject(new Error('Print history is blocked by another browser tab.'));
    };
  });

  return databasePromise;
}

async function runHistoryRequest(mode, makeRequest) {
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    let result;

    try {
      transaction = database.transaction(HISTORY_STORE_NAME, mode);
      request = makeRequest(transaction.objectStore(HISTORY_STORE_NAME));
    } catch (error) {
      reject(error);
      return;
    }

    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error('Could not read print history.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error ?? new Error('Print history transaction was cancelled.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update print history.'));
  });
}

export async function listHistoryRecords() {
  const records = await runHistoryRequest('readonly', (store) => store.getAll());
  return records.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function saveHistoryRecord(record) {
  return runHistoryRequest('readwrite', (store) => store.put(record));
}

export function deleteHistoryRecord(recordId) {
  return runHistoryRequest('readwrite', (store) => store.delete(recordId));
}
