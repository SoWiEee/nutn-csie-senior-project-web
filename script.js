const GLASS_DEBUG_PREFIX = '[DEBUG-glass-life-116]';
const glassDebugEnabled = new URLSearchParams(window.location.search).get('debugGlass') === '1';
const glassDebugEntries = [];
let glassDebugPanel = null;
let glassDebugSummary = null;
let glassDebugOutput = null;
let getGlassDebugSnapshot = () => ({ ready: false });

const updateGlassDebugPanel = () => {
  if (!glassDebugPanel || !glassDebugSummary || !glassDebugOutput) return;
  glassDebugSummary.textContent = `Glass debug · ${glassDebugEntries.length} events`;
  glassDebugOutput.textContent = glassDebugEntries.slice(-24).map((entry) => JSON.stringify(entry)).join('\n');
  glassDebugOutput.scrollTop = glassDebugOutput.scrollHeight;
};

const recordGlassDebug = (event, details = {}) => {
  if (!glassDebugEnabled) return;
  const entry = {
    wallTime: new Date().toISOString(),
    elapsedMs: Math.round(performance.now()),
    event,
    visibility: document.visibilityState,
    scrollY: Math.round(window.scrollY),
    ...details,
  };
  glassDebugEntries.push(entry);
  if (glassDebugEntries.length > 300) glassDebugEntries.shift();
  console.info(GLASS_DEBUG_PREFIX, JSON.stringify(entry));
  updateGlassDebugPanel();
};

const installGlassDebugPanel = () => {
  if (!glassDebugEnabled || !document.body || glassDebugPanel) return;
  const style = document.createElement('style');
  style.textContent = `
    [data-glass-debug-panel] { position: fixed; z-index: 2147483646; left: max(8px, env(safe-area-inset-left)); bottom: max(8px, env(safe-area-inset-bottom)); width: min(30rem, calc(100vw - 16px)); color: #eaf2ff; font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
    [data-glass-debug-panel] details { overflow: hidden; border: 1px solid rgb(153 194 255 / 42%); border-radius: 10px; background: rgb(5 13 28 / 94%); box-shadow: 0 8px 28px rgb(0 0 0 / 30%); }
    [data-glass-debug-panel] summary { min-height: 40px; padding: 10px 12px; cursor: pointer; font-weight: 700; touch-action: manipulation; }
    [data-glass-debug-panel] [data-debug-actions] { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 10px 10px; }
    [data-glass-debug-panel] button { min-height: 40px; padding: 0 10px; border: 1px solid rgb(153 194 255 / 30%); border-radius: 7px; background: #122546; color: inherit; font: inherit; touch-action: manipulation; }
    [data-glass-debug-panel] pre { max-height: 32vh; overflow: auto; margin: 0; padding: 0 10px 10px; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  `;
  const panel = document.createElement('aside');
  panel.dataset.glassDebugPanel = '';
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const actions = document.createElement('div');
  actions.dataset.debugActions = '';
  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.textContent = '記錄目前狀態';
  captureButton.addEventListener('click', () => recordGlassDebug('manual-snapshot', { snapshot: getGlassDebugSnapshot() }));
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = '複製紀錄';
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(glassDebugEntries, null, 2));
      copyButton.textContent = '已複製';
    } catch {
      copyButton.textContent = '展開後長按紀錄複製';
    }
  });
  const output = document.createElement('pre');
  output.setAttribute('aria-live', 'polite');
  actions.append(captureButton, copyButton);
  details.append(summary, actions, output);
  panel.append(details);
  document.head.append(style);
  document.body.append(panel);
  glassDebugPanel = panel;
  glassDebugSummary = summary;
  glassDebugOutput = output;
  updateGlassDebugPanel();
};

if (glassDebugEnabled) {
  window.NutnGlassDebug = Object.freeze({
    enabled: true,
    record: recordGlassDebug,
  });
}

const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
const viewButtons = [...document.querySelectorAll('[data-view]')];
const viewTabs = [...document.querySelectorAll('.view-tab')];
const viewPanels = [...document.querySelectorAll('[data-view-panel]')];
const scheduleList = document.querySelector('[data-schedule-list]');
const projectList = document.querySelector('[data-project-list]');
const projectDialog = document.querySelector('#project-dialog');
const projectDialogTitle = document.querySelector('#project-dialog-title');
const projectDialogEnglishTitle = document.querySelector('#project-dialog-title-en');
const projectDialogGroup = document.querySelector('#project-dialog-group');
const projectDialogMembers = document.querySelector('#project-dialog-members');
const projectDialogTags = document.querySelector('#project-dialog-tags');
const projectDialogSummary = document.querySelector('#project-dialog-summary');
const projectDialogSummaryContent = document.querySelector('#project-dialog-summary-content');
const projectDialogClose = document.querySelector('[data-project-dialog-close]');

const projects = [
  { id: '01', code: 'NUTN-CSIE-PRJ-116-001', group: 'sense', title: '第 01 組專題作品', members: '陳俊亦、吳誌軒', studentIds: 'S11259001、S11259009', advisor: '朱明毅', time: '13:00 ~ 13:15', conferenceTags: [] },
  { id: '02', code: 'NUTN-CSIE-PRJ-116-002', group: 'sense', title: '第 02 組專題作品', members: '陳函得、黃柏智', studentIds: 'S11259002、S11259016', advisor: '李健興', time: '13:15 ~ 13:30', conferenceTags: [] },
  { id: '03', code: 'NUTN-CSIE-PRJ-116-003', group: 'sense', title: '運用 Transformer 結合光流預測行人與行車路徑實現用路人安全', titleEn: 'Enhancing Road User Safety by Predicting Pedestrian and Vehicle Trajectories Using Transformer-Integrated Optical Flow', members: '翁立晨、黃可瑜、洪伯翊', studentIds: 'S11259004、S11259035、S11259046', advisor: '陳宗禧', time: '13:30 ~ 13:45', conferenceTags: ['TANET 2026'] },
  { id: '04', code: 'NUTN-CSIE-PRJ-116-004', group: 'sense', title: '第 04 組專題作品', members: '張以融、呂守勳、傅蜂貴', studentIds: 'S11259005、S11259007、S11259036', advisor: '朱明毅', time: '13:45 ~ 14:00', conferenceTags: [] },
  { id: '05', code: 'NUTN-CSIE-PRJ-116-005', group: 'sense', title: '第 05 組專題作品', members: '陳裕荃、林明亮', studentIds: 'S11259006、S11259053', advisor: '李建樹', time: '14:00 ~ 14:15', conferenceTags: [] },
  { id: '06', code: 'NUTN-CSIE-PRJ-116-006', group: 'sense', title: '第 06 組專題作品', members: '鐘培嘉、曾金宏、蘇奕安', studentIds: 'S11259008、S11259030、S11259047', advisor: '陳榮銘', time: '14:25 ~ 14:40', conferenceTags: [] },
  { id: '07', code: 'NUTN-CSIE-PRJ-116-007', group: 'sense', title: '第 07 組專題作品', members: '嚴才勝、李佾恩、黃聖傑', studentIds: 'S11259011、S11259044、S11259055', advisor: '蘇溢芳', time: '14:40 ~ 14:55', conferenceTags: [] },
  { id: '08', code: 'NUTN-CSIE-PRJ-116-008', group: 'sense', title: '第 08 組專題作品', members: '李祥安、蔡侑軒', studentIds: 'S11259012、S11259040', advisor: '李建樹', time: '14:55 ~ 15:10', conferenceTags: [] },
  { id: '09', code: 'NUTN-CSIE-PRJ-116-009', group: 'sense', title: '自然語言導向的三維視覺理解與物件定位', titleEn: 'Natural Language-Guided 3D Visual Understanding and Object Localization', members: '羅暐媁、莊旻芳、李安以', studentIds: 'S11259013、S11259019、S11259029', advisor: '林朝興', time: '15:10 ~ 15:25', conferenceTags: [] },
  { id: '10', code: 'NUTN-CSIE-PRJ-116-010', group: 'decision', title: '基於 VGGT 之多視角 3D 重建改進', titleEn: 'Enhancing VGGT for Efficient Multi-View 3D Reconstruction', members: '黃子齊、林崇瑋、陳冠友', studentIds: 'S11259014、S11259031、S11259039', advisor: '林朝興', time: '13:00 ~ 13:15', conferenceTags: [] },
  { id: '11', code: 'NUTN-CSIE-PRJ-116-011', group: 'decision', title: '第 11 組專題作品', members: '洪筱晴、張華庭', studentIds: 'S11259017、S11259042', advisor: '李建樹', time: '13:15 ~ 13:30', conferenceTags: [] },
  { id: '12', code: 'NUTN-CSIE-PRJ-116-012', group: 'decision', title: '中醫診斷治療系統', titleEn: 'Traditional Chinese Medicine Diagnosis and Treatment System', members: '楊諭昌、花揚景、李泳儀', studentIds: 'S11259018、S11259025、S11259049', advisor: '高啟洲', time: '13:30 ~ 13:45', conferenceTags: [] },
  { id: '13', code: 'NUTN-CSIE-PRJ-116-013', group: 'decision', title: '第 13 組專題作品', members: '武明乖、蕭麗麗', studentIds: 'S11259020、S11259021', advisor: '李健興', time: '13:45 ~ 14:00', conferenceTags: [] },
  { id: '14', code: 'NUTN-CSIE-PRJ-116-014', group: 'decision', title: '第 14 組專題作品', members: '黃奕睿、林秉達、葉芢杰', studentIds: 'S11259024、S11259027、S11259041', advisor: '高啟洲', time: '14:00 ~ 14:15', conferenceTags: [] },
  { id: '15', code: 'NUTN-CSIE-PRJ-116-015', group: 'decision', title: '第 15 組專題作品', members: '石皓宇', studentIds: 'S11259032', advisor: '朱明毅', time: '14:25 ~ 14:40', conferenceTags: [] },
  { id: '16', code: 'NUTN-CSIE-PRJ-116-016', group: 'decision', title: '基於 Slurm 與 Kubernetes 架構下 AI 伺服器 GPU 工作負載智慧排程', titleEn: 'Intelligent GPU Workload Scheduling Techniques for AI Servers under a Slurm-on-Kubernetes Architecture', members: '蕭友翰、鄭珽升', studentIds: 'S11259033、S11259043', advisor: '陳宗禧', time: '14:40 ~ 14:55', conferenceTags: ['TANET 2026'], summary: [
    {
      paragraph: '近年來，大型語言模型與生成式 AI 快速發展，GPU 已成為訓練、推論與資料處理的主要運算資源。然而大學實驗室與中小型叢集常由不同世代 GPU 組成，且 NVIDIA MPS 允許多個工作共享同一張 GPU，使 GPU 利用率、工作完成時間與批次佇列管理難以同時最佳化，常常面臨以下困境：',
      bullets: [
        '異質 GPU 的運算能力與記憶體容量不同，工作放置不能只看 GPU 數量。',
        'MPS 配額會影響共置工作數、可用容量與實際完成時間。',
      ],
    },
    {
      paragraph: '目前常見的系統大多只擅長其中一件事。傳統高效能運算排程器 Slurm 雖然擅長批次工作、佇列與資源管理，但傳統 FCFS 與 Backfill 主要依固定規則運作，難以同時感知 GPU 型號、MPS 配額、工作特徵與佇列狀態，也對彈性擴縮與雲端式管理不夠方便；相對地，容器平台如 Kubernetes 適合容器部署、自動擴縮與健康監控，並不直接提供 Slurm 的批次排程語意。現有研究較少在真實 Slurm 提交流程中，聯合處理異質 GPU、MPS 配額與學習式工作排序。',
    },
    {
      paragraph: '因此，本專題希望結合兩者優點，建立一套既能保有研究者熟悉的工作提交流程，又能做到動態分配 CPU、GPU 與儲存資源的系統。進一步地，我們也希望導入深度強化學習策略，讓系統可以根據工作佇列狀態與叢集狀態，自動做出更合理的資源分配決策。',
    },
  ] },
  { id: '17', code: 'NUTN-CSIE-PRJ-116-017', group: 'decision', title: '運動教練', titleEn: 'Sports Coach', members: '黃子勁', studentIds: 'S11259048', advisor: '陳宗禧', time: '14:55 ~ 15:10', conferenceTags: ['CVGIP 2026'] },
];

const groupMeta = {
  sense: { title: '智慧感知與訊號分析組', label: 'SENSE / SIGNAL ANALYSIS' },
  decision: { title: '智慧推論與決策系統組', label: 'INFERENCE / DECISION SYSTEMS' },
};

const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const tagMarkup = (tags = []) => tags.length ? tags.map((tag, index) => `<span class="conference-tag${index === 0 ? ' conference-tag--accent' : ''}">${escapeHTML(tag)}</span>`).join('') : '';
const projectSummaryMarkup = (blocks = []) => blocks.map(({ paragraph, bullets = [] }) => `<p>${escapeHTML(paragraph)}</p>${bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHTML(bullet)}</li>`).join('')}</ul>` : ''}`).join('');
const timePointMarkup = (time, className = '') => {
  const [start] = time.split(' ~ ');
  return `<time class="schedule-time${className ? ` ${className}` : ''}">${escapeHTML(start)}</time>`;
};
const groupName = (group) => groupMeta[group].title;
const projectInfoIcons = {
  group: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>',
  members: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5M16 9a2.5 2.5 0 1 0 0-5M16 14.5c2.2 0 3.8 1.1 4.5 3.5" /></svg>',
};
const projectInfoMarkup = (icon, label, value) => `<p><span class="project-card__info-icon" aria-hidden="true">${projectInfoIcons[icon]}</span><span class="sr-only">${label}</span>${escapeHTML(value)}</p>`;

const renderSchedule = () => {
  if (!scheduleList) return;
  scheduleList.innerHTML = Object.entries(groupMeta).map(([group, meta]) => {
    const groupProjects = projects.filter((project) => project.group === group);
    const rows = groupProjects.map((project, index) => `${index === 5 ? `${timePointMarkup('14:15', 'schedule-time--break')}<article class="schedule-card schedule-card--break" role="separator"><strong>Break 😴</strong></article>` : ''}
      ${timePointMarkup(project.time)}
      <article class="schedule-card schedule-card--signal" data-card-light>
        <span class="schedule-card__number" aria-hidden="true">${escapeHTML(project.id)}</span>
        <button class="schedule-card__trigger" type="button" data-schedule-project="${escapeHTML(project.id)}" aria-haspopup="dialog" aria-label="查看第 ${escapeHTML(project.id)} 組專題詳細資訊">
          <strong>${escapeHTML(project.title)}</strong>
          <span class="schedule-card__toggle" aria-hidden="true">↗</span>
        </button>
        <span class="schedule-card__signal" aria-hidden="true"><svg viewBox="0 0 96 24" focusable="false"><path d="M1 16h13l5-9 8 14 8-15 8 10h12l6-6 7 9h15" /></svg></span>
      </article>`).join('');
    return `<section class="agenda-group" data-schedule-group="${group}" aria-label="${escapeHTML(meta.title)}">
      <div class="schedule schedule--dense">${rows}</div>
    </section>`;
  }).join('');
};

const openProjectDialog = (projectId) => {
  const project = projects.find((item) => item.id === projectId);
  if (!project || !projectDialog) return;
  projectDialogTitle.textContent = project.title;
  projectDialogEnglishTitle.textContent = project.titleEn || '';
  projectDialogEnglishTitle.hidden = !project.titleEn;
  projectDialogGroup.textContent = `第 ${project.id} 組・${groupName(project.group)}`;
  projectDialogMembers.textContent = project.members;
  projectDialogTags.parentElement.hidden = project.conferenceTags.length === 0;
  projectDialogTags.innerHTML = tagMarkup(project.conferenceTags);
  projectDialogSummary.hidden = !project.summary?.length;
  projectDialogSummaryContent.innerHTML = projectSummaryMarkup(project.summary || []);
  if (typeof projectDialog.showModal === 'function') {
    projectDialog.showModal();
  } else {
    projectDialog.setAttribute('open', '');
  }
  projectDialogClose?.focus();
};

const bindScheduleProjectLinks = () => {
  scheduleList?.querySelectorAll('[data-schedule-project]').forEach((trigger) => {
    trigger.addEventListener('click', () => openProjectDialog(trigger.dataset.scheduleProject));
  });
};

const bindProjectLinks = () => {
  projectList?.querySelectorAll('[data-project-detail]').forEach((trigger) => {
    trigger.addEventListener('click', () => openProjectDialog(trigger.dataset.projectDetail));
  });
};

const renderProjects = () => {
  if (!projectList) return;
  projectList.innerHTML = projects.map((project, index) => `<article class="project-card project-card--archive" data-project-group="${project.group}" data-card-light>
    <button class="project-card__trigger" type="button" data-project-detail="${escapeHTML(project.id)}" aria-haspopup="dialog" aria-label="查看第 ${escapeHTML(project.id)} 組專題詳細資訊"></button>
    <div class="project-card__visual ${index % 3 === 1 ? 'project-card__visual--violet' : index % 3 === 2 ? 'project-card__visual--line' : ''}" aria-hidden="true"><span>${escapeHTML(project.id)}</span><i></i><i></i><i></i></div>
    <span class="project-card__shine" aria-hidden="true"></span>
    <div class="project-card__body"><h3>${escapeHTML(project.title)}</h3><div class="project-card__info">${projectInfoMarkup('group', 'GROUP', `第 ${project.id} 組・${groupName(project.group)}`)}${projectInfoMarkup('members', 'MEMBERS', project.members)}</div>${project.conferenceTags.length ? `<div class="tag-row" aria-label="研討會投稿標籤">${tagMarkup(project.conferenceTags)}</div>` : ''}</div>
    <span class="project-card__arrow" aria-hidden="true">↗</span>
  </article>`).join('');
};

let menuOpenedAtScrollY = 0;
const setMenuState = (isOpen) => {
  const restoreFocus = !isOpen && siteNav?.contains(document.activeElement) && window.matchMedia('(max-width: 48rem)').matches;
  if (isOpen) menuOpenedAtScrollY = window.scrollY;
  menuToggle?.setAttribute('aria-expanded', String(isOpen));
  siteNav?.classList.toggle('is-open', isOpen);
  if (restoreFocus) menuToggle?.focus();
};

const scrollToTopImmediately = () => {
  if (window.NutnLenis) {
    window.NutnLenis.scrollTo(0, { immediate: true });
    return;
  }
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previousBehavior;
};

const setView = (view, { updateHash = true } = {}) => {
  const nextView = ['home', 'schedule', 'projects'].includes(view) ? view : 'home';
  viewPanels.forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== nextView; panel.classList.toggle('is-active', panel.dataset.viewPanel === nextView); });
  viewTabs.forEach((tab) => { const active = tab.dataset.view === nextView; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); });
  document.body.dataset.view = nextView;
  setMenuState(false);
  if (updateHash) { history.replaceState(null, '', `#${nextView}`); scrollToTopImmediately(); }
  scheduleLiquidGlassForCurrentView('view');
};

const setFilterState = (buttons, activeButton) => buttons.forEach((button) => { const active = button === activeButton; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); });

const closeProjectDialog = () => {
  if (!projectDialog) return;
  if (typeof projectDialog.close === 'function') projectDialog.close();
  else projectDialog.removeAttribute('open');
};

projectDialogClose?.addEventListener('click', closeProjectDialog);
projectDialog?.addEventListener('click', (event) => { if (event.target === projectDialog) closeProjectDialog(); });

const headerState = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
  const mobileMenuOpen = menuToggle?.getAttribute('aria-expanded') === 'true' && window.matchMedia('(max-width: 48rem)').matches;
  if (mobileMenuOpen && window.scrollY - menuOpenedAtScrollY >= 72) setMenuState(false);
};
menuToggle?.addEventListener('click', () => setMenuState(menuToggle.getAttribute('aria-expanded') !== 'true'));
viewButtons.forEach((control) => control.addEventListener('click', (event) => {
  if (control.tagName === 'A') event.preventDefault();
  setView(control.dataset.view);
  if (control.dataset.scrollTarget) {
    const target = document.getElementById(control.dataset.scrollTarget);
    if (!target) return;
    if (window.NutnLenis) {
      const scrollMarginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      if (event.detail === 0) {
        window.NutnLenis.scrollTo(target, { offset: -scrollMarginTop, immediate: true });
        return;
      }
      window.NutnLenis.scrollTo(target, { offset: -scrollMarginTop });
      window.NutnLenis.requestFrame?.();
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}));
document.querySelectorAll('a[href="#top"]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  scrollToTopImmediately();
}));
window.addEventListener('scroll', headerState, { passive: true });
window.addEventListener('hashchange', () => setView(window.location.hash.slice(1), { updateHash: false }));

const scheduleFilters = [...document.querySelectorAll('[data-schedule-filter]')];
const applyScheduleFilter = (filter) => {
  const activeButton = scheduleFilters.find((button) => button.dataset.scheduleFilter === filter);
  if (!activeButton) return;
  setFilterState(scheduleFilters, activeButton);
  document.querySelectorAll('[data-schedule-group]').forEach((group) => { group.hidden = group.dataset.scheduleGroup !== filter; });
  scheduleLiquidGlassForCurrentView('schedule-filter');
};
scheduleFilters.forEach((button) => button.addEventListener('click', () => applyScheduleFilter(button.dataset.scheduleFilter)));

const projectFilters = [...document.querySelectorAll('[data-project-filter]')];
const projectFilterBar = projectFilters[0]?.closest('.filter-bar');
const updateProjectFilterIndicator = () => {
  const activeButton = projectFilters.find((button) => button.classList.contains('is-active'));
  if (!activeButton || !projectFilterBar) return;
  projectFilterBar.style.setProperty('--filter-indicator-x', `${activeButton.offsetLeft}px`);
  projectFilterBar.style.setProperty('--filter-indicator-y', `${activeButton.offsetTop}px`);
  projectFilterBar.style.setProperty('--filter-indicator-width', `${activeButton.offsetWidth}px`);
  projectFilterBar.style.setProperty('--filter-indicator-height', `${activeButton.offsetHeight}px`);
};
if (projectFilterBar) {
  updateProjectFilterIndicator();
  window.addEventListener('resize', updateProjectFilterIndicator, { passive: true });
  if ('ResizeObserver' in window) {
    const filterIndicatorResizeObserver = new ResizeObserver(updateProjectFilterIndicator);
    filterIndicatorResizeObserver.observe(projectFilterBar);
    projectFilters.forEach((button) => filterIndicatorResizeObserver.observe(button));
  }
  document.fonts?.ready.then(updateProjectFilterIndicator);
}
projectFilters.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.projectFilter;
  setFilterState(projectFilters, button);
  updateProjectFilterIndicator();
  document.querySelectorAll('[data-project-group]').forEach((card) => { card.hidden = filter !== 'all' && card.dataset.projectGroup !== filter; });
}));

const bindCardPointerLight = () => {
  const cardSelector = '[data-card-light]';
  let activeCard = null;
  let pointerFrame = 0;
  let pendingPointer = null;

  const clearCard = (card) => {
    if (!card) return;
    card.style.setProperty('--card-light-opacity', '0');
  };

  const flushPointer = () => {
    pointerFrame = 0;
    if (!pendingPointer) return;
    const { card, event } = pendingPointer;
    pendingPointer = null;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--card-pointer-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--card-pointer-y', `${event.clientY - rect.top}px`);
    card.style.setProperty('--card-light-opacity', '1');
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const target = event.target instanceof Element ? event.target.closest(cardSelector) : null;
    if (!target) {
      clearCard(activeCard);
      activeCard = null;
      return;
    }
    if (activeCard && activeCard !== target) clearCard(activeCard);
    activeCard = target;
    pendingPointer = { card: target, event };
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(flushPointer);
  }, { passive: true });

  document.addEventListener('pointerout', (event) => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest(cardSelector);
    const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (card && (!related || !card.contains(related))) {
      clearCard(card);
      if (activeCard === card) activeCard = null;
    }
  }, { passive: true });

  window.addEventListener('blur', () => {
    clearCard(activeCard);
    activeCard = null;
  }, { passive: true });
};

const backdropElement = document.querySelector('[data-site-backdrop]');
const backdropCanvas = document.querySelector('[data-site-backdrop-canvas]');
const backdropImage = document.querySelector('[data-site-backdrop-source]');
let backdropGl = null;

const BACKDROP_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const BACKDROP_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform vec2 u_image_size;
  uniform vec2 u_view_size;
  uniform vec2 u_pointer;
  uniform float u_time;

  vec2 cover_uv(vec2 uv) {
    float view_ratio = u_view_size.x / max(u_view_size.y, 1.0);
    float image_ratio = u_image_size.x / max(u_image_size.y, 1.0);
    vec2 crop = vec2(1.0);
    if (view_ratio > image_ratio) crop.y = image_ratio / view_ratio;
    else crop.x = view_ratio / image_ratio;
    return (uv - 0.5) * crop + 0.5;
  }

  float line(float value, float width) {
    return 1.0 - smoothstep(0.0, width, abs(fract(value) - 0.5));
  }

  float segment(vec2 p, vec2 a, vec2 b, float width) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(width, width * 1.8, length(pa - ba * h));
  }

  float pointGlow(vec2 p, vec2 center, float radius) {
    vec2 ratio = vec2(u_view_size.x / max(u_view_size.y, 1.0), 1.0);
    return exp(-length((p - center) * ratio) / radius);
  }

  void main() {
    vec2 uv = v_uv;
    vec2 image_uv = cover_uv(uv);
    vec3 photo = texture2D(u_image, image_uv).rgb;
    vec3 midnight = vec3(0.018, 0.034, 0.066);
    vec3 blue = vec3(0.22, 0.48, 1.0);
    vec3 ice = vec3(0.68, 0.84, 1.0);
    vec3 color = photo * 0.85;

    // Tracers run along the perspective paths already drawn in the artwork.
    float routeA = max(segment(image_uv, vec2(0.25, 0.31), vec2(0.73, 0.67), 0.0025),
                       segment(image_uv, vec2(0.73, 0.67), vec2(0.86, 0.86), 0.0025));
    float routeB = segment(image_uv, vec2(0.36, 0.29), vec2(0.78, 0.68), 0.0022);
    float routePhase = fract(u_time * 0.075);
    float routePulse = exp(-abs(image_uv.x - mix(0.25, 0.84, routePhase)) * 75.0);
    color += ice * (routeA + routeB * 0.75) * routePulse * 0.72;

    // The signal waveform breathes without shifting the underlying composition.
    float waveEnvelope = 1.0 - smoothstep(0.0, 0.12, abs(image_uv.x - 0.43));
    float waveY = 0.265 + sin((image_uv.x * 92.0) + u_time * 2.2) * 0.012 * waveEnvelope;
    float waveform = (1.0 - smoothstep(0.002, 0.006, abs(image_uv.y - waveY)))
      * smoothstep(0.29, 0.35, image_uv.x) * smoothstep(0.57, 0.50, image_uv.x);
    color += ice * waveform * (0.18 + waveEnvelope * 0.38);

    // Pulsing joints and a scanning ring animate the analysis motifs at right.
    vec2 joints[6];
    joints[0] = vec2(0.692, 0.430); joints[1] = vec2(0.683, 0.333);
    joints[2] = vec2(0.716, 0.270); joints[3] = vec2(0.640, 0.214);
    joints[4] = vec2(0.705, 0.155); joints[5] = vec2(0.660, 0.170);
    float jointLight = 0.0;
    for (int i = 0; i < 6; i++) {
      float beat = 0.55 + 0.45 * sin(u_time * 2.0 - float(i) * 0.65);
      jointLight += pointGlow(image_uv, joints[i], 0.012) * beat;
    }
    color += blue * jointLight * 0.16;

    vec2 scanCenter = vec2(0.865, 0.43);
    float scanRadius = 0.035 + fract(u_time * 0.18) * 0.16;
    float scanDistance = length((image_uv - scanCenter) * vec2(0.62, 1.0));
    float scanRing = 1.0 - smoothstep(0.004, 0.012, abs(scanDistance - scanRadius));
    color += ice * scanRing * (1.0 - smoothstep(0.18, 0.29, scanDistance)) * 0.22;

    // Pointer response remains local and subtle.
    color += blue * pointGlow(uv, u_pointer, 0.105) * 0.055;

    float vignette = smoothstep(0.3, 0.92, distance(uv, vec2(0.5)));
    color *= 1.0 - vignette * 0.18;
    color = mix(color, midnight, 0.05);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const compileBackdropShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const initSiteBackdrop = async () => {
  if (!backdropElement || !backdropCanvas || !backdropImage) return null;
  if (!backdropImage.complete) {
    await new Promise((resolve) => {
      backdropImage.addEventListener('load', resolve, { once: true });
      backdropImage.addEventListener('error', resolve, { once: true });
    });
  }

  const gl = backdropCanvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    // LiquidGlass reads this canvas later via drawImage(); without the
    // preserved buffer, some browsers expose a cleared (black) frame after
    // compositing or tab resume even while the canvas itself still looks right.
    preserveDrawingBuffer: true,
  });
  if (!gl || !backdropImage.naturalWidth || !backdropImage.naturalHeight) {
    recordGlassDebug('backdrop-unavailable', {
      hasWebGL: Boolean(gl),
      imageWidth: backdropImage.naturalWidth,
      imageHeight: backdropImage.naturalHeight,
    });
    backdropElement.classList.add('is-static-fallback');
    return null;
  }
  backdropGl = gl;
  if (glassDebugEnabled) {
    backdropCanvas.addEventListener('webglcontextlost', (event) => {
      recordGlassDebug('backdrop-context-lost', {
        cancelable: event.cancelable,
        snapshot: getGlassDebugSnapshot(),
      });
    });
    backdropCanvas.addEventListener('webglcontextrestored', () => {
      recordGlassDebug('backdrop-context-restored', { snapshot: getGlassDebugSnapshot() });
    });
  }

  const vertexShader = compileBackdropShader(gl, gl.VERTEX_SHADER, BACKDROP_VERTEX_SHADER);
  const fragmentShader = compileBackdropShader(gl, gl.FRAGMENT_SHADER, BACKDROP_FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertexShader || !fragmentShader || !program) {
    backdropElement.classList.add('is-static-fallback');
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    backdropElement.classList.add('is-static-fallback');
    return null;
  }

  const position = gl.createBuffer();
  const texture = gl.createTexture();
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const imageLocation = gl.getUniformLocation(program, 'u_image');
  const imageSizeLocation = gl.getUniformLocation(program, 'u_image_size');
  const viewSizeLocation = gl.getUniformLocation(program, 'u_view_size');
  const pointerLocation = gl.getUniformLocation(program, 'u_pointer');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  if (!position || !texture || positionLocation < 0 || !imageLocation || !imageSizeLocation || !viewSizeLocation || !pointerLocation || !timeLocation) {
    gl.deleteProgram(program);
    backdropElement.classList.add('is-static-fallback');
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdropImage);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.useProgram(program);
  gl.uniform1i(imageLocation, 0);
  gl.uniform2f(imageSizeLocation, backdropImage.naturalWidth, backdropImage.naturalHeight);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  let frame = 0;
  let disposed = false;
  const pointer = { x: 0.72, y: 0.54, targetX: 0.72, targetY: 0.54 };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(backdropElement.clientWidth * dpr));
    const height = Math.max(1, Math.round(backdropElement.clientHeight * dpr));
    if (backdropCanvas.width === width && backdropCanvas.height === height) return;
    backdropCanvas.width = width;
    backdropCanvas.height = height;
    gl.viewport(0, 0, width, height);
  };
  const draw = (time = 0) => {
    if (disposed) return;
    resize();
    gl.useProgram(program);
    gl.uniform2f(viewSizeLocation, backdropCanvas.width, backdropCanvas.height);
    pointer.x += (pointer.targetX - pointer.x) * 0.075;
    pointer.y += (pointer.targetY - pointer.y) * 0.075;
    gl.uniform2f(pointerLocation, pointer.x, pointer.y);
    gl.uniform1f(timeLocation, time * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const render = (time) => {
    draw(time);
    if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(render);
  };
  const onResize = () => draw(0);
  const onPointerMove = (event) => {
    pointer.targetX = event.clientX / Math.max(window.innerWidth, 1);
    pointer.targetY = 1 - event.clientY / Math.max(window.innerHeight, 1);
  };
  const onVisibility = () => {
    window.cancelAnimationFrame(frame);
    if (!document.hidden) render(performance.now());
  };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  backdropElement.classList.remove('is-static-fallback');
  render(0);
  return { canvas: backdropCanvas, image: backdropImage };
};

const siteBackdropReady = initSiteBackdrop().catch(() => {
  backdropElement?.classList.add('is-static-fallback');
  recordGlassDebug('backdrop-init-failed', { fallbackClass: backdropElement?.classList.contains('is-static-fallback') || false });
  return null;
});
const getLiquidGlassRoots = () => [...document.querySelectorAll('[data-liquid-glass-root]')];
const liquidGlassInstances = new Map();
const liquidGlassPending = new Map();
let liquidGlassConstructor = null;
let liquidGlassResizeTimer = 0;

const readCanvasSample = (canvas) => {
  if (!canvas) return { present: false };
  try {
    const context = canvas.getContext('2d');
    if (!context) return { present: true, width: canvas.width, height: canvas.height, context: 'unavailable' };
    const x = Math.max(0, Math.floor(canvas.width / 2));
    const y = Math.max(0, Math.floor(canvas.height / 2));
    const rgba = context.getImageData(x, y, 1, 1).data;
    return { present: true, width: canvas.width, height: canvas.height, centerRGBA: Array.from(rgba) };
  } catch (error) {
    return { present: true, width: canvas.width, height: canvas.height, sampleError: error.name || 'Error' };
  }
};

getGlassDebugSnapshot = () => ({
  fallbackFlag: document.documentElement.dataset.liquidGlassFallback || null,
  backdrop: {
    fallbackClass: backdropElement?.classList.contains('is-static-fallback') || false,
    contextLost: backdropGl?.isContextLost() ?? null,
    size: backdropCanvas ? [backdropCanvas.width, backdropCanvas.height] : null,
  },
  glassRoots: getLiquidGlassRoots().map((root) => {
    const instance = liquidGlassInstances.get(root);
    return {
      id: root.id || null,
      ready: root.dataset.liquidGlassReady === 'true',
      active: instance?._active ?? null,
      scrolling: instance?._scrolling ?? null,
      pointer: instance?._pointer ? {
        hasPosition: instance._pointer.hasPosition,
        active: instance._pointer.active,
        hoveredCard: typeof instance._pointer.hoverElement?.className === 'string' ? instance._pointer.hoverElement.className : null,
        x: Math.round(instance._pointer.clientX || 0),
        y: Math.round(instance._pointer.clientY || 0),
        velocityX: Math.round(instance._pointer.velocityX || 0),
        velocityY: Math.round(instance._pointer.velocityY || 0),
      } : null,
      rendererLostFlag: instance?.renderer?.contextLost ?? null,
      rendererContextLost: instance?.renderer?.gl?.isContextLost?.() ?? null,
      cards: [...root.querySelectorAll('[data-liquid-glass]')].map((card) => ({
        canvas: readCanvasSample(card.querySelector('canvas')),
        backgroundColor: getComputedStyle(card).backgroundColor,
        backgroundImage: getComputedStyle(card).backgroundImage,
      })),
    };
  }),
  lenis: window.NutnLenis ? {
    scrolling: window.NutnLenis.isScrolling,
    scroll: Math.round(window.NutnLenis.scroll || 0),
    animatedScroll: Math.round(window.NutnLenis.animatedScroll || 0),
    targetScroll: Math.round(window.NutnLenis.targetScroll || 0),
  } : { enabled: false },
});

const attachLiquidGlassDebugListeners = (instance) => {
  if (!glassDebugEnabled || !instance.renderer?.canvas) return;
  const canvas = instance.renderer.canvas;
  canvas.addEventListener('webglcontextlost', (event) => {
    recordGlassDebug('glass-context-lost', {
      cancelable: event.cancelable,
      defaultPrevented: event.defaultPrevented,
      snapshot: getGlassDebugSnapshot(),
    });
  });
  canvas.addEventListener('webglcontextrestored', () => {
    recordGlassDebug('glass-context-restored', { snapshot: getGlassDebugSnapshot() });
  });
};

const initGlassDiagnostics = () => {
  if (!glassDebugEnabled) return;
  installGlassDebugPanel();
  for (const root of getLiquidGlassRoots()) {
    for (const card of root.querySelectorAll('[data-liquid-glass]')) {
      for (const eventName of ['pointerenter', 'pointerleave']) {
        card.addEventListener(eventName, (event) => {
          window.setTimeout(() => recordGlassDebug(`glass-${eventName}`, {
            pointerType: event.pointerType || null,
            pointer: [Math.round(event.clientX), Math.round(event.clientY)],
            cardClass: typeof card.className === 'string' ? card.className : null,
            snapshot: getGlassDebugSnapshot(),
          }), 50);
        }, { passive: true });
      }
    }
  }
  document.addEventListener('visibilitychange', () => {
    recordGlassDebug('visibilitychange', { snapshot: getGlassDebugSnapshot() });
  });
  window.addEventListener('pagehide', (event) => {
    recordGlassDebug('pagehide', { persisted: event.persisted, snapshot: getGlassDebugSnapshot() });
  });
  window.addEventListener('pageshow', (event) => {
    recordGlassDebug('pageshow', { persisted: event.persisted, snapshot: getGlassDebugSnapshot() });
  });
  window.addEventListener('freeze', () => recordGlassDebug('freeze', { snapshot: getGlassDebugSnapshot() }));
  window.addEventListener('resume', () => recordGlassDebug('resume', { snapshot: getGlassDebugSnapshot() }));
  window.addEventListener('blur', () => recordGlassDebug('window-blur'));
  window.addEventListener('focus', () => recordGlassDebug('window-focus', { snapshot: getGlassDebugSnapshot() }));

  let debugScrolling = false;
  let lastProgressAt = 0;
  let scrollIdleTimer = 0;
  window.addEventListener('scroll', () => {
    const now = performance.now();
    if (!debugScrolling) {
      debugScrolling = true;
      lastProgressAt = now;
      recordGlassDebug('scroll-start', { snapshot: getGlassDebugSnapshot() });
    } else if (now - lastProgressAt >= 750) {
      lastProgressAt = now;
      recordGlassDebug('scroll-progress', { snapshot: getGlassDebugSnapshot() });
    }
    window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = window.setTimeout(() => {
      debugScrolling = false;
      lastProgressAt = 0;
      recordGlassDebug('scroll-idle', { snapshot: getGlassDebugSnapshot() });
    }, 280);
  }, { passive: true });

  recordGlassDebug('debug-start', {
    userAgent: navigator.userAgent,
    viewport: [window.innerWidth, window.innerHeight],
    devicePixelRatio: window.devicePixelRatio || 1,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    snapshot: getGlassDebugSnapshot(),
  });
};

const getLiquidGlassRenderScale = () => {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const memory = Number(navigator.deviceMemory) || 0;
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const lowPower = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
  if (coarsePointer) return lowPower ? 0.58 : 0.72;
  return lowPower ? 0.86 : 1;
};

const isLiquidGlassRootEligible = (root) => {
  const activeView = document.body.dataset.view || 'home';
  const panel = root.closest('[data-view-panel]');
  if ((panel && panel.dataset.viewPanel !== activeView) || root.closest('[hidden]')) return false;
  const rect = root.getBoundingClientRect();
  const margin = Math.max(160, window.innerHeight * 0.15);
  return rect.width > 0 && rect.height > 0 && rect.bottom >= -margin && rect.right >= -margin && rect.left <= window.innerWidth + margin && rect.top <= window.innerHeight + margin;
};

const initializeLiquidGlassRoot = async (root) => {
  if (liquidGlassInstances.has(root)) return liquidGlassInstances.get(root);
  if (liquidGlassPending.has(root)) return liquidGlassPending.get(root);
  if (!liquidGlassConstructor || !isLiquidGlassRootEligible(root)) return null;

  const initialize = async () => {
    const backdrop = await siteBackdropReady;
    const sourceImage = backdrop?.image || backdropImage;
    const sourceCanvas = backdrop?.canvas;
    const glassElements = [...root.children].filter((element) => element.hasAttribute('data-liquid-glass'));
    if (!glassElements.length) return null;
    const defaults = {
      blurAmount: 0.20,
      refraction: 0.84,
      chromAberration: 0.05,
      edgeHighlight: 0.1,
      specular: 0.02,
      fresnel: 0.88,
      distortion: 0.006,
      opacity: 0.82,
      saturation: 0.02,
      tintStrength: 0.025,
      brightness: -0.06,
      cornerRadius: 8,
      zRadius: 22,
      shadowOpacity: 0.24,
      shadowSpread: 4,
      shadowOffsetY: 1,
      pointerRadius: 175,
      pointerStrength: 0.92,
    };
    const instance = await liquidGlassConstructor.init({
      root,
      glassElements,
      backgroundImage: sourceImage,
      backgroundCanvas: sourceCanvas,
      renderScale: getLiquidGlassRenderScale(),
      active: true,
      captureGlassContent: false,
      prewarmCaptures: false,
      defaults,
    });
    glassElements.forEach((element) => {
      element.style.setProperty('background-color', 'rgba(18, 36, 70, 0.22)', 'important');
      element.style.setProperty('background-image', 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 42%)', 'important');
    });
    root.dataset.liquidGlassReady = 'true';
    instance.setActive(isLiquidGlassRootEligible(root));
    liquidGlassInstances.set(root, instance);
    attachLiquidGlassDebugListeners(instance);
    recordGlassDebug('liquidglass-ready', { root: root.id || null, snapshot: getGlassDebugSnapshot() });
    return instance;
  };

  const pending = initialize().catch((error) => {
    document.documentElement.dataset.liquidGlassFallback = 'true';
    recordGlassDebug('liquidglass-init-failed', { root: root.id || null, error: error.message || String(error) });
    console.warn('LiquidGlass enhancement unavailable; keeping the CSS glass fallback.', error);
    return null;
  }).finally(() => liquidGlassPending.delete(root));
  liquidGlassPending.set(root, pending);
  return pending;
};

const scheduleLiquidGlassForCurrentView = (reason = 'manual') => {
  if (!liquidGlassConstructor) return;
  for (const root of getLiquidGlassRoots()) {
    const active = isLiquidGlassRootEligible(root);
    const instance = liquidGlassInstances.get(root);
    if (glassDebugEnabled && instance && instance._active !== active) {
      const rect = root.getBoundingClientRect();
      recordGlassDebug('liquidglass-active-change', {
        reason,
        active,
        view: document.body.dataset.view || 'home',
        hidden: Boolean(root.closest('[hidden]')),
        rect: [Math.round(rect.top), Math.round(rect.bottom), Math.round(rect.width), Math.round(rect.height)],
        viewport: [window.innerWidth, window.innerHeight],
      });
    }
    instance?.setActive(active);
    if (active && !liquidGlassInstances.has(root)) void initializeLiquidGlassRoot(root);
  }
};

let liquidGlassScrollFrame = 0;
let liquidGlassScrollIdleTimer = 0;
const scheduleLiquidGlassDuringScroll = () => {
  if (!liquidGlassScrollFrame) {
    liquidGlassScrollFrame = window.requestAnimationFrame(() => {
      liquidGlassScrollFrame = 0;
      scheduleLiquidGlassForCurrentView('scroll');
    });
  }
  window.clearTimeout(liquidGlassScrollIdleTimer);
  liquidGlassScrollIdleTimer = window.setTimeout(() => {
    liquidGlassScrollIdleTimer = 0;
    scheduleLiquidGlassForCurrentView('scroll-idle');
  }, 180);
};

window.addEventListener('resize', () => {
  window.clearTimeout(liquidGlassResizeTimer);
  liquidGlassResizeTimer = window.setTimeout(() => scheduleLiquidGlassForCurrentView('resize'), 120);
}, { passive: true });

window.addEventListener('scroll', scheduleLiquidGlassDuringScroll, { passive: true });

const initLiquidGlass = () => {
  if (window.NutnLiquidGlass) {
    liquidGlassConstructor = window.NutnLiquidGlass;
    scheduleLiquidGlassForCurrentView();
    return;
  }
  window.addEventListener('nutn-liquidglass-ready', () => {
    if (window.NutnLiquidGlass) {
      liquidGlassConstructor = window.NutnLiquidGlass;
      scheduleLiquidGlassForCurrentView();
    }
  }, { once: true });
};

renderSchedule();
renderProjects();
bindScheduleProjectLinks();
bindProjectLinks();
bindCardPointerLight();
applyScheduleFilter(scheduleFilters[0]?.dataset.scheduleFilter || 'sense');
headerState();
setView(window.location.hash.slice(1), { updateHash: false });
initGlassDiagnostics();
void initLiquidGlass();
