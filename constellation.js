// constellation.js - your constellation: all eight characters as one code
// (v171; the code only in v172, named from your scores since v190).
//
// The owner, 2026-10-02: the eight regions' characters combine 4^8 = 65,536
// ways, and every combination should have a name. Hand-naming 65,536 is not
// possible, so the code names it: one letter per region, from your character
// there, in Overview's order and read four and four (TGPE-AWRC). The letters
// stay Latin in Thai too, as an MBTI code does. Each combination has its own.
//
// v171 also gave 16 type names; v172 dropped them (the owner: with 32
// characters already, a type is redundant and frames you as less of one).
// No code claims to be rare. With a region still lacking a character there is
// no code, only how many regions are left.

import { RADAR_KEYS } from "./chart.js";
import { characterFor } from "./characters.js";
import { t, tp } from "./i18n.js";

export const POSSIBLE = 4 ** RADAR_KEYS.length;

// Each region's letters in cast order [both, first only, second only,
// neither], unique within the region (the owner approved them, 2026-10-02).
export const CODE_LETTERS = {
  finance: ["T", "M", "S", "V"],             // Treasurer, Merchant, Sage, Vendor
  physical: ["G", "C", "H", "P"],            // Guide, Climber, Herder, Pilgrim
  mental: ["P", "B", "F", "W"],              // Poet, Boatman, Fisher, Wayfarer
  relationships: ["E", "H", "K", "N"],       // Elder, Host, Hearthkeeper, Newcomer
  personalGoals: ["A", "B", "P", "T"],       // Artisan, Blacksmith, Apprentice, Tinkerer
  socialContribution: ["W", "A", "H", "T"],  // Wayfinder, Almsgiver, Helper, Traveller
  environment: ["R", "G", "H", "S"],         // Ranger, Gardener, Hermit, Scout
  humanityFuture: ["C", "F", "V", "S"]       // Captain, Farmer, Voyager, Stargazer
};

// The code for eight cast indices in region order.
export function constellationCode(indices) {
  const letters = RADAR_KEYS.map((key, i) => CODE_LETTERS[key][indices[i]]).join("");
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

// --- the name (v190) --------------------------------------------------------
//
// The owner, 2026-10-03: name every constellation, and let every word of the
// name come from your scores, each with the story of why. The name is a figure
// already in the sky, from your two strongest regions (28 pairs). The subtitle
// is "The {word} {thing}": the word from the gap between your highest and
// lowest region, the thing from your character in your strongest region.
// 4 x 32 = 128 subtitles; the code stays the unique one. Built on call so the
// words follow the language switch.

// Region letters in RADAR_KEYS order, for the family keys below.
const REGION_LETTER = ["M", "H", "S", "C", "W", "X", "D", "L"];

// Each pair of strongest regions, letters in region order: [name, line].
const buildFamilies = () => ({
  MH: [t("Taurus"), t("The bull: a steady strength that keeps the store full.")],
  MS: [t("Libra"), t("The scales: what you have and how you feel, held level.")],
  MC: [t("The Big Dipper"), t("Seven bright stars that never set: plenty, shared with your own.")],
  MW: [t("Draco"), t("The dragon that guards the golden apples: what you build, kept safe.")],
  MX: [t("Canopus"), t("The star travellers greeted as good fortune: having enough to share.")],
  MD: [t("Spica"), t("The ear of wheat: a harvest that comes from looking after the land.")],
  ML: [t("Carina"), t("The keel of a ship built for a long voyage: provisions for later.")],
  HS: [t("Cygnus"), t("The swan: a strong body gliding on calm water.")],
  HC: [t("Gemini"), t("The twins who would not be parted: strength that is shared.")],
  HW: [t("Orion's Belt"), t("The plough: the body's daily work, turning ground for something new.")],
  HX: [t("Hercules"), t("Labours carried out for other people.")],
  HD: [t("Boötes"), t("The herdsman walking the fields, at home outdoors.")],
  HL: [t("Aquila"), t("The eagle that flies highest and sees farthest.")],
  SC: [t("Corona Borealis"), t("The crown given in kindness: a heart that mends among people.")],
  SW: [t("Lyra"), t("Orpheus' lyre: a quiet mind that makes things.")],
  SX: [t("Centaurus"), t("Chiron, the healer who taught: calm that helps others.")],
  SD: [t("Delphinus"), t("The dolphin: a mind at ease in open water.")],
  SL: [t("Polaris"), t("The still star the sky turns around: a steady mind, looking far.")],
  CW: [t("Vega and Altair"), t("The weaver and the cowherd: love, and the work of your hands.")],
  CX: [t("Pleiades"), t("The chicks who followed the hen into the sky: togetherness that gives.")],
  CD: [t("Capella"), t("The goat who fed the young: care for everything living.")],
  CL: [t("Ursa Minor"), t("The little bear that carries the North Star: the people who point you on.")],
  WX: [t("Crux"), t("The cross that southern sailors steered by: skill put to other people's use.")],
  WD: [t("Pegasus"), t("The winged horse whose hoof opened a spring: making things that give back.")],
  WL: [t("Perseus"), t("The hero with a plan and a long road ahead.")],
  XD: [t("Aquarius"), t("The water-bearer pouring for everyone.")],
  XL: [t("Columba"), t("The dove sent ahead to find new land: giving toward what comes next.")],
  DL: [t("Sirius"), t("The star that heralded the Nile's flood: reading what the land will need.")]
});

// The gap between your highest and lowest region, read as a word: a gap below
// GAP_BANDS[i] takes word i.
export const GAP_BANDS = [15, 30, 45, 101];
const buildWords = () => [
  [t("Steady"), t("your eight regions sit close together: nothing races ahead, nothing is left behind.")],
  [t("Rising"), t("one or two regions are lifting above the rest, and the others are within reach.")],
  [t("Bright"), t("your strongest regions shine clearly above the others.")],
  [t("Bold"), t("your strengths stand far out from the rest: a sky lit in a few strong places.")]
];

// Your character in your strongest region, as a thing: [thing, why], in each
// region's cast order (characters.js).
const buildThings = () => ({
  finance: [[t("Vault"), t("kept full, with a steady hand")], [t("Caravan"), t("always on the move, trading")], [t("Measure"), t("knowing what enough looks like")], [t("Stall"), t("built up one day at a time")]],
  physical: [[t("Trail"), t("walked every week, home in time to rest")], [t("Summit"), t("all energy, aimed high")], [t("Meadow"), t("the slow path, taken well")], [t("Path"), t("the whole mountain still ahead")]],
  mental: [[t("Mirror"), t("calm water that shows the good things")], [t("Oar"), t("pulling hard and feeling good")], [t("Tide"), t("quiet for now, and tides come back")], [t("Lantern"), t("a light you carry through a heavy stretch")]],
  relationships: [[t("Hall"), t("room for everyone you are close to")], [t("Table"), t("where everyone gathers")], [t("Hearth"), t("few people, all of them warm")], [t("Doorway"), t("your people are on the other side")]],
  personalGoals: [[t("Loom"), t("learning and delivering, thread by thread")], [t("Anvil"), t("reliable work, struck true")], [t("Sketchbook"), t("full of ideas, many still drawing")], [t("Workbench"), t("ideas laid out, waiting their turn")]],
  socialContribution: [[t("Compass"), t("time, money and heart, pointed outward")], [t("Bowl"), t("giving steadily, out of habit")], [t("Bridge"), t("the wish to help, still being built")], [t("Road"), t("your own way, for now")]],
  environment: [[t("Grove"), t("careful habits and a light footprint")], [t("Garden"), t("caring a lot, even in the city")], [t("Clearing"), t("a light footprint, without trying")], [t("Treeline"), t("just arriving at the edge of the woods")]],
  humanityFuture: [[t("Ship"), t("stocked and ready for any weather")], [t("Granary"), t("full stores and skills you trust")], [t("Sail"), t("travelling light, at home anywhere")], [t("Telescope"), t("the view ahead just opening")]]
});

const scoreOf = (v) => (Number.isFinite(v) ? Math.round(v) : 0);

// The name for eight region scores and eight cast indices, both in region
// order. A tie for strongest goes to the region that comes first.
export function constellationName(scores, indices) {
  const s = RADAR_KEYS.map((_, i) => scoreOf(scores[i]));
  const [top, second] = s.map((_, i) => i).sort((a, b) => s[b] - s[a] || a - b);
  const pair = [top, second].sort((a, b) => a - b).map(i => REGION_LETTER[i]).join("");
  const [title, line] = buildFamilies()[pair];
  const gap = Math.max(...s) - Math.min(...s);
  const [word, wordWhy] = buildWords()[GAP_BANDS.findIndex(below => gap < below)];
  const [thing, thingWhy] = buildThings()[RADAR_KEYS[top]][indices[top]];
  return {
    title,
    subtitle: tp("The {word} {thing}", { word, thing }),
    line, word, wordWhy, thing, thingWhy, gap,
    strongest: [RADAR_KEYS[top], RADAR_KEYS[second]],
    strongestScores: [s[top], s[second]]
  };
}

// Your constellation, or null with no state. Until every region has a
// character: { complete: false, code: null, left }.
export function constellationFor(state) {
  if (!state) return null;
  const indices = RADAR_KEYS.map(key => characterFor(state, key)?.index ?? null);
  const left = indices.filter(i => i === null).length;
  if (left) return { complete: false, code: null, left };
  const scores = RADAR_KEYS.map(key => state.aspects?.[key]);
  return { complete: true, code: constellationCode(indices), left: 0, name: constellationName(scores, indices) };
}
