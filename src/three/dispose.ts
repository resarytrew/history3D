import {
  BufferGeometry,
  Material,
  Mesh,
  SkinnedMesh,
  Texture,
  type Object3D,
  type WebGLRenderer,
} from 'three'

function collectTexture(value: unknown, textures: Set<Texture>): void {
  if (value instanceof Texture) {
    textures.add(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectTexture(item, textures))
  } else if (value && typeof value === 'object' && 'value' in value) {
    collectTexture(value.value, textures)
  }
}

export function disposeObject3D(root: Object3D, renderer?: WebGLRenderer): void {
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    if (object.geometry instanceof BufferGeometry) geometries.add(object.geometry)
    if (object instanceof SkinnedMesh) object.skeleton.dispose()
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material]
    meshMaterials.forEach((material) => {
      if (!(material instanceof Material)) return
      materials.add(material)
      Object.values(material).forEach((value) => collectTexture(value, textures))
    })
  })

  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  geometries.forEach((geometry) => geometry.dispose())
  root.removeFromParent()
  renderer?.renderLists.dispose()
}

