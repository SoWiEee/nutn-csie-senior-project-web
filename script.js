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
const projectDialogGroup = document.querySelector('#project-dialog-group');
const projectDialogMembers = document.querySelector('#project-dialog-members');
const projectDialogAdvisor = document.querySelector('#project-dialog-advisor');
const projectDialogTags = document.querySelector('#project-dialog-tags');
const projectDialogClose = document.querySelector('[data-project-dialog-close]');

const projects = [
  { id: '01', code: 'NUTN-CSIE-PRJ-116-001', group: 'sense', title: '第 01 組專題作品', members: '陳俊亦、吳誌軒', studentIds: 'S11259001、S11259009', advisor: '朱明毅', time: '13:00 ~ 13:15', conferenceTags: [] },
  { id: '02', code: 'NUTN-CSIE-PRJ-116-002', group: 'sense', title: '第 02 組專題作品', members: '陳函得、黃柏智', studentIds: 'S11259002、S11259016', advisor: '李健興', time: '13:15 ~ 13:30', conferenceTags: [] },
  { id: '03', code: 'NUTN-CSIE-PRJ-116-003', group: 'sense', title: '第 03 組專題作品', members: '翁立晨、黃可瑜、洪伯翊', studentIds: 'S11259004、S11259035、S11259046', advisor: '陳宗禧', time: '13:30 ~ 13:45', conferenceTags: [] },
  { id: '04', code: 'NUTN-CSIE-PRJ-116-004', group: 'sense', title: '第 04 組專題作品', members: '張以融、呂守勳、傅蜂貴', studentIds: 'S11259005、S11259007、S11259036', advisor: '朱明毅', time: '13:45 ~ 14:00', conferenceTags: [] },
  { id: '05', code: 'NUTN-CSIE-PRJ-116-005', group: 'sense', title: '第 05 組專題作品', members: '陳裕荃、林明亮', studentIds: 'S11259006、S11259053', advisor: '李建樹', time: '14:00 ~ 14:15', conferenceTags: [] },
  { id: '06', code: 'NUTN-CSIE-PRJ-116-006', group: 'sense', title: '第 06 組專題作品', members: '鐘培嘉、曾金宏、蘇奕安', studentIds: 'S11259008、S11259030、S11259047', advisor: '陳榮銘', time: '14:25 ~ 14:40', conferenceTags: [] },
  { id: '07', code: 'NUTN-CSIE-PRJ-116-007', group: 'sense', title: '第 07 組專題作品', members: '嚴才勝、李佾恩、黃聖傑', studentIds: 'S11259011、S11259044、S11259055', advisor: '蘇溢芳', time: '14:40 ~ 14:55', conferenceTags: [] },
  { id: '08', code: 'NUTN-CSIE-PRJ-116-008', group: 'sense', title: '第 08 組專題作品', members: '李祥安、蔡侑軒', studentIds: 'S11259012、S11259040', advisor: '李建樹', time: '14:55 ~ 15:10', conferenceTags: [] },
  { id: '09', code: 'NUTN-CSIE-PRJ-116-009', group: 'sense', title: '第 09 組專題作品', members: '羅暐媁、莊旻芳、李安以', studentIds: 'S11259013、S11259019、S11259029', advisor: '林朝興', time: '15:10 ~ 15:25', conferenceTags: [] },
  { id: '10', code: 'NUTN-CSIE-PRJ-116-010', group: 'decision', title: '第 10 組專題作品', members: '黃子齊、林崇瑋、陳冠友', studentIds: 'S11259014、S11259031、S11259039', advisor: '林朝興', time: '13:00 ~ 13:15', conferenceTags: [] },
  { id: '11', code: 'NUTN-CSIE-PRJ-116-011', group: 'decision', title: '第 11 組專題作品', members: '洪筱晴、張華庭', studentIds: 'S11259017、S11259042', advisor: '李建樹', time: '13:15 ~ 13:30', conferenceTags: [] },
  { id: '12', code: 'NUTN-CSIE-PRJ-116-012', group: 'decision', title: '第 12 組專題作品', members: '楊諭昌、花揚景、李泳儀', studentIds: 'S11259018、S11259025、S11259049', advisor: '高啟洲', time: '13:30 ~ 13:45', conferenceTags: [] },
  { id: '13', code: 'NUTN-CSIE-PRJ-116-013', group: 'decision', title: '第 13 組專題作品', members: '武明乖、蕭麗麗', studentIds: 'S11259020、S11259021', advisor: '李健興', time: '13:45 ~ 14:00', conferenceTags: [] },
  { id: '14', code: 'NUTN-CSIE-PRJ-116-014', group: 'decision', title: '第 14 組專題作品', members: '黃奕睿、林秉達、葉芢杰', studentIds: 'S11259024、S11259027、S11259041', advisor: '高啟洲', time: '14:00 ~ 14:15', conferenceTags: [] },
  { id: '15', code: 'NUTN-CSIE-PRJ-116-015', group: 'decision', title: '第 15 組專題作品', members: '石皓宇', studentIds: 'S11259032', advisor: '朱明毅', time: '14:25 ~ 14:40', conferenceTags: [] },
  { id: '16', code: 'NUTN-CSIE-PRJ-116-016', group: 'decision', title: '第 16 組專題作品', members: '蕭友翰、鄭珽升', studentIds: 'S11259033、S11259043', advisor: '陳宗禧', time: '14:40 ~ 14:55', conferenceTags: [] },
  { id: '17', code: 'NUTN-CSIE-PRJ-116-017', group: 'decision', title: '第 17 組專題作品', members: '黃子勁', studentIds: 'S11259048', advisor: '陳宗禧', time: '14:55 ~ 15:10', conferenceTags: [] },
];

const groupMeta = {
  sense: { title: '智慧感知與訊號分析組', label: 'SENSE / SIGNAL ANALYSIS' },
  decision: { title: '智慧推論與決策系統組', label: 'INFERENCE / DECISION SYSTEMS' },
};

const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const tagMarkup = (tags = []) => tags.length ? tags.map((tag, index) => `<span class="conference-tag${index === 0 ? ' conference-tag--accent' : ''}">${escapeHTML(tag)}</span>`).join('') : '';
const timePointMarkup = (time, className = '') => {
  const [start] = time.split(' ~ ');
  return `<time class="schedule-time${className ? ` ${className}` : ''}">${escapeHTML(start)}</time>`;
};
const groupName = (group) => groupMeta[group].title;
const projectInfoIcons = {
  group: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>',
  members: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5M16 9a2.5 2.5 0 1 0 0-5M16 14.5c2.2 0 3.8 1.1 4.5 3.5" /></svg>',
  advisor: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="10.5" height="11" rx="1" /><path d="M6.5 8h4M6.5 11h3M6 20h12M8 15.5V20" /><circle cx="17.5" cy="9" r="2.5" /><path d="M14.5 16.5c.4-2 1.4-3 3-3s2.6 1 3 3" /></svg>',
};
const projectInfoMarkup = (icon, label, value) => `<p><span class="project-card__info-icon" aria-hidden="true">${projectInfoIcons[icon]}</span><span class="sr-only">${label}</span>${escapeHTML(value)}</p>`;

const renderSchedule = () => {
  if (!scheduleList) return;
  scheduleList.innerHTML = Object.entries(groupMeta).map(([group, meta]) => {
    const groupProjects = projects.filter((project) => project.group === group);
    const rows = groupProjects.map((project, index) => `${index === 5 ? `${timePointMarkup('14:15', 'schedule-time--break')}<article class="schedule-card schedule-card--break" role="separator"><strong>中場休息</strong></article>` : ''}
      ${timePointMarkup(project.time)}
      <article class="schedule-card schedule-card--signal" data-card-light>
        <button class="schedule-card__trigger" type="button" data-schedule-project="${escapeHTML(project.id)}" aria-haspopup="dialog" aria-label="查看第 ${escapeHTML(project.id)} 組專題詳細資訊">
          <strong>${escapeHTML(project.title)}</strong>
          <span class="schedule-card__toggle" aria-hidden="true">↗</span>
        </button>
        <span class="schedule-card__signal" aria-hidden="true"><svg viewBox="0 0 96 24" focusable="false"><path d="M1 16h13l5-9 8 14 8-15 8 10h12l6-6 7 9h15" /></svg></span>
      </article>`).join('');
    return `<section class="agenda-group" data-schedule-group="${group}" aria-label="${escapeHTML(meta.title)}">
      <div class="schedule schedule--dense"><div class="schedule-row schedule-row--head"><span>TIME</span><span>PROJECT / TEAM</span></div>${rows}</div>
    </section>`;
  }).join('');
};

const openProjectDialog = (projectId) => {
  const project = projects.find((item) => item.id === projectId);
  if (!project || !projectDialog) return;
  projectDialogTitle.textContent = project.title;
  projectDialogGroup.textContent = `第 ${project.id} 組・${groupName(project.group)}`;
  projectDialogMembers.textContent = project.members;
  projectDialogAdvisor.textContent = project.advisor;
  projectDialogTags.innerHTML = tagMarkup(project.conferenceTags) || '<span class="conference-tag conference-tag--pending">—</span>';
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
    <div class="project-card__body"><h3>${escapeHTML(project.title)}</h3><div class="project-card__info">${projectInfoMarkup('group', 'GROUP', `第 ${project.id} 組・${groupName(project.group)}`)}${projectInfoMarkup('members', 'MEMBERS', project.members)}${projectInfoMarkup('advisor', 'ADVISOR', project.advisor)}</div><div class="tag-row" aria-label="研討會投稿標籤">${tagMarkup(project.conferenceTags)}</div></div>
    <span class="project-card__arrow" aria-hidden="true">↗</span>
  </article>`).join('');
};

const setMenuState = (isOpen) => {
  menuToggle?.setAttribute('aria-expanded', String(isOpen));
  siteNav?.classList.toggle('is-open', isOpen);
};

const setView = (view, { updateHash = true } = {}) => {
  const nextView = ['home', 'schedule', 'projects'].includes(view) ? view : 'home';
  viewPanels.forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== nextView; panel.classList.toggle('is-active', panel.dataset.viewPanel === nextView); });
  viewTabs.forEach((tab) => { const active = tab.dataset.view === nextView; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); });
  document.body.dataset.view = nextView;
  setMenuState(false);
  if (updateHash) { history.replaceState(null, '', `#${nextView}`); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  scheduleLiquidGlassForCurrentView();
};

const setFilterState = (buttons, activeButton) => buttons.forEach((button) => { const active = button === activeButton; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); });

const closeProjectDialog = () => {
  if (!projectDialog) return;
  if (typeof projectDialog.close === 'function') projectDialog.close();
  else projectDialog.removeAttribute('open');
};

projectDialogClose?.addEventListener('click', closeProjectDialog);
projectDialog?.addEventListener('click', (event) => { if (event.target === projectDialog) closeProjectDialog(); });

const headerState = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
menuToggle?.addEventListener('click', () => setMenuState(menuToggle.getAttribute('aria-expanded') !== 'true'));
viewButtons.forEach((control) => control.addEventListener('click', (event) => { if (control.tagName === 'A') event.preventDefault(); setView(control.dataset.view); }));
window.addEventListener('scroll', headerState, { passive: true });
window.addEventListener('hashchange', () => setView(window.location.hash.slice(1), { updateHash: false }));

const scheduleFilters = [...document.querySelectorAll('[data-schedule-filter]')];
const applyScheduleFilter = (filter) => {
  const activeButton = scheduleFilters.find((button) => button.dataset.scheduleFilter === filter);
  if (!activeButton) return;
  setFilterState(scheduleFilters, activeButton);
  document.querySelectorAll('[data-schedule-group]').forEach((group) => { group.hidden = group.dataset.scheduleGroup !== filter; });
  scheduleLiquidGlassForCurrentView();
};
scheduleFilters.forEach((button) => button.addEventListener('click', () => applyScheduleFilter(button.dataset.scheduleFilter)));

const projectFilters = [...document.querySelectorAll('[data-project-filter]')];
projectFilters.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.projectFilter;
  setFilterState(projectFilters, button);
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
  uniform float u_time;

  vec2 cover_uv(vec2 uv) {
    float view_ratio = u_view_size.x / max(u_view_size.y, 1.0);
    float image_ratio = u_image_size.x / max(u_image_size.y, 1.0);
    vec2 crop = vec2(1.0);
    if (view_ratio > image_ratio) crop.y = view_ratio / image_ratio;
    else crop.x = image_ratio / view_ratio;
    return (uv - 0.5) * crop + 0.5;
  }

  float line(float value, float width) {
    return 1.0 - smoothstep(0.0, width, abs(fract(value) - 0.5));
  }

  void main() {
    vec2 uv = v_uv;
    vec3 photo = texture2D(u_image, cover_uv(uv)).rgb;
    vec3 midnight = vec3(0.018, 0.034, 0.066);
    vec3 color = mix(midnight, photo * vec3(0.78, 0.84, 0.94), 0.64);

    float grid_x = line(uv.x * 7.0, 0.016);
    float grid_y = line(uv.y * 5.0, 0.016);
    float grid = max(grid_x, grid_y) * 0.032;
    color += vec3(0.12, 0.31, 0.7) * grid;

    float drift = fract(u_time * 0.018);
    float beam = exp(-abs(uv.x + uv.y * 0.42 - drift * 1.65 - 0.12) * 42.0);
    float pulse = exp(-abs(uv.y - (0.56 + sin(u_time * 0.11) * 0.08)) * 72.0);
    color += vec3(0.08, 0.25, 0.62) * beam * 0.085;
    color += vec3(0.18, 0.4, 0.92) * pulse * 0.035;

    float vignette = smoothstep(0.3, 0.92, distance(uv, vec2(0.5)));
    color *= 1.0 - vignette * 0.34;
    color = mix(color, midnight, 0.16);
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
  });
  if (!gl || !backdropImage.naturalWidth || !backdropImage.naturalHeight) {
    backdropElement.classList.add('is-static-fallback');
    return null;
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
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  if (!position || !texture || positionLocation < 0 || !imageLocation || !imageSizeLocation || !viewSizeLocation || !timeLocation) {
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
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
    gl.uniform1f(timeLocation, time * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const render = (time) => {
    draw(time);
    if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(render);
  };
  const onResize = () => draw(0);
  const onVisibility = () => {
    window.cancelAnimationFrame(frame);
    if (!document.hidden) render(performance.now());
  };
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  backdropElement.classList.remove('is-static-fallback');
  render(0);
  return { canvas: backdropCanvas, image: backdropImage };
};

const siteBackdropReady = initSiteBackdrop().catch(() => {
  backdropElement?.classList.add('is-static-fallback');
  return null;
});
const getLiquidGlassRoots = () => [...document.querySelectorAll('[data-liquid-glass-root]')];
const liquidGlassInstances = new Map();
const liquidGlassPending = new Map();
let liquidGlassConstructor = null;
let liquidGlassResizeTimer = 0;

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
    return instance;
  };

  const pending = initialize().catch((error) => {
    document.documentElement.dataset.liquidGlassFallback = 'true';
    console.warn('LiquidGlass enhancement unavailable; keeping the CSS glass fallback.', error);
    return null;
  }).finally(() => liquidGlassPending.delete(root));
  liquidGlassPending.set(root, pending);
  return pending;
};

const scheduleLiquidGlassForCurrentView = () => {
  if (!liquidGlassConstructor) return;
  for (const root of getLiquidGlassRoots()) {
    const active = isLiquidGlassRootEligible(root);
    liquidGlassInstances.get(root)?.setActive(active);
    if (active && !liquidGlassInstances.has(root)) void initializeLiquidGlassRoot(root);
  }
};

window.addEventListener('resize', () => {
  window.clearTimeout(liquidGlassResizeTimer);
  liquidGlassResizeTimer = window.setTimeout(scheduleLiquidGlassForCurrentView, 120);
}, { passive: true });

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
void initLiquidGlass();
