// Bubi: máquina de estados conectada a la app real (saludo, hover, clics, mareo, reacciones, sueño).
const { withApp, existingUser, waitReal, sleep, shot, assert, assertEqual } = require('./helpers.cjs')

const HOME_BUBI = '.home-bubi .bubi'
// Sin la tarjeta del nivel inicial: Bubi queda a la vista en el inicio.
const CALM = existingUser({ placement: { score: 168, skills: {}, dismissed: true } })
const state = (win, sel = HOME_BUBI) => win.evaluate((s) => {
  const b = document.querySelector(s)
  return b ? `${b.dataset.state}/${b.dataset.variant}` : null
}, sel)

/** Pone Bubi en reposo tranquilo en el inicio (sin racha ni repaso: estado de fondo «welcome»). */
async function homeBubi(win) {
  await win.waitForSelector(HOME_BUBI)
  await win.locator(HOME_BUBI).scrollIntoViewIfNeeded()
  await sleep(2700) // termina el saludo de bienvenida
  return win.locator(HOME_BUBI).boundingBox()
}

module.exports = [
  {
    name: 'saluda al entrar, mira al cursor, reacciona a los clics y se marea con muchos',
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await win.waitForSelector(HOME_BUBI)
        assert((await state(win)).startsWith('welcome'), 'Saludo al entrar')
        const box = await homeBubi(win)
        await win.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.3)
        await sleep(400)
        assertEqual(await state(win), 'hover/0', 'Hover')
        const lookX = await win.evaluate((s) => parseFloat(getComputedStyle(document.querySelector(s)).getPropertyValue('--look-x')), HOME_BUBI)
        assert(lookX > 1, `Debería mirar hacia el cursor (--look-x = ${lookX})`)
        const variants = []
        for (let i = 0; i < 3; i++) {
          await win.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          await sleep(80)
          variants.push(await state(win))
          const anim = await win.evaluate((s) => getComputedStyle(document.querySelector(`${s} .bubi-root`)).animationName, HOME_BUBI)
          assert(anim.startsWith('bubi-r-'), `El clic debe animar a Bubi (${anim})`)
          await sleep(1700)
        }
        assert(variants.every((v) => v.startsWith('poke/')), `Reacción al clic: ${variants}`)
        for (let i = 1; i < variants.length; i++) assert(variants[i] !== variants[i - 1], `Dos clics seguidos no repiten variante: ${variants}`)
        for (let i = 0; i < 5; i++) {
          await win.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          await sleep(110)
        }
        assertEqual(await state(win), 'surprised/1', 'Mareo tras muchos clics')
        await shot(win, 'bubi-mareo', { clip: { x: box.x - 20, y: box.y - 30, width: box.width + 40, height: box.height + 50 } })
        await win.mouse.move(5, 5)
        await sleep(1600)
        assert(!(await state(win)).startsWith('hover'), 'Al salir el cursor deja de reaccionar')
      })
    }
  },
  {
    name: 'se pone triste al fallar una hoja y reacciona en el repaso',
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        await win.click('.practice-next-btn')
        await win.waitForSelector('.sheet-task .tip-btn')
        const groups = win.locator('.sheet-options')
        for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).locator('.sheet-option').last().click()
        const inputs = win.locator('.gap-input')
        for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).fill('zzz')
        await win.mouse.move(5, 5)
        await win.click('.sheet-footer .btn-primary')
        await win.waitForSelector('.sheet-result .bubi')
        await sleep(100)
        assert((await state(win, '.sheet-result .bubi')).startsWith('sad'), 'Triste tras muchos fallos')
        // Repaso: Bubi piensa y luego reacciona a cada respuesta.
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        // Lo fallado hoy vuelve mañana: se adelanta el reloj de la página un día para que toque repasar.
        await win.evaluate(() => {
          const day = 86400000
          const RealDate = Date
          // eslint-disable-next-line no-global-assign
          Date = class extends RealDate {
            constructor(...a) {
              super(...(a.length ? a : [RealDate.now() + day]))
            }
            static now() {
              return RealDate.now() + day
            }
          }
        })
        await win.click('[data-nav=home]')
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        await win.click('.review-banner .btn-primary')
        await win.waitForSelector('.review-card .bubi')
        assert((await state(win, '.review-card .bubi')).startsWith('thinking'), 'Piensa antes de responder')
        const opt = win.locator('.review-card .sheet-option')
        if (await opt.count()) await opt.last().click()
        else await win.locator('.review-card .gap-input').fill('zzz')
        await win.click('.review-actions .btn-primary')
        await sleep(100)
        const s = await state(win, '.review-card .bubi')
        assert(/^(sad|happy|surprised)/.test(s), `Reacción en el repaso: ${s}`)
      })
    }
  },
  {
    name: 'con «reducir movimiento» no se mueve',
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await win.emulateMedia({ reducedMotion: 'reduce' })
        const box = await homeBubi(win)
        await win.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        await sleep(100)
        assert((await state(win)).startsWith('poke'), 'Sigue cambiando de expresión')
        const anims = await win.evaluate((s) => [...document.querySelectorAll(`${s}, ${s} *`)].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'), HOME_BUBI)
        assertEqual(anims, [], 'Sin animaciones')
      })
    }
  },
  {
    name: 'se duerme tras un rato sin tocar nada y se despierta al volver',
    slow: true,
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await homeBubi(win)
        await win.mouse.move(5, 5)
        await sleep(77000)
        assertEqual(await state(win), 'sleeping/0', 'Dormido por inactividad')
        await win.mouse.move(600, 500)
        await sleep(150)
        assertEqual(await state(win), 'wakeUp/0', 'Se despierta')
        await sleep(1500)
        assert(!(await state(win)).startsWith('sleeping'), 'Vuelve a su estado')
      })
    }
  }
]
