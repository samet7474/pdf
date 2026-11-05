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
