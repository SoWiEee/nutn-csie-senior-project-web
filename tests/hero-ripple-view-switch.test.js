import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../hero-ripple.js', import.meta.url), 'utf8');
const captureStart = source.indexOf('const capture = async () => {');
const captureEnd = source.indexOf("\n\n  window.addEventListener('pointermove'", captureStart);
assert.notEqual(captureStart, -1, 'hero ripple capture function must exist');
assert.notEqual(captureEnd, -1, 'hero ripple capture function must have a clear boundary');
const capture = source.slice(captureStart, captureEnd);

test('a ready ripple layer stays visible while the title is recaptured after a view change', () => {
  const beforeFontWait = capture.slice(0, capture.indexOf('await document.fonts.ready'));
  const initialFallback = beforeFontWait.match(/if\s*\(!ready\)\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(initialFallback, 'the initial capture should prepare the fallback layer');
  assert.match(initialFallback[1], /classList\.remove\('is-ripple-ready'\)/);
  const recaptureStart = beforeFontWait.replace(initialFallback[0], '');
  assert.doesNotMatch(recaptureStart, /ready\s*=\s*false/, 'do not invalidate the last good texture during recapture');
  assert.doesNotMatch(recaptureStart, /classList\.remove\('is-ripple-ready'\)/, 'do not reveal the HTML title while recapturing');
});
