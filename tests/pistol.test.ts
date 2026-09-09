/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { Box3, Group, Mesh, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { createPistol } from '../src/content/exhibits/russian-pistol-1798-1804/source/createPistol'
import { X, Y } from '../src/content/exhibits/russian-pistol-1798-1804/source/dimensions'
import { russianPistol1798 as exhibit } from '../src/content/exhibits/russian-pistol-1798-1804/exhibit'
import { bindSurfaceAnchor, projectSurfaceHotspots } from '../src/three/hotspotProjection'
import { disposeObject3D } from '../src/three/dispose'
import { SemanticSceneIndex } from '../src/three/SemanticSceneIndex'

describe('1798/1804 cavalry pistol',()=>{
  let root:Group
  beforeAll(()=>{root=createPistol();root.updateMatrixWorld(true)})
  afterAll(()=>disposeObject3D(root))
  it('keeps the museum jaws empty and the grip symmetric across its middle plane',()=>{
    expect(root.getObjectByName('pistol_lock_flint')).toBeUndefined()
    const stock=root.getObjectByName('pistol_stock')!
    for(const [x,y] of [[80,680],[145,665],[215,580],[270,540]]) {
      const hits=[-1,1].map(sign=>new Raycaster(new Vector3(X(x),Y(y)+root.userData.groundOffset,sign*.15),
        new Vector3(0,0,-sign)).intersectObject(stock)[0])
      expect(hits.every(Boolean)).toBe(true)
      expect(hits[0].point.z).toBeCloseTo(-hits[1].point.z,6)
    }
  })
  it('uses metric geometry, correct barrel length and outward stock faces',()=>{
    expect(new Box3().setFromObject(root).getSize(new Vector3()).x).toBeCloseTo(.46,2)
    const barrel=new Box3().setFromObject(root.getObjectByName('pistol_barrel')!)
    expect(barrel.max.x-barrel.min.x).toBeCloseTo(.269,6)
    expect(new Box3().setFromObject(root).min.y).toBeCloseTo(0,7)
    for(const sign of [-1,1])for(const [x,y] of [[100,675],[270,540],[900,490]]){
      const hits=new Raycaster(new Vector3(X(x),Y(y),sign*.15),new Vector3(0,0,-sign)).intersectObject(root.getObjectByName('pistol_stock')!)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].point.z*sign).toBeGreaterThan(0)
    }
  })
  it('has complete barrel faces at every angle, a 17 mm recess and outward stock end caps',()=>{
    const barrel=root.getObjectByName('pistol_barrel')!
    const barrelBox=new Box3().setFromObject(barrel), axisY=(barrelBox.min.y+barrelBox.max.y)/2
    for(const x of [barrelBox.min.x+.005,0,.16]) for(let i=0;i<32;i++) {
      const angle=i/32*Math.PI*2, radial=new Vector3(0,Math.cos(angle),Math.sin(angle))
      const hits=new Raycaster(new Vector3(x,axisY,0).addScaledVector(radial,.08),radial.clone().negate()).intersectObject(barrel)
      expect(hits.length,`barrel ring ${x}/${i}`).toBeGreaterThan(0)
      expect(hits[0].point.clone().sub(new Vector3(x,axisY,0)).dot(radial)).toBeGreaterThan(.009)
    }
    // At the muzzle annulus, the axis is clear and a point outside the 8.5 mm bore radius hits the rim.
    const front=barrelBox.max.x+.01
    const centerHit=new Raycaster(new Vector3(front,axisY,0),new Vector3(-1,0,0)).intersectObject(barrel)[0]
    const rimHit=new Raycaster(new Vector3(front,axisY,.009),new Vector3(-1,0,0)).intersectObject(barrel)[0]
    expect(centerHit.point.x).toBeLessThan(barrelBox.max.x-.005)
    expect(rimHit.point.x).toBeCloseTo(barrelBox.max.x,5)
    const positions=(barrel as Mesh).geometry.getAttribute('position')
    const radii:number[]=[]
    for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i)-barrelBox.max.x)<1e-6)radii.push(Math.hypot(positions.getY(i)-axisY,positions.getZ(i)))
    expect(Math.min(...radii)*2).toBeCloseTo(.017,6)
    const stock=root.getObjectByName('pistol_stock')!, box=new Box3().setFromObject(stock)
    const frontHits=new Raycaster(new Vector3(box.max.x+.001,Y(479)+root.userData.groundOffset,0),new Vector3(-1,0,0)).intersectObject(stock)
    expect(frontHits[0].point.x).toBeCloseTo(box.max.x,5)
    const rearHits=new Raycaster(new Vector3(box.min.x-.001,Y(670)+root.userData.groundOffset,0),new Vector3(1,0,0)).intersectObject(stock)
    expect(rearHits[0].point.x).toBeCloseTo(box.min.x,5)
  })
  it('keeps two hollow pipes connected to stock and the rod separate',()=>{
    const rodBox=new Box3().setFromObject(root.getObjectByName('pistol_ramrod')!)
    const stock=root.getObjectByName('pistol_stock')!
    const rearHits=new Raycaster(new Vector3(rodBox.min.x+.001,rodBox.min.y-.02,0),new Vector3(0,1,0))
      .intersectObjects([stock,root.getObjectByName('pistol_ramrod')!],true)
    expect(rearHits[0].object.name,'rear ramrod end must enter the stock').toBe('pistol_stock')
    for(const name of ['front','rear']) {
      const pipe=root.getObjectByName(`pistol_ramrod_pipe_${name}`)!, mount=root.getObjectByName(`pistol_ramrod_pipe_mount_${name}`)!
      const box=new Box3().setFromObject(pipe), mountBox=new Box3().setFromObject(mount)
      expect(rodBox.min.x).toBeLessThan(box.min.x); expect(rodBox.max.x).toBeGreaterThan(box.max.x)
      expect(box.intersectsBox(mountBox)).toBe(true)
      const x=(mountBox.min.x+mountBox.max.x)/2
      const hits=new Raycaster(new Vector3(x,mountBox.min.y-.01,0),new Vector3(0,1,0)).intersectObject(stock)
      expect(hits[0].point.y).toBeLessThan(mountBox.max.y)
    }
    const allNames:string[]=[]; root.traverse(o=>{if(o instanceof Mesh)allNames.push(o.name)})
    expect(allNames.every(name=>name.startsWith('pistol_'))).toBe(true)
    expect(new Set(allNames).size).toBe(allNames.length)
  })
  it('exports a self-contained GLB with PBR maps and no external resources',()=>{
    const binary=readFileSync('src/content/exhibits/russian-pistol-1798-1804/models/pistol_1798_1804.glb')
    expect(binary.toString('ascii',0,4)).toBe('glTF');expect(binary.readUInt32LE(4)).toBe(2)
    expect(binary.readUInt32LE(8)).toBe(binary.length)
    const json=JSON.parse(binary.toString('utf8',20,20+binary.readUInt32LE(12)))
    expect(json.asset.version).toBe('2.0')
    for(const buffer of json.buffers)expect(buffer.uri).toBeUndefined()
    for(const image of json.images){expect(image.uri).toBeUndefined();expect(image.bufferView).toBeTypeOf('number')}
    expect(json.images).toHaveLength(12)
    expect(json.materials.filter((m:{normalTexture?:unknown})=>m.normalTexture)).toHaveLength(4)
    expect(json.animations).toBeUndefined()
    expect(json.nodes.some((n:{name:string})=>n.name==='pistol_sideplate')).toBe(true)
  })
  it('keeps web geometry within budget with finite normals and UVs',()=>{
    let triangles=0
    root.traverse(o=>{if(o instanceof Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3
      for(const key of ['position','normal','uv'])expect(Array.from(o.geometry.getAttribute(key).array).every(Number.isFinite),`${o.name} ${key}`).toBe(true)
    }})
    expect(triangles).toBeLessThan(150_000)
    const metrics=JSON.parse(readFileSync('docs/verification/russian-pistol-1798-1804/metrics.json','utf8'))
    expect(metrics.triangles).toBe(triangles);expect(metrics.roundtripBoundsError).toBeLessThan(1e-6)
  })
  it('keeps sculpted exterior surfaces closed after displacement, including UV seams',()=>{
    for(const name of ['lock_cock','lock_upper_jaw','lock_lower_jaw','lock_frizzen','lock_frizzen_foot']){
      const g=(root.getObjectByName(`pistol_${name}`) as Mesh).geometry
      const p=g.getAttribute('position'),index=g.getIndex(),edges=new Map<string,number>()
      const vertex=(i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e7)).join(',')
      for(let i=0;i<(index?.count??p.count);i+=3){
        const ids=[0,1,2].map(k=>vertex(index?index.getX(i+k):i+k))
        if(new Set(ids).size<3)continue
        for(let k=0;k<3;k++){
          const key=[ids[k],ids[(k+1)%3]].sort().join('|');edges.set(key,(edges.get(key)??0)+1)
        }
      }
      expect([...edges.values()].every(count=>count===2),`${name}: open or nonmanifold edge`).toBe(true)
    }
  })
  it('resolves all source claims and preserves uncertainty',()=>{
    const r=exhibit.reconstruction,items=[...r.known,...r.inferred,...r.uncertain,...r.unknown]
    for(const item of items)for(const id of item.sourceIds)expect(exhibit.sources.some(s=>s.id===id)).toBe(true)
    for(const h of exhibit.hotspots){expect(root.getObjectByName(h.surface!.objectName)).toBeDefined();for(const id of h.evidenceIds)expect(items.some(i=>i.id===id)).toBe(true)}
    for(const fact of r.known)expect(fact.sourceRefs?.length).toBeGreaterThan(0)
    expect(exhibit.status).toBe('reconstruction');expect(r.unknown.length).toBeGreaterThan(0)
  })
  it('binds six visible front markers and occludes them on the reverse',()=>{
    const index = new SemanticSceneIndex(root, exhibit.semantics!)
    const hotspots=exhibit.hotspots,anchors=new Map(hotspots.map(h=>[h.id,bindSurfaceAnchor(root,h,index)]))
    for(const hotspot of hotspots) {
      const surface=hotspot.surface!,normal=new Vector3().fromArray(surface.normal).normalize()
      const point=new Vector3().fromArray(hotspot.position)
      const hits=new Raycaster(point.addScaledVector(normal,surface.searchDistance),normal.clone().negate(),0,surface.searchDistance*2)
        .intersectObject(root.getObjectByName(surface.objectName)!,true)
      expect(hits.length,`${hotspot.id} must hit its named surface, not use the fallback`).toBeGreaterThan(0)
      expect(anchors.get(hotspot.id)!.point.distanceTo(hits[0].point)).toBeLessThan(1e-6)
    }
    const camera=new PerspectiveCamera(34,1.5,.001,10)
    camera.position.fromArray(exhibit.presentation.cameraPosition);camera.lookAt(new Vector3().fromArray(exhibit.presentation.cameraTarget));camera.updateMatrixWorld(true)
    expect(projectSurfaceHotspots(root,camera,hotspots,anchors,.0003).filter(h=>h.visible).map(h=>h.id)).toEqual(hotspots.map(h=>h.id))
    camera.position.set(0,.15,-.7);camera.lookAt(0,.08,0);camera.updateMatrixWorld(true)
    expect(projectSurfaceHotspots(root,camera,hotspots,anchors,.0003).every(h=>!h.visible)).toBe(true)
  })
})
