// Word'den PDF'e. LibreOffice tarayıcıda çalışır, dosya cihazdan çıkmaz.
// Yükleme mantığı BentoPDF'in libreoffice-loader.ts dosyasından uyarlandı (AGPL-3.0).

import { uzantisiz } from './aralik.js';
import { dosyaSecici, durumAlani, el, indirmeBaglantisi, isBaglat, pdfBlob } from './ortak.js';

const TABAN = new URL('../vendor/libreoffice/', import.meta.url).href;
const MB = 1024 * 1024;

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

  const { WorkerBrowserConverter } = await import('../vendor/libreoffice/browser.js');
  const boyutlar = await (await fetch(`${TABAN}boyut.json`)).json();
  const toplam = boyutlar.wasm + boyutlar.data;
  let inen = 0;

  const ilerleme = (bayt) => {
    inen += bayt;
    const oran = Math.min(1, inen / toplam);
    durum.yaz(
      `Word motoru iniyor: ${Math.round(inen / MB)} / ${Math.round(toplam / MB)} MB`,
      oran,
    );
  };

  const [wasm, veri] = await Promise.all([
    indirVeAc(`${TABAN}soffice.wasm.gz`, 'application/wasm', ilerleme),
    indirVeAc(`${TABAN}soffice.data.gz`, 'application/octet-stream', ilerleme),
  ]);

  durum.yaz('Word motoru açılıyor. Bu adım telefonda bir dakika sürebilir.');

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

export function word(kok) {
  let dosya = null;

  const durum = durumAlani();
  const sonuc = el('div', { sinif: 'sonuc' });
  const bilgi = el('p', { sinif: 'uyari' });
  const dugme = el('button', { sinif: 'ana-dugme', type: 'button' }, 'PDF\'e çevir');
  const ayarlar = el('div', { hidden: true }, bilgi, dugme);

  isBaglat(dugme, durum, async () => {
    sonuc.replaceChildren();

    if (!window.crossOriginIsolated) {
      throw new Error('Tarayıcı bu aracı henüz açmadı. Sayfayı yenileyip tekrar dene.');
    }

    const motor = await motorKur(durum);
    durum.yaz(`${dosya.name} çevriliyor`);

    const uzanti = dosya.name.split('.').pop().toLowerCase();
    const girdi = new Uint8Array(await dosya.arrayBuffer());
    const cikti = await motor.convert(
      girdi,
      { outputFormat: 'pdf', inputFormat: uzanti },
      dosya.name,
    );

    durum.tamam('PDF hazır. Yazı tipi dosyada gömülü değilse satır sonları biraz kayabilir.');
    sonuc.append(
      indirmeBaglantisi(pdfBlob(new Uint8Array(cikti.data)), `${uzantisiz(dosya.name)}.pdf`),
    );
  });

  kok.append(
    el(
      'p',
      { sinif: 'uyari' },
      'İlk çevirmede yaklaşık 75 MB iner, Wi-Fi kullan. Motor açılınca 250 MB kadar bellek tutar, eski telefonda kapanabilir.',
    ),
    dosyaSecici({
      kabul: '.docx,.doc,.odt,.rtf',
      baslik: 'Word dosyasını seç',
      ipucu: 'DOCX, DOC, ODT, RTF',
      secilince: ([secilen]) => {
        dosya = secilen;
        bilgi.textContent = dosya.name;
        ayarlar.hidden = false;
        sonuc.replaceChildren();
        durum.temizle();
      },
    }),
    ayarlar,
    durum.kok,
    sonuc,
  );
}
