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

// Exportify separates artists with ";" (artist names can themselves contain
// commas, e.g. "Tyler, The Creator") but genres with ",".
function splitList(value: string | undefined, separator: string): string[] {
  if (!value) return [];
  return value.split(separator).map((s) => s.trim()).filter(Boolean);
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Exportify writes the literal string "undefined" for some missing values.
function parseText(value: string | undefined): string {
  const text = (value ?? "").trim();
  return text === "undefined" ? "" : text;
}

// Local-file URIs look like spotify:local:<artist>:<album>:<title>:<seconds>,
// with each part URL-encoded using "+" for spaces.
function localUriArtist(uri: string): string {
  const artist = uri.split(":")[2] ?? "";
  try {
    return decodeURIComponent(artist.replace(/\+/g, " ")).trim();
  } catch {
    return artist;
  }
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
  let withoutFeatures = 0;

  for (const row of result.data) {
    const trackUri = row["Track URI"]?.trim();
    if (!trackUri) {
      skipped += 1;
      continue;
    }

    const key = parseNumber(row["Key"], -1);
    const mode = (parseNumber(row["Mode"], 1) === 0 ? 0 : 1) as 0 | 1;
    const isLocal = trackUri.startsWith("spotify:local:");
    const tempo = parseNumber(row["Tempo"]);
    const hasAudioFeatures = !isLocal && tempo > 0;
    if (!hasAudioFeatures) withoutFeatures += 1;
    let artistNames = splitList(parseText(row["Artist Name(s)"]), ";");
    if (artistNames.length === 0 && isLocal) {
      artistNames = splitList(localUriArtist(trackUri), ";");
    }

    tracks.push({
      trackUri,
      isrc: row["ISRC"] ?? "",
      trackName: row["Track Name"] ?? "",
      albumName: row["Album Name"] ?? "",
      artistNames,
      releaseDate: row["Release Date"] ?? "",
      durationMs: parseNumber(row["Duration (ms)"]),
      popularity: parseNumber(row["Popularity"]),
      explicit: parseBool(row["Explicit"]),
      addedBy: row["Added By"] ?? "",
      addedAt: row["Added At"] ?? "",
      genres: splitList(row["Genres"], ","),
      recordLabel: parseText(row["Record Label"]),
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
      tempo,
      timeSignature: parseNumber(row["Time Signature"], 4),
      camelot: toCamelot(key, mode),
      isLocal,
      hasAudioFeatures,
    });
  }

  if (withoutFeatures > 0) {
    warnings.push(
      `${withoutFeatures} track(s) (e.g. local files) have no key/tempo/energy data — they can still be selected, but will be placed without harmonic or tempo matching.`
    );
  }

  if (skipped > 0) {
    warnings.push(`${skipped} row(s) skipped: missing Track URI.`);
  }

  return { tracks, warnings };
}
