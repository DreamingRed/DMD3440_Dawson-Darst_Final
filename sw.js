const cacheName = 'cacheMoney'

const urlsToCache = [
    "/",
    "index.html",
    "style.css",
    "scripts/main.js",
  ];

self.addEventListener("install", event => {
   event.waitUntil(
      caches.open(cacheName)
      .then(cache => {
         return cache.addAll(urlsToCache)
      })
   )
})

self.addEventListener("fetch", event => {
   event.respondWith(
     caches.match(event.request)
     .then(cachedResponse => {
	   // It can update the cache to serve updated content on the next request
         console.log(`${cachedResponse} retrieved.`)
         return cachedResponse || fetch(event.request);
     }
   )
  )
});