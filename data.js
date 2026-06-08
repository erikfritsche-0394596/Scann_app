// ERSETZE die load()-Funktion (von "async function load(" bis zum letzten "}")
  // mit dieser hier:

  async function load(url) {
    const live = url || window.DATA_SOURCE_URL;
    if (!live) throw new Error('Keine Datenquelle konfiguriert. Bitte DATA_SOURCE_URL in data.js eintragen.');
    try {
      const products = await fetchCsv(live, 6000);
      return { products, at: new Date(), live: true, src: live, fallback: false };
    } catch (e) {
      throw new Error('Daten konnten nicht geladen werden: ' + String(e.message || e));
    }
  }
