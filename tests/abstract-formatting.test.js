const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const source = readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const data = source.slice(source.indexOf('const projects = ['), source.indexOf('const groupMeta ='));
const projects = new Function(`${data}; return projects;`)();
const summary = (id) => projects.find((project) => project.id === id).summary.map((block) => block.paragraph || block.bullets?.join(' ') || '').join('\n');

test('group 01 includes the supplied bilingual title and abstract', () => {
  const project = projects.find((item) => item.id === '01');
  assert.equal(project.title, '多視角擴散生成的幾何不一致分析與三維高斯重建緩解方法研究');
  assert.equal(project.titleEn, 'Analyzing and Mitigating Geometric Inconsistency in 3D Gaussian Reconstruction from Multi-View Diffusion Outputs');
  assert.equal(project.summary.length, 1);
  assert.equal(summary('01'), '本專題探討單張影像經多視角擴散模型生成後，其跨視角幾何不一致對三維高斯重建品質的影響。系統以 Wonder3D++ 產生六視角彩色影像與法向量圖，經去背與前景遮罩處理後，使用 AnySplat 快速建立三維高斯模型。為辨識潛在幾何衝突，本研究將法向量積分為相對深度，並與 AnySplat 預測深度進行對齊與比較，建立逐像素可靠度權重，降低衝突區域在高斯融合中的影響。透過基準版本與加權版本的對照實驗，分析重影、模糊、破碎及模型完整程度，並進一步評估後最佳化的改善效果，探索有限運算資源下兼顧重建品質與效率的方法。');
});

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
