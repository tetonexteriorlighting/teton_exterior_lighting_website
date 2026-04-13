#!/usr/bin/env node
/**
 * Weekly SEO blog post generator for Teton Exterior Lighting
 * Uses Claude Opus 4.6 to write seasonal outdoor lighting content
 * targeted at homeowners in the Intermountain West region.
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --topic "spring lighting ideas"
 *   node scripts/generate-post.mjs --draft
 *   node scripts/generate-post.mjs --topic "holiday lighting" --draft
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const BLOG_DIR  = path.join(ROOT, 'src', 'content', 'blog');

// ---- CLI args ----
const args        = process.argv.slice(2);
const getArg      = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const isDraft     = args.includes('--draft');
const customTopic = getArg('--topic');

// ---- Curated hero images by season ----
const HERO_IMAGES = {
  spring: [
    { src: '/images/tel-house-colorful-wide.jpg',   alt: 'Home with colorful permanent LED lighting by Teton Exterior Lighting' },
    { src: '/images/tel-twostory-teal.jpg',          alt: 'Two-story home with teal permanent LED roofline lighting' },
    { src: '/images/tel-twostory-pink.jpg',          alt: 'Two-story home with pink permanent LED exterior lighting' },
  ],
  summer: [
    { src: '/images/tel-house-multicolor-dusk.jpg', alt: 'Home lit with multicolor permanent LED lighting at dusk' },
    { src: '/images/tel-house-colorful-wide.jpg',   alt: 'Home with colorful permanent LED lighting by Teton Exterior Lighting' },
    { src: '/images/tel-twostory-warm.jpg',          alt: 'Two-story home glowing with warm white permanent LED lighting' },
  ],
  fall: [
    { src: '/images/tel-house-warm-wide.jpg',       alt: 'Home glowing with warm white permanent LED exterior lighting' },
    { src: '/images/tel-twostory-warm.jpg',          alt: 'Two-story home with warm white permanent LED roofline lighting' },
    { src: '/images/tel-house-multicolor.jpg',       alt: 'Home with multicolor permanent LED lighting by Teton Exterior Lighting' },
  ],
  winter: [
    { src: '/images/tel-white-ranch-patriotic.jpg', alt: 'Ranch home with festive red, white, and blue permanent LED lighting' },
    { src: '/images/tel-white-ranch-warm.jpg',       alt: 'White ranch home with warm white permanent LED roofline lighting' },
    { src: '/images/tel-ranch-wide.jpg',             alt: 'Ranch-style home with permanent LED exterior lighting' },
  ],
};

function pickHeroImage(season) {
  const options = HERO_IMAGES[season] || HERO_IMAGES.spring;
  return options[Math.floor(Math.random() * options.length)];
}

// ---- Helpers ----
function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5)  return 'spring';
  if (m >= 6 && m <= 8)  return 'summer';
  if (m >= 9 && m <= 11) return 'fall';
  return 'winter';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// ---- Main ----
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const client  = new Anthropic({ apiKey });
  const season  = getSeason();
  const today   = new Date();
  const dateStr = formatDate(today);

  const topicContext = customTopic
    ? `Write about this specific topic: "${customTopic}"`
    : `Choose a topic relevant to ${season} for homeowners in the Intermountain West (Idaho Falls, Jackson Hole, Salt Lake City, Boise, Pocatello, Rexburg). Pick something a homeowner would actually search for this time of year.`;

  console.log(`\nGenerating ${season} blog post${customTopic ? ` on "${customTopic}"` : ''}...`);

  const systemPrompt = `You are an expert content writer for Teton Exterior Lighting, a permanent LED exterior lighting company based in Idaho Falls, Idaho.

About the company:
- Installs ShowHome-brand permanent LED lighting systems
- 3x brighter than DIY systems, 16+ million colors, individually addressable LEDs
- 20-30 year lifespan, 5-year product warranty
- Fully app-controlled (any color, any schedule, any occasion)
- Serves: Idaho Falls, Rexburg, Pocatello, Jackson Hole WY, Salt Lake City UT, Boise ID, Twin Falls ID
- Phone: (208) 557-9009
- Website: tetonexteriorlighting.com
- ShowHome certified partner

Writing style:
- Conversational but authoritative, like a knowledgeable neighbor
- Local and specific (mention Intermountain West, Idaho winters, mountain climate)
- Helpful first, promotional second
- Short punchy paragraphs, 2-4 sentences each
- No em dashes anywhere. Use commas or short sentences instead.
- No hyphens used as pauses in sentences
- Always ends with a gentle call to action linking to /contact`;

  const userPrompt = `Write a complete SEO-optimized blog post for Teton Exterior Lighting.

${topicContext}

Return ONLY a valid Markdown file with YAML frontmatter. No explanation, no preamble, no code fences around the whole thing.

FRONTMATTER requirements (between --- delimiters):
- title: string, max 60 chars, include a city or regional reference where natural (e.g. "Idaho Falls")
- description: string, 150-160 chars exactly, keyword-rich meta description
- pubDate: "${dateStr}"
- tags: array of 3-5 strings like ["permanent led lighting", "idaho falls", "outdoor lighting tips"]
- draft: ${isDraft}
DO NOT include heroImage or heroAlt — those will be added automatically.

POST BODY requirements:
- Open with an H1 that matches the title exactly
- 3-4 H2 sections with descriptive, keyword-friendly headings
- Total length: 700-900 words
- Mention at least one Intermountain West city naturally in the body
- Mention ShowHome brand 1-2 times
- Include this link naturally: [get a free quote](/contact)
- No em dashes or hyphens used as em dashes

CLOSE with an H2 "## Frequently Asked Questions" section containing 2-3 Q&A pairs in this format:
**Q: Question here?**
Answer here.

Good FAQs are ones homeowners actually Google, like pricing range, how long install takes, or whether the lights work in snow.

Start your response with the opening --- of the frontmatter.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  process.stdout.write('Writing');
  stream.on('text', () => process.stdout.write('.'));

  const message = await stream.finalMessage();

  const content = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  // Strip any accidental code fences wrapping the whole output
  let cleaned = content.replace(/^```(?:markdown|md)?\n/, '').replace(/\n```$/, '').trim();

  // Inject heroImage into frontmatter (before closing ---)
  const hero = pickHeroImage(season);
  cleaned = cleaned.replace(
    /^(---\n[\s\S]+?)(^draft:.*$)/m,
    `$1heroImage: "${hero.src}"\nheroAlt: "${hero.alt}"\n$2`
  );

  // Extract title from frontmatter for the filename
  const titleMatch = cleaned.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const rawTitle   = titleMatch ? titleMatch[1] : `lighting-tips-${dateStr}`;
  const slug       = slugify(rawTitle);
  const filename   = `${dateStr}-${slug}.md`;
  const filepath   = path.join(BLOG_DIR, filename);

  await fs.mkdir(BLOG_DIR, { recursive: true });
  await fs.writeFile(filepath, cleaned, 'utf-8');

  console.log(`\n\nSaved: src/content/blog/${filename}`);
  console.log(`Title: ${rawTitle}`);
  if (isDraft) console.log('Status: DRAFT (will not appear on site until draft: false)');

  return { filepath, filename, slug, title: rawTitle };
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
