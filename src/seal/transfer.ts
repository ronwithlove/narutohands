import type { Sample } from './match';

export const sealNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type Library = Record<string, Sample[]>;
export function validSamples(value: unknown): value is Sample[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 1000 && value.every((s: unknown) => Array.isArray(s) && (s.length === 1 || s.length === 2) && s.every((h: unknown) => Array.isArray(h) && h.length === 42 && h.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10)));
}
export function parseLibrary(value: unknown): Library {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('文件格式无效');
  const source = value as Record<string, unknown>;
  if (source.format !== 'naruto-seals' || source.version !== 1 || !source.seals || typeof source.seals !== 'object' || Array.isArray(source.seals)) throw new Error('文件格式或版本不受支持');
  const result: Library = {};
  for (const [name, samples] of Object.entries(source.seals)) {
    if (!sealNames.includes(name as typeof sealNames[number]) || !validSamples(samples)) throw new Error('文件中包含无效的结印数据');
    result[name] = samples;
  }
  if (!Object.keys(result).length) throw new Error('文件里没有结印');
  return result;
}
export function mergeMissing(current: Library, imported: Library): { merged: Library; added: string[]; skipped: string[] } {
  const merged = { ...current }, added: string[] = [], skipped: string[] = [];
  for (const [name, samples] of Object.entries(imported)) {
    if (merged[name]) skipped.push(name);
    else { merged[name] = samples; added.push(name); }
  }
  return { merged, added, skipped };
}
