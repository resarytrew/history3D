import { CatmullRomCurve3, CylinderGeometry, Group, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector3, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { group, mesh, onShell, patch, visorSurface } from './createRussianShako1808'
import { D, shellRadiusAt } from './shako1808Dimensions'

const R = D.reconstruction, F = D.converted
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
  const cover = mesh('RearLeatherCover', patch((u, v) => {
    const x = (u - 0.5) * F.rearCoverWidth
    const top = F.rearCoverHeight - F.rearCoverWidth / 2 + Math.sqrt(Math.max(0, (F.rearCoverWidth / 2) ** 2 - x * x))
    return onShell(Math.PI + x / shellRadiusAt(v * top), v * top, R.surfaceOffset)
  }, radialThickness, 48, 24), clay)
  rear.add(cover)
  const rearBuckle = buckle('RearBrassBuckle', R.buckleWidth, R.buckleHeight, clay)
  rearBuckle.position.copy(onShell(Math.PI, F.lowerBandHeight / 2, R.leatherThickness * 3))
  rearBuckle.rotation.y = Math.PI
  rear.add(rearBuckle)
  const tongue = mesh('RearBuckleTongue', patch((u, v) => onShell(Math.PI + (u - 0.5) * F.rearCoverWidth * 1.8 / shellRadiusAt(v * F.lowerBandHeight), v * F.lowerBandHeight, R.leatherThickness * 2), radialThickness), clay)
  rear.add(tongue)

  // p.51 restricts the 1 3/4 vershok plume pocket to grenadiers.
  // The generalised account on p.57 is not evidence to add it to this musketeer.
  group('Front', root)

  for (const [name, fraction] of [['VisorOuterRidge', 1 - F.visorRidgeInset / F.visorProjection], ['VisorInnerRidge', 0.035]] as const) {
    const points = Array.from({ length: 97 }, (_, i) => visorSurface(i / 96, fraction).add(new Vector3(0, R.ridgeRadius * 0.3, 0)))
    root.add(tube(name, points, R.ridgeRadius, clay))
  }
  const chin = group('Chinstrap', root)
  chin.add(mesh('LeatherChinstrap', patch((u, v) => {
    const a = (u - 0.5) * Math.PI, c = Math.cos(a)
    const endHeight = F.lowerBandHeight + R.chinstrapButtonRadius
    const r = shellRadiusAt(endHeight) + R.leatherThickness * 2
    // The sling hangs inside the head opening, not across the solid visor.
    const sideClearance = 0.020 * Math.sin(Math.PI * c)
    return new Vector3(Math.sin(a) * (r + sideClearance), R.baseY + endHeight - R.chinstrapDrop * c + (v - 0.5) * F.chinstrapWidth, c * 0.025)
  }, radialThickness, 64, 3), clay))
  for (const side of [1]) {
    const button = mesh('LeftFasteningButton', new SphereGeometry(R.chinstrapButtonRadius, 24, 12), clay)
    button.scale.set(0.35, 1, 1)
    button.position.copy(onShell(side * Math.PI / 2, F.lowerBandHeight + R.chinstrapButtonRadius, R.leatherThickness * 2))
    button.userData.material = 'Brass'
    chin.add(button)
  }
  const fixed = mesh('RightSewnAttachment', patch((u, v) => onShell(-Math.PI / 2 + (u - 0.5) * F.chinstrapWidth / D.derived.bottomRadius, F.lowerBandHeight / 2 + v * F.lowerBandHeight, R.leatherThickness), radialThickness, 12, 8), clay)
  chin.add(fixed)

  const interior = group('Interior', root)
  interior.userData = { dimensions: 'Cut dimensions from p.51; assembled folds and thickness reconstructed', state: 'neck flap tucked inside' }
  const inner = D.derived.bottomRadius - R.shellThickness - 0.001
  const sweatTop = shellRadiusAt(F.sweatbandHeight) - R.shellThickness - 0.001
  const sweat = mesh('LeatherSweatBand', new CylinderGeometry(sweatTop, inner, F.sweatbandHeight, 128, 8, true), clay)
  sweat.position.y = R.baseY + F.sweatbandHeight / 2
  interior.add(sweat)
  const liner = mesh('LinenLiner', patch((u, v) => {
    const a = u * Math.PI * 2
    const gather = Math.sin(a * 24 + Math.sin(a * 5) * 0.3) * 0.0035 * Math.sin(v * Math.PI)
    const r = sweatTop * (1 - v * v * 0.88) + gather
    return new Vector3(Math.sin(a) * r, R.baseY + F.sweatbandHeight + v * 0.092 + Math.sin(a * 24) * v * 0.0015, Math.cos(a) * r)
  }, (p) => new Vector3(p.x, 0, p.z).normalize().multiplyScalar(0.0004), D.topology.interiorRadial, D.topology.interiorRows), clay)
  liner.userData.cutHeight = F.linerHeight
  interior.add(liner)
  const drawstring = tube('LinenDrawstring', Array.from({ length: 97 }, (_, i) => {
    const a = i / 96 * Math.PI * 2
    return new Vector3(Math.sin(a) * sweatTop * 0.12, R.baseY + F.sweatbandHeight + 0.091, Math.cos(a) * sweatTop * 0.12)
  }), 0.00065, clay, 128, true)
  interior.add(drawstring)
  const drawstringY = R.baseY + F.sweatbandHeight + 0.091
  const tie = tube('LinenDrawstringTie', [
    new Vector3(0, drawstringY, sweatTop * 0.12),
    new Vector3(0.008, drawstringY - 0.002, 0.018),
    new Vector3(-0.005, drawstringY - 0.003, 0.021),
    new Vector3(0, drawstringY, sweatTop * 0.12),
    new Vector3(-0.007, drawstringY - 0.016, 0.015),
  ], 0.00065, clay, 48)
  interior.add(tie)
  interior.add(mesh('NeckFlap', patch((u, v) => {
    const a = Math.PI / 2 + u * Math.PI
    // Stored cut length is folded into a U, rather than an impossible hanging sheet.
    const y = Math.sin(v * Math.PI) * F.neckFlapHeight / Math.PI
    const r = shellRadiusAt(y) - R.shellThickness - 0.002 - v * 0.0015
    return new Vector3(Math.sin(a) * r, R.baseY + 0.002 + y, Math.cos(a) * r)
  }, (p) => new Vector3(p.x, 0, p.z).normalize().multiplyScalar(0.0006), 96, 48), clay))
  interior.getObjectByName('NeckFlap')!.userData.cutHeight = F.neckFlapHeight
}

export function addStitches(root: Group): void {
  const material = new MeshStandardMaterial({ name: 'WaxedSeamThread', color: '#25241f', roughness: 0.88 })
  const geometries = []
  for (const height of [F.lowerBandHeight - R.stitchInset, F.shellHeight - F.upperOverlap + R.stitchInset]) {
    const radius = shellRadiusAt(height), count = Math.floor(Math.PI * 2 * radius / R.stitchSpacing)
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2, y = height + Math.sin(i * 2.7) * R.seamUndulation
      const offset = R.leatherThickness + R.stitchRadius
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
  for (const sign of [-1, 1]) {
    const length = F.rearCoverHeight - F.rearCoverWidth / 2
    const count = Math.floor(length / R.stitchSpacing)
    for (let i = 1; i < count - 1; i++) {
      const points = [i / count, i / count + R.stitchLength / length].map((v) => {
        const y = length * v
        const angle = Math.PI + sign * (F.rearCoverWidth / 2 - R.stitchInset) / shellRadiusAt(y)
        return onShell(angle, y, R.leatherThickness + R.surfaceOffset + R.stitchRadius * 0.5)
      })
      geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 1, R.stitchRadius, 4))
    }
  }
  // Rounded upper seam of the rear cover, matching its actual semicircular cut.
  for (let i = 0; i < 21; i++) {
    const radius = F.rearCoverWidth / 2 - R.stitchInset
    const points = [i / 21, (i + 0.45) / 21].map((t) => {
      const a = t * Math.PI, x = Math.cos(a) * radius
      const y = F.rearCoverHeight - F.rearCoverWidth / 2 + Math.sin(a) * radius
      return onShell(Math.PI + x / shellRadiusAt(y), y, R.surfaceOffset + R.leatherThickness + R.stitchRadius)
    })
    geometries.push(new TubeGeometry(new CatmullRomCurve3(points), 2, R.stitchRadius, 4))
  }
  const merged = mergeGeometries(geometries)
  if (merged) root.add(mesh('BandStitching', merged, material))
  geometries.forEach((g) => g.dispose())
}
