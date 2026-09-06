import { CatmullRomCurve3, ExtrudeGeometry, Group, LatheGeometry, Shape, SphereGeometry, TubeGeometry, Vector2, Vector3, type BufferGeometry, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { group, mesh, onShell } from './createRussianShako1808'
import { tube } from './shakoConstruction'
import { D } from './shako1808Dimensions'
const R = D.reconstruction, F = D.fact

function mergeTubes(name: string, geometries: BufferGeometry[], material: Material) {
  const result = mesh(name, mergeGeometries(geometries)!, material)
  geometries.forEach((g) => g.dispose())
  return result
}

function addBadge(front: Group, clay: Material): void {
  const badge = group('FrontBadge_OneFlameGrenade', front)
  badge.userData = { material: 'Brass', confidence: 'RECONSTRUCTION', referenceLimitation: 'One-flame type is locked; detailed outline is not traced from a supplied badge image.' }
  const w = R.badgeWidth, h = R.badgeHeight
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(-w * 0.62, 0, -w * 0.65, h * 0.39, -w * 0.16, h * 0.43)
  s.bezierCurveTo(-w * 0.43, h * 0.60, -w * 0.19, h * 0.65, -w * 0.22, h * 0.78)
  s.bezierCurveTo(-w * 0.09, h * 0.72, w * 0.03, h * 0.79, w * 0.035, h)
  s.bezierCurveTo(w * 0.32, h * 0.83, w * 0.18, h * 0.72, w * 0.26, h * 0.64)
  s.bezierCurveTo(w * 0.38, h * 0.51, w * 0.23, h * 0.48, w * 0.16, h * 0.43)
  s.bezierCurveTo(w * 0.65, h * 0.39, w * 0.62, 0, 0, 0)
  badge.add(mesh('StampedOneFlameOutline', new ExtrudeGeometry(s, { depth: R.badgeDepth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: R.badgeBevel, bevelThickness: R.badgeBevel, curveSegments: 20 }), clay))
  const bomb = mesh('RoundedBombRelief', new SphereGeometry(1, 32, 16), clay)
  bomb.scale.set(w * 0.41, h * 0.188, R.badgeDepth * 1.7)
  bomb.position.set(0, h * 0.215, R.badgeDepth)
  badge.add(bomb)
  const vein = [new Vector3(0, h * 0.44, R.badgeDepth * 1.5), new Vector3(-w * 0.06, h * 0.58, R.badgeDepth * 1.8), new Vector3(w * 0.07, h * 0.76, R.badgeDepth * 1.2), new Vector3(w * 0.035, h * 0.91, R.badgeDepth)]
  badge.add(tube('FlameFold', vein, R.badgeBevel, clay, 32))
  badge.position.copy(onShell(0, R.badgeBottom, R.leatherThickness * 3))
  badge.rotation.x = Math.atan((D.derived.topRadius - D.derived.bottomRadius) / F.shellHeight)
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
  for (let strand = 0; strand < 3; strand++) {
    const points = Array.from({ length: D.topology.braidSegments + 1 }, (_, i) => {
      const t = i / D.topology.braidSegments, angle = -Math.PI / 2 + t * Math.PI + (front ? 0 : Math.PI)
      const phase = t * Math.PI * 2 * R.braidWaves + strand * Math.PI * 2 / 3
      const y = R.braidTop - Math.sin(t * Math.PI) * (front ? R.frontBraidSag : R.braidSag)
      const p = onShell(angle, y, R.braidOffset + Math.cos(phase * 2) * R.cordDiameter * 0.35)
      p.y += Math.sin(phase) * R.braidRadius
      return p
    })
    geometries.push(new TubeGeometry(new CatmullRomCurve3(points), D.topology.braidSegments, R.cordDiameter / 2, D.topology.cordRadial))
  }
  return mergeTubes(front ? 'FrontBraid' : 'RearBraid', geometries, clay)
}

function tassel(name: string, anchor: Vector3, length: number, spread: number, clay: Material): Group {
  const result = new Group(); result.name = name
  result.userData.suspensionLength = length
  const end = anchor.clone().add(new Vector3(Math.sign(anchor.x) * R.tasselSpacing * 0.4, -length, spread))
  const geometries: BufferGeometry[] = []
  for (const phase of [0, Math.PI]) {
    const points = Array.from({ length: 97 }, (_, i) => {
      const t = i / 96, p = anchor.clone().lerp(end, t), a = t * Math.PI * 28 + phase
      p.x += Math.cos(a) * R.cordDiameter / 4
      p.z += Math.sin(a) * R.cordDiameter / 4
      return p
    })
    geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 96, R.cordDiameter / 3, 5))
  }
  result.add(mergeTubes('TwistedSuspension', geometries, clay))
  const hr = R.tasselHeadRadius, hh = R.tasselHeadHeight
  const head = mesh('WovenHead', new LatheGeometry([
    new Vector2(0, 0), new Vector2(hr * 0.7, 0), new Vector2(hr, -hh * 0.3),
    new Vector2(hr, -hh * 0.7), new Vector2(hr * 0.65, -hh), new Vector2(0, -hh),
  ].reverse(), 24), clay)
  head.position.copy(end); result.add(head)
  const fringes: BufferGeometry[] = []
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2
    const points = Array.from({ length: 9 }, (_, j) => {
      const t = j / 8, r = hr * 0.6 + R.tasselFringeRadius * 0.5 * t
      return end.clone().add(new Vector3(Math.sin(a + t * 0.2) * r, -hh - R.tasselFringeHeight * t, Math.cos(a + t * 0.2) * r))
    })
    fringes.push(new TubeGeometry(new CatmullRomCurve3(points), 8, R.cordDiameter / 5, 5))
  }
  result.add(mergeTubes('CottonFringe', fringes, clay))
  return result
}

export function addIdentity(root: Group, clay: Material): void {
  const front = root.getObjectByName('Front') as Group
  addBadge(front, clay)
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
