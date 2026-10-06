import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SetListMaker",
    short_name: "SetListMaker",
    description: "Generate a dance-floor-ready DJ setlist from an Exportify CSV.",
    // Relative paths/URL so this resolves correctly whether the app is
    // served from the root (local dev) or a subpath (GitHub Pages project
    // site) — manifest URL members resolve relative to the manifest's own
    // URL, which Next.js already serves under the correct base path.
    start_url: ".",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
