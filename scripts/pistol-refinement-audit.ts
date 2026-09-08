import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
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
const before=await load(resolve(out,'refinement-before/before.glb'))
const after=await load(resolve('src/content/exhibits/russian-pistol-1798-1804/models/pistol_1798_1804.glb'))
const frozen=['barrel','breech','breech_tang','ramrod','ramrod_head','ramrod_pipe_front','ramrod_pipe_rear',
  'ramrod_pipe_mount_front','ramrod_pipe_mount_rear','grip_escutcheon','front_sight','buttcap_heel','buttcap_fastener']
const freeze=frozen.map(name=>{const a=before.geometry(`pistol_${name}`),b=after.geometry(`pistol_${name}`)
  assert.equal(b.hash,a.hash,`Frozen geometry changed: ${name}`);return {name,unchanged:true,sha256:b.hash}})
assert.deepEqual(after.wood,before.wood,'Wood maps changed')
const oldStock=before.geometry('pistol_stock'),newStock=after.geometry('pistol_stock')
assert.equal(newStock.positions.length,oldStock.positions.length)
assert.deepEqual(newStock.indices,oldStock.indices,'Stock topology changed')
assert.deepEqual(newStock.uv,oldStock.uv,'Stock UVs changed')
let changedLeftVertices=0
for(let i=0;i<oldStock.positions.length;i+=3){
  assert.equal(newStock.positions[i],oldStock.positions[i],'Stock longitudinal silhouette')
  assert.equal(newStock.positions[i+1],oldStock.positions[i+1],'Stock vertical silhouette')
  if(oldStock.positions[i+2]!==newStock.positions[i+2]){
    assert(oldStock.positions[i+2]<0,'Right stock changed')
    const x=(oldStock.positions[i]/(.460/1415))+747.5
    assert(x>395&&x<885,'Stock outside the documented inlet changed');changedLeftVertices++
  }
}
const parts=['lock_cock','lock_upper_jaw','lock_lower_jaw','lock_jaw_screw_head','lock_frizzen',
  'lock_pan','lock_lockplate','sideplate','buttcap_right','buttcap_left']
const appearance=parts.map(name=>{const a=before.geometry(`pistol_${name}`),b=after.geometry(`pistol_${name}`)
  return {name,surfaceAreaChangePercent:100*(b.area/a.area-1),beforeTriangles:a.indices.length/3,afterTriangles:b.indices.length/3}})
const barrel=after.geometry('pistol_barrel'),axisY=(barrel.min[1]+barrel.max[1])/2
const radii=barrel.positions.flatMap((_,i)=>i%3===0&&Math.abs(barrel.positions[i]-barrel.max[0])<1e-7
  ? [Math.hypot(barrel.positions[i+1]-axisY,barrel.positions[i+2])]:[])
const bore=Math.min(...radii)*2000,outer=Math.max(...radii)*2000
const measurements={scope:'Rendered exterior and blind visual recess only; not manufacturing specifications',
  barrelLengthMm:(barrel.max[0]-barrel.min[0])*1000,boreMm:bore,muzzleLipOutsideMm:outer,visibleLipWallMm:(outer-bore)/2}
const report={freeze,worldTransformsUnchanged:true,wood:{unchanged:true,sha256:after.wood},stock:{silhouetteUnchanged:true,topologyUnchanged:true,uvUnchanged:true,changedLeftVertices,
  exception:'Removed only the unreferenced rectangular left-side flattening; right inlet, fore-end, UVs and wood maps preserved'},
  appearance,measurements,mechanicalValidation:{performed:false,status:'Static exterior artwork; no operating kinetics, ignition path or functional mechanism has been designed or validated'}}
await writeFile(resolve(out,'refinement-audit.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
