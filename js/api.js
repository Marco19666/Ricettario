// Ricerca delle ricette disponibili sul dispositivo.
import { LOCAL_RECIPES } from './local-recipes.js';
import * as db from './db.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
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

export async function searchMeals(query) {
  const terms = normalize(query).trim().split(/\\s+/).filter(Boolean);
  if (!terms.length) return [];

  // Cerca sia nell'archivio iniziale sia nelle ricette personali salvate.
  const personal = await db.listRecipes();
  const allRecipes = [...personal, ...LOCAL_RECIPES];
  const seen = new Set();

  return allRecipes.filter(recipe => {
    const id = String(recipe.id);
    if (seen.has(id)) return false;
    seen.add(id);
    const text = normalize(searchableText(recipe));
    return terms.every(term => text.includes(term));
  }).map(recipe => ({
    id: String(recipe.id),
    title: recipe.title,
    category: recipe.category || '',
    area: recipe.area || '',
    photoUrl: recipe.photoUrl || '',
    source: recipe.source || 'local'
  }));
}

export async function getMealById(id) {
  const local = LOCAL_RECIPES.find(item => String(item.id) === String(id));
  if (local) return { ...local, ingredients: (local.ingredients || []).map(item => ({ ...item })) };
  const saved = await db.getRecipe(id);
  return saved || null;
}
