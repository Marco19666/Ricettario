import { searchMeals, getMealById } from './api.js';
import * as db from './db.js';
import { renderRecipeList, renderDetail } from './ui.js';

const els = {
  views: {
    search: document.getElementById('view-search'),
    results: document.getElementById('view-results'),
    detail: document.getElementById('view-detail'),
    saved: document.getElementById('view-saved'),
  },
  title: document.getElementById('app-title'),
  btnHome: document.getElementById('btn-home'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  resultsGrid: document.getElementById('results-grid'),
  savedGrid: document.getElementById('saved-grid'),
  btnAccept: document.getElementById('btn-accept'),
  btnReject: document.getElementById('btn-reject'),
  detailPhoto: document.getElementById('r-photo'),
};

const state = { currentRecipe: null, currentIsSaved: false };
const resultsCache = new Map();
const blobUrls = new Set();

function newBlobUrl(blob) {
  const url = URL.createObjectURL(blob);
  blobUrls.add(url);
  return url;
}
function revokeAllBlobUrls() {
  blobUrls.forEach(u => URL.revokeObjectURL(u));
  blobUrls.clear();
}

function showView(name) {
  Object.entries(els.views).forEach(([n, v]) => { v.hidden = n !== name; });
  window.scrollTo(0, 0);
  els.btnHome.hidden = name === 'search';
}
function setTitle(t) { els.title.textContent = t; }

// ---------- Router ----------
async function route() {
  revokeAllBlobUrls();
  const hash = location.hash.slice(1);

  try {
    if (hash === 'saved') {
      showView('saved');
      setTitle('Le mie ricette');
      await renderSavedView();
      return;
    }
    if (hash.startsWith('recipe/')) {
      showView('detail');
      setTitle('Ricetta');
      await renderDetailView(hash.slice(7));
      return;
    }
    if (hash.startsWith('results/')) {
      const q = decodeURIComponent(hash.slice(8));
      els.searchInput.value = q;
      showView('results');
      setTitle(`Risultati: ${q}`);
      await renderResultsView(q);
      return;
    }
    showView('search');
    setTitle('Ricettario');
  } catch (err) {
    console.error(err);
    setTitle('Errore');
    const v = document.querySelector('.view:not([hidden])');
    if (v) {
      v.innerHTML = `<p class="empty">Errore: ${escapeHtml(err.message)}.<br><a href="#">Torna alla ricerca</a></p>`;
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---------- Risultati ----------
async function renderResultsView(query) {
  let list = resultsCache.get(query);
  if (!list) {
    els.resultsGrid.innerHTML = '<p class="empty">Cerco...</p>';
    list = await searchMeals(query);
    resultsCache.set(query, list);
  }
  renderRecipeList(els.resultsGrid, list, r => {
    location.hash = `recipe/${r.id}`;
  });
}

// ---------- Dettaglio ----------
async function renderDetailView(id) {
  let recipe, photoSrc, isSaved;

  const saved = await db.getRecipe(id);
  isSaved = Boolean(saved);

  // Le vecchie versioni potevano aver salvato solo titolo e foto:
  // recupera sempre il dettaglio completo prima di mostrare la scheda.
  const needsDetails = !saved ||
    !Array.isArray(saved.ingredients) ||
    !saved.ingredients.length ||
    !saved.instructions;

  if (needsDetails) {
    const apiRecipe = await getMealById(id);
    if (!apiRecipe) throw new Error('Dettaglio della ricetta non trovato');
    recipe = saved ? { ...apiRecipe, ...saved,
      ingredients: apiRecipe.ingredients,
      instructions: apiRecipe.instructions,
      title: saved.title || apiRecipe.title,
      photoUrl: saved.photoUrl || apiRecipe.photoUrl
    } : apiRecipe;
  } else {
    recipe = saved;
  }

  const blob = saved ? await db.getPhotoBlob(id) : null;
  photoSrc = blob ? newBlobUrl(blob) : recipe.photoUrl;
  if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
    throw new Error('La scheda ricevuta è incompleta. Riprova tra poco.');
  }

  state.currentRecipe = recipe;
  state.currentIsSaved = isSaved;
  renderDetail(recipe, photoSrc);
  setTitle(recipe.title);
  updateAcceptButton();
}

function updateAcceptButton() {
  if (state.currentIsSaved) {
    els.btnAccept.textContent = 'Rimuovi dai salvati';
    els.btnAccept.classList.add('danger');
    els.btnAccept.classList.remove('primary');
  } else {
    els.btnAccept.textContent = 'Accetta e salva';
    els.btnAccept.classList.add('primary');
    els.btnAccept.classList.remove('danger');
  }
  els.btnAccept.disabled = false;
}

// ---------- Salva / Rimuovi ----------
els.btnAccept.addEventListener('click', async () => {
  if (!state.currentRecipe) return;

  if (state.currentIsSaved) {
    if (!confirm('Rimuovere la ricetta dai salvati?')) return;
    els.btnAccept.disabled = true;
    try {
      await db.deleteRecipe(state.currentRecipe.id);
      state.currentIsSaved = false;
      updateAcceptButton();
      // l'immagine blob rimane visibile in memoria fino al prossimo route
    } catch (err) {
      alert('Errore: ' + err.message);
      els.btnAccept.disabled = false;
    }
    return;
  }

  els.btnAccept.disabled = true;
  els.btnAccept.textContent = 'Salvataggio...';
  try {
    const saved = await db.saveRecipe(state.currentRecipe);
    state.currentRecipe = saved;
    state.currentIsSaved = true;
    updateAcceptButton();
    els.btnAccept.textContent = 'Salvata ✓';
    els.btnAccept.disabled = true;
    const blob = await db.getPhotoBlob(saved.id);
    if (blob) els.detailPhoto.src = newBlobUrl(blob);
    setTimeout(() => {
      els.btnAccept.textContent = 'Rimuovi dai salvati';
      els.btnAccept.disabled = false;
    }, 1200);
  } catch (err) {
    alert('Errore durante il salvataggio: ' + err.message);
    updateAcceptButton();
  }
});

// ---------- Salvate ----------
async function renderSavedView() {
  els.savedGrid.innerHTML = '<p class="empty">Carico...</p>';
  const recipes = (await db.listRecipes()).filter(r => String(r.id).startsWith('local-'));
  if (!recipes.length) {
    els.savedGrid.innerHTML =
      '<p class="empty">Non hai ancora salvato nessuna ricetta.<br><a href="#">Cerca qualcosa da salvare</a></p>';
    return;
  }
  recipes.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const items = [];
  for (const r of recipes) {
    const blob = await db.getPhotoBlob(r.id);
    items.push({ ...r, _src: blob ? newBlobUrl(blob) : r.photoUrl });
  }
  renderRecipeList(els.savedGrid, items, r => {
    location.hash = `recipe/${r.id}`;
  });
}

// ---------- Eventi globali ----------
els.searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const q = els.searchInput.value.trim();
  if (q) location.hash = `results/${encodeURIComponent(q)}`;
});

els.btnHome.addEventListener('click', () => { location.hash = ''; });

els.btnReject.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else location.hash = '';
});

window.addEventListener('hashchange', route);

// ---------- Bootstrap ----------
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker non registrato:', err);
    });
  });
}
