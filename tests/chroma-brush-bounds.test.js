const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const fullScan = 'for(let Q=0;Q<go;Q++)for(let se=0;se<go;se++)';
const boundedScan = 'let minX=Math.max(0,Math.floor((k.pointer.x-2*F/Math.max(y,1))*go)),maxX=Math.min(go-1,Math.ceil((k.pointer.x+2*F/Math.max(y,1))*go)),minY=Math.max(0,Math.floor((k.pointer.y-2*F*Math.min(y,1))*go)),maxY=Math.min(go-1,Math.ceil((k.pointer.y+2*F*Math.min(y,1))*go));for(let Q=minY;Q<=maxY;Q++)for(let se=minX;se<=maxX;se++)';

function replay(source, aspect, radius) {
  let steps;
  let field;
  let pointerReads = 0;
  const start = source.indexOf('var go=128,');
  const end = source.indexOf('var $O=', start);
  const scope = vm.createContext({
    H: (value) => value, ie: (value) => value,
    Tg: () => (field = { texture: { sample() {} }, texData: new Float32Array(128 * 128 * 4), upload() {} }),
    wg: (value) => value, vn: (name, run) => ({ name, run }),
    _o: (value) => value, I() {}, at() {}, W() {}, zz: {},
  });
  vm.runInContext(source.slice(start, end), scope);
  scope.NO.gpu.fragment({
    uniforms: {}, ctx: { uv: {} }, dimensions: { width: 1000 * aspect, height: 1000 },
    onBeforeRender: (value) => { steps = value.steps; },
    getCpuValue: (name) => name === 'radius' ? radius : undefined,
  });
  const positions = [[0.5, 0.5], [0.7, 0.51], [0.3, 0.55], [0, 0], [1, 1], [-0.05, 0.5], [1.05, 0.5], [0.51, 0.62], [0.51, 0.62]];
  const snapshots = [];
  for (const [x, y] of positions) {
    const frame = { dt: 0.016, pointer: { get x() { pointerReads++; return x; }, get y() { pointerReads++; return y; } } };
    for (const step of steps) if (step.run(frame) === 'skip') break;
    snapshots.push(Array.from(field.texData));
  }
  return { snapshots, pointerReads };
}

for (const file of ['vendor/shaders-4.0.0.js', 'release/vendor/shaders-4.0.0.js']) {
  test(`${file}: bounded brush preserves every flow value with less moving-pointer work`, () => {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(source.includes(boundedScan), 'brush must not scan the entire grid');
    const baseline = source.replace(boundedScan, fullScan);
    for (const aspect of [0.25, 1, 4]) {
      for (const radius of [0, 2, 5]) {
        const before = replay(baseline, aspect, radius);
        const after = replay(source, aspect, radius);
        assert.deepEqual(after.snapshots, before.snapshots, `flow must match at aspect ${aspect}, radius ${radius}`);
        if (radius === 2) assert.ok(after.pointerReads < before.pointerReads * 0.2, 'default brush must inspect at least 80% fewer coordinates');
      }
    }
    const before = replay(baseline, 0.25, 2);
    const after = replay(source, 0.25, 2);
    console.log(`${file}: pointer coordinate reads ${before.pointerReads} -> ${after.pointerReads}`);
  });
}
