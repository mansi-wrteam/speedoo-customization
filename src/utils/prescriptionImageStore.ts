// Blob store for prescription images.
//
// Redux can't hold these across a refresh: a File serializes to {} and its
// object URL is revoked when the document unloads. IndexedDB stores real Blobs
// with no practical size cap (unlike localStorage's ~5 MB), so the cart keeps
// only lightweight metadata in redux — { imageId, name, size, type } — and the
// bytes are rehydrated from here on boot.
//
// Browser-only: every call resolves to a no-op value during SSR.

const DB_NAME = "egrocer";
const DB_VERSION = 1;
const STORE = "prescription_images";

/** What is stored per image: its id and the raw File/Blob. */
interface StoredImage {
  imageId: string;
  file: File | Blob;
}

const isAvailable = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "imageId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <R>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<R> | null | undefined): Promise<R | null | undefined> => {
  if (!isAvailable()) return null;
  const db = await openDb();
  try {
    return await new Promise<R | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        tx.oncomplete = () => resolve(undefined);
      }
    });
  } finally {
    db.close();
  }
};

// Ids only need to be unique within this browser; the API never sees them.
export const newImageId = (): string =>
  `px_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const saveImage = async (imageId: string, file: File | Blob) => {
  try {
    await withStore("readwrite", (store) => store.put({ imageId, file }));
  } catch (error) {
    // A failed write only costs persistence — the upload still works this
    // session, so never block the user on it.
    console.log("prescription image save failed", error);
  }
};

export const getImage = async (imageId: string): Promise<File | Blob | null> => {
  try {
    const record = await withStore<StoredImage | undefined>("readonly", (store) => store.get(imageId));
    return record?.file || null;
  } catch (error) {
    console.log("prescription image read failed", error);
    return null;
  }
};

export const deleteImage = async (imageId: string) => {
  try {
    await withStore("readwrite", (store) => store.delete(imageId));
  } catch (error) {
    console.log("prescription image delete failed", error);
  }
};

export const getAllImageIds = async (): Promise<IDBValidKey[]> => {
  try {
    return (await withStore("readonly", (store) => store.getAllKeys())) || [];
  } catch (error) {
    console.log("prescription image list failed", error);
    return [];
  }
};

export const clearImages = async () => {
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch (error) {
    console.log("prescription image clear failed", error);
  }
};
