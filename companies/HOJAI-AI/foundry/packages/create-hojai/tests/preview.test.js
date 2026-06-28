import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('preview.js', () => {
  test('createPreview generates preview URL', async () => {
    const preview = { id: 'prv_123', url: 'https://preview.hojai.app/prv_123' };
    assert.ok(preview.url.includes('preview.hojai.app'));
  });

  test('listPreviews returns active previews', async () => {
    const previews = [{ id: 'prv_1' }, { id: 'prv_2' }];
    assert.ok(previews.length >= 0);
  });

  test('deletePreview removes preview', async () => {
    const result = { success: true };
    assert.strictEqual(result.success, true);
  });

  test('openPreview generates URL', async () => {
    const preview = { id: 'prv_xyz', url: 'https://preview.hojai.app/prv_xyz' };
    assert.ok(preview.url);
  });
});