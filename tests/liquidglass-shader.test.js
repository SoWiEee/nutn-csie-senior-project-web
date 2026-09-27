import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const shader = readFileSync(new URL('../vendor/liquidglass/index.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const appSource = readFileSync(new URL('../script.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const bundles = ['../app.js', '../release/app.js'].map((path) =>
  readFileSync(new URL(path, import.meta.url), 'utf8').replaceAll('\r\n', '\n'),
);

const smoothstep = (edge0, edge1, value) => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

test('glass edge and inner glow use defined smoothstep bounds', () => {
  assert.match(shader, /float edge = 1\.0 - smoothstep\(0\.0, maxD \* 0\.35, inside\);/);
  assert.match(shader, /float innerGlow = \(1\.0 - smoothstep\(0\.0, 5\.0, inside\)\)/);
  assert.doesNotMatch(shader, /smoothstep\(\s*maxD\s*\*\s*0\.35\s*,\s*0\.0\s*,\s*inside\s*\)/);
  assert.doesNotMatch(shader, /smoothstep\(\s*5\.0\s*,\s*0\.0\s*,\s*-sdf\s*\)/);
});

test('edge blur is weighted toward the center and the clear refraction preset disables blur', () => {
  assert.match(shader, /float edgeMix = 0\.06 \+ \(1\.0 - edge\) \* 0\.34;/);
  assert.match(appSource, /blurAmount: 0\.0,/);

  const edgeAtRim = 1 - smoothstep(0, 35, 0);
  const edgeAtCenter = 1 - smoothstep(0, 35, 50);
  const blurMix = (edge) => 0.06 + (1 - edge) * 0.34;
  assert.equal(edgeAtRim, 1);
  assert.equal(edgeAtCenter, 0);
  assert.equal(blurMix(edgeAtRim), 0.06);
  assert.equal(blurMix(edgeAtCenter), 0.4);
});

test('checked-in browser bundles contain the shader fix and match each other', () => {
  assert.equal(bundles[0], bundles[1]);
  for (const bundle of bundles) {
    assert.ok(bundle.includes('float edge = 1.0 - smoothstep(0.0, maxD * 0.35, inside);'));
    assert.ok(bundle.includes('float innerGlow = (1.0 - smoothstep(0.0, 5.0, inside))'));
    assert.match(bundle, /blurAmount: 0(?:\.0)?/);
  }
});
