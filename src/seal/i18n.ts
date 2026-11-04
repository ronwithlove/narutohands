export type Language = 'zh' | 'en';
const key = 'naruto-seal-language-v1';
let language: Language = 'zh';
try { if (localStorage.getItem(key) === 'en') language = 'en'; } catch { /* Use Chinese when storage is unavailable. */ }
const names: Record<string, string> = { 子:'Rat', 丑:'Ox', 寅:'Tiger', 卯:'Rabbit', 辰:'Dragon', 巳:'Snake', 午:'Horse', 未:'Ram', 申:'Monkey', 酉:'Bird', 戌:'Dog', 亥:'Boar' };
export function sealLabel(seal: string): string { return language === 'en' && names[seal] ? `${names[seal]} (${seal})` : seal; }
export function compactSeal(seal: string): string { return language === 'en' && names[seal] ? `${names[seal]}` : seal; }
const defaultJutsu: Record<string, string> = { '火遁·豪火球':'Fire Style: Great Fireball', '火遁・龍火':'Fire Style: Dragon Fire', '水遁・雨刺鲛':'Water Style: Rain Spear Shark' };
export function jutsuLabel(name: string): string { return language === 'en' ? (defaultJutsu[name] ?? name) : name; }
const exact: Record<string,string> = {
  '忍术练习':'Ninjutsu Practice','手势录制':'Record Seals','忍术录入':'Create Jutsu','手势 Demo':'Gesture Demo',
  '手势数据保存在此浏览器':'Gesture data stays in this browser','先打开摄像头':'Turn on your camera','请将双手放在画面内，保持光线充足。':'Keep your hands in view and use good lighting.','打开摄像头':'Start camera',
  '十二结印':'12 Hand Seals','选择一个结印，参考画面中的手势进行录制。':'Select a seal and use the image as a reference.','当前结印顺序':'Jutsu sequence',
  '点击下方结印，按顺序添加；相同手势间隔 2 秒可再次计入。':'Select seals in order. Repeated seals count again after 2 seconds.',
  '结印提示':'Hand seal guide','开始录制':'Start recording','倒数 3 秒准备，然后录制 5 秒。保持结印，缓慢调整角度。':'Get ready for 3 seconds, then record for 5 seconds. Hold the seal and slowly change angles.',
  '验证当前结印':'Test selected seal','识别全部已录结印':'Recognize all recorded seals','下载已录结印':'Export hand seals','导入结印文件':'Import hand seals',
  '下载为 JSON 文件，可以备份或分享给其他人导入。':'Download a JSON backup to share or import later.',
  '点击结印来配置顺序，输入名称后保存。练习前请在手势录制中录好对应动作。':'Choose seals in order, enter a name, and save. Record each hand seal before practicing.',
  '撤销最后一个':'Undo last','清空顺序':'Clear sequence','忍术名称':'Jutsu name','保存忍术':'Save jutsu','已保存的忍术':'Saved jutsu',
  '导出忍术配置':'Export jutsu','导入忍术配置':'Import jutsu','忍术文件保存名称和结印顺序；手势录制数据可在「手势录制」页面另行导出。':'Jutsu files contain names and sequences. Export recorded hand seals separately on the Record Seals page.',
  '系统会在已保存的忍术中匹配你做出的结印顺序。':'Your sequence is matched against your saved jutsu.',
  '打开摄像头后，开始录制。':'Start the camera to record.','已录制，可以练习':'Recorded and ready to practice','等待录制':'Waiting to record',
  '录制和练习时，识别到一只或两只手都可以匹配对应的样本。':'One-hand and two-hand detections are matched against their corresponding samples.',
  '请让双手出现在画面中':'Keep your hands in view','保持住…':'Hold that pose…','调整一下姿势':'Adjust your pose',
  '正在录制：保持结印，缓慢调整角度。':'Recording: hold the seal and slowly change angles.',
  '没有识别到手，未保存录制。请调整角度后重试。':'No hands detected. Nothing was saved; adjust your pose and try again.',
  '录制未完成':'Recording incomplete','浏览器无法保存，本次关闭页面后录制会丢失。':'Could not save in the browser. This recording will be lost when you close the page.',
  '录制完成！选择一种练习方式，再摆出结印。':'Recording complete! Choose a test and show the seal again.','录制完成':'Recording complete',
  '准备好后点击开始录制。':'When ready, start recording.','准备录制':'Get ready','准备：倒数结束后开始录制。':'Get ready: recording starts after the countdown.',
  '请先打开摄像头。':'Start the camera first.','请摆出结印':'Show a hand seal',
  '正在识别全部已录结印，摆出任意一个并保持片刻。':'Recognizing all recorded seals. Show one and hold it briefly.',
  '等待摄像头画面':'Waiting for the camera','点击下方结印，添加到顺序中':'Select seals below to build a sequence',
  '还没有保存忍术。':'No jutsu saved yet.','练习已结束':'Practice ended','等待开始':'Not started',
  '请先在手势录制中录入单个手势。':'Record individual hand seals first.','每个顺序最多添加 50 个结印。':'A sequence can have at most 50 seals.',
  '请输入忍术名称。':'Enter a jutsu name.','请先录入结印顺序。':'Add a seal sequence first.','已达到保存数量上限。':'The saved jutsu limit has been reached.',
  '这个名称已存在，请换一个名称。':'That name already exists. Choose another.','这个结印顺序已存在，请调整顺序。':'That sequence already exists. Change the sequence.',
  '保存失败，请检查浏览器存储空间。':'Could not save. Check your browser storage.','结束练习':'End practice','开始练习':'Start practice',
  '请先在忍术录入中保存一个顺序。':'Save a jutsu sequence first.','正在识别，请按顺序结印。':'Recognizing. Perform the seals in order.',
  '文件太大':'File is too large','连招数据无效':'Invalid jutsu data','文件无效':'Invalid file','文件格式无效':'Invalid file format','文件格式或版本不受支持':'Unsupported file format or version','文件中包含无效的结印数据':'The file contains invalid hand seal data','文件里没有结印':'The file contains no hand seals','文件中没有有效的忍术数据':'The file contains no valid jutsu','忍术数量超过上限':'Too many jutsu',
  '没有新增结印。':'No new hand seals were added.','没有新增忍术。':'No new jutsu were added.',
  '添加':'Add','已录':'Saved','未录':'New','录下单个手势':'Record a hand seal','录制每个结印的不同角度，供忍术录入和忍术练习识别。':'Record hand seals from different angles for jutsu practice.',
  '创建你的忍术':'Create your jutsu','点击选择结印顺序，保存为一个有名字的连招。':'Choose a sequence of seals and save it as a named jutsu.',
  '开始忍术练习':'Practice your jutsu','按照已保存的顺序结印，完成后显示对应名称。':'Perform a saved sequence to reveal its name.',
  '无法读取已保存的录制。':'Could not load saved recordings.', 'camera off':'camera off',
};
const substitutions: Array<[RegExp,(...args: string[])=>string]> = [
  [/^(\d+) \/ 12 已录$/, n=>`${n} / 12 recorded`], [/^当前：(.+)$/, n=>`Selected: ${sealLabel(n)}`],
  [/^准备好后录制「(.+)」。$/, n=>`Ready to record ${sealLabel(n)}.`], [/^已加载「(.+)」的录制$/, n=>`Loaded the recording for ${sealLabel(n)}.`],
  [/^已保存「(.+)」$/, n=>`Saved ${sealLabel(n)}`], [/^已保存「(.+)」。$/, n=>`Saved “${n}”.`],
  [/^录制 (\d+)$/, n=>`Recording ${n}`], [/^录制完成，但只识别到 (\d+) 帧，建议重新录制。$/, n=>`Recorded only ${n} frames. Try recording again.`],
  [/^无法打开摄像头：(.+)。请允许摄像头权限。$/, n=>`Camera unavailable: ${n}. Please allow camera access.`],
  [/^正在验证「(.+)」，保持片刻。$/, n=>`Testing ${sealLabel(n)}. Hold it briefly.`], [/^识别到「(.+)」$/, n=>`Recognized: ${sealLabel(n)}`],
  [/^手速 (.+) 秒$/, n=>`Time ${n} s`], [/^(\d+) 个$/, n=>`${n} ${n === '1' ? 'seal' : 'seals'}`],
  [/^已导出 (\d+) 个结印。$/, n=>`Exported ${n} hand seals.`], [/^已导出 (\d+) 个忍术。$/, n=>`Exported ${n} jutsu.`],
  [/^导入失败：(.+)$/, n=>`Import failed: ${translate(n)}`], [/^✓ ([子丑寅卯辰巳午未申酉戌亥])$/, n=>`✓ ${sealLabel(n)}`], [/^✓ (.+)$/, n=>`✓ ${jutsuLabel(n)}`],
];
export function translate(text: string): string {
  if (language !== 'en' || !text) return text;
  if (exact[text]) return exact[text];
  for (const [pattern, convert] of substitutions) { const m = text.match(pattern); if (m) return convert(...m.slice(1)); }
  // Import summaries contain several independent clauses.
  if (text.includes('已导入：') || text.includes('没有新增') || text.includes('已保留')) {
    return text.split('。').filter(Boolean).map(part=> {
      if (part.startsWith('已导入：')) return `Imported: ${part.slice(4)}`;
      if (part.startsWith('已保留本机已有的：')) return `Kept existing: ${part.slice(9)}`;
      if (part.startsWith('已保留已有的：')) return `Kept existing: ${part.slice(7)}`;
      if (part === '没有新增结印') return 'No new hand seals were added';
      if (part === '没有新增忍术') return 'No new jutsu were added';
      const match=part.match(/^已导入 (\d+) 个连招$/); return match ? `Imported ${match[1]} jutsu` : part;
    }).join('. ') + '.';
  }
  return text;
}
const dynamic = new Map<HTMLElement,string>();
export function setMessage(el: HTMLElement, value: string) { dynamic.set(el, value); el.textContent = translate(value); }
let staticNodes: Array<{node: Text; source: string}> = [];
let onChange = () => {};
export function initLanguage(callback: () => void = () => {}) {
  onChange = callback;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text=node as Text, source=text.data.trim();
    if (source && exact[source]) staticNodes.push({node:text, source});
  }
  const select = document.createElement('select'); select.className='language-select'; select.setAttribute('aria-label','Language / 语言');
  select.innerHTML='<option value="zh">中文</option><option value="en">English</option>'; select.value=language;
  document.querySelector('header')?.append(select);
  select.onchange=()=>{language=select.value === 'en' ? 'en' : 'zh'; try { localStorage.setItem(key,language); } catch { /* Keep the current selection for this session. */ } applyLanguage(); onChange();};
  applyLanguage();
}
export function applyLanguage() {
  document.documentElement.lang=language === 'en' ? 'en' : 'zh-CN';
  for (const {node,source} of staticNodes) if (node.isConnected) node.data=translate(source);
  for (const [el,source] of dynamic) if (el.isConnected) el.textContent=translate(source);
  const title=document.querySelector('title'); if(title && title.textContent !== 'Hand Gesture Kit · Demo') title.textContent=translate('忍术练习');
  const placeholder=document.getElementById('technique-name') as HTMLInputElement | null;
  if(placeholder) placeholder.placeholder=language === 'en' ? 'e.g. Fire Style: Flame Dragon' : '例如：火遁·炎龙之术';
  const labels: Record<string,[string,string]>={seals:['选择结印','Select a hand seal'], 'compose-seals':['选择结印顺序','Choose a jutsu sequence'], 'practice-guide':['十二结印提示','Hand seal guide']};
  for(const [id,values] of Object.entries(labels)) document.getElementById(id)?.setAttribute('aria-label', values[language === 'en' ? 1 : 0]);
}
