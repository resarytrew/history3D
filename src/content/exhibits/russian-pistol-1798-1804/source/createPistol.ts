import * as T from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { barrelStart, photoScale, pistolDimensions, X, Y } from './dimensions'
import { pistolMaterials } from './materials'
import { fromLeftPhoto } from './photoRegistration'

type Point = readonly [number, number]
/** Editable exterior reconstruction. Coordinates trace museum l_1.jpg; depths are inferred. */
export function createPistol() {
  const root = new T.Group(); root.name = 'RussianPistol1798_1804'
  root.userData = { units: 'metres', prototype: 'Tula 1803, Padikovo museum', status: 'reconstruction', internalMechanism: false }
  const m = pistolMaterials()
  const contours = new WeakMap<T.Mesh,T.Vector2[]>()
  function add(name: string, geometry: T.BufferGeometry, material: T.Material | T.Material[]) {
    const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true
    root.add(mesh); return mesh
  }
  const point = (x: number, y: number, z = 0) => new T.Vector3(x, -y, z)
  function outline(name: string, points: readonly Point[], z: number, depth: number, material = m.steel, bevel = 1.5, holes:readonly (readonly Point[])[] = []) {
    const shape = new T.Shape()
    const last = points[points.length - 1], first = points[0]
    if(['LockPlate','Cock','LowerJaw','UpperJaw','Frizzen','FrizzenFoot','PanConnection','FrizzenSpring','SpringTail','Trigger'].includes(name)){
      // Interpolating contours retain the photographed local inflections; midpoint
      // rounding used to erase the rear tip, jaw taper and narrow neck transitions.
      const curve=new T.CatmullRomCurve3(points.map(([x,y])=>point(x,y)),true,'centripetal')
      curve.getPoints(points.length*4).forEach((p,i)=>{if(i===0)shape.moveTo(p.x,p.y);else shape.lineTo(p.x,p.y)})
    }else if(['SpringScrewHead','JawFinialCollar','UpperJawShoulder','FrizzenShoe'].includes(name)){
      points.forEach(([x,y],i)=>{if(i===0)shape.moveTo(x,-y);else shape.lineTo(x,-y)})
    }else{
      shape.moveTo((last[0]+first[0])/2,-(last[1]+first[1])/2)
      points.forEach(([x,y],i)=>{const next=points[(i+1)%points.length];shape.quadraticCurveTo(x,-y,(x+next[0])/2,-(y+next[1])/2)})
    }
    shape.closePath()
    for(const loop of holes){
      const path=new T.Path(),curve=new T.CatmullRomCurve3(loop.map(([x,y])=>point(x,y)),true,'centripetal')
      curve.getPoints(loop.length*4).forEach((p,i)=>{if(i===0)path.moveTo(p.x,p.y);else path.lineTo(p.x,p.y)})
      path.closePath();shape.holes.push(path)
    }
    const geometry = new T.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 5 })
    // Physical, planar UVs prevent the default exporter from repeating a map per photo pixel.
    const uv = geometry.getAttribute('uv'), pos = geometry.getAttribute('position')
    const normals=geometry.getAttribute('normal')
    const lockOutline=['LockPlate','Cock','CockSpur','LowerJaw','UpperJaw','Frizzen','FrizzenFoot','FrizzenPivotLobe','PanConnection','FrizzenSpring','SpringTail'].includes(name)
    for (let i = 0; i < uv.count; i++) {
      if(lockOutline&&Math.abs(normals.getZ(i))<.4)uv.setXY(i,(pos.getX(i)+pos.getY(i))/240,pos.getZ(i)/240)
      else uv.setXY(i, pos.getX(i) / 240, pos.getY(i) / 240)
    }
    geometry.translate(0, 0, z)
    const mesh=add(name, geometry, material);contours.set(mesh,shape.getPoints(5));return mesh
  }
  function cylinder(name: string, a: number[], b: number[], radius: number, material = m.steel, endRadius = radius, radial = 48) {
    const av = point(a[0], a[1], a[2]), bv = point(b[0], b[1], b[2]), direction = bv.clone().sub(av)
    const g = new T.CylinderGeometry(endRadius, radius, direction.length(), radial, 3)
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()))
    g.translate(...av.add(bv).multiplyScalar(.5).toArray()); return add(name, g, material)
  }
  function screw(name: string, x: number, y: number, z: number, radius: number, material = m.steel, reverse = false) {
    const sign = reverse ? -1 : 1
    if(name==='CockPivot'||name==='FrizzenPivot'){
      // Two bevelled face segments expose an actual shallow slot floor.
      // This is exterior sculpture, with no concealed fastener construction.
      const slotAngle=name==='CockPivot'?1.13:1.19,gap=name==='CockPivot'?1.05:.82
      const geometries:T.BufferGeometry[]=[]
      for(const side of [0,1]){
        const shape=new T.Shape(),r=radius-.4,alpha=Math.asin((gap+.35)/r)
        for(let i=0;i<=64;i++){
          const angle=alpha+(Math.PI-2*alpha)*i/64+side*Math.PI
          const u=r*Math.cos(angle),v=r*Math.sin(angle)
          if(i===0)shape.moveTo(u,v);else shape.lineTo(u,v)
        }
        shape.closePath()
        const g=new T.ExtrudeGeometry(shape,{depth:2.25,steps:1,bevelEnabled:true,
          bevelSize:.35,bevelThickness:.35,bevelSegments:3,curveSegments:12})
        const p=g.getAttribute('position'),uv=g.getAttribute('uv')
        for(let i=0;i<p.count;i++){
          const u=p.getX(i),v=p.getY(i),depth=p.getZ(i)
          p.setZ(i,depth+1.3*Math.max(0,1-(u*u+v*v)/(radius*radius))*T.MathUtils.smoothstep(depth,0,2.25))
          uv.setXY(i,(x+u)/240,(-y+v)/240)
        }
        g.rotateZ(slotAngle);g.translate(x,-y,z+1.15);g.computeVertexNormals();geometries.push(g)
      }
      const head=mergeGeometries(geometries);geometries.forEach(g=>g.dispose())
      add(`${name}Head`,head,m.lock)
      cylinder(`${name}Rim`,[x,y,z-.7],[x,y,z+.9],radius,m.lock,radius)
      const floor=new T.PlaneGeometry(radius*1.99,gap*2)
      floor.rotateZ(slotAngle);floor.translate(x,-y,z+.96)
      add(`${name}SlotFloor`,floor,m.dark)
      return
    }
    cylinder(`${name}Head`, [x, y, z], [x, y, z + 3 * sign], radius, material, radius * .93)
    // A shallow dark slot indication; no internal fastener thread is modelled.
    const g = new T.BoxGeometry(radius * 1.5, 1.8, .6)
    g.rotateZ(.9); g.translate(x, -y, z + 3.25 * sign); add(`${name}Slot`, g, m.dark)
  }

  // A crowned exterior cross-section gives forged parts volume without invented engraving.
  function smoothSurfaceNormals(geometry:T.BufferGeometry){
    // UV islands must not split the lighting at a physically continuous bevel.
    const surface=new T.BufferGeometry()
    surface.setAttribute('position',geometry.getAttribute('position').clone())
    if(geometry.index)surface.setIndex(geometry.index.clone())
    const welded=mergeVertices(surface,.001);surface.dispose();welded.computeVertexNormals()
    const wp=welded.getAttribute('position'),wn=welded.getAttribute('normal'),normals=new Map<string,number[]>()
    const key=(p:T.BufferAttribute|T.InterleavedBufferAttribute,i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1000)).join(',')
    for(let i=0;i<wp.count;i++)normals.set(key(wp,i),[wn.getX(i),wn.getY(i),wn.getZ(i)])
    const p=geometry.getAttribute('position'),values:number[]=[]
    for(let i=0;i<p.count;i++)values.push(...normals.get(key(p,i))!)
    geometry.setAttribute('normal',new T.Float32BufferAttribute(values,3));welded.dispose()
  }
  function subdivideSurface(source:T.BufferGeometry,edge:number){
    const g=source.index?source.toNonIndexed():source.clone()
    const attributes=['position','normal','uv'] as const
    let faces:number[][]=[]
    for(let i=0;i<g.attributes.position.count;i++)faces.push(attributes.flatMap(name=>{
      const a=g.getAttribute(name);return Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k])
    }))
    g.dispose()
    const midpoint=(a:number[],b:number[])=>a.map((v,i)=>(v+b[i])/2)
    const long=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])>edge
    // Both triangles incident on a long edge receive the same midpoint. Independent
    // longest-edge subdivision left T-junctions that opened into cracks after relief.
    for(let pass=0;pass<6;pass++){
      const next:number[][]=[];let split=false
      for(let i=0;i<faces.length;i+=3){
        const [a,b,c]=faces.slice(i,i+3),mask=Number(long(a,b))+2*Number(long(b,c))+4*Number(long(c,a))
        const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a)
        const variants=[[[a,b,c]],[[a,ab,c],[ab,b,c]],[[b,bc,a],[bc,c,a]],
          [[ab,b,bc],[a,ab,c],[ab,bc,c]],[[c,ca,b],[ca,a,b]],
          [[a,ab,ca],[ab,b,c],[ab,c,ca]],[[ca,bc,c],[a,b,ca],[b,bc,ca]],
          [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]]]
        next.push(...variants[mask].flat());split ||= mask!==0
      }
      faces=next;if(!split)break
    }
    const result=new T.BufferGeometry();let offset=0
    for(const name of attributes){const size=source.getAttribute(name).itemSize
      result.setAttribute(name,new T.Float32BufferAttribute(faces.flatMap(v=>v.slice(offset,offset+size)),size));offset+=size}
    return result
  }
  function seatRaisedDetail(mesh:T.Mesh,parent:T.Mesh,rise:number){
    const old=mesh.geometry;mesh.geometry=subdivideSurface(old,5);old.dispose()
    mesh.geometry.computeBoundingBox()
    const box=mesh.geometry.boundingBox!,center=box.getCenter(new T.Vector3()),p=mesh.geometry.getAttribute('position')
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),level=(p.getZ(i)-box.min.z)/(box.max.z-box.min.z)
      let surface:T.Intersection|undefined
      // The bevel may overhang its support slightly; sample just inside that edge.
      for(const t of [0,.01,.03,.07,.12]){
        const origin=new T.Vector3(T.MathUtils.lerp(x,center.x,t),T.MathUtils.lerp(y,center.y,t),200)
        surface=new T.Raycaster(origin,new T.Vector3(0,0,-1)).intersectObject(parent)[0]
        if(surface)break
      }
      if(!surface)throw new Error(`${mesh.name} has no exterior support`)
      p.setZ(i,surface.point.z-.45+level*(rise+.45))
    }
    smoothSurfaceNormals(mesh.geometry)
  }
  function crown(mesh: T.Mesh, amount: number) {
    const old = mesh.geometry
    const sculpt=['Cock','CockSpur','LowerJaw','UpperJaw','JawScrewFinial','Frizzen','FrizzenFoot','FrizzenPivotLobe'].includes(mesh.name)
    mesh.geometry = sculpt?subdivideSurface(old,6):new TessellateModifier(12,4).modify(old); old.dispose()
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox!, size = box.getSize(new T.Vector3()), pos = mesh.geometry.getAttribute('position')
    const normals=mesh.geometry.getAttribute('normal')
    const sculptHeight=(x:number,y:number)=>{
      let distance=Infinity
      const contour=contours.get(mesh)!
      for(let j=1;j<contour.length;j++){
        const a=contour[j-1],b=contour[j],dx=b.x-a.x,dy=b.y-a.y
        const t=T.MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1)
        distance=Math.min(distance,Math.hypot(x-a.x-dx*t,y-a.y-dy*t))
      }
      return amount*(1-Math.exp(-distance/2.8))
    }
    for (let i = 0; i < pos.count; i++) {
      const nx = (pos.getX(i) - box.min.x) / size.x, ny = (pos.getY(i) - box.min.y) / size.y
      const side = (pos.getZ(i) - (box.min.z + box.max.z) / 2) / (size.z / 2)
      let lift=amount * Math.sin(Math.PI * nx) * Math.sin(Math.PI * ny)
      if(sculpt){
        // Round the cross-section relative to the actual silhouette. A bounding-box
        // sine made narrow S-shaped areas flat and left the finial heart-shaped.
        const x=pos.getX(i),y=pos.getY(i),step=.25
        lift=sculptHeight(x,y)
        const dx=(sculptHeight(x+step,y)-sculptHeight(x-step,y))/(2*step)*side
        const dy=(sculptHeight(x,y+step)-sculptHeight(x,y-step))/(2*step)*side
        const nz=normals.getZ(i)/(1+lift*2/size.z)
        const normal=new T.Vector3(normals.getX(i)-dx*nz,normals.getY(i)-dy*nz,nz).normalize()
        normals.setXYZ(i,normal.x,normal.y,normal.z)
      }
      pos.setZ(i, pos.getZ(i) + lift * side)
    }
    mesh.geometry.deleteAttribute('normal')
    const smooth = mergeVertices(mesh.geometry); mesh.geometry.dispose(); mesh.geometry = smooth
    smoothSurfaceNormals(smooth)
    return mesh
  }

  // Longitudinal stock sections, full elliptical volume with a softly flattened lock inlet.
  const sections = [
    [42, 657, 684, 3], [49, 629, 705, 24], [60, 621, 730, 39], [72, 616, 740, 47],
    [85, 614, 746, 52], [105, 602, 750, 57], [125, 583, 751, 60], [146, 562, 751, 61],
    [160, 550, 748, 60], [170, 542, 743, 59], [180, 534, 731, 58], [190, 526, 701, 56],
    [200, 519, 672, 53], [215, 509, 649, 50], [240, 494, 625, 47], [270, 480, 604, 45],
    [300, 468, 588, 45], [330, 455, 578, 46], [360, 449, 568, 49], [390, 437, 557, 52],
    [420, 429, 546, 55], [450, 421, 541, 57], [500, 410, 539, 59], [550, 402, 538, 59],
    [590, 398, 536, 59], [620, 398, 536, 58], [650, 405, 537, 58],
    [700, 431, 540, 57], [760, 438, 537, 55], [820, 439, 535, 53], [875, 448, 536, 51],
    [920, 446, 535, 49], [975, 442, 533, 46], [1020, 441, 532, 44], [1090, 444, 529, 42],
    [1130, 443, 526, 40], [1150, 442, 510, 40], [1170, 441, 505, 40],
    [1240, 441, 501, 38], [1300, 442, 498, 36], [1340, 443, 491, 34],
    [1360, 443, 486, 33], [1406, 444, 483, 32],
  ]
  function sectionAt(x: number) {
    let j = 0; while (j < sections.length - 2 && x > sections[j + 1][0]) j++
    const a = sections[j], b = sections[j + 1], t = T.MathUtils.clamp((x - a[0]) / (b[0] - a[0]), 0, 1)
    // Cubic Hermite, with slopes from neighbouring sample sections.
    return [1, 2, 3].map(k => {
      const prev = sections[Math.max(0, j - 1)], next = sections[Math.min(sections.length - 1, j + 2)]
      const s0 = (b[k] - prev[k]) / (b[0] - prev[0]) * (b[0] - a[0])
      const s1 = (next[k] - a[k]) / (next[0] - a[0]) * (b[0] - a[0])
      return (2*t*t*t-3*t*t+1)*a[k]+(t*t*t-2*t*t+t)*s0+(-2*t*t*t+3*t*t)*b[k]+(t*t*t-t*t)*s1
    })
  }
  const axisY = 433
  const muzzleRadius = pistolDimensions.muzzleOuterDiameterMm / 2000 / photoScale
  const recessRadius = pistolDimensions.calibreMm / 2000 / photoScale
  const barrelRadiusAt = (x: number) => {
    const samples = [[barrelStart,33],[barrelStart+15,33],[barrelStart+115,32],[barrelStart+300,32],[1453,muzzleRadius]]
    let i = 0; while (i < samples.length-2 && x > samples[i+1][0]) i++
    const a=samples[i],b=samples[i+1]
    return T.MathUtils.lerp(a[1],b[1],T.MathUtils.clamp((x-a[0])/(b[0]-a[0]),0,1))
  }
  const inletBlend = (x: number) => T.MathUtils.smoothstep(x,395,455) * (1-T.MathUtils.smoothstep(x,825,885))
  // Shallow carved borders visible around the lock and along the fore-end.
  // Relief is part of the wood surface, so there is no detached decorative strip.
  const lockBorder=new T.CatmullRomCurve3([[399,511],[421,489],[437,466],[486,443],
    [548,431],[598,434],[660,432],[724,453],[791,466],[848,491],[871,512],
    [858,529],[789,535],[701,536],[591,540],[495,544],[436,544],[410,534]].map(([x,y])=>new T.Vector3(x,y,0)),true,'centripetal').getPoints(170)
  const foreBorder=new T.CatmullRomCurve3([[790,464],[849,483],[893,500],[932,505],
    [965,495],[1012,488],[1054,488],[1096,479],[1125,480],[1152,491],[1194,491],
    [1255,485],[1317,482],[1355,477]].map(([x,y])=>new T.Vector3(x,y,0)),false,'centripetal').getPoints(100)
  const reliefAt=(x:number,y:number,sign:number)=>{
    if(x<390||x>1360)return 0
    const curve=x<878&&sign>0?lockBorder:x>790?foreBorder:[]
    let d2=Infinity
    for(const p of curve)d2=Math.min(d2,(x-p.x)**2+(y-p.y)**2)
    return 1.7*Math.exp(-d2/30)-.55*Math.exp(-d2/120)
  }
  const stockSide = (x: number, y: number, sign = 1) => {
    const [top,bottom,width] = sectionAt(x), vertical=(y-(top+bottom)/2)/((bottom-top)/2)
    const side=width * Math.pow(Math.max(0,1-vertical*vertical),.35)
    const base=sign < 0 ? side : T.MathUtils.lerp(side,Math.min(width*.92,side),inletBlend(x))
    return Math.max(0,base+reliefAt(x,y,sign)*Math.min(1,base/12))
  }
  const n = 320, sides = 72, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let i = 0; i <= n; i++) {
    const t=i/n, x=t<=.5?42+318*t*2:360+1046*(t-.5)*2, [top, bottom, width] = sectionAt(x)
    for (let k = 0; k <= sides; k++) {
      const theta = k / sides * Math.PI * 2
      let y = -(top + bottom) / 2 + (bottom - top) / 2 * Math.cos(theta)
      // Broad side flats give the inlet a physical seat; edges stay rounded.
      let z = width * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), .7)
      // Retain the accepted right inlet; the counterplate follows the curved left wood.
      if (z > 0) z = T.MathUtils.lerp(z,Math.min(z,width*.92),inletBlend(x))
      z+=Math.sign(z)*reliefAt(x,-y,Math.sign(z))*Math.min(1,Math.abs(z)/12)
      // Carve the upper stock surface to the lower barrel arc. This is an actual channel,
      // not a floating cylinder or a depth/texture illusion; the lower stock stays solid.
      const radius = barrelRadiusAt(x) + .6
      if (x >= barrelStart && Math.cos(theta) > 0 && Math.abs(z) < radius)
        y = Math.min(y, -axisY - Math.sqrt(radius*radius-z*z))
      positions.push(x, y, z); uvs.push(i / n * 2.5, k / sides)
      if (i < n && k < sides) { const a = i * (sides + 1) + k, b = a + sides + 1; indices.push(a, a + 1, b, b, a + 1, b + 1) }
    }
  }
  // Ear-clip the concave barrel-channel section and orient each end outward.
  // A triangle fan would fill across the channel; the old end caps also faced inward.
  for (const end of [0,n]) {
    const base=end*(sides+1), contour=Array.from({length:sides},(_,k)=>new T.Vector2(positions[(base+k)*3+1],positions[(base+k)*3+2]))
    for(const triangle of T.ShapeUtils.triangulateShape(contour,[])) {
      const [a,b,c]=triangle.map(i=>contour[i]), winding=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
      if ((winding > 0) !== (end === n)) [triangle[1],triangle[2]]=[triangle[2],triangle[1]]
      indices.push(...triangle.map(i=>base+i))
    }
  }
  const stock = new T.BufferGeometry(); stock.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  stock.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); stock.setIndex(indices); stock.computeVertexNormals()
  add('WoodStock', stock, m.wood)

  // Exterior barrel and a blind visual recess; hidden operating components are not reconstructed.
  const barrelProfile = [new T.Vector2(0, barrelStart), new T.Vector2(33, barrelStart), new T.Vector2(33, barrelStart + 15),
    new T.Vector2(32, barrelStart + 115), new T.Vector2(32, barrelStart + 300), new T.Vector2(muzzleRadius, 1453),
    new T.Vector2(muzzleRadius - .5, 1455), new T.Vector2(recessRadius, 1455), new T.Vector2(recessRadius, 1305), new T.Vector2(0, 1305)]
  // Split normals at profile corners: averaging rim, inner wall and end face made a false bowl.
  const barrelRings=barrelProfile.slice(1).map((p,i)=>{
    const a=barrelProfile[i],g=new T.LatheGeometry([a,p],128),uv=g.getAttribute('uv'),pos=g.getAttribute('position')
    for(let k=0;k<uv.count;k++) {
      if(a.y===p.y)uv.setXY(k,pos.getX(k)/240,pos.getZ(k)/240)
      else uv.setXY(k,uv.getX(k)*Math.PI*(a.x+p.x)/240,pos.getY(k)/240)
    }
    return g
  })
  const barrel = mergeGeometries(barrelRings); barrelRings.forEach(g=>g.dispose())
  barrel.rotateZ(-Math.PI / 2); barrel.translate(0, -axisY, 0)
  // Preserve every lathe index (the old hardcoded nine-segment regrouping lost faces).
  add('Barrel', barrel, m.steel)
  const tang = outline('BreechTang', [[487,0],[499,-12],[barrelStart-15,-15],[barrelStart+5,-23],
    [barrelStart+5,23],[barrelStart-15,15],[499,12]], 0, 6, m.steel, 1.2)
  const tangOld=tang.geometry; tang.geometry=new TessellateModifier(14,8).modify(tangOld); tangOld.dispose()
  const tangPos = tang.geometry.getAttribute('position')
  for (let i=0;i<tangPos.count;i++) {
    const x=tangPos.getX(i), z=tangPos.getY(i), thickness=tangPos.getZ(i)
    const [top,bottom,width]=sectionAt(x)
    const surface=-(top+bottom)/2+(bottom-top)/2*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(z)/width,2/.7)))
    tangPos.setXYZ(i,x,surface+thickness-3,z)
  }
  tang.geometry.computeVertexNormals()
  // The photo-plane to top-plane coordinate swap reverses orientation.
  const tangIndex=Array.from({length:tangPos.count},(_,i)=>i)
  for(let i=0;i<tangIndex.length;i+=3)[tangIndex[i+1],tangIndex[i+2]]=[tangIndex[i+2],tangIndex[i+1]]
  tang.geometry.setIndex(tangIndex); tang.geometry.computeVertexNormals()
  // Exterior transition shoulder only; no chamber or internal firing components.
  const shoulder = outline('BreechShoulder', [[barrelStart-17,407],[barrelStart-9,400],[barrelStart+2,400],
    [barrelStart+4,461],[barrelStart-12,456]], -20, 40, m.steel, 1)
  crown(shoulder,1)
  const tangScrew=new T.SphereGeometry(1,24,12); tangScrew.scale(6,2,6); tangScrew.translate(519,-sectionAt(519)[0]+4,0); add('TangScrew',tangScrew,m.steel)

  // Registration of the supplied close-up against the right-hand whole-object photo.
  // These are image-space artwork contours, not fabrication dimensions.
  const detail = (points: readonly Point[]): Point[] => points.map(([x,y])=>[555+(x-550)*.385,474+(y-570)*.385])
  const plate=outline('LockPlate', detail([[187,634],[217,619],[242,568],[283,537],[357,509],
    [456,478],[511,465],[590,461],[705,442],[780,441],[806,475],[924,497],[986,520],
    [1101,535],[1230,558],[1312,586],[1339,620],[1335,649],[1304,661],[1138,660],
    [720,664],[415,677],[294,679],[233,667],[209,652]]),48,4,m.steel,.8)
  function seat(mesh:T.Mesh, base:number, sign:number, edge=12, clearance=-1.8){
    const old=mesh.geometry;mesh.geometry=new TessellateModifier(edge,9).modify(old);old.dispose()
    const pos=mesh.geometry.getAttribute('position'),normals=mesh.geometry.getAttribute('normal')
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=-pos.getY(i),z=stockSide(x,y,sign)
      const dx=stockSide(x+.5,y,sign)-stockSide(x-.5,y,sign)
      const dy=stockSide(x,y+.5,sign)-stockSide(x,y-.5,sign)
      const nz=normals.getZ(i)
      const n=new T.Vector3(normals.getX(i)-sign*dx*nz,normals.getY(i)+sign*dy*nz,nz).normalize()
      normals.setXYZ(i,n.x,n.y,n.z)
      pos.setZ(i,sign*(z+clearance)+pos.getZ(i)-base)
    }
    const smooth=mergeVertices(mesh.geometry);mesh.geometry.dispose();mesh.geometry=smooth
    smoothSurfaceNormals(smooth)
  }
  seat(plate,48,1)
  // Static museum silhouette study only. No moving joints or firing simulation.
  crown(outline('Cock',detail([[453,548],[466,510],[491,485],[523,474],[550,478],[582,500],
    [614,507],[645,486],[651,457],[636,427],[603,404],[579,381],[571,350],[579,319],
    [596,291],[620,276],[648,276],[674,286],[680,310],[662,317],[643,310],[625,320],
    [617,342],[622,364],[647,382],[689,406],[716,434],[733,469],[732,510],[716,549],
    [685,589],[651,621],[608,646],[564,657],[517,652],[480,631],[458,597]]),59,12,m.steel,1.3),2.6)
  crown(outline('CockSpur',detail([[579,319],[600,248],[628,193],[652,145],[663,118],[659,99],
    [668,81],[680,74],[691,79],[695,91],[688,92],[681,85],[674,94],[676,110],
    [687,142],[678,171],[657,211],[628,253],[614,292]]),59,11,m.steel,.65),2.4)
  crown(outline('LowerJaw',detail([[637,282],[660,285],[694,299],[734,315],[777,337],[809,352],
    [827,360],[826,366],[806,366],[771,354],[728,338],[690,326],[667,323],[654,332],
    [643,329],[646,315],[631,310]]),58,16,m.steel,.5),1.3)
  crown(outline('UpperJaw',detail([[669,198],[695,210],[728,223],[751,237],[778,266],[810,302],[841,335],
    [844,341],[835,338],[808,324],[774,300],[742,277],[716,260],[687,246],[658,230]]),62,15,m.steel,.45),1.8)
  // In the photograph the leaves thin markedly toward their visible tips.
  for(const [name,center] of [['LowerJaw',66],['UpperJaw',69.5]] as const){
    const mesh=root.getObjectByName(name) as T.Mesh,p=mesh.geometry.getAttribute('position')
    for(let i=0;i<p.count;i++){
      const factor=1-.78*T.MathUtils.smoothstep(p.getX(i),628,668)
      p.setZ(i,center+(p.getZ(i)-center)*factor)
    }
    smoothSurfaceNormals(mesh.geometry)
  }
  const shaftBottom=detail([[685,282]])[0],shaftTop=detail([[715,228]])[0]
  cylinder('JawScrew',[...shaftBottom,72],[...shaftTop,72],5.6,m.steel,5.6)
  // Visible ring relief of the photographed stem, represented by closed sculptural
  // ridges. There is no concealed thread, mating part or helical construction.
  const shaftA=point(...shaftBottom,72),shaftB=point(...shaftTop,72)
  const shaftOrientation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),shaftB.clone().sub(shaftA).normalize())
  const ridges=[.20,.39,.58,.77].map(t=>{
    const g=new T.TorusGeometry(6.65,.72,8,48),center=shaftA.clone().lerp(shaftB,t)
    g.applyQuaternion(shaftOrientation);g.translate(...center.toArray());return g
  })
  add('JawScrewVisibleRidges',mergeGeometries(ridges),m.steel);ridges.forEach(g=>g.dispose())
  const upperShoulder=outline('UpperJawShoulder',detail([[669,205],[698,215],[727,229],
    [750,241],[744,250],[716,240],[687,228],[660,218]]),71,8,m.steel,.65)
  seatRaisedDetail(upperShoulder,root.getObjectByName('UpperJaw') as T.Mesh,2.5)
  // Horizontal photo slices retain the asymmetric overhang of the visible head.
  // Depth is a sculptural estimate, independent of any operating construction.
  const headSlices=[
    [215,710,751,8],[204,704,760,10],[194,707,765,10],
    [184,715,771,11],[171,724,790,13],[158,726,811,15],
    [146,724,815,16],[132,724,810,15],[117,725,797,13],
    [105,729,786,10],[98,735,774,7],[95,748,765,2],
  ]
  const hp:number[]=[],hu:number[]=[],hi:number[]=[],headSegments=48
  const headCurve=new T.CatmullRomCurve3(headSlices.map(([y,l,r])=>new T.Vector3(l,r,y)),false,'centripetal')
  const headDepth=new T.CatmullRomCurve3(headSlices.map(([y,,,d])=>new T.Vector3(d,0,y)),false,'centripetal')
  const headRows=48
  for(let j=0;j<=headRows;j++){
    const t=j/headRows,profile=headCurve.getPoint(t),depth=headDepth.getPoint(t).x
    for(let k=0;k<=headSegments;k++){
      const theta=k/headSegments*Math.PI*2,center=(profile.x+profile.y)/2,radius=(profile.y-profile.x)/2
      const u=center+radius*Math.cos(theta);let v=profile.z
      // The top recess follows the visible off-centre notch; it is a shallow surface form.
      const notch=(1-T.MathUtils.smoothstep(Math.abs(u-770),4,10))*T.MathUtils.smoothstep(132-v,0,30)
      v+=notch*16
      const [x,y]=detail([[u,v]])[0]
      hp.push(x,-y,73+depth*Math.sin(theta));hu.push(u/240,v/240)
      if(j<headRows&&k<headSegments){const a=j*(headSegments+1)+k,b=a+headSegments+1;hi.push(a,b,a+1,b,b+1,a+1)}
    }
  }
  for(const row of [0,headRows]){
    const index=hp.length/3,start=row*(headSegments+1),p=headCurve.getPoint(row/headRows)
    const [x,y]=detail([[(p.x+p.y)/2,p.z]])[0];hp.push(x,-y,73);hu.push(x/240,-y/240)
    for(let k=0;k<headSegments;k++)if(row===0)hi.push(index,start+k,start+k+1);else hi.push(index,start+k+1,start+k)
  }
  const finial=new T.BufferGeometry();finial.setAttribute('position',new T.Float32BufferAttribute(hp,3))
  finial.setAttribute('uv',new T.Float32BufferAttribute(hu,2));finial.setIndex(hi);finial.computeVertexNormals()
  add('JawScrewFinial',finial,m.steel)
  const collarBase=detail([[724,220]])[0],collarTop=detail([[733,200]])[0]
  const collarA=point(...collarBase,73),collarB=point(...collarTop,73),collarLength=collarA.distanceTo(collarB)
  const collarProfile=[[0,0],[9.5,0],[10.8,1],[10.8,collarLength-1.2],[9.3,collarLength],[0,collarLength]]
  const collarGeometry=new T.LatheGeometry(collarProfile.map(([r,h])=>new T.Vector2(r,h)),6)
  collarGeometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),collarB.clone().sub(collarA).normalize()))
  collarGeometry.translate(...collarA.toArray())
  const facetedCollar=collarGeometry.toNonIndexed();collarGeometry.dispose();facetedCollar.computeVertexNormals()
  add('JawFinialCollar',facetedCollar,m.steel)
  cylinder('CockPivotSeat',[555,474,stockSide(555,474)],[555,474,64],12)
  const cockRimProfile=[[20.5,76.2],[21,78.2],[22,79.2],[23.2,78.8],[24,77.2],[24,75.8],[20.5,76.2]]
  const cockRim=new T.LatheGeometry(cockRimProfile.map(([r,z])=>new T.Vector2(r,z)),96)
  cockRim.rotateX(Math.PI/2);cockRim.translate(555,-474,0)
  add('CockPivotSurround',cockRim,m.steel)
  screw('CockPivot',555,474,77,20.5)
  // Fixed upright exhibition pose traced from this specimen, without articulation.
  crown(outline('Frizzen',detail([[807,47],[820,42],[833,79],[850,139],[868,216],[881,298],
    [899,391],[889,400],[862,395],[857,319],[846,239],[833,160],[818,93]]),48,14,m.steel,.5),1.2)
  crown(outline('FrizzenFoot',detail([[863,390],[889,382],[928,388],[962,392],[996,389],[1034,398],
    [1079,420],[1112,443],[1143,448],[1155,440],[1150,426],[1159,420],[1179,424],
    [1187,449],[1174,468],[1156,474],[1130,469],[1093,459],[1068,449],[1047,455],
    [1029,469],[1007,462],[1008,454],[980,446],[933,440],[891,430],[862,414]]),48,14,m.steel,.6),1.8)
  const shoe=outline('FrizzenShoe',detail([[866,395],[889,396],[928,402],[965,409],[1006,423],
    [1001,439],[976,443],[936,435],[896,425],[866,412]]),56,9,m.steel,1.1)
  seatRaisedDetail(shoe,root.getObjectByName('FrizzenFoot') as T.Mesh,2.3)
  crown(outline('FrizzenPivotLobe',detail([[1051,445],[1045,470],[1022,478],[1020,509],
    [1035,540],[1055,553],[1065,545],[1072,527],[1084,516],[1085,476]]),48,16,m.steel,.6),2)
  // D-shaped shallow exterior relief. Its straight back blends into the visible
  // side backing, unlike the old isolated circular bowl and oval pedestal.
  const rim=new T.Shape()
  rim.moveTo(659,54);rim.lineTo(728,54);rim.quadraticCurveTo(733,61,727,70)
  rim.bezierCurveTo(714,80,676,83,664,73);rim.quadraticCurveTo(655,63,659,54)
  const contour=rim.getPoints(12),panP:number[]=[],panUv:number[]=[],panI:number[]=[]
  contour.pop()
  const ringCount=contour.length
  const rings=[{scale:1,y:432},{scale:.88,y:445},{scale:.53,y:457},{scale:.17,y:459},
    {scale:.66,y:440},{scale:.86,y:432}]
  for(const {scale,y} of rings)for(const p of contour){
    const x=694+(p.x-694)*scale,z=64+(p.y-64)*scale
    panP.push(x,-y,z);panUv.push(x/240,z/240)
  }
  // Outside, rim, inside, and a closed shallow floor use independent surface strips.
  const join=(a:number,b:number)=>{for(let i=0;i<ringCount;i++){
    const j=(i+1)%ringCount;panI.push(a*ringCount+i,a*ringCount+j,b*ringCount+i,
      b*ringCount+i,a*ringCount+j,b*ringCount+j)
  }}
  join(0,1);join(1,2);join(2,3);join(5,0);join(4,5)
  for(const ring of [3,4]){
    const center=panP.length/3;panP.push(694,-rings[ring].y,64);panUv.push(694/240,64/240)
    for(let i=0;i<ringCount;i++){
      const a=ring*ringCount+i,b=ring*ringCount+(i+1)%ringCount
      if(ring===3)panI.push(center,b,a);else panI.push(center,a,b)
    }
  }
  const pan=new T.BufferGeometry();pan.setAttribute('position',new T.Float32BufferAttribute(panP,3))
  pan.setAttribute('uv',new T.Float32BufferAttribute(panUv,2));pan.setIndex(panI);pan.computeVertexNormals();add('Pan',pan,m.steel)
  const lipP:number[]=[],lipUv:number[]=[],lipI:number[]=[]
  for(const [scale,y] of [[1.015,431.5],[1.015,433.4],[.86,433.4],[.86,431.5]])for(const p of contour){
    const x=694+(p.x-694)*scale,z=64+(p.y-64)*scale
    lipP.push(x,-y,z);lipUv.push(x/240,z/240)
  }
  for(let row=0;row<4;row++)for(let k=0;k<ringCount;k++){
    const a=row*ringCount+k,b=row*ringCount+(k+1)%ringCount
    const c=((row+1)%4)*ringCount+k,d=((row+1)%4)*ringCount+(k+1)%ringCount
    lipI.push(a,c,b,b,c,d)
  }
  const lip=new T.BufferGeometry();lip.setAttribute('position',new T.Float32BufferAttribute(lipP,3))
  lip.setAttribute('uv',new T.Float32BufferAttribute(lipUv,2));lip.setIndex(lipI);lip.computeVertexNormals()
  add('PanLip',lip,m.steel)
  outline('PanConnection',[[645,437],[648,425],[654,424],[655,413],[659,412],[661,430],
    [668,434],[716,434],[725,440],[720,448],[698,454],[675,453],[649,448]],38,19,m.steel,.65)
  cylinder('FrizzenPivotSeat',[754,445,stockSide(754,445)],[754,445,65],10)
  screw('FrizzenPivot',754,445,66,12)
  // Separate static exterior strip, not engraved ornament or a designed elastic mechanism.
  const spring=outline('FrizzenSpring',detail([[991,541],[1040,550],[1111,560],[1195,578],
    [1278,589],[1317,611],[1330,634],[1327,651],[1310,660],[1275,660],[1174,645],
    [1081,642],[1052,633],[1042,624],[1098,627],[1201,641],[1289,648],[1315,640],
    [1312,625],[1277,613],[1195,600],[1100,575],[1031,557]]),0,4,m.steel,.65)
  seat(spring,-4,1)
  const springTail=outline('SpringTail',detail([[875,603],[949,600],[992,607],[1032,619],
    [1045,637],[1005,627],[948,617]]),0,4,m.steel,.45);seat(springTail,-3,1)
  const [headX,headY]=detail([[1055,631]])[0],headZ=stockSide(headX,headY)+6
  const headContour=Array.from({length:6},(_,i)=>[headX+9*Math.cos(i*Math.PI/3+.2),headY+9*Math.sin(i*Math.PI/3+.2)] as Point)
  outline('SpringScrewHead',headContour,headZ+1,4,m.steel,.8)
  const headBase=headContour.map(([x,y])=>[headX+(x-headX)*1.11,headY+(y-headY)*1.11] as Point)
  outline('SpringScrewShoulder',headBase,headZ-1,2,m.steel,.5)
  const rearRibs=[[[347,527],[356,522],[379,665],[371,676]],[[369,521],[379,516],[400,662],[392,672]]] as const
  rearRibs.forEach((points,i)=>{const rib=outline(`LockPlateRib${i}`,detail(points),0,2.7,m.steel,.7);seat(rib,-3.5,1)})

  // Low edge moulding is seated directly on the plate's curved face.
  const borderPath=detail([[202,636],[225,634],[250,579],[289,553],[341,530],
    [337,552],[357,656],[306,665],[253,654],[228,639]])
  const borderCurve=new T.CatmullRomCurve3(borderPath.map(([x,y])=>point(x,y,stockSide(x,y)+2.8)),false,'centripetal')
  const borderGeometry=new T.TubeGeometry(borderCurve,80,.65,6,false)
  add('LockPlateRearMoulding',borderGeometry,m.steel)

  // A low forged margin follows the photographed outer S-curve. Each vertex is
  // seated on the existing face; it is a broad relief band rather than a wire.
  const cock=root.getObjectByName('Cock') as T.Mesh
  const marginPath=detail([[492,601],[519,626],[557,635],[603,626],[646,601],[680,565],
    [702,525],[714,483],[701,446],[674,419],[643,397],[613,376],[600,353],[607,327],[625,310]])
  const marginCurve=new T.CatmullRomCurve3(marginPath.map(([x,y])=>point(x,y)),false,'centripetal')
  const mp:number[]=[],mu:number[]=[],mi:number[]=[],marginSteps=160
  for(let j=0;j<=marginSteps;j++){
    const t=j/marginSteps,p=marginCurve.getPoint(t),tangent=marginCurve.getTangent(t)
    for(const across of [-1,-.6,0,.6,1]){
      const x=p.x-tangent.y*across*.85,y=p.y+tangent.x*across*.85
      const hit=new T.Raycaster(new T.Vector3(x,y,200),new T.Vector3(0,0,-1)).intersectObject(cock)[0]
      if(!hit)throw new Error('Cock relief band leaves the photographed face')
      const rise=.65*(1-across*across)*Math.sin(Math.PI*t)**.35
      mp.push(x,y,hit.point.z+rise-.06);mu.push(x/240,y/240)
    }
    if(j<marginSteps)for(let k=0;k<4;k++){
      const a=j*5+k,b=a+5;mi.push(a,b,a+1,a+1,b,b+1)
    }
  }
  const margin=new T.BufferGeometry();margin.setAttribute('position',new T.Float32BufferAttribute(mp,3))
  margin.setAttribute('uv',new T.Float32BufferAttribute(mu,2));margin.setIndex(mi);margin.computeVertexNormals()
  add('CockRaisedMargin',margin,m.steel)

  // Surface artwork for the legible ТУЛА / 1803 on the supplied close-up.
  // The worn small rear stamp and the unseen marks are deliberately not invented.
  const lettering:Point[][][]=[
    [[[0,0],[22,0]],[[11,0],[11,25]],[[6,25],[16,25]],[[0,0],[0,5]],[[22,0],[22,5]]],
    [[[0,0],[10,14],[20,0]],[[10,14],[5,24],[0,25]],[[0,0],[5,0]],[[16,0],[23,0]]],
    [[[0,25],[9,0],[14,0],[22,25]],[[0,25],[5,25]],[[18,25],[25,25]]],
    [[[0,25],[10,0],[12,0],[23,25]],[[5,16],[18,16]],[[0,25],[6,25]],[[18,25],[25,25]]],
    [[[4,5],[11,0],[11,24]],[[5,24],[17,24]]],
    [[[10,0],[3,2],[2,8],[10,13],[18,18],[16,24],[7,26],[1,21],[3,16],[16,8],[17,3],[10,0]]],
    [[[10,0],[3,3],[1,12],[4,23],[11,25],[18,22],[20,12],[17,3],[10,0]]],
    [[[1,3],[9,0],[17,3],[17,9],[10,12],[17,15],[19,21],[13,25],[4,25],[0,21]]],
  ]
  const stampP:number[]=[],stampUv:number[]=[],stampI:number[]=[]
  lettering.forEach((glyph,index)=>glyph.forEach(stroke=>{
    const [ox,oy]=index<4?[772+index*32,552]:[777+(index-4)*29,594]
    const curve=new T.CatmullRomCurve3(stroke.map(([x,y])=>point(ox+x,oy+y)),false,'centripetal')
    const steps=Math.max(3,(stroke.length-1)*3),base=stampP.length/3
    for(let i=0;i<=steps;i++){
      const p=curve.getPoint(i/steps),t=curve.getTangent(i/steps)
      for(const side of [-1,1]){
        const [x,y]=detail([[p.x-t.y*.62*side,-p.y-t.x*.62*side]])[0]
        const hit=new T.Raycaster(point(x,y,200),new T.Vector3(0,0,-1)).intersectObject(plate)[0]
        if(!hit)throw new Error('Lettering must lie on the visible lock plate')
        stampP.push(x,-y,hit.point.z+.035);stampUv.push(x/240,-y/240)
      }
      if(i<steps){const a=base+i*2;stampI.push(a,a+2,a+1,a+1,a+2,a+3)}
    }
  }))
  const stamp=new T.BufferGeometry();stamp.setAttribute('position',new T.Float32BufferAttribute(stampP,3))
  stamp.setAttribute('uv',new T.Float32BufferAttribute(stampUv,2));stamp.setIndex(stampI);stamp.computeVertexNormals()
  add('LockPlateInscription',stamp,new T.MeshStandardMaterial({name:'Worn inscription',color:'#464037',roughness:.9,metalness:.5,side:T.DoubleSide}))

  // Neutral iron lets shape and lighting describe the lock, without painted wear.
  for(const child of root.children.slice(root.children.indexOf(plate)))if(child instanceof T.Mesh){
    if(child.material===m.steel)child.material=m.lock
  }

  // Serpentine left counterplate follows l_2.jpg; three visible heads, not a musket's two rosettes.
  const reverse: Point[] = ([[644,494],[646,481],[658,466],[679,470],[696,481],[724,484],
    [751,475],[782,456],[805,449],[826,453],[855,465],[877,468],[884,453],[884,435],
    [894,420],[907,421],[919,434],[920,451],[939,450],[957,455],[976,468],[992,471],
    [1011,470],[1025,459],[1039,470],[1044,484],[1036,497],[1022,498],[1005,490],
    [986,491],[967,486],[947,475],[925,473],[906,482],[887,490],[864,491],[839,483],
    [818,474],[801,473],[784,480],[759,497],[736,507],[710,506],[685,508],[665,513],
    [650,507]] as Point[]).map(([x,y])=>fromLeftPhoto(x,y))
  const counter=outline('Counterplate',reverse,-61,2.4,m.brass,.5);seat(counter,-58.6,-1)
  // Only the visible heads are placed; no through-axes or internal fasteners are inferred.
  for (const [u,v,r] of [[1028,482,9],[903,441,15],[669,490,15]]) {
    const [x,y]=fromLeftPhoto(u,v)
    const start=root.children.length,z=-stockSide(x,y,-1)-1.2
    screw(`CounterScrew${1500-u}`,x,y,z,r,m.steel,true)
    // Tilt the visible heads to the curved exterior seat, avoiding a buried lower edge.
    const dx=stockSide(x+.5,y,-1)-stockSide(x-.5,y,-1)
    const dy=stockSide(x,y+.5,-1)-stockSide(x,y-.5,-1)
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,-1),new T.Vector3(-dx,dy,-1).normalize())
    for(const child of root.children.slice(start))if(child instanceof T.Mesh)
      child.geometry.translate(-x,y,-z).applyQuaternion(q).translate(x,-y,z)
  }

  // Guard is a flattened forged strip, rather than a circular wire tube.
  const guardCurve = new T.CatmullRomCurve3([[427,sectionAt(427)[1]+1],[439,579],[464,605],[499,619],[536,617],[570,596],[585,566],[590,sectionAt(590)[1]+1]].map(([x,y])=>point(x,y,0)))
  const gp: number[]=[], guv: number[]=[], gi: number[]=[]
  for(let i=0;i<=160;i++){const t=i/160,p=guardCurve.getPoint(t), tangent=guardCurve.getTangent(t), side=new T.Vector3(-tangent.y,tangent.x,0)
    for(let j=0;j<=12;j++){const a=j/12*Math.PI*2; const v=p.clone().addScaledVector(side,(3.5+.55*Math.sin(t*Math.PI)+.2*Math.sin(t*3*Math.PI))*Math.cos(a)); v.z=(14+3*Math.cos(t*Math.PI*2))*Math.sin(a);gp.push(...v.toArray());guv.push(t*2,j/12)
      if(i<160&&j<12){const a0=i*13+j,b=a0+13;gi.push(a0,a0+1,b,b,a0+1,b+1)}}}
  const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(gp,3));gg.setAttribute('uv',new T.Float32BufferAttribute(guv,2));gg.setIndex(gi);gg.computeVertexNormals();add('TriggerGuard',gg,m.brass)
  const triggerPlate=outline('TriggerPlate', [[414,0],[431,-17],[580,-16],[607,-11],[758,-9],[789,0],
    [758,9],[607,11],[580,16],[431,17]],0,3.5,m.brass,.7)
  const triggerOld=triggerPlate.geometry;triggerPlate.geometry=new TessellateModifier(14,5).modify(triggerOld);triggerOld.dispose()
  const triggerPos=triggerPlate.geometry.getAttribute('position')
  for(let i=0;i<triggerPos.count;i++) {
    const x=triggerPos.getX(i),z=triggerPos.getY(i),depth=triggerPos.getZ(i),[top,bottom,width]=sectionAt(x)
    const surface=-(top+bottom)/2-(bottom-top)/2*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(z)/width,2/.7)))
    triggerPos.setXYZ(i,x,surface-depth+1,z)
  }
  triggerPlate.geometry.computeVertexNormals()
  outline('Trigger',detail([[451,735],[434,752],[421,773],[412,800],[408,828],[410,852],
    [416,876],[414,891],[408,899],[397,899],[388,893],[383,881],[386,866],[394,855],
    [400,856],[397,833],[399,807],[406,780],[418,755],[433,740]]),-4,8,m.steel,.45,
    [detail([[395,867],[390,876],[392,886],[398,891],[404,888],[404,881],[400,873]])])

  // The supplied specimen has a complete oval exterior band around the fore-end.
  const bandP:number[]=[], bandUv:number[]=[], bandI:number[]=[], bandSides=96
  for(const [ring,x,offset] of [[0,1364,1.6],[1,1408,1.6],[2,1408,.1],[3,1364,.1]] as const) {
    const [top,bottom,width]=sectionAt(Math.min(x,1406)), middle=-(top+bottom)/2, half=(bottom-top)/2
    for(let k=0;k<=bandSides;k++) {
      const a=k/bandSides*Math.PI*2, dy=Math.cos(a), dz=Math.sin(a), center=-445
      const inside=(r:number)=> {
        const y=center+r*dy,z=r*dz
        return (y+axisY)**2+z*z<=barrelRadiusAt(x)**2 || ((y-middle)/half)**2+Math.pow(Math.abs(z)/width,2/.7)<=1
      }
      let r=100; while(r>0&&!inside(r))r-=.25
      let low=r,high=r+.25
      for(let i=0;i<12;i++){const mid=(low+high)/2;if(inside(mid))low=mid;else high=mid}
      bandP.push(x,center+(low+offset)*dy,(low+offset)*dz);bandUv.push(ring/3,k/bandSides)
    }
  }
  for(let ring=0;ring<4;ring++)for(let k=0;k<bandSides;k++){
    const a=ring*(bandSides+1)+k,b=((ring+1)%4)*(bandSides+1)+k
    bandI.push(a,a+1,b,b,a+1,b+1)
  }
  for(const k of [0,bandSides]){
    const a=k,b=bandSides+1+k,c=2*(bandSides+1)+k,d=3*(bandSides+1)+k
    if(k===0)bandI.push(a,b,c,a,c,d);else bandI.push(a,c,b,a,d,c)
  }
  const band=new T.BufferGeometry();band.setAttribute('position',new T.Float32BufferAttribute(bandP,3));band.setAttribute('uv',new T.Float32BufferAttribute(bandUv,2));band.setIndex(bandI);band.computeVertexNormals();add('MuzzleBand',band,m.brass)
  outline('FrontSight',[[1274,400],[1283,393],[1299,389],[1315,390],[1329,400]],-6,12,m.brass,.8)
  const ramrodY = (x: number) => 519 - (x-1080)*.03
  // The rear end enters the solid fore-end volume instead of ending as an exposed cut stub.
  cylinder('WoodRamrod',[1000,ramrodY(1000),0],[1395,ramrodY(1395),0],7.5,m.wood,7)
  cylinder('RamrodTip',[1362,ramrodY(1362),0],[1419,ramrodY(1419),0],7.5,m.brass,10)
  for (const [name,start,end] of [['rear',1130,1210],['front',1310,1358]] as const) {
    const profile = [[13,start],[13,end],[9,end],[9,start],[13,start]].map(([r,x])=>new T.Vector2(r,x))
    const geometry=new T.LatheGeometry(profile,8); geometry.rotateZ(-Math.PI/2)
    const p=geometry.getAttribute('position')
    for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)-ramrodY(p.getX(i)))
    const faceted=geometry.toNonIndexed(); geometry.dispose(); faceted.deleteAttribute('normal'); faceted.computeVertexNormals()
    add(`RamrodPipe_${name}`,faceted,m.brass)
    const x=(start+end)/2, bottom=sectionAt(x)[1]
    outline(`RamrodPipeMount_${name}`,[[start+8,bottom-7],[end-8,bottom-7],[end-8,ramrodY(x)-7],[start+8,ramrodY(x)-7]],-5,10,m.brass,.8)
  }
  // Visible flush attachments; their unseen internal construction remains unmodelled.
  for(const x of [945,1275]) for(const sign of [-1,1]) {
    const y=sectionAt(x)[1]-16
    screw(`BarrelPin_${x}_${sign}`,x,y,sign*stockSide(x,y),2.5,m.steel,sign<0)
  }

  // Continuous surface bands wrap the apple and taper into long side ears.
  // The shared loft avoids the rear seam and silhouette clipping of projected plates.
  const capUpper=[[42,658],[49,637],[72,646],[105,640],[131,626],[146,617],
    [170,601],[215,573],[250,551],[276,536],[278,539]]
  const earLower=[[131,690],[140,657],[150,638],[170,616],[215,584],[250,560],[276,543],[278,539]]
  const lipUpper=[[131,690],[140,717],[150,729],[164,736],[173,sectionAt(173)[1]]]
  function capLine(points:number[][],x:number){
    let i=0;while(i<points.length-2&&x>points[i+1][0])i++
    const a=points[i],b=points[i+1],t=T.MathUtils.clamp((x-a[0])/(b[0]-a[0]),0,1)
    const previous=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+2)]
    const m0=(b[1]-previous[1])/(b[0]-previous[0])*(b[0]-a[0])
    const m1=(next[1]-a[1])/(next[0]-a[0])*(b[0]-a[0])
    return (2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*m1
  }
  for(const sign of [1,-1]){
    const cp:number[]=[],cu:number[]=[],ci:number[]=[]
    for(const [start,end,steps,angular,kind] of [[42,131,96,48,0],[131,278,96,24,1],[131,173,48,24,2]]){
      const base=cp.length/3
      for(let i=0;i<=steps;i++){
        const x=start+(end-start)*i/steps,[top,bottom,width]=sectionAt(x)
        const angle=(y:number)=>Math.acos(T.MathUtils.clamp(((top+bottom)/2-y)/((bottom-top)/2),-1,1))
        const first=angle(capLine(kind===2?lipUpper:capUpper,x)),last=kind===1?angle(capLine(earLower,x)):Math.PI
        for(let k=0;k<=angular;k++){
          const theta=first+(last-first)*k/angular
          cp.push(x,-(top+bottom)/2+((bottom-top)/2+1.6)*Math.cos(theta),
            sign*(width+2)*Math.pow(Math.max(0,Math.sin(theta)),.7));cu.push(x/240,k/angular)
          if(i<steps&&k<angular){const a=base+i*(angular+1)+k,b=a+angular+1
            if(sign===1)ci.push(a,a+1,b,b,a+1,b+1);else ci.push(a,b,a+1,b,b+1,a+1)}
        }
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cp,3))
    g.setAttribute('uv',new T.Float32BufferAttribute(cu,2));g.setIndex(ci);g.computeVertexNormals()
    add(sign===1?'ButtCapRight':'ButtCapLeft',g,m.brass)
  }
  const heelNail=new T.SphereGeometry(1,20,12);heelNail.scale(7,3.5,7);heelNail.translate(105,-751,0)
  add('ButtCapNail',heelNail,m.brass)
  const capRear=new T.SphereGeometry(1,32,24);capRear.scale(2.4,15.1,5);capRear.translate(42,-670.5,0)
  add('ButtCapRear',capRear,m.brass)
  // Small plain escutcheon: the photograph's worn crowned cipher is not speculatively transcribed.
  const esc=new T.SphereGeometry(1,48,24);esc.scale(40,2.1,23);esc.translate(290,0,0)
  const escPos=esc.getAttribute('position')
  for(let i=0;i<escPos.count;i++) {
    const x=escPos.getX(i),z=escPos.getZ(i),[top,bottom,width]=sectionAt(x)
    const surface=-(top+bottom)/2+(bottom-top)/2*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(z)/width,2/.7)))
    escPos.setY(i,surface+escPos.getY(i)+.2)
  }
  esc.computeVertexNormals();add('GripEscutcheon',esc,m.brass)

  // Bake photo-space construction into metric vertices, preserving simple GLB node transforms.
  const matrix = new T.Matrix4().makeScale(photoScale,photoScale,photoScale)
  matrix.setPosition(X(0),Y(0),0)
  root.traverse(object=>{if(object instanceof T.Mesh){object.geometry.applyMatrix4(matrix);object.geometry.computeBoundingBox();object.geometry.computeBoundingSphere()}})
  // Ground the actual exterior; dimensions/hotspots share this small, documented translation.
  const box=new T.Box3().setFromObject(root);root.userData.groundOffset=-box.min.y
  for(const child of root.children) if(child instanceof T.Mesh) child.geometry.translate(0,-box.min.y,0)
  // Underscores deliberately survive GLTFLoader's node-name sanitization unchanged.
  const names: Record<string,string> = {
    WoodStock:'stock', Barrel:'barrel', BreechTang:'breech_tang', BreechShoulder:'breech', TangScrew:'breech_tang_screw',
    LockPlate:'lock_lockplate', Cock:'lock_cock', CockSpur:'lock_cock_spur', LowerJaw:'lock_lower_jaw', UpperJaw:'lock_upper_jaw',
    JawScrew:'lock_jaw_screw', JawScrewFinial:'lock_jaw_screw_head', Flint:'lock_flint', Frizzen:'lock_frizzen',
    FrizzenFoot:'lock_frizzen_foot', Pan:'lock_pan', PanConnection:'lock_pan_connection', FrizzenSpring:'lock_frizzen_spring',
    Counterplate:'sideplate', TriggerGuard:'trigger_guard', TriggerPlate:'trigger_plate', Trigger:'trigger',
    MuzzleBand:'foreend_plate', FrontSight:'front_sight', WoodRamrod:'ramrod', RamrodTip:'ramrod_head',
    ButtCapRight:'buttcap_right', ButtCapLeft:'buttcap_left', ButtCapHeel:'buttcap_heel', ButtCapNail:'buttcap_fastener', GripEscutcheon:'grip_escutcheon',
  }
  for(const child of root.children) child.name = `pistol_${names[child.name] ?? child.name.replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase()}`
  root.name='pistol'
  return root
}
