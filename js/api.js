import { LOCAL_RECIPES } from './local-recipes.js';

// Ricerca esclusivamente nell'archivio italiano integrato.
// Non interroga più TheMealDB: evita risultati in lingua inglese.
export async function searchMeals(query) {
  const q = String(query || '').trim().toLocaleLowerCase('it');
  if (!q) return [];

  return LOCAL_RECIPES.filter(recipe => {
    const searchable = [
      recipe.title, recipe.category, recipe.area,
      ...(recipe.ingredients || []).map(item => item.name),
      recipe.instructions
    ].join(' ').toLocaleLowerCase('it');
    return searchable.includes(q);
  }).map(recipe => ({
    id: String(recipe.id),
    title: recipe.title,
    category: recipe.category || '',
    area: recipe.area || '',
    photoUrl: recipe.photoUrl || ''
  }));
}

export async function getMealById(id) {
  const recipe = LOCAL_RECIPES.find(item => String(item.id) === String(id));
  return recipe ? {
    ...recipe,
    ingredients: (recipe.ingredients || []).map(item => ({ ...item }))
  } : null;
}
