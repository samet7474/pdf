// Ana ekran ve araçlar arası geçiş. Adres çubuğundaki #ad hangi aracın açık olduğunu söyler.

import { el } from './ortak.js';

export const SURUM = '2026-11-05-b';

const GRUPLAR = [
  {
    baslik: 'Sayfa işleri',
    araclar: [
      { id: 'birlestir', ad: 'Birleştir', aciklama: 'Birkaç PDF\'i tek dosya yapar.', modul: 'sayfa', islev: 'birlestir' },
      { id: 'bol', ad: 'Böl', aciklama: 'Seçtiğin sayfaları ayrı dosya yapar.', modul: 'sayfa', islev: 'bol' },
      { id: 'duzenle', ad: 'Sayfaları düzenle', aciklama: 'Sayfa siler, sırasını değiştirir.', modul: 'sayfa', islev: 'duzenle' },
      { id: 'dondur', ad: 'Döndür', aciklama: 'Yan duran sayfaları düzeltir.', modul: 'sayfa', islev: 'dondur' },
    ],
  },
  {
    baslik: 'Dönüştürme',
    araclar: [
      { id: 'resimden-pdf', ad: 'Resimden PDF\'e', aciklama: 'Fotoğrafları tek PDF yapar.', modul: 'donusum', islev: 'resimdenPdf' },
      { id: 'pdften-resim', ad: 'PDF\'ten resme', aciklama: 'Sayfaları JPG ya da PNG yapar.', modul: 'donusum', islev: 'pdftenResim' },
      { id: 'word', ad: 'Word\'den PDF\'e', aciklama: 'İlk seferde büyük bir motor indirir.', modul: 'word', islev: 'word' },
    ],
  },
  {
    baslik: 'Küçültme ve yazı',
    araclar: [
      { id: 'kucult', ad: 'Küçült', aciklama: 'Dosya boyutunu düşürür.', modul: 'donusum', islev: 'kucult' },
      { id: 'ocr', ad: 'Taranmış sayfadan yazı', aciklama: 'Resimdeki yazıyı metne çevirir.', modul: 'donusum', islev: 'ocr' },
    ],
  },
];

const MODULLER = {
  sayfa: () => import('./sayfa-araclari.js'),
  donusum: () => import('./donusum-araclari.js'),
  word: () => import('./word.js'),
};

const ana = document.getElementById('ana');
let temizlik = null;

function anaEkran() {
  document.title = 'PDF Araçları';

  ana.replaceChildren(
    ...GRUPLAR.flatMap((grup) => [
      el('h2', {}, grup.baslik),
      el(
        'div',
        { sinif: 'izgara' },
        ...grup.araclar.map((arac) =>
          el(
            'a',
            { sinif: 'arac', href: `#${arac.id}` },
            el('strong', {}, arac.ad),
            el('span', {}, arac.aciklama),
          ),
        ),
      ),
    ]),
  );
}

async function aracEkrani(arac) {
  document.title = `${arac.ad} · PDF Araçları`;

  const govde = el('div', {}, el('p', { sinif: 'durum' }, 'Yükleniyor'));

  ana.replaceChildren(
    el('a', { sinif: 'geri', href: '#' }, '← Bütün araçlar'),
    el('h1', {}, arac.ad),
    el('p', { sinif: 'aciklama' }, arac.aciklama),
    govde,
  );

  try {
    const modul = await MODULLER[arac.modul]();

    if (location.hash !== `#${arac.id}`) {
      return;
    }

    govde.replaceChildren();
    temizlik = modul[arac.islev](govde) ?? null;
  } catch (hata) {
    console.error(hata);
    govde.replaceChildren(
      el('p', { sinif: 'durum hata' }, 'Araç açılamadı. İnternetini kontrol edip sayfayı yenile.'),
    );
  }
}

function yonlendir() {
  temizlik?.();
  temizlik = null;

  const id = location.hash.slice(1);
  const arac = GRUPLAR.flatMap((grup) => grup.araclar).find((a) => a.id === id);

  window.scrollTo(0, 0);

  if (arac) {
    aracEkrani(arac);
  } else {
    anaEkran();
  }
}

// Word aracı için gerekli izin yalnız service worker ile gelir.
// Bu yüzden ilk açılışta worker devreye girince sayfa bir kez yenilenir.
async function workerKur() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register('sw.js');
  } catch (hata) {
    console.error(hata);
    return;
  }

  if (window.crossOriginIsolated) {
    return;
  }

  await navigator.serviceWorker.ready;

  let yenilendi = false;

  try {
    yenilendi = sessionStorage.getItem('pdf-yenilendi') === '1';
    sessionStorage.setItem('pdf-yenilendi', '1');
  } catch {
    yenilendi = false;
  }

  if (!yenilendi) {
    location.reload();
  }
}

document.getElementById('surum').textContent = `Sürüm ${SURUM}`;
window.addEventListener('hashchange', yonlendir);
yonlendir();
workerKur();
