// Ses ve video araçları. FFmpeg tarayıcıda çalışır, dosya cihazdan çıkmaz.

import { boyutYaz, sureCoz, uzantisiz } from './aralik.js';
import { el, topluArac } from './ortak.js';

const SES_AYARLARI = {
  mp3: { mime: 'audio/mpeg', arguman: ['-c:a', 'libmp3lame', '-q:a', '2'] },
  m4a: { mime: 'audio/mp4', arguman: ['-c:a', 'aac', '-b:a', '192k'] },
  ogg: { mime: 'audio/ogg', arguman: ['-c:a', 'libvorbis', '-q:a', '5'] },
  wav: { mime: 'audio/wav', arguman: ['-c:a', 'pcm_s16le'] },
};

// Her işte yeni motor açılır, iş bitince kapanır. Telefonda bellek geri gelir.
async function calistir(dosya, cikisAdi, argumanlar, durum, girisOncesi = []) {
  durum.yaz('Ses ve video motoru hazırlanıyor. İlk seferde 32 MB iner.');

  const { FFmpeg } = await import('../vendor/ffmpeg/index.js');
  const motor = new FFmpeg();

  motor.on('progress', ({ progress }) => {
    if (progress >= 0 && progress <= 1) {
      durum.yaz(`İşleniyor: yüzde ${Math.round(progress * 100)}`, progress);
    }
  });

  try {
    await motor.load({
      coreURL: new URL('../vendor/ffmpeg-core/ffmpeg-core.js', import.meta.url).href,
      wasmURL: new URL('../vendor/ffmpeg-core/ffmpeg-core.wasm', import.meta.url).href,
    });

    // Dosya belleğe kopyalanmaz, yerinden okunur. Büyük videoda önemli.
    const uzanti = dosya.name.split('.').pop().toLowerCase();
    const girisAdi = `girdi.${uzanti}`;
    await motor.createDir('/g');
    await motor.mount('WORKERFS', { files: [new File([dosya], girisAdi)] }, '/g');

    durum.yaz('İşleniyor', 0);
    const kod = await motor.exec([...girisOncesi, '-i', `/g/${girisAdi}`, ...argumanlar, cikisAdi]);

    if (kod !== 0) {
      throw new Error('Bu dosya işlenemedi. Dosya bozuk olabilir ya da istenen parça yok.');
    }

    return await motor.readFile(cikisAdi);
  } finally {
    motor.terminate();
  }
}

function medyaAraci(kok, ayar) {
  topluArac(kok, {
    ...ayar,
    is: async (dosya, durum) => {
      const sonuc = await ayar.is(dosya, durum);
      return { ...sonuc, mesaj: `Hazır: ${boyutYaz(dosya.size)} → ${boyutYaz(sonuc.blob.size)}` };
    },
  });
}

export function ses(kok) {
  const tur = el(
    'select',
    {},
    el('option', { value: 'mp3' }, 'MP3'),
    el('option', { value: 'm4a' }, 'M4A'),
    el('option', { value: 'ogg' }, 'OGG'),
    el('option', { value: 'wav' }, 'WAV (büyük dosya)'),
  );

  medyaAraci(kok, {
    kabul: 'audio/*,video/*,.ogg,.opus,.m4a,.mkv',
    baslik: 'Ses ya da video seç',
    ipucu: 'Videoyu seçersen yalnız sesi alınır. WhatsApp ses kaydı da olur.',
    alanlar: [el('label', { sinif: 'alan' }, el('span', {}, 'Neye çevrilsin?'), tur)],
    dugmeYazisi: 'Çevir',
    is: async (dosya, durum) => {
      const ayar = SES_AYARLARI[tur.value];
      const ad = `${uzantisiz(dosya.name)}.${tur.value}`;
      const veri = await calistir(dosya, `cikti.${tur.value}`, ['-vn', ...ayar.arguman], durum);

      return { blob: new Blob([veri], { type: ayar.mime }), ad };
    },
  });
}

export function video(kok) {
  const boyut = el(
    'select',
    {},
    el('option', { value: '720' }, '720p'),
    el('option', { value: '480' }, '480p (küçük dosya)'),
    el('option', { value: '360' }, '360p (en küçük dosya)'),
    el('option', { value: '' }, 'Aynı kalsın'),
  );

  medyaAraci(kok, {
    kabul: 'video/*,.mkv,.mov',
    baslik: 'Videoyu seç',
    ipucu: 'Çıktı her telefonda açılan MP4 olur.',
    uyari: 'Video çevirmek telefonda yavaştır. Bir dakikalık video birkaç dakika sürebilir, ekranı açık tut.',
    alanlar: [el('label', { sinif: 'alan' }, el('span', {}, 'Görüntü boyutu'), boyut)],
    dugmeYazisi: 'Çevir',
    is: async (dosya, durum) => {
      const olcek = boyut.value
        ? ['-vf', `scale=-2:'min(${boyut.value},ih)'`]
        : ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'];
      const veri = await calistir(
        dosya,
        'cikti.mp4',
        [
          ...olcek,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '28',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
        ],
        durum,
      );

      return {
        blob: new Blob([veri], { type: 'video/mp4' }),
        ad: `${uzantisiz(dosya.name)}-kucuk.mp4`,
      };
    },
  });
}

export function kes(kok) {
  const bas = el('input', { type: 'text', placeholder: 'Örnek: 0:30', autocomplete: 'off' });
  const son = el('input', {
    type: 'text',
    placeholder: 'Boş bırakırsan sonuna kadar',
    autocomplete: 'off',
  });

  medyaAraci(kok, {
    kabul: 'audio/*,video/*,.ogg,.opus,.m4a,.mkv',
    baslik: 'Ses ya da video seç',
    ipucu: 'Yeniden çevirmeden keser, hızlıdır.',
    alanlar: [
      el(
        'label',
        { sinif: 'alan' },
        el('span', {}, 'Başlangıç', el('small', {}, 'Dakika:saniye. Kesim en yakın kareye oturur.')),
        bas,
      ),
      el('label', { sinif: 'alan' }, el('span', {}, 'Bitiş'), son),
    ],
    dugmeYazisi: 'Kes',
    is: async (dosya, durum) => {
      const baslangic = bas.value.trim() === '' ? 0 : sureCoz(bas.value);
      const bitis = son.value.trim() === '' ? null : sureCoz(son.value);

      if (bitis !== null && bitis <= baslangic) {
        throw new Error('Bitiş, başlangıçtan sonra olmalı.');
      }

      const uzanti = dosya.name.split('.').pop().toLowerCase();

      // Süreler girişten önce verilir. Sonra verilirse video ara kareden başlar ve görüntü çıkmaz.
      const girisOncesi = [
        '-ss', String(baslangic),
        ...(bitis === null ? [] : ['-to', String(bitis)]),
      ];
      const veri = await calistir(dosya, `cikti.${uzanti}`, ['-c', 'copy'], durum, girisOncesi);

      return {
        blob: new Blob([veri], { type: dosya.type || 'application/octet-stream' }),
        ad: `${uzantisiz(dosya.name)}-kesilmis.${uzanti}`,
      };
    },
  });
}
