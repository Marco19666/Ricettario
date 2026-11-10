const DB_NAME = 'ricettario';
const DB_VERSION = 1;
const STORE_RECIPES = 'recipes';
const STORE_IMAGES = 'images';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        db.createObjectStore(STORE_RECIPES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function put(store, value, key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const req = key === undefined ? os.put(value) : os.put(value, key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function get(store, key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(store) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function remove(store, key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------- API pubblica ----------

export async function getRecipe(id) {
  return get(STORE_RECIPES, id);
}

export async function listRecipes() {
  return getAll(STORE_RECIPES);
}

export async function getPhotoBlob(id) {
  return get(STORE_IMAGES, id);
}

export async function saveRecipe(recipe) {
  let photoKey = null;
  try {
    const res = await fetch(recipe.photoUrl, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await downscale(await res.blob(), 800);
    await put(STORE_IMAGES, blob, recipe.id);
    photoKey = recipe.id;
  } catch (err) {
    console.warn('Foto non salvata offline:', err.message);
  }
  const toSave = { ...recipe, photoKey, savedAt: Date.now() };
  await put(STORE_RECIPES, toSave);
  return toSave;
}

export async function deleteRecipe(id) {
  await remove(STORE_RECIPES, id);
  await remove(STORE_IMAGES, id);
}

// Ridimensiona l'immagine per risparmiare spazio
async function downscale(blob, maxSide) {
  if (!('createImageBitmap' in window)) return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) return blob;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    return await new Promise(r => canvas.toBlob(b => r(b), 'image/jpeg', 0.85));
  } catch {
    return blob;
  }
}
