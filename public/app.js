import { createArtwork } from './art.js';
import { AmbientSound } from './sound.js';
import { youtubeSources } from './youtube.js';

const $ = selector => document.querySelector(selector);
const types = { media: 'Media art', sound: 'Ambient sound', image: 'Visual studies' };
const playIcon = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 3l8 5-8 5V3Z" stroke="currentColor"/></svg>';
const waveIcon = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 6v4m3-7v10m3-8v6m3-9v12m3-8v4" stroke="currentColor"/></svg>';
let works = [], filter = 'all', cardArt = [], detailArt, currentWork, isLocal = false, toastTimer;
const ambient = new AmbientSound();
const hero = createArtwork($('#hero-canvas'), 'wave', { animated: true, interactive: true });
$('#current-year').textContent = new Date().getFullYear();
$('#upload-form [name=year]').value = new Date().getFullYear();
$('#hero-canvas').addEventListener('pointermove', event => { const r = event.currentTarget.getBoundingClientRect(); $('#coordinates').textContent = `X ${((event.clientX-r.left)/r.width).toFixed(3)} · Y ${((event.clientY-r.top)/r.height).toFixed(3)}`; });
$('#motion-toggle').addEventListener('click', event => { const button = event.currentTarget; const paused = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', paused); button.setAttribute('aria-label', paused ? '애니메이션 재생' : '애니메이션 일시 정지'); button.innerHTML = paused ? '▷ <span>RESUME</span>' : 'Ⅱ <span>PAUSE</span>'; hero.pause(paused); });
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function soundState(active) { $('#sound-toggle').setAttribute('aria-pressed', active); $('#sound-label').textContent = active ? 'SOUND ON' : 'SOUND OFF'; }
async function stopBackground() { await ambient.stop(); soundState(false); }
$('#sound-toggle').addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; try { if (ambient.active) await stopBackground(); else { await ambient.play(); soundState(true); } } catch (error) { toast(error.message); soundState(false); } finally { button.disabled = false; } });
function render() {
  cardArt.forEach(art => art.destroy()); cardArt = [];
  const collection = works;
  const visible = collection.filter(work => filter === 'all' || work.category === filter);
  $('#work-count').textContent = String(collection.length).padStart(2, '0'); $('#all-count').textContent = String(collection.length).padStart(2, '0');
  $('#archive-footnote').textContent = 'AN ONGOING COLLECTION — 이미지와 소리의 기록';
  const grid = $('#work-grid'); grid.replaceChildren();
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'archive-status'; empty.textContent = '이 분류에는 아직 작품이 없습니다.'; grid.append(empty); }
  visible.forEach(work => {
    const button = document.createElement('button'); button.className = 'work-card'; button.setAttribute('aria-label', `${work.title} — ${types[work.category]} 감상하기`);
    const art = document.createElement('div'); art.className = 'card-art';
    if (work.youtubeId) {
      const img = document.createElement('img'); img.src = youtubeSources(work.youtubeId).thumbnail; img.alt = work.title; img.loading = 'lazy'; img.className = 'youtube-thumbnail'; img.addEventListener('error', () => img.remove(), { once: true }); art.append(img);
    }
    else if (work.mime?.startsWith('image/')) { const img = document.createElement('img'); img.src = work.media; img.alt = work.title; img.loading = 'lazy'; art.append(img); }
    else if (work.mime?.startsWith('video/')) { const video = document.createElement('video'); video.src = work.media + '#t=0.1'; video.muted = true; video.playsInline = true; video.preload = 'metadata'; video.setAttribute('aria-hidden', 'true'); art.append(video); }
    else { const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); art.append(canvas); }
    const number = document.createElement('span'); number.className = 'card-number mono'; number.textContent = `${String(collection.indexOf(work)+1).padStart(3,'0')} / ${work.youtubeId ? 'YOUTUBE' : 'ORIGINAL'}`;
    const type = document.createElement('span'); type.className = 'card-type mono'; type.innerHTML = (work.category === 'sound' ? waveIcon : playIcon); type.append(document.createTextNode(types[work.category].toUpperCase()));
    const arrow = document.createElement('span'); arrow.className = 'card-open'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); art.append(number, type, arrow);
    const titleRow = document.createElement('div'); titleRow.className = 'card-title-row'; const title = document.createElement('h3'); title.textContent = work.title; const year = document.createElement('span'); year.className = 'mono'; year.textContent = work.year; titleRow.append(title, year);
    const description = document.createElement('p'); description.className = 'card-description'; description.textContent = work.subtitle || types[work.category];
    button.append(art, titleRow, description); button.addEventListener('click', () => openWork(work)); grid.append(button);
    const canvas = art.querySelector('canvas'); if (canvas) cardArt.push(createArtwork(canvas, work.variant || 'rings'));
  });
}
$('.filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; filter = button.dataset.filter; document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button); }); render(); });
async function openWork(work) {
  currentWork = work; await stopBackground();
  const visual = $('#detail-visual'), controls = $('#detail-controls'); visual.replaceChildren(); controls.replaceChildren();
  $('#detail-title').textContent = work.title; $('#detail-meta').textContent = [types[work.category].toUpperCase(), work.year, work.youtubeId ? 'YOUTUBE' : ''].filter(Boolean).join(' / '); $('#detail-description').textContent = work.description;
  $('#delete-work').hidden = !isLocal || !work.media; $('#delete-work').textContent = '이 작품 삭제'; $('#delete-work').dataset.confirm = '';
  visual.classList.toggle('youtube-visual', Boolean(work.youtubeId));
  if (work.youtubeId) {
    const sources = youtubeSources(work.youtubeId, location.origin);
    const iframe = document.createElement('iframe');
    iframe.src = sources.embed; iframe.title = `${work.title} — YouTube 영상`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    visual.append(iframe);
    const link = document.createElement('a'); link.href = sources.watch; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'youtube-link'; link.textContent = 'YouTube에서 보기 ↗';
    const hint = document.createElement('p'); hint.className = 'youtube-note'; hint.textContent = '영상이 재생되지 않으면 YouTube에서 감상해 주세요.';
    controls.append(link, hint);
  }
  else if (work.mime?.startsWith('image/')) { const img = document.createElement('img'); img.src = work.media; img.alt = work.title; visual.append(img); }
  else if (work.mime?.startsWith('video/')) { const video = document.createElement('video'); video.src = work.media; video.controls = true; video.playsInline = true; video.preload = 'metadata'; visual.append(video); }
  else { const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `${work.title} 시각화`); visual.append(canvas); }
  if (work.mime?.startsWith('audio/')) { const audio = document.createElement('audio'); audio.src = work.media; audio.controls = true; audio.preload = 'metadata'; controls.append(audio); }
  $('#work-dialog').showModal();
  const canvas = visual.querySelector('canvas'); if (canvas) detailArt = createArtwork(canvas, work.variant || 'rings', { animated: true, interactive: true });
}
for (const dialog of document.querySelectorAll('dialog')) { dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }); }
$('#work-dialog').addEventListener('close', () => { detailArt?.destroy(); detailArt = null; $('#detail-visual').querySelectorAll('video').forEach(video => video.pause()); $('#detail-controls').querySelectorAll('audio').forEach(audio => audio.pause()); $('#detail-visual').querySelectorAll('iframe').forEach(iframe => iframe.remove()); });
$('#add-work').addEventListener('click', () => { $('#upload-error').textContent = ''; $('#upload-dialog').showModal(); });
const fileInput = $('#work-file');
function updateFile() { const file = fileInput.files[0]; $('#file-label').textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : '작품 파일을 선택하거나 끌어 놓으세요'; if (file) $('#upload-form [name=category]').value = file.type.startsWith('audio/') ? 'sound' : file.type.startsWith('image/') ? 'image' : 'media'; }
fileInput.addEventListener('change', updateFile);
for (const name of ['dragenter','dragover']) $('#file-drop').addEventListener(name, event => { event.preventDefault(); $('#file-drop').classList.add('dragging'); });
for (const name of ['dragleave','drop']) $('#file-drop').addEventListener(name, event => { event.preventDefault(); $('#file-drop').classList.remove('dragging'); if (name === 'drop' && event.dataTransfer.files.length) { fileInput.files = event.dataTransfer.files; updateFile(); } });
$('#upload-form').addEventListener('submit', async event => {
  event.preventDefault(); const file = fileInput.files[0]; if (!file) return;
  const errorBox = $('#upload-error'); if (file.size > 50 * 1024 * 1024) { errorBox.textContent = '파일당 최대 50MB입니다. 큰 영상은 압축해 주세요.'; return; }
  const data = new FormData(event.currentTarget); const metadata = { title: data.get('title'), category: data.get('category'), year: data.get('year'), description: data.get('description') };
  const button = event.currentTarget.querySelector('[type=submit]'); button.disabled = true; button.textContent = '저장하는 중…'; errorBox.textContent = '';
  try { const response = await fetch('./api/works', { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream', 'x-artwork': encodeURIComponent(JSON.stringify(metadata)) }, body: file }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '등록에 실패했습니다.'); works.unshift(result); filter = 'all'; document.querySelector('[data-filter=all]').click(); $('#upload-dialog').close(); $('#upload-form').reset(); updateFile(); toast('작품을 저장했습니다. GitHub에 푸시하면 공개 사이트에 반영됩니다.'); }
  catch (error) { errorBox.textContent = error.message || '로컬 서버 연결을 확인해 주세요.'; }
  finally { button.disabled = false; button.innerHTML = '아카이브에 등록 <span>↗</span>'; }
});
$('#delete-work').addEventListener('click', async event => { const button = event.currentTarget; if (!button.dataset.confirm) { button.dataset.confirm = 'true'; button.textContent = '정말 삭제할까요? 다시 누르면 파일도 삭제됩니다.'; return; } button.disabled = true; try { const response = await fetch(`./api/works/${encodeURIComponent(currentWork.id)}`, { method: 'DELETE' }); if (!response.ok) throw new Error('삭제하지 못했습니다. 다시 시도해 주세요.'); works = works.filter(work => work.id !== currentWork.id); $('#work-dialog').close(); render(); toast('작품을 삭제했습니다.'); } catch (error) { toast(error.message); } finally { button.disabled = false; } });
async function load() {
  try { const response = await fetch('./content/works.json'); if (!response.ok) throw new Error('작품 목록을 불러오지 못했습니다.'); const data = await response.json(); if (!Array.isArray(data)) throw new Error('작품 목록 형식을 확인해 주세요.'); works = data; }
  catch { $('#archive-status').textContent = '작품 목록을 불러오지 못했습니다. 연결을 확인한 후 새로고침해 주세요.'; }
  render();
  if (['localhost','127.0.0.1'].includes(location.hostname)) { try { const response = await fetch('./api/local'); const data = await response.json(); isLocal = data.local === true; $('#add-work').hidden = !isLocal; } catch { /* Static local previews remain read-only. */ } }
}
load();
