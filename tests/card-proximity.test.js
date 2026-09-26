import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const htmlSources = [
  readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
  readFileSync(new URL('../release/index.html', import.meta.url), 'utf8'),
];
const start = source.indexOf('const bindCardProximityLight = () => {');
const end = source.indexOf('\n\nconst backdropElement', start);
assert.notEqual(start, -1, 'card proximity binder must exist');
assert.notEqual(end, -1, 'card proximity binder must have a clear boundary');

test('schedule and project card templates opt into proximity lighting', () => {
  assert.match(source, /class="schedule-card schedule-card--signal" data-card-light data-card-proximity/);
  assert.match(source, /class="project-card project-card--archive"[^\n]*data-card-light data-card-proximity/);
  for (const html of htmlSources) {
    assert.equal([...html.matchAll(/<figure class="venue-figure" data-card-light data-card-proximity>/g)].length, 2);
  }
});

test('pointer proximity lights adjacent cards and clears when it leaves the document', () => {
  const makeCard = (left) => {
    const properties = new Map();
    return {
      properties,
      getBoundingClientRect: () => ({ left, top: 0, width: 100, height: 100 }),
      style: { setProperty: (name, value) => properties.set(name, value) },
    };
  };
  const cards = [makeCard(0), makeCard(120), makeCard(500)];
  const listeners = {};
  let animationFrame;
  const document = {
    documentElement: {},
    querySelectorAll: () => cards,
    addEventListener: (name, listener) => { listeners[name] = listener; },
  };
  const window = {
    addEventListener: (name, listener) => { listeners[name] = listener; },
    requestAnimationFrame: (callback) => { animationFrame = callback; return 1; },
  };
  const bind = new Function('document', 'window', 'getComputedStyle', `${source.slice(start, end)}; return bindCardProximityLight;`)(
    document,
    window,
    () => ({ fontSize: '16px' }),
  );

  bind();
  listeners.pointermove({ pointerType: 'mouse', clientX: 110, clientY: 50 });
  animationFrame();

  for (const card of cards.slice(0, 2)) {
    assert.ok(parseFloat(card.properties.get('--card-proximity-opacity')) > 0);
    assert.ok(parseFloat(card.properties.get('--card-warm-opacity')) > 0);
  }
  assert.equal(parseFloat(cards[2].properties.get('--card-proximity-opacity')), 0);

  const heroCard = makeCard(700);
  listeners.pointermove({
    pointerType: 'mouse',
    clientX: 750,
    clientY: 50,
    target: { closest: () => heroCard },
  });
  animationFrame();
  assert.equal(heroCard.properties.get('--card-light-opacity'), '1');

  listeners.pointerout({ relatedTarget: null });
  assert.equal(heroCard.properties.get('--card-light-opacity'), '0');
  for (const card of cards) {
    assert.equal(parseFloat(card.properties.get('--card-proximity-opacity')), 0);
    assert.equal(parseFloat(card.properties.get('--card-warm-opacity')), 0);
  }
});
