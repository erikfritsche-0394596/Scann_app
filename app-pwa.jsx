// Production app: full-screen scanner (no device frame), fixed theme,
// live Google-Sheet data, status shown inside the Scannen header.
/* global React, ReactDOM, ScannerC, AtlantisData */
const THEME = { accent: '#1a3c6e', dark: false, density: 'komfortabel', big: false };
const ACCENT = '#1a3c6e';
function Spinner() {
  return <div style={{ width: 34, height: 34, borderRadius: 34, border: `3px solid ${ACCENT}33`, borderTopColor: ACCENT, animation: 'spin 0.8s linear infinite' }} />;
}
function FullScreen({ children }) {
  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: '#cfd6e0', display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', background: '#eef2f7', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
function Loading({ error, onRetry }) {
  return (
    <FullScreen>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
        {error ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1b2733' }}>Daten konnten nicht geladen werden</div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{error}</div>
            <button onClick={onRetry} style={{ marginTop: 4, height: 46, padding: '0 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>Erneut versuchen</button>
          </>
        ) : (
          <>
            <Spinner />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1b2733' }}>Artikeldaten werden geladen …</div>
          </>
        )}
      </div>
    </FullScreen>
  );
}
function App() {
  const [state, setState] = React.useState({ status: 'loading', products: null, meta: null, error: null });
  const refresh = React.useCallback(() => {
    setState((s) => ({ ...s, status: s.products ? 'ready' : 'loading', error: null }));
    AtlantisData.load()
      .then(({ products, at, live, fallback, error }) => {
        if (error || !products || products.length === 0) {
          // load() gab ein Fehlerobjekt zurück (kein throw)
          setState((s) => ({
            status: s.products ? 'ready' : 'error',
            products: s.products,
            meta: s.meta,
            error: error || 'Keine Artikel gefunden.',
          }));
        } else {
          setState({
            status: 'ready',
            products,
            meta: { at, live, fallback, count: products.length },
            error: null,
          });
        }
      })
      .catch((e) => {
        // Sollte nicht mehr vorkommen, aber als Sicherheitsnetz
        setState((s) => ({
          status: s.products ? 'ready' : 'error',
          products: s.products,
          meta: s.meta,
          error: String(e.message || e),
        }));
      });
  }, []);
  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 300000);
    return () => clearInterval(id);
  }, [refresh]);
  if (state.status !== 'ready') return <Loading error={state.status === 'error' ? state.error : null} onRetry={refresh} />;
  const m = state.meta;
  const stamp = m.at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const metaStr = `${m.live ? 'Live' : 'Beispieldaten'} · ${m.count.toLocaleString('de-DE')} Artikel · Stand ${stamp}`;
  return (
    <FullScreen>
      <ScannerC tw={THEME} products={state.products} fit="screen" meta={metaStr} />
    </FullScreen>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
