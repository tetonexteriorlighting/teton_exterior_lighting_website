#!/usr/bin/env node
/**
 * SEO Content Pipeline for Teton Exterior Lighting
 *
 * Generates a weekly blog post, processes inbox photos, commits, and
 * pushes to GitHub so Netlify auto-deploys.
 *
 * Usage:
 *   node scripts/run-pipeline.mjs                  # post + photos + commit + push
 *   node scripts/run-pipeline.mjs --post-only       # generate post, skip photos
 *   node scripts/run-pipeline.mjs --photos-only     # process photos, skip post
 *   node scripts/run-pipeline.mjs --no-push         # commit but don't push
 *   node scripts/run-pipeline.mjs --draft           # mark generated post as draft
 *   node scripts/run-pipeline.mjs --topic "spring curb appeal ideas"
 *
 * npm shortcut:  npm run seo-pipeline
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ---- CLI flags ----
const args       = process.argv.slice(2);
const postOnly   = args.includes('--post-only');
const photosOnly = args.includes('--photos-only');
const noPush     = args.includes('--no-push');
const isDraft    = args.includes('--draft');
const topicIdx   = args.indexOf('--topic');
const topic      = topicIdx !== -1 ? args[topicIdx + 1] : null;

// ---- Helpers ----
function sh(cmd) {
  console.log(`  $ ${cmd}`);
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (err) {
    throw new Error(err.stderr?.trim() || err.stdout?.trim() || err.message);
  }
}

function runScript(scriptFile, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptFile, ...extraArgs], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(scriptFile)} exited with code ${code}`))
    );
  });
}

// ---- Main ----
async function main() {
  const line = '='.repeat(52);
  console.log(`\n${line}`);
  console.log('  Teton Exterior Lighting — SEO Content Pipeline');
  console.log(`${line}\n`);

  const runPost   = !photosOnly;
  const runPhotos = !postOnly;

  // Step 1: Generate blog post
  if (runPost) {
    console.log('Step 1/3  Generate blog post\n');
    const postArgs = [];
    if (isDraft) postArgs.push('--draft');
    if (topic)   postArgs.push('--topic', topic);
    await runScript(path.join(__dirname, 'generate-post.mjs'), postArgs);
  } else {
    console.log('Step 1/3  Generate blog post  [skipped]\n');
  }

  // Step 2: Process inbox photos
  if (runPhotos) {
    console.log('\nStep 2/3  Process inbox photos\n');
    await runScript(path.join(__dirname, 'process-photos.mjs'));
  } else {
    console.log('\nStep 2/3  Process inbox photos  [skipped]\n');
  }

  // Step 3: Git commit + push
  console.log('\nStep 3/3  Commit and push\n');

  const status = sh('git status --porcelain');
  if (!status) {
    console.log('  Nothing to commit.\n');
    return;
  }

  // Stage blog content and processed photos only
  sh('git add src/content/blog/ public/images/blog/ astro.config.mjs src/content/config.ts src/pages/blog/ src/components/Nav.astro src/components/Footer.astro');

  const staged = sh('git diff --cached --name-only');
  if (!staged) {
    console.log('  No staged changes.\n');
    return;
  }

  console.log('\n  Staged files:');
  staged.split('\n').forEach(f => console.log(`    ${f}`));

  const dateStr   = new Date().toISOString().split('T')[0];
  const label     = isDraft ? 'draft blog post' : 'weekly SEO blog post';
  const commitMsg = `Add ${label} and photos [${dateStr}]\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`;

  sh(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

  if (!noPush) {
    sh('git push origin main');
    console.log('\n  Pushed to GitHub. Netlify will deploy shortly.');
  } else {
    console.log('\n  Committed locally. Run `git push origin main` when ready.');
  }

  console.log(`\n${line}`);
  console.log('  Pipeline complete!');
  console.log(line);
}

main().catch(err => {
  console.error('\nPipeline failed:', err.message);
  process.exit(1);
});
