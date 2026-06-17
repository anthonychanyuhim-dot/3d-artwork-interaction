// Find exact Commons filenames for the lunettes that the constructed-name pass
// missed, via search + filter, and merge into scripts/lunette-textures.json.
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'SistineGalleryArchivist/1.0 (educational project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const path = new URL('./lunette-textures.json', import.meta.url);
const out = JSON.parse(readFileSync(path, 'utf8'));

const MISSING = [
  { id: 'LUN-01', q: 'Michelangelo lunetta Aminadab', keys: ['aminadab'] },
  { id: 'LUN-02', q: 'Michelangelo lunetta Naason', keys: ['naason'] },
  { id: 'LUN-06', q: 'Michelangelo lunetta Asa Josaphat Joram', keys: ['asa', 'josaphat', 'joram'] },
  { id: 'LUN-08', q: 'Michelangelo lunetta Hezekiah Manasseh Amon', keys: ['hezekiah', 'ezechias', 'manass', 'amon'] },
  { id: 'LUN-09', q: 'Michelangelo lunetta Josiah Jeconiah Shealtiel', keys: ['josiah', 'josias', 'jeconiah', 'jechon', 'shealtiel', 'salathiel'] },
  { id: 'LUN-13', q: 'Michelangelo lunetta Eleazar Matthan', keys: ['eleazar', 'mathan', 'matthan'] },
];

async function apiText(params, tries = 0) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const t = await r.text();
  try { return JSON.parse(t); } catch {
    if (tries < 5) { await sleep(6000 * (tries + 1)); return apiText(params, tries + 1); }
    throw new Error('rate-limited');
  }
}

for (const m of MISSING) {
  const j = await apiText({ action: 'query', list: 'search', srnamespace: '6', srlimit: '15', srsearch: m.q });
  const hits = (j.query?.search || []).map((h) => h.title);
  const chosen = hits.find((title) => {
    const s = title.toLowerCase();
    return s.includes('michelangelo') && (s.includes('lunett') || s.includes('antenati')) && m.keys.some((k) => s.includes(k));
  });
  if (chosen) {
    await sleep(2000);
    const ji = await apiText({ action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '960', titles: chosen });
    const p = Object.values(ji.query.pages)[0];
    const url = p.missing !== undefined ? null : (p.imageinfo?.[0]?.thumburl || null);
    if (url) { out[m.id] = url; console.log(`[OK]   ${m.id}  <- ${chosen}`); }
    else console.log(`[FAIL] ${m.id}  ${chosen}`);
  } else {
    console.log(`[NONE] ${m.id}  candidates: ${hits.slice(0, 4).join(' | ')}`);
  }
  await sleep(2500);
}

writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`\nTotal lunette/severy images now: ${Object.keys(out).length}`);
