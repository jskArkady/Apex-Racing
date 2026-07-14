import * as THREE from 'three';

// Physics, rendering, AI and race logic all consume this exact centreline
// height. Keeping the value named (instead of repeating a literal in each
// subsystem) prevents a visual road and its collider from drifting apart.
export const TRACK_CENTERLINE_Y = 0;
// Rendering, lap timing and grid placement share this exact curve progress.
// Moving the painted line therefore cannot silently leave the race trigger behind.
export { START_FINISH_PROGRESS } from './raceConfig.js';

export const DEFAULT_TRACK_ID = 'apex_gp';
const TRACK_ARC_LENGTH_DIVISIONS = 4096;

// Bahrain International Circuit reference, normalized from the official F1
// circuit map. The scale stays close to the original gameplay lap length while
// preserving Sakhir's long pit straight, Turns 1-4, the Turn 8 hairpin, the
// downhill Turn 10 complex and the long return through Turns 13-15.
const BAHRAIN_DEPTH_SCALE = 0.9;
const apexGrandPrixPoints = [
  new THREE.Vector3(79, TRACK_CENTERLINE_Y, 150),       // Start / finish
  new THREE.Vector3(-50, TRACK_CENTERLINE_Y, 150),      // Main straight
  new THREE.Vector3(-175, TRACK_CENTERLINE_Y, 150),     // Turn 1 braking
  new THREE.Vector3(-187, TRACK_CENTERLINE_Y, 147),
  new THREE.Vector3(-197, TRACK_CENTERLINE_Y, 137),
  new THREE.Vector3(-200, TRACK_CENTERLINE_Y, 125),     // Turn 1
  new THREE.Vector3(-200, TRACK_CENTERLINE_Y, 110),     // Turns 2-3
  new THREE.Vector3(-200, TRACK_CENTERLINE_Y, 93),
  new THREE.Vector3(-192, TRACK_CENTERLINE_Y, -70),     // Turn 4 braking
  new THREE.Vector3(-183, TRACK_CENTERLINE_Y, -88),
  new THREE.Vector3(-168, TRACK_CENTERLINE_Y, -98),     // Turn 4
  new THREE.Vector3(-150, TRACK_CENTERLINE_Y, -100),
  new THREE.Vector3(-130, TRACK_CENTERLINE_Y, -92),
  new THREE.Vector3(-110, TRACK_CENTERLINE_Y, -75),     // Turns 5-7
  new THREE.Vector3(-20, TRACK_CENTERLINE_Y, 0),
  new THREE.Vector3(-5, TRACK_CENTERLINE_Y, 18),
  new THREE.Vector3(3, TRACK_CENTERLINE_Y, 32),         // Turn 8 hairpin
  new THREE.Vector3(2, TRACK_CENTERLINE_Y, 46),
  new THREE.Vector3(-8, TRACK_CENTERLINE_Y, 57),
  new THREE.Vector3(-24, TRACK_CENTERLINE_Y, 62),
  new THREE.Vector3(-43, TRACK_CENTERLINE_Y, 58),
  new THREE.Vector3(-63, TRACK_CENTERLINE_Y, 48),
  new THREE.Vector3(-82, TRACK_CENTERLINE_Y, 37),       // Turn 9
  new THREE.Vector3(-98, TRACK_CENTERLINE_Y, 29),
  new THREE.Vector3(-114, TRACK_CENTERLINE_Y, 31),
  new THREE.Vector3(-126, TRACK_CENTERLINE_Y, 41),
  new THREE.Vector3(-130, TRACK_CENTERLINE_Y, 53),      // Turn 10
  new THREE.Vector3(-127, TRACK_CENTERLINE_Y, 66),
  new THREE.Vector3(-119, TRACK_CENTERLINE_Y, 78),
  new THREE.Vector3(-108, TRACK_CENTERLINE_Y, 89),
  new THREE.Vector3(-94, TRACK_CENTERLINE_Y, 96),
  new THREE.Vector3(-75, TRACK_CENTERLINE_Y, 100),
  new THREE.Vector3(-30, TRACK_CENTERLINE_Y, 100),
  new THREE.Vector3(55, TRACK_CENTERLINE_Y, 100),       // Turn 11 straight
  new THREE.Vector3(75, TRACK_CENTERLINE_Y, 98),
  new THREE.Vector3(88, TRACK_CENTERLINE_Y, 88),
  new THREE.Vector3(95, TRACK_CENTERLINE_Y, 73),        // Turn 11
  new THREE.Vector3(96, TRACK_CENTERLINE_Y, 55),
  new THREE.Vector3(92, TRACK_CENTERLINE_Y, 35),
  new THREE.Vector3(84, TRACK_CENTERLINE_Y, 8),         // Turn 12
  new THREE.Vector3(70, TRACK_CENTERLINE_Y, -2),
  new THREE.Vector3(55, TRACK_CENTERLINE_Y, -10),
  new THREE.Vector3(40, TRACK_CENTERLINE_Y, -15),
  new THREE.Vector3(27, TRACK_CENTERLINE_Y, -23),
  new THREE.Vector3(18, TRACK_CENTERLINE_Y, -35),
  new THREE.Vector3(14, TRACK_CENTERLINE_Y, -50),
  new THREE.Vector3(15, TRACK_CENTERLINE_Y, -68),
  new THREE.Vector3(20, TRACK_CENTERLINE_Y, -84),       // Turn 13 approach
  new THREE.Vector3(28, TRACK_CENTERLINE_Y, -96),
  new THREE.Vector3(40, TRACK_CENTERLINE_Y, -104),
  new THREE.Vector3(55, TRACK_CENTERLINE_Y, -108),
  new THREE.Vector3(72, TRACK_CENTERLINE_Y, -106),
  new THREE.Vector3(88, TRACK_CENTERLINE_Y, -98),       // Turn 13
  new THREE.Vector3(100, TRACK_CENTERLINE_Y, -86),
  new THREE.Vector3(106, TRACK_CENTERLINE_Y, -70),
  new THREE.Vector3(109, TRACK_CENTERLINE_Y, -42),      // Back straight
  new THREE.Vector3(113, TRACK_CENTERLINE_Y, -18),
  new THREE.Vector3(119, TRACK_CENTERLINE_Y, 7),
  new THREE.Vector3(127, TRACK_CENTERLINE_Y, 32),
  new THREE.Vector3(137, TRACK_CENTERLINE_Y, 58),
  new THREE.Vector3(148, TRACK_CENTERLINE_Y, 87),
  new THREE.Vector3(158, TRACK_CENTERLINE_Y, 108),      // Turn 14
  new THREE.Vector3(164, TRACK_CENTERLINE_Y, 125),
  new THREE.Vector3(160, TRACK_CENTERLINE_Y, 139),
  new THREE.Vector3(150, TRACK_CENTERLINE_Y, 147),      // Turn 15
  new THREE.Vector3(138, TRACK_CENTERLINE_Y, 150),
  new THREE.Vector3(122, TRACK_CENTERLINE_Y, 150),      // Finish approach
].map(point => point.setZ(point.z * BAHRAIN_DEPTH_SCALE));

// Monaco reference normalized from the official 19-turn map. The ordering is
// Sainte Devote, Casino, the Grand Hotel hairpin, tunnel, Nouvelle chicane,
// Swimming Pool, Rascasse and Anthony Noghes.
const harbourStreetPoints = [
  new THREE.Vector3(-137.5, TRACK_CENTERLINE_Y, -30),
  new THREE.Vector3(-81, TRACK_CENTERLINE_Y, -75),
  new THREE.Vector3(-50, TRACK_CENTERLINE_Y, -50),
  new THREE.Vector3(22, TRACK_CENTERLINE_Y, -20),
  new THREE.Vector3(55, TRACK_CENTERLINE_Y, -2),
  new THREE.Vector3(82, TRACK_CENTERLINE_Y, -30),
  new THREE.Vector3(120, TRACK_CENTERLINE_Y, -40),
  new THREE.Vector3(155, TRACK_CENTERLINE_Y, -38),
  new THREE.Vector3(168, TRACK_CENTERLINE_Y, -20),
  new THREE.Vector3(168, TRACK_CENTERLINE_Y, 5),
  new THREE.Vector3(152, TRACK_CENTERLINE_Y, 22),
  new THREE.Vector3(125, TRACK_CENTERLINE_Y, 23),
  new THREE.Vector3(95, TRACK_CENTERLINE_Y, 44),
  new THREE.Vector3(25, TRACK_CENTERLINE_Y, 38),
  new THREE.Vector3(-5, TRACK_CENTERLINE_Y, 30),
  new THREE.Vector3(-15, TRACK_CENTERLINE_Y, 21),
  new THREE.Vector3(-75, TRACK_CENTERLINE_Y, -42),
  new THREE.Vector3(-105, TRACK_CENTERLINE_Y, -15),
  new THREE.Vector3(-105, TRACK_CENTERLINE_Y, 8),
  new THREE.Vector3(-118, TRACK_CENTERLINE_Y, 23),
  new THREE.Vector3(-125, TRACK_CENTERLINE_Y, 43),
  new THREE.Vector3(-145, TRACK_CENTERLINE_Y, 68),
  new THREE.Vector3(-175, TRACK_CENTERLINE_Y, 68),
  new THREE.Vector3(-195, TRACK_CENTERLINE_Y, 35),
];

// Monza reference normalized from the official map: Rettifilo, Curva Grande,
// Roggia, both Lesmos, Serraglio, Ascari and the long Parabolica return.
const templeSpeedwayPoints = [
  new THREE.Vector3(165, TRACK_CENTERLINE_Y, 121),
  new THREE.Vector3(55, TRACK_CENTERLINE_Y, 121),
  new THREE.Vector3(-22, TRACK_CENTERLINE_Y, 121),
  new THREE.Vector3(-42, TRACK_CENTERLINE_Y, 116),
  new THREE.Vector3(-68, TRACK_CENTERLINE_Y, 96),
  new THREE.Vector3(-105, TRACK_CENTERLINE_Y, 121),
  new THREE.Vector3(-149, TRACK_CENTERLINE_Y, 121),
  new THREE.Vector3(-187, TRACK_CENTERLINE_Y, 99),
  new THREE.Vector3(-209, TRACK_CENTERLINE_Y, 55),
  new THREE.Vector3(-231, TRACK_CENTERLINE_Y, -22),
  new THREE.Vector3(-214, TRACK_CENTERLINE_Y, -38),
  new THREE.Vector3(-205, TRACK_CENTERLINE_Y, -54),
  new THREE.Vector3(-220, TRACK_CENTERLINE_Y, -76),
  new THREE.Vector3(-245, TRACK_CENTERLINE_Y, -100),
  new THREE.Vector3(-240, TRACK_CENTERLINE_Y, -122),
  new THREE.Vector3(-193, TRACK_CENTERLINE_Y, -135),
  new THREE.Vector3(-138, TRACK_CENTERLINE_Y, -88),
  new THREE.Vector3(-28, TRACK_CENTERLINE_Y, 28),
  new THREE.Vector3(-12, TRACK_CENTERLINE_Y, 38),
  new THREE.Vector3(4, TRACK_CENTERLINE_Y, 42),
  new THREE.Vector3(20, TRACK_CENTERLINE_Y, 50),
  new THREE.Vector3(35, TRACK_CENTERLINE_Y, 55),
  new THREE.Vector3(193, TRACK_CENTERLINE_Y, 58),
  new THREE.Vector3(264, TRACK_CENTERLINE_Y, 66),
  new THREE.Vector3(275, TRACK_CENTERLINE_Y, 94),
  new THREE.Vector3(253, TRACK_CENTERLINE_Y, 121),
];

function createTrackPreset({
  id,
  name,
  shortName,
  inspiration,
  description,
  fidelityMarkers,
  points,
  venue,
  roadWidth = 16,
  theme = {},
  environment = {},
  reference,
}) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  // Complex official layouts contain both dense hairpins and long straights.
  // Three's default 200-entry arc-length cache makes getPointAt() jump several
  // metres at those density transitions, which breaks physics continuity.
  curve.arcLengthDivisions = TRACK_ARC_LENGTH_DIVISIONS;
  curve.updateArcLengths();
  const length = curve.getLength();
  const sampledPoints = curve.getSpacedPoints(512);
  const bounds = new THREE.Box3().setFromPoints(sampledPoints);

  return Object.freeze({
    id,
    name,
    shortName,
    inspiration,
    description,
    fidelityMarkers: Object.freeze([...fidelityMarkers]),
    points: Object.freeze(points),
    curve,
    length,
    venue,
    roadWidth,
    reference: Object.freeze({
      ...reference,
      keyFeatures: Object.freeze([...reference.keyFeatures]),
      sceneCues: Object.freeze([...(reference.sceneCues ?? [])]),
    }),
    theme: Object.freeze({
      groundColor: '#101913',
      roadColor: '#353a3b',
      accentColor: '#c7ff36',
      barrierColor: '#bec4be',
      ...theme,
    }),
    environment: Object.freeze({
      skyColor: '#04070d',
      fogColor: '#080d15',
      fogNear: 240,
      fogFar: 880,
      stars: true,
      ambientColor: '#8fa8d2',
      ambientIntensity: 0.48,
      hemisphereSkyColor: '#a8c3ee',
      hemisphereGroundColor: '#252018',
      hemisphereIntensity: 0.74,
      sunColor: '#dce8ff',
      sunIntensity: 2.65,
      sunPosition: Object.freeze([-80, 120, -60]),
      ...environment,
    }),
    bounds: Object.freeze({
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
      width: bounds.max.x - bounds.min.x,
      depth: bounds.max.z - bounds.min.z,
      centerX: (bounds.min.x + bounds.max.x) / 2,
      centerZ: (bounds.min.z + bounds.max.z) / 2,
    }),
  });
}

export const TRACK_PRESETS = Object.freeze([
  createTrackPreset({
    id: DEFAULT_TRACK_ID,
    name: 'Apex Grand Prix',
    shortName: 'Apex GP',
    inspiration: 'Bahrain International Circuit · Sakhir',
    description: 'A floodlit desert lap of long straights, technical switchbacks and heavy braking.',
    fidelityMarkers: ['desert floodlights', 'Sakhir tower', 'tent grandstands', 'Turn 8 hairpin', 'sand runoff'],
    points: apexGrandPrixPoints,
    venue: 'apex',
    roadWidth: 16,
    reference: {
      circuit: 'Bahrain International Circuit',
      source: 'https://www.formula1.com/en/information/bahrain-international-circuit.2CaIdaOTCgQ3Yfnb37NmSS',
      keyFeatures: ['15-turn silhouette', 'desert setting', 'night floodlights', 'Turn 8 hairpin', 'Sakhir tower'],
      sceneSource: 'https://www.formula1.com/en/latest/article/need-to-know-the-most-important-facts-stats-and-trivia-ahead-of-the-2025-bahrain-grand-prix.2UBRH78pLhBrYbZoChAvHZ',
      sceneCues: ['floodlight arrays', 'tiered illuminated tower', 'tent roofs', 'sand runoff', 'night contrast'],
    },
    theme: {
      groundColor: '#6f5a3d',
      roadColor: '#2c2d2c',
      accentColor: '#d8b45c',
      barrierColor: '#d3d0c5',
    },
    environment: {
      skyColor: '#03060b',
      fogColor: '#14141a',
      fogNear: 260,
      fogFar: 940,
      stars: true,
      ambientColor: '#8497bc',
      ambientIntensity: 0.42,
      hemisphereSkyColor: '#9bb5df',
      hemisphereGroundColor: '#5a4026',
      hemisphereIntensity: 0.62,
      sunColor: '#dbe8ff',
      sunIntensity: 2.15,
      sunPosition: [-80, 120, -60],
    },
  }),
  createTrackPreset({
    id: 'harbour_street',
    name: 'Harbour Street',
    shortName: 'Harbour',
    inspiration: 'Circuit de Monaco · Monte Carlo',
    description: 'Armco-lined streets link Casino, the hairpin, tunnel and harbour chicanes.',
    fidelityMarkers: ['harbour water', 'tight hairpin', 'tunnel canopy', 'Nouvelle chicane', 'pastel city towers'],
    points: harbourStreetPoints,
    venue: 'harbour',
    roadWidth: 14.4,
    reference: {
      circuit: 'Circuit de Monaco',
      source: 'https://www.fia.com/system/files/decision-document/2025_monaco_event_-_circuit_map_-_monaco_2025_revised.pdf',
      keyFeatures: ['19-turn silhouette', 'Grand Hotel hairpin', 'tunnel', 'harbour', 'Swimming Pool complex'],
      sceneSource: 'https://www.formula1.com/en/latest/article/what-the-teams-said-friday-in-monaco-2025.67l8tJI399aoINXz8ag7D1',
      sceneCues: ['narrow Armco corridor', 'dense apartment facades', 'tunnel lighting', 'harbour water', 'street markings'],
    },
    theme: {
      groundColor: '#8e8b82',
      roadColor: '#343638',
      accentColor: '#d52e3f',
      barrierColor: '#c8cbc7',
    },
    environment: {
      skyColor: '#7fb5dc',
      fogColor: '#b8d2df',
      fogNear: 260,
      fogFar: 900,
      stars: false,
      ambientColor: '#dbe9f1',
      ambientIntensity: 0.78,
      hemisphereSkyColor: '#d7efff',
      hemisphereGroundColor: '#796b58',
      hemisphereIntensity: 1.05,
      sunColor: '#fff2d4',
      sunIntensity: 3.15,
      sunPosition: [-90, 150, -40],
    },
  }),
  createTrackPreset({
    id: 'temple_speedway',
    name: 'Temple Speedway',
    shortName: 'Temple',
    inspiration: 'Autodromo Nazionale Monza · Italy',
    description: 'Long parkland straights join Rettifilo, Lesmo, Ascari and the Parabolica.',
    fidelityMarkers: ['long straights', 'heavy-braking chicanes', 'park forest', 'Ascari complex', 'historic oval banking'],
    points: templeSpeedwayPoints,
    venue: 'temple',
    roadWidth: 15.2,
    reference: {
      circuit: 'Autodromo Nazionale Monza',
      source: 'https://www.formula1.com/en/information/italy-autodromo-nazionalemonza.FiJN1jnQlRLeHqOxIt13m',
      keyFeatures: ['11-corner silhouette', 'Rettifilo chicane', 'Lesmo pair', 'Ascari complex', 'Parabolica and old banking'],
      sceneSource: 'https://www.formula1.com/en/racing/2025/italy',
      sceneCues: ['parkland canopy', 'grass verges', 'heavy-braking chicanes', 'historic banking', 'red timing tower'],
    },
    theme: {
      groundColor: '#31502d',
      roadColor: '#252826',
      accentColor: '#cf343b',
      barrierColor: '#b9beb8',
    },
    environment: {
      skyColor: '#79add2',
      fogColor: '#a9c5d1',
      fogNear: 300,
      fogFar: 980,
      stars: false,
      ambientColor: '#d7e6e8',
      ambientIntensity: 0.7,
      hemisphereSkyColor: '#d8efff',
      hemisphereGroundColor: '#355432',
      hemisphereIntensity: 0.98,
      sunColor: '#fff1d0',
      sunIntensity: 3.0,
      sunPosition: [-110, 145, -70],
    },
  }),
]);

const TRACK_PRESET_MAP = new Map(TRACK_PRESETS.map(preset => [preset.id, preset]));
const defaultTrackPreset = TRACK_PRESET_MAP.get(DEFAULT_TRACK_ID);

export function isTrackId(trackId) {
  return TRACK_PRESET_MAP.has(trackId);
}

export function getTrackPreset(trackId = DEFAULT_TRACK_ID) {
  return TRACK_PRESET_MAP.get(trackId) ?? defaultTrackPreset;
}

export const trackPoints = defaultTrackPreset.points;

// Create a closed curve shared by track generation, AI, and checkpoints
export const trackCurve = defaultTrackPreset.curve;
export const trackLength = defaultTrackPreset.length;
export const trackBounds = defaultTrackPreset.bounds;

// Get a point and tangent on the curve given a progress percentage (0 to 1)
export function getTrackPointAndTangent(progress, trackId = DEFAULT_TRACK_ID) {
  const numericProgress = Number(progress);
  if (!Number.isFinite(numericProgress)) {
    throw new RangeError('Track progress must be a finite number');
  }

  // JavaScript's remainder keeps the dividend sign, so normalize twice to
  // keep Three.js curve sampling inside its supported [0, 1) domain.
  const t = ((numericProgress % 1.0) + 1.0) % 1.0;
  const curve = getTrackPreset(trackId).curve;
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t);
  return { point, tangent };
}
