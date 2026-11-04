/**
 * The smallest complete app: camera → gesture engine → screen. Start here when wiring the kit into
 * something new. Everything interesting comes from `createHands` and `engine.on`.
 */
import { initLanguage } from '../seal/i18n';
initLanguage();
import { createHands, drawHand, MOTION_INFO, syntheticHand, SYNTHETIC_POSES as P, type GestureEvent, type HandInput } from '../kit';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('overlay');
const ctx = canvas.getContext('2d')!;
const COLORS = ['#7cc7ff', '#ff8fa3', '#7ee0b0', '#f6c453'];

const hands = createHands({ video: $<HTMLVideoElement>('cam'), onFrame: render });

// ---- events: every pose start/end, motion and two-hand gesture
const log: GestureEvent[] = [];
hands.engine.on('*', (e) => {
  if (e.kind === 'pose' && e.phase === 'end') return;
  log.unshift(e);
  log.length = Math.min(log.length, 40);
  $('log').innerHTML = log.map((ev) => `<li><span class="k">${ev.kind}</span><span>${label(ev.name)}${ev.hand !== undefined ? ` <span class="dim">hand ${ev.hand}</span>` : ''}</span></li>`).join('');
});

function label(name: string) {
  const pose = hands.engine.poses.find((p) => p.id === name);
  if (pose) return `${pose.emoji} ${pose.name}`;
  const m = MOTION_INFO[name];
  return m ? `${m.emoji} ${m.name}` : name;
}

// ---- draw the skeletons and the per-hand readout
function render() {
  const { frame } = hands;
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio), h = (canvas.height = canvas.clientHeight * devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  for (const hand of frame.hands) drawHand(ctx, hand.landmarks, w, h, { color: COLORS[hand.id % COLORS.length], lineWidth: 3 * devicePixelRatio, jointRadius: 4 * devicePixelRatio });
  $('hands').innerHTML = frame.hands.length
    ? frame.hands.map((hd) => `<div class="hand" style="border-color:${COLORS[hd.id % COLORS.length]}">
        <div class="pose">${hd.pose ? label(hd.pose) : '…'}</div>
        <div class="meta">hand ${hd.id} · ${hd.handedness} · confidence ${(hd.confidence * 100).toFixed(0)}% · pinch ${hd.pinch.toFixed(2)}</div>
      </div>`).join('') + (frame.twoHand.present ? `<p class="dim">two hands · zoom ${frame.twoHand.zoom.toFixed(2)}</p>` : '')
    : '<p class="dim">No hands yet</p>';
}

// ---- start: real camera, or a synthetic show for people without one
$('b-cam').onclick = async () => {
  try {
    await hands.startCamera();
    // match the stage to the camera's shape so the drawn skeleton lines up with the video
    const v = hands.video;
    (document.querySelector('.stage') as HTMLElement).style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
    $('start').classList.add('hidden');
    $('status').textContent = `camera on · ${hands.tracker.delegate}`;
  } catch (e) {
    $('err').textContent = `Camera unavailable: ${(e as Error).message}. Use https or localhost and allow camera access.`;
  }
};
$('b-synth').onclick = () => { $('start').classList.add('hidden'); $('status').textContent = 'synthetic hands'; requestAnimationFrame(show); };

const SHOW: [number, (u: number) => HandInput[]][] = [
  [1.6, () => [syntheticHand(0.5, 0.55, P.open)]],
  [1.6, () => [syntheticHand(0.5, 0.55, P.fist)]],
  [1.6, () => [syntheticHand(0.5, 0.55, P.point)]],
  [1.6, () => [syntheticHand(0.5, 0.55, P.victory)]],
  [1.6, () => [syntheticHand(0.5, 0.55, P.rock)]],
  [1.6, () => [syntheticHand(0.5, 0.55, P['thumbs-up'])]],
  [1.2, (u) => [syntheticHand(0.5, 0.55, u > 0.4 && u < 0.55 ? P.pinch : P.open)]],
  [1.4, (u) => [syntheticHand(0.25 + 0.5 * Math.min(1, Math.max(0, (u - 0.3) / 0.25)), 0.55, P.open)]],
  [2.0, (u) => [syntheticHand(0.5 + 0.12 * Math.cos(u * 4 * Math.PI), 0.55 + 0.12 * Math.sin(u * 4 * Math.PI), P.point)]],
  [1.4, (u) => { const d = 0.25 - 0.22 * Math.min(1, Math.max(0, (u - 0.3) / 0.25)); return [syntheticHand(0.5 - d, 0.55, P.open, { handedness: 'Left' }), syntheticHand(0.5 + d, 0.55, P.open)]; }],
  [0.8, () => []],
];
const TOTAL = SHOW.reduce((a, [d]) => a + d, 0);
let showStart = 0;
function show(now: number) {
  requestAnimationFrame(show);
  if (!showStart) showStart = now;
  let t = ((now - showStart) / 1000) % TOTAL;
  for (const [d, fn] of SHOW) { if (t < d) { hands.inject(fn(t / d)); return; } t -= d; }
}

declare global { interface Window { __demo: unknown } }
window.__demo = { hands, log, syntheticHand, POSES: P };
