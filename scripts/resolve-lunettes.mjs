// Resolve the "Michelangelo, lunetta, <names> 01.jpg" + "Michelangelo, vele,
// <name> 01.jpg" Commons series (matches the panel titles) at <=960px, with
// rate-limit backoff. Writes scripts/lunette-textures.json (only files that exist).
import { writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// id -> ordered list of candidate File: names to try.
const CAND = {
  'LUN-01': ['File:Michelangelo, lunetta, Aminadab 01.jpg'],
  'LUN-02': ['File:Michelangelo, lunetta, Naason 01.jpg'],
  'LUN-03': ['File:Michelangelo, lunetta, Salmon - Boaz - Obed 01.jpg'],
  'LUN-04': ['File:Michelangelo, lunetta, Jesse - David - Solomon 01.jpg'],
  'LUN-05': ['File:Michelangelo, lunetta, Rehoboam - Abijah 01.jpg'],
  'LUN-06': ['File:Michelangelo, lunetta, Asa - Jehoshaphat - Joram 01.jpg'],
  'LUN-07': ['File:Michelangelo, lunetta, Uzziah - Jotham - Ahaz 01.jpg'],
  'LUN-08': ['File:Michelangelo, lunetta, Hezekiah - Manasseh - Amon 01.jpg'],
  'LUN-09': ['File:Michelangelo, lunetta, Josiah - Jeconiah - Shealtiel 01.jpg'],
  'LUN-10': ['File:Michelangelo, lunetta, Zerubbabel - Abiud - Eliakim 01.jpg'],
  'LUN-11': ['File:Michelangelo, lunetta, Azor - Zadok 01.jpg'],
  'LUN-12': ['File:Michelangelo, lunetta, Achim - Eliud 01.jpg'],
  'LUN-13': ['File:Michelangelo, lunetta, Eleazar - Matthan 01.jpg'],
  'LUN-14': ['File:Michelangelo, lunetta, Jacob - Joseph 01.jpg'],
  'ANC-01': ['File:Michelangelo, vele, Azor - Zadok 01.jpg', 'File:Michelangelo, vele, Azor 01.jpg'],
  'ANC-02': ['File:Michelangelo, vele, Josiah 01.jpg', 'File:Michelangelo, vele, Josias 01.jpg'],
  'ANC-03': ['File:Michelangelo, vele, Rehoboam 01.jpg', 'File:Michelangelo, vele, Roboam 01.jpg'],
  'ANC-04': ['File:Michelangelo, vele, Salmon 01.jpg'],
  'ANC-05': ['File:Michelangelo, vele, Achim 01.jpg'],
  'ANC-06': ['File:Michelangelo, vele, Zerubbabel 01.jpg', 'File:Michelangelo, vele, Zorobabel 01.jpg'],
  'ANC-07': ['File:Michelangelo, vele, Asa 01.jpg'],
  'ANC-08': ['File:Michelangelo, vele, Jesse 01.jpg'],
};

async function resolve(file, tries = 0) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '960', titles: file,
  });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const txt = await res.text();
  let j;
  try { j = JSON.parse(txt); } catch {
    if (tries < 4) { await sleep(5000 * (tries + 1)); return resolve(file, tries + 1); }
    throw new Error('rate-limited');
  }
  const p = Object.values(j.query.pages)[0];
  return p.missing !== undefined ? null : (p.imageinfo?.[0]?.thumburl || null);
}

const out = {};
for (const [id, files] of Object.entries(CAND)) {
  let got = null;
  for (const f of files) {
    try { got = await resolve(f); } catch { /* keep going */ }
    await sleep(1600);
    if (got) break;
  }
  if (got) { out[id] = got; console.log(`[OK]   ${id}  ${decodeURIComponent(got.split('/').pop())}`); }
  else console.log(`[NONE] ${id}`);
}

writeFileSync(new URL('./lunette-textures.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`\nResolved ${Object.keys(out).length}/22 lunette/severy images.`);
