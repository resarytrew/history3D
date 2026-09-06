/** Metres. Published 1808 specification, Sergeant 36 (2006), p.51.
 * Conventional conversion, not measured manufacturing precision: inch=25.4 mm,
 * vershok=1.75 inches, line=0.1 inch. See evidence-1810.md for interpretation. */
export const mm = (value: number): number => value / 1000
export const historicalMeasures = { inch: mm(25.4), vershok: mm(44.45), line: mm(2.54) } as const
export const shakoSourceMeasures = {
  sourceId: 'alekhin-ulyanov-2006', locator: 'с.51',
  vershoks: { shellHeight: 3.875, bottomInternal: 4.75, topInternal: 5.75, diameterDifference: 1, vTopSeparation: 2, linerCutHeight: 3, neckFlapCutHeight: 3.75 },
  inches: { topRecess: 1, rearCoverHeight: 2, rearCoverWidth: 2, visorProjection: 3, visorDrop: 2, visorRidgeInset: 0.5, sweatbandHeight: 1.5 },
  lines: { vStrapWidth: 7, lowerBandHeight: 8, chinstrapWidth: 7 },
  upperOverlap: { inches: 1, lines: 1 },
} as const
const { inch, vershok, line } = historicalMeasures
const shellThickness = mm(2), leatherThickness = mm(2.5)
const S = shakoSourceMeasures
const bottomInternal = S.vershoks.bottomInternal * vershok, topInternal = S.vershoks.topInternal * vershok
export const shako1808Dimensions = {
  specification: S,
  converted: {
    shellHeight: S.vershoks.shellHeight * vershok, topInternalDiameter: topInternal, bottomInternalDiameter: bottomInternal,
    diameterDifference: S.vershoks.diameterDifference * vershok,
    topRecess: S.inches.topRecess * inch, upperOverlap: S.upperOverlap.inches * inch + S.upperOverlap.lines * line,
    vStrapWidth: S.lines.vStrapWidth * line, vTopSeparation: S.vershoks.vTopSeparation * vershok,
    lowerBandHeight: S.lines.lowerBandHeight * line, rearCoverHeight: S.inches.rearCoverHeight * inch, rearCoverWidth: S.inches.rearCoverWidth * inch,
    visorProjection: S.inches.visorProjection * inch, visorDrop: S.inches.visorDrop * inch, visorRidgeInset: S.inches.visorRidgeInset * inch,
    chinstrapWidth: S.lines.chinstrapWidth * line, sweatbandHeight: S.inches.sweatbandHeight * inch,
    linerHeight: S.vershoks.linerCutHeight * vershok, neckFlapHeight: S.vershoks.neckFlapCutHeight * vershok,
  },
  derived: {
    bottomDiameter: bottomInternal + shellThickness * 2,
    topRadius: topInternal / 2 + shellThickness,
    bottomRadius: bottomInternal / 2 + shellThickness,
    outerTopRadius: topInternal / 2 + shellThickness + leatherThickness,
  },
  /** RECONSTRUCTION_VALUE: every unmeasured length/placement is deliberately centralized here. */
  reconstruction: {
    baseY: mm(80), leatherThickness, shellThickness, visorThickness: mm(3.5),
    rimRoll: mm(2), surfaceOffset: mm(0.8), ridgeRadius: mm(0.8),
    rearSlitWidth: mm(3), buckleWidth: mm(22), buckleHeight: mm(25), buckleWire: mm(1.6),
    badgeHeight: mm(73), badgeWidth: mm(29), badgeBottom: mm(39), badgeDepth: mm(0.45), badgeBevel: mm(0.10),
    badgeRelief: mm(0.95), badgeContactGap: mm(0.18), badgeMaxEdge: mm(1.8), yarnRadius: mm(0.20), seamUndulation: mm(0.12),
    repyokHeight: mm(58), repyokWidth: mm(35), repyokDepth: mm(8), repyokAboveRim: mm(20),
    repyokCentreWidth: mm(12), repyokCentreHeight: mm(20), wireRadius: mm(0.45),
    cordDiameter: mm(3.2), braidRadius: mm(4.3), braidTop: mm(151), braidSag: mm(64), frontBraidSag: mm(121),
    braidOffset: mm(5.6), braidWaves: 36, longSuspension: mm(145), shortSuspension: mm(68),
    tasselHeadRadius: mm(4.6), tasselHeadHeight: mm(10), tasselFringeHeight: mm(17), tasselFringeRadius: mm(8),
    tasselSpacing: mm(13), diamondHeight: mm(24), diamondWidth: mm(12),
    chinstrapDrop: mm(90), chinstrapButtonRadius: mm(5),
    stitchRadius: mm(0.12), stitchLength: mm(1.2), stitchSpacing: mm(3.7), stitchInset: mm(1.5),
    feltBump: mm(0.16), leatherBump: mm(0.07), clothBump: mm(0.12),
  },
  // User explicitly removed the pasted 120k ceiling: preserve close-up detail and locked dimensions.
  topology: { radial: 128, patch: 40, cordRadial: 6, braidRadial: 8, braidSegments: 720, textureSize: 512, interiorRadial: 160, interiorRows: 48 },
} as const

export const D = shako1808Dimensions
export const shellRadiusAt = (height: number): number => D.derived.bottomRadius
  + (D.derived.topRadius - D.derived.bottomRadius) * height / D.converted.shellHeight
