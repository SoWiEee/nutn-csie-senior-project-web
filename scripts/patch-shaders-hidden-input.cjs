// Keep the bundled 4.0.0 pointer handler from dividing by zero or rendering hidden views.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const replacements = [
  ['ff=X=>{if(!a)return;Re=a.getBoundingClientRect();let Z,J;',
   'ff=X=>{if(!a)return!1;Re=a.getBoundingClientRect();if(!(Re.width>0&&Re.height>0))return!1;let Z,J;'],
  ['we=(Z-Re.left)/Re.width,de=(J-Re.top)/Re.height,Ae=!0}',
   'we=(Z-Re.left)/Re.width,de=(J-Re.top)/Re.height,Ae=!0;return!0}'],
  ['!i||!a||(ff(X),xe=!0,pa())',
   '!i||!a||!ff(X)||(xe=!0,pa())'],
];

const files = ['vendor/shaders-4.0.0.js', 'release/vendor/shaders-4.0.0.js'];
const patches = files.map((file) => {
  const filename = path.join(__dirname, '..', file);
  let source = fs.readFileSync(filename, 'utf8');
  for (const [before, after] of replacements) {
    if (source.includes(after)) continue;
    assert.equal(source.split(before).length - 1, before.startsWith('!i') ? 2 : 1,
      `Unexpected upstream pointer handler in ${file}; review before patching`);
    source = source.replaceAll(before, after);
  }
  return { filename, source };
});
for (const { filename, source } of patches) fs.writeFileSync(filename, source);
