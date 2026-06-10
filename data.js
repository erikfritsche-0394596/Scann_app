// Atlantis live data source
// Spalten: ARTIKELNR EAN NAME PREIS Coppi Zentrallager Steglitz Freiburg Hamburg
//          MASTER_SLAVE UVP MARKE KATEGORIE BILD_URL STATUS RESTPOSTEN ATLOS_URL MASTER_MODEL
window.DATA_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/1qu5AvF6iWvPISBCpYUtiSjdTEqXlQrO0Qtm5-jTVZLE/export?format=csv&gid=0';
window.IMAGE_BASE_URL  = 'https://www.atlantiscloud.de/images/products/gross/';

(function () {
  const LOCATIONS = [
    { key: 'coppi',    label: 'Coppi',        col: 'Coppi',        home: true },
    { key: 'zentral',  label: 'Zentrallager', col: 'Zentrallager'             },
    { key: 'steglitz', label: 'Steglitz',     col: 'Steglitz'                 },
    { key: 'freiburg', label: 'Freiburg',     col: 'Freiburg'                 },
    { key: 'hamburg',  label: 'Hamburg',      col: 'Hamburg'                  },
  ];
  const HOME = LOCATIONS[0];

  // ── CSV-Parser ────────────────────────────────────────────────
  function parseCSV(text) {
    const rows = []; let row = [], field = '', i = 0, q = false;
    text = text.replace(/^\uFEFF/, '');
    while (i < text.length) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
      i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const headers = rows.shift().map((h) => h.trim());
    return rows
      .filter((r) => r.length > 1 && r.some((v) => v !== ''))
      .map((r) => Object.fromEntries(headers.map((h, j) => [h, (r[j] ?? '').trim()])));
  }

  // ── Hilfsfunktionen ───────────────────────────────────────────
  const num = (v) => { const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const NA  = (v) => !v || /^#?\s*n\/?a\s*#?$/i.test(v.trim());

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

  const resolveImg = (raw) =>
    !raw ? '' : /^https?:/i.test(raw) ? raw : (window.IMAGE_BASE_URL ? window.IMAGE_BASE_URL + raw : '');

  function locsOf(r) {
    const o = {};
    LOCATIONS.forEach((L) => { o[L.key] = Math.round(num(r[L.col] || 0)); });
    return o;
  }
  const sumLocs = (list) => {
    const o = {};
    LOCATIONS.forEach((L) => { o[L.key] = list.reduce((a, r) => a + (r[L.key] || 0), 0); });
    return o;
  };

  // Variantenname aus Produktname extrahieren (Farbe/Größe-Notation)
  const ATTR_START = /(Farbe|Gr(?:ö|oe|o)(?:ß|ss|s)e)\s*:/i;
  function baseName(name) {
    const m = name.match(ATTR_START);
    const b = m ? name.slice(0, m.index) : name;
    return b.replace(/[\s\-–•]+$/, '').trim();
  }
  function parseAttrs(name) {
    const size  = (name.match(/Gr(?:ö|oe|o)(?:ß|ss|s)e\s*:\s*([^-–|]+)/i) || [])[1];
    const color = (name.match(/Farbe\s*:\s*([^-–|]+)/i) || [])[1];
    return { Größe: size && size.trim(), Farbe: color && color.trim() };
  }

  // ── mapRows ───────────────────────────────────────────────────
  function mapRows(records) {
    const groups = {};

    // Slaves kennen ihren Master über Spalte MASTER_MODEL (= Art.-Nr. des Masters).
    // Master-Zeilen haben MASTER_SLAVE = "M", Slaves haben MASTER_SLAVE = "S" (oder leer).
    // Wir gruppieren: alle Zeilen mit demselben MASTER_MODEL in eine Gruppe,
    // Master-Zeilen unter ihrer eigenen ARTIKELNR.
    records.forEach((r) => {
      const isMaster = (r.MASTER_SLAVE || '').toUpperCase() === 'M';
      const masterModel = (r.MASTER_MODEL || '').trim();
      let key;

      if (isMaster) {
        // Master → Gruppe unter eigener Art.-Nr.
        key = (r.ARTIKELNR || '').trim().toLowerCase();
      } else if (masterModel) {
        // Slave mit MASTER_MODEL → in die Gruppe des Masters
        key = masterModel.toLowerCase();
      } else {
        // Einzelartikel ohne Master → nach Name+Marke gruppieren (Fallback)
        const brand = cleanBrand(r.MARKE);
        key = (baseName(r.NAME || r.PRODUCTS_NAME || '') + '|' + brand).toLowerCase();
      }
      (groups[key] ||= []).push(r);
    });

    return Object.values(groups).map((rows) => {
      const nameOf  = (r) => r.NAME || r.PRODUCTS_NAME || '';
      const master  = rows.find((r) => (r.MASTER_SLAVE || '').toUpperCase() === 'M');
      let scannables = rows.filter((r) => (r.MASTER_SLAVE || '').toUpperCase() !== 'M');
      if (!scannables.length) scannables = master ? [master] : rows;
      const anchor  = master || scannables[0];
      const brand   = cleanBrand(anchor.MARKE);
      const cat     = cleanCat(anchor.KATEGORIE);

      // Varianten-Erkennung
      const attrRows = scannables.map((r) => ({ r, a: parseAttrs(nameOf(r)), loc: locsOf(r) }));
      const distinct = (k) => [...new Set(attrRows.map((x) => x.a[k]).filter(Boolean))];
      const varying  = ['Farbe', 'Größe'].filter((k) => distinct(k).length > 1);
      const constants = ['Farbe', 'Größe'].filter((k) => distinct(k).length === 1);
      const isVariantProduct = scannables.length > 1;
      const effectiveVarying = varying.length > 0 ? varying : null;

      let name = baseName(nameOf(anchor));
      if (effectiveVarying) constants.forEach((k) => { const v = distinct(k)[0]; if (v) name += ` · ${v}`; });

      // Varianten bauen
      const variants = isVariantProduct ? attrRows.map((x) => {
        const vUvp = num(x.r.UVP); const vPriceRaw = num(x.r.PREIS);
        const vPrice = vPriceRaw > 0 ? vPriceRaw : vUvp;
        const vOnSale = vUvp > 0 && vPriceRaw > 0 && vPriceRaw < vUvp - 0.001;
        const vLabel = effectiveVarying
          ? effectiveVarying.map((k) => x.a[k]).filter(Boolean).join(' · ')
          : (baseName(nameOf(x.r)) !== baseName(nameOf(anchor))
              ? baseName(nameOf(x.r)).replace(baseName(nameOf(anchor)), '').replace(/^[\s\-–·]+/, '').trim()
              : '') || (x.r.ARTIKELNR || '').split('-').pop();
        return {
          v:     vLabel,
          n:     x.loc[HOME.key],
          total: LOCATIONS.reduce((a, L) => a + x.loc[L.key], 0),
          locs:  x.loc,
          ean:   x.r.EAN,
          art:   x.r.ARTIKELNR || '',
          image: resolveImg(x.r.BILD_URL || ''),
          price: vOnSale ? vUvp : vPrice,
          sale:  vOnSale ? vPriceRaw : null,
          // Shop-URL direkt aus Spalte Q (ATLOS_URL)
          shopUrl: (x.r.ATLOS_URL || '').trim() || null,
        };
      }) : [];

      // Gesamtbestand
      const allLocRows   = attrRows.map((x) => x.loc);
      const totalsByLoc  = sumLocs(allLocRows);
      const locations    = LOCATIONS.map((L) => ({ key: L.key, label: L.label, home: !!L.home, n: totalsByLoc[L.key] }));
      const stockTotal   = locations.reduce((a, l) => a + l.n, 0);

      // Preis des Anker-Artikels — wenn kein PREIS vorhanden, UVP als Fallback
      const uvp        = num(anchor.UVP);
      const priceRaw   = num(anchor.PREIS);
      const price      = priceRaw > 0 ? priceRaw : uvp;
      const onSale     = uvp > 0 && priceRaw > 0 && priceRaw < uvp - 0.001;

      // Status
      const statusVal    = (anchor.STATUS || anchor.Status || scannables[0]?.STATUS || scannables[0]?.Status || '').trim();
      const restpostenVal = (anchor.RESTPOSTEN || anchor.Restposten || scannables[0]?.RESTPOSTEN || scannables[0]?.Restposten || '').trim().toUpperCase();
      const isInactive   = statusVal === '0';
      const isRestposten = restpostenVal === 'JA';

      // Art.-Nr. + EAN
      const art  = (master?.ARTIKELNR) || scannables[0]?.ARTIKELNR || anchor.ARTIKELNR || '';
      const arts = [...new Set([art, ...rows.map((r) => r.ARTIKELNR)].filter(Boolean))];
      const eans = rows.map((r) => r.EAN).filter(Boolean);

      // Bild
      const rawImg = anchor.BILD_URL || (scannables.find((s) => s.BILD_URL) || {}).BILD_URL || '';
      const image  = resolveImg(rawImg);

      // Shop-URL: direkt aus Spalte Q (ATLOS_URL)
      // Für Master: eigene ATLOS_URL, für Slave/Einzelartikel: ATLOS_URL des Anchors
      const shopUrl = (anchor.ATLOS_URL || '').trim() || null;

      // Kein isMaster-Filter mehr — alle Artikel werden angezeigt.
      const isMasterProduct = false;
      const slaveArts = scannables.map((r) => r.ARTIKELNR).filter(Boolean).filter((a) => a !== art);

      return {
        id:           art || anchor.EAN,
        ean:          anchor.EAN,
        allEans:      eans,
        allArts:      arts,
        art,
        brand,
        name,
        cat,
        price:        onSale ? uvp : price,
        sale:         onSale ? price : null,
        stock:        totalsByLoc[HOME.key],
        stockTotal,
        home:         HOME.label,
        locations,
        variantLabel: isVariantProduct ? (varying.length === 1 ? varying[0] : 'Ausführung') : null,
        variants:     variants,
        desc:         '',
        note:         isInactive && isRestposten ? 'Artikel inaktiv · Restposten'
                      : isInactive   ? 'Artikel inaktiv'
                      : isRestposten ? 'Restposten'
                      : null,
        inactive:     isInactive,
        restposten:   isRestposten,
        image,
        shopUrl,      // ← direkt aus Spalte Q
        isMaster:     isMasterProduct,
        slaveArts,
        _s: (name + ' ' + brand + ' ' + arts.join(' ') + ' ' + cat + ' ' + eans.join(' ')).toLowerCase(),
      };
    }).filter(Boolean);
  }

  // ── Fetch ─────────────────────────────────────────────────────
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
    if (!live) return { products: [], at: new Date(), live: false, fallback: false, error: 'Keine Datenquelle konfiguriert. Bitte DATA_SOURCE_URL in data.js eintragen.' };
    try {
      const products = await fetchCsv(live, 8000);
      return { products, at: new Date(), live: true, src: live, fallback: false };
    } catch (e) {
      return { products: [], at: new Date(), live: false, src: live, fallback: false, error: 'Daten konnten nicht geladen werden: ' + String(e.message || e) };
    }
  }

  window.AtlantisData = { parseCSV, mapRows, load, LOCATIONS, HOME };
})();
