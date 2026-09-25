const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const root = resolve(__dirname, '..');

for (const scriptFile of ['script.js', 'app.js', 'release/app.js']) {
  test(`${scriptFile} returns to the current view top without switching tabs`, () => {
    const script = readFileSync(resolve(root, scriptFile), 'utf8');
    const handler = script.match(/document\.querySelectorAll\(['"]a\[href="#top"\]['"]\)\.forEach\(\(link\) => link\.addEventListener\(['"]click['"], \(event\) => \{([\s\S]*?)\}\)\);/);

    assert.ok(handler, 'back-to-top links should have a click handler');
    assert.match(handler[1], /scrollToTopImmediately\(\)/);
    assert.doesNotMatch(handler[1], /setView\(['"]home['"]\)/, 'clicking back-to-top must not change tabs');
  });
}
