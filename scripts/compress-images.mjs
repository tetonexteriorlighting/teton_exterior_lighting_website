#!/usr/bin/env node
/**
 * Image compression script for Teton Exterior Lighting
 * Resizes and compresses all images in public/images/
 * Run with: node scripts/compress-images.mjs
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '..', 'public', 'images');

// Skip these — they're already small or are special files
const SKIP = ['logo.png', 'og-image.jpg', 'og-image.png'];

// Settings
const JPEG_QUALITY  = 82;   // 0-100, 82 is visually lossless for photos
const PNG_QUALITY   = 80;   // for PNGs
const MAX_WIDTH     = 1920; // px — no need for larger on a website
const MAX_HEIGHT    = 1920;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function compressImage(filePath) {
  const ext      = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);

  if (SKIP.includes(filename)) {
    console.log(`  ⏭  Skipping ${filename}`);
    return;
  }

  const statBefore = await fs.stat(filePath);
  const sizeBefore = statBefore.size;

  try {
    const inputBuffer = await fs.readFile(filePath);
    const image = sharp(inputBuffer, { failOn: 'none', limitInputPixels: false }).resize({
      width:  MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: 'inside',          // never upscale, preserve aspect ratio
      withoutEnlargement: true,
    });

    let outputBuffer;
    if (ext === '.png') {
      outputBuffer = await image
        .png({ quality: PNG_QUALITY, compressionLevel: 9, palette: false })
        .toBuffer();
    } else {
      // .jpg, .jpeg, .webp all treated as JPEG output
      outputBuffer = await image
        .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
        .toBuffer();
    }

    // Only write back if we actually made it smaller
    if (outputBuffer.length < sizeBefore) {
      await fs.writeFile(filePath, outputBuffer);
      const saved   = sizeBefore - outputBuffer.length;
      const percent = Math.round((saved / sizeBefore) * 100);
      console.log(`  ✅ ${filename.padEnd(40)} ${formatBytes(sizeBefore).padStart(7)} → ${formatBytes(outputBuffer.length).padStart(7)}  (saved ${percent}%)`);
    } else {
      console.log(`  ➡  ${filename.padEnd(40)} already optimal, skipped`);
    }
  } catch (err) {
    console.warn(`  ⚠️  ${filename}: ${err.message}`);
  }
}

async function main() {
  console.log('\n🗜  Compressing images in public/images/\n');

  const files = await fs.readdir(IMAGES_DIR);
  const images = files.filter(f =>
    ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase())
  );

  console.log(`Found ${images.length} images\n`);

  for (const file of images) {
    await compressImage(path.join(IMAGES_DIR, file));
  }

  console.log('\n✨ Done!\n');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
