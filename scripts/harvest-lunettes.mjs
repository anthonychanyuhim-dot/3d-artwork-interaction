// Harvest verified Commons images for the 14 lunettes + 8 severies. For each panel
// we search Commons, keep only File results whose title looks like the right
// Michelangelo ceiling plate (filter on 'michelangelo' + a section word + a name
// keyword), and resolve the first match at <=960px. Writes scripts/lunette-textures.json.
import { writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// id -> { q: search query, keys: name keywords (any match) }
const TARGETS = [
  { id: 'LUN-01', q: 'Michelangelo lunette Aminadab Sistine', keys: ['aminadab'] },
  { id: 'LUN-02', q: 'Michelangelo lunette Naason Sistine', keys: ['naason', 'nahshon'] },
  { id: 'LUN-03', q: 'Michelangelo lunette Salmon Booz Obed Sistine', keys: ['salmon', 'booz', 'obed'] },
  { id: 'LUN-04', q: 'Michelangelo lunette Jesse David Solomon Sistine', keys: ['jesse', 'david', 'salomon', 'solomon', 'iesse'] },
  { id: 'LUN-05', q: 'Michelangelo lunette Roboam Abia Sistine', keys: ['roboam', 'rehoboam', 'abia'] },
  { id: 'LUN-06', q: 'Michelangelo lunette Asa Josaphat Joram Sistine', keys: ['asa', 'josaphat', 'joram'] },
  { id: 'LUN-07', q: 'Michelangelo lunette Ozias Joatham Achaz Sistine', keys: ['ozias', 'uzziah', 'joatham', 'achaz'] },
  { id: 'LUN-08', q: 'Michelangelo lunette Ezechias Manasse Amon Sistine', keys: ['ezechias', 'hezekiah', 'manasse', 'amon'] },
  { id: 'LUN-09', q: 'Michelangelo lunette Josias Jechonias Salathiel Sistine', keys: ['josias', 'josiah', 'jechonias', 'salathiel'] },
  { id: 'LUN-10', q: 'Michelangelo lunette Zorobabel Abiud Eliachim Sistine', keys: ['zorobabel', 'zerubbabel', 'abiud', 'eliachim'] },
  { id: 'LUN-11', q: 'Michelangelo lunette Azor Sadoch Sistine', keys: ['azor', 'sadoch', 'zadok'] },
  { id: 'LUN-12', q: 'Michelangelo lunette Achim Eliud Sistine', keys: ['achim', 'eliud'] },
  { id: 'LUN-13', q: 'Michelangelo lunette Eleazar Mathan Sistine', keys: ['eleazar', 'mathan', 'matthan'] },
  { id: 'LUN-14', q: 'Michelangelo lunette Jacob Joseph Sistine', keys: ['jacob', 'joseph', 'giacobbe', 'giuseppe'] },
  { id: 'ANC-01', q: 'Michelangelo vele Azor Sadoch Sistine', keys: ['azor', 'sadoch', 'zadok'] },
  { id: 'ANC-02', q: 'Michelangelo vele Josias Sistine', keys: ['josias', 'josiah', 'jechonias'] },
  { id: 'ANC-03', q: 'Michelangelo vele Roboam Sistine', keys: ['roboam', 'rehoboam', 'abia'] },
  { id: 'ANC-04', q: 'Michelangelo vele Salmon Sistine', keys: ['salmon', 'booz', 'obed'] },
  { id: 'ANC-05', q: 'Michelangelo vele Achim Sistine', keys: ['achim', 'eliud'] },
  { id: 'ANC-06', q: 'Michelangelo vele Zorobabel Sistine', keys: ['zorobabel', 'zerubbabel'] },
  { id: 'ANC-07', q: 'Michelangelo vele Asa Sistine', keys: ['asa', 'josaphat', 'joram'] },
  { id: 'ANC-08', q: 'Michelangelo vele Jesse Sistine', keys: ['jesse', 'iesse', 'david'] },
];
const SECTION = ['lunette', 'lunetta', 'lunettes', 'vele', 'vela', 'severy', 'antenati', 'ancestor'];

async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', ...params });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  return r.json();
}
async function search(q) {
  const j = await api('commons.wikimedia.org', { action: 'query', list: 'search', srnamespace: '6', srlimit: '12', srsearch: q });
  return (j.query?.search || []).map((h) => h.title);
}
async function resolve(file) {
  const j = await api('commons.wikimedia.org', { action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '960', titles: file });
  const p = Object.values(j.query.pages)[0];
  return p.missing !== undefined ? null : (p.imageinfo?.[0]?.thumburl || null);
}

const out = {};
for (const t of TARGETS) {
  let chosen = null;
  try {
    const hits = await search(t.q);
    chosen = hits.find((title) => {
      const s = title.toLowerCase();
      return s.includes('michelangelo') && SECTION.some((w) => s.includes(w)) && t.keys.some((k) => s.includes(k));
    });
  } catch { /* skip */ }
  if (chosen) {
    await sleep(700);
    const url = await resolve(chosen);
    if (url) { out[t.id] = url; console.log(`[OK]   ${t.id}  <- ${chosen}`); }
    else console.log(`[FAIL] ${t.id}  resolve failed for ${chosen}`);
  } else {
    console.log(`[NONE] ${t.id}  no confident match`);
  }
  await sleep(900);
}

writeFileSync(new URL('./lunette-textures.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`\nResolved ${Object.keys(out).length}/22.`);
