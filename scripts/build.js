import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = path.join(root, 'public');
const works = JSON.parse(await readFile(path.join(publicDir, 'content/works.json'), 'utf8'));
if (!Array.isArray(works)) throw new Error('content/works.json must contain an array.');
for (const work of works) {
  if (!work.id || !work.title || !['media','sound','image'].includes(work.category)) throw new Error('Invalid artwork metadata.');
  if (!/^\.\/media\/[^/]+$/.test(work.media)) throw new Error(`Invalid media path: ${work.media}`);
  const file = await stat(path.join(publicDir, work.media));
  if (!file.isFile() || !file.size) throw new Error(`Missing or empty media: ${work.media}`);
}
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(publicDir, dist, { recursive: true, filter: source => !/\.(part|tmp)$/.test(source) && !source.endsWith('.DS_Store') });
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built static site in dist/ (${works.length} artworks). GitHub Pages ready.`);
