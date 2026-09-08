import { copyFile, rename, unlink, writeFile } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

/** Replace generated files atomically; synced Windows folders may reject truncation. */
export async function writeArtifact(path:string,data:Buffer|string){
  const temporary=`${path}.${process.pid}.tmp`
  await writeFile(temporary,data)
  for(let attempt=0;;attempt++)try {await rename(temporary,path);return}
  catch(error){
    // A viewer can hold a read handle that permits replacement by copy but not rename.
    try {await copyFile(temporary,path);await unlink(temporary);return} catch { /* retry below */ }
    if(attempt===5)throw error;await setTimeout(150*(attempt+1))
  }
}
