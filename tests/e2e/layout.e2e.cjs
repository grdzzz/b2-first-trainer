// Esqueletos de carga sin saltos de diseño y tarjetas que no tiemblan al pasar el ratón por el borde.
const { withApp, existingUser, slowIpc, boxes, recordSkeleton, finishEntryAnimations, waitReal, sleep, shot, assert, assertEqual } = require('./helpers.cjs')

/** Compara las cajas del esqueleto y del contenido real (misma posición y altura, con 1 px de margen). */
function sameBoxes(skeleton, real, keys, label) {
  for (const k of keys) {
    const a = skeleton[k]
    const b = real[k]
    assert(a && b, `${label}: falta «${k}» (esqueleto ${JSON.stringify(a)}, real ${JSON.stringify(b)})`)
    assert(Math.abs(a.y - b.y) <= 1 && Math.abs(a.h - b.h) <= 1, `${label}: «${k}» se mueve al cargar (esqueleto ${JSON.stringify(a)} → real ${JSON.stringify(b)})`)
  }
}

module.exports = [
  {
    name: 'arranque: esqueleto con el tema guardado y cada bloque del inicio con su tamaño final',
    async run() {
      await withApp({ settings: existingUser({ theme: 'dark', placement: { score: 168, skills: {}, dismissed: true } }) }, async ({ app, win }) => {
        await win.waitForSelector('.home-header')
        await slowIpc(app, 2500)
        await win.reload()
        await win.waitForSelector('.app-booting .sk-region', { timeout: 10000 })
        assertEqual(await win.evaluate(() => document.documentElement.dataset.theme), 'dark', 'El esqueleto usa el tema oscuro guardado')
        await finishEntryAnimations(win)
        // 2.0: cabecera y primera fila del panel (sesión de hoy) en el mismo sitio y con el mismo alto.
        const S = ['.page-header .eyebrow', '.page-header h1', '.page-header .btn-lg', '.dash-mod.mod-today .home-practice']
        const sk = await boxes(win, S, '.sk-region')
        await shot(win, 'esqueleto-arranque')
        await win.waitForSelector('.app:not(.app-booting) .dash-mod.mod-today .home-practice:not([aria-hidden])', { timeout: 20000 })
        await sleep(400)
        await finishEntryAnimations(win)
        const real = await boxes(win, S)
        // Sin tarjetas extra (nivel oculto, sin intentos a medias): misma posición y altura.
        sameBoxes(sk, real, ['.page-header .eyebrow', '.page-header h1', '.page-header .btn-lg'], 'Inicio')
        assert(Math.abs(sk['.dash-mod.mod-today .home-practice'].y - real['.dash-mod.mod-today .home-practice'].y) <= 1, 'Inicio: la sesión de hoy empieza en el mismo sitio')
      })
    }
  },
  {
    name: 'práctica y hoja: el esqueleto ocupa exactamente lo mismo que el contenido',
    async run() {
      await withApp({ settings: existingUser({ placement: { score: 168, skills: {}, dismissed: true } }) }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        const P = ['.practice-hero', '.review-banner', '.practice-filters', '.sheet-card']
        let skeleton = await recordSkeleton(win, '.sk-region.page', P)
        await win.click('[data-nav=practice]')
        const sk = await skeleton()
        await waitReal(win, '.page .sheet-card')
        await sleep(300)
        await finishEntryAnimations(win)
        sameBoxes(sk, await boxes(win, P), P, 'Práctica')

        const H = ['.back-link', '.sheet-header h1', '.sheet-header .sheet-meta', '.sheet-progress', '.sheet-task']
        skeleton = await recordSkeleton(win, '.sk-region.sheet-page', H)
        await win.locator('.page .sheet-card-main').first().click()
        const skH = await skeleton()
        await win.waitForSelector('.sheet-task .tip-btn')
        await sleep(300)
        await finishEntryAnimations(win)
        const realH = await boxes(win, H)
        sameBoxes(skH, realH, ['.back-link', '.sheet-header h1', '.sheet-header .sheet-meta', '.sheet-progress'], 'Hoja')
        assertEqual(skH['.sheet-task'].y, realH['.sheet-task'].y, 'Hoja: el primer ejercicio empieza en el mismo sitio')
      })
    }
  },
  {
    name: 'ajustes: los datos que tardan salen como esqueleto, no como «…»',
    async run() {
      await withApp({ settings: existingUser() }, async ({ app, win }) => {
        await win.waitForSelector('.home-header')
        await slowIpc(app, 1500)
        await win.click('[data-nav=settings]')
        await sleep(300)
        const skeletons = await win.locator('.settings-section .sk').count()
        assert(skeletons >= 3, `Debería haber esqueletos en Ajustes (hay ${skeletons})`)
        const dots = await win.evaluate(() => [...document.querySelectorAll('.setting-desc, .setting-name, .about')].filter((e) => e.textContent.trim() === '…').length)
        assertEqual(dots, 0, 'Sin «…» mientras carga')
        await sleep(2500)
        assertEqual(await win.locator('.settings-section .sk').count(), 0, 'Los esqueletos desaparecen al cargar')
      })
    }
  },
  {
    name: 'las tarjetas que suben al pasar el ratón no tiemblan con el cursor en su borde inferior',
    async run() {
      // Bienvenida
      await withApp({}, async ({ win }) => {
        await win.waitForSelector('.onb-input')
        await win.click('button[type=submit]')
        await win.waitForSelector('.onb-choice')
        await sleep(500)
        await assertStillAtBottomEdge(win, '.onb-choice:not(.is-primary)')
      })
      // Inicio (estadísticas) y práctica (hojas)
      await withApp({ settings: existingUser() }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        await sleep(800)
        await win.click('[data-nav=stats]')
        await win.waitForSelector('.stats-page:not(.sk-region)')
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        await win.click('[data-nav=profile]')
        await waitReal(win, '.profile-page .stats-row .stat')
        await sleep(600)
        await assertStillAtBottomEdge(win, '.profile-page .stats-row .stat')
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        await sleep(600)
        await assertStillAtBottomEdge(win, '.page .sheet-card')
      })
    }
  }
]

/** Pone el cursor 1 px por encima del borde inferior y comprueba que la tarjeta se queda quieta (subida). */
async function assertStillAtBottomEdge(win, selector) {
  const el = win.locator(selector).first()
  await el.scrollIntoViewIfNeeded()
  await win.mouse.move(5, 5)
  await sleep(500)
  const box = await el.boundingBox()
  await win.mouse.move(box.x + box.width / 2, box.y + box.height - 1)
  await sleep(600)
  const ys = []
  for (let i = 0; i < 10; i++) {
    ys.push(await win.evaluate((s) => document.querySelector(s).getBoundingClientRect().y, selector))
    await sleep(60)
  }
  const spread = Math.max(...ys) - Math.min(...ys)
  assert(spread < 0.5, `«${selector}» tiembla con el cursor en el borde (se mueve ${spread.toFixed(2)} px)`)
  assert(ys[0] < box.y - 0.5, `«${selector}» debería quedarse subida mientras el cursor está encima`)
  await win.mouse.move(5, 5)
}
