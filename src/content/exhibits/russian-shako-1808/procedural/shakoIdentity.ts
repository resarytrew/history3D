import { CatmullRomCurve3, Group, LatheGeometry, SphereGeometry, TubeGeometry, Vector2, Vector3, type BufferGeometry, type Material } from 'three'
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
  repyok.position.copy(onShell(0, F.shellHeight, R.leatherThickness * 3))
  repyok.position.y += R.repyokAboveRim
  repyok.userData.confidence = 'RECONSTRUCTION / PROXY DIMENSIONS'
  for (const [name, depth, offset] of [['DarkWoodBack', 0.4, -0.25], ['RepyokWhite', 0.65, 0.1]] as const) {
    const oval = mesh(name, new SphereGeometry(1, 40, 24), clay)
    oval.scale.set(R.repyokWidth / 2, R.repyokHeight / 2, R.repyokDepth * depth)
    oval.position.z = R.repyokDepth * offset
    repyok.add(oval)
  }
  const green = mesh('RepyokGreen', new SphereGeometry(1, 32, 16), clay)
  green.scale.set(R.repyokCentreWidth / 2, R.repyokCentreHeight / 2, R.repyokDepth * 0.12)
  green.position.z = R.repyokDepth * 0.72
  repyok.add(green)
  for (const sign of [-1, 1]) {
    const wire = tube(`WireAttachment${sign}`, [new Vector3(sign * R.repyokWidth * 0.17, 0, -R.repyokDepth / 2), new Vector3(sign * R.repyokWidth * 0.2, -R.repyokHeight / 2, -R.repyokDepth / 2), new Vector3(sign * R.repyokWidth * 0.14, -R.repyokHeight * 0.72, -R.repyokDepth)], R.wireRadius, clay, 20)
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
      const y = R.braidTop - Math.sin(t * Math.PI) * (front ? R.frontBraidSag : R.braidSag)
      const p = onShell(angle, y, R.braidOffset + over * Math.sin(local * Math.PI) ** 2 * R.cordDiameter * 0.56)
      p.y += track * R.braidRadius * 0.57 + Math.sin(t * 53 + strand) * R.seamUndulation
      return p
    })
    // Each plait is a yarn bundle; oversized tubes self-intersect on tight returns.
    geometries.push(new TubeGeometry(new CatmullRomCurve3(points), D.topology.braidSegments, R.cordDiameter / 2, D.topology.braidRadial))
  }
  return mergeTubes(front ? 'FrontBraid' : 'RearBraid', geometries, clay)
}

function tassel(name: string, anchor: Vector3, length: number, spread: number, clay: Material): Group {
  const result = new Group(); result.name = name
  result.userData.suspensionLength = length
  const end = anchor.clone().add(new Vector3(Math.sign(anchor.x) * R.tasselSpacing * 0.4, -length, spread))
  const geometries: BufferGeometry[] = []
  for (const phase of [0, Math.PI]) {
    const points = Array.from({ length: 193 }, (_, i) => {
      const t = i / 192, p = anchor.clone().lerp(end, t), a = t * Math.PI * 28 + phase
      p.x += Math.cos(a) * R.cordDiameter / 4 + Math.sin(t * Math.PI) * R.cordDiameter * 0.9
      p.z += Math.sin(a) * R.cordDiameter / 4 + Math.sin(t * Math.PI) * spread * 0.3
      return p
    })
    geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 192, R.cordDiameter / 3, 6))
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
    const points = Array.from({ length: 9 }, (_, j) => {
      const t = j / 8, r = hr * (0.48 + (i % 3) * 0.09) + R.tasselFringeRadius * 0.5 * t + Math.sin(t * 5 + i) * R.yarnRadius
      return end.clone().add(new Vector3(Math.sin(a + t * 0.2) * r, -hh - R.tasselFringeHeight * t * (0.87 + 0.16 * Math.sin(i * 13.7)), Math.cos(a + t * 0.2) * r))
    })
    fringes.push(new TubeGeometry(new CatmullRomCurve3(points), 8, R.cordDiameter / 8 * (0.9 + 0.12 * Math.sin(i * 4.1)), 5))
  }
  // Cross-wound yarn follows the oval head, breaking up the lathed silhouette.
  for (let strand = 0; strand < 8; strand++) {
    const points = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48, a = t * Math.PI * 8 + strand * Math.PI * 2 / 8
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
