// Mode hors ligne : l'appli se lance même sans réseau (la radio et la météo, elles, ont besoin d'Internet)
var CACHE = 'capri-v14';
var FILES = ['./', 'index.html', 'css/style.css', 'js/figure.js', 'js/data.js', 'js/effects.js', 'js/stage.js', 'js/brain.js', 'js/gate.js', 'js/extras.js', 'js/social.js', 'js/phone.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'img/hair.png', 'img/intro-grab.png', 'img/intro-smear.png', 'img/intro-wave1.png', 'img/intro-wave2.png', 'img/intro-wave3.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// un toucher sur une notification d'alerte ouvre (ou ramène) Capri
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (list) {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});

// fichiers de l'appli : réseau d'abord (pour les mises à jour), cache si hors ligne
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin && url.hostname.indexOf('fonts.') !== 0) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});
