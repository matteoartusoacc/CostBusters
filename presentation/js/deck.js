(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const current = document.getElementById('current');
  const bar = document.getElementById('progress-bar');
  const hint = document.getElementById('hint');
  let index = 0;
  let hintTimer = null;

  document.getElementById('total').textContent = String(slides.length);

  function show(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
    current.textContent = String(index + 1);
    bar.style.width = ((index + 1) / slides.length * 100) + '%';
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    if (location.hash !== '#' + (index + 1)) history.replaceState(null, '', '#' + (index + 1));
    showHint();
  }

  function showHint() {
    hint.classList.remove('is-hidden');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.add('is-hidden'), 3000);
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); show(index + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(index - 1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
    else if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
  });

  // Advance on click, except on links and the nav buttons.
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    show(index + 1);
  });

  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  const fromHash = parseInt(location.hash.slice(1), 10);
  show(Number.isFinite(fromHash) ? fromHash - 1 : 0);
})();
