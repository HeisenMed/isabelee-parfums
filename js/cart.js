/* cart.js */
const $ = id => document.getElementById(id);
const fmt = n => n == null ? 'Consultar precio' : '$' + n.toLocaleString('es-CO') + ' COP';

/* ── Persistencia en localStorage ──────────────────────────────────────────
   Claves del proyecto: isabelee-cart, isabelee-wish, isabelee-theme.
   Se guarda solo lo mínimo ({id, qty} y una lista de ids): el resto del
   perfume se rehidrata desde window.PERFUMES en cada carga, así un cambio de
   precio o de imagen en el catálogo se refleja sin datos viejos pegados.
   cart.js se carga en index.html y en producto.html, por eso el estado es
   compartido entre ambas páginas. */
const LS_CART = 'isabelee-cart';
const LS_WISH = 'isabelee-wish';

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch (e) { return null; }          // localStorage bloqueado o JSON corrupto
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { /* modo privado o sin cuota: la sesión sigue viva en memoria */ }
}

function loadCart() {
  const saved = lsGet(LS_CART);
  if (!Array.isArray(saved) || !window.PERFUMES) return [];
  return saved.reduce((acc, item) => {
    const p = window.PERFUMES.find(x => x.id === item.id);
    const qty = parseInt(item.qty, 10);
    if (p && qty > 0) acc.push({ ...p, qty });   // descarta ids que ya no existen
    return acc;
  }, []);
}
function saveCart() { lsSet(LS_CART, cart.map(x => ({ id: x.id, qty: x.qty }))); }

function loadWish() {
  const saved = lsGet(LS_WISH);
  return new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'number') : []);
}
function saveWish() { lsSet(LS_WISH, [...wish]); }

let cart = loadCart();
let wish = loadWish();   // única fuente de verdad de favoritos (catálogo y ficha)

/* ── Carrito ──────────────────────────────────────────────────────────────── */
function addCart(id) {
  const p = window.PERFUMES.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty++;
  else cart.push({...p, qty: 1});
  syncCart();
  showToast(p.name + ' agregado al carrito');
}
function addCartQty(id, qty) {
  const p = window.PERFUMES.find(x => x.id === id);
  if (!p || qty < 1) return;
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty += qty;
  else cart.push({...p, qty});
  syncCart();
  showToast(p.name + ' agregado al carrito');
}
function rmCart(id) {
  cart = cart.filter(x => x.id !== id);
  syncCart();
}
function syncCart() {
  saveCart();                          // persiste tras cada mutación
  const total = cart.reduce((s, x) => s + x.qty, 0);
  const badge = $('cartBadge');
  if (badge) {
    badge.textContent = total;
    badge.classList.toggle('on', total > 0);
  }
  const amt = $('cartTotalAmt');
  if (amt) amt.textContent = fmt(cart.reduce((s, x) => s + x.price * x.qty, 0));
  renderCartItems();
}
function renderCartItems() {
  const body = $('cartBody');
  if (!body) return;
  if (!cart.length) {
    body.innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg><p>Tu carrito está vacío</p></div>';
    return;
  }
  body.innerHTML = cart.map(x => `
    <div class="cart-item">
      <div class="ci-img"><img src="${x.image}" alt="${x.name}" loading="lazy"></div>
      <div class="ci-info">
        <p class="ci-brand">${x.brand}</p>
        <p class="ci-name">${x.name} <span style="color:var(--gray-500);font-size:14px">×${x.qty}</span></p>
        <p class="ci-price">${fmt(x.price * x.qty)}</p>
        <button class="ci-rm" onclick="rmCart(${x.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Eliminar</button>
      </div>
    </div>`).join('');
}
function openCart() {
  $('cartDrawer').classList.add('on');
  $('cartScrim').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  $('cartDrawer').classList.remove('on');
  $('cartScrim').classList.remove('on');
  document.body.style.overflow = '';
}
function checkout() {
  if (!cart.length) { showToast('Tu carrito está vacío'); return; }
  const lines = cart.map(x => `• ${x.brand} ${x.name} (${x.volume}) ×${x.qty} = ${fmt(x.price * x.qty)}`).join('\n');
  const total = fmt(cart.reduce((s, x) => s + x.price * x.qty, 0));
  const msg = encodeURIComponent(`¡Hola! Quisiera hacer el siguiente pedido:\n\n${lines}\n\nTotal: ${total}\n\n¿Me pueden confirmar disponibilidad?`);
  window.open(`https://wa.me/573011431065?text=${msg}`, '_blank');
}

/* ── Favoritos ────────────────────────────────────────────────────────────
   Compartidos entre el catálogo (products.js) y la ficha (producto.js).
   Devuelve el nuevo estado para que quien llame actualice su botón. */
function toggleWishId(id) {
  const on = !wish.has(id);
  if (on) wish.add(id); else wish.delete(id);
  saveWish();
  showToast(on ? 'Agregado a favoritos ♡' : 'Eliminado de favoritos');
  return on;
}

/* ── Tema claro / oscuro ──────────────────────────────────────────────────
   El tema ya se aplicó en el <head> de cada página (script inline, evita el
   parpadeo). Aquí solo se alterna y se persiste, con una única definición
   compartida por index.html y producto.html. */
const LS_THEME = 'isabelee-theme';

function toggleDark() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  if (isDark) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = 'dark';
  /* Se guarda como string plano (no JSON) para reusar la clave isabelee-theme
     tal como ya existía; lsSet la envolvería en comillas y la rompería. */
  try { localStorage.setItem(LS_THEME, isDark ? 'light' : 'dark'); } catch (e) {}
  syncDarkToggle();
}

function syncDarkToggle() {
  const btn = $('darkToggle');
  if (!btn) return;
  const isDark = document.documentElement.dataset.theme === 'dark';
  btn.setAttribute('aria-pressed', isDark);
  btn.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
}

/* Pinta el estado persistido en cuanto el DOM está listo, en ambas páginas. */
document.addEventListener('DOMContentLoaded', () => {
  syncCart();
  syncDarkToggle();
});

let toastT;
function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2800);
}
