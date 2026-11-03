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

  // ---------- Journey road + wolf ----------
  const road = document.getElementById('trailStops');
  const wolf = document.getElementById('wolf');
  const bubble = document.getElementById('wolfBubble');
  const stopsDef = [['top', 'Start'], ['about', 'About'], ['skills', 'Skills'], ['experience', 'Experience'], ['projects', 'Projects'], ['contact', 'Contact']];
  const stops = stopsDef.map(([id, label]) => {
    const a = document.createElement('a');
    a.href = `#${id}`; a.dataset.label = label; a.setAttribute('aria-label', label);
    road.appendChild(a);
    return { a, el: document.getElementById(id), frac: 0 };
  });

  const maxScroll = () => Math.max(document.documentElement.scrollHeight - innerHeight, 1);
  const layoutStops = () => {
    const max = maxScroll();
    stops.forEach((s) => {
      s.frac = Math.min(Math.max(s.el.offsetTop / max, 0), 1);
      s.a.style.left = `${s.frac * 100}%`;
    });
  };
  layoutStops();
  addEventListener('resize', layoutStops);
  addEventListener('load', layoutStops);

  let bubbleTimer;
  const say = (text, ms = 1600) => {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), ms);
  };

  const roadX = (frac) => {
    const r = road.getBoundingClientRect();
    return r.left + frac * r.width;
  };
  const progress = () => Math.min(Math.max(scrollY / maxScroll(), 0), 1);

  let x = roadX(progress());
  let lastMove = performance.now();
  let state = 'idle';
  let howled = false;
  const setState = (next) => {
    if (state === next) return;
    if (state === 'sleeping' && next !== 'sleeping') say('!', 700);
    wolf.classList.toggle('is-running', next === 'running');
    wolf.classList.toggle('is-sleeping', next === 'sleeping');
    state = next;
    if (next === 'sleeping') say('z z z', 2400);
  };

  const tick = (now) => {
    const target = roadX(progress());
    const step = (target - x) * (reduce ? 1 : 0.075);
    x += step;
    const speed = Math.abs(step);
    const w = wolf.offsetWidth;
    const rr = road.getBoundingClientRect();
    const cx = Math.min(Math.max(x, rr.left + w * 0.4), rr.right - w * 0.4);
    wolf.style.transform = `translateX(${cx - w / 2}px)`;

    if (speed > 0.35) {
      wolf.classList.toggle('is-left', step < 0);
      wolf.style.setProperty('--gait', `${Math.max(0.24, Math.min(0.62, 0.66 - speed * 0.035)).toFixed(2)}s`);
      lastMove = now;
      if (!reduce) setState('running');
      if (progress() < 0.95) howled = false;
    } else {
      const idle = now - lastMove;
      if (idle > 9000) setState('sleeping');
      else if (state !== 'sleeping') setState('idle');
      if (!howled && progress() > 0.97 && idle > 350 && state === 'idle') {
        howled = true;
        wolf.classList.add('is-howling');
        say('Awoooo!', 2000);
        setTimeout(() => wolf.classList.remove('is-howling'), 2200);
      }
    }

    // Stations the wolf has passed light up
    stops.forEach((s) => s.a.classList.toggle('is-past', roadX(s.frac) <= x + 2));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Pet the wolf
  const pets = ['♥', '♥ ♥', 'woof!', '♥'];
  let petCount = 0;
  wolf.addEventListener('click', () => {
    lastMove = performance.now();
    setState('idle');
    wolf.classList.remove('is-hop'); void wolf.offsetWidth; wolf.classList.add('is-hop');
    say(pets[petCount++ % pets.length], 1100);
  });
  wolf.addEventListener('animationend', (e) => { if (e.animationName === 'hop') wolf.classList.remove('is-hop'); });
})();
