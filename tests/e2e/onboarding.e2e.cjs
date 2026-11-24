// Bienvenida, prueba de nivel obligatoria, recorrido guiado y panel de novedades.
const fs = require('node:fs')
const path = require('node:path')
const { REPO, withApp, existingUser, tempDir, sleep, shot, assert, assertEqual } = require('./helpers.cjs')

/** Responde las 24 preguntas: `pick(i, nOpciones)` devuelve el índice de la opción o -1 («No lo sé»). */
async function answerPlacement(win, pick) {
  await win.click('.placement .onb-actions .btn-primary')
  for (let i = 0; i < 24; i++) {
    await win.waitForSelector(`.placement-progress[aria-valuenow="${i}"]`)
    const options = win.locator('.placement-option:not(.placement-dontknow)')
    const choice = pick(i, await options.count())
    if (choice < 0) await win.click('.placement-dontknow')
    else await options.nth(choice).click()
    await win.click('.placement-nav .btn-primary')
  }
  await win.waitForSelector('.placement-result-head', { timeout: 10000 })
}

module.exports = [
  {
    name: 'usuario nuevo: bienvenida → prueba de nivel → inicio con su nivel, sin novedades ni intento guardado',
    async run() {
      await withApp({}, async ({ win, dataDir }) => {
        await win.waitForSelector('.onb-input')
        await win.fill('.onb-input', 'Gerard')
        await win.click('button[type=submit]')
        await win.mouse.move(5, 5)
        await win.click('.onb-choice:not(.is-primary)')
        await win.waitForSelector('.placement-facts')
        const intro = await win.textContent('.onb-text')
        assert(intro.includes('Antes de empezar'), `Texto de la prueba para usuario nuevo inesperado: ${intro}`)
        await answerPlacement(win, () => -1)
        assert((await win.textContent('.placement-level-title')).includes('Por debajo de A2'), 'Todo «No lo sé» debería dar «Por debajo de A2»')
        await shot(win, 'onboarding-resultado')
        await win.click('.placement-result .onb-actions .btn-primary')
        await win.waitForSelector('.placement-home')
        await sleep(800)
        assertEqual(await win.locator('dialog[open]').count(), 0, 'En una instalación nueva no debe salir el panel de novedades')
        const settings = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'))
        assertEqual([settings.placement.level, settings.placement.score, settings.placement.correct], ['A1', 110, 0], 'Resultado guardado')
        const attempts = path.join(dataDir, 'attempts')
        assert(!fs.existsSync(attempts) || fs.readdirSync(attempts).length === 0, 'La prueba de nivel no debe guardarse como intento')
      })
    }
  },
  {
    name: 'la prueba puntúa por niveles: todo bien = C1 (190)',
    async run() {
      await withApp({ settings: existingUser({ placement: null }) }, async ({ win, dataDir }) => {
        await win.waitForSelector('.placement-facts')
        // La clave sale del propio código de la prueba (mismo orden que en pantalla).
        const source = fs.readFileSync(path.join(REPO, 'src', 'shared', 'placement.ts'), 'utf8')
        const KEY = [...source.matchAll(/answer: (\d) \}/g)].map((m) => Number(m[1]))
        assertEqual(KEY.length, 24, 'Clave de la prueba')
        await answerPlacement(win, (i) => KEY[i])
        assert((await win.textContent('.placement-level-title')).includes('C1'), 'Todo bien debería dar C1')
        await win.click('.placement-result .onb-actions .btn-primary')
        await win.waitForSelector('.placement-home')
        const settings = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'))
        assertEqual([settings.placement.level, settings.placement.score], ['C1', 190], 'Resultado guardado')
      })
    }
  },
  {
    name: 'usuario existente: aviso obligatorio con su nombre y novedades una sola vez',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      const userData = tempDir('b2ft-user-')
      await withApp({ settings: existingUser({ placement: null, userName: 'Gerard Rodríguez', theme: 'dark' }), dataDir, userData, seenVersion: false }, async ({ win }) => {
        await win.waitForSelector('.placement-facts')
        assertEqual(await win.textContent('.onb-title'), 'Vamos a ver tu nivel, Gerard', 'Título con el nombre')
        assert((await win.textContent('.onb-text')).startsWith('Gerard, hay una novedad'), 'Aviso de prueba obligatoria con el nombre')
        // No se puede saltar: no hay barra lateral ni otra forma de salir.
        assertEqual(await win.locator('.sidebar').count(), 0, 'La prueba es obligatoria (sin navegación)')
        await answerPlacement(win, (i, n) => i % n)
        await win.click('.placement-result .onb-actions .btn-primary')
        await win.waitForSelector('dialog[open] .whats-new', { timeout: 8000 })
        const title = await win.textContent('dialog[open] h2')
        assert(/Novedades de la versión \d+\.\d+\.\d+/.test(title), `Título del panel: ${title}`)
        await shot(win, 'novedades')
        await win.click('dialog[open] .modal-footer .btn-primary')
        await sleep(300)
        assertEqual(await win.locator('dialog[open]').count(), 0, 'El panel se cierra')
      })
      // Al volver a abrir: ni prueba ni novedades.
      await withApp({ dataDir, userData, seenVersion: false }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        await sleep(1000)
        assertEqual([await win.locator('.placement-facts').count(), await win.locator('dialog[open]').count()], [0, 0], 'Segunda apertura limpia')
        // Se pueden volver a ver desde Ajustes.
        await win.click('[data-nav=settings]')
        await win.click('button:has-text("Ver novedades")')
        await win.waitForSelector('dialog[open] .whats-new')
      })
    }
  },
  {
    name: 'con el recorrido guiado: empieza justo después de la prueba de nivel',
    async run() {
      await withApp({}, async ({ win }) => {
        await win.waitForSelector('.onb-input')
        await win.click('button[type=submit]')
        await win.mouse.move(5, 5)
        await win.click('.onb-choice.is-primary')
        await win.waitForSelector('.placement-facts')
        await answerPlacement(win, () => -1)
        await win.click('.placement-result .onb-actions .btn-primary')
        await win.waitForSelector('.tour-card', { timeout: 10000 })
      })
    }
  },
  {
    name: 'la prueba a medias se retoma donde se dejó',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      const userData = tempDir('b2ft-user-')
      await withApp({ settings: existingUser({ placement: null }), dataDir, userData }, async ({ win }) => {
        await win.waitForSelector('.placement-facts')
        await win.click('.placement .onb-actions .btn-primary')
        for (let i = 0; i < 5; i++) {
          await win.waitForSelector(`.placement-progress[aria-valuenow="${i}"]`)
          await win.keyboard.press('1')
          await win.keyboard.press('Enter')
        }
        await win.waitForSelector('.placement-progress[aria-valuenow="5"]')
      })
      await withApp({ dataDir, userData, seenVersion: false }, async ({ win }) => {
        await win.waitForSelector('.placement-facts')
        assertEqual((await win.textContent('.placement .onb-actions .btn-primary')).trim(), 'Seguir con la prueba', 'Botón para seguir')
        await win.click('.placement .onb-actions .btn-primary')
        await win.waitForSelector('.placement-progress[aria-valuenow="5"]')
      })
    }
  },
  {
    name: 'la pregunta sobre una frase la resalta en el texto y lo desplaza hasta ella',
    async run() {
      await withApp({ settings: existingUser({ placement: null }) }, async ({ win }) => {
        await win.waitForSelector('.placement-facts')
        // El recuadro de datos tiene su relleno (no pegado al borde).
        const pad = await win.evaluate(() => getComputedStyle(document.querySelector('.placement-facts')).paddingLeft)
        assert(parseFloat(pad) >= 16, `Relleno del recuadro: ${pad}`)
        await win.click('.placement .onb-actions .btn-primary')
        for (let i = 0; i < 22; i++) {
          await win.waitForSelector(`.placement-progress[aria-valuenow="${i}"]`)
          await win.keyboard.press('1')
          await win.keyboard.press('Enter')
        }
        await win.waitForSelector('.placement-progress[aria-valuenow="22"]')
        await sleep(900)
        assertEqual(await win.textContent('.placement-passage .placement-mark'), 'errors creep in', 'Frase resaltada en el texto')
        const visible = await win.evaluate(() => {
          const box = document.querySelector('.placement-passage .reading-text').getBoundingClientRect()
          const m = document.querySelector('.placement-passage .placement-mark').getBoundingClientRect()
          return m.top >= box.top && m.bottom <= box.bottom
        })
        assert(visible, 'El texto se desplaza hasta la frase resaltada')
      })
    }
  }
]
