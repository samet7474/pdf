// Resimden PDF'e, PDF'ten resme, küçültme ve OCR araçları.

import { PDFDocument } from '../vendor/pdf-lib.esm.min.js';

import { aralikCoz, boyutYaz, kucultmeSonucu, uzantisiz } from './aralik.js';
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
  tuvaldenBlob,
} from './ortak.js';

const A4_GENISLIK = 595.28;
const A4_YUKSEKLIK = 841.89;
const RESIM_EN_BUYUK_KENAR = 2480;

// Resmi JPEG'e çevirir. Telefon fotoğrafının yönü de burada düzelir.
async function resimdenJpeg(dosya) {
  const bit = await createImageBitmap(dosya);
  const oran = Math.min(1, RESIM_EN_BUYUK_KENAR / Math.max(bit.width, bit.height));
  const tuval = document.createElement('canvas');
  tuval.width = Math.round(bit.width * oran);
  tuval.height = Math.round(bit.height * oran);

  const baglam = tuval.getContext('2d');
  baglam.fillStyle = '#ffffff';
  baglam.fillRect(0, 0, tuval.width, tuval.height);
  baglam.drawImage(bit, 0, 0, tuval.width, tuval.height);
  bit.close();

  const blob = await tuvaldenBlob(tuval, 'image/jpeg', 0.88);
  const genislik = tuval.width;
  const yukseklik = tuval.height;
  tuvalBosalt(tuval);

  return { baytlar: await blob.arrayBuffer(), genislik, yukseklik };
}

export function resimdenPdf(kok) {
  let dosyalar = [];
  const liste = el('ul', { sinif: 'liste' });
  const durum = durumAlani();
  const sonuc = el('div', { sinif: 'sonuc' });
  const dugme = el('button', { sinif: 'ana-dugme', type: 'button', disabled: true }, 'PDF oluştur');
  const a4 = el('input', { type: 'radio', name: 'sayfa', checked: true });
  const resimBoyu = el('input', { type: 'radio', name: 'sayfa' });

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
              disabled: sira === 0,
              'aria-label': `${dosya.name} resmini yukarı al`,
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
              'aria-label': `${dosya.name} resmini listeden çıkar`,
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

    dugme.disabled = dosyalar.length === 0;
  }

  isBaglat(dugme, durum, async () => {
    sonuc.replaceChildren();
    const pdf = await PDFDocument.create();

    for (const [sira, dosya] of dosyalar.entries()) {
      durum.yaz(`${dosya.name} ekleniyor`, sira / dosyalar.length);
      await nefes();

      let resim;

      try {
        resim = await resimdenJpeg(dosya);
      } catch {
        throw new Error(`${dosya.name} açılamadı. Bu tarayıcı bu resim türünü okuyamıyor olabilir.`);
      }

      const gomulu = await pdf.embedJpg(resim.baytlar);

      if (a4.checked) {
        const yatay = resim.genislik > resim.yukseklik;
        const sayfaGen = yatay ? A4_YUKSEKLIK : A4_GENISLIK;
        const sayfaYuk = yatay ? A4_GENISLIK : A4_YUKSEKLIK;
        const oran = Math.min(sayfaGen / resim.genislik, sayfaYuk / resim.yukseklik);
        const gen = resim.genislik * oran;
        const yuk = resim.yukseklik * oran;
        const sayfa = pdf.addPage([sayfaGen, sayfaYuk]);

        sayfa.drawImage(gomulu, {
          x: (sayfaGen - gen) / 2,
          y: (sayfaYuk - yuk) / 2,
          width: gen,
          height: yuk,
        });
      } else {
        const gen = resim.genislik * 0.75;
        const yuk = resim.yukseklik * 0.75;
        const sayfa = pdf.addPage([gen, yuk]);
        sayfa.drawImage(gomulu, { x: 0, y: 0, width: gen, height: yuk });
      }
    }

    durum.yaz('Dosya hazırlanıyor', 1);
    await nefes();
    const baytlar = await pdf.save();

    durum.tamam(`${dosyalar.length} resim PDF oldu.`);
    sonuc.append(indirmeBaglantisi(pdfBlob(baytlar), 'resimler.pdf'));
  });

  kok.append(
    dosyaSecici({
      kabul: 'image/*',
      coklu: true,
      baslik: 'Resimleri seç',
      ipucu: 'JPG, PNG, WebP. Her resim bir sayfa olur.',
      secilince: (yeniler) => {
        dosyalar.push(...yeniler);
        sonuc.replaceChildren();
        durum.temizle();
        ciz();
      },
    }),
    liste,
    el(
      'div',
      { sinif: 'alan secenekler' },
      el('label', { sinif: 'secenek' }, a4, el('span', {}, 'A4 sayfaya sığdır')),
      el('label', { sinif: 'secenek' }, resimBoyu, el('span', {}, 'Sayfa resim boyunda olsun')),
    ),
    dugme,
    durum.kok,
    sonuc,
  );
}

export function pdftenResim(kok) {
  const tur = el(
    'select',
    {},
    el('option', { value: 'jpg' }, 'JPG (küçük dosya)'),
    el('option', { value: 'png' }, 'PNG (daha net, büyük dosya)'),
  );
  const netlik = el(
    'select',
    {},
    el('option', { value: '1.5' }, 'Normal'),
    el('option', { value: '2.5' }, 'Yüksek'),
  );
  const aralik = el('input', {
    type: 'text',
    placeholder: 'Boş bırakırsan bütün sayfalar',
    autocomplete: 'off',
  });

  topluArac(kok, {
    kabul: 'application/pdf,.pdf',
    baslik: 'PDF dosyalarını seç',
    ipucu: 'Bir ya da birkaç dosya',
    dugmeYazisi: 'Resme çevir',
    alanlar: [
      el('label', { sinif: 'alan' }, el('span', {}, 'Resim türü'), tur),
      el('label', { sinif: 'alan' }, el('span', {}, 'Netlik'), netlik),
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'Hangi sayfalar?', el('small', {}, 'Örnek: 1-3, 5')),
        aralik,
      ),
    ],
    is: async (dosya, durum) => {
      const pdf = await pdfAc(await dosya.arrayBuffer());

      try {
        const secilen = aralik.value.trim() === ''
          ? Array.from({ length: pdf.numPages }, (_, sira) => sira + 1)
          : aralikCoz(aralik.value, pdf.numPages);
        const ad = uzantisiz(dosya.name);
        const uzanti = tur.value;
        const mime = uzanti === 'png' ? 'image/png' : 'image/jpeg';
        const sonuclar = [];

        for (const [sira, numara] of secilen.entries()) {
          durum.yaz(`Sayfa ${numara} çiziliyor`, sira / secilen.length);
          await nefes();

          const sayfa = await pdf.getPage(numara);
          const tuval = await sayfaCiz(sayfa, Number(netlik.value));
          const blob = await tuvaldenBlob(tuval, mime, 0.9);

          tuvalBosalt(tuval);
          sayfa.cleanup();
          sonuclar.push({
            blob,
            ad: `${ad}-sayfa-${numara}.${uzanti}`,
            mesaj: `${secilen.length} resim hazır.`,
          });
        }

        return sonuclar;
      } finally {
        await pdf.destroy();
      }
    },
  });
}

const KUCULTME_SEVIYELERI = {
  orta: { olcek: 150 / 72, kalite: 0.7 },
  guclu: { olcek: 100 / 72, kalite: 0.5 },
};

async function resimlestirerekKucult(veri, seviye, durum) {
  const { olcek, kalite } = KUCULTME_SEVIYELERI[seviye];
  const pdf = await pdfAc(veri);
  const yeni = await PDFDocument.create();

  try {
    for (let numara = 1; numara <= pdf.numPages; numara += 1) {
      durum.yaz(`Sayfa ${numara} / ${pdf.numPages} küçültülüyor`, (numara - 1) / pdf.numPages);
      await nefes();

      const sayfa = await pdf.getPage(numara);
      const taban = sayfa.getViewport({ scale: 1 });
      const tuval = await sayfaCiz(sayfa, olcek);
      const blob = await tuvaldenBlob(tuval, 'image/jpeg', kalite);
      const gomulu = await yeni.embedJpg(await blob.arrayBuffer());
      const hedef = yeni.addPage([taban.width, taban.height]);

      hedef.drawImage(gomulu, { x: 0, y: 0, width: taban.width, height: taban.height });
      tuvalBosalt(tuval);
      sayfa.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  durum.yaz('Dosya hazırlanıyor', 1);
  await nefes();
  return yeni.save();
}

export function kucult(kok) {
  const yaziKoru = el('input', { type: 'radio', name: 'seviye', value: 'yazi', checked: true });
  const orta = el('input', { type: 'radio', name: 'seviye', value: 'orta' });
  const guclu = el('input', { type: 'radio', name: 'seviye', value: 'guclu' });

  topluArac(kok, {
    kabul: 'application/pdf,.pdf',
    baslik: 'PDF dosyalarını seç',
    ipucu: 'En çok taranmış ve fotoğraflı dosyalarda işe yarar.',
    dugmeYazisi: 'Küçült',
    alanlar: [
      el(
        'div',
        { sinif: 'alan secenekler' },
        el(
          'label',
          { sinif: 'secenek' },
          yaziKoru,
          el('span', {}, 'Yazıyı koru', el('small', {}, 'Kalite değişmez, ama dosya az küçülür.')),
        ),
        el(
          'label',
          { sinif: 'secenek' },
          orta,
          el('span', {}, 'Orta', el('small', {}, 'Sayfalar resme döner. Yazı seçilemez olur.')),
        ),
        el(
          'label',
          { sinif: 'secenek' },
          guclu,
          el('span', {}, 'Güçlü', el('small', {}, 'En küçük dosya. Yazı seçilemez olur, kalite düşer.')),
        ),
      ),
    ],
    is: async (dosya, durum) => {
      const veri = await dosya.arrayBuffer();
      let baytlar;

      if (yaziKoru.checked) {
        durum.yaz('Dosya yeniden yazılıyor', 0.5);
        await nefes();
        const pdf = await PDFDocument.load(veri);
        baytlar = await pdf.save({ useObjectStreams: true });
      } else {
        baytlar = await resimlestirerekKucult(veri, orta.checked ? 'orta' : 'guclu', durum);
      }

      const { kuculdu, yuzde } = kucultmeSonucu(dosya.size, baytlar.length);

      if (!kuculdu) {
        throw new Error(
          `Bu seçenek dosyayı küçültmedi (${boyutYaz(dosya.size)}). Özgün dosyanı kullan ya da daha güçlü seçeneği dene.`,
        );
      }

      return {
        blob: pdfBlob(baytlar),
        ad: `${uzantisiz(dosya.name)}-kucuk.pdf`,
        mesaj: `${boyutYaz(dosya.size)} → ${boyutYaz(baytlar.length)}, yüzde ${yuzde} küçüldü.`,
      };
    },
  });
}

async function ocrIsciKur(durum, ilerleme) {
  const Tesseract = (await import('../vendor/tesseract/tesseract.esm.min.js')).default;

  return Tesseract.createWorker(['tur', 'eng'], 1, {
    workerPath: new URL('../vendor/tesseract/worker.min.js', import.meta.url).href,
    corePath: new URL('../vendor/tesseract/core/', import.meta.url).href,
    langPath: new URL('../vendor/tesseract/lang/', import.meta.url).href,
    workerBlobURL: false,
    gzip: true,
    logger: (kayit) => {
      if (kayit.status === 'recognizing text') {
        ilerleme(kayit.progress);
      } else {
        durum.yaz('Yazı tanıma motoru hazırlanıyor. İlk seferde bir dakika sürebilir.');
      }
    },
  });
}

export function ocr(kok) {
  const aralik = el('input', {
    type: 'text',
    placeholder: 'Boş bırakırsan bütün sayfalar',
    autocomplete: 'off',
  });

  topluArac(kok, {
    kabul: 'application/pdf,.pdf,image/*',
    baslik: 'Taranmış PDF ya da resimleri seç',
    ipucu: 'Türkçe ve İngilizce okur. İlk seferde 10 MB kadar veri iner.',
    dugmeYazisi: 'Yazıyı çıkar',
    alanlar: [
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'PDF\'te hangi sayfalar?', el('small', {}, 'Telefonda sayfa başına biraz zaman alır.')),
        aralik,
      ),
    ],
    is: async (dosya, durum) => {
      const pdfMi = dosya.type === 'application/pdf' || /\.pdf$/i.test(dosya.name);
      const pdf = pdfMi ? await pdfAc(await dosya.arrayBuffer()) : null;

      durum.yaz('Yazı tanıma motoru hazırlanıyor. İlk seferde bir dakika sürebilir.');

      let isci = null;

      try {
        const secilen = !pdf
          ? [1]
          : aralik.value.trim() === ''
            ? Array.from({ length: pdf.numPages }, (_, sira) => sira + 1)
            : aralikCoz(aralik.value, pdf.numPages);

        let siradaki = 0;
        isci = await ocrIsciKur(durum, (oran) => {
          durum.yaz(
            `Sayfa ${siradaki + 1} / ${secilen.length} okunuyor`,
            (siradaki + oran) / secilen.length,
          );
        });

        const parcalar = [];

        for (const [sira, numara] of secilen.entries()) {
          siradaki = sira;
          let gorsel = dosya;
          let tuval = null;

          if (pdf) {
            const sayfa = await pdf.getPage(numara);
            tuval = await sayfaCiz(sayfa, 2.5);
            gorsel = tuval;
            sayfa.cleanup();
          }

          const { data } = await isci.recognize(gorsel);
          parcalar.push(pdf && secilen.length > 1 ? `--- Sayfa ${numara} ---\n${data.text}` : data.text);

          if (tuval) {
            tuvalBosalt(tuval);
          }
        }

        const metin = parcalar.join('\n').trim();

        if (metin === '') {
          throw new Error('Bu dosyada okunabilir yazı bulamadım.');
        }

        return {
          blob: new Blob([metin], { type: 'text/plain;charset=utf-8' }),
          ad: `${uzantisiz(dosya.name)}.txt`,
          metin,
          mesaj: 'Yazı hazır. Makine okudu, önemli yerlerde kontrol et.',
        };
      } finally {
        await isci?.terminate();
        await pdf?.destroy();
      }
    },
  });
}
