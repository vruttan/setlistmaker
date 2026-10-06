import Papa from "papaparse";
import type { ImportedTrack } from "@/lib/model/track";
import { toCamelot } from "@/lib/model/camelot";

const EXPECTED_HEADERS = [
  "Track URI", "ISRC", "Track Name", "Album Name", "Artist Name(s)", "Release Date",
  "Duration (ms)", "Popularity", "Explicit", "Added By", "Added At", "Genres",
  "Record Label", "Danceability", "Energy", "Key", "Loudness", "Mode", "Speechiness",
  "Acousticness", "Instrumentalness", "Liveness", "Valence", "Tempo", "Time Signature",
];

export interface ParseResult {
  tracks: ImportedTrack[];
  warnings: string[];
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

export function parseExportifyCsv(csvText: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  for (const err of result.errors) {
    warnings.push(`CSV parse warning (row ${err.row ?? "?"}): ${err.message}`);
  }

  const headers = result.meta.fields ?? [];
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    warnings.push(
      `Missing expected column(s): ${missing.join(", ")}. Affected fields will default to empty/zero.`
    );
  }

  const tracks: ImportedTrack[] = [];
  let skipped = 0;

  for (const row of result.data) {
    const trackUri = row["Track URI"]?.trim();
    if (!trackUri) {
      skipped += 1;
      continue;
    }

    const key = parseNumber(row["Key"], -1);
    const mode = (parseNumber(row["Mode"], 1) === 0 ? 0 : 1) as 0 | 1;

    tracks.push({
      trackUri,
      isrc: row["ISRC"] ?? "",
      trackName: row["Track Name"] ?? "",
      albumName: row["Album Name"] ?? "",
      artistNames: splitList(row["Artist Name(s)"]),
      releaseDate: row["Release Date"] ?? "",
      durationMs: parseNumber(row["Duration (ms)"]),
      popularity: parseNumber(row["Popularity"]),
      explicit: parseBool(row["Explicit"]),
      addedBy: row["Added By"] ?? "",
      addedAt: row["Added At"] ?? "",
      genres: splitList(row["Genres"]),
      recordLabel: row["Record Label"] ?? "",
      danceability: parseNumber(row["Danceability"]),
      energy: parseNumber(row["Energy"]),
      key,
      loudness: parseNumber(row["Loudness"]),
      mode,
      speechiness: parseNumber(row["Speechiness"]),
      acousticness: parseNumber(row["Acousticness"]),
      instrumentalness: parseNumber(row["Instrumentalness"]),
      liveness: parseNumber(row["Liveness"]),
      valence: parseNumber(row["Valence"]),
      tempo: parseNumber(row["Tempo"]),
      timeSignature: parseNumber(row["Time Signature"], 4),
      camelot: toCamelot(key, mode),
    });
  }

  if (skipped > 0) {
    warnings.push(`${skipped} row(s) skipped: missing Track URI.`);
  }

  return { tracks, warnings };
}
