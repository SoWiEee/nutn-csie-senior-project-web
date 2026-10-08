const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Replay a scroll burst with the real controller and a stubbed WebGPU dependency.
async function replay(source) {
  const listeners = {};
  const frames = new Map();
  const timers = new Map();
  const mutations = [];
  const counts = { resize: 0, mask: 0, pause: 0, resume: 0, pointerSync: 0 };
  let nextId = 0;
  let frameTime = 0;
  let canvas;
  const classes = () => {
    const values = new Set();
    return {
      add: (name) => values.add(name), remove: (name) => values.delete(name),
      contains: (name) => values.has(name),
      toggle: (name, enabled) => enabled ? values.add(name) : values.delete(name),
    };
  };
  const style = () => ({ setProperty(name) { if (name === 'mask-image') counts.mask++; } });
  const document = { body: { dataset: { view: 'projects' } }, hidden: false, hasFocus: () => true };
  const window = {
    innerHeight: 900, devicePixelRatio: 1, scrollY: 0,
    matchMedia: () => ({ matches: true }),
    addEventListener: (name, callback) => { listeners[name] = callback; },
    dispatchEvent() { counts.pointerSync++; },
    setTimeout: (callback, delay) => { timers.set(++nextId, { callback, delay }); return nextId; },
  };
  const card = { getBoundingClientRect: () => ({ left: 0, top: 100 - window.scrollY, width: 280, height: 300 }) };
  const grid = {
    contains: (target) => target === card,
    querySelectorAll: () => [card],
    getBoundingClientRect: () => ({ left: 0, top: 100 - window.scrollY, bottom: 1900 - window.scrollY, width: 900, height: 1800 }),
    append: (element) => { canvas = element; }, addEventListener() {},
  };
  const dialog = { open: false, addEventListener() {} };
  document.querySelector = (selector) => selector === '#view-projects' ? { querySelector: () => grid } : dialog;
  document.elementFromPoint = () => card;
  document.addEventListener = (name, callback) => { listeners[name] = callback; };
  document.createElement = () => ({ style: style(), classList: classes(), setAttribute() {}, remove() {} });
  const shader = Object.fromEntries(['resize', 'pause', 'resume'].map((name) => [name, () => { counts[name]++; }]));
  vm.runInNewContext(source.replace("import('./vendor/shaders-4.0.0.js')", 'Promise.resolve(shaderLibrary)'), {
    document, window, navigator: { gpu: {} }, console,
    shaderLibrary: { createSharedDevice: async () => ({}), createShader: async () => shader },
    ResizeObserver: class { observe() {} },
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe(target) { mutations.push({ target, callback: this.callback }); } },
    getComputedStyle: () => ({ borderTopLeftRadius: '19.2px' }),
    requestAnimationFrame: (callback) => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: (id) => frames.delete(id),
    clearTimeout: (id) => timers.delete(id), MouseEvent: class {},
  });
  const flushFrames = () => {
    frameTime += 1000 / 60;
    for (const [id, callback] of [...frames]) { frames.delete(id); callback(frameTime); }
  };
  await new Promise(setImmediate);
  const preparedBeforeHover = Boolean(canvas);
  listeners.pointermove({ pointerType: 'mouse', clientX: 120, clientY: 200, target: card });
  await new Promise(setImmediate);
  flushFrames();
  const firstHoverVisible = canvas.classList.contains('is-active');
  Object.keys(counts).forEach((key) => { counts[key] = 0; });
  let scheduledFrames = 0;
  for (let index = 0; index < 120; index++) {
    window.scrollY = index;
    listeners.scroll();
    listeners.scroll();
    scheduledFrames += frames.size;
    flushFrames();
  }
  const duringScroll = { ...counts, scheduledFrames };
  [...timers.values()].find((timer) => timer.delay === 220).callback();
  flushFrames();
  const afterScroll = { ...counts };
  document.body.dataset.view = 'home';
  mutations.find((observer) => observer.target === document.body).callback();
  listeners.scroll();
  const inactiveFrames = frames.size;
  const beforeReturn = { ...counts };
  document.body.dataset.view = 'projects';
  mutations.find((observer) => observer.target === document.body).callback();
  flushFrames();
  const afterReturn = {
    visible: canvas.classList.contains('is-active') && canvas.style.visibility === 'visible',
    mask: counts.mask - beforeReturn.mask,
    resume: counts.resume - beforeReturn.resume,
    pointerSync: counts.pointerSync - beforeReturn.pointerSync,
  };
  return { preparedBeforeHover, firstHoverVisible, duringScroll, afterScroll, inactiveFrames, afterReturn };
}

(async () => {
  const root = path.join(__dirname, '..');
  const baseline = process.argv.includes('--baseline');
  const source = baseline
    ? require('node:child_process').execFileSync('git', ['show', 'HEAD:project-smoke.js'], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, 'project-smoke.js'), 'utf8');
  const result = await replay(source);
  console.log(JSON.stringify(result));
  if (baseline) return;
  assert.equal(result.preparedBeforeHover, true, 'entering projects prepares the shader before the first hover');
  assert.equal(result.firstHoverVisible, true, 'first hover must show the newly created canvas');
  assert.equal(result.duringScroll.resize, 0, 'scroll must preserve fluid textures');
  assert.equal(result.duringScroll.pause, 0, 'scrolling with the pointer over cards must keep the effect running');
  assert.ok(result.duringScroll.pointerSync > 0, 'scrolling must update the stationary pointer in content space');
  assert.ok(result.duringScroll.pointerSync <= 60, 'stationary scroll input is limited to 30 updates per second');
  assert.equal(result.duringScroll.resume, 0, 'an already running shader must not be resumed for every scroll input');
  assert.equal(result.duringScroll.mask, 0, 'scroll must not rebuild content-relative masks each frame');
  assert.equal(result.duringScroll.scheduledFrames, 120, 'multiple scroll events coalesce into one update per frame');
  assert.equal(result.afterScroll.resize, 0, 'settling must not recreate the textures');
  assert.equal(result.inactiveFrames, 0, 'scrolling another view must not schedule ChromaFlow work');
  assert.equal(result.afterReturn.visible, true, 'returning to projects restores the visible canvas');
  assert.equal(result.afterReturn.mask, 1, 'returning rebuilds the card mask after layout is visible');
  assert.equal(result.afterReturn.resume, 1, 'returning restarts the renderer once');
  assert.equal(result.afterReturn.pointerSync, 1, 'returning reconnects the library pointer input');
  assert.deepEqual(await replay(fs.readFileSync(path.join(root, 'release/project-smoke.js'), 'utf8')), result,
    'release must preserve the same interaction lifecycle');
})().catch((error) => { console.error(error); process.exitCode = 1; });
