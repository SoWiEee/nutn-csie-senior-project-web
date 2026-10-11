import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const entry = read('../app-entry.js');
const bundles = [read('../app.js'), read('../release/app.js')];
const html = [
  read('../index.html'),
  read('../release/index.html'),
  read('../404.html'),
  read('../release/404.html'),
];

test('mobile pinch zoom remains available across site pages', () => {
  assert.doesNotMatch(entry, /gesturestart|gesturechange|preventPinchZoom|event\.touches\.length > 1/);
  for (const bundle of bundles) {
    assert.doesNotMatch(bundle, /gesturestart|gesturechange|preventPinchZoom|event\.touches\.length > 1/);
  }
  for (const page of html) assert.doesNotMatch(page, /maximum-scale\s*=\s*1|user-scalable\s*=\s*no/i);
});
