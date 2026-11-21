// Prueba de arranque de la app empaquetada (se usa en GitHub Actions en Windows, macOS y Linux reales).
// Abre el ejecutable, espera a la interfaz, crea un examen, hace una hoja de práctica, comprueba que todo se guarda y hace una captura.
// Uso: node scripts/smoke-test.cjs <ruta-al-ejecutable> <captura.png>
const { spawn, execSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

let pw
try {
  pw = require('playwright-core')
} catch {
  pw = require('playwright')
}
const { chromium } = pw

const [exe, shot = 'smoke.png'] = process.argv.slice(2)
if (!exe || !fs.existsSync(exe)) {
  console.error(`No existe el ejecutable: ${exe}`)
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2ft-smoke-'))
const port = 9300 + Math.floor(Math.random() * 500)
const args = [`--remote-debugging-port=${port}`]
if (process.platform === 'linux') args.push('--no-sandbox')

const started = Date.now()
const child = spawn(exe, args, { env: { ...process.env, B2FT_DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
child.stdout.on('data', (d) => (output += d))
child.stderr.on('data', (d) => (output += d))
let exitCode = null
child.on('exit', (code) => (exitCode = code))

function stop() {
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    else child.kill('SIGKILL')
  } catch {
    /* ya cerrado */
  }
}

async function main() {
  let browser
  for (let i = 0; i < 90 && !browser; i++) {
    if (exitCode !== null) throw new Error(`La app se ha cerrado al arrancar (código ${exitCode}).`)
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
    } catch {
      await sleep(1000)
    }
  }
  if (!browser) throw new Error('La app no ha abierto el puerto de depuración en 90 s.')
  let page
  for (let i = 0; i < 60 && !page; i++) {
    page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('index.html'))
    if (!page) await sleep(1000)
  }
  if (!page) throw new Error('No se ha encontrado la ventana de la app.')
  await page.waitForSelector('.sidebar, .onboarding', { timeout: 60000 })
  const readyMs = Date.now() - started
  const info = await page.evaluate(() => window.api.getAppInfo())
  // Primera vez: bienvenida con nombre y examen de ejemplo (comprueba que sus archivos se copian).
  if (await page.locator('.onboarding').count()) {
    await page.fill('.onb-input', 'Smoke')
    await page.click('button:has-text("Continuar")')
    await page.click('.onb-choice.is-primary')
    await page.waitForSelector('.tour-card', { timeout: 30000 })
    await page.keyboard.press('Escape')
    await page.waitForSelector('.sidebar', { timeout: 30000 })
  }
  const exampleFiles = fs.readdirSync(path.join(dataDir, 'files')).flatMap((d) => fs.readdirSync(path.join(dataDir, 'files', d)))
  if (exampleFiles.length !== 5) throw new Error(`El examen de ejemplo debería tener 5 archivos y tiene ${exampleFiles.length}.`)
  await page.click('.nav-item[data-nav="library"]')
  await page.click('button:has-text("Nuevo examen")')
  await page.fill('input[placeholder^="Por ejemplo"]', 'Smoke test')
  await page.click('button:has-text("Crear y configurar")')
  await page.waitForSelector('.paper-section', { timeout: 30000 })
  await sleep(800)
  const exams = fs.readdirSync(path.join(dataDir, 'exams')).filter((f) => f.endsWith('.json'))
  if (exams.length !== 2) throw new Error(`Se esperaban 2 exámenes guardados (ejemplo + nuevo) y hay ${exams.length}.`)
  // Práctica: las 50 hojas incluidas, hacer la primera y comprobar que el progreso se guarda.
  await page.click('.nav-item[data-nav="practice"]')
  await page.waitForSelector('.sheet-card', { timeout: 30000 })
  const sheetCount = await page.locator('.sheet-card').count()
  if (sheetCount !== 50) throw new Error(`Se esperaban 50 hojas de práctica y hay ${sheetCount}.`)
  await page.click('.practice-next-btn')
  await page.waitForSelector('.sheet-option', { timeout: 30000 })
  await page.locator('.sheet-option').first().click()
  await page.click('.sheet-footer .btn-primary')
  await page.waitForSelector('.sheet-result', { timeout: 30000 })
  await sleep(1500)
  const progress = fs.readdirSync(path.join(dataDir, 'practice', 'progress')).filter((f) => f.endsWith('.json'))
  if (progress.length !== 1) throw new Error(`No se ha guardado el progreso de la hoja (${progress.length} archivos).`)
  await page.screenshot({ path: shot })
  console.log(JSON.stringify({ ok: true, platform: process.platform, arch: process.arch, version: info.version, electron: info.electron, readyMs, examsSaved: exams.length, exampleFiles: exampleFiles.length, practiceSheets: sheetCount, practiceSaved: progress.length }))
  await browser.close().catch(() => undefined)
}

main()
  .then(() => {
    stop()
    process.exit(0)
  })
  .catch((e) => {
    console.error(`PRUEBA FALLIDA: ${e.message}`)
    console.error(output.split('\n').slice(-30).join('\n'))
    stop()
    process.exit(1)
  })
