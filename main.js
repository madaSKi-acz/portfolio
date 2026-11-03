(() => {
  const root = document.documentElement;
  root.classList.add('js');
  document.getElementById('year').textContent = new Date().getFullYear();

  // Theme toggle
  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Nav background + route rail progress
  const nav = document.getElementById('nav');
  const fill = document.getElementById('railFill');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', scrollY > 10);
    const max = document.documentElement.scrollHeight - innerHeight;
    fill.style.transform = `scaleY(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // Reveal on scroll, staggered per parent
  const reveals = document.querySelectorAll('.reveal');
  const count = new Map();
  reveals.forEach((el) => {
    const i = count.get(el.parentElement) || 0;
    el.style.setProperty('--d', `${Math.min(i, 5) * 90}ms`);
    count.set(el.parentElement, i + 1);
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  // Rail: highlight the current section and the ones already passed
  const stops = [...document.querySelectorAll('.rail a')];
  const sections = stops.map((a) => document.querySelector(a.getAttribute('href')));
  if ('IntersectionObserver' in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const idx = sections.indexOf(e.target);
        stops.forEach((a, i) => {
          a.classList.toggle('is-active', i === idx);
          a.classList.toggle('is-past', i < idx);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => s && sio.observe(s));
  }
})();
