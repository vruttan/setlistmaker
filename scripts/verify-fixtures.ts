import { readFileSync } from "fs";
import { join } from "path";
import { parseExportifyCsv } from "../lib/csv/parseExportify";
import { toClassifiedTrack } from "../lib/model/track";
import { generateSetlist } from "../lib/setlist/select";
import { orderForDancefloor } from "../lib/setlist/order";
import { sortUnusedAlphabetically } from "../lib/setlist/unused";

const FILES_DIR = join(__dirname, "..", "Exportify_Files");
const files = ["DJ_2026_10_10.csv", "DJ_2026_10_12.csv", "DJ_Halloween_playlist.csv"];

for (const file of files) {
  const csvText = readFileSync(join(FILES_DIR, file), "utf-8");
  const { tracks, warnings } = parseExportifyCsv(csvText);
  console.log(`\n=== ${file} ===`);
  console.log(`Parsed ${tracks.length} tracks. Warnings: ${warnings.length ? warnings.join(" | ") : "none"}`);

  const unknownKeyCount = tracks.filter((t) => t.camelot === "unknown").length;
  console.log(`Camelot: ${unknownKeyCount} track(s) with unknown key.`);
  console.log(
    "Sample camelot codes:",
    tracks.slice(0, 5).map((t) => `${t.trackName} -> key=${t.key},mode=${t.mode} => ${t.camelot}`)
  );

  // Alternate every 4th track as "spanish" just to exercise the selection
  // algorithm's Spanish-targeting logic before real LLM classification exists.
  const classified = tracks.map((t, i) => {
    const ct = toClassifiedTrack(t);
    if (i % 4 === 0) {
      ct.language = "spanish";
      ct.languageSource = "manual-override";
    }
    return ct;
  });

  const mustHaveUris = classified.slice(0, 2).map((t) => t.trackUri);

  const gigLengthMs = 90 * 60 * 1000; // 90 minutes
  const result = generateSetlist({
    tracks: classified,
    gigLengthMs,
    spanishTargetPct: 30,
    spanishWeightMode: "duration",
    mustHaveUris,
  });

  console.log(
    `Selected ${result.selected.length} tracks, total ${(result.totalDurationMs / 60000).toFixed(1)} min (target ${gigLengthMs / 60000} min)`
  );
  console.log(`Achieved Spanish %: ${result.achievedSpanishPct.toFixed(1)} (target 30)`);
  console.log(`Tradeoffs: ${result.tradeoffs.length ? result.tradeoffs.map((t) => t.detail).join(" | ") : "none"}`);
  console.log(`Unused: ${result.unused.length} tracks`);

  const ordered = orderForDancefloor(result.selected, 1);
  console.log(
    "Ordered set (first 8):",
    ordered.slice(0, 8).map((t) => `${t.trackName} [${t.camelot}, ${t.tempo.toFixed(0)}bpm]`)
  );

  const unusedSorted = sortUnusedAlphabetically(result.unused);
  console.log(
    "Unused (alphabetical, first 5):",
    unusedSorted.slice(0, 5).map((t) => t.trackName)
  );
}
