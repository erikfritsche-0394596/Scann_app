// Atlantis live data source — vereinfacht: jede Zeile = ein Produkt-Objekt
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
  // num() versteht deutsche Zahlen: "34,99" → 34.99, "1.234,56" → 1234.56
  const num = (v) => {
    const s = String(v).trim();
    // Hat die Zahl sowohl Punkt als auch Komma → Punkt ist Tausender, Komma ist Dezimal
    // Hat die Zahl nur ein Komma → Komma ist Dezimal
    // Hat die Zahl nur Punkte → letzter Punkt ist Dezimal wenn ≤2 Stellen danach, sonst Tausender
    let n;
    if (s.includes(',')) {
      // Deutsch: Punkt = Tausender, Komma = Dezimal
      n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      n = parseFloat(s);
    }
    return Number.isFinite(n) ? n : 0;
  };

  const NA = (v) => !v || /^#?\s*n\/?a\s*#?$/i.test(String(v).trim());

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

  // ── mapRows ───────────────────────────────────────────────────
  // Jede Zeile wird direkt zu einem Produkt-Objekt.
  // Master-Zeilen (MASTER_SLAVE = "M") werden als eigene Objekte angelegt,
  // aber haben keinen Preis/Bestand — sie dienen nur als Lookup-Anker für
  // den Shop-Link und die slaveArts-Liste.
  // Slave-Zeilen (MASTER_SLAVE = "S") haben alle eigenen vollständigen Daten.
  function mapRows(records) {
    // Erster Pass: alle Art.-Nrn. der Slaves je Master sammeln
    // masterArt → [slaveArt, slaveArt, ...]
    const masterSlaveMap = {};
    records.forEach((r) => {
      const masterModel = (r.MASTER_MODEL || '').trim();
      const art = (r.ARTIKELNR || '').trim();
      const isSlave = (r.MASTER_SLAVE || '').toUpperCase() === 'S' || ((r.MASTER_SLAVE || '') === '' && masterModel !== '');
      if (isSlave && masterModel) {
        (masterSlaveMap[masterModel.toLowerCase()] ||= []).push(art);
      }
    });

    // Zweiter Pass: jede Zeile → Produkt-Objekt
    return records.map((r) => {
      const isMaster = (r.MASTER_SLAVE || '').toUpperCase() === 'M';
      const art      = (r.ARTIKELNR || '').trim();
      const ean      = (r.EAN || '').trim();
      const name     = (r.NAME || '').trim();
      const masterModel = (r.MASTER_MODEL || '').trim();

      const locs      = locsOf(r);
      const stockHome = locs[HOME.key];
      const stockTotal = LOCATIONS.reduce((a, L) => a + locs[L.key], 0);
      const locations = LOCATIONS.map((L) => ({ key: L.key, label: L.label, home: !!L.home, n: locs[L.key] }));

      // Preis: PREIS = Verkaufspreis, UVP = Listenpreis (Streichpreis wenn höher)
      const price  = num(r.PREIS);
      const uvp    = num(r.UVP);
      const onSale = uvp > 0 && price > 0 && price < uvp - 0.001;

      const brand = cleanBrand(r.MARKE);
      const cat   = cleanCat(r.KATEGORIE);
      const image = resolveImg(r.BILD_URL || '');
      const shopUrl = (r.ATLOS_URL || '').trim() || null;

      const statusVal     = (r.STATUS || '').trim();
      const restpostenVal = (r.RESTPOSTEN || '').trim().toUpperCase();
      const isInactive    = statusVal === '0';
      const isRestposten  = restpostenVal === 'JA';

      // slaveArts: nur für Master-Artikel befüllt
      const slaveArts = isMaster ? (masterSlaveMap[art.toLowerCase()] || []) : [];

      return {
        id:         art || ean,
        ean,
        allEans:    ean ? [ean] : [],
        art,
        allArts:    art ? [art] : [],
        name,
        brand,
        cat,
        price,
        sale:       onSale ? uvp : null,
        stock:      stockHome,
        stockTotal,
        locations,
        locs,
        image,
        shopUrl,
        isMaster,
        masterArt:  masterModel || null,   // Art.-Nr. des zugehörigen Masters (nur bei Slaves)
        slaveArts,                          // Art.-Nrn. aller Slaves (nur bei Mastern)
        inactive:   isInactive,
        restposten: isRestposten,
        variants:   [],  // nicht mehr genutzt — Geschwister werden live über slaveArts geladen
        _s: (name + ' ' + brand + ' ' + art + ' ' + cat + ' ' + ean).toLowerCase(),
      };
    }).filter((p) => p.id);  // Zeilen ohne Art.-Nr. und EAN verwerfen
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
    if (!live) return { products: [], at: new Date(), live: false, fallback: false, error: 'Keine Datenquelle konfiguriert.' };
    try {
      const products = await fetchCsv(live, 8000);
      return { products, at: new Date(), live: true, src: live, fallback: false };
    } catch (e) {
      return { products: [], at: new Date(), live: false, src: live, fallback: false, error: 'Daten konnten nicht geladen werden: ' + String(e.message || e) };
    }
  }

  window.AtlantisData = { parseCSV, mapRows, load, LOCATIONS, HOME };
})();
