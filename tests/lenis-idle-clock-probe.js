async (page) => {
  await page.waitForFunction(() => Boolean(window.NutnLenis));
  await page.locator('[data-view="schedule"]').first().click();
  await page.locator('[data-view="home"]').first().click();

  const runStaleClockProbe = async (resumeEvent) => {
    await page.evaluate(async (shouldDispatchResume) => {
      const lenis = window.NutnLenis;
      lenis.scrollTo(0, { immediate: true });
      await new Promise((resolve) => setTimeout(resolve, 40));
      window.__lenisScrollSamples = [];
      if (!window.__hasLenisScrollProbe) {
        window.addEventListener('scroll', () => window.__lenisScrollSamples.push(Math.round(window.scrollY)), { passive: true });
        window.__hasLenisScrollProbe = true;
      }
      lenis.time = performance.now() - 5000;
      if (shouldDispatchResume) document.dispatchEvent(new Event('visibilitychange'));
    }, resumeEvent);

    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(180);
    await page.waitForFunction(() => window.NutnLenis.isScrolling === false, { timeout: 2000 });

    return page.evaluate(() => {
      const positions = [...new Set(window.__lenisScrollSamples)];
      return {
        positions,
        maxStep: Math.max(0, ...positions.slice(1).map((position, index) => Math.abs(position - positions[index]))),
        target: Math.round(window.NutnLenis.targetScroll),
        final: Math.round(window.scrollY),
        isScrolling: window.NutnLenis.isScrolling,
      };
    });
  };

  const results = {
    afterInternalViewSwitch: await runStaleClockProbe(false),
    afterVisibilityResume: await runStaleClockProbe(true),
  };
  for (const [scenario, result] of Object.entries(results)) {
    if (result.positions.length < 2 || result.positions[0] >= result.target || result.final !== result.target) {
      throw new Error(`Lenis skipped easing frames (${scenario}): ${JSON.stringify(result)}`);
    }
  }
  return results;
}
