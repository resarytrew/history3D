import { DataTexture, LinearFilter, LinearMipmapLinearFilter, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three'

/** Seeded elongated grain: no photograph, baked lighting or random per-load changes. */
function woodTextures() {
  const width = 2048, height = 1024
  const color = new Uint8Array(width * height * 4), relief = new Uint8Array(color.length), roughness = new Uint8Array(color.length)
  let state = 1811
  const noiseAt = (x: number, y: number): number => {
    const hash = (a: number, b: number) => {
      let n = Math.imul(a, 374761393) ^ Math.imul(b, 668265263)
      n = Math.imul(n ^ (n >>> 13), 1274126177)
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295
    }
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
    return (hash(ix, iy) * (1-u) + hash(ix+1, iy) * u) * (1-v) + (hash(ix, iy+1) * (1-u) + hash(ix+1, iy+1) * u) * v
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const u = x / width, v = y / height
    const bend = noiseAt(u*5,v*7)*2 + 0.24*Math.sin(u*9)
    const grain = noiseAt(u*15,v*190+bend*8)-0.5
    const fibre = noiseAt(u*70,v*740+bend*19)-0.5
    const pores = Math.pow(Math.max(0,(noiseAt(u*42,v*380+bend*15)-0.5)*2),3)
    const cloud = (noiseAt(u * 16, v * 30) - 0.5) * 0.18 + (noiseAt(u * 50, v * 140) - 0.5) * 0.08
    const noise = (state >>> 24) / 255 - 0.5
    // Handling changes the finish mostly at the butt/wrist, without copying museum-age damage.
    const handled = Math.exp(-Math.pow((u-0.16)/0.13,2)) * (0.35+0.65*noiseAt(u*32,v*20))
    const tone = 0.76 + grain*0.25 + fibre*0.065 - pores*0.20 + cloud + noise*0.04 + handled*0.025
    const i = (y * width + x) * 4
    color[i] = 105 * tone; color[i + 1] = 55 * tone; color[i + 2] = 31 * tone; color[i + 3] = 255
    const h = 152 + grain*5 + fibre*8 - pores*42 + noise*8
    relief[i] = relief[i + 1] = relief[i + 2] = h; relief[i + 3] = 255
    const r = 206 + grain*30 + cloud*85 + noise*12 - handled*28 + pores*24
    roughness[i] = roughness[i+1] = roughness[i+2] = r; roughness[i+3] = 255
  }
  const texture = (bytes: Uint8Array, srgb = false) => {
    const t = new DataTexture(bytes, width, height, RGBAFormat)
    t.wrapS = t.wrapT = RepeatWrapping; t.magFilter = LinearFilter
    t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8
    if (srgb) t.colorSpace = SRGBColorSpace
    t.needsUpdate = true
    return t
  }
  return { map: texture(color, true), bumpMap: texture(relief), roughnessMap: texture(roughness) }
}

function workedMetal(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vArtifactPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArtifactPosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vArtifactPosition;
float surfaceHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float surfaceNoise(vec3 p) {
  vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float patina = 0.25*surfaceNoise(vArtifactPosition*73.0)+0.75*surfaceNoise(vArtifactPosition*1370.0)-0.5;
float tooling = surfaceNoise(vArtifactPosition*vec3(650.0,2400.0,2100.0));
float scratches = pow(max(0.0,tooling-0.55)*2.0,4.0);
roughnessFactor = clamp(roughnessFactor + patina*0.045 + scratches*0.035,0.30,0.68);
diffuseColor.rgb *= 0.96 + patina*0.055;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float height = surfaceNoise(vArtifactPosition*1900.0)*0.00000045 + tooling*0.0000003;
vec3 s = dFdx(-vViewPosition), t = dFdy(-vViewPosition);
vec3 r1 = cross(t, normal), r2 = cross(normal, s);
float det = dot(s, r1) * faceDirection;
normal = normalize(abs(det) * normal - sign(det) * (dFdx(height) * r1 + dFdy(height) * r2));`)
  }
  material.customProgramCacheKey = () => 'musket-worked-metal-v3'
}

/** Finish changes at contact zones in artifact coordinates, independent of camera/light. */
function handledWood(material: MeshPhysicalMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWoodPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWoodPosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWoodPosition;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
vec3 p = vWoodPosition;
float bandContact = exp(-pow((p.x+0.0907)/0.015,2.0)) + exp(-pow((p.x-0.2755)/0.014,2.0)) + exp(-pow((p.x-0.610)/0.014,2.0));
float lockContact = exp(-pow((p.x+0.353)/0.069,4.0))*exp(-pow((p.y-0.221)/0.019,2.0))*smoothstep(0.012,0.023,abs(p.z));
float wrist = exp(-pow((p.x+0.485)/0.065,2.0));
float irregular = 0.75+0.25*sin(p.x*377.0+sin(p.y*641.0))*sin(p.z*913.0);
diffuseColor.rgb *= 1.0-min(0.27,(bandContact*0.17+lockContact*0.22)*irregular);
roughnessFactor = clamp(roughnessFactor-wrist*irregular*0.075+bandContact*0.04,0.40,0.86);`)
  }
  material.customProgramCacheKey = () => 'musket-handled-wood-v1'
}

export function createMusketMaterials() {
  const wood = new MeshPhysicalMaterial({ name: 'OiledBrownWood', ...woodTextures(), roughness: 0.9, metalness: 0, bumpScale: 0.00022, clearcoat: 0.015, clearcoatRoughness: 0.65 })
  const steel = new MeshStandardMaterial({ name: 'MaintainedSteel', color: '#858780', metalness: 0.92, roughness: 0.49 })
  const brass = new MeshStandardMaterial({ name: 'WorkedBrass', color: '#a58a53', metalness: 0.86, roughness: 0.48 })
  const darkSteel = new MeshStandardMaterial({ name: 'RecessedSteel', color: '#4c4b44', metalness: 0.86, roughness: 0.45 })
  const flint = new MeshStandardMaterial({ name: 'GreyFlint', color: '#454641', roughness: 0.86, flatShading: true })
  const leather = new MeshStandardMaterial({ name: 'FlintWrapping', color: '#423128', roughness: 0.92 })
  workedMetal(steel); workedMetal(brass); workedMetal(darkSteel); handledWood(wood)
  return { wood, steel, brass, darkSteel, flint, leather }
}
