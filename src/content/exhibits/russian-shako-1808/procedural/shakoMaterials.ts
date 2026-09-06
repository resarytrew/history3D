import { DataTexture, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, RGBAFormat } from 'three'
import { D } from './shako1808Dimensions'

/** Filtered yarn/fibre microstructure. Coarser leather grain uses physical object coordinates. */
function grain(seed: number, woven = false): DataTexture {
  const size = D.topology.textureSize, data = new Uint8Array(size * size * 4)
  let state = seed
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const value = 100 + (state >>> 26) + (woven ? Math.sin(y * Math.PI / 4 + x * Math.PI / 16) * 36 : 0)
    const i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255
  }
  const texture = new DataTexture(data, size, size, RGBAFormat)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(woven ? 6 : 3, woven ? 1 : 2)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

/** Metre-scaled grain stays consistent across narrow straps, bands and the broad visor.
 * Perturb only the shading normal, preserving all locked geometry and dimensions.
 */
function workedSurface(material: MeshStandardMaterial, metal = false, felt = false): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorkedPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorkedPosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWorkedPosition;
float workedHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float workedNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(workedHash(i), workedHash(i+vec3(1,0,0)), f.x),
                 mix(workedHash(i+vec3(0,1,0)), workedHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(workedHash(i+vec3(0,0,1)), workedHash(i+vec3(1,0,1)), f.x),
                 mix(workedHash(i+vec3(0,1,1)), workedHash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float workedMottle = workedNoise(vWorkedPosition * ${metal ? '1700.0' : '650.0'});
roughnessFactor = clamp(roughnessFactor + (workedMottle - 0.5) * ${metal ? '0.09' : '0.16'}, 0.12, 1.0);
${felt ? 'diffuseColor.rgb *= 0.88 + 0.24 * workedNoise(vWorkedPosition * 1900.0);' : ''}
`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float workedHeight = workedNoise(vWorkedPosition * ${metal ? '2100.0' : '1800.0'}) * ${metal ? '0.000004' : '0.000015'}
  + workedNoise(vWorkedPosition * 155.0) * ${metal ? '0.000008' : '0.000025'};
vec3 workedS = dFdx(-vViewPosition), workedT = dFdy(-vViewPosition);
vec3 workedR1 = cross(workedT, normal), workedR2 = cross(normal, workedS);
float workedDet = dot(workedS, workedR1) * faceDirection;
vec3 workedGradient = sign(workedDet) * (dFdx(workedHeight) * workedR1 + dFdy(workedHeight) * workedR2);
normal = normalize(abs(workedDet) * normal - workedGradient);
`)
  }
  material.customProgramCacheKey = () => `worked-surface-${metal ? 'brass' : felt ? 'felt' : 'leather'}-2`
}

export function applyShakoMaterials(root: Group): MeshStandardMaterial {
  const feltMap = grain(1808), leatherMap = grain(1812), clothMap = grain(1, true)
  const leather = new MeshPhysicalMaterial({ name: 'BlackenedLeather', color: '#10100e', roughness: 0.32, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.3, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump * 0.05 })
  const felt = new MeshPhysicalMaterial({ name: 'FeltBlack', color: '#22231e', roughness: 0.97, metalness: 0, sheen: 0.3, sheenColor: '#525044', sheenRoughness: 0.9, bumpMap: feltMap, bumpScale: D.reconstruction.feltBump })
  const visor = new MeshPhysicalMaterial({ name: 'VisorLeather', color: '#070807', roughness: 0.24, clearcoat: 0.65, clearcoatRoughness: 0.22, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump * 0.05 })
  const brass = new MeshStandardMaterial({ name: 'Brass', color: '#bda060', roughness: 0.29, metalness: 0.94 })
  workedSurface(leather); workedSurface(visor); workedSurface(brass, true); workedSurface(felt, false, true)
  const cord = new MeshPhysicalMaterial({ name: 'CordWhite', color: '#e1d7be', roughness: 0.94, sheen: 0.7, sheenColor: '#f0e7d5', sheenRoughness: 0.85, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump * 1.5 })
  cord.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
float yarnPhase = vBumpMapUv.y * 150.796 + vBumpMapUv.x * 50.265;
float yarnFilter = 1.0 - smoothstep(0.8, 3.0, fwidth(yarnPhase));
float plyPhase = vBumpMapUv.y * 18.8496 + vBumpMapUv.x * 150.796;
diffuseColor.rgb *= (0.88 + 0.12 * sin(yarnPhase) * yarnFilter) * (0.93 + 0.07 * sin(plyPhase));
`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float plyHeight = sin(plyPhase) * 0.00016;
vec3 plyS = dFdx(-vViewPosition), plyT = dFdy(-vViewPosition);
vec3 plyR1 = cross(plyT, normal), plyR2 = cross(normal, plyS);
float plyDet = dot(plyS, plyR1) * faceDirection;
normal = normalize(abs(plyDet) * normal - sign(plyDet) * (dFdx(plyHeight) * plyR1 + dFdy(plyHeight) * plyR2));
`)
  }
  cord.customProgramCacheKey = () => 'cotton-yarn-2'
  const white = new MeshStandardMaterial({ name: 'RepyokWhite', color: '#e8e3d3', roughness: 0.95, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const green = new MeshStandardMaterial({ name: 'RepyokGreen', color: '#28563c', roughness: 0.95, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const linen = new MeshStandardMaterial({ name: 'LinenInterior', color: '#b9ac8e', roughness: 0.98, side: DoubleSide, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const inner = new MeshStandardMaterial({ name: 'InteriorLeather', color: '#463629', roughness: 0.85, side: DoubleSide, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump })
  const wood = new MeshStandardMaterial({ name: 'DarkWood', color: '#302a20', roughness: 0.85 })
  const original = new Set<MeshStandardMaterial>()
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    if (o.material instanceof MeshStandardMaterial) original.add(o.material)
    let parent = o.parent, semantic = o.userData.material
    let isCord = false, isInterior = false
    while (parent) {
      semantic ??= parent.userData.material
      isCord ||= parent.name === 'Ethishket'
      isInterior ||= parent.name === 'Interior'
      parent = parent.parent
    }
    o.material = semantic === 'Brass' ? brass
      : isCord ? cord
      : o.name === 'RepyokWhite' ? white : o.name === 'RepyokGreen' ? green
      : o.name === 'DarkWoodBack' ? wood
      : o.name === 'LinenLiner' ? linen : isInterior ? inner
      : o.name.startsWith('Felt') ? felt
      : o.name.startsWith('Visor') ? visor : leather
  })
  original.forEach((m) => m.dispose())
  return leather
}
