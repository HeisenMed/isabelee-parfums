/* ============================================================
   SEARCH.JS — Real-time debounced product search
   ============================================================ */

const Search = (() => {

  let debounceTimer;

  /* ── Debounce helper ── */
  function debounce(fn, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  }

  /* ── Highlight matching text in a string ── */
  function highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark style="background:rgba(201,169,110,.35);color:inherit;padding:0 2px;">$1</mark>');
  }

  /* ── Desktop search bar ── */
  function initDesktop() {
    const form  = document.getElementById('searchForm');
    const input = document.getElementById('searchInput');
    const clear = document.getElementById('searchClear');
    if (!form || !input) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (clear) clear.style.display = q ? 'flex' : 'none';
      debounce(() => {
        Filters.setState({ search: q });
      }, 280);
    });

    if (clear) {
      clear.addEventListener('click', () => {
        input.value = '';
        clear.style.display = 'none';
        Filters.setState({ search: '' });
        input.focus();
      });
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      Filters.setState({ search: input.value.trim() });
    });
  }

  /* ── Mobile search overlay ── */
  function initMobile() {
    const toggleBtn = document.getElementById('mobileSearchBtn');
    const overlay   = document.getElementById('searchOverlay');
    const overlayInput = document.getElementById('overlaySearchInput');
    const closeBtn  = document.getElementById('closeSearchOverlay');

    if (!toggleBtn || !overlay) return;

    toggleBtn.addEventListener('click', () => {
      overlay.classList.add('open');
      setTimeout(() => overlayInput && overlayInput.focus(), 100);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    }

    if (overlayInput) {
      overlayInput.addEventListener('input', () => {
        debounce(() => {
          Filters.setState({ search: overlayInput.value.trim() });
        }, 280);
      });
    }

    /* Close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') overlay.classList.remove('open');
    });
  }

  /* ── Apply search to product list ── */
  function filterBySearch(products, query) {
    if (!query) return products;
    const q = query.toLowerCase();
    return products.filter(p =>
      p.brand.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)  ||
      p.description.toLowerCase().includes(q)
    );
  }

  /* ── Sync search input with current state ── */
  function syncInput(value) {
    const desktop = document.getElementById('searchInput');
    const mobile  = document.getElementById('overlaySearchInput');
    const clear   = document.getElementById('searchClear');
    if (desktop) desktop.value = value;
    if (mobile)  mobile.value  = value;
    if (clear)   clear.style.display = value ? 'flex' : 'none';
  }

  function init() {
    initDesktop();
    initMobile();
  }

  return { init, filterBySearch, highlight, syncInput };

})();
