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
  // The new theme sweeps in from the toggle (top right) to the far corner (bottom left), like light
  // moving across the page. Browsers without View Transitions, or reduced motion, switch instantly.
  const themeBtn = document.getElementById('themeToggle');
  const mapInView = () => {
    const m = document.getElementById('skillmap');
    if (!m || !m.classList.contains('has-map')) return false;
    const r = m.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };
  // Give the map a moment to draw its new style, so it changes together with the page
  const mapRestyled = () => new Promise((done) => {
    document.addEventListener('skillmap:styled', done, { once: true });
    setTimeout(done, 450);
  });
  // ---------- Theme wave ----------
  // A breaking wave sweeps diagonally from the toggle's corner (top right) to the bottom left.
  // Behind the wave the page is already in the new theme (the clip on the new snapshot); the crest
  // is a foam line with spray drawn live on a canvas above it; text lights up as the crest passes.
  const WAVE_MS = 3200;
  const easeWave = (t) => 0.5 - Math.cos(Math.PI * t) / 2;   // gentle in and out, like a swell
  // The foam layer is SVG (paths updated in place each frame), so no stale frames can linger
  let fx = null;
  const NS = 'http://www.w3.org/2000/svg';
  const waveCanvas = () => {
    if (fx) return fx;
    const c = document.createElementNS(NS, 'svg');
    c.setAttribute('class', 'wave-fx');
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = `<defs><filter id="waveBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter></defs>
      <g class="wave-fx__all">
        <path class="w-glow" fill="none" stroke-linecap="round" stroke-width="90" filter="url(#waveBlur)"/>
        <path class="w-spray1" fill="none" stroke="rgba(235,246,255,.2)" stroke-linecap="round" stroke-width="1.1"/>
        <path class="w-spray2" fill="none" stroke="rgba(150,205,240,.15)" stroke-linecap="round" stroke-width=".8"/>
        <path class="w-crest1" fill="none" stroke="rgba(170,215,245,.14)" stroke-linecap="round" stroke-linejoin="round" stroke-width="12"/>
        <path class="w-crest2" fill="none" stroke="rgba(240,248,255,.32)" stroke-linecap="round" stroke-linejoin="round" stroke-width="5"/>
        <path class="w-crest3" fill="none" stroke="rgba(255,255,255,.55)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
        <path class="w-foam" fill="rgba(255,255,255,.32)"/>
      </g>`;
    document.body.append(c);
    const q = (k) => c.querySelector(k);
    fx = { c, all: q('.wave-fx__all'), glow: q('.w-glow'), s1: q('.w-spray1'), s2: q('.w-spray2'), c1: q('.w-crest1'), c2: q('.w-crest2'), c3: q('.w-crest3'), foam: q('.w-foam') };
    return fx;
  };
  // Seeded noise so the foam looks the same from frame to frame (it moves, it doesn't flicker)
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const geometry = () => {
    const W = innerWidth, H = innerHeight, L = Math.hypot(W, H);
    const u = { x: -W / L, y: H / L };          // travel direction: top right -> bottom left
    const v = { x: H / L, y: W / L };           // along the crest
    const qs = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => (x - W) * v.x + y * v.y);
    return { W, H, L, u, v, q0: Math.min(...qs) - 60, q1: Math.max(...qs) + 60 };
  };
  // Crest offset along the travel direction at position q on the crest, at time t (0..1)
  const crest = (q, t) => Math.sin(q * 0.011 + t * 7) * 16 + Math.sin(q * 0.027 - t * 11) * 6 + Math.sin(q * 0.005 + t * 3) * 24;
  const front = (t, G) => -140 + (G.L + 280) * easeWave(t);
  const pt = (G, p, q) => [G.W + G.u.x * p + G.v.x * q, G.u.y * p + G.v.y * q];
  const waveFrames = (G) => {
    const frames = [], N = 56, S = 40;
    for (let f = 0; f <= N; f++) {
      const t = f / N, s = front(t, G), pts = [];
      for (let i = 0; i <= S; i++) {
        const q = G.q0 + ((G.q1 - G.q0) * i) / S;
        pts.push(pt(G, s + crest(q, t), q));
      }
      pts.push(pt(G, -400, G.q1), pt(G, -400, G.q0));
      frames.push(`polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`);
    }
    return frames;
  };
  const f1 = (n) => n.toFixed(1);
  const drawFoam = (G, t, toDark) => {
    fx.c.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
    if (t >= 1) { fx.all.setAttribute('opacity', 0); return; }
    const s = front(t, G);
    fx.all.setAttribute('opacity', Math.min(1, t * 6, (1 - t) * 5).toFixed(3));
    let line = '';
    for (let q = G.q0; q <= G.q1; q += 14) { const [x, y] = pt(G, s + crest(q, t), q); line += `${line ? 'L' : 'M'}${f1(x)} ${f1(y)}`; }
    // soft light (or shadow) moving with the crest
    fx.glow.setAttribute('stroke', toDark ? 'rgba(120,170,255,.12)' : 'rgba(255,248,230,.16)');
    for (const el of [fx.glow, fx.c1, fx.c2, fx.c3]) el.setAttribute('d', line);
    // spray streaks trailing behind the crest, pointing the way the wave moves
    let a1 = '', a2 = '';
    for (let i = 0; i < 90; i++) {
      const q = G.q0 + rnd(i) * (G.q1 - G.q0);
      const back = 8 + rnd(i + 0.5) * 130 * (0.4 + rnd(i + 0.9));
      const p = s + crest(q, t) - back, len = 10 + rnd(i + 0.3) * 46;
      const [x, y] = pt(G, p, q), [x2, y2] = pt(G, p - len, q + (rnd(i + 0.7) - 0.5) * 10);
      const seg = `M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}`;
      if (rnd(i + 0.2) > 0.4) a1 += seg; else a2 += seg;
    }
    fx.s1.setAttribute('d', a1); fx.s2.setAttribute('d', a2);
    // foam clumps along the crest
    let fm = '';
    for (let i = 0; i < 50; i++) {
      const q = G.q0 + rnd(i + 50) * (G.q1 - G.q0);
      const [x, y] = pt(G, s + crest(q, t) - rnd(i + 51) * 22, q);
      const r = 1 + rnd(i + 53) * 3;
      fm += `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
    }
    fx.foam.setAttribute('d', fm);
  };
  // What the crest lights up as it passes: text glows, objects (cards, pins, buttons, map panels) get a halo.
  // The objects should read more than the wave itself.
  const LIT_TEXT = 'h1, h2, h3, .statement, .label, .tag, .metro__key span, .facts strong, .facts span, .route__when, .contact__mail, .sm-district span, .footer__inner';
  const LIT_BOX = '.about__photo img, .school, .route__links a, .btn, .nav__cta, .theme-btn, .stn i, .stn b, .project, .route li, .socials a, .sm-data, .sm-card, .sm-zoom button, .pin__head, .pin__label, .sm-home span';
  const lightText = (G, startAt) => {
    const hit = (el, cls) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > G.H || r.width === 0) return;
      const p = (r.left + r.width / 2 - G.W) * G.u.x + (r.top + r.height / 2) * G.u.y;
      // find when the front reaches this point (front() is monotonic, so a quick search will do)
      let lo = 0, hi = 1;
      for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (front(m, G) < p) lo = m; else hi = m; }
      const at = startAt + lo * WAVE_MS - performance.now();
      setTimeout(() => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); }, Math.max(0, at - 80));
      setTimeout(() => el.classList.remove(cls), Math.max(0, at + 1700));
    };
    document.querySelectorAll(LIT_TEXT).forEach((el) => hit(el, 'wave-lit'));
    document.querySelectorAll(LIT_BOX).forEach((el) => hit(el, 'wave-lit-box'));
  };
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    };
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    const G = geometry();
    const { c } = waveCanvas();
    const waitMap = mapInView();
    const t = document.startViewTransition(() => {
      apply();
      c.classList.add('is-on');                  // the foam layer joins the new view as its own layer
      return waitMap ? mapRestyled() : undefined;
    });
    t.ready.then(() => {
      root.animate({ clipPath: waveFrames(G) }, { duration: WAVE_MS, easing: 'linear', pseudoElement: '::view-transition-new(root)' });
      const t0 = performance.now();
      lightText(G, t0);
      const tick = (now) => {
        const k = Math.min((now - t0) / WAVE_MS, 1);
        drawFoam(G, k, next === 'dark');
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }).catch(() => {});
    t.finished.finally(() => { c.classList.remove('is-on'); fx.all.setAttribute('opacity', 0); });
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
