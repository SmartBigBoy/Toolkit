const CACHE_NAME = 'toolkit-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/css/style.css',
        '/js/main.js',
        '/js/tools_data.js',
        '/tools/json.html',
        '/tools/timestamp.html',
        '/tools/base64.html',
        '/tools/qrcode.html',
        '/tools/color.html',
        '/tools/url.html',
        '/tools/text.html',
        '/tools/hash.html',
        '/tools/password.html',
        '/tools/unit.html',
        '/tools/convert.html',
        '/tools/math.html',
        '/tools/currency.html',
        '/tools/photo.html',
        '/tools/ip.html',
        '/tools/date.html',
        '/tools/timer.html',
        '/tools/compress.html',
        '/tools/scan.html',
        '/tools/screenshot.html',
        '/tools/mbti.html',
        '/tools/alipay.html',
        '/tools/train.html',
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return res;
    }))
  );
});
