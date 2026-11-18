// Pone el icono y la información de versión en el .exe de Windows sin necesitar Wine
// (electron-builder lo hace con rcedit, que en Linux/macOS requiere Wine).
const fs = require('node:fs')
const path = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const ResEdit = await import('resedit')
  const { NtExecutable, NtExecutableResource, Resource, Data } = ResEdit.default ?? ResEdit
  const name = context.packager.appInfo.productFilename
  const exePath = path.join(context.appOutDir, `${name}.exe`)
  const version = context.packager.appInfo.version
  const exe = NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true })
  const res = NtExecutableResource.from(exe)

  const ico = Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')))
  const groups = Resource.IconGroupEntry.fromEntries(res.entries)
  const groupId = groups.length ? groups[0].id : 1
  const lang = groups.length ? groups[0].lang : 1033
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, ico.icons.map((i) => i.data))

  const infos = Resource.VersionInfo.fromEntries(res.entries)
  const vi = infos[0] ?? Resource.VersionInfo.createEmpty()
  const [a, b, c] = version.split('.').map((n) => parseInt(n, 10) || 0)
  vi.setFileVersion(a, b, c, 0, 1033)
  vi.setProductVersion(a, b, c, 0, 1033)
  vi.setStringValues(
    { lang: 1033, codepage: 1200 },
    {
      FileDescription: 'B2 First Trainer',
      ProductName: 'B2 First Trainer',
      InternalName: 'B2 First Trainer',
      OriginalFilename: `${name}.exe`,
      CompanyName: 'B2 First Trainer',
      LegalCopyright: 'Uso personal',
      FileVersion: version,
      ProductVersion: version
    }
  )
  vi.outputToResourceEntries(res.entries)
  res.outputResource(exe)
  fs.writeFileSync(exePath, Buffer.from(exe.generate()))
  console.log(`  • icono y versión ${version} aplicados a ${name}.exe (resedit)`)
}
