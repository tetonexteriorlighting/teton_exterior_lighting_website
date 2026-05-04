/**
 * build-tools.mjs
 * Builds the RoofLit installer tool and copies it into this website's
 * public/tools/app/ folder so it deploys alongside the main site.
 *
 * Run with:  node scripts/build-tools.mjs
 */

import { execSync }   from 'child_process'
import { cpSync, rmSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const SITE_ROOT  = resolve(__dirname, '..')
const TOOL_ROOT  = resolve('C:/Users/jayde/Pictures/TEL/rooflit')
const TOOL_DIST  = resolve(TOOL_ROOT, 'dist')
const DEST       = resolve(SITE_ROOT, 'public', 'tools', 'app')

console.log('🔨  Building RoofLit tool…')
execSync('npm run build', { cwd: TOOL_ROOT, stdio: 'inherit' })

console.log('📂  Copying to public/tools/app/ …')
if (existsSync(DEST)) rmSync(DEST, { recursive: true })
mkdirSync(DEST, { recursive: true })
cpSync(TOOL_DIST, DEST, { recursive: true })

console.log('✅  Done! The tool is now at /tools/app/ in this site.')
console.log('    Run "npm run build" or deploy to publish.')
