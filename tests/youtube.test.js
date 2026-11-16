import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeSources } from '../public/youtube.js';

test('YouTube works embed the requested video IDs without autoplay', () => {
  for (const id of ['GW6KgJckuWk', 'nRSgOGvR1iw']) {
    const sources = youtubeSources(id, 'https://findwhatiwant.github.io');
    const embed = new URL(sources.embed);
    assert.equal(embed.origin, 'https://www.youtube-nocookie.com');
    assert.equal(embed.pathname, `/embed/${id}`);
    assert.equal(embed.searchParams.get('origin'), 'https://findwhatiwant.github.io');
    assert.equal(embed.searchParams.get('autoplay'), null);
    assert.equal(embed.searchParams.get('playsinline'), '1');
    assert.equal(new URL(sources.watch).searchParams.get('v'), id);
    assert.equal(sources.thumbnail, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
  }
});

test('invalid video IDs cannot inject an embed path or query', () => {
  for (const id of ['', 'short', '../anything', 'GW6KgJckuWk?autoplay=1', null]) {
    assert.throws(() => youtubeSources(id), /Invalid YouTube video ID/);
  }
});
