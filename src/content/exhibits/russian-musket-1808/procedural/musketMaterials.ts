import { DataTexture, LinearFilter, LinearMipmapLinearFilter, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three'

/** Seeded elongated grain: no photograph, baked lighting or random per-load changes. */
function woodTextures() {
  const width = 1024, height = 512
  const color = new Uint8Array(width * height * 4), relief = new Uint8Array(color.length)
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
    const bend = 0.65 * Math.sin(u * 11 + Math.sin(v * 6.28)) + noiseAt(u * 7, v * 16) * 2
    const wave = Math.sin(v * 235 + bend * 4)
    const pores = Math.pow(Math.max(0, Math.sin(v * 911 + bend * 17 + Math.sin(u * 51))), 16)
    const cloud = (noiseAt(u * 16, v * 30) - 0.5) * 0.16 + (noiseAt(u * 50, v * 140) - 0.5) * 0.10
    const noise = (state >>> 24) / 255 - 0.5
    const tone = 0.80 + wave * 0.035 - pores * 0.06 + cloud + noise * 0.055
    const i = (y * width + x) * 4
    color[i] = 102 * tone; color[i + 1] = 58 * tone; color[i + 2] = 34 * tone; color[i + 3] = 255
    const h = 152 + wave * 5 - pores * 20 + noise * 10
    relief[i] = relief[i + 1] = relief[i + 2] = h; relief[i + 3] = 255
  }
  const texture = (bytes: Uint8Array, srgb = false) => {
    const t = new DataTexture(bytes, width, height, RGBAFormat)
    t.wrapS = t.wrapT = RepeatWrapping; t.magFilter = LinearFilter
    t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8
    if (srgb) t.colorSpace = SRGBColorSpace
    t.needsUpdate = true
    return t
  }
  return { map: texture(color, true), bumpMap: texture(relief) }
}

function workedMetal(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vArtifactPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArtifactPosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vArtifactPosition;
float surfaceNoise(vec3 p) {
  return sin(p.x * 121.0 + sin(p.y * 174.0)) * sin(p.z * 193.0 + p.y * 153.0);
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float patina = surfaceNoise(vArtifactPosition);
roughnessFactor = clamp(roughnessFactor + patina * 0.065, 0.21, 0.65);
diffuseColor.rgb *= 0.97 + patina * 0.035;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float height = surfaceNoise(vArtifactPosition * 7.0) * 0.0000018;
vec3 s = dFdx(-vViewPosition), t = dFdy(-vViewPosition);
vec3 r1 = cross(t, normal), r2 = cross(normal, s);
float det = dot(s, r1) * faceDirection;
normal = normalize(abs(det) * normal - sign(det) * (dFdx(height) * r1 + dFdy(height) * r2));`)
  }
  material.customProgramCacheKey = () => 'musket-worked-metal-v1'
}

export function createMusketMaterials() {
  const wood = new MeshPhysicalMaterial({ name: 'OiledBrownWood', ...woodTextures(), roughness: 0.53, metalness: 0, bumpScale: 0.00016, clearcoat: 0.07, clearcoatRoughness: 0.46 })
  const steel = new MeshStandardMaterial({ name: 'MaintainedSteel', color: '#92938d', metalness: 0.94, roughness: 0.41 })
  const brass = new MeshStandardMaterial({ name: 'WorkedBrass', color: '#ae925a', metalness: 0.86, roughness: 0.43 })
  const darkSteel = new MeshStandardMaterial({ name: 'RecessedSteel', color: '#4c4b44', metalness: 0.86, roughness: 0.45 })
  const flint = new MeshStandardMaterial({ name: 'GreyFlint', color: '#615c51', roughness: 0.88, flatShading: true })
  const leather = new MeshStandardMaterial({ name: 'FlintWrapping', color: '#423128', roughness: 0.92 })
  workedMetal(steel); workedMetal(brass); workedMetal(darkSteel)
  return { wood, steel, brass, darkSteel, flint, leather }
}
