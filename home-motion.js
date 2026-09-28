(() => {
  const hero = document.querySelector('#view-home .hero');
  const trace = hero?.querySelector('.hero__signal-trace');
  const signal = hero?.querySelector('.hero__signal svg');
  const mark = hero?.querySelector('.hero__edition-mark');
  const intro = document.querySelector('#view-home .home-intro');
  const gsap = window.gsap;
  if (!hero || !trace || !signal || !mark || !gsap) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (reduceMotion.matches) return;

  let played = false;
  const playEntrance = () => {
    if (played || document.body.dataset.view !== 'home') return;
    played = true;
    const length = trace.getTotalLength();
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(trace, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.45 })
      .fromTo('.hero__signal-origin, .hero__signal-target', { opacity: 0, scale: 0.5, transformOrigin: 'center center' }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.16 }, '-=0.65')
      .fromTo(mark, { opacity: 0, x: 24 }, { opacity: 0.6, x: 0, duration: 0.8 }, '-=1.05');
  };

  playEntrance();
  new MutationObserver(playEntrance).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });

  if (finePointer.matches) {
    const moveSignalX = gsap.quickTo(signal, 'x', { duration: 0.8, ease: 'power3.out' });
    const moveSignalY = gsap.quickTo(signal, 'y', { duration: 0.8, ease: 'power3.out' });
    const moveMarkX = gsap.quickTo(mark, 'x', { duration: 0.9, ease: 'power3.out' });
    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || document.body.dataset.view !== 'home') return;
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      moveSignalX(x * 22);
      moveSignalY(y * 16);
      moveMarkX(x * -18);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      moveSignalX(0);
      moveSignalY(0);
      moveMarkX(0);
    });
  }

  if (intro) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      gsap.fromTo(intro.querySelectorAll('.home-intro__quote'),
        { opacity: 0.55, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' });
    }, { threshold: 0.15 });
    observer.observe(intro);
  }
})();
