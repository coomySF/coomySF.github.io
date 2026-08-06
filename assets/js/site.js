(() => {
  const root = document.documentElement;
  const progress = document.querySelector('.reading-progress span');
  const hero = document.querySelector('.hero');
  const tilt = document.querySelector('[data-tilt]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const ratio = scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0;
    progress?.style.setProperty('transform', `scaleX(${ratio})`);
  };

  let pointerFrame = 0;
  const updatePointer = (event) => {
    if (reduceMotion.matches || !finePointer.matches) return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      root.style.setProperty('--cursor-x', `${event.clientX}px`);
      root.style.setProperty('--cursor-y', `${event.clientY}px`);
    });
  };

  const updateHeroDepth = (event) => {
    if (!hero || !tilt || reduceMotion.matches || !finePointer.matches) return;
    const rect = hero.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
    hero.style.setProperty('--hero-x', x.toFixed(3));
    hero.style.setProperty('--hero-y', y.toFixed(3));
    tilt.style.setProperty('--tilt-x', x.toFixed(3));
    tilt.style.setProperty('--tilt-y', y.toFixed(3));
  };

  const resetHeroDepth = () => {
    hero?.style.setProperty('--hero-x', 0);
    hero?.style.setProperty('--hero-y', 0);
    tilt?.style.setProperty('--tilt-x', 0);
    tilt?.style.setProperty('--tilt-y', 0);
  };

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .14 });
    revealItems.forEach((item) => observer.observe(item));
  }

  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  addEventListener('pointermove', updatePointer, { passive: true });
  hero?.addEventListener('pointermove', updateHeroDepth, { passive: true });
  hero?.addEventListener('pointerleave', resetHeroDepth);
  updateProgress();
})();
