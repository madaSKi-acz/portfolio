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

  // ---------- Pet wolf that roams the page ----------
  const wolf = document.getElementById('wolf');
  const bubble = document.getElementById('wolfBubble');
  const rand = (a, b) => a + Math.random() * (b - a);

  let bubbleTimer;
  const say = (text, ms = 1500) => {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), ms);
  };

  const bounds = () => {
    const w = wolf.offsetWidth, h = wolf.offsetHeight;
    return { minX: 12, maxX: innerWidth - w - 12, minY: 90, maxY: innerHeight - h - 14 };
  };
  let pos = { x: innerWidth - 120, y: innerHeight - 70 };
  let target = { ...pos };
  let mode = 'idle';            // idle | walk | run | sleep
  let restUntil = performance.now() + 1500;
  let lastScroll = 0;
  let howled = false;

  const setMode = (next) => {
    if (mode === 'sleep' && next !== 'sleep') say('!', 700);
    mode = next;
    wolf.classList.toggle('is-running', next === 'walk' || next === 'run');
    wolf.classList.toggle('is-sleeping', next === 'sleep');
    wolf.style.setProperty('--gait', next === 'run' ? '.3s' : '.6s');
    if (next === 'sleep') say('z z z', 2200);
  };

  const wander = (run) => {
    const b = bounds();
    // Pick a spot not too close to where we are, so the trip is visible
    for (let i = 0; i < 6; i++) {
      target = { x: rand(b.minX, b.maxX), y: rand(b.minY, b.maxY) };
      if (Math.hypot(target.x - pos.x, target.y - pos.y) > 180) break;
    }
    setMode(run ? 'run' : 'walk');
  };

  const place = () => { wolf.style.transform = `translate(${pos.x}px, ${pos.y}px)`; };
  place();

  if (reduce) {
    // No roaming for reduced motion: the wolf just sits in the corner
  } else {
    addEventListener('scroll', () => {
      const now = performance.now();
      if (now - lastScroll > 900 && (mode === 'idle' || mode === 'sleep' || mode === 'walk')) wander(true);
      lastScroll = now;
    }, { passive: true });

    addEventListener('resize', () => {
      const b = bounds();
      pos.x = Math.min(Math.max(pos.x, b.minX), b.maxX);
      pos.y = Math.min(Math.max(pos.y, b.minY), b.maxY);
      target = { ...pos }; place();
    });

    const tick = (now) => {
      if (mode === 'walk' || mode === 'run') {
        const dx = target.x - pos.x, dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);
        const speed = mode === 'run' ? 4.2 : 1.3;
        if (dist <= speed) {
          pos = { ...target };
          setMode('idle');
          restUntil = now + rand(1800, 4500);
        } else {
          pos.x += (dx / dist) * speed;
          pos.y += (dy / dist) * speed;
          if (Math.abs(dx) > 2) wolf.classList.toggle('is-left', dx < 0);
        }
        place();
      } else if (now > restUntil) {
        if (mode === 'idle' && Math.random() < 0.22) {
          setMode('sleep');
          restUntil = now + rand(7000, 12000);
        } else {
          wander(Math.random() < 0.25);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Howl the first time Contact comes into view
    const contact = document.getElementById('contact');
    if (contact && 'IntersectionObserver' in window) {
      const hio = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting || howled) return;
        howled = true;
        setTimeout(() => {
          wolf.classList.add('is-howling');
          say('Awoooo!', 2000);
          setTimeout(() => wolf.classList.remove('is-howling'), 2200);
        }, 1200);
      }, { threshold: 0.4 });
      hio.observe(contact);
    }
  }

  // Pet the wolf
  const pets = ['♥', 'woof!', '♥ ♥'];
  let petCount = 0;
  wolf.addEventListener('click', () => {
    if (mode !== 'run') { setMode('idle'); restUntil = performance.now() + 2500; }
    wolf.classList.remove('is-hop'); void wolf.offsetWidth; wolf.classList.add('is-hop');
    say(pets[petCount++ % pets.length], 1100);
  });
  wolf.addEventListener('animationend', (e) => { if (e.animationName === 'hop') wolf.classList.remove('is-hop'); });
})();
