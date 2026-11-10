export function renderRecipeList(container, recipes, onSelect) {
  container.innerHTML = '';
  if (!recipes || recipes.length === 0) {
    container.innerHTML = '<p class="empty">Nessuna ricetta trovata.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const r of recipes) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'recipe-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-img';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = r.title || 'Ricetta';
    const imageUrl = r._src || r.photoUrl;
    if (imageUrl) { img.src = imageUrl; img.addEventListener('error', () => { imgWrap.hidden = true; }); }
    else imgWrap.hidden = true;
    imgWrap.appendChild(img);

    const body = document.createElement('div');
    body.className = 'card-body';
    const h3 = document.createElement('h3');
    h3.textContent = r.title;
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = [r.category, r.area].filter(Boolean).join(' · ');
    body.append(h3, meta);

    card.append(imgWrap, body);
    card.addEventListener('click', () => onSelect(r));
    frag.appendChild(card);
  }
  container.appendChild(frag);
}

export function renderDetail(recipe, photoSrc) {
  document.getElementById('r-title').textContent = recipe.title;
  document.getElementById('r-meta').textContent =
    [recipe.category, recipe.area].filter(Boolean).join(' · ');

  const img = document.getElementById('r-photo');
  const photoTile = img.closest('.tile-photo');
  if (photoSrc) {
    img.src = photoSrc;
    img.alt = recipe.title;
    img.hidden = false;
    photoTile.hidden = false;
    img.onerror = () => { photoTile.hidden = true; };
  } else {
    photoTile.hidden = true;
    img.removeAttribute('src');
    img.alt = '';
    img.hidden = true;
  }

  const ul = document.getElementById('r-ingredients');
  ul.innerHTML = '';
  for (const { name, measure } of recipe.ingredients || []) {
    const li = document.createElement('li');
    li.textContent = `${measure} ${name}`.trim();
    ul.appendChild(li);
  }

  const prep = document.getElementById('r-instructions');
  prep.innerHTML = '';
  for (const p of (recipe.instructions || '').split(/\r?\n+/).filter(Boolean)) {
    const para = document.createElement('p');
    para.textContent = p;
    prep.appendChild(para);
  }
}
