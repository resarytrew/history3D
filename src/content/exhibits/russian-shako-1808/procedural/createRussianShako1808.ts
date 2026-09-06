import {
  BufferGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshStandardMaterial,
  Vector2, Vector3, type Material,
} from 'three'
import { D, shellRadiusAt } from './shako1808Dimensions'
import { addConstruction, addStitches } from './shakoConstruction'
import { addIdentity } from './shakoIdentity'
import { applyShakoMaterials } from './shakoMaterials'

export type ShakoPass = 1 | 2 | 3 | 4 | 5
export function mesh(name: string, geometry: BufferGeometry, material: Material): Mesh {
  const result = new Mesh(geometry, material)
  result.name = name
  result.castShadow = true
  result.receiveShadow = true
  return result
}
export function group(name: string, parent: Group): Group {
  const result = new Group()
  result.name = name
  parent.add(result)
  return result
}

/** Closed thick parametric patch; four side walls as well as both faces. */
export function patch(surface: (u: number, v: number) => Vector3, thickness: Vector3 | ((p: Vector3) => Vector3), nu: number = D.topology.patch, nv = 8): BufferGeometry {
  const vertices: number[] = [], indices: number[] = [], uvs: number[] = []
  for (let layer = 0; layer < 2; layer++) {
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = surface(i / nu, j / nv)
      if (layer) p.add(typeof thickness === 'function' ? thickness(p) : thickness)
      vertices.push(p.x, p.y, p.z)
      uvs.push(i / nu, j / nv)
    }
  }
  const offset = (nu + 1) * (nv + 1)
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, d, b, c, d)
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, d = a + nu + 1, c = d + 1
    quad(a, b, c, d); quad(a + offset, d + offset, c + offset, b + offset)
  }
  for (let i = 0; i < nu; i++) {
    quad(i, i + offset, i + 1 + offset, i + 1)
    const a = nv * (nu + 1) + i
    quad(a, a + 1, a + 1 + offset, a + offset)
  }
  for (let j = 0; j < nv; j++) {
    const a = j * (nu + 1), b = a + nu + 1
    quad(a, b, b + offset, a + offset)
    quad(a + nu, a + nu + offset, b + nu + offset, b + nu)
  }
  const result = new BufferGeometry()
  result.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  result.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  result.setIndex(indices)
  result.computeVertexNormals()
  return result
}

export function onShell(angle: number, height: number, offset = 0): Vector3 {
  const r = shellRadiusAt(height) + offset
  return new Vector3(Math.sin(angle) * r, D.reconstruction.baseY + height, Math.cos(angle) * r)
}

function band(name: string, bottom: number, height: number, material: Material, gap = 0): Mesh {
  const t = D.reconstruction.leatherThickness
  const r0 = shellRadiusAt(bottom), r1 = shellRadiusAt(bottom + height)
  return mesh(name, new LatheGeometry([
    new Vector2(r0, D.reconstruction.baseY + bottom),
    new Vector2(r0 + t, D.reconstruction.baseY + bottom),
    new Vector2(r1 + t, D.reconstruction.baseY + bottom + height),
    new Vector2(r1, D.reconstruction.baseY + bottom + height),
    new Vector2(r0, D.reconstruction.baseY + bottom),
  ], D.topology.radial, Math.PI + gap / 2, Math.PI * 2 - gap), material)
}

/** Front is +Z, up +Y; wearer's right is -X. */
export function visorSurface(u: number, v: number, inset = 0): Vector3 {
  const a = (u - 0.5) * Math.PI
  const c = Math.cos(a), r = D.derived.bottomRadius
  const extension = Math.max(0, D.converted.visorProjection - inset) * v * c
  return new Vector3(Math.sin(a) * (r + extension),
    D.reconstruction.baseY - D.converted.visorDrop * v * c,
    Math.cos(a) * (r + extension))
}

export function createRussianShako1808ForPass(pass: ShakoPass): Group {
  const root = new Group()
  root.name = 'RussianShako1808'
  root.userData = { units: 'metres', pass, historicalReview: 'PENDING HUMAN REVIEW', right: '-X' }
  const clay = new MeshStandardMaterial({ name: 'Clay', color: '#a7a39a', roughness: 0.85 })
  const shell = group('Shell', root)
  const body = group('FeltBody', shell)
  const h = D.converted.shellHeight, b = D.reconstruction.baseY, t = D.reconstruction.shellThickness
  const profile = (lo: number, hi: number) => [
    new Vector2(shellRadiusAt(lo) - t, b + lo), new Vector2(shellRadiusAt(lo), b + lo),
    new Vector2(shellRadiusAt(hi), b + hi), new Vector2(shellRadiusAt(hi) - t, b + hi),
    new Vector2(shellRadiusAt(lo) - t, b + lo),
  ]
  body.add(mesh('FeltLowerWithRearSlit', new LatheGeometry(profile(0, D.converted.rearCoverHeight), D.topology.radial,
    Math.PI + D.reconstruction.rearSlitWidth / D.derived.bottomRadius / 2,
    Math.PI * 2 - D.reconstruction.rearSlitWidth / D.derived.bottomRadius), clay))
  body.add(mesh('FeltUpper', new LatheGeometry(profile(D.converted.rearCoverHeight, h - D.converted.upperOverlap), D.topology.radial), clay))
  const underLeather = profile(h - D.converted.upperOverlap, h)
  body.add(mesh('FeltUnderUpperLeather', new LatheGeometry(underLeather, D.topology.radial), clay))
  // Leather wraps the felt; the document gives internal size, not the finished outside.
  const upper = band('UpperLeatherBand', h - D.converted.upperOverlap, D.converted.upperOverlap, clay)
  shell.add(upper)
  const top = group('TopAssembly', shell)
  const r = D.derived.outerTopRadius, roll = D.reconstruction.rimRoll
  top.add(mesh('OuterTopRim', new LatheGeometry([
    new Vector2(r - roll * 2, b + h - roll), new Vector2(r - roll, b + h),
    new Vector2(r, b + h - roll), new Vector2(r, b + h - roll * 2),
    new Vector2(r - roll * 2, b + h - roll),
  ], D.topology.radial), clay))
  top.add(mesh('DepressedTopSurface', new LatheGeometry([
    new Vector2(0, b + h - D.converted.topRecess - t),
    new Vector2(0, b + h - D.converted.topRecess),
    new Vector2(r * 0.65, b + h - D.converted.topRecess),
    new Vector2(r * 0.87, b + h - D.converted.topRecess + roll),
    new Vector2(r - roll * 3, b + h - D.converted.topRecess * 0.6),
    new Vector2(r - roll * 2, b + h - roll),
    new Vector2(r - roll * 2 - t, b + h - roll - t),
    new Vector2(r - roll * 3 - t, b + h - D.converted.topRecess * 0.6 - t),
    new Vector2(r * 0.87, b + h - D.converted.topRecess + roll - t),
    new Vector2(r * 0.65, b + h - D.converted.topRecess - t),
    new Vector2(0, b + h - D.converted.topRecess - t),
  ].reverse(), D.topology.radial), clay))
  root.add(band('LowerBand', 0, D.converted.lowerBandHeight, clay, D.reconstruction.rearSlitWidth / D.derived.bottomRadius))
  root.add(mesh('Visor', patch((u, v) => visorSurface(1 - u, v), new Vector3(0, -D.reconstruction.visorThickness, 0)), clay))
  if (pass >= 2) addConstruction(root, clay)
  if (pass >= 3) addIdentity(root, clay)
  if (pass >= 4) applyShakoMaterials(root)
  if (pass >= 5) addStitches(root)
  return root
}

export function createRussianShako1808(): Group { return createRussianShako1808ForPass(5) }
