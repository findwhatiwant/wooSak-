// All sample visuals are drawn live; no third-party imagery or network requests.
const TAU = Math.PI * 2;
export function createArtwork(canvas, variant = 'wave', { animated = false, interactive = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { destroy() {}, pause() {} };
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, frame = 0, elapsed = 0, last = 0, paused = false, visible = true, destroyed = false;
  let pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  const noise = document.createElement('canvas'); noise.width = 160; noise.height = 160;
  const nctx = noise.getContext('2d'); const pixels = nctx.createImageData(160, 160);
  let seed = 5729;
  for (let i = 0; i < pixels.data.length; i += 4) { seed = (seed * 16807) % 2147483647; const value = seed % 256; pixels.data.set([value, value, value, 255], i); }
  nctx.putImageData(pixels, 0, 0);
  const texture = ctx.createPattern(noise, 'repeat');
  function draw(time) {
    const w = width, h = height, s = Math.min(w * .73, h * 1.27), t = time * .00013;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2);
    if (variant === 'wave' || variant === 'drift') {
      const rows = variant === 'drift' ? 88 : 112;
      for (let j = 0; j < rows; j++) {
        const v = j / (rows - 1) * 2 - 1;
        ctx.beginPath();
        for (let i = 0; i <= 125; i++) {
          const u = i / 125 * 2 - 1;
          const envelope = Math.pow(Math.max(0, 1 - u * u), .55);
          const z = Math.sin(u * 3.7 + v * 2.6 + t + pointer.x * .5) * .22 + Math.cos(v * 4.3 - u * 2.6 + t * .7) * .14;
          const x = (u * .68 + v * .21 + pointer.x * v * .07) * s;
          const y = (v * .2 + z * envelope * (variant === 'drift' ? .7 : 1) + pointer.y * u * .05) * s;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const shine = .22 + .59 * Math.pow(1 - Math.abs(v), .5);
        ctx.strokeStyle = `rgba(229,229,219,${shine})`; ctx.lineWidth = .65; ctx.stroke();
      }
    } else if (variant === 'rings') {
      const scale = Math.min(w, h) * .38;
      for (let i = 0; i < 90; i++) {
        const p = i / 90; ctx.beginPath();
        for (let j = 0; j <= 240; j++) { const a = j / 240 * TAU; const r = (.19 + p * .8) * scale + Math.sin(a * 4 + p * 8 + t) * 6 * p; const x = Math.cos(a) * r; const y = Math.sin(a) * r * (.8 + .2 * p); if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.strokeStyle = `rgba(220,220,215,${.16 + p * .55})`; ctx.lineWidth = .65; ctx.stroke();
      }
    } else if (variant === 'noise') {
      for (let j = 0; j < 170; j++) { const y = (j / 170 - .5) * h * .72; const swell = Math.exp(-Math.pow(y / (h * .2), 2)); ctx.beginPath();
        for (let i = 0; i <= 130; i++) { const x = (i / 130 - .5) * w * .9; const dy = (Math.sin(i * 1.9 + j * 1.8 + t) * Math.sin(i * .19 + j * .11) * 13 + Math.sin(i * .08 + j * .05 + t) * 32) * swell; if (!i) ctx.moveTo(x, y + dy); else ctx.lineTo(x, y + dy); }
        ctx.strokeStyle = `rgba(230,230,220,${.1 + swell * .32})`; ctx.lineWidth = .5; ctx.stroke(); }
    } else if (variant === 'topography') {
      for (let i = 0; i < 65; i++) { ctx.beginPath(); const r = 10 + i * Math.min(w, h) / 110;
        for (let j = 0; j <= 190; j++) { const a = j / 190 * TAU; const warp = 1 + .13 * Math.sin(a * 3 + i * .055 + t) + .09 * Math.cos(a * 5 - i * .03); const x = Math.cos(a) * r * warp * 1.2; const y = Math.sin(a) * r * warp * .86; if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.strokeStyle = '#42423b'; ctx.lineWidth = .65; ctx.stroke(); }
    } else if (variant === 'particles') {
      const scale = Math.min(w, h) * .34;
      for (let i = 0; i < 6500; i++) { const a = i * 2.39996; const p = Math.sqrt(i / 6500); const r = scale * p; const phase = Math.sin(a * 3 + p * 14 + t); const x = Math.cos(a) * r * (1 + phase * .16); const y = Math.sin(a) * r * .86 + phase * 13; ctx.fillStyle = `rgba(235,235,225,${.12 + (1 - p) * .7})`; ctx.fillRect(x, y, .8 + (1 - p) * .7, .8 + (1 - p) * .7); }
    } else if (variant === 'horizon') {
      const gradient = ctx.createLinearGradient(0, -h * .19, 0, h * .3); gradient.addColorStop(0, '#101010'); gradient.addColorStop(.47, '#343431'); gradient.addColorStop(.5, '#e3e3d9'); gradient.addColorStop(.515, '#5d5d57'); gradient.addColorStop(1, '#101010'); ctx.fillStyle = gradient; ctx.fillRect(-w / 2, -h / 2, w, h);
      for (let i = 0; i < 55; i++) { const y = h * .05 + (i / 55) ** 2 * h * .4; ctx.strokeStyle = `rgba(220,220,210,${.1 - i / 650})`; ctx.beginPath(); ctx.moveTo(-w / 2, y + Math.sin(i + t) * 2); ctx.lineTo(w / 2, y); ctx.stroke(); }
    }
    ctx.restore(); ctx.globalAlpha = variant === 'topography' ? .08 : .055; ctx.fillStyle = texture; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
  function tick(now) { frame = 0; if (destroyed) return; if (!visible || document.hidden || paused || media.matches || !animated) { last = 0; return; } if (now - last > 32) { elapsed += last ? Math.min(now - last, 80) : 16; last = now; pointer.x += (target.x - pointer.x) * .04; pointer.y += (target.y - pointer.y) * .04; draw(elapsed); } frame = requestAnimationFrame(tick); }
  function start() { if (!frame && !destroyed) frame = requestAnimationFrame(tick); }
  function resize() { const rect = canvas.getBoundingClientRect(); width = rect.width || 600; height = rect.height || 400; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(elapsed); start(); }
  function move(event) { const rect = canvas.getBoundingClientRect(); target = { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: (event.clientY - rect.top) / rect.height * 2 - 1 }; }
  function leave() { target = { x: 0, y: 0 }; }
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) start(); }); intersection.observe(canvas);
  const visibilityChange = () => { if (!document.hidden) start(); };
  const preferenceChange = () => { draw(elapsed); start(); };
  document.addEventListener('visibilitychange', visibilityChange); media.addEventListener('change', preferenceChange);
  if (interactive) { canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave); }
  resize();
  return { pause(value) { paused = value; if (!paused) start(); }, destroy() { destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', visibilityChange); media.removeEventListener('change', preferenceChange); } };
}
