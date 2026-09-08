/// <reference lib="dom" />
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { pistolControlViews } from './pistol-control-views'

const out = resolve('docs/verification/russian-pistol-1798-1804')
const assets = resolve('src/content/exhibits/russian-pistol-1798-1804')
const baseline = process.argv.includes('--baseline')
const renderOut = baseline ? resolve(out,'refinement-before') : out
for (const p of [out, ...['models','images','backgrounds'].map(p=>resolve(assets,p))]) await mkdir(p,{recursive:true})
const server=await createServer({cacheDir:resolve('node_modules/.vite-pistol-build'),server:{host:'127.0.0.1',port:4190,strictPort:true,hmr:false,watch:null},logLevel:'error'})
await server.listen()
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
try {
  const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1})
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript({content:'window.__name = (fn) => fn'})
  await page.route('**/__pistol-build',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}))
  await page.goto(server.resolvedUrls!.local[0]+'__pistol-build')
  const baselineData = (await readFile(resolve(out,'refinement-before/before.glb'))).toString('base64')
  const result=await page.evaluate(async({baselineData,baseline})=>{
    const imp=(url:string)=>import(/* @vite-ignore */ url)
    const T=await imp('/node_modules/three/build/three.module.js')
    const {createPistol}=await imp('/src/content/exhibits/russian-pistol-1798-1804/source/createPistol.ts')
    const {GLTFExporter}=await imp('/node_modules/three/examples/jsm/exporters/GLTFExporter.js')
    const {GLTFLoader}=await imp('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
    const framing=(await new GLTFLoader().parseAsync(Uint8Array.from(atob(baselineData),c=>c.charCodeAt(0)).buffer,'')).scene
    const original=baseline ? framing : createPistol()
    const converted=new Map()
    original.traverse((o:InstanceType<typeof T.Mesh>)=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){
      for(const key of ['map','normalMap','roughnessMap']){const old=material[key];if(!old?.isDataTexture)continue
        if(!converted.has(old)){const canvas=document.createElement('canvas');canvas.width=old.image.width;canvas.height=old.image.height
          canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(old.image.data),canvas.width,canvas.height),0,0)
          const texture=new T.CanvasTexture(canvas);texture.name=old.name;texture.flipY=false;texture.wrapS=old.wrapS;texture.wrapT=old.wrapT;texture.colorSpace=old.colorSpace;converted.set(old,texture)}
        material[key]=converted.get(old)
      }
    }})
    const buffer=await new GLTFExporter().parseAsync(original,{binary:true}) as ArrayBuffer
    const bytes=new Uint8Array(buffer);let binary=''
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192))
    const root=(await new GLTFLoader().parseAsync(buffer,'')).scene
    const {createArtifactEnvironment,createArtifactLights,artifactStudioExposure}=await imp('/src/three/artifactStudio.ts')
    const {createContactShadow}=await imp('/src/three/contactShadow.ts')
    const {controlCamera}=await imp('/scripts/pistol-control-views.ts')
    document.body.style.cssText='margin:0;background:#eeeae2'
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true})
    renderer.setSize(1500,900);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=artifactStudioExposure
    document.body.append(renderer.domElement)
    const scene=new T.Scene();scene.background=new T.Color('#eeeae2')
    scene.environment=createArtifactEnvironment(renderer).texture;scene.add(createArtifactLights());scene.add(root)
    const inspectionLight=new T.HemisphereLight('#ffffff','#dedbd5',1.8)
    inspectionLight.visible=false; scene.add(inspectionLight)
    const shadow=createContactShadow(renderer,root);scene.add(shadow.mesh)
    const camera=new T.PerspectiveCamera(28,1500/900,.001,20)
    const render=(name:string)=>{
      if (/^\d\d-/.test(name)) {
        inspectionLight.visible=true
        shadow.mesh.visible=false
        renderer.render(scene,controlCamera(framing,name,1500/900))
        return {calls:renderer.info.render.calls,renderedTriangles:renderer.info.render.triangles}
      }
      inspectionLight.visible=false
      const views:Record<string,number[][]>={
        right:[[0,.083,.65],[0,.083,0]],left:[[0,.083,-.65],[0,.083,0]],hero:[[.06,.29,.65],[0,.078,0]],
        top:[[0,.78,.0001],[0,.078,0]],bottom:[[0,-.62,.0001],[0,.078,0]],
        muzzle:[[.52,.16,.17],[.205,.10,0]],butt:[[-.45,.18,.22],[-.18,.04,0]],
        lock:[[-.025,.126,.205],[-.04,.119,.02]],reverse:[[-.045,.13,-.23],[-.04,.095,-.015]],
        grip:[[-.18,.15,.26],[-.18,.043,0]],ramrod:[[.21,.085,.21],[.165,.08,0]],
      }
      camera.position.fromArray(views[name][0]);camera.up.set(0,1,0);camera.lookAt(new T.Vector3().fromArray(views[name][1]))
      shadow.mesh.visible=name==='hero';renderer.render(scene,camera)
      return {calls:renderer.info.render.calls,renderedTriangles:renderer.info.render.triangles}
    }
    let triangles=0,meshes=0,invalidValues=0,missingUv=0
    const names:string[]=[]
    root.traverse((o:InstanceType<typeof T.Mesh>)=>{if(o.isMesh){meshes++;names.push(o.name);triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3
      if(!o.geometry.attributes.uv)missingUv++
      for(const a of Object.values(o.geometry.attributes) as {array:ArrayLike<number>}[])for(let i=0;i<a.array.length;i++)if(!Number.isFinite(a.array[i]))invalidValues++
    }})
    const box=new T.Box3().setFromObject(root),sourceBox=new T.Box3().setFromObject(original)
    const mismatch=box.min.distanceTo(sourceBox.min)+box.max.distanceTo(sourceBox.max)
    Object.assign(window,{pistolRender:render,pistolThumbnail:()=>{renderer.setSize(640,384);render('hero')}})
    return {base64:btoa(binary),metrics:{triangles,meshes,names,invalidValues,missingUv,roundtripBoundsError:mismatch,
      bounds:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new T.Vector3()).toArray()},...render('hero')}}
  },{baselineData,baseline})
  const binary=Buffer.from(result.base64,'base64')
  if (!baseline) await writeFile(resolve(assets,'models/pistol_1798_1804.glb'),binary)
  const renders:Record<string,unknown>={}
  for(const name of [...pistolControlViews.map(v=>v.name),'right','left','hero','top','bottom','muzzle','butt','lock','reverse','grip','ramrod']){
    renders[name]=await page.evaluate(name=>(window as unknown as {pistolRender:(name:string)=>unknown}).pistolRender(name),name)
    await page.screenshot({path:resolve(renderOut,`${name}.png`)})
  }
  if (!baseline) {
  await copyFile(resolve(out,'hero.png'),resolve(assets,'images/poster.png'))
  await page.setViewportSize({width:640,height:384})
  await page.evaluate(()=>(window as unknown as {pistolThumbnail:()=>void}).pistolThumbnail())
  await page.screenshot({path:resolve(assets,'images/thumbnail.png')})
  await copyFile(resolve('src/content/exhibits/russian-musket-1808/backgrounds/studio.png'),resolve(assets,'backgrounds/studio.png'))
  }
  const metrics={...result.metrics,bytes:binary.length,sha256:createHash('sha256').update(binary).digest('hex'),renders,errors}
  await writeFile(resolve(renderOut,baseline?'rerender-metrics.json':'metrics.json'),JSON.stringify(metrics,null,2)+'\n')
  if(errors.length||metrics.invalidValues||metrics.missingUv||metrics.roundtripBoundsError>1e-6)throw new Error(JSON.stringify(metrics))
  console.log(JSON.stringify({...metrics,names:undefined,renders:undefined},null,2))
}finally{await browser.close();await server.close()}
