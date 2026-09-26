const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const root = resolve(__dirname, '..');

for (const scriptFile of ['app.js', 'release/app.js']) {
  test(`${scriptFile} does not scroll to the top when the active view tab is clicked`, () => {
    const script = readFileSync(resolve(root, scriptFile), 'utf8');
    const setView = script.match(/var setView = \(view, \{ updateHash = true \} = \{\}\) => \{([\s\S]*?)\n  \};\n  var setFilterState/);

    assert.ok(setView, 'view switching handler should exist');
    assert.match(setView[1], /const viewChanged = document\.body\.dataset\.view !== nextView;/);
    assert.match(setView[1], /if \(viewChanged\) scrollToTopImmediately\(\);/);
  });

  test(`${scriptFile} only binds view changes to navigation controls`, () => {
    const script = readFileSync(resolve(root, scriptFile), 'utf8');

    assert.match(script, /querySelectorAll\(["']button\[data-view\], a\[data-view\]["']\)/);
    assert.doesNotMatch(script, /querySelectorAll\(["']\[data-view\]["']\)/);
  });
}
