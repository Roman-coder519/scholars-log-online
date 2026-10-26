// Scholar's Log Service Worker v5 — offline + Web Push
const CACHE_NAME = "scholars-log-v5";
const NAV_CACHE_KEY = "/__nav__";

// ── Install: cache the app shell + all its JS/CSS assets ─────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Fetch the root HTML shell
        const htmlResp = await fetch("/", { cache: "reload" });
        if (htmlResp.ok) {
          const html = await htmlResp.clone().text();
          // Store the shell under two keys for fallback matching
          await cache.put("/", htmlResp.clone());
          await cache.put(NAV_CACHE_KEY, htmlResp);

          // Extract all <script src="..."> and <link href="...css"> URLs
          const assetUrls = new Set();
          for (const m of html.matchAll(/\bsrc="([^"]+)"/g)) {
            const u = m[1];
            if (!u.startsWith("http") || u.includes(self.location.host)) assetUrls.add(u.startsWith("/") ? u : "/" + u);
          }
          for (const m of html.matchAll(/\bhref="([^"]*\.css[^"]*)"/g)) {
            const u = m[1];
            if (!u.startsWith("http") || u.includes(self.location.host)) assetUrls.add(u.startsWith("/") ? u : "/" + u);
          }

          // Pre-cache every discovered asset (fail silently per asset)
          await Promise.all(
            [...assetUrls].map(async (url) => {
              try {
                const r = await fetch(url, { cache: "reload" });
                if (r.ok) await cache.put(url, r);
              } catch {}
            })
          );
        }
      } catch {
        // No network at install time — will cache on first use instead
      }

      // Always cache manifest and icons
      const statics = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/icon-384.png"];
      await Promise.all(
        statics.map(async (url) => {
          try {
            const r = await fetch(url, { cache: "reload" });
            if (r.ok) await cache.put(url, r);
          } catch {}
        })
      );

      await self.skipWaiting();
    })()
  );
});

// ── Activate: clean old caches and take control immediately ───────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Helper: should we handle this request? ────────────────────────────────
function shouldHandle(url) {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  // Skip Vite dev server internals and Replit proxy paths
  if (url.pathname.startsWith("/@") || url.pathname.startsWith("/__")) return false;
  if (url.pathname.startsWith("/__replco")) return false;
  return true;
}

function isNavigation(request) {
  return request.mode === "navigate";
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

function isAsset(url) {
  return /\.(js|mjs|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|webp|json)(\?.*)?$/.test(url.pathname);
}

// ── Fetch: smart caching strategy ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!shouldHandle(url)) return;

  // API: network-first, return offline stub on failure
  if (isApi(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "offline", offline: true }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation (HTML pages): network-first, fall back to cached shell
  if (isNavigation(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => {
              c.put(NAV_CACHE_KEY, clone.clone());
              c.put(event.request.url, clone);
            });
          }
          return resp;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(event.request.url)) ||
            (await cache.match("/")) ||
            (await cache.match(NAV_CACHE_KEY));
          if (cached) return cached;
          // Last resort: minimal offline page
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Scholar's Log — Offline</title>
            <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8faf9;color:#333}
            h2{color:#2d6a4f}p{color:#666;text-align:center}button{margin-top:1rem;padding:.6rem 1.4rem;background:#2d6a4f;color:#fff;border:none;border-radius:.5rem;cursor:pointer;font-size:1rem}</style>
            </head><body>
            <h2>Scholar's Log</h2>
            <p>Open the app with an internet connection first<br>to enable offline access.</p>
            <button onclick="location.reload()">Try again</button>
            </body></html>`,
            { status: 200, headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Static assets: cache-first (stale-while-revalidate)
  if (isAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((resp) => {
            if (resp.ok) cache.put(event.request, resp.clone());
            return resp;
          })
          .catch(() => null);

        if (cached) {
          // Serve from cache immediately, update in background
          event.waitUntil(networkFetch);
          return cached;
        }
        // Not cached yet: wait for network
        return networkFetch.then((r) => r || new Response("", { status: 503 }));
      })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok && event.request.method === "GET") {
          caches.open(CACHE_NAME).then((c) => c.put(event.request, resp.clone()));
        }
        return resp;
      })
      .catch(() =>
        caches.match(event.request).then((c) => c || new Response("", { status: 503 }))
      )
  );
});

// ── Web Push: receive push from server ────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Scholar's Log", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...JSON.parse(event.data.text()) };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.title,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: data.url },
    })
  );
});

// ── Notification click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
