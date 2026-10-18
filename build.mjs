// Baut die Website für Netlify: setzt Preise, Öffnungszeiten, Aktion und Galerie aus den
// JSON-Dateien (im Büro unter /buero bearbeitet) in die Seite ein und kopiert alles nach dist/.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const json = (f) => JSON.parse(readFileSync(f, 'utf8'));
const esc = (t = '') =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Preise
const preise = Object.assign({}, ...Object.values(json('preise.json')));
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

// Öffnungszeiten: aufeinanderfolgende Tage mit gleichen Zeiten werden zusammengefasst
const TAGE = [['mo', 'Mo'], ['di', 'Di'], ['mi', 'Mi'], ['do', 'Do'], ['fr', 'Fr'], ['sa', 'Sa'], ['so', 'So']];
const oz = json('oeffnungszeiten.json');
const zeit = (t) => /^\d{1,2}:\d{2}$/.test(t || '') ? t.padStart(5, '0') : null;
const tage = TAGE.map(([k, name]) => {
  const d = oz[k] || {};
  const von = zeit(d.von), bis = zeit(d.bis);
  if (d.offen && (!von || !bis)) throw new Error(`Öffnungszeit ${name}: bitte Uhrzeit wie 08:00 eintragen`);
  return { name, text: d.offen ? `${von}–${bis}` : 'geschlossen', von, bis, offen: !!d.offen };
});
const gruppen = [];
for (const t of tage) {
  const g = gruppen.at(-1);
  if (g && g.text === t.text) g.bis = t.name; else gruppen.push({ von: t.name, bis: t.name, text: t.text });
}
const label = (g) => (g.von === g.bis ? g.von : `${g.von}–${g.bis}`);
const offen = gruppen.filter((g) => g.text !== 'geschlossen');
const minuten = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
const ozJson = JSON.stringify(Object.fromEntries(tage.filter((t) => t.offen).map((t) => [t.name, [minuten(t.von), minuten(t.bis)]])));
const fill = (key, val) => { html = html.split(`{{${key}}}`).join(val); };
fill('OEFFNUNG_KURZ', offen.map((g) => `${label(g)} ${g.text}`).join(' · '));
fill('OEFFNUNG_TABELLE', gruppen.map((g) => `<span>${label(g)}</span><span>${g.text}</span>`).join(''));
fill('OEFFNUNG_FUSS', offen.map((g) => `${label(g)} ${g.text}`).join('<br>'));
fill('OEFFNUNG_JSON', ozJson);

// Aktions-Banner
const ak = json('aktion.json');
const heute = new Date().toISOString().slice(0, 10);
const zeigen = ak.aktiv && ak.text && (!ak.bis || ak.bis >= heute);
fill('AKTION', zeigen
  ? `<div class="aktion"${ak.bis ? ` data-bis="${esc(ak.bis)}"` : ''}><div class="wrap"><span>${esc(ak.text)}</span>${ak.button ? `<a href="https://wa.me/4921529809661" target="_blank" rel="noopener">${esc(ak.button)}</a>` : ''}</div></div>`
  : '');

// Galerie
const bilder = json('galerie.json').bilder || [];
fill('GALERIE', bilder.filter((b) => b.bild).map((b) => {
  const src = b.bild.replace(/^\//, '');
  if (!existsSync(src)) throw new Error(`Galerie-Bild fehlt: ${b.bild}`);
  return `<figure class="shot"><img src="${esc(src)}" alt="${esc(b.alt || b.titel)}" loading="lazy" width="800" height="1000"><figcaption><b>${esc(b.titel)}</b>${esc(b.text)}</figcaption></figure>`;
}).join('\n        '));

const rest = html.match(/\{\{[A-Z_]+\}\}/);
if (rest) throw new Error(`Platzhalter nicht ersetzt: ${rest[0]}`);

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
writeFileSync('dist/index.html', html);
for (const p of ['assets', 'fonts', 'buero', 'robots.txt', 'sitemap.xml', '_headers']) {
  cpSync(p, `dist/${p}`, { recursive: true });
}
console.log(`${genutzt.size} Preise, ${bilder.length} Galerie-Bilder, Aktion ${zeigen ? 'an' : 'aus'}.`);
