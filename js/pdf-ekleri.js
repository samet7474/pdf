// Filigran, sayfa numarası, şifre ekleme ve kaldırma, PDF'ten yazı çıkarma.

import { PDFDocument, StandardFonts, rgb } from '../vendor/pdf-lib.esm.min.js';

import { aralikCoz, uzantisiz } from './aralik.js';
import { docxOlustur, paragraflaraAyir } from './docx.js';
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
  tuvalBosalt,
  tuvaldenBlob,
} from './ortak.js';

function pdfAraci(kok, { ipucu = 'Tek dosya', alanlar, dugmeYazisi, is }) {
  let dosya = null;

  const durum = durumAlani();
  const sonuc = el('div', { sinif: 'sonuc' });
  const bilgi = el('p', { sinif: 'uyari' });
  const dugme = el('button', { sinif: 'ana-dugme', type: 'button' }, dugmeYazisi);
  const ayarlar = el('div', { hidden: true }, bilgi, ...alanlar, dugme);

  isBaglat(dugme, durum, async () => {
    sonuc.replaceChildren();
    await is(dosya, durum, sonuc);
  });

  kok.append(
    dosyaSecici({
      kabul: 'application/pdf,.pdf',
      baslik: 'PDF dosyasını seç',
      ipucu,
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

// Yazı resim olarak çizilir. Böylece Türkçe harfler için yazı tipi gömmek gerekmez.
async function filigranResmi(metin) {
  const boy = 96;
  const tuval = document.createElement('canvas');
  const baglam = tuval.getContext('2d');
  const yaziTipi = `700 ${boy}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

  baglam.font = yaziTipi;
  tuval.width = Math.ceil(baglam.measureText(metin).width) + 40;
  tuval.height = Math.ceil(boy * 1.5);

  // Tuval boyutu değişince yazı tipi sıfırlanır, yeniden verilir.
  baglam.font = yaziTipi;
  baglam.fillStyle = '#b3361f';
  baglam.textBaseline = 'middle';
  baglam.fillText(metin, 20, tuval.height / 2);

  const blob = await tuvaldenBlob(tuval, 'image/png');
  const olcu = { genislik: tuval.width, yukseklik: tuval.height };
  tuvalBosalt(tuval);

  return { baytlar: await blob.arrayBuffer(), ...olcu };
}

export function filigran(kok) {
  const yazi = el('input', { type: 'text', placeholder: 'Örnek: Taslak', autocomplete: 'off' });

  pdfAraci(kok, {
    alanlar: [el('label', { sinif: 'alan' }, el('span', {}, 'Filigran yazısı'), yazi)],
    dugmeYazisi: 'Filigran ekle',
    is: async (dosya, durum, sonuc) => {
      const metin = yazi.value.trim();

      if (metin === '') {
        throw new Error('Filigran yazısını yazmadın.');
      }

      durum.yaz('Dosya hazırlanıyor', 0.5);
      await nefes();

      const pdf = await PDFDocument.load(await dosya.arrayBuffer());
      const resim = await filigranResmi(metin);
      const gomulu = await pdf.embedPng(resim.baytlar);
      const aci = Math.PI / 5;

      for (const sayfa of pdf.getPages()) {
        const { width, height } = sayfa.getSize();
        const gen = Math.min(width, height) * 0.8;
        const yuk = gen * (resim.yukseklik / resim.genislik);

        sayfa.drawImage(gomulu, {
          x: width / 2 - (gen / 2) * Math.cos(aci) + (yuk / 2) * Math.sin(aci),
          y: height / 2 - (gen / 2) * Math.sin(aci) - (yuk / 2) * Math.cos(aci),
          width: gen,
          height: yuk,
          rotate: { type: 'radians', angle: aci },
          opacity: 0.25,
        });
      }

      durum.tamam(`${pdf.getPageCount()} sayfaya filigran eklendi.`);
      sonuc.append(
        indirmeBaglantisi(pdfBlob(await pdf.save()), `${uzantisiz(dosya.name)}-filigranli.pdf`),
      );
    },
  });
}

export function sayfaNumarasi(kok) {
  const konum = el(
    'select',
    {},
    el('option', { value: 'orta' }, 'Alt orta'),
    el('option', { value: 'sag' }, 'Alt sağ'),
    el('option', { value: 'sol' }, 'Alt sol'),
  );
  const ilk = el('input', { type: 'text', inputMode: 'numeric', value: '1', autocomplete: 'off' });

  pdfAraci(kok, {
    alanlar: [
      el('label', { sinif: 'alan' }, el('span', {}, 'Konum'), konum),
      el('label', { sinif: 'alan' }, el('span', {}, 'İlk sayfanın numarası'), ilk),
    ],
    dugmeYazisi: 'Numara ekle',
    is: async (dosya, durum, sonuc) => {
      const baslangic = Number(ilk.value);

      if (!Number.isInteger(baslangic) || baslangic < 0) {
        throw new Error('İlk sayfa numarası tam sayı olmalı.');
      }

      durum.yaz('Dosya hazırlanıyor', 0.5);
      await nefes();

      const pdf = await PDFDocument.load(await dosya.arrayBuffer());
      const yaziTipi = await pdf.embedFont(StandardFonts.Helvetica);
      const boy = 11;
      const pay = 28;

      pdf.getPages().forEach((sayfa, sira) => {
        const metin = String(baslangic + sira);
        const gen = yaziTipi.widthOfTextAtSize(metin, boy);
        const { width } = sayfa.getSize();
        const x = {
          orta: (width - gen) / 2,
          sag: width - gen - pay,
          sol: pay,
        }[konum.value];

        sayfa.drawText(metin, { x, y: 20, size: boy, font: yaziTipi, color: rgb(0.2, 0.2, 0.2) });
      });

      durum.tamam(`${pdf.getPageCount()} sayfa numaralandı.`);
      sonuc.append(
        indirmeBaglantisi(pdfBlob(await pdf.save()), `${uzantisiz(dosya.name)}-numarali.pdf`),
      );
    },
  });
}

let qpdfSozu = null;

// qpdf modül değil düz betik olarak gelir, global Module tanımlar.
function qpdfYukle() {
  if (!qpdfSozu) {
    qpdfSozu = new Promise((coz, reddet) => {
      const betik = document.createElement('script');
      betik.src = new URL('../vendor/qpdf/qpdf.js', import.meta.url).href;
      betik.onload = () => coz(window.Module);
      betik.onerror = () => reddet(new Error('Şifreleme motoru inmedi. İnternetini kontrol et.'));
      document.head.append(betik);
    });
  }

  return qpdfSozu;
}

// qpdf her işte yeniden kurulur. Çok küçük olduğu için maliyeti yok.
async function qpdfCalistir(dosya, argumanlar) {
  const kur = await qpdfYukle();
  const motor = await kur({
    locateFile: () => new URL('../vendor/qpdf/qpdf.wasm', import.meta.url).href,
    print: () => {},
    printErr: () => {},
  });

  motor.FS.writeFile('/girdi.pdf', new Uint8Array(await dosya.arrayBuffer()));

  let kod;

  try {
    kod = motor.callMain([...argumanlar, '/girdi.pdf', '/cikti.pdf']);
  } catch (hata) {
    kod = hata?.status ?? 2;
  }

  // qpdf uyarıyla bitince 3 döner, dosya yine de yazılmıştır.
  if (kod !== 0 && kod !== 3) {
    return null;
  }

  return motor.FS.readFile('/cikti.pdf');
}

export function sifrele(kok) {
  const sifre = el('input', { type: 'text', autocomplete: 'off', placeholder: 'Yeni şifre' });

  pdfAraci(kok, {
    alanlar: [
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'Şifre', el('small', {}, 'Şifreyi unutursan dosya açılmaz, kurtarılamaz.')),
        sifre,
      ),
    ],
    dugmeYazisi: 'Şifrele',
    is: async (dosya, durum, sonuc) => {
      if (sifre.value === '') {
        throw new Error('Şifre yazmadın.');
      }

      durum.yaz('Dosya şifreleniyor', 0.5);
      const veri = await qpdfCalistir(dosya, ['--encrypt', sifre.value, sifre.value, '256', '--']);

      if (!veri) {
        throw new Error('Bu dosya şifrelenemedi. Dosya bozuk ya da zaten şifreli olabilir.');
      }

      durum.tamam('Dosya şifrelendi.');
      sonuc.append(indirmeBaglantisi(pdfBlob(veri), `${uzantisiz(dosya.name)}-sifreli.pdf`));
    },
  });
}

export function sifreKaldir(kok) {
  const sifre = el('input', { type: 'text', autocomplete: 'off', placeholder: 'Dosyanın şifresi' });

  pdfAraci(kok, {
    ipucu: 'Şifresini bildiğin dosya için',
    alanlar: [el('label', { sinif: 'alan' }, el('span', {}, 'Şifre'), sifre)],
    dugmeYazisi: 'Şifreyi kaldır',
    is: async (dosya, durum, sonuc) => {
      durum.yaz('Şifre kaldırılıyor', 0.5);
      const veri = await qpdfCalistir(dosya, [`--password=${sifre.value}`, '--decrypt']);

      if (!veri) {
        throw new Error('Şifre yanlış ya da dosya bozuk.');
      }

      durum.tamam('Şifre kaldırıldı.');
      sonuc.append(indirmeBaglantisi(pdfBlob(veri), `${uzantisiz(dosya.name)}-sifresiz.pdf`));
    },
  });
}

export function pdftenYazi(kok) {
  const aralik = el('input', {
    type: 'text',
    placeholder: 'Boş bırakırsan bütün sayfalar',
    autocomplete: 'off',
  });

  pdfAraci(kok, {
    alanlar: [
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'Hangi sayfalar?', el('small', {}, 'Örnek: 1-3, 5')),
        aralik,
      ),
    ],
    dugmeYazisi: 'Yazıyı çıkar',
    is: async (dosya, durum, sonuc) => {
      const pdf = await pdfAc(await dosya.arrayBuffer());

      try {
        const secilen = aralik.value.trim() === ''
          ? Array.from({ length: pdf.numPages }, (_, sira) => sira + 1)
          : aralikCoz(aralik.value, pdf.numPages);
        const parcalar = [];

        for (const [sira, numara] of secilen.entries()) {
          durum.yaz(`Sayfa ${numara} okunuyor`, sira / secilen.length);
          await nefes();

          const sayfa = await pdf.getPage(numara);
          const icerik = await sayfa.getTextContent();
          const metin = icerik.items
            .map((parca) => parca.str + (parca.hasEOL ? '\n' : ' '))
            .join('');

          parcalar.push(metin.trim());
          sayfa.cleanup();
        }

        const tum = parcalar.join('\n\n').trim();

        if (tum === '') {
          durum.hata('Bu dosyada seçilebilir yazı yok. Taranmış olabilir, "Taranmış sayfadan yazı" aracını dene.');
          return;
        }

        const kutu = el('textarea', { value: tum, 'aria-label': 'Çıkarılan yazı' });
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

        durum.tamam('Yazı hazır.');
        sonuc.append(
          kutu,
          kopyala,
          indirmeBaglantisi(
            new Blob([tum], { type: 'text/plain;charset=utf-8' }),
            `${uzantisiz(dosya.name)}.txt`,
          ),
        );
      } catch (hata) {
        throw new Error(hataMetni(hata));
      } finally {
        await pdf.destroy();
      }
    },
  });
}

export function pdftenWord(kok) {
  pdfAraci(kok, {
    ipucu: 'Yalnız yazı aktarılır. Resim, tablo ve sayfa düzeni gelmez.',
    alanlar: [],
    dugmeYazisi: 'Word\'e çevir',
    is: async (dosya, durum, sonuc) => {
      const pdf = await pdfAc(await dosya.arrayBuffer());

      try {
        const sayfalar = [];

        for (let numara = 1; numara <= pdf.numPages; numara += 1) {
          durum.yaz(`Sayfa ${numara} / ${pdf.numPages} okunuyor`, (numara - 1) / pdf.numPages);
          await nefes();

          const sayfa = await pdf.getPage(numara);
          const icerik = await sayfa.getTextContent();
          sayfalar.push(paragraflaraAyir(icerik.items.filter((parca) => 'str' in parca)));
          sayfa.cleanup();
        }

        if (sayfalar.every((paragraflar) => paragraflar.length === 0)) {
          durum.hata('Bu dosyada seçilebilir yazı yok. Taranmış olabilir, "Taranmış sayfadan yazı" aracını dene.');
          return;
        }

        const blob = new Blob([docxOlustur(sayfalar)], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        durum.tamam('Word dosyası hazır. Yalnız yazı aktarıldı, açıp kontrol et.');
        sonuc.append(indirmeBaglantisi(blob, `${uzantisiz(dosya.name)}.docx`));
      } finally {
        await pdf.destroy();
      }
    },
  });
}
