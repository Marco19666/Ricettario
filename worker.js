const MOLDREK = 'https://www.moldrek.com';
const MAX_RESULTS = 30;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300'
  }});
}
function decodeHtml(value) {
  return String(value || '').replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function cleanText(html) {
  return decodeHtml(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|td|table|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[\t\r ]+/g, ' ').replace(/\n\s+/g, '\n').replace(/\n{2,}/g, '\n').trim();
}
async function fetchHtml(url) {
  const response = await fetch(url, { headers: {
    'user-agent': 'Mozilla/5.0 (compatible; Ricettario/1.0)',
    'accept': 'text/html,application/xhtml+xml'
  }, redirect: 'follow' });
  if (!response.ok) throw new Error('Moldrek ha risposto con errore ' + response.status);
  return response.text();
}
function extractLinks(html, base) {
  const links = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const href = decodeHtml(match[1]).trim();
    const title = cleanText(match[2]).replace(/\s+/g, ' ').trim();
    if (!href || !title) continue;
    try {
      const link = new URL(href, base);
      if (link.hostname === 'www.moldrek.com' && link.pathname.includes('/ricette_indice/')) {
        links.push({ title, url: link.href });
      }
    } catch {}
  }
  return links;
}
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
async function searchMoldrek(query) {
  const q = normalize(query);
  if (!q) return [];
  const first = (q.match(/[a-z]/) || ['a'])[0];
  const letter = first >= 'a' && first <= 'z' ? first : 'a';
  const indexUrl = new URL('/indice_ricette_' + letter + '.htm', MOLDREK).href;
  const firstHtml = await fetchHtml(indexUrl);
  const pages = [indexUrl];
  const pagination = /href\s*=\s*["']([^"']*indice_ricette_[a-z](?:_?[0-9]+)?\.htm[^"']*)["']/gi;
  let pageMatch;
  while ((pageMatch = pagination.exec(firstHtml)) && pages.length < 4) {
    const pageUrl = new URL(decodeHtml(pageMatch[1]), MOLDREK).href;
    if (!pages.includes(pageUrl)) pages.push(pageUrl);
  }
  const all = [];
  for (const pageUrl of pages) {
    const html = pageUrl === indexUrl ? firstHtml : await fetchHtml(pageUrl);
    all.push(...extractLinks(html, pageUrl));
  }
  const unique = new Map();
  for (const item of all) {
    const title = normalize(item.title);
    if (title.includes(q) || q.split(' ').every(word => title.includes(word))) unique.set(item.url, item);
  }
  return [...unique.values()].slice(0, MAX_RESULTS).map(item => ({
    id: item.url, title: item.title, category: 'Moldrek',
    area: 'Ricetta originale', photoUrl: '', sourceUrl: item.url
  }));
}
async function findCommonsPhoto(title) {
  try {
    const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
    endpoint.search = new URLSearchParams({
      action: 'query', generator: 'search',
      gsrsearch: 'filetype:bitmap ' + title + ' food dish',
      gsrnamespace: '6', gsrlimit: '5', prop: 'imageinfo',
      iiprop: 'url|extmetadata', iiurlwidth: '900', format: 'json'
    });
    const response = await fetch(endpoint.href, { headers: {
      'user-agent': 'Ricettario/1.0 (recipe photo lookup)',
      'accept': 'application/json'
    }});
    if (!response.ok) return null;
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) continue;
      const metadata = info.extmetadata || {};
      const artist = cleanText(metadata.Artist?.value || '').replace(/\s+/g, ' ').trim();
      const license = cleanText(metadata.LicenseShortName?.value || '').trim();
      return { url: info.thumburl, credit: [artist, license, 'Wikimedia Commons'].filter(Boolean).join(' · ') };
    }
  } catch {}
  return null;
}
async function extractRecipe(html, url) {
  const text = cleanText(html);
  const lower = text.toLocaleLowerCase('it');
  const ingredientAt = lower.indexOf('ingredienti:');
  const prepAt = lower.indexOf('preparazione:', ingredientAt);
  if (ingredientAt < 0 || prepAt < 0) throw new Error('La pagina non contiene una ricetta leggibile');
  const before = text.slice(0, ingredientAt).split('\n').map(s => s.trim()).filter(Boolean);
  const title = [...before].reverse().find(line =>
    line.length > 2 && line.length < 140 &&
    !/^(calorie|categoria|ingrediente principale|note|image|download|indice|pagina|ricette|secondi piatti|home page)/i.test(line)
  ) || 'Ricetta Moldrek';
  const ingredientText = text.slice(ingredientAt + 'ingredienti:'.length, prepAt);
  const preparationText = text.slice(prepAt + 'preparazione:'.length);
  const instructions = preparationText.split(/\n\s*(?:download|ricette regionali|ricette internazionali)\b/i)[0]
    .replace(/\s+/g, ' ').trim();
  const ingredients = ingredientText.split('\n').map(line => line.trim())
    .filter(line => line && !/^[-:]+$/.test(line)).map(name => ({ name, measure: '' }));

  let photoUrl = '';
  const words = normalize(title).split(' ').filter(w => w.length > 3);
  const imageRe = /<img\b[^>]*>/gi;
  let imageMatch;
  while ((imageMatch = imageRe.exec(html))) {
    const tag = imageMatch[0];
    const src = (tag.match(/\b(?:src|data-src)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const alt = (tag.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    if (!src) continue;
    try {
      const candidate = new URL(decodeHtml(src), url);
      if (!['www.moldrek.com', 'moldrek.com'].includes(candidate.hostname)) continue;
      const hint = normalize(alt + ' ' + candidate.pathname);
      if (words.some(word => hint.includes(word))) { photoUrl = candidate.href; break; }
    } catch {}
  }
  const ogImage = (html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i) || [])[1];
  if (!photoUrl && ogImage) {
    try {
      const candidate = new URL(decodeHtml(ogImage), url);
      if (words.some(word => normalize(candidate.pathname).includes(word))) photoUrl = candidate.href;
    } catch {}
  }
  let photoCredit = '';
  if (!photoUrl) {
    const fallback = await findCommonsPhoto(title);
    if (fallback) { photoUrl = fallback.url; photoCredit = fallback.credit; }
  }
  return { id: url, title, category: 'Moldrek', area: 'Ricetta originale',
    sourceUrl: url, photoUrl, photoCredit, ingredients, instructions };
}

const PRIVATE_HEADERS = { 'cache-control': 'no-store' };
function privateJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...PRIVATE_HEADERS } });
}
function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function decodeJwtPart(value) { return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))); }
async function accessUser(request, env) {
  const team = String(env.CF_ACCESS_TEAM_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const audience = String(env.CF_ACCESS_AUD || '');
  if (!team || !audience) throw new Error('Cloudflare Access non è ancora configurato');
  const auth = request.headers.get('authorization') || '';
  const cookie = request.headers.get('cookie') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ((cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/) || [])[1] || '');
  if (!token) throw new Error('Accedi con Cloudflare Access per usare il ricettario online');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Sessione Cloudflare Access non valida');
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  const issuer = 'https://' + team;
  if (header.alg !== 'RS256' || claims.iss !== issuer ||
      !(Array.isArray(claims.aud) ? claims.aud.includes(audience) : claims.aud === audience) ||
      !claims.sub || !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now()/1000)) {
    throw new Error('Sessione Cloudflare Access scaduta o non valida');
  }
  const response = await fetch(issuer + '/cdn-cgi/access/certs', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Non riesco a verificare la sessione Cloudflare Access');
  const jwks = await response.json();
  const jwk = (jwks.keys || []).find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Chiave Cloudflare Access non trovata');
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, decodeBase64Url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!valid) throw new Error('Firma della sessione non valida');
  return String(claims.sub);
}
async function photoObjectKey(userId, recipeId) {
  const bytes = new TextEncoder().encode(userId + String.fromCharCode(0) + recipeId);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hex = [...digest].map(v => v.toString(16).padStart(2, '0')).join('');
  return 'users/' + hex.slice(0,2) + '/' + hex + '/photo';
}
async function handlePersonalApi(request, url, env) {
  if (!env.DB || !env.PHOTOS) return privateJson({ error: 'Archivio cloud non ancora collegato: servono i binding D1 (DB) e R2 (PHOTOS).' }, 503);
  let userId;
  try { userId = await accessUser(request, env); }
  catch (error) { return privateJson({ error: error.message }, 401); }
  if (url.pathname === '/api/my/recipes' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id,title,category,area,ingredients_json,instructions,photo_key,photo_type,saved_at FROM recipes WHERE user_id = ? ORDER BY saved_at DESC').bind(userId).all();
    return privateJson((rows.results || []).map(row => ({
      id: row.id, title: row.title, category: row.category || '', area: row.area || '',
      ingredients: JSON.parse(row.ingredients_json || '[]'), instructions: row.instructions || '',
      photoUrl: row.photo_key ? '/api/my/photos?id=' + encodeURIComponent(row.id) : '',
      source: 'personal', savedAt: row.saved_at
    })));
  }
  if (url.pathname === '/api/my/recipes' && request.method === 'POST') {
    let recipe;
    try { recipe = await request.json(); } catch { return privateJson({ error: 'Dati della ricetta non validi' }, 400); }
    if (!recipe || typeof recipe.id !== 'string' || !recipe.id || recipe.id.length > 500 ||
        typeof recipe.title !== 'string' || !recipe.title.trim() || recipe.title.length > 160 ||
        !Array.isArray(recipe.ingredients) || typeof recipe.instructions !== 'string') {
      return privateJson({ error: 'La ricetta è incompleta o non valida' }, 400);
    }
    const now = Date.now();
    const sql = 'INSERT INTO recipes (user_id,id,title,category,area,ingredients_json,instructions,saved_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET title=excluded.title,category=excluded.category,area=excluded.area,ingredients_json=excluded.ingredients_json,instructions=excluded.instructions,updated_at=excluded.updated_at';
    await env.DB.prepare(sql).bind(userId, recipe.id, recipe.title.trim(), String(recipe.category || ''), String(recipe.area || ''), JSON.stringify(recipe.ingredients), recipe.instructions, now, now).run();
    return privateJson({ ok: true, id: recipe.id }, 201);
  }
  if (url.pathname === '/api/my/recipes' && request.method === 'DELETE') {
    const id = url.searchParams.get('id') || '';
    if (!id || id.length > 500) return privateJson({ error: 'Ricetta non valida' }, 400);
    await env.PHOTOS.delete(await photoObjectKey(userId,id));
    await env.DB.prepare('DELETE FROM recipes WHERE user_id = ? AND id = ?').bind(userId,id).run();
    return privateJson({ok:true});
  }
  if (url.pathname === '/api/my/photos') {
    const id = url.searchParams.get('id') || '';
    if (!id || id.length > 500) return privateJson({error:'Ricetta non valida'},400);
    const row = await env.DB.prepare('SELECT id,photo_key,photo_type FROM recipes WHERE user_id = ? AND id = ?').bind(userId,id).first();
    if (request.method === 'PUT') {
      if (!row) return privateJson({error:'Salva prima la ricetta'},404);
      const type = request.headers.get('content-type') || '';
      if (!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(type.split(';')[0].trim().toLowerCase())) return privateJson({error:'Usa una foto JPG, PNG, WebP, GIF o AVIF'},415);
      const blob = await request.arrayBuffer();
      if (!blob.byteLength || blob.byteLength > 8*1024*1024) return privateJson({error:'La foto deve essere inferiore a 8 MB'},413);
      const key = await photoObjectKey(userId,id);
      await env.PHOTOS.put(key,blob,{httpMetadata:{contentType:type}});
      await env.DB.prepare('UPDATE recipes SET photo_key=?,photo_type=?,updated_at=? WHERE user_id=? AND id=?').bind(key,type,Date.now(),userId,id).run();
      return privateJson({ok:true});
    }
    if (request.method === 'GET') {
      if (!row || !row.photo_key) return privateJson({error:'Foto non trovata'},404);
      const object = await env.PHOTOS.get(row.photo_key);
      if (!object) return privateJson({error:'Foto non trovata'},404);
      const headers = new Headers({'cache-control':'private, max-age=300','x-content-type-options':'nosniff'});
      object.writeHttpMetadata(headers);
      headers.set('content-type',row.photo_type || 'application/octet-stream');
      return new Response(object.body,{headers});
    }
  }
  return privateJson({error:'Operazione non disponibile'},404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/my/')) return handlePersonalApi(request, url, env);
    if (url.pathname === '/api/recipes/search') {
      const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (!query) return json([]);
      try { return json(await searchMoldrek(query)); }
      catch (error) { return json({ error: error.message }, 502); }
    }
    if (url.pathname === '/api/recipes/detail') {
      const raw = url.searchParams.get('url') || '';
      let recipeUrl;
      try { recipeUrl = new URL(raw); } catch { return json({ error: 'Indirizzo non valido' }, 400); }
      if (recipeUrl.protocol !== 'https:' || recipeUrl.hostname !== 'www.moldrek.com' ||
          !recipeUrl.pathname.startsWith('/ricette_indice/')) {
        return json({ error: 'La pagina non appartiene all’archivio ricette Moldrek' }, 400);
      }
      try { return json(await extractRecipe(await fetchHtml(recipeUrl.href), recipeUrl.href)); }
      catch (error) { return json({ error: error.message }, 502); }
    }
    return env.ASSETS.fetch(request);
  }
};
