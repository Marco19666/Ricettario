import { LOCAL_RECIPES } from './local-recipes.js';

const BASE = 'https://www.themealdb.com/api/json/v1/1';

async function apiGet(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error('Servizio ricette non disponibile (HTTP ' + res.status + ')');
  return res.json();
}

export async function searchMeals(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  // L'archivio italiano integrato è sempre disponibile anche offline.
  const needle = q.toLocaleLowerCase('it');
  const localMatches = LOCAL_RECIPES.filter(recipe => {
    const searchable = [
      recipe.title, recipe.category, recipe.area,
      ...(recipe.ingredients || []).map(item => item.name)
    ].join(' ').toLocaleLowerCase('it');
    return searchable.includes(needle);
  }).map(normalizeLocalList);

  // La ricerca esterna amplia i risultati; un errore di rete non nasconde
  // le ricette locali già trovate.
  let externalMatches = [];
  try {
    const [searched, italian] = await Promise.all([
      apiGet(`search.php?s=${encodeURIComponent(q)}`),
      apiGet('filter.php?a=Italian').catch(() => ({ meals: [] }))
    ]);
    const italianIds = new Set((italian.meals || []).map(m => String(m.idMeal)));
    const allMatches = (searched.meals || []).map(normalizeList);
    const italianMatches = allMatches.filter(m =>
      italianIds.has(String(m.id)) || String(m.area || '').toLowerCase() === 'italian'
    );
    const otherMatches = allMatches.filter(m => !italianMatches.includes(m));
    externalMatches = [...italianMatches, ...otherMatches];
  } catch (err) {
    if (!localMatches.length) throw err;
  }

  const seen = new Set(localMatches.map(recipe => recipe.id));
  return [...localMatches, ...externalMatches.filter(recipe => !seen.has(recipe.id))];
}

export async function getMealById(id) {
  const local = LOCAL_RECIPES.find(recipe => String(recipe.id) === String(id));
  if (local) return { ...local, ingredients: local.ingredients.map(item => ({ ...item })) };

  const data = await apiGet(`lookup.php?i=${encodeURIComponent(id)}`);
  const meal = data.meals && data.meals[0];
  return meal ? normalizeFull(meal) : null;
}

function normalizeLocalList(recipe) {
  return {
    id: String(recipe.id),
    title: recipe.title,
    category: recipe.category || '',
    area: recipe.area || '',
    photoUrl: recipe.photoUrl || ''
  };
}

function normalizeList(m) {
  return {
    id: String(m.idMeal || ''),
    title: m.strMeal || 'Ricetta senza titolo',
    category: m.strCategory || '',
    area: m.strArea || '',
    photoUrl: m.strMealThumb || ''
  };
}

function normalizeFull(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = m[`strIngredient${i}`];
    if (ing && ing.trim()) {
      ingredients.push({
        name: ing.trim(),
        measure: (m[`strMeasure${i}`] || '').trim()
      });
    }
  }
  return {
    ...normalizeList(m),
    instructions: m.strInstructions || '',
    ingredients
  };
}
