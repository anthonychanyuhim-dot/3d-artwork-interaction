// Temporary data-archivist script (safe to delete after the registry is baked).
// Harvests verified fields from official Wikipedia articles via the MediaWiki API:
//   • plain-text intro extract  → source for title / artist / date / story / funFact
//   • 960px lead image from upload.wikimedia.org (CORS: access-control-allow-origin: *)
// Run: node scripts/harvest-sistine.mjs   →  writes scripts/sistine-data.json
import { writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';

// Curated list of DOCUMENTED Sistine works grouped by architectural zone.
const TARGETS = [
  // ---- Ceiling Genesis scenes that have standalone articles ---------------
  { zone: 'ceiling_center', title: 'Separation of Light from Darkness' },
  { zone: 'ceiling_center', title: 'The Creation of Adam' },
  // ---- South wall: Life of Moses (6) -------------------------------------
  { zone: 'side_wall_south', title: 'Moses Leaving for Egypt' },
  { zone: 'side_wall_south', title: 'Youth of Moses' },
  { zone: 'side_wall_south', title: 'The Crossing of the Red Sea (Sistine Chapel)' },
  { zone: 'side_wall_south', title: 'Descent from Mount Sinai (Sistine Chapel)' },
  { zone: 'side_wall_south', title: 'Punishment of the Sons of Korah' },
  { zone: 'side_wall_south', title: 'Testament and Death of Moses' },
  // ---- North wall: Life of Christ (5 with articles) ----------------------
  { zone: 'side_wall_north', title: 'Baptism of Christ (Perugino, Rome)' },
  { zone: 'side_wall_north', title: 'Temptations of Christ (Botticelli)' },
  { zone: 'side_wall_north', title: 'Vocation of the Apostles' },
  { zone: 'side_wall_north', title: 'Delivery of the Keys' },
  { zone: 'side_wall_north', title: 'Last Supper (Rosselli)' },
  // ---- Altar wall ---------------------------------------------------------
  { zone: 'altar_wall', title: 'The Last Judgment (Michelangelo)' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      await sleep(1500 * (i + 1)); // backoff on rate-limit HTML
    }
  }
  throw new Error('rate-limited after retries');
}

async function fetchOne({ zone, title }) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1' +
    '&prop=extracts|pageimages|imageinfo' +
    '&exintro=1&explaintext=1' +
    '&piprop=thumbnail&pithumbsize=960' +
    '&titles=' + encodeURIComponent(title);
  const json = await apiGet(url);
  const page = Object.values(json.query.pages)[0];
  const extract = page.extract || '';
  const thumb = page.thumbnail?.source || null;
  // Heuristics from the verified extract (years + "by <Artist>").
  const years = [...extract.matchAll(/\b(1[0-9]{3})\b/g)].map((m) => +m[1]);
  const artistMatch = extract.match(/by (?:the Italian[^.]*?painter )?([A-Z][a-zà-ÿ]+(?: [A-Z][a-zà-ÿ']+){0,2})/);
  return {
    zone,
    requestedTitle: title,
    resolvedTitle: page.title,
    missing: page.missing !== undefined,
    artistGuess: artistMatch ? artistMatch[1] : null,
    yearsFound: years.length ? [Math.min(...years), Math.max(...years)] : null,
    imageUrl: thumb,
    extract: extract.replace(/\s+/g, ' ').trim().slice(0, 900),
  };
}

const out = [];
for (const t of TARGETS) {
  try {
    const r = await fetchOne(t);
    out.push(r);
    const flag = r.missing ? 'MISSING' : r.imageUrl ? 'OK' : 'NO-IMG';
    console.log(`[${flag}] ${t.zone}  ${r.resolvedTitle}  img=${r.imageUrl ? 'yes' : 'no'}  yrs=${r.yearsFound}`);
  } catch (e) {
    console.log(`[ERROR] ${t.title}: ${e.message}`);
    out.push({ ...t, error: String(e) });
  }
  await sleep(1100); // be polite to the API / avoid rate limiting
}

writeFileSync(new URL('./sistine-data.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`\nWrote ${out.length} records to scripts/sistine-data.json`);
