// Atlantis live data source — maps the Filiale sheet (Coppi-Hauptbestand,
// weitere Lager, Varianten ohne laufende Nummer) onto the scanner product shape.
//
// ── How to connect your real sheet ────────────────────────────────────────
//   Weg 1 (öffentlich):  Datei → Freigeben → Im Web veröffentlichen → CSV.
//   Weg 2 (privat, empf.): Apps-Script-Web-App, die dieselben Spalten liefert.
//   URL hier eintragen — leer lassen → eingebettete Beispieltabelle.
//   Hinweis: Browser brauchen CORS — der zuverlässige Weg ist "Im Web
//   veröffentlichen → CSV" (liefert eine .../pub?output=csv URL).
window.DATA_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/1qu5AvF6iWvPISBCpYUtiSjdTEqXlQrO0Qtm5-jTVZLE/export?format=csv&gid=0';

// BILD_URL enthält nur Dateinamen → hier die Basis-URL eurer Bilder eintragen
// (z. B. 'https://www.atlantis-berlin.de/images/produkte/'). Leer = Platzhalter.
window.IMAGE_BASE_URL = 'https://www.atlantiscloud.de/images/products/gross/';

(function () {
  // Standorte — der erste ist der "Heimat"-/Hauptbestand (Sommerfest vor Ort).
  const LOCATIONS = [
    { key: 'coppi', label: 'Coppi', cols: ['BESTAND(Coppi)', 'BESTAND_Coppi', 'Coppi'], home: true },
    { key: 'zentral', label: 'Zentrallager', cols: ['Zentrallager', 'Zentral'] },
    { key: 'steglitz', label: 'Steglitz', cols: ['Steglitz'] },
    { key: 'freiburg', label: 'Freiburg', cols: ['Freiburg'] },
    { key: 'hamburg', label: 'Hamburg', cols: ['Hamburg'] },
  ];
  const HOME = LOCATIONS[0];

  // ── robust CSV parser (quoted fields, commas, CRLF) ─────────────────────
  function parseCSV(text) {
    const rows = []; let row = [], field = '', i = 0, q = false;
    text = text.replace(/^\uFEFF/, '');
    while (i < text.length) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
      i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const headers = rows.shift().map((h) => h.trim());
    return rows.filter((r) => r.length > 1 && r.some((v) => v !== ''))
      .map((r) => Object.fromEntries(headers.map((h, j) => [h, (r[j] ?? '').trim()])));
  }

  const num = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const getCol = (r, cols) => { for (const c of cols) if (r[c] != null && r[c] !== '') return r[c]; return ''; };

  // ── name parsing: "Mares … Farbe: blau - Größe: S" ──────────────────────
  const ATTR_START = /(Farbe|Gr(?:ö|oe|o)(?:ß|ss|s)e)\s*:/i;
  function parseAttrs(name) {
    const size = (name.match(/Gr(?:ö|oe|o)(?:ß|ss|s)e\s*:\s*([^-–|]+)/i) || [])[1];
    const color = (name.match(/Farbe\s*:\s*([^-–|]+)/i) || [])[1];
    return { Größe: size && size.trim(), Farbe: color && color.trim() };
  }
  function baseName(name) {
    const m = name.match(ATTR_START);
    const b = m ? name.slice(0, m.index) : name;
    return b.replace(/[\s\-–•]+$/, '').trim();
  }
  const NA = (v) => !v || /^#?\s*n\/?a\s*#?$/i.test(v.trim());
  function cleanBrand(marke) {
    if (NA(marke)) return '';
    let b = (marke || '').split(/\s[-–]\s/)[0];
    b = b.replace(/\b(S\.?p\.?A\.?|S\.?r\.?l\.?|GmbH|AG|Oy|Inc\.?|Co\.?|KG|Ltd\.?|Outdoors)\b/gi, '').replace(/[.,\s]+$/, '').trim();
    return b || (marke || '').trim();
  }
  function cleanCat(kat) {
    if (NA(kat)) return 'Sonstiges';
    const parts = (kat || '').split(/\s[-–]\s/);
    const txt = parts.find((p) => !/^\d+$/.test(p.trim())) || parts[parts.length - 1] || '';
    return txt.trim() || 'Artikel';
  }
  // base article no.: master keeps its number; otherwise longest common prefix
  function artBase(rows) {
    const nums = rows.map((r) => r.ARTIKELNR).filter(Boolean);
    if (nums.length <= 1) return nums[0] || '';
    let p = nums[0];
    for (const n of nums) while (p && !n.startsWith(p)) p = p.slice(0, -1);
    return p.replace(/[-_]+$/, '') || nums[0];
  }

  function locsOf(r) {
    const o = {}; LOCATIONS.forEach((L) => { o[L.key] = Math.round(num(getCol(r, L.cols))); }); return o;
  }
  const sumLocs = (list) => { const o = {}; LOCATIONS.forEach((L) => { o[L.key] = list.reduce((a, r) => a + (r[L.key] || 0), 0); }); return o; };

  // ── group rows by base name (+ brand); resolve master/slave & variants ──
  function mapRows(records) {
    const groups = {};
    records.forEach((r) => {
      const brand = cleanBrand(r.MARKE);
      const key = (baseName(r.PRODUCTS_NAME || r.NAME || '') + '|' + brand).toLowerCase();
      (groups[key] ||= []).push(r);
    });

    return Object.values(groups).map((rows) => {
      const nameOf = (r) => r.NAME || r.PRODUCTS_NAME || '';
      const master = rows.find((r) => (r.MASTER_SLAVE || '').toUpperCase() === 'M');
      let scannables = rows.filter((r) => (r.MASTER_SLAVE || '').toUpperCase() !== 'M');
      if (!scannables.length) scannables = [master];
      const anchor = master || scannables[0];
      const brand = cleanBrand(anchor.MARKE);
      const cat = cleanCat(anchor.KATEGORIE);

      // which attributes vary across the scannable rows
      const attrRows = scannables.map((r) => ({ r, a: parseAttrs(nameOf(r)), loc: locsOf(r) }));
      const distinct = (k) => [...new Set(attrRows.map((x) => x.a[k]).filter(Boolean))];
      const varying = ['Farbe', 'Größe'].filter((k) => distinct(k).length > 1);
      const constants = ['Farbe', 'Größe'].filter((k) => distinct(k).length === 1);

      const isVariantProduct = scannables.length > 1 && varying.length > 0;

      // product display name: base + constant attributes (e.g. "… · blau")
      let name = baseName(nameOf(anchor));
      constants.forEach((k) => { const v = distinct(k)[0]; if (v) name += ` · ${v}`; });

      const variants = isVariantProduct ? attrRows.map((x) => ({
        v: varying.map((k) => x.a[k]).filter(Boolean).join(' · ') || (x.r.ARTIKELNR || '').split('-').pop(),
        n: x.loc[HOME.key],          // Coppi (vor Ort)
        total: LOCATIONS.reduce((a, L) => a + x.loc[L.key], 0),
        locs: x.loc,
        ean: x.r.EAN,
      })) : [];

      const allLocRows = attrRows.map((x) => x.loc);
      const totalsByLoc = sumLocs(allLocRows);
      const locations = LOCATIONS.map((L) => ({ key: L.key, label: L.label, home: !!L.home, n: totalsByLoc[L.key] }));
      const stockTotal = locations.reduce((a, l) => a + l.n, 0);

      const uvp = num(anchor.UVP);
      const price = num(anchor.PREIS);
      const onSale = uvp > 0 && price < uvp - 0.001;

      // deaktivierte Artikel + 0-€-Posten ausblenden
      const deactivated = rows.some((r) => /deaktiviert/i.test(nameOf(r)) || /deaktiviert/i.test(r.KATEGORIE || ''));
      if (deactivated || !(price > 0)) return null;

      const art = master ? (master.ARTIKELNR || '') : artBase(scannables);
      const rawImg = anchor.BILD_URL || (scannables.find((s) => s.BILD_URL) || {}).BILD_URL || '';
      const image = !rawImg ? '' : /^https?:/i.test(rawImg) ? rawImg : (window.IMAGE_BASE_URL ? window.IMAGE_BASE_URL + rawImg : '');
      const eans = rows.map((r) => r.EAN).filter(Boolean);

      return {
        id: art || anchor.EAN,
        ean: anchor.EAN,
        allEans: eans,
        art,
        brand,
        name,
        cat,
        price: onSale ? uvp : price,
        sale: onSale ? price : null,
        stock: totalsByLoc[HOME.key],   // Coppi = Hauptbestand → Ampel/KPI
        stockTotal,
        home: HOME.label,
        locations,
        variantLabel: isVariantProduct ? (varying.length === 1 ? varying[0] : 'Ausführung') : null,
        variants: variants.map(({ v, n, total, locs }) => ({ v, n, total, locs })),
        specs: [
          ['Hersteller', anchor.MARKE || brand || '—'],
          ['Art.-Nr.', art || '—'],
          ['Kategorie', cat],
        ],
        desc: '',
        note: null,
        image,
        _s: (name + ' ' + brand + ' ' + art + ' ' + cat + ' ' + eans.join(' ')).toLowerCase(),
      };
    }).filter(Boolean);
  }

  const SAMPLE = 'atlantis-filiale.csv';
  async function fetchCsv(src, timeoutMs) {
    const opts = { cache: 'no-store' };
    let timer;
    if (timeoutMs && typeof AbortController !== 'undefined') {
      const ctrl = new AbortController();
      opts.signal = ctrl.signal;
      timer = setTimeout(() => ctrl.abort(), timeoutMs);
    }
    try {
      const res = await fetch(src, opts);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error('Keine CSV erhalten – Tabelle evtl. nicht öffentlich');
      const products = mapRows(parseCSV(text));
      if (!products.length) throw new Error('Keine Artikel/Spalten erkannt');
      return products;
    } finally { clearTimeout(timer); }
  }

  async function load(url) {
    const live = url || window.DATA_SOURCE_URL;
    if (live) {
      try {
        const products = await fetchCsv(live, 4000);
        return { products, at: new Date(), live: true, src: live, fallback: false };
      } catch (e) {
        // Live-Quelle nicht erreichbar (privat / CORS / Timeout) → Beispieldaten
        const products = await fetchCsv(SAMPLE);
        return { products, at: new Date(), live: false, src: SAMPLE, fallback: true, error: String(e.message || e) };
      }
    }
    const products = await fetchCsv(SAMPLE);
    return { products, at: new Date(), live: false, src: SAMPLE, fallback: false };
  }

  window.AtlantisData = { parseCSV, mapRows, load, LOCATIONS, HOME };
})();
