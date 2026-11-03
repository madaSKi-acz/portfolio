// A low-poly 3D wolf that roams the page.
// Movement is in screen space; the page is treated as the ground plane
// seen from the front and above, so heading up the screen = walking away.
import * as THREE from './vendor/three.module.min.js';

const CANVAS_W = 210;
const CANVAS_H = 170;

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function buildWolf() {
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true });
  const grey = mat('#8b8795');
  const dark = mat('#56525f');
  const light = mat('#e7e1d6');
  const black = mat('#141318');

  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

  const wolf = new THREE.Group();
  const body = new THREE.Group();          // bobs / pitches with the gait
  wolf.add(body);

  // Torso, chest and darker saddle
  const torso = mesh(new THREE.SphereGeometry(1, 10, 7), grey, -0.05, 1.22, 0);
  torso.scale.set(1.04, 0.54, 0.47);
  body.add(torso);
  const saddle = mesh(new THREE.SphereGeometry(1, 10, 7), mat('#6c6876'), -0.15, 1.3, 0);
  saddle.scale.set(0.86, 0.47, 0.475);
  body.add(saddle);
  const chest = mesh(new THREE.SphereGeometry(0.5, 7, 5), light, 0.7, 1.12, 0);
  chest.scale.set(0.85, 1.05, 0.88);
  body.add(chest);
  const belly = mesh(new THREE.SphereGeometry(1, 7, 5), light, 0.05, 1.0, 0);
  belly.scale.set(0.8, 0.22, 0.34);
  body.add(belly);

  // Neck + head (pivot at the neck)
  const head = new THREE.Group();
  head.position.set(0.92, 1.45, 0);
  body.add(head);
  const neck = mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.55, 7), grey, 0.05, 0.02, 0);
  neck.rotation.z = -0.9;
  head.add(neck);
  const skull = mesh(new THREE.SphereGeometry(0.36, 7, 5), grey, 0.32, 0.22, 0);
  skull.scale.set(1.2, 0.88, 0.95);
  head.add(skull);
  const snout = mesh(new THREE.CylinderGeometry(0.1, 0.19, 0.5, 6), grey, 0.8, 0.16, 0);
  snout.rotation.z = -Math.PI / 2;
  head.add(snout);
  const jaw = mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.42, 6), light, 0.74, 0.04, 0);
  jaw.rotation.z = -Math.PI / 2;
  head.add(jaw);
  head.add(mesh(new THREE.SphereGeometry(0.075, 6, 4), black, 1.05, 0.18, 0));
  const eyes = [];
  for (const z of [0.19, -0.19]) {
    const eye = mesh(new THREE.SphereGeometry(0.048, 6, 4), black, 0.55, 0.31, z);
    head.add(eye); eyes.push(eye);
    const cheek = mesh(new THREE.ConeGeometry(0.15, 0.34, 4), light, 0.18, 0.06, z * 1.15);
    cheek.rotation.z = 2.3;
    head.add(cheek);
  }
  const ears = [];
  for (const z of [0.16, -0.16]) {
    const ear = new THREE.Group();
    ear.position.set(0.22, 0.5, z);
    const cone = mesh(new THREE.ConeGeometry(0.14, 0.42, 4), dark, 0, 0.19, 0);
    ear.add(cone);
    ear.rotation.set(z > 0 ? 0.22 : -0.22, 0, 0.18);
    head.add(ear); ears.push(ear);
  }

  // Bushy tail (lathe profile), pivot at the base
  const tail = new THREE.Group();
  tail.position.set(-1.0, 1.4, 0);
  body.add(tail);
  const tailInner = new THREE.Group();
  tailInner.rotation.z = 2.05;   // point back and down
  tail.add(tailInner);
  const profile = [[0.05, 0], [0.17, 0.22], [0.23, 0.5], [0.2, 0.78], [0.1, 1.02], [0, 1.12]].map(([r, y]) => new THREE.Vector2(r, y));
  tailInner.add(mesh(new THREE.LatheGeometry(profile, 7), grey));
  const tip = mesh(new THREE.ConeGeometry(0.13, 0.3, 6), light, 0, 1.03, 0);
  tailInner.add(tip);

  // Legs: hip -> upper -> knee -> lower -> paw
  const legs = [];
  const legDef = [
    { key: 'FL', x: 0.66, z: 0.22, front: true },
    { key: 'FR', x: 0.66, z: -0.22, front: true },
    { key: 'BL', x: -0.7, z: 0.24, front: false },
    { key: 'BR', x: -0.7, z: -0.24, front: false },
  ];
  for (const d of legDef) {
    const hip = new THREE.Group();
    hip.position.set(d.x, 1.08, d.z);
    body.add(hip);
    const upperM = d.z < 0 ? dark : grey;
    const upper = mesh(new THREE.CylinderGeometry(d.front ? 0.15 : 0.21, 0.1, 0.56, 6), upperM, 0, -0.28, 0);
    hip.add(upper);
    const knee = new THREE.Group();
    knee.position.y = -0.56;
    hip.add(knee);
    knee.add(mesh(new THREE.CylinderGeometry(0.095, 0.075, 0.48, 6), upperM, 0, -0.24, 0));
    const paw = mesh(new THREE.BoxGeometry(0.2, 0.08, 0.14), d.z < 0 ? dark : grey, 0.04, -0.5, 0);
    knee.add(paw);
    legs.push({ ...d, hip, knee });
  }

  // Soft contact shadow
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.32)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const shadow = mesh(new THREE.PlaneGeometry(3.6, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }), 0, 0.01, 0);
  shadow.rotation.x = -Math.PI / 2;
  wolf.add(shadow);

  return { wolf, body, head, tail, legs, eyes, ears, torso };
}

export function startWolf({ reduceMotion = false } = {}) {
  // ---------- DOM ----------
  const pet = document.createElement('div');
  pet.className = 'pet';
  pet.innerHTML = '<span class="pet__bubble" aria-hidden="true"></span><button class="pet__hit" type="button" aria-label="Pet the wolf"></button>';
  const canvas = document.createElement('canvas');
  canvas.className = 'pet__canvas';
  pet.prepend(canvas);
  document.body.appendChild(pet);
  const bubble = pet.querySelector('.pet__bubble');
  const hit = pet.querySelector('.pet__hit');

  let bubbleTimer;
  const say = (text, ms = 1500) => {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), ms);
  };

  // ---------- Three.js scene ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    pet.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(CANVAS_W, CANVAS_H, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, CANVAS_W / CANVAS_H, 0.1, 50);
  camera.position.set(0, 4.9, 7.2);
  camera.lookAt(0, 0.85, 0);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x5e5852, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(3, 7, 5);
  scene.add(sun);

  const W = buildWolf();
  scene.add(W.wolf);

  // ---------- State ----------
  const half = { x: CANVAS_W / 2, y: CANVAS_H * 0.62 };   // wolf's feet within the canvas
  const bounds = () => ({ minX: 40, maxX: innerWidth - 40, minY: 120, maxY: innerHeight - 20 });
  const pos = { x: innerWidth - 140, y: innerHeight - 50 };
  let heading = Math.PI;                 // screen-space radians, 0 = right, +y = down
  let speed = 0;                         // px / s
  let target = { ...pos };
  let mode = 'idle';                     // idle | walk | run | sleep
  let restUntil = performance.now() + 1500;
  let phase = 0;
  let runBlend = 0;
  let sleepT = 0;
  let howlUntil = 0;
  let hopT = 0;
  let headYaw = 0, headYawTarget = 0, nextLook = 0;
  let lastScroll = 0;
  const seed = Math.random() * 10;

  const setMode = (next) => {
    if (mode === 'sleep' && next !== 'sleep') say('!', 700);
    mode = next;
    if (next === 'sleep') say('z z z', 2200);
  };

  const wander = (run) => {
    const b = bounds();
    for (let i = 0; i < 8; i++) {
      target = { x: rand(b.minX, b.maxX), y: rand(b.minY, b.maxY) };
      if (Math.hypot(target.x - pos.x, target.y - pos.y) > 220) break;
    }
    setMode(run ? 'run' : 'walk');
  };

  if (!reduceMotion) {
    addEventListener('scroll', () => {
      const now = performance.now();
      if (now - lastScroll > 900 && mode !== 'run') wander(true);
      lastScroll = now;
    }, { passive: true });

    const contact = document.getElementById('contact');
    if (contact && 'IntersectionObserver' in window) {
      let howled = false;
      new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting || howled) return;
        howled = true;
        setTimeout(() => {
          target = { ...pos }; setMode('idle'); restUntil = performance.now() + 3200;
          howlUntil = performance.now() + 2300;
          say('Awoooo!', 2100);
        }, 1400);
      }, { threshold: 0.4 }).observe(contact);
    }
  }

  const pets = ['♥', 'woof!', '♥ ♥'];
  let petCount = 0;
  hit.addEventListener('click', () => {
    if (mode !== 'run') { setMode('idle'); target = { ...pos }; restUntil = performance.now() + 2500; }
    hopT = 1;
    say(pets[petCount++ % pets.length], 1100);
  });

  addEventListener('resize', () => {
    const b = bounds();
    pos.x = clamp(pos.x, b.minX, b.maxX);
    pos.y = clamp(pos.y, b.minY, b.maxY);
  });

  // ---------- Loop ----------
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    // --- steering (curved paths) ---
    let wantSpeed = 0;
    if (mode === 'walk' || mode === 'run') {
      const dx = target.x - pos.x, dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const diff = wrapAngle(Math.atan2(dy, dx) - heading);
      const maxTurn = (mode === 'run' ? 2.4 : 1.5) * dt;
      heading += clamp(diff, -maxTurn, maxTurn) + Math.sin(t * 0.9 + seed) * 0.5 * dt;   // gentle meander
      const cruise = mode === 'run' ? 240 : 72;
      wantSpeed = cruise * Math.max(0.3, Math.cos(diff)) * clamp(dist / 90, 0.25, 1);
      if (dist < 14) { setMode('idle'); restUntil = now + rand(1800, 4500); }
    } else if (mode !== 'sleep' && now > restUntil && !reduceMotion) {
      if (Math.random() < 0.22) { setMode('sleep'); restUntil = now + rand(8000, 13000); }
      else wander(Math.random() < 0.25);
    } else if (mode === 'sleep' && now > restUntil) {
      wander(false);
    }
    speed = lerp(speed, wantSpeed, 1 - Math.exp(-dt * 4));
    pos.x += Math.cos(heading) * speed * dt;
    pos.y += Math.sin(heading) * speed * dt;
    const b = bounds();
    pos.x = clamp(pos.x, b.minX, b.maxX);
    pos.y = clamp(pos.y, b.minY, b.maxY);
    pet.style.transform = `translate(${(pos.x - half.x).toFixed(1)}px, ${(pos.y - half.y).toFixed(1)}px)`;

    // --- facing: screen heading -> yaw ---
    W.wolf.rotation.y = -heading;

    // --- gait ---
    runBlend = lerp(runBlend, clamp((speed - 70) / 140, 0, 1), 1 - Math.exp(-dt * 5));
    const moving = clamp(speed / 50, 0, 1);
    const freq = lerp(1.6, 3.1, runBlend) * clamp(speed / 60, 0.4, 1.4);
    phase += freq * Math.PI * 2 * dt;
    const amp = lerp(0.42, 0.85, runBlend) * moving;
    const trot = { FL: 0, BR: 0, FR: Math.PI, BL: Math.PI };
    const gallop = { FL: 0, FR: 0.7, BL: Math.PI, BR: Math.PI + 0.7 };
    sleepT = lerp(sleepT, mode === 'sleep' ? 1 : 0, 1 - Math.exp(-dt * 3));

    for (const leg of W.legs) {
      const p = phase + lerp(trot[leg.key], gallop[leg.key], runBlend);
      const swing = Math.sin(p) * amp;
      const lift = Math.max(0, Math.cos(p)) * amp * 1.4;
      const walkHip = swing;
      const walkKnee = leg.front ? -lift : lift * 0.9;
      // lying-down pose
      const sleepHip = leg.front ? 1.45 : -1.25;
      const sleepKnee = leg.front ? 0 : 2.2;
      leg.hip.rotation.z = lerp(walkHip, sleepHip, sleepT);
      leg.knee.rotation.z = lerp(walkKnee, sleepKnee, sleepT);
    }

    // body bob / pitch
    const bobTrot = Math.abs(Math.cos(phase)) * 0.06;
    const bobGallop = Math.sin(phase + 1.2) * 0.16;
    const bob = lerp(bobTrot, bobGallop, runBlend) * moving;
    const breathe = Math.sin(t * 2.4) * 0.012 * (1 - moving);
    hopT = Math.max(0, hopT - dt * 2.2);
    const hop = Math.sin(hopT * Math.PI) * 0.7;
    W.body.position.y = lerp(bob, -0.62, sleepT) + hop;
    W.body.rotation.z = Math.sin(phase) * 0.12 * runBlend * moving;
    W.torso.scale.y = 0.5 + breathe;

    // head: counter-bob while moving, look around while idle, howl, rest when sleeping
    if (now > nextLook) { headYawTarget = rand(-0.6, 0.6) * (1 - moving); nextLook = now + rand(1200, 3500); }
    headYaw = lerp(headYaw, moving > 0.3 ? 0 : headYawTarget, 1 - Math.exp(-dt * 3));
    const howling = now < howlUntil ? 1 : 0;
    const headPitch = Math.sin(phase * 2) * 0.05 * moving + howling * 0.95 - sleepT * 0.45 - runBlend * 0.15 * moving;
    W.head.rotation.set(0, headYaw * (1 - sleepT), lerp(W.head.rotation.z, headPitch, 1 - Math.exp(-dt * 6)));
    W.head.position.y = 1.45 - sleepT * 0.18;

    // ears twitch, eyes blink / close
    const twitch = (Math.sin(t * 0.7 + seed) > 0.985 ? 0.4 : 0);
    W.ears.forEach((e, i) => { e.rotation.z = 0.18 - twitch * (i ? 1 : 0.4) + runBlend * 0.35 * moving; });
    const blink = (t % 4.3) < 0.12 ? 0.15 : 1;
    const eyeScale = Math.min(blink, 1 - sleepT * 0.85, 1 - howling * 0.8);
    W.eyes.forEach((e) => { e.scale.y = eyeScale; });

    // tail: wag when idle, stream behind when running, tuck when sleeping
    const wag = Math.sin(t * 9) * 0.45 * (1 - moving) * (1 - sleepT);
    W.tail.rotation.y = wag + Math.sin(phase) * 0.15 * moving + sleepT * 0.9;
    W.tail.rotation.z = runBlend * moving * -0.7 + Math.sin(phase * 2) * 0.08 * moving - sleepT * 0.25 + howling * -0.2;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
