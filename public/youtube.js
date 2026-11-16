export function youtubeSources(videoId, origin) {
  if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Invalid YouTube video ID');
  const embed = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  embed.searchParams.set('playsinline', '1');
  embed.searchParams.set('rel', '0');
  if (origin && /^https?:\/\//.test(origin)) embed.searchParams.set('origin', new URL(origin).origin);
  return { embed: embed.href, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, watch: `https://www.youtube.com/watch?v=${videoId}` };
}
