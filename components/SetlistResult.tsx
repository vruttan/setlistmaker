"use client";

import type { ClassifiedTrack } from "@/lib/model/track";
import type { TradeoffEvent } from "@/lib/setlist/select";

interface SetlistResultProps {
  ordered: ClassifiedTrack[];
  unusedSorted: ClassifiedTrack[];
  tradeoffs: TradeoffEvent[];
  achievedSpanishPct: number;
  totalDurationMs: number;
  gigLengthMinutes: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SetlistResult({
  ordered,
  unusedSorted,
  tradeoffs,
  achievedSpanishPct,
  totalDurationMs,
  gigLengthMinutes,
}: SetlistResultProps) {
  if (ordered.length === 0 && unusedSorted.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded border border-black/10 p-3 text-sm dark:border-white/20">
        <p>
          <strong>{ordered.length}</strong> tracks selected, running{" "}
          <strong>{(totalDurationMs / 60000).toFixed(1)} min</strong> of {gigLengthMinutes} min requested. Achieved{" "}
          <strong>{achievedSpanishPct.toFixed(1)}%</strong> Spanish content.
        </p>
        {tradeoffs.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-amber-700 dark:text-amber-400">
            {tradeoffs.map((t, i) => (
              <li key={i}>{t.detail}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Setlist order</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {ordered.map((t, i) => (
            <li key={t.trackUri} className="flex justify-between gap-2 rounded border border-black/5 p-2 dark:border-white/10">
              <span>
                {i + 1}. {t.trackName} — {t.artistNames.join(", ")}
              </span>
              <span className="text-black/50 dark:text-white/50">
                {t.camelot} · {t.tempo.toFixed(0)}bpm · {formatDuration(t.durationMs)}
                {t.language === "spanish" ? " · ES" : ""}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {unusedSorted.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-black/60 dark:text-white/60">
            Not included — sorted alphabetically ({unusedSorted.length})
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-black/50 dark:text-white/50">
            {unusedSorted.map((t) => (
              <li key={t.trackUri}>
                {t.trackName} — {t.artistNames.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
