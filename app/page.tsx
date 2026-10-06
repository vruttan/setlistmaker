"use client";

import { useMemo, useState } from "react";
import { ImportCsv } from "@/components/ImportCsv";
import { TrackTable } from "@/components/TrackTable";
import { SetlistForm, type GigConfig } from "@/components/SetlistForm";
import { SetlistResult } from "@/components/SetlistResult";
import { toClassifiedTrack, type ClassifiedTrack, type ImportedTrack } from "@/lib/model/track";
import { generateSetlist, type SelectionResult } from "@/lib/setlist/select";
import { orderForDancefloor } from "@/lib/setlist/order";
import { sortUnusedAlphabetically } from "@/lib/setlist/unused";
import { OrderedListExport } from "@/components/OrderedListExport";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function Home() {
  const [tracks, setTracks] = useState<ClassifiedTrack[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [mustHaveUris, setMustHaveUris] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<SelectionResult | null>(null);
  const [gigLengthMinutes, setGigLengthMinutes] = useState(120);
  const [arcShape, setArcShape] = useState<1 | 2>(1);
  const [includeUnusedInCopy, setIncludeUnusedInCopy] = useState(true);

  function handleImport(imported: ImportedTrack[], warnings: string[]) {
    setTracks(imported.map(toClassifiedTrack));
    setImportWarnings(warnings);
    setMustHaveUris(new Set());
    setResult(null);
  }

  function toggleMustHave(uri: string) {
    setMustHaveUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  }

  function toggleSpanish(uri: string) {
    setTracks((prev) =>
      prev.map((t) =>
        t.trackUri === uri
          ? {
              ...t,
              language: t.language === "spanish" ? "unknown" : "spanish",
              languageSource: "manual-override",
            }
          : t
      )
    );
  }

  function handleGenerate(config: GigConfig) {
    setGigLengthMinutes(config.gigLengthMinutes);
    setArcShape(config.arcShape);
    const selection = generateSetlist({
      tracks,
      gigLengthMs: config.gigLengthMinutes * 60 * 1000,
      spanishTargetPct: config.spanishTargetPct,
      spanishWeightMode: config.spanishWeightMode,
      mustHaveUris: Array.from(mustHaveUris),
    });
    setResult(selection);
  }

  const ordered = useMemo(() => {
    if (!result) return [];
    return orderForDancefloor(result.selected, arcShape);
  }, [result, arcShape]);

  const unusedSorted = useMemo(() => {
    if (!result) return [];
    return sortUnusedAlphabetically(result.unused);
  }, [result]);

  const copyText = useMemo(() => {
    const lines = ordered.map((t, i) => `${i + 1}. ${t.trackName} — ${t.artistNames.join(", ")}`);
    if (includeUnusedInCopy && unusedSorted.length > 0) {
      lines.push("", "Not included (alphabetical):");
      lines.push(...unusedSorted.map((t) => `${t.trackName} — ${t.artistNames.join(", ")}`));
    }
    return lines.join("\n");
  }, [ordered, unusedSorted, includeUnusedInCopy]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SetListMaker</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Import a Spotify playlist exported from Exportify and generate a dance-floor-ready setlist.
          </p>
        </div>
        <InstallPrompt />
      </header>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Step 1: Export your playlist</p>
        <a
          href="https://exportify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit rounded border border-black/20 px-3 py-1.5 text-sm dark:border-white/30"
        >
          Open Exportify ↗
        </a>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Step 2: Import the CSV it downloads</p>
        <ImportCsv onImport={handleImport} />
      </div>

      {importWarnings.length > 0 && (
        <ul className="list-disc rounded border border-amber-400/50 bg-amber-50 p-3 pl-8 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {importWarnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {tracks.length > 0 && (
        <>
          <p className="text-sm text-black/60 dark:text-white/60">
            {tracks.length} tracks imported. Check &quot;Must-have&quot; for songs that must be included, and
            &quot;Spanish?&quot; to mark a track&apos;s language.
          </p>
          <TrackTable
            tracks={tracks}
            mustHaveUris={mustHaveUris}
            onToggleMustHave={toggleMustHave}
            onToggleSpanish={toggleSpanish}
          />
          <SetlistForm disabled={tracks.length === 0} onGenerate={handleGenerate} />
        </>
      )}

      {result && (
        <>
          <SetlistResult
            ordered={ordered}
            unusedSorted={unusedSorted}
            tradeoffs={result.tradeoffs}
            achievedSpanishPct={result.achievedSpanishPct}
            totalDurationMs={result.totalDurationMs}
            gigLengthMinutes={gigLengthMinutes}
          />

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Reorder in Spotify</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeUnusedInCopy}
                onChange={(e) => setIncludeUnusedInCopy(e.target.checked)}
              />
              Also include unused tracks (alphabetical) in the copied list
            </label>
            <OrderedListExport copyText={copyText} trackCount={ordered.length} />
          </div>
        </>
      )}
    </div>
  );
}
