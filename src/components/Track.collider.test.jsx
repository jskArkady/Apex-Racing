import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TriMeshFlags } from '@dimforge/rapier3d-compat'
import Track from './Track'
import { TRACK_PRESETS } from '../utils/trackData'

describe('track physics colliders', () => {
  it('fixes internal triangle-edge normals on road and barrier trimeshes', () => {
    const { container } = render(<Track />)
    const colliders = container.querySelectorAll('[data-testid="trimesh-collider"]')

    expect(colliders).toHaveLength(2)
    for (const collider of colliders) {
      expect(Number(collider.dataset.vertexCount)).toBeGreaterThan(0)
      expect(Number(collider.dataset.indexCount)).toBeGreaterThan(0)
      expect(Number(collider.dataset.flags)).toBe(TriMeshFlags.FIX_INTERNAL_EDGES)
    }
  })

  it.each(TRACK_PRESETS.map(track => [track.name, track]))(
    'builds finite road and barrier colliders for %s',
    (_name, track) => {
      const { container } = render(<Track track={track} />)
      const colliders = container.querySelectorAll('[data-testid="trimesh-collider"]')

      expect(colliders).toHaveLength(2)
      for (const collider of colliders) {
        expect(Number(collider.dataset.vertexCount)).toBeGreaterThan(0)
        expect(Number(collider.dataset.indexCount)).toBeGreaterThan(0)
        expect(Number(collider.dataset.flags)).toBe(TriMeshFlags.FIX_INTERNAL_EDGES)
      }
    }
  )
})
