// Builds the folder to load in chrome://extensions and the zip to share.
//   node scripts/build.mjs           → dist/better-youtube-lyric + dist/better-youtube-lyric-<version>.zip
//   node scripts/build.mjs --store   → also dist/better-youtube-lyric-<version>-store.zip (no "key", for the Web Store)
// Fails if a file the manifest points at is missing from the build.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(dist, 'better-youtube-lyric');
const INCLUDE = ['manifest.json', 'README.md', 'fonts', 'icons', 'src'];

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of INCLUDE) cpSync(join(root, f), join(out, f), { recursive: true, filter: (p) => !p.endsWith('.DS_Store') });

// Every path the manifest names must exist in the build.
const wanted = [
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  manifest.background?.service_worker,
  ...(manifest.content_scripts || []).flatMap((c) => [...(c.js || []), ...(c.css || [])]),
].filter(Boolean);
const missing = wanted.filter((p) => !existsSync(join(out, p)));
for (const w of manifest.web_accessible_resources || []) {
  for (const pattern of w.resources) {
    const dir = dirname(pattern);
    const ext = pattern.split('*').pop();
    if (!existsSync(join(out, dir)) || !readdirSync(join(out, dir)).some((f) => f.endsWith(ext))) missing.push(pattern);
  }
}
if (missing.length) {
  console.error('✗ Thiếu file trong bản build:\n  ' + missing.join('\n  '));
  process.exit(1);
}

const zip = (dir, name) => {
  rmSync(join(dist, name), { force: true });
  execFileSync('zip', ['-qr', join(dist, name), '.', '-x', '.*'], { cwd: dir });
  console.log('✓ dist/' + name);
};
zip(out, `better-youtube-lyric-${version}.zip`);

if (process.argv.includes('--store')) {
  const store = join(dist, 'store-tmp');
  rmSync(store, { recursive: true, force: true });
  cpSync(out, store, { recursive: true });
  const m = { ...manifest };
  delete m.key; // the Store assigns its own ID
  writeFileSync(join(store, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  zip(store, `better-youtube-lyric-${version}-store.zip`);
  rmSync(store, { recursive: true, force: true });
}
console.log(`✓ dist/better-youtube-lyric (v${version}, ${wanted.length} file trong manifest đều có)`);
