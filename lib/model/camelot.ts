// Standard Camelot wheel (Mixed In Key) mapping from Spotify's pitch-class
// "Key" (0=C .. 11=B) + "Mode" (0=minor, 1=major) to Camelot notation.
const MAJOR_CAMELOT = [
  "8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B",
];
const MINOR_CAMELOT = [
  "5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A",
];

export function toCamelot(key: number, mode: 0 | 1): string {
  if (key < 0 || key > 11 || !Number.isInteger(key)) return "unknown";
  return mode === 1 ? MAJOR_CAMELOT[key] : MINOR_CAMELOT[key];
}

interface ParsedCamelot {
  num: number;
  letter: "A" | "B";
}

function parseCamelot(code: string): ParsedCamelot | null {
  const match = /^(\d{1,2})([AB])$/.exec(code);
  if (!match) return null;
  return { num: parseInt(match[1], 10), letter: match[2] as "A" | "B" };
}

/**
 * Harmonic compatibility between two Camelot codes:
 * 3 = identical key, 2 = relative major/minor, 1 = one step around the wheel,
 * 0 = incompatible (or either code is "unknown").
 */
export function camelotCompatibility(a: string, b: string): 0 | 1 | 2 | 3 {
  const pa = parseCamelot(a);
  const pb = parseCamelot(b);
  if (!pa || !pb) return 0;
  if (pa.num === pb.num && pa.letter === pb.letter) return 3;
  if (pa.num === pb.num && pa.letter !== pb.letter) return 2;
  const diff = Math.abs(pa.num - pb.num);
  const wrapDiff = Math.min(diff, 12 - diff);
  if (wrapDiff === 1 && pa.letter === pb.letter) return 1;
  return 0;
}
