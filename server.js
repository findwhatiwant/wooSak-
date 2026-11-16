import http from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat, unlink, rename } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const defaultPublicDir = path.join(root, 'public');
const mediaTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a', 'audio/flac': '.flac', 'audio/x-flac': '.flac' };
const staticTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' };
const MAX_SIZE = 50 * 1024 * 1024;
const idPattern = /^[a-f0-9-]{36}$/;
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(body === undefined ? undefined : JSON.stringify(body)); };

export async function createApp({ publicDir = defaultPublicDir } = {}) {
  const dataDir = path.join(publicDir, 'media');
  const manifestPath = path.join(publicDir, 'content', 'works.json');
  await mkdir(dataDir, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  try { await writeFile(manifestPath, '[]\n', { flag: 'wx' }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  let mutation = Promise.resolve();
  const updateManifest = (update) => {
    const next = mutation.then(async () => {
      const current = JSON.parse(await readFile(manifestPath, 'utf8'));
      const result = await update(current);
      await writeFile(manifestPath + '.tmp', JSON.stringify(result, null, 2) + '\n');
      await rename(manifestPath + '.tmp', manifestPath);
    });
    mutation = next.catch(() => {});
    return next;
  };
  return http.createServer({ maxHeaderSize: 32 * 1024 }, async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'no-cache');
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return send(res, 403, { error: 'Local access only.' });
    const url = new URL(req.url, `http://${host}`);
    try {
      if (['POST', 'DELETE'].includes(req.method) && req.headers.origin !== `http://${host}`) return send(res, 403, { error: '요청 출처를 확인할 수 없습니다.' });
      if (url.pathname === '/api/local' && req.method === 'GET') return send(res, 200, { local: true });
      if (url.pathname === '/api/works' && req.method === 'GET') return send(res, 200, JSON.parse(await readFile(manifestPath, 'utf8')));
      if (url.pathname === '/api/works' && req.method === 'POST') {
        const mime = (req.headers['content-type'] || '').split(';')[0];
        if (!mediaTypes[mime]) return send(res, 415, { error: '지원하는 이미지, 영상 또는 오디오 파일을 선택해 주세요.' });
        let info;
        try { info = JSON.parse(decodeURIComponent(req.headers['x-artwork'] || '')); } catch { return send(res, 400, { error: '작품 정보를 확인해 주세요.' }); }
        if (typeof info.title !== 'string' || !info.title.trim() || info.title.length > 100 || typeof info.description !== 'string' || info.description.length > 2000 || !['media', 'sound', 'image'].includes(info.category) || !/^\d{4}$/.test(info.year)) return send(res, 400, { error: '제목, 분류, 연도를 확인해 주세요.' });
        if (Number(req.headers['content-length']) > MAX_SIZE) return send(res, 413, { error: '파일은 50MB 이하로 올려 주세요.' });
        const id = randomUUID();
        const filename = id + mediaTypes[mime];
        const temp = path.join(dataDir, `${id}.part`);
        let bytes = 0;
        try {
          await pipeline(req, new Transform({ transform(chunk, _, callback) { bytes += chunk.length; callback(bytes > MAX_SIZE ? new Error('File too large') : null, chunk); } }), createWriteStream(temp, { flags: 'wx' }));
          if (!bytes) { await unlink(temp); return send(res, 400, { error: '빈 파일은 등록할 수 없습니다.' }); }
          await rename(temp, path.join(dataDir, filename));
          const work = { id, title: info.title.trim(), description: info.description.trim(), category: info.category, year: info.year, mime, media: `./media/${filename}`, createdAt: new Date().toISOString() };
          await updateManifest(current => [work, ...current]);
          return send(res, 201, work);
        } catch (error) { await unlink(temp).catch(() => {}); await unlink(path.join(dataDir, filename)).catch(() => {}); throw error; }
      }
      if (url.pathname.startsWith('/api/works/') && req.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        if (!idPattern.test(id)) return send(res, 404, { error: '작품을 찾을 수 없습니다.' });
        let work;
        await updateManifest(current => {
          work = current.find(item => item.id === id);
          if (!work) { const error = new Error('Not found'); error.code = 'ENOENT'; throw error; }
          return current.filter(item => item.id !== id);
        });
        await unlink(path.join(dataDir, path.basename(work.media))).catch(error => { if (error.code !== 'ENOENT') throw error; });
        return send(res, 204);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
      let file, type;
      if (url.pathname.startsWith('/media/')) {
        const filename = path.basename(url.pathname);
        const id = filename.slice(0, 36);
        if (!idPattern.test(id)) return send(res, 404, { error: 'Not found' });
        const works = JSON.parse(await readFile(manifestPath, 'utf8'));
        const info = works.find(work => work.id === id && work.media === '.' + url.pathname);
        if (!info) return send(res, 404, { error: 'Not found' });
        file = path.join(dataDir, filename); type = info.mime;
      } else {
        const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
        file = path.resolve(publicDir, `.${pathname}`);
        if (!file.startsWith(publicDir + path.sep)) return send(res, 403, { error: 'Forbidden' });
        type = staticTypes[path.extname(file)] || 'application/octet-stream';
      }
      const stats = await stat(file);
      if (!stats.isFile()) return send(res, 404, { error: 'Not found' });
      let start = 0, end = stats.size - 1, status = 200;
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!range || (!range[1] && !range[2])) { res.setHeader('Content-Range', `bytes */${stats.size}`); return send(res, 416); }
        start = range[1] ? Number(range[1]) : Math.max(0, stats.size - Number(range[2]));
        end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
        if (start > end || start >= stats.size) { res.setHeader('Content-Range', `bytes */${stats.size}`); return send(res, 416); }
        status = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
      }
      res.writeHead(status, { 'Content-Type': type, 'Content-Length': Math.max(0, end - start + 1), 'Accept-Ranges': 'bytes' });
      if (req.method === 'HEAD' || !stats.size) return res.end();
      createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (!res.headersSent && !res.destroyed) send(res, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? '찾을 수 없습니다.' : '저장하지 못했습니다. 다시 시도해 주세요.' });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createApp();
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '127.0.0.1', () => console.log(`VOID archive → http://127.0.0.1:${port}`));
}
