// API del Ricettario: ricerca e lettura automatica delle ricette Moldrek.
import { LOCAL_RECIPES } from './local-recipes.js';

export async function searchMeals(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}`);
  if (!response.ok) throw new Error('Non riesco a consultare Moldrek in questo momento');
  const remote = await response.json();

  // Mantiene disponibili anche le ricette italiane già integrate nell'app.
  const local = LOCAL_RECIPES.filter(recipe => {
    const searchable = [recipe.title, recipe.category, recipe.area,
      ...(recipe.ingredients || []).map(item => item.name), recipe.instructions]
      .join(' ').toLocaleLowerCase('it');
    return searchable.includes(q.toLocaleLowerCase('it'));
  }).map(recipe => ({
    id: String(recipe.id), title: recipe.title,
    category: recipe.category || '', area: recipe.area || '',
    photoUrl: recipe.photoUrl || '', source: 'local'
  }));

  const seen = new Set(remote.map(item => item.id));
  return [...remote, ...local.filter(item => !seen.has(item.id))];
}

export async function getMealById(id) {
  const local = LOCAL_RECIPES.find(item => String(item.id) === String(id));
  if (local) return { ...local, ingredients: (local.ingredients || []).map(item => ({ ...item })) };
  const response = await fetch(`/api/recipes/detail?url=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Non riesco a leggere la ricetta selezionata');
  return response.json();
}
