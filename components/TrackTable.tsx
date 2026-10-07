"use client";

import type { ClassifiedTrack } from "@/lib/model/track";
import { formatDuration } from "@/lib/format";

interface TrackTableProps {
  tracks: ClassifiedTrack[];
  mustHaveUris: Set<string>;
  onToggleMustHave: (uri: string) => void;
  onToggleSpanish: (uri: string) => void;
}

export function TrackTable({ tracks, mustHaveUris, onToggleMustHave, onToggleSpanish }: TrackTableProps) {
  if (tracks.length === 0) return null;

  return (
    <div className="max-h-96 overflow-auto rounded border border-black/10 dark:border-white/20">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-black/5 dark:bg-white/10">
          <tr>
            <th className="p-2">Must-have</th>
            <th className="p-2">Spanish?</th>
            <th className="p-2">Track</th>
            <th className="p-2">Artist(s)</th>
            <th className="p-2">Duration</th>
            <th className="p-2">BPM</th>
            <th className="p-2">Key</th>
            <th className="p-2">Pop.</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((t) => (
            <tr key={t.trackUri} className="border-t border-black/5 dark:border-white/10">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={mustHaveUris.has(t.trackUri)}
                  onChange={() => onToggleMustHave(t.trackUri)}
                  aria-label={`Mark ${t.trackName} as must-have`}
                />
              </td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={t.language === "spanish"}
                  onChange={() => onToggleSpanish(t.trackUri)}
                  aria-label={`Mark ${t.trackName} as Spanish`}
                />
              </td>
              <td className="p-2">
                {t.trackName}
                {t.isLocal && <span className="ml-1 text-xs text-black/50 dark:text-white/50">(local file)</span>}
              </td>
              <td className="p-2">{t.artistNames.join(", ")}</td>
              <td className="p-2">{formatDuration(t.durationMs)}</td>
              <td className="p-2">{t.hasAudioFeatures ? t.tempo.toFixed(0) : "—"}</td>
              <td className="p-2">{t.hasAudioFeatures ? t.camelot : "—"}</td>
              <td className="p-2">{t.popularity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
