import Lenis from './vendor/lenis/dist/lenis.mjs';
import { LiquidGlass } from './vendor/liquidglass/index.js';
import { initHeroRipple } from './hero-ripple.js';
import './script.js';

const canSmoothWheel = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canSmoothWheel && !prefersReducedMotion) {
  try {
    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
    });
    let frame = 0;
    const tick = (time) => {
      lenis.raf(time);
      if (lenis.isScrolling === 'smooth') {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      frame = 0;
    };
    lenis.requestFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    lenis.on('virtual-scroll', lenis.requestFrame);
    window.NutnLenis = lenis;
  } catch (error) {
    console.warn('Lenis smooth wheel is unavailable; keeping native scrolling.', error);
  }
}

initHeroRipple();
window.NutnLiquidGlass = LiquidGlass;
window.dispatchEvent(new Event('nutn-liquidglass-ready'));
