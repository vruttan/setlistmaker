"use client";

import { useState } from "react";
import type { SpanishWeightMode } from "@/lib/setlist/select";
import type { EnergyArcShape } from "@/lib/setlist/order";

export interface GigConfig {
  gigLengthMinutes: number;
  spanishTargetPct: number;
  spanishWeightMode: SpanishWeightMode;
  arcShape: EnergyArcShape;
}

interface SetlistFormProps {
  onGenerate: (config: GigConfig) => void;
}

const DEFAULT_CONFIG: GigConfig = {
  gigLengthMinutes: 120,
  spanishTargetPct: 20,
  spanishWeightMode: "duration",
  arcShape: 1,
};

export function SetlistForm({ onGenerate }: SetlistFormProps) {
  const [config, setConfig] = useState<GigConfig>(DEFAULT_CONFIG);
  // Number inputs keep the raw text so clearing a field doesn't silently
  // become 0; `required`/min/max make the browser block invalid submits.
  const [gigLengthText, setGigLengthText] = useState(String(DEFAULT_CONFIG.gigLengthMinutes));
  const [spanishPctText, setSpanishPctText] = useState(String(DEFAULT_CONFIG.spanishTargetPct));

  return (
    <form
      className="flex flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/20"
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate({
          ...config,
          gigLengthMinutes: Number(gigLengthText),
          spanishTargetPct: Number(spanishPctText),
        });
      }}
    >
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Gig length (minutes)
          <input
            type="number"
            required
            min={1}
            value={gigLengthText}
            onChange={(e) => setGigLengthText(e.target.value)}
            className="w-28 rounded border border-black/10 p-1 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Spanish content target (%)
          <input
            type="number"
            required
            min={0}
            max={100}
            value={spanishPctText}
            onChange={(e) => setSpanishPctText(e.target.value)}
            className="w-28 rounded border border-black/10 p-1 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Spanish % weighted by
          <select
            value={config.spanishWeightMode}
            onChange={(e) =>
              setConfig((c) => ({ ...c, spanishWeightMode: e.target.value as SpanishWeightMode }))
            }
            className="rounded border border-black/10 p-1 dark:border-white/20"
          >
            <option value="duration">Duration (minutes)</option>
            <option value="count">Track count</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Energy arc
          <select
            value={config.arcShape}
            onChange={(e) => setConfig((c) => ({ ...c, arcShape: Number(e.target.value) as EnergyArcShape }))}
            className="rounded border border-black/10 p-1 dark:border-white/20"
          >
            <option value={1}>Single peak</option>
            <option value={2}>Double peak</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="w-fit rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        Generate setlist
      </button>
    </form>
  );
}
