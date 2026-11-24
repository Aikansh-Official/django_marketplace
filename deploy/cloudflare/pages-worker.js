// Both frontends use /api on their own origin; Django remains the API server.
function unavailable(message) {
  return Response.json({ detail: message, service_unavailable: true }, {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!/^\/(api|media)(\/|$)/.test(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    let backend;
    try {
      backend = new URL(env.BACKEND_ORIGIN);
      if (backend.protocol !== 'https:' || backend.username || backend.password ||
          backend.pathname !== '/' || backend.search || backend.hash ||
          backend.origin === url.origin) {
        throw new Error('Invalid backend origin');
      }
    } catch {
      return unavailable('The marketplace service is not connected yet. Please try again later.');
    }

    const target = new URL(url.pathname + url.search, backend.origin);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('x-forwarded-host');
    headers.delete('x-forwarded-for');
    headers.delete('forwarded');
    headers.set('X-Forwarded-Proto', 'https');

    try {
      const upstream = await fetch(target, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
        signal: AbortSignal.timeout(90000),
      });
      const responseHeaders = new Headers(upstream.headers);
      // Never cache account responses or private images at the edge/browser.
      responseHeaders.set('Cache-Control', 'no-store');
      responseHeaders.set('X-Content-Type-Options', 'nosniff');
      responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      const location = responseHeaders.get('Location');
      if (location) {
        const redirect = new URL(location, target);
        if (redirect.origin === backend.origin) {
          responseHeaders.set('Location', url.origin + redirect.pathname + redirect.search + redirect.hash);
        }
      }
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch {
      return unavailable('The marketplace service is temporarily unavailable. Please try again.');
    }
  },
};
