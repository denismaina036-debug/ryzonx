#!/usr/bin/env node
/**
 * Generates favicon sizes, PWA icons, and Open Graph image from public/images/logo.png.
 * Run: node scripts/generate-seo-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = path.join(root, "public", "images", "logo.png");
const publicDir = path.join(root, "public");

if (!fs.existsSync(logoPath)) {
  console.error("Missing public/images/logo.png — cannot generate SEO assets.");
  process.exit(1);
}

const BRAND_BG = { r: 15, g: 22, b: 35, alpha: 1 };

const iconSizes = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
];

async function generateIcons() {
  for (const { file, size } of iconSizes) {
    const out = path.join(publicDir, file);
    await sharp(logoPath)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out);
    console.log(`Created ${file}`);
  }

  await sharp(logoPath)
    .resize(32, 32, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toFile(path.join(publicDir, "favicon.ico"));

  console.log("Created favicon.ico");
}

async function generateOgImage() {
  const width = 1200;
  const height = 630;
  const logoSize = 280;

  const logoBuffer = await sharp(logoPath)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const background = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .png()
    .toBuffer();

  const out = path.join(publicDir, "images", "og-image.png");
  await sharp(background)
    .composite([
      {
        input: logoBuffer,
        top: Math.round((height - logoSize) / 2),
        left: Math.round((width - logoSize) / 2),
      },
    ])
    .png()
    .toFile(out);

  console.log("Created images/og-image.png (1200×630)");
}

await generateIcons();
await generateOgImage();

const rootLogo = path.join(publicDir, "logo.png");
await sharp(logoPath)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(rootLogo);
console.log("Created logo.png (512×512 Organization logo)");

console.log("SEO brand assets generated.");
