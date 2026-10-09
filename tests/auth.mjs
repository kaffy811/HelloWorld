import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server.js';
import { fallbackCallback, needsAuthRefresh, routeCookies } from '../lib/supabase/route-cookies.mjs';

test('first OAuth exchange puts every session chunk on the final redirect, readable on the next request', async () => {
  const options = { cookieOptions: { name: 'sb-test-auth-token' } };
  const start = routeCookies([]);
  const beginning = createServerClient('https://auth.example.test', 'test-publishable-key', { ...options, cookies: start.cookies });
  const { error } = await beginning.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://app.example.test/auth/callback' } });
  assert.equal(error, null);
  const verifier = start.cookies.getAll().find(c => c.name.endsWith('code-verifier'));
  assert.ok(verifier);
  const user = { id: '12345678-1234-4234-8234-123456789abc', aud: 'authenticated', role: 'authenticated', email: 'test@example.test', app_metadata: { provider: 'google' }, user_metadata: { picture: 'x'.repeat(7000) }, created_at: new Date().toISOString() };
  const jwt = [Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'signature'].join('.');
  let exchanges = 0;
  const fetcher = async (url, init) => {
    if (String(url).includes('/token')) {
      exchanges++;
      const body = JSON.parse(init.body);
      assert.equal(body.auth_code, 'test-code');
      assert.ok(body.code_verifier.length >= 43);
      return Response.json({ access_token: jwt, refresh_token: 'test-refresh-token', expires_in: 3600, token_type: 'bearer', user });
    }
    assert.match(String(url), /\/user$/);
    return Response.json(user);
  };
  const callback = routeCookies(start.cookies.getAll());
  const client = createServerClient('https://auth.example.test', 'test-publishable-key', { ...options, cookies: callback.cookies, global: { fetch: fetcher } });
  const exchange = await client.auth.exchangeCodeForSession('test-code');
  assert.equal(exchange.error, null);
  const response = callback.finish(NextResponse.redirect('https://app.example.test/notebook'));
  const cookies = response.cookies.getAll();
  assert.ok(cookies.filter(c => c.name.startsWith('sb-test-auth-token.')).length > 1, 'chunked Google user metadata persists');
  assert.equal(cookies.find(c => c.name.endsWith('code-verifier')).value, '', 'used verifier is removed');
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  assert.equal(response.headers.get('location'), 'https://app.example.test/notebook');
  const next = createServerClient('https://auth.example.test', 'test-publishable-key', { ...options, cookies: routeCookies(cookies).cookies, global: { fetch: fetcher } });
  const signedIn = await next.auth.getUser();
  assert.equal(signedIn.data.user.id, user.id);
  assert.equal(exchanges, 1, 'one exchange, no second login');
});

test('Site URL fallback is sent to server exchange before homepage rendering, without external next redirects', () => {
  const callback = fallbackCallback(new Request('https://app.example.test/?code=test-code&next=https://evil.example'));
  assert.equal(callback.href, 'https://app.example.test/auth/callback?code=test-code');
  assert.equal(fallbackCallback(new Request('https://app.example.test/')), null);
  assert.equal(fallbackCallback(new Request('https://app.example.test/auth/callback?code=test-code')), null);
  assert.equal(fallbackCallback(new Request('https://app.example.test/?code=test-code', { method: 'POST' })), null);
});

test('initial auth hydration and cross-tab login/logout refresh stale server UI once, without focus refresh loops', () => {
  assert.equal(needsAuthRefresh(null, 'user', undefined), true);
  assert.equal(needsAuthRefresh(null, 'user', 'user'), false);
  assert.equal(needsAuthRefresh('user', 'user', undefined), false);
  assert.equal(needsAuthRefresh('user', null, undefined), true);
  assert.equal(needsAuthRefresh('user', null, null), false);
  assert.equal(needsAuthRefresh(null, null, undefined), false);
});
