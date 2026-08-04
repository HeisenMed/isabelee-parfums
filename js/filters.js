/* filters.js */

/* Campo real del perfume detrás de cada grupo del sidebar.
   OJO: 'familia' filtra por familia_olfativa (la familia real de la fragancia);
   el campo p.familia solo marca "Unisex" y no sirve para filtrar. */
const FILTER_FIELD = { categoria: 'category', marca: 'brand', familia: 'familia_olfativa' };

let activeFilters = { categoria: [], marca: [], familia: [], precio: { min: 0, max: Infinity } };
let searchQuery = '';
let sortBy = 'default';

function getFilteredProducts() {
  return window.PERFUMES.filter(p => {
    const catOk = !activeFilters.categoria.length || activeFilters.categoria.includes(p.category);
    const marcaOk = !activeFilters.marca.length || activeFilters.marca.includes(p.brand);
    const familiaOk = !activeFilters.familia.length || activeFilters.familia.includes(p.familia_olfativa);
    /* price null = "Consultar precio" (precio aún no definido), no es un precio de 0:
       nunca se excluye por rango, si no el catálogo entero desaparecería. */
    const precioOk = p.price == null ||
      (p.price >= activeFilters.precio.min && p.price <= activeFilters.precio.max);
    const searchOk = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.brand.toLowerCase().includes(searchQuery);
    return catOk && marcaOk && familiaOk && precioOk && searchOk;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return a.id - b.id;
  });
}

function applyFilters() { renderProducts(getFilteredProducts()); }

function buildSidebar() {
  buildCheckGroup('filterCategorias', 'categoria', {hombre:'Hombre',mujer:'Mujer',unisex:'Unisex'});
  buildCheckGroup('filterMarcas', 'marca', {});
  buildCheckGroup('filterFamilias', 'familia', {});

  document.getElementById('priceMin').placeholder = '0';
  document.getElementById('priceMax').placeholder = '900.000';
}

/* Genera las opciones a partir de los valores reales del catálogo, descartando
   nulos y vacíos (antes se colaba una casilla rotulada literalmente "null"). */
function buildCheckGroup(containerId, filterKey, labels) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const field = FILTER_FIELD[filterKey];
  const values = [...new Set(window.PERFUMES.map(p => p[field]))]
    .filter(v => v != null && v !== '')
    .sort((a, b) => a.localeCompare(b, 'es'));   // orden correcto con acentos

  container.innerHTML = values.map(v => {
    const count = window.PERFUMES.filter(p => p[field] === v).length;
    const label = labels[v] || v;
    return `<label class="filter-check">
      <input type="checkbox" value="${v}" data-filter="${filterKey}" onchange="onCheckChange(this)">
      <span>${label}</span>
      <span class="count">${count}</span>
    </label>`;
  }).join('');
}

function onCheckChange(input) {
  const arr = activeFilters[input.dataset.filter];
  if (!arr) return;
  if (input.checked) arr.push(input.value);
  else { const i = arr.indexOf(input.value); if (i > -1) arr.splice(i, 1); }
  applyFilters();
}

function applyPriceFilter() {
  const min = parseFloat(document.getElementById('priceMin').value.replace(/\D/g,'')) || 0;
  const max = parseFloat(document.getElementById('priceMax').value.replace(/\D/g,'')) || Infinity;
  activeFilters.precio = { min, max };
  applyFilters();
}

function clearAllFilters() {
  activeFilters = { categoria: [], marca: [], familia: [], precio: { min: 0, max: Infinity } };
  searchQuery = '';
  document.querySelectorAll('.filter-check input').forEach(el => el.checked = false);
  document.getElementById('priceMin').value = '';
  document.getElementById('priceMax').value = '';
  const si = document.getElementById('navSearch');
  if (si) si.value = '';
  applyFilters();
}

function initFilterGroups() {
  document.querySelectorAll('.filter-group').forEach(group => {
    const head = group.querySelector('.filter-group-head');
    if (head) head.addEventListener('click', () => group.classList.toggle('open'));
  });
}

function initSort() {
  const sel = document.getElementById('sortSelect');
  if (sel) sel.addEventListener('change', () => { sortBy = sel.value; applyFilters(); });
}

function initSearch() {
  const inp = document.getElementById('navSearch');
  if (inp) inp.addEventListener('input', e => { searchQuery = e.target.value.toLowerCase().trim(); applyFilters(); });
}

function initMobileFilter() {
  const btn = document.getElementById('mobFilterBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (btn) btn.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('on'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('on'); });
}
