const artwork = document.querySelector('[data-home-artwork]');
const hero = document.querySelector('#view-home .hero');
const backdrop = document.querySelector('[data-site-backdrop]');
const motionMedia = window.matchMedia('(min-width: 48.01rem) and (prefers-reduced-motion: no-preference)');

if (artwork && hero && backdrop) {
  const people = artwork.querySelector('.home-artwork__layer--people');
  const signal = artwork.querySelector('.home-artwork__layer--signal');
  const tree = artwork.querySelector('.home-artwork__layer--tree');
  const state = { x: 0, y: 0, scroll: 0 };
  const target = { x: 0, y: 0, scroll: 0 };
  let frame = 0;
  let loading = false;

  const paint = () => {
    frame = 0;
    if (document.body.dataset.view !== 'home' || !motionMedia.matches) return;
    for (const key of Object.keys(state)) state[key] += (target[key] - state[key]) * 0.12;
    const { x, y, scroll } = state;
    people.style.transform = `translate3d(${(x * 5 - scroll * 3).toFixed(2)}px, ${(y * 3 + scroll * 2).toFixed(2)}px, 0)`;
    signal.style.transform = `translate3d(${(x * 8 + scroll * 4).toFixed(2)}px, ${(y * 5 - scroll * 4).toFixed(2)}px, 0)`;
    tree.style.transform = `translate3d(${(-x * 7 + scroll * 6).toFixed(2)}px, ${(-y * 5 - scroll * 3).toFixed(2)}px, 0)`;
    if (Object.keys(state).some((key) => Math.abs(target[key] - state[key]) > 0.01)) frame = requestAnimationFrame(paint);
  };

  const update = () => { if (!frame && artwork.classList.contains('is-ready')) frame = requestAnimationFrame(paint); };
  const onScroll = () => {
    target.scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(hero.offsetHeight, 1)));
    artwork.classList.toggle('is-active', document.visibilityState === 'visible' && window.scrollY < hero.offsetHeight);
    update();
  };

  const load = async () => {
    if (!motionMedia.matches || loading || artwork.classList.contains('is-ready')) return;
    loading = true;
    try {
      await Promise.all(['assets/home-key-visual-motion-plate.png', 'assets/home-key-visual-motion-foreground.png'].map((src) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = reject;
        image.src = src;
      })));
      artwork.classList.add('is-ready');
      backdrop.classList.add('has-home-artwork');
      onScroll();
    } catch {
      // Keep the original illustration if either layer fails to load.
    } finally {
      loading = false;
    }
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    target.x = event.clientX / window.innerWidth * 2 - 1;
    target.y = event.clientY / window.innerHeight * 2 - 1;
    update();
  }, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onScroll);
  window.addEventListener('blur', () => { target.x = 0; target.y = 0; update(); });
  motionMedia.addEventListener('change', load);
  load();
}
