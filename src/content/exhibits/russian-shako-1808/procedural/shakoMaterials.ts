import { DataTexture, DoubleSide, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, RGBAFormat } from 'three'
import { D } from './shako1808Dimensions'

/** Deterministic, tiny, generated microstructure. No photographs or external textures. */
function grain(seed: number, woven = false): DataTexture {
  const size = D.topology.textureSize, data = new Uint8Array(size * size * 4)
  let state = seed
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const value = 100 + (state >>> 26) + (woven ? Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2) * 20 : 0)
    const i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255
  }
  const texture = new DataTexture(data, size, size, RGBAFormat)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(12, 5)
  texture.needsUpdate = true
  return texture
}

export function applyShakoMaterials(root: Group): MeshStandardMaterial {
  const feltMap = grain(1808), leatherMap = grain(1812), clothMap = grain(1, true)
  const leather = new MeshStandardMaterial({ name: 'BlackenedLeather', color: '#101110', roughness: 0.56, metalness: 0, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump })
  const felt = new MeshStandardMaterial({ name: 'FeltBlack', color: '#171817', roughness: 0.94, metalness: 0, bumpMap: feltMap, bumpScale: D.reconstruction.feltBump })
  const visor = new MeshPhysicalMaterial({ name: 'VisorLeather', color: '#111310', roughness: 0.42, clearcoat: 0.12, clearcoatRoughness: 0.5, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump })
  const brass = new MeshStandardMaterial({ name: 'Brass', color: '#b79a50', roughness: 0.36, metalness: 0.88 })
  const cord = new MeshStandardMaterial({ name: 'CordWhite', color: '#e6dfcc', roughness: 0.92, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const white = new MeshStandardMaterial({ name: 'RepyokWhite', color: '#e8e3d3', roughness: 0.95, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const green = new MeshStandardMaterial({ name: 'RepyokGreen', color: '#28563c', roughness: 0.95, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const linen = new MeshStandardMaterial({ name: 'LinenInterior', color: '#b9ac8e', roughness: 0.98, side: DoubleSide, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const inner = new MeshStandardMaterial({ name: 'InteriorLeather', color: '#463629', roughness: 0.85, side: DoubleSide, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump })
  const wood = new MeshStandardMaterial({ name: 'DarkWood', color: '#302a20', roughness: 0.85 })
  const original = new Set<MeshStandardMaterial>()
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    if (o.material instanceof MeshStandardMaterial) original.add(o.material)
    let parent = o.parent, semantic = o.userData.material
    let isCord = false, isInterior = false
    while (parent) {
      semantic ??= parent.userData.material
      isCord ||= parent.name === 'Ethishket'
      isInterior ||= parent.name === 'Interior'
      parent = parent.parent
    }
    o.material = semantic === 'Brass' ? brass
      : isCord ? cord
      : o.name === 'RepyokWhite' ? white : o.name === 'RepyokGreen' ? green
      : o.name === 'DarkWoodBack' ? wood
      : o.name === 'LinenLiner' ? linen : isInterior ? inner
      : o.name.startsWith('Felt') ? felt
      : o.name.startsWith('Visor') ? visor : leather
  })
  original.forEach((m) => m.dispose())
  return leather
}
