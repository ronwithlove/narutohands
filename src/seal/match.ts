import type { HandResult } from '../kit';

export type Sample = number[][];

// Preserve the relationship between the hands while removing overall position and distance.
export function sampleHands(hands: HandResult[], aspect: number): Sample | null {
  if (hands.length < 1 || hands.length > 2 || hands.some(h => h.landmarks.length !== 21)) return null;
  const points = hands.flatMap(h => h.landmarks.map(p => [p.x * aspect, p.y]));
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.max(maxX - minX, maxY - minY);
  if (!Number.isFinite(scale) || scale < 0.03) return null;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return hands.map(h => h.landmarks.flatMap(p => [(p.x * aspect - cx) / scale, (p.y - cy) / scale]));
}

export function distance(a: Sample, b: Sample): number {
  if (a.length !== b.length || a.length < 1 || a.length > 2) return Infinity;
  const compare = (swap: boolean) => {
    let sum = 0;
    for (let h = 0; h < a.length; h++) for (let i = 0; i < 42; i++) sum += (a[h][i] - b[swap ? 1 - h : h][i]) ** 2;
    return Math.sqrt(sum / (a.length * 42));
  };
  return a.length === 1 ? compare(false) : Math.min(compare(false), compare(true));
}

export function bestMatch(sample: Sample, library: Record<string, Sample[]>, threshold = 0.07): string | null {
  let bestName: string | null = null;
  let bestDistance = threshold;
  for (const [name, examples] of Object.entries(library)) {
    for (const example of examples) {
      const score = distance(sample, example);
      if (score < bestDistance) { bestName = name; bestDistance = score; }
    }
  }
  return bestName;
}

export class StableMatch {
  private candidate: string | null = null;
  private since = 0;
  update(match: string | null, now: number): string | null {
    if (!match) { this.reset(); return null; }
    if (this.candidate !== match) { this.candidate = match; this.since = now; }
    return now - this.since >= 100 ? match : null;
  }
  reset() { this.candidate = null; this.since = 0; }
}
