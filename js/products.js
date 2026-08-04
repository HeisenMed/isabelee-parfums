/* products.js — `wish` y `toggleWishId` vienen de cart.js (cargado antes) */

function renderProducts(list) {
  const grid = document.getElementById('prodGrid');
  const count = document.getElementById('resultsCount');
  grid.innerHTML = '';
  if (count) count.textContent = list.length + ' productos';
  if (!list.length) {
    grid.innerHTML = '<div class="no-results"><p>No se encontraron productos</p></div>';
    return;
  }
  list.forEach((p, i) => {
    const badgeClass = p.badge === 'Premium' || p.badge === 'Exclusivo' ? 'prod-badge premium' : 'prod-badge';
    const on = wish.has(p.id);
    const card = document.createElement('div');
    card.className = 'prod-card reveal';
    card.style.transitionDelay = (i % 8 * 55) + 'ms';
    card.innerHTML = `
      <div class="prod-img-wrap">
        ${p.badge ? `<span class="${badgeClass}">${p.badge}</span>` : ''}
        <button class="wish-btn${on ? ' on' : ''}" onclick="toggleWish(event,${p.id})" aria-label="Favorito">
          <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
        </button>
        <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy">
      </div>
      <div class="prod-info">
        <p class="prod-brand">${p.brand}</p>
        <h3 class="prod-name">${p.name}</h3>
        <p class="prod-vol">Eau de Parfum · ${p.volume}</p>
        <div class="prod-row">
          <span class="prod-price">${fmt(p.price)}</span>
          <button class="add-btn" onclick="addCart(${p.id})">Agregar</button>
        </div>
      </div>`;
    card.addEventListener('click', e => {
      if (e.target.closest('.wish-btn') || e.target.closest('.add-btn')) return;
      window.location.href = 'producto.html?id=' + p.id;
    });
    grid.appendChild(card);
  });
  requestAnimationFrame(() => {
    grid.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  });
}

function toggleWish(e, id) {
  e.stopPropagation();
  e.currentTarget.classList.toggle('on', toggleWishId(id));
}
