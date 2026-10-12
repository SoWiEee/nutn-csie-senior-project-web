import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const htmlSources = [
  readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
  readFileSync(new URL('../release/index.html', import.meta.url), 'utf8'),
];
test('home date and venue cards are informational articles, not navigation buttons', () => {
  for (const html of htmlSources) {
    const hero = html.match(/<div class="hero__meta"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
    assert.equal([...hero.matchAll(/<article class="hero__meta-card/g)].length, 2);
    assert.doesNotMatch(hero, /<button|data-view=|data-scroll-target=/);
  }
});

test('home glass cards stay fixed with pointer distortion and a coarse-pointer fallback', () => {
  assert.doesNotMatch(source, /bindHeroMetaDrag|data-dragging|setPointerCapture/);
  assert.match(source, /pointerStrength:\s*1\.16/);
  assert.match(source, /if \(root\.matches\('#view-home \.hero__meta'\) && window\.matchMedia\('\(pointer: coarse\)'\)\.matches\) return false;/);
  for (const html of htmlSources) {
    const hero = html.match(/<div class="hero__meta"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
    assert.match(hero, /data-liquid-glass-root/);
    assert.equal([...hero.matchAll(/<article class="hero__meta-card[^>]*data-liquid-glass/g)].length, 2);
    assert.doesNotMatch(hero, /data-floating|data-dragging|draggable/);
  }
});
