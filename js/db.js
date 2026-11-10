const DB_NAME = 'ricettario-db';
const DB_VERSION = 1;
const RECIPES_STORE = 'recipes';
const PHOTOS_STORE = 'photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECIPES_STORE)) {
        db.createObjectStore(RECIPES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Impossibile aprire il database'));
  });
}

async function withStore(storeName, mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(result && result.result !== undefined ? result.result : result);
    };
    tx.onerror = () => {
      const error = tx.error || new Error('Operazione sul database non riuscita');
      db.close();
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error || new Error('Operazione sul database annullata');
      db.close();
      reject(error);
    };
  });
}

export async function getRecipe(id) {
  return withStore(RECIPES_STORE, 'readonly', store => store.get(String(id)));
}

export async function listRecipes() {
  return withStore(RECIPES_STORE, 'readonly', store => store.getAll());
}

export async function getPhotoBlob(id) {
  const record = await withStore(PHOTOS_STORE, 'readonly', store => store.get(String(id)));
  return record ? record.blob : null;
}

export async function saveRecipe(recipe) {
  if (!recipe || !recipe.id) throw new Error('Ricetta non valida');
  const saved = { ...recipe, id: String(recipe.id), savedAt: Date.now() };
  await withStore(RECIPES_STORE, 'readwrite', store => store.put(saved));

  // La foto è facoltativa: un problema di rete non deve impedire il salvataggio.
  if (recipe.photoUrl) {
    try {
      const response = await fetch(recipe.photoUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        await withStore(PHOTOS_STORE, 'readwrite', store =>
          store.put({ id: String(recipe.id), blob })
        );
      }
    } catch (error) {
      console.warn('Foto non salvata offline:', error);
    }
  }
  return saved;
}

export async function deleteRecipe(id) {
  const key = String(id);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECIPES_STORE, PHOTOS_STORE], 'readwrite');
    tx.objectStore(RECIPES_STORE).delete(key);
    tx.objectStore(PHOTOS_STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      const error = tx.error || new Error('Impossibile eliminare la ricetta');
      db.close();
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error || new Error('Eliminazione annullata');
      db.close();
      reject(error);
    };
  });
}
