import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const entry = read('../app-entry.js');
const bundles = [read('../app.js'), read('../release/app.js')];
const styles = [read('../styles.css'), read('../release/styles.css')];
const html = [read('../index.html'), read('../release/index.html')];

test('mobile pinch is blocked while one-finger panning remains available', () => {
  assert.match(entry, /if \(navigator\.maxTouchPoints > 0\)/);
  assert.match(entry, /gesturestart/);
  assert.match(entry, /gesturechange/);
  assert.match(entry, /if \(event\.touches\.length > 1\) event\.preventDefault\(\)/);
  for (const bundle of bundles) {
    assert.match(bundle, /gesturestart/);
    assert.match(bundle, /event\.touches\.length > 1/);
  }
  for (const stylesheet of styles) assert.match(stylesheet, /html \{[^}]*touch-action: pan-x pan-y;/);
  for (const page of html) assert.match(page, /maximum-scale=1, user-scalable=no/);
});
