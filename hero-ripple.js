const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uText;
  uniform sampler2D uTrail;
  uniform vec2 uTrailSize;

  void main() {
    vec2 stepSize = 1.0 / uTrailSize;
    vec4 trail = texture2D(uTrail, vUv);
    vec2 slope = vec2(
      texture2D(uTrail, vUv + vec2(stepSize.x, 0.0)).a - texture2D(uTrail, vUv - vec2(stepSize.x, 0.0)).a,
      texture2D(uTrail, vUv + vec2(0.0, stepSize.y)).a - texture2D(uTrail, vUv - vec2(0.0, stepSize.y)).a
    );
    vec2 uv = vUv + slope * 0.028 + (trail.rg - 0.5) * trail.a * 0.008;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0);
    } else {
      vec4 text = texture2D(uText, uv);
      gl_FragColor = vec4(text.rgb * text.a, text.a);
    }
  }
`;

const TITLE_PADDING = 16;

const rasterizeTitle = (title) => {
  const rect = title.getBoundingClientRect();
  const bitmap = document.createElement('canvas');
  const scale = Math.min(Math.max(devicePixelRatio || 1, 1.5), 2);
  bitmap.width = Math.ceil((rect.width + TITLE_PADDING * 2) * scale);
  bitmap.height = Math.ceil((rect.height + TITLE_PADDING * 2) * scale);
  const context = bitmap.getContext('2d');
  context.scale(scale, scale);
  context.textBaseline = 'alphabetic';
  const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const style = getComputedStyle(node.parentElement);
    context.font = style.font;
    context.fillStyle = style.color;
    context.letterSpacing = '0px';
    let line = [];
    const flush = () => {
      if (!line.length) return;
      const metrics = context.measureText(line.map(({ segment }) => segment).join(''));
      const first = line[0].glyph;
      const baseline = first.top - rect.top + TITLE_PADDING + (first.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + 1;
      for (const { segment, glyph } of line) context.fillText(segment, glyph.left - rect.left + TITLE_PADDING, baseline);
    };
    for (const { segment, index } of segmenter.segment(node.textContent)) {
      range.setStart(node, index);
      range.setEnd(node, index + segment.length);
      const glyph = range.getBoundingClientRect();
      if (!glyph.width) continue;
      if (line.length && Math.abs(glyph.top - line[0].glyph.top) > 2) { flush(); line = []; }
      line.push({ segment, glyph });
    }
    flush();
  }
  return bitmap;
};

export const initHeroRipple = () => {
  const root = document.querySelector('[data-hero-ripple]');
  const title = root?.querySelector('h1');
  const canvas = root?.querySelector('canvas');
  if (!title || !canvas || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return;
  const shader = (type, source) => {
    const part = gl.createShader(type);
    gl.shaderSource(part, source);
    gl.compileShader(part);
    if (!gl.getShaderParameter(part, gl.COMPILE_STATUS)) return null;
    return part;
  };
  const vertex = shader(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const positions = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positions);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);
  const attribute = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(gl.getUniformLocation(program, 'uText'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'uTrail'), 1);

  const makeTexture = (unit) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };
  const textTexture = makeTexture(0);
  const trailTexture = makeTexture(1);
  const trailCanvas = document.createElement('canvas');
  const trailContext = trailCanvas.getContext('2d');
  const touches = [];
  let ready = false;
  let visible = true;
  let frame = 0;
  let captureVersion = 0;

  const draw = (now) => {
    frame = 0;
    if (!ready || !visible || document.hidden || document.body.dataset.view !== 'home') return;
    trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    for (let i = touches.length - 1; i >= 0; i -= 1) {
      const age = (now - touches[i].time) / 480;
      if (age >= 1) { touches.splice(i, 1); continue; }
      const { x, y, dx, dy } = touches[i];
      const radius = trailCanvas.width * (0.045 + age * 0.025);
      const cx = x * trailCanvas.width;
      const cy = y * trailCanvas.height;
      const red = Math.round(128 + dx * 105);
      const green = Math.round(128 - dy * 105);
      const gradient = trailContext.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(${red}, ${green}, 255, ${0.7 * (1 - age)})`);
      gradient.addColorStop(1, `rgba(${red}, ${green}, 255, 0)`);
      trailContext.fillStyle = gradient;
      trailContext.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    root.classList.toggle('is-ripple-active', touches.length > 0);
    if (touches.length) frame = requestAnimationFrame(draw);
  };
  const requestDraw = () => { if (!frame) frame = requestAnimationFrame(draw); };

  const capture = async () => {
    const version = ++captureVersion;
    if (!ready) {
      root.classList.remove('is-ripple-ready');
      root.classList.remove('is-ripple-active');
    }
    try {
      await document.fonts.ready;
      const rect = title.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const bitmap = rasterizeTitle(title);
      if (version !== captureVersion) return;
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.style.left = `${-TITLE_PADDING}px`;
      canvas.style.top = `${-TITLE_PADDING}px`;
      canvas.style.width = `${rect.width + TITLE_PADDING * 2}px`;
      canvas.style.height = `${rect.height + TITLE_PADDING * 2}px`;
      trailCanvas.width = 64;
      trailCanvas.height = Math.max(16, Math.round(64 * rect.height / rect.width));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, trailTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
      gl.uniform2f(gl.getUniformLocation(program, 'uTrailSize'), trailCanvas.width, trailCanvas.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      ready = true;
      draw(performance.now());
      root.classList.add('is-ripple-ready');
    } catch (error) {
      console.warn('Hero ripple unavailable; keeping the HTML title.', error);
    }
  };

  window.addEventListener('pointermove', (event) => {
    if (!ready || event.pointerType !== 'mouse' || !visible || document.body.dataset.view !== 'home') return;
    const rect = title.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    const x = (event.clientX - rect.left + TITLE_PADDING) / (rect.width + TITLE_PADDING * 2);
    const y = (event.clientY - rect.top + TITLE_PADDING) / (rect.height + TITLE_PADDING * 2);
    const last = touches.at(-1);
    touches.push({ x, y, dx: last ? Math.max(-1, Math.min(1, (x - last.x) * 9)) : 0, dy: last ? Math.max(-1, Math.min(1, (y - last.y) * 9)) : 0, time: performance.now() });
    if (touches.length > 12) touches.shift();
    requestDraw();
  }, { passive: true });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) requestDraw(); }).observe(title);
  new ResizeObserver(() => { window.clearTimeout(capture.resizeTimer); capture.resizeTimer = window.setTimeout(capture, 150); }).observe(title);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestDraw(); });
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); ready = false; root.classList.remove('is-ripple-ready', 'is-ripple-active'); });
  void capture();
};
