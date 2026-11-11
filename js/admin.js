/* ===== Admin Panel Logic ===== */
const STORAGE_KEY = 'alalfi_admin_v1';
/* الجلسة (session token) تُخزَّن في sessionStorage فقط - تُمسح تلقائياً
   لما يقفل المتصفح أو التبويب. */
const SESSION_KEY = 'alalfi_admin_session';
const EDIT_TOKEN_KEY = 'alalfi_edit_token';
let charts = {};
let cropper = { img: null, x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0, targetField: null };
function destroyCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};
}

const defaultData = () => ({
  settings: {
    siteName: 'مدرسة الالفي الثانوية المشتركة',
    authority: 'إدارة منيا القمح التعليمية',
    email: 'info@alalfi-school.edu.eg',
    phone: '011-234-5678',
    address: 'منيا القمح، محافظة الشرقية، جمهورية مصر العربية',
    hours: 'الأحد - الخميس: 7:00 ص - 4:00 م',
    heroTitle: 'نُعلّم اليوم،\nلنصنع قادة الغد',
    heroKicker: 'مدرسة الالفي الثانوية المشتركة — إدارة منيا القمح التعليمية',
    ctaTitle: 'مدرسة حكومية تابعة لإدارة منيا القمح',
    ctaText: 'التسجيل والالتحاق عبر نظام الوزارة (EMIS) — للاستفسار تواصل مع الإدارة',
    primaryColor: '#1b3f7a',
    accentColor: '#c9a227',
    images: {
      hero: 'images/hero.jpg',
      about: 'images/campus.jpg',
      pageAbout: 'images/campus.jpg',
      pagePrograms: 'images/classroom.jpg',
      pageNews: 'images/library.jpg',
      pageGallery: 'images/teacher.jpg',
      pageContact: 'images/campus.jpg',
      cta: 'images/campus.jpg',
    },
  },
  about: {
    story: 'أقدم وأعرق مدرسة ثانوية عامة بمنيا القمح، تخرج منها العديد من القيادات في كل المجالات. نجمع بين متانة المناهج المصرية وروح الابتكار، لنقدم تجربة تعليمية متكاملة لكل طالب.',
    vision: 'أن نكون المدرسة الرائدة في تقديم تعليم متميز يشكل قادة الغد.',
    mission: 'توفير بيئة تعليمية آمنة ومحفزة تمكّن كل طالب من تحقيق أقصى إمكاناته.',
    values: 'الاحترام، النزاهة، التميز، التعاطف، والمسؤولية.',
  },
  news: [
    { id: 1, title: 'فوز أزهار عصام بالمركز الأول غناء', date: '2026-11-08', img: 'images/students.jpg', excerpt: 'تتويج ابنتنا أزهار عصام بالمركز الأول في الغناء ضمن فعاليات "مبادرة وطن بلا تنمر".' },
    { id: 2, title: 'مبادرة "وطن بلا تنمر"', date: '2026-11-08', img: 'images/classroom.jpg', excerpt: 'تحت إشراف أسرة الفلسفة: أ. سماح سعيد وأ. حنان عبد العزيز.' },
    { id: 3, title: 'زيارة موجهة اللغة الفرنسية', date: '2026-11-09', img: 'images/teacher.jpg', excerpt: 'استقبال أ. رشا عزمي (موجه أول) وأ. علا عزمي.' },
    { id: 4, title: 'البرنامج الإذاعي: الإشاعات وكيفية الحماية منها', date: '2026-11-09', img: 'images/hero.jpg', excerpt: 'تعاون بين الأسر لتنمية الوعي الإعلامي.' },
  ],
  events: [
    { id: 1, title: 'نهاية الفصل الدراسي الأول', date: '2026-11-06', note: 'جميع الصفوف الثانوية', tab: 'dates' },
    { id: 2, title: 'احتفالية اليوم الرياضي', date: '2026-11-12', note: 'الملعب الرئيسي — جميع المراحل', tab: 'dates' },
    { id: 3, title: 'معرض العلوم السنوي', date: '2026-11-18', note: 'قاعة الأنشطة — مفتوح لأولياء الأمور', tab: 'dates' },
    { id: 4, title: 'اجتماع أولياء الأمور', date: '2026-11-25', note: 'متابعة مستوى الطلاب', tab: 'dates' },
    { id: 5, title: 'بداية العام الدراسي 2026-2027', date: '2026-09-01', note: 'استقبال الطلاب', tab: 'calendar' },
  ],
  programs: [
    { id: 1, title: 'الصف الأول الثانوي — التمهيدي', age: 'السنة التمهيدية', desc: 'قاعدة معرفية قوية: عربية، تاريخ، رياضيات، علوم، فلسفة، لغة أجنبية. (لا تدخل within المجموع)', img: 'images/classroom.jpg' },
    { id: 2, title: 'طب وعلوم Leben', age: 'مسار 1', desc: 'صف 2: اختيار (رياضيات أو فيزياء) + 3 مواد عامة. ص 3: أحياء+كيمياء (متقدم) + تربية دينية (70%).', img: 'images/library.jpg' },
    { id: 3, title: 'هندسة وعلوم حاسب', age: 'مسار 2', desc: 'صف 2: اختيار (كيمياء أو برمجة) + 3 مواد عامة. ص 3: رياضيات+فيزياء (متقدم) + تربية دينية (70%).', img: 'images/teacher.jpg' },
    { id: 4, title: 'مسار أعمال', age: 'مسار 3', desc: 'صف 2: اختيار (محاسبة أو إدارة أعمال) + 3 مواد عامة. ص 3: اقتصاد (متقدم) + رياضيات + تربية دينية (70%).', img: 'images/campus.jpg' },
    { id: 5, title: 'مسار آداب وفنون', age: 'مسار 4', desc: 'صف 2: اختيار (علم نفس أو لغة ثانية) + 3 مواد عامة. ص 3: جغرافيا (متقدم) + إحصاء + تربية دينية (70%).', img: 'images/students.jpg' },
  ],
  gallery: [
    'images/school-photo-1.png', 'images/school-photo-2.png', 'images/school-fb-1.jpg',
    'images/campus.jpg', 'images/students.jpg', 'images/classroom.jpg', 'images/library.jpg',
    'images/teacher.jpg', 'images/hero.jpg',
  ],
  staff: [],
  leaders: [
    { id: 1, name: 'أ. أحمد صابر', role: 'مدير المدرسة', bio: 'قيادة تربوية متميزة.', img: '' },
    { id: 2, name: 'أ. داليا طلعت', role: 'المنسقة التربوية', bio: 'مشرفة وموجهة تربوية.', img: '' },
    { id: 3, name: 'د. وفاء طلبة', role: 'مدير عام الإدارة', bio: 'مدير عام إدارة منيا القمح التعليمية.', img: '' },
  ],
  users: [
    /* لا يوجد أي حساب افتراضي هنا - الحسابات كلها في قاعدة البيانات (D1)
       وتُدار من "المستخدمون" بواسطة المدير العام فقط. */
  ],
  media: [],
});

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const d = JSON.parse(raw);
    const def = defaultData();
    for (const k of Object.keys(def)) {
      if (d[k] === undefined) d[k] = def[k];
    }
    if (!d.settings.images) d.settings.images = def.settings.images;
    if (Array.isArray(d.gallery)) {
      d.gallery = d.gallery.map(g => (typeof g === 'string') ? { type: 'image', src: g } : g);
    }
    if (!Array.isArray(d.media)) d.media = [];
    return d;
  } catch (e) {
    return defaultData();
  }
}
/* Global sync: push the content to Cloudflare KV so EVERY visitor sees it */
let _syncTimer = null;
function syncGlobal(d, silent) {
  try {
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
      if (!sessionToken()) return;
      const content = Object.assign({}, d);
      delete content.users;

      fetch('/api/data', {
        method: 'PUT',
        headers: sessionHeaders(),
        body: JSON.stringify({ data: content }),
      })
        .then(r => r.json())
        .then(res => {
          if (res && res.ok) {
            if (!silent) toast('تم الحفظ والنشر للجميع');
          } else if (res && res.error && /session/i.test(res.error)) {
            endSession(); renderLogin(); toast('انتهت الجلسة - سجّل دخول تاني', true);
          } else if (!silent) {
            toast('تعذّر النشر: ' + ((res && res.error) || 'خطأ'), true);
          }
        })
        .catch(() => { if (!silent) toast('تعذّر الاتصال بالخادم', true); });
    }, 350);
  } catch (e) { /* ignore */ }
}

function saveData(d) {
  // local cache only - the server (D1) is the source of truth
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch (e) { /* quota - the server copy still saves */ }
  if (sessionToken()) syncGlobal(d, false);
  return true;
}

let data = loadData();
let session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');

function uid(arr) { return (arr.reduce((m, x) => Math.max(m, x.id || 0), 0) || 0) + 1; }
function readFileAsDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.onerror = reject; r.readAsDataURL(file); }); }
function toast(msg, err) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' error' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ===== Login ===== */
function userLoginUrl(username) {
  const base = location.origin + location.pathname;
  return base + '?u=' + encodeURIComponent(username);
}
function copyText(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.select();
  el.setSelectionRange(0, 99999);
  let done = false;
  try { done = document.execCommand('copy'); } catch (e) { done = false; }
  if (!done && navigator.clipboard) {
    navigator.clipboard.writeText(el.value).then(() => toast('تم نسخ الرابط')).catch(() => toast('انسخ الرابط يدوياً'));
  } else {
    toast(done ? 'تم نسخ الرابط' : 'انسخ الرابط يدوياً');
  }
}
function renderLogin() {
  const params = new URLSearchParams(location.search);
  const pre = (params.get('u') || '').trim();
  const known = pre ? data.users.find(x => (x.username || '').toLowerCase() === pre.toLowerCase()) : null;
  let hint = '';
  if (pre && known) hint = 'مرحباً ' + (known.name || known.username) + ' — أدخل كلمة المرور الخاصة بك';
  else if (pre) hint = 'رابط الدخول غير معروف — تأكد من العنوان';
  document.getElementById('app').innerHTML = `
    <div class="login-screen">
      <div class="login-box">
        <img src="images/logo.svg" alt="" style="width:70px;height:70px;margin:0 auto 12px;display:block;">
        <h1>لوحة التحكم</h1>
        <p>مدرسة الالفي الثانوية المشتركة</p>
        ${hint ? '<div class="login-hint">' + hint + '</div>' : ''}
        <div class="form-group"><label>اسم المستخدم</label><input id="lu" value="${esc(pre)}"${pre ? ' readonly' : ''}></div>
        <div class="form-group"><label>كلمة المرور</label><input id="lp" type="password" autocomplete="current-password"></div>
        <button class="btn btn-gold" style="width:100%;padding:12px;margin-top:8px;" onclick="doLogin()">تسجيل الدخول</button>
        ${pre ? '' : '<p style="margin-top:14px;font-size:11px;color:#8fa0b8;">الدخول يتم التحقق منه على الخادم - الحسابات يديرها المدير العام فقط</p>'}
      </div>
    </div>`;
  if (pre) setTimeout(() => { const lp = document.getElementById('lp'); if (lp) lp.focus(); }, 120);
}
function detectDevice() {
  const ua = navigator.userAgent || '';
  const os = /Windows NT 10/.test(ua) ? 'Windows'
    : /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux' : 'غير معروف';
  const br = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Edge\//.test(ua) ? 'Edge' : 'متصفح';
  const mob = /Mobi|Android|iPhone|iPad/i.test(ua) ? ' - موبايل' : '';
  return os + ' / ' + br + mob;
}

function doLogin() {
  const u = document.getElementById('lu').value.trim();
  const p = document.getElementById('lp').value;
  const btn = document.querySelector('#app .btn-gold');
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التحقق...'; }

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p, device: detectDevice() }),
  })
    .then(r => r.json())
    .then(res => {
      if (btn) { btn.disabled = false; btn.textContent = 'تسجيل الدخول'; }
      if (!res || !res.ok) {
        toast('اسم المستخدم أو كلمة المرور غير صحيحة', true);
        return;
      }
      session = {
        id: res.user.id, username: res.user.username, name: res.user.name,
        role: res.user.role, device: res.user.device || '', token: res.token,
      };
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
      // pull the user's list + content from the server
      pullGlobal(true);
      renderApp();
      toast('تم تسجيل الدخول بنجاح');
    })
    .catch(() => {
      if (btn) { btn.disabled = false; btn.textContent = 'تسجيل الدخول'; }
      toast('تعذّر الاتصال بالخادم', true);
    });
}

function doLogout() {
  endSession();
  renderLogin();
  toast('تم تسجيل الخروج');
}

/* ===== App shell ===== */
const sections = [
  { id: 'dashboard', label: 'لوحة المعلومات', icon: '📊' },
  { id: 'news', label: 'الأخبار', icon: '📰' },
  { id: 'events', label: 'الفعاليات', icon: '📅' },
  { id: 'programs', label: 'البرامج', icon: '🎓' },
  { id: 'gallery', label: 'المعرض', icon: '🖼️' },
  { id: 'staff', label: 'الكادر', icon: '👥' },
  { id: 'leaders', label: 'القيادة', icon: '🏛️' },
  { id: 'about', label: 'من نحن', icon: 'ℹ️' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  { id: 'media', label: 'مكتبة الوسائط', icon: '📁' },
  { id: 'account', label: 'حسابي', icon: '🔑' },
  { id: 'users', label: 'المستخدمون', icon: '🔐', superadmin: true },
];

/* Permission levels: none | view | edit | full */
const PERM_LEVELS = [
  { v: 'none', label: 'مفيش' },
  { v: 'view', label: 'قراءة' },
  { v: 'edit', label: 'تعديل' },
  { v: 'full', label: 'كامل' },
];

const DEFAULT_PERMS = {
  dashboard: 'view', news: 'edit', events: 'edit', programs: 'edit',
  gallery: 'edit', staff: 'edit', leaders: 'edit', about: 'edit',
  settings: 'none', media: 'edit', account: 'full', users: 'none',
};

function defaultPerms() {
  return Object.assign({}, DEFAULT_PERMS);
}
function permLevel(secId) {
  if (!session) return 'none';
  if (session.role === 'superadmin') return 'full';
  const u = data.users.find(x => x.id === session.id);
  const p = (u && u.perms) ? u.perms : DEFAULT_PERMS;
  return p[secId] || 'none';
}
function permRank(v) { return { none: 0, view: 1, edit: 2, full: 3 }[v] || 0; }
function canView(secId) { return permRank(permLevel(secId)) >= 1; }
function canEdit(secId) { return permRank(permLevel(secId)) >= 2; }
function canFull(secId) { return permRank(permLevel(secId)) >= 3; }

let currentSection = 'dashboard';

function visibleSections() {
  return sections.filter(s => {
    if (s.id === 'account') return true;
    if (s.superadmin) return session && session.role === 'superadmin';
    return canView(s.id);
  });
}
function canAccess(id) {
  const sec = sections.find(s => s.id === id);
  if (!sec) return false;
  if (sec.id === 'account') return true;
  if (sec.superadmin) return session && session.role === 'superadmin';
  return canView(id);
}

function renderApp() {
  if (!session) { renderLogin(); return; }
  document.getElementById('app').innerHTML = `
    <div class="admin-shell">
      <aside class="sidebar" id="sidebar">
        <button class="sidebar-close" id="sidebarClose" onclick="closeSidebar()" aria-label="إغلاق القائمة">✕</button>
        <div class="brand">
          <img src="images/logo.svg" alt="">
          <div><h1>لوحة التحكم</h1><small>${data.settings.siteName}</small></div>
        </div>
        <nav>
          ${visibleSections().map(s => `<a href="#" data-sec="${s.id}" class="${s.id===currentSection?'active':''}"><span class="ic">${s.icon}</span>${s.label}</a>`).join('')}
        </nav>
        <div class="foot">
          <div class="user-chip">
            <div class="av">${(session.name||session.username).charAt(0)}</div>
            <div><div class="nm">${session.name||session.username}</div><div class="rl">${session.role==='superadmin'?'مدير عام (صلاحيات كاملة)':'محرر'}</div></div>
          </div>
          <button class="btn btn-outline-ad" onclick="exportData()">تصدير JSON</button>
          <button class="btn btn-outline-ad" onclick="document.getElementById('importFile').click()">استيراد JSON</button>
          <input type="file" id="importFile" accept="application/json" style="display:none" onchange="importData(event)">
          <button class="btn btn-danger" onclick="doLogout()">تسجيل الخروج</button>
          <div style="text-align:center;font-size:10px;color:#8fa0b8;margin-top:4px;">v1.0</div>
        </div>
      </aside>
      <button class="menu-toggle" id="sidebarToggle" onclick="toggleSidebar()" aria-label="فتح القائمة">☰</button>
      <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
      <div class="main">
        <div class="topbar">
          <div class="left">
            <span class="logo-text">AlAlfi Admin</span>
            <button class="company-select">مدرسة الالفي ▾</button>
            <h2 id="pageTitle" style="font-family:var(--ad-font-head);font-size:20px;margin:0 12px;color:var(--ad-ink);">${sections.find(s=>s.id===currentSection).label}</h2>
          </div>
          <div class="right">
            <div class="search-box"><input placeholder="بحث..." oninput="globalSearch(this.value)"></div>
            <button class="icon-btn" title="الإشعارات">🔔</button>
            <button class="icon-btn" title="الإعدادات" onclick="switchSection('settings')">⚙️</button>
            <div class="user-chip" style="background:var(--ad-card);padding:4px 10px 4px 4px;border-radius:999px;display:flex;align-items:center;gap:8px;">
              <div class="av" style="width:28px;height:28px;border-radius:50%;background:var(--ad-gold);display:grid;place-items:center;font-weight:800;color:var(--ad-sidebar);font-size:11px;">${(session.name||session.username).charAt(0)}</div>
              <span style="font-size:12px;font-weight:700;">${session.name||session.username}</span>
            </div>
            <button class="btn btn-gold btn-sm" onclick="openQuickAdd()">+ إضافة</button>
          </div>
        </div>
        <div class="content" id="content"></div>
      </div>
    </div>
    <div class="modal-backdrop" id="modalBackdrop"><div class="modal" id="modal"></div></div>
    <div class="modal-backdrop" id="cropBackdrop"><div class="modal" id="cropModal" style="max-width:420px;"></div></div>
    <div class="toast" id="toast"></div>`;
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      switchSection(a.dataset.sec);
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
  renderSection(currentSection);
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (!sb) return;
  const open = sb.classList.toggle('open');
  if (bd) bd.classList.toggle('show', open);
  document.body.classList.toggle('sidebar-open', open);
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('show');
  document.body.classList.remove('sidebar-open');
}

function switchSection(id) {
  if (!canAccess(id)) { toast('ليس لديك صلاحية لهذا القسم', true); return; }
  currentSection = id;
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.sec === id));
  const sec = sections.find(s=>s.id===id);
  document.getElementById('pageTitle').textContent = sec.label;
  const bc = document.getElementById('pageBreadcrumb');
  if (bc) bc.textContent = 'لوحة التحكم / ' + sec.label;
  renderSection(id);
}

function renderSection(id) {
  const c = document.getElementById('content');
  const renders = {
    dashboard: renderDashboard,
    news: renderNews,
    events: renderEvents,
    programs: renderPrograms,
    gallery: renderGallery,
    staff: renderStaff,
    leaders: renderLeaders,
    about: renderAbout,
    settings: renderSettings,
    media: renderMedia,
    account: renderAccount,
    users: renderUsers,
  };
  renders[id](c);
  applyPerms(id, c);
}

/* Hide actions the current user is not allowed to perform */
function applyPerms(id, c) {
  if (!c) return;
  const lvl = permLevel(id);
  if (lvl === 'full') return;

  const hide = (sel) => c.querySelectorAll(sel).forEach(el => {
    el.style.display = 'none';
    el.setAttribute('data-perm-hidden', '1');
  });

  if (permRank(lvl) < 3) {
    // destructive / admin-only actions
    hide('[onclick*="delete"],[onclick*="Delete"],[onclick*="removeUser"],[onclick*="resetData"],[onclick*="importData"]');
  }
  if (permRank(lvl) < 2) {
    // any create/edit action
    hide('[onclick*="add"],[onclick*="Add"],[onclick*="edit"],[onclick*="Edit"],[onclick*="save"],[onclick*="Save"],[onclick*="openCropper"],[onclick*="openModal"],[onclick*="openQuickAdd"],[onclick*="upload"],[onclick*="toggleCrop"]');
    hide('button.btn-gold, button.btn-danger');
  }
  if (lvl === 'view') {
    // read-only banner
    const bar = document.createElement('div');
    bar.className = 'perm-banner';
    bar.textContent = 'وضع القراءة فقط — التعديل غير مسموح في هذا القسم';
    c.insertBefore(bar, c.firstChild);
  }
}

/* ===== Dashboard ===== */
function renderDashboard(c) {
  destroyCharts();
  c.innerHTML = `
    <div class="cards">
      <div class="card"><span class="icon">📰</span><div class="label">Total Value</div><div class="value">${data.news.length}</div><div class="sub">خبر منشور</div></div>
      <div class="card"><span class="icon">📅</span><div class="label">Daily Profit</div><div class="value">${data.events.length}</div><div class="sub">فعالية مجدولة</div></div>
      <div class="card"><span class="icon">🎓</span><div class="label">Bots Working</div><div class="value">${data.programs.length}</div><div class="sub">برنامج تعليمي</div></div>
      <div class="card accent"><span class="icon">👥</span><div class="label">Algos Total</div><div class="value">${data.staff.length}</div><div class="sub">موظف</div></div>
    </div>

    <div class="chart-card slide-up" style="margin-bottom:18px;">
      <h3>Global Progress <span class="badge badge-gold">USD</span></h3>
      <div class="chart-wrap"><canvas id="chartArea"></canvas></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;">
      <div class="chart-card">
        <h3>Allocation by Currency</h3>
        <div class="chart-wrap"><canvas id="chartDonut1"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Allocation by Algo</h3>
        <div class="chart-wrap"><canvas id="chartDonut2"></canvas></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
      <div class="chart-card">
        <h3>Profit by Bot</h3>
        <div class="chart-wrap"><canvas id="chartBar1"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Profit by Algo</h3>
        <div class="chart-wrap"><canvas id="chartBar2"></canvas></div>
      </div>
    </div>

    <div class="section-head" style="margin-top:24px;"><h3>آخر الأخبار</h3><button class="btn btn-outline-ad btn-sm" onclick="switchSection('news')">عرض الكل</button></div>
    <div class="table-wrap slide-up">
      <table>
        <thead><tr><th>العنوان</th><th>التاريخ</th><th>الإجراءات</th></tr></thead>
        <tbody>
          ${data.news.slice(0,6).map(n => `<tr>
            <td>${n.title}</td>
            <td>${n.date}</td>
            <td><button class="btn btn-outline-ad btn-sm" onclick="editNews(${n.id})">تعديل</button></td>
          </tr>`).join('') || '<tr><td colspan="3"><div class="empty"><div class="ic">📰</div><h4>لا توجد أخبار</h4><p>أضف أول خبر من قسم الأخبار</p></div></td></tr>'}
        </tbody>
      </table>
    </div>
    <div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-gold" onclick="switchSection('news')">إدارة الأخبار</button>
      <button class="btn btn-outline-ad" onclick="exportData()">تصدير البيانات</button>
      <button class="btn btn-outline-ad" onclick="resetData()">إعادة تعيين</button>
    </div>`;
  setTimeout(initDashboardCharts, 50);
}


function initDashboardCharts() {
  const turquoise = '#2dd4bf';
  const orange = '#f97316';
  const blue = '#3b82f6';
  const purple = '#a855f7';

  const ctxArea = document.getElementById('chartArea');
  if (ctxArea) {
    charts.area = new Chart(ctxArea, {
      type: 'line',
      data: {
        labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [{
          label: 'Progress',
          data: [12, 19, 15, 25, 22, 30, 28, 35, 40, 45],
          borderColor: turquoise,
          backgroundColor: 'rgba(45,212,191,0.18)',
          fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a93a6', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a93a6', font: { size: 11 } } },
        }
      }
    });
  }

  const ctxD1 = document.getElementById('chartDonut1');
  if (ctxD1) {
    charts.d1 = new Chart(ctxD1, {
      type: 'doughnut',
      data: {
        labels: ['أخبار', 'فعاليات', 'برامج', 'كادر'],
        datasets: [{ data: [data.news.length, data.events.length, data.programs.length, data.staff.length],
          backgroundColor: [turquoise, orange, blue, purple], borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: { legend: { position: 'right', labels: { color: '#8a93a6', font: { size: 11 }, boxWidth: 12, padding: 10 } } } }
    });
  }

  const ctxD2 = document.getElementById('chartDonut2');
  if (ctxD2) {
    charts.d2 = new Chart(ctxD2, {
      type: 'doughnut',
      data: {
        labels: ['صور', 'فيديوهات', 'مستخدمون', 'رسائل'],
        datasets: [{ data: [data.gallery.length, Math.max(1, Math.floor(data.gallery.length/3)), data.users.length, 5],
          backgroundColor: [turquoise, orange, blue, purple], borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: { legend: { position: 'right', labels: { color: '#8a93a6', font: { size: 11 }, boxWidth: 12, padding: 10 } } } }
    });
  }

  const ctxB1 = document.getElementById('chartBar1');
  if (ctxB1) {
    charts.b1 = new Chart(ctxB1, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          { label: 'أرباح', data: [12, 19, 15, 25, 22, 30], backgroundColor: turquoise, borderRadius: 4 },
          { label: 'خسائر', data: [-3, -5, -2, -4, -1, -6], backgroundColor: orange, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8a93a6', font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8a93a6', font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a93a6', font: { size: 10 } } },
        }
      }
    });
  }

  const ctxB2 = document.getElementById('chartBar2');
  if (ctxB2) {
    charts.b2 = new Chart(ctxB2, {
      type: 'bar',
      data: {
        labels: ['A', 'B', 'C', 'D', 'E', 'F'],
        datasets: [
          { label: 'أرباح', data: [8, 14, 10, 20, 16, 24], backgroundColor: turquoise, borderRadius: 4 },
          { label: 'خسائر', data: [-2, -4, -1, -3, -2, -5], backgroundColor: orange, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8a93a6', font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8a93a6', font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a93a6', font: { size: 10 } } },
        }
      }
    });
  }
}

/* ===== News ===== */
function renderNews(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div class="search-box"><input placeholder="بحث..." oninput="filterNews(this.value)"></div>
      <button class="btn btn-gold" onclick="addNews()">+ خبر جديد</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>العنوان</th><th>التاريخ</th><th>الصورة</th><th>الإجراءات</th></tr></thead>
        <tbody id="newsTbody">
          ${newsRows(data.news)}
        </tbody>
      </table>
    </div>`;
}
function newsRows(list) {
  return list.map(n => `<tr>
    <td>${n.title}</td>
    <td>${n.date}</td>
    <td><img src="${n.img}" style="width:40px;height:26px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"></td>
    <td>
      <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;" onclick="editNews(${n.id})">تعديل</button>
      <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteNews(${n.id})">حذف</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="4" class="empty">لا توجد أخبار</td></tr>';
}
function filterNews(q) {
  const list = data.news.filter(n => n.title.includes(q) || (n.excerpt||'').includes(q));
  document.getElementById('newsTbody').innerHTML = newsRows(list);
}
function newsForm(n) {
  return `
    <h3>${n ? 'تعديل خبر' : 'خبر جديد'}</h3>
    <div class="form-grid">
      <div class="form-group full"><label>العنوان</label><input id="f_title" value="${esc(n?.title)}"></div>
      <div class="form-group"><label>التاريخ</label><input id="f_date" type="date" value="${n?.date || ''}"></div>
      <div class="form-group"><label>رابط الصورة</label><input id="f_img" value="${esc(n?.img)}" placeholder="images/..." onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('f_img')">رفع/لصق/قص صورة</button></div>
      <div class="form-group"><label>أو رفع صورة</label><input id="f_img_file" type="file" accept="image/*"></div>
      <div class="form-group full"><label>المقتطف</label><textarea id="f_excerpt">${esc(n?.excerpt)}</textarea></div>
      <div class="form-group full"><label>النص الكامل (صفحة التفاصيل)</label><textarea id="f_body" style="min-height:160px;">${esc(n?.body)}</textarea></div>
      <div class="form-group full"><label>رابط فيديو (اختياري)</label><input id="f_video" value="${esc(n?.video)}" placeholder="https://youtube.com/... أو images/...mp4"></div>
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveNews(${n?.id || 0})">حفظ</button>
    </div>`;
}
function addNews() { openModal(newsForm(null)); }
function editNews(id) { openModal(newsForm(data.news.find(n=>n.id===id))); }
async function saveNews(id) {
  const title = document.getElementById('f_title').value.trim();
  if (!title) { toast('العنوان مطلوب', true); return; }
  const fileInput = document.getElementById('f_img_file');
  let img = document.getElementById('f_img').value.trim();
  if (fileInput && fileInput.files && fileInput.files[0]) {
    img = await readFileAsDataURL(fileInput.files[0]);
  }
  const obj = {
    title,
    date: document.getElementById('f_date').value,
    img: img,
    excerpt: document.getElementById('f_excerpt').value.trim(),
    body: document.getElementById('f_body').value.trim(),
    video: document.getElementById('f_video').value.trim(),
  };
  if (id) {
    const i = data.news.findIndex(n=>n.id===id);
    data.news[i] = { ...data.news[i], ...obj };
  } else {
    obj.id = uid(data.news);
    data.news.unshift(obj);
  }
  if (!saveData(data)) return; closeModal(); renderSection('news'); toast('تم الحفظ — أعد تحميل صفحة الموقع لرؤية التغييرات');
}
function deleteNews(id) {
  if (!confirm('حذف هذا الخبر؟')) return;
  data.news = data.news.filter(n=>n.id!==id);
  if (!saveData(data)) return; renderSection('news'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== Events ===== */
function renderEvents(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div class="search-box"><input placeholder="بحث..." oninput="filterEvents(this.value)"></div>
      <button class="btn btn-gold" onclick="addEvent()">+ فعالية جديدة</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>العنوان</th><th>التاريخ</th><th>ملاحظة</th><th>اللوحة</th><th>الإجراءات</th></tr></thead>
        <tbody id="eventsTbody">${eventRows(data.events)}</tbody>
      </table>
    </div>`;
}
function eventRows(list) {
  return list.map(e => `<tr>
    <td>${e.title}</td><td>${e.date}</td><td>${e.note||''}</td>
    <td><span class="badge badge-gold">${e.tab==='calendar'?'التقويم':'مواعيد'}</span></td>
    <td>
      <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;" onclick="editEvent(${e.id})">تعديل</button>
      <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteEvent(${e.id})">حذف</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="5" class="empty">لا توجد فعاليات</td></tr>';
}
function filterEvents(q) {
  const list = data.events.filter(e => e.title.includes(q) || (e.note||'').includes(q));
  document.getElementById('eventsTbody').innerHTML = eventRows(list);
}
function eventForm(e) {
  return `
    <h3>${e ? 'تعديل فعالية' : 'فعالية جديدة'}</h3>
    <div class="form-grid">
      <div class="form-group full"><label>العنوان</label><input id="f_title" value="${esc(e?.title)}"></div>
      <div class="form-group"><label>التاريخ</label><input id="f_date" type="date" value="${e?.date||''}"></div>
      <div class="form-group"><label>اللوحة</label>
        <select id="f_tab"><option value="dates" ${e?.tab!=='calendar'?'selected':''}>مواعيد مهمة</option><option value="calendar" ${e?.tab==='calendar'?'selected':''}>التقويم</option></select>
      </div>
      <div class="form-group full"><label>ملاحظة</label><input id="f_note" value="${esc(e?.note)}"></div>
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveEvent(${e?.id||0})">حفظ</button>
    </div>`;
}
function addEvent() { openModal(eventForm(null)); }
function editEvent(id) { openModal(eventForm(data.events.find(e=>e.id===id))); }
function saveEvent(id) {
  const title = document.getElementById('f_title').value.trim();
  if (!title) { toast('العنوان مطلوب', true); return; }
  const obj = { title, date: document.getElementById('f_date').value, tab: document.getElementById('f_tab').value, note: document.getElementById('f_note').value.trim() };
  if (id) {
    const i = data.events.findIndex(e=>e.id===id);
    data.events[i] = { ...data.events[i], ...obj };
  } else { obj.id = uid(data.events); data.events.unshift(obj); }
  if (!saveData(data)) return; closeModal(); renderSection('events'); toast('تم الحفظ — أعد تحميل صفحة الموقع لرؤية التغييرات');
}
function deleteEvent(id) {
  if (!confirm('حذف هذه الفعالية؟')) return;
  data.events = data.events.filter(e=>e.id!==id);
  if (!saveData(data)) return; renderSection('events'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== Programs ===== */
function renderPrograms(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div class="search-box"><input placeholder="بحث..." oninput="filterPrograms(this.value)"></div>
      <button class="btn btn-gold" onclick="addProgram()">+ برنامج جديد</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>العنوان</th><th>المرحلة</th><th>الصورة</th><th>الإجراءات</th></tr></thead>
        <tbody id="progTbody">${programRows(data.programs)}</tbody>
      </table>
    </div>`;
}
function programRows(list) {
  return list.map(p => `<tr>
    <td>${p.title}</td><td>${p.age}</td>
    <td><img src="${p.img}" style="width:40px;height:26px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"></td>
    <td>
      <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;" onclick="editProgram(${p.id})">تعديل</button>
      <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteProgram(${p.id})">حذف</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="4" class="empty">لا توجد برامج</td></tr>';
}
function filterPrograms(q) {
  const list = data.programs.filter(p => p.title.includes(q) || (p.desc||'').includes(q));
  document.getElementById('progTbody').innerHTML = programRows(list);
}
function programForm(p) {
  return `
    <h3>${p ? 'تعديل برنامج' : 'برنامج جديد'}</h3>
    <div class="form-grid">
      <div class="form-group full"><label>العنوان</label><input id="f_title" value="${esc(p?.title)}"></div>
      <div class="form-group"><label>المرحلة/العمر</label><input id="f_age" value="${esc(p?.age)}"></div>
      <div class="form-group"><label>رابط الصورة</label><input id="f_img" value="${esc(p?.img)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('f_img')">رفع/لصق/قص صورة</button></div>
      <div class="form-group"><label>أو رفع صورة</label><input id="f_img_file" type="file" accept="image/*"></div>
      <div class="form-group full"><label>الوصف</label><textarea id="f_desc">${esc(p?.desc)}</textarea></div>
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveProgram(${p?.id||0})">حفظ</button>
    </div>`;
}
function addProgram() { openModal(programForm(null)); }
function editProgram(id) { openModal(programForm(data.programs.find(p=>p.id===id))); }
async function saveProgram(id) {
  const title = document.getElementById('f_title').value.trim();
  if (!title) { toast('العنوان مطلوب', true); return; }
  const fileInput = document.getElementById('f_img_file');
  let img = document.getElementById('f_img').value.trim();
  if (fileInput && fileInput.files && fileInput.files[0]) {
    img = await readFileAsDataURL(fileInput.files[0]);
  }
  const obj = { title, age: document.getElementById('f_age').value.trim(), img: img, desc: document.getElementById('f_desc').value.trim() };
  if (id) { const i = data.programs.findIndex(p=>p.id===id); data.programs[i] = { ...data.programs[i], ...obj }; }
  else { obj.id = uid(data.programs); data.programs.push(obj); }
  if (!saveData(data)) return; closeModal(); renderSection('programs'); toast('تم الحفظ — أعد تحميل صفحة الموقع لرؤية التغييرات');
}
function deleteProgram(id) {
  if (!confirm('حذف هذا البرنامج؟')) return;
  data.programs = data.programs.filter(p=>p.id!==id);
  if (!saveData(data)) return; renderSection('programs'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== Gallery ===== */
function renderGallery(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <p style="color:var(--ad-muted);font-size:13px;">${data.gallery.length} عنصر</p>
      <button class="btn btn-gold" onclick="addGallery()">+ إضافة صورة/فيديو</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">
      ${data.gallery.map((g,i) => `
        <div class="card" style="padding:8px;">
          ${g.type === 'video' ? `<video src="${g.src}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;" muted></video>` : `<img src="${g.src}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;" onerror="this.style.background='#eee'">`}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
            <span style="font-size:11px;color:var(--ad-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${g.src}</span>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:10px;" onclick="deleteGallery(${i})">حذف</button>
          </div>
        </div>`).join('')}
    </div>`;
}
function addGallery() {
  openModal(`
    <h3>إضافة صورة/فيديو</h3>
    <div class="form-grid">
      <div class="form-group full">
        <label>النوع</label>
        <select id="g_type" onchange="toggleGalleryType()">
          <option value="image">صورة (رابط)</option>
          <option value="video">فيديو (رابط)</option>
          <option value="upload">رفع ملف (صورة/فيديو)</option>
        </select>
      </div>
      <div class="form-group full" id="g_url_wrap"><label>الرابط</label><input id="g_url" placeholder="images/... أو URL"></div>
      <div class="form-group full" id="g_file_wrap" style="display:none;"><label>اختر ملف</label><input id="g_file" type="file" accept="image/*,video/*"></div>
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveGallery()">إضافة</button>
    </div>`);
}
function toggleGalleryType() {
  const t = document.getElementById('g_type').value;
  document.getElementById('g_url_wrap').style.display = t === 'upload' ? 'none' : 'block';
  document.getElementById('g_file_wrap').style.display = t === 'upload' ? 'block' : 'none';
}
function saveGallery() {
  const t = document.getElementById('g_type').value;
  if (t === 'upload') {
    const file = document.getElementById('g_file').files[0];
    if (!file) { toast('اختر ملفاً', true); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      data.gallery.push({ type, src: ev.target.result });
      if (!saveData(data)) return; closeModal(); renderSection('gallery'); toast('تمت الإضافة — أعد تحميل صفحة الموقع');
    };
    reader.readAsDataURL(file);
  } else {
    const url = document.getElementById('g_url').value.trim();
    if (!url) { toast('الرابط مطلوب', true); return; }
    data.gallery.push({ type: t, src: url });
    if (!saveData(data)) return; closeModal(); renderSection('gallery'); toast('تمت الإضافة — أعد تحميل صفحة الموقع');
  }
}

function deleteGallery(i) {
  if (!confirm('حذف هذه الصورة؟')) return;
  data.gallery.splice(i, 1);
  saveData(data); renderSection('gallery'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== Staff ===== */
function renderStaff(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div class="search-box"><input placeholder="بحث..." oninput="filterStaff(this.value)"></div>
      <button class="btn btn-gold" onclick="addStaff()">+ موظف جديد</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>الاسم</th><th>المنصب</th><th>نبذة</th><th>الإجراءات</th></tr></thead>
        <tbody id="staffTbody">${staffRows(data.staff)}</tbody>
      </table>
    </div>`;
}
function staffRows(list) {
  return list.map(s => `<tr>
    <td>${s.name}</td><td>${s.role}</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.bio||''}</td>
    <td>
      <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;" onclick="editStaff(${s.id})">تعديل</button>
      <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteStaff(${s.id})">حذف</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="4" class="empty">لا توجد بيانات</td></tr>';
}
function filterStaff(q) {
  const list = data.staff.filter(s => s.name.includes(q) || s.role.includes(q));
  document.getElementById('staffTbody').innerHTML = staffRows(list);
}
function staffForm(s) {
  return `
    <h3>${s ? 'تعديل موظف' : 'موظف جديد'}</h3>
    <div class="form-grid">
      <div class="form-group"><label>الاسم</label><input id="f_name" value="${esc(s?.name)}"></div>
      <div class="form-group"><label>المنصب</label><input id="f_role" value="${esc(s?.role)}"></div>
      <div class="form-group full"><label>رابط الصورة (اختياري)</label><input id="f_img" value="${esc(s?.img)}" placeholder="images/..." onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('f_img')">رفع/لصق/قص صورة</button></div>
      <div class="form-group full"><label>أو رفع صورة</label><input id="f_img_file" type="file" accept="image/*"></div>
      <div class="form-group full"><label>نبذة</label><textarea id="f_bio">${esc(s?.bio)}</textarea></div>
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveStaff(${s?.id||0})">حفظ</button>
    </div>`;
}
function addStaff() { openModal(staffForm(null)); }
function editStaff(id) { openModal(staffForm(data.staff.find(s=>s.id===id))); }
async function saveStaff(id) {
  const name = document.getElementById('f_name').value.trim();
  if (!name) { toast('الاسم مطلوب', true); return; }
  const fileInput = document.getElementById('f_img_file');
  let img = document.getElementById('f_img').value.trim();
  if (fileInput && fileInput.files && fileInput.files[0]) {
    img = await readFileAsDataURL(fileInput.files[0]);
  }
  const obj = { name, role: document.getElementById('f_role').value.trim(), img: img, bio: document.getElementById('f_bio').value.trim() };
  if (id) { const i = data.staff.findIndex(s=>s.id===id); data.staff[i] = { ...data.staff[i], ...obj }; }
  else { obj.id = uid(data.staff); data.staff.push(obj); }
  if (!saveData(data)) return; closeModal(); renderSection('staff'); toast('تم الحفظ — أعد تحميل صفحة الموقع لرؤية التغييرات');
}
function deleteStaff(id) {
  if (!confirm('حذف هذا الموظف؟')) return;
  data.staff = data.staff.filter(s=>s.id!==id);
  if (!saveData(data)) return; renderSection('staff'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== Leaders ===== */
function renderLeaders(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div class="search-box"><input placeholder="بحث..." oninput="filterLeaders(this.value)"></div>
      <button class="btn btn-gold" onclick="addLeader()">+ قائد جديد</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>الاسم</th><th>المنصب</th><th>نبذة</th><th>الإجراءات</th></tr></thead>
        <tbody id="leadersTbody">${leaderRows(data.leaders)}</tbody>
      </table>
    </div>`;
}
function leaderRows(list) {
  return list.map(l => `<tr>
    <td>${l.name}</td><td>${l.role}</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.bio||''}</td>
    <td>
      <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;" onclick="editLeader(${l.id})">تعديل</button>
      <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteLeader(${l.id})">حذف</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="4" class="empty">لا توجد بيانات</td></tr>';
}
function filterLeaders(q) {
  const list = data.leaders.filter(l => l.name.includes(q) || l.role.includes(q));
  document.getElementById('leadersTbody').innerHTML = leaderRows(list);
}
function leaderForm(l) {
  return `
    <h3>${l ? 'تعديل قائد' : 'قائد جديد'}</h3>
    <div class="form-grid">
      <div class="form-group"><label>الاسم</label><input id="f_name" value="${esc(l?.name)}"></div>
      <div class="form-group"><label>المنصب</label><input id="f_role" value="${esc(l?.role)}"></div>
      <div class="form-group full"><label>رابط الصورة (اختياري)</label><input id="f_img" value="${esc(l?.img)}" placeholder="images/..." onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('f_img')">رفع/لصق/قص صورة</button></div>
      <div class="form-group full"><label>أو رفع صورة</label><input id="f_img_file" type="file" accept="image/*"></div>
      <div class="form-group full"><label>نبذة</label><textarea id="f_bio">${esc(l?.bio)}</textarea></div>
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveLeader(${l?.id||0})">حفظ</button>
    </div>`;
}
function addLeader() { openModal(leaderForm(null)); }
function editLeader(id) { openModal(leaderForm(data.leaders.find(l=>l.id===id))); }
async function saveLeader(id) {
  const name = document.getElementById('f_name').value.trim();
  if (!name) { toast('الاسم مطلوب', true); return; }
  const fileInput = document.getElementById('f_img_file');
  let img = document.getElementById('f_img').value.trim();
  if (fileInput && fileInput.files && fileInput.files[0]) {
    img = await readFileAsDataURL(fileInput.files[0]);
  }
  const obj = { name, role: document.getElementById('f_role').value.trim(), img: img, bio: document.getElementById('f_bio').value.trim() };
  if (id) { const i = data.leaders.findIndex(l=>l.id===id); data.leaders[i] = { ...data.leaders[i], ...obj }; }
  else { obj.id = uid(data.leaders); data.leaders.push(obj); }
  if (!saveData(data)) return; closeModal(); renderSection('leaders'); toast('تم الحفظ — أعد تحميل صفحة الموقع لرؤية التغييرات');
}
function deleteLeader(id) {
  if (!confirm('حذف هذا القائد؟')) return;
  data.leaders = data.leaders.filter(l=>l.id!==id);
  if (!saveData(data)) return; renderSection('leaders'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== About ===== */
function renderAbout(c) {
  c.innerHTML = `
    <div class="card">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:16px;">تحرير "من نحن"</h3>
      <div class="form-grid">
        <div class="form-group full"><label>قصتنا</label><textarea id="a_story" style="min-height:120px;">${esc(data.about.story)}</textarea></div>
        <div class="form-group full"><label>الرؤية</label><textarea id="a_vision">${esc(data.about.vision)}</textarea></div>
        <div class="form-group full"><label>الرسالة</label><textarea id="a_mission">${esc(data.about.mission)}</textarea></div>
        <div class="form-group full"><label>القيم</label><textarea id="a_values">${esc(data.about.values)}</textarea></div>
      </div>
      <div style="margin-top:16px;text-align:left;">
        <button class="btn btn-gold" onclick="saveAbout()">حفظ التغييرات</button>
      </div>
    </div>`;
}
function saveAbout() {
  data.about.story = document.getElementById('a_story').value.trim();
  data.about.vision = document.getElementById('a_vision').value.trim();
  data.about.mission = document.getElementById('a_mission').value.trim();
  data.about.values = document.getElementById('a_values').value.trim();
  if (!saveData(data)) return; toast('تم حفظ "من نحن"');
}

/* ===== Settings ===== */
function renderSettings(c) {
  const s = data.settings;
  c.innerHTML = `
    <div class="card">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:16px;">إعدادات الموقع</h3>
      <div class="form-grid">
        <div class="form-group"><label>اسم المدرسة</label><input id="s_name" value="${esc(s.siteName)}"></div>
        <div class="form-group"><label>الإدارة</label><input id="s_auth" value="${esc(s.authority)}"></div>
        <div class="form-group"><label>البريد الإلكتروني</label><input id="s_email" value="${esc(s.email)}"></div>
        <div class="form-group"><label>الهاتف</label><input id="s_phone" value="${esc(s.phone)}"></div>
        <div class="form-group full"><label>العنوان</label><input id="s_addr" value="${esc(s.address)}"></div>
        <div class="form-group full"><label>ساعات العمل</label><input id="s_hours" value="${esc(s.hours)}"></div>
        <div class="form-group full"><label>عنوان Hero (kicker)</label><input id="s_kicker" value="${esc(s.heroKicker)}"></div>
        <div class="form-group full"><label>عنوان Hero (h1)</label><textarea id="s_hero">${esc(s.heroTitle)}</textarea></div>
        <div class="form-group full"><label>عنوان CTA</label><input id="s_ctaTitle" value="${esc(s.ctaTitle)}"></div>
        <div class="form-group full"><label>نص CTA</label><input id="s_ctaText" value="${esc(s.ctaText)}"></div>
        <div class="form-group"><label>اللون الأساسي</label><input id="s_primary" type="color" value="${s.primaryColor}"></div>
        <div class="form-group"><label>لون التمييز</label><input id="s_accent" type="color" value="${s.accentColor}"></div>
      </div>
      <div style="margin-top:16px;text-align:left;">
        <button class="btn btn-gold" onclick="saveSettings()">حفظ الإعدادات</button>
      </div>
    </div>
    <div class="card" style="margin-top:20px;">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:16px;">صور الموقع (Site Images)</h3>
      <div class="form-grid">
        <div class="form-group"><label>Hero (الصفحة الرئيسية)</label><input id="si_hero" value="${esc(s.images.hero)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_hero')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>صورة "من نحن"</label><input id="si_about" value="${esc(s.images.about)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_about')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>رأس صفحة "من نحن"</label><input id="si_pageAbout" value="${esc(s.images.pageAbout)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_pageAbout')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>رأس صفحة "البرامج"</label><input id="si_pagePrograms" value="${esc(s.images.pagePrograms)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_pagePrograms')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>رأس صفحة "الأخبار"</label><input id="si_pageNews" value="${esc(s.images.pageNews)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_pageNews')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>رأس صفحة "المعرض"</label><input id="si_pageGallery" value="${esc(s.images.pageGallery)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_pageGallery')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>رأس صفحة "اتصل بنا"</label><input id="si_pageContact" value="${esc(s.images.pageContact)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_pageContact')">رفع/لصق/قص</button></div>
        <div class="form-group"><label>خلفية CTA</label><input id="si_cta" value="${esc(s.images.cta)}" onfocus="window._lastImageField=this.id"><button type="button" class="btn btn-outline-ad btn-sm" style="margin-top:6px;" onclick="openCropper('si_cta')">رفع/لصق/قص</button></div>
      </div>
      <div style="margin-top:16px;text-align:left;">
        <button class="btn btn-gold" onclick="saveSiteImages()">حفظ الصور</button>
      </div>
    </div>`;
}
function saveSiteImages() {
  const img = data.settings.images;
  img.hero = document.getElementById('si_hero').value.trim();
  img.about = document.getElementById('si_about').value.trim();
  img.pageAbout = document.getElementById('si_pageAbout').value.trim();
  img.pagePrograms = document.getElementById('si_pagePrograms').value.trim();
  img.pageNews = document.getElementById('si_pageNews').value.trim();
  img.pageGallery = document.getElementById('si_pageGallery').value.trim();
  img.pageContact = document.getElementById('si_pageContact').value.trim();
  img.cta = document.getElementById('si_cta').value.trim();
  if (!saveData(data)) return;
  toast('تم حفظ صور الموقع — أعد تحميل صفحة الموقع');
}
function saveSettings() {
  const s = data.settings;
  s.siteName = document.getElementById('s_name').value.trim();
  s.authority = document.getElementById('s_auth').value.trim();
  s.email = document.getElementById('s_email').value.trim();
  s.phone = document.getElementById('s_phone').value.trim();
  s.address = document.getElementById('s_addr').value.trim();
  s.hours = document.getElementById('s_hours').value.trim();
  s.heroKicker = document.getElementById('s_kicker').value.trim();
  s.heroTitle = document.getElementById('s_hero').value.trim();
  s.ctaTitle = document.getElementById('s_ctaTitle').value.trim();
  s.ctaText = document.getElementById('s_ctaText').value.trim();
  s.primaryColor = document.getElementById('s_primary').value;
  s.accentColor = document.getElementById('s_accent').value;
  if (!saveData(data)) return; toast('تم حفظ الإعدادات');
}

/* ===== Media ===== */
function renderMedia(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <p style="color:var(--ad-muted);font-size:13px;">${data.media.length} ملف</p>
      <button class="btn btn-gold" onclick="document.getElementById('mediaFile').click()">+ رفع ملف</button>
      <input type="file" id="mediaFile" accept="image/*,video/*" style="display:none" onchange="uploadMedia(event)">
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
      ${data.media.map((m,i) => `
        <div class="card" style="padding:8px;">
          ${m.type && m.type.startsWith('video/') ? `<video src="${m.data}" style="width:100%;height:110px;object-fit:cover;border-radius:6px;" muted></video>` : `<img src="${m.data}" style="width:100%;height:110px;object-fit:cover;border-radius:6px;">`}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
            <span style="font-size:10px;color:var(--ad-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${m.name}</span>
            <button class="btn btn-danger" style="padding:2px 6px;font-size:10px;" onclick="deleteMedia(${i})">حذف</button>
          </div>
        </div>`).join('')}
    </div>
    ${data.media.length===0?'<div class="empty"><div class="ic">📁</div>لا توجد ملفات — ارفع صورة للبدء</div>':''}`;
}
function uploadMedia(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    data.media.push({ name: file.name, data: ev.target.result, type: file.type, size: file.size, date: new Date().toISOString().slice(0,10) });
    if (!saveData(data)) return; renderSection('media'); toast('تم رفع الملف');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function deleteMedia(i) {
  if (!confirm('حذف هذا الملف؟')) return;
  data.media.splice(i, 1);
  saveData(data); renderSection('media'); toast('تم الحذف — أعد تحميل صفحة الموقع');
}

/* ===== Users ===== */
function permSummary(perms) {
  if (!perms) return 'الافتراضي';
  const order = { full: 3, edit: 2, view: 1, none: 0 };
  const parts = [];
  sections.forEach(s => {
    if (s.id === 'account' || s.id === 'users') return;
    const lvl = perms[s.id] || 'none';
    if (lvl === 'none') return;
    parts.push(s.label + ': ' + ({ view: 'قراءة', edit: 'تعديل', full: 'كامل' }[lvl] || lvl));
  });
  return parts.length ? parts.join(' • ') : 'مفيش صلاحيات';
}
function renderUsers(c) {
  c.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <p style="color:var(--ad-muted);font-size:13px;">${data.users.length} حساب</p>
      <button class="btn btn-gold" onclick="addUser()">+ مستخدم جديد</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>اسم المستخدم</th><th>الاسم</th><th>الدور</th><th>الجهاز المخصص</th><th>آخر جهاز / دخول</th><th>رابط الدخول الخاص</th><th>الإجراءات</th></tr></thead>
        <tbody>${data.users.map(u => {
          const link = userLoginUrl(u.username);
          return `<tr>
          <td><code style="font-size:12px;color:var(--ad-gold);">${esc(u.username)}</code></td><td>${esc(u.name)}</td><td>
            <span class="badge ${u.role==='superadmin'?'badge-gold':'badge-green'}">${u.role==='superadmin'?'مدير عام':'محرر'}</span>
            ${u.role !== 'superadmin' ? `<div style="font-size:10px;color:var(--ad-muted);margin-top:4px;line-height:1.5;">${permSummary(u.perms)}</div>` : ''}
          </td>
          <td style="font-size:12px;white-space:nowrap;">${esc(u.device || '—')}</td>
          <td style="font-size:11px;color:var(--ad-muted);white-space:nowrap;line-height:1.6;">
            ${esc(u.lastDevice || '—')}<br>
            <span style="font-size:10px;">${u.lastLogin ? esc(new Date(u.lastLogin).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })) : 'لم يسجل دخول بعد'}</span>
          </td>
          <td>
            <div style="display:flex;gap:6px;align-items:center;min-width:260px;">
              <input readonly value="${esc(link)}" id="ulink_${u.id}" style="flex:1;padding:5px 8px;font-size:11px;border-radius:6px;border:1px solid var(--ad-line);background:var(--ad-card);color:var(--ad-ink);">
              <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;white-space:nowrap;" onclick="copyText('ulink_${u.id}')">نسخ</button>
              <a class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;white-space:nowrap;" href="${esc(link)}" target="_blank">فتح</a>
            </div>
          </td>
          <td>
            <button class="btn btn-outline-ad" style="padding:4px 8px;font-size:11px;" onclick="editUser(${u.id})">تعديل</button>
            ${u.id !== session.id ? `<button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="deleteUser(${u.id})">حذف</button>` : ''}
          </td>
        </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}
function userForm(u) {
  const isSuper = u && u.role === 'superadmin';
  const perms = (u && u.perms) ? u.perms : defaultPerms();
  const permRows = sections.filter(s => s.id !== 'account' && s.id !== 'users').map(s => {
    const cur = perms[s.id] || 'none';
    const opts = PERM_LEVELS.map(pl => `
      <label style="display:inline-flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;white-space:nowrap;">
        <input type="radio" name="perm_${s.id}" value="${pl.v}" ${cur === pl.v ? 'checked' : ''} style="width:auto;margin:0;">
        ${pl.label}
      </label>`).join('');
    return `<tr>
      <td style="font-weight:700;font-size:12px;white-space:nowrap;">${s.icon} ${s.label}</td>
      <td><div style="display:flex;gap:12px;flex-wrap:wrap;">${opts}</div></td>
    </tr>`;
  }).join('');

  return `
    <h3>${u ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
    <div class="form-grid">
      <div class="form-group"><label>اسم المستخدم</label><input id="f_username" value="${esc(u?.username)}"></div>
      <div class="form-group"><label>الاسم</label><input id="f_name" value="${esc(u?.name)}"></div>
      <div class="form-group"><label>الجهاز / الجهاز المخصص</label><input id="f_device" value="${esc(u?.device || '')}" placeholder="مثال: مكتب 1 - الدور الثالث"></div>
      <div class="form-group"><label>كلمة المرور</label><input id="f_password" type="password" value="${esc(u?.password)}"></div>
      <div class="form-group"><label>الدور</label>
        <select id="f_role"><option value="admin" ${u?.role!=='superadmin'?'selected':''}>admin</option><option value="superadmin" ${u?.role==='superadmin'?'selected':''}>superadmin</option></select>
      </div>
    </div>

    <div style="margin-top:22px;">
      <h4 style="font-family:var(--ad-font-head);font-size:16px;margin-bottom:4px;">صلاحيات هذا المستخدم</h4>
      <p style="color:var(--ad-muted);font-size:12px;margin-bottom:14px;">
        <strong>مفيش</strong> = القسم مخفي تماماً &nbsp;|&nbsp;
        <strong>قراءة</strong> = يشوف بس &nbsp;|&nbsp;
        <strong>تعديل</strong> = يضيف ويعدّل &nbsp;|&nbsp;
        <strong>كامل</strong> = يضيف ويعدّل ويحذف
      </p>
      ${isSuper ? `
        <div class="perm-banner" style="margin-bottom:14px;">
          هذا حساب superadmin — صلاحياته كاملة تلقائياً على كل الأقسام ومينفعش تتقلّص.
        </div>` : `
        <div class="table-wrap" style="max-height:320px;overflow:auto;">
          <table><thead><tr><th style="width:170px;">القسم</th><th>المستوى</th></tr></thead>
          <tbody>${permRows}</tbody></table>
        </div>`}
    </div>

    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-gold" onclick="saveUser(${u?.id||0})">حفظ</button>
    </div>`;
}
function addUser() { openModal(userForm(null)); }
function editUser(id) { openModal(userForm(data.users.find(u=>u.id===id))); }
function saveUser(id) {
  const username = document.getElementById('f_username').value.trim();
  if (!username) { toast('اسم المستخدم مطلوب', true); return; }
  const role = document.getElementById('f_role').value;
  const password = document.getElementById('f_password').value;

  // collect permissions
  const perms = {};
  if (role !== 'superadmin') {
    sections.forEach(sec => {
      if (sec.id === 'account' || sec.id === 'users') return;
      const checked = document.querySelector('input[name="perm_' + sec.id + '"]:checked');
      perms[sec.id] = checked ? checked.value : 'none';
    });
    perms.account = 'full';
    perms.users = 'none';
  }

  const deviceField = document.getElementById('f_device');
  const obj = {
    username,
    name: document.getElementById('f_name').value.trim(),
    role,
    perms,
    device: deviceField ? deviceField.value.trim() : '',
  };
  if (password) obj.password = password;      // only sent when typed

  const target = id ? data.users.find(u => u.id === id) : null;
  if (target) {
    if (target.role === 'superadmin' && role !== 'superadmin' && !confirm('أنت بتقلّل صلاحيات المدير العام. متأكد؟')) return;
    obj.id = target.id;
  }
  if (!target && !password) { toast('كلمة المرور مطلوبة للمستخدم الجديد', true); return; }

  // send to the server (it hashes the password)
  fetch('/api/users', {
    method: 'PUT',
    headers: sessionHeaders(),
    body: JSON.stringify({ users: [obj] }),
  })
    .then(r => r.json())
    .then(res => {
      if (res && res.ok) {
        closeModal();
        pullGlobal(true);
        toast('تم الحفظ على الخادم');
      } else {
        toast('فشل: ' + ((res && res.error) || 'خطأ'), true);
      }
    })
    .catch(() => toast('تعذّر الاتصال بالخادم', true));
}
function deleteUser(id) {
  const target = data.users.find(u=>u.id===id);
  if (!target) return;
  if (target.role === 'superadmin') { toast('لا يمكن حذف حساب المدير العام (superadmin)', true); return; }
  if (target.id === session.id) { toast('لا يمكنك حذف حسابك الحالي', true); return; }
  if (!confirm('حذف المستخدم "' + (target.name || target.username) + '"؟')) return;
  fetch('/api/users/' + id, { method: 'DELETE', headers: sessionHeaders() })
    .then(r => r.json())
    .then(res => {
      if (res && res.ok) { pullGlobal(true); toast('تم الحذف من الخادم'); }
      else toast('فشل: ' + ((res && res.error) || 'خطأ'), true);
    })
    .catch(() => toast('تعذّر الاتصال بالخادم', true));
}

/* ===== My account (per-user login link + password) ===== */
function renderAccount(c) {
  const u = data.users.find(x => x.id === session.id) || session;
  const link = userLoginUrl(u.username);
  c.innerHTML = `
    <div class="card" style="margin-bottom:18px;">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:14px;">بيانات حسابي</h3>
      <div class="form-grid">
        <div class="form-group"><label>اسم المستخدم</label><input value="${esc(u.username)}" readonly></div>
        <div class="form-group"><label>الاسم</label><input value="${esc(u.name || '')}" readonly></div>
        <div class="form-group"><label>الدور</label><input value="${esc(u.role)}" readonly></div>
        <div class="form-group"><label>الجهاز المخصص (بتحدده انت)</label><input id="myDevice" value="${esc(u.device || '')}" placeholder="مثال: مكتب 1 - الدور الثالث"></div>
        <div class="form-group"><label>آخر جهاز تم منه الدخول</label><input value="${esc(u.lastDevice || '—')}" readonly></div>
        <div class="form-group"><label>آخر دخول</label><input value="${u.lastLogin ? esc(new Date(u.lastLogin).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })) : '—'}" readonly></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:10px;">رابط الدخول الخاص ب��</h3>
      <p style="color:var(--ad-muted);font-size:13px;margin-bottom:12px;">هذا الرابط مخصص لحسابك فقط. افتحه في أي جهاز وسجّل الدخول باسمك وكلمة مرورك — لا تحتاج لكتابة اسم المستخدم.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input id="myLink" readonly value="${esc(link)}" style="flex:1;min-width:250px;padding:10px 12px;border-radius:8px;border:1px solid var(--ad-line);background:var(--ad-card);color:var(--ad-ink);font-size:12px;">
        <button class="btn btn-gold" onclick="copyText('myLink')">نسخ الرابط</button>
        <a class="btn btn-outline-ad" href="${esc(link)}" target="_blank">فتح الرابط</a>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:10px;">مفتاح النشر العام (Publish Key)</h3>
      <p style="color:var(--ad-muted);font-size:13px;margin-bottom:12px;">هذا المفتاح يسمح للوحة التحكم برفع التعديلات على السيرفر عشان تشوفها <strong>كل الزوار</strong> على كل الأجهزة. لو فاضي، التعديلات هتفضل محفوظة في هذا المتصفح بس.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input id="editToken" type="password" placeholder="ألصق المفتاح هنا" value="${esc(localStorage.getItem(EDIT_TOKEN_KEY) || '')}" style="flex:1;min-width:250px;padding:10px 12px;border-radius:8px;border:1px solid var(--ad-line);background:var(--ad-card);color:var(--ad-ink);font-size:12px;">
        <button class="btn btn-gold" onclick="saveEditToken()">حفظ المفتاح</button>
        <button class="btn btn-outline-ad" onclick="publishNow()">نشر الآن</button>
        <button class="btn btn-danger" onclick="resetGlobal()">إعادة تعيين المحتوى العام</button>
      </div>
      <div id="publishStatus" style="margin-top:10px;font-size:12px;color:var(--ad-muted);"></div>
    </div>

    <div class="card">
      <h3 style="font-family:var(--ad-font-head);margin-bottom:14px;">تغيير كلمة المرور</h3>
      <div class="form-grid">
        <div class="form-group"><label>كلمة المرور الحالية</label><input id="cp_old" type="password"></div>
        <div class="form-group"><label>كلمة المرور الجديدة</label><input id="cp_new" type="password"></div>
        <div class="form-group"><label>تأكيد كلمة المرور</label><input id="cp_new2" type="password"></div>
      </div>
      <div style="margin-top:16px;text-align:left;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-gold" onclick="changeMyPassword()">تحديث كلمة المرور</button>
        <button class="btn btn-outline-ad" onclick="saveMyDevice()">حفظ اسم الجهاز</button>
      </div>
    </div>`;
}
function saveMyDevice() {
  const el = document.getElementById('myDevice');
  if (!el) return;
  const u = data.users.find(x => x.id === session.id);
  if (!u) { toast('الحساب غير موجود', true); return; }
  u.device = el.value.trim();
  session.device = u.device;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
  saveData(data);
  toast('تم حفظ اسم الجهاز');
  renderSection('account');
}
function saveEditToken() {
  const v = document.getElementById('editToken').value.trim();
  if (v) localStorage.setItem(EDIT_TOKEN_KEY, v);
  else localStorage.removeItem(EDIT_TOKEN_KEY);
  toast(v ? 'تم حفظ مفتاح النشر' : 'تم مسح المفتاح');
}
function publishNow() {
  const st = document.getElementById('publishStatus');
  const token = localStorage.getItem(EDIT_TOKEN_KEY) || '';
  if (!token) { toast('ألصق مفتاح النشر أولاً', true); return; }
  if (st) st.textContent = 'جاري النشر...';
  fetch('/api/data', {
    method: 'PUT',
    headers: sessionHeaders(),
    body: JSON.stringify({ data: data }),
  })
    .then(r => r.json())
    .then(res => {
      if (res && res.ok) { if (st) st.textContent = 'تم النشر بنجاح — ' + (res.savedAt || ''); toast('تم النشر للجميع'); }
      else { if (st) st.textContent = 'فشل: ' + ((res && res.error) || 'خطأ'); toast('فشل النشر: ' + ((res && res.error) || ''), true); }
    })
    .catch(e => { if (st) st.textContent = 'خطأ الاتصال'; toast('خطأ الاتصال بالسيرفر', true); });
}
function resetGlobal() {
  const token = localStorage.getItem(EDIT_TOKEN_KEY) || '';
  if (!token) { toast('ألصق مفتاح النشر أولاً', true); return; }
  if (!confirm('هيتمسح المحتوى المنشور على السيرفر لكل الزوار وترجع الإعدادات الافتراضية. متأكد؟')) return;
  fetch('/api/data', { method: 'DELETE', headers: sessionHeaders() })
    .then(r => r.json())
    .then(res => {
      if (res && res.ok) { toast('تم إعادة تعيين المحتوى العام'); setTimeout(() => location.reload(), 900); }
      else toast('فشل: ' + ((res && res.error) || ''), true);
    })
    .catch(() => toast('خطأ الاتصال', true));
}
function changeMyPassword() {
  const oldP = document.getElementById('cp_old').value;
  const n1 = document.getElementById('cp_new').value;
  const n2 = document.getElementById('cp_new2').value;
  if (!n1) { toast('كلمة المرور الجديدة مطلوبة', true); return; }
  if (n1 !== n2) { toast('كلمتا المرور غير متطابقتين', true); return; }
  if (n1.length < 8) { toast('كلمة المرور لازم تكون 8 حروف على الأقل', true); return; }
  if (!sessionToken()) { toast('انتهت الجلسة - سجّل دخول تاني', true); return; }

  fetch('/api/users', {
    method: 'PUT',
    headers: sessionHeaders(),
    body: JSON.stringify({ users: [{
      id: session.id, username: session.username, name: session.name,
      role: session.role, device: session.device, perms: session.perms || {},
      password: n1,
    }] }),
  })
    .then(r => r.json())
    .then(res => {
      if (res && res.ok) {
        toast('تم تحديث كلمة المرور - تم إنهاء الجلسات الأخرى');
        endSession();
        renderLogin();
      } else {
        toast('فشل: ' + ((res && res.error) || 'خطأ'), true);
      }
    })
    .catch(() => toast('تعذّر الاتصال بالخادم', true));
}

/* ===== Modal helpers ===== */
function openModal(html) {
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalBackdrop').classList.add('show');
}
function closeModal() { document.getElementById('modalBackdrop').classList.remove('show'); }
document.addEventListener('click', e => {
  if (e.target.id === 'modalBackdrop') closeModal();
});

/* ===== Export / Import / Reset ===== */
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'alalfi-backup.json'; a.click();
  URL.revokeObjectURL(url);
  toast('تم تصدير البيانات');
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      data = d; if (!saveData(data)) return; renderSection(currentSection); toast('تم استيراد البيانات');
    } catch (err) { toast('ملف غير صالح', true); }
  };
  reader.readAsText(file);
  e.target.value = '';
}
function resetData() {
  if (!confirm('إعادة تعيين جميع البيانات إلى الافتراضية؟')) return;
  data = defaultData(); if (!saveData(data)) return; renderSection(currentSection); toast('تمت إعادة التعيين');
}

function globalSearch(q) {
  // delegate to current section's filter if available
  const map = { news: filterNews, events: filterEvents, programs: filterPrograms, staff: filterStaff };
  if (map[currentSection]) map[currentSection](q);
}

function openQuickAdd() {
  const map = { news: addNews, events: addEvent, programs: addProgram, staff: addStaff, gallery: addGallery };
  if (map[currentSection]) map[currentSection]();
  else toast('لا توجد إضافة سريعة لهذا القسم');
}

/* ===== Image Cropper ===== */
function openCropper(targetFieldId) {
  cropper.targetField = targetFieldId || null;
  const m = document.getElementById('cropModal');
  m.innerHTML = `
    <h3>رفع/لصق صورة</h3>
    <p style="color:var(--ad-muted);font-size:12px;margin-bottom:12px;">اختر ملفاً أو الصق صورة (Ctrl+V)، ثم اضبط التكبير/الاقتصاد.</p>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <button class="btn btn-outline-ad btn-sm" onclick="document.getElementById('cropFile').click()">اختيار ملف</button>
      <input type="file" id="cropFile" accept="image/*" style="display:none" onchange="loadCropperFile(event)">
      <button class="btn btn-outline-ad btn-sm" onclick="pasteCropperImage()">لصق من الحافظة</button>
    </div>
    <div id="cropArea" style="width:280px;height:280px;margin:0 auto;overflow:hidden;position:relative;border:2px solid var(--ad-gold);border-radius:8px;background:#111;cursor:move;">
      <img id="cropImg" src="" style="position:absolute;transform-origin:center;user-select:none;pointer-events:none;">
      <div style="position:absolute;inset:0;border:2px dashed rgba(255,255,255,0.35);pointer-events:none;"></div>
    </div>
    <div style="margin:12px 0;">
      <label style="font-size:12px;color:var(--ad-muted);">تكبير: <span id="zoomVal">100%</span></label>
      <input type="range" min="50" max="300" value="100" id="cropZoom" style="width:100%;" oninput="updateCropperZoom(this.value)">
    </div>
    <div class="footer">
      <button class="btn btn-outline-ad" onclick="closeCropper()">إلغاء</button>
      <button class="btn btn-gold" onclick="cropAndSave()">قص وحفظ</button>
    </div>`;
  document.getElementById('cropBackdrop').classList.add('show');
  const area = document.getElementById('cropArea');
  area.onmousedown = (e) => { cropper.dragging = true; cropper.lastX = e.clientX; cropper.lastY = e.clientY; };
  window.onmousemove = (e) => {
    if (!cropper.dragging) return;
    cropper.x += e.clientX - cropper.lastX;
    cropper.y += e.clientY - cropper.lastY;
    cropper.lastX = e.clientX; cropper.lastY = e.clientY;
    applyCropperTransform();
  };
  window.onmouseup = () => { cropper.dragging = false; };
  area.ontouchstart = (e) => { cropper.dragging = true; cropper.lastX = e.touches[0].clientX; cropper.lastY = e.touches[0].clientY; };
  window.ontouchmove = (e) => {
    if (!cropper.dragging) return;
    cropper.x += e.touches[0].clientX - cropper.lastX;
    cropper.y += e.touches[0].clientY - cropper.lastY;
    cropper.lastX = e.touches[0].clientX; cropper.lastY = e.touches[0].clientY;
    applyCropperTransform();
  };
  window.ontouchend = () => { cropper.dragging = false; };
}
function closeCropper() {
  document.getElementById('cropBackdrop').classList.remove('show');
  cropper.img = null;
  window.onmousemove = null; window.onmouseup = null; window.ontouchmove = null; window.ontouchend = null;
}
function loadCropperImage(src) {
  const img = document.getElementById('cropImg');
  img.src = src;
  img.onload = () => {
    cropper.img = img;
    cropper.zoom = 1; cropper.x = 0; cropper.y = 0;
    const z = document.getElementById('cropZoom');
    if (z) z.value = 100;
    const zv = document.getElementById('zoomVal');
    if (zv) zv.textContent = '100%';
    applyCropperTransform();
  };
}
function loadCropperFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => loadCropperImage(ev.target.result);
  r.readAsDataURL(file);
  e.target.value = '';
}
async function pasteCropperImage() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imgType = item.types.find(t => t.startsWith('image/'));
      if (imgType) {
        const blob = await item.getType(imgType);
        const r = new FileReader();
        r.onload = ev => loadCropperImage(ev.target.result);
        r.readAsDataURL(blob);
        return;
      }
    }
    toast('لا توجد صورة في الحافظة', true);
  } catch (err) {
    toast('تعذر قراءة الحافظة (قد تحتاج HTTPS)', true);
  }
}
function updateCropperZoom(v) {
  cropper.zoom = v / 100;
  const zv = document.getElementById('zoomVal');
  if (zv) zv.textContent = v + '%';
  applyCropperTransform();
}
function applyCropperTransform() {
  const img = document.getElementById('cropImg');
  if (!img || !cropper.img) return;
  img.style.transform = `translate(${cropper.x}px, ${cropper.y}px) scale(${cropper.zoom})`;
}
function cropAndSave() {
  const img = document.getElementById('cropImg');
  if (!img || !img.src) { toast('اختر صورة أولاً', true); return; }
  const area = document.getElementById('cropArea');
  const areaRect = area.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  const scaleX = img.naturalWidth / imgRect.width;
  const scaleY = img.naturalHeight / imgRect.height;
  const vx = (areaRect.left - imgRect.left) * scaleX;
  const vy = (areaRect.top - imgRect.top) * scaleY;
  const vw = areaRect.width * scaleX;
  const vh = areaRect.height * scaleY;
  const canvas = document.createElement('canvas');
  canvas.width = 280; canvas.height = 280;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, vx, vy, vw, vh, 0, 0, 280, 280);
  const base64 = canvas.toDataURL('image/png');
  if (cropper.targetField) {
    const field = document.getElementById(cropper.targetField);
    if (field) field.value = base64;
  }
  window.dispatchEvent(new CustomEvent('imageCropped', { detail: { field: cropper.targetField, data: base64 } }));
  closeCropper();
  toast('تم قص الصورة');
}

/* paste support */
document.addEventListener('paste', (e) => {
  const items = (e.clipboardData || {}).items || [];
  for (const it of items) {
    if (it.type && it.type.startsWith('image/')) {
      const blob = it.getAsFile();
      if (blob) {
        openCropper(window._lastImageField || null);
        const r = new FileReader();
        r.onload = ev => loadCropperImage(ev.target.result);
        r.readAsDataURL(blob);
        e.preventDefault();
        return;
      }
    }
  }
});


/* ===== Utils ===== */
function esc(v) { return (v == null ? '' : String(v)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ===== Boot ===== */
if (session) renderApp(); else renderLogin();

/* ===== Session helpers (server-side) ===== */
function sessionToken() { return session && session.token ? session.token : ''; }
function sessionHeaders(extra) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
  const t = sessionToken();
  if (t) h['X-Session'] = t;
  return h;
}
function endSession() {
  const t = sessionToken();
  if (t) {
    fetch('/api/logout', { method: 'POST', headers: { 'X-Session': t } })
      .catch(() => {});
  }
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
function checkSession() {
  const t = sessionToken();
  if (!t) { endSession(); renderLogin(); return false; }
  fetch('/api/session', { headers: { 'X-Session': t } })
    .then(r => r.json())
    .then(res => {
      if (!res || !res.authenticated) {
        endSession();
        renderLogin();
        toast('انتهت الجلسة - سجّل دخول تاني', true);
      }
    })
    .catch(() => {});
}

/* auto-lock when the tab is hidden for a while */
let idleTimer = null;
function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (session) { endSession(); renderLogin(); toast('تم قفل اللوحة بعد عدم النشاط', true); }
  }, 30 * 60 * 1000);   // 30 minutes
}
['mousemove', 'keydown', 'click', 'scroll'].forEach(ev => {
  document.addEventListener(ev, resetIdle, { passive: true });
});
resetIdle();

/* Pull the global content (Cloudflare KV) so the panel shows the
   latest shared data on any device, not just this browser's cache. */
function pullGlobal(silent) {
  if (location.protocol === 'file:') return;
  const t = sessionToken();

  const usersPromise = t
    ? fetch('/api/users', { headers: { 'X-Session': t }, cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(res => (res && res.ok && res.users) ? res.users : null)
        .catch(() => null)
    : Promise.resolve(null);

  fetch('/api/data', { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(res => {
      if (!res || !res.ok || !res.data) return null;
      return usersPromise.then(remoteUsers => {
        const merged = Object.assign({}, res.data);
        if (remoteUsers && remoteUsers.length) {
          merged.users = remoteUsers.map(u => ({
            id: u.id, username: u.username, name: u.name, role: u.role,
            device: u.device, perms: u.perms || {},
            lastDevice: u.last_device || '', lastLogin: u.last_login || '',
            password: '',            // passwords never leave the server
          }));
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
        data = loadData();
        if (session) {
          renderApp();
          if (!silent) toast('تم تحديث البيانات من الخادم');
        }
        return true;
      });
    })
    .catch(() => {});
}
pullGlobal();