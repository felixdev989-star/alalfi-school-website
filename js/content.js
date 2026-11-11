/* ===== Content Sync: Admin Panel -> Public Site ===== */
(function () {
  const KEY = 'alalfi_admin_v1';
  function data() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  const API = '/api/data';

  function applyData(d) {
    if (!d) return;

    function esc(s) { return s == null ? '' : String(s); }
    function setText(sel, val) { const el = document.querySelector(sel); if (el && val != null) el.textContent = val; }
    function setHTML(sel, val) { const el = document.querySelector(sel); if (el && val != null) el.innerHTML = val; }
    function setAttr(sel, attr, val) { const el = document.querySelector(sel); if (el && val != null) el.setAttribute(attr, val); }

    // Settings
    const s = d.settings || {};
    if (s.siteName) {
      document.querySelectorAll('.brand-name').forEach(el => {
        const small = el.querySelector('small');
        el.firstChild && (el.firstChild.nodeValue = s.siteName + ' ');
        if (small) small.textContent = 'الثانوية المشتركة';
      });
    }
    if (s.heroKicker) { const el = document.getElementById('hero-kicker'); if (el) el.textContent = s.heroKicker; }
    if (s.heroTitle) { const el = document.getElementById('hero-title'); if (el) el.innerHTML = esc(s.heroTitle).replace(/\n/g, '<br>'); }
    if (s.ctaTitle) { const el = document.getElementById('cta-title'); if (el) el.textContent = s.ctaTitle; }
    if (s.ctaText) { const el = document.getElementById('cta-text'); if (el) el.textContent = s.ctaText; }

    // Site images
    const imgs = s.images || {};
    if (imgs.hero) {
      const hi = document.querySelector('.hero-media img');
      if (hi) hi.src = imgs.hero;
    }
    if (imgs.about) {
      const ai = document.querySelector('.about-img');
      if (ai) ai.style.backgroundImage = `linear-gradient(180deg, rgba(16,35,63,0.35), rgba(16,35,63,0.75)), url('${imgs.about}')`;
    }
    if (imgs.pageAbout) {
      const ph = document.querySelector('body.page-about .page-header');
      if (ph) ph.style.backgroundImage = `url('${imgs.pageAbout}')`;
    }
    if (imgs.pagePrograms) {
      const ph = document.querySelector('body.page-programs .page-header');
      if (ph) ph.style.backgroundImage = `url('${imgs.pagePrograms}')`;
    }
    if (imgs.pageNews) {
      const ph = document.querySelector('body.page-news .page-header');
      if (ph) ph.style.backgroundImage = `url('${imgs.pageNews}')`;
    }
    if (imgs.pageGallery) {
      const ph = document.querySelector('body.page-gallery .page-header');
      if (ph) ph.style.backgroundImage = `url('${imgs.pageGallery}')`;
    }
    if (imgs.pageContact) {
      const ph = document.querySelector('body.page-contact .page-header');
      if (ph) ph.style.backgroundImage = `url('${imgs.pageContact}')`;
    }
    if (imgs.cta) {
      const ci = document.querySelector('.cta-editorial img');
      if (ci) ci.src = imgs.cta;
    }

    // Footer contact
    document.querySelectorAll('.contact-line, .footer-links li').forEach(li => {
      const t = li.textContent;
      if (t.includes('info@') && s.email) li.innerHTML = li.innerHTML.replace(/info@[\w.-]+/, s.email);
      if (t.includes('011-') && s.phone) li.innerHTML = li.innerHTML.replace(/0[\d-]+/, s.phone);
    });

    // About
    if (d.about) {
      const a = d.about;
      const story = document.getElementById('about-text');
      if (story) {
        const p = story.querySelector('p');
        if (p && a.story) p.textContent = a.story;
      }
      const cards = document.querySelectorAll('.mission-card');
      if (cards[0] && a.vision) { const p = cards[0].querySelector('p'); if (p) p.textContent = a.vision; }
      if (cards[1] && a.mission) { const p = cards[1].querySelector('p'); if (p) p.textContent = a.mission; }
      if (cards[2] && a.values) { const p = cards[2].querySelector('p'); if (p) p.textContent = a.values; }
    }

    // Staff
    const staffGrid = document.getElementById('staff-grid');
    const staffEmpty = document.getElementById('staff-empty');
    if (staffGrid && Array.isArray(d.staff) && d.staff.length) {
      staffGrid.innerHTML = d.staff.map(st => `
        <div class="feature-card">
          <div class="feature-icon">👤</div>
          <h3>${esc(st.name)}</h3>
          <p><strong>${esc(st.role)}</strong>${st.bio ? ' — ' + esc(st.bio) : ''}</p>
          ${st.img ? `<img src="${esc(st.img)}" alt="${esc(st.name)}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-top:8px;">` : ''}
        </div>`).join('');
      if (staffEmpty) staffEmpty.style.display = 'none';
    } else {
      if (staffEmpty) staffEmpty.style.display = 'block';
    }
    // Home staff section
    const homeStaff = document.getElementById('home-staff');
    const homeStaffEmpty = document.getElementById('home-staff-empty');
    if (homeStaff && Array.isArray(d.staff)) {
      if (d.staff.length) {
        homeStaff.innerHTML = d.staff.map(st => `
          <div class="feature-card">
            <div class="feature-icon">👤</div>
            <h3>${esc(st.name)}</h3>
            <p><strong>${esc(st.role)}</strong>${st.bio ? ' — ' + esc(st.bio) : ''}</p>
            ${st.img ? `<img src="${esc(st.img)}" alt="${esc(st.name)}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-top:8px;">` : ''}
          </div>`).join('');
        if (homeStaffEmpty) homeStaffEmpty.style.display = 'none';
      } else {
        if (homeStaffEmpty) homeStaffEmpty.style.display = 'block';
      }
    }
    // Leaders section
    const leadersGrid = document.getElementById('leaders-grid');
    const leadersEmpty = document.getElementById('leaders-empty');
    if (leadersGrid && Array.isArray(d.leaders)) {
      if (d.leaders.length) {
        leadersGrid.className = 'leaders-grid';
        leadersGrid.innerHTML = d.leaders.map(l => `
          <div class="leader-card">
            <div class="leader-avatar">${l.img ? `<img src="${esc(l.img)}" alt="${esc(l.name)}">` : esc((l.name||'').charAt(0))}</div>
            <div class="leader-info">
              <h3>${esc(l.name)}</h3>
              <div class="role">${esc(l.role)}</div>
              ${l.bio ? `<div class="bio">${esc(l.bio)}</div>` : ''}
            </div>
          </div>`).join('');
        if (leadersEmpty) leadersEmpty.style.display = 'none';
      } else {
        if (leadersEmpty) leadersEmpty.style.display = 'block';
      }
    }

    // Programs
    const progGrid = document.getElementById('prog-grid');
    if (progGrid && Array.isArray(d.programs) && d.programs.length) {
      progGrid.innerHTML = d.programs.map(p => `
        <a href="programs.html" class="prog-tile">
          <img src="${esc(p.img)}" alt="${esc(p.title)}">
          <div class="prog-tile-body">
            <span class="age">${esc(p.age)}</span>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.desc)}</p>
            <span class="link">اكتشف ←</span>
          </div>
        </a>`).join('');
    }

    const progContainer = document.getElementById('programs-container');
    if (progContainer && Array.isArray(d.programs) && d.programs.length) {
      progContainer.innerHTML = d.programs.map(p => `
        <div class="program-detail">
          <div class="pd-img" style="background:linear-gradient(180deg, rgba(16,35,63,0.3), rgba(16,35,63,0.7)), url('${esc(p.img)}') center/cover;">${esc(p.age)}</div>
          <div class="pd-text">
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.desc)}</p>
          </div>
        </div>`).join('');
    }

    // News
    function newsCard(n) {
      const video = n.video ? `<div style="margin-top:8px;"><a href="${esc(n.video)}" target="_blank" class="read">▶ مشاهدة الفيديو</a></div>` : '';
      return `
        <article class="news-ed-card">
          <div class="thumb"><img src="${esc(n.img)}" alt="${esc(n.title)}"></div>
          <div class="news-ed-meta">${esc(n.date)}</div>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.excerpt)}</p>
          ${video}
          <a href="news.html" class="read">اقرأ المزيد ←</a>
        </article>`;
    }
    const newsGrid = document.getElementById('news-grid');
    if (newsGrid && Array.isArray(d.news) && d.news.length) {
      newsGrid.innerHTML = d.news.map(n => `
        <div class="news-card">
          <div class="news-img" style="background:linear-gradient(180deg, rgba(16,35,63,0.1), rgba(16,35,63,0.55)), url('${esc(n.img)}') center/cover;"></div>
          <div class="news-body">
            <div class="news-date">${esc(n.date)}</div>
            <h3>${esc(n.title)}</h3>
            <p>${esc(n.excerpt)}</p>
            ${n.video ? `<p><a href="${esc(n.video)}" target="_blank">▶ فيديو</a></p>` : ''}
            <a href="news-detail.html?id=${n.id}" class="read">اقرأ المزيد ←</a>
          </div>
        </div>`).join('');
    }
    // index news grid (editorial)
    const newsEdGrid = document.querySelector('.news-ed-grid');
    if (newsEdGrid && Array.isArray(d.news) && d.news.length) {
      newsEdGrid.innerHTML = d.news.map((n, i) => `
        <article class="news-ed-card ${i === 0 ? 'feature' : ''}">
          <div class="thumb"><img src="${esc(n.img)}" alt="${esc(n.title)}"></div>
          <div class="news-ed-meta">${esc(n.date)}</div>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.excerpt)}</p>
          ${n.video ? `<p><a href="${esc(n.video)}" target="_blank" class="read">▶ فيديو</a></p>` : ''}
          <a href="news-detail.html?id=${n.id}" class="read">اقرأ المزيد ←</a>
        </article>`).join('');
    }

    // Events
    function eventRow(e) {
      // parse date
      let m = '', day = '';
      try {
        const dt = new Date(e.date);
        const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        m = months[dt.getMonth()];
        day = dt.getDate();
      } catch (err) { m = e.date; day = ''; }
      return `
        <div class="event-row">
          <div class="event-date"><div class="m">${m}</div><div class="d">${day}</div></div>
          <div><div class="event-title">${esc(e.title)}</div><div class="event-note">${esc(e.note)}</div></div>
          <div class="event-arrow">←</div>
        </div>`;
    }
    const evDates = document.getElementById('events-dates');
    const evCal = document.getElementById('events-calendar');
    if (evDates && Array.isArray(d.events)) {
      const dates = d.events.filter(e => e.tab !== 'calendar');
      evDates.innerHTML = dates.map(eventRow).join('');
    }
    if (evCal && Array.isArray(d.events)) {
      const cals = d.events.filter(e => e.tab === 'calendar');
      evCal.innerHTML = cals.map(eventRow).join('');
    }

    // Gallery
    const galGrid = document.getElementById('gallery-grid');
    if (galGrid && Array.isArray(d.gallery) && d.gallery.length) {
      galGrid.innerHTML = d.gallery.map(g => {
        const src = (typeof g === 'string') ? g : g.src;
        const type = (typeof g === 'string') ? 'image' : (g.type || 'image');
        if (type === 'video') {
          return `<div class="gallery-item" style="background:#000;"><video src="${esc(src)}" style="width:100%;height:100%;object-fit:cover;" muted loop autoplay></video></div>`;
        }
        return `<div class="gallery-item" style="background:url('${esc(src)}') center/cover;"></div>`;
      }).join('');
    }
  }

  // 1) instant apply from local cache
  applyData(data());

  // 2) fetch global data (Cloudflare KV) and apply for every visitor
  if (location.protocol !== 'file:') {
    fetch(API, { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res && res.ok && res.data) {
          try { localStorage.setItem(KEY, JSON.stringify(res.data)); } catch (e) {}
          applyData(res.data);
        }
      })
      .catch(() => {});
  }
})();
