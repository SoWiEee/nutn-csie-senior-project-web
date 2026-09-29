const mobileNav = document.querySelector('#site-nav');

if (mobileNav) {
  const track = mobileNav.querySelector('.site-nav-tabs');
  const tabs = [...mobileNav.querySelectorAll('.view-tab')];
  const mobileWidth = window.matchMedia('(max-width: 48rem)');
  let gesture = null;
  let suppressClickFrom = null;

  const clearGesture = () => {
    if (!gesture) return;
    clearTimeout(gesture.holdTimer);
    track.classList.remove('is-dragging');
    track.style.removeProperty('--nav-drag-x');
    gesture = null;
  };

  mobileNav.addEventListener('pointerdown', (event) => {
    if (!mobileWidth.matches || event.pointerType === 'mouse' || !event.isPrimary) return;
    const tab = event.target.closest('.view-tab');
    if (!tab) return;
    const activeIndex = tabs.findIndex((item) => item.classList.contains('is-active'));
    if (activeIndex < 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, activeIndex, dragging: false, holdTimer: null, tab };
    tab.setPointerCapture(event.pointerId);
    if (tab === tabs[activeIndex]) {
      gesture.holdTimer = setTimeout(() => {
        if (!gesture || gesture.id !== event.pointerId) return;
        gesture.dragging = true;
        track.style.setProperty('--nav-drag-x', `${tabs[activeIndex].offsetLeft}px`);
        track.classList.add('is-dragging');
      }, 220);
    }
  });

  mobileNav.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearTimeout(gesture.holdTimer);
      return;
    }
    const offset = Math.max(tabs[0].offsetLeft, Math.min(tabs.at(-1).offsetLeft, tabs[gesture.activeIndex].offsetLeft + dx));
    track.style.setProperty('--nav-drag-x', `${offset}px`);
  });

  mobileNav.addEventListener('pointerup', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const { x, y, activeIndex, dragging, tab } = gesture;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    clearGesture();
    let next = activeIndex;
    if (dragging) {
      next = tabs.reduce((closest, item, index) =>
        Math.abs(item.getBoundingClientRect().left + item.offsetWidth / 2 - event.clientX) <
        Math.abs(tabs[closest].getBoundingClientRect().left + tabs[closest].offsetWidth / 2 - event.clientX)
          ? index : closest, activeIndex);
    } else if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      next = Math.max(0, Math.min(tabs.length - 1, activeIndex + (dx < 0 ? 1 : -1)));
    } else {
      return;
    }
    // The native release click still targets the tab where the gesture began.
    suppressClickFrom = tab;
    setTimeout(() => { suppressClickFrom = null; }, 0);
    if (next !== activeIndex) tabs[next].click();
  });

  mobileNav.addEventListener('pointercancel', clearGesture);
  mobileNav.addEventListener('click', (event) => {
    if (suppressClickFrom && event.isTrusted && event.target.closest('.view-tab') === suppressClickFrom) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}
