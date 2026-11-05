// Ana ekran ve araçlar arası geçiş. Adres çubuğundaki #ad hangi aracın açık olduğunu söyler.

import { el } from './ortak.js';

export const SURUM = '2026-11-05-h';

const GRUPLAR = [
  {
    baslik: 'PDF\'e çevir',
    araclar: [
      { id: 'word', ad: 'Word\'den PDF\'e', aciklama: 'DOCX, DOC, ODT, RTF', modul: 'ofis', islev: 'word' },
      { id: 'slayt', ad: 'Slayttan PDF\'e', aciklama: 'PPTX, PPT, ODP', modul: 'ofis', islev: 'slayt' },
      { id: 'excel', ad: 'Excel\'den PDF\'e', aciklama: 'XLSX, XLS, ODS, CSV', modul: 'ofis', islev: 'excel' },
      { id: 'resimden-pdf', ad: 'Resimden PDF\'e', aciklama: 'Fotoğrafları tek PDF yapar.', modul: 'donusum', islev: 'resimdenPdf' },
    ],
  },
  {
    baslik: 'PDF\'ten çevir',
    araclar: [
      { id: 'pdften-word', ad: 'PDF\'ten Word\'e', aciklama: 'Yazıyı Word\'e aktarır. Resim ve düzen gelmez.', modul: 'ekler', islev: 'pdftenWord' },
      { id: 'pdften-resim', ad: 'PDF\'ten resme', aciklama: 'Sayfaları JPG ya da PNG yapar.', modul: 'donusum', islev: 'pdftenResim' },
      { id: 'pdften-yazi', ad: 'PDF\'ten yazı', aciklama: 'Seçilebilir yazıyı metne çıkarır.', modul: 'ekler', islev: 'pdftenYazi' },
      { id: 'ocr', ad: 'Taranmış sayfadan yazı', aciklama: 'Resimdeki yazıyı metne çevirir.', modul: 'donusum', islev: 'ocr' },
    ],
  },
  {
    baslik: 'PDF düzenle',
    araclar: [
      { id: 'birlestir', ad: 'Birleştir', aciklama: 'Birkaç PDF\'i tek dosya yapar.', modul: 'sayfa', islev: 'birlestir' },
      { id: 'bol', ad: 'Böl', aciklama: 'Seçtiğin sayfaları ayrı dosya yapar.', modul: 'sayfa', islev: 'bol' },
      { id: 'duzenle', ad: 'Sayfaları düzenle', aciklama: 'Sayfa siler, sırasını değiştirir.', modul: 'sayfa', islev: 'duzenle' },
      { id: 'dondur', ad: 'Döndür', aciklama: 'Yan duran sayfaları düzeltir.', modul: 'sayfa', islev: 'dondur' },
      { id: 'kucult', ad: 'Küçült', aciklama: 'PDF\'in boyutunu düşürür.', modul: 'donusum', islev: 'kucult' },
      { id: 'numara', ad: 'Sayfa numarası', aciklama: 'Sayfaların altına numara ekler.', modul: 'ekler', islev: 'sayfaNumarasi' },
      { id: 'filigran', ad: 'Filigran', aciklama: 'Sayfaların üstüne soluk yazı ekler.', modul: 'ekler', islev: 'filigran' },
      { id: 'sifrele', ad: 'Şifrele', aciklama: 'PDF\'e şifre koyar.', modul: 'ekler', islev: 'sifrele' },
      { id: 'sifre-kaldir', ad: 'Şifreyi kaldır', aciklama: 'Şifresini bildiğin PDF\'i açık yapar.', modul: 'ekler', islev: 'sifreKaldir' },
    ],
  },
  {
    baslik: 'Belge',
    araclar: [
      { id: 'belge', ad: 'Belge türünü değiştir', aciklama: 'Word, Excel, slayt, metin ve e-kitap türleri arasında çevirir.', modul: 'ofis', islev: 'belge' },
    ],
  },
  {
    baslik: 'Resim',
    araclar: [
      { id: 'resim', ad: 'Resim çevir ve küçült', aciklama: 'JPG, PNG, WebP, HEIC. Boyutu da düşürür.', modul: 'resim', islev: 'resim' },
    ],
  },
  {
    baslik: 'Ses ve video',
    araclar: [
      { id: 'ses', ad: 'Ses çevir', aciklama: 'MP3, M4A, OGG, WAV. Videodan sesi de alır.', modul: 'medya', islev: 'ses' },
      { id: 'video', ad: 'Video çevir ve küçült', aciklama: 'Her telefonda açılan MP4 yapar.', modul: 'medya', islev: 'video' },
      { id: 'kes', ad: 'Ses ya da video kes', aciklama: 'İstediğin parçayı ayırır.', modul: 'medya', islev: 'kes' },
    ],
  },
];

const MODULLER = {
  sayfa: () => import('./sayfa-araclari.js'),
  donusum: () => import('./donusum-araclari.js'),
  ofis: () => import('./ofis.js'),
  ekler: () => import('./pdf-ekleri.js'),
  resim: () => import('./resim.js'),
  medya: () => import('./medya.js'),
};

const ana = document.getElementById('ana');
let temizlik = null;

function anaEkran() {
  document.title = 'Dosya Araçları';

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
  document.title = `${arac.ad} · Dosya Araçları`;

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
    try {
      sessionStorage.removeItem('pdf-yenilendi');
    } catch {
      // Gizli sekmede erişim kapalı olabilir, iş yine görülür.
    }

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
