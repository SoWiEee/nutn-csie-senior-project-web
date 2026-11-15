const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
for (const dir of ['', 'release']) {
  const html = fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, dir, 'styles.css'), 'utf8');
  assert.doesNotMatch(html, /home-artwork-motion\.js|home-artwork__surge/);
  assert.doesNotMatch(css, /home-artwork-surge|has-home-artwork/);
  assert.match(html, /data-site-backdrop-source src="assets\/home-key-visual\.jpg/);
}
