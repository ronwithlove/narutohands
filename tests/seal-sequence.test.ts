import { describe, expect, it } from 'vitest';
import { SealEvents, completedTechnique, validTechniques, techniqueDuration, DEFAULT_TECHNIQUES, mergeTechniques, parseTechniquesFile } from '../src/seal/sequence';
describe('seal sequence', () => {
  it('ignores identical seals within two seconds and allows a different seal immediately', () => {
    const events = new SealEvents();
    expect(events.update('子', 0)).toBe('子');
    expect(events.update('子', 100)).toBeNull();
    expect(events.update(null, 150)).toBeNull();
    expect(events.update(null, 900)).toBeNull();
    expect(events.update('子', 1000)).toBeNull();
    expect(events.update('丑', 1100)).toBe('丑');
    expect(events.update('子', 1200)).toBe('子');
    events.reset();
    expect(events.update('子', 1300)).toBe('子');
  });
  it('accepts the same confirmed seal at two seconds, including after a gap', () => {
    const events = new SealEvents();
    expect(events.update('子', 100)).toBe('子');
    expect(events.update('子', 2099)).toBeNull();
    expect(events.update('子', 2100)).toBe('子');
    expect(events.update(null, 3000)).toBeNull();
    expect(events.update('子', 4099)).toBeNull();
    expect(events.update('子', 4100)).toBe('子');
  });
  it('allows a completed sequence to restart with the same seal after release', () => {
    const events = new SealEvents();
    expect(events.update('子', 0)).toBe('子');
    events.completed();
    expect(events.update('子', 100)).toBeNull();
    expect(events.update(null, 200)).toBeNull();
    expect(events.update(null, 499)).toBeNull();
    expect(events.update('子', 500)).toBeNull(); // brief tracking loss alone is not a release
    events.update(null, 600);
    events.update(null, 900);
    expect(events.update('子', 1000)).toBe('子');
  });
  it('accepts a different seal immediately after completion', () => {
    const events = new SealEvents();
    expect(events.update('子', 0)).toBe('子');
    events.completed();
    expect(events.update('丑', 100)).toBe('丑');
  });
  it('matches ordered suffixes and chooses the longest completed sequence', () => {
    const techniques = [{ name: '短', seals: ['丑'] }, { name: '长', seals: ['子', '丑'] }];
    expect(completedTechnique(['子'], techniques)).toBeNull();
    expect(completedTechnique(['寅', '子', '丑'], techniques)?.name).toBe('长');
    expect(completedTechnique(['丑', '子'], techniques)).toBeNull();
  });
  it('matches the most recent five gestures despite extra earlier gestures', () => {
    const technique = { name: '水遁・雨刺鲛', seals: ['未', '戌', '子', '戌', '未'] };
    expect(completedTechnique(['寅', '午', '巳', '未', '戌', '子', '戌', '未'], [technique])).toEqual(technique);
    expect(completedTechnique(['未', '戌', '子', '戌', '未', '午'], [technique])).toBeNull();
    expect(completedTechnique(['未', '戌', '丑', '子', '戌', '未'], [technique])).toBeNull();
  });
  it('validates saved sequences', () => {
    expect(validTechniques([{ name: '火遁', seals: ['子', '丑'] }])).toBe(true);
    expect(validTechniques([{ name: '火遁', seals: ['invalid'] }])).toBe(false);
    expect(validTechniques([{ name: '', seals: [] }])).toBe(false);
  });
  it('times only the matched sequence, excluding unrelated earlier gestures', () => {
    expect(techniqueDuration([100, 1000, 1800, 2500], 3)).toBe(1500);
    expect(techniqueDuration([1000], 1)).toBe(0);
    expect(() => techniqueDuration([1000], 2)).toThrow();
  });
  it('provides the requested defaults and keeps existing same-name techniques', () => {
    expect(DEFAULT_TECHNIQUES.map(t => t.seals.join(''))).toEqual(['巳未申亥午寅', '巳辰卯寅', '未戌子戌未']);
    const existing = [{ name: DEFAULT_TECHNIQUES[0].name, seals: ['子'] }];
    const result = mergeTechniques(existing, DEFAULT_TECHNIQUES);
    expect(result.merged[0].seals).toEqual(['子']);
    expect(result.merged).toHaveLength(3);
  });
  it('accepts exported technique files and rejects invalid data', () => {
    const data = { format: 'naruto-techniques', version: 1, techniques: DEFAULT_TECHNIQUES };
    expect(parseTechniquesFile(data)).toEqual(DEFAULT_TECHNIQUES);
    expect(() => parseTechniquesFile({ ...data, techniques: [{ name: 'x', seals: ['bad'] }] })).toThrow();
  });
});
