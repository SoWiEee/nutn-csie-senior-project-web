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
  assert.equal(summary('01'), '本專題探討單張影像經多視角擴散模型生成後，其跨視角幾何不一致對三維高斯重建品質的影響。系統以 Wonder3D++ 產生六視角彩色影像與法向量圖，經過去背與前景遮罩處理後，使用 AnySplat 快速建立三維高斯模型。為辨識潛在幾何衝突，本研究將法向量積分為相對深度，並與 AnySplat 預測深度進行對齊與比較，建立逐像素可靠度權重，降低衝突區域在高斯融合中的影響。透過基準版本與加權版本的對照實驗，分析重影、模糊、破碎及模型完整程度，並進一步評估後最佳化的改善效果，探索有限運算資源下兼顧重建品質與效率的方法。');
});

test('group 13 retains its bilingual title and the supplied speech, inference, and fall-alert details', () => {
  const project = projects.find((item) => item.id === '13');
  const text = summary('13');
  assert.equal(project.title, '基於量子模糊推論之跨國語轉影像多模態評估智慧代理人');
  assert.equal(project.titleEn, 'A Cross-Border Speech-to-Image Multimodal Assessment Agent Based on Quantum Fuzzy Inference');
  assert.equal(project.summary.length, 4);
  for (const value of ['Automatic Speech Recognition, ASR', 'Quantum Fuzzy Inference Engine, QFIE', '中文、英文、越南語、印尼語及台語五種語言', '64 條 QCI', '30 秒', 'ntfy App', '這個公共場所有人跌到受傷，請幫忙通知救護人員']) {
    assert.ok(text.includes(value), value);
  }
  assert.doesNotMatch(text, /Whisper Taiwanese|Breeze ASR/);
});

test('group 14 retains the submitted navigation title and technical details', () => {
  const project = projects.find((item) => item.id === '14');
  const text = summary('14');
  assert.equal(project.title, '結合交通預測之即時動態導航系統');
  assert.equal(project.titleEn, 'A Real-Time Dynamic Navigation System Integrating Traffic Prediction');
  assert.equal(project.summary.length, 6);
  for (const value of ['OpenStreetMap 台灣路網', '交通部 TDX 路況', '中央氣象署氣象資料', 'A* 演算法', 'PageRank 殘差推送', '實際國道事故的回堵資料', '直接相依索引', '核心節點子圖切割', 'T-GCN 時空圖神經網路', '稀疏矩陣最佳化', '預測與實際車速的落差', '路徑搜尋效率與繞路時機']) {
    assert.ok(text.includes(value), value);
  }
});

test('groups 02, 07, and 17 reflect the current student-submitted text', () => {
  assert.match(summary('02'), /量子計算智慧（Quantum Computational Intelligence, QCI）評估機制之國小台語人機協同學習架構/);
  assert.match(summary('02'), /基因演算法（Genetic Algorithm, GA）/);
  assert.equal(projects.find((item) => item.id === '17').title, '基於深度學習技術之骨架式健身動作品質評估框架');
  assert.match(summary('07'), /\*\*普通移動設備\*\*/);
  assert.match(summary('07'), /\*\*移動設備內建感測器\*\*/);
});

test('submitted bold markdown renders as emphasis without exposing HTML', () => {
  const markupSource = source.slice(source.indexOf('const escapeHTML ='), source.indexOf('const timePointMarkup ='));
  const render = new Function(`${markupSource}; return projectSummaryMarkup;`)();
  assert.equal(render([{ paragraph: '**普通移動設備** <script>alert(1)</script>' }]), '<p><strong>普通移動設備</strong> &lt;script&gt;alert(1)&lt;/script&gt;</p>');
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
    if (project.id !== '02') assert.doesNotMatch(text, /（[A-Za-z0-9][^（）]*）/, `group ${project.id} Latin parentheses`);
  }
  assert.equal(projects.find((item) => item.id === '17').summary.length, 3);
});
