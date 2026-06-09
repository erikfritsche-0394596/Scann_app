// Atlantis live data source — maps the Filiale sheet (Coppi-Hauptbestand,
// weitere Lager, Varianten ohne laufende Nummer) onto the scanner product shape.
window.DATA_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/1qu5AvF6iWvPISBCpYUtiSjdTEqXlQrO0Qtm5-jTVZLE/export?format=csv&gid=0';
window.IMAGE_BASE_URL = 'https://www.atlantiscloud.de/images/products/gross/';

(function () {
  const LOCATIONS = [
    { key: 'coppi',    label: 'Coppi',        cols: ['BESTAND(Coppi)', 'BESTAND_Coppi', 'Coppi'], home: true },
    { key: 'zentral',  label: 'Zentrallager', cols: ['Zentrallager', 'Zentral'] },
    { key: 'steglitz', label: 'Steglitz',     cols: ['Steglitz'] },
    { key: 'freiburg', label: 'Freiburg',     cols: ['Freiburg'] },
    { key: 'hamburg',  label: 'Hamburg',      cols: ['Hamburg'] },
  ];
  const HOME = LOCATIONS[0];

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

  const resolveImg = (rawImg) =>
    !rawImg ? '' : /^https?:/i.test(rawImg) ? rawImg : (window.IMAGE_BASE_URL ? window.IMAGE_BASE_URL + rawImg : '');

  function locsOf(r) {
    const o = {}; LOCATIONS.forEach((L) => { o[L.key] = Math.round(num(getCol(r, L.cols))); }); return o;
  }
  const sumLocs = (list) => { const o = {}; LOCATIONS.forEach((L) => { o[L.key] = list.reduce((a, r) => a + (r[L.key] || 0), 0); }); return o; };

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

      const attrRows = scannables.map((r) => ({ r, a: parseAttrs(nameOf(r)), loc: locsOf(r) }));
      const distinct = (k) => [...new Set(attrRows.map((x) => x.a[k]).filter(Boolean))];
      const varying = ['Farbe', 'Größe'].filter((k) => distinct(k).length > 1);
      const constants = ['Farbe', 'Größe'].filter((k) => distinct(k).length === 1);

      const isVariantProduct = scannables.length > 1 && varying.length > 0;

      let name = baseName(nameOf(anchor));
      constants.forEach((k) => { const v = distinct(k)[0]; if (v) name += ` · ${v}`; });

      // ── Varianten: mit Art.-Nr. UND variantenspezifischem Bild ──
      const variants = isVariantProduct ? attrRows.map((x) => ({
        v:     varying.map((k) => x.a[k]).filter(Boolean).join(' · ') || (x.r.ARTIKELNR || '').split('-').pop(),
        n:     x.loc[HOME.key],
        total: LOCATIONS.reduce((a, L) => a + x.loc[L.key], 0),
        locs:  x.loc,
        ean:   x.r.EAN,
        art:   x.r.ARTIKELNR || '',
        image: resolveImg(x.r.BILD_URL || ''),  // ← NEU: Bild pro Variante
      })) : [];

      const allLocRows = attrRows.map((x) => x.loc);
      const totalsByLoc = sumLocs(allLocRows);
      const locations = LOCATIONS.map((L) => ({ key: L.key, label: L.label, home: !!L.home, n: totalsByLoc[L.key] }));
      const stockTotal = locations.reduce((a, l) => a + l.n, 0);

      const uvp = num(anchor.UVP);
      const price = num(anchor.PREIS);
      const onSale = uvp > 0 && price < uvp - 0.001;

      // Status & Restposten aus den neuen Spalten
      const statusVal = (anchor.Status || scannables[0]?.Status || '').trim();
      const restpostenVal = (anchor.Restposten || scannables[0]?.Restposten || '').trim().toUpperCase();
      const isInactive = statusVal === '0';
      const isRestposten = restpostenVal === 'JA';

      const art = (master && master.ARTIKELNR) ? master.ARTIKELNR : ((scannables[0] && scannables[0].ARTIKELNR) || anchor.ARTIKELNR || '');
      const arts = [...new Set([art, ...rows.map((r) => r.ARTIKELNR)].filter(Boolean))];
      const rawImg = anchor.BILD_URL || (scannables.find((s) => s.BILD_URL) || {}).BILD_URL || '';
      const image = resolveImg(rawImg);
      const eans = rows.map((r) => r.EAN).filter(Boolean);

      return {
        id: art || anchor.EAN,
        ean: anchor.EAN,
        allEans: eans,
        allArts: arts,
        art,
        brand,
        name,
        cat,
        price: onSale ? uvp : price,
        sale: onSale ? price : null,
        stock: totalsByLoc[HOME.key],
        stockTotal,
        home: HOME.label,
        locations,
        variantLabel: isVariantProduct ? (varying.length === 1 ? varying[0] : 'Ausführung') : null,
        variants: variants.map(({ v, n, total, locs, ean, art, image }) => ({ v, n, total, locs, ean, art, image })),
        specs: [
          ['Hersteller', anchor.MARKE || brand || '—'],
          ['Art.-Nr.',   art || '—'],
          ['Kategorie',  cat],
        ],
        desc: '',
        note: isInactive && isRestposten ? 'Artikel inaktiv · Restposten'
              : isInactive ? 'Artikel inaktiv'
              : isRestposten ? 'Restposten'
              : null,
        inactive: isInactive,
        restposten: isRestposten,
        image,
        _s: (name + ' ' + brand + ' ' + arts.join(' ') + ' ' + cat + ' ' + eans.join(' ')).toLowerCase(),
      };
    }).filter(Boolean);
  }

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
    if (!live) return { products: [], at: new Date(), live: false, fallback: false, error: 'Keine Datenquelle konfiguriert. Bitte DATA_SOURCE_URL in data-source.js eintragen.' };
    try {
      const products = await fetchCsv(live, 6000);
      return { products, at: new Date(), live: true, src: live, fallback: false };
    } catch (e) {
      return { products: [], at: new Date(), live: false, src: live, fallback: false, error: 'Daten konnten nicht geladen werden: ' + String(e.message || e) };
    }
  }

  window.AtlantisData = { parseCSV, mapRows, load, LOCATIONS, HOME };
})();
