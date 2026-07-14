import { describe, expect, it } from 'vitest';
import { getTrackPreset } from './trackData';

const GRID_SIZE = 64;
const CURVE_SAMPLE_COUNT = 512;
const MATCH_TOLERANCE = 4 / (GRID_SIZE - 1);
const MINIMUM_COVERAGE = 0.8;

// Each mask is a 64x64 extraction of the coloured centreline in the linked
// official Formula 1 map. The extraction fits the map into a square without
// stretching its aspect ratio. Keeping the factual bitmap instead of another
// control polygon makes this oracle independent from the product curve points.
const REFERENCE_CIRCUITS = Object.freeze({
  apex_gp: Object.freeze({
    circuit: 'Bahrain International Circuit',
    source: 'https://www.fia.com/system/files/decision-document/2025_bahrain_grand_prix_-_event_notes_-_circuit_map_v4.pdf',
    maskSource: 'https://media.formula1.com/image/upload/c_lfill%2Cw_3392/q_auto/v1740000001/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit.webp',
    productSource: 'https://www.formula1.com/en/information/bahrain-international-circuit.2CaIdaOTCgQ3Yfnb37NmSS',
    mask: `
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000003c000000000000006e000000000000006600000000000000630000000c000000418000003f00000
        040c000003300000040600000618000004030000040c00000c0180000c0c00000c00e00008060000080038001802000008000c00180300000800040010018000
        0800060010018000080006001000c000180004001000400018000400100060001000040018003000100006000c0030001000030007001800100001c003e00800
        000000e00078000000000030001c00000000001c000600000000000e00020000000e000300030000201800e100010180203000ff000100c06060000000010040
        6060000000030060607fffffffff003060000007fffc003020000000000000182000000000000008300000000000000c10000000000000061000000000000004
        30000000000000036000000000000001c000000000000007e07fff800000001ee07ffffffffffff8000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
      `.replace(/\s/g, ''),
    requiredKeyFeatures: Object.freeze(['15-turn silhouette', 'desert setting', 'night floodlights', 'Turn 8 hairpin', 'Sakhir tower']),
    requiredFidelityMarkers: Object.freeze(['desert floodlights', 'Sakhir tower', 'tent grandstands', 'Turn 8 hairpin', 'sand runoff']),
    timeOfDay: 'night',
  }),
  harbour_street: Object.freeze({
    circuit: 'Circuit de Monaco',
    source: 'https://www.fia.com/system/files/decision-document/2025_monaco_event_-_circuit_map_-_monaco_2025_revised.pdf',
    maskSource: 'https://media.formula1.com/image/upload/t_16by9Centre/c_lfill%2Cw_3392/q_auto/v1740000001/fom-website/2026/Monaco/2026trackmontecarlodetailed.webp',
    productSource: 'https://www.fia.com/system/files/decision-document/2025_monaco_event_-_circuit_map_-_monaco_2025_revised.pdf',
    mask: `
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        0000000000000000000000000000000000006000000000000001f8000000000000079c0000000000000e7e00000000000019ff800000000000370fc000000060
        006e030000007ff000cc01cc0003f030011800ee00030038031800378002007e03180019e00200670610000c380600630c0000078c0600670c000002c70c006e
        1880000073fc00181b8000003cf00030378000000f0000603400000003c000002c00000000780c0068000000000ffc00680000000001e0005800000000000000
        d800000000000000c800000000000000e80000000000000018000000000000000800000000000000000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
      `.replace(/\s/g, ''),
    requiredKeyFeatures: Object.freeze(['19-turn silhouette', 'Grand Hotel hairpin', 'tunnel', 'harbour', 'Swimming Pool complex']),
    requiredFidelityMarkers: Object.freeze(['harbour water', 'tight hairpin', 'tunnel canopy', 'Nouvelle chicane', 'pastel city towers']),
    timeOfDay: 'day',
  }),
  temple_speedway: Object.freeze({
    circuit: 'Autodromo Nazionale Monza',
    source: 'https://www.fia.com/system/files/decision-document/2025_monza_event_-_circuit_map_-_monza_2025_0.pdf',
    maskSource: 'https://media.formula1.com/image/upload/c_lfill%2Cw_3392/q_auto/v1740000001/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Italy_Circuit.webp',
    productSource: 'https://www.formula1.com/en/information/italy-autodromo-nazionalemonza.FiJN1jnQlRLeHqOxIt13m',
    mask: `
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        1e60000000000000f820000000000000c0300000000000008018000000000000c008000000000000000c00000000000000060000000000000002000000000000
        000300000000000000018000000000001000c0000000000018006000000000001c00300000000000040018000000000004000c00000000000400060000000000
        04000300000000000600018000000000060000c0000000000200006000000000020000300000000002000018000000000200000fc0000000030000007f000000
        030000000ffc1ffe01000000000000030180000000000001008000000000000100c00000000000030060000000000006003807800000000c000c1effffffffe0
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
      `.replace(/\s/g, ''),
    requiredKeyFeatures: Object.freeze(['11-corner silhouette', 'Rettifilo chicane', 'Lesmo pair', 'Ascari complex', 'Parabolica and old banking']),
    requiredFidelityMarkers: Object.freeze(['long straights', 'heavy-braking chicanes', 'park forest', 'Ascari complex', 'historic oval banking']),
    timeOfDay: 'day',
  }),
});

function decodeReferenceMask(mask) {
  if (mask.length !== GRID_SIZE * GRID_SIZE / 4) {
    throw new RangeError(`Expected a ${GRID_SIZE}x${GRID_SIZE} reference mask`);
  }

  const points = [];
  for (let nibbleIndex = 0; nibbleIndex < mask.length; nibbleIndex += 1) {
    const nibble = Number.parseInt(mask[nibbleIndex], 16);
    for (let bitIndex = 0; bitIndex < 4; bitIndex += 1) {
      if ((nibble & (1 << (3 - bitIndex))) === 0) continue;
      const cell = nibbleIndex * 4 + bitIndex;
      points.push([
        (cell % GRID_SIZE) / (GRID_SIZE - 1),
        Math.floor(cell / GRID_SIZE) / (GRID_SIZE - 1),
      ]);
    }
  }
  return points;
}

function normalizePreservingAspectRatio(points) {
  const xValues = points.map(point => point[0]);
  const yValues = points.map(point => point[1]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height);

  if (!Number.isFinite(scale) || width <= 0 || height <= 0) {
    throw new RangeError('Circuit samples must span finite non-zero bounds');
  }

  const offsetX = (1 - width / scale) / 2;
  const offsetY = (1 - height / scale) / 2;
  return points.map(point => [
    (point[0] - minX) / scale + offsetX,
    (point[1] - minY) / scale + offsetY,
  ]);
}

function samplePresetCurve(preset) {
  return normalizePreservingAspectRatio(Array.from({ length: CURVE_SAMPLE_COUNT }, (_, index) => {
    const point = preset.curve.getPointAt(index / CURVE_SAMPLE_COUNT);
    return [point.x, point.z];
  }));
}

function matchedFraction(source, target) {
  const toleranceSquared = MATCH_TOLERANCE ** 2;
  let matches = 0;

  for (const point of source) {
    const matched = target.some(candidate => {
      const deltaX = point[0] - candidate[0];
      const deltaY = point[1] - candidate[1];
      return deltaX * deltaX + deltaY * deltaY <= toleranceSquared;
    });
    if (matched) matches += 1;
  }

  return matches / source.length;
}

function measurePoints(actual, reference) {
  const expected = decodeReferenceMask(reference.mask);
  const actualCoverage = matchedFraction(actual, expected);
  const referenceCoverage = matchedFraction(expected, actual);
  const coverage = 2 * actualCoverage * referenceCoverage
    / (actualCoverage + referenceCoverage || 1);

  return {
    actualCoverage,
    referenceCoverage,
    referenceCells: expected.length,
    coverage,
  };
}

function measureSilhouette(preset, reference) {
  return measurePoints(samplePresetCurve(preset), reference);
}

function colorLuminance(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) throw new TypeError(`Expected a six-digit hex colour, received ${color}`);
  const channels = [0, 2, 4].map(offset => (
    Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255
  ));
  return channels.reduce((sum, channel) => sum + channel, 0) / channels.length;
}

const silhouetteCases = Object.entries(REFERENCE_CIRCUITS).map(([trackId, reference]) => {
  const metrics = measureSilhouette(getTrackPreset(trackId), reference);
  return [reference.circuit, metrics.coverage.toFixed(4), trackId, reference, metrics];
});

describe('official circuit silhouette fidelity', () => {
  it.each(silhouetteCases)(
    '%s coverage %s is at least 0.80',
    (circuit, _score, trackId, reference, metrics) => {
      expect(metrics.referenceCells).toBeGreaterThan(150);
      expect(metrics.referenceCells).toBeLessThan(600);
      expect(
        metrics.actualCoverage,
        `${circuit} (${trackId}) actual-outline coverage ${metrics.actualCoverage.toFixed(4)}`,
      ).toBeGreaterThanOrEqual(MINIMUM_COVERAGE);
      expect(
        metrics.referenceCoverage,
        `${circuit} (${trackId}) reference-outline coverage ${metrics.referenceCoverage.toFixed(4)}`,
      ).toBeGreaterThanOrEqual(MINIMUM_COVERAGE);
      expect(
        metrics.coverage,
        `${circuit} (${trackId}) bidirectional coverage ${metrics.coverage.toFixed(4)}; `
          + `actual ${metrics.actualCoverage.toFixed(4)}, `
          + `reference ${metrics.referenceCoverage.toFixed(4)}; `
          + `four-cell tolerance; official mask source ${reference.maskSource}`,
      ).toBeGreaterThanOrEqual(MINIMUM_COVERAGE);
    },
  );

  it('rejects wrong circuit pairings and a generic oval at the same threshold', () => {
    const entries = Object.entries(REFERENCE_CIRCUITS);
    for (const [actualTrackId] of entries) {
      for (const [referenceTrackId, reference] of entries) {
        if (actualTrackId === referenceTrackId) continue;
        const metrics = measureSilhouette(getTrackPreset(actualTrackId), reference);
        expect(
          metrics.coverage,
          `${actualTrackId} must not satisfy the ${referenceTrackId} reference`,
        ).toBeLessThan(MINIMUM_COVERAGE);
      }
    }

    const genericOval = Array.from({ length: CURVE_SAMPLE_COUNT }, (_, index) => {
      const angle = index / CURVE_SAMPLE_COUNT * Math.PI * 2;
      return [0.5 + Math.cos(angle) * 0.48, 0.5 + Math.sin(angle) * 0.24];
    });
    for (const reference of Object.values(REFERENCE_CIRCUITS)) {
      expect(measurePoints(genericOval, reference).coverage).toBeLessThan(MINIMUM_COVERAGE);
    }
  });
});

describe('circuit reference metadata and venue identity', () => {
  it.each(Object.entries(REFERENCE_CIRCUITS))(
    '%s declares an authoritative source and its required identity markers',
    (trackId, reference) => {
      const preset = getTrackPreset(trackId);
      const productSource = new URL(preset.reference.source);
      const sceneSource = new URL(preset.reference.sceneSource);
      const oracleSource = new URL(reference.source);
      const maskSource = new URL(reference.maskSource);

      expect(preset.reference.circuit).toBe(reference.circuit);
      expect(preset.reference.source).toBe(reference.productSource);
      expect(['www.fia.com', 'www.formula1.com']).toContain(productSource.hostname);
      expect(productSource.protocol).toBe('https:');
      expect(sceneSource.hostname).toBe('www.formula1.com');
      expect(sceneSource.protocol).toBe('https:');
      expect(oracleSource.hostname).toBe('www.fia.com');
      expect(oracleSource.pathname).toMatch(/circuit_map.*\.pdf$/);
      expect(maskSource.hostname).toBe('media.formula1.com');
      expect(maskSource.pathname).toMatch(/\.webp$/);
      expect(preset.reference.keyFeatures).toEqual(expect.arrayContaining(reference.requiredKeyFeatures));
      expect(preset.reference.sceneCues).toHaveLength(5);
      expect(preset.fidelityMarkers).toEqual(expect.arrayContaining(reference.requiredFidelityMarkers));
    },
  );

  it('keeps Bahrain at night and Monaco and Monza in daylight', () => {
    for (const [trackId, reference] of Object.entries(REFERENCE_CIRCUITS)) {
      const environment = getTrackPreset(trackId).environment;
      if (reference.timeOfDay === 'night') {
        expect(environment.stars, `${trackId} should render at night`).toBe(true);
        expect(colorLuminance(environment.skyColor)).toBeLessThan(0.08);
      } else {
        expect(environment.stars, `${trackId} should render in daylight`).toBe(false);
        expect(colorLuminance(environment.skyColor)).toBeGreaterThan(0.45);
      }
    }
  });
});
