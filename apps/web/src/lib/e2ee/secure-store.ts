const DB_NAME = "chatter-e2ee-secrets";
const STORE = "secrets";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("Could not open E2EE secret store"));
  });
}

async function get<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return request(db.transaction(STORE, "readonly").objectStore(STORE).get(key)) as Promise<T | undefined>;
}

async function put(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  await request(db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key));
}

/**
 * Protect the Rust crypto store passphrase with a non-extractable WebCrypto
 * key. Both remain origin-local in IndexedDB; neither is sent to Chatter.
 * This protects against casual storage inspection, not an active same-origin
 * XSS attacker, which can invoke WebCrypto while the page is running.
 */
export async function getStorePassphrase(scope: string): Promise<string> {
  const db = await database();
  try {
    let wrappingKey = await get<CryptoKey>(db, "wrapping-key");
    if (!wrappingKey) {
      wrappingKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      await put(db, "wrapping-key", wrappingKey);
    }
    const secretKey = `passphrase:${scope}`;
    const stored = await get<{ iv: ArrayBuffer; ciphertext: ArrayBuffer }>(db, secretKey);
    if (stored) {
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(stored.iv) }, wrappingKey, stored.ciphertext);
      return new TextDecoder().decode(plaintext);
    }
    const passphrase = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, passphrase);
    await put(db, secretKey, { iv: iv.buffer as ArrayBuffer, ciphertext });
    return Array.from(passphrase, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } finally {
    db.close();
  }
}

export async function removeStorePassphrase(scope: string): Promise<void> {
  const db = await database();
  try {
    await request(db.transaction(STORE, "readwrite").objectStore(STORE).delete(`passphrase:${scope}`));
  } finally {
    db.close();
  }
}
