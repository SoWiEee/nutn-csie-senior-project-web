const projectView = document.querySelector('#view-projects');
const projectGrid = projectView?.querySelector('.project-grid--archive');
const projectDialog = document.querySelector('#project-dialog');

if (
  projectGrid &&
  'gpu' in navigator &&
  window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches
) {
  const tailDuration = 850;
  const idleRenderScale = 0.52;
  const scrollRenderScale = 0.36;
  const maxRenderPixels = 420_000;
  let canvas;
  let shader;
  let shaderPromise;
  let libraryPromise;
  let gpuPromise;
  let pauseTimer = 0;
  let scrollTimer = 0;
  let maskFrame = 0;
  let active = false;
  let scrolling = false;
  let disabled = false;
  let warned = false;
  let windowFocused = document.hasFocus();
  let lastPointer = null;
  let surfaceWidth = 0;
  let maskDirty = true;
  let renderWidth = 0;
  let renderHeight = 0;
  let canvasHeight = 0;

  const isActive = () => document.body.dataset.view === 'projects' && !projectDialog?.open && !document.hidden && windowFocused;
  const isPointerOverGrid = () => {
    if (!lastPointer) return false;
    const target = document.elementFromPoint(lastPointer.x, lastPointer.y);
    return Boolean(target && projectGrid.contains(target));
  };

  const loadLibrary = () => {
    libraryPromise ??= import('./vendor/shaders-4.0.0.js');
    return libraryPromise;
  };

  const loadGpu = () => {
    gpuPromise ??= loadLibrary().then(({ createSharedDevice }) => createSharedDevice({ powerPreference: 'low-power' }));
    return gpuPromise;
  };

  const resizeSmokeCanvas = (width, height) => {
    canvasHeight = height;
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    // ponytail: cap full-grid output work; raise after profiling confirms GPU headroom.
    const scale = Math.min(
      scrolling ? scrollRenderScale : idleRenderScale,
      Math.sqrt(maxRenderPixels / Math.max(1, width * height * devicePixelRatio ** 2)),
    );
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));
    if (nextWidth !== renderWidth || nextHeight !== renderHeight) {
      renderWidth = nextWidth;
      renderHeight = nextHeight;
      shader?.resize(renderWidth, renderHeight);
    }
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;
  };

  const syncSmokeMask = (refreshMask = false) => {
    if (!canvas) return;
    maskDirty ||= refreshMask;
    cancelAnimationFrame(maskFrame);
    maskFrame = requestAnimationFrame(() => {
      if (!canvas) return;
      const gridRect = projectGrid.getBoundingClientRect();
      if (!gridRect.width || !gridRect.height) {
        canvas.style.visibility = 'hidden';
        return;
      }

      const width = Math.ceil(gridRect.width);
      const height = Math.ceil(gridRect.height);
      const viewportTop = Math.max(0, gridRect.top);
      const viewportBottom = Math.min(window.innerHeight, gridRect.bottom);
      if (viewportBottom <= viewportTop) {
        canvas.style.visibility = 'hidden';
        if (active) pause(true);
        return;
      }

      surfaceWidth = width;
      canvas.style.top = '0px';
      canvas.style.right = 'auto';
      canvas.style.bottom = 'auto';
      canvas.style.left = '0';
      resizeSmokeCanvas(width, height);

      if (maskDirty) {
        const cardRects = [...projectGrid.querySelectorAll('.project-card--archive:not([hidden])')]
          .map((card) => {
            const rect = card.getBoundingClientRect();
            const radius = Number.parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
            return `<rect x="${(rect.left - gridRect.left).toFixed(2)}" y="${(rect.top - gridRect.top).toFixed(2)}" width="${rect.width.toFixed(2)}" height="${rect.height.toFixed(2)}" rx="${radius}" fill="white"/>`;
          })
          .filter(Boolean)
          .join('');

        if (!cardRects) {
          canvas.style.visibility = 'hidden';
          if (active) pause(true);
          return;
        }

        const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${cardRects}</svg>`;
        const maskImage = `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`;
        canvas.style.setProperty('mask-image', maskImage);
        canvas.style.setProperty('-webkit-mask-image', maskImage);
        canvas.style.setProperty('mask-mode', 'alpha');
        canvas.style.setProperty('mask-repeat', 'no-repeat');
        canvas.style.setProperty('-webkit-mask-repeat', 'no-repeat');
        canvas.style.setProperty('mask-size', '100% 100%');
        canvas.style.setProperty('-webkit-mask-size', '100% 100%');
        maskDirty = false;
      }

      canvas.style.visibility = 'visible';
      if (!active && isActive() && isPointerOverGrid()) activate(lastPointer);
    });
  };

  const createShader = () => {
    if (shader || shaderPromise || disabled) return;
    canvas = document.createElement('canvas');
    canvas.className = 'project-smoke-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.visibility = 'hidden';
    projectGrid.append(canvas);
    syncSmokeMask();

    shaderPromise = Promise.all([loadLibrary(), loadGpu()])
      .then(([{ createShader: createSmokeShader }, gpu]) => {
        if (!gpu) {
          disabled = true;
          throw new Error('WebGPU device is unavailable.');
        }
        return createSmokeShader(canvas, {
          components: [{
            type: 'ChromaFlow',
            id: 'project-grid-chroma',
            props: {
              baseColor: '#31577f',
              upColor: '#8eb9e6',
              downColor: '#3b6496',
              leftColor: '#5b86b5',
              rightColor: '#a1c8ee',
              intensity: 1.2,
              radius: 2.0,
              momentum: 30,
            },
          }],
        }, { gpu, disableTelemetry: true, observeElement: false });
      })
      .then((createdShader) => {
        shader = createdShader;
        shader.resize(renderWidth, renderHeight);
        canvas.style.width = '100%';
        canvas.style.height = `${canvasHeight}px`;
        if (active && isActive() && !scrolling) shader.resume();
        else shader.pause();
      })
      .catch((error) => {
        disabled = true;
        canvas?.remove();
        canvas = null;
        if (!warned) {
          warned = true;
          console.warn('ChromaFlow is unavailable; project cards will use their static styling.', error);
        }
      })
      .finally(() => { shaderPromise = null; });
  };

  const pause = (immediate = false) => {
    clearTimeout(pauseTimer);
    active = false;
    canvas?.classList.remove('is-active');
    if (immediate) {
      canvas?.classList.remove('is-fading');
      shader?.pause();
    } else {
      canvas?.classList.add('is-fading');
      pauseTimer = window.setTimeout(() => {
        canvas?.classList.remove('is-fading');
        shader?.pause();
      }, tailDuration);
    }
  };

  const activate = (event) => {
    if (event.pointerType === 'touch' || !isActive() || disabled || active) return;
    clearTimeout(pauseTimer);
    active = true;
    canvas?.classList.remove('is-fading');
    canvas?.classList.add('is-active');
    if (!shader) createShader();
    else if (!scrolling) shader.resume();
  };

  const syncView = () => {
    if (disabled) return;
    if (!isActive()) {
      clearTimeout(scrollTimer);
      scrolling = false;
      pause(true);
      return;
    }
    syncSmokeMask();
    if (isPointerOverGrid()) activate(lastPointer);
  };

  const handleScroll = () => {
    if (canvas) {
      const wasScrolling = scrolling;
      scrolling = true;
      if (!wasScrolling) {
        if (active) resizeSmokeCanvas(surfaceWidth, canvasHeight);
        // Keep the last rendered frame visible while scrolling; resume once movement settles.
        shader?.pause();
      }
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        scrolling = false;
        syncSmokeMask();
        if (active && isActive()) {
          if (lastPointer && isPointerOverGrid()) {
            window.dispatchEvent(new MouseEvent('mousemove', {
              clientX: lastPointer.x,
              clientY: lastPointer.y,
            }));
          }
          shader?.resume();
        }
      }, 220);
    }
    syncSmokeMask();
  };

  const trackPointer = (event) => {
    if (event.pointerType === 'touch') return;
    lastPointer = { x: event.clientX, y: event.clientY, pointerType: event.pointerType };
    if (projectGrid.contains(event.target)) activate(event);
  };

  const maskResizeObserver = new ResizeObserver(() => syncSmokeMask(true));
  maskResizeObserver.observe(projectGrid);
  projectGrid.querySelectorAll('.project-card--archive').forEach((card) => maskResizeObserver.observe(card));
  const maskFilterObserver = new MutationObserver(() => syncSmokeMask(true));
  maskFilterObserver.observe(projectGrid, { attributes: true, attributeFilter: ['hidden'], subtree: true });

  projectGrid.addEventListener('pointerenter', activate);
  projectGrid.addEventListener('pointerleave', () => pause());
  window.addEventListener('pointermove', trackPointer, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', () => syncSmokeMask(true), { passive: true });
  const viewObserver = new MutationObserver(syncView);
  viewObserver.observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
  const dialogObserver = new MutationObserver(syncView);
  if (projectDialog) dialogObserver.observe(projectDialog, { attributes: true, attributeFilter: ['open'] });
  projectDialog?.addEventListener('close', syncView);
  projectDialog?.addEventListener('cancel', syncView);
  document.addEventListener('visibilitychange', syncView);
  window.addEventListener('blur', () => { windowFocused = false; syncView(); });
  window.addEventListener('focus', () => { windowFocused = true; syncView(); });

  syncView();
}
