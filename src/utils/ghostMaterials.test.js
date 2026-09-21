import { expect, it, vi } from 'vitest'
import { MeshStandardMaterial } from 'three'
import { createGhostMaterials } from './ghostMaterials'

it('isolates ghost opacity from shared player materials and disposes only its copies', () => {
  const playerMaterial = new MeshStandardMaterial()
  const playerDispose = vi.spyOn(playerMaterial, 'dispose')
  const owner = createGhostMaterials()
  const ghost = owner.get(playerMaterial)
  const ghostDispose = vi.spyOn(ghost, 'dispose')
  expect(ghost.opacity).toBe(0.24)
  expect(ghost.depthWrite).toBe(false)
  expect(playerMaterial.opacity).toBe(1)
  expect(playerMaterial.transparent).toBe(false)
  expect(owner.get(playerMaterial)).toBe(ghost)
  expect(owner.get(ghost)).toBe(ghost)
  owner.dispose()
  expect(ghostDispose).toHaveBeenCalledOnce()
  expect(playerDispose).not.toHaveBeenCalled()
  playerMaterial.dispose()
})
