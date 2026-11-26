// 2.0: plan adaptativo, cuaderno de errores, progresión (XP, niveles, logros), Bubi, paleta de comandos,
// temas, migración desde 1.x, persistencia al reabrir, teclado y ventanas pequeñas.
const fs = require('node:fs')
const path = require('node:path')
const { withApp, existingUser, waitReal, tempDir, sleep, shot, assert, assertEqual, recordSkeleton, finishEntryAnimations, boxes } = require('./helpers.cjs')

const CALM = existingUser({ placement: { version: 1, score: 168, level: 'B2', correct: 17, total: 24, skills: { grammar: 88, vocabulary: 63, reading: 75 }, date: '2026-11-24T10:00:00.000Z', dismissed: true } })
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const learning = (dataDir, name) => path.join(dataDir, 'learning', `${name}.json`)

/** Espera a que un archivo exista y cumpla una condición (las escrituras van agrupadas). */
async function waitFile(file, check = () => true, timeout = 8000) {
  const t0 = Date.now()
  for (;;) {
    try {
      const v = readJson(file)
      if (check(v)) return v
    } catch {
      /* aún no existe */
    }
    if (Date.now() - t0 > timeout) throw new Error(`No se ha escrito ${path.basename(file)} como se esperaba`)
    await sleep(200)
  }
}

/** Plan ya configurado (para no repetir el asistente en cada prueba). */
function seedPlan(dataDir, extra = {}) {
  fs.mkdirSync(path.join(dataDir, 'learning'), { recursive: true })
  const now = new Date().toISOString()
  fs.writeFileSync(
    learning(dataDir, 'plan'),
    JSON.stringify({ schemaVersion: 2, config: { examDate: null, targetScore: 160, targetLevel: 'B2', minutesPerSession: 10, studyDays: [0, 1, 2, 3, 4, 5, 6], restDates: [], preferences: ['short'], prioritySkills: [], intensity: 'balanced', startedAt: now, updatedAt: now, ...extra }, sessions: {}, moves: {}, updatedAt: now })
  )
}

function seedXp(dataDir, xp) {
  fs.mkdirSync(path.join(dataDir, 'learning'), { recursive: true })
  const at = '2026-01-01T10:00:00.000Z'
  fs.writeFileSync(learning(dataDir, 'game'), JSON.stringify({ schemaVersion: 2, ledger: { seed: { xp, reason: 'sheet', at } }, achievements: {}, activity: {}, flags: {}, processed: {}, missionsDone: {}, missionPicks: {}, cosmetics: { equipped: {}, updatedAt: at }, profile: { avatar: { kind: 'bubi', color: 'indigo' }, favorites: [], updatedAt: at }, initializedAt: at, updatedAt: at }))
}

/** Hace la primera hoja respondiendo siempre la primera opción y dejando los huecos vacíos (habrá fallos). */
async function doFirstSheetBadly(win) {
  await win.click('[data-nav=practice]')
  await waitReal(win, '.page .sheet-card')
  await win.click('.practice-next-btn')
  await win.waitForSelector('.sheet-task .tip-btn')
  const groups = win.locator('.sheet-options')
  for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).locator('.sheet-option').first().click()
  await win.mouse.move(5, 5)
  await win.click('.sheet-footer .btn-primary')
  await win.waitForSelector('.sheet-result')
}

module.exports = [
  {
    name: 'configurar el plan con el asistente crea la sesión de hoy con motivos',
    async run() {
      await withApp({ settings: CALM }, async ({ win, dataDir }) => {
        await win.click('[data-nav=plan]')
        await win.waitForSelector('.wizard')
        await win.click('.wizard-foot .btn-primary')
        // Todos los días de estudio: la prueba no depende del día de la semana en que se ejecute.
        while (await win.locator('.weekday:not(.is-active)').count()) await win.locator('.weekday:not(.is-active)').first().click()
        for (let i = 0; i < 2; i++) await win.click('.wizard-foot .btn-primary')
        await win.click('.wizard-foot .btn-primary:has-text("Crear mi plan")')
        await win.waitForSelector('.activity-card', { timeout: 15000 })
        const reasons = await win.locator('.activity-reason').count()
        assert(reasons > 0, 'Cada actividad explica por qué se recomienda')
        const plan = await waitFile(learning(dataDir, 'plan'), (p) => p.config && Object.keys(p.sessions).length > 0)
        assertEqual(plan.config.minutesPerSession, 30, 'Configuración guardada')
        const session = Object.values(plan.sessions)[0]
        const minutes = session.activities.reduce((n, a) => n + a.minutes, 0)
        assert(minutes <= 30, `La sesión no supera el tiempo máximo (${minutes} min)`)
        await win.click('.tab:has-text("Calendario")')
        await win.waitForSelector('.calendar .cal-day')
        await win.click('.tab:has-text("Preparación")')
        await win.waitForSelector('.readiness-main')
        await shot(win, 'plan-preparacion')
      })
    }
  },
  {
    name: 'completar una actividad del plan la marca hecha, registra errores y concede XP y logros',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      seedPlan(dataDir)
      await withApp({ settings: CALM, dataDir }, async ({ win }) => {
        await win.click('[data-nav=plan]')
        await win.waitForSelector('.activity-card')
        const first = win.locator('.activity-card').first()
        await first.locator('.btn-primary').click()
        // La primera actividad de una sesión de 10 min sin historial es una hoja.
        await win.waitForSelector('.sheet-task .tip-btn')
        const groups = win.locator('.sheet-options')
        for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).locator('.sheet-option').first().click()
        await win.mouse.move(5, 5)
        await win.keyboard.press('Control+Enter')
        await win.waitForSelector('.sheet-result')
        const nb = await waitFile(learning(dataDir, 'notebook'), (n) => Object.keys(n.records).length > 0)
        assert(Object.values(nb.records).every((r) => r.source === 'sheet' && r.expected.length > 0), 'Errores con su respuesta correcta')
        const game = await waitFile(learning(dataDir, 'game'), (g) => Object.keys(g.activity).length > 0)
        assert(Object.values(game.ledger).some((e) => e.reason === 'sheet' && e.xp === 30), 'XP de la hoja')
        assert(game.achievements['warm-up'], 'Logro «Warm-Up» desbloqueado')
        await win.click('[data-nav=plan]')
        await win.waitForSelector('.activity-card.is-done')
        await win.waitForSelector('.celebrate-card', { timeout: 8000 })
        await shot(win, 'plan-hecho')
      })
    }
  },
  {
    name: 'subir de nivel y desbloquear un logro muestran su celebración',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      seedXp(dataDir, 90)
      await withApp({ settings: CALM, dataDir }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        await doFirstSheetBadly(win)
        await win.waitForSelector('.celebrate-card.kind-level', { timeout: 8000 })
        await win.waitForSelector('.celebrate-card.kind-achievement')
        await win.waitForSelector('.xp-level:has-text("2")')
        await shot(win, 'subir-nivel')
        await win.click('[data-nav=achievements]')
        await waitReal(win, '.ach-card.is-unlocked')
        assert((await win.locator('.ach-card.is-unlocked').count()) >= 1, 'El logro aparece desbloqueado en la galería')
      })
    }
  },
  {
    name: 'mis errores: búsqueda, detalle con la comparación y repaso de un error',
    async run() {
      await withApp({ settings: CALM }, async ({ win, dataDir }) => {
        await doFirstSheetBadly(win)
        await win.click('[data-nav=notebook]')
        await waitReal(win, '.notebook-page .error-item')
        const total = await win.locator('.error-item').count()
        assert(total >= 4, `Errores en el cuaderno (${total})`)
        await win.keyboard.press('/')
        await win.keyboard.type('zzzzqqq')
        await win.waitForSelector('.notebook-none')
        await win.fill('.search-box input', '')
        await win.locator('.error-item .error-main').first().click()
        await win.waitForSelector('.error-detail .cmp-row.is-good')
        await win.fill('.error-detail textarea[placeholder]', 'Mi truco para recordarlo')
        await win.locator('.error-detail .field-label').first().click()
        await win.click('.error-detail button:has-text("Repasar este")')
        await waitReal(win, '.review-card')
        const opt = win.locator('.review-card .sheet-option')
        if (await opt.count()) await opt.first().click()
        else await win.locator('.review-card .gap-input').fill('test')
        await win.click('.review-actions .btn-primary')
        await win.click('.review-actions .btn-primary')
        await win.waitForSelector('.review-done')
        const nb = await waitFile(learning(dataDir, 'notebook'), (n) => Object.values(n.records).some((r) => r.notes === 'Mi truco para recordarlo') && Object.values(n.records).some((r) => r.occurrences.some((o) => o.startsWith('review:'))))
        assert(nb, 'El repaso queda registrado en el error')
        const game = await waitFile(learning(dataDir, 'game'), (g) => Object.values(g.activity).some((a) => a.kind === 'review'))
        assert(game.achievements['note-taker'], 'Logro «Note Taker» por la nota personal')
      })
    }
  },
  {
    name: 'personalizar a Bubi: el accesorio se guarda y aparece en todos los Bubi',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      seedXp(dataDir, 500)
      await withApp({ settings: CALM, dataDir }, async ({ win }) => {
        await win.click('[data-nav=wardrobe]')
        await waitReal(win, '.wardrobe-page .cos-item')
        await win.click('.wardrobe-items .tab:has-text("Gafas")')
        await win.click('.cos-item:has-text("Gafas redondas")')
        const game = await waitFile(learning(dataDir, 'game'), (g) => g.cosmetics.equipped.eyes === 'round-glasses')
        assertEqual(game.cosmetics.equipped.eyes, 'round-glasses', 'Accesorio guardado')
        await win.click('[data-nav=home]')
        await win.waitForSelector('.home-bubi .bubi .bubi-acc')
        await win.click('[data-nav=achievements]')
        await waitReal(win, '.ach-card')
      })
    }
  },
  {
    name: 'paleta de comandos: Ctrl+K, búsqueda con erratas, teclado y comandos recientes',
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        await win.keyboard.press('Control+K')
        await win.waitForSelector('dialog.palette[open]')
        await win.keyboard.type('estadsiticas')
        await sleep(150)
        await win.keyboard.press('Enter')
        await win.waitForSelector('.stats-page')
        await win.keyboard.press('Control+K')
        await win.waitForSelector('.palette-group:has-text("Recientes")')
        await win.keyboard.press('Escape')
        await sleep(200)
        assertEqual(await win.locator('dialog.palette[open]').count(), 0, 'Escape cierra la paleta')
      })
    }
  },
  {
    name: 'temas: OLED, Midnight Blue, acento y densidad se aplican y se recuerdan',
    async run() {
      await withApp({ settings: CALM }, async ({ win, dataDir }) => {
        await win.click('[data-nav=settings]')
        await win.click('.segmented-item:has-text("OLED")')
        await sleep(200)
        assertEqual(await win.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.variant]), ['dark', 'oled'], 'Tema OLED')
        assertEqual(await win.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)', 'Fondo negro puro')
        await win.click('.segmented-item:has-text("Midnight Blue")')
        await win.click('.swatch.accent-teal')
        await win.click('.segmented-item:has-text("Compacta")')
        await sleep(300)
        assertEqual(await win.evaluate(() => [document.documentElement.dataset.variant, document.documentElement.dataset.accent, document.documentElement.dataset.density]), ['midnight', 'teal', 'compact'], 'Variante, acento y densidad')
        await sleep(500)
        const s = readJson(path.join(dataDir, 'settings.json'))
        assertEqual([s.theme, s.appearance.accent, s.appearance.density], ['midnight', 'teal', 'compact'], 'Guardado en los ajustes')
        await shot(win, 'tema-midnight')
      })
    }
  },
  {
    name: 'migración desde 1.9.2: copia de seguridad, historial en el cuaderno y XP retroactiva sin celebraciones',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      const dir = path.join(dataDir, 'practice', 'progress')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'fce_hoja01.json'), JSON.stringify({ id: 'fce_hoja01', answers: { '0.0': '3', '0.1': '3' }, checked: true, lastScore: 1, total: 12, best: 1, times: 1, lastAt: '2026-10-01T10:00:00.000Z', days: ['2026-10-01'], review: { '0.0': { box: 0, due: '2026-10-02', lapses: 1, addedAt: '2026-10-01T10:00:00.000Z' } } }))
      await withApp({ settings: CALM, dataDir }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        const meta = await waitFile(path.join(dataDir, 'learning', 'meta.json'))
        assertEqual(meta.dataVersion, 2, 'Versión de datos')
        assert(meta.backup && fs.existsSync(path.join(dataDir, meta.backup, 'practice', 'progress', 'fce_hoja01.json')), 'Copia de seguridad previa')
        assert(fs.existsSync(path.join(dataDir, meta.backup, 'settings.json')), 'Ajustes en la copia')
        const nb = await waitFile(learning(dataDir, 'notebook'), (n) => Object.keys(n.records).length >= 2)
        assert(nb.records['s:fce_hoja01:0.0'], 'La pregunta en repaso pasa al cuaderno')
        const game = await waitFile(learning(dataDir, 'game'), (g) => !!g.initializedAt)
        assert(Object.values(game.ledger).every((e) => e.retro), 'XP retroactiva marcada')
        assertEqual(await win.locator('.celebrate-card').count(), 0, 'Sin celebraciones por el historial')
        // El archivo original no se toca.
        assertEqual(readJson(path.join(dir, 'fce_hoja01.json')).lastScore, 1, 'Datos de 1.x intactos')
      })
    }
  },
  {
    name: 'reanudar la app después de cerrarla: el plan y la sesión de hoy se conservan',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      const userData = tempDir('b2ft-user-')
      seedPlan(dataDir)
      let ids
      await withApp({ settings: CALM, dataDir, userData }, async ({ win }) => {
        await win.click('[data-nav=plan]')
        await waitReal(win, '.activity-card')
        ids = await win.locator('.activity-title').allTextContents()
        await waitFile(learning(dataDir, 'plan'), (p) => Object.keys(p.sessions).length > 0)
      })
      await withApp({ settings: null, dataDir, userData }, async ({ win }) => {
        await win.waitForSelector('.app:not(.app-booting) .sidebar')
        await win.click('[data-nav=plan]')
        await waitReal(win, '.activity-card')
        assertEqual(await win.locator('.activity-title').allTextContents(), ids, 'Misma sesión al volver a abrir')
      })
    }
  },
  {
    name: 'teclado: barra lateral contraíble con Ctrl+B, navegación con Tab y ayuda de atajos',
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        await win.keyboard.press('Control+B')
        await win.waitForSelector('.sidebar-v2.is-collapsed')
        assertEqual(await win.getAttribute('[data-nav=plan]', 'title'), 'Mi plan', 'Tooltip con el nombre al estar contraída')
        await win.focus('[data-nav=notebook]')
        await win.keyboard.press('Enter')
        await win.waitForSelector('.notebook-page')
        await win.keyboard.press('Control+B')
        await win.waitForSelector('.sidebar-v2:not(.is-collapsed)')
        await win.locator('body').click({ position: { x: 700, y: 30 } })
        await win.keyboard.press('Shift+?')
        await win.waitForSelector('dialog[open] .shortcuts-grid')
      })
    }
  },
  {
    name: 'ventana pequeña y movimiento reducido: sin desbordes horizontales ni animaciones de Bubi',
    async run() {
      await withApp({ settings: CALM, size: { width: 900, height: 620 } }, async ({ win }) => {
        await win.emulateMedia({ reducedMotion: 'reduce' })
        await win.waitForSelector('.home-header')
        for (const r of ['home', 'plan', 'notebook', 'stats', 'profile', 'achievements', 'wardrobe']) {
          await win.click(`[data-nav=${r}]`)
          await sleep(700)
          const overflow = await win.evaluate(() => {
            const m = document.getElementById('main')
            return m.scrollWidth - m.clientWidth
          })
          assert(overflow <= 1, `«${r}» desborda en horizontal (${overflow} px)`)
        }
        const anims = await win.evaluate(() => [...document.querySelectorAll('.bubi, .bubi *')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'))
        assertEqual(anims, [], 'Bubi sin animaciones con movimiento reducido')
        await shot(win, 'ventana-pequena')
      })
    }
  },
  {
    name: 'skeleton de Mi plan y de Mis errores sin saltos en la cabecera',
    async run() {
      await withApp({ settings: CALM }, async ({ win }) => {
        await win.waitForSelector('.home-header')
        for (const [nav, cls] of [['plan', '.plan-page'], ['notebook', '.notebook-page']]) {
          const skeleton = await recordSkeleton(win, `.sk-region${cls}`, ['.page-header h1', '.page-header .eyebrow'])
          await win.click(`[data-nav=${nav}]`)
          const sk = await skeleton()
          await win.waitForSelector(`${cls}:not(.sk-region) .page-header h1`)
          await sleep(300)
          await finishEntryAnimations(win)
          const real = await boxes(win, ['.page-header h1', '.page-header .eyebrow'], `${cls}:not(.sk-region)`)
          for (const k of ['.page-header h1', '.page-header .eyebrow']) assert(Math.abs(sk[k].y - real[k].y) <= 1 && Math.abs(sk[k].h - real[k].h) <= 1, `${nav}: «${k}» se mueve al cargar (${JSON.stringify(sk[k])} → ${JSON.stringify(real[k])})`)
          await win.click('[data-nav=home]')
          await win.waitForSelector('.home-header')
        }
      })
    }
  },
  {
    name: 'modo administrador: contraseña, todo desbloqueado y, al desactivarlo, vuelve el nivel y los accesorios de antes',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      seedXp(dataDir, 150)
      await withApp({ settings: CALM, dataDir }, async ({ win }) => {
        await win.waitForSelector('.xp-level:has-text("2")')
        await win.click('[data-nav=settings]')
        await win.fill('#set-admin input', '0000')
        await win.click('#set-admin .btn-primary')
        await win.waitForSelector('#admin-error')
        await win.fill('#set-admin input', '4182')
        await win.click('#set-admin .btn-primary')
        await win.waitForSelector('.xp-level:has-text("100")')
        await win.click('[data-nav=wardrobe]')
        await waitReal(win, '.wardrobe-page .cos-item')
        await win.click('.wardrobe-items .tab:has-text("Sombreros")')
        await win.click('.cos-item:has-text("Corona")')
        await win.waitForSelector('.stage-bubi .bubi .bubi-acc')
        await sleep(800)
        const game = readJson(learning(dataDir, 'game'))
        assert(!game.cosmetics.equipped.head, 'La corona no se guarda en los datos reales')
        assert(!Object.keys(game.achievements).includes('dressed-to-impress'), 'Vestir en modo administrador no da logros')
        await win.click('[data-nav=settings]')
        await win.click('#set-admin button:has-text("Desactivar")')
        await win.waitForSelector('.xp-level:has-text("2")')
        await win.click('[data-nav=home]')
        await win.waitForSelector('.home-bubi .bubi')
        assertEqual(await win.locator('.home-bubi .bubi .bubi-acc').count(), 0, 'Bubi vuelve a lo que llevaba antes')
        assertEqual(readJson(path.join(dataDir, 'settings.json')).admin.enabled, false, 'Desactivado en los ajustes')
      })
    }
  },
  {
    name: 'novedades: si cambian menús o secciones se ofrece un recorrido opcional que se puede hacer o saltar',
    async run() {
      await withApp({ settings: CALM, seenVersion: '1.9.2' }, async ({ win }) => {
        await win.waitForSelector('dialog[open] .whats-new')
        await win.waitForSelector('dialog[open] .whats-new-tour')
        await win.click('dialog[open] button:has-text("Ver el recorrido")')
        await win.waitForSelector('.tour-card #tour-title:has-text("Menú reorganizado")')
        let steps = 1
        for (; steps < 20 && (await win.locator('.tour-card').count()); steps++) {
          await win.keyboard.press('ArrowRight')
          await sleep(250)
        }
        assertEqual(await win.locator('.tour-card').count(), 0, 'El recorrido termina')
        assert(steps >= 9, `Recorre todas las secciones (${steps} pasos)`)
      })
      // «Ahora no»: se cierra sin recorrido y no vuelve a salir.
      await withApp({ settings: CALM, seenVersion: '1.9.2' }, async ({ win }) => {
        await win.waitForSelector('dialog[open] .whats-new')
        await win.click('dialog[open] button:has-text("Ahora no")')
        await sleep(300)
        assertEqual(await win.locator('.tour-card').count(), 0, 'Sin recorrido')
      })
    }
  }
]
