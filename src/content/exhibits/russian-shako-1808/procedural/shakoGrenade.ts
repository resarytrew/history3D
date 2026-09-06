import { BufferGeometry, CatmullRomCurve3, ExtrudeGeometry, Float32BufferAttribute, Group, Shape, Vector3, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { group, mesh, onShell } from './createRussianShako1808'
import { D } from './shako1808Dimensions'

const R = D.reconstruction
export const grenadeReference = 'https://archaeolog.ru/media/smolensk/Бляха-накладка%20Гренада%20об%20одном%20огне.jpg'

/** Front photograph proportions: 145 px bomb diameter, 361 px overall height.
 * The silhouette and embossed folds follow the supplied photograph, not its corrosion.
 * Absolute size, sheet gauge and relief depth remain reconstruction values.
 */
export function addGrenade(front: Group, material: Material): void {
  const badge = group('FrontBadge_OneFlameGrenade', front)
  badge.userData = { material: 'Brass', confidence: 'RECONSTRUCTION', reference: grenadeReference,
    referenceLimitation: 'Photo-guided contour and rib layout; unmeasured scale and embossing depth.' }
  const w = R.badgeWidth, h = R.badgeHeight, depth = R.badgeDepth
  const p = (x: number, y: number, z = depth) => new Vector3((x - 205) / 145 * w, (365 - y) / 361 * h, z)
  const outline = new Shape()
  const start = p(170, 222); outline.moveTo(start.x, start.y)
  const neckRight = p(241, 222); outline.lineTo(neckRight.x, neckRight.y)
  const contour = [[240,190],[251,163],[265,137],[268,118],[263,114],[268,98],[258,95],[260,77],[256,60],[244,62],[242,46],[236,26],[227,33],[224,15],[218,3],[210,14],[202,3],[195,8],[186,5],[180,19],[170,23],[164,49],[153,47],[148,54],[145,73],[147,94],[145,109],[149,123],[157,146],[170,170],[177,192],[170,200]]
  for (const [x, y] of contour) { const v = p(x, y); outline.lineTo(v.x, v.y) }
  outline.closePath()
  badge.add(mesh('StampedOneFlameOutline', new ExtrudeGeometry(outline, {
    depth, bevelEnabled: true, bevelSegments: 2, bevelSize: R.badgeBevel,
    bevelThickness: R.badgeBevel, curveSegments: 20, steps: 1,
  }), material))

  // A thin embossed sheet: a front cap rather than a solid sphere.
  const bombBlank = new Shape(), bombCentre = p(205, 293)
  bombBlank.absellipse(bombCentre.x, bombCentre.y, w / 2, h * 72 / 361, 0, Math.PI * 2, false, 0)
  const sheet = new ExtrudeGeometry(bombBlank, { depth, bevelEnabled: false, curveSegments: 32 })
  const positions: number[] = [], indices: number[] = [], uv: number[] = []
  const rings = 12, segments = 64, center = p(205, 293)
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= segments; i++) {
    const r = j / rings, a = i / segments * Math.PI * 2
    const z = depth + R.badgeBevel + R.badgeRelief * Math.pow(Math.max(0, 1 - r * r), 0.7)
      + R.badgeBevel * 0.25 * Math.sin(a * 5 + r * 9) * Math.sin(r * Math.PI)
    positions.push(center.x + Math.cos(a) * w / 2 * r, center.y + Math.sin(a) * h * 72 / 361 * r, z)
    uv.push(i / segments, r)
    if (j < rings && i < segments) { const k = j * (segments + 1) + i; indices.push(k, k + segments + 1, k + 1, k + 1, k + segments + 1, k + segments + 2) }
  }
  const dome = new BufferGeometry()
  dome.setAttribute('position', new Float32BufferAttribute(positions, 3)); dome.setAttribute('uv', new Float32BufferAttribute(uv, 2)); dome.setIndex(indices); dome.computeVertexNormals()
  const cap = dome.toNonIndexed(), bomb = mergeGeometries([cap, sheet])!
  badge.add(mesh('RoundedBombRelief', bomb, material)); cap.dispose(); dome.dispose(); sheet.dispose()

  // Ribbons form tapered, comparatively sharp repoussé ridges, not round wire.
  const folds: BufferGeometry[] = []
  const ribbon = (points: number[][], width: number, height: number) => {
    const curve = new CatmullRomCurve3(points.map(([x, y]) => p(x, y)))
    const pos: number[] = [], tex: number[] = [], idx: number[] = [], steps = 28, across = 6
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, v = curve.getPoint(t), tangent = curve.getTangent(t)
      const taper = 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * t), 0.45)
      for (let j = 0; j <= across; j++) {
        const s = j / across, offset = (s - 0.5) * width * taper
        pos.push(v.x + tangent.y * offset, v.y - tangent.x * offset,
          depth + R.badgeBevel + Math.pow(Math.sin(Math.PI * s), 1.7) * height * taper)
        tex.push(s, t)
        if (i < steps && j < across) { const k = i * (across + 1) + j; idx.push(k, k + 1, k + across + 1, k + 1, k + across + 2, k + across + 1) }
      }
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new Float32BufferAttribute(tex, 2)); g.setIndex(idx); g.computeVertexNormals(); folds.push(g)
  }
  const paths = [
    [[179,190],[163,153],[154,110],[153, 60]],
    [[184,188],[177,150],[171,99],[174,36]],
    [[193,189],[187,145],[187,84],[190,17]],
    [[202,188],[203,133],[201, 70],[203,17]],
    [[210,189],[216,145],[221,89],[220,24]],
    [[218,187],[235,147],[240,101],[239,51]],
    [[228,184],[249,145],[259,109]],
  ]
  paths.forEach((path, i) => ribbon(path, w * (i === 3 ? 0.12 : 0.085), R.badgeRelief * (i === 3 ? 0.9 : 0.65)))
  ribbon([[174,200],[191,202],[219,202],[241,200]], h * 0.019, R.badgeRelief * 0.8)
  ribbon([[171,214],[191,216],[219,216],[242,214]], h * 0.023, R.badgeRelief)
  const ribs = mergeGeometries(folds)!
  badge.add(mesh('EmbossedFlameAndNeckBands', ribs, material)); folds.forEach((g) => g.dispose())
  badge.position.copy(onShell(0, R.badgeBottom, R.leatherThickness * 3))
  badge.rotation.x = Math.atan((D.derived.topRadius - D.derived.bottomRadius) / D.fact.shellHeight)
}
