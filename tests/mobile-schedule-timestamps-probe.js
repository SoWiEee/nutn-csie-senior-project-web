async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-view="schedule"]').first().click();
  await page.waitForFunction(() => document.body.dataset.view === 'schedule');

  const result = await page.evaluate(() => {
    const schedule = [...document.querySelectorAll('.schedule--dense')].find((element) => element.offsetParent !== null);
    if (!schedule) throw new Error('No visible schedule group was found.');

    const times = [...schedule.querySelectorAll(':scope > .schedule-time')];
    const cards = [...schedule.querySelectorAll(':scope > .schedule-card--signal')];
    const firstTime = times[0];
    const firstCard = firstTime?.nextElementSibling;
    const style = firstTime ? getComputedStyle(firstTime) : null;
    return {
      columns: getComputedStyle(schedule).gridTemplateColumns.trim().split(/\s+/).length,
      timestampCount: times.length,
      rectangular: style?.clipPath === 'none' && Number.parseFloat(style.borderRadius) > 0,
      labelsFollowedByCards: times.every((time) => time.nextElementSibling?.classList.contains('schedule-card')),
      projectNumbersPresent: cards.length > 0 && cards.every((card) => /^\d{2}$/.test(card.querySelector('.schedule-card__number')?.textContent.trim() || '')),
      timestampAndCardAligned: Boolean(firstCard && Math.abs(firstTime.getBoundingClientRect().left - firstCard.getBoundingClientRect().left) < 1),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  if (result.columns !== 1 || result.timestampCount === 0 || !result.rectangular || !result.labelsFollowedByCards || !result.projectNumbersPresent || !result.timestampAndCardAligned || result.horizontalOverflow) {
    throw new Error(`Mobile schedule timestamps are not in a single aligned column: ${JSON.stringify(result)}`);
  }
  return result;
}
