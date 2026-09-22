async (page) => {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);
  const title = page.locator('#hero-title');
  const box = await title.boundingBox();
  const before = (await page.screenshot()).toString('base64');
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  const active = await page.locator('[data-hero-ripple]').evaluate((node) => node.classList.contains('is-ripple-active'));
  const after = (await page.screenshot()).toString('base64');
  const compare = await page.evaluate(async ({ before, after, box }) => {
    const bounds = async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const left = Math.floor(box.x);
      const right = left + 65;
      const top = Math.floor(box.y) - 8;
      const bottom = Math.floor(box.y + box.height / 2);
      let minX = right;
      let maxX = left;
      let minY = bottom;
      for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] > 225 && pixels[i + 1] > 225 && pixels[i + 2] > 225) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
        }
      }
      return { width: maxX - minX + 1, top: minY };
    };
    return { before: await bounds(before), after: await bounds(after) };
  }, { before, after, box });
  const ratio = compare.after.width / compare.before.width;
  if (!active || ratio < 0.96 || ratio > 1.04 || Math.abs(compare.after.top - compare.before.top) > 1) {
    throw new Error(`Title changes shape or clips on hover: ${JSON.stringify({ active, ratio, ...compare })}`);
  }
  return { active, ratio, ...compare };
}
