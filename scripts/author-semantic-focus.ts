import { Box3, Matrix3, Raycaster, Vector3 } from 'three'
import { createPistol } from '../src/content/exhibits/russian-pistol-1798-1804/source/createPistol'
import { pistolSemantics } from '../src/content/exhibits/russian-pistol-1798-1804/semantics'
import { SemanticSceneIndex } from '../src/three/SemanticSceneIndex'
import { disposeObject3D } from '../src/three/dispose'

const root = createPistol(), index = new SemanticSceneIndex(root, pistolSemantics)
for (const [entityId, objectName, hint] of [
  ['stock.grip', 'pistol_stock', [-.1682, .0676, .2]],
  ['barrel.muzzle', 'pistol_barrel', [.223, .105, .2]],
  ['marking.tula-1803', 'pistol_lock_plate_inscription', null],
] as const) {
  const object = root.getObjectByName(objectName)!
  const center = new Box3().setFromObject(object).getCenter(new Vector3())
  const origin = hint ? new Vector3(...hint) : center.clone().add(new Vector3(0, 0, .2))
  let hit = new Raycaster(origin, new Vector3(0, 0, -1)).intersectObject(object, true)[0]
  if (!hit && !hint) {
    const box = new Box3().setFromObject(object)
    for (let y = 1; y < 24 && !hit; y++) for (let x = 1; x < 48 && !hit; x++) {
      origin.set(box.min.x + (box.max.x - box.min.x) * x / 48, box.min.y + (box.max.y - box.min.y) * y / 24, box.max.z + .2)
      hit = new Raycaster(origin, new Vector3(0, 0, -1)).intersectObject(object, true)[0]
    }
  }
  if (!hit) throw new Error(`No authoring hit: ${entityId}`)
  const normal = hit.face?.normal.clone().applyMatrix3(new Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize()
  console.log(JSON.stringify(index.anchorFromWorld(entityId, hit.point, normal)))
}
disposeObject3D(root)
