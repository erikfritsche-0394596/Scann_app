// Atlantis Sommerfest Scanner — shared product catalog + helpers
// Realistic dive-shop catalog modelled on the Atlantis Onlineshop range.

(function () {
  const EUR = (v) =>
    v == null
      ? '—'
      : new Intl.NumberFormat('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(v) + ' €';

  // stock status thresholds
  const stockState = (n) =>
    n === 0 ? 'out' : n <= 5 ? 'low' : 'ok';

  const PRODUCTS = [
    {
      id: 'x-wing-32',
      ean: '4260583720245',
      art: '100245',
      brand: 'Atlantis',
      name: 'X-Wing 32lbs Jacket-Set',
      cat: 'Tauchausrüstung',
      tone: '#1a3c6e',
      price: 549,
      sale: 479,
      stock: 14,
      desc: 'Allrounder-Tauchjacket mit Comfort Soft Harness, salzwasserbeständigen Edelstahl D-Ringen und 32 lbs Auftrieb.',
      variantLabel: 'Größe',
      variants: [
        { v: 'XS', n: 2 }, { v: 'S', n: 5 }, { v: 'M', n: 4 },
        { v: 'L', n: 3 }, { v: 'XL', n: 0 }, { v: 'XXL', n: 1 },
      ],
      specs: [
        ['Auftrieb', '32 lbs / 14,5 kg'],
        ['Material', 'Cordura ballistisch'],
        ['Bleisystem', 'integriert, schnellabwurf'],
        ['Gewicht', '3,2 kg'],
        ['Farbe', 'Schwarz'],
      ],
    },
    {
      id: 'mk19-g260',
      ean: '4040810200817',
      art: '200817',
      brand: 'Scubapro',
      name: 'MK19 EVO / G260 Atemregler-Set',
      cat: 'Atemregler',
      tone: '#1a3c6e',
      price: 729,
      sale: null,
      stock: 6,
      desc: 'Hochleistungs-Atemreglerset, kaltwassertauglich und balanciert – ideal für anspruchsvolle Tauchgänge.',
      variantLabel: 'Anschluss',
      variants: [
        { v: 'DIN 300', n: 4 }, { v: 'INT', n: 2 },
      ],
      specs: [
        ['1. Stufe', 'MK19 EVO, membrangesteuert'],
        ['2. Stufe', 'G260, balanciert'],
        ['Kaltwasser', 'ja, geprüft'],
        ['Anschluss', 'DIN 300 bar'],
        ['Gewicht', '1,21 kg'],
      ],
    },
    {
      id: 'octopus-r105',
      ean: '4040810200903',
      art: '200903',
      brand: 'Scubapro',
      name: 'Octopus R105',
      cat: 'Atemregler',
      tone: '#1a3c6e',
      price: 159,
      sale: null,
      stock: 23,
      desc: 'Robuster Oktopus als Backup-Atemregler, leichtgängig und wartungsarm.',
      variantLabel: null,
      variants: [],
      specs: [
        ['Typ', 'Backup / Octopus'],
        ['Schlauch', '90 cm, gelb'],
        ['Atemwiderstand', 'einstellbar'],
        ['Gewicht', '0,28 kg'],
      ],
      note: 'Aktion: gratis zu jedem Aktions-Atemregler bis 30.06.',
    },
    {
      id: 'x-vision',
      ean: '8023934010112',
      art: '300112',
      brand: 'Mares',
      name: 'X-Vision Tauchmaske',
      cat: 'Masken',
      tone: '#1a3c6e',
      price: 79.9,
      sale: 59.9,
      stock: 31,
      desc: 'Zwei-Glas-Maske mit Liquidskin-Silikon und großem Sichtfeld für klare Sicht unter Wasser.',
      variantLabel: 'Farbe',
      variants: [
        { v: 'Schwarz', n: 12 }, { v: 'Blau', n: 14 }, { v: 'Weiß', n: 5 },
      ],
      specs: [
        ['Gläser', 'gehärtetes Tempered-Glas'],
        ['Silikon', 'Liquidskin, hypoallergen'],
        ['Sichtfeld', 'weit, 2-Glas'],
        ['Volumen', 'niedrig'],
      ],
    },
    {
      id: 'avanti-quattro',
      ean: '8023934010455',
      art: '300455',
      brand: 'Mares',
      name: 'Avanti Quattro+ Flossen',
      cat: 'Flossen',
      tone: '#1a3c6e',
      price: 119,
      sale: null,
      stock: 9,
      desc: 'Vier-Kanal-Flossenblatt für kraftvollen, effizienten Vortrieb mit verstellbarer Fußschlaufe.',
      variantLabel: 'Größe',
      variants: [
        { v: '38/39', n: 3 }, { v: '40/41', n: 4 }, { v: '42/43', n: 2 },
        { v: '44/45', n: 0 }, { v: '46/47', n: 0 },
      ],
      specs: [
        ['Blatt', '4-Kanal, Tecralene'],
        ['Bändel', 'Bungee, verstellbar'],
        ['Typ', 'Geräteflosse'],
        ['Farbe', 'Schwarz'],
      ],
    },
    {
      id: 'cressi-fast',
      ean: '8022983040221',
      art: '400221',
      brand: 'Cressi',
      name: 'Fast 5mm Neoprenanzug',
      cat: 'Anzüge',
      tone: '#1a3c6e',
      price: 199,
      sale: 169,
      stock: 12,
      desc: 'Halbtrocken-Anzug 5 mm aus ultradehnbarem Neopren mit YKK-Reißverschluss am Rücken.',
      variantLabel: 'Größe',
      variants: [
        { v: 'S', n: 3 }, { v: 'M', n: 4 }, { v: 'L', n: 3 }, { v: 'XL', n: 2 },
      ],
      specs: [
        ['Stärke', '5 mm'],
        ['Neopren', 'ultradehnbar, glatt'],
        ['Reißverschluss', 'YKK, Rücken'],
        ['Nähte', 'geblindstichelt'],
      ],
    },
    {
      id: 'zoop-novo',
      ean: '6417084030078',
      art: '500078',
      brand: 'Suunto',
      name: 'Zoop Novo Tauchcomputer',
      cat: 'Computer',
      tone: '#1a3c6e',
      price: 249,
      sale: null,
      stock: 4,
      desc: 'Übersichtlicher Einsteiger-Tauchcomputer mit Nitrox-Unterstützung und vier Tauchmodi.',
      variantLabel: 'Farbe',
      variants: [
        { v: 'Schwarz', n: 2 }, { v: 'Lime', n: 2 },
      ],
      specs: [
        ['Modi', 'Air, Nitrox, Gauge, Free'],
        ['Display', 'Matrix, beleuchtet'],
        ['Nitrox', 'bis 99 % O₂'],
        ['Batterie', 'selbst wechselbar'],
      ],
    },
    {
      id: 'reef-set',
      ean: '4260583720014',
      art: '600014',
      brand: 'Atlantis',
      name: 'Schnorchel-Set Reef',
      cat: 'Schnorcheln',
      tone: '#1a3c6e',
      price: 39.9,
      sale: 29.9,
      stock: 48,
      desc: 'Maske und Schnorchel im Set – ideal für Einsteiger, Urlaub und den Sommerfest-Mitnahmeartikel.',
      variantLabel: 'Farbe',
      variants: [
        { v: 'Aqua', n: 22 }, { v: 'Koralle', n: 26 },
      ],
      specs: [
        ['Inhalt', 'Maske + Schnorchel'],
        ['Schnorchel', 'Splashguard-Top'],
        ['Maske', '2-Glas, Silikon'],
        ['Tasche', 'Netzbeutel inkl.'],
      ],
    },
  ];

  window.ATLANTIS = { PRODUCTS, EUR, stockState };
})();
