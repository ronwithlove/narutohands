// End-to-end check of the built site with synthetic hands (no webcam needed): the demo, the Gesture
// Lab and the example game must react to gestures through the real engine.
// Usage: npm run build && npm run e2e      (set CHROMIUM_PATH to use a specific Chromium binary)
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4317);
const URL = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
const stopServer = () => server.kill();
process.on('exit', stopServer);

for (let i = 0; ; i++) {
  try { if ((await fetch(URL)).ok) break; } catch { /* not up yet */ }
  if (i > 100) { console.error('preview server did not start (did you run `npm run build`?)'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 100));
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

// scripted clips, built in the page from the kit's synthetic hands
// (a string so it can be eval'd inside the page, where H = syntheticHand and P = SYNTHETIC_POSES)
const CLIPS = `(() => {
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const ramp = (i, a, n) => Math.min(1, Math.max(0, (i - a) / n));
  return {
    tap: (x, y) => [...rep(8, () => [H(x, y, P.open)]), ...rep(4, () => [H(x, y, P.pinch)]), ...rep(8, () => [H(x, y, P.open)])],
    swipeRight: () => rep(20, (i) => [H(0.25 + 0.5 * ramp(i, 6, 8), 0.5, P.open)]),
    circle: () => rep(45, (i) => { const a = (i / 30) * 2 * Math.PI; return [H(0.5 + 0.1 * Math.cos(a), 0.45 + 0.1 * Math.sin(a), P.point)]; }),
    clap: () => rep(18, (i) => { const d = 0.25 - 0.25 * ramp(i, 6, 6); return [H(0.5 - d, 0.5, P.open, { handedness: 'Left' }), H(0.5 + d, 0.5, P.open)]; }),
    gap: () => rep(12, () => []),
  };
})()`;

// ---------------------------------------------------------------- demo
await page.goto(URL + 'demo.html');
await page.waitForFunction(() => window.__demo);
await page.evaluate(() => { const { hands, syntheticHand: H, POSES: P } = window.__demo; hands.inject([H(0.5, 0.5, P.fist)]); });
await page.waitForFunction(() => window.__demo.hands.frame.hands[0]?.pose === 'fist', null, { timeout: 5000 }).catch(() => {});
let pose = await page.evaluate(() => window.__demo.hands.frame.hands[0]?.pose);
check('demo: a held fist is recognised', pose === 'fist', `pose=${pose}`);
const fired = await page.evaluate((CLIPS) => {
  const { hands, syntheticHand: H, POSES: P } = window.__demo;
  hands.inject(null);
  const clips = eval(CLIPS);
  const names = (clip) => { hands.feed(clips.gap()); return hands.feed(clip).flatMap((f) => f.events.map((e) => e.name)); };
  return { tap: names(clips.tap(0.5, 0.5)), swipe: names(clips.swipeRight()), circle: names(clips.circle()), clap: names(clips.clap()) };
}, CLIPS);
check('demo: pinch tap', fired.tap.includes('tap'), fired.tap.join(','));
check('demo: swipe right', fired.swipe.includes('swipe-right'), fired.swipe.join(','));
check('demo: circle', fired.circle.some((n) => n.startsWith('circle')), fired.circle.join(','));
check('demo: clap', fired.clap.includes('clap'), fired.clap.join(','));
await page.click('#b-synth');
await page.waitForTimeout(6000);
const logged = await page.evaluate(() => window.__demo.log.map((e) => e.name));
check('demo: synthetic show drives the event log', new Set(logged).size >= 4, [...new Set(logged)].join(','));

// ---------------------------------------------------------------- lab
await page.goto(URL + 'lab.html');
await page.waitForFunction(() => window.__lab);
await page.evaluate(() => { const L = window.__lab; L.inject([L.fake(0.5, 0.5, { curl: [1, 0, 0, 1, 1], pinch: 0, spread: 3 })]); });
await page.waitForTimeout(500);
pose = await page.evaluate(() => window.__lab.frame.hands[0]?.pose);
check('lab: peace sign recognised', pose === 'victory', `pose=${pose}`);

// ---------------------------------------------------------------- example game
await page.goto(URL + 'pop.html');
await page.waitForFunction(() => window.__pop);
const game = await page.evaluate((CLIPS) => {
  const G = window.__pop, { hands, syntheticHand: H, POSES: P } = G;
  const clips = eval(CLIPS);
  G.start();
  const tap = clips.tap(0.5, 0.5);
  hands.feed(tap.slice(0, 12)); // open hand, then pinch: read where the fingertips meet
  const p = G.pinchPoint(0);
  G.spawnAt(p.x, p.y);
  const before = G.state.score;
  hands.feed(tap.slice(12)); // release = tap
  const afterTap = G.state.score;
  hands.feed(clips.gap());
  for (let i = 0; i < 4; i++) G.spawnAt(200 + i * 150, 300);
  const n = G.state.balloons;
  hands.feed(clips.clap());
  return { before, afterTap, n, afterClap: G.state.balloons, score: G.state.score };
}, CLIPS);
check('game: pinch tap pops the balloon at your fingertips', game.afterTap > game.before, JSON.stringify(game));
check('game: clap pops every balloon', game.n >= 4 && game.afterClap === 0, JSON.stringify(game));

// The language switch must preserve an unsaved sequence and persist across page loads.
await page.goto(URL + 'seal.html#compose');
// The page should load every seal shipped in public/defaults/hand-seals.json (however many that is).
const defaultSeals = Object.keys(JSON.parse(readFileSync(join(root, 'public/defaults/hand-seals.json'), 'utf8')).seals).length;
const expectedProgress = `${defaultSeals} / 12`;
await page.waitForFunction((prefix) => document.querySelector('#progress')?.textContent?.startsWith(prefix), expectedProgress);
check(`seal defaults: provided samples loaded (${expectedProgress})`, (await page.locator('#progress').innerText()).startsWith(expectedProgress));
await page.locator('[data-add-seal="子"]').click();
await page.locator('.language-select').selectOption('en');
check('language: English labels and draft preserved', (await page.locator('#page-title').innerText()) === 'Create your jutsu' && (await page.locator('#draft').innerText()).includes('Rat') && (await page.locator('#technique-list').innerText()).includes('Fire Style: Great Fireball'));
await page.reload();
check('language: English selection persists', (await page.locator('.language-select').inputValue()) === 'en' && (await page.locator('#page-title').innerText()) === 'Create your jutsu');
await page.locator('.language-select').selectOption('zh');
check('language: Chinese can be restored', (await page.locator('#page-title').innerText()) === '创建你的忍术');

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
stopServer();
const pass = results.filter(Boolean).length;
console.log(`${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
