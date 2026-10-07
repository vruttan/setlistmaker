import type { ClassifiedTrack } from "@/lib/model/track";

export type SpanishWeightMode = "duration" | "count";

export interface SelectionInput {
  tracks: ClassifiedTrack[];
  gigLengthMs: number;
  spanishTargetPct: number; // 0-100
  spanishWeightMode: SpanishWeightMode;
  mustHaveUris: string[];
}

export type TradeoffType =
  | "must-have-dropped"
  | "spanish-target-missed"
  | "gig-length-underfilled";

export interface TradeoffEvent {
  type: TradeoffType;
  detail: string;
}

export interface SelectionResult {
  selected: ClassifiedTrack[];
  unused: ClassifiedTrack[];
  tradeoffs: TradeoffEvent[];
  achievedSpanishPct: number;
  totalDurationMs: number;
}

const SCORE_WEIGHT_POPULARITY = 0.8;
const SCORE_WEIGHT_TYPICALITY = 0.2;
const SPANISH_TOLERANCE_PCT = 2;
// An exact fill is practically impossible, so only report under-filling
// when the leftover gap is large enough to matter on the night.
const UNDERFILL_TOLERANCE_MS = 3 * 60 * 1000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function candidateScore(track: ClassifiedTrack, medianDurationMs: number): number {
  const normalizedPopularity = track.popularity / 100;
  const typicality =
    medianDurationMs > 0
      ? 1 - Math.min(1, Math.abs(track.durationMs - medianDurationMs) / medianDurationMs)
      : 1;
  return SCORE_WEIGHT_POPULARITY * normalizedPopularity + SCORE_WEIGHT_TYPICALITY * typicality;
}

function minutes(ms: number): number {
  return Math.round(ms / 60000);
}

/**
 * Deterministic greedy setlist selection:
 *  1. Must-have tracks are added highest-popularity-first until the hard gig
 *     length ceiling would be exceeded; anything left over is dropped
 *     (least-popular first) and reported as a tradeoff.
 *  2. Remaining time is filled toward the Spanish-content target using a
 *     proportional-feedback greedy fill: at each step we pull from whichever
 *     pool (Spanish vs. other) is furthest from its target, falling back to
 *     the other pool once the preferred one is exhausted or nothing in it
 *     fits, so the gig length ceiling is never left unnecessarily under-filled.
 */
export function generateSetlist(input: SelectionInput): SelectionResult {
  const { tracks, gigLengthMs, spanishTargetPct, spanishWeightMode, mustHaveUris } = input;
  const tradeoffs: TradeoffEvent[] = [];
  const byUri = new Map(tracks.map((t) => [t.trackUri, t]));
  const selected: ClassifiedTrack[] = [];
  const selectedUris = new Set<string>();
  let totalDurationMs = 0;

  const mustHaves = mustHaveUris
    .map((uri) => byUri.get(uri))
    .filter((t): t is ClassifiedTrack => Boolean(t))
    .sort((a, b) => b.popularity - a.popularity);

  for (const track of mustHaves) {
    if (totalDurationMs + track.durationMs <= gigLengthMs) {
      selected.push(track);
      selectedUris.add(track.trackUri);
      totalDurationMs += track.durationMs;
    } else {
      tradeoffs.push({
        type: "must-have-dropped",
        detail: `Dropped "${track.trackName}" by ${track.artistNames.join(", ")} (popularity ${track.popularity}) — including it would exceed the ${minutes(gigLengthMs)}-minute gig length.`,
      });
    }
  }

  const medianDurationMs = median(tracks.map((t) => t.durationMs));
  let spanishPool = tracks.filter((t) => !selectedUris.has(t.trackUri) && t.language === "spanish");
  let otherPool = tracks.filter((t) => !selectedUris.has(t.trackUri) && t.language !== "spanish");

  const targetSpanishMs = gigLengthMs * (spanishTargetPct / 100);
  let currentSpanishMs = selected
    .filter((t) => t.language === "spanish")
    .reduce((sum, t) => sum + t.durationMs, 0);
  let currentSpanishCount = selected.filter((t) => t.language === "spanish").length;

  const remainingMs = () => gigLengthMs - totalDurationMs;

  function pickBest(pool: ClassifiedTrack[]): ClassifiedTrack | null {
    const fits = pool.filter((t) => t.durationMs <= remainingMs());
    if (fits.length === 0) return null;
    return fits.reduce((best, t) =>
      candidateScore(t, medianDurationMs) > candidateScore(best, medianDurationMs) ? t : best
    );
  }

  function dropFromPools(track: ClassifiedTrack) {
    spanishPool = spanishPool.filter((t) => t.trackUri !== track.trackUri);
    otherPool = otherPool.filter((t) => t.trackUri !== track.trackUri);
  }

  while (remainingMs() > 0 && (spanishPool.length > 0 || otherPool.length > 0)) {
    const needsMoreSpanish =
      spanishWeightMode === "duration"
        ? currentSpanishMs < targetSpanishMs
        : (currentSpanishCount / Math.max(1, selected.length + 1)) * 100 < spanishTargetPct;

    const preferredPool = needsMoreSpanish ? spanishPool : otherPool;
    const fallbackPool = needsMoreSpanish ? otherPool : spanishPool;

    const pick = pickBest(preferredPool) ?? pickBest(fallbackPool);
    if (!pick) break;

    selected.push(pick);
    selectedUris.add(pick.trackUri);
    totalDurationMs += pick.durationMs;
    if (pick.language === "spanish") {
      currentSpanishMs += pick.durationMs;
      currentSpanishCount += 1;
    }
    dropFromPools(pick);
  }

  const stillRemainingMs = remainingMs();
  const leftoverPool = [...spanishPool, ...otherPool];
  if (stillRemainingMs > UNDERFILL_TOLERANCE_MS && leftoverPool.length > 0) {
    tradeoffs.push({
      type: "gig-length-underfilled",
      detail: `Could not fully fill the ${minutes(gigLengthMs)}-minute gig — about ${minutes(stillRemainingMs)} minute(s) left unused because no remaining track was short enough to fit.`,
    });
  } else if (stillRemainingMs > UNDERFILL_TOLERANCE_MS && leftoverPool.length === 0) {
    tradeoffs.push({
      type: "gig-length-underfilled",
      detail: `Only filled ${minutes(totalDurationMs)} of ${minutes(gigLengthMs)} requested minutes — not enough tracks in the imported playlist.`,
    });
  }

  const achievedSpanishPct =
    spanishWeightMode === "duration"
      ? totalDurationMs > 0
        ? (currentSpanishMs / totalDurationMs) * 100
        : 0
      : selected.length > 0
        ? (currentSpanishCount / selected.length) * 100
        : 0;
  const spanishDeltaPct = achievedSpanishPct - spanishTargetPct;
  if (Math.abs(spanishDeltaPct) > SPANISH_TOLERANCE_PCT) {
    const unit = spanishWeightMode === "duration" ? "by duration" : "by track count";
    const reason =
      spanishDeltaPct < 0
        ? "not enough Spanish tracks of suitable length were available after other constraints."
        : "must-have tracks or track lengths pushed it over (or too few non-Spanish tracks were available).";
    tradeoffs.push({
      type: "spanish-target-missed",
      detail: `Achieved ${achievedSpanishPct.toFixed(1)}% Spanish content ${unit} vs. a ${spanishTargetPct}% target — ${reason}`,
    });
  }

  const unused = tracks.filter((t) => !selectedUris.has(t.trackUri));

  return { selected, unused, tradeoffs, achievedSpanishPct, totalDurationMs };
}
