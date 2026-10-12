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
    let geometryReads = 0;
    let nextFrame = 0;
    const frames = new Map();
    let steps;
    let field;
    const scope = vm.createContext({
      a: { getBoundingClientRect: () => {
        geometryReads++;
        return { left: 0, top: 0, width: visible ? 900 : 0, height: visible ? 1800 : 0 };
      } },
      i: true, Re: null, we: 0.5, de: 0.5, Ae: false, xe: false,
      pa: () => { queued++; },
      requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
      cancelAnimationFrame: (id) => frames.delete(id),
      H: (definition) => definition, ie: (value) => value,
      Tg: () => (field = { texture: { sample() {} }, texData: new Float32Array(128 * 128 * 4), upload() {} }),
      wg: (definition) => definition, vn: (name, run) => ({ name, run }),
      // Observe floats before half-float packing, where NaN becomes an opaque integer bit pattern.
      _o: (value) => value,
      I() {}, at() {}, W() {}, zz: {},
    });
    vm.runInContext(`var ${source.slice(pointerStart, pointerEnd)}; ${source.slice(flowStart, flowEnd)}`, scope);
    const flushInput = () => {
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
    };
    scope.NO.gpu.fragment({
      uniforms: {}, ctx: { uv: {} }, dimensions: { width: 900, height: 1800 },
      onBeforeRender: (definition) => { steps = definition.steps; }, getCpuValue: () => undefined,
    });
    const render = () => {
      const frame = { dt: 0.016, pointer: { x: scope.we, y: scope.de } };
      for (const step of steps) if (step.run(frame) === 'skip') break;
    };
    scope.mW({ clientX: 200, clientY: 300 });
    flushInput();
    render();
    const beforeHidden = queued;
    visible = false;
    scope.mW({ clientX: 400, clientY: 450 });
    flushInput();
    // A paused renderer can still receive a one-shot frame from the library's global listener.
    if (queued > beforeHidden) render();
    visible = true;
    for (let index = 0; index < 5; index++) {
      scope.mW({ clientX: 600 + index * 20, clientY: 900 });
      flushInput();
      render();
    }
    assert.ok(field.texData.every(Number.isFinite), 'flow must remain finite after leaving and returning');
    assert.ok(field.texData[(64 * 128 + 90) * 4 + 2] > 0, 'returning must inject new flow at the new pointer location, not only retain the old tail');
    assert.equal(queued - beforeHidden, 5, 'hidden mouse movement must not request an extra render');
    const beforeBurst = { reads: geometryReads, queued };
    for (let index = 0; index < 240; index++) scope.mW({ clientX: 200 + index, clientY: 800 });
    assert.equal(frames.size, 1, 'a high-frequency mouse burst queues only one input frame');
    assert.equal(geometryReads, beforeBurst.reads, 'raw mouse events must not read canvas geometry');
    flushInput();
    assert.equal(geometryReads - beforeBurst.reads, 1, 'one animation frame reads geometry once');
    assert.equal(queued - beforeBurst.queued, 1, 'one mouse burst publishes one pointer input');
    assert.equal(scope.we, 439 / 900, 'the coalesced input keeps the latest horizontal coordinate');
    assert.equal(scope.de, 800 / 1800, 'the coalesced input keeps the latest vertical coordinate');
    scope.mW({ clientX: 700, clientY: 500 });
    visible = false;
    const beforePendingHide = queued;
    flushInput();
    assert.equal(queued, beforePendingHide, 'a view hidden before the input frame runs must not publish stale input');
    visible = true;
    scope.mW({ clientX: 710, clientY: 510 });
    flushInput();
    assert.equal(scope.we, 710 / 900, 'returning accepts a fresh mouse position');
    scope.i = false;
    scope.mW({ clientX: 720, clientY: 520 });
    assert.equal(frames.size, 0, 'an uninitialized renderer must not queue pointer work');
    scope.i = true;
    scope._W({ touches: [{ clientX: 450, clientY: 900 }] });
    assert.equal(frames.size, 0, 'touch input retains its existing immediate behavior');
    assert.equal(scope.we, 0.5);
    assert.equal(scope.de, 0.5);
  });
}
