import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(__dirname, "..", "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

const BG = "#4f46e5"; // indigo-600

function barsSvg(size: number, barScale: number): string {
  // Four equalizer-style bars, vertically centered, varying heights.
  const heights = [0.38, 0.7, 0.52, 0.86].map((h) => h * size * barScale);
  const barWidth = size * 0.11 * barScale;
  const gap = size * 0.07 * barScale;
  const totalWidth = heights.length * barWidth + (heights.length - 1) * gap;
  const startX = (size - totalWidth) / 2;
  const centerY = size / 2;

  const rects = heights
    .map((h, i) => {
      const x = startX + i * (barWidth + gap);
      const y = centerY - h / 2;
      const radius = barWidth / 2;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="${radius}" fill="white" />`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}" />
    ${rects}
  </svg>`;
}

async function render(svg: string, outPath: string, size: number) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

async function main() {
  // Standard "any" purpose icons: glyph can use most of the canvas.
  await render(barsSvg(192, 1), join(OUT_DIR, "icon-192.png"), 192);
  await render(barsSvg(512, 1), join(OUT_DIR, "icon-512.png"), 512);

  // Maskable icon: glyph must stay within the ~80% safe-zone circle, so
  // scale it down relative to the full bleed background.
  await render(barsSvg(512, 0.6), join(OUT_DIR, "icon-maskable-512.png"), 512);

  // Apple touch icon (no transparency, square, 180x180 is Apple's recommended size).
  await render(barsSvg(180, 1), join(OUT_DIR, "apple-touch-icon.png"), 180);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
