import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Import the deployment module without changing the repository's package type.
const source = await readFile(new URL('./pages-worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('static routes do not require an API connection', async () => {
  const response = await worker.fetch(new Request('https://shop.pages.dev/about'), {
    ASSETS: { fetch: () => new Response('frontend') },
  });
  assert.equal(await response.text(), 'frontend');
});

test('unconfigured and unsafe backends fail closed with JSON', async () => {
  for (const origin of [undefined, 'http://example.com', 'https://user:password@example.com',
    'https://shop.pages.dev', 'https://api.example.com/path']) {
    const response = await worker.fetch(new Request('https://shop.pages.dev/api/auth/status/'), {
      BACKEND_ORIGIN: origin,
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal((await response.json()).service_unavailable, true);
  }
});

test('API proxy uses only configured host, preserves auth and does not follow redirects', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url.href, 'https://api.example.com/api/auth/login/?next=https://attacker.test');
      assert.equal(options.headers.get('Authorization'), 'Bearer test-only');
      assert.equal(options.headers.get('Origin'), 'https://shop.pages.dev');
      assert.equal(options.headers.get('x-forwarded-host'), null);
      assert.equal(options.headers.get('forwarded'), null);
      assert.equal(options.redirect, 'manual');
      assert.equal(await new Response(options.body).text(), '{"test":true}');
      return new Response('redirect', {
        status: 302, headers: { Location: 'https://api.example.com/api/profile/', 'Set-Cookie': 'test=value; Secure; HttpOnly' },
      });
    };
    const request = new Request('https://shop.pages.dev/api/auth/login/?next=https://attacker.test', {
      method: 'POST', body: '{"test":true}',
      headers: { Authorization: 'Bearer test-only', Origin: 'https://shop.pages.dev',
        'X-Forwarded-Host': 'attacker.test', Forwarded: 'host=attacker.test' },
    });
    const response = await worker.fetch(request, { BACKEND_ORIGIN: 'https://api.example.com' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), 'https://shop.pages.dev/api/profile/');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Set-Cookie'), 'test=value; Secure; HttpOnly');
  } finally { globalThis.fetch = originalFetch; }
});

test('upstream connection failure returns no internal details', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('private-host-and-secret'); };
    const response = await worker.fetch(new Request('https://shop.pages.dev/api/health/'), {
      BACKEND_ORIGIN: 'https://api.example.com',
    });
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('private-host-and-secret'), false);
  } finally { globalThis.fetch = originalFetch; }
});
