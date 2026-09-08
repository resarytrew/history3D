/** Image registration only. The museum photographs are not calibrated survey views. */
export const leftPhotoRegistration = { roll: .015, centerY: 507.5 } as const

/** Inverse of the left inspection camera, used to trace its visible decorative plate. */
export function fromLeftPhoto(u:number,v:number):readonly[number,number]{
  const s=Math.sin(leftPhotoRegistration.roll),c=Math.cos(leftPhotoRegistration.roll)
  return [750-c*(u-750)+s*(v-500),leftPhotoRegistration.centerY+s*(u-750)+c*(v-500)]
}
