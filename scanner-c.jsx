// ── search tab ───────────────────────────────────────────────
// ERSETZE den bisherigen "search tab" Block (von "const q2 = ..." bis "  );" vor historyTab)
// mit diesem hier:

  const q2 = q.trim().toLowerCase();

  // Token-Suche: jedes Wort muss irgendwo matchen ("mares flosse" → findet "Mares Quattro+ Geräteflosse")
  const tokenMatch = (s, tokens) => tokens.every((t) => s.includes(t));

  // Alle verfügbaren Marken & Kategorien aus den Produkten sammeln
  const allBrands = useMemo(() => [...new Set(PRODUCTS.map((p) => p.brand).filter(Boolean))].sort(), [PRODUCTS]);
  const allCats   = useMemo(() => [...new Set(PRODUCTS.map((p) => p.cat).filter(Boolean))].sort(), [PRODUCTS]);

  const [filterBrand, setFilterBrand] = useState(null);
  const [filterCat,   setFilterCat]   = useState(null);

  const tokens2 = q2.length >= 2 ? q2.split(/\s+/).filter(Boolean) : [];
  const SEARCH_CAP = 40;

  const matches = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const s = p._s || (p.name + ' ' + p.brand + ' ' + p.art + ' ' + p.cat + ' ' + (p.allEans || []).join(' ')).toLowerCase();
      const textOk  = tokens2.length === 0 || tokenMatch(s, tokens2);
      const brandOk = !filterBrand || p.brand === filterBrand;
      const catOk   = !filterCat   || p.cat   === filterCat;
      return textOk && brandOk && catOk;
    });
  }, [PRODUCTS, tokens2, filterBrand, filterCat]);

  const shown = matches.slice(0, SEARCH_CAP);
  const activeFilters = (filterBrand ? 1 : 0) + (filterCat ? 1 : 0);

  // Chip-Komponente
  const Chip = ({ label, active, onPress }) => (
    <button
      onClick={onPress}
      style={{
        flexShrink: 0,
        height: 30,
        padding: '0 12px',
        borderRadius: 20,
        border: `1.5px solid ${active ? T.accent : T.border}`,
        background: active ? T.accent : T.card,
        color: active ? (T.dark ? '#06131f' : '#fff') : T.ink,
        fontSize: F(12),
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {label}{active ? ' ×' : ''}
    </button>
  );

  const searchTab = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <Header title="Suche" sub={`${PRODUCTS.length.toLocaleString('de-DE')} Artikel im Sortiment`} />

      {/* Suchfeld */}
      <div style={{ padding: `12px ${T.pad}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.field, borderRadius: 12, padding: '10px 14px', border: `1px solid ${T.border}`, boxShadow: T.tileShadow }}>
          {Icon.search(T.mute, 18)}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, Marke, Art.-Nr. oder EAN"
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: F(15), color: T.ink, background: 'transparent', fontFamily: 'inherit' }}
          />
          {(q || activeFilters > 0) && (
            <button
              onClick={() => { setQ(''); setFilterBrand(null); setFilterCat(null); }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              {Icon.close(T.mute, 18)}
            </button>
          )}
        </div>
      </div>

      {/* Filter-Chips: Marken */}
      <div style={{ padding: `8px ${T.pad}px 0` }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip label="Alle Marken" active={!filterBrand} onPress={() => setFilterBrand(null)} />
          {allBrands.map((b) => (
            <Chip key={b} label={b} active={filterBrand === b} onPress={() => setFilterBrand(filterBrand === b ? null : b)} />
          ))}
        </div>
      </div>

      {/* Filter-Chips: Kategorien */}
      <div style={{ padding: `4px ${T.pad}px 6px` }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip label="Alle Kategorien" active={!filterCat} onPress={() => setFilterCat(null)} />
          {allCats.map((c) => (
            <Chip key={c} label={c} active={filterCat === c} onPress={() => setFilterCat(filterCat === c ? null : c)} />
          ))}
        </div>
      </div>

      {/* Ergebnisse */}
      <div style={{ flex: 1, overflow: 'auto', padding: `0 ${T.pad}px ${T.pad}px`, display: 'flex', flexDirection: 'column', gap: T.gap - 2 }}>
        {tokens2.length === 0 && !filterBrand && !filterCat ? (
          <div style={{ textAlign: 'center', color: T.mute, marginTop: 40, fontSize: F(14), lineHeight: 1.5 }}>
            Mindestens 2 Zeichen eingeben<br />oder Marke / Kategorie antippen
          </div>
        ) : shown.length ? (
          <>
            <div style={{ fontSize: F(12), color: T.mute, paddingTop: 8 }}>
              {matches.length} Treffer{activeFilters > 0 ? ` · ${activeFilters} Filter aktiv` : ''}
            </div>
            {shown.map((p, i) => <ListRow key={(p.ean || p.id) + '_' + i} p={p} />)}
            {matches.length > SEARCH_CAP && (
              <div style={{ textAlign: 'center', color: T.mute, fontSize: F(12), padding: '8px 0 4px' }}>
                +{(matches.length - SEARCH_CAP).toLocaleString('de-DE')} weitere · Suche verfeinern
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: T.mute, marginTop: 50, fontSize: F(14) }}>
            Keine Treffer{q ? ` für „${q}"` : ''}{activeFilters > 0 ? ' mit diesen Filtern' : ''}
          </div>
        )}
      </div>
    </div>
  );
