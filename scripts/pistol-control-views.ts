import { Box3, Mesh, OrthographicCamera, Vector3, type Group } from 'three'

export const pistolControlViews = [
  { name: '01-right', direction: [0,0,1] },
  { name: '02-left', direction: [0,0,-1] },
  { name: '03-top', direction: [0,1,0] },
  { name: '04-bottom', direction: [0,-1,0] },
  { name: '05-front', direction: [1,0,0] },
  { name: '06-rear', direction: [-1,0,0] },
  { name: '07-front-3-quarter', direction: [1,.65,1.6] },
  { name: '08-rear-3-quarter', direction: [-1,.65,1.6] },
  { name: '09-lock', direction: [.12,.25,1], parts: ['lock_'] },
  { name: '10-cock', direction: [.15,.3,1], parts: ['lock_cock','lock_upper_jaw','lock_lower_jaw','lock_jaw','lock_flint'] },
  { name: '11-frizzen-pan', direction: [.25,1.2,.8], parts: ['lock_frizzen','lock_pan'] },
  { name: '12-breech', direction: [-.25,1,-.5], parts: ['breech'] },
  { name: '13-muzzle', direction: [1,.25,.4], parts: ['foreend_plate','front_sight'], extent: 'muzzle' },
  { name: '14-sideplate', direction: [-.1,.3,-1], parts: ['sideplate','counter_screw'] },
  { name: '15-trigger', direction: [.2,-.4,1], parts: ['trigger'] },
  { name: '16-ramrod', direction: [.25,-.4,1], parts: ['ramrod'] },
  { name: '17-ramrod-pipes', direction: [.15,-1,.5], parts: ['ramrod_pipe'] },
  { name: '18-foreend', direction: [.4,-.2,1], parts: ['foreend_plate','front_sight','ramrod_head'] },
  { name: '19-buttcap', direction: [-.5,-.35,1], parts: ['buttcap'] },
  { name: '20-stock-cross-section-area', direction: [-1,.6,.35], parts: ['lock_lockplate','sideplate','breech'] },
  { name: '21-left-3-quarter', direction: [-1,.65,-1.6] },
  { name: '22-jaws-flint', direction: [.15,.35,1], parts: ['lock_upper_jaw','lock_lower_jaw','lock_jaw','lock_flint'] },
  { name: '23-frizzen', direction: [.2,.35,1], parts: ['lock_frizzen'], },
  { name: '24-pan', direction: [.15,1.6,1], parts: ['lock_pan'] },
  { name: '25-spring', direction: [.1,.3,1], parts: ['lock_frizzen_spring','spring_screw'] },
  { name: '26-lockplate', direction: [0,0,1], parts: ['lock_lockplate'] },
  { name: '27-screw-head-top', direction: [.41,.91,.3], parts: ['lock_jaw_screw_head'] },
  { name: '28-screw-head-oblique', direction: [-.6,.35,1], parts: ['lock_jaw_screw_head'] },
] as const

/** Orthographic inspection exposes all surfaces without perspective-based proportion changes. */
export function controlCamera(root: Group, name: string, aspect: number): OrthographicCamera {
  const view = pistolControlViews.find(v => v.name === name)
  if (!view) throw new Error(`Unknown control view ${name}`)
  const bounds = new Box3()
  root.traverse(object => {
    if (object instanceof Mesh && (!('parts' in view) || view.parts.some(part => object.name.startsWith(`pistol_${part}`)))) bounds.expandByObject(object)
  })
  if (bounds.isEmpty()) throw new Error(`No semantic geometry for ${name}`)
  if ('extent' in view && view.extent === 'muzzle') bounds.max.x = new Box3().setFromObject(root).max.x
  const target = bounds.getCenter(new Vector3()), direction = new Vector3(...view.direction).normalize()
  const camera = new OrthographicCamera(-1,1,1,-1,.001,10)
  if (Math.abs(direction.y) > .99) camera.up.set(0,0,-1)
  camera.position.copy(target).addScaledVector(direction,2)
  camera.lookAt(target); camera.updateMatrixWorld(true)
  const projected = new Box3()
  for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z])
    projected.expandByPoint(new Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse))
  const size = projected.getSize(new Vector3()), height = Math.max(size.y,size.x/aspect,.025)*1.24, width = height*aspect
  camera.left=-width/2; camera.right=width/2; camera.top=height/2; camera.bottom=-height/2; camera.updateProjectionMatrix()
  return camera
}
