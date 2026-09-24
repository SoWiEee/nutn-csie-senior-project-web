async (page) => {
  await page.waitForFunction(() => document.querySelector('[data-liquid-glass-root]')?.dataset.liquidGlassReady === 'true');
  const card = page.locator('[data-liquid-glass]').first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error('Date glass card is not visible.');

  const pointerX = bounds.x + bounds.width / 2;
  const pointerY = bounds.y + bounds.height / 2;
  await page.mouse.move(pointerX, pointerY);
  await page.waitForTimeout(180);

  const result = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('[data-liquid-glass]')];
    const canvases = cards.map((element) => element.querySelector('canvas'));
    const backdrop = document.querySelector('[data-site-backdrop-canvas]');
    const output = document.querySelector('[data-glass-debug-panel] pre');
    if (canvases.some((canvas) => !canvas) || !backdrop || !output) {
      throw new Error('Glass canvases, backdrop canvas, or debug panel are unavailable.');
    }

    const sample = (canvas) => {
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext('2d');
      context.drawImage(canvas, 0, 0);
      return [...context.getImageData(Math.floor(copy.width / 2), Math.floor(copy.height / 2), 1, 1).data];
    };
    const before = canvases.map(sample);
    if (before.some((pixel) => pixel[3] < 100)) {
      throw new Error(`Glass was not rendered before resume: ${JSON.stringify(before)}`);
    }

    let hidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    canvases.forEach((canvas) => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 220));

    const afterResume = canvases.map(sample);
    const backdropPixel = sample(backdrop);
    const entries = output.textContent.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    const latestVisibility = [...entries].reverse().find((entry) => entry.event === 'visibilitychange' && entry.visibility === 'visible');
    const pointer = latestVisibility?.snapshot?.glassRoots?.[0]?.pointer || null;
    return { before, afterResume, backdropPixel, pointer };
  });

  if (result.backdropPixel.slice(0, 3).reduce((sum, channel) => sum + channel, 0) < 30) {
    throw new Error(`Backdrop WebGL buffer is unreadable after resume: ${JSON.stringify(result)}`);
  }
  if (result.afterResume.some((pixel) => pixel[3] < 100 || pixel.slice(0, 3).reduce((sum, channel) => sum + channel, 0) < 30)) {
    throw new Error(`One or more glass surfaces were not refreshed with visible color: ${JSON.stringify(result)}`);
  }
  if (result.pointer?.active || result.pointer?.hasPosition || result.pointer?.velocityX || result.pointer?.velocityY) {
    throw new Error(`Pointer dynamics were not reset on resume: ${JSON.stringify(result)}`);
  }

  await page.mouse.move(bounds.x - 12, pointerY);
  await page.mouse.move(pointerX, pointerY);
  await page.waitForTimeout(220);
  result.afterHover = await page.evaluate(() => [...document.querySelectorAll('[data-liquid-glass] canvas')].map((canvas) => {
    const context = canvas.getContext('2d');
    return [...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data];
  }));
  if (result.afterHover.some((pixel) => pixel[3] < 100 || pixel.slice(0, 3).reduce((sum, channel) => sum + channel, 0) < 30)) {
    throw new Error(`Glass surfaces darkened after pointer hover: ${JSON.stringify(result)}`);
  }
  return result;
}
