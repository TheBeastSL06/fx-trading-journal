/**
 * sw.js — Minimal no-op service worker
 * ──────────────────────────────────────
 * This exists ONLY to satisfy installability checks in some browsers
 * (Chrome/Edge desktop in particular look for a registered service worker
 * before showing the install icon in the address bar).
 *
 * It does NOT cache anything. Every fetch passes straight through to the
 * network, so there is no stale-cache problem when you update files —
 * you'll never need to "clear cache" because nothing is ever cached here.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Pass-through fetch — no caching, always hits the network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
