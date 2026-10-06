import type { ClassifiedTrack } from "@/lib/model/track";
import { camelotCompatibility } from "@/lib/model/camelot";

export type EnergyArcShape = 1 | 2;

const WEIGHT_KEY = 0.45;
const WEIGHT_TEMPO = 0.3;
const WEIGHT_ARC = 0.25;
const TEMPO_JUMP_CAP_BPM = 20;
const TWO_OPT_MAX_SWAPS_TRIED = 200;

function energyComposite(t: ClassifiedTrack): number {
  return (t.energy + t.danceability + t.valence) / 3;
}

function tempoScore(a: ClassifiedTrack, b: ClassifiedTrack): number {
  const diff = Math.abs(a.tempo - b.tempo);
  return 1 - Math.min(1, diff / TEMPO_JUMP_CAP_BPM);
}

function keyScore(a: ClassifiedTrack, b: ClassifiedTrack): number {
  return camelotCompatibility(a.camelot, b.camelot) / 3;
}

function targetEnergyAt(position: number, total: number, shape: EnergyArcShape): number {
  if (total <= 1) return 1;
  const t = position / (total - 1);
  const phase = shape === 1 ? t : (t * 2) % 1;
  return Math.sin(Math.PI * phase);
}

function arcScore(
  candidate: ClassifiedTrack,
  position: number,
  total: number,
  energyRange: [number, number],
  shape: EnergyArcShape
): number {
  const [lo, hi] = energyRange;
  const span = hi - lo || 1;
  const target = lo + targetEnergyAt(position, total, shape) * span;
  const actual = energyComposite(candidate);
  return 1 - Math.min(1, Math.abs(actual - target) / span);
}

function transitionScore(
  from: ClassifiedTrack,
  to: ClassifiedTrack,
  positionOfTo: number,
  total: number,
  energyRange: [number, number],
  shape: EnergyArcShape
): number {
  return (
    WEIGHT_KEY * keyScore(from, to) +
    WEIGHT_TEMPO * tempoScore(from, to) +
    WEIGHT_ARC * arcScore(to, positionOfTo, total, energyRange, shape)
  );
}

function totalAdjacentScore(
  order: ClassifiedTrack[],
  energyRange: [number, number],
  shape: EnergyArcShape
): number {
  let sum = 0;
  for (let i = 1; i < order.length; i++) {
    sum += transitionScore(order[i - 1], order[i], i, order.length, energyRange, shape);
  }
  return sum;
}

/**
 * Bounded 2-opt local-improvement pass: tries swapping pairs of positions and
 * keeps the swap if it improves the total adjacent-transition score. Capped
 * at TWO_OPT_MAX_SWAPS_TRIED evaluations — this is a cleanup pass for the
 * greedy nearest-neighbor order, not a full TSP solve.
 */
function twoOptImprove(
  order: ClassifiedTrack[],
  energyRange: [number, number],
  shape: EnergyArcShape
): void {
  let swapsTried = 0;
  let improvedAny = true;

  while (improvedAny && swapsTried < TWO_OPT_MAX_SWAPS_TRIED) {
    improvedAny = false;
    const baseScore = totalAdjacentScore(order, energyRange, shape);

    search: for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        [order[i], order[j]] = [order[j], order[i]];
        swapsTried += 1;
        const newScore = totalAdjacentScore(order, energyRange, shape);
        if (newScore > baseScore) {
          improvedAny = true;
          break search;
        }
        [order[i], order[j]] = [order[j], order[i]];
        if (swapsTried >= TWO_OPT_MAX_SWAPS_TRIED) break search;
      }
    }
  }
}

/**
 * Orders tracks for a dancefloor set using DJ-style harmonic mixing: Camelot
 * key compatibility, smoothed tempo transitions, and an energy/danceability/
 * valence arc that builds toward one or two peaks. Greedy nearest-neighbor
 * construction followed by a bounded 2-opt cleanup pass — intentionally not
 * a full TSP solve, since the cost function is itself a soft heuristic.
 */
export function orderForDancefloor(
  tracks: ClassifiedTrack[],
  shape: EnergyArcShape = 1
): ClassifiedTrack[] {
  if (tracks.length <= 1) return [...tracks];

  const energies = tracks.map(energyComposite);
  const energyRange: [number, number] = [Math.min(...energies), Math.max(...energies)];

  const remaining = [...tracks].sort((a, b) => energyComposite(a) - energyComposite(b));
  const order: ClassifiedTrack[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const current = order[order.length - 1];
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = transitionScore(current, remaining[i], order.length, tracks.length, energyRange, shape);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    order.push(remaining.splice(bestIdx, 1)[0]);
  }

  twoOptImprove(order, energyRange, shape);
  return order;
}
