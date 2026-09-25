const CACHE = 'poruch-static-shell-69bb5d665ef0';
const BASE = '/poruch-preview';
const ROUTES = [
  '/', '/situation', '/clarify', '/import-document', '/next-step',
  '/route-choice', '/handoff', '/questions', '/case', '/case-result', '/case-handoff',
  '/documents', '/document-detail', '/document-sample', '/document-compose', '/offline-model',
  '/public-request', '/military-report', '/privacy', '/how-it-works',
  '/lawyers', '/_sitemap', '/+not-found', '/path',
  '/path/after-injury', '/path/military-report', '/path/functioning-assessment',
  '/path/missing-service-member', '/path/captive-service-member',
  '/path/returned-from-captivity', '/path/public-information-request',
  '/path/family-after-service-member-death', '/path/free-legal-aid',
];
const SHELL = ROUTES.map(path => `${BASE}${path === '/' ? '/' : `${path}/`}`);
const STATIC_PREFIXES = [`${BASE}/_expo/static/`, `${BASE}/assets/`, `${BASE}/icons/`, `${BASE}/wllama/`];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    ...SHELL,
    `${BASE}/manifest.webmanifest`,
    `${BASE}/icons/icon-192.png`,
    `${BASE}/icons/apple-touch-icon.png`,
  ])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('poruch-static-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

function mayStore(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return false;
  const control = response.headers.get('Cache-Control') || '';
  const disposition = response.headers.get('Content-Disposition') || '';
  return !/private|no-store/i.test(control) && !/attachment/i.test(disposition) && request.credentials === 'same-origin';
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE}/`)) return;
  const routePath = url.pathname.slice(BASE.length).replace(/\/$/, '') || '/';
  const isRoute = ROUTES.includes(routePath);
  const isStatic = STATIC_PREFIXES.some(prefix => url.pathname.startsWith(prefix)) || url.pathname === `${BASE}/manifest.webmanifest`;
  if (!isRoute && !isStatic) return;

  const routeRequest = new Request(`${url.origin}${url.pathname}`, { method: 'GET', credentials: 'same-origin' });

  if (isRoute) {
    event.respondWith(fetch(request).then(response => {
      if (mayStore(request, response)) void caches.open(CACHE).then(cache => cache.put(routeRequest, response.clone()));
      return response;
    }).catch(() => caches.match(routeRequest).then(cached => cached
      || caches.match(`${BASE}${routePath === '/' ? '/' : `${routePath}/`}`)
      || caches.match(`${BASE}/`))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (mayStore(request, response)) void caches.open(CACHE).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
