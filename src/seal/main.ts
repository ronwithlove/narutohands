import { initLanguage, setMessage, translate, sealLabel, compactSeal, jutsuLabel } from './i18n';
import { createHands, drawHand, type GestureFrame } from '../kit';
import { sampleHands, bestMatch, StableMatch, type Sample } from './match';
import { sealNames as seals, validSamples, parseLibrary, mergeMissing, type Library } from './transfer';
import { SealEvents, completedTechnique, validTechniques, techniqueDuration, DEFAULT_TECHNIQUES, mergeTechniques, parseTechniquesFile, type Technique } from './sequence';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const setText = (id: string, value: string) => setMessage($(id), value);
initLanguage(() => { refreshList(); updateDraft(); updateTechniques(); renderGuides(); document.querySelectorAll<HTMLElement>('[data-seal-label]').forEach(el => { el.textContent = compactSeal(el.dataset.sealLabel!); }); document.querySelectorAll<HTMLElement>('[data-jutsu-label]').forEach(el => { el.textContent = jutsuLabel(el.dataset.jutsuLabel!); }); });
const video = $<HTMLVideoElement>('camera'), canvas = $<HTMLCanvasElement>('overlay'), ctx = canvas.getContext('2d')!;
const record = $<HTMLButtonElement>('record'), practice = $<HTMLButtonElement>('practice'), practiceAll = $<HTMLButtonElement>('practice-all');
const recognizer = new StableMatch();
let practiceScope: 'current' | 'all' = 'current';
type Page = 'record' | 'compose' | 'practice';
let page: Page = 'practice', draft: string[] = [], history: string[] = [];
let historyTimes: number[] = [];
let techniques: Technique[] = [];
const techniqueKey = 'naruto-seal-techniques-v1';
const events = new SealEvents();
let displayUntil = 0;
try {
  const saved: unknown = JSON.parse(localStorage.getItem(techniqueKey) || '[]');
  if (!validTechniques(saved)) throw new Error('invalid techniques');
  const initial = mergeTechniques(saved, DEFAULT_TECHNIQUES);
  techniques = initial.merged;
  if (initial.added.length) localStorage.setItem(techniqueKey, JSON.stringify(techniques));
} catch { /* Never overwrite unreadable or unavailable stored data. */ }
function clearRecognition() { recognizer.reset(); $('recognized').hidden = true; $('recognized').textContent = ''; delete $('recognized').dataset.sealLabel; delete $('recognized').dataset.jutsuLabel; }
const storageKey = 'naruto-seal-templates-v2';
const legacyKey = 'naruto-seal-template-v1';
let selected: string = '子';
let library: Library = {};
function refreshList() {
  $('seals').innerHTML = seals.map((seal, index) => `<button type="button" class="seal-choice${selected === seal ? ' active' : ''}" data-seal="${seal}" aria-pressed="${selected === seal}" ${mode === 'countdown' || mode === 'recording' ? 'disabled' : ''}><span class="seal-image" style="--image-x:${(index % 4) * 100 / 3}%;--image-y:${Math.floor(index / 4) * 50}%" aria-hidden="true"></span><span class="seal-caption"><span>${sealLabel(seal)}</span><small>${translate(library[seal] ? '已录' : '未录')}</small></span></button>`).join('');
  setText('progress', `${seals.filter(seal => library[seal]).length} / 12 已录`);
  const busy = mode === 'countdown' || mode === 'recording';
  $<HTMLButtonElement>('export').disabled = !Object.keys(library).length;
  practice.disabled = busy || !library[selected];
  practiceAll.disabled = busy || !Object.keys(library).length;
  setText('selected', `当前：${selected}`);
}
function selectSeal(seal: string) {
  selected = seal; samples = library[seal] ?? []; mode = 'idle'; clearRecognition();
  setText('instruction', cameraOn ? `准备好后录制「${seal}」。` : '打开摄像头后，开始录制。');
  setText('result', samples.length ? '已录制，可以练习' : '等待录制');
  $('result').classList.remove('success');
  setText('detail', '录制和练习时，识别到一只或两只手都可以匹配对应的样本。');
  setText('saved', samples.length ? `已加载「${seal}」的录制` : '');
  refreshList();
}
$('seals').onclick = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-seal]');
  if (button?.dataset.seal) selectSeal(button.dataset.seal);
};
let samples: Sample[] = [], captured: Sample[] = [];
let mode: 'idle' | 'countdown' | 'recording' | 'practice' | 'sequence-practice' = 'idle';
let cameraOn = false, phaseStart = 0, raf = 0;
let lastFrameTime = 0;
try {
  const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (saved && typeof saved === 'object') for (const seal of seals) {
    const value = (saved as Record<string, unknown>)[seal];
    if (validSamples(value)) library[seal] = value;
  }
  // Preserve the original single recording; import it only when its name identifies a seal.
  const legacy: unknown = JSON.parse(localStorage.getItem(legacyKey) || 'null');
  if (legacy && typeof legacy === 'object' && 'name' in legacy && 'samples' in legacy && typeof legacy.name === 'string' && validSamples(legacy.samples)) {
    const seal = seals.find(s => legacy.name === s);
    if (seal && !library[seal]) library[seal] = legacy.samples;
  }
} catch { setText('saved', '无法读取已保存的录制。'); }
selectSeal(selected);
// Defaults are public reference samples; existing personal recordings always take precedence.
async function loadDefaultSeals() {
  try {
    const response = await fetch(new URL('defaults/hand-seals.json', document.baseURI));
    if (!response.ok) return;
    const defaults = parseLibrary(await response.json());
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return;
    const latest: Library = {};
    for (const seal of seals) {
      const value = (stored as Record<string, unknown>)[seal];
      if (value !== undefined && !validSamples(value)) return;
      if (validSamples(value)) latest[seal] = value;
    }
    const current = { ...library, ...latest };
    const { merged, added } = mergeMissing(current, defaults);
    if (added.length) localStorage.setItem(storageKey, JSON.stringify(merged));
    library = merged;
    samples = library[selected] ?? [];
    refreshList();
    if (mode === 'idle' && samples.length) {
      setText('result', '已录制，可以练习');
      setText('saved', `已加载「${selected}」的录制`);
    }
  } catch { /* The user can still record or import their own hand seals. */ }
}
void loadDefaultSeals();
const hands = createHands({ video, numHands: 2, onFrame: render });
function aspect() { return video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9; }
function render(frame: GestureFrame) {
  lastFrameTime = performance.now();
  const w = canvas.width = canvas.clientWidth * devicePixelRatio, h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  frame.hands.forEach((hand, i) => drawHand(ctx, hand.landmarks, w, h, { color: i ? '#ff9db0' : '#81d0ff', lineWidth: 3 * devicePixelRatio, jointRadius: 3 * devicePixelRatio }));
  const sample = sampleHands(frame.hands, aspect());
  const now = performance.now();
  if (mode === 'recording' && sample) captured.push(sample);
  if (mode === 'sequence-practice') { processSequence(sample, now); }
  if (mode === 'practice') {
    const candidates = practiceScope === 'current' ? { [selected]: samples } : library;
    const match = sample ? bestMatch(sample, candidates) : null;
    const confirmed = recognizer.update(match, now);
    const display = $('recognized');
    display.hidden = !confirmed;
    display.textContent = confirmed ? compactSeal(confirmed) : ''; if (confirmed) display.dataset.sealLabel = confirmed; else delete display.dataset.sealLabel;
    $('result').classList.toggle('success', Boolean(confirmed));
    setText('result', confirmed ? `✓ ${confirmed}` : !sample ? '请让双手出现在画面中' : match ? '保持住…' : '调整一下姿势');
  }
}
function tick(now: number) {
  if (mode !== 'countdown' && mode !== 'recording') return;
  const elapsed = now - phaseStart;
  if (mode === 'countdown') {
    setText('count', String(Math.max(1, 3 - Math.floor(elapsed / 1000))));
    if (elapsed >= 3000) { mode = 'recording'; phaseStart = now; setText('instruction', '正在录制：保持结印，缓慢调整角度。'); }
  } else {
    setText('count', `录制 ${Math.max(1, 5 - Math.floor(elapsed / 1000))}`);
    if (elapsed >= 5000) { finish(); return; }
  }
  raf = requestAnimationFrame(tick);
}
function finish() {
  mode = 'idle'; setText('count', ''); record.disabled = !cameraOn; refreshList();
  if (captured.length === 0) { setText('instruction', '没有识别到手，未保存录制。请调整角度后重试。'); setText('result', '录制未完成'); refreshList(); return; }
  samples = captured; library[selected] = samples; refreshList();
  try { localStorage.setItem(storageKey, JSON.stringify(library)); setText('saved', `已保存「${selected}」`); } catch { setText('saved', '浏览器无法保存，本次关闭页面后录制会丢失。'); }
  setText('instruction', captured.length < 10 ? `录制完成，但只识别到 ${captured.length} 帧，建议重新录制。` : '录制完成！选择一种练习方式，再摆出结印。'); setText('result', '录制完成'); $('result').classList.remove('success'); refreshList();
}
$('start-camera').onclick = async () => {
  try { await hands.startCamera(); cameraOn = true; (document.querySelector('.stage') as HTMLElement).style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`; $('cover').classList.add('hidden'); record.disabled = false; setText('instruction', '准备好后点击开始录制。'); if (page === 'practice') startSequencePractice(); }
  catch (e) { setText('error', `无法打开摄像头：${(e as Error).message}。请允许摄像头权限。`); }
};
record.onclick = () => { cancelAnimationFrame(raf); captured = []; clearRecognition(); mode = 'countdown'; phaseStart = performance.now(); record.disabled = true; refreshList(); setText('result', '准备录制'); $('result').classList.remove('success'); setText('instruction', '准备：倒数结束后开始录制。'); raf = requestAnimationFrame(tick); };
function startPractice(scope: 'current' | 'all') {
  if (!cameraOn) { setText('instruction', '请先打开摄像头。'); return; }
  practiceScope = scope; mode = 'practice'; clearRecognition();
  setText('result', '请摆出结印'); $('result').classList.remove('success');
  setText('instruction', scope === 'current' ? `正在验证「${selected}」，保持片刻。` : '正在识别全部已录结印，摆出任意一个并保持片刻。');
  setText('detail', '录制和练习时，识别到一只或两只手都可以匹配对应的样本。');
}
practice.onclick = () => startPractice('current');
practiceAll.onclick = () => startPractice('all');
// Reset the frame recognizer when the camera stops producing frames.
setInterval(() => {
  const now = performance.now();
  if (now - lastFrameTime <= 500) return;
  if (mode === 'practice') { clearRecognition(); setText('result', '等待摄像头画面'); $('result').classList.remove('success'); }
  else if (mode === 'sequence-practice') { clearRecognition(); setText('sequence-status', '等待摄像头画面'); }
}, 250);

$<HTMLButtonElement>('export').onclick = () => {
  const data = JSON.stringify({ format: 'naruto-seals', version: 1, seals: library, techniques }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = '结印数据.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('transfer-status', `已导出 ${Object.keys(library).length} 个结印。`);
};
const fileInput = $<HTMLInputElement>('import-file');
$('import').onclick = () => fileInput.click();
fileInput.onchange = async () => {
  const file = fileInput.files?.[0]; if (!file) return;
  try {
    if (file.size > 20_000_000) throw new Error('文件太大');
    const payload: unknown = JSON.parse(await file.text());
    const imported = parseLibrary(payload);
    const importedTechniques = (payload as { techniques?: unknown }).techniques ?? [];
    if (!validTechniques(importedTechniques)) throw new Error('连招数据无效');
    const techniqueMerge = mergeTechniques(techniques, importedTechniques);
    const newTechniques = techniqueMerge.added;
    const { merged, added, skipped } = mergeMissing(library, imported);
    // Write first so an unavailable storage never silently loses the imported data.
    localStorage.setItem(storageKey, JSON.stringify(merged));
    if (newTechniques.length) { localStorage.setItem(techniqueKey, JSON.stringify(techniqueMerge.merged)); techniques = techniqueMerge.merged; }
    library = merged; selectSeal(selected); updateTechniques();
    setText('transfer-status', `${added.length ? `已导入：${added.join('、')}。` : '没有新增结印。'}${skipped.length ? `已保留本机已有的：${skipped.join('、')}。` : ''}${newTechniques.length ? `已导入 ${newTechniques.length} 个连招。` : ''}`);
  } catch (e) { setText('transfer-status', `导入失败：${e instanceof Error ? e.message : '文件无效'}`); }
  finally { fileInput.value = ''; }
};

function sequenceDisplay(id: string, list: string[], empty: string, matchedCount = 0) {
  const container = $(id); container.replaceChildren();
  if (!list.length) { const placeholder = document.createElement('span'); placeholder.className = 'sequence-empty'; placeholder.textContent = translate(empty); container.append(placeholder); return; }
  list.forEach((seal, i) => { if (i) { const arrow = document.createElement('span'); arrow.textContent = '→'; arrow.className = i > list.length - matchedCount ? 'match-arrow' : 'hint'; container.append(arrow); } const chip = document.createElement('span'); chip.className = i >= list.length - matchedCount ? 'sequence-chip matched' : 'sequence-chip'; chip.dataset.sealLabel = seal; chip.textContent = compactSeal(seal); container.append(chip); });
}
function updateDraft() {
  sequenceDisplay('draft', draft, '点击下方结印，添加到顺序中');
  setText('draft-count', `${draft.length} 个`);
  $<HTMLButtonElement>('draft-undo').disabled = !draft.length;
  $<HTMLButtonElement>('draft-clear').disabled = !draft.length;
  $<HTMLButtonElement>('technique-save').disabled = !draft.length;
}
function updateTechniques() {
  $<HTMLButtonElement>('technique-export').disabled = !techniques.length;
  for (const id of ['technique-list', 'practice-techniques']) {
    const container = $(id); container.replaceChildren();
    if (!techniques.length) { const empty = document.createElement('p'); empty.className = 'hint'; empty.textContent = translate('还没有保存忍术。'); container.append(empty); }
    for (const technique of techniques) {
      const item = document.createElement('div'); item.className = 'technique-item';
      const title = document.createElement('strong'); title.textContent = jutsuLabel(technique.name);
      const steps = document.createElement('span'); steps.textContent = technique.seals.map(compactSeal).join(' → ');
      item.append(title, steps); container.append(item);
    }
  }
}
function resetSequence(message: string) {
  history = []; historyTimes = []; displayUntil = 0;
  $('live-history').hidden = true; $('recognized').hidden = true; $('recognized').textContent = ''; delete $('recognized').dataset.sealLabel; delete $('recognized').dataset.jutsuLabel;
  setText('sequence-status', message);
}
function processSequence(sample: Sample | null, now: number) {
  const match = sample ? bestMatch(sample, library) : null;
  const confirmed = recognizer.update(match, now);
  const event = events.update(confirmed, now);
  if (event) {
    history.push(event); history = history.slice(-50); historyTimes.push(now); historyTimes = historyTimes.slice(-50);
    const found = completedTechnique(history, techniques);
    sequenceDisplay('live-history', history, '', found?.seals.length ?? 0); $('live-history').hidden = false; $('live-history').scrollLeft = $('live-history').scrollWidth;
    $('recognized').textContent = found ? jutsuLabel(found.name) : compactSeal(event); if (found) { delete $('recognized').dataset.sealLabel; $('recognized').dataset.jutsuLabel = found.name; } else { delete $('recognized').dataset.jutsuLabel; $('recognized').dataset.sealLabel = event; } $('recognized').hidden = false;
    displayUntil = now + (found ? 2500 : 1000);
    setText('sequence-status', found ? `✓ ${found.name}` : `识别到「${event}」`);
    if (found) { events.completed(); const elapsed = techniqueDuration(historyTimes, found.seals.length); setText('speed-result', `手速 ${(elapsed / 1000).toFixed(2)} 秒`); $('speed-result').hidden = false; history = []; historyTimes = []; }
  }
  if (displayUntil && now >= displayUntil) {
    $('recognized').hidden = true; $('recognized').textContent = ''; delete $('recognized').dataset.sealLabel; delete $('recognized').dataset.jutsuLabel; displayUntil = 0;
  }
}
function switchPage() {
  const next = location.hash.slice(1);
  page = next === 'record' || next === 'compose' ? next : 'practice';
  cancelAnimationFrame(raf); mode = 'idle'; record.disabled = !cameraOn; clearRecognition(); events.reset(); history = []; historyTimes = []; $('speed-result').hidden = true;
  setText('count', ''); displayUntil = 0; $('live-history').hidden = true; $('camera-stage').hidden = page === 'compose'; refreshList();
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(el => { el.hidden = el.dataset.view !== page; });
  document.querySelectorAll<HTMLAnchorElement>('.page-nav a').forEach(el => { const active = el.dataset.page === page; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  const copy: Record<Page, [string, string, string]> = {
    record: ['手势录制', '录下单个手势', '录制每个结印的不同角度，供忍术录入和忍术练习识别。'],
    compose: ['忍术录入', '创建你的忍术', '点击选择结印顺序，保存为一个有名字的连招。'],
    practice: ['忍术练习', '开始忍术练习', '按照已保存的顺序结印，完成后显示对应名称。'],
  };
  setText('page-eyebrow', copy[page][0]); setText('page-title', copy[page][1]); setText('page-description', copy[page][2]);
  setText('sequence-status', '等待开始'); updatePracticeButton();
  if (page === 'practice' && cameraOn) startSequencePractice();
}
function readyForSequence(status: string): boolean {
  if (!cameraOn) { setText(status, '请先打开摄像头。'); return false; }
  if (!Object.keys(library).length) { setText(status, '请先在手势录制中录入单个手势。'); return false; }
  return true;
}
function renderGuides() {
$('practice-guide').innerHTML = seals.map((seal, index) => `<div class="guide-item"><span class="seal-image" style="--image-x:${(index % 4) * 100 / 3}%;--image-y:${Math.floor(index / 4) * 50}%" aria-hidden="true"></span><span class="guide-label">${compactSeal(seal)}</span></div>`).join('');
$('compose-seals').innerHTML = seals.map((seal, index) => `<button type="button" class="seal-choice" data-add-seal="${seal}" aria-label="${translate('添加')}${translate('添加') === '添加' ? '' : ' '}${sealLabel(seal)}"><span class="seal-image" style="--image-x:${(index % 4) * 100 / 3}%;--image-y:${Math.floor(index / 4) * 50}%" aria-hidden="true"></span><span class="seal-caption"><span>${sealLabel(seal)}</span></span></button>`).join('');
}
renderGuides();
$('compose-seals').onclick = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-add-seal]');
  if (!button?.dataset.addSeal) return;
  if (draft.length >= 50) { setText('compose-message', '每个顺序最多添加 50 个结印。'); return; }
  draft.push(button.dataset.addSeal); setText('compose-message', ''); updateDraft();
};
$('draft-undo').onclick = () => { draft.pop(); updateDraft(); };
$('draft-clear').onclick = () => { draft = []; updateDraft(); };
$('technique-save').onclick = () => {
  const input = $<HTMLInputElement>('technique-name'); const name = input.value.trim();
  if (!name) { setText('compose-message', '请输入忍术名称。'); input.focus(); return; }
  if (!draft.length) { setText('compose-message', '请先录入结印顺序。'); return; }
  if (techniques.length >= 200) { setText('compose-message', '已达到保存数量上限。'); return; }
  if (techniques.some(t => t.name === name)) { setText('compose-message', '这个名称已存在，请换一个名称。'); return; }
  if (techniques.some(t => t.seals.length === draft.length && t.seals.every((seal, i) => seal === draft[i]))) { setText('compose-message', '这个结印顺序已存在，请调整顺序。'); return; }
  const next = [...techniques, { name, seals: [...draft] }];
  try { localStorage.setItem(techniqueKey, JSON.stringify(next)); } catch { setText('compose-message', '保存失败，请检查浏览器存储空间。'); return; }
  techniques = next; draft = []; input.value = ''; mode = 'idle'; clearRecognition(); events.reset(); updateDraft(); updateTechniques(); setText('compose-message', `已保存「${name}」。`);
};
function updatePracticeButton() {
  const active = mode === 'sequence-practice';
  setText('sequence-practice', active ? '结束练习' : '开始练习');
  $('sequence-practice').setAttribute('aria-pressed', String(active));
}
function startSequencePractice() {
  if (!readyForSequence('sequence-status')) return;
  if (!techniques.length) { setText('sequence-status', '请先在忍术录入中保存一个顺序。'); return; }
  history = []; historyTimes = []; displayUntil = 0; $('live-history').hidden = true; $('speed-result').hidden = true; mode = 'sequence-practice'; clearRecognition(); events.reset(); setText('sequence-status', '正在识别，请按顺序结印。'); updatePracticeButton();
}
$('sequence-practice').onclick = () => {
  if (mode !== 'sequence-practice') { startSequencePractice(); return; }
  mode = 'idle'; recognizer.reset(); events.reset(); resetSequence('练习已结束'); updatePracticeButton();
};
window.addEventListener('hashchange', switchPage);
updateDraft(); updateTechniques(); switchPage();
// Development-only input for exercising the full UI without requesting a real webcam.
if (import.meta.env.DEV) Object.assign(window, { __sealTest: {
  enableCamera: () => { cameraOn = true; $('cover').classList.add('hidden'); record.disabled = false; },
  feed: (sample: Sample | null, time: number) => { if (mode === 'sequence-practice') processSequence(sample, time); },
} });

$('technique-export').onclick = () => {
  const payload = JSON.stringify({ format: 'naruto-techniques', version: 1, techniques }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = '忍术配置.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('technique-transfer-status', `已导出 ${techniques.length} 个忍术。`);
};
const techniqueFile = $<HTMLInputElement>('technique-import-file');
$('technique-import').onclick = () => techniqueFile.click();
techniqueFile.onchange = async () => {
  const file = techniqueFile.files?.[0]; if (!file) return;
  try {
    if (file.size > 20_000_000) throw new Error('文件太大');
    const incoming = parseTechniquesFile(JSON.parse(await file.text()));
    const result = mergeTechniques(techniques, incoming);
    if (result.added.length) { localStorage.setItem(techniqueKey, JSON.stringify(result.merged)); techniques = result.merged; }
    updateTechniques();
    setText('technique-transfer-status', `${result.added.length ? `已导入：${result.added.join('、')}。` : '没有新增忍术。'}${result.skipped.length ? `已保留已有的：${result.skipped.join('、')}。` : ''}`);
  } catch (e) { setText('technique-transfer-status', `导入失败：${e instanceof Error ? e.message : '文件无效'}`); }
  finally { techniqueFile.value = ''; }
};
