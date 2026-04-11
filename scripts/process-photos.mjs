#!/usr/bin/env node
/**
 * Photo processor for Teton Exterior Lighting blog
 *
 * Drop job photos into scripts/photo-inbox/
 * This script:
 *   1. Sends each image to Claude Opus 4.6 Vision
 *   2. Generates an SEO-friendly filename
 *   3. Generates descriptive alt text
 *   4. Moves renamed files to public/images/blog/
 *   5. Writes a Markdown snippet log you can paste into posts
 *
 * Usage:
 *   node scripts/process-photos.mjs
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.resolve(__dirname, '..');
const INBOX   = path.join(__dirname, 'photo-inbox');
const OUTPUT  = path.join(ROOT, 'public', 'images', 'blog');
const LOG     = path.join(OUTPUT, '_alt-text-log.md');

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');
}

async function analyzePhoto(client, filepath) {
  const ext      = path.extname(filepath).toLowerCase();
  const mimeType = MIME[ext] ?? 'image/jpeg';
  const raw      = await fs.readFile(filepath);
  const base64   = raw.toString('base64');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `This is a photo from Teton Exterior Lighting, a permanent LED exterior lighting installer in Idaho Falls, Idaho.

Analyze the image and return a JSON object with exactly these three fields:

{
  "filename": "tel-descriptive-name",
  "altText": "Descriptive alt text here",
  "caption": "One sentence caption here."
}

Filename rules:
- Start with "tel-"
- 3-6 words, lowercase, hyphenated, no extension
- Describe the home type and light color/style
- Examples: "tel-ranch-warm-white-roofline", "tel-twostory-red-blue-patriotic"

Alt text rules:
- 10-15 words
- Describe lighting color, home type, and time of day if visible
- Good example: "Two-story home with warm white permanent LED roofline lighting at dusk"

Caption rules:
- 1 sentence, suitable for a blog post image caption
- Mention permanent LED lighting naturally

Return ONLY the raw JSON. No markdown fences, no extra text.`,
          },
        ],
      },
    ],
  });

  const text      = response.content.find(b => b.type === 'text')?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);

  const { filename, altText, caption } = JSON.parse(jsonMatch[0]);
  return {
    safeFilename: slugify(filename) + ext,
    altText:      String(altText).replace(/"/g, "'"),
    caption:      String(caption),
  };
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  await fs.mkdir(INBOX,  { recursive: true });
  await fs.mkdir(OUTPUT, { recursive: true });

  const files  = await fs.readdir(INBOX);
  const images = files.filter(f =>
    SUPPORTED.has(path.extname(f).toLowerCase()) && !f.startsWith('.')
  );

  if (images.length === 0) {
    console.log('No images found in scripts/photo-inbox/');
    console.log('Drop .jpg/.png/.webp files there and re-run.');
    return [];
  }

  console.log(`\nProcessing ${images.length} photo(s)...\n`);

  const results = [];

  for (const file of images) {
    const src = path.join(INBOX, file);
    process.stdout.write(`  ${file} ... `);

    try {
      const { safeFilename, altText, caption } = await analyzePhoto(client, src);

      // Avoid clobbering existing files
      let dest     = path.join(OUTPUT, safeFilename);
      let attempt  = 0;
      const base   = path.basename(safeFilename, path.extname(safeFilename));
      const ext    = path.extname(safeFilename);
      while (true) {
        try { await fs.access(dest); attempt++; dest = path.join(OUTPUT, `${base}-${attempt}${ext}`); }
        catch { break; }
      }

      await fs.rename(src, dest);

      const webPath = `/images/blog/${path.basename(dest)}`;
      const mdSnip  = `![${altText}](${webPath})`;

      results.push({ original: file, renamed: path.basename(dest), webPath, altText, caption, mdSnip });
      console.log(`done`);
      console.log(`    Renamed:  ${path.basename(dest)}`);
      console.log(`    Alt text: ${altText}`);
      console.log(`    Snippet:  ${mdSnip}\n`);
    } catch (err) {
      console.log(`FAILED`);
      console.error(`    Error: ${err.message}\n`);
    }
  }

  if (results.length === 0) return results;

  // Append to the alt-text log
  const existing  = await fs.readFile(LOG, 'utf-8').catch(() => '# Alt Text Log\n\nPaste these snippets into your blog posts.\n\n---\n\n');
  const timestamp = new Date().toISOString().split('T')[0];
  const newLines  = results.map(r =>
    `### ${r.renamed}\n- **Alt text:** ${r.altText}\n- **Caption:** ${r.caption}\n- **Markdown:** \`${r.mdSnip}\`\n- **Processed:** ${timestamp}\n`
  ).join('\n');

  await fs.writeFile(LOG, existing + newLines, 'utf-8');
  console.log(`Log updated: public/images/blog/_alt-text-log.md`);

  return results;
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
