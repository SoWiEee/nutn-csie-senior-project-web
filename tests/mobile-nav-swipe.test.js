const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const listeners = {};
const timers = new Map();
const clicks = [];
let nextTimer = 0;
let active = 0;
let dragX = null;
const mobile = { matches: true };
const tabs = Array.from({ length: 3 }, (_, index) => ({
  offsetLeft: index * 100,
  offsetWidth: 96,
  getBoundingClientRect: () => ({ left: index * 100 }),
  classList: { contains: (name) => name === 'is-active' && active === index },
  closest(selector) { return selector === '.view-tab' ? this : null; },
  setPointerCapture() {},
  click: () => { active = index; clicks.push(index); },
}));
const track = {
  classList: { add() {}, remove() {} },
  style: {
    setProperty: (_, value) => { dragX = value; },
    removeProperty: () => { dragX = null; },
  },
};
const nav = {
  querySelector: () => track,
  querySelectorAll: () => tabs,
  addEventListener: (name, listener) => { listeners[name] = listener; },
};
const source = fs.readFileSync(path.join(__dirname, '..', 'mobile-nav-swipe.js'), 'utf8');
vm.runInNewContext(source, {
  document: { querySelector: () => nav },
  window: { matchMedia: () => mobile },
  setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
  clearTimeout: (id) => { timers.delete(id); },
});

const pointer = (name, x, y = 100, tab = tabs[active]) => listeners[name]({
  pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, target: tab,
});
const hold = () => {
  const timer = [...timers.values()].find((item) => item.delay === 220);
  assert.ok(timer, 'holding the selected tab arms dragging');
  timer.callback();
};

pointer('pointerdown', 48);
hold();
pointer('pointermove', 240);
assert.equal(dragX, '192px', 'the highlight follows the finger');
pointer('pointerup', 240);
assert.equal(active, 2, 'releasing over the last tab selects it');
assert.equal(dragX, null, 'drag styling is cleaned up');

let suppressed = false;
listeners.click({ isTrusted: true, target: tabs[0], preventDefault: () => { suppressed = true; }, stopImmediatePropagation() {} });
assert.equal(suppressed, true, 'the native release click cannot reopen the starting tab');

pointer('pointerdown', 248);
pointer('pointermove', 308);
pointer('pointerup', 308);
assert.equal(active, 1, 'a short swipe still moves one tab');

pointer('pointerdown', 148);
pointer('pointermove', 148, 170);
pointer('pointercancel', 148, 170);
assert.equal(active, 1, 'vertical scrolling cancels the gesture');

mobile.matches = false;
pointer('pointerdown', 148);
pointer('pointerup', 248);
assert.deepEqual(clicks, [2, 1], 'desktop touches do not switch tabs');
