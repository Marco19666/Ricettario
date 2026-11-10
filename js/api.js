const BASE = 'https://www.themealdb.com/api/json/v1/1';

async function apiGet(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error('Servizio ricette non disponibile (HTTP ' + res.status + ')');
  return res.json();
}

export async function searchMeals(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  // Prima cerca il termine richiesto; in parallelo recupera il catalogo italiano
  // per dare precedenza alle ricette della cucina italiana.
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

  // Se la ricerca testuale non trova risultati italiani, non lasciare l'utente
  // senza risultati: mostra gli altri risultati chiaramente classificati.
  return [...italianMatches, ...otherMatches];
}

export async function getMealById(id) {
  const data = await apiGet(`lookup.php?i=${encodeURIComponent(id)}`);
  const meal = data.meals && data.meals[0];
  return meal ? normalizeFull(meal) : null;
}

function normalizeList(m) {
  return {
    id: String(m.idMeal || ''),
    title: m.strMeal || 'Ricetta senza titolo',
    category: m.strCategory || '',
    area: m.strArea || '',
    photoUrl: m.strMealThumb || '',
  };
}

function normalizeFull(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = m[`strIngredient${i}`];
    if (ing && ing.trim()) {
      ingredients.push({
        name: ing.trim(),
        measure: (m[`strMeasure${i}`] || '').trim(),
      });
    }
  }
  return {
    ...normalizeList(m),
    instructions: m.strInstructions || '',
    ingredients,
  };
}
