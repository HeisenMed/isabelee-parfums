/* producto.js — $, fmt, wish y toggleWishId vienen de cart.js (cargado antes) */

let currentProductId = null;
let currentQty = 1;

document.addEventListener('DOMContentLoaded', () => {
  initPdpCart();
  initPdpHeader();
  initPdpHamburger();

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);

  if (!id || !window.PERFUMES) { showNotFound(); return; }
  const product = window.PERFUMES.find(p => p.id === id);
  if (!product) { showNotFound(); return; }

  currentProductId = id;
  document.title = product.brand + ' ' + product.name + ' | Isabeleé Parfums';

  renderProduct(product);
  renderDescSection(product);
  renderAtmSection(product);
  loadReviews(id);
});

function initPdpCart() {
  const btn = $('cartBtn');
  if (btn) btn.addEventListener('click', openCart);
  const scrim = $('cartScrim');
  if (scrim) scrim.addEventListener('click', closeCart);
}

function initPdpHeader() {
  const hdr = $('hdr');
  if (hdr) window.addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 20), { passive: true });
}

function initPdpHamburger() {
  const hbg = $('hbg');
  const mob = $('mobMenu');
  if (hbg && mob) hbg.addEventListener('click', () => { mob.classList.toggle('open'); hbg.classList.toggle('open'); });
}

function closeMob() {
  const mob = $('mobMenu'), hbg = $('hbg');
  if (mob) mob.classList.remove('open');
  if (hbg) hbg.classList.remove('open');
}

/* ── Product render ───────────────────────────────────────────────────────── */
function renderProduct(p) {
  const grid = $('pdpGrid');
  currentQty = 1;

  grid.innerHTML = `
    <div class="pdp-img-wrap">
      <img src="${p.image}" alt="${p.brand} ${p.name}" loading="eager">
    </div>
    <div class="pdp-info">
      <p class="pdp-brand">${p.brand}</p>
      <h1 class="pdp-name">${p.name}</h1>
      <p class="pdp-type">Eau de Parfum · ${p.volume} · ${{hombre:'Hombre',mujer:'Mujer',unisex:'Unisex'}[p.category] || p.category}</p>
      <div class="pdp-divider"></div>
      <p class="pdp-price">${fmt(p.price)}</p>
      <div class="pdp-qty-row">
        <div class="pdp-qty">
          <button class="qty-btn" id="qtyMinus" aria-label="Reducir cantidad">−</button>
          <span class="qty-num" id="qtyNum">1</span>
          <button class="qty-btn" id="qtyPlus" aria-label="Aumentar cantidad">+</button>
        </div>
        <button class="pdp-wish-btn" id="pdpWishBtn" aria-label="Agregar a favoritos">
          <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
        </button>
      </div>
      <button class="pdp-buy-btn" id="pdpBuyBtn">
        <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        Agregar al carrito
      </button>
    </div>`;

  if (wish.has(p.id)) $('pdpWishBtn').classList.add('on');   // favorito persistido

  $('qtyMinus').addEventListener('click', () => {
    if (currentQty > 1) { currentQty--; $('qtyNum').textContent = currentQty; }
  });
  $('qtyPlus').addEventListener('click', () => {
    currentQty++;
    $('qtyNum').textContent = currentQty;
  });

  $('pdpBuyBtn').addEventListener('click', () => {
    addCartQty(p.id, currentQty);
    openCart();
  });

  $('pdpWishBtn').addEventListener('click', () => {
    $('pdpWishBtn').classList.toggle('on', toggleWishId(p.id));
  });
}

/* ── Description section ──────────────────────────────────────────────────── */
function renderDescSection(p) {
  $('pdpDesc').innerHTML = `
    <h2 class="pdp-section-title">Descripción del producto</h2>
    <p class="pdp-desc-text">${p.description}</p>`;
}

/* ── Atmósfera olfativa section ───────────────────────────────────────────── */
function renderAtmSection(p) {
  const sec = $('pdpAtm');
  if (!p.familia_olfativa && !p.notas_salida && !p.notas_corazon && !p.notas_fondo) {
    sec.style.display = 'none';
    return;
  }
  const famTag = p.familia_olfativa
    ? `<span class="atm-familia">${p.familia_olfativa}</span>` : '';
  const notesHtml = (p.notas_salida || p.notas_corazon || p.notas_fondo) ? `
    <div class="atm-notes">
      ${p.notas_salida  ? `<div class="atm-note"><span class="atm-note-label">Salida</span><span class="atm-note-val">${p.notas_salida}</span></div>` : ''}
      ${p.notas_corazon ? `<div class="atm-note"><span class="atm-note-label">Corazón</span><span class="atm-note-val">${p.notas_corazon}</span></div>` : ''}
      ${p.notas_fondo   ? `<div class="atm-note"><span class="atm-note-label">Fondo</span><span class="atm-note-val">${p.notas_fondo}</span></div>` : ''}
    </div>` : '';
  const descHtml = p.descripcion_olfativa
    ? `<p class="pdp-desc-text" style="margin-top:12px;margin-bottom:20px">${p.descripcion_olfativa}</p>` : '';
  sec.innerHTML = `
    <h2 class="pdp-section-title">Atmósfera olfativa</h2>
    ${famTag}
    ${descHtml}
    ${notesHtml}`;
}

/* ── Reviews ──────────────────────────────────────────────────────────────── */

/* TODO: conectar con Supabase aquí */
async function fetchReviews(_productId) {
  const p = window.PERFUMES ? window.PERFUMES.find(x => x.id === _productId) : null;
  return (p && Array.isArray(p.reviews)) ? p.reviews : [];
}

/* TODO: conectar con Supabase aquí */
async function submitReview(_productId, _data) {
  // no-op por ahora
}

async function loadReviews(productId) {
  const reviews = await fetchReviews(productId);
  renderReviews(reviews);
}

function starsHtml(n) {
  return Array.from({ length: 5 }, (_, i) =>
    `<svg class="star${i < Math.round(n) ? ' on' : ''}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  ).join('');
}

function renderReviews(reviews) {
  const sec = $('pdpReviews');
  const hasReviews = reviews.length > 0;
  const avg = hasReviews ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;

  const summaryHtml = hasReviews ? `
    <div class="rev-summary">
      <span class="rev-avg">${avg.toFixed(1)}</span>
      <div class="rev-stars">${starsHtml(avg)}</div>
      <span class="rev-count">${reviews.length} reseña${reviews.length !== 1 ? 's' : ''}</span>
    </div>` : '';

  const listHtml = hasReviews ? `
    <div class="rev-list">
      ${reviews.map(r => `
        <div class="rev-item">
          <div class="rev-header">
            <span class="rev-name">${r.name}</span>
            <div class="rev-stars">${starsHtml(r.stars)}</div>
            <span class="rev-date">${r.date}</span>
          </div>
          <p class="rev-comment">${r.comment}</p>
        </div>`).join('')}
    </div>` : `<p class="rev-empty">Aún no hay reseñas. Sé el primero en opinar.</p>`;

  sec.innerHTML = `
    <h2 class="pdp-section-title">Reseñas</h2>
    ${summaryHtml}
    ${listHtml}
    <form class="rev-form" id="revForm">
      <h3 class="rev-form-title">Dejar una reseña</h3>
      <div class="rev-form-row">
        <input type="text" class="rev-input" id="revName" placeholder="Tu nombre" required>
      </div>
      <div class="rev-star-pick" id="revStarPick">
        ${Array.from({ length: 5 }, (_, i) => `
          <button type="button" class="rev-star-btn" data-star="${i + 1}" aria-label="${i + 1} estrella${i > 0 ? 's' : ''}">
            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>`).join('')}
      </div>
      <div class="rev-form-row">
        <textarea class="rev-input rev-textarea" id="revComment" placeholder="Tu comentario..." required></textarea>
      </div>
      <button type="submit" class="pdp-buy-btn rev-submit">Enviar reseña</button>
    </form>`;

  let selectedStars = 0;
  const starBtns = sec.querySelectorAll('.rev-star-btn');

  function highlightStars(n) {
    starBtns.forEach((b, i) => b.classList.toggle('on', i < n));
  }

  starBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => highlightStars(parseInt(btn.dataset.star)));
    btn.addEventListener('mouseleave', () => highlightStars(selectedStars));
    btn.addEventListener('click', () => { selectedStars = parseInt(btn.dataset.star); highlightStars(selectedStars); });
  });

  $('revForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!selectedStars) { showToast('Por favor selecciona una calificación'); return; }
    const data = { name: $('revName').value.trim(), stars: selectedStars, comment: $('revComment').value.trim() };
    await submitReview(currentProductId, data);
    showToast('Función disponible próximamente');
    $('revForm').reset();
    selectedStars = 0;
    highlightStars(0);
  });
}

/* ── Not found ────────────────────────────────────────────────────────────── */
function showNotFound() {
  $('pdpGrid').innerHTML = `
    <div class="pdp-not-found">
      <p>Producto no encontrado.</p>
      <a href="index.html#catalogo" class="pdp-back">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        Volver al catálogo
      </a>
    </div>`;
}
