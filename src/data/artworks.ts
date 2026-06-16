/**
 * Sistine Chapel master registry.
 *
 * Every entry's title / artist / date / story / funFact and Wikimedia Commons
 * image URL were harvested from the official Wikipedia articles via
 * `scripts/harvest-sistine.mjs` (run it to regenerate `scripts/sistine-data.json`).
 * No text is AI-generated — it is distilled strictly from those verified extracts.
 *
 * Coverage: the documented NARRATIVE works — the ceiling Genesis scenes that have
 * standalone articles, the full Life of Moses (south) and Life of Christ (north)
 * 15th-century cycles, and the altar wall. Purely decorative elements (individual
 * ignudi, every ancestor lunette) are omitted: Wikipedia does not document them
 * per-piece, and inventing their text would violate the verified-only rule.
 */

import { ceilingVaultArtworks } from './ceilingVaultRegistry';

/** Architectural zone within the chapel — drives layout + grouping. */
export type ArtworkZone =
  | 'ceiling_center'
  | 'ceiling_spandrel'
  | 'ceiling_vault'
  | 'side_wall_south'
  | 'side_wall_north'
  | 'altar_wall';

export interface ArtworkData {
  id: string;
  title: string;
  artist: string;
  description: string;
  textureUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number];
  focusOffset: number;
  cameraUp?: [number, number, number];
  wikiUrl?: string;
  date: string;
  story: string;
  funFact: string;
  /** Architectural zone. Layout (GalleryScene) groups + arranges by this. */
  zone: ArtworkZone;
  /** Order within a zone's sequence (altar → entrance), for head-to-tail layout. */
  sequence: number;
  /**
   * Years the piece was/is physically present on the wall (chronological timeline).
   * `endYear` is the present (2026) for surviving works. The renderer shows only
   * works active in the current timeline year.
   */
  activePeriod: { startYear: number; endYear: number };
}

const coreArtworks: ArtworkData[] = [
  // ===========================================================================
  // CEILING — Genesis narrative (those with standalone Wikipedia articles)
  // ===========================================================================
  {
    id: 'separation-of-light',
    title: 'The Separation of Light from Darkness',
    artist: 'Michelangelo',
    description:
      "The first of the nine central Genesis panels of Michelangelo's Sistine ceiling.",
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Michelangelo%2C_Separation_of_Light_from_Darkness_00.jpg/960px-Michelangelo%2C_Separation_of_Light_from_Darkness_00.jpg',
    position: [0, 10.6, -20],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 7.22],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 0,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: '1512',
    story:
      "From the perspective of the Genesis chronology, the first of the nine central panels running down the centre of the ceiling. God, swept up in a spiral of drapery, divides the light from the surrounding darkness — based on Genesis 1:3–5.",
    funFact:
      'Although it is first in the Genesis chronology, it was the last of the nine central panels Michelangelo painted, probably completed in the summer of 1512.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Separation_of_Light_from_Darkness',
  },
  {
    id: 'creation-sun-moon-plants',
    title: 'The Creation of the Sun, Moon and Plants',
    artist: 'Michelangelo',
    description: 'God creates the Sun and Moon and brings forth plant life.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Michelangelo%2C_Creation_of_the_Sun%2C_Moon%2C_and_Plants_01.jpg/960px-Michelangelo%2C_Creation_of_the_Sun%2C_Moon%2C_and_Plants_01.jpg',
    position: [0, 10.6, -14],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 4.06],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 1,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: '1511–1512',
    story:
      "One of the three 'Creation' pictures, drawn from the first chapter of Genesis: God, shown twice in the same panel, creates the Sun and Moon and brings forth the plants of the earth.",
    funFact:
      'It lies in the altar half of the ceiling, the second campaign — the section Michelangelo painted last, working backwards from the entrance toward the altar.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },
  {
    id: 'separation-earth-waters',
    title: 'The Separation of the Earth from the Waters',
    artist: 'Michelangelo',
    description: 'God divides the waters from the dry land.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Michelangelo%2C_Separation_of_the_Earth_from_the_Waters_00.jpg/960px-Michelangelo%2C_Separation_of_the_Earth_from_the_Waters_00.jpg',
    position: [0, 10.6, -9],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 6.05],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 2,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: '1511–1512',
    story:
      "Also called the Separation of Land and Water, the third of the central 'Creation' scenes: God, borne aloft by angels, separates the gathered waters from the dry land.",
    funFact:
      'Part of the altar half of the ceiling, painted in the second campaign after the preliminary unveiling of 14 August 1511.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },
  {
    id: 'creation-of-adam',
    title: 'The Creation of Adam',
    artist: 'Michelangelo',
    description:
      "A monumental fresco on the Sistine ceiling in which God breathes life into Adam.",
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/960px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
    position: [0, 10.6, -4],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 3.63],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 3,
    activePeriod: { startYear: 1508, endYear: 2026 },
    date: '1508–1512',
    story:
      'It illustrates the Biblical creation narrative from the Book of Genesis in which God gives life to Adam, the first man. The fresco is chronologically the fourth in the series of central panels depicting episodes from Genesis.',
    funFact:
      "Michelangelo's Creation of Adam is one of the most replicated religious paintings of all time, reproduced in countless imitations and parodies.",
    wikiUrl: 'https://en.wikipedia.org/wiki/The_Creation_of_Adam',
  },
  {
    id: 'creation-of-eve',
    title: 'The Creation of Eve',
    artist: 'Michelangelo',
    description: 'Eve rises from the side of the sleeping Adam.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Michelangelo%2C_Creation_of_Eve_00.jpg/960px-Michelangelo%2C_Creation_of_Eve_00.jpg',
    position: [0, 10.6, 1],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 5.89],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 4,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: '1510',
    story:
      'At the very centre of the nine-scene sequence, God summons Eve, who rises from the side of the sleeping Adam — set in the vault’s fifth bay.',
    funFact:
      'Michelangelo finished this central panel in September 1510, closing the first campaign of work on the ceiling.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },
  {
    id: 'expulsion-from-eden',
    title: 'The Fall and Expulsion from the Garden of Eden',
    artist: 'Michelangelo',
    description: 'The temptation of Adam and Eve and their expulsion from Paradise.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Michelangelo%2C_Fall_and_Expulsion_from_Garden_of_Eden_00.jpg/960px-Michelangelo%2C_Fall_and_Expulsion_from_Garden_of_Eden_00.jpg',
    position: [0, 10.6, 5],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 3.5],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 5,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: '1510–1511',
    story:
      'A single panel uniting two moments: the serpent tempting Adam and Eve at the Tree of Knowledge, and the angel driving them out of Paradise.',
    funFact:
      'From this middle phase onward Michelangelo enlarged his figures, having learned to judge the foreshortening as seen from the floor far below.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },
  {
    id: 'sacrifice-of-noah',
    title: 'The Sacrifice of Noah',
    artist: 'Michelangelo',
    description: 'Noah and his family offer a sacrifice of thanksgiving.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Michelangelo%2C_Sacrifice_of_Noah_00.jpg/960px-Michelangelo%2C_Sacrifice_of_Noah_00.jpg',
    position: [0, 10.6, 10],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 5.36],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 6,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: 'c. 1508–1509',
    story:
      'Noah and his family offer a sacrifice of thanksgiving, one of the three Noah scenes toward the entrance end of the ceiling.',
    funFact:
      "Though it follows the Flood in scripture, on the ceiling it sits before The Great Flood; a pair of ignudi flank it beside the Prophet Isaiah.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },
  {
    id: 'the-deluge',
    title: 'The Deluge',
    artist: 'Michelangelo',
    description: 'A sprawling ceiling scene of the Great Flood.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/El_Diluvio.jpg/960px-El_Diluvio.jpg',
    position: [0, 10.6, 15],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 5.34],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 7,
    activePeriod: { startYear: 1508, endYear: 2026 },
    date: 'c. 1508–1509',
    story:
      'One of the nine Genesis scenes along the ceiling. After humanity sinks into sin and disgrace, it is punished by the Great Flood; crowds struggle toward higher ground and a boat as the waters rise.',
    funFact:
      'It belongs to the first half of the ceiling, completed before the preliminary unveiling on 14 August 1511; Michelangelo painted the Genesis scenes working backwards from the Noah panels near the entrance.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },
  {
    id: 'drunkenness-of-noah',
    title: 'The Drunkenness of Noah',
    artist: 'Michelangelo',
    description: 'Noah lies drunk and exposed; his sons cover him.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Michelangelo%2C_Drunkenness_of_Noah_00.jpg/960px-Michelangelo%2C_Drunkenness_of_Noah_00.jpg',
    position: [0, 10.6, 20],
    rotation: [Math.PI / 2, 0, 0],
    dimensions: [8, 5.57],
    cameraUp: [0, 0, 1],
    focusOffset: 4,
    zone: 'ceiling_center',
    sequence: 8,
    activePeriod: { startYear: 1512, endYear: 2026 },
    date: 'c. 1508–1509',
    story:
      'The final scene of the ceiling narrative: Noah, having planted a vineyard, lies drunk and exposed while his sons Shem and Japheth cover him and Ham mocks.',
    funFact:
      'It was the very first panel Michelangelo painted, at the west (entrance) end, before working backwards through the narrative toward the altar.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling',
  },

  // ===========================================================================
  // SOUTH WALL — Life of Moses cycle (altar → entrance)
  // ===========================================================================
  {
    id: 'moses-leaving-egypt',
    title: 'Moses Leaving for Egypt',
    artist: 'Pietro Perugino',
    description: 'Opening scene of the Life of Moses cycle.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Pietro_Perugino_cat13d.jpg/960px-Pietro_Perugino_cat13d.jpg',
    position: [-8.85, 4.2, -15],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_south',
    sequence: 0,
    activePeriod: { startYear: 1482, endYear: 2026 },
    date: 'c. 1482',
    story:
      'A fresco by Pietro Perugino and his workshop depicting a journey by the prophet Moses as he leaves for Egypt, opening the Life of Moses cycle on the chapel’s south wall.',
    funFact:
      'The Moses cycle was painted directly opposite the Life of Christ cycle, drawing a typological parallel between the Old and New Testaments.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Moses_Leaving_for_Egypt',
  },
  {
    id: 'youth-of-moses',
    title: 'The Youth of Moses',
    artist: 'Sandro Botticelli',
    description: 'A continuous narrative of episodes from the youth of Moses.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Eventos_de_la_vida_de_Mois%C3%A9s_%28Sandro_Botticelli%29.jpg/960px-Eventos_de_la_vida_de_Mois%C3%A9s_%28Sandro_Botticelli%29.jpg',
    position: [-8.85, 4.2, -9],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_south',
    sequence: 1,
    activePeriod: { startYear: 1481, endYear: 2026 },
    date: '1481–1482',
    story:
      "Botticelli's continuous narrative weaves together several episodes of Moses' youth from Exodus — slaying the Egyptian and fleeing, defending Jethro's daughters at the well, and the burning bush.",
    funFact:
      'Throughout the crowded scene Moses is always identifiable by his yellow dress and green cloak; it parallels the Temptations of Christ on the opposite wall.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Youth_of_Moses',
  },
  {
    id: 'crossing-red-sea',
    title: 'The Crossing of the Red Sea',
    artist: 'Cosimo Rosselli (attributed)',
    description: 'The Israelites cross the Red Sea as Pharaoh’s army drowns.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Cosimo_Rosselli_Attraversamento_del_Mar_Rosso.jpg/960px-Cosimo_Rosselli_Attraversamento_del_Mar_Rosso.jpg',
    position: [-8.85, 4.2, -3],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_south',
    sequence: 2,
    activePeriod: { startYear: 1481, endYear: 2026 },
    date: '1481–1482',
    story:
      'Of uncertain attribution but assigned to Cosimo Rosselli, it depicts the crossing of the Red Sea by the Israelites, from chapter 14 of the Book of Exodus.',
    funFact:
      'Part of the cycle commissioned by Pope Sixtus IV, after whom the Sistine Chapel is named.',
    wikiUrl: 'https://en.wikipedia.org/wiki/The_Crossing_of_the_Red_Sea_(Sistine_Chapel)',
  },
  {
    id: 'descent-mount-sinai',
    title: 'The Descent from Mount Sinai',
    artist: 'Cosimo Rosselli',
    description: 'Moses receives and presents the Ten Commandments.',
    textureUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Moses_Rosselli.jpg',
    position: [-8.85, 4.2, 3],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_south',
    sequence: 3,
    activePeriod: { startYear: 1481, endYear: 2026 },
    date: '1481–1482',
    story:
      'Cosimo Rosselli and his assistants show the prophet Moses in the process of receiving and introducing the Ten Commandments on Mount Sinai.',
    funFact:
      'It belongs to the cycle painted by the team of Florentine and Umbrian masters summoned to Rome in 1481.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Descent_from_Mount_Sinai_(Sistine_Chapel)',
  },
  {
    id: 'punishment-korah',
    title: 'The Punishment of the Sons of Korah',
    artist: 'Sandro Botticelli',
    description: 'The divine punishment of those who rebelled against Moses and Aaron.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Botticcelli%2C_Sandro_-_The_Punishment_of_Korah_and_the_Stoning_of_Moses_and_Aaron_-_1481-82.jpg/960px-Botticcelli%2C_Sandro_-_The_Punishment_of_Korah_and_the_Stoning_of_Moses_and_Aaron_-_1481-82.jpg',
    position: [-8.85, 4.2, 9],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_south',
    sequence: 4,
    activePeriod: { startYear: 1480, endYear: 2026 },
    date: '1480–1482',
    story:
      "Botticelli's fresco, also called the Punishment of the Rebels, shows the divine punishment of Korah and those who challenged the God-given authority of Moses and Aaron.",
    funFact:
      "A central triumphal arch dominates the scene — Botticelli's contribution to the south wall, executed 1480–1482.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Punishment_of_the_Sons_of_Korah',
  },
  {
    id: 'testament-death-moses',
    title: 'The Testament and Death of Moses',
    artist: 'Luca Signorelli & Bartolomeo della Gatta',
    description: 'The final episodes of the life of Moses, closing the cycle.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Signorelli%2C_Luca_-_Moses%27s_Testament_and_Death_-_1481-82.jpg/960px-Signorelli%2C_Luca_-_Moses%27s_Testament_and_Death_-_1481-82.jpg',
    position: [-8.85, 4.2, 15],
    rotation: [0, Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_south',
    sequence: 5,
    activePeriod: { startYear: 1482, endYear: 2026 },
    date: 'c. 1482',
    story:
      'Attributed to Luca Signorelli and Bartolomeo della Gatta, it depicts the final episodes of the life of Moses — his testament and death — closing the Life of Moses cycle.',
    funFact:
      'It hangs opposite the Last Supper, pairing the close of Moses’ story with the institution of the Eucharist.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Testament_and_Death_of_Moses',
  },

  // ===========================================================================
  // NORTH WALL — Life of Christ cycle (altar → entrance)
  // ===========================================================================
  {
    id: 'baptism-of-christ',
    title: 'The Baptism of Christ',
    artist: 'Pietro Perugino',
    description: 'Opening scene of the Life of Christ cycle.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Pietro_Perugino_-_Baptism_of_Christ_-_Sistine_Chapel_-_cat13a.jpg/960px-Pietro_Perugino_-_Baptism_of_Christ_-_Sistine_Chapel_-_cat13a.jpg',
    position: [8.85, 4.2, -12],
    rotation: [0, -Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_north',
    sequence: 0,
    activePeriod: { startYear: 1482, endYear: 2026 },
    date: 'c. 1482',
    story:
      "Perugino's symmetrical composition shows John baptizing Christ in the Jordan beneath God the Father and the descending dove of the Holy Spirit, opening the Life of Christ cycle.",
    funFact:
      'The landscape includes a symbolic view of Rome, recognizable by a triumphal arch, the Colosseum and the Pantheon.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Baptism_of_Christ_(Perugino,_Rome)',
  },
  {
    id: 'temptations-of-christ',
    title: 'The Temptations of Christ',
    artist: 'Sandro Botticelli',
    description: 'The three temptations of Christ by the Devil.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/05_Tentaciones_de_Cristo_%28Botticelli%29.jpg/960px-05_Tentaciones_de_Cristo_%28Botticelli%29.jpg',
    position: [8.85, 4.2, -6],
    rotation: [0, -Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_north',
    sequence: 1,
    activePeriod: { startYear: 1480, endYear: 2026 },
    date: '1480–1482',
    story:
      "Botticelli's fresco depicts the three temptations of Christ by the Devil, set before a depiction of a contemporary Roman building.",
    funFact:
      'It parallels the Youth of Moses on the opposite wall, part of the Old/New Testament typological scheme.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Temptations_of_Christ_(Botticelli)',
  },
  {
    id: 'vocation-apostles',
    title: 'The Vocation of the Apostles',
    artist: 'Domenico Ghirlandaio',
    description: 'Christ calls Peter and Andrew to become his disciples.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Ghirlandaio%2C_Domenico_-_Calling_of_the_Apostles_-_1481.jpg/960px-Ghirlandaio%2C_Domenico_-_Calling_of_the_Apostles_-_1481.jpg',
    position: [8.85, 4.2, 0],
    rotation: [0, -Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_north',
    sequence: 2,
    activePeriod: { startYear: 1481, endYear: 2026 },
    date: '1481–1482',
    story:
      'Domenico Ghirlandaio depicts the Gospel narrative of Jesus Christ calling Peter and Andrew to become his disciples.',
    funFact:
      'Executed 1481–1482 as part of the Life of Christ cycle on the chapel’s north wall.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Vocation_of_the_Apostles',
  },
  {
    id: 'delivery-of-keys',
    title: 'The Delivery of the Keys',
    artist: 'Pietro Perugino',
    description: 'Christ gives the keys of the kingdom to Saint Peter.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Entrega_de_las_llaves_a_San_Pedro_%28Perugino%29.jpg/960px-Entrega_de_las_llaves_a_San_Pedro_%28Perugino%29.jpg',
    position: [8.85, 4.2, 6],
    rotation: [0, -Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_north',
    sequence: 3,
    activePeriod: { startYear: 1481, endYear: 2026 },
    date: '1481–1482',
    story:
      "Perugino's 'Christ Giving the Keys to Saint Peter' shows Christ handing the keys of the kingdom to Peter — the scriptural basis of papal primacy — before an ideal piazza with a domed temple.",
    funFact:
      'Its rigorous one-point perspective, converging on the temple at the vanishing point, makes it a landmark of Renaissance spatial composition.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Delivery_of_the_Keys',
  },
  {
    id: 'last-supper',
    title: 'The Last Supper',
    artist: "Cosimo Rosselli & Biagio d'Antonio",
    description: 'Christ and the apostles at the Last Supper.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Cosimo_Rosselli_Ultima_cena.jpg/960px-Cosimo_Rosselli_Ultima_cena.jpg',
    position: [8.85, 4.2, 12],
    rotation: [0, -Math.PI / 2, 0],
    dimensions: [2.4, 1.7],
    focusOffset: 3,
    zone: 'side_wall_north',
    sequence: 4,
    activePeriod: { startYear: 1481, endYear: 2026 },
    date: '1481–1482',
    story:
      "Cosimo Rosselli and Biagio d'Antonio depict the Last Supper, with Judas seated apart on the near side of the table.",
    funFact:
      'Behind the figures, windows open onto scenes of Christ’s Passion, linking the supper to the coming sacrifice.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Last_Supper_(Rosselli)',
  },

  // ===========================================================================
  // ALTAR WALL
  // ===========================================================================
  {
    id: 'the-last-judgment',
    title: 'The Last Judgment',
    artist: 'Michelangelo',
    description: 'The Second Coming of Christ, covering the whole altar wall.',
    textureUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Last_Judgement_%28Michelangelo%29.jpg/960px-Last_Judgement_%28Michelangelo%29.jpg',
    position: [0, 5, -24.85],
    rotation: [0, 0, 0],
    dimensions: [7, 8.5],
    cameraUp: [0, 1, 0],
    focusOffset: 7,
    zone: 'altar_wall',
    sequence: 0,
    activePeriod: { startYear: 1541, endYear: 2026 },
    date: '1536–1541',
    story:
      'Covering the whole altar wall, it depicts the Second Coming of Christ and the final, eternal judgment of all humanity: the dead rise and descend to their fates, judged by Christ surrounded by prominent saints. Altogether there are over 300 figures.',
    funFact:
      'Nearly all of the more than 300 figures were originally shown as nudes; many were later partly covered up by painted draperies, some removed in recent cleaning and restoration.',
    wikiUrl: 'https://en.wikipedia.org/wiki/The_Last_Judgment_(Michelangelo)',
  },
];

/**
 * The live registry the whole app consumes: the hand-authored core works plus the
 * 24 derived ceiling-vault figures (Prophets, Sibyls, Ancestors, Pendentives).
 * The nine Genesis scenes already live above as `ceiling_center` and are not
 * duplicated by the ceiling-vault builder.
 */
export const artworksRegistry: ArtworkData[] = [...coreArtworks, ...ceilingVaultArtworks];
