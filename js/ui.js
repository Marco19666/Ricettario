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
    if (imageUrl) {
      img.src = imageUrl;
      img.addEventListener('error', () => { imgWrap.hidden = true; });
    } else {
      imgWrap.hidden = true;
    }
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

  const sourceWrap = document.getElementById('r-source');
  const sourceLink = document.getElementById('r-source-link');
  if (recipe.sourceUrl) {
    sourceLink.href = recipe.sourceUrl;
    sourceWrap.hidden = false;
  } else {
    sourceWrap.hidden = true;
    sourceLink.removeAttribute('href');
  }

  const img = document.getElementById('r-photo');
  const photoTile = img.closest('.tile-photo');
  const photoPlaceholder = document.getElementById('r-photo-placeholder');
  const photoCredit = document.getElementById('r-photo-credit');
  photoCredit.hidden = !recipe.photoCredit;
  photoCredit.textContent = recipe.photoCredit || '';
  photoTile.hidden = false;
  if (photoSrc) {
    img.src = photoSrc;
    img.alt = recipe.title;
    img.hidden = false;
    photoPlaceholder.hidden = true;
    img.onerror = () => {
      img.hidden = true;
      photoPlaceholder.hidden = false;
      photoPlaceholder.textContent = 'Foto non disponibile';
    };
  } else {
    img.removeAttribute('src');
    img.alt = '';
    img.hidden = true;
    photoPlaceholder.hidden = false;
    photoPlaceholder.textContent = 'Foto non aggiunta';
  }

  const ingredients = recipe.ingredients || [];
  const ul = document.getElementById('r-ingredients');
  ul.innerHTML = '';
  if (ingredients.length) {
    for (const item of ingredients) {
      const li = document.createElement('li');
      li.textContent = [item.measure, item.name].filter(Boolean).join(' ').trim();
      ul.appendChild(li);
    }
  } else {
    const li = document.createElement('li');
    li.textContent = 'Ingredienti non inseriti: consulta la ricetta originale.';
    ul.appendChild(li);
  }

  document.getElementById('r-preparation-title').textContent = 'Preparazione';
  const prep = document.getElementById('r-instructions');
  prep.innerHTML = '';
  const steps = (recipe.instructions || '').split(/\r?\n+/).filter(Boolean);
  if (steps.length) {
    for (const step of steps) {
      const para = document.createElement('p');
      para.textContent = step;
      prep.appendChild(para);
    }
  } else {
    const para = document.createElement('p');
    para.textContent = 'Preparazione non inserita: consulta la ricetta originale.';
    prep.appendChild(para);
  }

  if (recipe.personalNotes) {
    const notesTitle = document.createElement('h4');
    notesTitle.textContent = 'Le mie note';
    const notes = document.createElement('p');
    notes.textContent = recipe.personalNotes;
    prep.append(notesTitle, notes);
  }
}