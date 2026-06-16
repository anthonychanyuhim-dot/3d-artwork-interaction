// Re-resolve all 16 hero images to 800px-wide thumbnails (full-res files blow up
// GPU memory -> WebGL context loss). Patches the image URLs in the panels JSON.
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FILES = {
  'VIG-01': 'File:Michelangelo, profeti, Zechariah 01.jpg',
  'VIG-02': 'File:Michelangelo, profeti, Joel 01.jpg',
  'VIG-03': 'File:Erythraean.jpg',
  'VIG-04': 'File:Michelangelo, profeti, Ezekiel 01.jpg',
  'VIG-05': 'File:PersianSibylByMichelangelo.jpg',
  'VIG-06': 'File:Michelangelo, profeti, Jeremiah 01.jpg',
  'VIG-07': 'File:Sistine jonah.jpg',
  'VIG-08': 'File:Michelangelo, sibille, libica 01.jpg',
  'VIG-09': 'File:Daniel (Michelangelo).jpg',
  'VIG-10': 'File:CumaeanSibylByMichelangelo.jpg',
  'VIG-11': "File:'Isaiah Sistine Chapel ceiling' by Michelangelo JBU36FXD.jpg",
  'VIG-12': 'File:Michelangelo, sibille, delfica 01.jpg',
  'PEN-01': "File:'Judith and Holofernes' by Michelangelo JBU31.JPG",
  'PEN-02': 'File:David and Goliath (1).png',
  'PEN-03': 'File:SistineChapelCeiling Michelangelo PunishmentOfHaman.jpg',
  'PEN-04': 'File:Michelangelo, Brazen Serpent 02.jpg',
};

async function resolve(file) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    '&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=' + encodeURIComponent(file);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const j = await res.json();
  const p = Object.values(j.query.pages)[0];
  if (p.missing !== undefined) return null;
  return p.imageinfo?.[0]?.thumburl || null;
}

const path = new URL('../src/data/ceilingVault.panels.json', import.meta.url);
let txt = readFileSync(path, 'utf8');
let patched = 0;
for (const [id, file] of Object.entries(FILES)) {
  let url = null;
  try { url = await resolve(file); } catch { /* skip */ }
  if (!url) { console.log(`[NONE] ${id}`); await sleep(900); continue; }
  // Replace this id's existing "image": "..." value, preserving one-line format.
  const re = new RegExp(`("id": "${id}", "image": ")[^"]*(")`);
  if (re.test(txt)) { txt = txt.replace(re, `$1${url}$2`); patched++; console.log(`[OK]   ${id}  ${url.split('/').pop()}`); }
  else console.log(`[MISS] ${id} (no image field found)`);
  await sleep(900);
}
JSON.parse(txt); // validate
writeFileSync(path, txt);
console.log(`\nPatched ${patched}/16 hero URLs to 800px thumbnails.`);
