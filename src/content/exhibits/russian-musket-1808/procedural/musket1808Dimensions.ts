/** Exterior display coordinates in metres. This is a visual reconstruction, not a manufacturing model. */
export const musket1808Dimensions = {
  documented: {
    patternYear: 1808,
    referenceYear: 1811,
    // Padikovo collection card, heading and attribution; no overall measurement published.
    calibreMm: 17.78,
    // I. B. Pink, PDF pp. 4–5: typological dimension, not an examination of the pictured specimen.
    barrelLength: 1.14,
  },
  reconstruction: {
    displayLength: 1.458,
    barrelAxisHeight: 0.23,
    // Single photograph cannot establish depth, absolute length or the left-side fittings.
    buttHalfWidth: 0.024,
    wristHalfWidth: 0.017,
    foreEndHalfWidth: 0.014,
    condition: 'maintained-in-service' as const,
  },
  photo: { width: 1800, height: 1200, left: 40, right: 1760 },
} as const

export const photoScale = musket1808Dimensions.reconstruction.displayLength / 1720
export const photoX = (pixel: number): number => (pixel - 900) * photoScale
export const photoY = (pixel: number): number => 0.23 + (590 - pixel) * photoScale
