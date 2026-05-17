const EPS = 2;

function isScrollableY(el) {
  if (!el) return false;
  return el.scrollHeight > el.clientHeight + EPS;
}

function update(el) {
  if (!el) return;
  el.classList.toggle('is-scrollable-y', isScrollableY(el));
}

export function syncScrollablePanels() {
  const content = document.querySelector('.content');
  const navScroll = document.querySelector('.nav-scroll');
  update(content);
  update(navScroll);
}

let bound = false;

export function initScrollablePanels() {
  if (bound) {
    syncScrollablePanels();
    return;
  }
  bound = true;

  const content = document.querySelector('.content');
  const sidebar = document.getElementById('sidebar');
  const detail = document.getElementById('detail');
  const nav = document.getElementById('nav');

  const syncAll = () => syncScrollablePanels();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(syncAll);
    [content, sidebar, detail, nav].forEach((el) => {
      if (el) ro.observe(el);
    });
  }

  window.addEventListener('resize', syncAll, { passive: true });
  if (content) content.addEventListener('scroll', syncAll, { passive: true });

  syncScrollablePanels();
}
