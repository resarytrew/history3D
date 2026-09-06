import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Group, LatheGeometry, TubeGeometry, Vector2, Vector3, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { group, mesh, onShell } from './createRussianShako1808'
import { tube } from './shakoConstruction'
import { D } from './shako1808Dimensions'
import { addGrenade } from './shakoGrenade'
const R = D.reconstruction, F = D.fact

function mergeTubes(name: string, geometries: BufferGeometry[], material: Material) {
  const result = mesh(name, mergeGeometries(geometries)!, material)
  geometries.forEach((g) => g.dispose())
  return result
}

function addRepyok(front: Group, clay: Material): void {
  const repyok = group('Repyok', front)
  repyok.position.copy(onShell(0, F.shellHeight, R.leatherThickness + R.pocketGap * 0.65))
  repyok.position.y += R.repyokAboveRim
  repyok.rotation.x = Math.atan((D.derived.topRadius - D.derived.bottomRadius) / F.shellHeight)
  repyok.userData.confidence = 'RECONSTRUCTION / PROXY DIMENSIONS'
  // The green centre and white annulus share a single continuous lenticular profile.
  // Separate semantic meshes meet edge-to-edge: there is no raised plastic insert.
  const greenRatio = R.repyokCentreWidth / R.repyokWidth
  const cap = (start: number, end: number, back = false) => {
    const positions: number[] = [], uv: number[] = [], indices: number[] = [], normals: number[] = []
    const rings = back ? 12 : 18, segments = 64
    for (let j = 0; j <= rings; j++) for (let i = 0; i <= segments; i++) {
      const r = start + (end - start) * j / rings, a = i / segments * Math.PI * 2
      const irregular = 1 + Math.sin(a * 3) * 0.002 * r
      const x = Math.cos(a) * R.repyokWidth / 2 * r * irregular
      const y = Math.sin(a) * R.repyokHeight / 2 * r * irregular
      const amplitude = R.repyokDepth * (back ? -0.22 : 0.78)
      const z = amplitude * Math.pow(Math.max(0, 1 - r * r), 0.72)
      const dzdr = amplitude * -1.44 * r * Math.pow(Math.max(0.002, 1 - r * r), -0.28)
      const normal = new Vector3(-dzdr * Math.cos(a) / (R.repyokWidth / 2), -dzdr * Math.sin(a) / (R.repyokHeight / 2), 1).normalize().multiplyScalar(back ? -1 : 1)
      normals.push(normal.x, normal.y, normal.z)
      positions.push(x, y, z); uv.push(x / R.repyokWidth + 0.5, y / R.repyokHeight + 0.5)
      if (j < rings && i < segments) {
        const k = j * (segments + 1) + i
        const face = [k, k + segments + 1, k + 1, k + 1, k + segments + 1, k + segments + 2]
        indices.push(...(back ? face.reverse() : face))
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2)); geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3)); geometry.setIndex(indices)
    return geometry
  }
  repyok.add(mesh('DarkWoodBack', cap(0, 1, true), clay), mesh('RepyokWhite', cap(greenRatio, 1), clay), mesh('RepyokGreen', cap(0, greenRatio), clay))
  for (const sign of [-1, 1]) {
    const wire = tube(`WireAttachment${sign}`, [new Vector3(sign * R.repyokWidth * 0.17, 0, -R.repyokDepth * 0.20), new Vector3(sign * R.repyokWidth * 0.2, -R.repyokHeight / 2, -R.repyokDepth * 0.20), new Vector3(sign * R.repyokWidth * 0.14, -R.repyokHeight * 0.72, -R.repyokDepth * 0.20)], R.wireRadius, clay, 20)
    wire.userData.material = 'Brass'
    repyok.add(wire)
  }
}

function braid(front: boolean, clay: Material) {
  const geometries: BufferGeometry[] = []
  const crossings = R.braidWaves * 2
  const tracks: number[][] = [[-1, 0, 1]]
  for (let step = 0; step < crossings; step++) {
    const previous = tracks[step], pair = step % 2 === 0 ? [-1, 0] : [0, 1]
    tracks.push(previous.map((track) => track === pair[0] ? pair[1] : track === pair[1] ? pair[0] : track))
  }
  for (let strand = 0; strand < 3; strand++) {
    const points = Array.from({ length: D.topology.braidSegments + 1 }, (_, i) => {
      const t = i / D.topology.braidSegments, angle = -Math.PI / 2 + t * Math.PI + (front ? 0 : Math.PI)
      const step = Math.min(crossings - 1, Math.floor(t * crossings)), local = t * crossings - step
      const from = tracks[step][strand], to = tracks[step + 1][strand]
      const blend = (1 - Math.cos(local * Math.PI)) / 2
      const track = from + (to - from) * blend
      const over = from === to ? 0 : (from < to ? 1 : -1) * (step % 2 === 0 ? 1 : -1)
      const y = R.braidTop - Math.sin(t * Math.PI) * (front ? R.frontBraidSag : R.braidSag) + Math.sin(t * Math.PI) * Math.sin(t * 7.1) * R.cordDiameter * 0.35
      const p = onShell(angle, y, R.braidOffset + over * Math.sin(local * Math.PI) ** 2 * R.cordDiameter * 0.56)
      p.y += track * R.braidRadius * 0.57 + Math.sin(t * 53 + strand) * R.seamUndulation
      return p
    })
    // Each plait is a yarn bundle; oversized tubes self-intersect on tight returns.
    const curve = new CatmullRomCurve3(points)
    const geometry = new TubeGeometry(curve, D.topology.braidSegments, R.cordDiameter / 2, D.topology.braidRadial)
    const position = geometry.attributes.position
    for (let ring = 0; ring <= D.topology.braidSegments; ring++) {
      const t = ring / D.topology.braidSegments, centre = curve.getPointAt(t), variation = 1 + 0.035 * Math.sin(t * 71 + strand * 2)
      for (let j = 0; j <= D.topology.braidRadial; j++) {
        const index = ring * (D.topology.braidRadial + 1) + j
        const vertex = new Vector3().fromBufferAttribute(position, index).sub(centre).multiplyScalar(variation).add(centre)
        position.setXYZ(index, vertex.x, vertex.y, vertex.z)
      }
    }
    geometry.computeVertexNormals(); geometries.push(geometry)
  }
  return mergeTubes(front ? 'FrontBraid' : 'RearBraid', geometries, clay)
}

function tassel(name: string, anchor: Vector3, length: number, spread: number, clay: Material): Group {
  const result = new Group(); result.name = name
  result.userData.suspensionLength = length
  const end = anchor.clone().add(new Vector3(Math.sign(anchor.x) * R.tasselSpacing * 0.4, -length, spread))
  const geometries: BufferGeometry[] = []
  for (const phase of [0, Math.PI]) {
    const points = Array.from({ length: 217 }, (_, i) => {
      const t = i / 216, p = anchor.clone().lerp(end, t), a = t * Math.PI * 30 + phase
      p.x += Math.cos(a) * R.cordDiameter / 4 + Math.sin(t * Math.PI) * R.cordDiameter * 0.9
      p.z += Math.sin(a) * R.cordDiameter / 4 + (Math.sin(t * Math.PI) * spread * 0.3 + Math.sin(t * Math.PI) * Math.sin(t * 4) * R.cordDiameter * 0.4)
      return p
    })
    geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 216, R.cordDiameter / 3, 6))
  }
  result.add(mergeTubes('TwistedSuspension', geometries, clay))
  const hr = R.tasselHeadRadius, hh = R.tasselHeadHeight
  const head = mesh('WovenHead', new LatheGeometry([
    new Vector2(0, 0), new Vector2(hr * 0.7, 0), new Vector2(hr, -hh * 0.3),
    new Vector2(hr, -hh * 0.7), new Vector2(hr * 0.65, -hh), new Vector2(0, -hh),
  ].reverse(), 24), clay)
  head.position.copy(end); result.add(head)
  const fringes: BufferGeometry[] = []
  for (let i = 0; i < 42; i++) {
    const a = i / 42 * Math.PI * 2 + Math.sin(i * 7) * 0.03
    const points = Array.from({ length: 11 }, (_, j) => {
      const t = j / 10, r = hr * (0.48 + (i % 3) * 0.09) + R.tasselFringeRadius * 0.5 * t + Math.sin(t * 5 + i) * R.yarnRadius
      return end.clone().add(new Vector3(Math.sin(a + t * 0.2) * r, -hh - R.tasselFringeHeight * t * (0.87 + 0.16 * Math.sin(i * 13.7)), Math.cos(a + t * 0.2) * r))
    })
    fringes.push(new TubeGeometry(new CatmullRomCurve3(points), 10, R.cordDiameter / 8 * (0.9 + 0.12 * Math.sin(i * 4.1)), 5))
  }
  // Cross-wound yarn follows the oval head, breaking up the lathed silhouette.
  for (let strand = 0; strand < 8; strand++) {
    const points = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48, a = t * Math.PI * 6 + strand * Math.PI * 2 / 8
      const r = hr * (t < 0.3 ? 0.7 + t : t > 0.7 ? 1 - (t - 0.7) * 0.35 / 0.3 : 1) + R.yarnRadius * (0.9 + 0.1 * Math.sin(a * 2))
      return end.clone().add(new Vector3(Math.sin(a) * r, -hh * t, Math.cos(a) * r))
    })
    fringes.push(new TubeGeometry(new CatmullRomCurve3(points), 48, R.yarnRadius, 4))
  }
  result.add(mergeTubes('CottonFringe', fringes, clay))
  return result
}

export function addIdentity(root: Group, clay: Material): void {
  const front = root.getObjectByName('Front') as Group
  addGrenade(front, clay)
  addRepyok(front, clay)
  const cords = group('Ethishket', root)
  cords.add(braid(true, clay), braid(false, clay))
  for (const [sideName, sign] of [['Right', -1], ['Left', 1]] as const) {
    const anchor = onShell(sign * Math.PI / 2, R.braidTop, R.braidOffset)
    const diamond = [new Vector3(0, 0, 0), new Vector3(0, -R.diamondHeight / 2, R.diamondWidth / 2), new Vector3(0, -R.diamondHeight, 0), new Vector3(0, -R.diamondHeight / 2, -R.diamondWidth / 2)].map((p) => p.add(anchor))
    cords.add(tube(`${sideName}DiamondCord`, diamond, R.cordDiameter / 3, clay, 32, true))
    if (sign < 0) {
      for (let i = 0; i < 3; i++) cords.add(tassel(`RightTassel${i + 1}`, anchor.clone(), R.longSuspension - i * R.tasselSpacing, (i - 1) * R.tasselSpacing, clay))
    } else cords.add(tassel('LeftTassel', anchor, R.shortSuspension, 0, clay))
  }
}
