// Live host: loads the Google-Sheets CSV export via AtlantisData, maps it, and
// renders the approved Scanner C against real data. Periodic refresh + a data
// status caption under the device.
/* global React, ReactDOM, IOSDevice, ScannerC, AtlantisData, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakRadio, SCANNER_ACCENTS */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#1a3c6e",
  "dark": false,
  "density": "komfortabel",
  "big": false
}/*EDITMODE-END*/;

const PHONE_W = 402, PHONE_H = 874;

function Spinner({ color }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 34, border: `3px solid ${color}33`, borderTopColor: color, animation: 'spin 0.8s linear infinite' }} />
  );
}

function LoadingScreen({ dark, accent, error, onRetry }) {
  const ink = dark ? '#f3f7fb' : '#1b2733';
  const mute = dark ? 'rgba(231,239,247,0.6)' : '#64748b';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, background: dark ? '#0b1726' : '#eef2f7', textAlign: 'center' }}>
      {error ? (
        <>
          <div style={{ fontSize: 17, fontWeight: 700, color: ink }}>Daten konnten nicht geladen werden</div>
          <div style={{ fontSize: 14, color: mute, lineHeight: 1.5 }}>{error}</div>
          <button onClick={onRetry} style={{ marginTop: 4, height: 44, padding: '0 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: accent, color: dark ? '#06131f' : '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}>Erneut versuchen</button>
        </>
      ) : (
        <>
          <Spinner color={accent} />
          <div style={{ fontSize: 15, fontWeight: 600, color: ink }}>Artikeldaten werden geladen …</div>
        </>
      )}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [state, setState] = React.useState({ status: 'loading', products: null, meta: null, error: null });
  const accentList = Object.values(SCANNER_ACCENTS).map((a) => a.light);
  const accent = (SCANNER_ACCENTS[Object.keys(SCANNER_ACCENTS).find((k) => SCANNER_ACCENTS[k].light === t.accent)] || SCANNER_ACCENTS.navy);
  const accentColor = t.dark ? accent.dark : accent.light;

  const refresh = React.useCallback(() => {
    AtlantisData.load()
      .then(({ products, at, live, src, fallback, error }) => setState({ status: 'ready', products, meta: { at, live, src, fallback, error, count: products.length }, error: null }))
      .catch((e) => setState((s) => ({ ...s, status: s.products ? 'ready' : 'error', error: String(e.message || e) })));
  }, []);

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 300000); // periodische Aktualisierung (5 Min.)
    return () => clearInterval(id);
  }, [refresh]);

  const [scale, setScale] = React.useState(1);
  React.useLayoutEffect(() => {
    const fit = () => setScale(Math.min((window.innerWidth - 32) / PHONE_W, (window.innerHeight - 96) / PHONE_H, 1.12));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const meta = state.meta;
  const stamp = meta ? meta.at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–';

  return (
    <>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 16 }}>
        <div style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
          <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <IOSDevice width={PHONE_W} height={PHONE_H} dark={t.dark}>
              {state.status === 'ready'
                ? <ScannerC tw={t} products={state.products} />
                : <LoadingScreen dark={t.dark} accent={accentColor} error={state.status === 'error' ? state.error : null} onRetry={refresh} />}
            </IOSDevice>
          </div>
        </div>

        {/* data source status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#5b6b7b', fontFamily: '-apple-system, system-ui', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 460 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: state.status === 'error' ? '#c8102e' : meta && meta.fallback ? '#c98a00' : '#1f8a4c' }} />
            {meta
              ? (meta.live
                  ? 'Live-Datenquelle (Google Sheet)'
                  : meta.fallback
                    ? 'Beispieldaten — Live-Quelle nicht erreichbar'
                    : `Beispieldaten (${(meta.src || '').split('/').pop()})`)
              : 'verbinde …'}
          </span>
          {meta && <span>· {meta.count} Artikel</span>}
          {meta && <span>· Stand {stamp}</span>}
          <span style={{ color: '#94a3b4' }}>· EKNETTO ausgeblendet</span>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Erscheinungsbild" />
        <TweakRadio label="Modus" value={t.dark ? 'Dunkel' : 'Hell'} options={['Hell', 'Dunkel']} onChange={(v) => setTweak('dark', v === 'Dunkel')} />
        <TweakColor label="Akzentfarbe" value={t.accent} options={accentList} onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Lesbarkeit" />
        <TweakRadio label="Dichte" value={t.density} options={['komfortabel', 'kompakt']} onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="Großschrift (für draußen)" value={t.big} onChange={(v) => setTweak('big', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
