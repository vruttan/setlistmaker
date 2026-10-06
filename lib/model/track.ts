export interface ImportedTrack {
  trackUri: string;
  isrc: string;
  trackName: string;
  albumName: string;
  artistNames: string[];
  releaseDate: string;
  durationMs: number;
  popularity: number;
  explicit: boolean;
  addedBy: string;
  addedAt: string;
  genres: string[];
  recordLabel: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: 0 | 1;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  timeSignature: number;
  camelot: string;
}

export type Language = "spanish" | "not-spanish" | "unknown";
export type LanguageSource = "llm" | "manual-override" | "unclassified";

export interface ClassifiedTrack extends ImportedTrack {
  language: Language;
  languageSource: LanguageSource;
  languageConfidence?: number;
}

export function toClassifiedTrack(track: ImportedTrack): ClassifiedTrack {
  return {
    ...track,
    language: "unknown",
    languageSource: "unclassified",
  };
}
