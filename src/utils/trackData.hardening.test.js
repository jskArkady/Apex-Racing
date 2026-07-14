import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRACK_ID,
  getTrackPointAndTangent,
  getTrackPreset,
  TRACK_PRESETS,
  TRACK_CENTERLINE_Y,
  trackCurve,
  trackLength,
  trackPoints,
} from './trackData';

describe('getTrackPointAndTangent hardening', () => {
  it('uses the redesigned Grand Prix length envelope', () => {
    expect(trackLength).toBeGreaterThan(1700);
    expect(trackLength).toBeLessThan(1850);
  });

  it('wraps negative progress into the same closed-curve position', () => {
    const negative = getTrackPointAndTangent(-0.25);
    const wrapped = getTrackPointAndTangent(0.75);

    expect(negative.point.distanceTo(wrapped.point)).toBeLessThan(1e-9);
    expect(negative.tangent.distanceTo(wrapped.tangent)).toBeLessThan(1e-9);
  });

  it('preserves finite coercion while rejecting non-finite progress explicitly', () => {
    expect(getTrackPointAndTangent(null).point).toBeDefined();
    expect(getTrackPointAndTangent('0.5').point).toBeDefined();

    for (const progress of [NaN, Infinity, -Infinity, undefined, 'invalid']) {
      expect(() => getTrackPointAndTangent(progress)).toThrow(RangeError);
    }
  });

  it('keeps every control point and more than 10,000 arc-length samples on one plane', () => {
    expect(trackPoints).toHaveLength(67);
    expect(trackPoints.every(point => point.y === TRACK_CENTERLINE_Y)).toBe(true);

    const sampleCount = 16_384;
    for (let index = 0; index <= sampleCount; index += 1) {
      const progress = index / sampleCount;
      const point = trackCurve.getPointAt(progress);
      const tangent = trackCurve.getTangentAt(progress);

      expect(point.y).toBe(TRACK_CENTERLINE_Y);
      expect(tangent.y).toBe(0);
      expect(Number.isFinite(point.x) && Number.isFinite(point.z)).toBe(true);
      expect(Number.isFinite(tangent.x) && Number.isFinite(tangent.z)).toBe(true);
      expect(Math.hypot(tangent.x, tangent.z)).toBeCloseTo(1, 10);
    }
  });

  it('provides two additional F1-inspired selectable circuit presets', () => {
    expect(TRACK_PRESETS.map(track => track.id)).toEqual([
      DEFAULT_TRACK_ID,
      'harbour_street',
      'temple_speedway',
    ]);

    const harbour = getTrackPreset('harbour_street');
    const temple = getTrackPreset('temple_speedway');

    expect(harbour.fidelityMarkers).toEqual(expect.arrayContaining([
      'harbour water',
      'tight hairpin',
      'tunnel canopy',
    ]));
    expect(temple.fidelityMarkers).toEqual(expect.arrayContaining([
      'long straights',
      'heavy-braking chicanes',
      'park forest',
    ]));
    expect(harbour.curve.getPointAt(0).distanceTo(temple.curve.getPointAt(0))).toBeGreaterThan(20);
    expect(Math.abs(harbour.length - temple.length)).toBeGreaterThan(100);
    expect(getTrackPreset(DEFAULT_TRACK_ID).roadWidth).toBe(16);
    expect(harbour.roadWidth).toBe(14.4);
    expect(temple.roadWidth).toBe(15.2);
  });

  it('keeps every selectable circuit closed, flat, finite, and minimap-safe', () => {
    for (const preset of TRACK_PRESETS) {
      expect(preset.curve.closed).toBe(true);
      expect(preset.length).toBeGreaterThan(500);
      expect(preset.bounds.width).toBeGreaterThan(100);
      expect(preset.bounds.depth).toBeGreaterThan(100);
      expect(Object.values(preset.bounds).every(Number.isFinite)).toBe(true);
      expect(preset.roadWidth).toBeGreaterThan(12);
      expect(preset.roadWidth).toBeLessThanOrEqual(16);
      expect(new URL(preset.reference.sceneSource).hostname).toBe('www.formula1.com');
      expect(preset.reference.sceneCues).toHaveLength(5);

      expect(preset.curve.getPointAt(0).distanceTo(preset.curve.getPointAt(1))).toBeLessThan(1e-6);
      expect(preset.curve.getTangentAt(0).angleTo(preset.curve.getTangentAt(1))).toBeLessThan(0.02);

      for (let index = 0; index <= 256; index += 1) {
        const progress = index / 256;
        const point = preset.curve.getPointAt(progress);
        const tangent = preset.curve.getTangentAt(progress);

        expect(point.y).toBe(TRACK_CENTERLINE_Y);
        expect(tangent.y).toBe(0);
        expect(Number.isFinite(point.x) && Number.isFinite(point.z)).toBe(true);
        expect(Number.isFinite(tangent.x) && Number.isFinite(tangent.z)).toBe(true);
      }
    }
  });
});
