/** Metres in the exported glTF. Photo coordinates are silhouette guides, not measurements. */
export const pistolDimensions = {
  calibreMm: 17,
  barrelMm: 269,
  originalBarrelMm: 370,
  workingOverallMm: 460,
  source: 'padikovo-news',
  overallBasis: 'RECONSTRUCTION: approximate working length, not a museum measurement',
  muzzleOuterDiameterMm: 24,
  depthBasis: 'RECONSTRUCTION: inferred from oblique museum photographs',
} as const

export const photoScale = 0.460 / 1415
export const X = (pixel: number) => (pixel - 747.5) * photoScale
export const Y = (pixel: number) => (750 - pixel) * photoScale
export const barrelStart = 1455 - 0.269 / photoScale
