// Keep the bundled 4.0.0 pointer handler bounded during mouse bursts and hidden views.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const coalescedMouse = 'mousePoint=null,mouseFrame=null,mW=X=>{if(!i||!a)return;mousePoint={clientX:X.clientX,clientY:X.clientY};mouseFrame===null&&(mouseFrame=requestAnimationFrame(()=>{mouseFrame=null;let X=mousePoint;mousePoint=null;i&&a&&ff(X)&&(xe=!0,pa())}))}';
const mouseHandlers = [
  'mW=X=>{!i||!a||(ff(X),xe=!0,pa())}',
  'mW=X=>{!i||!a||!ff(X)||(xe=!0,pa())}',
];
const replacements = [
  ['ff=X=>{if(!a)return;Re=a.getBoundingClientRect();let Z,J;',
   'ff=X=>{if(!a)return!1;Re=a.getBoundingClientRect();if(!(Re.width>0&&Re.height>0))return!1;let Z,J;'],
  ['we=(Z-Re.left)/Re.width,de=(J-Re.top)/Re.height,Ae=!0}',
   'we=(Z-Re.left)/Re.width,de=(J-Re.top)/Re.height,Ae=!0;return!0}'],
  ['_W=X=>{!i||!a||(ff(X),xe=!0,pa())}',
   '_W=X=>{!i||!a||!ff(X)||(xe=!0,pa())}'],
  ['re!==null&&typeof cancelAnimationFrame=="function"&&(cancelAnimationFrame(re),re=null),_f()',
   're!==null&&typeof cancelAnimationFrame=="function"&&(cancelAnimationFrame(re),re=null),mouseFrame!==null&&typeof cancelAnimationFrame=="function"&&cancelAnimationFrame(mouseFrame),mouseFrame=null,mousePoint=null,_f()'],
];

const files = ['vendor/shaders-4.0.0.js', 'release/vendor/shaders-4.0.0.js'];
const patches = files.map((file) => {
  const filename = path.join(__dirname, '..', file);
  let source = fs.readFileSync(filename, 'utf8');
  for (const [before, after] of replacements) {
    if (source.includes(after)) continue;
    assert.equal(source.split(before).length - 1, 1,
      `Unexpected upstream pointer handler in ${file}; review before patching`);
    source = source.replaceAll(before, after);
  }
  if (!source.includes(coalescedMouse)) {
    const matches = mouseHandlers.filter((handler) => source.includes(handler));
    assert.equal(matches.length, 1,
      `Unexpected upstream mouse handler in ${file}; review before patching`);
    assert.equal(source.split(matches[0]).length - 1, 1,
      `Unexpected upstream mouse handler in ${file}; review before patching`);
    source = source.replace(matches[0], coalescedMouse);
  }
  return { filename, source };
});
for (const { filename, source } of patches) fs.writeFileSync(filename, source);
