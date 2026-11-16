import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../public/', import.meta.url);
const pages = new URL('https://artist.github.io/artworkWebsite/');

test('all HTML assets resolve under a GitHub Pages repository path', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const paths = Array.from(html.matchAll(/(?:src|href)="([^"#]+)"/g), match => match[1]);
  assert.ok(paths.length >= 3);
  for (const value of paths) {
    const resolved = new URL(value, pages);
    assert.ok(resolved.pathname.startsWith('/artworkWebsite/'), value);
    assert.ok((await stat(fileURLToPath(new URL(value, root)))).isFile());
  }
});

test('browser module imports and content manifest exist and use relative paths', async () => {
  const app = await readFile(new URL('app.js', root), 'utf8');
  for (const match of app.matchAll(/from ['"]([^'"]+)['"]/g)) {
    assert.ok(match[1].startsWith('./'));
    assert.ok((await stat(new URL(match[1], root))).isFile());
  }
  const content = JSON.parse(await readFile(new URL('content/works.json', root), 'utf8'));
  assert.ok(Array.isArray(content));
  for (const work of content) {
    assert.ok(new URL(work.media, pages).pathname.startsWith('/artworkWebsite/media/'));
    assert.ok((await stat(new URL(work.media, root))).isFile());
  }
});
