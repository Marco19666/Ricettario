// Ricerca combinata: archivio locale, ricette personali e catalogo online TheMealDB.
import { LOCAL_RECIPES } from './local-recipes.js';
import * as db from './db.js';

const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it');
}

function searchableText(recipe) {
  return [
    recipe.title,
    recipe.category,
    recipe.area,
    ...(recipe.ingredients || []).map(item => item.name),
    recipe.instructions
  ].join(' ');
}

function fromMealDb(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    if (name) ingredients.push({ name, measure: meal[`strMeasure${i}`]?.trim() || '' });
  }
  return {
    id: 'mealdb-' + meal.idMeal,
    title: meal.strMeal || 'Ricetta',
    category: meal.strCategory || '',
    area: meal.strArea || '',
    photoUrl: meal.strMealThumb || '',
    ingredients,
    instructions: meal.strInstructions || '',
    source: 'online',
    sourceUrl: meal.strSource || meal.strMealThumb || ''
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Servizio ricette non disponibile');
  return response.json();
}

export async function searchMeals(query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  // Le ricette locali vengono sempre mostrate anche senza connessione.
  const personal = await db.listRecipes();
  const local = [...personal, ...LOCAL_RECIPES];
  const seenIds = new Set();
  const seenTitles = new Set();
  const localResults = local.filter(recipe => {
    const id = String(recipe.id);
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    const matches = terms.every(term => normalize(searchableText(recipe)).includes(term));
    if (matches) seenTitles.add(normalize(recipe.title));
    return matches;
  }).map(recipe => ({
    id: String(recipe.id),
    title: recipe.title,
    category: recipe.category || '',
    area: recipe.area || '',
    photoUrl: recipe.photoUrl || '',
    source: recipe.source || 'local'
  }));

  // Aggiunge i risultati online; un problema di rete non blocca la ricerca locale.
  try {
    const data = await fetchJson(`${MEALDB}/search.php?s=${encodeURIComponent(query.trim())}`);
    const online = (data.meals || []).map(fromMealDb).filter(recipe => {
      const title = normalize(recipe.title);
      if (seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    }).map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      area: recipe.area,
      photoUrl: recipe.photoUrl,
      source: 'online'
    }));
    return [...localResults, ...online];
  } catch (error) {
    console.warn('Ricerca online non disponibile; mostro i risultati locali.', error);
    return localResults;
  }
}

export async function getMealById(id) {
  const local = LOCAL_RECIPES.find(item => String(item.id) === String(id));
  if (local) return { ...local, ingredients: (local.ingredients || []).map(item => ({ ...item })) };
  const saved = await db.getRecipe(id);
  if (saved) return saved;

  const match = String(id).match(/^mealdb-(\d+)$/);
  if (!match) return null;
  const data = await fetchJson(`${MEALDB}/lookup.php?i=${encodeURIComponent(match[1])}`);
  const meal = data.meals?.[0];
  return meal ? fromMealDb(meal) : null;
}
