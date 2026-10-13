const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const source = readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const data = source.slice(source.indexOf('const projects = ['), source.indexOf('const groupMeta ='));
const projects = new Function(`${data}; return projects;`)();
const summary = (id) => projects.find((project) => project.id === id).summary.map((block) => block.paragraph || block.bullets?.join(' ') || '').join('\n');

test('group 06 has four paragraphs, corrected spacing and unchanged reported results', () => {
  const project = projects.find((item) => item.id === '06');
  const text = summary('06');
  assert.equal(project.summary.length, 4);
  assert.doesNotMatch(text, /本研究以本研究以|三 類/);
  assert.match(text, /在 0\.5~32 Hz 有效頻段/);
  assert.match(text, /MCI F1 提升 31\.05%/);
  for (const value of ['33 : 4 : 2', '4,000', '11.51%', '30.15%', '97.17%']) assert.ok(text.includes(value), value);
});

test('Latin parentheses and requested acronym spacing are normalized', () => {
  for (const term of ['光體積變化描記訊號 (Photoplethysmography, PPG)', '卷積神經網路 (CNN)', '短時傅立葉轉換 (STFT)']) {
    assert.ok(summary('08').includes(term), term);
  }
  assert.ok(summary('10').includes('聚合器 (aggregator)'));
  assert.ok(summary('11').includes('採用 MPC'));
  assert.ok(summary('09').includes('Reader 觀測'));
});

test('abstracts have spaces at Chinese/Latin/digit boundaries and readable long-text paragraphs', () => {
  for (const project of projects.filter((item) => item.summary?.length)) {
    const text = summary(project.id);
    assert.doesNotMatch(text, /\p{Script=Han}[A-Za-z0-9]|[A-Za-z0-9%]\p{Script=Han}/u, `group ${project.id}`);
    assert.doesNotMatch(text, /（[A-Za-z0-9][^（）]*）/, `group ${project.id} Latin parentheses`);
  }
  assert.equal(projects.find((item) => item.id === '17').summary.length, 3);
});
