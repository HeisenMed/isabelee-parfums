/* cart.js */
let cart = [];
const $ = id => document.getElementById(id);
const fmt = n => n == null ? 'Consultar precio' : '$' + n.toLocaleString('es-CO') + ' COP';

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
  const total = cart.reduce((s, x) => s + x.qty, 0);
  const badge = $('cartBadge');
  badge.textContent = total;
  badge.classList.toggle('on', total > 0);
  $('cartTotalAmt').textContent = fmt(cart.reduce((s, x) => s + x.price * x.qty, 0));
  renderCartItems();
}
function renderCartItems() {
  const body = $('cartBody');
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
let toastT;
function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2800);
}
