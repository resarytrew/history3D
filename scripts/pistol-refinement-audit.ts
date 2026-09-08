import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { writeArtifact as writeFile } from './write-artifact'
import { resolve } from 'node:path'

const out=resolve('docs/verification/russian-pistol-1798-1804')
type Accessor={bufferView:number;byteOffset?:number;count:number;type:string;componentType:number}
type Primitive={attributes:Record<string,number>;indices?:number;material:number}
type Glb={accessors:Accessor[];bufferViews:{byteOffset?:number;byteLength:number;byteStride?:number}[];
  nodes:{name:string;mesh?:number;matrix?:number[];translation?:number[];rotation?:number[];scale?:number[]}[];meshes:{primitives:Primitive[]}[];
  materials:{name:string;pbrMetallicRoughness?:{baseColorTexture?:{index:number};metallicRoughnessTexture?:{index:number}};normalTexture?:{index:number}}[];
  textures:{source:number}[];images:{bufferView:number}[]}
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex')
async function load(path:string){
  const file=await readFile(path),length=file.readUInt32LE(12)
  const json=JSON.parse(file.toString('utf8',20,20+length)) as Glb
  // This exporter bakes all coordinates. Reject unexpected transforms rather than
  // claiming a freeze pass from unchanged local vertices at a different world scale.
  for(const node of json.nodes){
    assert.deepEqual(node.matrix??[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],`${node.name} matrix`)
    assert.deepEqual(node.translation??[0,0,0],[0,0,0],`${node.name} translation`)
    assert.deepEqual(node.rotation??[0,0,0,1],[0,0,0,1],`${node.name} rotation`)
    assert.deepEqual(node.scale??[1,1,1],[1,1,1],`${node.name} scale`)
  }
  const binary=file.subarray(28+length)
  const view=(id:number)=>{const v=json.bufferViews[id];return binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)}
  const accessor=(id:number)=>{
    const a=json.accessors[id],v=json.bufferViews[a.bufferView],data=view(a.bufferView)
    const components=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4} as Record<string,number>)[a.type]
    const bytes=a.componentType===5123?2:4,values:number[]=[]
    for(let i=0;i<a.count;i++)for(let c=0;c<components;c++){
      const offset=(a.byteOffset??0)+i*(v.byteStride??bytes*components)+c*bytes
      values.push(a.componentType===5126?data.readFloatLE(offset):bytes===2?data.readUInt16LE(offset):data.readUInt32LE(offset))
    }
    return values
  }
  const geometry=(name:string)=>{
    const node=json.nodes.find(n=>n.name===name);assert(node?.mesh!==undefined,`Missing ${name}`)
    assert.equal(json.meshes[node.mesh].primitives.length,1,`${name}: audit requires a single primitive`)
    const p=json.meshes[node.mesh].primitives[0]
    const positions=accessor(p.attributes.POSITION),indices=p.indices===undefined
      ? Array.from({length:positions.length/3},(_,i)=>i) : accessor(p.indices)
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity]
    positions.forEach((v,i)=>{min[i%3]=Math.min(min[i%3],v);max[i%3]=Math.max(max[i%3],v)})
    let area=0
    for(let i=0;i<indices.length;i+=3){
      const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3
      const u=[0,1,2].map(k=>positions[b+k]-positions[a+k]),v=[0,1,2].map(k=>positions[c+k]-positions[a+k])
      area+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2
    }
    return {positions,indices,uv:accessor(p.attributes.TEXCOORD_0),min,max,area,hash:hash(Buffer.from(JSON.stringify({attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,id])=>[k,accessor(id)])),indices})))}
  }
  const wood=json.materials.find(m=>m.name==='Pistol wood')!
  const textureHash=(index:number)=>hash(view(json.images[json.textures[index].source].bufferView))
  return {geometry,wood:{albedo:textureHash(wood.pbrMetallicRoughness!.baseColorTexture!.index),
    roughness:textureHash(wood.pbrMetallicRoughness!.metallicRoughnessTexture!.index),normal:textureHash(wood.normalTexture!.index)}}
}
const before=await load(resolve(out,'lock-before/before.glb'))
const modelPath='src/content/exhibits/russian-pistol-1798-1804/models/pistol_1798_1804.glb'
const after=await load(resolve(modelPath))
assert.deepEqual(after.wood,before.wood,'Wood maps changed outside the geometry task')
const parts=['lock_cock','lock_cock_spur','lock_lower_jaw','lock_upper_jaw','lock_jaw_screw_head',
  'lock_frizzen','lock_frizzen_foot','lock_pan_connection','lock_frizzen_spring']
const appearance=parts.map(name=>{const a=before.geometry(`pistol_${name}`),b=after.geometry(`pistol_${name}`)
  return {name,changed:b.hash!==a.hash,beforeTriangles:a.indices.length/3,afterTriangles:b.indices.length/3}})
assert(appearance.every(p=>p.changed),'Requested exterior parts must be regenerated')
// Grounding may shift all Y coordinates after changing the apple. Compare shapes
// relative to their own minima, rather than accidentally freezing the old ground plane.
const retained=['stock','barrel','breech','breech_tang','sideplate','buttcap_right','buttcap_left','foreend_plate','front_sight','trigger','trigger_guard','ramrod'].map(name=>{
  const a=before.geometry(`pistol_${name}`),b=after.geometry(`pistol_${name}`)
  assert.deepEqual(a.indices,b.indices)
  assert.equal(a.positions.length,b.positions.length)
  const maxError=Math.max(...a.positions.map((v,i)=>Math.abs((v-a.min[i%3])-(b.positions[i]-b.min[i%3]))))
  assert(maxError<1e-7,`${name}: exterior shape changed`)
  return {name,maxShapeError:maxError}
})
const metrics=JSON.parse(await readFile(resolve(out,'metrics.json'),'utf8'))
assert(metrics.triangles<150000)
assert.equal(metrics.invalidValues,0);assert.equal(metrics.missingUv,0)
assert(metrics.roundtripBoundsError<1e-6);assert.equal(metrics.errors.length,0)
assert(!metrics.names.includes('pistol_lock_flint'),'Photographed jaws must remain empty')
const modelHash=hash(await readFile(resolve(modelPath)))
assert.equal(modelHash,metrics.sha256,'Renders and exported GLB differ')
const report={scope:'Static museum lock close-up: sculpted exterior relief, heads and local iron artwork',
  baseline:'lock-before/before.glb (saved before the focused lock relief pass)',appearance,retained,
  wood:{mapsUnchanged:true,sha256:after.wood},modelHash,
  qualification:'Photo contours are artwork references. Unseen depths and cross-sections are inferred; no 100% likeness claim.',
  mechanicalValidation:{performed:false,status:'Outside the user-defined scope'}}
await writeFile(resolve(out,'refinement-audit.json'),JSON.stringify(report,null,2)+'\n')
const renders=await Promise.all(Object.keys(metrics.renders).concat(['photo-right','photo-left','photo-lock']).map(async name=>{
  const data=await readFile(resolve(out,`${name}.png`))
  assert.equal(data.toString('ascii',1,4),'PNG')
  return {file:`${name}.png`,width:data.readUInt32BE(16),height:data.readUInt32BE(20),sha256:hash(data)}
}))
await writeFile(resolve(out,'acceptance-audit.json'),JSON.stringify({
  scope:report.scope,model:{path:modelPath,sha256:modelHash,matchesRenderMetrics:true},renders,
  softwareChecks:'finite geometry, self-contained GLB roundtrip, named meshes and render artifacts',
  visualReview:'See PISTOL_REFINEMENT_REPORT.md for inspected views and limitations',
  mechanicalValidation:report.mechanicalValidation,
},null,2)+'\n')
console.log(JSON.stringify(report,null,2))
