// Atlantis Sommerfest Scanner — final app (Direction C "Regal"), theme-aware.
// Tab bar (Scannen / Suche / Verlauf) + data-dense detail with KPI tiles,
// stock meter, per-variant dropdown and spec table. Driven by Tweaks.
/* global React, ATLANTIS, AUI */

const ACCENTS = {
  navy:    { light: '#1a3c6e', dark: '#6ea4ea', label: 'Atlantis Navy' },
  tiefsee: { light: '#0e7c8b', dark: '#34c8da', label: 'Tiefsee' },
  koralle: { light: '#b4533a', dark: '#f08c6f', label: 'Koralle' },
};

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

  // open() nimmt optional die gescannte EAN mit
  const open = (p, scannedEan = null) => {
    setDetail({ ...p, _scannedEan: scannedEan });
    setHistory((h) => [{ p, at: Date.now() }, ...h.filter((x) => x.p.ean !== p.ean)].slice(0, 20));
  };

  // ── real barcode scanning (html5-qrcode) + EAN lookup ────────
  const CAM = typeof Html5Qrcode !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const codeIndex = useMemo(() => {
    const m = {};
    (PRODUCTS || []).forEach((p) => {
      (p.allEans && p.allEans.length ? p.allEans : [p.ean]).forEach((e) => { if (e) m[String(e).trim()] = p; });
      (p.allArts || [p.art]).forEach((a) => { if (a) m[String(a).trim().toLowerCase()] = p; });
    });
    return m;
  }, [PRODUCTS]);
  const lookup = (code) => {
    const c = String(code).trim();
    return codeIndex[c] || codeIndex[c.toLowerCase()] || null;
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

  // EAN beim Öffnen mitgeben
  const handleCode = (code) => {
    const p = lookup(code);
    if (p) { setNotFound(null); stopCamera(); open(p, String(code).trim()); }
    else {
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

  // ── shared atoms ─────────────────────────────────────────────
  const Header = ({ title, sub, right }) => (
    <div style={{ background: T.headerBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', paddingTop: padTopHdr, paddingLeft: T.pad + 4, paddingRight: T.pad + 4, paddingBottom: 13, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: F(26), fontWeight: 800, color: T.ink, letterSpacing: -0.3, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: F(13), color: T.mute, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  const StockDot = ({ st, size = 8 }) => <span style={{ width: size, height: size, borderRadius: size, background: T.stock[st], flexShrink: 0, display: 'inline-block' }} />;

  const ListRow = ({ p, time }) => {
    const st = stockState(p.stock);
    const sale = p.sale != null;
    return (
      <button onClick={() => open(p)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: T.pad - 2, display: 'flex', gap: 12, alignItems: 'center', boxShadow: T.tileShadow, fontFamily: 'inherit' }}>
        <ProductPhoto product={p} dark={T.dark} radius={10} style={{ width: F(52), height: F(52), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.brand}{time ? ` · ${time}` : ''}</div>
          <div style={{ fontSize: F(14), fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: F(14), fontWeight: 800, color: sale ? T.red : T.accent }}>{EUR(sale ? p.sale : p.price)}</span>
            <StockDot st={st} size={7} />
            <span style={{ fontSize: F(12), color: T.mute }}>{p.stock} Stk</span>
          </div>
        </div>
        {Icon.chevron(T.mute, 20)}
      </button>
    );
  };

  // ── VariantDropdown ──────────────────────────────────────────
  // Zeigt die gescannte Variante prominent + alle anderen im Dropdown
  function VariantDropdown({ detail, T, F, EUR, stockState }) {
    const [open, setOpen] = useState(false);

    const scannedVariant = detail._scannedEan && detail.variants.length > 0
      ? detail.variants.find((vr) => vr.ean && String(vr.ean).trim() === detail._scannedEan)
      : null;

    const otherVariants = detail.variants.filter((vr) =>
      !scannedVariant || !vr.ean || String(vr.ean).trim() !== detail._scannedEan
    );

    // Wenn kein Scan-kontext: kein Dropdown nötig
    if (!detail.variants || detail.variants.length === 0) return null;

    const variantStockColor = (vr) => {
      const here = vr.n;
      if (here <= 0) return T.stock.out;
      if (here <= 2) return T.stock.low;
      return T.stock.ok;
    };

    const VariantRow = ({ vr, isScanned = false }) => {
      const here = vr.n;
      const total = vr.total || here;
      const elsewhere = total - here;
      const outAll = here === 0 && elsewhere <= 0;
      const onlyElse = here === 0 && elsewhere > 0;
      const low = here > 0 && here <= 2;

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: `${F(10)}px ${F(14)}px`,
          background: isScanned ? T.accentSoft : 'transparent',
          borderBottom: `1px solid ${T.border}`,
          borderLeft: isScanned ? `3px solid ${T.accent}` : '3px solid transparent',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isScanned && (
                <span style={{ fontSize: F(9), fontWeight: 700, color: T.accent, background: T.accentSoft, border: `1px solid ${T.accent}44`, padding: '1px 6px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
                  gescannt
                </span>
              )}
              <span style={{
                fontSize: F(14), fontWeight: isScanned ? 700 : 500,
                color: outAll ? T.mute : T.ink,
                textDecoration: outAll ? 'line-through' : 'none',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {detail.variantLabel}: {vr.v}
              </span>
            </div>
            {onlyElse && (
              <div style={{ fontSize: F(11), color: T.stock.low, marginTop: 2 }}>
                nicht vor Ort · {elsewhere} in anderen Standorten
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: F(18), fontWeight: 800, color: variantStockColor(vr), lineHeight: 1 }}>
              {here}
              <span style={{ fontSize: F(11), fontWeight: 500, color: T.mute }}> Stk</span>
            </div>
            {total > here && (
              <div style={{ fontSize: F(10), color: T.mute, marginTop: 1 }}>
                {total} gesamt
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div style={{ background: T.card, borderRadius: T.radius, marginTop: T.gap, border: `1px solid ${T.border}`, boxShadow: T.tileShadow, overflow: 'hidden' }}>

        {/* Gescannte Variante prominent oben */}
        {scannedVariant && <VariantRow vr={scannedVariant} isScanned />}

        {/* Wenn keine spezifische Variante gescannt: alle direkt zeigen (z.B. Suche) */}
        {!scannedVariant && detail.variants.map((vr) => (
          <VariantRow key={vr.v} vr={vr} isScanned={false} />
        ))}

        {/* Dropdown-Toggle für andere Varianten (nur wenn eine bestimmte gescannt wurde) */}
        {scannedVariant && otherVariants.length > 0 && (
          <>
            <button
              onClick={() => setOpen((o) => !o)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                borderTop: open ? `1px solid ${T.border}` : 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                padding: `${F(11)}px ${F(14)}px`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}
            >
              <span style={{ fontSize: F(13), fontWeight: 600, color: T.accent }}>
                {open ? 'Andere Ausführungen ausblenden' : `Andere Ausführungen anzeigen (${otherVariants.length})`}
              </span>
              {/* Chevron rotiert */}
              <svg
                width={18} height={18} viewBox="0 0 24 24" fill="none"
                style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
              >
                <path d="M6 9l6 6 6-6" stroke={T.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Ausgeklappt: alle anderen Varianten */}
            {open && (
              <div style={{ borderTop: `1px solid ${T.border}` }}>
                {otherVariants.map((vr) => (
                  <VariantRow key={vr.v} vr={vr} isScanned={false} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── detail ───────────────────────────────────────────────────
  const detailScreen = detail && (() => {
    const st = stockState(detail.stock);
    const sale = detail.sale != null;
    const save = sale ? Math.round((1 - detail.sale / detail.price) * 100) : 0;
    const pct = detail.stockTotal ? Math.round((detail.stock / detail.stockTotal) * 100) : 0;
    const locMax = Math.max(1, ...(detail.locations || []).map((l) => l.n));
    const Tile = ({ children }) => <div style={{ background: T.card, borderRadius: T.radius, padding: T.pad, border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>{children}</div>;
    const TileLabel = ({ icon, children }) => <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>{icon(T.mute, 14)} {children}</div>;

    // Gescannte Variante ermitteln
    const scannedVariant = detail._scannedEan && detail.variants && detail.variants.length > 0
      ? detail.variants.find((vr) => vr.ean && String(vr.ean).trim() === detail._scannedEan)
      : null;

    // Bestand: wenn Variante gescannt → Varianten-Bestand, sonst Produkt-Bestand
    const displayStock = scannedVariant ? scannedVariant.n : detail.stock;
    const displayStockTotal = scannedVariant ? scannedVariant.total : detail.stockTotal;
    const displayStockState = stockState(displayStock);

    // Standorte: wenn Variante gescannt → Varianten-Locs, sonst Produkt-Locs
    const displayLocs = scannedVariant
      ? Object.entries(scannedVariant.locs).map(([key, n]) => {
          const loc = detail.locations.find((l) => l.key === key) || { key, label: key, home: false };
          return { ...loc, n };
        })
      : detail.locations;

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>

        {/* Header */}
        <div style={{ background: T.headerBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', paddingTop: padTopDet, paddingLeft: 12, paddingRight: 12, paddingBottom: 11, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => setDetail(null)} style={{ width: 38, height: 38, borderRadius: 11, border: 'none', cursor: 'pointer', background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.back(T.accent, 22)}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: F(11), color: T.mute, textTransform: 'uppercase', letterSpacing: 1 }}>{detail.brand} · {detail.cat}</div>
            <div style={{ fontSize: F(15), fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {detail.name}{scannedVariant ? ` · ${scannedVariant.v}` : ''}
            </div>
          </div>
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
              <div style={{ fontSize: F(24), fontWeight: 800, color: sale ? T.red : T.accent, marginTop: 6, lineHeight: 1 }}>{EUR(sale ? detail.sale : detail.price)}</div>
              {sale ? (
                <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: F(12), color: T.mute, textDecoration: 'line-through' }}>{EUR(detail.price)}</span>
                  <span style={{ fontSize: F(11), fontWeight: 700, color: '#fff', background: T.red, padding: '1px 6px', borderRadius: 5 }}>−{save}%</span>
                </div>
              ) : <div style={{ marginTop: 5, fontSize: F(12), color: T.mute }}>inkl. MwSt.</div>}
            </Tile>
            <Tile>
              <TileLabel icon={Icon.box}>
                {scannedVariant
                  ? `${detail.variantLabel}: ${scannedVariant.v}`
                  : `Bestand · ${detail.home || 'Coppi'}`}
              </TileLabel>
              <div style={{ fontSize: F(24), fontWeight: 800, color: T.stock[displayStockState], marginTop: 6, lineHeight: 1 }}>
                {displayStock}
                <span style={{ fontSize: F(13), fontWeight: 600, color: T.mute }}> Stk</span>
              </div>
              <div style={{ marginTop: 5, fontSize: F(11), color: T.mute }}>
                vor Ort · {displayStockTotal} gesamt
              </div>
              <div style={{ marginTop: 7, height: 6, borderRadius: 6, background: T.dark ? 'rgba(255,255,255,0.1)' : '#e7ecf3', overflow: 'hidden' }}>
                <div style={{ width: `${displayStockTotal ? Math.round((displayStock / displayStockTotal) * 100) : 0}%`, height: '100%', background: T.stock[displayStockState], borderRadius: 6 }} />
              </div>
            </Tile>
          </div>

          {/* Bestand nach Standort */}
          {displayLocs && displayLocs.length > 0 && (
            <div style={{ background: T.card, borderRadius: T.radius, padding: T.pad, marginTop: T.gap, border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
              <TileLabel icon={Icon.box}>
                Bestand nach Standort{scannedVariant ? ` · ${scannedVariant.v}` : ''}
              </TileLabel>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {displayLocs.map((loc) => (
                  <div key={loc.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: F(13), fontWeight: loc.home ? 700 : 500, color: loc.home ? T.accent : T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.label}</span>
                      {loc.home && <span style={{ fontSize: F(9), fontWeight: 700, color: T.accent, background: T.accentSoft, padding: '1px 5px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>hier</span>}
                    </div>
                    <div style={{ flex: 1, height: 8, borderRadius: 8, background: T.dark ? 'rgba(255,255,255,0.08)' : '#e7ecf3', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((loc.n / locMax) * 100)}%`, height: '100%', borderRadius: 8, background: loc.n === 0 ? 'transparent' : loc.home ? T.accent : (T.dark ? 'rgba(231,239,247,0.4)' : '#9fb0c6') }} />
                    </div>
                    <span style={{ width: 28, textAlign: 'right', fontSize: F(13), fontWeight: 700, color: loc.n ? T.ink : T.mute }}>{loc.n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Varianten-Dropdown (neu) ── */}
          {detail.variants && detail.variants.length > 0 && (
            <VariantDropdown
              detail={detail}
              T={T}
              F={F}
              EUR={EUR}
              stockState={stockState}
            />
          )}

          {detail.desc && (
            <div style={{ background: T.card, borderRadius: T.radius, padding: T.pad, marginTop: T.gap, border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
              <div style={{ fontSize: F(14), lineHeight: 1.5, color: T.dark ? 'rgba(231,239,247,0.8)' : '#3a4a59', textWrap: 'pretty' }}>{detail.desc}</div>
            </div>
          )}

          {/* Spec-Tabelle */}
          <div style={{ background: T.card, borderRadius: T.radius, marginTop: T.gap, overflow: 'hidden', border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
            {detail.specs.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: `${T.pad - 4}px ${T.pad}px`, background: i % 2 && !T.dark ? '#fafbfd' : 'transparent', borderTop: i ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ color: T.mute, fontSize: F(13) }}>{k}</span>
                <span style={{ color: T.ink, fontSize: F(13), fontWeight: 600, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: F(11), color: T.mute }}>
            <span>Art. {detail.art}</span>
            <span>EAN {detail._scannedEan || detail.ean}</span>
          </div>
        </div>

        <div style={{ paddingTop: 11, paddingLeft: T.pad, paddingRight: T.pad, paddingBottom: padBotBtn, background: T.bg, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => { setDetail(null); setTab('scan'); }} style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', cursor: 'pointer', background: T.accent, color: T.dark ? '#06131f' : '#fff', fontSize: F(16), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>{Icon.scan(T.dark ? '#06131f' : '#fff', 20)} Nächsten Artikel scannen</button>
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
                <div style={{ opacity: 0.55, display: 'flex' }}>{Icon.qr(T.accent, 58)}</div>
              </div>
            )}
            {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], i) => (
              <div key={i} style={{ position: 'absolute', [v]: 16, [h]: 16, width: 28, height: 28, pointerEvents: 'none', [`border${v[0].toUpperCase() + v.slice(1)}`]: `3px solid ${cam === 'live' ? '#fff' : T.accent}`, [`border${h[0].toUpperCase() + h.slice(1)}`]: `3px solid ${cam === 'live' ? '#fff' : T.accent}`, borderRadius: v === 'top' ? (h === 'left' ? '8px 0 0 0' : '0 8px 0 0') : (h === 'left' ? '0 0 0 8px' : '0 0 8px 0') }} />
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
            : <button onClick={startCamera} style={{ marginTop: 14, width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: T.accent, color: onText, fontSize: F(16), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>{Icon.scan(onText, 20)} Kamera starten</button>}

          <div style={{ marginTop: 10, width: '100%', display: 'flex', gap: 8 }}>
            <input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) { handleCode(manual.trim()); setManual(''); } }} placeholder="EAN oder Art.-Nr. eingeben" style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 11, border: `1px solid ${T.border}`, background: T.field, color: T.ink, padding: '0 12px', fontSize: F(15), fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => { if (manual.trim()) { handleCode(manual.trim()); setManual(''); } }} style={{ flexShrink: 0, height: 44, padding: '0 16px', borderRadius: 11, border: 'none', cursor: 'pointer', background: T.accentSoft, color: T.accent, fontSize: F(15), fontWeight: 700, fontFamily: 'inherit' }}>Suchen</button>
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
    <button onClick={onPress} style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 20, border: `1.5px solid ${active ? T.accent : T.border}`, background: active ? T.accent : T.card, color: active ? (T.dark ? '#06131f' : '#fff') : T.ink, fontSize: F(12), fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
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
      <Header title="Verlauf" sub={history.length ? `${history.length} Artikel gescannt` : 'Noch nichts gescannt'} right={history.length ? <button onClick={() => setHistory([])} style={{ border: 'none', background: 'none', color: T.accent, fontSize: F(14), fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', paddingBottom: 2 }}>Leeren</button> : null} />
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
        {icon(active ? T.accent : T.mute, 24)}
        <span style={{ fontSize: F(11), fontWeight: active ? 700 : 500, color: active ? T.accent : T.mute }}>{label}</span>
      </button>
    );
  };

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
        <TabBtn id="scan" label="Scannen" icon={Icon.scan} />
        <TabBtn id="search" label="Suche" icon={Icon.search} />
        <TabBtn id="history" label="Verlauf" icon={Icon.history} />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, transform: detail ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .3s cubic-bezier(.22,1,.36,1)', pointerEvents: detail ? 'auto' : 'none' }}>
        {detailScreen}
      </div>
    </div>
  );
}

window.ScannerC = ScannerC;
window.SCANNER_ACCENTS = ACCENTS;
