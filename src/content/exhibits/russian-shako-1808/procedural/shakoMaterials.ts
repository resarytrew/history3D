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
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorkedPosition;\nvarying vec2 vWorkedUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorkedPosition = position;\nvWorkedUv = uv;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWorkedPosition;
varying vec2 vWorkedUv;
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
roughnessFactor = clamp(roughnessFactor + (workedMottle - 0.5) * ${metal ? '0.055' : felt ? '0.035' : '0.10'}, 0.12, 1.0);
${!metal && !felt ? `
float edgeDistance = min(min(vWorkedUv.x, 1.0-vWorkedUv.x), min(vWorkedUv.y, 1.0-vWorkedUv.y));
float handledEdge = (1.0-smoothstep(0.0, 0.028, edgeDistance)) * (0.35 + 0.65 * workedMottle);
roughnessFactor = max(0.18, roughnessFactor - handledEdge * 0.045);
diffuseColor.rgb *= 1.0 + handledEdge * 0.10;
` : ''}
${felt ? 'diffuseColor.rgb *= 0.97 + 0.06 * workedNoise(vWorkedPosition * 2300.0);' : ''}
`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float workedHeight = workedNoise(vWorkedPosition * ${metal ? '2100.0' : '1800.0'}) * ${metal ? '0.0000015' : felt ? '0.000009' : '0.000006'}
  + workedNoise(vWorkedPosition * 155.0) * ${metal ? '0.000003' : felt ? '0.000004' : '0.000009'};
vec3 workedS = dFdx(-vViewPosition), workedT = dFdy(-vViewPosition);
vec3 workedR1 = cross(workedT, normal), workedR2 = cross(normal, workedS);
float workedDet = dot(workedS, workedR1) * faceDirection;
vec3 workedGradient = sign(workedDet) * (dFdx(workedHeight) * workedR1 + dFdy(workedHeight) * workedR2);
normal = normalize(abs(workedDet) * normal - workedGradient);
`)
  }
  material.customProgramCacheKey = () => `worked-surface-${metal ? 'brass' : felt ? 'felt' : 'leather'}-4`
}

export function applyShakoMaterials(root: Group): MeshStandardMaterial {
  const feltMap = grain(1808), leatherMap = grain(1812), clothMap = grain(1, true)
  const leather = new MeshPhysicalMaterial({ name: 'BlackenedLeather', color: '#10100e', roughness: 0.38, metalness: 0, clearcoat: 0.13, clearcoatRoughness: 0.36, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump * 0.05 })
  const felt = new MeshPhysicalMaterial({ name: 'FeltBlack', color: '#1b1c19', roughness: 0.96, metalness: 0, sheen: 0.08, sheenColor: '#525044', sheenRoughness: 0.9, bumpMap: feltMap, bumpScale: D.reconstruction.feltBump * 0.3 })
  const visor = new MeshPhysicalMaterial({ name: 'VisorLeather', color: '#070807', roughness: 0.29, clearcoat: 0.32, clearcoatRoughness: 0.31, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump * 0.05 })
  const brass = new MeshStandardMaterial({ name: 'Brass', color: '#aa915e', roughness: 0.41, metalness: 0.90 })
  const hardware = brass.clone(); hardware.name = 'CastBrass'; hardware.roughness = 0.46
  workedSurface(hardware, true)
  const visorEdge = visor.clone(); visorEdge.name = 'VisorBoundEdge'; visorEdge.roughness = 0.34; visorEdge.clearcoat = 0.24
  workedSurface(visorEdge)
  workedSurface(leather); workedSurface(visor); workedSurface(brass, true); workedSurface(felt, false, true)
  const cord = new MeshPhysicalMaterial({ name: 'CordWhite', color: '#e7dfcf', roughness: 0.94, sheen: 0.7, sheenColor: '#f0e7d5', sheenRoughness: 0.85, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump * 1.5 })
  cord.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
float yarnPhase = vBumpMapUv.y * 150.796 + vBumpMapUv.x * 50.265;
float yarnFilter = 1.0 - smoothstep(0.8, 3.0, fwidth(yarnPhase));
float plyPhase = vBumpMapUv.y * 18.8496 + vBumpMapUv.x * 150.796;
diffuseColor.rgb *= (0.88 + 0.12 * sin(yarnPhase) * yarnFilter) * (0.93 + 0.07 * sin(plyPhase));
`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float plyHeight = sin(plyPhase) * 0.000025 * (1.0 - smoothstep(0.6, 2.5, fwidth(plyPhase)));
vec3 plyS = dFdx(-vViewPosition), plyT = dFdy(-vViewPosition);
vec3 plyR1 = cross(plyT, normal), plyR2 = cross(normal, plyS);
float plyDet = dot(plyS, plyR1) * faceDirection;
normal = normalize(abs(plyDet) * normal - sign(plyDet) * (dFdx(plyHeight) * plyR1 + dFdy(plyHeight) * plyR2));
`)
  }
  cord.customProgramCacheKey = () => 'cotton-yarn-hero-1'
  const fineYarn = cord.clone(); fineYarn.name = 'CottonFineYarn'; fineYarn.bumpScale = D.reconstruction.clothBump * 0.12
  fineYarn.onBeforeCompile = cord.onBeforeCompile; fineYarn.customProgramCacheKey = cord.customProgramCacheKey
  const white = new MeshPhysicalMaterial({ name: 'RepyokWhite', color: '#dfd9c9', roughness: 0.96, sheen: 0.14, sheenColor: '#c4bda9', sheenRoughness: 1, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const green = new MeshPhysicalMaterial({ name: 'RepyokGreen', color: '#34533b', roughness: 0.96, sheen: 0.14, sheenColor: '#77816a', sheenRoughness: 1, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  // Both colour regions use the same baked metre coordinates and cloth response.
  // Colour changes at the sewn textile boundary; there is no extra raised insert.
  for (const cloth of [white, green]) {
    workedSurface(cloth, false, true)
    const baseCompile = cloth.onBeforeCompile
    cloth.onBeforeCompile = (shader, renderer) => {
      baseCompile(shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
float woolWeave = sin(vWorkedPosition.x * 19000.0 + sin(vWorkedPosition.y * 8000.0)) * sin(vWorkedPosition.y * 22000.0);
diffuseColor.rgb *= 0.94 + 0.06 * woolWeave;
`)
    }
    cloth.customProgramCacheKey = () => 'repyok-wool-1'
  }
  const linen = new MeshStandardMaterial({ name: 'LinenInterior', color: '#b9ac8e', roughness: 0.98, side: DoubleSide, bumpMap: clothMap, bumpScale: D.reconstruction.clothBump })
  const inner = new MeshStandardMaterial({ name: 'InteriorLeather', color: '#463629', roughness: 0.85, side: DoubleSide, bumpMap: leatherMap, bumpScale: D.reconstruction.leatherBump })
  const wood = new MeshStandardMaterial({ name: 'DarkWood', color: '#302a20', roughness: 0.85 })
  const original = new Set<MeshStandardMaterial>()
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    if (o.material instanceof MeshStandardMaterial) original.add(o.material)
    let parent = o.parent, semantic = o.userData.material
    let isCord = false, isInterior = false, isBadge = false
    while (parent) {
      semantic ??= parent.userData.material
      isCord ||= parent.name === 'Ethishket'
      isInterior ||= parent.name === 'Interior'
      isBadge ||= parent.name === 'FrontBadge_OneFlameGrenade'
      parent = parent.parent
    }
    o.material = semantic === 'Brass' ? (isBadge ? brass : hardware)
      : isCord ? (o.name === 'CottonFringe' || o.name === 'TwistedSuspension' || o.name === 'WovenHead' ? fineYarn : cord)
      : o.name === 'RepyokWhite' ? white : o.name === 'RepyokGreen' ? green
      : o.name === 'WoodenRepyokCore' ? wood
      : o.name === 'RepyokBlackBacking' ? leather
      : o.name === 'LinenLiner' ? linen : o.name.startsWith('LinenDrawstring') ? fineYarn : isInterior ? inner
      : o.name.startsWith('Felt') ? felt
      : o.name.startsWith('Visor') ? (o.name === 'Visor' ? visor : visorEdge) : leather
  })
  original.forEach((m) => m.dispose())
  return leather
}
