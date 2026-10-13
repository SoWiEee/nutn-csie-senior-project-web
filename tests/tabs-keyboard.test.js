const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const source = readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8').replaceAll('\r\n', '\n');
const stateSource = source.slice(source.indexOf('const setFilterState ='), source.indexOf('const closeProjectDialog ='));
const setFilterState = new Function(`${stateSource}; return setFilterState;`)();
const keyboardSource = source.slice(source.indexOf('const bindTablistKeyboard ='), source.indexOf('const bindCardProximityLight ='));

const setup = (counts = [3, 2, 3]) => {
  let focused;
  const groups = counts.map((count) => {
    const group = { listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; } };
    group.tabs = Array.from({ length: count }, (_, index) => ({
      attributes: { 'aria-selected': String(index === 0) },
      classList: { toggle() {} },
      getAttribute(name) { return this.attributes[name]; },
      setAttribute(name, value) { this.attributes[name] = value; },
      closest() { return this; },
      focus(options) { focused = this; this.focusOptions = options; },
      click() { setFilterState(group.tabs, this); },
    }));
    group.querySelectorAll = () => group.tabs;
    return group;
  });
  new Function('document', `${keyboardSource}; bindTablistKeyboard();`)({ querySelectorAll: () => groups });
  const press = (group, index, key, extra = {}) => {
    let prevented = false;
    group.listeners.keydown({ target: group.tabs[index], key, preventDefault() { prevented = true; }, ...extra });
    return prevented;
  };
  return { groups, press, focused: () => focused };
};

test('each tablist has one tab stop and arrows activate only their own group', () => {
  const { groups, press, focused } = setup();
  for (const group of groups) {
    assert.deepEqual(group.tabs.map((tab) => tab.tabIndex), [0, ...group.tabs.slice(1).map(() => -1)]);
    assert.equal(press(group, 0, 'ArrowRight'), true);
    assert.equal(focused(), group.tabs[1]);
    assert.equal(group.tabs[1].getAttribute('aria-selected'), 'true');
    assert.equal(group.tabs.filter((tab) => tab.tabIndex === 0).length, 1);
    assert.deepEqual(focused().focusOptions, { preventScroll: true });
  }
});

test('arrows wrap and Home/End activate the first/last tabs', () => {
  const { groups: [group], press, focused } = setup([3]);
  press(group, 0, 'ArrowLeft');
  assert.equal(focused(), group.tabs[2]);
  press(group, 2, 'ArrowRight');
  assert.equal(focused(), group.tabs[0]);
  press(group, 0, 'End');
  assert.equal(focused(), group.tabs[2]);
  press(group, 2, 'Home');
  assert.equal(focused(), group.tabs[0]);
});

test('disabled/hidden tabs are skipped and native keys/modifier shortcuts are untouched', () => {
  const { groups: [group], press, focused } = setup([4]);
  group.tabs[1].disabled = true;
  group.tabs[2].hidden = true;
  press(group, 0, 'ArrowRight');
  assert.equal(focused(), group.tabs[3]);
  for (const key of ['Tab', 'Enter', ' ', 'ArrowDown']) assert.equal(press(group, 3, key), false);
  assert.equal(press(group, 3, 'ArrowRight', { ctrlKey: true }), false);
  assert.equal(focused(), group.tabs[3]);
  group.tabs[0].click();
  assert.deepEqual(group.tabs.map((tab) => tab.tabIndex), [0, -1, -1, -1]);
});
