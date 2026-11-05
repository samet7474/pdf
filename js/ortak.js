// Araçların paylaştığı arayüz parçaları ve PDF yardımcıları.

import { boyutYaz } from './aralik.js';

export function el(etiket, ozellikler = {}, ...cocuklar) {
  const dugum = document.createElement(etiket);

  for (const [ad, deger] of Object.entries(ozellikler)) {
    if (ad === 'sinif') {
      dugum.className = deger;
    } else if (ad.startsWith('on')) {
      dugum.addEventListener(ad.slice(2), deger);
    } else if (ad in dugum && ad !== 'list') {
      dugum[ad] = deger;
    } else {
      dugum.setAttribute(ad, deger);
    }
  }

  dugum.append(...cocuklar.filter((c) => c !== null && c !== undefined));
  return dugum;
}

// Dosya seçme kutusu. Dokunarak ya da sürükleyerek çalışır.
export function dosyaSecici({ kabul, coklu = false, baslik, ipucu, secilince }) {
  const girdi = el('input', {
    type: 'file',
    accept: kabul,
    multiple: coklu,
    onchange: () => {
      const dosyalar = [...girdi.files];
      girdi.value = '';

      if (dosyalar.length > 0) {
        secilince(dosyalar);
      }
    },
  });

  const kutu = el(
    'label',
    { sinif: 'secici' },
    girdi,
    el('strong', {}, baslik),
    el('small', {}, ipucu),
  );

  kutu.addEventListener('dragover', (olay) => {
    olay.preventDefault();
    kutu.classList.add('uzerinde');
  });

  kutu.addEventListener('dragleave', () => {
    kutu.classList.remove('uzerinde');
  });

  kutu.addEventListener('drop', (olay) => {
    olay.preventDefault();
    kutu.classList.remove('uzerinde');
    const dosyalar = [...olay.dataTransfer.files];

    if (dosyalar.length > 0) {
      secilince(coklu ? dosyalar : dosyalar.slice(0, 1));
    }
  });

  return kutu;
}

// Yazı ve ilerleme çubuğu gösteren durum alanı.
export function durumAlani() {
  const yazi = el('div', { sinif: 'durum', role: 'status' });
  const cubuk = el('progress', { max: 1, value: 0, hidden: true });
  const kok = el('div', {}, yazi, cubuk);

  return {
    kok,
    yaz(metin, oran) {
      yazi.className = 'durum';
      yazi.textContent = metin;
      cubuk.hidden = oran === undefined;

      if (oran !== undefined) {
        cubuk.value = oran;
      }
    },
    hata(metin) {
      yazi.className = 'durum hata';
      yazi.textContent = metin;
      cubuk.hidden = true;
    },
    tamam(metin) {
      yazi.className = 'durum tamam';
      yazi.textContent = metin;
      cubuk.hidden = true;
    },
    temizle() {
      yazi.className = 'durum';
      yazi.textContent = '';
      cubuk.hidden = true;
    },
  };
}

// Sonuç dosyası için indirme bağlantısı. Telefon destekliyorsa paylaşma düğmesi de ekler.
export function indirmeBaglantisi(blob, dosyaAdi) {
  const adres = URL.createObjectURL(blob);
  const kutu = el('div', {});

  kutu.append(
    el(
      'a',
      { sinif: 'indir', href: adres, download: dosyaAdi },
      `İndir: ${dosyaAdi} (${boyutYaz(blob.size)})`,
    ),
  );

  const dosya = new File([blob], dosyaAdi, { type: blob.type });

  if (navigator.canShare && navigator.canShare({ files: [dosya] })) {
    kutu.append(
      el(
        'button',
        {
          sinif: 'ikincil',
          type: 'button',
          onclick: async () => {
            try {
              await navigator.share({ files: [dosya], title: dosyaAdi });
            } catch (hata) {
              if (hata.name !== 'AbortError') {
                throw hata;
              }
            }
          },
        },
        'Paylaş ya da Drive\'a kaydet',
      ),
    );
  }

  return kutu;
}

export function pdfBlob(baytlar) {
  return new Blob([baytlar], { type: 'application/pdf' });
}

// Hataları kullanıcının anlayacağı cümleye çevirir.
export function hataMetni(hata) {
  const metin = String(hata?.message ?? hata);

  if (hata?.name === 'PasswordException' || /encrypted|password/i.test(metin)) {
    return 'Bu PDF şifreli. Önce şifresini kaldırman gerekiyor.';
  }

  if (hata?.name === 'InvalidPDFException' || /invalid pdf|No PDF header/i.test(metin)) {
    return 'Bu dosya bozuk ya da PDF değil.';
  }

  if (hata instanceof RangeError || /memory|allocation/i.test(metin)) {
    return 'Cihazın belleği bu iş için yetmedi. Daha küçük bir dosya dene.';
  }

  return metin;
}

let pdfjsSozu = null;

// pdf.js yalnız gerektiğinde yüklenir.
export function pdfjsYukle() {
  if (!pdfjsSozu) {
    pdfjsSozu = import('../vendor/pdfjs/pdf.min.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        '../vendor/pdfjs/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
      return pdfjs;
    });
  }

  return pdfjsSozu;
}

export async function pdfAc(veri) {
  const pdfjs = await pdfjsYukle();

  return pdfjs.getDocument({
    data: new Uint8Array(veri),
    cMapUrl: new URL('../vendor/pdfjs/cmaps/', import.meta.url).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href,
    wasmUrl: new URL('../vendor/pdfjs/wasm/', import.meta.url).href,
  }).promise;
}

// Bir PDF sayfasını beyaz zeminli tuvale çizer. olcek 1 = 72 DPI.
export async function sayfaCiz(sayfa, olcek, tuval = document.createElement('canvas')) {
  const gorunum = sayfa.getViewport({ scale: olcek });
  tuval.width = Math.max(1, Math.floor(gorunum.width));
  tuval.height = Math.max(1, Math.floor(gorunum.height));

  const baglam = tuval.getContext('2d');
  baglam.fillStyle = '#ffffff';
  baglam.fillRect(0, 0, tuval.width, tuval.height);

  await sayfa.render({ canvas: tuval, canvasContext: baglam, viewport: gorunum }).promise;
  return tuval;
}

export function tuvaldenBlob(tuval, tur, kalite) {
  return new Promise((coz, reddet) => {
    tuval.toBlob(
      (blob) => {
        if (blob) {
          coz(blob);
        } else {
          reddet(new RangeError('memory'));
        }
      },
      tur,
      kalite,
    );
  });
}

// Tuvali boşaltır. Telefonda bellek hemen geri gelsin diye gerekli.
export function tuvalBosalt(tuval) {
  tuval.width = 0;
  tuval.height = 0;
}

// Arayüzün donmuş görünmemesi için tarayıcıya çizim fırsatı verir.
export function nefes() {
  return new Promise((coz) => setTimeout(coz, 0));
}

// Araçların ortak "çalıştır" akışı: düğmeyi kilitler, hatayı yakalar.
export function isBaglat(dugme, durum, is) {
  dugme.addEventListener('click', async () => {
    dugme.disabled = true;
    durum.temizle();

    try {
      await is();
    } catch (hata) {
      console.error(hata);
      durum.hata(hataMetni(hata));
    } finally {
      dugme.disabled = false;
    }
  });
}

// İndirme bağlantılarını tutar. İki ve daha çok sonuçta ZIP düğmesi çıkar.
export function sonucAlani() {
  const kok = el('div', { sinif: 'sonuc' });
  const zipKutu = el('div', {});
  const liste = el('div', {});
  const metinKutu = el('div', {});
  let sonuclar = [];

  kok.append(metinKutu, zipKutu, liste);

  function zipDugmesi() {
    return el(
      'button',
      {
        sinif: 'ikincil',
        type: 'button',
        onclick: async (olay) => {
          const dugme = olay.currentTarget;
          dugme.disabled = true;
          dugme.textContent = 'ZIP hazırlanıyor';
          await nefes();

          try {
            const { zipSync } = await import('../vendor/fflate.js');
            const icerik = {};

            for (const { blob, ad } of sonuclar) {
              // Sonuçlar zaten sıkışık. Yeniden sıkıştırmak telefonu boşuna yorar.
              icerik[benzersizAd(icerik, ad)] = [
                new Uint8Array(await blob.arrayBuffer()),
                { level: 0 },
              ];
            }

            const zip = new Blob([zipSync(icerik)], { type: 'application/zip' });
            zipKutu.replaceChildren(indirmeBaglantisi(zip, 'dosyalar.zip'));
          } catch (hata) {
            console.error(hata);
            dugme.disabled = false;
            dugme.textContent = 'ZIP oluşmadı. Dosyaları tek tek indir.';
          }
        },
      },
      `Hepsini tek ZIP olarak hazırla (${sonuclar.length} dosya)`,
    );
  }

  return {
    kok,
    ekle(sonuc) {
      sonuclar.push(sonuc);
      liste.append(indirmeBaglantisi(sonuc.blob, sonuc.ad));

      if (sonuclar.length >= 2) {
        zipKutu.replaceChildren(zipDugmesi());
      }
    },
    metinGoster(metin) {
      const kutu = el('textarea', { value: metin, 'aria-label': 'Çıkarılan yazı' });
      const kopyala = el(
        'button',
        {
          sinif: 'ikincil',
          type: 'button',
          onclick: async () => {
            await navigator.clipboard.writeText(kutu.value);
            kopyala.textContent = 'Kopyalandı';
          },
        },
        'Yazıyı kopyala',
      );

      metinKutu.replaceChildren(kutu, kopyala);
    },
    temizle() {
      sonuclar = [];
      zipKutu.replaceChildren();
      liste.replaceChildren();
      metinKutu.replaceChildren();
    },
  };
}

function benzersizAd(icerik, ad) {
  if (!(ad in icerik)) {
    return ad;
  }

  const nokta = ad.lastIndexOf('.');
  const govde = nokta > 0 ? ad.slice(0, nokta) : ad;
  const uzanti = nokta > 0 ? ad.slice(nokta) : '';
  let sira = 2;

  while (`${govde} (${sira})${uzanti}` in icerik) {
    sira += 1;
  }

  return `${govde} (${sira})${uzanti}`;
}

// Bir ya da çok dosya alan araçların ortak kalıbı.
// is(dosya, durum, ortak) her dosya için çalışır ve sonuç döner:
// { blob, ad, mesaj, metin } ya da bunların listesi. Bir dosya hata verirse diğerleri sürer.
export function topluArac(kok, {
  kabul,
  baslik,
  ipucu,
  uyari,
  alanlar = [],
  dugmeYazisi,
  kontrol,
  secimDegisti,
  is,
}) {
  let dosyalar = [];

  const liste = el('ul', { sinif: 'liste' });
  const durum = durumAlani();
  const sonuc = sonucAlani();
  const dugme = el('button', { sinif: 'ana-dugme', type: 'button' }, dugmeYazisi);
  const ayarlar = el('div', { hidden: true }, ...alanlar, dugme);

  function ciz() {
    liste.replaceChildren(
      ...dosyalar.map((dosya, sira) =>
        el(
          'li',
          {},
          el('div', { sinif: 'ad' }, dosya.name, el('small', {}, boyutYaz(dosya.size))),
          el(
            'button',
            {
              sinif: 'kucuk',
              type: 'button',
              'aria-label': `${dosya.name} dosyasını listeden çıkar`,
              onclick: () => {
                dosyalar.splice(sira, 1);
                ciz();
              },
            },
            '×',
          ),
        ),
      ),
    );

    ayarlar.hidden = dosyalar.length === 0;
    dugme.textContent = dosyalar.length > 1 ? `${dugmeYazisi} (${dosyalar.length} dosya)` : dugmeYazisi;
    secimDegisti?.(dosyalar);
  }

  isBaglat(dugme, durum, async () => {
    sonuc.temizle();

    const secilen = [...dosyalar];
    const toplam = secilen.length;
    const ortak = kontrol?.(secilen);
    const hatalar = [];
    let hazir = 0;
    let sonMesaj = '';

    for (const [sira, dosya] of secilen.entries()) {
      const altDurum = {
        yaz(metin, oran) {
          if (toplam === 1) {
            durum.yaz(metin, oran);
          } else {
            durum.yaz(`${sira + 1} / ${toplam} · ${dosya.name}: ${metin}`, (sira + (oran ?? 0)) / toplam);
          }
        },
      };

      altDurum.yaz('Başlıyor');
      await nefes();

      try {
        const cikti = await is(dosya, altDurum, ortak);

        for (const parca of [cikti].flat()) {
          sonuc.ekle(parca);

          if (toplam === 1 && parca.metin) {
            sonuc.metinGoster(parca.metin);
          }

          sonMesaj = parca.mesaj ?? sonMesaj;
        }

        hazir += 1;
      } catch (hata) {
        console.error(hata);
        hatalar.push(`${dosya.name}: ${hataMetni(hata)}`);
      }
    }

    if (toplam === 1) {
      if (hatalar.length > 0) {
        durum.hata(hatalar[0].slice(secilen[0].name.length + 2));
      } else {
        durum.tamam(sonMesaj || 'Hazır.');
      }

      return;
    }

    if (hatalar.length > 0) {
      durum.hata(`${hazir} / ${toplam} dosya hazır. Olmayanlar:\n${hatalar.join('\n')}`);
    } else {
      durum.tamam(`${toplam} dosya hazır.`);
    }
  });

  kok.append(
    uyari ? el('p', { sinif: 'uyari' }, uyari) : null,
    dosyaSecici({
      kabul,
      coklu: true,
      baslik,
      ipucu,
      secilince: (yeniler) => {
        dosyalar.push(...yeniler);
        sonuc.temizle();
        durum.temizle();
        ciz();
      },
    }),
    liste,
    ayarlar,
    durum.kok,
    sonuc.kok,
  );
}
