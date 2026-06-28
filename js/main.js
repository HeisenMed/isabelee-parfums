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
  initDarkMode();
  initHeroSparkles();
});

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

function initDarkMode() {
  if (localStorage.getItem('isabelee-theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  }
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

function toggleDark() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  if (isDark) {
    delete document.documentElement.dataset.theme;
    localStorage.setItem('isabelee-theme', 'light');
  } else {
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('isabelee-theme', 'dark');
  }
}
