// PDF'ten gelen satırlardan paragraf kurar ve basit bir Word dosyası yazar.
// Yalnız yazı taşınır. Resim, tablo ve sayfa düzeni gelmez.

import { strToU8, zipSync } from '../vendor/fflate.js';

// pdf.js parçalarını satırlara, satırları paragraflara toplar.
// Satır aralığı normalin 1,6 katını geçerse yeni paragraf başlar.
export function paragraflaraAyir(parcalar) {
  const satirlar = [];

  for (const parca of parcalar) {
    const y = parca.transform[5];
    const boy = parca.height || Math.abs(parca.transform[3]) || 12;
    const son = satirlar.at(-1);

    if (son && Math.abs(son.y - y) < boy / 2) {
      son.metin += parca.str;
    } else if (parca.str.trim() !== '') {
      satirlar.push({ y, boy, metin: parca.str });
    }
  }

  const paragraflar = [];
  let onceki = null;

  for (const satir of satirlar) {
    const metin = satir.metin.trim();

    if (metin === '') {
      continue;
    }

    const yakin = onceki && onceki.y - satir.y > 0 && onceki.y - satir.y < satir.boy * 1.6;

    if (yakin) {
      paragraflar[paragraflar.length - 1] += ` ${metin}`;
    } else {
      paragraflar.push(metin);
    }

    onceki = satir;
  }

  return paragraflar;
}

function xmlKacir(metin) {
  return metin
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // XML'de izin verilmeyen denetim karakterleri atılır.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

// sayfalar: her sayfa için paragraf listesi.
export function docxOlustur(sayfalar) {
  const govde = sayfalar
    .map((paragraflar, sira) => {
      const kirilma = sira === 0 ? '' : '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      const icerik = paragraflar
        .map((metin) => `<w:p><w:r><w:t xml:space="preserve">${xmlKacir(metin)}</w:t></w:r></w:p>`)
        .join('');

      return kirilma + icerik;
    })
    .join('');

  const baslik = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  return zipSync({
    '[Content_Types].xml': strToU8(
      `${baslik}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        + '</Types>',
    ),
    '_rels/.rels': strToU8(
      `${baslik}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        + '</Relationships>',
    ),
    'word/document.xml': strToU8(
      `${baslik}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
        + `<w:body>${govde}</w:body></w:document>`,
    ),
  });
}
