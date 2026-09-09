import { expect, test } from '@playwright/test'

test('procedural pistol loads without a poster and supports six details, orbit, reset and switching',async({page},info)=>{
  test.setTimeout(120_000)
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  const photos:string[]=[];page.on('request',r=>{if(r.resourceType()==='image'&&r.url().includes('/images/poster.'))photos.push(r.url())})
  let release!:()=>void
  const gate=new Promise<void>(r=>{release=r})
  await page.route('**/source/createPistol.ts*',async r=>{await gate;await r.continue()})
  try{
    await page.goto('/?exhibit=russian-pistol-1798-1804',{waitUntil:'domcontentloaded'})
    const stage=page.locator('.viewer-stage'),canvas=page.locator('canvas.viewer-canvas')
    await expect(stage).toHaveAttribute('data-state','loading')
    await expect(page.locator('.viewer-loading')).toBeVisible()
    await expect(stage.locator('img')).toHaveCount(0)
    await expect(page.locator('.viewer-loading-fill')).toHaveCSS('animation-name','exhibit-loading')
    release();await page.emulateMedia({reducedMotion:'reduce'})
    await expect(stage).toHaveAttribute('data-state','ready',{timeout:30_000})
    await expect(page.getByRole('heading',{name:'Пистолет кавалерии'})).toBeVisible()
    await expect(canvas).toHaveAttribute('data-contact-shadow','visible')
    await expect(page.locator('.hotspot-marker:visible')).toHaveCount(6)
    const assertMarkerSpacing=async()=>{
      const boxes=await page.locator('.hotspot-marker:visible').evaluateAll(elements=>elements.map(el=>{
        const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,r:r.width/2}
      }))
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)
        expect(Math.hypot(boxes[i].x-boxes[j].x,boxes[i].y-boxes[j].y),`marker ${i+1}/${j+1} overlap`)
          .toBeGreaterThan(boxes[i].r+boxes[j].r+4)
    }
    await assertMarkerSpacing()
    if(info.project.name==='mobile') {
      const viewport=page.viewportSize()!
      await page.setViewportSize({width:320,height:viewport.height})
      await expect.poll(()=>canvas.evaluate(el=>el.clientWidth)).toBeLessThanOrEqual(320)
      await assertMarkerSpacing()
      await page.setViewportSize(viewport)
    }
    await page.screenshot({path:`docs/verification/russian-pistol-1798-1804/integration-${info.project.name}.png`})
    for(const [i,label] of ['Укороченный ствол','Кремнёвый замок','Курок и огниво','Деревянная ложа','Шомпол','Рукоять и скоба'].entries()){
      await page.getByRole('button',{name:`${i+1}. ${label}`,exact:true}).click()
      await expect(page.locator('.hotspot-card')).toBeVisible()
      await page.getByRole('button',{name:'Сбросить ракурс'}).click()
      await expect(page.locator('.hotspot-card')).toHaveCount(0)
    }
    const bounds=(await canvas.boundingBox())!
    // Start on exposed canvas, avoiding the device controls and hotspot buttons.
    const gesture = await canvas.evaluate(element => {
      const box = element.getBoundingClientRect()
      for (const y of [.65, .55, .4, .75]) for (const x of [.85, .75, .65]) {
        const point = { x: box.x + box.width * x, y: box.y + box.height * y }
        if (document.elementFromPoint(point.x, point.y) === element && point.x - box.height * .49 > box.x) return point
      }
      throw new Error('No exposed canvas region for orbit gesture')
    })
    const start = gesture.x, y = gesture.y
    const marker=page.locator('[data-hotspot-id="pistol-lock"]'),before=await marker.evaluate(el=>el.style.left)
    await page.mouse.move(start,y);await page.mouse.down();await page.mouse.move(start-bounds.height*.04,y,{steps:4})
    await expect.poll(()=>marker.evaluate(el=>el.style.left)).not.toBe(before)
    await page.mouse.move(start-bounds.height*.49,y,{steps:24});await page.mouse.up()
    await expect(page.locator('.hotspot-marker:visible')).toHaveCount(0)
    await page.screenshot({path:`docs/verification/russian-pistol-1798-1804/orbit-${info.project.name}.png`})
    await page.getByRole('button',{name:'Сбросить ракурс'}).click()
    await expect(page.locator('.hotspot-marker:visible')).toHaveCount(6)
    const compare=page.getByRole('button',{name:'Сравнить масштаб',exact:true})
    if(await compare.isVisible()){
      await compare.click();await expect(compare).toHaveAttribute('aria-pressed','true');await expect(page.locator('.hotspot-marker:visible')).toHaveCount(0)
      await page.screenshot({path:`docs/verification/russian-pistol-1798-1804/scale-${info.project.name}.png`});await compare.click()
    }
    await page.getByRole('button',{name:'Источники',exact:true}).click()
    await expect(page.getByRole('dialog')).toContainText('460')
    await expect(page.getByRole('dialog')).not.toContainText('TODO_RESEARCH')
    await page.getByRole('button',{name:'Закрыть',exact:true}).click()
    for(const [button,title] of [['Ружьё 1808 года','Пехотное ружьё'],['Кивер 1808 года','Пехотный кивер'],['Пистолет 1798/1804 гг.','Пистолет кавалерии']]){
      await page.getByRole('button',{name:button,exact:true}).click()
      await expect(page.getByRole('heading',{name:title})).toBeVisible()
      await expect(stage).toHaveAttribute('data-state','ready',{timeout:30_000})
    }
    await page.getByRole('button',{name:'Переключить язык'}).click()
    await expect(page.getByRole('heading',{name:'Cavalry pistol'})).toBeVisible()
    expect(errors).toEqual([]);expect(photos).toEqual([])
  }finally{
    release()
    if (info.status !== info.expectedStatus) await page.screenshot({path:`artifacts/pistol-flow-failure-${info.project.name}.png`}).catch(()=>{})
    const detail=await page.locator('canvas.viewer-canvas').getAttribute('data-renderer-error').catch(()=>null)
    if(detail)await info.attach('viewer-error',{body:detail,contentType:'text/plain'})
  }
})
