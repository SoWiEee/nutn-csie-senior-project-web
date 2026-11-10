const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const asset = (name) => fs.readFileSync(path.join(root, 'assets', name));
const plate = asset('home-key-visual-motion-plate.jpg');
const foreground = asset('home-key-visual-motion-foreground.png');

assert.equal(plate[0], 0xff, 'clean plate must start with the JPEG signature');
assert.equal(plate[1], 0xd8, 'clean plate must start with the JPEG signature');
assert.deepEqual([...foreground.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'foreground must be PNG');
assert.equal(foreground.toString('ascii', 12, 16), 'IHDR', 'foreground must have a valid PNG header');
assert.equal(foreground[25], 6, 'foreground PNG must preserve its RGBA channel');
assert.ok(fs.existsSync(path.join(root, 'release', 'assets', 'home-key-visual-motion-foreground.png')));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.match(html, /home-artwork-motion\.js/);
assert.match(html, /home-artwork__surge/);
assert.match(css, /@media \(min-width: 48\.01rem\) and \(prefers-reduced-motion: no-preference\)/);
assert.match(css, /body\[data-view="home"\] \.home-artwork\.is-ready\.is-active \.home-artwork__surge \{ animation-play-state: running; \}/);
