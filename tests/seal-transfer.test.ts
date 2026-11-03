import { describe, it, expect } from 'vitest';
import { mergeMissing, parseLibrary } from '../src/seal/transfer';
const sample = [Array.from({ length: 42 }, () => 0), Array.from({ length: 42 }, () => 0)];
describe('seal file transfer', () => {
  it('imports valid templates without replacing existing ones', () => {
    const imported = parseLibrary({ format: 'naruto-seals', version: 1, seals: { 子: [sample], 丑: [sample] } });
    const existing = [sample, sample];
    const result = mergeMissing({ 子: existing }, imported);
    expect(result.merged.子).toBe(existing);
    expect(result.added).toEqual(['丑']);
    expect(result.skipped).toEqual(['子']);
  });
  it('accepts mixed one-hand and two-hand recordings', () => {
    const imported = parseLibrary({ format: 'naruto-seals', version: 1, seals: { 子: [[sample[0]], sample] } });
    expect(imported.子.map(s => s.length)).toEqual([1, 2]);
  });
  it('rejects malformed data', () => {
    expect(() => parseLibrary({ format: 'naruto-seals', version: 1, seals: { 子: [[[]]] } })).toThrow();
    expect(() => parseLibrary({ format: 'naruto-seals', version: 2, seals: { 子: [sample] } })).toThrow();
  });
});
