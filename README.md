# SetListMaker

A PWA that turns a Spotify playlist exported from [Exportify](https://exportify.app) into a dance-floor-ready DJ setlist.

- Import an Exportify CSV
- Generate a setlist that fits a gig-length budget, honors must-have songs, and targets a Spanish-content percentage
- Order the set using DJ-style harmonic mixing (Camelot wheel key compatibility, tempo smoothing, and an energy/danceability arc)
- Unused tracks are listed alphabetically at the bottom
- Copy the final order as a reference list for manually reordering the playlist in Spotify (Spotify blocks automated playlist-track writes for apps run by individual developers)

This is a static site — no backend, no accounts, nothing leaves your browser except the one-time CSV you choose to import.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Building

```bash
npm run build       # static export to ./out
npm run preview     # serve ./out locally to sanity-check the production build
```

## Deploying to GitHub Pages

`npm run build:pages` builds the static export with the base path set for this repo's GitHub Pages URL. The `.github/workflows/deploy-pages.yml` workflow runs this automatically on every push to `main` and publishes `./out` via GitHub Pages — no manual deploy step needed once Pages is enabled on the repo (Settings → Pages → Source: GitHub Actions).
