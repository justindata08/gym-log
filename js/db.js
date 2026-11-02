// A tiny IndexedDB wrapper.
// Stores:
//   kv       – single values by key: 'active' (session in progress), 'stars', 'settings'
//   sessions – completed sessions (history + outbox), keyed by id

const DB_NAME = 'gym-log';
const DB_VERSION = 1;

let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// Runs one request and resolves once the transaction has committed to disk.
async function run(storeName, mode, makeRequest) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = makeRequest(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// IndexedDB can't store some objects (e.g. Sets) and keeps live references out;
// a JSON round trip stores a clean snapshot.
const snapshot = value => JSON.parse(JSON.stringify(value));

export const get = (store, key) => run(store, 'readonly', s => s.get(key));
export const getAll = (store) => run(store, 'readonly', s => s.getAll());
export const put = (store, value, key) =>
  run(store, 'readwrite', s => (key === undefined ? s.put(snapshot(value)) : s.put(snapshot(value), key)));
export const del = (store, key) => run(store, 'readwrite', s => s.delete(key));
