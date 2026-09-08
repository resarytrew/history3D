import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, Vector2, Vector3 } from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function smoothMetal(geometry: BufferGeometry): BufferGeometry {
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv')
  const result = mergeVertices(geometry, 0.0000001)
  result.computeVertexNormals(); geometry.dispose(); return result
}

/** Small exterior camber, rather than a flat sheet; does not describe internal lock parts. */
export function camberPlate(geometry: BufferGeometry, amount: number): BufferGeometry {
  const result = new TessellateModifier(0.004, 7).modify(geometry)
  geometry.dispose(); result.computeBoundingBox()
  const box = result.boundingBox!, size = box.getSize(new Vector3()), center = box.getCenter(new Vector3())
  const position = result.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const u = (position.getX(i) - center.x) / (size.x / 2)
    const v = (position.getY(i) - center.y) / (size.y / 2)
    position.setZ(i, position.getZ(i) + amount * Math.max(0, 1-u*u) * Math.max(0, 1-v*v))
  }
  result.computeBoundingBox(); return smoothMetal(result)
}

function hull(points: Vector2[]): Vector2[] {
  const sorted = points.sort((a,b) => a.x-b.x || a.y-b.y)
  const cross = (a: Vector2,b: Vector2,c: Vector2) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  const lower: Vector2[] = [], upper: Vector2[] = []
  for (const p of sorted) {
    while (lower.length > 1 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop()
    lower.push(p)
  }
  for (const p of sorted.slice().reverse()) {
    while (upper.length > 1 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop(); upper.pop(); return lower.concat(upper)
}

function offsetPolygon(points: Vector2[], distance: number): Vector2[] {
  return points.map((p,i) => {
    const previous = points[(i+points.length-1)%points.length], next = points[(i+1)%points.length]
    const a = new Vector2(p.y-previous.y, previous.x-p.x).normalize()
    const b = new Vector2(next.y-p.y, p.x-next.x).normalize()
    const bisector = a.clone().add(b).normalize()
    return p.clone().addScaledVector(bisector, distance / Math.max(0.15, bisector.dot(a)))
  })
}

function stockSection(stock: BufferGeometry, x: number): Vector2[] {
  const p = stock.getAttribute('position'), radial = Number(stock.userData.radial), rows = Number(stock.userData.longitudinal)
  const stride = radial + 1
  if (x < p.getX(0) || x > p.getX(rows*stride)) return []
  let row = 0
  while (row < rows-1 && p.getX((row+1)*stride) < x) row++
  const t = (x-p.getX(row*stride))/(p.getX((row+1)*stride)-p.getX(row*stride))
  return Array.from({ length: radial }, (_,j) => {
    const a = row*stride+j, b = a+stride
    return new Vector2(-(p.getZ(a)*(1-t)+p.getZ(b)*t), p.getY(a)*(1-t)+p.getY(b)*t)
  })
}

/** A visible strap hugs the envelope of the existing exterior, instead of a floating ellipse. */
export function fittedBand(stock: BufferGeometry, x: number, width: number, axis: number, barrelRadius: (x: number) => number, rodY: number) {
  const points: Vector2[] = []
  for (const sampleX of [x-width/2, x, x+width/2]) {
    points.push(...stockSection(stock, sampleX))
    for (let i = 0; i < 128; i++) {
      const angle = i/128 * Math.PI*2, r = barrelRadius(sampleX)
      points.push(new Vector2(Math.sin(angle)*r, axis+Math.cos(angle)*r))
      points.push(new Vector2(Math.sin(angle)*0.003, rodY+Math.cos(angle)*0.003))
    }
  }
  const envelope = hull(points)
  const outer = offsetPolygon(envelope, 0.00135), inner = offsetPolygon(envelope, 0.00035)
  const shape = new Shape(outer); shape.closePath()
  const hole = new Path(inner.slice().reverse()); hole.closePath(); shape.holes.push(hole)
  const geometry = new ExtrudeGeometry(shape, { depth: width, steps: 4, bevelEnabled: true, bevelSize: 0.00015, bevelThickness: 0.00015, bevelSegments: 4 })
  geometry.rotateY(Math.PI/2); geometry.translate(x-width/2, 0, 0)
  return { geometry: smoothMetal(geometry), edge: outer.map((p) => new Vector3(x,p.y,-p.x)) }
}

/** Irregular edge and flake planes, retaining the small stone silhouette from the photograph. */
export function chippedFlint(points: Vector3[], depth: number): BufferGeometry {
  const center = points.reduce((sum,p) => sum.add(p), new Vector3()).multiplyScalar(1/points.length)
  const front = points.map((p,i) => new Vector3(p.x,p.y,p.z+depth*(0.78+0.1*Math.sin(i*4.7))))
  const back = points.map((p) => p.clone())
  const ridge = center.clone().add(new Vector3(-0.001,0.0005,depth))
  const positions: number[] = []
  const triangle = (a: Vector3,b: Vector3,c: Vector3) => positions.push(...a.toArray(),...b.toArray(),...c.toArray())
  // Input follows the traced clockwise image outline, i.e. a clockwise world XY perimeter.
  for (let i = 0; i < points.length; i++) {
    const j = (i+1)%points.length
    triangle(ridge,front[j],front[i]); triangle(center,back[i],back[j])
    triangle(back[i],front[i],front[j]); triangle(back[i],front[j],back[j])
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(positions,3)); geometry.computeVertexNormals()
  return geometry
}
