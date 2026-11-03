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

  // ---------- Skill city map (real streets from OpenStreetMap via Leaflet) ----------
  const map = document.getElementById('skillmap');
  if (map && window.L) {
    const L = window.L;
    const el = document.getElementById('smMap');
    const vp = document.getElementById('smViewport');
    const card = document.getElementById('smCard');
    const [clat, clng] = el.dataset.center.split(',').map(Number);
    const Z = Number(el.dataset.zoom) || 14;
    const GROUPS = {
      front: { name: 'Front end', where: 'Front-end Old Town', c: '--orange' },
      back: { name: 'Back end', where: 'Back-end Harbor', c: '--blue' },
      data: { name: 'Data & maps', where: 'Data Park', c: '--green' },
      flow: { name: 'Workflow', where: 'Automation Hills', c: '--violet' },
    };
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

    // Pins are laid out in a 1200 × 760 sketch (their --x/--y). Map that sketch onto real
    // streets around the center, at roughly 1 sketch pixel = 1 screen pixel at the default zoom.
    const pxDeg = 256 * Math.pow(2, Z) / 360;
    const toLatLng = (x, y) => L.latLng(clat - (y - 450) / pxDeg * Math.cos(clat * Math.PI / 180), clng + (x - 600) / pxDeg);
    const HOME = toLatLng(600, 450);

    const lmap = L.map(el, {
      center: HOME, zoom: Z, minZoom: Z - 3, maxZoom: 18, zoomSnap: 0.25, zoomDelta: 0.5,
      zoomControl: false, attributionControl: false, scrollWheelZoom: false, worldCopyJump: false,
    });

    // OpenStreetMap tiles (no API key). The colors are tuned to the site theme in CSS.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'sm-tiles' }).addTo(lmap);
    const syncTheme = () => restyle();
    new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', syncTheme);

    // Skills as point features, read from the pin buttons in the HTML
    const pinEls = [...map.querySelectorAll('.sm-pins .pin')];
    const feats = pinEls.map((p, i) => {
      const x = parseFloat(p.style.getPropertyValue('--x')), y = parseFloat(p.style.getPropertyValue('--y'));
      const g = p.dataset.group;
      const icon = L.divIcon({ className: 'sm-marker', html: p.outerHTML, iconSize: [0, 0], iconAnchor: [0, 0] });
      const marker = L.marker(toLatLng(x, y), { icon, keyboard: false, riseOnHover: true, title: '' });
      return { i, x, y, g, name: p.dataset.name, status: p.dataset.status, head: p.querySelector('.pin__head').innerHTML, marker };
    });
    map.querySelector('.sm-pins').remove();

    // District polygons: a soft hull around each group's pins
    const hull = (pts) => {
      pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], up = [];
      for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (const p of pts.slice().reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    };
    const layers = {};
    Object.keys(GROUPS).forEach((g) => {
      const own = feats.filter((f) => f.g === g);
      const ring = [];
      own.forEach((f) => { for (let a = 0; a < 16; a++) ring.push([f.x + Math.cos(a / 16 * 2 * Math.PI) * 70, f.y - 30 + Math.sin(a / 16 * 2 * Math.PI) * 70]); });
      const area = L.polygon(hull(ring).map(([x, y]) => toLatLng(x, y)), { className: 'sm-area', interactive: false, smoothFactor: 1 });
      const cx = own.reduce((s, f) => s + f.x, 0) / own.length;
      const label = L.marker(toLatLng(cx, Math.min(...own.map((f) => f.y)) - 120), {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'sm-district', html: `<span>${GROUPS[g].where}</span>`, iconSize: [0, 0] }),
      });
      layers[g] = { group: L.layerGroup([area, label, ...own.map((f) => f.marker)]).addTo(lmap), area, own, on: true };
    });
    const restyle = () => Object.entries(layers).forEach(([g, l]) => {
      const c = css(GROUPS[g].c);
      l.area.setStyle({ color: c, weight: 2, dashArray: '6 6', fillColor: c, fillOpacity: isDark() ? 0.14 : 0.1, opacity: 0.7 });
    });
    restyle();

    // "You are here"
    L.marker(HOME, { interactive: false, keyboard: false, zIndexOffset: -100,
      icon: L.divIcon({ className: 'sm-home', html: '<span></span><b>You are here</b>', iconSize: [0, 0] }) }).addTo(lmap);
    const route = L.polyline([], { className: 'sm-route', interactive: false, weight: 5, lineCap: 'round' }).addTo(lmap);

    // Info card
    let selected = null;
    const placeCard = () => {
      if (!selected || card.hidden) return;
      const w = vp.clientWidth;
      if (w < 720) { card.style.left = '10px'; card.style.top = ''; card.style.bottom = '10px'; return; }
      const pt = lmap.latLngToContainerPoint(selected.marker.getLatLng());
      const cw = card.offsetWidth, ch = card.offsetHeight, barH = vp.offsetTop;
      const left = Math.min(Math.max(pt.x - cw / 2, 10), w - cw - 10);
      let top = barH + pt.y - 76 - ch;
      if (top < barH + 10) top = barH + pt.y + 22;
      card.style.left = `${left}px`; card.style.top = `${top}px`; card.style.bottom = '';
    };
    // Follow real roads when the public OSRM router answers; otherwise fall back to a curve
    const roads = new Map();
    const curve = (a, b) => {
      const pa = lmap.project(a, Z), pb = lmap.project(b, Z);
      const d = pb.subtract(pa), len = Math.hypot(d.x, d.y) || 1, bend = Math.min(120, len * 0.25);
      const m = pa.add(pb).divideBy(2).add(L.point(-d.y / len * bend, d.x / len * bend));
      const out = [];
      for (let t = 0; t <= 1.001; t += 0.05) out.push(lmap.unproject(L.point(
        (1 - t) ** 2 * pa.x + 2 * (1 - t) * t * m.x + t * t * pb.x, (1 - t) ** 2 * pa.y + 2 * (1 - t) * t * m.y + t * t * pb.y), Z));
      return out;
    };
    const roadRoute = (f) => {
      if (roads.has(f.i)) return roads.get(f.i);
      const b = f.marker.getLatLng();
      const url = `https://router.project-osrm.org/route/v1/foot/${HOME.lng},${HOME.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
      const ctl = 'AbortController' in window ? new AbortController() : null;
      const t = setTimeout(() => ctl && ctl.abort(), 2500);
      const p = fetch(url, ctl ? { signal: ctl.signal } : {})
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => [HOME, ...j.routes[0].geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng)), b])
        .catch(() => { roads.delete(f.i); return curve(HOME, b); })
        .finally(() => clearTimeout(t));
      roads.set(f.i, p);
      return p;
    };
    const drawRoute = (pts, c) => {
      route.setLatLngs(pts);
      const path = route.getElement();
      if (!path) return;
      path.style.setProperty('--route', c);
      const len = path.getTotalLength ? path.getTotalLength() : 0;
      path.style.strokeDasharray = len; path.style.strokeDashoffset = reduce ? 0 : len;
      path.getBoundingClientRect();
      path.style.transition = reduce ? 'none' : 'stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)';
      path.style.strokeDashoffset = 0;
      setTimeout(() => { if (path.style.strokeDashoffset === '0px' || path.style.strokeDashoffset === '0') path.style.strokeDasharray = 'none'; }, 1000);
    };
    const pinEl = (f) => f.marker.getElement() && f.marker.getElement().querySelector('.pin');
    const select = (f) => {
      feats.forEach((o) => pinEl(o) && pinEl(o).classList.toggle('is-on', o === f));
      selected = f;
      if (!f) { card.hidden = true; route.setLatLngs([]); return; }
      const c = css(GROUPS[f.g].c);
      card.style.setProperty('--c', `var(${GROUPS[f.g].c})`);
      card.querySelector('.sm-card__icon').innerHTML = f.head;
      card.querySelector('.sm-card__name').textContent = f.name;
      card.querySelector('.sm-card__where').textContent = GROUPS[f.g].where;
      card.querySelector('.sm-card__status').textContent = f.status === 'Daily' ? 'Daily driver' : 'Ready to ship';
      card.hidden = false;
      drawRoute(curve(HOME, f.marker.getLatLng()), c);
      roadRoute(f).then((pts) => { if (selected === f) drawRoute(pts, c); });
      const pt = lmap.latLngToContainerPoint(f.marker.getLatLng());
      const w = vp.clientWidth, h = vp.clientHeight;
      if (pt.x < 60 || pt.x > w - 60 || pt.y < 120 || pt.y > h - 40) lmap.panTo(f.marker.getLatLng(), { animate: !reduce });
      placeCard();
    };
    feats.forEach((f) => f.marker.on('add', () => {
      const b = pinEl(f);
      if (!b) return;
      b.style.setProperty('--i', f.i);
      b.addEventListener('click', (e) => { e.stopPropagation(); select(selected === f ? null : f); });
      L.DomEvent.disableClickPropagation(b);
    }));
    feats.forEach((f) => { const b = pinEl(f); if (b) f.marker.fire('add'); });
    lmap.on('click', () => select(null));
    lmap.on('move zoom', placeCard);
    card.querySelector('.sm-card__x').addEventListener('click', () => select(null));

    // Camera helpers
    const allBounds = () => L.latLngBounds(feats.map((f) => f.marker.getLatLng())).extend(HOME);
    // Leave room for the dataset panel (bottom right) and the zoom buttons
    const pad = () => {
      if (vp.clientWidth < 720) return { paddingTopLeft: [20, 70], paddingBottomRight: [20, 60] };
      const side = Math.max(16, (vp.clientWidth - 1140) / 2 + 24);
      return { paddingTopLeft: [side + 40, 90], paddingBottomRight: [side + 290, 40] };
    };
    // Narrow screens: fill the height and let people pan sideways
    const view = (bounds) => {
      const o = pad();
      if (vp.clientWidth >= 720) {
        const tl = L.point(o.paddingTopLeft), br = L.point(o.paddingBottomRight);
        const z = Math.min(lmap.getBoundsZoom(bounds, false, tl.add(br)), Z + 1);
        return [lmap.unproject(lmap.project(bounds.getCenter(), z).add(br.subtract(tl).divideBy(2)), z), z];
      }
      const c = bounds.getCenter();
      const tall = L.latLngBounds([bounds.getSouth(), c.lng], [bounds.getNorth(), c.lng]);
      return [c, Math.min(lmap.getBoundsZoom(tall, false, L.point(0, 130)), Z + 1)];
    };
    const fly = (bounds) => { const [c, z] = view(bounds); lmap.flyTo(c, z, { duration: reduce ? 0 : 0.8 }); };
    const showAll = () => { const [c, z] = view(allBounds()); lmap.setView(c, z, { animate: false }); };

    // District list in the dataset panel (bottom right): tap a row to fly there, the box shows/hides the layer
    const list = document.getElementById('smLayers');
    const row = (g, name, count, c) => {
      const li = document.createElement('li');
      li.dataset.layer = g;
      li.style.setProperty('--c', c);
      li.innerHTML = `<button type="button" class="sm-fly${g === 'all' ? ' is-on' : ''}" data-fly="${g}"><i aria-hidden="true"></i><span>${name}</span><em class="mono">${count}</em></button>`
        + (g === 'all' ? '' : `<label class="sm-vis" title="Show or hide ${name}"><input type="checkbox" checked aria-label="Show ${name} on the map" /><b aria-hidden="true"></b></label>`);
      list.append(li);
      const box = li.querySelector('input');
      if (box) box.addEventListener('change', (e) => toggleLayer(g, e.target.checked));
    };
    row('all', 'All skills', feats.length, 'var(--ink)');
    Object.entries(GROUPS).forEach(([g, d]) => row(g, d.name, layers[g].own.length, `var(${d.c})`));
    const chips = [...map.querySelectorAll('[data-fly]')];
    const focus = (g) => {
      chips.forEach((c) => c.classList.toggle('is-on', c.dataset.fly === g));
      select(null);
      map.classList.toggle('is-filtered', g !== 'all');
      feats.forEach((f) => pinEl(f) && pinEl(f).classList.toggle('is-match', f.g === g));
      Object.entries(layers).forEach(([k, l]) => l.area.getElement() && l.area.getElement().classList.toggle('is-match', k === g));
      if (g === 'all') return fly(allBounds());
      if (!layers[g].on) toggleLayer(g, true);
      fly(layers[g].area.getBounds());
    };
    chips.forEach((chip) => chip.addEventListener('click', () => focus(chip.dataset.fly)));

    // Zoom buttons + ctrl/cmd + wheel (plain wheel keeps scrolling the page)
    map.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.zoom === 'home') return focus('all');
      b.dataset.zoom === 'in' ? lmap.zoomIn() : lmap.zoomOut();
    }));
    vp.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      lmap.setZoomAround(L.point(e.clientX - r.left, e.clientY - r.top), lmap.getZoom() - e.deltaY * 0.004, { animate: false });
    }, { passive: false });

    // Dataset panel: layer toggles with feature counts, cursor readout, zoom level
    const toggleLayer = (g, on) => {
      layers[g].on = on;
      on ? layers[g].group.addTo(lmap) : lmap.removeLayer(layers[g].group);
      const box = list.querySelector(`[data-layer="${g}"] input`);
      if (box) box.checked = on;
      if (!on && selected && selected.g === g) select(null);
      restyle();
      document.getElementById('smCount').textContent = feats.filter((f) => layers[f.g].on).length;
    };
    const cursor = document.getElementById('smCursor'), zl = document.getElementById('smZoomLvl');
    const fmt = (ll) => `${Math.abs(ll.lat).toFixed(4)}° ${ll.lat >= 0 ? 'N' : 'S'}, ${Math.abs(ll.lng).toFixed(4)}° ${ll.lng >= 0 ? 'E' : 'W'}`;
    lmap.on('mousemove', (e) => { cursor.textContent = fmt(e.latlng); });
    lmap.on('mouseout', () => { cursor.textContent = fmt(lmap.getCenter()); });
    lmap.on('moveend', () => { if (!matchMedia('(hover: hover)').matches) cursor.textContent = fmt(lmap.getCenter()); });
    lmap.on('zoomend', () => { zl.textContent = `z${lmap.getZoom().toFixed(2).replace(/\.?0+$/, '')}`; });
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 110 }).addTo(lmap);
    const panel = document.getElementById('smData');
    const fold = panel.querySelector('.sm-data__fold');
    const setFold = (open) => { panel.classList.toggle('is-folded', !open); fold.setAttribute('aria-expanded', open); fold.textContent = open ? '−' : '+'; };
    fold.addEventListener('click', () => setFold(panel.classList.contains('is-folded')));
    L.DomEvent.disableClickPropagation(panel); L.DomEvent.disableScrollPropagation(panel);

    showAll();
    cursor.textContent = fmt(lmap.getCenter());
    zl.textContent = `z${lmap.getZoom().toFixed(2).replace(/\.?0+$/, '')}`;
    let rz;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { lmap.invalidateSize(); if (!selected && map.querySelector('[data-fly="all"].is-on')) showAll(); placeCard(); }, 150); });

    // Pins drop in when the map scrolls into view
    const live = () => { map.classList.add('is-live'); setTimeout(() => map.classList.add('is-settled'), reduce ? 0 : 250 + feats.length * 70 + 850); };
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
    import('./assets/wolf3d.js?v=14')
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
