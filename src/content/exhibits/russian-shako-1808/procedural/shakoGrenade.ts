import { BufferGeometry, CatmullRomCurve3, ExtrudeGeometry, Float32BufferAttribute, Group, Mesh, Shape, Vector3, type Material } from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { group, mesh, onShell } from './createRussianShako1808'
import { D, shellRadiusAt } from './shako1808Dimensions'

const R = D.reconstruction
export const grenadeReference = 'https://archaeolog.ru/media/smolensk/Бляха-накладка%20Гренада%20об%20одном%20огне.jpg'

/** Musketeer 1810: sheet follows felt, without the grenadier plume pocket. */
export function badgeSeat(x: number, localY: number): number {
  const height = R.badgeBottom + localY
  const radius = shellRadiusAt(height)
  return Math.sqrt(Math.max(0, radius * radius - x * x)) - radius
}

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
  const contour = [[240,190],[251,163],[265,137],[266,120],[261,113],[265,98],[256,96],[257,78],[250,63],[243,68],[239,48],[231,30],[224,43],[218,24],[212,15],[205,3],[199,14],[197,30],[189,25],[181,40],[175,62],[165,50],[157,68],[153,86],[147,78],[148,108],[153,126],[157,146],[170,170],[177,192],[170,200]]
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
  const rings = 16, segments = 80, center = p(205, 293)
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= segments; i++) {
    const r = j / rings, a = i / segments * Math.PI * 2
    const z = depth + R.badgeRelief * Math.pow(Math.max(0, 1 - r * r), 1.3)
      * (1 + 0.09 * Math.cos(a * 2 + 0.3) * r + 0.04 * Math.sin(a * 5) * r)
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
    const pos: number[] = [], tex: number[] = [], idx: number[] = [], steps = 36, across = 8
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, v = curve.getPoint(t), tangent = curve.getTangent(t)
      const taper = 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * t), 0.45)
      for (let j = 0; j <= across; j++) {
        const s = j / across, offset = (s - 0.5) * width * taper
        pos.push(v.x + tangent.y * offset, v.y - tangent.x * offset,
          depth + Math.pow(Math.sin(Math.PI * s), 1.15) * height * taper)
        tex.push(s, t)
        if (i < steps && j < across) { const k = i * (across + 1) + j; idx.push(k, k + 1, k + across + 1, k + 1, k + across + 2, k + across + 1) }
      }
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new Float32BufferAttribute(tex, 2)); g.setIndex(idx); g.computeVertexNormals(); folds.push(g)
  }
  const paths = [
    [[179,193],[163,153],[154,116],[151,92]],
    [[184,191],[177,150],[168,108],[164,66]],
    [[193,192],[187,145],[182,88],[188,39]],
    [[202,192],[203,133],[202,70],[205,13]],
    [[210,192],[216,145],[222,95],[216,40]],
    [[218,191],[235,147],[241,110],[237,65]],
    [[228,184],[249,145],[259,109]],
  ]
  paths.forEach((path, i) => ribbon(path, w * (i === 3 ? 0.19 : 0.125), R.badgeRelief * (i === 3 ? 0.9 : 0.65)))
  ribbon([[174,200],[191,202],[219,202],[241,200]], h * 0.019, R.badgeRelief * 0.8)
  ribbon([[171,214],[191,216],[219,216],[242,214]], h * 0.023, R.badgeRelief)
  const ribs = mergeGeometries(folds)!
  badge.add(mesh('EmbossedFlameAndNeckBands', ribs, material)); folds.forEach((g) => g.dispose())
  badge.traverse((object) => {
    if (!(object instanceof Mesh)) return
    if (object.name === 'StampedOneFlameOutline') {
      const original = object.geometry
      const subdivided = new TessellateModifier(R.badgeMaxEdge, 8).modify(original)
      object.geometry = mergeVertices(subdivided, 0.0000001)
      subdivided.dispose()
      original.dispose()
    }
    const positions = object.geometry.attributes.position
    for (let i = 0; i < positions.count; i++) positions.setZ(i, positions.getZ(i) + badgeSeat(positions.getX(i), positions.getY(i)))
    object.geometry.computeVertexNormals()
  })
  badge.userData.contactGap = R.badgeContactGap
  badge.position.copy(onShell(0, R.badgeBottom, R.badgeContactGap))
  badge.rotation.x = Math.atan((D.derived.topRadius - D.derived.bottomRadius) / D.converted.shellHeight)
}
