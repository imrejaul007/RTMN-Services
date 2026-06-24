import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Media } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Media client instantiates with all 6 sub-clients', () => {
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(m.content); assert.ok(m.creators); assert.ok(m.channels); assert.ok(m.playlists); assert.ok(m.live); assert.ok(m.comments);
});

test('MediaContentClient.upload POSTs to :5600/api/content', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'v-1', title: 'X', description: '', videoUrl: '', thumbnailUrl: '', durationSec: 0, creatorId: 'c-1', tags: [], visibility: 'public', drmProtected: false, viewCount: 0, likeCount: 0, live: false, createdAt: 't', updatedAt: 't' }) };
  });
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.content.upload({ title: 'X', description: '', videoUrl: '', thumbnailUrl: '', durationSec: 0, creatorId: 'c-1' });
  assert.equal(captured.url, 'http://localhost:5600/api/content');
  assert.equal(captured.body.title, 'X');
  restore();
});

test('MediaCreatorsClient.create POSTs to :5600/api/creators', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'cr-1', handle: 'maya', name: 'Maya', verified: false, subscriberCount: 0, videoCount: 0, totalViews: 0, createdAt: 't' }) };
  });
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.creators.create({ handle: 'maya', name: 'Maya' });
  assert.equal(captured.url, 'http://localhost:5600/api/creators');
  assert.equal(captured.body.handle, 'maya');
  restore();
});

test('MediaChannelsClient.subscribe POSTs to :5600/api/channels/:id/subscribe', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ subscribed: true, channelId: 'ch-1', subscriberCount: 1 }) };
  });
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.channels.subscribe('ch-1', 'u-1');
  assert.equal(captured.url, 'http://localhost:5600/api/channels/ch-1/subscribe');
  assert.equal(captured.body.userId, 'u-1');
  restore();
});

test('MediaLiveClient.start POSTs to :5600/api/live/start', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'ls-1', title: 'Live', creatorId: 'c-1', status: 'live', ingestUrl: '', playbackUrl: '', viewerCount: 0, startedAt: 't' }) };
  });
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.live.start({ title: 'Live', creatorId: 'c-1', ingestUrl: 'rtmp://...', playbackUrl: 'https://...' });
  assert.equal(captured.url, 'http://localhost:5600/api/live/start');
  restore();
});

test('MediaCommentsClient.create POSTs to :5600/api/comments', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'c-1', videoId: 'v-1', authorId: 'u-1', authorName: 'A', body: 'Great!', likeCount: 0, createdAt: 't' }) };
  });
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.comments.create({ videoId: 'v-1', authorId: 'u-1', authorName: 'A', body: 'Great!' });
  assert.equal(captured.url, 'http://localhost:5600/api/comments');
  assert.equal(captured.body.body, 'Great!');
  restore();
});

test('Media client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] };
  });
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const items = await m.content.list();
  assert.equal(calls, 3);
  assert.deepEqual(items, []);
  restore();
});

test('Media client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const m = new Media({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => m.content.get('missing'), /HTTP 404/);
  restore();
});
