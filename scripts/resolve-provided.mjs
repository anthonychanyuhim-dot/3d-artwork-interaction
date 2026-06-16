// Resolves the user-requested Commons filenames to their REAL urls via the API
// (the hash-path prefixes in the supplied links were guessed and 404). Falls back
// to the previously-verified URLs in ceiling-textures.json for any that are missing.
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fallback = JSON.parse(readFileSync(new URL('./ceiling-textures.json', import.meta.url), 'utf8'));

// Panel id -> requested Commons File: name (decoded).
const WANT = {
  'PEN-04': 'File:Michelangelo, serpente di bronzo 01.jpg',
  'PEN-03': 'File:Michelangelo, punizione di Aman 01.jpg',
  'PEN-02': 'File:Michelangelo, Davide e Golia 01.jpg',
  'PEN-01': 'File:Michelangelo, Giuditta e Oloferne 01.jpg',
  'VIG-07': 'File:Michelangelo, Giona 01.jpg',
  'VIG-08': 'File:Michelangelo, sibille, libica 01.jpg',
  'VIG-09': 'File:Michelangelo, Daniele 01.jpg',
  'VIG-06': 'File:Michelangelo, Geremia 01.jpg',
  'VIG-12': 'File:Michelangelo, sibille, delfica 01.jpg',
  'VIG-02': 'File:Michelangelo, Giole 01.jpg',
  'VIG-01': 'File:Michelangelo, Zaccaria 01.jpg',
  'VIG-04': 'File:Michelangelo, Ezechiele 01.jpg',
  'VIG-11': 'File:Michelangelo, Isaia 01.jpg',
  'VIG-10': 'File:Michelangelo, sibille, cumaea 01.jpg',
  'VIG-05': 'File:Perzsa.jpg',
  'VIG-03': 'File:Michelangelo, sibille, eritrea 01.jpg',
};

// Extra spelling candidates for ids whose requested name looks off.
const ALT = {
  'VIG-02': ['File:Michelangelo, Gioele 01.jpg'],
};

async function resolve(file) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    '&prop=imageinfo&iiprop=url&iiurlwidth=1280&titles=' + encodeURIComponent(file);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const j = await res.json();
  const p = Object.values(j.query.pages)[0];
  if (p.missing !== undefined) return null;
  return p.imageinfo?.[0]?.thumburl || null;
}

const map = {};
for (const [id, name] of Object.entries(WANT)) {
  const tries = [name, ...(ALT[id] || [])];
  let got = null;
  let used = null;
  for (const t of tries) {
    try { got = await resolve(t); } catch { /* retry next */ }
    if (got) { used = t; break; }
    await sleep(1200);
  }
  if (got) {
    map[id] = got;
    console.log(`[OK]   ${id}  <- ${used}`);
  } else if (fallback[id]) {
    map[id] = fallback[id];
    console.log(`[FALLBACK] ${id}  requested file missing, kept verified URL`);
  } else {
    console.log(`[NONE] ${id}  no image`);
  }
  await sleep(1200);
}

writeFileSync(new URL('./ceiling-textures.json', import.meta.url), JSON.stringify(map, null, 2));
console.log(`\nResolved ${Object.keys(map).length}/16 -> scripts/ceiling-textures.json`);
