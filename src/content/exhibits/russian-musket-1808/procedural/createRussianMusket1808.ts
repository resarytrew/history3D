import { BufferGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, Path, Shape, TorusGeometry, TubeGeometry, Vector2, Vector3, type Material } from 'three'
import { camberPlate, chippedFlint, fittedBand, smoothMetal } from './musketSurfaceGeometry'
import { createMusketMaterials } from './musketMaterials'
import { musket1808Dimensions as D, photoX as X, photoY as Y } from './musket1808Dimensions'

type Point = readonly [number, number]
type Section = readonly [number, number, number, number]

/** Rings follow a continuous stock silhouette; their depth is explicitly reconstructed. */
function stockGeometry() {
  const sections: Section[] = [
    [40, 618, 724, 0.019], [46, 613, 731, 0.023], [66, 613, 728, 0.024],
    [145, 609, 700, 0.025], [225, 608, 672, 0.024], [253, 611, 658, 0.023],
    [274, 622, 649, 0.019], [307, 610, 639, 0.017], [358, 588, 627, 0.019],
    [399, 579, 622, 0.023], [449, 581, 623, 0.025], [510, 584, 621, 0.023],
    [560, 588, 619, 0.018], [601, 591, 615, 0.015], [775, 591, 614, 0.014],
    [1000, 591, 613, 0.0135], [1207, 591, 612, 0.013], [1400, 591, 612, 0.0125],
    [1595, 591, 611, 0.012], [1663, 591, 608, 0.0115], [1671, 592, 607, 0.010],
  ]
  const curve = new CatmullRomCurve3(sections.map(([x, top, bottom]) => new Vector3(X(x), Y(top), Y(bottom))), false, 'centripetal')
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  const longitudinal = 640, radial = 128
  for (let i = 0; i <= longitudinal; i++) {
    const p = curve.getPoint(i / longitudinal)
    let station = sections.findIndex((entry) => X(entry[0]) > p.x)
    if (station < 1) station = sections.length - 1
    const a = sections[station - 1], b = sections[station]
    const f = Math.max(0, Math.min(1, (p.x - X(a[0])) / (X(b[0]) - X(a[0]))))
    const width = a[3] + (b[3] - a[3]) * f*f*(3-2*f)
    const ease = (a: number, b: number) => { const t = Math.max(0,Math.min(1,(p.x-X(a))/(X(b)-X(a)))); return t*t*(3-2*t) }
    const square = (1 - 0.56*ease(350,405))*(1-ease(540,610)) + 0.55*ease(540,610)
    for (let j = 0; j <= radial; j++) {
      const angle = j / radial * Math.PI * 2
      const sine = Math.sin(angle)
      const z = Math.sign(sine) * Math.pow(Math.abs(sine), square) * width
      const c = Math.cos(angle)
      let y = (p.y + p.z) / 2 + (p.y - p.z) / 2 * Math.sign(c) * Math.pow(Math.abs(c), 0.70)
      // Shallow visible seating groove; no functional internal assembly is represented.
      if (p.x > X(460) && c > 0) y -= 0.010 * Math.pow(Math.max(0, 1 - Math.abs(z) / 0.013), 1.5) * c
      positions.push(p.x, y, z)
      uv.push((p.x - X(40)) / D.reconstruction.displayLength, j / radial)
      if (i < longitudinal && j < radial) {
        const n = i * (radial + 1) + j
        indices.push(n, n + 1, n + radial + 1, n + 1, n + radial + 2, n + radial + 1)
      }
    }
  }
  for (const end of [0, longitudinal]) {
    const p = curve.getPoint(end / longitudinal), center = positions.length / 3
    positions.push(p.x, (p.y + p.z) / 2, 0); uv.push(end / longitudinal, 0.5)
    for (let j = 0; j < radial; j++) {
      const n = end * (radial + 1) + j
      if (end === 0) indices.push(center, n + 1, n)
      else indices.push(center, n, n + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals()
  geometry.userData = { radial, longitudinal }
  return geometry
}

function outline(points: readonly Point[], smooth = true): Shape {
  const shape = new Shape(), first = points[0]
  shape.moveTo(X(first[0]), Y(first[1]))
  if (smooth) {
    const curve = new CatmullRomCurve3(points.map(([x, y]) => new Vector3(X(x), Y(y), 0)), true, 'centripetal')
    for (const p of curve.getPoints(points.length * 8).slice(1)) shape.lineTo(p.x, p.y)
  } else for (const [x, y] of points.slice(1)) shape.lineTo(X(x), Y(y))
  shape.closePath()
  return shape
}

/** Exterior-only interpretation of the Padikovo 1811 reference. No moving/working mechanism. */
export function createRussianMusket1808(): Group {
  const root = new Group(); root.name = 'RussianMusket1808'
  const m = createMusketMaterials()
  const add = (name: string, geometry: BufferGeometry, material: Material, parent = root) => {
    const mesh = new Mesh(geometry, material); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true
    parent.add(mesh); return mesh
  }
  const plate = (name: string, points: readonly Point[], z: number, depth: number, material: Material, smooth = true, holes: readonly (readonly Point[])[] = []) => {
    const shape = outline(points, smooth)
    for (const points of holes) { const h = new Path(); h.setFromPoints(outline(points).getPoints()); shape.holes.push(h) }
    const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.00045, bevelThickness: 0.00035, curveSegments: 32 })
    g.translate(0, 0, z)
    if (name === 'LockPlate' || name === 'Cock' || name === 'FrizzenFace') return add(name, camberPlate(g, name === 'Cock' ? 0.0011 : 0.0006), material)
    // Wood needs its UVs; metal smoothing can merge across UV seams.
    return add(name, smooth && material !== m.wood ? smoothMetal(g) : g, material)
  }
  const tube = (name: string, points: readonly (readonly [number, number, number])[], radius: number, material: Material, closed = false) =>
    add(name, new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p)), closed, 'centripetal'), Math.max(40, points.length * 16), radius, 12, closed), material)
  const screw = (name: string, px: number, py: number, z: number, radius = 0.0032, material: Material = m.steel) => {
    const shape = new Shape(); shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
    const slot = new Path(); slot.moveTo(-radius * 0.74, -0.0004); slot.lineTo(radius * 0.74, -0.0004)
    slot.lineTo(radius * 0.74, 0.0004); slot.lineTo(-radius * 0.74, 0.0004); slot.closePath(); shape.holes.push(slot)
    const g = new ExtrudeGeometry(shape, { depth: 0.0008, bevelEnabled: true, bevelSize: 0.00013, bevelThickness: 0.0001, bevelSegments: 2, curveSegments: 24 })
    g.translate(X(px), Y(py), z); const mesh = add(name, g, material)
    const backing = add(name + 'SlotShadow', new CylinderGeometry(radius * 0.86, radius * 0.86, 0.0003, 32), m.darkSteel)
    backing.rotation.x = Math.PI / 2; backing.position.set(X(px), Y(py), z - 0.00015)
    if (name === 'CockPivot' || name === 'CockTopPin' || name === 'FrizzenPivot') {
      const rim = add(name + 'Bezel', new TorusGeometry(radius+0.00045,0.00045,12,80), material)
      rim.position.set(X(px),Y(py),z+0.0001)
    }
    return mesh
  }
  const axial = (name: string, start: number, end: number, y: number, r1: number, r2: number, material: Material, radial = 96, segments = 1) => {
    const g = new CylinderGeometry(r2, r1, end - start, radial, segments)
    g.rotateZ(-Math.PI / 2); g.translate((start + end) / 2, y, 0)
    return add(name, g, material)
  }
  const stock = stockGeometry(); add('WoodStock', stock, m.wood)
  const muzzle = X(1760), breech = muzzle - D.documented.barrelLength, axis = D.reconstruction.barrelAxisHeight
  // Facets at the breech and a gently tapered exterior, with only a shallow dark muzzle recess.
  axial('FacetedBreech', breech, breech + 0.10, axis, 0.018, 0.0164, m.steel, 8, 8)
  const barrelStart = breech + 0.096
  const barrel = new CylinderGeometry(0.0107, 0.0164, muzzle - barrelStart, 128, 240, true)
  barrel.rotateZ(-Math.PI / 2); barrel.translate((muzzle + barrelStart) / 2, axis, 0)
  add('Barrel', barrel, m.steel)
  const lip = new Shape(); lip.absarc(0, 0, 0.0107, 0, Math.PI * 2, false)
  const hole = new Path(); hole.absarc(0, 0, D.documented.calibreMm / 2000, 0, Math.PI * 2, true); lip.holes.push(hole)
  const muzzleGeometry = new ExtrudeGeometry(lip, { depth: 0.008, bevelEnabled: false, curveSegments: 64 })
  muzzleGeometry.rotateY(Math.PI / 2); muzzleGeometry.translate(muzzle - 0.008, axis, 0)
  add('MuzzleRim', muzzleGeometry, m.steel)
  axial('MuzzleShadow', muzzle - 0.0085, muzzle - 0.008, axis, 0.0089, 0.0089, m.darkSteel, 64)
  plate('BreechTang', [[389, 586], [388, 579], [454, 574], [459, 581]], -0.006, 0.012, m.steel)
  // The stock fittings are formed straps, open around wood, with rolled edge highlights.
  const band = (name: string, px: number, width: number) => {
    const radius = (x: number) => 0.0164 + (0.0107-0.0164)*(x-barrelStart)/(muzzle-barrelStart)
    const fitted = fittedBand(stock,X(px),width,axis,radius,Y(616))
    add(name, fitted.geometry, m.brass)
    // Resampled outline keeps the edging smooth without multiplying vertices at tiny hull edges.
    const curve = new CatmullRomCurve3(fitted.edge, true, 'centripetal')
    const path = curve.getSpacedPoints(48).slice(0,-1)
    for (const side of [-1, 1]) tube(name + 'RolledEdge' + side, path.map((p) => [p.x + side*width/2,p.y,p.z]),0.00028,m.brass,true)
    let rimWidth = 0
    for (let i=0;i<fitted.edge.length;i++) {
      const a=fitted.edge[i], b=fitted.edge[(i+1)%fitted.edge.length], y=Y(599)
      if ((a.y-y)*(b.y-y)<=0 && Math.abs(b.y-a.y)>1e-8) rimWidth=Math.max(rimWidth,a.z+(b.z-a.z)*(y-a.y)/(b.y-a.y))
    }
    screw(name + 'Pin', px,599,rimWidth,0.0019,m.brass)
  }
  band('RearBand', 793, 0.018)
  band('MiddleBand', 1225, 0.016)
  band('NoseBand', 1610, 0.015)
  band('NoseBandFront', 1675, 0.009)
  const noseBridge = plate('NoseBandBridge', [[1605, 580], [1613, 580], [1622, 586], [1679, 586], [1679, 605], [1651, 610], [1623, 608], [1605, 604]], 0.0123, 0.0015, m.brass)
  const reverseBridge = noseBridge.clone(); reverseBridge.name = 'NoseBandBridgeReverse'; reverseBridge.scale.z = -1; root.add(reverseBridge)
  plate('FrontSight', [[1602, 574], [1606, 569], [1613, 569], [1619, 574], [1618, 581], [1602, 581]], -0.0014, 0.0028, m.brass)
  for (const [name, a, b] of [['RearBandSpring', 724, 781], ['MiddleBandSpring', 1158, 1215], ['NoseBandSpring', 1546, 1600]] as const) {
    plate(name, [[a, 603], [b, 600], [b, 604], [a, 606]], 0.0132, 0.0009, m.steel)
  }
  axial('Ramrod', X(598), X(1757), Y(616), 0.0024, 0.0030, m.steel, 48, 80)
  axial('RamrodHead', X(1728), X(1757), Y(616), 0.0030, 0.0040, m.steel, 64, 8)
  plate('BayonetLug', [[1718, 600], [1727, 600], [1727, 605], [1718, 605]], -0.002, 0.004, m.steel, false)
  plate('ButtPlate', [[39, 618], [44, 613], [49, 615], [52, 726], [60, 731], [59, 737], [48, 731]], -0.023, 0.046, m.brass)
  plate('ButtPlateHeel', [[45, 612], [85, 610], [91, 613], [49, 617]], -0.010, 0.020, m.brass)
  // Side plate, cock and frizzen silhouettes are traced from the supplied photograph.
  plate('LockMortise', [[383, 611], [398, 595], [424, 586], [456, 586], [496, 595], [551, 597], [569, 602], [565, 614], [493, 619], [420, 620]], 0.020, 0.0015, m.wood)
  plate('LockPlate', [[384, 610], [400, 596], [425, 587], [455, 587], [495, 596], [549, 598], [567, 603], [563, 612], [493, 617], [420, 618]], 0.022, 0.003, m.steel)
  plate('Cock', [[431, 601], [430, 587], [438, 573], [446, 560], [451, 542], [460, 540], [469, 549], [465, 566], [454, 580], [451, 596], [444, 604]], 0.027, 0.005, m.steel,
    true, [[[443, 577], [449, 564], [457, 554], [460, 558], [455, 572], [448, 581]]])
  screw('CockPivot', 438, 598, 0.033, 0.006)
  screw('CockTopPin', 457, 564, 0.034, 0.0055)
  plate('LowerJaw', [[447, 543], [457, 539], [488, 555], [490, 560], [479, 564]], 0.023, 0.018, m.steel, false)
  plate('FlintLeather', [[461, 539], [475, 546], [477, 551], [476, 554], [470, 554], [460, 551]], 0.025, 0.0185, m.leather, false)
  add('Flint',chippedFlint([[479,548],[488,552],[497,558],[496,561],[493,567],[484,563],[481,561],[474,555],[472,553]].map(([x,y]) => new Vector3(X(x),Y(y),0.027)),0.016),m.flint)
  plate('UpperJaw', [[453, 538], [458, 534], [482, 546], [480, 550]], 0.022, 0.020, m.steel, false)
  tube('JawScrewStem', [[X(462), Y(542), 0.034], [X(473), Y(521), 0.034]], 0.0022, m.steel)
  // Visible surface relief only; spacing is illustrative, not a measured screw specification.
  const stemStart = new Vector3(X(462),Y(542),0.034), stemEnd = new Vector3(X(473),Y(521),0.034)
  const stemDirection = stemEnd.clone().sub(stemStart).normalize()
  for (let i=0;i<7;i++) {
    const thread = add('JawScrewSurfaceRidge'+i,new TorusGeometry(0.0022,0.00018,8,48),m.steel)
    thread.quaternion.setFromUnitVectors(new Vector3(0,0,1),stemDirection)
    thread.position.copy(stemStart).lerp(stemEnd,0.18+i*0.07)
  }
  tube('JawScrewLoop', [[X(471), Y(528), 0.034], [X(469), Y(520), 0.034], [X(476), Y(516), 0.034], [X(479), Y(521), 0.034], [X(475), Y(529), 0.034]], 0.0016, m.steel, true)
  const bowl: Vector2[] = []
  for (let i=0;i<=48;i++) { const a=i/48*Math.PI/2; bowl.push(new Vector2(Math.sin(a)*0.010,-Math.cos(a)*0.007)) }
  for (let i=48;i>=0;i--) { const a=i/48*Math.PI/2; bowl.push(new Vector2(Math.sin(a)*0.0088,-Math.cos(a)*0.0056)) }
  const pan = add('BrassPan',new LatheGeometry(bowl,96),m.brass)
  pan.scale.set(1.15,1,0.72); pan.position.set(X(492),Y(577),0.028)
  plate('PanBolster', [[478,579],[488,578],[501,583],[510,588],[505,597],[492,592],[485,587]],0.019,0.006,m.brass)
  const lipPoints: [number,number,number][] = Array.from({length:48},(_,i) => { const a=i/48*Math.PI*2; return [X(492)+Math.cos(a)*0.011,Y(577),0.028+Math.sin(a)*0.0068] })
  tube('PanLip',lipPoints,0.00055,m.brass,true)
  plate('Frizzen', [[506, 555], [513, 551], [525, 570], [526, 585], [519, 590], [514, 583], [516, 571]], 0.025, 0.008, m.steel)
  plate('FrizzenFace', [[508, 551], [530, 527], [542, 513], [545, 513], [542, 524], [521, 553], [516, 558]], 0.025, 0.012, m.steel, false)
  tube('FrizzenSpring', [[X(554), Y(603), 0.028], [X(538), Y(601), 0.029], [X(516), Y(600), 0.029], [X(509), Y(594), 0.029]], 0.0023, m.steel)
  screw('FrizzenPivot', 520, 586, 0.034, 0.0036)
  screw('SpringPin', 552, 606, 0.027, 0.0026)
  screw('LockRearPin', 405, 606, 0.026, 0.0024)
  // Left-side outline cannot be measured from the supplied right-side view; see evidence record.
  plate('CounterPlate', [[393, 597], [405, 590], [425, 596], [460, 603], [516, 599], [540, 602], [536, 610], [512, 612], [459, 609], [418, 604], [398, 607]], -0.026, 0.002, m.brass)
  for (const [px, py] of [[406, 599], [530, 605]]) {
    const reverse = screw('CounterPlatePin' + px, px, py, 0.026, 0.004)
    reverse.scale.z = -1
    const backing = root.getObjectByName('CounterPlatePin' + px + 'SlotShadow')!
    backing.position.z *= -1
  }
  plate('TriggerPlate', [[374, 627], [397, 621], [454, 621], [470, 625], [464, 632], [398, 632]], -0.010, 0.020, m.brass)
  plate('TriggerGuard', [[380, 630], [388, 649], [401, 661], [423, 664], [444, 657], [455, 643], [459, 627], [454, 627], [450, 641], [440, 653], [422, 659], [404, 657], [394, 647], [386, 630]], -0.006, 0.012, m.brass)
  plate('Trigger', [[421, 627], [424, 633], [421, 643], [418, 653], [416, 650], [417, 640], [418, 628]], -0.002, 0.004, m.steel)
  const slingLoop = (name: string, px: number, py: number) => tube(name, [[X(px-7),Y(py),-0.007], [X(px-6),Y(py+8),-0.012], [X(px+4),Y(py+10),0], [X(px+6),Y(py+8),0.012], [X(px+7),Y(py),0.007]], 0.0015, m.steel, true)
  slingLoop('MiddleSlingSwivel', 1222, 622)
  slingLoop('RearSlingSwivel', 462, 639)
  root.userData = { units: 'metres', reference: 'Padikovo, Tula 1811', evidenceLevel: 'source-based-reconstruction', functional: false, unverified: ['overall length', 'hidden side', 'wood species', 'markings', 'fitting depths'], version: '0.2.0' }
  return root
}
