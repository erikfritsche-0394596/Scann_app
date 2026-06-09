// Atlantis Sommerfest Scanner — shared UI atoms (logo, placeholder, icons)
/* global React */

// ── Atlantis wordmark + horizon arc ───────────────────────────
function AtlantisMark({ color = '#fff', size = 1, tagline = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
      <svg width={64 * size} height={16 * size} viewBox="0 0 64 16" style={{ display: 'block', marginBottom: 2 * size }}>
        <path d="M4 15 A 28 28 0 0 1 60 15" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div style={{
        fontFamily: '"Oswald", system-ui, sans-serif', fontWeight: 300,
        fontSize: 19 * size, letterSpacing: 5.5 * size, color,
        paddingLeft: 5.5 * size,
      }}>ATLANTIS</div>
      {tagline && (
        <div style={{
          fontFamily: '"Oswald", system-ui, sans-serif', fontWeight: 400,
          fontSize: 6 * size, letterSpacing: 2.2 * size, color, opacity: 0.85,
          marginTop: 2 * size, paddingLeft: 2 * size,
        }}>WASSERSPORT UND MEER!</div>
      )}
    </div>
  );
}

// ── Product photo: real IMAGE if present, else striped placeholder ──
function ProductPhoto({ product, dark = false, radius = 16, style = {} }) {
  const [err, setErr] = React.useState(false);
  const base = dark ? '#1c3450' : '#e2eaf4';
  const stripe = dark ? '#23405f' : '#d3deec';
  const ink = dark ? 'rgba(220,232,245,0.7)' : 'rgba(26,60,110,0.6)';
  if (product.image && !err) {
    return (
      <div style={{ position: 'relative', borderRadius: radius, overflow: 'hidden', background: base, ...style }}>
        <img src={product.image} alt={product.name} onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      position: 'relative', borderRadius: radius, overflow: 'hidden',
      background: `repeating-linear-gradient(135deg, ${base} 0 9px, ${stripe} 9px 18px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      <div style={{ textAlign: 'center', padding: 6 }}>
        <div style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 9, letterSpacing: 0.8, color: ink, textTransform: 'uppercase', fontWeight: 600,
        }}>Foto</div>
        <div style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 8, letterSpacing: 0.3, color: ink, opacity: 0.75, marginTop: 2,
        }}>{product.cat}</div>
      </div>
    </div>
  );
}

// ── tiny icon set (stroke icons) ──────────────────────────────
const Icon = {
  scan: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 12h18" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  qr: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="2" />
      <path d="M14 14h3v3M21 14v7h-7v-3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  history: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v3.3h3.3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.5V12l3 2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevron: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  back: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  bolt: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={c} />
    </svg>
  ),
  flash: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  box: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 7l9 4 9-4M12 11v10" stroke={c} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  tag: (c, s = 24) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 12l9-9 9 9-9 9-9-9z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
};

// ── stock dot + label ─────────────────────────────────────────
const STOCK_COLOR = { ok: '#1f8a4c', low: '#c98a00', out: '#c8102e' };
const STOCK_COLOR_DARK = { ok: '#34d27b', low: '#ffc24b', out: '#ff5d6e' };

// ── ATLANTIS global helpers (EUR formatter + stockState) ──────
window.ATLANTIS = {
  EUR: (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0
      ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : '—';
  },
  stockState: (n) => (n == null || n <= 0 ? 'out' : n <= 3 ? 'low' : 'ok'),
};

window.AUI = { AtlantisMark, ProductPhoto, Icon, STOCK_COLOR, STOCK_COLOR_DARK };
