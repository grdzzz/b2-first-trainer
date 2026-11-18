#!/usr/bin/env bash
# Publica la versión de dist/ en la rama `descargas` (de donde la app descarga las actualizaciones).
# La rama solo guarda la última versión: se sustituye en cada publicación para no acumular ejecutables.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
VERSION=$(node -p "require('./package.json').version")
SETUP="dist/B2-First-Trainer-${VERSION}-setup.exe"
for f in "$SETUP" dist/latest.yml; do
  [ -f "$f" ] || { echo "Falta $f. Ejecuta antes: npx electron-builder --win nsis --x64 --publish never" >&2; exit 1; }
done
SIZE=$(stat -c %s "$SETUP")
[ "$SIZE" -lt 99000000 ] || { echo "El instalador ocupa $SIZE bytes: supera el límite de GitHub (100 MB)." >&2; exit 1; }

WORK=$(mktemp -d)
trap 'git worktree remove --force "$WORK" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
git worktree add --detach "$WORK" >/dev/null
(
  cd "$WORK"
  git checkout -q --orphan descargas-tmp
  git rm -rfq . >/dev/null 2>&1 || true
  cp "$ROOT/$SETUP" "$ROOT/dist/latest.yml" .
  [ -f "$ROOT/$SETUP.blockmap" ] && cp "$ROOT/$SETUP.blockmap" . || true
  cat > README.md <<MD
# Descargas · B2 First Trainer ${VERSION}

**Instalador para Windows:** [B2-First-Trainer-${VERSION}-setup.exe](https://github.com/grdzzz/first/raw/descargas/B2-First-Trainer-${VERSION}-setup.exe)

- Se instala solo para tu usuario (no pide administrador) y crea accesos directos en el escritorio y en el menú Inicio.
- Se actualiza sola: al abrirla busca versiones nuevas aquí y te ofrece «Reiniciar y actualizar».
- Si Windows muestra «Windows protegió su PC», pulsa «Más información» › «Ejecutar de todas formas».

Esta rama la genera \`scripts/publish-descargas.sh\`; el código está en la rama \`claude/pensive-goodall-ocllai\`.
MD
  git add -A
  git commit -qm "Versión ${VERSION} para Windows"
  git push -f origin HEAD:descargas
)
echo "Publicada la versión ${VERSION} en la rama descargas."
