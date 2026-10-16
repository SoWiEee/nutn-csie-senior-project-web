const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const webp = (name) => fs.readFileSync(path.join(root, 'assets', name));
const plate = webp('home-key-visual-motion-plate.jpg');
const foreground = webp('home-key-visual-motion-foreground.webp');

assert.equal(plate[0], 0xff, 'clean plate must start with the JPEG signature');
assert.equal(plate[1], 0xd8, 'clean plate must start with the JPEG signature');
assert.equal(foreground.toString('ascii', 0, 4), 'RIFF', 'foreground must be WebP');
assert.equal(foreground.toString('ascii', 8, 12), 'WEBP', 'foreground must be WebP');
assert.equal(foreground.toString('ascii', 12, 16), 'VP8X', 'foreground must use extended WebP for alpha');
assert.ok(foreground[20] & 0x10, 'foreground must preserve an alpha channel');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.match(html, /home-artwork-motion\.js/);
assert.match(html, /home-artwork__surge/);
assert.match(css, /@media \(min-width: 48\.01rem\) and \(prefers-reduced-motion: no-preference\)/);
assert.match(css, /body\[data-view="home"\] \.home-artwork\.is-ready\.is-active \.home-artwork__surge \{ animation-play-state: running; \}/);
