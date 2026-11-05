// Sayfa aralığı yazısını sayfa listesine çevirir.
// Örnek: "1-3, 5" ve 10 sayfa için sonuç [1, 2, 3, 5] olur.

export function aralikCoz(metin, sayfaSayisi) {
  const temiz = String(metin ?? '').trim();

  if (temiz === '') {
    throw new Error('Sayfa numarası yazmadın. Örnek: 1-3, 5');
  }

  const sayfalar = [];

  for (const parca of temiz.split(/[,;\s]+/).filter(Boolean)) {
    const eslesme = parca.match(/^(\d+)(?:-(\d+))?$/);

    if (!eslesme) {
      throw new Error(`"${parca}" anlaşılmadı. Örnek: 1-3, 5`);
    }

    const bas = Number(eslesme[1]);
    const son = eslesme[2] === undefined ? bas : Number(eslesme[2]);

    if (bas < 1 || son < 1 || bas > sayfaSayisi || son > sayfaSayisi) {
      throw new Error(`Bu dosyada ${sayfaSayisi} sayfa var. "${parca}" bu sınırın dışında.`);
    }

    const adim = bas <= son ? 1 : -1;

    for (let sayfa = bas; sayfa !== son + adim; sayfa += adim) {
      sayfalar.push(sayfa);
    }
  }

  return sayfalar;
}

export function boyutYaz(bayt) {
  if (bayt < 1024) {
    return `${bayt} B`;
  }

  if (bayt < 1024 * 1024) {
    return `${Math.round(bayt / 1024)} KB`;
  }

  return `${(bayt / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function uzantisiz(dosyaAdi) {
  return dosyaAdi.replace(/\.[^.]+$/, '');
}

// Küçültme sonucundan hangisinin verileceğini seçer.
// Yeni dosya küçük değilse özgün dosya korunur.
export function kucultmeSonucu(ozgunBoyut, yeniBoyut) {
  const kazanc = ozgunBoyut - yeniBoyut;
  const yuzde = ozgunBoyut > 0 ? Math.round((kazanc / ozgunBoyut) * 100) : 0;

  // Yüzde birin altındaki kazanç kullanıcı için küçülme sayılmaz.
  return {
    kuculdu: yuzde >= 1,
    yuzde,
  };
}

// "1:30", "1:02:03" ya da "90" yazısını saniyeye çevirir.
export function sureCoz(metin) {
  const temiz = String(metin ?? '').trim();

  if (!/^\d+(:\d{1,2}){0,2}$/.test(temiz)) {
    throw new Error(`"${temiz}" anlaşılmadı. Örnek: 1:30`);
  }

  return temiz.split(':').reduce((toplam, parca) => toplam * 60 + Number(parca), 0);
}

const BELGE_GRUPLARI = [
  {
    girdi: ['docx', 'doc', 'odt', 'rtf', 'txt', 'html', 'htm', 'epub'],
    // TXT ve HTML çıktısı yok: LibreOffice bu sürümde TXT'de takılıyor, HTML'de hata veriyor.
    cikti: ['pdf', 'docx', 'odt', 'rtf'],
  },
  {
    girdi: ['xlsx', 'xls', 'ods', 'csv'],
    cikti: ['pdf', 'xlsx', 'ods', 'csv'],
  },
  {
    girdi: ['pptx', 'ppt', 'odp'],
    cikti: ['pdf', 'pptx', 'odp'],
  },
];

// Bir belgenin hangi türlere çevrilebileceğini söyler. Kendi türü listede olmaz.
export function belgeCiktilari(uzanti) {
  const kucuk = String(uzanti).toLowerCase();
  const grup = BELGE_GRUPLARI.find((aday) => aday.girdi.includes(kucuk));

  if (!grup) {
    return [];
  }

  return grup.cikti.filter((tur) => tur !== kucuk);
}
