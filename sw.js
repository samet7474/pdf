// İki iş yapar:
// 1. GitHub Pages özel başlık gönderemediği için Word aracının istediği başlıkları burada ekler.
// 2. Siteyi önbelleğe alır, internet yokken de açılır.
//
// Başlık ekleme fikri coi-serviceworker yönteminden alındı.
// Siteyi güncellerken SURUM değerini app.js ile birlikte artır.

const SURUM = '2026-11-05-b';
const UYGULAMA = `pdf-uygulama-${SURUM}`;
const MOTOR = 'pdf-motor-1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    (async () => {
      const adlar = await caches.keys();

      await Promise.all(
        adlar
          .filter((ad) => ad.startsWith('pdf-uygulama-') && ad !== UYGULAMA)
          .map((ad) => caches.delete(ad)),
      );

      await self.clients.claim();
    })(),
  );
});

function basliklariEkle(yanit) {
  if (yanit.status === 0) {
    return yanit;
  }

  const basliklar = new Headers(yanit.headers);
  basliklar.set('Cross-Origin-Opener-Policy', 'same-origin');
  basliklar.set('Cross-Origin-Embedder-Policy', 'require-corp');
  basliklar.set('Cross-Origin-Resource-Policy', 'same-origin');

  return new Response(yanit.body, {
    status: yanit.status,
    statusText: yanit.statusText,
    headers: basliklar,
  });
}

// Motor dosyaları büyük ve sürüme bağlı: önce önbellek.
// Önbelleğe yazma arka planda yapılır. Beklenirse sayfa dosya bitene kadar
// tek bayt göremez, indirme çubuğu da donmuş görünür.
async function onceOnbellek(olay) {
  const istek = olay.request;
  const onbellek = await caches.open(MOTOR);
  const kayitli = await onbellek.match(istek);

  if (kayitli) {
    return kayitli;
  }

  const yanit = await fetch(istek);

  if (yanit.ok) {
    olay.waitUntil(onbellek.put(istek, yanit.clone()));
  }

  return yanit;
}

// Site dosyaları güncel kalsın: önce internet, yoksa önbellek.
async function onceInternet(olay) {
  const istek = olay.request;
  const onbellek = await caches.open(UYGULAMA);

  try {
    const yanit = await fetch(istek);

    if (yanit.ok) {
      olay.waitUntil(onbellek.put(istek, yanit.clone()));
    }

    return yanit;
  } catch (hata) {
    const kayitli = await onbellek.match(istek);

    if (kayitli) {
      return kayitli;
    }

    throw hata;
  }
}

self.addEventListener('fetch', (olay) => {
  const { request } = olay;
  const adres = new URL(request.url);

  if (request.method !== 'GET' || adres.origin !== self.location.origin) {
    return;
  }

  const motorDosyasi = adres.pathname.includes('/vendor/');

  olay.respondWith(
    (motorDosyasi ? onceOnbellek(olay) : onceInternet(olay)).then(basliklariEkle),
  );
});
