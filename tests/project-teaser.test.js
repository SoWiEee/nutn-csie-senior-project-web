const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../script.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

test('only the eleven complete projects render static lazy teaser banners', () => {
  const projectList = { innerHTML: '' };
  const ids = ['02', '03', '04', '05', '07', '09', '11', '12', '15', '16', '17'];
  const projects = [...ids.map((id) => ({ id, group: 'sense', title: `專題 ${id}`, summary: ['摘要'], members: '', conferenceTags: [] })),
    { id: '01', group: 'sense', title: '未完成', members: '', conferenceTags: [] },
    { id: '18', group: 'sense', title: '未提供圖片', summary: ['摘要'], members: '', conferenceTags: [] }];
  vm.runInNewContext(section('const projectTeasers =', 'const escapeHTML =')
    + section('const renderProjects =', 'let menuOpenedAtScrollY =') + '\nrenderProjects();', {
    projectList, projects, escapeHTML: (value) => String(value), groupName: () => '測試組',
    projectInfoMarkup: () => '', tagMarkup: () => '',
  });
  assert.equal((projectList.innerHTML.match(/<img /g) || []).length, 11);
  for (const id of ids) {
    assert.match(projectList.innerHTML, new RegExp(`<img src="assets/project-teasers/project-${id}\\.webp(?:\\?[^"]*)?"`));
  }
  assert.equal((projectList.innerHTML.match(/loading="lazy" decoding="async"/g) || []).length, 11);
  assert.equal((projectList.innerHTML.match(/alt="[^"]*[\u3400-\u9fff][^"]*"/g) || []).length, 11);
  assert.equal((projectList.innerHTML.match(/class="project-card__trigger"/g) || []).length, projects.length);
});

test('one full-card trigger opens details without preview behavior', () => {
  const events = {};
  const trigger = {
    dataset: { projectDetail: '05' },
    addEventListener: (name, listener) => { events[name] = listener; },
  };
  const opened = [];
  vm.runInNewContext(section('const bindProjectLinks =', 'const renderProjects =') + '\nbindProjectLinks();', {
    projectList: { querySelectorAll: () => [trigger] }, openProjectDialog: (id) => opened.push(id),
  });
  events.click();
  assert.deepEqual(opened, ['05']);
  assert.deepEqual(Object.keys(events), ['click']);
  assert.doesNotMatch(source, /projectTeaserPreview|project-teaser-preview/);
  for (const file of ['styles.css', 'release/styles.css']) {
    assert.doesNotMatch(readFileSync(resolve(__dirname, '..', file), 'utf8'), /project-teaser-preview/);
  }
});
