import { Box3, Group, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ExhibitModel, GlbExhibitModel } from '../content/types'
import { disposeObject3D } from './dispose'

export interface LoadedExhibitModel {
  readonly root: Group
  readonly dispose: () => void
}

async function loadProcedural(factoryId: string, signal: AbortSignal): Promise<Group> {
  signal.throwIfAborted()
  if (factoryId !== 'pokrov-na-nerli-procedural-v2') {
    throw new Error(`Unknown procedural factory: ${factoryId}`)
  }
  const { createPokrovNaNerliModel } = await import('../content/exhibits/pokrov-na-nerli/procedural/createPokrovNaNerliModel')
  signal.throwIfAborted()
  return createPokrovNaNerliModel()
}

async function loadGlb(model: GlbExhibitModel, signal: AbortSignal): Promise<Group> {
  signal.throwIfAborted()
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(model.src)
  if (signal.aborted) {
    disposeObject3D(gltf.scene)
    signal.throwIfAborted()
  }

  gltf.scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })

  if (!model.normalization) return gltf.scene

  const { targetHeight, centerXZ = true, ground = true, rotation } = model.normalization
  const root = new Group()
  root.name = 'normalized-glb'
  if (rotation) gltf.scene.rotation.set(rotation[0], rotation[1], rotation[2])
  root.add(gltf.scene)
  root.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(gltf.scene)
  const size = bounds.getSize(new Vector3())
  if (!Number.isFinite(size.y) || size.y <= 0) {
    disposeObject3D(root)
    throw new Error('3D-модель не содержит корректного объёма для показа.')
  }

  gltf.scene.scale.multiplyScalar(targetHeight / size.y)
  root.updateMatrixWorld(true)
  bounds.setFromObject(gltf.scene)
  const center = bounds.getCenter(new Vector3())
  gltf.scene.position.x -= centerXZ ? center.x : 0
  gltf.scene.position.z -= centerXZ ? center.z : 0
  gltf.scene.position.y -= ground ? bounds.min.y : 0
  root.updateMatrixWorld(true)
  return root
}

export async function loadExhibitModel(model: ExhibitModel, signal: AbortSignal): Promise<LoadedExhibitModel> {
  if (import.meta.env.MODE === 'production' && model.kind === 'procedural' && model.developmentOnly) {
    throw new Error('DEV_ONLY model is blocked from the production runtime.')
  }
  const root = model.kind === 'procedural'
    ? await loadProcedural(model.factoryId, signal)
    : await loadGlb(model, signal)
  return { root, dispose: () => disposeObject3D(root) }
}
