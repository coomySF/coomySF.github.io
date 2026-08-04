(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const progress = document.querySelector('.reading-progress span');

  const syncThemeControl = () => {
    if (!toggle) return;
    const isLight = root.dataset.theme === 'light';
    toggle.setAttribute('aria-pressed', String(isLight));
    toggle.title = isLight ? '切換為深色模式' : '切換為淺色模式';
  };

  toggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('coomy-theme', root.dataset.theme);
    syncThemeControl();
  });

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const ratio = scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0;
    progress?.style.setProperty('transform', `scaleX(${ratio})`);
  };

  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  syncThemeControl();
  updateProgress();
})();
