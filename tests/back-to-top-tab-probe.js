async (page) => {
  const results = {};

  for (const view of ['schedule', 'projects']) {
    await page.locator(`[data-view="${view}"]`).first().click();
    await page.waitForFunction((expectedView) => document.body.dataset.view === expectedView, view);

    const backToTop = page.locator('footer a[href="#top"]');
    await backToTop.scrollIntoViewIfNeeded();
    await backToTop.click();
    await page.waitForFunction(() => document.body.dataset.view === 'home');

    try {
      await page.waitForFunction(() => window.scrollY <= 1, { timeout: 2000 });
    } catch {
      // Capture the resulting position below so failures identify the source view.
    }

    results[view] = await page.evaluate(() => ({
      view: document.body.dataset.view,
      hash: window.location.hash,
      scrollY: Math.round(window.scrollY),
    }));

    if (results[view].view !== 'home' || results[view].scrollY > 1) {
      throw new Error(`Back-to-top failed from ${view}: ${JSON.stringify(results[view])}`);
    }
  }

  return results;
}
