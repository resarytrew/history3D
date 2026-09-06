import { CatmullRomCurve3, CylinderGeometry, Group, LatheGeometry, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector2, Vector3, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { group, mesh, onShell, patch, visorSurface } from './createRussianShako1808'
import { D, shellRadiusAt } from './shako1808Dimensions'

const R = D.reconstruction, F = D.fact
export const radialThickness = (p: Vector3): Vector3 => new Vector3(p.x, 0, p.z).normalize().multiplyScalar(R.leatherThickness)
export function tube(name: string, points: Vector3[], radius: number, material: Material, segments = 64, closed = false) {
  return mesh(name, new TubeGeometry(new CatmullRomCurve3(points, closed, 'centripetal'), segments, radius, D.topology.cordRadial, closed), material)
}

export function reinforcementSurface(side: number, arm: number, u: number, v: number): Vector3 {
  const lo = F.lowerBandHeight, hi = F.shellHeight - F.upperOverlap
  const dy = hi - lo, centreY = lo + v * dy, radius = shellRadiusAt(centreY) + R.surfaceOffset
  const angle = arm * Math.asin(F.vTopSeparation / (2 * (shellRadiusAt(hi) + R.surfaceOffset)))
  const slope = (D.derived.topRadius - D.derived.bottomRadius) / F.shellHeight
  // Orthonormal coordinates on the cone: width is perpendicular to the 3D centreline,
  // not just its flat XY projection. This also preserves the 90 mm top-end chord.
  const metric = Math.sqrt(1 + slope * slope), a = radius * angle, b = dy * metric
  const length = Math.hypot(a, b), w = (u - 0.5) * F.vStrapWidth
  const y = centreY - w * a / length / metric
  return onShell(side + angle * v + w * b / length / radius, y, R.surfaceOffset)
}

function buckle(name: string, width: number, height: number, material: Material): Group {
  const result = new Group(); result.name = name
  const w = width / 2, h = height / 2, bevel = R.buckleWire * 2
  const outline = [[-w + bevel, -h], [w - bevel, -h], [w, -h + bevel], [w, h - bevel], [w - bevel, h], [-w + bevel, h], [-w, h - bevel], [-w, -h + bevel]]
  result.add(tube('BuckleFrame', outline.map(([x, y]) => new Vector3(x, y, 0)), R.buckleWire, material, 64, true))
  result.add(tube('SinglePin', [new Vector3(-w, 0, R.buckleWire), new Vector3(w, 0, R.buckleWire)], R.buckleWire * 0.65, material, 4))
  result.userData.material = 'Brass'
  return result
}

export function addConstruction(root: Group, clay: Material): void {
  const reinforcements = group('Reinforcements', root)
  for (const [name, side] of [['SideReinforcementLeft', Math.PI / 2], ['SideReinforcementRight', -Math.PI / 2]] as const) {
    const vGroup = group(name, reinforcements)
    for (const arm of [-1, 1]) {
      const strap = mesh(`VArm${arm}`, patch((u, v) => reinforcementSurface(side, arm, u, v), radialThickness, 4, 32), clay)
      strap.userData.width = F.vStrapWidth
      vGroup.add(strap)
    }
  }
  const rear = group('Rear', root)
  const slit = group('RearAdjustmentSlit', rear)
  slit.userData = { construction: 'Actual opening in FeltLowerWithRearSlit and LowerBand', height: F.rearCoverHeight }
  const cover = mesh('RearLeatherCover', patch((u, v) => onShell(Math.PI + (u - 0.5) * R.rearCoverWidth / shellRadiusAt(v * F.rearCoverHeight), v * F.rearCoverHeight, R.surfaceOffset), radialThickness), clay)
  rear.add(cover)
  const rearBuckle = buckle('RearBrassBuckle', R.buckleWidth, R.buckleHeight, clay)
  rearBuckle.position.copy(onShell(Math.PI, F.lowerBandHeight / 2, R.leatherThickness * 3))
  rearBuckle.rotation.y = Math.PI
  rear.add(rearBuckle)
  const tongue = mesh('RearBuckleTongue', patch((u, v) => onShell(Math.PI + (u - 0.5) * R.rearCoverWidth * 1.8 / shellRadiusAt(v * F.lowerBandHeight), v * F.lowerBandHeight, R.leatherThickness * 2), radialThickness), clay)
  rear.add(tongue)

  const front = group('Front', root)
  const pocket = group('FrontOrnamentPocket', front)
  const pocketSurface = (u: number, v: number) => {
    const y = F.shellHeight - F.pocketHeight + F.pocketHeight * v
    const width = R.pocketBottomWidth + (R.pocketTopWidth - R.pocketBottomWidth) * v
    return onShell((u - 0.5) * width / shellRadiusAt(y), y, R.leatherThickness + R.pocketGap * v)
  }
  pocket.add(mesh('PocketFace', patch(pocketSurface, radialThickness), clay))
  for (const u of [0, 1]) {
    pocket.add(mesh(`PocketSide${u}`, patch((s, v) => {
      const p = pocketSurface(u, v)
      return p.add(new Vector3(p.x, 0, p.z).normalize().multiplyScalar(-R.pocketGap * v * s))
    }, radialThickness, 2, 16), clay))
  }
  pocket.userData = { height: F.pocketHeight, opening: 'top', gap: R.pocketGap }

  for (const [name, inset] of [['VisorOuterRidge', R.secondRidgeInset], ['VisorInnerRidge', F.visorRidgeInset]] as const) {
    const points = Array.from({ length: 65 }, (_, i) => visorSurface(i / 64, 1, inset).add(new Vector3(0, R.ridgeRadius, 0)))
    root.add(tube(name, points, R.ridgeRadius, clay))
  }
  const chin = group('Chinstrap', root)
  chin.add(mesh('LeatherChinstrap', patch((u, v) => {
    const a = (u - 0.5) * Math.PI, c = Math.cos(a)
    const r = D.derived.bottomRadius - R.chinstrapInset
    return new Vector3(Math.sin(a) * r, R.baseY + F.lowerBandHeight / 2 - R.chinstrapDrop * c + (v - 0.5) * F.chinstrapWidth, Math.cos(a) * r)
  }, radialThickness, 64, 3), clay))
  for (const side of [-1, 1]) {
    const button = mesh(side < 0 ? 'RightFixedAttachment' : 'LeftFasteningButton', new SphereGeometry(R.chinstrapButtonRadius, 16, 8), clay)
    button.scale.set(0.35, 1, 1)
    button.position.copy(onShell(side * Math.PI / 2, F.lowerBandHeight / 2, R.leatherThickness * 2))
    button.userData.material = 'Brass'
    chin.add(button)
  }
  const chinBuckle = buckle('LeftChinstrapBuckle', R.buckleWidth, R.buckleHeight, clay)
  chinBuckle.position.copy(onShell(Math.PI / 2, F.lowerBandHeight / 2, R.leatherThickness * 3))
  chinBuckle.rotation.y = Math.PI / 2
  chin.add(chinBuckle)

  const interior = group('Interior', root)
  interior.visible = false
  interior.userData = { preparedFor: 'future internal/exploded view', dimensions: 'FACT; folds and thickness RECONSTRUCTION' }
  const inner = D.derived.bottomRadius - R.shellThickness - R.leatherThickness
  const sweat = mesh('LeatherSweatBand', new CylinderGeometry(inner, inner, F.sweatbandHeight, 64, 1, true), clay)
  sweat.position.y = R.baseY + F.sweatbandHeight / 2
  interior.add(sweat)
  interior.add(mesh('LinenLiner', new LatheGeometry([
    new Vector2(inner, R.baseY), new Vector2(inner, R.baseY + F.linerHeight * 0.65),
    new Vector2(inner * 0.75, R.baseY + F.linerHeight * 0.92), new Vector2(0, R.baseY + F.linerHeight),
  ], 64), clay))
  interior.add(mesh('NeckFlap', patch((u, v) => {
    const a = Math.PI / 2 + u * Math.PI, r = inner * (1 + v * 0.06)
    return new Vector3(Math.sin(a) * r, R.baseY - v * F.neckFlapHeight, Math.cos(a) * r)
  }, radialThickness, 32, 12), clay))
}

export function addStitches(root: Group): void {
  const material = new MeshStandardMaterial({ name: 'WaxedSeamThread', color: '#25241f', roughness: 0.88 })
  const geometries = []
  for (const height of [F.lowerBandHeight - R.stitchInset, F.shellHeight - F.upperOverlap + R.stitchInset]) {
    const radius = shellRadiusAt(height), count = Math.floor(Math.PI * 2 * radius / R.stitchSpacing)
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2, y = height + Math.sin(i * 2.7) * R.seamUndulation
      // Upper band is scaled inward to retain the locked outside diameter.
      const offset = height > F.shellHeight / 2 ? R.stitchRadius : R.leatherThickness + R.stitchRadius
      const points = [onShell(angle, y, offset), onShell(angle + R.stitchLength / radius, y + R.seamUndulation * Math.sin(i), offset)]
      geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 1, R.stitchRadius, 4))
    }
  }
  for (const side of [-Math.PI / 2, Math.PI / 2]) for (const arm of [-1, 1]) for (const edge of [0.09, 0.91]) {
    for (let i = 1; i < 34; i++) {
      const v = i / 35, span = R.stitchLength / (F.shellHeight - F.upperOverlap - F.lowerBandHeight)
      const points = [v, v + span].map((t) => {
        const p = reinforcementSurface(side, arm, edge + 0.006 * Math.sin(i * 3), t)
        return p.add(radialThickness(p)).add(new Vector3(p.x, 0, p.z).normalize().multiplyScalar(R.stitchRadius * 0.5))
      })
      geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 1, R.stitchRadius, 4))
    }
  }
  // Existing leather edges only: no invented fittings or decorative seam patterns.
  for (const front of [true, false]) for (const sign of [-1, 1]) {
    const length = front ? F.pocketHeight : F.rearCoverHeight
    const count = Math.floor(length / R.stitchSpacing)
    for (let i = 1; i < count - 1; i++) {
      const points = [i / count, i / count + R.stitchLength / length].map((v) => {
        const y = front ? F.shellHeight - F.pocketHeight + length * v : length * v
        const width = front ? R.pocketBottomWidth + (R.pocketTopWidth - R.pocketBottomWidth) * v : R.rearCoverWidth
        const angle = (front ? 0 : Math.PI) + sign * (width / 2 - R.stitchInset) / shellRadiusAt(y)
        return onShell(angle, y, R.leatherThickness + (front ? R.leatherThickness + R.pocketGap * v : R.surfaceOffset) + R.stitchRadius * 0.5)
      })
      geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 1, R.stitchRadius, 4))
    }
  }
  const merged = mergeGeometries(geometries)
  if (merged) root.add(mesh('BandStitching', merged, material))
  geometries.forEach((g) => g.dispose())
}
