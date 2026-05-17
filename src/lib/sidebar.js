import { BREAKPOINTS } from '../config.js';
import { ICONS } from '../icons.js';

const OPEN_NAV = 'Otvori navigaciju';
const CLOSE_NAV = 'Zatvori navigaciju';
const EXPAND_NAV = 'Proširi navigaciju';
const COLLAPSE_NAV = 'Skupi navigaciju';

/** @type {(() => void) | null} */
let removeMobileTouchLock = null;

export function clearMobileDrawerTouchLock() {
  removeMobileTouchLock?.();
}

export function initSidebar() {
  const toggles = () => document.querySelectorAll('.js-sidebar-toggle');
  const overlay = document.getElementById('sidebarOverlay');
  const iconSpans = () => document.querySelectorAll('.js-sidebar-toggle .sidebar-toggle__icon');

  function isMobile() {
    return window.innerWidth <= BREAKPOINTS.mobile;
  }

  function installMobileTouchLock() {
    if (!isMobile() || removeMobileTouchLock) return;
    const sidebar = document.getElementById('sidebar');
    /** @param {TouchEvent} e */
    const onTouchMove = (e) => {
      const t = e.target;
      if (sidebar && t instanceof Node && sidebar.contains(t)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    removeMobileTouchLock = () => {
      document.removeEventListener('touchmove', onTouchMove);
      removeMobileTouchLock = null;
    };
  }

  function clearMobileTouchLock() {
    removeMobileTouchLock?.();
  }

  function updateIcons() {
    let svg;
    if (isMobile()) {
      svg = document.body.classList.contains('sidebar-open') ? ICONS.panelClose : ICONS.panelOpen;
    } else {
      const collapsed = document.body.classList.contains('sidebar-collapsed');
      svg = collapsed ? ICONS.panelOpen : ICONS.panelClose;
    }
    iconSpans().forEach((el) => {
      el.innerHTML = svg;
    });
  }

  function syncLabels() {
    const mobile = isMobile();
    const drawerOpen = document.body.classList.contains('sidebar-open');
    const collapsed = document.body.classList.contains('sidebar-collapsed');

    toggles().forEach((btn) => {
      const peek = btn.classList.contains('sidebar-toggle--peek');
      let label;
      let title;
      if (mobile) {
        label = drawerOpen ? CLOSE_NAV : OPEN_NAV;
        title = label;
      } else if (peek) {
        label = EXPAND_NAV;
        title = EXPAND_NAV;
      } else {
        label = collapsed ? EXPAND_NAV : COLLAPSE_NAV;
        title = label;
      }
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', title);
    });
  }

  function closeOverlay() {
    clearMobileTouchLock();
    document.body.classList.remove('sidebar-open');
    overlay?.classList.remove('visible');
    overlay?.setAttribute('aria-hidden', 'true');
    syncLabels();
    updateIcons();
  }

  function openOverlay() {
    document.body.classList.add('sidebar-open');
    overlay?.classList.add('visible');
    overlay?.setAttribute('aria-hidden', 'false');
    installMobileTouchLock();
    syncLabels();
    updateIcons();
  }

  function toggleOverlay() {
    if (document.body.classList.contains('sidebar-open')) closeOverlay();
    else openOverlay();
  }

  function toggleCollapse() {
    document.body.classList.toggle('sidebar-collapsed');
    syncLabels();
    updateIcons();
  }

  function handleToggle() {
    if (isMobile()) toggleOverlay();
    else toggleCollapse();
  }

  updateIcons();
  syncLabels();

  toggles().forEach((btn) => {
    btn.addEventListener('click', handleToggle);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    });
  });

  overlay?.addEventListener('click', closeOverlay);

  const sidebar = document.getElementById('sidebar');
  sidebar?.addEventListener('click', (e) => {
    if (e.target.closest('a') && isMobile()) closeOverlay();
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) closeOverlay();
    syncLabels();
    updateIcons();
  });
}
