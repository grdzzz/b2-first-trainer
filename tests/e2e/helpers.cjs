// Ayudas comunes de las pruebas de extremo a extremo (la app real con Electron + Playwright).
// Se ejecutan con `npm run test:e2e` (necesita `npm run build` antes; en Linux sin pantalla, con xvfb-run).
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

let pw
try {
  pw = require('playwright-core')
} catch {
  pw = require('playwright')
}

const REPO = path.resolve(__dirname, '..', '..')
const SHOTS = process.env.E2E_SHOTS || path.join(os.tmpdir(), 'b2ft-e2e-shots')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

/** Ajustes de alguien que ya usa la app (bienvenida y prueba de nivel hechas). */
function existingUser(extra = {}) {
  return {
    schemaVersion: 1,
    onboarded: true,
    userName: 'Gerard',
    mascot: true,
    theme: 'light',
    placement: { version: 1, score: 168, level: 'B2', correct: 17, total: 24, skills: { grammar: 88, vocabulary: 63, reading: 75 }, date: '2026-11-24T10:00:00.000Z', dismissed: false },
    ...extra
  }
}

/**
 * Abre la app con una carpeta de datos y un perfil (userData) propios.
 * `settings`: contenido inicial de settings.json (null = instalación nueva).
 * `seenVersion`: marca las novedades como vistas (para que el panel no tape la pantalla).
 */
async function launch({ settings = null, dataDir, userData, seenVersion = true, size = { width: 1280, height: 860 } } = {}) {
  dataDir = dataDir || tempDir('b2ft-data-')
  userData = userData || tempDir('b2ft-user-')
  if (settings) fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify(settings))
  const app = await pw._electron.launch({
    executablePath: require(path.join(REPO, 'node_modules', 'electron')),
    args: [REPO, '--no-sandbox', `--user-data-dir=${userData}`],
    env: { ...process.env, B2FT_DATA_DIR: dataDir, B2FT_UPDATE_URL: 'http://127.0.0.1:9/' }
  })
  const win = await app.firstWindow()
  await win.setViewportSize(size)
  const errors = []
  win.on('pageerror', (e) => errors.push(String(e)))
  win.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  if (settings && seenVersion) {
    await win.waitForSelector('.app:not(.app-booting) .sidebar, .onboarding, .placement', { timeout: 30000 })
    const version = await win.evaluate(() => window.api.getAppInfo().then((i) => i.version))
    await win.evaluate((v) => localStorage.setItem('b2ft.whatsNew.seen', v), version)
    await closeDialogs(win)
  }
  return { app, win, errors, dataDir, userData }
}

/** Abre la app, ejecuta `fn` y la cierra siempre; falla si hubo errores en la consola de la interfaz. */
async function withApp(opts, fn) {
  const ctx = await launch(opts)
  try {
    await fn(ctx)
    if (ctx.errors.length) throw new Error(`Errores en la interfaz:\n  ${ctx.errors.join('\n  ')}`)
  } finally {
    await ctx.app.close().catch(() => undefined)
  }
  return ctx
}

/** Cierra el panel de novedades si está abierto (otros avisos, como el de bloqueo, se dejan). */
async function closeDialogs(win) {
  await sleep(300)
  for (let i = 0; i < 3 && (await win.locator('dialog[open]:has(.whats-new)').count()); i++) {
    await win.keyboard.press('Escape')
    await sleep(250)
  }
}

/** Espera a que una pantalla real (no su esqueleto de carga) esté lista. */
async function waitReal(win, selector, timeout = 30000) {
  await win.waitForSelector(`${selector}:not(.sk-region):not(.sk-region *)`, { timeout })
}

/** Ralentiza todas las respuestas del proceso principal (para ver los esqueletos de carga). */
async function slowIpc(app, ms) {
  await app.evaluate(({ ipcMain }, delay) => {
    for (const [channel, fn] of [...ipcMain._invokeHandlers.entries()]) {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, async (...a) => {
        await new Promise((r) => setTimeout(r, delay))
        return fn(...a)
      })
    }
  }, ms)
}

/** Posición vertical y altura de varios elementos (para comparar esqueleto y contenido). */
async function boxes(win, selectors, scope = '') {
  return win.evaluate(
    ({ selectors, scope }) =>
      Object.fromEntries(
        selectors.map((s) => {
          const e = document.querySelector(`${scope} ${s}`.trim())
          if (!e) return [s, null]
          const r = e.getBoundingClientRect()
          return [s, { y: Math.round(r.y), h: Math.round(r.height) }]
        })
      ),
    { selectors, scope }
  )
}

/**
 * Mide unos elementos en el instante en que aparece un esqueleto de carga (sin depender de lo que tarde).
 * Llamar ANTES de la acción que provoca la carga; devuelve una función que espera y da las medidas.
 */
async function recordSkeleton(win, region, selectors) {
  await win.evaluate(({ region, selectors }) => {
    window.__sk = null
    const measure = () => {
      const root = document.querySelector(region)
      if (!root || window.__sk) return
      root.getBoundingClientRect()
      for (const a of document.getAnimations()) {
        const timing = a.effect && a.effect.getTiming()
        if (timing && timing.iterations !== Infinity) a.finish()
      }
      window.__sk = Object.fromEntries(
        selectors.map((s) => {
          const e = root.matches(s) ? root : root.querySelector(s)
          if (!e) return [s, null]
          const r = e.getBoundingClientRect()
          return [s, { y: Math.round(r.y), h: Math.round(r.height) }]
        })
      )
      obs.disconnect()
    }
    const obs = new MutationObserver(measure)
    obs.observe(document.body, { childList: true, subtree: true })
  }, { region, selectors })
  return async () => {
    await win.waitForFunction(() => window.__sk !== null, null, { timeout: 20000 })
    return win.evaluate(() => window.__sk)
  }
}

/** Termina las animaciones de entrada (para medir sin que estén a medio camino). */
async function finishEntryAnimations(win) {
  await win.evaluate(() => {
    for (const a of document.getAnimations()) {
      const timing = a.effect && a.effect.getTiming()
      if (timing && timing.iterations !== Infinity) a.finish()
    }
  })
}

async function shot(win, name, opts = {}) {
  fs.mkdirSync(SHOTS, { recursive: true })
  await win.screenshot({ path: path.join(SHOTS, `${name}.png`), ...opts })
}

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) throw new Error(`${message}\n  esperado: ${e}\n  obtenido: ${a}`)
}

module.exports = { pw, REPO, SHOTS, sleep, tempDir, existingUser, launch, withApp, closeDialogs, waitReal, slowIpc, boxes, recordSkeleton, finishEntryAnimations, shot, assert, assertEqual }
