// Skill city: skills as pins on a real vector map (MapLibre GL + OpenFreeMap, no API key).
// Loaded on demand by main.js when the map section comes near the viewport.
import * as ml from './vendor/maplibre/maplibre-gl.mjs';

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
// Each district is a real Phnom Penh neighbourhood (sangkat), as a block aligned with the street grid.
// rect: [west, south, east, north]. All of them are on land, away from the Bassac river.
const GROUPS = {
  front: { name: 'Front end', where: 'Front-end Old Town', area: 'Boeung Keng Kang 1', c: '--orange', rect: [104.9233, 11.5418, 104.9279, 11.5521] },
  back: { name: 'Back end', where: 'Back-end Harbor', area: 'Tonle Bassac', c: '--blue', rect: [104.9287, 11.5458, 104.9332, 11.5521] },
  data: { name: 'Data & maps', where: 'Data Park', area: 'Boeung Keng Kang 3', c: '--green', rect: [104.9182, 11.5414, 104.9223, 11.5456] },
  flow: { name: 'Workflow', where: 'Automation Hills', area: 'Boeung Keng Kang 2', c: '--violet', rect: [104.9182, 11.5476, 104.9223, 11.5521] },
};
// Khmer text for the map (the page's language switch sets <html lang="km">)
const KM_GROUPS = {
  front: { name: 'ផ្នែកខាងមុខ', where: 'សង្កាត់ Front-end', area: 'បឹងកេងកង ១' },
  back: { name: 'ផ្នែកខាងក្រោយ', where: 'កំពង់ផែ Back-end', area: 'ទន្លេបាសាក់' },
  data: { name: 'ទិន្នន័យ និងផែនទី', where: 'សួនទិន្នន័យ', area: 'បឹងកេងកង ៣' },
  flow: { name: 'លំហូរការងារ', where: 'ភ្នំស្វ័យប្រវត្តិកម្ម', area: 'បឹងកេងកង ២' },
};
const KM_TEXT = {
  all: 'ជំនាញទាំងអស់', here: 'អ្នកនៅទីនេះ', daily: 'ប្រើរាល់ថ្ងៃ', ready: 'ត្រៀមរួចជាស្រេច',
  overview: 'ទិដ្ឋភាពទូទៅ', about: 'អំពី', route: 'ផ្លូវ', nearby: 'ជិតៗ', docs: 'ឯកសារ', share: 'ចែករំលែក', usedFor: 'ប្រើសម្រាប់',
  selfRated: 'វាយតម្លៃខ្លួនឯង', dailyNote: 'ប្រើស្ទើររាល់ថ្ងៃ', readyNote: 'បានប្រើក្នុងគម្រោងពិត', walk: 'ដើរ', fromHere: 'ពីទីនេះ', copied: 'បានចម្លងតំណ',
};
const EN_TEXT = {
  all: 'All skills', here: 'You are here', daily: 'Daily driver', ready: 'Ready to ship',
  overview: 'Overview', about: 'About', route: 'Directions', nearby: 'Nearby', docs: 'Docs', share: 'Share', usedFor: 'Used for',
  selfRated: 'self-rated', dailyNote: 'Used almost every day', readyNote: 'Used in real projects', walk: 'walk', fromHere: 'from “You are here”', copied: 'Link copied',
};
const isKm = () => document.documentElement.lang === 'km';
const G = (g, k) => (isKm() ? KM_GROUPS[g][k] : GROUPS[g][k]);
const TX = (k) => (isKm() ? KM_TEXT : EN_TEXT)[k];
// Side-panel details for each skill (key = the pin's data-name). level is a self-rating out of 5: edit freely.
const SKILLS = {
  Vue: { level: 4.8, url: 'https://vuejs.org', about: 'My home framework: single-file components, the Composition API and Vite.', uses: ['Admin dashboards', 'Government web apps', 'Reusable components'] },
  JavaScript: { level: 4.7, url: 'https://developer.mozilla.org/docs/Web/JavaScript', about: 'Modern ES modules, async code and the browser APIs underneath every framework.', uses: ['Interactive UI', 'Maps and charts', 'Tooling scripts'] },
  Tailwind: { level: 4.6, url: 'https://tailwindcss.com', about: 'Utility-first CSS for building layouts quickly and keeping them consistent.', uses: ['Responsive layouts', 'Design systems', 'Dark mode'] },
  TypeScript: { level: 4.0, url: 'https://www.typescriptlang.org', about: 'Typed Vue components and API models, used on the CEYFA social platform.', uses: ['Typed components', 'API models', 'Safer refactors'] },
  Pinia: { level: 4.4, url: 'https://pinia.vuejs.org', about: 'State management for Vue apps, kept small and typed.', uses: ['App-wide state', 'Auth and session', 'Caching API data'] },
  'HTML & CSS': { level: 4.7, url: 'https://developer.mozilla.org/docs/Web/HTML', about: 'Semantic, accessible markup with grid, flexbox, custom properties and animation, like the ones on this page.', uses: ['Accessible pages', 'Layouts and theming', 'Animation'] },
  React: { level: 3.6, url: 'https://react.dev', about: 'Components and hooks, used for a customer project built in Next.js.', uses: ['Component UI', 'Hooks', 'Client apps'] },
  'Next.js': { level: 3.6, url: 'https://nextjs.org', about: 'Built an agriculture solar-system web app on my own in Next.js, at the customer’s request.', uses: ['Routing', 'Server rendering', 'Customer web apps'] },
  'Map performance': { level: 4.5, url: '', about: 'Loading a huge number of map markers without freezing or crashing the browser, as on the national internet connection points map.', uses: ['Large marker sets', 'Nationwide data', 'No browser freezes'] },
  'Front-end architecture': { level: 4.3, url: '', about: 'Setting up the front-end structure of whole systems: folders, state, API layers and shared components that a team can grow.', uses: ['Project structure', 'Shared components', 'State and API layers'] },
  'Laravel · PHP': { level: 4.3, url: 'https://laravel.com', about: 'PHP and Laravel for APIs and server-rendered apps: Eloquent, queues and auth. Used end to end on the Sana fuel trip order system.', uses: ['REST back ends', 'Admin systems', 'Scheduled jobs'] },
  'ASP.NET · Entity Framework': { level: 3.8, url: 'https://dotnet.microsoft.com/apps/aspnet', about: 'Back-end APIs in ASP.NET with Entity Framework, written for the CEYFA social platform.', uses: ['Web APIs', 'Data models', 'Migrations'] },
  'Node.js': { level: 4.1, url: 'https://nodejs.org', about: 'JavaScript on the server, for small services, scripts and build tooling.', uses: ['Small APIs', 'Build tools', 'Automation scripts'] },
  Python: { level: 4.0, url: 'https://www.python.org', about: 'Scripts and data work: cleaning, converting and moving data around.', uses: ['Data scripts', 'Scraping', 'Automation'] },
  'REST APIs': { level: 4.6, url: 'https://developer.mozilla.org/docs/Web/HTTP', about: 'Designing and consuming clean HTTP APIs between front end and back end.', uses: ['API design', 'Auth tokens', 'Third-party integrations'] },
  'SQL & DB design': { level: 4.3, url: 'https://www.postgresql.org/docs/', about: 'SQL, relational schemas, indexes and migrations that keep data tidy as apps grow.', uses: ['Schema design', 'Queries and reports', 'Migrations'] },
  OpenStreetMap: { level: 4.2, url: 'https://www.openstreetmap.org', about: 'Open map data and vector tiles, the base of this very map.', uses: ['Vector maps', 'Geocoding', 'Custom map styles'] },
  'Google Maps': { level: 4.3, url: 'https://developers.google.com/maps', about: 'Maps JavaScript API for markers, places and directions.', uses: ['Store locators', 'Place search', 'Directions'] },
  GeoServer: { level: 3.9, url: 'https://geoserver.org', about: 'Environmental data layers served from GeoServer and drawn on OpenStreetMap.', uses: ['WMS layers', 'Map data services', 'Layer styling'] },
  'AI-assisted dev': { level: 4.3, url: '', about: 'I use AI to speed up routine work. Every change is reviewed and tested by me, and no private or customer data goes into AI tools.', uses: ['Code review', 'Test writing', 'Docs'] },
  Automation: { level: 4.4, url: 'https://docs.github.com/actions', about: 'Removing repeat work with CI pipelines, scripts and scheduled jobs.', uses: ['CI/CD', 'Deploy scripts', 'Report generation'] },
};
const EN_LABEL = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];

export function initSkillMap({ root: map, reduce, isDark }) {
  const el = document.getElementById('smMap');
  const vp = document.getElementById('smViewport');
  const card = document.getElementById('smCard');
  const [clat, clng] = el.dataset.center.split(',').map(Number);
  const Z = Number(el.dataset.zoom) || 14;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const HOME = [clng, clat];
  const cosLat = Math.cos((clat * Math.PI) / 180);

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

  // ---------- Skills as point features, spread evenly inside their real district ----------
  const pinEls = [...map.querySelectorAll('.sm-pins .pin')];
  const byGroup = {};
  pinEls.forEach((p) => (byGroup[p.dataset.group] ||= []).push(p));
  const spot = {};
  const metres = (a, b) => Math.hypot((a[0] - b[0]) * 111320 * cosLat, (a[1] - b[1]) * 110540);
  Object.entries(byGroup).forEach(([g, list]) => {
    const [w, sth, e, n] = GROUPS[g].rect;
    // keep pins off the edges; pins point down at their spot, so leave more room at the top
    // margins in metres: pins rise ~140 m above their spot at the default zoom, so the top needs the most room
    const mLat = (m) => m / 110540;
    const x0 = w + (e - w) * 0.2, x1 = e - (e - w) * 0.2, y0 = sth + mLat(45), y1 = n - mLat(150);
    // one column per ~180 m of usable width (a pin and its label need about that at the default zoom)
    const cols = Math.max(1, Math.min(list.length, 1 + Math.floor(metres([x0, y0], [x1, y0]) / 180)));
    // Lay out a grid with spare cells, skip any cell that would sit on "You are here", keep the first ones
    const homeInside = HOME[0] > w && HOME[0] < e && HOME[1] > sth && HOME[1] < n;
    const rows = Math.ceil(list.length / cols) + (homeInside ? 1 : 0);
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      cells.push([x0 + (x1 - x0) * (cols === 1 ? 0.5 : c / (cols - 1)), y1 - (y1 - y0) * (rows === 1 ? 0.5 : r / (rows - 1))]);
    }
    let free = cells.filter((cell) => metres(cell, HOME) > 140);
    if (free.length < list.length) free = cells;
    // center a short last row under the others
    const use = free.slice(0, list.length);
    const lastY = use[use.length - 1][1], last = use.filter((u) => u[1] === lastY);
    if (last.length < cols && last.length === 1 && cols > 1) last[0][0] = (x0 + x1) / 2;
    list.forEach((p, k) => { spot[p.dataset.name] = use[k]; });
  });
  const feats = pinEls.map((p, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'sm-marker';
    wrap.append(p);
    const ll = spot[p.dataset.name];
    const marker = new ml.Marker({ element: wrap, anchor: 'center' }).setLngLat(ll).addTo(lmap);
    return { i, ll, g: p.dataset.group, name: p.dataset.name, status: p.dataset.status, head: p.querySelector('.pin__head').innerHTML, pin: p, wrap, marker, checked: false };
  });
  map.querySelector('.sm-pins').remove();

  const layers = {};
  Object.keys(GROUPS).forEach((g) => {
    const own = feats.filter((f) => f.g === g);
    const [w, sth, e, n] = GROUPS[g].rect;
    const poly = [[w, sth], [e, sth], [e, n], [w, n], [w, sth]];
    const bounds = new ml.LngLatBounds([w, sth], [e, n]);
    const lab = document.createElement('div');
    lab.className = 'sm-district';
    lab.innerHTML = `<span>${G(g, 'where')}<small>${G(g, 'area')}</small></span>`;
    const label = new ml.Marker({ element: lab, anchor: 'bottom', offset: [0, -4] }).setLngLat([(w + e) / 2, n]).addTo(lmap);
    layers[g] = { own, poly, bounds, label, on: true };
  });

  const districtData = () => ({
    type: 'FeatureCollection',
    features: Object.entries(layers).map(([g, l]) => ({ type: 'Feature', properties: { g, color: css(GROUPS[g].c) }, geometry: { type: 'Polygon', coordinates: [l.poly] } })),
  });

  // "You are here"
  const homeEl = document.createElement('div');
  homeEl.className = 'sm-home';
  homeEl.innerHTML = `<span></span><b>${TX('here')}</b>`;
  new ml.Marker({ element: homeEl, anchor: 'center' }).setLngLat(HOME).addTo(lmap);

  // ---------- Our layers on top of the basemap (re-added after a theme/style switch) ----------
  let focusGroup = 'all', pickGroup = null, routeLine = [], routeColor = '#000';
  const restyle = () => {
    if (!lmap.getLayer('sm-district-fill')) return;
    const on = Object.keys(layers).filter((g) => layers[g].on);
    const filter = ['in', ['get', 'g'], ['literal', on]];
    const lit = focusGroup !== 'all' ? focusGroup : pickGroup;   // a filter or a selected pin keeps one district bright
    const op = (a, dim) => (!lit ? a : ['case', ['==', ['get', 'g'], lit], a, dim]);
    lmap.getSource('sm-districts').setData(districtData());
    lmap.setFilter('sm-district-fill', filter);
    lmap.setFilter('sm-district-line', filter);
    lmap.setPaintProperty('sm-district-fill', 'fill-opacity', op(isDark() ? 0.16 : 0.11, 0.04));
    lmap.setPaintProperty('sm-district-line', 'line-opacity', op(0.75, 0.25));
  };
  const addOverlays = () => {
    const style = lmap.getStyle();
    // English names, so labels read the same as the rest of the site
    for (const layer of style.layers) {
      // Hide the basemap's own markers (shops, cafés, bus stops, airports, peaks, road
      // number shields) in both styles, so only the skill pins show
      if (['poi', 'aerodrome_label', 'mountain_peak'].includes(layer['source-layer']) || /shield/.test(layer.id)) { lmap.setLayoutProperty(layer.id, 'visibility', 'none'); continue; }
      if (layer.type === 'symbol' && /[{"]name/.test(JSON.stringify(layer.layout?.['text-field'] ?? ''))) {
        lmap.setLayoutProperty(layer.id, 'text-field', EN_LABEL);
      }
    }
    const beforeId = style.layers.find((l) => l.type === 'symbol')?.id;
    lmap.addSource('sm-districts', { type: 'geojson', data: districtData() });
    lmap.addLayer({ id: 'sm-district-fill', type: 'fill', source: 'sm-districts', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.11, 'fill-opacity-transition': { duration: 400 } } }, beforeId);
    lmap.addLayer({ id: 'sm-district-line', type: 'line', source: 'sm-districts', layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 17, 2.5], 'line-opacity': 0.75 } }, beforeId);
    lmap.addSource('sm-route', { type: 'geojson', data: lineData(routeLine) });
    lmap.addLayer({ id: 'sm-route-halo', type: 'line', source: 'sm-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': css('--card') || '#fff', 'line-width': 9, 'line-opacity': 0.85 } });
    lmap.addLayer({ id: 'sm-route', type: 'line', source: 'sm-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': routeColor, 'line-width': 5 } });
    restyle();
  };
  const lineData = (coords) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.length > 1 ? coords : [] } });
  lmap.on('style.load', addOverlays);
  // Tell the page when a new (theme) style has been drawn, so the theme sweep can include the map
  lmap.on('style.load', () => lmap.once('idle', () => document.dispatchEvent(new Event('skillmap:styled'))));
  map.classList.add('has-map');

  // Safety net: if a pin lands on water in the real basemap, walk it toward its district's middle
  const waterLayers = () => lmap.getStyle().layers.filter((l) => l['source-layer'] === 'water' && l.type === 'fill').map((l) => l.id);
  const keepOnLand = () => {
    const ids = waterLayers();
    if (!ids.length) return;
    const w = vp.clientWidth, h = vp.clientHeight;
    for (const f of feats) {
      if (f.checked) continue;
      const pt = lmap.project(f.ll);
      if (pt.x < 0 || pt.y < 0 || pt.x > w || pt.y > h) continue;   // only what is on screen can be tested
      f.checked = true;
      const [ww, ss, ee, nn] = GROUPS[f.g].rect, mid = [(ww + ee) / 2, (ss + nn) / 2];
      for (let step = 0; step < 8 && lmap.queryRenderedFeatures(lmap.project(f.ll), { layers: ids }).length; step++) {
        f.ll = [f.ll[0] + (mid[0] - f.ll[0]) * 0.3, f.ll[1] + (mid[1] - f.ll[1]) * 0.3];
        f.marker.setLngLat(f.ll);
      }
    }
  };
  lmap.on('idle', keepOnLand);
  lmap.on('style.load', () => feats.forEach((f) => { f.checked = false; }));

  // Follow the site theme
  let darkNow = isDark();
  const syncTheme = () => {
    // Phones: wait until the theme wave has finished, so the map's heavy restyle doesn't stutter it
    if (document.documentElement.classList.contains('theme-defer-map')) {
      document.addEventListener('theme:wave-done', syncTheme, { once: true });
      return;
    }
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

  // ---------- Detail side panel (left on wide screens, bottom sheet on phones) ----------
  let selected = null, routeToken = null, routeLen = 0;
  const ROUTE_WAIT = 900;
  const $ = (q) => card.querySelector(q);
  const wide = () => vp.clientWidth >= 720;
  const panelPad = () => (wide() ? { left: card.offsetWidth + 40, right: 80, top: 140, bottom: 50 } : { top: 130, bottom: card.offsetHeight + 30, left: 30, right: 30 });
  const fmtLL = (ll) => `${Math.abs(ll[1]).toFixed(5)}° ${ll[1] >= 0 ? 'N' : 'S'}, ${Math.abs(ll[0]).toFixed(5)}° ${ll[0] >= 0 ? 'E' : 'W'}`;
  const pathLen = (pts) => pts.slice(1).reduce((m, p, k) => m + metres(pts[k], p), 0);
  const showDist = (m) => {
    routeLen = m;
    const mins = Math.max(1, Math.round(m / 80));
    $('.sm-panel__dist').textContent = `${m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`} · ${mins} min ${TX('walk')} ${TX('fromHere')}`;
  };
  const setTab = (t) => {
    card.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    card.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== t; });
  };
  const relabel = () => card.querySelectorAll('[data-t]').forEach((n) => { n.textContent = TX(n.dataset.t); });
  const fill = (f) => {
    const d = SKILLS[f.name] || { level: 4, url: '', about: '', uses: [] };
    card.style.setProperty('--c', `var(${GROUPS[f.g].c})`);
    $('.sm-panel__icon').innerHTML = f.head;
    $('.sm-panel__name').textContent = f.name;
    $('.sm-panel__score').textContent = d.level.toFixed(1);
    const full = Math.round(d.level);
    $('.sm-panel__stars').innerHTML = [1, 2, 3, 4, 5].map((k) => `<i class="${k <= full ? 'on' : ''}">★</i>`).join('');
    $('.sm-panel__since').textContent = `· ${TX('selfRated')}`;
    $('.sm-panel__cat').textContent = G(f.g, 'name');
    $('.sm-panel__where').textContent = `${G(f.g, 'where')}, ${G(f.g, 'area')}, Phnom Penh`;
    $('.sm-panel__status').textContent = f.status === 'Daily' ? TX('daily') : TX('ready');
    $('.sm-panel__statusnote').textContent = f.status === 'Daily' ? TX('dailyNote') : TX('readyNote');
    $('.sm-panel__ll').textContent = fmtLL(f.ll);
    const site = $('.sm-panel__site');
    site.textContent = d.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    site.href = d.url; site.parentElement.hidden = !d.url;
    const docs = card.querySelector('[data-act="docs"]');
    docs.href = d.url; docs.hidden = !d.url;
    $('.sm-panel__blurb').textContent = d.about;
    $('.sm-panel__tags').innerHTML = d.uses.map((u) => `<li>${u}</li>`).join('');
    relabel();
    showDist(routeLen || metres(HOME, f.ll) * 1.3);
  };
  const route = (f) => {
    clearRoute();
    const token = (routeToken = {});
    const wait = new Promise((r) => setTimeout(() => r(null), ROUTE_WAIT));
    Promise.race([roadRoute(f), wait]).then((pts) => {
      if (selected !== f || routeToken !== token) return;
      const line = pts || curve(HOME, f.ll);
      if (pts) showDist(pathLen(pts));
      drawRoute(line, css(GROUPS[f.g].c));
    });
  };
  const select = (f) => {
    feats.forEach((o) => o.pin.classList.toggle('is-on', o === f));
    const was = selected;
    selected = f;
    map.classList.toggle('has-card', !!f);
    // Low-focus mode: everything but the chosen pin (and its district) fades back
    f?.wrap.parentElement?.append(f.wrap);   // draw the chosen pin above its neighbours
    pickGroup = f ? f.g : null;
    Object.entries(layers).forEach(([g, l]) => l.label.getElement().classList.toggle('is-dim', !!f && g !== f.g));
    restyle();
    if (!f) { card.hidden = true; clearRoute(); return; }
    routeLen = 0;
    fill(f);
    if (!was) setTab('overview');
    card.hidden = false;
    card.querySelector('.sm-panel__scroll').scrollTop = 0;
    route(f);
    // Keep the pin in view next to the panel, like map apps do
    const off = wide() ? [card.offsetWidth / 2 + 8, 30] : [0, -card.offsetHeight / 2 + 20];
    lmap.easeTo({ center: f.ll, offset: off, duration: reduce ? 0 : 600 });
  };
  feats.forEach((f) => {
    f.pin.addEventListener('click', (e) => { e.stopPropagation(); select(selected === f ? null : f); });
    f.wrap.addEventListener('mousedown', (e) => e.stopPropagation());
  });
  lmap.on('click', () => select(null));
  $('.sm-panel__x').addEventListener('click', () => select(null));
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });
  card.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  card.querySelector('[data-act="route"]').addEventListener('click', () => {
    if (!selected) return;
    route(selected);
    const b = new ml.LngLatBounds(HOME, HOME).extend(selected.ll);
    lmap.fitBounds(b, { padding: panelPad(), maxZoom: Z + 1.6, duration: reduce ? 0 : 900, essential: true });
  });
  card.querySelector('[data-act="share"]').addEventListener('click', async (e) => {
    if (!selected) return;
    const url = `${location.origin}${location.pathname}#skills`;
    const text = `${selected.name} · ${G(selected.g, 'where')}`;
    try {
      if (navigator.share) await navigator.share({ title: text, url });
      else { await navigator.clipboard.writeText(url); const s = e.currentTarget.querySelector('span'); s.textContent = TX('copied'); setTimeout(relabel, 1600); }
    } catch { /* cancelled */ }
  });

  // ---------- Camera ----------
  // Fit the district outlines (not just the pins), so no district is cut at the edge
  const allBounds = () => Object.values(layers).reduce((b, l) => b.extend(l.bounds), new ml.LngLatBounds(HOME, HOME));
  // Leave room for the dataset panel (bottom right) and the zoom buttons
  const padding = () => {
    if (vp.clientWidth < 720) return { top: 70, bottom: 60, left: 20, right: 20 };
    const side = 16;   // controls and the dataset panel sit at the map's right edge
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
  const fly = (bounds, boost = 0) => { const cam = camera(bounds); if (cam) lmap.flyTo({ ...cam, zoom: cam.zoom + boost, duration: reduce ? 0 : 1100, curve: 1.3, essential: true }); };
  // Phones see a little more (about a 400 m scale) so more than one district fits on screen
  const homeZoom = () => (vp.clientWidth < 720 ? Z - 0.9 : Z);
  const showAll = () => lmap.jumpTo({ center: HOME, zoom: homeZoom() });

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
  row('all', TX('all'), feats.length, 'var(--ink)');
  Object.entries(GROUPS).forEach(([g, d]) => row(g, G(g, 'name'), layers[g].own.length, `var(${d.c})`));
  // Language switch: relabel districts, the list, "You are here" and an open card
  document.addEventListener('lang:change', () => {
    Object.keys(GROUPS).forEach((g) => { layers[g].label.getElement().innerHTML = `<span>${G(g, 'where')}<small>${G(g, 'area')}</small></span>`; });
    list.querySelectorAll('li').forEach((li) => { const g = li.dataset.layer; li.querySelector('.sm-fly span').textContent = g === 'all' ? TX('all') : G(g, 'name'); });
    homeEl.querySelector('b').textContent = TX('here');
    if (selected) { const keep = routeLen; fill(selected); if (keep) showDist(keep); }
    relabel();
  });
  const chips = [...map.querySelectorAll('[data-fly]')];
  const focus = (g) => {
    chips.forEach((c) => c.classList.toggle('is-on', c.dataset.fly === g));
    select(null);
    focusGroup = g;
    map.classList.toggle('is-filtered', g !== 'all');
    feats.forEach((f) => f.pin.classList.toggle('is-match', f.g === g));
    restyle();
    if (g === 'all') return lmap.flyTo({ center: HOME, zoom: homeZoom(), duration: reduce ? 0 : 1100, curve: 1.3, essential: true });
    if (!layers[g].on) toggleLayer(g, true);
    fly(layers[g].bounds);
  };
  chips.forEach((chip) => chip.addEventListener('click', () => focus(chip.dataset.fly)));
  card.querySelector('[data-act="nearby"]').addEventListener('click', () => { if (selected) focus(selected.g); });

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
  // Zoomed out: hide pin name tags and shorten district labels, like map apps do, so nothing collides
  const syncFar = () => map.classList.toggle('is-far', lmap.getZoom() < Z - 0.45);
  lmap.on('zoom', syncFar);
  lmap.on('moveend', () => { if (!matchMedia('(hover: hover)').matches) cursor.textContent = fmt(lmap.getCenter()); });

  const panel = document.getElementById('smData');
  const fold = panel.querySelector('.sm-data__fold');
  const setFold = (open) => { panel.classList.toggle('is-folded', !open); fold.setAttribute('aria-expanded', open); fold.textContent = open ? '−' : '+'; };
  fold.addEventListener('click', () => setFold(panel.classList.contains('is-folded')));
  if (vp.clientWidth < 720) setFold(false);   // phones start with the panel folded, so the map has room

  showAll();
  cursor.textContent = fmt(lmap.getCenter());
  showZoom();
  syncFar();
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!selected && focusGroup === 'all') showAll(); }, 150); });

  return { map: lmap, feats };
}
