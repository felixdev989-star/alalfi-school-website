// ===== Presentation Mode JS =====
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  const dotsContainer = document.querySelector('.dots');
  const counter = document.querySelector('.counter');
  const progressBar = document.querySelector('.progress-bar');
  let current = 0;
  let autoplay = false;
  let autoplayTimer = null;

  // Build dots
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(d);
  });

  const update = () => {
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    dotsContainer.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
    counter.textContent = `${current + 1} / ${slides.length}`;
    progressBar.style.width = ((current + 1) / slides.length * 100) + '%';
  };

  const goTo = (i) => {
    current = (i + slides.length) % slides.length;
    update();
  };
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  document.querySelector('.btn-next').addEventListener('click', next);
  document.querySelector('.btn-prev').addEventListener('click', prev);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === ' ') { e.preventDefault(); next(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); prev(); }
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
    if (e.key === 'Home') goTo(0);
    if (e.key === 'End') goTo(slides.length - 1);
  });

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
  });

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };
  document.querySelector('.btn-fullscreen').addEventListener('click', toggleFullscreen);

  // Autoplay
  const btnAuto = document.querySelector('.btn-autoplay');
  btnAuto.addEventListener('click', () => {
    autoplay = !autoplay;
    btnAuto.textContent = autoplay ? '⏸' : '▶';
    if (autoplay) autoplayTimer = setInterval(next, 5000);
    else { clearInterval(autoplayTimer); autoplayTimer = null; }
  });

  // Back to site
  document.querySelector('.btn-back').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  update();
});
