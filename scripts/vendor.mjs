// Motor dosyalarını node_modules içinden vendor/ klasörüne kopyalar.
// Site derleme adımı olmadan çalışır; tarayıcı yalnız vendor/ içindekileri yükler.
// Kullanım: npm install, sonra npm run vendor

import { createReadStream, createWriteStream } from 'node:fs';
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, constants } from 'node:zlib';

const NM = 'node_modules';
const HEDEF = 'vendor';

async function kopyala(kaynak, hedef) {
  await mkdir(dirname(join(HEDEF, hedef)), { recursive: true });
  await cp(join(NM, kaynak), join(HEDEF, hedef), { recursive: true });
}

async function sikistir(kaynak, hedef) {
  const hedefYol = join(HEDEF, hedef);
  await mkdir(dirname(hedefYol), { recursive: true });
  await pipeline(
    createReadStream(join(NM, kaynak)),
    createGzip({ level: constants.Z_BEST_COMPRESSION }),
    createWriteStream(hedefYol),
  );
}

await rm(HEDEF, { recursive: true, force: true });

// PDF düzenleme
await kopyala('pdf-lib/dist/pdf-lib.esm.min.js', 'pdf-lib.esm.min.js');

// PDF okuma ve sayfa çizme
await kopyala('pdfjs-dist/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs');
await kopyala('pdfjs-dist/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs');
await kopyala('pdfjs-dist/cmaps', 'pdfjs/cmaps');
await kopyala('pdfjs-dist/standard_fonts', 'pdfjs/standard_fonts');
await kopyala('pdfjs-dist/wasm', 'pdfjs/wasm');

// OCR
await kopyala('tesseract.js/dist/tesseract.esm.min.js', 'tesseract/tesseract.esm.min.js');
await kopyala('tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js');
for (const ad of await readdir(join(NM, 'tesseract.js-core'))) {
  if (ad.endsWith('-lstm.wasm.js')) {
    await kopyala(`tesseract.js-core/${ad}`, `tesseract/core/${ad}`);
  }
}
await kopyala('@tesseract.js-data/tur/4.0.0_best_int/tur.traineddata.gz', 'tesseract/lang/tur.traineddata.gz');
await kopyala('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'tesseract/lang/eng.traineddata.gz');

// Word'den PDF'e (LibreOffice). GitHub 100 MB üstü dosya kabul etmediği için sıkıştırılır.
const LO = '@matbee/libreoffice-converter';
await kopyala(`${LO}/dist/browser.js`, 'libreoffice/browser.js');
await kopyala(`${LO}/dist/browser.worker.global.js`, 'libreoffice/browser.worker.global.js');
await kopyala(`${LO}/wasm/soffice.js`, 'libreoffice/soffice.js');
await kopyala(`${LO}/wasm/soffice.worker.js`, 'libreoffice/soffice.worker.js');
await sikistir(`${LO}/wasm/soffice.wasm`, 'libreoffice/soffice.wasm.gz');
await sikistir(`${LO}/wasm/soffice.data`, 'libreoffice/soffice.data.gz');

// Ses ve video
await kopyala('@ffmpeg/ffmpeg/dist/esm', 'ffmpeg');
await kopyala('@ffmpeg/core/dist/esm/ffmpeg-core.js', 'ffmpeg-core/ffmpeg-core.js');
await kopyala('@ffmpeg/core/dist/esm/ffmpeg-core.wasm', 'ffmpeg-core/ffmpeg-core.wasm');

// iPhone fotoğrafları (HEIC)
await kopyala('heic2any/dist/heic2any.min.js', 'heic2any.min.js');

// PDF'ten Word'e (zip yazıcı)
await kopyala('fflate/esm/browser.js', 'fflate.js');

// PDF şifreleme
await kopyala('@neslinesli93/qpdf-wasm/dist/qpdf.js', 'qpdf/qpdf.js');
await kopyala('@neslinesli93/qpdf-wasm/dist/qpdf.wasm', 'qpdf/qpdf.wasm');

// İndirme çubuğu toplam boyutu buradan okur.
const wasm = (await stat(join(HEDEF, 'libreoffice', 'soffice.wasm.gz'))).size;
const data = (await stat(join(HEDEF, 'libreoffice', 'soffice.data.gz'))).size;
await writeFile(join(HEDEF, 'libreoffice', 'boyut.json'), JSON.stringify({ wasm, data }));
console.log('vendor hazır', { wasm, data });
