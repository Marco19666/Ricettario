// Sincronizzazione privata delle ricette con Cloudflare D1 e R2.
async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Accesso cloud non disponibile: verifica Cloudflare Access e la connessione.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Errore durante la sincronizzazione cloud');
  return data;
}
export async function listCloudRecipes() { return request('/api/my/recipes'); }
export async function saveCloudRecipe(recipe, photoBlob = null) {
  await request('/api/my/recipes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: String(recipe.id), title: recipe.title, category: recipe.category || '',
      area: recipe.area || '', ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || ''
    })
  });
  if (photoBlob) await request('/api/my/photos?id=' + encodeURIComponent(recipe.id), {
    method: 'PUT',
    headers: { 'content-type': photoBlob.type || 'image/jpeg' },
    body: photoBlob
  });
}
export async function deleteCloudRecipe(id) {
  return request('/api/my/recipes?id=' + encodeURIComponent(id), { method: 'DELETE' });
}
