// ===== School Website - Enhanced JS =====
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Preloader
    const preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.innerHTML = '<div class="preloader-inner"><div class="preloader-logo">أ</div><div class="preloader-bar"><span></span></div></div>';
    document.body.prepend(preloader);
    const hidePreloader = () => {
      if (!preloader || preloader.classList.contains('hide')) return;
      preloader.classList.add('hide');
      setTimeout(() => preloader.remove(), 900);
    };
    if (document.readyState === 'complete') setTimeout(hidePreloader, 300);
    else window.addEventListener('load', () => setTimeout(hidePreloader, 300));
    setTimeout(hidePreloader, 2600);

    // Scroll progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.prepend(progressBar);

    // Back to top
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.innerHTML = '↑';
    backToTop.setAttribute('aria-label', 'العودة للأعلى');
    document.body.appendChild(backToTop);
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Theme: default dark, follow device preference (prefers-color-scheme)
    const lightMQ = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      document.body.classList.toggle('dark', !lightMQ.matches);
    };
    applyTheme();
    if (lightMQ.addEventListener) lightMQ.addEventListener('change', applyTheme);
    else if (lightMQ.addListener) lightMQ.addListener(applyTheme);

    // Mobile nav toggle
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
      // hamburger bars
      toggle.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
      const backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      document.body.appendChild(backdrop);
      const closeMenu = () => { navLinks.classList.remove('open'); backdrop.classList.remove('show'); toggle.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
      const openMenu = () => { navLinks.classList.add('open'); backdrop.classList.add('show'); toggle.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); };
      toggle.addEventListener('click', () => navLinks.classList.contains('open') ? closeMenu() : openMenu());
      backdrop.addEventListener('click', closeMenu);
      navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    }

    // Highlight active nav link
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
    });

    // Navbar shrink on scroll + progress + back-to-top
    const navbar = document.querySelector('.navbar');
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      if (navbar) navbar.classList.toggle('shrink', y > 60);
      backToTop.classList.toggle('show', y > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Scroll reveal via IntersectionObserver
    const revealEls = document.querySelectorAll('.feature-card, .program-card, .news-card, .mission-card, .step, .testimonial, .gallery-item, .section-title, .about-grid, .contact-grid, .program-detail');
    revealEls.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));

    // Stagger grids
    document.querySelectorAll('.features-grid, .programs-grid, .news-grid, .mission-grid, .steps, .gallery-grid').forEach(g => g.classList.add('stagger'));
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); io2.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.stagger').forEach(el => io2.observe(el));

    // Animated counters
    const animateCounter = (el) => {
      const target = parseFloat(el.dataset.target || el.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(target)) return;
      const suffix = el.textContent.replace(/[\d.]/g, '');
      let start = 0;
      const dur = 1800;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target + suffix;
      };
      requestAnimationFrame(step);
    };
    const statNums = document.querySelectorAll('.stat-card .num, .stats-band .stat .num');
    statNums.forEach(el => {
      const txt = el.textContent.trim();
      el.dataset.target = txt.replace(/[^\d.]/g, '');
      el.dataset.suffix = txt.replace(/[\d.]/g, '');
    });
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          counterIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    statNums.forEach(el => counterIO.observe(el));

    // Particles canvas in hero (enhanced with mouse interaction)
    const hero = document.querySelector('.hero');
    if (hero) {
      const canvas = document.createElement('canvas');
      canvas.id = 'particles-canvas';
      hero.prepend(canvas);
      const ctx = canvas.getContext('2d');
      let particles = [];
      const mouse = { x: -9999, y: -9999 };
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      });
      hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
      const resize = () => { canvas.width = hero.offsetWidth; canvas.height = hero.offsetHeight; init(); };
      const init = () => {
        particles = [];
        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 9000));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            a: Math.random() * 0.5 + 0.2,
            hue: Math.random() > 0.7 ? '245,158,11' : '255,255,255',
            pulse: Math.random() * Math.PI * 2
          });
        }
      };
      resize();
      window.addEventListener('resize', resize);
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          // mouse repulsion
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 120 && d > 0) {
            const force = (120 - d) / 120 * 1.5;
            p.x += (dx / d) * force;
            p.y += (dy / d) * force;
          }
          p.x += p.dx; p.y += p.dy;
          p.pulse += 0.03;
          if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
          const r = Math.max(0.6, p.r + Math.sin(p.pulse) * 0.6);
          // glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
          grad.addColorStop(0, `rgba(${p.hue},${p.a})`);
          grad.addColorStop(1, `rgba(${p.hue},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.hue},${p.a + 0.3})`;
          ctx.fill();
        });
        // connect close particles with gradient lines
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d = Math.hypot(dx, dy);
            if (d < 110) {
              const alpha = 0.18 * (1 - d / 110);
              ctx.strokeStyle = `rgba(245,158,11,${alpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
        requestAnimationFrame(animate);
      };
      animate();
    }

    // 3D tilt cards
    document.querySelectorAll('.feature-card, .program-card, .news-card, .mission-card').forEach(card => {
      card.classList.add('tilt-card');
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    // Ripple effect on buttons
    document.querySelectorAll('.btn').forEach(btn => {
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Magnetic buttons
    document.querySelectorAll('.btn-primary').forEach(btn => {
      btn.classList.add('magnetic');
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });

    // Testimonial carousel
    const testimonials = document.querySelectorAll('.testimonial');
    if (testimonials.length > 1) {
      const wrap = testimonials[0].parentElement;
      wrap.classList.add('testimonial-carousel');
      testimonials.forEach((t, i) => {
        t.classList.add('testimonial-slide');
        if (i === 0) t.classList.add('active');
      });
      const dots = document.createElement('div');
      dots.className = 'carousel-dots';
      testimonials.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => showSlide(i));
        dots.appendChild(d);
      });
      wrap.appendChild(dots);
      let current = 0;
      const showSlide = (i) => {
        testimonials[current].classList.remove('active');
        dots.children[current].classList.remove('active');
        current = i;
        testimonials[current].classList.add('active');
        dots.children[current].classList.add('active');
      };
      setInterval(() => showSlide((current + 1) % testimonials.length), 4500);
    }

    // Gallery lightbox
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems.length) {
      galleryItems.forEach(item => { item.setAttribute('role','button'); item.setAttribute('tabindex','0'); });
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = '<button class="lightbox-close">✕</button><div class="lightbox-content"></div>';
      document.body.appendChild(lb);
      const lbContent = lb.querySelector('.lightbox-content');
      const lbClose = lb.querySelector('.lightbox-close');
      const closeLb = () => lb.classList.remove('show');
      lbClose.addEventListener('click', closeLb);
      lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
      galleryItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          const bg = item.style.backgroundImage;
          if (bg) {
            lbContent.textContent = '';
            lbContent.style.backgroundImage = bg;
            lbContent.style.backgroundSize = 'contain';
            lbContent.style.backgroundRepeat = 'no-repeat';
            lbContent.style.backgroundPosition = 'center';
            lbContent.style.width = '80vw';
            lbContent.style.height = '80vh';
          } else {
            lbContent.textContent = item.textContent.trim() || '🖼️';
          }
          lb.classList.add('show');
        });
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });
    }

    // Contact form handling + confetti
    const spawnConfetti = () => {
      const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
      for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti-piece';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDelay = (Math.random() * 0.5) + 's';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3500);
      }
    };
    const handleForm = (form, msg) => {
      if (!form) return;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.textContent = msg;
        btn.disabled = true;
        spawnConfetti();
        setTimeout(() => { btn.textContent = original; btn.disabled = false; form.reset(); }, 2500);
      });
    };
    handleForm(document.querySelector('#contactForm'), 'تم الإرسال ✓');
    handleForm(document.querySelector('#admissionForm'), 'تم استلام طلبك ✓');

    // Editorial header scroll + full-screen menu
    const siteHeader = document.getElementById('siteHeader');
    if (siteHeader) {
      window.addEventListener('scroll', () => {
        siteHeader.classList.toggle('scrolled', window.scrollY > 40);
      }, { passive: true });
    }
    const menuBtn = document.getElementById('menuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuClose = document.getElementById('menuClose');
    if (menuBtn && menuOverlay) {
      const openMenu = () => { menuOverlay.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; };
      const closeMenu = () => { menuOverlay.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
      menuBtn.addEventListener('click', openMenu);
      if (menuClose) menuClose.addEventListener('click', closeMenu);
      menuOverlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }

    // Events tabs
    document.querySelectorAll('.events-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.tab;
        document.querySelectorAll('.events-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.events-panel').forEach(p => {
          p.hidden = p.dataset.panel !== key;
        });
      });
    });

    // FAQ accordion
    document.querySelectorAll('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });

    // Quick nav dots (home page)
    const sections = document.querySelectorAll('section[id]');
    if (sections.length >= 4 && location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/')) {
      const qn = document.createElement('nav');
      qn.className = 'quick-nav';
      sections.forEach(sec => {
        const a = document.createElement('a');
        a.href = '#' + sec.id;
        a.title = sec.id;
        a.addEventListener('click', (e) => { e.preventDefault(); sec.scrollIntoView({ behavior: 'smooth' }); });
        qn.appendChild(a);
      });
      document.body.appendChild(qn);
      const updateActive = () => {
        let active = sections[0];
        sections.forEach(sec => {
          if (sec.getBoundingClientRect().top <= 120) active = sec;
        });
        qn.querySelectorAll('a').forEach((a, i) => a.classList.toggle('active', sections[i] === active));
      };
      window.addEventListener('scroll', updateActive, { passive: true });
      updateActive();
    }
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

    // Hero image parallax (editorial)
    const heroMediaImg = document.querySelector('.hero-media img');
    if (heroMediaImg) {
      window.addEventListener('scroll', () => {
        if (window.scrollY < window.innerHeight) {
          heroMediaImg.style.transform = `translateY(${window.scrollY * 0.18}px) scale(1.05)`;
        }
      }, { passive: true });
    }

    // Parallax on about image
    const aboutImg = document.querySelector('.about-img');
    if (aboutImg) {
      window.addEventListener('scroll', () => {
        const r = aboutImg.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          aboutImg.style.transform = `translateY(${(r.top - window.innerHeight / 2) * 0.08}px)`;
        }
      }, { passive: true });
    }
  });
})();
