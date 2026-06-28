/* filters.js */
let activeFilters = { categoria: [], marca: [], familia: [], precio: { min: 0, max: Infinity } };
let searchQuery = '';
let sortBy = 'default';

function getFilteredProducts() {
  return window.PERFUMES.filter(p => {
    const catOk = !activeFilters.categoria.length || activeFilters.categoria.includes(p.category);
    const marcaOk = !activeFilters.marca.length || activeFilters.marca.includes(p.brand);
    const familiaOk = !activeFilters.familia.length || activeFilters.familia.includes(p.familia);
    const precioOk = p.price >= activeFilters.precio.min && p.price <= activeFilters.precio.max;
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
  const categorias = [...new Set(window.PERFUMES.map(p => p.category))];
  const marcas = [...new Set(window.PERFUMES.map(p => p.brand))].sort();
  const familias = [...new Set(window.PERFUMES.map(p => p.familia))].sort();

  buildCheckGroup('filterCategorias', categorias, 'categoria', {hombre:'Hombre',mujer:'Mujer',unisex:'Unisex'});
  buildCheckGroup('filterMarcas', marcas, 'marca', {});
  buildCheckGroup('filterFamilias', familias, 'familia', {});

  document.getElementById('priceMin').placeholder = '0';
  document.getElementById('priceMax').placeholder = '900.000';
}

function buildCheckGroup(containerId, values, filterKey, labels) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = values.map(v => {
    const count = window.PERFUMES.filter(p => p[filterKey === 'categoria' ? 'category' : filterKey === 'marca' ? 'brand' : 'familia'] === v).length;
    const label = labels[v] || v;
    return `<label class="filter-check">
      <input type="checkbox" value="${v}" data-filter="${filterKey}" onchange="onCheckChange(this)">
      <span>${label}</span>
      <span class="count">${count}</span>
    </label>`;
  }).join('');
}

function onCheckChange(input) {
  const key = input.dataset.filter;
  const arr = activeFilters[key === 'categoria' ? 'categoria' : key === 'marca' ? 'marca' : 'familia'];
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
