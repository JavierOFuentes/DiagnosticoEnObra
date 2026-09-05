/* Diagnóstico en obra — AEA 90364 · service worker.
   Guarda la app en el teléfono y la sirve sin conexión.
   Al publicar una versión nueva, cambiá VERSION: el navegador borra la caché
   vieja y baja la nueva la primera vez que se abra la app con señal. */
var VERSION  = 'diag-aea-2026-09-05';
var ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VERSION)
      .then(function(c){ return c.addAll(ARCHIVOS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k===VERSION ? null : caches['delete'](k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  if(e.request.url.indexOf('http') !== 0) return;
  e.respondWith(
    caches.match(e.request).then(function(guardado){
      if(guardado){
        /* Con señal, deja la versión nueva lista para el próximo arranque. */
        fetch(e.request).then(function(n){
          if(n && n.ok) caches.open(VERSION).then(function(c){ c.put(e.request, n); });
        })['catch'](function(){});
        return guardado;
      }
      return fetch(e.request).then(function(n){
        if(n && n.ok){ var copia=n.clone(); caches.open(VERSION).then(function(c){ c.put(e.request, copia); }); }
        return n;
      })['catch'](function(){
        return caches.match('./index.html');
      });
    })
  );
});
