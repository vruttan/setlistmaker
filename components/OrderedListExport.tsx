"use client";

import { useState } from "react";

interface OrderedListExportProps {
  copyText: string;
  trackCount: number;
}

export function OrderedListExport({ copyText, trackCount }: OrderedListExportProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/20">
      <p className="text-xs text-black/50 dark:text-white/50">
        Spotify doesn&apos;t allow apps run by individual developers to edit playlist tracks automatically
        (write access now requires an approved commercial account with 250k+ monthly users). Use the list
        below as a guide to manually drag-reorder your playlist in Spotify instead.
      </p>

      <button
        onClick={handleCopy}
        disabled={trackCount === 0}
        className="w-fit rounded bg-[#1DB954] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {copyStatus === "copied" ? "Copied!" : `Copy ordered list (${trackCount} tracks)`}
      </button>

      {copyStatus === "error" && (
        <p className="text-sm text-red-700 dark:text-red-400">
          Couldn&apos;t copy automatically — select and copy the text below manually.
        </p>
      )}

      <textarea
        readOnly
        value={copyText}
        rows={6}
        className="w-full rounded border border-black/10 bg-transparent p-2 font-mono text-xs dark:border-white/20"
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}
