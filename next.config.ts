import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import path from "path";

// Set by the GitHub Pages deploy workflow only — local dev/build stays at
// root so `npm run dev` keeps working at http://localhost:3000 unchanged.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/setlistmaker";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  output: "export",
  basePath: isGithubPages ? repoBasePath : "",
  assetPrefix: isGithubPages ? `${repoBasePath}/` : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
