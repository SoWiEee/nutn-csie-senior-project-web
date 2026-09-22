async (page) => {
  await page.waitForFunction(() => document.querySelector('[data-liquid-glass-root]')?.dataset.liquidGlassReady === 'true');

  const result = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('[data-liquid-glass]')];
    const canvases = cards.map((card) => card.querySelector('canvas'));
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    scrollTo({ top: 160, behavior: 'instant' });
    await wait(300);
    const frames = [];
    for (let step = 1; step <= 16; step += 1) {
      scrollTo({ top: 160 + step * 12, behavior: 'instant' });
      await wait(30);
      frames.push({
        top: cards[0].getBoundingClientRect().top,
        pixels: canvases.map((canvas) => canvas.toDataURL()),
        alpha: canvases.map((canvas) => canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data[3]),
      });
    }
    return {
      travel: Math.round(frames[0].top - frames.at(-1).top),
      uniqueDuring: canvases.map((_, index) => new Set(frames.map((frame) => frame.pixels[index])).size),
      minAlpha: canvases.map((_, index) => Math.min(...frames.map((frame) => frame.alpha[index]))),
      fallback: document.documentElement.dataset.liquidGlassFallback === 'true',
    };
  });

  if (result.travel < 150 || result.uniqueDuring.some((count) => count < 3) || result.minAlpha.some((alpha) => alpha < 100) || result.fallback) {
    throw new Error(`Glass did not track scrolling: ${JSON.stringify(result)}`);
  }
  return result;
}
