const SHELL_CACHE = "lingua-jp-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shellUrl = self.registration.scope;
    const shellResponse = await fetch(shellUrl);
    if (!shellResponse.ok) {
      throw new Error(`Unable to cache the Teacher AI app shell (HTTP ${shellResponse.status}).`);
    }
    const html = await shellResponse.clone().text();
    const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => new URL(match[1], shellUrl))
      .filter((url) => url.origin === self.location.origin && url.pathname.includes("/_next/static/"));
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(shellUrl, shellResponse);
    await Promise.all(assetUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to cache app asset ${url.pathname} (HTTP ${response.status}).`);
      }
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) {
    return;
  }

  if (url.pathname.includes("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(self.registration.scope, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(self.registration.scope);
        if (cached) return cached;
        throw error;
      }
    })());
  }
});
