/** All lengths in metres. FACT means supplied specification, not independent verification. */
export const mm = (value: number): number => value / 1000
export const shako1808Dimensions = {
  fact: {
    shellHeight: mm(175), topDiameter: mm(255), diameterDifference: mm(45),
    topRecess: mm(25), upperOverlap: mm(27), vStrapWidth: mm(18), vTopSeparation: mm(90),
    lowerBandHeight: mm(20), rearCoverHeight: mm(50), pocketHeight: mm(80),
    visorProjection: mm(75), visorDrop: mm(50), visorRidgeInset: mm(12),
    chinstrapWidth: mm(18), sweatbandHeight: mm(37), linerHeight: mm(135), neckFlapHeight: mm(168),
  },
  derived: { bottomDiameter: mm(255 - 45), topRadius: mm(255 / 2), bottomRadius: mm((255 - 45) / 2) },
  /** RECONSTRUCTION_VALUE: every unmeasured length/placement is deliberately centralized here. */
  reconstruction: {
    baseY: mm(80), leatherThickness: mm(2.5), shellThickness: mm(2), visorThickness: mm(3.5),
    rimRoll: mm(2), surfaceOffset: mm(0.8), ridgeRadius: mm(0.8), secondRidgeInset: mm(3),
    rearSlitWidth: mm(3), rearCoverWidth: mm(28), buckleWidth: mm(22), buckleHeight: mm(25), buckleWire: mm(1.6),
    pocketTopWidth: mm(32), pocketBottomWidth: mm(19), pocketGap: mm(2),
    badgeHeight: mm(73), badgeWidth: mm(29), badgeBottom: mm(39), badgeDepth: mm(0.6), badgeBevel: mm(0.15),
    badgeRelief: mm(1.4), yarnRadius: mm(0.28), seamUndulation: mm(0.18),
    repyokHeight: mm(78), repyokWidth: mm(43), repyokDepth: mm(10), repyokAboveRim: mm(30),
    repyokCentreWidth: mm(14), repyokCentreHeight: mm(25), wireRadius: mm(0.6),
    cordDiameter: mm(4.5), braidRadius: mm(6), braidTop: mm(151), braidSag: mm(64), frontBraidSag: mm(121),
    braidOffset: mm(7), braidWaves: 32, longSuspension: mm(145), shortSuspension: mm(68),
    tasselHeadRadius: mm(6), tasselHeadHeight: mm(12), tasselFringeHeight: mm(18), tasselFringeRadius: mm(10),
    tasselSpacing: mm(13), diamondHeight: mm(24), diamondWidth: mm(12),
    chinstrapDrop: mm(59), chinstrapInset: mm(3), chinstrapButtonRadius: mm(5),
    stitchRadius: mm(0.22), stitchLength: mm(1.4), stitchSpacing: mm(4), stitchInset: mm(1.5),
    feltBump: mm(0.16), leatherBump: mm(0.07), clothBump: mm(0.12),
  },
  // The optional 150k detail budget is used for smooth close-up textile bends.
  topology: { radial: 128, patch: 40, cordRadial: 6, braidRadial: 8, braidSegments: 640, textureSize: 256 },
} as const

export const D = shako1808Dimensions
export const shellRadiusAt = (height: number): number => D.derived.bottomRadius
  + (D.derived.topRadius - D.derived.bottomRadius) * height / D.fact.shellHeight
