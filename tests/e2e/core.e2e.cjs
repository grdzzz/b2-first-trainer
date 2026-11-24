// Funciones principales: exámenes, hojas de práctica (progreso, exportar/importar con IA, portapapeles)
// y el aviso de que otro ordenador tiene abierta la misma carpeta de datos.
const fs = require('node:fs')
const path = require('node:path')
const { withApp, existingUser, waitReal, tempDir, sleep, assert, assertEqual } = require('./helpers.cjs')

module.exports = [
  {
    name: 'crear un examen nuevo lo guarda en la carpeta de datos',
    async run() {
      await withApp({ settings: existingUser() }, async ({ win, dataDir }) => {
        await win.click('[data-nav=library]')
        await win.click('button:has-text("Nuevo examen")')
        await win.fill('input[placeholder^="Por ejemplo"]', 'Prueba e2e')
        await win.click('button:has-text("Crear y configurar")')
        await win.waitForSelector('.paper-section', { timeout: 20000 })
        await sleep(800)
        const exams = fs.readdirSync(path.join(dataDir, 'exams')).filter((f) => f.endsWith('.json'))
        assertEqual(exams.length, 1, 'Exámenes guardados')
        assert(fs.readFileSync(path.join(dataDir, 'exams', exams[0]), 'utf8').includes('Prueba e2e'), 'Nombre del examen guardado')
      })
    }
  },
  {
    name: 'hacer una hoja guarda el progreso y los fallos pasan al repaso',
    async run() {
      await withApp({ settings: existingUser() }, async ({ win, dataDir }) => {
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        assertEqual(await win.locator('.page:not(.sk-region) .sheet-card').count(), 50, 'Hojas incluidas')
        await win.click('.practice-next-btn')
        await win.waitForSelector('.sheet-option')
        await win.locator('.sheet-option').first().click()
        await win.click('.sheet-footer .btn-primary')
        await win.waitForSelector('.sheet-result')
        await sleep(1200)
        const dir = path.join(dataDir, 'practice', 'progress')
        const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
        assertEqual(files.length, 1, 'Progreso guardado')
        const p = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'))
        assert(p.checked && p.times === 1, 'La hoja queda corregida')
        assert(Object.keys(p.review || {}).length > 0, 'Los fallos pasan al repaso espaciado')
      })
    }
  },
  {
    name: 'copiar instrucciones para la IA, exportar una hoja y volver a añadirla pegando su JSON',
    async run() {
      await withApp({ settings: existingUser() }, async ({ app, win, dataDir }) => {
        // Exportar la primera hoja (el diálogo de guardar se simula).
        const exportPath = path.join(tempDir('b2ft-export-'), 'hoja.json')
        await app.evaluate(({ dialog }, f) => {
          dialog.showSaveDialog = async () => ({ canceled: false, filePath: f })
        }, exportPath)
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        await win.locator('.page .sheet-card-main').first().click()
        await win.waitForSelector('.sheet-task .tip-btn')
        await win.click('button:has-text("Exportar hoja")')
        await win.waitForSelector('.toast >> text=Hoja exportada')
        const exported = fs.readFileSync(exportPath, 'utf8')
        assert(exported.includes('"formato": "b2ft-hoja"'), 'Formato de la hoja exportada')

        // Copiar instrucciones (portapapeles del sistema, desde el proceso principal).
        await win.click('[data-nav=practice]')
        await waitReal(win, '.page .sheet-card')
        await app.evaluate(({ clipboard }) => clipboard.writeText(''))
        await win.click('button:has-text("Crear más hojas")')
        await win.click('dialog[open] button:has-text("Copiar instrucciones")')
        await sleep(300)
        const copied = await app.evaluate(({ clipboard }) => clipboard.readText())
        assert(copied.includes('b2ft-hoja') && copied.length > 500, 'Las instrucciones llegan al portapapeles')

        // Pegar como si fuera la respuesta de la IA.
        await win.fill('dialog[open] .paste-area', 'Aquí tienes tu hoja:\n```json\n' + exported + '```')
        await win.click('dialog[open] button:has-text("Añadir hojas")')
        await win.waitForSelector('.toast >> text=Se ha añadido 1 hoja nueva')
        const mine = fs.readdirSync(path.join(dataDir, 'practice')).filter((f) => f.endsWith('.json'))
        assertEqual(mine.length, 1, 'La hoja se guarda en «Mis hojas»')
        await waitReal(win, '.page .sheet-card')
        assertEqual(await win.locator('.page:not(.sk-region) .sheet-card').count(), 1, 'Se ve en el filtro «Mis hojas»')
      })
    }
  },
  {
    name: 'avisa si otro ordenador tiene abierta la misma carpeta de datos',
    async run() {
      const dataDir = tempDir('b2ft-data-')
      fs.writeFileSync(path.join(dataDir, 'abierta-en-portatil-de-clase-abc123.json'), JSON.stringify({ host: 'portatil-de-clase', pid: 1234, heartbeat: new Date().toISOString(), device: 'abc123' }))
      await withApp({ settings: existingUser(), dataDir }, async ({ win }) => {
        await win.waitForSelector('dialog[open] >> text=La app está abierta en «portatil-de-clase»', { timeout: 15000 })
        await win.click('dialog[open] .btn-primary')
        await sleep(300)
        assertEqual(await win.locator('dialog[open]').count(), 0, 'Se puede seguir')
        const own = fs.readdirSync(dataDir).filter((f) => f.startsWith('abierta-en-') && !f.includes('portatil-de-clase'))
        assertEqual(own.length, 1, 'Este equipo deja su propio archivo de bloqueo')
      })
      assert(!fs.readdirSync(dataDir).some((f) => f.startsWith('abierta-en-') && !f.includes('portatil-de-clase')), 'Al cerrar se borra el bloqueo propio')
    }
  }
]
