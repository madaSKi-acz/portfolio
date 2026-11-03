(() => {
  // Version from this script's own URL (main.js?v=N in index.html), passed on to the modules it loads,
  // so bumping that one number refreshes everything for returning visitors
  const V = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '1';
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
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 10);
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

  // ---------- Skill city map (MapLibre, loaded when the section gets close) ----------
  const map = document.getElementById('skillmap');
  if (map) {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/vendor/maplibre/maplibre-gl.css?v=6.11.2';
      document.head.append(link);
      import(`./assets/skillmap.js?v=${V}`)
        .then((m) => m.initSkillMap({ root: map, reduce, isDark }))
        .catch((err) => { console.error(err); map.classList.add('is-nomap'); });
    };
    if ('IntersectionObserver' in window) {
      const near = new IntersectionObserver((e) => { if (e[0].isIntersecting) { start(); near.disconnect(); } }, { rootMargin: '900px 0px' });
      near.observe(map);
    } else start();

    // Pins drop in when the map scrolls into view
    const count = map.querySelectorAll('.pin').length;
    const live = () => { map.classList.add('is-live'); setTimeout(() => map.classList.add('is-settled'), reduce ? 0 : 250 + count * 70 + 850); };
    if ('IntersectionObserver' in window && !reduce) {
      const mio = new IntersectionObserver((e) => { if (e[0].isIntersecting) { live(); mio.disconnect(); } }, { threshold: 0.3 });
      mio.observe(map);
    } else live();
  }

  // ---------- 3D pet wolf (loaded after the page is ready) ----------
  const toggle = document.getElementById('wolfToggle');
  let wolfOff = false;
  try { wolfOff = localStorage.getItem('wolf-off') === '1'; } catch (e) {}
  let pet = null, loading = false;
  const loadWolf = () => {
    if (pet || loading) { if (pet) pet.el.hidden = false; return; }
    loading = true;
    import(`./assets/wolf3d.js?v=${V}`)
      .then((m) => { pet = m.startWolf({ reduceMotion: reduce }); })
      .catch(() => {})
      .finally(() => { loading = false; });
  };
  const syncToggle = () => { toggle.textContent = wolfOff ? '🐺 Show wolf' : '🐺 Hide wolf'; };
  syncToggle();
  toggle.addEventListener('click', () => {
    wolfOff = !wolfOff;
    try { localStorage.setItem('wolf-off', wolfOff ? '1' : '0'); } catch (e) {}
    syncToggle();
    if (wolfOff) { if (pet) pet.el.hidden = true; } else loadWolf();
  });
  if (!wolfOff) {
    const whenIdle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
    if (document.readyState === 'complete') whenIdle(loadWolf);
    else addEventListener('load', () => whenIdle(loadWolf));
  }
})();
