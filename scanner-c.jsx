// Atlantis Sommerfest Scanner — final app (Direction C "Regal"), theme-aware.
// Tab bar (Scannen / Suche / Verlauf) + data-dense detail with KPI tiles,
// stock meter, per-variant dropdown and spec table. Driven by Tweaks.
// NEW: Standortauswahl + Farbthema, Master-Artikelnummer, Onlineshop-Link
/* global React, ATLANTIS, AUI */

const ACCENTS = {
  navy:    { light: '#1a3c6e', dark: '#6ea4ea', label: 'Atlantis Navy' },
  tiefsee: { light: '#0e7c8b', dark: '#34c8da', label: 'Tiefsee' },
  koralle: { light: '#b4533a', dark: '#f08c6f', label: 'Koralle' },
};

// ── Standorte mit je eigenem Farbthema ──────────────────────────────────────
// Standorte — key muss exakt dem Spaltenname in Google Sheets entsprechen
// Spalte E=Coppi, F=Zentrallager, G=Steglitz, H=Freiburg, I=Hamburg
const STANDORTE = [
  { key: 'Coppi',         label: 'Coppi',          shortLabel: 'Coppi',        accent: '#1a3c6e', accentDark: '#6ea4ea', emoji: '🔵' },
  { key: 'Zentrallager',  label: 'Zentrallager',   shortLabel: 'Zentrallager', accent: '#374151', accentDark: '#9ca3af', emoji: '⚫' },
  { key: 'Steglitz',      label: 'Steglitz',        shortLabel: 'Steglitz',     accent: '#166534', accentDark: '#4ade80', emoji: '🟢' },
  { key: 'Freiburg',      label: 'Freiburg',        shortLabel: 'Freiburg',     accent: '#7c2d12', accentDark: '#fb923c', emoji: '🟠' },
  { key: 'Hamburg',       label: 'Hamburg',         shortLabel: 'Hamburg',      accent: '#581c87', accentDark: '#c084fc', emoji: '🟣' },
];

// Alle Standort-Keys in der gewünschten Anzeigereihenfolge
const ALL_LOC_KEYS = STANDORTE.map((s) => s.key);

// Google Sheets CSV-URL (öffentlich lesbar)
const SHOP_SHEET_URL = 'https://docs.google.com/spreadsheets/d/15QoBa8-rMu4v2xBUy-b2bVoHfqO1eXupGK8sVJb6zKE/export?format=csv&gid=0';

function tokens({ accent: accentLight, dark = false, density = 'komfortabel', big = false }) {
  const acc = Object.values(ACCENTS).find((a) => a.light === accentLight) || ACCENTS.navy;
  const accent = dark ? acc.dark : acc.light;
  const D = density === 'kompakt';
  const fs = big ? 1.12 : 1;
  return {
    accent,
    accentSoft: dark ? `${acc.dark}26` : `${acc.light}14`,
    red: dark ? '#ff6274' : '#c8102e',
    bg: dark ? '#0b1726' : '#eef2f7',
    card: dark ? '#13243a' : '#ffffff',
    headerBg: dark ? 'rgba(11,23,38,0.86)' : 'rgba(255,255,255,0.92)',
    ink: dark ? '#f3f7fb' : '#1b2733',
    mute: dark ? 'rgba(231,239,247,0.58)' : '#64748b',
    border: dark ? 'rgba(255,255,255,0.09)' : 'rgba(26,60,110,0.09)',
    field: dark ? 'rgba(255,255,255,0.06)' : '#fff',
    tileShadow: dark ? 'none' : '0 1px 2px rgba(26,60,110,0.06)',
    stock: { ok: dark ? '#37d27e' : '#1f8a4c', low: dark ? '#ffc44d' : '#bb7d00', out: dark ? '#ff6274' : '#c8102e' },
    chipOut: dark ? 'rgba(255,255,255,0.04)' : '#f4f6f9',
    chipLow: dark ? 'rgba(255,196,77,0.12)' : '#fff7ec',
    chipOk:  dark ? 'rgba(110,164,234,0.12)' : '#f0f6ff',
    pad: D ? 11 : 16,
    gap: D ? 8 : 12,
    radius: D ? 12 : 14,
    fs,
    dark,
  };
}

function ScannerC({ tw, products, fit = 'device', meta }) {
  const { useState, useRef, useEffect, useMemo, useCallback } = React;
  const { EUR, stockState } = ATLANTIS;
  const PRODUCTS = products || ATLANTIS.PRODUCTS;
  const { ProductPhoto, Icon } = AUI;
  const T = tokens(tw);
  const screen = fit === 'screen';
  const padTopHdr = screen ? 'calc(env(safe-area-inset-top, 12px) + 16px)' : 56;
  const padTopDet = screen ? 'calc(env(safe-area-inset-top, 12px) + 14px)' : 54;
  const padBotTabs = screen ? 'calc(env(safe-area-inset-bottom, 10px) + 12px)' : 22;
  const padBotBtn = screen ? 'calc(env(safe-area-inset-bottom, 10px) + 14px)' : 30;

  const [tab, setTab] = useState('scan');
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState('');

  // ── NEU: Standort-State ──────────────────────────────────────────────────
  const [standort, setStandort] = useState(STANDORTE[0]);
  const [showStandortPicker, setShowStandortPicker] = useState(false);

  // Dynamisches Accent basierend auf Standort
  const standortAccent = T.dark ? standort.accentDark : standort.accent;

  // ── Standort-abhängiger Bestand ──────────────────────────────────────────
  // locs = { Coppi: 1, Zentrallager: 0, Steglitz: 2, Freiburg: 1, Hamburg: 2 }
  const getStock = (locs) => locs ? (locs[standort.key] ?? 0) : 0;
  const getTotalStock = (locs) => locs
    ? ALL_LOC_KEYS.reduce((s, k) => s + (locs[k] ?? 0), 0)
    : 0;
  const getProductStock = (p) => {
    if (p.locs) return getStock(p.locs);
    if (p.variants && p.variants.length > 0)
      return p.variants.reduce((s, vr) => s + (vr.locs ? (vr.locs[standort.key] ?? 0) : 0), 0);
    return p.stock ?? 0;
  };
  const getProductTotalStock = (p) => {
    if (p.locs) return getTotalStock(p.locs);
    if (p.variants && p.variants.length > 0)
      return p.variants.reduce((s, vr) => s + (vr.locs ? ALL_LOC_KEYS.reduce((a, k) => a + (vr.locs[k] ?? 0), 0) : 0), 0);
    return p.stockTotal ?? p.stock ?? 0;
  };

  // ── NEU: Shop-Daten aus Google Sheets ───────────────────────────────────
  const [shopIndex, setShopIndex] = useState({}); // { model_lowercase: { id, catNr } }
  const [shopLoading, setShopLoading] = useState(false);
  const [shopLoaded, setShopLoaded] = useState(false);

  useEffect(() => {
    if (shopLoaded || shopLoading) return;
    setShopLoading(true);
    fetch(SHOP_SHEET_URL)
      .then((r) => r.text())
      .then((csv) => {
        const lines = csv.trim().split('\n');
        const idx = {};
        // Erste Zeile = Header: PRODUCTS_MODEL, PRODUCTS_ID, CATEGORIES_WWS_NR
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 3) {
            const model = cols[0].trim().toLowerCase().replace(/^"+|"+$/g, '');
            const id    = cols[1].trim().replace(/^"+|"+$/g, '');
            const catNr = cols[2].trim().replace(/^"+|"+$/g, '');
            if (model && id && catNr) {
              idx[model] = { id, catNr };
            }
          }
        }
        setShopIndex(idx);
        setShopLoaded(true);
      })
      .catch(() => {
        setShopLoaded(true); // auch bei Fehler: laden abgeschlossen
      })
      .finally(() => setShopLoading(false));
  }, []);

  // Shop-URL für ein Produkt ermitteln (art = Art.-Nr. der Variante oder des Produkts)
  const getShopUrl = (art) => {
    if (!art || !shopLoaded) return null;
    // Probiere verschiedene Varianten: z.B. "pol-78015xs" oder "pol-78015XS"
    const key = String(art).trim().toLowerCase();
    const entry = shopIndex[key];
    if (!entry) return null;
    return `https://www.atlantis-onlineshop.de/${entry.catNr}/p-${entry.id}.html`;
  };

  // Master-Art.-Nr. aus Varianten-Art.-Nr. ableiten: "pol-78015xs" → "pol-78015master"
  // Strategie: gemeinsamen Präfix aller Varianten finden, dann "master" anhängen.
  // Fallback: Art.-Nr. des Produkts nehmen und Suffix ersetzen.
  const getMasterArt = (product) => {
    if (!product) return null;
    // Wenn Produkt selbst eine masterArt hat → nehmen
    if (product.masterArt) return product.masterArt;
    // Aus Varianten-Art.-Nrn. den Basisteil ermitteln
    const arts = (product.variants || []).map((v) => v.art).filter(Boolean);
    if (arts.length === 0 && product.art) {
      // Kein Varianten-Art.-Nr.: Suffix entfernen (letztes 2-3 Zeichen nach gängigem Muster)
      return product.art.replace(/[a-z0-9]{1,5}$/i, 'master');
    }
    if (arts.length === 1) return arts[0].replace(/[a-z0-9]{1,5}$/i, 'master');
    // Gemeinsamen Präfix finden
    let prefix = arts[0];
    for (let i = 1; i < arts.length; i++) {
      let j = 0;
      while (j < prefix.length && j < arts[i].length && prefix[j] === arts[i][j]) j++;
      prefix = prefix.slice(0, j);
    }
    // Prefix bereinigen: endet evtl. auf Trennzeichen
    prefix = prefix.replace(/[-_]+$/, '');
    return prefix ? prefix + 'master' : null;
  };

  // open() nimmt optional die gescannte EAN mit
  const open = (p, scannedEan = null) => {
    setDetail({ ...p, _scannedEan: scannedEan });
    setHistory((h) => [{ p, at: Date.now() }, ...h.filter((x) => x.p.ean !== p.ean)].slice(0, 20));
  };

  // ── real barcode scanning (html5-qrcode) + EAN/Art.-Nr. lookup ──
  const CAM = typeof Html5Qrcode !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;

  const codeIndex = useMemo(() => {
    const ei = {}, ai = {};
    (PRODUCTS || []).forEach((p) => {
      (p.allEans && p.allEans.length ? p.allEans : [p.ean]).forEach((e) => {
        if (e) ei[String(e).trim()] = { product: p, variant: null };
      });
      (p.allArts || [p.art]).forEach((a) => {
        if (a) ai[String(a).trim().toLowerCase()] = { product: p, variant: null };
      });
      (p.variants || []).forEach((vr) => {
        if (vr.ean) ei[String(vr.ean).trim()] = { product: p, variant: vr };
        if (vr.art) ai[String(vr.art).trim().toLowerCase()] = { product: p, variant: vr };
      });
    });
    return { ei, ai };
  }, [PRODUCTS]);

  const lookup = (code) => {
    const c = String(code).trim();
    const byEan = codeIndex.ei[c];
    if (byEan) return { ...byEan, isEan: true, code: c };
    const byArt = codeIndex.ai[c.toLowerCase()];
    if (byArt) return { ...byArt, isEan: false, code: c };
    return null;
  };

  const camRef = useRef(null);
  const [cam, setCam] = useState('idle');
  const [camMsg, setCamMsg] = useState('');
  const [notFound, setNotFound] = useState(null);
  const [manual, setManual] = useState('');
  const nfTimer = useRef(0);

  const stopCamera = useCallback(() => {
    const inst = camRef.current;
    camRef.current = null;
    if (inst) { try { inst.stop().then(() => inst.clear()).catch(() => {}); } catch (e) {} }
    setCam((c) => (c === 'live' ? 'idle' : c));
  }, []);

  const handleCode = (code) => {
    const result = lookup(code);
    if (result) {
      setNotFound(null);
      stopCamera();
      const scannedEan = result.isEan
        ? result.code
        : (result.variant && result.variant.ean ? String(result.variant.ean).trim() : null);
      open(result.product, scannedEan);
    } else {
      setNotFound(String(code).trim());
      clearTimeout(nfTimer.current);
      nfTimer.current = setTimeout(() => setNotFound(null), 3500);
    }
  };

  const startCamera = () => {
    if (!CAM || camRef.current) return;
    setNotFound(null); setCamMsg(''); setCam('live');
    const F2 = (typeof Html5QrcodeSupportedFormats !== 'undefined')
      ? [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.CODE_93, Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.CODABAR, Html5QrcodeSupportedFormats.DATA_MATRIX, Html5QrcodeSupportedFormats.QR_CODE]
      : undefined;
    let inst;
    try { inst = new Html5Qrcode('scanner-cam', { formatsToSupport: F2, verbose: false }); }
    catch (e) { setCam('error'); setCamMsg('Scanner konnte nicht gestartet werden.'); return; }
    camRef.current = inst;
    inst.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 250, height: 120 },
        aspectRatio: 1.7778,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          focusMode: 'continuous',
        },
      },
      (text) => handleCode(text),
      () => {}
    ).catch((e) => {
      camRef.current = null; setCam('error');
      setCamMsg(/permission|denied|notallowed|notfounderror/i.test(String(e))
        ? 'Kein Kamerazugriff. Erlaube die Kamera in den Browser-Einstellungen (HTTPS erforderlich).'
        : 'Keine Kamera gefunden.');
    });
  };

  useEffect(() => { if (tab !== 'scan' || detail) stopCamera(); }, [tab, detail, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const F = (px) => Math.round(px * T.fs);

  // ── NEU: Standort-Picker Modal ───────────────────────────────────────────
  const StandortPicker = () => (
    <div
      onClick={() => setShowStandortPicker(false)}
      style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '20px 16px', paddingBottom: screen ? 'calc(env(safe-area-inset-bottom,16px) + 16px)' : 28, boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: T.border, margin: '0 auto 18px' }} />
        <div style={{ fontSize: F(17), fontWeight: 800, color: T.ink, marginBottom: 16 }}>Standort auswählen</div>
        {STANDORTE.map((s) => {
          const isActive = s.key === standort.key;
          const color = T.dark ? s.accentDark : s.accent;
          return (
            <button
              key={s.key}
              onClick={() => { setStandort(s); setShowStandortPicker(false); }}
              style={{
                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', background: isActive ? `${color}14` : 'transparent',
                borderRadius: 12, padding: '12px 14px', marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 12,
                outline: isActive ? `2px solid ${color}` : 'none',
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 3px ${color}28` }} />
              <span style={{ fontSize: F(15), fontWeight: isActive ? 700 : 500, color: isActive ? color : T.ink }}>
                {s.label}
              </span>
              {isActive && (
                <span style={{ marginLeft: 'auto', fontSize: F(12), fontWeight: 700, color, background: `${color}18`, padding: '2px 9px', borderRadius: 20 }}>
                  aktiv
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── shared atoms ─────────────────────────────────────────────
  // Standort-Badge als Button oben rechts im Header
  const StandortBadge = () => (
    <button
      onClick={() => setShowStandortPicker(true)}
      style={{
        flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: `${standortAccent}18`,
        borderRadius: 20, padding: '5px 12px 5px 10px',
        display: 'flex', alignItems: 'center', gap: 7,
        outline: `1.5px solid ${standortAccent}44`,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: standortAccent, flexShrink: 0 }} />
      <span style={{ fontSize: F(12), fontWeight: 700, color: standortAccent, whiteSpace: 'nowrap' }}>
        {standort.shortLabel}
      </span>
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
        <path d="M6 9l6 6 6-6" stroke={standortAccent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );

  const Header = ({ title, sub, right }) => (
    <div style={{ background: T.headerBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', paddingTop: padTopHdr, paddingLeft: T.pad + 4, paddingRight: T.pad + 4, paddingBottom: 13, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: F(26), fontWeight: 800, color: T.ink, letterSpacing: -0.3, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: F(13), color: T.mute, marginTop: 3 }}>{sub}</div>}
      </div>
      {/* Standort-Badge immer sichtbar, rechts vom optionalen right-Slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
        {right}
        <StandortBadge />
      </div>
    </div>
  );

  const StockDot = ({ st, size = 8 }) => <span style={{ width: size, height: size, borderRadius: size, background: T.stock[st], flexShrink: 0, display: 'inline-block' }} />;

  const ListRow = ({ p, time }) => {
    const pStockCur = getProductStock(p);
    const st = stockState(pStockCur);
    const sale = p.sale != null;
    return (
      <button onClick={() => open(p)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: T.pad - 2, display: 'flex', gap: 12, alignItems: 'center', boxShadow: T.tileShadow, fontFamily: 'inherit' }}>
        <ProductPhoto product={p} dark={T.dark} radius={10} style={{ width: F(52), height: F(52), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.brand}{time ? ` · ${time}` : ''}</div>
          <div style={{ fontSize: F(14), fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: F(14), fontWeight: 800, color: sale ? T.red : standortAccent }}>{EUR(sale ? p.sale : p.price)}</span>
            <StockDot st={st} size={7} />
            <span style={{ fontSize: F(12), color: T.mute }}>{pStockCur} Stk</span>
          </div>
        </div>
        {Icon.chevron(T.mute, 20)}
      </button>
    );
  };

  // ── VariantAccordion ─────────────────────────────────────────
  function VariantAccordion({ detail, T, F, stockState }) {
    if (!detail.variants || detail.variants.length === 0) return null;

    const scannedEan = detail._scannedEan || null;
    const LOCS = detail.locations || [];

    const scannedVariant = scannedEan
      ? detail.variants.find((vr) => vr.ean && String(vr.ean).trim() === scannedEan)
      : null;

    const buildGroups = () => {
      const groups = {};
      detail.variants.forEach((vr) => {
        const parts = vr.v ? vr.v.split(' · ') : [vr.v];
        const groupKey = parts.length > 1 ? parts[0] : 'Alle';
        const sizeKey  = parts.length > 1 ? parts.slice(1).join(' · ') : parts[0];
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push({ ...vr, _groupKey: groupKey, _sizeKey: sizeKey });
      });
      return groups;
    };

    const groups = buildGroups();
    const groupKeys = Object.keys(groups);
    const multiGroup = groupKeys.length > 1;

    const scannedGroup = scannedVariant
      ? (scannedVariant.v ? scannedVariant.v.split(' · ')[0] : groupKeys[0])
      : null;

    const [openGroups, setOpenGroups] = React.useState(() => {
      const init = {};
      if (scannedGroup) init[scannedGroup] = true;
      else if (groupKeys.length === 1) init[groupKeys[0]] = true;
      return init;
    });
    const [openSizes, setOpenSizes] = React.useState(() => {
      if (scannedEan) return { [scannedEan]: true };
      return {};
    });

    const toggleGroup = (key) => setOpenGroups((o) => ({ ...o, [key]: !o[key] }));
    const toggleSize = (ean) => setOpenSizes((o) => ({ ...o, [ean]: !o[ean] }));

    const stockColor = (n) => n <= 0 ? T.stock.out : n <= 2 ? T.stock.low : T.stock.ok;

    const LocBars = ({ vr }) => {
      if (!vr.locs || Object.keys(vr.locs).length === 0) return null;
      const locMax = Math.max(1, ...ALL_LOC_KEYS.map((k) => vr.locs[k] ?? 0));
      return (
        <div style={{ background: T.dark ? 'rgba(255,255,255,0.03)' : '#f7f9fc', borderTop: `1px solid ${T.border}`, padding: `${F(7)}px ${F(14)}px ${F(7)}px ${F(28)}px` }}>
          {ALL_LOC_KEYS.map((locKey) => {
            const sd = STANDORTE.find((s) => s.key === locKey) || { key: locKey, label: locKey };
            const loc = { key: locKey, label: sd.label, home: locKey === standort.key };
            const n = vr.locs[locKey] ?? 0;
            const pct = Math.round((n / locMax) * 100);
            return (
              <div key={loc.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: F(74), flexShrink: 0, fontSize: F(11), fontWeight: loc.home ? 700 : 400, color: loc.home ? standortAccent : T.mute }}>
                  {loc.label}
                  {loc.home && <span style={{ marginLeft: 4, fontSize: F(8), fontWeight: 700, color: standortAccent, background: `${standortAccent}18`, padding: '1px 4px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>hier</span>}
                </span>
                <div style={{ flex: 1, height: 5, borderRadius: 5, background: T.dark ? 'rgba(255,255,255,0.08)' : '#dde4ee', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: n === 0 ? 'transparent' : loc.home ? standortAccent : (T.dark ? 'rgba(231,239,247,0.35)' : '#9fb0c6') }} />
                </div>
                <span style={{ width: F(22), textAlign: 'right', fontSize: F(12), fontWeight: 700, color: n ? T.ink : T.mute }}>{n}</span>
              </div>
            );
          })}
        </div>
      );
    };

    const SizeRow = ({ vr }) => {
      const isScannedRow = scannedEan && vr.ean && String(vr.ean).trim() === scannedEan;
      const isOpen = openSizes[vr.ean];
      const cop = vr.locs ? (vr.locs[standort.key] ?? 0) : vr.n;
      const tot = vr.locs ? ALL_LOC_KEYS.reduce((s,k) => s+(vr.locs[k]??0),0) : (vr.total || cop);
      const hasLocs = vr.locs && Object.keys(vr.locs).length > 0;
      return (
        <div>
          <button onClick={() => hasLocs && toggleSize(vr.ean)} style={{ width: '100%', textAlign: 'left', border: 'none', cursor: hasLocs ? 'pointer' : 'default', fontFamily: 'inherit', padding: `${F(9)}px ${F(14)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: isScannedRow ? (T.dark ? `${standortAccent}1a` : `${standortAccent}0d`) : 'transparent', borderLeft: isScannedRow ? `3px solid ${standortAccent}` : '3px solid transparent', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              {isScannedRow && <span style={{ fontSize: F(9), fontWeight: 700, color: standortAccent, background: `${standortAccent}18`, border: `1px solid ${standortAccent}44`, padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>gescannt</span>}
              <span style={{ fontSize: F(13), fontWeight: isScannedRow ? 700 : 500, color: T.ink }}>{vr._sizeKey}</span>
              {vr.art && <span style={{ fontSize: F(10), color: T.mute, fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vr.art}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: F(14), fontWeight: 700, color: stockColor(cop), lineHeight: 1 }}>{cop} <span style={{ fontSize: F(10), fontWeight: 500, color: T.mute }}>{standort.shortLabel}</span></div>
                {tot !== cop && <div style={{ fontSize: F(10), color: T.mute, marginTop: 1 }}>{tot} gesamt</div>}
              </div>
              {hasLocs && <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease', opacity: 0.5 }}><path d="M6 9l6 6 6-6" stroke={T.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
          </button>
          {isOpen && hasLocs && <LocBars vr={vr} />}
        </div>
      );
    };

    const GroupHeader = ({ groupKey, items }) => {
      const isScannedGrp = groupKey === scannedGroup;
      const isOpen = openGroups[groupKey];
      const coppiSum = items.reduce((a, vr) => a + (vr.locs ? (vr.locs[standort.key] ?? 0) : vr.n), 0);
      const totSum = items.reduce((a, vr) => a + (vr.locs ? ALL_LOC_KEYS.reduce((s,k) => s+(vr.locs[k]??0),0) : (vr.total || vr.n)), 0);
      return (
        <button onClick={() => toggleGroup(groupKey)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: 'none', padding: `${F(10)}px ${F(14)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: isScannedGrp ? (T.dark ? `${standortAccent}1a` : `${standortAccent}0f`) : (T.dark ? 'rgba(255,255,255,0.03)' : '#f7f9fc'), borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isScannedGrp && <svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3M3 12h18" stroke={standortAccent} strokeWidth="2" strokeLinecap="round" /></svg>}
            <span style={{ fontSize: F(13), fontWeight: 700, color: isScannedGrp ? standortAccent : T.ink }}>{groupKey}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: F(11), color: T.mute }}><span style={{ color: stockColor(coppiSum), fontWeight: 700 }}>{coppiSum}</span> vor Ort · {totSum} ges.</span>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease', opacity: 0.5 }}><path d="M6 9l6 6 6-6" stroke={T.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </button>
      );
    };

    return (
      <div style={{ background: T.card, borderRadius: T.radius, marginTop: T.gap, border: `1px solid ${T.border}`, boxShadow: T.tileShadow, overflow: 'hidden' }}>
        <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5, padding: `${F(10)}px ${F(14)}px`, borderBottom: `1px solid ${T.border}` }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" stroke={T.mute} strokeWidth="2" strokeLinejoin="round"/><path d="M3 7l9 4 9-4M12 11v10" stroke={T.mute} strokeWidth="2" strokeLinejoin="round"/></svg>
          Alle Ausführungen
        </div>
        {!multiGroup && groups[groupKeys[0]].map((vr) => <SizeRow key={vr.ean || vr.v} vr={vr} />)}
        {multiGroup && groupKeys.map((gk) => (
          <div key={gk}>
            <GroupHeader groupKey={gk} items={groups[gk]} />
            {openGroups[gk] && groups[gk].map((vr) => <SizeRow key={vr.ean || vr.v} vr={vr} />)}
          </div>
        ))}
      </div>
    );
  }

  // ── detail ───────────────────────────────────────────────────
  const detailScreen = detail && (() => {
    const sale = detail.sale != null;
    const save = sale ? Math.round((1 - detail.sale / detail.price) * 100) : 0;
    const Tile = ({ children }) => <div style={{ background: T.card, borderRadius: T.radius, padding: T.pad, border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>{children}</div>;
    const TileLabel = ({ icon, children }) => <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>{icon(T.mute, 14)} {children}</div>;

    const scannedVariant = detail._scannedEan && detail.variants && detail.variants.length > 0
      ? detail.variants.find((vr) => vr.ean && String(vr.ean).trim() === detail._scannedEan)
      : null;

    const displayStock = scannedVariant
      ? (scannedVariant.locs ? (scannedVariant.locs[standort.key] ?? 0) : scannedVariant.n)
      : getProductStock(detail);
    const displayStockTotal = scannedVariant
      ? (scannedVariant.locs ? ALL_LOC_KEYS.reduce((s,k) => s+(scannedVariant.locs[k]??0),0) : scannedVariant.total)
      : getProductTotalStock(detail);
    const displayStockState = stockState(displayStock);

    const displayLocs = scannedVariant && scannedVariant.locs
      ? ALL_LOC_KEYS.map((k) => {
          const sd = STANDORTE.find((s) => s.key === k) || { key: k, label: k };
          return { key: k, label: sd.label, home: k === standort.key, n: scannedVariant.locs[k] ?? 0 };
        })
      : (detail.locations || ALL_LOC_KEYS.map((k) => {
          const sd = STANDORTE.find((s) => s.key === k) || { key: k, label: k };
          const n = detail.locs ? (detail.locs[k] ?? 0) : 0;
          return { key: k, label: sd.label, home: k === standort.key, n };
        }));

    const locMax = Math.max(1, ...displayLocs.map((l) => l.n));

    // ── NEU: Master-Art.-Nr. und Shop-URL ──────────────────────
    const masterArt = getMasterArt(detail);
    const currentArt = scannedVariant && scannedVariant.art ? scannedVariant.art : detail.art;
    const shopUrl = getShopUrl(currentArt);

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>

        {/* Header */}
        <div style={{ background: T.headerBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', paddingTop: padTopDet, paddingLeft: 12, paddingRight: 12, paddingBottom: 11, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => setDetail(null)} style={{ width: 38, height: 38, borderRadius: 11, border: 'none', cursor: 'pointer', background: `${standortAccent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.back(standortAccent, 22)}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 1 }}>{detail.brand} · {detail.cat}</div>
            <div style={{ fontSize: F(15), fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {detail.name}{scannedVariant ? ` · ${scannedVariant.v}` : ''}
            </div>
          </div>
          {/* Standort-Badge auch in Detail-Header */}
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: standortAccent, flexShrink: 0 }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: T.pad }}>

          {/* Foto + Name */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <ProductPhoto product={detail} dark={T.dark} radius={T.radius} style={{ width: F(96), height: F(96), flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: F(18), fontWeight: 800, color: T.ink, lineHeight: 1.2, textWrap: 'pretty' }}>
                {detail.name}{scannedVariant ? ` · ${scannedVariant.v}` : ''}
              </div>
              {detail.note && <div style={{ marginTop: 6, fontSize: F(12), color: T.red, fontWeight: 600 }}>{detail.note}</div>}
            </div>
          </div>

          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.gap, marginTop: T.gap + 4 }}>
            <Tile>
              <TileLabel icon={Icon.tag}>Preis</TileLabel>
              <div style={{ fontSize: F(24), fontWeight: 800, color: sale ? T.red : standortAccent, marginTop: 6, lineHeight: 1 }}>{EUR(sale ? detail.sale : detail.price)}</div>
              {sale ? (
                <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: F(12), color: T.mute, textDecoration: 'line-through' }}>{EUR(detail.price)}</span>
                  <span style={{ fontSize: F(11), fontWeight: 700, color: '#fff', background: T.red, padding: '1px 6px', borderRadius: 5 }}>−{save}%</span>
                </div>
              ) : <div style={{ marginTop: 5, fontSize: F(12), color: T.mute }}>inkl. MwSt.</div>}
            </Tile>
            <Tile>
              <TileLabel icon={Icon.box}>
                {scannedVariant ? `${detail.variantLabel}: ${scannedVariant.v}` : `Bestand · ${standort.label}`}
              </TileLabel>
              <div style={{ fontSize: F(24), fontWeight: 800, color: T.stock[displayStockState], marginTop: 6, lineHeight: 1 }}>
                {displayStock}<span style={{ fontSize: F(13), fontWeight: 600, color: T.mute }}> Stk</span>
              </div>
              <div style={{ marginTop: 5, fontSize: F(11), color: T.mute }}>vor Ort · {displayStockTotal} gesamt</div>
              <div style={{ marginTop: 7, height: 6, borderRadius: 6, background: T.dark ? 'rgba(255,255,255,0.1)' : '#e7ecf3', overflow: 'hidden' }}>
                <div style={{ width: `${displayStockTotal ? Math.round((displayStock / displayStockTotal) * 100) : 0}%`, height: '100%', background: T.stock[displayStockState], borderRadius: 6 }} />
              </div>
            </Tile>
          </div>

          {/* Bestand nach Standort */}
          {displayLocs && displayLocs.length > 0 && (
            <div style={{ background: T.card, borderRadius: T.radius, padding: T.pad, marginTop: T.gap, border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
              <TileLabel icon={Icon.box}>Bestand nach Standort{scannedVariant ? ` · ${scannedVariant.v}` : ''}</TileLabel>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {displayLocs.map((loc) => (
                  <div key={loc.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: F(13), fontWeight: loc.home ? 700 : 500, color: loc.home ? standortAccent : T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.label}</span>
                      {loc.home && <span style={{ fontSize: F(9), fontWeight: 700, color: standortAccent, background: `${standortAccent}18`, padding: '1px 5px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>hier</span>}
                    </div>
                    <div style={{ flex: 1, height: 8, borderRadius: 8, background: T.dark ? 'rgba(255,255,255,0.08)' : '#e7ecf3', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((loc.n / locMax) * 100)}%`, height: '100%', borderRadius: 8, background: loc.n === 0 ? 'transparent' : loc.home ? standortAccent : (T.dark ? 'rgba(231,239,247,0.4)' : '#9fb0c6') }} />
                    </div>
                    <span style={{ width: 28, textAlign: 'right', fontSize: F(13), fontWeight: 700, color: loc.n ? T.ink : T.mute }}>{loc.n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Varianten-Accordion */}
          {detail.variants && detail.variants.length > 0 && (
            <VariantAccordion detail={detail} T={T} F={F} stockState={stockState} />
          )}

          {detail.desc && (
            <div style={{ background: T.card, borderRadius: T.radius, padding: T.pad, marginTop: T.gap, border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
              <div style={{ fontSize: F(14), lineHeight: 1.5, color: T.dark ? 'rgba(231,239,247,0.8)' : '#3a4a59', textWrap: 'pretty' }}>{detail.desc}</div>
            </div>
          )}

          {/* Spec-Tabelle: nur Hersteller, Master-Art.-Nr., Kategorie */}
          <div style={{ background: T.card, borderRadius: T.radius, marginTop: T.gap, overflow: 'hidden', border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
            {[
              detail.brand   ? ['Hersteller',     detail.brand,  false] : null,
              masterArt      ? ['Master-Art.-Nr.', masterArt,    true]  : null,
              detail.cat     ? ['Kategorie',       detail.cat,   false] : null,
            ].filter(Boolean).map(([k, v, mono], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: `${T.pad - 4}px ${T.pad}px`, background: i % 2 && !T.dark ? '#fafbfd' : 'transparent', borderTop: i ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ color: T.mute, fontSize: F(13) }}>{k}</span>
                <span style={{ color: T.ink, fontSize: F(13), fontWeight: 600, textAlign: 'right', fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Art.-Nr. + EAN Footer */}
          <div style={{ marginTop: 10, marginBottom: shopUrl ? 4 : 6, display: 'flex', justifyContent: 'space-between', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: F(11), color: T.mute }}>
            <span>Art. {currentArt}</span>
            <span>EAN {detail._scannedEan || detail.ean}</span>
          </div>

          {/* ── NEU: Onlineshop-Link ── */}
          {shopUrl && (
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: `${F(12)}px 0`, marginBottom: T.gap,
                borderRadius: T.radius, border: `1.5px solid ${standortAccent}55`,
                background: `${standortAccent}0e`, color: standortAccent,
                fontSize: F(14), fontWeight: 700, textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke={standortAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3h6v6M10 14L21 3" stroke={standortAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Im Onlineshop anzeigen
            </a>
          )}
          {shopLoading && !shopUrl && (
            <div style={{ textAlign: 'center', fontSize: F(11), color: T.mute, marginBottom: T.gap }}>Shop-Daten werden geladen…</div>
          )}
          {shopLoaded && !shopUrl && !shopLoading && (
            <div style={{ textAlign: 'center', fontSize: F(11), color: T.mute, marginBottom: T.gap }}>Kein Onlineshop-Eintrag gefunden</div>
          )}
        </div>

        <div style={{ paddingTop: 11, paddingLeft: T.pad, paddingRight: T.pad, paddingBottom: padBotBtn, background: T.bg, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => { setDetail(null); setTab('scan'); }} style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer', background: standortAccent, color: T.dark ? '#06131f' : '#fff', fontSize: F(16), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>{Icon.scan(T.dark ? '#06131f' : '#fff', 20)} Nächsten Artikel scannen</button>
        </div>
      </div>
    );
  })();

  // ── scan tab ─────────────────────────────────────────────────
  const onText = T.dark ? '#06131f' : '#fff';
  const scanTab = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <Header title="Scannen" sub={meta || 'Artikel-Etikett erfassen'} />
      <div style={{ flex: 1, overflow: 'auto', padding: T.pad }}>

        <div style={{ background: T.card, borderRadius: 18, padding: 18, border: `1px solid ${T.border}`, boxShadow: T.tileShadow, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 300, aspectRatio: '1 / 1', borderRadius: 18, background: '#06131f', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div id="scanner-cam" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {cam !== 'live' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.dark ? '#16283f' : '#eaf1f9' }}>
                <div style={{ opacity: 0.55, display: 'flex' }}>{Icon.qr(standortAccent, 58)}</div>
              </div>
            )}
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], i) => (
              <div key={i} style={{ position: 'absolute', [v]: 16, [h]: 16, width: 28, height: 28, pointerEvents: 'none', [`border${v[0].toUpperCase() + v.slice(1)}`]: `3px solid ${cam === 'live' ? '#fff' : standortAccent}`, [`border${h[0].toUpperCase() + h.slice(1)}`]: `3px solid ${cam === 'live' ? '#fff' : standortAccent}`, borderRadius: v === 'top' ? (h === 'left' ? '8px 0 0 0' : '0 8px 0 0') : (h === 'left' ? '0 0 0 8px' : '0 0 8px 0') }} />
            ))}
            {cam === 'live' && <div className="scanline" style={{ position: 'absolute', left: 16, right: 16, height: 3, borderRadius: 3, background: `linear-gradient(90deg,transparent,#fff,transparent)`, boxShadow: `0 0 12px #fff` }} />}
          </div>

          <div style={{ marginTop: 14, fontWeight: 700, color: T.ink, fontSize: F(16) }}>
            {cam === 'live' ? 'Kamera aktiv' : cam === 'error' ? 'Kamera nicht verfügbar' : 'Bereit zum Scannen'}
          </div>
          <div style={{ marginTop: 3, fontSize: F(13), color: cam === 'error' ? T.stock.out : T.mute, textAlign: 'center', lineHeight: 1.4 }}>
            {cam === 'live' ? 'Barcode / EAN in den Rahmen halten' : cam === 'error' ? camMsg : 'Kamera auf Barcode oder QR richten'}
          </div>

          {notFound && <div style={{ marginTop: 12, width: '100%', boxSizing: 'border-box', background: T.chipLow, color: T.stock.out, border: `1px solid ${T.stock.out}55`, borderRadius: 10, padding: '9px 12px', fontSize: F(13), fontWeight: 600, textAlign: 'center' }}>Kein Artikel zu „{notFound}" (EAN/Art.-Nr.)</div>}

          {cam === 'live'
            ? <button onClick={stopCamera} style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 14, border: `1.5px solid ${T.border}`, cursor: 'pointer', background: 'transparent', color: T.ink, fontSize: F(16), fontWeight: 700, fontFamily: 'inherit' }}>Stopp</button>
            : <button onClick={startCamera} style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: standortAccent, color: onText, fontSize: F(16), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>{Icon.scan(onText, 20)} Kamera starten</button>}

          <div style={{ marginTop: 10, width: '100%', display: 'flex', gap: 8 }}>
            <input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) { handleCode(manual.trim()); setManual(''); } }} placeholder="EAN oder Art.-Nr. eingeben" style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 11, border: `1px solid ${T.border}`, background: T.field, color: T.ink, padding: '0 12px', fontSize: F(15), fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => { if (manual.trim()) { handleCode(manual.trim()); setManual(''); } }} style={{ flexShrink: 0, height: 44, padding: '0 16px', borderRadius: 11, border: 'none', cursor: 'pointer', background: `${standortAccent}18`, color: standortAccent, fontSize: F(15), fontWeight: 700, fontFamily: 'inherit' }}>Suchen</button>
          </div>
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: F(12), color: T.mute, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, fontWeight: 700 }}>Zuletzt gescannt</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: T.gap - 2 }}>{history.slice(0, 3).map((h) => <ListRow key={h.p.ean || h.p.id} p={h.p} />)}</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── search tab ───────────────────────────────────────────────
  const q2 = q.trim().toLowerCase();
  const tokenMatch = (s, toks) => toks.every((t) => s.includes(t));
  const allBrands = useMemo(() => [...new Set(PRODUCTS.map((p) => p.brand).filter(Boolean))].sort(), [PRODUCTS]);
  const allCats   = useMemo(() => [...new Set(PRODUCTS.map((p) => p.cat).filter(Boolean))].sort(), [PRODUCTS]);
  const [filterBrand, setFilterBrand] = useState(null);
  const [filterCat,   setFilterCat]   = useState(null);
  const toks = q2.length >= 2 ? q2.split(/\s+/).filter(Boolean) : [];
  const SEARCH_CAP = 40;

  const matches = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const s = p._s || (p.name + ' ' + p.brand + ' ' + p.art + ' ' + p.cat + ' ' + (p.allEans || []).join(' ')).toLowerCase();
      const textOk  = toks.length === 0 || tokenMatch(s, toks);
      const brandOk = !filterBrand || p.brand === filterBrand;
      const catOk   = !filterCat   || p.cat   === filterCat;
      return textOk && brandOk && catOk;
    });
  }, [PRODUCTS, toks, filterBrand, filterCat]);

  const shown = matches.slice(0, SEARCH_CAP);
  const activeFilters = (filterBrand ? 1 : 0) + (filterCat ? 1 : 0);

  const Chip = ({ label, active, onPress }) => (
    <button onClick={onPress} style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 20, border: `1.5px solid ${active ? standortAccent : T.border}`, background: active ? standortAccent : T.card, color: active ? (T.dark ? '#06131f' : '#fff') : T.ink, fontSize: F(12), fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      {label}{active ? ' ×' : ''}
    </button>
  );

  const searchTab = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <Header title="Suche" sub={`${PRODUCTS.length.toLocaleString('de-DE')} Artikel im Sortiment`} />
      <div style={{ padding: `12px ${T.pad}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.field, borderRadius: 12, padding: '10px 14px', border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
          {Icon.search(T.mute, 18)}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Marke, Art.-Nr. oder EAN" style={{ border: 'none', outline: 'none', flex: 1, fontSize: F(15), color: T.ink, background: 'transparent', fontFamily: 'inherit' }} />
          {(q || activeFilters > 0) && (
            <button onClick={() => { setQ(''); setFilterBrand(null); setFilterCat(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>{Icon.close(T.mute, 18)}</button>
          )}
        </div>
      </div>
      <div style={{ padding: `8px ${T.pad}px 0` }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip label="Alle Marken" active={!filterBrand} onPress={() => setFilterBrand(null)} />
          {allBrands.map((b) => <Chip key={b} label={b} active={filterBrand === b} onPress={() => setFilterBrand(filterBrand === b ? null : b)} />)}
        </div>
      </div>
      <div style={{ padding: `4px ${T.pad}px 6px` }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip label="Alle Kategorien" active={!filterCat} onPress={() => setFilterCat(null)} />
          {allCats.map((c) => <Chip key={c} label={c} active={filterCat === c} onPress={() => setFilterCat(filterCat === c ? null : c)} />)}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: `0 ${T.pad}px ${T.pad}px`, display: 'flex', flexDirection: 'column', gap: T.gap - 2 }}>
        {toks.length === 0 && !filterBrand && !filterCat ? (
          <div style={{ textAlign: 'center', color: T.mute, marginTop: 40, fontSize: F(14), lineHeight: 1.5 }}>Mindestens 2 Zeichen eingeben<br />oder Marke / Kategorie antippen</div>
        ) : shown.length ? (
          <>
            <div style={{ fontSize: F(12), color: T.mute, paddingTop: 8 }}>{matches.length} Treffer{activeFilters > 0 ? ` · ${activeFilters} Filter aktiv` : ''}</div>
            {shown.map((p, i) => <ListRow key={(p.ean || p.id) + '_' + i} p={p} />)}
            {matches.length > SEARCH_CAP && <div style={{ textAlign: 'center', color: T.mute, fontSize: F(12), padding: '8px 0 4px' }}>+{(matches.length - SEARCH_CAP).toLocaleString('de-DE')} weitere · Suche verfeinern</div>}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: T.mute, marginTop: 50, fontSize: F(14) }}>Keine Treffer{q ? ` für „${q}"` : ''}{activeFilters > 0 ? ' mit diesen Filtern' : ''}</div>
        )}
      </div>
    </div>
  );

  // ── history tab ──────────────────────────────────────────────
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const historyTab = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <Header title="Verlauf" sub={history.length ? `${history.length} Artikel gescannt` : 'Noch nichts gescannt'} right={history.length ? <button onClick={() => setHistory([])} style={{ border: 'none', background: 'none', color: standortAccent, fontSize: F(14), fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', paddingBottom: 2 }}>Leeren</button> : null} />
      <div style={{ flex: 1, overflow: 'auto', padding: T.pad, display: 'flex', flexDirection: 'column', gap: T.gap - 2 }}>
        {history.length ? history.map((h) => <ListRow key={h.p.ean || h.p.id} p={h.p} time={fmtTime(h.at)} />) : (
          <div style={{ textAlign: 'center', color: T.mute, marginTop: 60 }}>
            <div style={{ display: 'inline-flex', opacity: 0.4 }}>{Icon.history(T.mute, 44)}</div>
            <div style={{ marginTop: 12, fontSize: F(14) }}>Gescannte Artikel erscheinen hier</div>
          </div>
        )}
      </div>
    </div>
  );

  const TabBtn = ({ id, label, icon }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
        {icon(active ? standortAccent : T.mute, 24)}
        <span style={{ fontSize: F(11), fontWeight: active ? 700 : 500, color: active ? standortAccent : T.mute }}>{label}</span>
      </button>
    );
  };

  // ── Accent-Strip oben am Tab-Bar (farbige Linie zeigt aktiven Standort) ──
  const AccentStrip = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: standortAccent, borderRadius: '3px 3px 0 0' }} />
  );

  return (
    <div style={{ height: '100%', position: 'relative', background: T.bg, color: T.ink }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 64 }}>
          {tab === 'scan' && scanTab}
          {tab === 'search' && searchTab}
          {tab === 'history' && historyTab}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 9, background: T.headerBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: `1px solid ${T.border}`, paddingBottom: padBotTabs, display: 'flex' }}>
        <AccentStrip />
        <TabBtn id="scan" label="Scannen" icon={Icon.scan} />
        <TabBtn id="search" label="Suche" icon={Icon.search} />
        <TabBtn id="history" label="Verlauf" icon={Icon.history} />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, transform: detail ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .3s cubic-bezier(.22,1,.36,1)', pointerEvents: detail ? 'auto' : 'none' }}>
        {detailScreen}
      </div>
      {/* Standort-Picker Modal */}
      {showStandortPicker && <StandortPicker />}
    </div>
  );
}

window.ScannerC = ScannerC;
window.SCANNER_ACCENTS = ACCENTS;
window.SCANNER_STANDORTE = STANDORTE;
