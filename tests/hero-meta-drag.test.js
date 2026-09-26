import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const htmlSources = [
  readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
  readFileSync(new URL('../release/index.html', import.meta.url), 'utf8'),
];
const start = source.indexOf('const bindHeroMetaDrag = () => {');
const end = source.indexOf('\n\nrenderSchedule();', start);
assert.notEqual(start, -1, 'hero card drag binder must exist');
assert.notEqual(end, -1, 'hero card drag binder must have a clear boundary');

const makeCard = () => {
  const listeners = new Map();
  const root = {};
  return {
    dataset: {},
    style: { transform: '', transition: '' },
    parentElement: root,
    isConnected: true,
    listeners,
    addEventListener: (name, listener) => listeners.set(name, listener),
    setPointerCapture(pointerId) { this.capturedPointer = pointerId; },
    hasAttribute(name) { return name === 'data-dragging' && Object.hasOwn(this.dataset, 'dragging'); },
  };
};

test('home date and venue cards are informational articles, not navigation buttons', () => {
  for (const html of htmlSources) {
    const hero = html.match(/<div class="hero__meta"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
    assert.equal([...hero.matchAll(/<article class="hero__meta-card/g)].length, 2);
    assert.doesNotMatch(hero, /<button|data-view=|data-scroll-target=/);
  }
});

test('desktop hero glass cards drag with the pointer and spring back on release', () => {
  const card = makeCard();
  const changed = [];
  const glassInstances = new Map([[card.parentElement, { markChanged: (element) => changed.push(element) }]]);
  const frames = [];
  let now = 0;
  const window = {
    matchMedia: (query) => ({ matches: query.includes('hover') || query.includes('prefers-reduced-motion') ? !query.includes('prefers-reduced-motion') : false }),
    requestAnimationFrame: (callback) => { frames.push(callback); },
  };
  const document = { querySelectorAll: () => [card] };
  const bind = new Function('document', 'window', 'liquidGlassInstances', 'performance', `${source.slice(start, end)}; return bindHeroMetaDrag;`)(
    document,
    window,
    glassInstances,
    { now: () => now },
  );

  bind();
  const fire = (name, event) => card.listeners.get(name)?.({ preventDefault() {}, ...event });
  fire('pointerdown', { button: 0, pointerType: 'mouse', isPrimary: true, pointerId: 4, clientX: 100, clientY: 60 });
  assert.equal(card.capturedPointer, 4);
  assert.equal(card.dataset.dragging, '');
  fire('pointermove', { pointerId: 4, clientX: 132, clientY: 75 });
  assert.equal(card.style.transform, 'translate3d(32px, 15px, 0)');
  assert.equal(changed.at(-1), card);

  fire('pointerup', { pointerId: 4 });
  assert.equal(card.dataset.dragging, undefined);
  assert.equal(card.style.transform, 'translate3d(0, 0, 0)');
  assert.match(card.style.transition, /480ms cubic-bezier/);
  now = 600;
  frames.shift()?.();
  fire('transitionend', { propertyName: 'transform' });
  assert.equal(card.style.transform, '');
  assert.equal(card.style.transition, '');
});

test('hero glass card dragging is disabled when fine-pointer input is unavailable', () => {
  const card = makeCard();
  const window = {
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: () => {},
  };
  const bind = new Function('document', 'window', 'liquidGlassInstances', `${source.slice(start, end)}; return bindHeroMetaDrag;`)({ querySelectorAll: () => [card] }, window, new Map());
  bind();
  assert.equal(card.listeners.size, 0);
});
