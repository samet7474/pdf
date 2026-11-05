import assert from 'node:assert/strict';
import { test } from 'node:test';

import { strFromU8, unzipSync } from '../vendor/fflate.js';
import { docxOlustur, paragraflaraAyir } from '../js/docx.js';

function parca(str, y) {
  return { str, height: 12, transform: [12, 0, 0, 12, 72, y] };
}

test('yakın satırlar tek paragraf, uzak satır yeni paragraf olur', () => {
  const sonuc = paragraflaraAyir([
    parca('Birinci satır', 700),
    parca('ikinci satır', 686),
    parca('Yeni paragraf', 640),
  ]);

  assert.deepEqual(sonuc, ['Birinci satır ikinci satır', 'Yeni paragraf']);
});

test('aynı satırdaki parçalar birleşir, boş parçalar atılır', () => {
  const sonuc = paragraflaraAyir([parca('Şoför ', 700), parca('geldi', 700), parca('  ', 600)]);

  assert.deepEqual(sonuc, ['Şoför geldi']);
});

test('Word dosyası Türkçe harfi korur, özel karakteri kaçırır', () => {
  const zip = unzipSync(docxOlustur([['çğıöşü <&>'], ['İkinci sayfa']]));
  const belge = strFromU8(zip['word/document.xml']);

  assert.ok(belge.includes('çğıöşü &lt;&amp;&gt;'));
  assert.ok(belge.includes('w:type="page"'));
  assert.ok(zip['[Content_Types].xml']);
});
