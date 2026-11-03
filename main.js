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

  // ---------- Departure board (split-flap skills) ----------
  const board = document.getElementById('board');
  if (board) {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.';
    const rows = [...board.querySelectorAll('.dep')];
    const flapsOf = (el) => {
      const text = el.dataset.text;
      const width = el.classList.contains('flaps--status') ? 5 : 13;
      el.setAttribute('aria-label', text);
      el.innerHTML = '';
      const cells = [];
      for (let i = 0; i < width; i++) {
        const c = document.createElement('i');
        c.setAttribute('aria-hidden', 'true');
        c.textContent = ' ';
        if (i >= text.length) c.className = 'pad';
        el.appendChild(c);
        cells.push({ c, final: text[i] || ' ' });
      }
      return cells;
    };
    const all = rows.map((r) => [...r.querySelectorAll('.flaps')].map(flapsOf)).flat();
    const settle = (cells, delay) => {
      cells.forEach(({ c, final }, i) => {
        if (reduce) { c.textContent = final; return; }
        let n = final === ' ' ? 2 : 4 + Math.floor(Math.random() * 6) + i;
        const step = () => {
          c.classList.remove('is-flip'); void c.offsetWidth; c.classList.add('is-flip');
          c.textContent = n <= 0 ? final : CHARS[Math.floor(Math.random() * CHARS.length)];
          if (n-- > 0) setTimeout(step, 55);
        };
        setTimeout(step, delay + i * 18);
      });
    };
    const run = (visibleRows) => {
      let k = 0;
      rows.forEach((r) => {
        if (!visibleRows.includes(r)) return;
        r.querySelectorAll('.flaps').forEach((f) => settle(all.find((cells) => cells[0].c.parentElement === f), k * 70));
        k++;
      });
    };
    // Flip in when the board scrolls into view
    if ('IntersectionObserver' in window) {
      const bio = new IntersectionObserver((e) => { if (e[0].isIntersecting) { run(rows); bio.disconnect(); } }, { threshold: 0.2 });
      bio.observe(board);
    } else run(rows);
    // Filter tabs
    const tabs = [...board.querySelectorAll('.board__tabs button')];
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => { x.classList.toggle('is-on', x === t); x.setAttribute('aria-selected', String(x === t)); });
      const f = t.dataset.filter;
      const shown = rows.filter((r) => f === 'all' || r.dataset.group === f);
      rows.forEach((r) => { r.hidden = !shown.includes(r); });
      run(shown);
    }));
    // Live clock
    const clock = document.getElementById('boardClock');
    const tickClock = () => { const d = new Date(); clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    tickClock(); setInterval(tickClock, 15000);
  }

  // ---------- 3D pet wolf (loaded after the page is ready) ----------
  const toggle = document.getElementById('wolfToggle');
  let wolfOff = false;
  try { wolfOff = localStorage.getItem('wolf-off') === '1'; } catch (e) {}
  let pet = null, loading = false;
  const loadWolf = () => {
    if (pet || loading) { if (pet) pet.el.hidden = false; return; }
    loading = true;
    import('./assets/wolf3d.js?v=9')
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
