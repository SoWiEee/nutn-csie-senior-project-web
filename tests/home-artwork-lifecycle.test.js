const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  const events = {};
  const frames = new Map();
  const classes = new Set();
  const media = { matches: true, addEventListener: (_, callback) => { events.media = callback; } };
  let heroIntersection;
  let viewChange;
  let nextFrame = 0;
  let loadedImages = 0;
  const artwork = {
    querySelector: () => ({ style: {} }),
    classList: {
      contains: (name) => classes.has(name), add: (name) => classes.add(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
  };
  const document = {
    hidden: false, hasFocus: () => true, body: { dataset: { view: 'projects' } },
    querySelector: (selector) => selector === '[data-home-artwork]' ? artwork
      : selector.includes('.hero') ? { offsetHeight: 900 } : { classList: { add() {} } },
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  const window = {
    innerWidth: 1440, innerHeight: 900, scrollY: 0,
    matchMedia: () => media,
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'home-artwork-motion.js'), 'utf8'), {
    document, window,
    Image: class { set src(_) { loadedImages++; this.onload(); } },
    IntersectionObserver: class { constructor(callback) { heroIntersection = callback; } observe() {} },
    MutationObserver: class { constructor(callback) { viewChange = callback; } observe() {} },
    requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  heroIntersection([{ isIntersecting: true }]);
  events.pointermove({ pointerType: 'mouse', clientX: 1200, clientY: 600 });
  events.scroll();
  assert.equal(loadedImages, 0, 'other views must not preload the moving hero layers');
  assert.equal(frames.size, 0, 'other views must not schedule parallax work');

  document.body.dataset.view = 'home';
  viewChange();
  await new Promise(setImmediate);
  assert.equal(loadedImages, 2, 'the visible desktop hero loads both layers once');
  assert.ok(classes.has('is-active'));
  for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
  events.pointermove({ pointerType: 'mouse', clientX: 1200, clientY: 600 });
  assert.equal(frames.size, 1);
  heroIntersection([{ isIntersecting: false }]);
  assert.equal(frames.size, 0, 'leaving the hero cancels pending motion');
  assert.ok(!classes.has('is-active'), 'the offscreen sweep is paused');

  heroIntersection([{ isIntersecting: true }]);
  document.hidden = true;
  events.visibilitychange();
  assert.equal(frames.size, 0, 'hidden browser tabs cancel pending motion');
  document.hidden = false;
  events.visibilitychange();
  media.matches = false;
  events.media();
  assert.equal(frames.size, 0, 'reduced motion or mobile layout cancels pending motion');
  assert.ok(!classes.has('is-active'));
  console.log('Hero lifecycle: inactive, offscreen, hidden, and reduced-motion states schedule no frames.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
