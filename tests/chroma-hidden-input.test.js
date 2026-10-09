const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

for (const file of ['vendor/shaders-4.0.0.js', 'release/vendor/shaders-4.0.0.js']) {
  test(`${file}: hidden-page input cannot poison the ChromaFlow field or schedule rendering`, () => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const pointerStart = source.indexOf('ff=X=>');
    const pointerEnd = source.indexOf(',Fp=', pointerStart);
    const flowStart = source.indexOf('var go=128,');
    const flowEnd = source.indexOf('var $O=', flowStart);
    assert.ok(pointerStart >= 0 && pointerEnd > pointerStart && flowStart >= 0 && flowEnd > flowStart);

    let visible = true;
    let queued = 0;
    let steps;
    let field;
    const scope = vm.createContext({
      a: { getBoundingClientRect: () => ({ left: 0, top: 0, width: visible ? 900 : 0, height: visible ? 1800 : 0 }) },
      i: true, Re: null, we: 0.5, de: 0.5, Ae: false, xe: false,
      pa: () => { queued++; },
      H: (definition) => definition, ie: (value) => value,
      Tg: () => (field = { texture: { sample() {} }, texData: new Float32Array(128 * 128 * 4), upload() {} }),
      wg: (definition) => definition, vn: (name, run) => ({ name, run }),
      // Observe floats before half-float packing, where NaN becomes an opaque integer bit pattern.
      _o: (value) => value,
      I() {}, at() {}, W() {}, zz: {},
    });
    vm.runInContext(`var ${source.slice(pointerStart, pointerEnd)}; ${source.slice(flowStart, flowEnd)}`, scope);
    scope.NO.gpu.fragment({
      uniforms: {}, ctx: { uv: {} }, dimensions: { width: 900, height: 1800 },
      onBeforeRender: (definition) => { steps = definition.steps; }, getCpuValue: () => undefined,
    });
    const render = () => {
      const frame = { dt: 0.016, pointer: { x: scope.we, y: scope.de } };
      for (const step of steps) if (step.run(frame) === 'skip') break;
    };
    scope.mW({ clientX: 200, clientY: 300 });
    render();
    const beforeHidden = queued;
    visible = false;
    scope.mW({ clientX: 400, clientY: 450 });
    // A paused renderer can still receive a one-shot frame from the library's global listener.
    if (queued > beforeHidden) render();
    visible = true;
    for (let index = 0; index < 5; index++) {
      scope.mW({ clientX: 600 + index * 20, clientY: 900 });
      render();
    }
    assert.ok(field.texData.every(Number.isFinite), 'flow must remain finite after leaving and returning');
    assert.ok(field.texData[(64 * 128 + 90) * 4 + 2] > 0, 'returning must inject new flow at the new pointer location, not only retain the old tail');
    assert.equal(queued - beforeHidden, 5, 'hidden mouse movement must not request an extra render');
  });
}
