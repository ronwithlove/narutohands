import { describe, expect, it } from 'vitest';
import { GestureEngine, syntheticHand, SYNTHETIC_POSES as P } from '../src/kit';
import { sampleHands, distance, bestMatch, StableMatch } from '../src/seal/match';

function pose(shape: typeof P.open, x = 0.5, y = 0.5, scale = 0.2) {
  const engine = new GestureEngine();
  const pair = [syntheticHand(x - scale, y, shape, { handedness: 'Left', scale }), syntheticHand(x + scale, y, shape, { handedness: 'Right', scale })];
  return sampleHands(engine.update(pair, 100).hands, 16 / 9)!;
}
describe('two-hand seal matching', () => {
  it('ignores translation, scale and detection order', () => {
    const original = pose(P.open), moved = pose(P.open, 0.6, 0.6, 0.15);
    expect(distance(original, moved)).toBeLessThan(0.001);
    expect(distance(original, [original[1], original[0]])).toBe(0);
  });
  it('distinguishes a fist from an open hand and rejects an empty frame', () => {
    expect(distance(pose(P.open), pose(P.fist))).toBeGreaterThan(0.07);
    expect(sampleHands([], 16 / 9)).toBeNull();
  });
  it('records and compares one-hand samples without confusing them with two-hand samples', () => {
    const engine = new GestureEngine();
    const one = sampleHands(engine.update([syntheticHand(0.5, 0.5, P.open)], 100).hands, 16 / 9)!;
    const two = pose(P.open);
    expect(one).toHaveLength(1);
    expect(distance(one, one)).toBe(0);
    expect(distance(one, two)).toBe(Infinity);
    expect(bestMatch(one, { 子: [two], 丑: [one] })).toBe('丑');
    expect(bestMatch(two, { 丑: [one] })).toBeNull();
  });
  it('chooses the closest recorded seal across all examples', () => {
    const open = pose(P.open), fist = pose(P.fist);
    expect(bestMatch(fist, { 子: [open], 丑: [fist] })).toBe('丑');
    expect(bestMatch(fist, { 子: [open] })).toBeNull();
    expect(bestMatch(open, {})).toBeNull();
  });
  it('requires one continuous match and resets when the candidate changes or disappears', () => {
    const stable = new StableMatch();
    expect(stable.update('子', 100)).toBeNull();
    expect(stable.update('丑', 150)).toBeNull();
    expect(stable.update('丑', 249)).toBeNull();
    expect(stable.update('丑', 250)).toBe('丑');
    expect(stable.update(null, 260)).toBeNull();
    expect(stable.update('丑', 300)).toBeNull();
    expect(stable.update('丑', 400)).toBe('丑');
  });
});
