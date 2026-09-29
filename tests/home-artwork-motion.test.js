const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const png = (name) => fs.readFileSync(path.join(root, 'assets', name));
const original = png('home-key-visual-diagonal-v6.png');
const plate = png('home-key-visual-motion-plate.png');
const foreground = png('home-key-visual-motion-foreground.png');

assert.deepEqual(plate.subarray(16, 24), original.subarray(16, 24), 'clean plate must match the source canvas');
assert.deepEqual(foreground.subarray(16, 24), original.subarray(16, 24), 'foreground must match the source canvas');
assert.equal(foreground[25], 6, 'foreground must preserve an alpha channel');
assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /home-artwork-motion\.js/);
