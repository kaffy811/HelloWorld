// Per-request cookie buffer: auth redirects must carry every session chunk
// and every deletion, even when the response is created after the exchange.
export function routeCookies(initial) {
  const incoming = new Map(initial.map(cookie => [cookie.name, cookie]));
  const outgoing = new Map();
  return {
    cookies: {
      getAll: () => [...incoming.values()],
      setAll(values) {
        for (const cookie of values) {
          incoming.set(cookie.name, { name: cookie.name, value: cookie.value });
          outgoing.set(cookie.name, cookie);
        }
      },
    },
    finish(response) {
      for (const { name, value, options } of outgoing.values())
        response.cookies.set(name, value, options);
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    },
  };
}

// A provider can fall back to the configured Site URL. Exchange its code
// before rendering the homepage; never leave it for a second login click.
export function fallbackCallback(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname !== '/' || !url.searchParams.has('code')) return null;
  url.pathname = '/auth/callback';
  const code = url.searchParams.get('code');
  url.search = '';
  url.searchParams.set('code', code);
  return url;
}

export function needsAuthRefresh(renderedUserId, sessionUserId, lastRefreshed) {
  const id = sessionUserId ?? null;
  return id !== renderedUserId && id !== lastRefreshed;
}
