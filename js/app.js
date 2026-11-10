import { searchMeals, getMealById } from './api.js';
import { LOCAL_RECIPES } from './local-recipes.js';
import * as db from './db.js';
import { renderRecipeList, renderDetail } from './ui.js';

const els = {
  views: {
    search: document.getElementById('view-search'),
    results: document.getElementById('view-results'),
    detail: document.getElementById('view-detail'),
    saved: document.getElementById('view-saved'),
    add: document.getElementById('view-add'),
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
  recipeForm: document.getElementById('recipe-form'),
  recipePhoto: document.getElementById('recipe-photo'),
  recipePreview: document.getElementById('recipe-preview'),
  photoPrompt: document.getElementById('photo-prompt'),
  formStatus: document.getElementById('form-status'),
  dailyCard: document.getElementById('daily-card'),
};

const state = { currentRecipe: null, currentIsSaved: false, dailyRecipe: null };
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
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function showError(err) {
  console.error(err);
  const v = document.querySelector('.view:not([hidden])');
  if (v) v.innerHTML = '<p class="empty">Errore: ' + escapeHtml(err.message) + '.<br><a href="#">Torna alla ricerca</a></p>';
}

function setupDailyRecipe() {
  const day = Math.floor(Date.now() / 86400000);
  state.dailyRecipe = LOCAL_RECIPES[day % LOCAL_RECIPES.length];
  document.getElementById('daily-name').textContent = state.dailyRecipe.title;
  const image = document.getElementById('daily-photo');
  image.src = state.dailyRecipe.photoUrl || '';
  image.alt = state.dailyRecipe.title;
}
async function route() {
  revokeAllBlobUrls();
  const hash = location.hash.slice(1);
  try {
    if (hash === 'saved') {
      showView('saved'); setTitle('Le mie ricette'); await renderSavedView(); return;
    }
    if (hash === 'add') {
      showView('add'); setTitle('Aggiungi ricetta'); return;
    }
    if (hash.startsWith('recipe/')) {
      showView('detail'); setTitle('Ricetta'); await renderDetailView(decodeURIComponent(hash.slice(7))); return;
    }
    if (hash.startsWith('results/')) {
      const q = decodeURIComponent(hash.slice(8));
      els.searchInput.value = q; showView('results'); setTitle('Risultati: ' + q);
      await renderResultsView(q); return;
    }
    showView('search'); setTitle('Ricettario');
  } catch (err) { showError(err); }
}
async function renderResultsView(query) {
  let list = resultsCache.get(query);
  if (!list) {
    els.resultsGrid.innerHTML = '<p class="empty">Cerco...</p>';
    list = await searchMeals(query); resultsCache.set(query, list);
  }
  renderRecipeList(els.resultsGrid, list, r => { location.hash = 'recipe/' + encodeURIComponent(r.id); });
}
async function renderDetailView(id) {
  let recipe, photoSrc;
  const saved = await db.getRecipe(id);
  const isSaved = Boolean(saved);
  const needsDetails = !saved || (!saved.sourceUrl && (
    !Array.isArray(saved.ingredients) || !saved.ingredients.length || !saved.instructions
  ));
  if (needsDetails) {
    const apiRecipe = await getMealById(id);
    if (!apiRecipe) throw new Error('Dettaglio della ricetta non trovato');
    recipe = saved ? { ...apiRecipe, ...saved,
      ingredients: apiRecipe.ingredients, instructions: apiRecipe.instructions,
      title: saved.title || apiRecipe.title, photoUrl: saved.photoUrl || apiRecipe.photoUrl
    } : apiRecipe;
  } else recipe = saved;
  const blob = saved ? await db.getPhotoBlob(id) : null;
  photoSrc = blob ? newBlobUrl(blob) : recipe.photoUrl;
  if (!recipe.title) throw new Error('La scheda ricevuta è incompleta. Riprova tra poco.');
  state.currentRecipe = recipe; state.currentIsSaved = isSaved;
  renderDetail(recipe, photoSrc); setTitle(recipe.title); updateAcceptButton();
}
function updateAcceptButton() {
  els.btnAccept.textContent = state.currentIsSaved ? 'Rimuovi dai salvati' : 'Salva nelle mie ricette';
  els.btnAccept.classList.toggle('danger', state.currentIsSaved);
  els.btnAccept.classList.toggle('primary', !state.currentIsSaved);
  els.btnAccept.disabled = false;
}
els.btnAccept.addEventListener('click', async () => {
  if (!state.currentRecipe) return;
  if (state.currentIsSaved) {
    if (!confirm('Rimuovere la ricetta dai salvati?')) return;
    els.btnAccept.disabled = true;
    try { await db.deleteRecipe(state.currentRecipe.id); state.currentIsSaved = false; updateAcceptButton(); }
    catch (err) { alert('Errore: ' + err.message); els.btnAccept.disabled = false; }
    return;
  }
  els.btnAccept.disabled = true; els.btnAccept.textContent = 'Salvataggio...';
  try {
    const saved = await db.saveRecipe(state.currentRecipe);
    state.currentRecipe = saved; state.currentIsSaved = true; updateAcceptButton();
    const blob = await db.getPhotoBlob(saved.id);
    if (blob) els.detailPhoto.src = newBlobUrl(blob);
  } catch (err) { alert('Errore durante il salvataggio: ' + err.message); updateAcceptButton(); }
});
async function renderSavedView() {
  els.savedGrid.innerHTML = '<p class="empty">Carico...</p>';
  const recipes = await db.listRecipes();
  if (!recipes.length) {
    els.savedGrid.innerHTML = '<p class="empty">Non hai ancora ricette salvate.<br><a href="#">Torna alla ricerca</a> oppure aggiungine una.</p>';
    return;
  }
  recipes.sort((a,b) => (b.savedAt || 0) - (a.savedAt || 0));
  const items = [];
  for (const r of recipes) {
    const blob = await db.getPhotoBlob(r.id);
    items.push({ ...r, _src: blob ? newBlobUrl(blob) : r.photoUrl });
  }
  renderRecipeList(els.savedGrid, items, r => { location.hash = 'recipe/' + encodeURIComponent(r.id); });
}

let selectedPhoto = null;
els.recipePhoto.addEventListener('change', () => {
  selectedPhoto = els.recipePhoto.files?.[0] || null;
  if (!selectedPhoto) return;
  if (!selectedPhoto.type.startsWith('image/')) {
    els.formStatus.textContent = 'Seleziona un file immagine.';
    selectedPhoto = null; return;
  }
  if (selectedPhoto.size > 8 * 1024 * 1024) {
    els.formStatus.textContent = 'La foto deve essere inferiore a 8 MB.';
    selectedPhoto = null; els.recipePhoto.value = ''; return;
  }
  const url = newBlobUrl(selectedPhoto);
  els.recipePreview.src = url; els.recipePreview.hidden = false;
  els.photoPrompt.hidden = true; els.formStatus.textContent = '';
});
els.recipeForm.addEventListener('submit', async event => {
  event.preventDefault();
  const title = document.getElementById('recipe-title').value.trim();
  const ingredientsText = document.getElementById('recipe-ingredients').value.trim();
  const instructions = document.getElementById('recipe-preparation').value.trim();
  if (!title || !ingredientsText || !instructions) return;
  const ingredients = ingredientsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    .map(name => ({ name, measure: '' }));
  const recipe = {
    id: 'personal-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now()),
    title, category: 'Le mie ricette', area: 'Personale',
    ingredients, instructions, photoUrl: '', source: 'personal'
  };
  if (selectedPhoto) recipe.photoBlob = selectedPhoto;
  const submit = els.recipeForm.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Salvataggio...';
  try {
    await db.saveRecipe(recipe);
    els.recipeForm.reset(); selectedPhoto = null;
    els.recipePreview.removeAttribute('src'); els.recipePreview.hidden = true;
    els.photoPrompt.hidden = false; els.formStatus.textContent = 'Ricetta aggiunta al tuo ricettario!';
    location.hash = 'saved';
  } catch (err) {
    els.formStatus.textContent = 'Non sono riuscito a salvare: ' + err.message;
  } finally { submit.disabled = false; submit.textContent = 'Salva ricetta'; }
});

els.dailyCard.addEventListener('click', () => {
  if (state.dailyRecipe) location.hash = 'recipe/' + encodeURIComponent(state.dailyRecipe.id);
});
els.searchForm.addEventListener('submit', e => {
  e.preventDefault(); const q = els.searchInput.value.trim();
  if (q) location.hash = 'results/' + encodeURIComponent(q);
});
els.btnHome.addEventListener('click', () => { location.hash = ''; });
document.getElementById('btn-cancel-add').addEventListener('click', () => { location.hash = ''; });
els.btnReject.addEventListener('click', () => { location.hash = ''; });
window.addEventListener('hashchange', route);
setupDailyRecipe();
route();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker non registrato:', err)));
}