// Data-archivist script for the ceiling figures (Prophets, Sibyls, Pendentives).
// Harvests verified lead images from Wikipedia via the MediaWiki API (same pattern
// as harvest-sistine.mjs). Writes an id -> imageUrl map for ceilingTextures.ts.
// Run: node scripts/harvest-ceiling.mjs  ->  writes scripts/ceiling-textures.json
import { writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';

// Panel id -> best candidate Wikipedia article title(s) to try in order.
const TARGETS = [
  { id: 'VIG-01', titles: ['Zechariah (Michelangelo)'] },
  { id: 'VIG-02', titles: ['Joel (Michelangelo)'] },
  { id: 'VIG-03', titles: ['Erythraean Sibyl', 'Erythraean Sibyl (Michelangelo)'] },
  { id: 'VIG-04', titles: ['Ezekiel (Michelangelo)'] },
  { id: 'VIG-05', titles: ['Persian Sibyl'] },
  { id: 'VIG-06', titles: ['Jeremiah (Michelangelo)'] },
  { id: 'VIG-07', titles: ['Jonah (Michelangelo)'] },
  { id: 'VIG-08', titles: ['Libyan Sibyl'] },
  { id: 'VIG-09', titles: ['Daniel (Michelangelo)'] },
  { id: 'VIG-10', titles: ['Cumaean Sibyl'] },
  { id: 'VIG-11', titles: ['Isaiah (Michelangelo)'] },
  { id: 'VIG-12', titles: ['Delphic Sibyl'] },
  { id: 'PEN-01', titles: ['Judith and Holofernes (Michelangelo)', 'Judith and Holofernes'] },
  { id: 'PEN-02', titles: ['David and Goliath (Michelangelo)'] },
  { id: 'PEN-03', titles: ['Punishment of Haman', 'The Punishment of Haman'] },
  { id: 'PEN-04', titles: ['The Brazen Serpent (Michelangelo)', 'Brazen Serpent (Michelangelo)'] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error('rate-limited after retries');
}

async function fetchImage(title) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1' +
    '&prop=pageimages&piprop=thumbnail&pithumbsize=960' +
    '&titles=' + encodeURIComponent(title);
  const json = await apiGet(url);
  const page = Object.values(json.query.pages)[0];
  return {
    resolvedTitle: page.title,
    missing: page.missing !== undefined,
    imageUrl: page.thumbnail?.source || null,
  };
}

const map = {};
for (const t of TARGETS) {
  let done = false;
  for (const title of t.titles) {
    try {
      const r = await fetchImage(title);
      if (!r.missing && r.imageUrl) {
        map[t.id] = r.imageUrl;
        console.log(`[OK]   ${t.id}  <- ${r.resolvedTitle}`);
        done = true;
        break;
      }
      console.log(`[skip] ${t.id}  "${title}" missing=${r.missing} img=${!!r.imageUrl}`);
    } catch (e) {
      console.log(`[ERR]  ${t.id}  "${title}": ${e.message}`);
    }
    await sleep(1100);
  }
  if (!done) console.log(`[NONE] ${t.id}  no image resolved`);
  await sleep(1100);
}

writeFileSync(new URL('./ceiling-textures.json', import.meta.url), JSON.stringify(map, null, 2));
console.log(`\nResolved ${Object.keys(map).length}/${TARGETS.length} images -> scripts/ceiling-textures.json`);
