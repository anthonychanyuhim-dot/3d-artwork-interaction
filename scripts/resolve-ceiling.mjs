// Resolves Commons File: titles -> 1024px thumbnail URLs, merged with the
// sibyl URLs already in ceiling-textures.json. Verified (skips missing files).
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sibyls = JSON.parse(readFileSync(new URL('./ceiling-textures.json', import.meta.url), 'utf8'));

const CANDIDATES = {
  'VIG-01': ['File:Michelangelo, profeti, Zechariah 01.jpg'],
  'VIG-02': ['File:Michelangelo, profeti, Joel 01.jpg', 'File:Joel (Michelangelo).jpg'],
  'VIG-04': ['File:Michelangelo, profeti, Ezekiel 01.jpg'],
  'VIG-06': ['File:Michelangelo, profeti, Jeremiah 01.jpg', 'File:Michelangelo Buonarroti 027.jpg'],
  'VIG-07': ['File:Sistine jonah.jpg'],
  'VIG-09': ['File:Daniel (Michelangelo).jpg'],
  'VIG-11': ["File:'Isaiah Sistine Chapel ceiling' by Michelangelo JBU36FXD.jpg"],
  'PEN-01': ["File:'Judith and Holofernes' by Michelangelo JBU31.JPG"],
  'PEN-02': ['File:David and Goliath (1).png'],
  'PEN-03': ['File:SistineChapelCeiling Michelangelo PunishmentOfHaman.jpg'],
  'PEN-04': ['File:The Brazen Serpent (1).png'],
};

async function resolve(file) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    '&prop=imageinfo&iiprop=url&iiurlwidth=1024&titles=' + encodeURIComponent(file);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const j = await res.json();
  const p = Object.values(j.query.pages)[0];
  if (p.missing !== undefined) return null;
  return p.imageinfo?.[0]?.thumburl || null;
}

const map = { ...sibyls };
for (const [id, files] of Object.entries(CANDIDATES)) {
  let got = null;
  for (const f of files) {
    try { got = await resolve(f); } catch { /* try next */ }
    if (got) break;
    await sleep(700);
  }
  if (got) { map[id] = got; console.log(`[OK]   ${id}  ${got.split('/').pop()}`); }
  else console.log(`[NONE] ${id}`);
  await sleep(700);
}

writeFileSync(new URL('./ceiling-textures.json', import.meta.url), JSON.stringify(map, null, 2));
console.log(`\nTotal resolved: ${Object.keys(map).length}/16`);
