// Formula cars share tyre and mechanical materials. A ghost must own its
// translucent copies rather than changing resources used by the player's car.
export function createGhostMaterials() {
  const copies = new Map()
  const owned = new Set()
  return {
    get(original) {
      if (!original || owned.has(original)) return original
      if (!copies.has(original)) {
        const copy = original.clone()
        copy.transparent = true
        copy.opacity = 0.24
        copy.depthWrite = false
        copies.set(original, copy)
        owned.add(copy)
      }
      return copies.get(original)
    },
    dispose() {
      for (const material of owned) material.dispose()
      copies.clear()
      owned.clear()
    },
  }
}
