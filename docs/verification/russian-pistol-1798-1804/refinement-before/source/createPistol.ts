import * as T from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { barrelStart, photoScale, pistolDimensions, X, Y } from './dimensions'
import { pistolMaterials } from './materials'

type Point = readonly [number, number]
/** Editable exterior reconstruction. Coordinates trace museum l_1.jpg; depths are inferred. */
export function createPistol() {
  const root = new T.Group(); root.name = 'RussianPistol1798_1804'
  root.userData = { units: 'metres', prototype: 'Tula 1803, Padikovo museum', status: 'reconstruction', internalMechanism: false }
  const m = pistolMaterials()
  function add(name: string, geometry: T.BufferGeometry, material: T.Material | T.Material[]) {
    const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true
    root.add(mesh); return mesh
  }
  const point = (x: number, y: number, z = 0) => new T.Vector3(x, -y, z)
  function outline(name: string, points: readonly Point[], z: number, depth: number, material = m.steel, bevel = 1.5) {
    const shape = new T.Shape()
    const last = points[points.length - 1], first = points[0]
    shape.moveTo((last[0]+first[0])/2,-(last[1]+first[1])/2)
    points.forEach(([x,y],i)=>{const next=points[(i+1)%points.length];shape.quadraticCurveTo(x,-y,(x+next[0])/2,-(y+next[1])/2)})
    shape.closePath()
    const geometry = new T.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 5 })
    // Physical, planar UVs prevent the default exporter from repeating a map per photo pixel.
    const uv = geometry.getAttribute('uv'), pos = geometry.getAttribute('position')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 240, pos.getY(i) / 240)
    geometry.translate(0, 0, z); return add(name, geometry, material)
  }
  function cylinder(name: string, a: number[], b: number[], radius: number, material = m.steel, endRadius = radius, radial = 48) {
    const av = point(a[0], a[1], a[2]), bv = point(b[0], b[1], b[2]), direction = bv.clone().sub(av)
    const g = new T.CylinderGeometry(endRadius, radius, direction.length(), radial, 3)
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()))
    g.translate(...av.add(bv).multiplyScalar(.5).toArray()); return add(name, g, material)
  }
  function screw(name: string, x: number, y: number, z: number, radius: number, material = m.steel, reverse = false) {
    const sign = reverse ? -1 : 1
    cylinder(`${name}Head`, [x, y, z], [x, y, z + 3 * sign], radius, material, radius * .93)
    // A shallow dark slot indication; no internal fastener thread is modelled.
    const g = new T.BoxGeometry(radius * 1.5, 1.8, .6)
    g.rotateZ(.9); g.translate(x, -y, z + 3.25 * sign); add(`${name}Slot`, g, m.dark)
  }

  // A crowned exterior cross-section gives forged parts volume without invented engraving.
  function crown(mesh: T.Mesh, amount: number) {
    const old = mesh.geometry
    mesh.geometry = new TessellateModifier(12, 4).modify(old); old.dispose()
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox!, size = box.getSize(new T.Vector3()), pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const nx = (pos.getX(i) - box.min.x) / size.x, ny = (pos.getY(i) - box.min.y) / size.y
      const side = (pos.getZ(i) - (box.min.z + box.max.z) / 2) / (size.z / 2)
      pos.setZ(i, pos.getZ(i) + amount * Math.sin(Math.PI * nx) * Math.sin(Math.PI * ny) * side)
    }
    mesh.geometry.deleteAttribute('normal')
    const smooth = mergeVertices(mesh.geometry); mesh.geometry.dispose(); mesh.geometry = smooth; smooth.computeVertexNormals()
    return mesh
  }

  // Longitudinal stock sections, full elliptical volume with a softly flattened lock inlet.
  const sections = [
    [42, 643, 710, 2], [49, 635, 728, 28], [72, 627, 741, 47], [105, 613, 747, 57],
    [146, 584, 733, 61], [180, 555, 674, 59], [215, 529, 624, 53], [270, 495, 588, 48],
    [330, 465, 565, 48], [420, 436, 548, 55], [500, 420, 540, 61], [590, 411, 539, 61],
    [700, 423, 540, 59], [850, 430, 538, 53], [1020, 436, 550, 46], [1170, 440, 514, 40],
    [1300, 442, 501, 36], [1360, 443, 490, 33], [1406, 444, 488, 32],
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
    const samples = [[barrelStart,43],[barrelStart+15,43],[barrelStart+115,40],[barrelStart+300,39],[1453,muzzleRadius]]
    let i = 0; while (i < samples.length-2 && x > samples[i+1][0]) i++
    const a=samples[i],b=samples[i+1]
    return T.MathUtils.lerp(a[1],b[1],T.MathUtils.clamp((x-a[0])/(b[0]-a[0]),0,1))
  }
  const inletBlend = (x: number) => T.MathUtils.smoothstep(x,395,455) * (1-T.MathUtils.smoothstep(x,825,885))
  const stockSide = (x: number, y: number) => {
    const [top,bottom,width] = sectionAt(x), vertical=(y-(top+bottom)/2)/((bottom-top)/2)
    const side=width * Math.pow(Math.max(0,1-vertical*vertical),.35)
    return T.MathUtils.lerp(side,Math.min(width*.92,side),inletBlend(x))
  }
  const n = 360, sides = 80, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let i = 0; i <= n; i++) {
    const x = 42 + (1406 - 42) * i / n, [top, bottom, width] = sectionAt(x)
    for (let k = 0; k <= sides; k++) {
      const theta = k / sides * Math.PI * 2
      let y = -(top + bottom) / 2 + (bottom - top) / 2 * Math.cos(theta)
      // Broad side flats give the inlet a physical seat; edges stay rounded.
      let z = width * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), .7)
      z = T.MathUtils.lerp(z,Math.sign(z)*Math.min(Math.abs(z),width*.92),inletBlend(x))
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
  const barrelProfile = [new T.Vector2(0, barrelStart), new T.Vector2(43, barrelStart), new T.Vector2(43, barrelStart + 15),
    new T.Vector2(40, barrelStart + 115), new T.Vector2(39, barrelStart + 300), new T.Vector2(muzzleRadius, 1453),
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
  const shoulder = outline('BreechShoulder', [[barrelStart-17,410],[barrelStart-9,398],[barrelStart+2,393],
    [barrelStart+4,470],[barrelStart-12,466]], -20, 40, m.steel, 2)
  crown(shoulder,1)
  const tangScrew=new T.SphereGeometry(1,24,12); tangScrew.scale(6,2,6); tangScrew.translate(519,-sectionAt(519)[0]+4,0); add('TangScrew',tangScrew,m.steel)

  const plate=outline('LockPlate', [[423, 497], [433, 472], [463, 455], [502, 441], [548, 440], [612, 447], [682, 444], [730, 445], [782, 461], [820, 471], [850, 485], [859, 506], [848, 519], [805, 522], [503, 529], [449, 524], [428, 516]], 48, 4, m.steel, .8)
  function seat(mesh:T.Mesh, base:number, sign:number){const old=mesh.geometry;mesh.geometry=new TessellateModifier(12,9).modify(old);old.dispose();const pos=mesh.geometry.getAttribute('position')
    for(let i=0;i<pos.count;i++){
      const z=stockSide(pos.getX(i),-pos.getY(i))
      pos.setZ(i,sign*(z-1.8)+pos.getZ(i)-base)}
    mesh.geometry.deleteAttribute('normal');const smooth=mergeVertices(mesh.geometry);mesh.geometry.dispose();mesh.geometry=smooth;mesh.geometry.computeVertexNormals()}
  seat(plate,48,1)
  crown(outline('Cock', [[534,474],[539,496],[559,502],[583,499],[605,481],[620,458],[619,441],[610,424],
    [585,405],[578,393],[579,381],[588,374],[602,372],[614,378],[615,371],[611,361],[590,360],
    [574,369],[567,384],[569,401],[583,420],[592,440],[588,453],[571,462],[550,461]], 59, 12, m.steel, 4.2), 3.2)
  crown(outline('CockSpur', [[579,373],[587,351],[596,336],[603,315],[608,309],[613,315],[609,330],[607,348],[594,374]], 59, 12, m.steel, 2), 1.5)
  crown(outline('LowerJaw', [[589,372],[606,370],[632,382],[655,389],[660,396],[636,394],[608,386],[591,383]], 57, 28, m.steel, 2.4), 1.5)
  crown(outline('UpperJaw', [[600,349],[615,352],[639,366],[659,379],[651,383],[625,371],[598,361]], 59, 25, m.steel, 2), 1.5)
  cylinder('JawScrew', [608,376,72], [624,341,72], 5, m.steel, 4.5)
  const finial = new T.LatheGeometry([[0,0],[8,0],[9,4],[7,9],[10,14],[8,18],[0,18]].map(([r,y])=>new T.Vector2(r,y)),32)
  finial.rotateZ(-.43); finial.translate(624,-341,72); add('JawScrewFinial',finial,m.steel)
  // A clearly identified interpretive flint, absent from the photographed museum jaws.
  outline('Flint', [[619,368],[630,367],[653,376],[679,388],[660,395],[638,383],[619,377]], 56, 30, m.flint, .3)
  cylinder('CockPivotSeat',[555,474,stockSide(555,474)],[555,474,64],15)
  screw('CockPivot',555,474,76,16)
  // Raised striking face is curved in section, and its lid remains visibly separate from the pan.
  crown(outline('Frizzen', [[668,306],[674,304],[685,336],[694,374],[698,403],[692,415],[685,408],
    [682,377],[676,344]], 40, 27, m.steel, 2), 1.8)
  crown(outline('FrizzenFoot', [[687,404],[713,409],[739,418],[758,431],[780,435],[789,427],[793,432],
    [785,445],[772,447],[750,439],[726,428],[690,422]], 41, 26, m.steel, 1.6), 1)
  const pan=new T.LatheGeometry([[0,-460],[19,-458],[30,-451],[35,-438],[34,-430],[30,-430],
    [28,-438],[24,-447],[15,-452],[0,-452]].map(([r,y])=>new T.Vector2(r,y)),64)
  pan.scale(1.04,1,.68);pan.translate(703,0,75);add('Pan',pan,m.steel)
  outline('PanConnection',[[671,458],[687,455],[723,456],[730,466],[703,473],[673,466]],40,36,m.steel,1)
  cylinder('FrizzenPivotSeat',[754,445,stockSide(754,445)],[754,445,65],10)
  screw('FrizzenPivot',754,445,66,12)
  outline('FrizzenSpring', [[687,489],[737,478],[779,478],[833,488],[850,495],[849,503],[823,504],[753,499],[751,494],[826,498],[839,496],[830,493],[772,486],[732,485]], 61, 5, m.steel, .8)
  screw('SpringScrew',752,496,66,7)

  // Serpentine left counterplate follows l_2.jpg; three visible heads, not a musket's two rosettes.
  const reverse: Point[] = [[460,484],[467,467],[488,461],[512,471],[544,470],[570,457],[576,439],[589,428],[601,429],[612,441],[615,461],[643,467],[675,454],[700,451],[726,465],[758,479],[808,478],[831,476],[844,486],[844,502],[830,512],[808,506],[766,503],[730,494],[699,475],[678,475],[649,489],[620,495],[596,485],[570,480],[542,484],[513,494],[480,499]]
  const counter=outline('Counterplate', reverse, -61, 3, m.brass, .65);seat(counter,-58,-1)
  // Shared axes bind the two exterior ends to the same stock/lock location.
  for (const [x,y] of [[472,482],[597,454],[831,490]]) {
    const side=stockSide(x,y)
    screw(`CounterScrew${x}`,x,y,-side-1.5,7,m.steel,true)
    screw(`LockScrew${x}`,x,y,side+2,4.2)
  }

  // Guard is a flattened forged strip, rather than a circular wire tube.
  const guardCurve = new T.CatmullRomCurve3([[427,545],[440,582],[466,608],[502,620],[538,617],[569,599],[588,566],[590,544]].map(([x,y])=>point(x,y,0)))
  const gp: number[]=[], guv: number[]=[], gi: number[]=[]
  for(let i=0;i<=160;i++){const t=i/160,p=guardCurve.getPoint(t), tangent=guardCurve.getTangent(t), side=new T.Vector3(-tangent.y,tangent.x,0)
    for(let j=0;j<=12;j++){const a=j/12*Math.PI*2; const v=p.clone().addScaledVector(side,(3.8+.4*Math.sin(t*Math.PI))*Math.cos(a)); v.z=(14+3*Math.cos(t*Math.PI*2))*Math.sin(a);gp.push(...v.toArray());guv.push(t*2,j/12)
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
  crown(outline('Trigger', [[511,536],[522,540],[518,550],[508,562],[501,581],[500,597],[505,602],
    [504,609],[497,612],[491,606],[491,589],[494,570],[502,550]],-5,10,m.steel,1.8),1)

  // Fit the reinforcement to the union of the barrel and fore-end cross-sections.
  // A generic ellipse intersects the barrel at its shoulders and leaves scalloped holes.
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
  const band=new T.BufferGeometry();band.setAttribute('position',new T.Float32BufferAttribute(bandP,3));band.setAttribute('uv',new T.Float32BufferAttribute(bandUv,2));band.setIndex(bandI);band.computeVertexNormals();add('MuzzleBand',band,m.brass)
  outline('FrontSight',[[1274,400],[1283,393],[1299,389],[1315,390],[1329,400]],-6,12,m.brass,.8)
  const ramrodY = (x: number) => 534 - (x-1080)*.085
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

  // Butt cap shell and two long ears trace the prototype, with a rounded lower return.
  for(const sign of [1,-1]){
    const cp:number[]=[], cu:number[]=[], ci:number[]=[], longitudinal=100,angular=48
    for(let i=0;i<=longitudinal;i++){const x=42+236*i/longitudinal,[top,bottom,width]=sectionAt(x),t=i/longitudinal
      const start=.35+1.19*t, end=Math.PI-(Math.PI-1.59)*Math.pow(t,.7)
      for(let k=0;k<=angular;k++){const angle=start+(end-start)*k/angular
        cp.push(x,-(top+bottom)/2+((bottom-top)/2+1.4)*Math.cos(angle),sign*(width+1.4)*Math.pow(Math.sin(angle),.7));cu.push(t,k/angular)
        if(i<longitudinal&&k<angular){const a=i*(angular+1)+k,b=a+angular+1;if(sign===1)ci.push(a,a+1,b,b,a+1,b+1);else ci.push(a,b,a+1,b,b+1,a+1)}}}
    const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(cp,3));cap.setAttribute('uv',new T.Float32BufferAttribute(cu,2));cap.setIndex(ci);cap.computeVertexNormals()
    add(sign===1?'ButtCapRight':'ButtCapLeft',cap,m.brass)
  }
  // Complete the cap's lower return, with restrained facets and a domed attachment.
  const heel=new T.SphereGeometry(1,24,12); heel.scale(46,17,48); heel.rotateZ(-.22); heel.translate(95,-731,0)
  add('ButtCapHeel',heel,m.brass)
  const heelNail=new T.SphereGeometry(1,20,12); heelNail.scale(7,3.5,7); heelNail.translate(95,-748,0)
  add('ButtCapNail',heelNail,m.brass)
  const capRear=new T.SphereGeometry(1,24,16); capRear.scale(2.4,34,3.5); capRear.translate(42,-676.5,0)
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
