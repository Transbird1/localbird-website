# LocalBird Website

Statische Website von LocalBird GmbH, gehostet bei Netlify (www.local-bird.de).

- `src/index.html`: die Seite. Preise stehen als `<span data-preis="…">` darin.
- `preise.json`: alle Preise. Wird im Büro unter /buero (Sveltia CMS) bearbeitet.
- `build.mjs`: setzt die Preise ein und baut nach `dist/` (Netlify: `node build.mjs`).
- `buero/`: das Büro (Sveltia CMS 0.224.0, MIT-Lizenz, selbst gehostet) mit `config.yml`.

Lokal bauen: `node build.mjs`

Preise ändern: www.local-bird.de/buero (Anmeldung mit GitHub). Nach dem Speichern baut Netlify die Seite automatisch neu.
