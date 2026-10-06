"use client";

import { useRef } from "react";
import { parseExportifyCsv } from "@/lib/csv/parseExportify";
import type { ImportedTrack } from "@/lib/model/track";

interface ImportCsvProps {
  onImport: (tracks: ImportedTrack[], warnings: string[]) => void;
}

export function ImportCsv({ onImport }: ImportCsvProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const { tracks, warnings } = parseExportifyCsv(text);
    onImport(tracks, warnings);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="csv-input">
        Import Exportify CSV
      </label>
      <input
        ref={inputRef}
        id="csv-input"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="rounded border border-black/10 p-2 text-sm dark:border-white/20"
      />
    </div>
  );
}
