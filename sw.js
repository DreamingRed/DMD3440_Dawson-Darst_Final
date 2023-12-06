const cacheName = "cacheMoney"
const GHPATH = "/DMD3440_Dawson-Darst_Final"

const URLS = [
    `${GHPATH}/`,
    `${GHPATH}/index.html`,
    `${GHPATH}/css/style.css`,
    `${GHPATH}/scripts/main.js`,
    `${GHPATH}/images/ios/1024.png`,
    'https://unpkg.com/dexie/dist/dexie.js',
    "https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js",
];

self.addEventListener("install", function (e) {
   e.waitUntil(
      caches.open(cacheName).then(function (cache) {
         console.log(`Installing Cache: ${cacheName}\n`)
         return cache.addAll(URLS)
      })
   )
})

self.addEventListener("fetch", event => {
   event.respondWith(
     caches.match(event.request)
     .then(cachedResponse => {
         console.log(`${cachedResponse} retrieved.`)
         return cachedResponse || fetch(event.request);
     }
   )
  )
});