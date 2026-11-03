// Skill city: skills as pins on a real vector map (MapLibre GL + OpenFreeMap, no API key).
// Loaded on demand by main.js when the map section comes near the viewport.
import * as ml from './vendor/maplibre/maplibre-gl.mjs';

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
const GROUPS = {
  front: { name: 'Front end', where: 'Front-end Old Town', c: '--orange' },
  back: { name: 'Back end', where: 'Back-end Harbor', c: '--blue' },
  data: { name: 'Data & maps', where: 'Data Park', c: '--green' },
  flow: { name: 'Workflow', where: 'Automation Hills', c: '--violet' },
};
const EN_LABEL = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];

export function initSkillMap({ root: map, reduce, isDark }) {
  const el = document.getElementById('smMap');
  const vp = document.getElementById('smViewport');
  const card = document.getElementById('smCard');
  const [clat, clng] = el.dataset.center.split(',').map(Number);
  const Z = Number(el.dataset.zoom) || 14;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // Pins are laid out in a 1200 × 760 sketch (their --x/--y). Map that sketch onto real
  // streets around the center, at about 1 sketch pixel = 1 screen pixel at the default zoom.
  const pxDeg = (512 * 2 ** Z) / 360;
  const cosLat = Math.cos((clat * Math.PI) / 180);
  const toLngLat = (x, y) => [clng + (x - 600) / pxDeg, clat - ((y - 450) / pxDeg) * cosLat];
  const HOME = toLngLat(600, 450);

  // ---------- Map ----------
  const lmap = new ml.Map({
    container: el,
    style: isDark() ? STYLES.dark : STYLES.light,
    center: HOME, zoom: Z, minZoom: Z - 3, maxZoom: 19,
    cooperativeGestures: true,      // plain wheel scrolls the page; ctrl/⌘ + wheel or two fingers move the map
    attributionControl: false,
    dragRotate: false, pitchWithRotate: false, touchPitch: false,
    fadeDuration: reduce ? 0 : 200,
  });
  lmap.touchZoomRotate.disableRotation();
  lmap.keyboard.disableRotation();
  lmap.addControl(new ml.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');

  // ---------- Skills as point features ----------
  const pinEls = [...map.querySelectorAll('.sm-pins .pin')];
  // Pull each district toward "You are here" (PULL) and tighten pins inside it a little (TIGHT)
  const PULL = 0.72, TIGHT = 0.85;
  const raw = pinEls.map((p) => ({ g: p.dataset.group, x: parseFloat(p.style.getPropertyValue('--x')), y: parseFloat(p.style.getPropertyValue('--y')) }));
  const centroid = {};
  raw.forEach((r) => { const c = (centroid[r.g] ||= { x: 0, y: 0, n: 0 }); c.x += r.x; c.y += r.y; c.n++; });
  const placed = raw.map((r) => {
    const c = centroid[r.g], cx = c.x / c.n, cy = c.y / c.n;
    return { x: 600 + (cx - 600) * PULL + (r.x - cx) * TIGHT, y: 450 + (cy - 450) * PULL + (r.y - cy) * TIGHT };
  });
  const feats = pinEls.map((p, i) => {
    const { x, y } = placed[i];
    const wrap = document.createElement('div');
    wrap.className = 'sm-marker';
    wrap.append(p);
    const ll = toLngLat(x, y);
    const marker = new ml.Marker({ element: wrap, anchor: 'center' }).setLngLat(ll).addTo(lmap);
    return { i, x, y, ll, g: p.dataset.group, name: p.dataset.name, status: p.dataset.status, head: p.querySelector('.pin__head').innerHTML, pin: p, wrap, marker };
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
    own.forEach((f) => { for (let a = 0; a < 16; a++) ring.push([f.x + Math.cos((a / 16) * 2 * Math.PI) * 58, f.y - 30 + Math.sin((a / 16) * 2 * Math.PI) * 58]); });
    const poly = hull(ring).map(([x, y]) => toLngLat(x, y));
    poly.push(poly[0]);
    const bounds = poly.reduce((b, p) => b.extend(p), new ml.LngLatBounds(poly[0], poly[0]));
    const cx = own.reduce((s, f) => s + f.x, 0) / own.length;
    const lab = document.createElement('div');
    lab.className = 'sm-district';
    lab.innerHTML = `<span>${GROUPS[g].where}</span>`;
    const label = new ml.Marker({ element: lab, anchor: 'center' }).setLngLat(toLngLat(cx, g === 'data' ? Math.max(...own.map((f) => f.y)) + 62 : Math.min(...own.map((f) => f.y)) - 104)).addTo(lmap);
    layers[g] = { own, poly, bounds, label, on: true };
  });
  // Districts are drawn as a soft glow around their pins (a heatmap per district), so they blend
  // into the streets instead of sitting on top as hard outlines
  const pointData = () => ({
    type: 'FeatureCollection',
    features: feats.map((f) => ({ type: 'Feature', properties: { g: f.g }, geometry: { type: 'Point', coordinates: f.ll } })),
  });
  const rgba = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const glowColor = (g) => {
    const c = css(GROUPS[g].c) || '#888', k = isDark() ? 1.25 : 1;
    return ['interpolate', ['linear'], ['heatmap-density'],
      0, rgba(c, 0), 0.04, rgba(c, 0.07 * k), 0.15, rgba(c, 0.15 * k), 0.35, rgba(c, 0.22 * k), 0.7, rgba(c, 0.27 * k), 1, rgba(c, 0.3 * k)];
  };
  const GLOW = 105;   // glow radius in px at the default zoom; it scales with the map

  // "You are here"
  const homeEl = document.createElement('div');
  homeEl.className = 'sm-home';
  homeEl.innerHTML = '<span></span><b>You are here</b>';
  new ml.Marker({ element: homeEl, anchor: 'center' }).setLngLat(HOME).addTo(lmap);

  // ---------- Our layers on top of the basemap (re-added after a theme/style switch) ----------
  let focusGroup = 'all', routeLine = [], routeColor = '#000';
  const restyle = () => {
    Object.keys(GROUPS).forEach((g) => {
      const id = `sm-glow-${g}`;
      if (!lmap.getLayer(id)) return;
      lmap.setLayoutProperty(id, 'visibility', layers[g].on ? 'visible' : 'none');
      lmap.setPaintProperty(id, 'heatmap-color', glowColor(g));
      lmap.setPaintProperty(id, 'heatmap-opacity', focusGroup === 'all' || focusGroup === g ? 1 : 0.3);
    });
  };
  const addOverlays = () => {
    const style = lmap.getStyle();
    // English names, so labels read the same as the rest of the site
    for (const layer of style.layers) {
      if (layer.type === 'symbol' && /[{"]name/.test(JSON.stringify(layer.layout?.['text-field'] ?? ''))) {
        lmap.setLayoutProperty(layer.id, 'text-field', EN_LABEL);
      }
    }
    const beforeId = style.layers.find((l) => l.type === 'symbol')?.id;
    lmap.addSource('sm-skills', { type: 'geojson', data: pointData() });
    Object.keys(GROUPS).forEach((g) => lmap.addLayer({
      id: `sm-glow-${g}`, type: 'heatmap', source: 'sm-skills', filter: ['==', ['get', 'g'], g],
      paint: {
        'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], Z - 4, GLOW / 16, Z + 4, GLOW * 16],
        'heatmap-intensity': 1.8,
        'heatmap-color': glowColor(g),
        'heatmap-opacity-transition': { duration: 400 },
      },
    }, beforeId));
    lmap.addSource('sm-route', { type: 'geojson', data: lineData(routeLine) });
    lmap.addLayer({ id: 'sm-route-halo', type: 'line', source: 'sm-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': css('--card') || '#fff', 'line-width': 9, 'line-opacity': 0.85 } });
    lmap.addLayer({ id: 'sm-route', type: 'line', source: 'sm-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': routeColor, 'line-width': 5 } });
    restyle();
  };
  const lineData = (coords) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.length > 1 ? coords : [] } });
  lmap.on('style.load', addOverlays);

  // Follow the site theme
  let darkNow = isDark();
  const syncTheme = () => {
    if (isDark() === darkNow) { restyle(); return; }
    darkNow = isDark();
    lmap.setStyle(darkNow ? STYLES.dark : STYLES.light, { diff: false });
  };
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', syncTheme);

  // ---------- Route from "You are here" ----------
  const roads = new Map();
  const curve = (a, b) => {
    const pa = lmap.project(a), pb = lmap.project(b);
    const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1, bend = Math.min(120, len * 0.25);
    const mx = (pa.x + pb.x) / 2 - (dy / len) * bend, my = (pa.y + pb.y) / 2 + (dx / len) * bend;
    const out = [];
    for (let t = 0; t <= 1.001; t += 0.05) {
      const x = (1 - t) ** 2 * pa.x + 2 * (1 - t) * t * mx + t * t * pb.x;
      const y = (1 - t) ** 2 * pa.y + 2 * (1 - t) * t * my + t * t * pb.y;
      out.push(lmap.unproject([x, y]).toArray());
    }
    return out;
  };
  const roadRoute = (f) => {
    if (roads.has(f.i)) return roads.get(f.i);
    const url = `https://router.project-osrm.org/route/v1/foot/${HOME[0]},${HOME[1]};${f.ll[0]},${f.ll[1]}?overview=full&geometries=geojson`;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const p = fetch(url, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => [HOME, ...j.routes[0].geometry.coordinates, f.ll])
      .catch(() => { roads.delete(f.i); return null; })
      .finally(() => clearTimeout(t));
    roads.set(f.i, p);
    return p;
  };
  // Draw the line growing from home to the pin
  let routeAnim = 0;
  const drawRoute = (coords, color) => {
    cancelAnimationFrame(routeAnim);
    routeColor = color;
    if (lmap.getLayer('sm-route')) lmap.setPaintProperty('sm-route', 'line-color', color);
    const seg = [0];
    for (let i = 1; i < coords.length; i++) seg.push(seg[i - 1] + Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]));
    const total = seg[seg.length - 1] || 1;
    const set = (c) => { routeLine = c; const s = lmap.getSource('sm-route'); if (s) s.setData(lineData(c)); };
    if (reduce) { set(coords); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = 1 - Math.pow(1 - Math.min((now - t0) / 900, 1), 3);
      const d = k * total;
      let i = 1;
      while (i < coords.length && seg[i] < d) i++;
      const out = coords.slice(0, i);
      if (i < coords.length) {
        const r = (d - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
        out.push([coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * r, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * r]);
      }
      set(out);
      if (k < 1) routeAnim = requestAnimationFrame(step);
    };
    routeAnim = requestAnimationFrame(step);
  };
  const clearRoute = () => { cancelAnimationFrame(routeAnim); routeLine = []; const s = lmap.getSource('sm-route'); if (s) s.setData(lineData([])); };

  // ---------- Info card ----------
  let selected = null, routeToken = null;
  const ROUTE_WAIT = 900;
  const placeCard = () => {
    if (!selected || card.hidden) return;
    const w = vp.clientWidth;
    if (w < 720) { card.style.left = '10px'; card.style.top = ''; card.style.bottom = '10px'; return; }
    const pt = lmap.project(selected.ll);
    const cw = card.offsetWidth, ch = card.offsetHeight, barH = vp.offsetTop;
    const left = Math.min(Math.max(pt.x - cw / 2, 10), w - cw - 10);
    let top = barH + pt.y - 76 - ch;
    if (top < barH + 10) top = barH + pt.y + 22;
    card.style.left = `${left}px`; card.style.top = `${top}px`; card.style.bottom = '';
  };
  const select = (f) => {
    feats.forEach((o) => o.pin.classList.toggle('is-on', o === f));
    selected = f;
    if (!f) { card.hidden = true; clearRoute(); return; }
    const c = css(GROUPS[f.g].c);
    card.style.setProperty('--c', `var(${GROUPS[f.g].c})`);
    card.querySelector('.sm-card__icon').innerHTML = f.head;
    card.querySelector('.sm-card__name').textContent = f.name;
    card.querySelector('.sm-card__where').textContent = GROUPS[f.g].where;
    card.querySelector('.sm-card__status').textContent = f.status === 'Daily' ? 'Daily driver' : 'Ready to ship';
    card.hidden = false;
    // One route, drawn once: the street route if it answers quickly, otherwise the animated guess.
    // (A late street route is kept for the next tap instead of replacing the line mid-way.)
    clearRoute();
    const token = (routeToken = {});
    const wait = new Promise((r) => setTimeout(() => r(null), ROUTE_WAIT));
    Promise.race([roadRoute(f), wait]).then((pts) => {
      if (selected !== f || routeToken !== token) return;
      drawRoute(pts || curve(HOME, f.ll), c);
    });
    const pt = lmap.project(f.ll);
    const w = vp.clientWidth, h = vp.clientHeight;
    if (pt.x < 60 || pt.x > w - 60 || pt.y < 120 || pt.y > h - 40) lmap.easeTo({ center: f.ll, duration: reduce ? 0 : 600 });
    placeCard();
  };
  feats.forEach((f) => {
    f.pin.addEventListener('click', (e) => { e.stopPropagation(); select(selected === f ? null : f); });
    f.wrap.addEventListener('mousedown', (e) => e.stopPropagation());
  });
  lmap.on('click', () => select(null));
  lmap.on('move', placeCard);
  card.querySelector('.sm-card__x').addEventListener('click', () => select(null));

  // ---------- Camera ----------
  // Fit the district outlines (not just the pins), so no district is cut at the edge
  const allBounds = () => Object.values(layers).reduce((b, l) => b.extend(l.bounds), new ml.LngLatBounds(HOME, HOME));
  // Leave room for the dataset panel (bottom right) and the zoom buttons
  const padding = () => {
    if (vp.clientWidth < 720) return { top: 70, bottom: 60, left: 20, right: 20 };
    const side = Math.max(16, (vp.clientWidth - 1140) / 2 + 24);
    return { top: 60, bottom: 20, left: side + 10, right: side + 270 };
  };
  const camera = (bounds) => {
    if (vp.clientWidth >= 720) return lmap.cameraForBounds(bounds, { padding: padding(), maxZoom: Z + 1.6 });
    // Narrow screens: fill the height and let people pan sideways
    const c = bounds.getCenter();
    const tall = new ml.LngLatBounds([c.lng, bounds.getSouth()], [c.lng, bounds.getNorth()]);
    const cam = lmap.cameraForBounds(tall, { padding: { top: 70, bottom: 60, left: 0, right: 0 }, maxZoom: Z + 1.6 });
    return cam && { ...cam, center: c };
  };
  // The overview sits a little closer than a strict fit; the edges fade out anyway
  const ALL_BOOST = 0.2;
  const fly = (bounds, boost = 0) => { const cam = camera(bounds); if (cam) lmap.flyTo({ ...cam, zoom: cam.zoom + boost, duration: reduce ? 0 : 1100, curve: 1.3, essential: true }); };
  const showAll = () => { const cam = camera(allBounds()); if (cam) lmap.jumpTo({ ...cam, zoom: cam.zoom + (vp.clientWidth >= 720 ? ALL_BOOST : 0) }); };

  // ---------- District list (bottom-right panel) ----------
  const list = document.getElementById('smLayers');
  const toggleLayer = (g, on) => {
    layers[g].on = on;
    layers[g].own.forEach((f) => { f.wrap.style.display = on ? '' : 'none'; });
    layers[g].label.getElement().style.display = on ? '' : 'none';
    const box = list.querySelector(`[data-layer="${g}"] input`);
    if (box) box.checked = on;
    if (!on && selected && selected.g === g) select(null);
    restyle();
    document.getElementById('smCount').textContent = feats.filter((f) => layers[f.g].on).length;
  };
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
    focusGroup = g;
    map.classList.toggle('is-filtered', g !== 'all');
    feats.forEach((f) => f.pin.classList.toggle('is-match', f.g === g));
    restyle();
    if (g === 'all') return fly(allBounds(), vp.clientWidth >= 720 ? ALL_BOOST : 0);
    if (!layers[g].on) toggleLayer(g, true);
    fly(layers[g].bounds);
  };
  chips.forEach((chip) => chip.addEventListener('click', () => focus(chip.dataset.fly)));

  // Zoom buttons
  map.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.zoom === 'home') return focus('all');
    b.dataset.zoom === 'in' ? lmap.zoomIn({ duration: 350 }) : lmap.zoomOut({ duration: 350 });
  }));

  // Readouts
  const cursor = document.getElementById('smCursor'), zl = document.getElementById('smZoomLvl');
  const fmt = (ll) => `${Math.abs(ll.lat).toFixed(4)}° ${ll.lat >= 0 ? 'N' : 'S'}, ${Math.abs(ll.lng).toFixed(4)}° ${ll.lng >= 0 ? 'E' : 'W'}`;
  const showZoom = () => { zl.textContent = `z${lmap.getZoom().toFixed(1)}`; };
  lmap.on('mousemove', (e) => { cursor.textContent = fmt(e.lngLat); });
  el.addEventListener('mouseleave', () => { cursor.textContent = fmt(lmap.getCenter()); });
  lmap.on('zoom', showZoom);
  lmap.on('moveend', () => { if (!matchMedia('(hover: hover)').matches) cursor.textContent = fmt(lmap.getCenter()); });

  const panel = document.getElementById('smData');
  const fold = panel.querySelector('.sm-data__fold');
  const setFold = (open) => { panel.classList.toggle('is-folded', !open); fold.setAttribute('aria-expanded', open); fold.textContent = open ? '−' : '+'; };
  fold.addEventListener('click', () => setFold(panel.classList.contains('is-folded')));

  showAll();
  cursor.textContent = fmt(lmap.getCenter());
  showZoom();
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!selected && focusGroup === 'all') showAll(); placeCard(); }, 150); });

  return { map: lmap, feats };
}
