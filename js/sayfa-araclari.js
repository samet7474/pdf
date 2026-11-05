// Birleştirme, bölme, sayfa düzenleme ve döndürme araçları.

import { PDFDocument, degrees } from '../vendor/pdf-lib.esm.min.js';

import { aralikCoz, boyutYaz, uzantisiz } from './aralik.js';
import {
  dosyaSecici,
  durumAlani,
  el,
  hataMetni,
  indirmeBaglantisi,
  isBaglat,
  nefes,
  pdfAc,
  pdfBlob,
  sayfaCiz,
  topluArac,
  tuvalBosalt,
} from './ortak.js';

async function pdfLibAc(dosya) {
  return PDFDocument.load(await dosya.arrayBuffer());
}

function sayfaKopyasi(kaynak, sayfaNumaralari) {
  return async () => {
    const yeni = await PDFDocument.create();
    const dizinler = sayfaNumaralari.map((numara) => numara - 1);
    const kopyalar = await yeni.copyPages(kaynak, dizinler);

    for (const kopya of kopyalar) {
      yeni.addPage(kopya);
    }

    return yeni.save();
  };
}

export function birlestir(kok) {
  let dosyalar = [];
  const liste = el('ul', { sinif: 'liste' });
  const durum = durumAlani();
  const sonuc = el('div', { sinif: 'sonuc' });
  const dugme = el('button', { sinif: 'ana-dugme', type: 'button', disabled: true }, 'Birleştir');

  function ciz() {
    liste.replaceChildren(
      ...dosyalar.map((dosya, sira) =>
        el(
          'li',
          {},
          el(
            'div',
            { sinif: 'ad' },
            dosya.name,
            el('small', {}, boyutYaz(dosya.size)),
          ),
          el(
            'button',
            {
              sinif: 'kucuk',
              type: 'button',
              disabled: sira === 0,
              'aria-label': `${dosya.name} dosyasını yukarı al`,
              onclick: () => {
                [dosyalar[sira - 1], dosyalar[sira]] = [dosyalar[sira], dosyalar[sira - 1]];
                ciz();
              },
            },
            '↑',
          ),
          el(
            'button',
            {
              sinif: 'kucuk',
              type: 'button',
              disabled: sira === dosyalar.length - 1,
              'aria-label': `${dosya.name} dosyasını aşağı al`,
              onclick: () => {
                [dosyalar[sira + 1], dosyalar[sira]] = [dosyalar[sira], dosyalar[sira + 1]];
                ciz();
              },
            },
            '↓',
          ),
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

    dugme.disabled = dosyalar.length < 2;
  }

  isBaglat(dugme, durum, async () => {
    sonuc.replaceChildren();
    const yeni = await PDFDocument.create();

    for (const [sira, dosya] of dosyalar.entries()) {
      durum.yaz(`${dosya.name} ekleniyor`, sira / dosyalar.length);
      await nefes();

      let kaynak;

      try {
        kaynak = await pdfLibAc(dosya);
      } catch (hata) {
        throw new Error(`${dosya.name}: ${hataMetni(hata)}`);
      }

      const kopyalar = await yeni.copyPages(kaynak, kaynak.getPageIndices());

      for (const kopya of kopyalar) {
        yeni.addPage(kopya);
      }
    }

    durum.yaz('Dosya hazırlanıyor', 1);
    await nefes();
    const baytlar = await yeni.save();

    durum.tamam(`${dosyalar.length} dosya birleşti, toplam ${yeni.getPageCount()} sayfa.`);
    sonuc.append(indirmeBaglantisi(pdfBlob(baytlar), 'birlesik.pdf'));
  });

  kok.append(
    dosyaSecici({
      kabul: 'application/pdf,.pdf',
      coklu: true,
      baslik: 'PDF dosyalarını seç',
      ipucu: 'En az iki dosya gerekiyor. Sonra tekrar basıp ekleyebilirsin.',
      secilince: (yeniler) => {
        dosyalar.push(...yeniler);
        sonuc.replaceChildren();
        durum.temizle();
        ciz();
      },
    }),
    liste,
    dugme,
    durum.kok,
    sonuc,
  );
}

export function bol(kok) {
  const aralik = el('input', {
    type: 'text',
    inputMode: 'text',
    placeholder: 'Örnek: 1-3, 5',
    autocomplete: 'off',
  });
  const tekDosya = el('input', { type: 'radio', name: 'bolme', checked: true });
  const ayriDosya = el('input', { type: 'radio', name: 'bolme' });

  topluArac(kok, {
    kabul: 'application/pdf,.pdf',
    baslik: 'PDF dosyalarını seç',
    ipucu: 'Bir ya da birkaç dosya. Yazdığın sayfalar hepsine uygulanır.',
    dugmeYazisi: 'Böl',
    alanlar: [
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'Hangi sayfalar?', el('small', {}, 'Tire aralık, virgül ayrı sayfa demek.')),
        aralik,
      ),
      el(
        'div',
        { sinif: 'alan secenekler' },
        el('label', { sinif: 'secenek' }, tekDosya, el('span', {}, 'Seçtiklerim tek PDF olsun')),
        el('label', { sinif: 'secenek' }, ayriDosya, el('span', {}, 'Her sayfa ayrı PDF olsun')),
      ),
    ],
    is: async (dosya, durum) => {
      const kaynak = await pdfLibAc(dosya);
      const sayfalar = aralikCoz(aralik.value, kaynak.getPageCount());
      const ad = uzantisiz(dosya.name);

      if (tekDosya.checked) {
        durum.yaz('Dosya hazırlanıyor', 0.5);
        await nefes();
        const baytlar = await sayfaKopyasi(kaynak, sayfalar)();

        return {
          blob: pdfBlob(baytlar),
          ad: `${ad}-secilen.pdf`,
          mesaj: `${sayfalar.length} sayfalık PDF hazır.`,
        };
      }

      const sonuclar = [];

      for (const [sira, numara] of sayfalar.entries()) {
        durum.yaz(`Sayfa ${numara} hazırlanıyor`, sira / sayfalar.length);
        await nefes();
        const baytlar = await sayfaKopyasi(kaynak, [numara])();

        sonuclar.push({
          blob: pdfBlob(baytlar),
          ad: `${ad}-sayfa-${numara}.pdf`,
          mesaj: `${sayfalar.length} ayrı PDF hazır.`,
        });
      }

      return sonuclar;
    },
  });
}

export function duzenle(kok) {
  let kaynak = null;
  let dosyaAdi = '';
  let pdf = null;
  let kartlar = [];
  let gozlemci = null;

  const durum = durumAlani();
  const sonuc = el('div', { sinif: 'sonuc' });
  const izgara = el('div', { sinif: 'sayfalar' });
  const dugme = el('button', { sinif: 'ana-dugme', type: 'button', hidden: true }, 'Yeni PDF oluştur');

  async function onizlemeCiz(kart) {
    const sayfa = await pdf.getPage(kart.numara);
    const taban = sayfa.getViewport({ scale: 1 });
    const olcek = 240 / Math.max(taban.width, taban.height);
    await sayfaCiz(sayfa, olcek, kart.tuval);
    sayfa.cleanup();
  }

  function yerlestir() {
    izgara.replaceChildren(...kartlar.map((kart) => kart.kok));

    kartlar.forEach((kart, sira) => {
      kart.geri.disabled = sira === 0;
      kart.ileri.disabled = sira === kartlar.length - 1;
    });
  }

  function kartKur(numara) {
    const tuval = el('canvas', {});
    const no = el('div', { sinif: 'no' }, `Sayfa ${numara}`);
    const kart = { numara, tuval, silindi: false };

    function tasi(fark) {
      const sira = kartlar.indexOf(kart);
      [kartlar[sira], kartlar[sira + fark]] = [kartlar[sira + fark], kartlar[sira]];
      yerlestir();
    }

    kart.geri = el(
      'button',
      {
        type: 'button',
        'aria-label': `Sayfa ${numara}: öne al`,
        onclick: () => tasi(-1),
      },
      '←',
    );
    kart.ileri = el(
      'button',
      {
        type: 'button',
        'aria-label': `Sayfa ${numara}: arkaya al`,
        onclick: () => tasi(1),
      },
      '→',
    );
    const sil = el(
      'button',
      {
        type: 'button',
        onclick: () => {
          kart.silindi = !kart.silindi;
          kart.kok.classList.toggle('silindi', kart.silindi);
          sil.textContent = kart.silindi ? 'Geri al' : 'Sil';
          no.textContent = kart.silindi ? `Sayfa ${numara}: silinecek` : `Sayfa ${numara}`;
        },
      },
      'Sil',
    );

    kart.kok = el(
      'div',
      { sinif: 'sayfa' },
      el('div', { sinif: 'onizleme' }, tuval),
      no,
      el('div', { sinif: 'dugmeler' }, kart.geri, sil, kart.ileri),
    );
    kart.kok.kart = kart;

    return kart;
  }

  isBaglat(dugme, durum, async () => {
    sonuc.replaceChildren();
    const kalan = kartlar.filter((kart) => !kart.silindi).map((kart) => kart.numara);

    if (kalan.length === 0) {
      throw new Error('Bütün sayfaları sildin. En az bir sayfa kalmalı.');
    }

    durum.yaz('Dosya hazırlanıyor', 0.5);
    await nefes();
    const baytlar = await sayfaKopyasi(kaynak, kalan)();

    durum.tamam(`${kalan.length} sayfalık yeni PDF hazır.`);
    sonuc.append(indirmeBaglantisi(pdfBlob(baytlar), `${uzantisiz(dosyaAdi)}-duzenlenmis.pdf`));
  });

  kok.append(
    dosyaSecici({
      kabul: 'application/pdf,.pdf',
      baslik: 'PDF dosyasını seç',
      ipucu: 'Sayfaları oklarla taşıyabilir, Sil ile çıkarabilirsin.',
      secilince: async ([dosya]) => {
        durum.yaz('Dosya okunuyor');
        sonuc.replaceChildren();
        izgara.replaceChildren();
        dugme.hidden = true;
        gozlemci?.disconnect();

        try {
          const veri = await dosya.arrayBuffer();
          kaynak = await PDFDocument.load(veri);
          pdf = await pdfAc(veri);
          dosyaAdi = dosya.name;
          kartlar = Array.from({ length: pdf.numPages }, (_, sira) => kartKur(sira + 1));
          yerlestir();
          dugme.hidden = false;
          durum.temizle();

          // Önizlemeler ekrana geldikçe çizilir, büyük dosyada telefon yorulmasın.
          gozlemci = new IntersectionObserver((girdiler) => {
            for (const girdi of girdiler) {
              if (girdi.isIntersecting) {
                gozlemci.unobserve(girdi.target);
                onizlemeCiz(girdi.target.kart).catch(console.error);
              }
            }
          }, { rootMargin: '300px' });

          for (const kart of kartlar) {
            gozlemci.observe(kart.kok);
          }
        } catch (hata) {
          durum.hata(hataMetni(hata));
        }
      },
    }),
    izgara,
    dugme,
    durum.kok,
    sonuc,
  );

  return () => {
    gozlemci?.disconnect();

    for (const kart of kartlar) {
      tuvalBosalt(kart.tuval);
    }

    pdf?.destroy();
  };
}

export function dondur(kok) {
  const aci = el(
    'select',
    {},
    el('option', { value: '90' }, 'Sağa çevir (90°)'),
    el('option', { value: '180' }, 'Baş aşağı çevir (180°)'),
    el('option', { value: '270' }, 'Sola çevir (90°)'),
  );
  const aralik = el('input', {
    type: 'text',
    placeholder: 'Boş bırakırsan bütün sayfalar döner',
    autocomplete: 'off',
  });

  topluArac(kok, {
    kabul: 'application/pdf,.pdf',
    baslik: 'PDF dosyalarını seç',
    ipucu: 'Bir ya da birkaç dosya',
    dugmeYazisi: 'Döndür',
    alanlar: [
      el('label', { sinif: 'alan' }, el('span', {}, 'Yön'), aci),
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'Hangi sayfalar?', el('small', {}, 'Örnek: 1-3, 5')),
        aralik,
      ),
    ],
    is: async (dosya, durum) => {
      const kopya = await pdfLibAc(dosya);
      const sayfalar = kopya.getPages();
      const secilen = aralik.value.trim() === ''
        ? sayfalar.map((_, sira) => sira + 1)
        : aralikCoz(aralik.value, sayfalar.length);
      const eklenecek = Number(aci.value);

      durum.yaz('Dosya hazırlanıyor', 0.5);
      await nefes();

      for (const numara of new Set(secilen)) {
        const sayfa = sayfalar[numara - 1];
        sayfa.setRotation(degrees((sayfa.getRotation().angle + eklenecek) % 360));
      }

      return {
        blob: pdfBlob(await kopya.save()),
        ad: `${uzantisiz(dosya.name)}-dondurulmus.pdf`,
        mesaj: `${new Set(secilen).size} sayfa döndürüldü.`,
      };
    },
  });
}
