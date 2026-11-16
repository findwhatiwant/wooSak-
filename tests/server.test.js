import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { createApp } from '../server.js';

// Exercise the real request handler and file streams without binding a network port.
async function request(server, pathname, { method = 'GET', headers = {}, body } = {}) {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  req.url = pathname; req.method = method;
  req.headers = { host: 'localhost:3000', origin: 'http://localhost:3000', ...headers };
  const chunks = []; const responseHeaders = {};
  const res = new Writable({ write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
  res.setHeader = (key, value) => { responseHeaders[key.toLowerCase()] = String(value); };
  res.writeHead = (status, values = {}) => { res.statusCode = status; res.headersSent = true; for (const [key, value] of Object.entries(values)) res.setHeader(key, value); };
  const complete = new Promise((resolve, reject) => { res.on('finish', resolve); res.on('error', reject); });
  server.emit('request', req, res);
  await complete;
  const buffer = Buffer.concat(chunks);
  return { status: res.statusCode, headers: responseHeaders, text: () => buffer.toString(), json: () => JSON.parse(buffer.toString()) };
}
async function fixture(t) {
  const publicDir = await mkdtemp(join(tmpdir(), 'void-test-'));
  const app = await createApp({ publicDir });
  t.after(() => rm(publicDir, { recursive: true, force: true }));
  return { app, publicDir };
}
const metadata = { title: 'A sound work', description: 'Ambient study', category: 'sound', year: '2026' };
const upload = (app, info = metadata) => request(app, '/api/works', { method: 'POST', headers: { 'content-type': 'audio/wav', 'x-artwork': encodeURIComponent(JSON.stringify(info)) }, body: 'RIFFtest-audio-data' });

test('uploaded work persists as a static manifest and media with relative Pages paths', async t => {
  const { app, publicDir } = await fixture(t);
  const response = await upload(app);
  assert.equal(response.status, 201);
  const work = response.json();
  assert.equal(work.title, metadata.title);
  assert.match(work.media, /^\.\/media\/[a-f0-9-]+\.wav$/);
  const list = JSON.parse(await readFile(join(publicDir, 'content/works.json'), 'utf8'));
  assert.equal(list[0].id, work.id);
  assert.equal(await readFile(join(publicDir, work.media), 'utf8'), 'RIFFtest-audio-data');
  const restarted = await createApp({ publicDir });
  assert.equal((await request(restarted, '/api/works')).json()[0].id, work.id);
  assert.equal((await request(app, '/content/works.json')).json()[0].id, work.id);
});

test('media seeking supports byte and suffix ranges and rejects invalid ranges', async t => {
  const { app } = await fixture(t); const work = (await upload(app)).json();
  const url = work.media.slice(1);
  const media = await request(app, url, { headers: { range: 'bytes=0-3' } });
  assert.equal(media.status, 206); assert.equal(media.text(), 'RIFF');
  assert.equal(media.headers['content-range'], 'bytes 0-3/19');
  assert.equal((await request(app, url, { headers: { range: 'bytes=-4' } })).text(), 'data');
  assert.equal((await request(app, url, { headers: { range: 'bytes=100-120' } })).status, 416);
  assert.equal((await request(app, url, { headers: { range: 'bytes=-' } })).status, 416);
});

test('deleting a work removes both manifest entry and media', async t => {
  const { app, publicDir } = await fixture(t); const work = (await upload(app)).json();
  assert.equal((await request(app, `/api/works/${work.id}`, { method: 'DELETE' })).status, 204);
  assert.deepEqual((await request(app, '/content/works.json')).json(), []);
  await assert.rejects(readFile(join(publicDir, work.media)), { code: 'ENOENT' });
  assert.equal((await request(app, work.media.slice(1))).status, 404);
});

test('concurrent uploads do not overwrite other artwork metadata', async t => {
  const { app } = await fixture(t);
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => upload(app, { ...metadata, title: `Work ${i}` })));
  assert.ok(results.every(result => result.status === 201));
  const list = (await request(app, '/content/works.json')).json();
  assert.equal(list.length, 6); assert.equal(new Set(list.map(work => work.id)).size, 6);
});

test('foreign origins and hosts cannot write local artwork files', async t => {
  const { app } = await fixture(t);
  assert.equal((await request(app, '/api/works', { method: 'POST', headers: { origin: 'https://example.com' } })).status, 403);
  assert.equal((await request(app, '/api/works', { method: 'POST', headers: { host: 'attacker.com', origin: 'http://attacker.com' } })).status, 403);
  assert.deepEqual((await request(app, '/api/works')).json(), []);
});

test('unsupported types, oversized files, empty files and invalid metadata are rejected', async t => {
  const { app } = await fixture(t);
  assert.equal((await request(app, '/api/works', { method: 'POST', headers: { 'content-type': 'text/html' } })).status, 415);
  assert.equal((await upload(app, { ...metadata, title: ' ' })).status, 400);
  const headers = { 'content-type': 'audio/wav', 'x-artwork': encodeURIComponent(JSON.stringify(metadata)) };
  assert.equal((await request(app, '/api/works', { method: 'POST', headers: { ...headers, 'content-length': String(51 * 1024 * 1024) } })).status, 413);
  assert.equal((await request(app, '/api/works', { method: 'POST', headers })).status, 400);
});

test('static server exposes local editor capability but not source files', async t => {
  const { app, publicDir } = await fixture(t);
  await writeFile(join(publicDir, 'index.html'), '<h1>VOID</h1>');
  assert.deepEqual((await request(app, '/api/local')).json(), { local: true });
  assert.equal((await request(app, '/')).text(), '<h1>VOID</h1>');
  assert.equal((await request(app, '/server.js')).status, 404);
  assert.equal((await request(app, '/%2e%2e%2fserver.js')).status, 403);
  assert.equal((await request(app, '/', { method: 'HEAD' })).text(), '');
});
