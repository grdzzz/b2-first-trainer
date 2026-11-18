#!/usr/bin/env bash
# Publica la versión de dist/ en la rama `descargas`, de donde la app lee `latest.yml` para actualizarse.
#  - Con RELEASE_DOWNLOAD_URL (GitHub Releases): solo se publica latest.yml, apuntando al instalador de la release.
#  - Sin ella: se copia también el instalador a la rama (límite de GitHub: 100 MB por archivo).
# La rama solo guarda la última versión: se sustituye en cada publicación.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
VERSION=$(node -p "require('./package.json').version")
SETUP_NAME="B2-First-Trainer-${VERSION}-setup.exe"
SETUP="dist/${SETUP_NAME}"
[ -f dist/latest.yml ] || { echo "Falta dist/latest.yml. Genera antes el instalador." >&2; exit 1; }
grep -q "^version: ${VERSION}$" dist/latest.yml || { echo "dist/latest.yml no corresponde a la versión ${VERSION}." >&2; exit 1; }

if [ -n "${RELEASE_DOWNLOAD_URL:-}" ]; then
  DOWNLOAD="${RELEASE_DOWNLOAD_URL}/${SETUP_NAME}"
  # La app acepta URLs absolutas en latest.yml: así descarga el instalador desde la release.
  sed -e "s#^\(  - url: \)${SETUP_NAME}\$#\1${DOWNLOAD}#" -e "s#^path: ${SETUP_NAME}\$#path: ${DOWNLOAD}#" dist/latest.yml > dist/latest.release.yml
  grep -q "url: ${DOWNLOAD}" dist/latest.release.yml || { echo "No se ha podido reescribir latest.yml." >&2; exit 1; }
else
  [ -f "$SETUP" ] || { echo "Falta $SETUP." >&2; exit 1; }
  SIZE=$(wc -c < "$SETUP" | tr -d " ")
  [ "$SIZE" -lt 99000000 ] || { echo "El instalador ocupa $SIZE bytes: supera el límite de GitHub (100 MB). Publica con RELEASE_DOWNLOAD_URL." >&2; exit 1; }
  DOWNLOAD="https://github.com/grdzzz/first/raw/descargas/${SETUP_NAME}"
fi

WORK=$(mktemp -d)
trap 'git worktree remove --force "$WORK" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
git worktree add --detach "$WORK" >/dev/null
(
  cd "$WORK"
  git checkout -q --orphan descargas-tmp
  git rm -rfq . >/dev/null 2>&1 || true
  if [ -n "${RELEASE_DOWNLOAD_URL:-}" ]; then
    cp "$ROOT/dist/latest.release.yml" latest.yml
  else
    cp "$ROOT/$SETUP" "$ROOT/dist/latest.yml" .
  fi
  cat > README.md <<MD
# Descargas · B2 First Trainer ${VERSION}

**Instalador para Windows:** [${SETUP_NAME}](${DOWNLOAD})

- Se instala solo para tu usuario (no pide administrador) y crea accesos directos en el escritorio y en el menú Inicio.
- Se actualiza sola: al abrirla busca versiones nuevas y te ofrece «Reiniciar y actualizar».
- Si Windows muestra «Windows protegió su PC», pulsa «Más información» › «Ejecutar de todas formas».

Esta rama la genera \`scripts/publish-descargas.sh\`; el código está en la rama \`claude/pensive-goodall-ocllai\`.
MD
  git add -A
  git commit -qm "Versión ${VERSION} para Windows"
  git push -f origin HEAD:descargas
)
echo "Publicada la versión ${VERSION} (${DOWNLOAD})."
