import type { ClassifiedTrack } from "@/lib/model/track";
import { camelotCompatibility } from "@/lib/model/camelot";

export type EnergyArcShape = 1 | 2;

const WEIGHT_KEY = 0.45;
const WEIGHT_TEMPO = 0.3;
const WEIGHT_ARC = 0.25;
const TEMPO_JUMP_CAP_BPM = 20;
const LOCAL_SEARCH_MAX_PASSES = 50;
// Score used for any comparison involving a track with no audio features
// (e.g. a local file), so it's neither favoured nor penalised.
const NEUTRAL_SCORE = 0.5;
const IMPROVEMENT_EPSILON = 1e-9;

function energyComposite(t: ClassifiedTrack): number {
  return (t.energy + t.danceability + t.valence) / 3;
}

function tempoScore(a: ClassifiedTrack, b: ClassifiedTrack): number {
  if (!a.hasAudioFeatures || !b.hasAudioFeatures) return NEUTRAL_SCORE;
  const diff = Math.abs(a.tempo - b.tempo);
  return 1 - Math.min(1, diff / TEMPO_JUMP_CAP_BPM);
}

function keyScore(a: ClassifiedTrack, b: ClassifiedTrack): number {
  if (!a.hasAudioFeatures || !b.hasAudioFeatures) return NEUTRAL_SCORE;
  return camelotCompatibility(a.camelot, b.camelot) / 3;
}

function targetEnergyAt(position: number, total: number, shape: EnergyArcShape): number {
  if (total <= 1) return 1;
  const t = position / (total - 1);
  const phase = shape === 1 ? t : (t * 2) % 1;
  return Math.sin(Math.PI * phase);
}

interface ScoringContext {
  total: number;
  energyRange: [number, number];
  shape: EnergyArcShape;
}

function arcScore(candidate: ClassifiedTrack, position: number, ctx: ScoringContext): number {
  if (!candidate.hasAudioFeatures) return NEUTRAL_SCORE;
  const [lo, hi] = ctx.energyRange;
  const span = hi - lo || 1;
  const target = lo + targetEnergyAt(position, ctx.total, ctx.shape) * span;
  const actual = energyComposite(candidate);
  return 1 - Math.min(1, Math.abs(actual - target) / span);
}

/** Key + tempo smoothness of the mix from `from` into `to`. */
function mixScore(from: ClassifiedTrack, to: ClassifiedTrack): number {
  return WEIGHT_KEY * keyScore(from, to) + WEIGHT_TEMPO * tempoScore(from, to);
}

/**
 * Score contributed by the boundary at position `i`: the mix into slot i
 * (absent for slot 0) plus how well slot i's track fits the energy arc.
 * The whole order's score is the sum of this over every position, so the
 * opener's arc fit counts too.
 */
function slotScore(order: ClassifiedTrack[], i: number, ctx: ScoringContext): number {
  const mix = i > 0 ? mixScore(order[i - 1], order[i]) : 0;
  return mix + WEIGHT_ARC * arcScore(order[i], i, ctx);
}

function affectedSlotsScore(order: ClassifiedTrack[], slots: number[], ctx: ScoringContext): number {
  let sum = 0;
  for (const s of slots) sum += slotScore(order, s, ctx);
  return sum;
}

function rangeScore(order: ClassifiedTrack[], from: number, to: number, ctx: ScoringContext): number {
  let sum = 0;
  for (let i = from; i <= to; i++) sum += slotScore(order, i, ctx);
  return sum;
}

/**
 * Tries swapping every pair of positions, keeping any swap that improves the
 * total score. A swap only changes the slots at and just after each swapped
 * position, so each candidate is scored in O(1).
 */
function swapPass(order: ClassifiedTrack[], ctx: ScoringContext): boolean {
  const n = order.length;
  let improved = false;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const slots = [...new Set([i, i + 1, j, j + 1])].filter((s) => s < n);
      const before = affectedSlotsScore(order, slots, ctx);
      [order[i], order[j]] = [order[j], order[i]];
      const after = affectedSlotsScore(order, slots, ctx);
      if (after > before + IMPROVEMENT_EPSILON) {
        improved = true;
      } else {
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
  }
  return improved;
}

/**
 * Tries moving each track to every other position, keeping any move that
 * improves the total score. This escapes local optima that swaps can't
 * (e.g. sliding one track a few slots later). A move shifts every track in
 * between, so only the slots from the lower position through just past the
 * higher one need re-scoring.
 */
function relocatePass(order: ClassifiedTrack[], ctx: ScoringContext): boolean {
  const n = order.length;
  let improved = false;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const from = Math.min(i, j);
      const to = Math.min(n - 1, Math.max(i, j) + 1);
      const before = rangeScore(order, from, to, ctx);
      const [track] = order.splice(i, 1);
      order.splice(j, 0, track);
      const after = rangeScore(order, from, to, ctx);
      if (after > before + IMPROVEMENT_EPSILON) {
        improved = true;
      } else {
        order.splice(j, 1);
        order.splice(i, 0, track);
      }
    }
  }
  return improved;
}

/**
 * Local search over the greedy order: alternates swap and relocate passes
 * until neither finds an improvement (or LOCAL_SEARCH_MAX_PASSES is hit).
 */
function localSearch(order: ClassifiedTrack[], ctx: ScoringContext): void {
  for (let pass = 0; pass < LOCAL_SEARCH_MAX_PASSES; pass++) {
    const swapped = swapPass(order, ctx);
    const relocated = relocatePass(order, ctx);
    if (!swapped && !relocated) break;
  }
}

/**
 * Orders tracks for a dancefloor set using DJ-style harmonic mixing: Camelot
 * key compatibility, smoothed tempo transitions, and an energy/danceability/
 * valence arc that builds toward one or two peaks. Greedy nearest-neighbor
 * construction followed by a swap/relocate local search — intentionally not
 * a full TSP solve, since the cost function is itself a soft heuristic.
 * Tracks without audio features (local files) are scored neutrally so they
 * land wherever they disrupt the flow least.
 */
export function orderForDancefloor(
  tracks: ClassifiedTrack[],
  shape: EnergyArcShape = 1
): ClassifiedTrack[] {
  if (tracks.length <= 1) return [...tracks];

  const withFeatures = tracks.filter((t) => t.hasAudioFeatures);
  const energies = (withFeatures.length > 0 ? withFeatures : tracks).map(energyComposite);
  const ctx: ScoringContext = {
    total: tracks.length,
    energyRange: [Math.min(...energies), Math.max(...energies)],
    shape,
  };

  // Open with the lowest-energy track that actually has audio data — a
  // local file's all-zero features would otherwise always win this slot.
  const remaining = [...tracks].sort(
    (a, b) =>
      Number(b.hasAudioFeatures) - Number(a.hasAudioFeatures) || energyComposite(a) - energyComposite(b)
  );
  const order: ClassifiedTrack[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const current = order[order.length - 1];
    const position = order.length;
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = mixScore(current, remaining[i]) + WEIGHT_ARC * arcScore(remaining[i], position, ctx);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    order.push(remaining.splice(bestIdx, 1)[0]);
  }

  localSearch(order, ctx);
  return order;
}
