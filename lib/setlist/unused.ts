import type { ClassifiedTrack } from "@/lib/model/track";

function normalizeForSort(name: string): string {
  return name.replace(/^(the)\s+/i, "").toLocaleLowerCase();
}

export function sortUnusedAlphabetically(tracks: ClassifiedTrack[]): ClassifiedTrack[] {
  return [...tracks].sort((a, b) =>
    normalizeForSort(a.trackName).localeCompare(normalizeForSort(b.trackName), undefined, {
      sensitivity: "base",
    })
  );
}
