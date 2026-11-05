# PDF Araçları

Telefonda ve tablette çalışan, reklamsız PDF araçları. Bütün işler tarayıcıda yapılır, dosyalar cihazdan çıkmaz.

Araçlar: birleştirme, bölme, sayfa düzenleme, döndürme, resimden PDF'e, PDF'ten resme, Word'den PDF'e, küçültme, taranmış sayfadan yazı çıkarma.

## Çalıştırma

Derleme adımı yok. Klasörü herhangi bir statik sunucuyla açmak yeterli:

```bash
py -3 -m http.server 8768
```

## Motorları güncelleme

`vendor/` klasörü `node_modules` içinden üretilir ve depoya girer:

```bash
npm install
npm run vendor
```

Siteyi yayınlamadan önce `js/app.js` ve `sw.js` içindeki `SURUM` değerini birlikte artır. Motor dosyaları değiştiyse `sw.js` içindeki `MOTOR` değerini de artır.

## Test

```bash
npm test
```

## Kaynaklar

- [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT)
- [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0)
- [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache-2.0)
- [libreoffice-converter](https://www.npmjs.com/package/@matbee/libreoffice-converter) (MPL-2.0)
- [BentoPDF](https://github.com/alam00000/bentopdf) (AGPL-3.0): Word motorunu yükleme yöntemi buradan uyarlandı.
- [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker): Word aracının izin başlıkları için yöntem.

## Lisans

AGPL-3.0. Ayrıntı `LICENSE` dosyasında.
