"use client";

import { useState } from "react";
import { parseExportifyCsv } from "@/lib/csv/parseExportify";
import type { ImportedTrack } from "@/lib/model/track";

interface ImportCsvProps {
  onImport: (tracks: ImportedTrack[], warnings: string[]) => void;
}

export function ImportCsv({ onImport }: ImportCsvProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const { tracks, warnings } = parseExportifyCsv(text);
      setError(null);
      onImport(tracks, warnings);
    } catch (err) {
      setError(`Couldn't read "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="csv-input">
        Import Exportify CSV
      </label>
      <input
        id="csv-input"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Clear the value so choosing the same file again (e.g. after
          // re-exporting it) still fires onChange.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
        className="rounded border border-black/10 p-2 text-sm dark:border-white/20"
      />
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
