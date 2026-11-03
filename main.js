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

  // ---------- Skill city map ----------
  const map = document.getElementById('skillmap');
  if (map) {
    const vp = document.getElementById('smViewport');
    const world = document.getElementById('smWorld');
    const route = document.getElementById('smRoute');
    const card = document.getElementById('smCard');
    const pins = [...map.querySelectorAll('.pin')];
    const zones = [...map.querySelectorAll('.sm-zone')];
    const zoneGroup = ['front', 'back', 'data', 'flow'];
    zones.forEach((z, i) => { z.dataset.group = zoneGroup[i]; });
    const WW = 1200, WH = 760, HOME = { x: 600, y: 450 };
    const pinXY = (p) => ({ x: parseFloat(p.style.getPropertyValue('--x')), y: parseFloat(p.style.getPropertyValue('--y')) });
    const DIST = { front: 'Front-end Old Town', back: 'Back-end Harbor', data: 'Data Park', flow: 'Automation Hills' };

    let cam = { s: 1, tx: 0, ty: 0 }, minS = 1, maxS = 3, selected = null, anim = 0;
    const size = () => ({ w: vp.clientWidth, h: vp.clientHeight });
    const clampCam = (c) => {
      const { w, h } = size();
      const s = Math.min(Math.max(c.s, minS), maxS);
      // When the city is smaller than the view, keep it centered; otherwise keep it filling the view
      const tx = WW * s <= w ? (w - WW * s) / 2 : Math.min(0, Math.max(w - WW * s, c.tx));
      const ty = WH * s <= h ? (h - WH * s) / 2 : Math.min(0, Math.max(h - WH * s, c.ty));
      return { s, tx, ty };
    };
    const apply = () => {
      world.style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`;
      world.style.setProperty('--inv', Math.max(1 / cam.s, 0.85).toFixed(4));
      map.classList.toggle('is-close', cam.s > minS * 1.45);
      placeCard();
    };
    const centerOn = (x, y, s) => { const { w, h } = size(); return clampCam({ s, tx: w / 2 - x * s, ty: h / 2 - y * s }); };
    const flyTo = (to, ms = 750) => {
      cancelAnimationFrame(anim);
      if (reduce) { cam = to; apply(); return; }
      const from = { ...cam }, t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const step = (now) => {
        const k = ease(Math.min((now - t0) / ms, 1));
        cam = { s: from.s + (to.s - from.s) * k, tx: from.tx + (to.tx - from.tx) * k, ty: from.ty + (to.ty - from.ty) * k };
        apply();
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    const fit = () => {
      const { w, h } = size();
      // Fit the whole city on wide screens; on narrow screens fill the height and let people pan
      const contain = Math.min(w / WW, h / WH);
      minS = contain < 0.6 ? Math.max(contain, h / WH) : contain;
      maxS = Math.max(minS * 2.6, 1.8);
      cam = centerOn(HOME.x, HOME.y - 40, minS);
      apply();
    };

    // Info card
    const placeCard = () => {
      if (!selected || card.hidden) return;
      const { w } = size();
      if (w < 720) { card.style.left = '10px'; card.style.top = ''; card.style.bottom = '10px'; return; }
      const p = pinXY(selected);
      const sx = p.x * cam.s + cam.tx, sy = p.y * cam.s + cam.ty;
      const cw = card.offsetWidth, ch = card.offsetHeight;
      let left = Math.min(Math.max(sx - cw / 2, 10), w - cw - 10);
      const barH = vp.offsetTop;
      let top = barH + sy - 70 - ch;
      if (top < barH + 10) top = barH + sy + 18;
      card.style.left = `${left}px`; card.style.top = `${top}px`; card.style.bottom = '';
    };
    const select = (pin) => {
      pins.forEach((p) => p.classList.toggle('is-on', p === pin));
      selected = pin;
      if (!pin) { card.hidden = true; route.setAttribute('d', ''); return; }
      const g = pin.dataset.group;
      const c = pin.style.getPropertyValue('--c');
      card.style.setProperty('--c', c);
      card.querySelector('.sm-card__icon').innerHTML = pin.querySelector('.pin__head').innerHTML;
      card.querySelector('.sm-card__name').textContent = pin.dataset.name;
      card.querySelector('.sm-card__where').textContent = DIST[g];
      card.querySelector('.sm-card__status').textContent = pin.dataset.status === 'Daily' ? 'Daily driver' : 'Ready to ship';
      card.hidden = false;
      // Route from "You are here" to the pin
      const p = pinXY(pin);
      const mx = (HOME.x + p.x) / 2, my = (HOME.y + p.y) / 2;
      const dx = p.x - HOME.x, dy = p.y - HOME.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(120, len * 0.25);
      route.setAttribute('d', `M${HOME.x} ${HOME.y} Q ${mx - (dy / len) * bend} ${my + (dx / len) * bend} ${p.x} ${p.y - 6}`);
      route.style.setProperty('--route', c);
      route.classList.remove('is-drawing'); void route.getBoundingClientRect(); route.classList.add('is-drawing');
      // Keep the pin comfortably in view
      const { w, h } = size();
      const sx = p.x * cam.s + cam.tx, sy = p.y * cam.s + cam.ty;
      if (sx < 60 || sx > w - 60 || sy < 110 || sy > h - 40) flyTo(centerOn(p.x, p.y - 60, cam.s), 600);
      else placeCard();
    };
    pins.forEach((pin) => pin.addEventListener('click', (e) => { e.stopPropagation(); select(selected === pin ? null : pin); }));
    card.querySelector('.sm-card__x').addEventListener('click', () => select(null));

    // District chips: fly the camera there and highlight
    const chips = [...map.querySelectorAll('[data-fly]')];
    chips.forEach((chip) => chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.toggle('is-on', c === chip));
      const g = chip.dataset.fly;
      select(null);
      map.classList.toggle('is-filtered', g !== 'all');
      pins.forEach((p) => p.classList.toggle('is-match', p.dataset.group === g));
      zones.forEach((z) => z.classList.toggle('is-match', z.dataset.group === g));
      if (g === 'all') { flyTo(centerOn(HOME.x, HOME.y - 40, minS)); return; }
      const pts = pins.filter((p) => p.dataset.group === g).map(pinXY);
      const x0 = Math.min(...pts.map((p) => p.x)) - 110, x1 = Math.max(...pts.map((p) => p.x)) + 110;
      const y0 = Math.min(...pts.map((p) => p.y)) - 140, y1 = Math.max(...pts.map((p) => p.y)) + 70;
      const { w, h } = size();
      const sc = Math.min(Math.max(Math.min(w / (x1 - x0), h / (y1 - y0)), minS), maxS);
      flyTo(centerOn((x0 + x1) / 2, (y0 + y1) / 2, sc));
    }));

    // Zoom buttons + ctrl/cmd + wheel (plain wheel keeps scrolling the page)
    const zoomAt = (factor, cx, cy) => {
      const s = Math.min(Math.max(cam.s * factor, minS), maxS);
      const wx = (cx - cam.tx) / cam.s, wy = (cy - cam.ty) / cam.s;
      return clampCam({ s, tx: cx - wx * s, ty: cy - wy * s });
    };
    map.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      const { w, h } = size();
      flyTo(zoomAt(b.dataset.zoom === 'in' ? 1.4 : 1 / 1.4, w / 2, h / 2), 400);
    }));
    vp.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      cancelAnimationFrame(anim);
      cam = zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
      apply();
    }, { passive: false });

    // Drag to pan
    let drag = null, moved = false;
    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.pin')) return;
      cancelAnimationFrame(anim);
      drag = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty, id: e.pointerId };
      moved = false;
    });
    vp.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) > 4) { moved = true; vp.classList.add('is-dragging'); try { vp.setPointerCapture(e.pointerId); } catch (_) {} }
      if (!moved) return;
      cam = clampCam({ s: cam.s, tx: drag.tx + dx, ty: drag.ty + dy });
      apply();
    });
    const endDrag = () => {
      if (drag && !moved) select(null);   // a plain click on the map closes the card
      drag = null; vp.classList.remove('is-dragging');
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', () => { drag = null; vp.classList.remove('is-dragging'); });

    fit();
    addEventListener('resize', () => { const keep = cam.s / minS; fit(); if (keep > 1.01) { cam = clampCam({ ...cam, s: minS * keep }); apply(); } });

    // Pins drop in when the map scrolls into view
    const live = () => { map.classList.add('is-live'); setTimeout(() => map.classList.add('is-settled'), reduce ? 0 : 250 + pins.length * 70 + 850); };
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
    import('./assets/wolf3d.js?v=12')
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
