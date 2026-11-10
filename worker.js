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
function extractRecipe(html, url) {
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
  return { id: url, title, category: 'Moldrek', area: 'Ricetta originale',
    sourceUrl: url, photoUrl, ingredients, instructions };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
      try { return json(extractRecipe(await fetchHtml(recipeUrl.href), recipeUrl.href)); }
      catch (error) { return json({ error: error.message }, 502); }
    }
    return env.ASSETS.fetch(request);
  }
};
