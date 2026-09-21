/* Diagnóstico en obra — AEA 90364 · service worker.
   Guarda la app en el teléfono y la sirve sin conexión.
   Al publicar una versión nueva, cambiá VERSION: el navegador borra la caché
   vieja y baja la nueva la primera vez que se abra la app con señal. */
var VERSION  = 'diag-aea-2026-09-21-1';
var ARCHIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

/* Pide el archivo a la red salteando la caché HTTP del navegador.
   Sin esto, addAll() y la revalidación toman lo que el navegador (o el CDN de
   GitHub Pages) tenga guardado, que puede ser una copia vieja. Esa copia vieja
   queda archivada adentro de la caché que lleva el nombre de la versión NUEVA,
   y entonces el teléfono muestra la app desactualizada aunque el servidor
   tenga el archivo correcto. Es lo que pasó con la versión 2026-09-06-3. */
function aLaRed(url){ return new Request(url, {cache: 'reload'}); }

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VERSION)
      .then(function(c){ return c.addAll(ARCHIVOS.map(aLaRed)); })
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
        /* Con señal, deja la versión nueva lista para el próximo arranque.
           También saltea la caché HTTP: si no, la revalidación puede volver a
           guardar la misma copia vieja y la app nunca se actualiza sola. */
        fetch(aLaRed(e.request.url)).then(function(n){
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
