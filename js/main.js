/* main.js */
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  initFilterGroups();
  initSort();
  initSearch();
  initMobileFilter();
  applyFilters();
  initScroll();
  initHeader();
  initHamburger();
  initCart();
  initHeroSparkles();
  initAmbientSparkles();
  initWelcomeModal();
});

/* ── Modal de bienvenida ──────────────────────────────────────────────────
   Se abre 2s después de cargar y solo una vez por sesión: la marca queda en
   sessionStorage (no localStorage), así vuelve a verse en una visita nueva
   pero no molesta al navegar entre páginas o recargar. */
const WELCOME_KEY = 'isabelee-welcome';
let welcomeLastFocus = null;

function initWelcomeModal() {
  const overlay = document.getElementById('welcomeOverlay');
  if (!overlay) return;

  try {
    if (sessionStorage.getItem(WELCOME_KEY)) return;   // ya se mostró en esta sesión
  } catch (e) { /* sessionStorage bloqueado: se muestra igual */ }

  setTimeout(openWelcome, 2000);

  document.getElementById('welcomeClose').addEventListener('click', closeWelcome);
  document.getElementById('welcomeContinue').addEventListener('click', closeWelcome);
  // Clic en el fondo oscuro, pero no dentro del modal
  overlay.addEventListener('click', e => { if (e.target === overlay) closeWelcome(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('on')) closeWelcome();
  });
}

function openWelcome() {
  const overlay = document.getElementById('welcomeOverlay');
  if (!overlay) return;

  try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch (e) {}

  welcomeLastFocus = document.activeElement;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  // Fuerza un reflow para que la transición de opacidad/scale sí se dispare
  void overlay.offsetWidth;
  overlay.classList.add('on');
  document.getElementById('welcomeClose').focus();
}

function closeWelcome() {
  const overlay = document.getElementById('welcomeOverlay');
  if (!overlay || !overlay.classList.contains('on')) return;

  overlay.classList.remove('on');          // fade-out de 0.3s (ver CSS)
  document.body.style.overflow = '';
  setTimeout(() => { overlay.hidden = true; }, 300);
  if (welcomeLastFocus) welcomeLastFocus.focus();
}

function initHeader() {
  const hdr = document.getElementById('hdr');
  window.addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 20), { passive: true });
}

function initHamburger() {
  const hbg = document.getElementById('hbg');
  const mob = document.getElementById('mobMenu');
  if (hbg && mob) {
    hbg.addEventListener('click', () => { mob.classList.toggle('open'); hbg.classList.toggle('open'); });
  }
}

function initCart() {
  const btn = document.getElementById('cartBtn');
  if (btn) btn.addEventListener('click', openCart);
  document.getElementById('cartScrim').addEventListener('click', closeCart);
}

function initScroll() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

function submitNL(e) {
  e.preventDefault();
  showToast('¡Suscrito! Bienvenido/a a Isabeleé.');
  e.target.reset();
}

function closeMob() {
  document.getElementById('mobMenu').classList.remove('open');
  document.getElementById('hbg').classList.remove('open');
}

function initHeroSparkles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  let last = 0;
  hero.addEventListener('mousemove', e => {
    const now = Date.now();
    if (now - last < 28) return;
    last = now;
    const r = hero.getBoundingClientRect();
    spawnSparkles(hero, e.clientX - r.left, e.clientY - r.top);
  });
}

function spawnSparkles(hero, x, y) {
  const count = Math.floor(Math.random() * 3) + 2;
  const palette = ['#C9A96E', '#D4B883', '#E8D5A3', 'rgba(255,255,255,0.85)'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    const size = Math.random() * 8 + 3;
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * 26;
    const color = palette[Math.floor(Math.random() * palette.length)];
    const dur   = (Math.random() * 0.55 + 0.65).toFixed(2);
    const delay = (Math.random() * 0.08).toFixed(2);
    const isStar = Math.random() > 0.45;
    el.className = 'hero-sparkle' + (isStar ? ' hero-sparkle-star' : '');
    el.style.cssText = [
      `left:${x + Math.cos(angle) * dist - size / 2}px`,
      `top:${y + Math.sin(angle) * dist - size / 2}px`,
      `width:${size}px`,
      `height:${size}px`,
      `background:${color}`,
      `box-shadow:0 0 ${size + 2}px ${color}`,
      `animation-duration:${dur}s`,
      `animation-delay:${delay}s`
    ].join(';');
    hero.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}

/* Destellos ambientales automáticos: visibles en mobile y desktop,
   independientes del cursor. CSS animations + JS mínimo (sin canvas). */
function initAmbientSparkles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let container = hero.querySelector('.hero-ambient');
  if (!container) {
    container = document.createElement('div');
    container.className = 'hero-ambient';
    container.setAttribute('aria-hidden', 'true');
    hero.insertBefore(container, hero.firstChild);
  }

  const palette = ['#C9A84C', '#e8d48b', '#fff8e1'];
  const MAX = 20;

  function spawn() {
    if (document.hidden) return;                       // no acumular en pestaña oculta
    if (container.childElementCount >= MAX) return;    // no saturar
    const el = document.createElement('span');
    const size  = (Math.random() * 3 + 2).toFixed(1);          // 2-5px
    const glow  = Math.random() < 0.35;                        // ~1/3 con brillo
    const color = palette[Math.floor(Math.random() * palette.length)];
    const dur   = (Math.random() * 2 + 2).toFixed(2);          // 2-4s
    const drift = (Math.random() * 30 - 15).toFixed(0) + 'px'; // deriva horizontal sutil
    el.className = 'ambient-sparkle' + (glow ? ' ambient-sparkle--glow' : '');
    el.style.cssText = [
      `left:${(Math.random() * 100).toFixed(2)}%`,
      `top:${(Math.random() * 100).toFixed(2)}%`,
      `width:${size}px`,
      `height:${size}px`,
      `--spark-color:${color}`,
      `--drift:${drift}`,
      `animation-duration:${dur}s,${dur}s`
    ].join(';');
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  for (let i = 0; i < 14; i++) spawn();   // relleno inicial
  setInterval(spawn, 190);                 // ~17 partículas en régimen estable
}
