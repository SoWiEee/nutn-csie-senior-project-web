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
    let previousRafTime = 0;
    const tick = (time) => {
      const lastLenisRafTime = lenis.time;
      if (window.NutnGlassDebug?.enabled && lastLenisRafTime > 0) {
        const gapMs = time - lastLenisRafTime;
        if (gapMs >= 100) {
          window.NutnGlassDebug.record('lenis-raf-gap', {
            gapMs: Math.round(gapMs),
            consecutiveLoopGapMs: previousRafTime > 0 ? Math.round(time - previousRafTime) : null,
            lastLenisRafTime: Math.round(lastLenisRafTime),
            isScrolling: lenis.isScrolling,
            scroll: Math.round(lenis.scroll || 0),
            animatedScroll: Math.round(lenis.animatedScroll || 0),
            targetScroll: Math.round(lenis.targetScroll || 0),
          });
        }
      }
      previousRafTime = time;
      lenis.raf(time);
      if (lenis.isScrolling === 'smooth') {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      frame = 0;
      previousRafTime = 0;
    };
    lenis.requestFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    const rebaseLenisClock = (reason) => {
      const now = performance.now();
      const previousTime = lenis.time;
      lenis.time = now;
      window.NutnGlassDebug?.record('lenis-clock-rebased', {
        reason,
        gapMs: previousTime ? Math.round(now - previousTime) : null,
        isScrolling: lenis.isScrolling,
      });
    };
    window.NutnLenis = lenis;
    lenis.on('virtual-scroll', ({ deltaX, deltaY, event }) => {
      if (window.NutnGlassDebug?.enabled) {
        window.NutnGlassDebug.record('lenis-input', {
          eventType: event?.type || null,
          deltaX: Math.round(deltaX || 0),
          deltaY: Math.round(deltaY || 0),
          timeSinceLastLenisRafMs: lenis.time ? Math.round(performance.now() - lenis.time) : null,
          isScrolling: lenis.isScrolling,
          scroll: Math.round(lenis.scroll || 0),
          targetScroll: Math.round(lenis.targetScroll || 0),
        });
      }
      if (lenis.isScrolling !== 'smooth') rebaseLenisClock('idle-input');
      lenis.requestFrame();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) rebaseLenisClock('visibility-resume');
    });
    window.addEventListener('focus', () => rebaseLenisClock('window-focus'));
    window.NutnGlassDebug?.record('lenis-ready', {
      canSmoothWheel,
      prefersReducedMotion,
      isIos: lenis.isIos,
    });
  } catch (error) {
    console.warn('Lenis smooth wheel is unavailable; keeping native scrolling.', error);
  }
} else {
  window.NutnGlassDebug?.record('lenis-skipped', {
    canSmoothWheel,
    prefersReducedMotion,
  });
}

initHeroRipple();
window.NutnLiquidGlass = LiquidGlass;
window.dispatchEvent(new Event('nutn-liquidglass-ready'));
