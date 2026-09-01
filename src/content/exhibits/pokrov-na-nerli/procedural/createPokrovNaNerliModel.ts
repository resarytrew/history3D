import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three'

type StonePalette = {
  readonly limestone: MeshPhysicalMaterial
  readonly limestoneLight: MeshStandardMaterial
  readonly limestoneShade: MeshStandardMaterial
  readonly recess: MeshStandardMaterial
  readonly roof: MeshStandardMaterial
  readonly gold: MeshPhysicalMaterial
}

export type ReconstructionPass = 1 | 2 | 3

const BODY_WIDTH = 3.55
const BODY_DEPTH = 3.28
const WALL_HEIGHT = 4.36

function createPalette(): StonePalette {
  return {
    limestone: new MeshPhysicalMaterial({
      color: 0xe3decf,
      roughness: 0.82,
      metalness: 0,
      clearcoat: 0.025,
      clearcoatRoughness: 0.92,
    }),
    limestoneLight: new MeshStandardMaterial({ color: 0xeee8d9, roughness: 0.86, metalness: 0 }),
    limestoneShade: new MeshStandardMaterial({ color: 0xc9c3b5, roughness: 0.9, metalness: 0 }),
    recess: new MeshStandardMaterial({ color: 0x202a29, roughness: 0.94, metalness: 0 }),
    roof: new MeshStandardMaterial({ color: 0x25383b, roughness: 0.6, metalness: 0.18 }),
    gold: new MeshPhysicalMaterial({ color: 0xcaa64d, roughness: 0.27, metalness: 0.82 }),
  }
}

function architecturalMesh(
  name: string,
  geometry: BufferGeometry,
  material: Material,
  castShadow = true,
): Mesh {
  const result = new Mesh(geometry, material)
  result.name = name
  result.castShadow = castShadow
  result.receiveShadow = true
  return result
}

function archedShape(width: number, height: number): Shape {
  const radius = width / 2
  const shoulder = Math.max(radius, height - radius)
  const shape = new Shape()
  shape.moveTo(-radius, 0)
  shape.lineTo(radius, 0)
  shape.lineTo(radius, shoulder)
  shape.absarc(0, shoulder, radius, 0, Math.PI, false)
  shape.lineTo(-radius, 0)
  return shape
}

function archedPanel(
  name: string,
  width: number,
  height: number,
  depth: number,
  material: Material,
  bevel = 0.018,
): Mesh {
  const geometry = new ExtrudeGeometry(archedShape(width, height), {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: bevel > 0 ? 2 : 1,
    curveSegments: 12,
  })
  geometry.center()
  return architecturalMesh(name, geometry, material)
}

function archedRing(
  name: string,
  outerWidth: number,
  outerHeight: number,
  thickness: number,
  depth: number,
  material: Material,
): Mesh {
  const outer = archedShape(outerWidth, outerHeight)
  const innerWidth = Math.max(0.05, outerWidth - thickness * 2)
  const innerHeight = Math.max(0.08, outerHeight - thickness * 2)
  const innerRadius = innerWidth / 2
  const innerShoulder = Math.max(innerRadius, innerHeight - innerRadius)
  const hole = new Path()
  hole.moveTo(-innerRadius, 0)
  hole.lineTo(-innerRadius, innerShoulder)
  hole.absarc(0, innerShoulder, innerRadius, Math.PI, 0, true)
  hole.lineTo(innerRadius, 0)
  hole.lineTo(-innerRadius, 0)
  outer.holes.push(hole)
  const geometry = new ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 1,
    curveSegments: 14,
  })
  geometry.center()
  return architecturalMesh(name, geometry, material)
}

function createWindowSystem(palette: StonePalette, bayWidth: number): Group {
  const system = new Group()
  system.name = 'windowSystem'
  const recess = archedPanel('window-recess', bayWidth * 0.22, 0.92, 0.055, palette.recess, 0)
  const frame = archedRing('window-frame', bayWidth * 0.34, 1.08, 0.075, 0.095, palette.limestoneLight)
  frame.position.z = 0.035
  system.add(recess, frame)
  return system
}

function createPerspectivePortal(palette: StonePalette, width = 0.78): Group {
  const portal = new Group()
  portal.name = 'perspectivePortal'
  const opening = archedPanel('portal-opening', width * 0.65, 1.46, 0.07, palette.recess, 0)
  opening.position.z = 0.15
  portal.add(opening)
  const layers = [
    { scale: 1.34, depth: 0.13, z: 0 },
    { scale: 1.16, depth: 0.105, z: 0.07 },
    { scale: 1, depth: 0.08, z: 0.125 },
  ]
  layers.forEach((layer, index) => {
    const ring = archedRing(
      `portal-archivolt-${index + 1}`,
      width * layer.scale,
      1.72 * layer.scale,
      0.1,
      layer.depth,
      index === 1 ? palette.limestoneShade : palette.limestoneLight,
    )
    ring.position.z = layer.z
    portal.add(ring)
  })
  return portal
}

function addArcadeBay(parent: Group, x: number, palette: StonePalette, index: number): void {
  const column = architecturalMesh(
    `arcade-column-${index}`,
    new CylinderGeometry(0.038, 0.052, 0.48, 8),
    palette.limestoneShade,
  )
  column.position.set(x, 0, 0.035)
  const capital = architecturalMesh(
    `arcade-capital-${index}`,
    new BoxGeometry(0.105, 0.07, 0.105),
    palette.limestoneLight,
  )
  capital.position.set(x, 0.255, 0.04)
  const arch = architecturalMesh(
    `arcade-arch-${index}`,
    new TorusGeometry(0.14, 0.03, 6, 12, Math.PI),
    palette.limestoneShade,
  )
  arch.rotation.z = Math.PI
  arch.position.set(x, 0.37, 0.035)
  parent.add(column, capital, arch)
}

function createFacade(
  name: 'northFacade' | 'southFacade' | 'westFacade',
  width: number,
  palette: StonePalette,
  portalBay: number | null,
  pass: ReconstructionPass,
): Group {
  const facade = new Group()
  facade.name = name
  const bayCenters = [-width / 3, 0, width / 3]
  const pilasterX = [-width / 2, -width / 6, width / 6, width / 2]

  if (pass >= 2) pilasterX.forEach((x, index) => {
    const shaft = architecturalMesh(
      `facadePilaster-${index + 1}`,
      new BoxGeometry(0.17, 3.92, 0.2),
      index % 2 ? palette.limestoneLight : palette.limestone,
    )
    shaft.position.set(x, 2.18, 0.04)
    const base = architecturalMesh(
      `pilaster-base-${index + 1}`,
      new BoxGeometry(0.25, 0.16, 0.27),
      palette.limestoneShade,
    )
    base.position.set(x, 0.27, 0.06)
    const capital = architecturalMesh(
      `pilaster-capital-${index + 1}`,
      new BoxGeometry(0.24, 0.13, 0.25),
      palette.limestoneLight,
    )
    capital.position.set(x, 3.95, 0.05)
    facade.add(shaft, base, capital)
  })

  bayCenters.forEach((x, index) => {
    const zakomara = archedPanel(
      `zakomara-${index + 1}`,
      width / 3 + 0.06,
      0.76,
      0.2,
      index === 1 ? palette.limestoneLight : palette.limestone,
    )
    zakomara.position.set(x, 4.3, 0.015)
    facade.add(zakomara)

    if (pass >= 2) {
      const upperWindow = createWindowSystem(palette, width / 3)
      upperWindow.position.set(x, 3.27, 0.13)
      facade.add(upperWindow)

      if (portalBay === index) {
        const portal = createPerspectivePortal(palette, width / 4.4)
        portal.position.set(x, 1.02, 0.15)
        facade.add(portal)
      } else {
        const lowerWindow = createWindowSystem(palette, width / 3)
        lowerWindow.scale.setScalar(0.72)
        lowerWindow.position.set(x, 1.35, 0.12)
        facade.add(lowerWindow)
      }
    }

    if (pass >= 3) {
      const relief = architecturalMesh(
        `relief-medallion-${index + 1}`,
        new CylinderGeometry(0.16, 0.16, 0.045, 18),
        palette.limestoneShade,
      )
      relief.rotation.x = Math.PI / 2
      relief.position.set(x, 3.83, 0.18)
      facade.add(relief)
    }
  })

  if (pass >= 3) {
    const arcade = new Group()
    arcade.name = 'arcadeColumnBelt'
    for (let index = 0; index < 9; index += 1) {
      addArcadeBay(arcade, -width * 0.4 + index * width * 0.1, palette, index + 1)
    }
    arcade.position.set(0, 2.43, 0.17)
    facade.add(arcade)

    const lowerCornice = architecturalMesh('lower-cornice', new BoxGeometry(width + 0.2, 0.1, 0.23), palette.limestoneShade)
    lowerCornice.position.set(0, 2.15, 0.07)
    const upperCornice = architecturalMesh('upper-cornice', new BoxGeometry(width + 0.16, 0.09, 0.22), palette.limestoneLight)
    upperCornice.position.set(0, 4.02, 0.06)
    facade.add(lowerCornice, upperCornice)
  }
  return facade
}

function placeFacade(facade: Group, x: number, z: number, rotationY: number): Group {
  facade.position.set(x, 0, z)
  facade.rotation.y = rotationY
  return facade
}

function createApse(
  name: 'centralApse' | 'northApse' | 'southApse',
  radius: number,
  height: number,
  x: number,
  palette: StonePalette,
  pass: ReconstructionPass,
): Group {
  const apse = new Group()
  apse.name = name
  apse.position.set(x, 0, -BODY_DEPTH / 2)
  const shell = architecturalMesh(
    'apse-shell',
    new CylinderGeometry(radius, radius * 1.035, height, 28, 1, false),
    palette.limestone,
  )
  shell.position.y = height / 2 + 0.18
  apse.add(shell)

  if (pass >= 2) {
    const window = createWindowSystem(palette, radius * 1.8)
    window.scale.setScalar(radius > 0.65 ? 0.78 : 0.64)
    window.rotation.y = Math.PI
    window.position.set(0, height * 0.67, -radius - 0.04)
    apse.add(window)

    ;[-0.7, 0, 0.7].forEach((angle, index) => {
      const pilaster = architecturalMesh(
        `apse-pilaster-${index + 1}`,
        new BoxGeometry(0.12, height * 0.82, 0.14),
        palette.limestoneLight,
      )
      pilaster.position.set(Math.sin(angle) * radius, height * 0.48, -Math.cos(angle) * radius)
      pilaster.rotation.y = -angle
      apse.add(pilaster)
    })

    const cornice = architecturalMesh(
      'apse-cornice',
      new TorusGeometry(radius + 0.055, 0.055, 7, 28),
      palette.limestoneShade,
    )
    cornice.rotation.x = Math.PI / 2
    cornice.position.y = height + 0.16
    apse.add(cornice)
  }
  return apse
}

function createApses(palette: StonePalette, pass: ReconstructionPass): Group {
  const apses = new Group()
  apses.name = 'apses'
  apses.add(
    createApse('centralApse', 0.72, 3.5, 0, palette, pass),
    createApse('northApse', 0.53, 3.2, 1.08, palette, pass),
    createApse('southApse', 0.53, 3.2, -1.08, palette, pass),
  )
  return apses
}

function createDrum(palette: StonePalette, pass: ReconstructionPass): Group {
  const drum = new Group()
  drum.name = 'drum'
  const shell = architecturalMesh('drum-shell', new CylinderGeometry(0.79, 0.84, 1.62, 40), palette.limestone)
  shell.position.y = 5.18
  drum.add(shell)

  const drumWindows = new Group()
  drumWindows.name = 'drumWindows'
  if (pass >= 2) {
    const radius = 0.82
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2
      const window = archedPanel(`drum-window-${index + 1}`, 0.16, 0.72, 0.045, palette.recess, 0)
      window.position.set(Math.sin(angle) * (radius + 0.01), 5.18, Math.cos(angle) * (radius + 0.01))
      window.rotation.y = angle
      drumWindows.add(window)
      if (pass >= 3) {
        const pilaster = architecturalMesh(
          `drum-pilaster-${index + 1}`,
          new BoxGeometry(0.095, 1.36, 0.1),
          index % 2 ? palette.limestoneLight : palette.limestoneShade,
        )
        const pilasterAngle = angle + Math.PI / 12
        pilaster.position.set(Math.sin(pilasterAngle) * 0.855, 5.16, Math.cos(pilasterAngle) * 0.855)
        pilaster.rotation.y = pilasterAngle
        drumWindows.add(pilaster)
      }
    }
  }
  drum.add(drumWindows)

  const baseRing = architecturalMesh('drum-base-cornice', new CylinderGeometry(0.94, 0.94, 0.13, 40), palette.limestoneShade)
  baseRing.position.y = 4.36
  const topRing = architecturalMesh('drum-top-cornice', new CylinderGeometry(0.91, 0.91, 0.12, 40), palette.limestoneLight)
  topRing.position.y = 6.02
  drum.add(baseRing, topRing)
  if (pass >= 3) {
    const teeth = architecturalMesh('drum-zigzag-band', new TorusGeometry(0.855, 0.045, 6, 40), palette.limestoneShade)
    teeth.rotation.x = Math.PI / 2
    teeth.position.y = 5.88
    drum.add(teeth)
  }
  return drum
}

function createDomeAndCross(palette: StonePalette): Group {
  const assembly = new Group()
  assembly.name = 'domeAssembly'
  const profile = [
    new Vector2(0.03, 0),
    new Vector2(0.42, 0.06),
    new Vector2(0.68, 0.28),
    new Vector2(0.79, 0.61),
    new Vector2(0.75, 0.92),
    new Vector2(0.55, 1.2),
    new Vector2(0.29, 1.38),
    new Vector2(0.12, 1.58),
    new Vector2(0.035, 1.83),
  ]
  const dome = architecturalMesh('dome', new LatheGeometry(profile, 48), palette.roof)
  dome.position.y = 6.06
  assembly.add(dome)

  const cross = new Group()
  cross.name = 'cross'
  const orb = architecturalMesh('cross-orb', new SphereGeometry(0.105, 18, 12), palette.gold)
  orb.position.y = 7.99
  const vertical = architecturalMesh('cross-vertical', new CylinderGeometry(0.025, 0.025, 0.86, 8), palette.gold)
  vertical.position.y = 8.48
  const upperBar = architecturalMesh('cross-upper-bar', new CylinderGeometry(0.022, 0.022, 0.18, 8), palette.gold)
  upperBar.rotation.z = Math.PI / 2
  upperBar.position.y = 8.74
  const mainBar = architecturalMesh('cross-main-bar', new CylinderGeometry(0.026, 0.026, 0.48, 8), palette.gold)
  mainBar.rotation.z = Math.PI / 2
  mainBar.position.y = 8.57
  const lowerBar = architecturalMesh('cross-lower-bar', new CylinderGeometry(0.022, 0.022, 0.36, 8), palette.gold)
  lowerBar.rotation.z = Math.PI / 2 + MathUtils.degToRad(13)
  lowerBar.position.y = 8.29
  cross.add(orb, vertical, upperBar, mainBar, lowerBar)
  assembly.add(cross)
  return assembly
}

function createFoundation(palette: StonePalette): Group {
  const foundation = new Group()
  foundation.name = 'foundation'
  const dimensions = [
    [3.92, 0.12, 3.72],
    [3.76, 0.12, 3.56],
    [3.62, 0.13, 3.42],
  ] as const
  dimensions.forEach(([width, height, depth], index) => {
    const step = architecturalMesh(`foundation-step-${index + 1}`, new BoxGeometry(width, height, depth), index === 1 ? palette.limestoneShade : palette.limestone)
    step.position.y = 0.06 + index * 0.1
    foundation.add(step)
  })
  return foundation
}

function createRoof(palette: StonePalette): Group {
  const roof = new Group()
  roof.name = 'zakomarRoof'
  for (let index = 0; index < 3; index += 1) {
    const strip = architecturalMesh(
      `roof-strip-${index + 1}`,
      new BoxGeometry(BODY_WIDTH / 3 - 0.06, 0.11, BODY_DEPTH + 0.08),
      palette.roof,
    )
    strip.position.set(-BODY_WIDTH / 3 + index * BODY_WIDTH / 3, 4.27, 0)
    roof.add(strip)
  }
  return roof
}

function createEastCrown(palette: StonePalette): Group {
  const eastFacade = new Group()
  eastFacade.name = 'eastFacade'
  eastFacade.position.set(0, 0, -BODY_DEPTH / 2 - 0.1)
  eastFacade.rotation.y = Math.PI
  for (let index = 0; index < 3; index += 1) {
    const crown = archedPanel(
      `east-zakomara-${index + 1}`,
      BODY_WIDTH / 3 + 0.06,
      0.76,
      0.2,
      index === 1 ? palette.limestoneLight : palette.limestone,
    )
    crown.position.set(-BODY_WIDTH / 3 + index * BODY_WIDTH / 3, 4.3, 0)
    eastFacade.add(crown)
  }
  const cornice = architecturalMesh('east-upper-cornice', new BoxGeometry(BODY_WIDTH + 0.16, 0.09, 0.22), palette.limestoneLight)
  cornice.position.set(0, 4.02, 0.06)
  eastFacade.add(cornice)
  return eastFacade
}

/**
 * Source-guided procedural reconstruction. Every visible church component is real geometry;
 * the supplied poster is not referenced by this factory.
 */
export function createPokrovNaNerliModelForPass(pass: ReconstructionPass): Group {
  const palette = createPalette()
  const root = new Group()
  root.name = 'PokrovNaNerli'

  const foundation = createFoundation(palette)
  const centralVolume = new Group()
  centralVolume.name = 'centralVolume'
  const wallCore = architecturalMesh(
    'masonry-core',
    new BoxGeometry(BODY_WIDTH, WALL_HEIGHT, BODY_DEPTH),
    palette.limestone,
  )
  wallCore.position.y = WALL_HEIGHT / 2 + 0.22
  centralVolume.add(wallCore)

  const facadePilasters = new Group()
  facadePilasters.name = 'facadePilasters'
  const westFacade = placeFacade(createFacade('westFacade', BODY_WIDTH, palette, 1, pass), 0, BODY_DEPTH / 2 + 0.1, 0)
  const northFacade = placeFacade(createFacade('northFacade', BODY_DEPTH, palette, 1, pass), BODY_WIDTH / 2 + 0.1, 0, Math.PI / 2)
  const southFacade = placeFacade(createFacade('southFacade', BODY_DEPTH, palette, 1, pass), -BODY_WIDTH / 2 - 0.1, 0, -Math.PI / 2)
  facadePilasters.add(westFacade, northFacade, southFacade)

  const portals = new Group()
  portals.name = 'portals'
  const windowSystem = new Group()
  windowSystem.name = 'windowSystem'
  const arcadeColumnBelt = new Group()
  arcadeColumnBelt.name = 'arcadeColumnBelt'
  const zakomars = new Group()
  zakomars.name = 'zakomars'
  // Named index groups make the architectural hierarchy inspectable without duplicating geometry.
  ;[westFacade, northFacade, southFacade].forEach((facade) => {
    facade.children.forEach((child) => {
      if (child.name === 'perspectivePortal') portals.userData[facade.name] = child.uuid
      if (child.name === 'arcadeColumnBelt') arcadeColumnBelt.userData[facade.name] = child.uuid
      if (child.name.startsWith('zakomara-')) zakomars.userData[`${facade.name}-${child.name}`] = child.uuid
      if (child.name === 'windowSystem') windowSystem.userData[`${facade.name}-${child.uuid}`] = child.uuid
    })
  })

  const apses = createApses(palette, pass)
  const roof = createRoof(palette)
  const eastFacade = createEastCrown(palette)
  const drum = createDrum(palette, pass)
  const domeAssembly = createDomeAndCross(palette)

  root.add(
    foundation,
    centralVolume,
    northFacade,
    southFacade,
    westFacade,
    apses,
    facadePilasters,
    portals,
    windowSystem,
    arcadeColumnBelt,
    zakomars,
    roof,
    eastFacade,
    drum,
    domeAssembly,
  )
  root.userData.reconstructionStatus = 'technical-review'
  root.userData.refinementPass = pass
  root.userData.developmentOnly = true
  root.userData.geometryContract = 'real-meshes-no-billboards-no-textured-planes'
  root.userData.referenceLimit = 'Single supplied view; hidden sides are symmetry-based inferences.'
  return root
}

export function createPokrovNaNerliModel(): Group {
  return createPokrovNaNerliModelForPass(3)
}
