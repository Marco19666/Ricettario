const BASE = 'https://www.themealdb.com/api/json/v1/1';

export async function searchMeals(query) {
  const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Ricerca non disponibile');
  const data = await res.json();
  return (data.meals || []).map(normalizeList);
}

export async function getMealById(id) {
  const res = await fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Dettaglio non disponibile');
  const data = await res.json();
  return data.meals ? normalizeFull(data.meals[0]) : null;
}

function normalizeList(m) {
  return {
    id: m.idMeal,
    title: m.strMeal,
    category: m.strCategory,
    area: m.strArea,
    photoUrl: m.strMealThumb,
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
    id: m.idMeal,
    title: m.strMeal,
    category: m.strCategory,
    area: m.strArea,
    instructions: m.strInstructions || '',
    photoUrl: m.strMealThumb,
    ingredients,
  };
}
