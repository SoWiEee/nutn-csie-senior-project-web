const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const listeners = {};
const clicks = [];
let active = 0;
const mobile = { matches: true };
const tabs = Array.from({ length: 3 }, (_, index) => ({
  classList: { contains: (name) => name === 'is-active' && active === index },
  click: () => { active = index; clicks.push(index); },
}));
const nav = {
  querySelectorAll: () => tabs,
  addEventListener: (name, listener) => { listeners[name] = listener; },
};
const source = fs.readFileSync(path.join(__dirname, '..', 'mobile-nav-swipe.js'), 'utf8');
vm.runInNewContext(source, {
  document: { querySelector: () => nav },
  window: { matchMedia: () => mobile },
});

const swipe = (dx, dy = 0) => {
  listeners.touchstart({ touches: [{ clientX: 100, clientY: 100 }] });
  let prevented = false;
  listeners.touchend({
    changedTouches: [{ clientX: 100 + dx, clientY: 100 + dy }],
    preventDefault: () => { prevented = true; },
  });
  return prevented;
};

assert.equal(swipe(-60), true);
assert.equal(active, 1, 'left swipe opens the next tab');
assert.equal(swipe(-60), true);
assert.equal(active, 2);
assert.equal(swipe(-60), true);
assert.deepEqual(clicks, [1, 2], 'swiping past the last tab does not wrap');
assert.equal(swipe(60), true);
assert.equal(active, 1, 'right swipe opens the previous tab');
assert.equal(swipe(8, 75), false, 'vertical scrolling remains native');
assert.equal(swipe(-20), false, 'small movements remain taps');
mobile.matches = false;
assert.equal(swipe(-60), false, 'desktop touches do not switch pages');
assert.deepEqual(clicks, [1, 2, 1]);
