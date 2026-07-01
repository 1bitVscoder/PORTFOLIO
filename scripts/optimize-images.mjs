// Optimize portfolio rasters to visually-lossless WebP.
//
// Walks public/images/{work,projects} for PNG/JPEG sources and writes a sibling
// .webp: capped at 2880px wide (never upscaled) at quality 88. For the UI
// screenshots in this project that is perceptually identical to the source at a
// fraction of the bytes. Run with: `node scripts/optimize-images.mjs`
// (add --delete to remove the original PNG/JPEG once the .webp is written).
//
// Static export forces next/image `unoptimized:true`, so pre-optimizing the
// source files like this is the only place the win can happen.

import { readdir, stat, unlink } from 'node:fs/promises';
import { join, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['public/images/work', 'public/images/projects'];
const MAX_WIDTH = 2880;
const QUALITY = 88;
const SRC_EXT = new Set(['.png', '.jpg', '.jpeg']);
const DELETE = process.argv.includes('--delete');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const kb = (b) => `${(b / 1024).toFixed(0)}KB`;

let beforeTotal = 0;
let afterTotal = 0;
let converted = 0;

for (const rel of DIRS) {
  const abs = join(ROOT, rel);
  for await (const src of walk(abs)) {
    if (!SRC_EXT.has(extname(src).toLowerCase())) continue;
    const dest = join(dirname(src), `${basename(src, extname(src))}.webp`);

    const before = (await stat(src)).size;
    await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(dest);
    const after = (await stat(dest)).size;

    beforeTotal += before;
    afterTotal += after;
    converted += 1;

    const ratio = (before / after).toFixed(1);
    console.log(`${src.replace(ROOT + '/', '').padEnd(52)} ${kb(before).padStart(7)} -> ${kb(after).padStart(7)}  (${ratio}x)`);

    if (DELETE) await unlink(src);
  }
}

console.log('\n' + '-'.repeat(72));
console.log(`Converted ${converted} files`);
console.log(`Total: ${kb(beforeTotal)} -> ${kb(afterTotal)}  (${(beforeTotal / afterTotal).toFixed(1)}x smaller)`);
if (!DELETE) console.log('Originals kept. Re-run with --delete to remove them after verifying refs.');
