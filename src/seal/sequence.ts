import { sealNames } from './transfer';
export interface Technique { name: string; seals: string[] }
export function validTechniques(value: unknown): value is Technique[] {
  return Array.isArray(value) && value.length <= 200 && value.every(t => t && typeof t.name === 'string' && t.name.trim().length > 0 && t.name.length <= 40 && Array.isArray(t.seals) && t.seals.length > 0 && t.seals.length <= 50 && t.seals.every((s: unknown) => typeof s === 'string' && sealNames.includes(s as typeof sealNames[number])));
}
// A repeated seal is accepted after two seconds; a deliberate release after completion may rearm it sooner.
export class SealEvents {
  private last: string | null = null;
  private lastAt = 0;
  private afterCompletion = false;
  private releaseSince: number | null = null;
  update(confirmed: string | null, now: number): string | null {
    if (!confirmed) {
      if (this.afterCompletion) {
        if (this.releaseSince === null) this.releaseSince = now;
        if (now - this.releaseSince >= 300) { this.last = null; this.afterCompletion = false; this.releaseSince = null; }
      }
      return null;
    }
    this.releaseSince = null;
    if (confirmed === this.last && now - this.lastAt < 2000) return null;
    this.last = confirmed; this.lastAt = now; this.afterCompletion = false;
    return confirmed;
  }
  completed() { this.afterCompletion = true; this.releaseSince = null; }
  reset() { this.last = null; this.lastAt = 0; this.afterCompletion = false; this.releaseSince = null; }
}
export function completedTechnique(history: string[], techniques: Technique[]): Technique | null {
  return techniques.filter(t => t.seals.length <= history.length && t.seals.every((seal, i) => seal === history[history.length - t.seals.length + i])).sort((a, b) => b.seals.length - a.seals.length)[0] ?? null;
}
// Times correspond to accepted gestures; a match may start after unrelated earlier gestures.
export function techniqueDuration(times: number[], length: number): number {
  if (length < 1 || length > times.length) throw new Error('Invalid sequence length');
  return Math.max(0, times[times.length - 1] - times[times.length - length]);
}

export const DEFAULT_TECHNIQUES: Technique[] = [
  { name: '火遁·豪火球', seals: ['巳', '未', '申', '亥', '午', '寅'] },
  { name: '火遁・龍火', seals: ['巳', '辰', '卯', '寅'] },
  { name: '水遁・雨刺鲛', seals: ['未', '戌', '子', '戌', '未'] },
];
export function mergeTechniques(existing: Technique[], incoming: Technique[]): { merged: Technique[]; added: string[]; skipped: string[] } {
  const merged = [...existing], names = new Set(existing.map(t => t.name)), added: string[] = [], skipped: string[] = [];
  for (const technique of incoming) {
    if (names.has(technique.name)) { skipped.push(technique.name); continue; }
    names.add(technique.name); merged.push(technique); added.push(technique.name);
  }
  if (merged.length > 200) throw new Error('忍术数量超过上限');
  return { merged, added, skipped };
}
export function parseTechniquesFile(value: unknown): Technique[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('文件格式无效');
  const data = value as Record<string, unknown>;
  if ((data.format !== 'naruto-techniques' && data.format !== 'naruto-seals') || data.version !== 1 || !validTechniques(data.techniques) || data.techniques.length === 0) throw new Error('文件中没有有效的忍术数据');
  return data.techniques;
}
