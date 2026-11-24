// Ejecuta las pruebas de extremo a extremo una tras otra: `npm run test:e2e [filtro]`.
// Cada archivo *.e2e.cjs exporta una lista de pruebas { name, run(), slow? }.
// Antes hace falta `npm run build`. En Linux sin pantalla: `xvfb-run -a npm run test:e2e`.
// Con E2E_QUICK=1 se saltan las pruebas lentas (p. ej. esperar a que Bubi se duerma).
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const filter = process.argv[2] || ''
  const out = path.resolve(__dirname, '..', '..', 'out', 'renderer', 'index.html')
  if (!fs.existsSync(out)) {
    console.error('Falta la compilación: ejecuta antes «npm run build».')
    process.exit(1)
  }
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.e2e.cjs')).sort()
  let passed = 0
  const failed = []
  const skipped = []
  for (const file of files) {
    for (const test of require(path.join(__dirname, file))) {
      const id = `${file.replace('.e2e.cjs', '')} › ${test.name}`
      if (filter && !id.toLowerCase().includes(filter.toLowerCase())) continue
      if (test.slow && process.env.E2E_QUICK) {
        skipped.push(id)
        continue
      }
      const t0 = Date.now()
      try {
        await test.run()
        passed++
        console.log(`  ✓ ${id} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
      } catch (e) {
        failed.push(id)
        console.log(`  ✗ ${id}\n    ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 6).join('\n    ')}`)
      }
    }
  }
  console.log(`\n${passed} correctas, ${failed.length} fallidas${skipped.length ? `, ${skipped.length} saltadas` : ''}.`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
