const mobileNav = document.querySelector('#site-nav');

if (mobileNav) {
  const tabs = [...mobileNav.querySelectorAll('.view-tab')];
  const mobileWidth = window.matchMedia('(max-width: 48rem)');
  let start = null;

  mobileNav.addEventListener('touchstart', (event) => {
    start = mobileWidth.matches && event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }, { passive: true });

  mobileNav.addEventListener('touchend', (event) => {
    if (!start || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy) * 1.3) return;

    // Prevent the release tap from also activating the tab under the finger.
    event.preventDefault();
    const current = tabs.findIndex((tab) => tab.classList.contains('is-active'));
    if (current < 0) return;
    tabs[current + (dx < 0 ? 1 : -1)]?.click();
  }, { passive: false });

  mobileNav.addEventListener('touchcancel', () => { start = null; }, { passive: true });
}
