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
  const stockSide = (x: number, y: number, sign = 1) => {
    const [top,bottom,width] = sectionAt(x), vertical=(y-(top+bottom)/2)/((bottom-top)/2)
    const side=width * Math.pow(Math.max(0,1-vertical*vertical),.35)
    return sign < 0 ? side : T.MathUtils.lerp(side,Math.min(width*.92,side),inletBlend(x))
  }
  const n = 360, sides = 80, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let i = 0; i <= n; i++) {
    const x = 42 + (1406 - 42) * i / n, [top, bottom, width] = sectionAt(x)
    for (let k = 0; k <= sides; k++) {
      const theta = k / sides * Math.PI * 2
      let y = -(top + bottom) / 2 + (bottom - top) / 2 * Math.cos(theta)
      // Broad side flats give the inlet a physical seat; edges stay rounded.
      let z = width * Math.sign(Math.sin(theta)) * Math.pow(Math.abs(Math.sin(theta)), .7)
      // Retain the accepted right inlet; the counterplate follows the curved left wood.
      if (z > 0) z = T.MathUtils.lerp(z,Math.min(z,width*.92),inletBlend(x))
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

  const plate=outline('LockPlate', [[433,497],[443,477],[469,464],[508,455],[548,453],[612,455],
    [682,451],[730,452],[777,466],[816,477],[843,487],[849,503],[838,513],[801,516],
    [505,522],[462,519],[440,511]],48,4,m.steel,.8)
  function seat(mesh:T.Mesh, base:number, sign:number){const old=mesh.geometry;mesh.geometry=new TessellateModifier(12,9).modify(old);old.dispose();const pos=mesh.geometry.getAttribute('position')
    for(let i=0;i<pos.count;i++){
      const z=stockSide(pos.getX(i),-pos.getY(i),sign)
      pos.setZ(i,sign*(z-1.8)+pos.getZ(i)-base)}
    mesh.geometry.deleteAttribute('normal');const smooth=mergeVertices(mesh.geometry);mesh.geometry.dispose();mesh.geometry=smooth;mesh.geometry.computeVertexNormals()}
  seat(plate,48,1)
  // Static museum silhouette study only. No moving joints or firing simulation.
  crown(outline('Cock', [[539,474],[542,489],[555,496],[574,492],[590,480],[601,459],[603,442],[596,427],
    [580,409],[573,396],[574,382],[583,374],[595,373],[605,377],[604,369],[592,365],
    [580,370],[567,382],[565,397],[573,414],[586,433],[590,447],[585,462],[572,470],[551,464]],59,12,m.steel,2),1.1)
  crown(outline('CockSpur', [[580,375],[588,353],[596,340],[601,324],[606,320],[609,325],[604,343],[600,358],[591,374]],59,11,m.steel,1.2),.7)
  crown(outline('LowerJaw', [[588,375],[603,374],[621,382],[638,389],[641,393],[625,390],[601,381],[589,381]],58,23,m.steel,1),.6)
  crown(outline('UpperJaw', [[599,356],[611,358],[629,369],[642,381],[636,382],[618,370],[598,361]],60,21,m.steel,1),.5)
  cylinder('JawScrew', [606,377,72], [617,350,72],3.7,m.steel,3.5)
  const finial = new T.LatheGeometry([[0,0],[5,0],[6,2],[6,7],[5,8],[0,8]].map(([r,y])=>new T.Vector2(r,y)),24)
  finial.rotateZ(-.39); finial.translate(617,-350,72); add('JawScrewFinial',finial,m.steel)
  // A clearly identified interpretive flint, absent from the photographed museum jaws.
  const flint=outline('Flint',[[615,370],[625,369],[638,375],[657,382],[662,386],[659,389],
    [654,388],[651,392],[645,389],[640,390],[625,383],[614,378]],59,22,m.flint,0)
  // Uneven facets are visual stone texture, unrelated to an operating contact edge.
  const fp=flint.geometry.getAttribute('position')
  for(let i=0;i<fp.count;i++){
    const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i)
    fp.setZ(i,z+(z>70?1:-1)*(.8*Math.sin(x*1.3+y*.7)+.5*Math.cos(y*2.1)))
  }
  flint.geometry.computeVertexNormals()
  cylinder('CockPivotSeat',[555,474,stockSide(555,474)],[555,474,64],12)
  screw('CockPivot',555,474,74,12)
  // Raised striking face is curved in section, and its lid remains visibly separate from the pan.
  crown(outline('Frizzen',[[730,330],[734,328],[729,343],[714,359],[695,373],[687,378],
    [683,373],[697,362],[714,348],[725,337]],42,23,m.steel,1.2),.7)
  crown(outline('FrizzenFoot',[[684,373],[691,379],[696,399],[712,418],[737,432],[756,438],
    [763,445],[752,449],[732,441],[704,425],[691,409],[686,389]],43,22,m.steel,1.2),.5)
  // A shallow asymmetric exterior hollow; no touch-hole or ignition passage.
  const pan=new T.LatheGeometry([[0,-452],[13,-451],[23,-447],[26,-442],[25,-439],
    [22,-439],[21,-443],[12,-446],[0,-446]].map(([r,y])=>new T.Vector2(r,y)),48)
  const pp=pan.getAttribute('position')
  for(let i=0;i<pp.count;i++){
    const x=pp.getX(i),z=pp.getZ(i)
    pp.setXYZ(i,699+x*(.93+.07*z/26),pp.getY(i),70+z*.64)
    pan.getAttribute('uv').setXY(i,pp.getX(i)/240,pp.getZ(i)/240)
  }
  pan.deleteAttribute('normal')
  const smoothPan=mergeVertices(pan);pan.dispose();smoothPan.computeVertexNormals();add('Pan',smoothPan,m.steel)
  outline('PanConnection',[[678,451],[694,448],[716,451],[722,458],[701,464],[679,459]],40,29,m.steel,.7)
  cylinder('FrizzenPivotSeat',[754,445,stockSide(754,445)],[754,445,65],10)
  screw('FrizzenPivot',754,445,66,12)
  // Separate static exterior strip, not engraved ornament or a designed elastic mechanism.
  const spring=outline('FrizzenSpring',[[746,480],[777,479],[812,486],[825,493],[822,500],[807,502],
    [761,498],[753,496],[753,493],[799,496],[813,496],[816,493],[809,490],[778,484],[747,485]],0,6,m.steel,.6)
  seat(spring,0,1)
  screw('SpringScrew',755,495,stockSide(755,495)+5,6)

  // Serpentine left counterplate follows l_2.jpg; three visible heads, not a musket's two rosettes.
  const reverse: Point[] = [[460,484],[467,467],[488,461],[512,471],[544,470],[570,457],[576,439],[589,428],[601,429],[612,441],[615,461],[643,467],[675,454],[700,451],[726,465],[758,479],[808,478],[831,476],[844,486],[844,502],[830,512],[808,506],[766,503],[730,494],[699,475],[678,475],[649,489],[620,495],[596,485],[570,480],[542,484],[513,494],[480,499]]
  const lighterReverse=reverse.map(([x,y]):Point=>[x,480+(y-480)*.82])
  const counter=outline('Counterplate',lighterReverse,-61,2.4,m.brass,.5);seat(counter,-58.6,-1)
  // Shared axes bind the two exterior ends to the same stock/lock location.
  for (const [x,y] of [[472,482],[597,454],[831,490]]) {
    const side=stockSide(x,y)
    screw(`CounterScrew${x}`,x,y,-stockSide(x,y,-1)-1.2,7,m.steel,true)
    screw(`LockScrew${x}`,x,y,side+2,4.2)
  }

  // Guard is a flattened forged strip, rather than a circular wire tube.
  const guardCurve = new T.CatmullRomCurve3([[427,545],[439,579],[464,605],[499,619],[536,617],[570,596],[585,566],[590,544]].map(([x,y])=>point(x,y,0)))
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
  crown(outline('Trigger', [[511,536],[522,540],[518,550],[508,562],[501,581],[500,597],[505,602],
    [504,609],[497,612],[491,606],[491,589],[494,570],[502,550]],-5,10,m.steel,1.8),1)

  // Open-topped exterior end reinforcement; the barrel remains visually separate.
  const bandP:number[]=[], bandUv:number[]=[], bandI:number[]=[], bandSides=96
  for(const [ring,x,offset] of [[0,1364,1.6],[1,1408,1.6],[2,1408,.1],[3,1364,.1]] as const) {
    const [top,bottom,width]=sectionAt(Math.min(x,1406)), middle=-(top+bottom)/2, half=(bottom-top)/2
    for(let k=0;k<=bandSides;k++) {
      const a=1.73+k/bandSides*(Math.PI*2-3.46), dy=Math.cos(a), dz=Math.sin(a), center=-445
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
    for(let i=0;i<=longitudinal;i++){const x=42+140*i/longitudinal,[top,bottom,width]=sectionAt(x),t=i/longitudinal
      const start=.68+.90*t, end=Math.PI-(Math.PI-1.60)*Math.pow(t,.7)
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
