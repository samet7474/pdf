import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aralikCoz, belgeCiktilari, boyutYaz, kucultmeSonucu, sureCoz, uzantisiz } from '../js/aralik.js';

test('aralık ve tek sayfa birlikte çözülür', () => {
  assert.deepEqual(aralikCoz('1-3, 5', 10), [1, 2, 3, 5]);
});

test('boşlukla ayrılmış sayfalar çözülür', () => {
  assert.deepEqual(aralikCoz('2 4', 5), [2, 4]);
});

test('ters aralık sayfaları ters sırada verir', () => {
  assert.deepEqual(aralikCoz('3-1', 3), [3, 2, 1]);
});

test('boş yazı hata verir', () => {
  assert.throws(() => aralikCoz('  ', 3), /Sayfa numarası yazmadın/);
});

test('sınır dışı sayfa hata verir', () => {
  assert.throws(() => aralikCoz('4', 3), /3 sayfa var/);
  assert.throws(() => aralikCoz('0', 3), /sınırın dışında/);
});

test('anlaşılmayan yazı hata verir', () => {
  assert.throws(() => aralikCoz('a-b', 3), /anlaşılmadı/);
});

test('boyut okunaklı yazılır', () => {
  assert.equal(boyutYaz(500), '500 B');
  assert.equal(boyutYaz(2048), '2 KB');
  assert.equal(boyutYaz(1572864), '1,5 MB');
});

test('uzantı atılır', () => {
  assert.equal(uzantisiz('ders.notu.pdf'), 'ders.notu');
});

test('küçültme sonucu doğru hesaplanır', () => {
  assert.deepEqual(kucultmeSonucu(100, 60), { kuculdu: true, yuzde: 40 });
  assert.equal(kucultmeSonucu(100, 120).kuculdu, false);
  assert.equal(kucultmeSonucu(100000, 99900).kuculdu, false);
});

test('süre saniyeye çevrilir', () => {
  assert.equal(sureCoz('90'), 90);
  assert.equal(sureCoz('1:30'), 90);
  assert.equal(sureCoz('1:02:03'), 3723);
});

test('anlaşılmayan süre hata verir', () => {
  assert.throws(() => sureCoz('bir dakika'), /anlaşılmadı/);
});

test('belge kendi türüne çevrilmez, gruplar karışmaz', () => {
  assert.deepEqual(belgeCiktilari('PPTX'), ['pdf', 'odp']);
  assert.ok(!belgeCiktilari('xlsx').includes('docx'));
  assert.deepEqual(belgeCiktilari('exe'), []);
});
