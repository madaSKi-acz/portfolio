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
  // Phones and touch devices get a lighter wave: no blur, less foam, no filters, map restyles afterwards
  const isLite = () => matchMedia('(max-width: 720px), (pointer: coarse)').matches;
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
    const lite = isLite(), frames = [], N = lite ? 36 : 56, S = lite ? 22 : 40;
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
  const drawFoam = (G, t, toDark, lite) => {
    fx.c.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
    if (t >= 1) { fx.all.setAttribute('opacity', 0); return; }
    const s = front(t, G);
    fx.all.setAttribute('opacity', Math.min(1, t * 6, (1 - t) * 5).toFixed(3));
    let line = '';
    for (let q = G.q0; q <= G.q1; q += 14) { const [x, y] = pt(G, s + crest(q, t), q); line += `${line ? 'L' : 'M'}${f1(x)} ${f1(y)}`; }
    // soft light (or shadow) moving with the crest
    fx.glow.setAttribute('stroke', toDark ? 'rgba(120,170,255,.12)' : 'rgba(255,248,230,.16)');
    for (const el of [fx.c1, fx.c2, fx.c3]) el.setAttribute('d', line);
    fx.glow.setAttribute('d', lite ? '' : line);   // the blurred glow is the costliest part: desktop only
    // spray streaks trailing behind the crest, pointing the way the wave moves
    let a1 = '', a2 = '';
    for (let i = 0, n = lite ? 30 : 90; i < n; i++) {
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
    for (let i = 0, n = lite ? 18 : 50; i < n; i++) {
      const q = G.q0 + rnd(i + 50) * (G.q1 - G.q0);
      const [x, y] = pt(G, s + crest(q, t) - rnd(i + 51) * 22, q);
      const r = 1 + rnd(i + 53) * 3;
      fm += `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
    }
    fx.foam.setAttribute('d', fm);
  };
  // What the crest lights up as it passes: text glows, objects (cards, pins, buttons, map panels) get a halo.
  // The objects should read more than the wave itself.
  const LIT_TEXT = 'h1, h2, h3, .statement, .label, .tag, .metro__key span, .route__when, .contact__mail, .sm-district span, .footer__inner';
  const LIT_BOX = '.about__photo img, .route__logo, .school, .route__links a, .btn, .nav__cta, .theme-btn, .stn i, .stn b, .project, .route li, .socials a, .sm-data, .sm-panel, .sm-zoom button, .pin__head, .pin__label, .sm-home span';
  const LIT_TEXT_LITE = 'h1, h2, .label, .contact__mail';
  const LIT_BOX_LITE = '.btn, .pin__head, .school, .route__logo, .about__photo img';
  const lightText = (G, startAt, lite) => {
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
    document.querySelectorAll(lite ? LIT_TEXT_LITE : LIT_TEXT).forEach((el) => hit(el, lite ? 'wave-lit-lite' : 'wave-lit'));
    document.querySelectorAll(lite ? LIT_BOX_LITE : LIT_BOX).forEach((el) => hit(el, lite ? 'wave-lit-box-lite' : 'wave-lit-box'));
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
    const lite = isLite();
    const waitMap = !lite && mapInView();   // on phones the map switches style after the wave instead
    root.classList.toggle('theme-defer-map', lite);
    const t = document.startViewTransition(() => {
      apply();
      c.classList.add('is-on');                  // the foam layer joins the new view as its own layer
      return waitMap ? mapRestyled() : undefined;
    });
    t.ready.then(() => {
      root.animate({ clipPath: waveFrames(G) }, { duration: WAVE_MS, easing: 'linear', pseudoElement: '::view-transition-new(root)' });
      const t0 = performance.now();
      lightText(G, t0, lite);
      const tick = (now) => {
        const k = Math.min((now - t0) / WAVE_MS, 1);
        drawFoam(G, k, next === 'dark', lite);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }).catch(() => {});
    t.finished.finally(() => {
      c.classList.remove('is-on'); fx.all.setAttribute('opacity', 0);
      root.classList.remove('theme-defer-map');
      document.dispatchEvent(new Event('theme:wave-done'));
    });
  });

  // ---------- Language (English / Khmer) ----------
  // English is the HTML itself; Khmer replaces each [data-i18n] element's content.
  const KM = {
    skip: 'រំលងទៅមាតិកា',
    name: 'ញ៉ុក សុខ',
    navWork: 'ការងារ និងបទពិសោធន៍',
    tag: '<span class="tag__dot"></span>អ្នកអភិវឌ្ឍន៍កម្មវិធី · ~4 ឆ្នាំ',
    h1: 'ខ្ញុំបំប្លែងដំណើរការដ៏ស្មុគស្មាញ ទៅជា<em>ប្រព័ន្ធដែលដំណើរការបានល្អ។</em>',
    viewWork: 'មើលស្នាដៃ',
    sayHello: 'ទាក់ទងមកខ្ញុំ',
    stAbout: 'អំពីខ្ញុំ', stSkills: 'ជំនាញ', stExperience: 'បទពិសោធន៍', stProjects: 'គម្រោង', stContact: 'ទំនាក់ទំនង',
    keyFront: '<i class="k-orange"></i>ផ្នែកខាងមុខ (Front end)',
    keyBack: '<i class="k-blue"></i>ផ្នែកខាងក្រោយ (Back end)',
    keyData: '<i class="k-green"></i>ទិន្នន័យ និងផែនទី',
    l1: '01 / អំពីខ្ញុំ',
    statement: 'ផ្ដោតលើ Front end ហើយធ្វើ Full stack ជាទម្លាប់។ បើកិច្ចការណាត្រូវធ្វើម្ដងហើយម្ដងទៀត ខ្ញុំ<span class="hl">ធ្វើវាឱ្យស្វ័យប្រវត្តិ</span>។ ខ្ញុំរៀនឧបករណ៍ថ្មីៗបានលឿន ហើយប្រើ <span class="hl hl--blue">ឧបករណ៍ AI</span> ដោយប្រុងប្រយ័ត្ន៖ ពិនិត្យ សាកល្បង និងមិនទុកចិត្តដោយងងឹតងងុល។',
    photoAlt: 'រូបថតរបស់ ញ៉ុក សុខ',
    place: '<i aria-hidden="true"></i>ភ្នំពេញ · កម្ពុជា',
    l2: '05 / ជំនាញ', skillCity: 'ទីក្រុងជំនាញ',
    mapHint: 'អូសដើម្បីរុករក · ctrl + រំកិល ដើម្បីពង្រីក',
    l3: '02 / បទពិសោធន៍', routeTitle: 'ផ្លូវដែលខ្ញុំបានដើរកន្លងមក',
    dgcWhen: '2023 — បច្ចុប្បន្ន', dgcTitle: 'អ្នកអភិវឌ្ឍន៍គេហទំព័រ', dgcOrg: 'គណៈកម្មាធិការរដ្ឋាភិបាលឌីជីថល (DGC)',
    z1Title: 'អ្នកអភិវឌ្ឍន៍គេហទំព័រ ផ្នែក Back end', z1Org: 'Z1 Flexible Solution · កម្មសិក្សា 3 ខែ បន្ទាប់មកជាបុគ្គលិក 7 ខែ',
    l4: '04 / ការសិក្សា', eduTitle: 'កន្លែងដែលខ្ញុំបានសិក្សា',
    aeuTitle: 'បរិញ្ញាបត្រ', aeuOrg: 'សាកលវិទ្យាល័យ អាស៊ី អឺរ៉ុប · គម្រោងបញ្ចប់ការសិក្សាលើការរចនាមូលដ្ឋានទិន្នន័យ',
    pnTitle: 'កម្មវិធីបណ្ដុះបណ្ដាលព័ត៌មានវិទ្យា', pnOrg: 'Passerelles Numériques Cambodia · និស្សិតដែលត្រូវបានលើកឡើង',
    story: 'រឿងរ៉ាវរបស់ខ្ញុំ ↗',
    l5: '03 / គម្រោង', projTitle: 'ស្នាដៃជ្រើសរើស និងព័ត៌មានលម្អិត',
    p1: 'ផែនទីគុណភាពខ្យល់នៅកម្ពុជា',
    p1d: 'ផែនទី Google Maps បង្ហាញគុណភាពខ្យល់។ ព័ត៌មានរបស់សញ្ញាសម្គាល់នីមួយៗអាចចែករំលែកទៅ Facebook និង Telegram ជាតំណដែលមានរូបភាពមើលជាមុន។',
    p2: 'ផែនទីបរិស្ថាន',
    p2d: 'ស្រទាប់ទិន្នន័យបរិស្ថានពី GeoServer បង្ហាញលើ OpenStreetMap។ ខ្ញុំបង្កើតផ្នែកខាងមុខទាំងមូល។',
    p3: 'ផែនទីចំណុចតភ្ជាប់អ៊ីនធឺណិត',
    p3d: 'ផែនទីចំណុចតភ្ជាប់អ៊ីនធឺណិតទូទាំងប្រទេស។ ការងារសំខាន់របស់ខ្ញុំ៖ ផ្ទុកសញ្ញាសម្គាល់ចំនួនច្រើនដោយមិនធ្វើឲ្យកម្មវិធីរុករកគាំង។',
    p4: 'ប្រព័ន្ធបញ្ចូលទិន្នន័យតុលាការ',
    p4d: 'អេក្រង់ និងទម្រង់បញ្ចូលទិន្នន័យសំណុំរឿងតុលាការ សម្រាប់ការបញ្ចូលប្រចាំថ្ងៃឲ្យរហ័ស និងត្រឹមត្រូវ។',
    p5: 'ប្រព័ន្ធថាមពលព្រះអាទិត្យសម្រាប់កសិកម្ម',
    p5d: 'កម្មវិធីគេហទំព័រសម្រាប់ប្រព័ន្ធកសិកម្មប្រើថាមពលព្រះអាទិត្យ ដែលខ្ញុំបង្កើតតែម្នាក់ឯងដោយ Next.js តាមតម្រូវការអតិថិជន។',
    p6: 'ប្រព័ន្ធបញ្ជាដឹកប្រេង · Sana',
    p6d: 'ប្រព័ន្ធគ្រប់គ្រងការដឹកជញ្ជូនសម្រាប់ការបញ្ជាដឹកប្រេង តាំងពីដើមដល់ចប់៖ វិភាគតម្រូវការអាជីវកម្ម រចនាមូលដ្ឋានទិន្នន័យ រចនាសម្ព័ន្ធផ្នែកខាងមុខ និងផ្នែកខាងក្រោយ។',
    role_solo: 'ធ្វើម្នាក់ឯង',
    role_front: 'ផ្នែកខាងមុខ',
    role_full: 'Full stack',
    p7: 'វេទិកាសង្គម CEYFA',
    p7d: 'វេទិកាសង្គមសម្រាប់សហព័ន្ធសមាគមយុវជនសេដ្ឋកិច្ចកម្ពុជា។ ខ្ញុំបង្កើតផ្នែកខាងមុខភាគច្រើនសម្រាប់គេហទំព័រ និង API ផ្នែកខាងក្រោយមួយចំនួន។ ដោយសារពេលវេលាខ្លី និងកូដផ្លាស់ប្ដូរលឿន កូដប្រហែល 80% ត្រូវបានសរសេរដោយមានជំនួយពី AI agent (Claude) ដើម្បីប្រគល់ការងារឲ្យទាន់ពេល។ ប៉ុន្តែខ្ញុំនៅតែពិនិត្យការងារទាំងអស់នោះដោយខ្លួនឯង។',
    role_frontapi: 'ផ្នែកខាងមុខ · API',
    l6: '06 / ទំនាក់ទំនង', credit: 'រចនា និងដឹកនាំដោយ ញ៉ុក សុខ · បង្កើតជាមួយ <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude Code</a> ដោយរាល់ការកែប្រែត្រូវបានពិនិត្យ និងសាកល្បងដោយផ្ទាល់',
  };
  const TITLE = { en: 'Nhok Sok — Software Developer', km: 'ញ៉ុក សុខ — អ្នកអភិវឌ្ឍន៍កម្មវិធី' };
  const i18nEls = [...document.querySelectorAll('[data-i18n]')];
  i18nEls.forEach((el) => { el.dataset.en = el.innerHTML; });
  const altEls = [...document.querySelectorAll('[data-i18n-alt]')];
  altEls.forEach((el) => { el.dataset.enAlt = el.alt; });
  const langBtn = document.getElementById('langToggle');
  const langTxt = langBtn.querySelector('.lang-btn__txt');
  const lang = () => (root.lang === 'km' ? 'km' : 'en');
  window.siteLang = lang;
  const setLang = (l, save = true) => {
    root.lang = l;
    i18nEls.forEach((el) => { el.innerHTML = l === 'km' && KM[el.dataset.i18n] ? KM[el.dataset.i18n] : el.dataset.en; });
    altEls.forEach((el) => { el.alt = l === 'km' && KM[el.dataset.i18nAlt] ? KM[el.dataset.i18nAlt] : el.dataset.enAlt; });
    document.title = TITLE[l];
    // the button offers the other language, written in that language
    langTxt.textContent = l === 'km' ? 'EN' : 'ខ្មែរ';
    langBtn.lang = l === 'km' ? 'en' : 'km';
    langBtn.setAttribute('aria-label', l === 'km' ? 'Switch to English' : 'ប្ដូរទៅភាសាខ្មែរ');
    if (save) { try { localStorage.setItem('lang', l); } catch (e) {} }
    setKhmerDigits(l === 'km');
    document.dispatchEvent(new CustomEvent('lang:change', { detail: l }));
  };

  // Khmer mode shows every number on the page in Khmer digits (០១២…). Text nodes are
  // converted in place and remembered so English can put the originals back; content
  // added later (map panels, wolf bubbles) is converted as it appears.
  const KH_DIGITS = '០១២៣៤៥៦៧៨៩';
  const toKh = (s) => s.replace(/[0-9]/g, (d) => KH_DIGITS[d]);
  const NO_KH = 'script, style, textarea, input, code, pre, .maplibregl-ctrl-attrib, a[href^="mailto:"], a[href^="tel:"]';
  const khNodes = new Map();   // text node -> original text
  const khmerize = (rootNode) => {
    const walk = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    for (let n = rootNode.nodeType === 3 ? rootNode : walk.nextNode(); n; n = walk.nextNode()) {
      if (!/[0-9]/.test(n.data) || n.parentElement?.closest(NO_KH)) continue;
      khNodes.set(n, n.data);
      n.data = toKh(n.data);
    }
  };
  const digitWatch = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') khmerize(r.target);
      else r.addedNodes.forEach((n) => { if (n.nodeType === 1 || n.nodeType === 3) khmerize(n); });
    }
  });
  function setKhmerDigits(on) {
    digitWatch.disconnect();
    if (on) {
      khmerize(document.body);
      digitWatch.observe(document.body, { childList: true, subtree: true, characterData: true });
    } else {
      khNodes.forEach((orig, n) => { if (n.isConnected && n.data === toKh(orig)) n.data = orig; });
      khNodes.clear();
    }
  }
  setLang(lang(), false);

  // Flag: shows the flag of the language on offer (CSS follows the button's lang) and
  // waves on each switch; the flag swaps mid-wave while the page text blurs out and back
  const flag = langBtn.querySelector('.lang-flag');
  let swapTimer = 0;
  langBtn.addEventListener('click', () => {
    const next = lang() === 'km' ? 'en' : 'km';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setLang(next); return; }
    flag.classList.remove('is-wave'); void flag.offsetWidth; flag.classList.add('is-wave');
    clearTimeout(swapTimer);
    root.classList.remove('is-lang-in');
    root.classList.add('is-lang-out');
    swapTimer = setTimeout(() => {
      setLang(next);
      root.classList.replace('is-lang-out', 'is-lang-in');
      swapTimer = setTimeout(() => root.classList.remove('is-lang-in'), 260);
    }, 220);
  });

  // Stars: a random sky over the top of the page, and a few around the toggle, re-scattered for each night
  const scatter = (box, n, area) => {
    let html = '';
    for (let i = 0; i < n; i++) {
      const big = Math.random() < (area ? 0.18 : 0.35);
      const [x, y] = area ? area() : [Math.random() * 100, Math.random() * 100];
      html += `<i class="${big ? 'sparkle' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--s:${(big ? 5 + Math.random() * 4 : 1.2 + Math.random() * 1.8).toFixed(1)}px;--t:${(2 + Math.random() * 3).toFixed(1)}s;--d:${(-Math.random() * 4).toFixed(1)}s"></i>`;
    }
    box.innerHTML = html;
  };
  const sky = document.querySelector('.night-sky'), btnStars = themeBtn.querySelector('.theme-btn__stars');
  // around the button: on a ring just outside it, never on the icon
  const ring = () => { const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 12; return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]; };
  const starsFor = () => {
    if (!isDark()) return;
    scatter(sky, innerWidth < 720 ? 16 : 38);
    scatter(btnStars, 6, ring);
  };
  starsFor();
  new MutationObserver(starsFor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', starsFor);

  // Nav background + route rail progress
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 10);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // In-page links: our own smooth scroll. The native CSS one gets cut short on the
  // first click (the map and wolf load mid-scroll and shift the layout), so this
  // re-measures the target every frame and always lands on it.
  const motionOff = matchMedia('(prefers-reduced-motion: reduce)');
  let scrollAnim = 0;
  const targetY = (el) => {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    return Math.max(0, Math.min(max, el.getBoundingClientRect().top + scrollY - margin));
  };
  const goTo = (el) => {
    cancelAnimationFrame(scrollAnim);
    if (motionOff.matches) { scrollTo({ top: targetY(el), behavior: 'instant' }); return; }
    const from = scrollY;
    const dur = Math.min(1100, Math.max(450, Math.abs(targetY(el) - from) * 0.45));
    const t0 = performance.now();
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const stop = () => { cancelAnimationFrame(scrollAnim); removeEventListener('wheel', stop); removeEventListener('touchstart', stop); };
    addEventListener('wheel', stop, { passive: true, once: true });
    addEventListener('touchstart', stop, { passive: true, once: true });
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      scrollTo({ top: from + (targetY(el) - from) * ease(k), behavior: 'instant' });
      if (k < 1) scrollAnim = requestAnimationFrame(step); else stop();
    };
    scrollAnim = requestAnimationFrame(step);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    goTo(el);
    history.pushState(null, '', `#${id}`);
  });

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
  const syncToggle = () => {
    const km = root.lang === 'km';
    toggle.textContent = wolfOff ? (km ? '🐺 បង្ហាញចចក' : '🐺 Show wolf') : (km ? '🐺 លាក់ចចក' : '🐺 Hide wolf');
  };
  document.addEventListener('lang:change', () => syncToggle());
  syncToggle();
  toggle.addEventListener('click', () => {
    wolfOff = !wolfOff;
    try { localStorage.setItem('wolf-off', wolfOff ? '1' : '0'); } catch (e) {}
    syncToggle();
    if (wolfOff) { if (pet) pet.el.hidden = true; } else loadWolf();
  });
  const whenIdle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
  const afterLoad = (fn) => { if (document.readyState === 'complete') whenIdle(fn); else addEventListener('load', () => whenIdle(fn)); };
  if (!wolfOff) afterLoad(loadWolf);
})();
