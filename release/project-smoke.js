const projectView = document.querySelector('#view-projects');
const projectGrid = projectView?.querySelector('.project-grid--archive');
const projectDialog = document.querySelector('#project-dialog');

if (
  projectGrid &&
  'gpu' in navigator &&
  window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches
) {
  const tailDuration = 850;
  let canvas;
  let shader;
  let shaderPromise;
  let libraryPromise;
  let gpuPromise;
  let pauseTimer = 0;
  let maskFrame = 0;
  let active = false;
  let disabled = false;
  let warned = false;
  let windowFocused = document.hasFocus();

  const isActive = () => document.body.dataset.view === 'projects' && !projectDialog?.open && !document.hidden && windowFocused;

  const loadLibrary = () => {
    libraryPromise ??= import('./vendor/shaders-4.0.0.js');
    return libraryPromise;
  };

  const loadGpu = () => {
    gpuPromise ??= loadLibrary().then(({ createSharedDevice }) => createSharedDevice({ powerPreference: 'low-power' }));
    return gpuPromise;
  };

  const syncSmokeMask = () => {
    if (!canvas) return;
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
      const cardRects = [...projectGrid.querySelectorAll('.project-card--archive:not([hidden])')]
        .map((card) => {
          const rect = card.getBoundingClientRect();
          const radius = Number.parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
          return `<rect x="${(rect.left - gridRect.left).toFixed(2)}" y="${(rect.top - gridRect.top).toFixed(2)}" width="${rect.width.toFixed(2)}" height="${rect.height.toFixed(2)}" rx="${radius}" fill="white"/>`;
        })
        .join('');

      if (!cardRects) {
        canvas.style.visibility = 'hidden';
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
      canvas.style.visibility = 'visible';
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
            type: 'SmokeFlow',
            id: 'project-grid-smoke',
            props: {
              colorA: '#3b6398',
              colorB: '#1e3c6b',
              intensity: 0.4,
              emitRadius: 0.027,
              momentum: 14,
              dissipation: 0.55,
              detail: 12,
              gravity: -0.25,
              colorDecay: 0.5,
              colorSpace: 'oklab',
            },
          }],
        }, { gpu, disableTelemetry: true });
      })
      .then((createdShader) => {
        shader = createdShader;
        if (active && isActive()) shader.resume();
        else shader.pause();
      })
      .catch((error) => {
        disabled = true;
        canvas?.remove();
        canvas = null;
        if (!warned) {
          warned = true;
          console.warn('SmokeFlow is unavailable; project cards will use their static styling.', error);
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
    if (event.pointerType === 'touch' || !isActive() || disabled) return;
    clearTimeout(pauseTimer);
    active = true;
    canvas?.classList.remove('is-fading');
    canvas?.classList.add('is-active');
    if (shader) shader.resume();
    else createShader();
  };

  const syncView = () => {
    if (disabled) return;
    if (isActive()) syncSmokeMask();
    else pause(true);
  };

  const maskResizeObserver = new ResizeObserver(syncSmokeMask);
  maskResizeObserver.observe(projectGrid);
  projectGrid.querySelectorAll('.project-card--archive').forEach((card) => maskResizeObserver.observe(card));
  const maskFilterObserver = new MutationObserver(syncSmokeMask);
  maskFilterObserver.observe(projectGrid, { attributes: true, attributeFilter: ['hidden'], subtree: true });

  projectGrid.addEventListener('pointerenter', activate);
  projectGrid.addEventListener('pointerleave', () => pause());
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
