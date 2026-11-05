// Resim biçimi değiştirme, boyutlandırma ve küçültme.

import { uzantisiz } from './aralik.js';
import { el, topluArac, tuvalBosalt, tuvaldenBlob } from './ortak.js';

const TURLER = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

let heicSozu = null;

function heicYukle() {
  if (!heicSozu) {
    heicSozu = new Promise((coz, reddet) => {
      const betik = document.createElement('script');
      betik.src = new URL('../vendor/heic2any.min.js', import.meta.url).href;
      betik.onload = () => coz(window.heic2any);
      betik.onerror = () => reddet(new Error('HEIC motoru inmedi. İnternetini kontrol et.'));
      document.head.append(betik);
    });
  }

  return heicSozu;
}

async function resimAc(dosya) {
  try {
    return await createImageBitmap(dosya);
  } catch (hata) {
    if (!/\.hei[cf]$/i.test(dosya.name)) {
      throw new Error(`${dosya.name} açılamadı. Bu tarayıcı bu resim türünü okuyamıyor olabilir.`);
    }
  }

  // iPhone fotoğrafı: tarayıcı okuyamıyorsa önce JPEG'e çevrilir.
  const heic2any = await heicYukle();
  const jpeg = await heic2any({ blob: dosya, toType: 'image/jpeg', quality: 0.95 });
  return createImageBitmap(Array.isArray(jpeg) ? jpeg[0] : jpeg);
}

export function resim(kok) {
  const tur = el(
    'select',
    {},
    el('option', { value: 'jpg' }, 'JPG'),
    el('option', { value: 'png' }, 'PNG'),
    el('option', { value: 'webp' }, 'WebP'),
  );
  const kalite = el(
    'select',
    {},
    el('option', { value: '0.9' }, 'Yüksek'),
    el('option', { value: '0.75' }, 'Orta (daha küçük dosya)'),
    el('option', { value: '0.55' }, 'Düşük (en küçük dosya)'),
  );
  const olcek = el(
    'select',
    {},
    el('option', { value: '1' }, 'Aynı kalsın'),
    el('option', { value: '0.75' }, 'Yüzde 75'),
    el('option', { value: '0.5' }, 'Yüzde 50'),
    el('option', { value: '0.25' }, 'Yüzde 25'),
  );
  const kaliteAlani = el(
    'label',
    { sinif: 'alan' },
    el('span', {}, 'Kalite', el('small', {}, 'PNG\'de kalite seçilmez.')),
    kalite,
  );

  tur.addEventListener('change', () => {
    kaliteAlani.hidden = tur.value === 'png';
  });

  topluArac(kok, {
    kabul: 'image/*,.heic,.heif',
    baslik: 'Resimleri seç',
    ipucu: 'JPG, PNG, WebP, HEIC',
    dugmeYazisi: 'Çevir',
    alanlar: [
      el('label', { sinif: 'alan' }, el('span', {}, 'Neye çevrilsin?'), tur),
      kaliteAlani,
      el('label', { sinif: 'alan' }, el('span', {}, 'Boyut'), olcek),
    ],
    is: async (dosya) => {
      const bit = await resimAc(dosya);
      const oran = Number(olcek.value);
      const tuval = document.createElement('canvas');
      tuval.width = Math.max(1, Math.round(bit.width * oran));
      tuval.height = Math.max(1, Math.round(bit.height * oran));

      const baglam = tuval.getContext('2d');

      // JPG saydamlık taşımaz, saydam yerler beyaz olur.
      if (tur.value === 'jpg') {
        baglam.fillStyle = '#ffffff';
        baglam.fillRect(0, 0, tuval.width, tuval.height);
      }

      baglam.drawImage(bit, 0, 0, tuval.width, tuval.height);
      bit.close();

      const blob = await tuvaldenBlob(tuval, TURLER[tur.value], Number(kalite.value));
      tuvalBosalt(tuval);

      // Eski tarayıcı WebP yazamazsa PNG verir, uzantı yanlış olmasın.
      if (blob.type !== TURLER[tur.value]) {
        throw new Error('Bu tarayıcı bu resim türünü yazamıyor. Başka bir tür seç.');
      }

      return { blob, ad: `${uzantisiz(dosya.name)}.${tur.value}` };
    },
  });
}
