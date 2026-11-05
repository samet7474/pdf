// Word, Excel, PowerPoint ve benzeri belgeler. LibreOffice tarayıcıda çalışır, dosya cihazdan çıkmaz.
// Yükleme mantığı BentoPDF'in libreoffice-loader.ts dosyasından uyarlandı (AGPL-3.0).

import { belgeCiktilari, uzantisiz } from './aralik.js';
import { el, topluArac } from './ortak.js';

const TABAN = new URL('../vendor/libreoffice/', import.meta.url).href;
const MB = 1024 * 1024;
const ZAMAN_ASIMI_MS = 5 * 60 * 1000;

// Motor bir kez kurulur, aynı oturumda ikinci dönüştürme hızlı olur.
let cevirici = null;

async function indirVeAc(adres, tur, ilerleme) {
  const yanit = await fetch(adres);

  if (!yanit.ok) {
    throw new Error(`Motor dosyası inmedi (${yanit.status}).`);
  }

  const parcalar = [];
  const okuyucu = yanit.body.getReader();

  for (;;) {
    const { done, value } = await okuyucu.read();

    if (done) {
      break;
    }

    parcalar.push(value);
    ilerleme(value.length);
  }

  let blob = new Blob(parcalar);
  const bas = new Uint8Array(await blob.slice(0, 2).arrayBuffer());

  // Sunucu sıkıştırmayı kendisi açtıysa ikinci kez açılmaz.
  if (bas[0] === 0x1f && bas[1] === 0x8b) {
    const acilmis = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    blob = await new Response(acilmis).blob();
  }

  return URL.createObjectURL(new Blob([blob], { type: tur }));
}

async function motorKur(durum) {
  if (cevirici) {
    return cevirici;
  }

  durum.yaz('Belge motoru hazırlanıyor. Yavaş bağlantıda indirme biraz geç başlayabilir.');

  const { WorkerBrowserConverter } = await import('../vendor/libreoffice/browser.js');
  const boyutlar = await (await fetch(`${TABAN}boyut.json`)).json();
  const toplam = boyutlar.wasm + boyutlar.data;
  let inen = 0;

  const ilerleme = (bayt) => {
    inen += bayt;
    const oran = Math.min(1, inen / toplam);
    durum.yaz(
      `Belge motoru iniyor: ${Math.round(inen / MB)} / ${Math.round(toplam / MB)} MB`,
      oran,
    );
  };

  const [wasm, veri] = await Promise.all([
    indirVeAc(`${TABAN}soffice.wasm.gz`, 'application/wasm', ilerleme),
    indirVeAc(`${TABAN}soffice.data.gz`, 'application/octet-stream', ilerleme),
  ]);

  durum.yaz('Belge motoru açılıyor. Bu adım telefonda bir dakika sürebilir.');

  const yeni = new WorkerBrowserConverter({
    sofficeJs: `${TABAN}soffice.js`,
    sofficeWasm: wasm,
    sofficeData: veri,
    sofficeWorkerJs: `${TABAN}soffice.worker.js`,
    browserWorkerJs: `${TABAN}browser.worker.global.js`,
    verbose: false,
  });

  await yeni.initialize();
  cevirici = yeni;
  return cevirici;
}

async function cevir(dosya, hedef, durum) {
  if (!window.crossOriginIsolated) {
    throw new Error('Tarayıcı bu aracı henüz açmadı. Sayfayı yenileyip tekrar dene.');
  }

  const motor = await motorKur(durum);
  durum.yaz(`${dosya.name} çevriliyor`);

  const girdi = new Uint8Array(await dosya.arrayBuffer());
  const is = motor.convert(
    girdi,
    { outputFormat: hedef, inputFormat: dosya.name.split('.').pop().toLowerCase() },
    dosya.name,
  );

  // Motor bazı dosyalarda takılıp hiç dönmeyebiliyor. Kullanıcı sonsuza kadar beklemesin.
  let sayac;
  const zamanAsimi = new Promise((_, reddet) => {
    sayac = setTimeout(() => {
      cevirici = null;
      reddet(new Error('Motor bu dosyada takıldı. Sayfayı yenileyip başka bir tür dene.'));
    }, ZAMAN_ASIMI_MS);
  });

  try {
    const cikti = await Promise.race([is, zamanAsimi]);
    return new Blob([new Uint8Array(cikti.data)], { type: cikti.mimeType });
  } finally {
    clearTimeout(sayac);
  }
}

function motorUyarisi() {
  return 'İlk kullanımda yaklaşık 75 MB iner, Wi-Fi kullan. Motor açılınca 250 MB kadar bellek tutar, eski telefonda kapanabilir.';
}

function sabitArac(kok, { kabul, baslik, ipucu, hedef, not }) {
  topluArac(kok, {
    kabul,
    baslik,
    ipucu,
    uyari: motorUyarisi(),
    dugmeYazisi: 'Çevir',
    is: async (dosya, durum) => ({
      blob: await cevir(dosya, hedef, durum),
      ad: `${uzantisiz(dosya.name)}.${hedef}`,
      mesaj: not,
    }),
  });
}

const YAZI_TIPI_NOTU = 'Hazır. Yazı tipi dosyada gömülü değilse satır sonları biraz kayabilir.';

export function word(kok) {
  sabitArac(kok, {
    kabul: '.docx,.doc,.odt,.rtf',
    baslik: 'Word dosyasını seç',
    ipucu: 'DOCX, DOC, ODT, RTF',
    hedef: 'pdf',
    not: YAZI_TIPI_NOTU,
  });
}

export function slayt(kok) {
  sabitArac(kok, {
    kabul: '.pptx,.ppt,.odp',
    baslik: 'Slayt dosyasını seç',
    ipucu: 'PPTX, PPT, ODP',
    hedef: 'pdf',
    not: YAZI_TIPI_NOTU,
  });
}

export function excel(kok) {
  sabitArac(kok, {
    kabul: '.xlsx,.xls,.ods,.csv',
    baslik: 'Excel dosyasını seç',
    ipucu: 'XLSX, XLS, ODS, CSV',
    hedef: 'pdf',
    not: 'Hazır. Geniş tablolar birkaç sayfaya bölünebilir.',
  });
}

export function belge(kok) {
  const hedef = el('select', {});

  topluArac(kok, {
    kabul: '.docx,.doc,.odt,.rtf,.txt,.html,.htm,.epub,.xlsx,.xls,.ods,.csv,.pptx,.ppt,.odp',
    baslik: 'Belgeleri seç',
    ipucu: 'Word, Excel, slayt, metin, e-kitap. Çoklu seçimde aynı aileden seç.',
    uyari: motorUyarisi(),
    dugmeYazisi: 'Çevir',
    alanlar: [el('label', { sinif: 'alan' }, el('span', {}, 'Neye çevrilsin?'), hedef)],
    // Yalnız seçilen bütün dosyaların çevrilebildiği türler listelenir.
    secimDegisti: (dosyalar) => {
      const onceki = hedef.value;
      const ortak = dosyalar
        .map((dosya) => belgeCiktilari(dosya.name.split('.').pop()))
        .reduce(
          (kalan, liste) => (kalan === null ? liste : kalan.filter((tur) => liste.includes(tur))),
          null,
        ) ?? [];

      hedef.replaceChildren(
        ...ortak.map((tur) => el('option', { value: tur }, tur.toUpperCase())),
      );

      if (ortak.includes(onceki)) {
        hedef.value = onceki;
      }
    },
    kontrol: () => {
      if (!hedef.value) {
        throw new Error('Seçtiğin dosyalar aynı türe çevrilemiyor. Aynı aileden dosya seç.');
      }
    },
    is: async (dosya, durum) => ({
      blob: await cevir(dosya, hedef.value, durum),
      ad: `${uzantisiz(dosya.name)}.${hedef.value}`,
    }),
  });
}
