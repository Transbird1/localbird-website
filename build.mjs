// Baut die Website für Netlify: setzt die Preise aus preise.json in die Seite ein
// und kopiert alles nach dist/. Netlify führt das bei jeder Änderung automatisch aus.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';

const gruppen = JSON.parse(readFileSync('preise.json', 'utf8'));
const preise = Object.assign({}, ...Object.values(gruppen));
const euro = (n) => new Intl.NumberFormat('de-DE').format(n) + ' €';

const genutzt = new Set();
let html = readFileSync('src/index.html', 'utf8').replace(
  /<span data-preis="([^"]+)">[^<]*<\/span>/g,
  (_, key) => {
    if (!(key in preise)) throw new Error(`Preis "${key}" fehlt in preise.json`);
    genutzt.add(key);
    return `<span data-preis="${key}">${euro(preise[key])}</span>`;
  },
);
const fehlend = Object.keys(preise).filter((k) => !genutzt.has(k));
if (fehlend.length) throw new Error(`Nicht auf der Website: ${fehlend.join(', ')}`);

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
writeFileSync('dist/index.html', html);
for (const p of ['assets', 'fonts', 'buero', 'robots.txt', 'sitemap.xml', '_headers']) {
  cpSync(p, `dist/${p}`, { recursive: true });
}
console.log(`${genutzt.size} Preise eingesetzt.`);
