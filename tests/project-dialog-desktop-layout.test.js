const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const root = resolve(__dirname, '..');

for (const htmlFile of ['index.html', 'release/index.html']) {
  test(`${htmlFile} keeps group, Chinese title, and close control together for mobile scrolling`, () => {
    const html = readFileSync(resolve(root, htmlFile), 'utf8');
    const stickyStart = html.indexOf('<div class="project-dialog__sticky">');
    const stickyEnd = html.indexOf('</div>\n        <p class="project-dialog__title-en"', stickyStart);
    const stickyHeader = html.slice(stickyStart, stickyEnd);

    assert.notEqual(stickyStart, -1, 'dialog should have a sticky title wrapper');
    assert.notEqual(stickyEnd, -1, 'sticky title wrapper should end before scrollable details');
    assert.match(stickyHeader, /id="project-dialog-group"/);
    assert.match(stickyHeader, /id="project-dialog-title"/);
    assert.match(stickyHeader, /data-project-dialog-close/);
  });
}

for (const stylesheet of ['styles.css', 'release/styles.css']) {
  test(`${stylesheet} keeps project dialog layout and type sizing in sync`, () => {
    const css = readFileSync(resolve(root, stylesheet), 'utf8');
    const baseRuleIndex = css.indexOf('.project-dialog { width: min(calc(100% - 2rem), 42rem);');
    const desktopRuleIndex = css.indexOf('@media (min-width: 48.01rem) {', baseRuleIndex);

    assert.notEqual(baseRuleIndex, -1, 'base dialog rule should exist');
    assert.ok(desktopRuleIndex > baseRuleIndex, 'desktop override should follow the base dialog rule');

    const mediaEnd = css.indexOf('\n}', desktopRuleIndex);
    const desktopRules = css.slice(desktopRuleIndex, mediaEnd);
    assert.match(desktopRules, /width: min\(calc\(100% - 3rem\), 60rem\)/);
    assert.match(desktopRules, /max-height: calc\(100dvh - 8rem\)/);
    assert.match(desktopRules, /\.project-dialog h2 \{ max-width: 52rem; text-wrap: balance; \}/);
    assert.match(desktopRules, /\.project-dialog__title-en \{ max-width: 72ch; text-wrap: balance; \}/);
    assert.match(desktopRules, /\.project-dialog__field \{ grid-template-columns: minmax\(8\.5rem, max-content\) minmax\(0, 1fr\); \}/);
    assert.ok(/\.project-dialog__title-en \{[^}]*font-size: var\(--text-lg\);/.test(css), 'English subtitle should use the reduced desktop size');
    assert.ok(/\.project-dialog__summary h3 \{[^}]*font-size: var\(--text-lg\);/.test(css), 'abstract heading should use the next larger token');
    assert.ok(/\.project-dialog__summary-content \{[^}]*font-size: var\(--text-lg\);/.test(css), 'abstract content should use the next larger token');

    const wideLayoutIndex = css.indexOf('@media (min-width: 64.01rem) {', baseRuleIndex);
    const wideLayoutEnd = css.indexOf('\n}', wideLayoutIndex);
    const wideLayoutRules = css.slice(wideLayoutIndex, wideLayoutEnd);
    assert.match(wideLayoutRules, /\.project-dialog__details \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); column-gap: var\(--space-2xl\); \}/);

    const mobileLayoutIndex = css.indexOf('@media (max-width: 48rem) {', baseRuleIndex);
    const mobileLayoutEnd = css.indexOf('\n}', mobileLayoutIndex);
    const mobileLayoutRules = css.slice(mobileLayoutIndex, mobileLayoutEnd);
    assert.match(mobileLayoutRules, /\.project-dialog__sticky \{[^}]*position: sticky;[^}]*top: 0;/);
  });
}
