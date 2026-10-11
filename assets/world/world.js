/* Ninja World engine (PixiJS 7). Needs window.PIXI and window.NW_DATA (assets/world/world-data.js).
   const world = await NinjaWorld.create({ container, labelsEl, onPeakClick, onNinjaClick });
   world.setMembers([{ id, name, rank, progress, accessories, isMe, waiting }]);
   world.setMode('dawn' | 'day' | 'evening' | 'night'); world.setMotion(true|false); world.sighting('fish') */
(function () {
'use strict';
const W = 1600, H = 900, HZ = 650;

const MODES = {
  dawn:    { mistA: 1,   sun: [330, 470],  sunCol: [255, 214, 214], sunA: 0.9,  sunS: 1.0,  rays: 0.045, grade: [1.05, 0.98, 1.02, 0.05, 0.03, 0.06, 0.98], cloud: [255, 226, 236], mist: [255, 240, 246], stars: 0.3,  flies: 0,   glint: 0.55, moon: 0, petals: 1 },
  day:     { mistA: 0.5, sun: [760, 80],   sunCol: [255, 255, 246], sunA: 0.95, sunS: 0.85, rays: 0.03,  grade: [1.06, 1.06, 1.05, 0.02, 0.02, 0.02, 1.14], cloud: [255, 255, 255], mist: [255, 255, 255], stars: 0,    flies: 0,   glint: 0.5,  moon: 0, petals: 1 },
  evening: { mistA: 0.9, sun: [1180, 360], sunCol: [255, 228, 186], sunA: 0.95, sunS: 1.1,  rays: 0.06,  grade: [1.07, 1.0, 0.93, 0.06, 0.03, 0.0, 1.04],   cloud: [255, 232, 218], mist: [255, 242, 234], stars: 0.06, flies: 0.6, glint: 0.65, moon: 0, petals: 0.7 },
  night:   { mistA: 0.8, sun: [780, 120],  sunCol: [190, 208, 255], sunA: 0.55, sunS: 0.9,  rays: 0.012, grade: [0.52, 0.6, 0.88, 0.0, 0.015, 0.07, 0.75], cloud: [110, 122, 178], mist: [150, 162, 214], stars: 1,    flies: 1,   glint: 0.4,  moon: 1, petals: 0.3 },
};
const ORDER = ['dawn', 'day', 'evening', 'night'];
function modeForClock(d = new Date()) { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20.5 ? 'evening' : 'night'; }

/* ---------- helpers ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const rgb = (c) => (Math.round(c[0]) << 16) + (Math.round(c[1]) << 8) + Math.round(c[2]);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOut = (p) => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const live = Math.random, lrand = (a, b) => a + (b - a) * live();
function svgImage(str) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str); }); }
async function svgTexture(str, scale = 1) {
  const img = await svgImage(str), c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const t = PIXI.Texture.from(c); t.k = scale; return t;
}
/* Painted-texture cache. Turning the SVG layers into bitmaps is the slow part of opening the Mountain,
   so after the first visit the bitmaps are kept in the browser (Cache Storage) and simply reloaded.
   The cache name follows the artwork, so new artwork automatically replaces old bitmaps. */
async function openTexCache(L) {
  if (!('caches' in window) || !window.createImageBitmap || !window.isSecureContext) return null;
  try {
    const name = 'nw-tex-' + Math.floor(hash(Object.keys(L).map(k => k + ':' + L[k].length).join('|')) * 1e9);
    const cache = await caches.open(name);
    caches.keys().then(ks => ks.filter(k => k.startsWith('nw-tex-') && k !== name).forEach(k => caches.delete(k))).catch(() => {});
    const missing = [], url = (k, sc) => '/__nw-tex/' + k + '@' + sc;
    return {
      missing,
      async get(k, sc) {
        try {
          const r = await cache.match(url(k, sc));
          if (!r) { missing.push(k); return null; }
          const t = PIXI.Texture.from(await createImageBitmap(await r.blob())); t.k = sc; return t;
        } catch (e) { missing.push(k); return null; }
      },
      save(k, sc, canvas) {
        return new Promise((res) => {
          try { canvas.toBlob((b) => { if (!b) return res(); cache.put(url(k, sc), new Response(b, { headers: { 'content-type': b.type } })).then(res, res); }, 'image/webp', 0.95); }
          catch (e) { res(); }
        });
      },
    };
  } catch (e) { return null; }
}
function noiseField(size, freq, octaves, seed) {
  const r = rng(seed), out = new Float32Array(size * size); let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const g = freq * (1 << o), lat = new Float32Array(g * g).map(() => r());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = x / size * g, fy = y / size * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = lat[(y0 % g) * g + (x0 % g)], b = lat[(y0 % g) * g + ((x0 + 1) % g)], c = lat[((y0 + 1) % g) * g + (x0 % g)], d = lat[((y0 + 1) % g) * g + ((x0 + 1) % g)];
      out[y * size + x] += amp * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
    }
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total; return out;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), c); return PIXI.Texture.from(c); }
function gradeMatrix(g) {
  const [rm, gm, bm, ra, ga, ba, s] = g, lr = 0.2126, lg = 0.7152, lb = 0.0722, sr = (1 - s) * lr, sg = (1 - s) * lg, sb = (1 - s) * lb;
  return [(sr + s) * rm, sg * rm, sb * rm, 0, ra, sr * gm, (sg + s) * gm, sb * gm, 0, ga, sr * bm, sg * bm, (sb + s) * bm, 0, ba, 0, 0, 0, 1, 0];
}
function sprite(tex, parent, x, y, ax = 0.5, ay = 0.5, s = 1) { const sp = new PIXI.Sprite(tex); sp.anchor.set(ax, ay); sp.x = x; sp.y = y; sp.scale.set(s / (tex.k || 1)); parent.addChild(sp); return sp; }

function ninjaSvg(rank, accessories) {
  const N = window.NW_DATA.ninja;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${N.w}" height="${N.h}" viewBox="${N.viewBox}">${N.bases[rank] || N.bases.white}${(accessories || []).map(a => N.accessories[a] || '').join('')}</svg>`;
}

async function create(opts) {
  const D = window.NW_DATA, L = D.layers, PEAKS = D.peaks;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motion = !reduceMotion, mode = opts.mode || modeForClock();
  const R = rng(42), rand = (a, b) => a + (b - a) * R();

  const app = new PIXI.Application({ resizeTo: opts.container, antialias: true, backgroundColor: 0x79b8f2, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
  opts.container.appendChild(app.view);

  const hiRes = ['pine0', 'pine1', 'pine2', 'broad', 'sakura', 'grass0', 'grass1', 'grass2', 'daisy', 'bell', 'fish', 'mermaid', 'tail', 'boat', 'oar', 'raft', 'bird', 'moon'];
  const tex = {};
  const scaleOf = (k) => (hiRes.includes(k) ? 2 : 1);
  const layerCache = await openTexCache(L);
  await Promise.all(Object.keys(L).map(async k => { tex[k] = (layerCache && await layerCache.get(k, scaleOf(k))) || await svgTexture(L[k], scaleOf(k)); }));
  // first visit: store the painted layers once the page is idle, so the next visit skips painting
  if (layerCache && layerCache.missing.length) {
    // toBlob encodes off the main thread, so this doesn't slow the animation down
    setTimeout(() => {
      Promise.all(layerCache.missing.map((k) => {
        const src = tex[k] && tex[k].baseTexture.resource && tex[k].baseTexture.resource.source;
        return src && src.toBlob ? layerCache.save(k, scaleOf(k), src) : null;
      })).catch(() => {});
    }, 1200);
  }

  /* generated textures */
  const n1 = noiseField(256, 4, 4, 7), n2 = noiseField(256, 4, 4, 13);
  const dispTex = canvasTex(256, 256, (g) => { const im = g.createImageData(256, 256);
    for (let i = 0; i < n1.length; i++) { im.data[i * 4] = n1[i] * 255; im.data[i * 4 + 1] = n2[i] * 255; im.data[i * 4 + 2] = 128; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); });
  dispTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  const mistN = noiseField(256, 3, 4, 21);
  const mistTex = canvasTex(512, 160, (g) => { const im = g.createImageData(512, 160);
    for (let y = 0; y < 160; y++) for (let x = 0; x < 512; x++) { const v = mistN[(y % 256) * 256 + Math.floor(x / 2) % 256], bell = Math.exp(-Math.pow((y - 80) / 42, 2));
      const i = (y * 512 + x) * 4; im.data[i] = 255; im.data[i + 1] = 255; im.data[i + 2] = 255; im.data[i + 3] = Math.min(255, Math.max(0, (v - 0.35) * 2.2) * bell * 255); }
    g.putImageData(im, 0, 0); });
  mistTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const softTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  const cloudTex = canvasTex(512, 260, (g) => {
    for (const [x, y, r] of [[120, 140, 80], [200, 105, 95], [290, 120, 90], [370, 145, 70], [250, 160, 90], [160, 165, 70], [330, 170, 70]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
  const streakTex = canvasTex(128, 8, (g) => { const gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 2, 128, 4); });
  const rayTex = canvasTex(128, 1024, (g) => { const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, 'rgba(255,250,230,0.9)'); gr.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(64, 0); g.lineTo(128, 1024); g.lineTo(0, 1024); g.closePath(); g.fill(); });
  const petalTex = canvasTex(48, 42, (g) => {
    const gr = g.createLinearGradient(24, 40, 24, 2); gr.addColorStop(0, '#f390b5'); gr.addColorStop(0.55, '#fbc8dc'); gr.addColorStop(1, '#fff3f8');
    g.fillStyle = gr; g.beginPath(); g.moveTo(24, 40); g.bezierCurveTo(4, 32, 2, 12, 15, 4); g.quadraticCurveTo(21, 2, 24, 9); g.quadraticCurveTo(27, 2, 33, 4);
    g.bezierCurveTo(46, 12, 44, 32, 24, 40); g.fill();
    g.strokeStyle = 'rgba(232,120,160,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(24, 38); g.quadraticCurveTo(23, 24, 24, 12); g.stroke(); });
  const grainN = noiseField(256, 64, 2, 99);
  const grainTex = canvasTex(256, 256, (g) => { const im = g.createImageData(256, 256), r2 = rng(5);
    for (let i = 0; i < grainN.length; i++) { const v = 128 + (grainN[i] - 0.5) * 110 + (r2() - 0.5) * 60; im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v * 1.03; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); });
  const vignetteTex = canvasTex(400, 225, (g) => { const gr = g.createRadialGradient(200, 120, 90, 200, 120, 260);
    gr.addColorStop(0, 'rgba(40,40,90,0)'); gr.addColorStop(1, 'rgba(40,40,90,0.22)'); g.fillStyle = gr; g.fillRect(0, 0, 400, 225); });
  const ringTex = canvasTex(128, 48, (g) => { g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; g.beginPath(); g.ellipse(64, 24, 58, 18, 0, 0, Math.PI * 2); g.stroke(); });

  /* ---------- scene graph ---------- */
  const world = new PIXI.Container(); app.stage.addChild(world);
  const scene = new PIXI.Container(); world.addChild(scene);
  const parallax = [], grades = [];
  const layer = (depth, parent) => { const c = new PIXI.Container(); c.depth = depth; parent.addChild(c); parallax.push(c); return c; };
  const graded = (c) => { const f = new PIXI.ColorMatrixFilter(); c.filters = [...(c.filters || []), f]; grades.push(f); return c; };

  const skyL = layer(0, scene), skies = {};
  for (const m of ORDER) { skies[m] = sprite(tex['sky_' + m], skyL, 0, 0, 0, 0); skies[m].alpha = m === mode ? 1 : 0; }
  const starsL = layer(0.03, scene), stars = [];
  for (let i = 0; i < 90; i++) { const s = sprite(glowTex, starsL, rand(0, W), rand(6, 380) * (i < 60 ? 0.6 : 1), 0.5, 0.5, rand(0.04, 0.1)); s.ph = rand(0, 6.28); s.sp = rand(0.6, 1.6); stars.push(s); }
  const sunL = layer(0.04, scene);
  const sunHalo = sprite(softTex, sunL, 0, 0, 0.5, 0.5, 3.2); sunHalo.blendMode = PIXI.BLEND_MODES.SCREEN;
  const sunCore = sprite(glowTex, sunL, 0, 0, 0.5, 0.5, 2.2);
  const moon = sprite(tex.moon, sunL, 0, 0, 0.5, 0.5, 0.75);
  const raysL = layer(0.06, scene), rays = [];
  for (let i = 0; i < 7; i++) { const r = sprite(rayTex, raysL, 0, 0, 0.5, 0); r.blendMode = PIXI.BLEND_MODES.ADD; r.base = 0.5 + i * 0.28; r.rotation = r.base; r.alpha = 0; r.scale.set(rand(0.9, 1.8), 1); r.ph = rand(0, 6.28); rays.push(r); }
  const cloudsHigh = layer(0.12, scene), clouds = [];
  const addCloud = (p, x, y, s, a, sp) => { const c = sprite(cloudTex, p, x, y, 0.5, 0.5, s); c.baseA = a; c.alpha = a; c.sp = sp; clouds.push(c); };
  addCloud(cloudsHigh, 380, 150, 1.1, 0.9, 0.12); addCloud(cloudsHigh, 900, 90, 0.8, 0.75, 0.08); addCloud(cloudsHigh, 1350, 200, 1.3, 0.7, 0.1); addCloud(cloudsHigh, -100, 250, 0.9, 0.6, 0.14);
  const birdsL = layer(0.14, scene);

  const land = graded(new PIXI.Container()); scene.addChild(land);
  const far = layer(0.16, land); { const s = sprite(tex.far, far, -60, 0, 0, 0); s.width = W + 120; }
  const back = layer(0.3, land); sprite(tex.back, back, 0, 0, 0, 0); sprite(tex.flagsBack, back, 0, 0, 0, 0);
  const backMembers = new PIXI.Container(); back.addChild(backMembers);
  const mistHigh = layer(0.36, land);
  const front = layer(0.45, land); sprite(tex.front, front, 0, 0, 0, 0); sprite(tex.flagsFront, front, 0, 0, 0, 0);
  const frontMembers = new PIXI.Container(); front.addChild(frontMembers);
  const forest = layer(0.5, land); sprite(tex.forest, forest, -40, 0, 0, 0);
  const mistLow = layer(0.55, land), mists = [];
  const addMist = (p, y, h, a, sp, sc) => { const m = new PIXI.TilingSprite(mistTex, W + 200, h); m.x = -100; m.y = y; m.baseA = a; m.alpha = a; m.sp = sp; m.tileScale.set(sc, h / 160); p.addChild(m); mists.push(m); };
  addMist(mistHigh, HZ - 300, 160, 0.42, 0.12, 1.6); addMist(mistLow, HZ - 150, 180, 0.62, 0.22, 1.2); addMist(mistLow, HZ - 80, 110, 0.5, 0.35, 0.9);
  addCloud(mistLow, 560, HZ - 70, 1.4, 0.5, 0.18); addCloud(mistLow, 1250, HZ - 120, 1.2, 0.42, 0.16);

  /* water */
  const water = graded(layer(0.5, world));
  const lake = sprite(tex.lake, water, -80, 0, 0, 0); lake.width = W + 160;
  const rt = PIXI.RenderTexture.create({ width: W, height: HZ, resolution: 0.5 });
  const reflWrap = new PIXI.Container(); water.addChild(reflWrap);
  const refl = new PIXI.Sprite(rt); refl.scale.set(1, -0.82); refl.y = HZ + HZ * 0.82; refl.alpha = 0.62; refl.tint = 0xdde6ff; reflWrap.addChild(refl);
  const lakeShape = (g) => { g.moveTo(-80, HZ); g.bezierCurveTo(300, HZ - 4, 600, HZ + 6, 900, HZ); g.bezierCurveTo(1150, HZ - 6, 1400, HZ + 4, W + 80, HZ); };
  const lakeMask = new PIXI.Graphics(); lakeMask.beginFill(0xffffff); lakeShape(lakeMask); lakeMask.lineTo(W + 80, 830); lakeMask.lineTo(-80, 830); lakeMask.closePath(); lakeMask.endFill();
  water.addChild(lakeMask); reflWrap.mask = lakeMask;
  const waterLife = new PIXI.Container(); water.addChild(waterLife);
  const glints = [];
  for (let i = 0; i < 70; i++) {
    const near = i < 34, g = sprite(streakTex, water, 0, rand(HZ + 6, 805), 0.5, 0.5); g.blendMode = PIXI.BLEND_MODES.ADD;
    g.near = near; g.off = near ? rand(-70, 70) * (1 + (i % 5) * 0.2) : rand(0, W);
    const d = (g.y - HZ) / 150; g.scale.set(rand(0.25, 0.7) * (0.6 + d), 0.6 + d * 0.6); g.ph = rand(0, 6.28); g.sp = rand(0.8, 2.2); g.base = near ? 0.55 : 0.25; g.vx = rand(0.05, 0.25);
    if (!near) g.x = g.off; glints.push(g);
  }
  const shore = new PIXI.Graphics(); shore.lineStyle(3, 0xffffff, 0.75); lakeShape(shore); water.addChild(shore);
  const dispSprite = new PIXI.Sprite(dispTex); dispSprite.scale.set(4, 0.9); dispSprite.renderable = false; world.addChild(dispSprite);
  const dispFilter = new PIXI.DisplacementFilter(dispSprite); dispFilter.scale.set(22, 10);
  water.filters = [dispFilter, ...water.filters];
  const lakeLife = graded(layer(0.5, world));

  /* foreground */
  const fg = graded(layer(0.85, world));
  { const h = sprite(tex.hills, fg, -90, 0, 0, 0); h.width = W + 180; }
  const sway = [], fgItems = [];
  for (const [x, y, s, k] of [[330, 792, 0.2, 'pine1'], [360, 796, 0.16, 'pine2'], [1010, 790, 0.18, 'pine0'], [1045, 795, 0.15, 'pine1'], [1240, 784, 0.2, 'pine2']]) fgItems.push({ k, x, y, s, amp: 0.012 });
  fgItems.push({ k: 'sakura', x: 70, y: 920, s: 1.05, amp: 0.008, sakura: true });
  fgItems.push({ k: 'pine0', x: 1420, y: 905, s: 0.95, amp: 0.012 }); fgItems.push({ k: 'pine2', x: 1530, y: 925, s: 1.15, amp: 0.012 });
  fgItems.push({ k: 'broad', x: 1330, y: 915, s: 0.8, amp: 0.007 });
  fgItems.push({ k: 'sakura', x: 900, y: 905, s: 0.55, amp: 0.008, sakura: true });
  for (let i = 0; i < 70; i++) { const y = 785 + rand(0, 120); fgItems.push({ k: 'grass' + (i % 3), x: rand(-40, W + 40), y, s: rand(0.45, 0.8) * (y > 850 ? 1.3 : 1), amp: rand(0.06, 0.12) }); }
  for (let i = 0; i < 26; i++) { const y = 800 + rand(0, 95); fgItems.push({ k: i % 3 ? 'daisy' : 'bell', x: rand(150, W - 150), y, s: rand(0.55, 0.85) * (y > 850 ? 1.2 : 1), amp: rand(0.05, 0.1) }); }
  fgItems.sort((a, b) => a.y - b.y);
  const sakuraSpots = [];
  for (const it of fgItems) {
    const sp = sprite(tex[it.k], fg, it.x, it.y, 0.5, 1, it.s); sp.ph = rand(0, 6.28); sp.amp = it.amp; sway.push(sp);
    if (it.sakura) sakuraSpots.push({ x: it.x, y: it.y - 230 * it.s, w: 110 * it.s });
  }

  /* particles */
  const fx = layer(1.0, world), flies = [], petals = [];
  for (let i = 0; i < 30; i++) { const f = sprite(glowTex, fx, 0, 0, 0.5, 0.5, rand(0.08, 0.16)); f.tint = 0xffe27a; f.blendMode = PIXI.BLEND_MODES.ADD; f.bx = rand(0, W); f.by = rand(690, 890); f.ph = rand(0, 6.28); f.sp = rand(0.3, 0.8); flies.push(f); }
  function spawnPetal() {
    const src = sakuraSpots[Math.floor(live() * sakuraSpots.length)];
    const p = sprite(petalTex, fx, src.x + lrand(-src.w, src.w), src.y + lrand(-40, 40), 0.5, 0.5, lrand(0.32, 0.55));
    p.s = p.scale.y; p.vx = lrand(0.25, 0.8); p.vy = lrand(0.25, 0.5); p.ph = lrand(0, 6.28); p.spin = lrand(-0.03, 0.03); p.life = 0; petals.push(p);
  }

  const vignette = new PIXI.Sprite(vignetteTex); vignette.width = W; vignette.height = H; world.addChild(vignette);
  const grain = new PIXI.TilingSprite(grainTex, W, H); grain.alpha = 0.05; grain.blendMode = PIXI.BLEND_MODES.MULTIPLY; world.addChild(grain);

  /* ---------- peak plaques: painted onto each mountain, so they move rigidly with it ---------- */
  const BAND = { white: '#f4f4f4', yellow: '#f9ab00', green: '#34a853', blue: '#4285f4', red: '#ea4335', black: '#2d2d2f' };
  const plaqueBack = layer(0.3, world), plaqueFront = layer(0.45, world);
  world.setChildIndex(plaqueBack, world.getChildIndex(scene) + 1); world.setChildIndex(plaqueFront, world.getChildIndex(plaqueBack) + 1);
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function plaqueTexture(p, count) {
    const S = 3, name = peakTitle(p);
    const sub = opts.peakText ? opts.peakText(p, count) : (p.id === 'black' && !count ? 'summit · no one yet' : `${count} climber${count === 1 ? '' : 's'}`);
    const c = document.createElement('canvas'), g = c.getContext('2d');
    const f1 = `800 ${15 * S}px "Google Sans", Figtree, system-ui, sans-serif`, f2 = `400 ${11 * S}px "Google Sans Code", ui-monospace, Menlo, monospace`;
    g.font = f1; const w1 = g.measureText(name).width; g.font = f2; const w2 = g.measureText(sub).width;
    const w = Math.ceil(Math.max(w1, w2) + 44 * S), h = 44 * S; c.width = w + 4 * S; c.height = h + 6 * S;
    const dark = p.id === 'black';
    g.fillStyle = 'rgba(20,20,60,.22)'; rr(g, 2 * S, 5 * S, w, h, 13 * S); g.fill();
    g.fillStyle = dark ? '#2a2d4f' : 'rgba(255,255,255,.96)'; rr(g, 2 * S, 2 * S, w, h, 13 * S); g.fill();
    g.lineWidth = 2 * S; g.strokeStyle = '#1e1e1e'; g.stroke();
    g.fillStyle = BAND[p.id]; rr(g, 12 * S, 2 * S + h / 2 - 9 * S, 10 * S, 18 * S, 5 * S); g.fill(); g.lineWidth = 1.5 * S; g.strokeStyle = dark ? '#ffffff' : '#1e1e1e'; g.stroke();
    g.fillStyle = dark ? '#ffffff' : '#1e1e1e'; g.font = f1; g.fillText(name, 30 * S, 21 * S);
    g.globalAlpha = 0.75; g.font = f2; g.fillText(sub, 30 * S, 37 * S); g.globalAlpha = 1;
    const t = PIXI.Texture.from(c); t.k = S; return t;
  }
  // text comes from the page (translated) when it provides it
  const peakTitle = (p) => (opts.peakTitle ? opts.peakTitle(p) : p.id[0].toUpperCase() + p.id.slice(1) + ' · ' + p.name);
  const counts = {};
  const plaques = {};
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  await fontsReady;
  for (const p of PEAKS) {
    const parent = p.back ? plaqueBack : plaqueFront;
    const s = sprite(plaqueTexture(p, 0), parent, p.x, p.y + (HZ - p.y) * 0.3, 0.5, 0.5);
    s.eventMode = 'static'; s.cursor = 'pointer';
    s.on('pointertap', () => { if (!dragMoved && opts.onPeakClick) opts.onPeakClick(p.id); });
    plaques[p.id] = s;
  }
  // keyboard and screen-reader access to the same peaks
  const labelsEl = opts.labelsEl;
  if (labelsEl) for (const p of PEAKS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'peak-sr';
    b.dataset.peak = p.id; b.textContent = opts.peakLabel ? opts.peakLabel(p) : `${p.id[0].toUpperCase() + p.id.slice(1)} peak · ${p.name}`;
    b.addEventListener('click', () => opts.onPeakClick && opts.onPeakClick(p.id)); labelsEl.appendChild(b);
  }
  function youTexture() {
    const S = 3, c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 52 * S; c.height = 26 * S;
    g.fillStyle = '#f9ab00'; rr(g, 2 * S, 2 * S, 48 * S, 22 * S, 11 * S); g.fill(); g.lineWidth = 2 * S; g.strokeStyle = '#1e1e1e'; g.stroke();
    g.fillStyle = '#1e1e1e'; g.font = `800 ${13 * S}px "Google Sans", Figtree, system-ui, sans-serif`; g.textAlign = 'center'; g.fillText(opts.youText ? opts.youText() : 'You', 26 * S, 18 * S);
    const t = PIXI.Texture.from(c); t.k = S; return t;
  }
  const youSprite = sprite(youTexture(), plaqueFront, 0, 0, 0.5, 1); youSprite.visible = false;

  /* ---------- members on their peaks ---------- */
  const texCache = new Map();
  async function ninjaTexture(rank, accs) {
    const key = rank + '|' + (accs || []).join(',');
    if (!texCache.has(key)) texCache.set(key, svgTexture(ninjaSvg(rank, accs), 1));
    return texCache.get(key);
  }
  function trailPoint(p, t, jit) {
    const baseY = HZ - 18, topY = p.y + 26, y = baseY + (topY - baseY) * t;
    const swing = Math.sin(t * Math.PI * 2.6 + p.x * 0.01) * p.hw * 0.38 * (1 - t * 0.85);
    return { x: p.x + swing + jit * (1 - t) * 34, y };
  }
  function redrawPlaques() {
    for (const p of PEAKS) {
      const sp = plaques[p.id], old = sp.texture; sp.texture = plaqueTexture(p, counts[p.id] || 0); old.destroy(true);
      // keep the whole plaque inside the world, so the edge peaks are readable when panned all the way
      const half = sp.width / 2 + 12; sp.x = Math.max(half, Math.min(W - half, p.x));
    }
  }
  let memberSprites = [], meSprite = null;
  async function setMembers(list) {
    for (const s of memberSprites) s.destroy(); memberSprites = []; meSprite = null;
    const byPeak = {};
    for (const m of list) (byPeak[m.rank] = byPeak[m.rank] || []).push(m);
    for (const p of PEAKS) counts[p.id] = (byPeak[p.id] || []).length;
    redrawPlaques();
    const placed = [];
    for (const m of list) {
      const p = PEAKS.find(x => x.id === m.rank) || PEAKS[0];
      const t = clamp01(m.progress ?? 0) * 0.92 + 0.04;
      const pos = trailPoint(p, t, hash(m.id) * 2 - 1);
      const texr = await ninjaTexture(m.rank, m.accessories);
      const parent = p.back ? backMembers : frontMembers;
      const s = sprite(texr, parent, pos.x, pos.y, 0.5, 1, m.isMe ? 0.2 : 0.14);
      s.by = pos.y; s.ph = hash(m.id + 'b') * 6.28; s.member = m;
      s.eventMode = 'static'; s.cursor = 'pointer';
      s.on('pointertap', (e) => { if (!dragMoved && opts.onNinjaClick) opts.onNinjaClick(m, e.global); });
      memberSprites.push(s); placed.push(s);
      if (m.isMe) meSprite = s;
    }
    for (const c of [frontMembers, backMembers]) c.children.sort((a, b) => a.by - b.by);
    if (meSprite) { const par = meSprite.parent; par.removeChild(meSprite); par.addChild(meSprite); }
    if (meSprite) { const pk = PEAKS.find(x => x.id === meSprite.member.rank); youSprite.parent && youSprite.parent.removeChild(youSprite); (pk.back ? plaqueBack : plaqueFront).addChild(youSprite); }
    youSprite.visible = !!meSprite;
  }

  /* ---------- fit + look-around ---------- */
  let overflowX = 0, portrait = false;
  function fit() {
    const s = Math.max(app.screen.width / W, app.screen.height / H) * 1.04;
    world.scale.set(s); overflowX = Math.max(0, W * s - app.screen.width); world.y = (app.screen.height - H * s) / 2;
    portrait = app.screen.width < app.screen.height;
  }
  fit(); app.renderer.on('resize', fit);
  let tx = 0, ty = 0, cx = 0, cy = 0, lastInput = -1e9;
  // Mouse: the view leans toward the pointer. Touch (and any narrow screen): drag to pan, like a photo.
  // `hold` is a camera position chosen by a drag or panTo(); it stays put while the person is looking around.
  let drag = null, dragMoved = false, hold = null;
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  const onMove = (e) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 8) dragMoved = true;
      if (overflowX > 0) hold = clamp1(drag.cx - (2 * dx) / overflowX);
      lastInput = performance.now(); return;
    }
    if (e.pointerType !== 'mouse') return;
    const r = opts.container.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!portrait) hold = null;
    lastInput = performance.now(); opts.onLook && opts.onLook();
  };
  const onDown = (e) => {
    dragMoved = false;
    if (e.pointerType === 'mouse' && !portrait) return onMove(e);
    drag = { x: e.clientX, cx: hold != null ? hold : cx }; lastInput = performance.now();
  };
  const onUp = () => { drag = null; };
  opts.container.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true }); window.addEventListener('pointercancel', onUp, { passive: true });
  // center the camera on a peak (used by the peak buttons on phones)
  function panTo(id) {
    const p = PEAKS.find(x => x.id === id); if (!p || overflowX <= 0) return;
    const sx = world.scale.x, want = app.screen.width / 2 - p.x * sx;
    hold = clamp1((-2 * want - overflowX) / overflowX); lastInput = performance.now();
  }

  /* ---------- look per time of day ---------- */
  const cur = JSON.parse(JSON.stringify(MODES[mode]));
  function blendLook(k) {
    const tgt = MODES[mode];
    for (const key of Object.keys(tgt)) { const v = tgt[key]; cur[key] = Array.isArray(v) ? cur[key].map((c, i) => lerp(c, v[i], k)) : lerp(cur[key], v, k); }
    for (const m of ORDER) skies[m].alpha = lerp(skies[m].alpha, m === mode ? 1 : 0, k);
  }
  function applyLook() {
    const M = gradeMatrix(cur.grade); for (const f of grades) f.matrix = M;
    const [sx, sy] = cur.sun;
    sunHalo.position.set(sx, sy); sunCore.position.set(sx, sy); moon.position.set(sx, sy);
    sunHalo.tint = sunCore.tint = rgb(cur.sunCol); sunHalo.alpha = cur.sunA * 0.9; sunCore.alpha = cur.sunA * (1 - cur.moon);
    sunHalo.scale.set(3.2 * cur.sunS); sunCore.scale.set(2.2 * cur.sunS); moon.alpha = cur.moon;
    for (const r of rays) { r.position.set(sx, sy); if (!motion) { r.rotation = r.base; r.alpha = cur.rays * 0.8; } }
    const ct = rgb(cur.cloud); for (const c of clouds) c.tint = ct;
    const mt = rgb(cur.mist); for (const m of mists) { m.tint = mt; m.alpha = m.baseA * cur.mistA; }
    starsL.alpha = cur.stars;
  }
  applyLook();

  /* ---------- rare sightings ---------- */
  const events = [];
  let boatActive = false;
  const depthScale = (y) => 0.45 + (y - HZ) / 130 * 0.6;
  const now = () => performance.now() / 1000;
  const DEMO = !!opts.frequentSightings;
  let nextEvent = now() + (DEMO ? 2 : lrand(14, 30));
  const scheduleNext = () => { nextEvent = now() + (DEMO ? lrand(4, 7) : lrand(35, 100)); };
  function splash(x, y, s, big = false) {
    const parts = [], drops = [];
    for (let i = 0; i < (big ? 3 : 2); i++) { const r = sprite(ringTex, waterLife, x, y + 2, 0.5, 0.5, 0.1 * s); r.d = i * 0.25; parts.push(r); }
    for (let i = 0; i < (big ? 14 : 8); i++) { const d = sprite(glowTex, lakeLife, x, y, 0.5, 0.5, lrand(0.05, 0.09) * s); d.vx = lrand(-1, 1) * 40 * s; d.vy = -lrand(50, 110) * s * (big ? 1.3 : 1); drops.push(d); }
    const t0 = now();
    events.push({ update() { const t = now() - t0;
      for (const r of parts) { const p = clamp01((t - r.d) / 1.6); r.scale.set((0.1 + p * (big ? 1.1 : 0.7)) * s); r.alpha = (1 - p) * 0.8; }
      for (const d of drops) { d.x += d.vx / 60; d.y += d.vy / 60; d.vy += 220 * s / 60; d.alpha = clamp01(1 - t / 0.9); }
      if (t > 1.9) { parts.forEach(p => p.destroy()); drops.forEach(d => d.destroy()); return false; } return true; } });
  }
  function maskAbove(y, parent) { const m = new PIXI.Graphics(); m.beginFill(0xffffff); m.drawRect(-200, y - 400, W + 400, 400); m.endFill(); parent.addChild(m); return m; }
  function fishJump() {
    const y = lrand(668, 760), s = depthScale(y), x = lrand(140, W - 140), dir = live() < 0.5 ? -1 : 1, dur = lrand(0.9, 1.3), hgt = lrand(28, 50) * s, dist = lrand(45, 80) * s;
    const fish = sprite(tex.fish, lakeLife, x, y, 0.5, 0.5, 0.42 * s); fish.scale.x *= -dir;
    const m = maskAbove(y + 1, lakeLife); fish.mask = m; splash(x, y, s); const t0 = now(); let landed = false;
    events.push({ update() { const p = (now() - t0) / dur;
      if (p >= 1) { if (!landed) { splash(x + dir * dist, y, s); landed = true; } fish.destroy(); m.destroy(); return false; }
      fish.x = x + dir * dist * p; fish.y = y + 10 * s - 4 * (hgt + 10 * s) * p * (1 - p); fish.rotation = dir * (-0.9 + 1.8 * p); return true; } });
  }
  function mermaid() {
    const y = lrand(670, 700), s = depthScale(y) * 0.9, x = lrand(260, W - 260), t0 = now();
    const m1 = maskAbove(y + 1, lakeLife), body = sprite(tex.mermaid, lakeLife, x, y + 60 * s, 0.5, 1, 0.55 * s); body.mask = m1;
    const m2 = maskAbove(y + 1, lakeLife), tail = sprite(tex.tail, lakeLife, x + 26 * s, y + 80 * s, 0.5, 1, 0.5 * s); tail.mask = m2;
    const sparkles = []; let rings = 0, slapped = false, turned = false;
    events.push({ update() { const t = now() - t0;
      if (t < 1.2 && t > rings * 0.4) { rings++; splash(x, y, s * 0.6); }
      const rise = t < 1.2 ? 0 : t < 2.6 ? easeInOut((t - 1.2) / 1.4) : t < 5.6 ? 1 : t < 6.6 ? 1 - easeInOut((t - 5.6) / 1.0) : 0;
      body.y = y + 60 * s * (1 - rise) + Math.sin(t * 1.6) * 1.2; body.rotation = Math.sin(t * 0.9) * 0.04;
      if (t > 3.2 && !turned) { turned = true; body.scale.x *= -1; }
      const tp = (t - 6.9) / 1.5;
      if (tp > 0 && tp < 1) { const up = Math.sin(tp * Math.PI); tail.y = y + 80 * s * (1 - up); tail.rotation = -0.5 + tp * 0.9; }
      if (tp >= 0.85 && !slapped) { slapped = true; splash(x + 26 * s, y, s * 1.1, true);
        for (let i = 0; i < 16; i++) { const g = sprite(glowTex, lakeLife, x + lrand(-30, 50) * s, y - lrand(0, 50) * s, 0.5, 0.5, lrand(0.05, 0.11)); g.tint = 0xb6fff1; g.blendMode = PIXI.BLEND_MODES.ADD; g.ph = lrand(0, 6); sparkles.push(g); } }
      sparkles.forEach(g => { g.alpha = clamp01(1 - (t - 8.2) / 1.6) * (0.5 + 0.5 * Math.sin(t * 9 + g.ph)); g.y -= 0.15; });
      if (t > 10) { [body, tail, m1, m2, ...sparkles].forEach(o => o.destroy()); return false; } return true; } });
  }
  function vessel() {
    boatActive = true;
    const lantern = mode === 'night' || mode === 'evening', isRaft = lantern ? live() < 0.6 : live() < 0.25;
    const y = lrand(700, 740), s = depthScale(y) * 0.95, dir = live() < 0.5 ? 1 : -1;
    const startX = dir > 0 ? -160 : W + 160, endX = dir > 0 ? W + 160 : -160, dur = lrand(70, 95) / (DEMO ? 2.5 : 1);
    const boat = new PIXI.Container(); boat.x = startX; boat.y = y; boat.scale.set(0.55 * s * dir, 0.55 * s); lakeLife.addChild(boat);
    sprite(isRaft ? tex.raft : tex.boat, boat, 0, 0, 0.5, 0.82);
    let oar = null, glow = null;
    if (!isRaft) { oar = sprite(tex.oar, boat, 8, -24, 0.04, 0.06); boat.addChildAt(oar, 0); }
    if (lantern) { glow = sprite(glowTex, boat, isRaft ? 60 : 58, isRaft ? -50 : -60, 0.5, 0.5, 1.2); glow.tint = 0xffc46b; glow.blendMode = PIXI.BLEND_MODES.ADD; }
    const rboat = sprite(isRaft ? tex.raft : tex.boat, waterLife, startX, y + 4, 0.5, 0.82); rboat.scale.set(0.55 * s * dir, -0.5 * s); rboat.alpha = 0.32;
    let rglow = null; if (lantern) { rglow = sprite(glowTex, waterLife, 0, 0, 0.5, 0.5, 0.9 * s); rglow.tint = 0xffc46b; rglow.blendMode = PIXI.BLEND_MODES.ADD; }
    const wakes = []; let lastWake = 0; const t0 = now();
    events.push({ update() { const t = now() - t0, p = t / dur, stroke = isRaft ? 0.5 + 0.5 * Math.sin(t * 1.1) : Math.max(0, Math.sin(t * 2.2));
      boat.x = lerp(startX, endX, p) + (isRaft ? 0 : Math.sin(t * 2.2) * 2); boat.y = y + Math.sin(t * 1.5) * 1.3; boat.rotation = Math.sin(t * 1.2) * 0.02;
      if (oar) oar.rotation = -0.25 + Math.sin(t * 2.2) * 0.38;
      if (glow) glow.alpha = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1);
      rboat.x = boat.x; rboat.rotation = -boat.rotation;
      if (rglow) { rglow.x = boat.x + (isRaft ? 60 : 58) * 0.55 * s * dir; rglow.y = y + 30 * s; rglow.alpha = glow.alpha * 0.6; }
      if (t - lastWake > 0.5) { lastWake = t; const w = sprite(ringTex, waterLife, boat.x - dir * 50 * s, y + 6, 0.5, 0.5, 0.25 * s); w.t0 = t; wakes.push(w); }
      for (let i = wakes.length - 1; i >= 0; i--) { const w = wakes[i], a = (t - w.t0) / 3.5; w.scale.set((0.25 + a * 0.9) * s, (0.12 + a * 0.25) * s * 0.6); w.alpha = (1 - a) * 0.45 * (0.6 + stroke * 0.4); if (a >= 1) { w.destroy(); wakes.splice(i, 1); } }
      if (p >= 1) { boat.destroy({ children: true }); rboat.destroy(); rglow && rglow.destroy(); wakes.forEach(w => w.destroy()); boatActive = false; return false; }
      return true; } });
  }
  function birds() {
    const n = 4 + Math.floor(live() * 5), dir = live() < 0.5 ? 1 : -1, y = lrand(110, 300), sp = lrand(55, 85) * dir, flock = [];
    for (let i = 0; i < n; i++) { const b = sprite(tex.bird, birdsL, (dir > 0 ? -60 : W + 60) - dir * (Math.abs(i - n / 2) * 26), y + Math.abs(i - n / 2) * 14 + lrand(-6, 6), 0.5, 0.5, lrand(0.42, 0.6)); b.s = b.scale.x; b.ph = lrand(0, 6); flock.push(b); }
    const t0 = now();
    events.push({ update() { const t = now() - t0;
      for (const b of flock) { b.x += sp / 60; b.y += Math.sin(t * 1.3 + b.ph) * 0.15; b.scale.y = b.s * (0.25 + 0.75 * Math.abs(Math.sin(t * 6 + b.ph))); }
      if (t > (W + 400) / Math.abs(sp)) { flock.forEach(b => b.destroy()); return false; } return true; } });
  }
  function shootingStar() {
    const s = sprite(streakTex, starsL, lrand(200, W - 400), lrand(40, 200), 1, 0.5, 1); s.scale.set(2.4, 1.2); s.rotation = lrand(0.25, 0.5); s.blendMode = PIXI.BLEND_MODES.ADD;
    const t0 = now(), vx = Math.cos(s.rotation) * 900, vy = Math.sin(s.rotation) * 900;
    events.push({ update() { const t = now() - t0; s.x += vx / 60; s.y += vy / 60; s.alpha = clamp01(1 - t / 0.9); if (t > 0.9) { s.destroy(); return false; } return true; } });
  }
  function pickEvent() {
    const night = mode === 'night', table = [['fish', 5], ['mermaid', night || mode === 'dawn' ? 1.1 : 0.6]];
    if (!night) table.push(['birds', 2.2]);
    if (!boatActive) table.push(['vessel', night ? 1.2 : 2]);
    if (night) table.push(['star', 2.5]);
    const total = table.reduce((a, b) => a + b[1], 0); let r = live() * total;
    for (const [name, w] of table) { if ((r -= w) <= 0) return name; } return 'fish';
  }
  const RUN = { fish: fishJump, mermaid, vessel, birds, star: shootingStar };

  /* ---------- animate ---------- */
  let t = 0, frame = 0, petalTimer = 2;
  const pt = new PIXI.Point();
  app.ticker.add((dt) => {
    const step = motion ? dt : 0; t += step / 60; frame++;
    blendLook(Math.min(1, 0.022 * dt)); applyLook();
    // after a drag or a jump to a peak, stay there for 25 s before drifting again
    const quiet = performance.now() - lastInput, idle = quiet > (hold != null ? 25000 : 3000);
    if (idle && hold != null) hold = null;
    const gx = hold != null ? hold : idle ? Math.sin(t * (portrait ? 0.06 : 0.08)) * (portrait ? 0.95 : 0.3) : tx, gy = hold != null ? cy * 0.98 : idle ? Math.sin(t * 0.07) * 0.12 : ty * 0.6;
    const k0 = !motion ? 1 : drag ? 0.35 : hold != null ? 0.08 : 0.03, k = 1 - Math.pow(1 - k0, Math.min(dt, 6)); cx += (gx - cx) * k; cy += (gy - cy) * k;
    world.x = -overflowX / 2 - cx * overflowX / 2;
    for (const c of parallax) { c.x = Math.round(-cx * 30 * c.depth * 2) / 2; c.y = Math.round(-cy * 10 * c.depth * 2) / 2; }
    if (motion) {
      for (const s of stars) s.alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp * 2 + s.ph));
      for (const r of rays) { r.rotation = r.base + Math.sin(t * 0.2 + r.ph) * 0.04; r.alpha = cur.rays * (0.6 + 0.4 * Math.sin(t * 0.5 + r.ph)); }
      for (const c of clouds) { c.x += c.sp * step; if (c.x > W + 300) c.x = -300; c.alpha = c.baseA * (mode === 'night' ? 0.55 : 1); }
      for (const m of mists) m.tilePosition.x += m.sp * step;
      for (const s of memberSprites) s.y = s.by + Math.sin(t * 2.2 + s.ph) * 1.8;
      dispSprite.x += 0.55 * step; dispSprite.y += 0.18 * step;
      for (const g of glints) { if (g.near) g.x = cur.sun[0] + g.off; else { g.x += g.vx * step * 0.3; if (g.x > W + 60) g.x = -60; }
        g.alpha = cur.glint * g.base * 2 * (0.5 + 0.5 * Math.sin(t * g.sp * 2 + g.ph)) * (g.near ? 1 : 0.6); }
      for (const s of sway) s.skew.x = Math.sin(t * 1.3 + s.ph + s.x * 0.004) * s.amp;
      for (const f of flies) { f.x = f.bx + Math.sin(t * f.sp + f.ph) * 40 + Math.sin(t * f.sp * 2.3) * 12; f.y = f.by + Math.cos(t * f.sp * 0.8 + f.ph) * 22; f.alpha = cur.flies * Math.max(0, Math.sin(t * f.sp * 3 + f.ph)); }
      petalTimer -= step / 60;
      if (petalTimer <= 0 && petals.length < 22) { const n = live() < 0.3 ? 4 : 1; for (let i = 0; i < n; i++) spawnPetal(); petalTimer = lrand(0.8, 3.5) / Math.max(0.2, cur.petals); }
      for (let i = petals.length - 1; i >= 0; i--) { const p = petals[i]; p.life += step / 60;
        p.x += (p.vx + Math.sin(t * 0.7) * 0.25) * step; p.y += (p.vy + Math.sin(t * 2 + p.ph) * 0.35) * step;
        p.rotation += p.spin * step; p.scale.x = p.s * Math.cos(t * 2.4 + p.ph); p.alpha = clamp01(Math.min(p.life / 0.6, (12 - p.life) / 2));
        if (p.y > 900 || p.x > W + 40 || p.life > 12) { p.destroy(); petals.splice(i, 1); } }
      grain.tilePosition.set((frame * 37) % 256, (frame * 53) % 256);
      if (now() > nextEvent) { RUN[pickEvent()](); scheduleNext(); }
      for (let i = events.length - 1; i >= 0; i--) if (!events[i].update()) events.splice(i, 1);
    }
    if (frame % 2 === 0 || !motion) app.renderer.render(scene, { renderTexture: rt, clear: true });
    if (meSprite) { youSprite.x = meSprite.x; youSprite.y = meSprite.y - meSprite.height - 4; }
  });

  return {
    setMembers,
    panTo,
    // after a language change: repaint plaque text, the You tag and the keyboard buttons
    refreshText() {
      redrawPlaques();
      const old = youSprite.texture; youSprite.texture = youTexture(); old.destroy(true);
      if (labelsEl) labelsEl.querySelectorAll('.peak-sr').forEach(b => { const p = PEAKS.find(x => x.id === b.dataset.peak); if (p && opts.peakLabel) b.textContent = opts.peakLabel(p); });
    },
    setMode(m) { if (MODES[m]) mode = m; },
    getMode: () => mode,
    setMotion(v) { motion = !!v; },
    sighting(name) { if (RUN[name] && !(name === 'vessel' && boatActive)) RUN[name](); },
    destroy() { app.destroy(true, { children: true }); },
  };
}

window.NinjaWorld = { create, modeForClock, MODES: Object.keys(MODES) };
})();
