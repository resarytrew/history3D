import { DataTexture, MeshStandardMaterial, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three'

/** Deterministic, original PBR maps; no museum pixels or runtime shader patches. */
export function pistolMaterials() {
  function surface(kind: 'wood' | 'steel' | 'brass', seed: number) {
    const size = 512, color = new Uint8Array(size * size * 4), rough = new Uint8Array(color.length)
    const heights = new Float32Array(size * size), normal = new Uint8Array(color.length)
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2
      const noise = random(), cloud = Math.sin(u * 3 + Math.sin(v * 2)) * Math.cos(v * 3 - Math.sin(u))
      const wave = v * 79 + Math.sin(u * 2) * 2 + Math.sin(u * 5 + v * 2) * .3
      const grain = Math.pow(.5 + .5 * Math.sin(wave), 10)
      const pore = Math.pow(.5 + .5 * Math.sin(v * 103 + Math.sin(u * 4) * 4), 30)
      const mark = kind === 'wood' ? -grain * 5 - pore * 2 : Math.sin(u * 193 + Math.sin(v) * .3) * 1.2
      const variation = cloud * (kind === 'wood' ? 3 : 4) + (noise - .5) * 5 + mark
      const base = kind === 'wood' ? [76, 62, 44] : kind === 'steel' ? [107, 109, 109] : [139, 123, 87]
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++) color[i + c] = Math.max(0, Math.min(255, base[c] + variation * (c === 0 ? 1 : .8)))
      color[i + 3] = 255
      const r = (kind === 'wood' ? 204 : kind === 'steel' ? 151 : 166) + cloud * 9 + (noise - .5) * 10
      rough.set([r, r, r, 255], i)
      heights[y * size + x] = kind === 'wood' ? -grain * .035 - pore * .02 + noise * .01 : noise * .016 + mark * .003
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const h = (dx: number, dy: number) => heights[((y + dy + size) % size) * size + (x + dx + size) % size]
      const dx = (h(-1, 0) - h(1, 0)) * 1.4, dy = (h(0, -1) - h(0, 1)) * 1.4
      const length = Math.hypot(dx, dy, 1), i = (y * size + x) * 4
      normal.set([(dx / length * .5 + .5) * 255, (dy / length * .5 + .5) * 255, (1 / length * .5 + .5) * 255, 255], i)
    }
    const map = (data: Uint8Array, name: string, srgb = false) => {
      const t = new DataTexture(data, size, size, RGBAFormat)
      t.name = `${kind}-${name}`; t.wrapS = t.wrapT = RepeatWrapping
      if (srgb) t.colorSpace = SRGBColorSpace
      t.needsUpdate = true; return t
    }
    return new MeshStandardMaterial({ name: `Pistol ${kind}`, map: map(color, 'albedo', true),
      roughnessMap: map(rough, 'roughness'), normalMap: map(normal, 'normal'), roughness: 1,
      metalness: kind === 'wood' ? 0 : .92 })
  }
  const wood = surface('wood', 1798), steel = surface('steel', 1803), brass = surface('brass', 1804)
  const dark = new MeshStandardMaterial({ name: 'Recessed steel', color: '#242728', metalness: .7, roughness: .8 })
  const flint = new MeshStandardMaterial({ name: 'Reconstruction flint', color: '#78736a', roughness: .87 })
  return { wood, steel, brass, dark, flint }
}
