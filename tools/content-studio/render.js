#!/usr/bin/env node
/* Content studio: turns one post spec (JSON) into ready-to-post files, in the club's look.

     node tools/content-studio/render.js tools/content-studio/posts/2026-11-19-get-hired.json OUT_DIR

   Makes, in OUT_DIR:
     carousel-1.png … (1080 × 1350)   Instagram carousel; the same slides as linkedin-carousel.pdf (a LinkedIn document post)
     story-*.png      (1080 × 1920)   Instagram / TikTok stories
     reel.mp4         (1080 × 1920)   Reel / TikTok / YouTube Short: silent, add a sound in the app
     reel-cover.png                   the video's cover image
   Uses the Playwright and ffmpeg already on the machine. No npm install, no build step.

   Spec: see posts/*.json. "title" fields may hold <b>…</b> for the italic accent; other text is escaped. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const FONTS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Figtree:wght@300;500;800&family=Google+Sans+Code:wght@700&family=Instrument+Serif:ital@1&display=block';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = (s) => esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/&lt;(\/?)strong&gt;/g, '<$1strong>');   // only <b>/<strong> pass
const fileUrl = (p) => 'file://' + path.resolve(p);
const ninja = (c) => fileUrl(path.join(ROOT, 'assets', 'ninjas', 'ninja-' + (c || 'blue') + '.svg'));

const brand = (spec, page) => `<div class="brand"><span>${esc(spec.brand || 'aivancity Tech Club · GDG on Campus')}</span>${page ? `<span class="pg">${page}</span>` : ''}</div>`;

function slide(spec, s, i, n, format) {
  const cls = `canvas ${format}${s.navy ? ' navy' : ''}`, pg = format === 'post' && n > 1 ? `${i + 1}/${n}` : '';
  const head = `${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}`;
  let body = '';
  if (s.kind === 'cover') body = `${head}<h1>${rich(s.title)}</h1>${s.lede ? `<p class="lede">${esc(s.lede)}</p>` : ''}${s.chip ? `<span class="chip">${esc(s.chip)}</span>` : ''}<img class="ninja" src="${ninja(s.ninja)}" alt="">`;
  if (s.kind === 'list') body = `${head}<h2>${rich(s.title)}</h2><div class="items">${s.items.map((t, k) => `<div class="item card"><span class="n">${k + 1}</span>${esc(t)}</div>`).join('')}</div>${s.lede ? `<p class="lede">${esc(s.lede)}</p>` : ''}`;
  if (s.kind === 'facts') body = `${head}<h2>${rich(s.title)}</h2><div class="facts card thursday">${s.facts.map(([k, v]) => `<div class="fact"><span>${esc(k)}</span>${esc(v)}</div>`).join('')}</div>${s.lede ? `<p class="lede">${esc(s.lede)}</p>` : ''}`;
  if (s.kind === 'cta') body = `${head}<h2>${rich(s.title)}</h2>${s.lede ? `<p class="lede">${esc(s.lede)}</p>` : ''}${s.qr ? `<div class="qr"><img src="${fileUrl(s.qr)}" alt=""></div>` : ''}${s.url ? `<p class="url">${esc(s.url)}</p>` : ''}${s.button ? `<span class="big-cta">${esc(s.button)}</span>` : ''}${s.ninja ? `<img class="ninja" style="width:380px" src="${ninja(s.ninja)}" alt="">` : ''}`;
  return `<div class="${cls}">${body}${brand(spec, pg)}</div>`;
}

function reel(spec) {
  let t = 0;
  const beats = spec.reel.beats.map((b, k, all) => {
    const last = k === all.length - 1, start = t; t += b.seconds;
    const tags = (b.tags || []).map((g, j) => `<span class="tag" style="animation-delay:${start + 0.35 + j * 0.25}s">${esc(g)}</span>`).join('');
    return `<div class="beat" style="animation:${last ? 'beatLast' : 'beat'} ${b.seconds}s ${start}s both">${b.eyebrow ? `<p class="eyebrow">${esc(b.eyebrow)}</p>` : ''}<h1>${rich(b.title)}</h1>${b.lede ? `<p class="lede">${esc(b.lede)}</p>` : ''}${tags ? `<div class="tags">${tags}</div>` : ''}</div>`;
  }).join('');
  return { html: `<div class="reel"><div class="stars"></div>${beats}<img class="ninja" src="${ninja(spec.reel.ninja)}" alt="">${brand(spec)}</div>`, seconds: t };
}

const page = (inner) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><link rel="stylesheet" href="${fileUrl(path.join(__dirname, 'studio.css'))}"></head><body>${inner}</body></html>`;

async function shoot(browser, html, w, h, file) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const tmp = file + '.html'; fs.writeFileSync(tmp, page(html));
  await p.goto(fileUrl(tmp)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path: file }); await p.close(); fs.unlinkSync(tmp);
}

(async () => {
  const [specPath, outDir] = process.argv.slice(2);
  if (!specPath || !outDir) { console.error('usage: node render.js SPEC.json OUT_DIR'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const resolveQr = (s) => s.qr ? { ...s, qr: path.resolve(path.dirname(specPath), s.qr) } : s;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const made = [];

  const slides = (spec.carousel || []).map(resolveQr);
  for (let i = 0; i < slides.length; i++) { const f = path.join(outDir, `carousel-${i + 1}.png`); await shoot(browser, slide(spec, slides[i], i, slides.length, 'post'), 1080, 1350, f); made.push(f); }
  if (slides.length) {   // the same slides as one PDF, for a LinkedIn document post
    const p = await browser.newPage({ viewport: { width: 1080, height: 1350 } }), tmp = path.join(outDir, 'deck.html');
    fs.writeFileSync(tmp, page(slides.map((s, i) => slide(spec, s, i, slides.length, 'post')).join('')).replace('</head>', '<style>@page{size:1080px 1350px;margin:0}.canvas{break-after:page}</style></head>'));
    await p.goto(fileUrl(tmp)); await p.evaluate(() => document.fonts.ready);
    const pdf = path.join(outDir, 'linkedin-carousel.pdf'); await p.pdf({ path: pdf, width: '1080px', height: '1350px', printBackground: true });
    await p.close(); fs.unlinkSync(tmp); made.push(pdf);
  }
  const stories = (spec.stories || []).map(resolveQr);
  for (let i = 0; i < stories.length; i++) { const f = path.join(outDir, `story-${i + 1}.png`); await shoot(browser, slide(spec, stories[i], i, 1, 'story'), 1080, 1920, f); made.push(f); }

  if (spec.reel) {   // frame by frame, so the video is smooth whatever the machine's speed
    const { html, seconds } = reel(spec), fps = 30, frames = Math.round(seconds * fps), dir = path.join(outDir, 'frames');
    fs.mkdirSync(dir, { recursive: true });
    const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } }), tmp = path.join(outDir, 'reel.html');
    fs.writeFileSync(tmp, page(html)); await p.goto(fileUrl(tmp)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    for (let k = 0; k < frames; k++) {
      await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), (k / fps) * 1000);
      await p.screenshot({ path: path.join(dir, String(k).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
      if (k === frames - 1) await p.screenshot({ path: path.join(outDir, 'reel-cover.png') });
    }
    await p.close(); fs.unlinkSync(tmp);
    const mp4 = path.join(outDir, 'reel.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, '%05d.jpg'),
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',   // a silent sound track: some apps refuse videos without one
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-movflags', '+faststart', mp4]);
    fs.rmSync(dir, { recursive: true, force: true }); made.push(mp4, path.join(outDir, 'reel-cover.png'));
  }
  await browser.close();
  console.log(made.map((f) => path.relative(process.cwd(), f)).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
