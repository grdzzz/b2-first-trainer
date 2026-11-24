# B2 First Trainer

[![Última versión](https://img.shields.io/github/v/release/grdzzz/b2-first-trainer?label=versi%C3%B3n&color=2e46c0)](https://github.com/grdzzz/b2-first-trainer/releases/latest) ![Windows · macOS · Linux](https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-escritorio-555)

Aplicación de escritorio para **Windows, macOS y Linux** para practicar el examen **Cambridge B2 First** con tus propios materiales. Funciona sin conexión: no tiene cuentas, ni nube, ni servicios de pago.

> La app **no incluye contenido de exámenes**. Tú importas tus propios PDF, audios y claves de respuestas.

## Descargar

Estos enlaces descargan siempre **la última versión**:

| Sistema | Descarga |
|---|---|
| 🪟 **Windows 10 y 11** | [**Descargar instalador (.exe)**](https://github.com/grdzzz/b2-first-trainer/releases/latest/download/B2-First-Trainer-Windows-Setup.exe) |
| 🍎 **macOS con chip Apple (M1, M2, M3, M4)** | [**Descargar (.dmg)**](https://github.com/grdzzz/b2-first-trainer/releases/latest/download/B2-First-Trainer-macOS-AppleSilicon.dmg) |
| 🍎 **macOS con procesador Intel** | [**Descargar (.dmg)**](https://github.com/grdzzz/b2-first-trainer/releases/latest/download/B2-First-Trainer-macOS-Intel.dmg) |
| 🐧 **Linux (64 bits)** | [**Descargar (.AppImage)**](https://github.com/grdzzz/b2-first-trainer/releases/latest/download/B2-First-Trainer-Linux.AppImage) |

Todas las versiones, con sus notas, están en [**Releases**](https://github.com/grdzzz/b2-first-trainer/releases/latest), en la columna derecha de esta página.

**¿Qué Mac tengo?** Menú Apple (la manzana, arriba a la izquierda) › «Acerca de este Mac». Si pone «Chip Apple M…», descarga la versión Apple; si pone «Procesador Intel…», la versión Intel.

### Primera vez que la abres

La app no está firmada por una empresa (cuesta dinero), así que el sistema avisa la primera vez. Es normal.

- **Windows:** abre el instalador. Si aparece «Windows protegió su PC», pulsa **«Más información» › «Ejecutar de todas formas»**. Se instala solo para tu usuario, sin pedir administrador, y **se actualiza sola**.
- **macOS:**
  1. Abre el `.dmg` y arrastra **B2 First Trainer** a la carpeta **Aplicaciones**.
  2. Ábrela. Si macOS dice que no puede comprobar el desarrollador, ve a **Ajustes del Sistema › Privacidad y seguridad**, baja hasta el aviso de B2 First Trainer y pulsa **«Abrir igualmente»**.
  3. Si en cambio dice que la app «está dañada», abre la app **Terminal** y ejecuta:
     ```bash
     xattr -cr "/Applications/B2 First Trainer.app"
     ```
  4. Al grabar en Speaking por primera vez, permite el acceso al micrófono.
- **Linux:** dale permiso de ejecución y ábrela:
  ```bash
  chmod +x B2-First-Trainer-Linux.AppImage
  ```
  ```bash
  ./B2-First-Trainer-Linux.AppImage --no-sandbox
  ```

En macOS y Linux la app avisa cuando hay una versión nueva y te lleva a la descarga. En Windows se actualiza sola.

## Qué hace

- **Bienvenida y examen de ejemplo.** La primera vez la app te pregunta tu nombre (opcional) y te ofrece un **examen de ejemplo** corto con un **recorrido guiado** por la app. El ejemplo es material original (no de Cambridge), con Reading & Use of English, Writing, Listening (voz sintética) y Speaking. El recorrido se puede repetir y el ejemplo volver a añadir desde Ajustes.
- **Práctica: 50 hojas de ejercicios.** Además de los exámenes, la app trae 50 hojas cortas (unos 10 minutos cada una) para practicar sin presión de examen: vocabulario (Part 1 + Part 4), gramática (Part 2 + Part 4), formación de palabras (Part 3 + Part 4), lectura (Part 5 y Part 7) y mixtas (Parts 1, 2 y 3). Son material original escrito siguiendo el formato del Reading & Use of English, no material de Cambridge. Se rellenan en la propia hoja (huecos dentro del texto), se corrigen con «Comprobar» y cada respuesta trae una explicación en español. La app guarda tu progreso, tu mejor nota en cada hoja y tu racha de días. No aparecen en la biblioteca ni en el historial de exámenes.
- **Repaso de fallos (repetición espaciada).** Cada pregunta que fallas en una hoja vuelve a salir al día siguiente y, si la aciertas, a los 3, 7 y 14 días; después queda dominada. El repaso muestra la pregunta con su frase de contexto, la corrección y la explicación. Las hojas hechas antes de esta función aportan sus fallos automáticamente.
- **Prueba de nivel inicial (obligatoria, una sola vez).** Al empezar (y, para quien ya usaba la app, al actualizar a la 1.9.0) se hace una prueba corta y siempre igual: 24 preguntas originales de gramática, vocabulario y lectura (niveles A2 a C1), unos 10 minutos, con opción «No lo sé». El resultado es orientativo y se da como nivel MCER (por debajo de A2, A2, B1, B2 o C1) y nota en la escala Cambridge English (110–190), con el porcentaje por destreza y recomendaciones con acceso directo (hojas de la destreza más floja, examen completo, repaso, recordatorio…). No se guarda como intento ni sale en el historial: el inicio muestra una tarjeta con el nivel (se puede ocultar) y Ajustes › Perfil lo recuerda.
- **Bubi, la mascota.** Una burbuja de diálogo (dibujo original en SVG) que te saluda, te anima en los resultados, te cuenta qué toca hoy en el Inicio y acompaña el recorrido guiado. Tiene animaciones gestionadas por una máquina de estados (`src/shared/mascot.ts`): respira y parpadea al azar, te mira cuando pasas el ratón, reacciona distinto a cada clic (y se marea si le das muchos seguidos), celebra los aciertos y logros, se entristece un poco con los fallos, piensa mientras se procesa algo, se duerme si no tocas nada un rato y se despierta al volver. Respeta «reducir movimiento» del sistema (cambia de cara pero no se mueve). Se puede ocultar en Ajustes › Perfil.
- **Novedades.** Después de cada actualización aparece un panel con los cambios de la versión, resumidos. Se puede volver a ver en Ajustes › Perfil › «Ver novedades».
- **Carga sin saltos.** Mientras algo se carga (arranque, pantallas, hojas, PDF, audio, ajustes) se ve un esqueleto con brillo con la misma forma que el contenido final, en tema claro y oscuro.
- **Recordatorio diario.** En Ajustes › Recordatorio diario eliges una hora; si ese día aún no has practicado, la app te avisa con un aviso del sistema (con lo que toca: repaso o racha). Para avisarte con la ventana cerrada, la app puede quedarse en segundo plano con un icono junto al reloj (clic derecho › Salir para cerrarla del todo) y, en Windows y macOS, abrirse al iniciar sesión.
- **Ayuda para Writing** (modos práctica y repaso). Junto a tu texto: tipo de texto (deducido de la consigna), revisión automática mientras escribes (extensión, párrafos, conectores, repeticiones, contracciones en registro formal, saludo y despedida en emails, encabezados en reports…), y una guía con la estructura recomendada, frases útiles que se añaden al texto con un clic y una lista de comprobación. En modo examen no hay ayudas, como en el examen real.
- **Crear más hojas.** En Práctica › «Crear más hojas» eliges el tipo de hoja, el tema y lo que quieres reforzar, copias unas instrucciones, las pegas en ChatGPT o Claude.ai y pegas su respuesta. La app la valida (huecos, opciones, número de palabras de las transformaciones…) y la añade a «Mis hojas». También se pueden exportar e importar hojas como archivo `.json` para compartirlas.
- **Biblioteca de exámenes.** Crea un examen con la estructura habitual del B2 First (Reading & Use of English, Writing, Listening y Speaking). Puedes cambiar el número de partes, el número de preguntas, el tipo de respuesta, las opciones, los puntos y el tiempo de cada paper.
- **Listening con vídeo y sin PDF.** En Listening se puede importar un **vídeo** (mp4, mov, m4v, webm o mkv; hasta 8 GB) en lugar del audio. Se reproduce en grande, sin cargarlo entero en memoria, con velocidad ajustable y los mismos atajos (espacio y flechas). Si no hay PDF ni clave, al principio de cada parte eliges el **tipo de preguntas** (opción múltiple A–C o A–D, emparejar A–H, palabra o respuesta corta, o frase: «Phrase 1:», «Phrase 2:»…), y la app lo recuerda para la próxima vez. Al entregar, **corriges tú cada pregunta** (✓ / ✗) mirando las respuestas del vídeo, y la nota se calcula con tus marcas.
- **Importación de archivos.** Puedes importar un PDF para todo el paper o uno por parte, y audio (mp3, m4a, wav, ogg, webm, flac…) para Listening. Los archivos se copian a la carpeta de datos de la app.
- **Detección automática desde el PDF.** Al importar el PDF de un paper, la app lee su texto y propone las partes y su página, los números de pregunta, el tipo de tarea, el número de opciones y los puntos. También el tiempo, el límite de palabras y las consignas de Writing y Speaking, y la clave si el PDF incluye una sección «Answer key». Muestra lo que ha encontrado y solo lo aplica si confirmas. Funciona con PDF digitales (con texto seleccionable), no con escaneos. Se puede repetir con el botón «Detectar desde el PDF».
- **Claves de respuestas** en JSON o en texto simple. Se importan desde un archivo o se pegan en un editor con vista previa y avisos. Si una parte no tiene clave, puedes hacerla igualmente, pero no se corrige.
- **Tres modos:**
  - **Examen:** temporizador con el tiempo oficial del paper completo, sin pistas. Se entrega al terminar o cuando se acaba el tiempo.
  - **Práctica:** sin límite de tiempo y con un botón «Comprobar» en cada pregunta.
  - **Repaso:** solo las preguntas falladas que siguen pendientes. Una pregunta deja de estar pendiente cuando la aciertas.
- **Tipos de respuesta:**
  - Opción múltiple, con clic o teclado.
  - Huecos de texto.
  - Redacción, con contador de palabras.
  - Speaking, con grabación del micrófono, reproducción y autoevaluación con los criterios de Cambridge.
- **Corrección automática** de todo lo que tiene clave. Muestra la puntuación por parte, las respuestas falladas y la respuesta correcta.
- **Corrección con IA en bloque** (Writing y Speaking). En los resultados, «Copiar todo para corregir» copia en un solo texto todas las tareas del intento (consigna, tu texto o transcripción, nivel B2 y criterios de Cambridge) y el formato de respuesta. Lo pegas en ChatGPT o Claude.ai, copias su respuesta y la pegas con «Pegar corrección». La app la revisa, te muestra qué va a aplicar y reparte en cada tarea la nota por criterio, los errores con su corrección, los consejos y una versión mejorada. No llama a ninguna API. La pronunciación no se puede valorar con texto: ese criterio lo puntúas tú.
- **Transcripción local de Speaking (Whisper).** El botón «Transcribir» convierte tu grabación en texto sin internet. La primera vez descarga el modelo Whisper base.en (77 MB, verificado con SHA-256) desde la *release* `whisper-base-en-v1` del repositorio. Después funciona siempre offline: unos segundos por grabación. Se puede borrar en Ajustes.
- **«Copiar para corregir»** (Writing y Speaking) genera un texto listo para pegar en un chat de IA. Incluye la consigna, tu texto o transcripción, el nivel objetivo (B2) y los criterios de Cambridge. No llama a ninguna API.
- **Progreso:** exámenes realizados, nota media por paper, gráfico de evolución, tipos de pregunta con más fallos e historial de intentos con fecha, duración y nota.
- **Interfaz:** temas claro y oscuro (por defecto sigue el de Windows), tamaño de texto ajustable, foco siempre visible, contrastes WCAG AA y animaciones que respetan «reducir movimiento».

### Atajos de teclado

| Dónde | Tecla | Acción |
| --- | --- | --- |
| Preguntas de opción múltiple | `1`–`9` o `A`–`H` | Elegir opción de la pregunta activa |
| Preguntas | `↑` / `↓` | Pregunta anterior / siguiente |
| Huecos de texto | `Intro` | Pasar al siguiente hueco |
| Listening | `Espacio` | Reproducir / pausar |
| Listening | `←` / `→` | Retroceder / avanzar 5 segundos |
| Divisor de paneles | `←` / `→` (con foco) | Redimensionar |

Los atajos no se activan mientras escribes en un campo de texto.

## Requisitos

- **Node.js 20 o superior** (probado con Node 22) y npm.
- Windows 10/11 x64 para generar y usar el `.exe`. El ejecutable no necesita permisos de administrador.
- No hay dependencias con compilación nativa: no hace falta Visual Studio ni Python.

## Instalar dependencias

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre la app con recarga en caliente. En desarrollo, `F12` abre las herramientas de desarrollo.

## Pruebas

```bash
npm test
```

Las pruebas (Vitest) cubren la prueba de nivel (puntuación y recomendaciones), la máquina de estados de Bubi, las novedades, la lógica de corrección, el parseo y la aplicación de claves, la escritura atómica y la recuperación de datos, el modo repaso, las estadísticas y el texto de «Copiar para corregir».

## Generar el ejecutable

```bash
npm run build:win
```

Este comando comprueba los tipos, compila y genera en `dist/`:

- `B2-First-Trainer-Windows-Portable.exe`: ejecutable portable, no necesita instalación.
- `B2-First-Trainer-Windows-Setup.exe`: instalador por usuario (recomendado). No pide administrador, permite elegir la carpeta y se actualiza solo.

`npm run build` solo compila (en `out/`), sin empaquetar.

### macOS

```bash
npm run build:mac
```

Solo funciona en un Mac. Sin Mac, usa el flujo «Publicar versión» de GitHub Actions. Genera `dist/B2-First-Trainer-macOS-arm64.dmg` (chip Apple) y `-x64.dmg` (Intel), con firma *ad hoc* (sin certificado de Apple).

### Linux

```bash
npm run build:linux
```

Genera `dist/B2-First-Trainer-Linux.AppImage`, un único archivo que funciona en la mayoría de distribuciones de 64 bits. Para abrirlo:

```bash
chmod +x B2-First-Trainer-Linux.AppImage
```

```bash
./B2-First-Trainer-Linux.AppImage
```

- Si se queja de **FUSE**, instala `libfuse2` (en Ubuntu 24.04 el paquete es `libfuse2t64`) o arráncalo con `APPIMAGE_EXTRACT_AND_RUN=1 ./B2-First-Trainer-Linux.AppImage`.
- Si se cierra con un error de **sandbox** (frecuente en Ubuntu 23.10 y posteriores), añade `--no-sandbox` al final del comando.
- En Linux, los datos se guardan en `~/.config/B2 First Trainer/data`.

> **Generar el `.exe` desde Linux o macOS:** electron-builder necesita **Wine** (incluido el de 32 bits) para incrustar el icono en el `.exe`. En Windows no hace falta nada más.

## Instalar en Windows y actualizaciones

**Usa el instalador** (`B2-First-Trainer-Windows-Setup.exe`), que se descarga desde [Descargar](#descargar). Frente a la versión portable:

- **Arranca mucho más rápido.** La portable descomprime unos 100 MB en una carpeta temporal cada vez que se abre.
- **El acceso directo de la barra de tareas funciona bien.** Ancla la app desde el menú Inicio o desde la propia ventana abierta (clic derecho › «Anclar a la barra de tareas»). La portable se ejecuta desde una carpeta temporal distinta cada vez, por eso su acceso anclado falla.
- **Se actualiza sola.** Al abrirla comprueba si hay una versión nueva en la rama `descargas`, la descarga en segundo plano y muestra «Reiniciar y actualizar». Se puede desactivar o comprobar a mano en Ajustes › Actualizaciones. Sin internet no pasa nada: la app sigue funcionando.

Se instala solo para tu usuario (no pide administrador). Tus datos se conservan al instalar, actualizar o pasar de la portable a la instalada.

### Publicar una versión nueva

1. Sube el número de `version` en `package.json`. La app solo se actualiza si la versión publicada es mayor que la instalada.
2. En la pestaña **Actions** del repositorio, ejecuta el flujo **«Publicar versión»** (`.github/workflows/release.yml`):
   - Pasa los tests.
   - Compila en **Windows, macOS y Linux reales**. No hace falta Wine ni un Mac propio.
   - En cada sistema, **abre la app empaquetada** con `scripts/smoke-test.cjs`, crea un examen, comprueba que se guarda y hace una captura. Las capturas quedan en los *artifacts* de la ejecución.
   - Sube los archivos a una *release* `v<versión>` con nombres fijos, para que los enlaces de [Descargar](#descargar) apunten siempre a la última versión.
   - **Solo si todo ha ido bien**, publica la release y actualiza `latest.yml` en la rama `descargas`, de donde la app instalada en Windows lee las actualizaciones.

La versión de Windows se actualiza sola. Las de macOS y Linux avisan y abren la página de descarga, porque la actualización automática en macOS exige una firma de Apple de pago.

## Formato de la clave de respuestas

La numeración de las preguntas es **continua dentro de cada paper**, como en el examen. Con la plantilla por defecto:

- **Reading & Use of English:** parte 1 = 1–8, 2 = 9–16, 3 = 17–24, 4 = 25–30, 5 = 31–36, 6 = 37–42 y 7 = 43–52.
- **Listening:** parte 1 = 1–8, 2 = 9–18, 3 = 19–23 y 4 = 24–30.

### JSON (formato completo)

```json
{
  "format": "b2-first-key",
  "version": 1,
  "papers": {
    "reading": {
      "1": "B",
      "9": "which",
      "10": ["at", "in"],
      "25": ["was not allowed to", "wasn't allowed to"]
    },
    "listening": {
      "1": "A",
      "9": "garden"
    }
  }
}
```

- Las claves de `papers` pueden ser `reading`, `writing`, `listening` o `speaking`. Solo se corrigen Reading y Listening.
- Cada respuesta es un **texto** o una **lista de textos**. Una lista indica varias respuestas válidas.
- En opción múltiple, la respuesta es la letra de la opción (`"A"`, `"B"`…), en mayúsculas o minúsculas. Si una letra no existe en esa pregunta, se avisa y se ignora.
- `format` y `version` son opcionales, pero se recomiendan.

### JSON mínimo (una parte o un paper)

Si importas la clave desde una parte o desde un paper concreto, basta con:

```json
{ "1": "B", "2": "C", "3": "A" }
```

También se acepta `{ "answers": { "1": "B" } }`. Al importar en una parte, solo se usan los números de esa parte y se avisa de los demás.

### Texto simple (para pegar en la pantalla de edición)

```
// comentario
[reading]
1 B
2. C
9 which
10 at / in
25 was not allowed to | wasn't allowed to

[listening]
1 A
```

- Una respuesta por línea: el número, un separador opcional (`.`, `)`, `:`, `-`) y la respuesta.
- Las alternativas se separan con `/` o `|`.
- Las secciones `[reading]` y `[listening]` son opcionales. Sin ellas, la clave se aplica al paper o a la parte desde la que la editas.
- Las líneas que empiezan por `//` o `;` son comentarios.

Hay ejemplos con respuestas ficticias en `examples/`. Desde la pantalla del examen, «Exportar clave» guarda la clave completa en este formato JSON.

### Cómo se corrige

- En opción múltiple no importan las mayúsculas ni los espacios.
- En los huecos de texto, por defecto la comparación es **estricta**. Solo se ignoran los espacios del principio y del final y se unifican los apóstrofos tipográficos (`’` = `'`). En **Ajustes** puedes activar, por separado, que se ignoren las mayúsculas, los espacios sobrantes y las tildes.
- Cada pregunta vale los puntos configurados en su parte. Por ejemplo, en la plantilla la parte 4 vale 2 puntos por pregunta. No hay puntuación parcial automática.
- Writing y Speaking se puntúan con tu autoevaluación: de 0 a 5 en cada uno de los cuatro criterios de Cambridge.

## Datos y copia de seguridad

Todo se guarda en archivos JSON dentro de la carpeta de datos de la app:

```
%APPDATA%\B2 First Trainer\data\
├── settings.json        ajustes
├── exams\<id>.json      estructura y claves de cada examen
├── attempts\<id>.json   cada intento (respuestas, tiempos, resultado)
├── files\<id>\…         PDF y audios importados
├── recordings\<id>\…    grabaciones de Speaking (.webm)
├── practice\<id>.json   hojas de práctica que has creado o importado
├── practice\progress\   tu progreso en cada hoja (respuestas, nota, días)
└── corrupt\             archivos dañados apartados automáticamente (si los hubiera)
```

- **Escritura atómica.** Cada guardado se escribe en un archivo temporal, se vuelca a disco y después se renombra sobre el original. Si la app se cierra a mitad, el archivo anterior queda intacto.
- **Autoguardado.** Las respuestas se guardan cada 3 segundos (se puede cambiar en Ajustes). También se guardan al salir del intento, al minimizar y antes de cerrar la ventana. Un intento sin terminar se puede continuar desde Inicio.
- Si un archivo está dañado, se aparta a `corrupt\`, se avisa y la app sigue funcionando.

### Usar tus datos en varios ordenadores

Sin cuentas ni servidores: la app puede guardar sus datos en una carpeta de **OneDrive, Google Drive, iCloud Drive o Dropbox**, y ese servicio la sincroniza entre tus ordenadores.

1. En el primer ordenador, ve a **Ajustes › Sincronizar entre ordenadores › Elegir carpeta…** y elige una carpeta de tu nube. La app crea dentro `B2 First Trainer`, **copia allí tus datos** (comprueba que la copia está completa) y se reinicia usándola. Tus datos originales no se borran.
2. En el otro ordenador, instala la app y elige **la misma carpeta**. La app detecta que ya hay datos y los usa.

Detalles:
- Si la app está abierta en otro ordenador con la misma carpeta, te avisa, tanto al abrirla como mientras la usas (lo comprueba cada 30 segundos; cada ordenador escribe su propio archivo `abierta-en-<equipo>.json`). Lo mejor es no usarla en los dos a la vez.
- Si la nube crea «copias en conflicto» de un archivo, la app las ignora y usa el archivo correcto.
- Si un archivo todavía se está sincronizando (vacío o modificado hace menos de 10 minutos y aún incompleto), la app lo ignora por ahora y te avisa, **sin moverlo**. Solo aparta a `corrupt\` los archivos dañados de verdad.
- Cada instalación tiene su propio identificador, así que dos ordenadores con el mismo nombre (por ejemplo, dos «MacBook-Pro») también se avisan entre sí.
- Si la carpeta no está disponible (por ejemplo, la nube no está abierta), la app no muestra una biblioteca vacía: avisa y te deja reintentar o volver a la carpeta de este ordenador.
- El modelo de transcripción (Whisper) no se sincroniza; cada ordenador lo descarga una vez.

### Hacer una copia de seguridad

- **Desde la app:** ve a Ajustes › Datos › «Copia de seguridad…» y elige una carpeta. Se crea `b2-first-trainer-backup-<fecha>` con todo el contenido.
- **A mano:** cierra la app y copia la carpeta `%APPDATA%\B2 First Trainer\data`. Pega esa ruta en la barra del Explorador o usa «Abrir carpeta» en Ajustes.

### Restaurar una copia

Cierra la app y copia el contenido de la copia (las carpetas `exams`, `attempts`, `files`, `recordings`, `practice` y `settings.json`) dentro de `%APPDATA%\B2 First Trainer\data`. Sustituye lo que haya.

> Para usar otra carpeta de datos (por ejemplo, en un USB), define la variable de entorno `B2FT_DATA_DIR` con la ruta antes de abrir la app. Las variables de prueba `B2FT_UPDATE_URL` y `B2FT_WHISPER_URL` solo aceptan direcciones locales en la app instalada.

## Micrófono en Windows

Para grabar en Speaking, Windows debe permitir el micrófono a las aplicaciones de escritorio: Configuración › Privacidad y seguridad › Micrófono › «Permitir que las aplicaciones de escritorio accedan al micrófono». La app solo pide permiso de micrófono; deniega cualquier otro.

## Estructura del proyecto

```
src/
├── main/        proceso principal de Electron: ventana, IPC, almacenamiento (storage.ts)
├── preload/     puente seguro window.api (contextIsolation + sandbox)
├── shared/      lógica pura y testeada: tipos, plantilla, claves, corrección, intentos, estadísticas, prompts IA
│   ├── practice.ts          hojas de práctica: tipos, corrección, validación, progreso e instrucciones para la IA
│   └── practiceSheets/      las 50 hojas incluidas (vocabulario, gramática, formación de palabras, lectura, mixtas)
└── renderer/    interfaz React
    └── src/
        ├── styles/tokens.css   tokens de diseño: colores, espaciado, radios, sombras y movimiento
        ├── styles/app.css      estilos de componentes (solo usa tokens)
        ├── i18n/               textos de la interfaz (es.ts) y función t()
        ├── components/         visor PDF (pdf.js), reproductor, grabadora, gráfico…
        └── screens/            Inicio, Exámenes, Examen, Intento, Resultados, Práctica, Hoja, Historial y Ajustes
tests/           pruebas Vitest
build/           icono de la app
examples/        claves de ejemplo con respuestas ficticias
```

**Internacionalización:** todos los textos de la interfaz están en `src/renderer/src/i18n/es.ts`. Para añadir otro idioma, crea un archivo con la misma forma y regístralo en `i18n/index.ts`. Las claves están tipadas y TypeScript avisa si falta alguna.

**Tipografías e iconos incluidos:** Inter y Newsreader (vía `@fontsource-variable`) e iconos Lucide. Todo se empaqueta en la app y no se carga nada de internet.

## Limitaciones conocidas

- La corrección con IA depende del chat que uses: es una estimación útil para practicar, no la nota de un examinador oficial. Si el chat no respeta el formato, la app avisa y no aplica nada.
- Whisper base.en entiende bien el inglés de estudiantes, pero puede equivocarse con palabras poco claras: revisa la transcripción antes de copiarla.

- No hay corrección automática de Writing ni de Speaking: se usa la autoevaluación y «Copiar para corregir».
- No hay transcripción automática de voz, porque requeriría servicios en línea o modelos pesados. La transcripción se escribe a mano.
- Las preguntas con varias respuestas válidas se corrigen como acierto o fallo. No hay puntuación parcial (por ejemplo, 1 de 2 puntos en Key word transformation).
- El porcentaje es tu nota sobre los puntos corregibles. No se convierte a la Cambridge English Scale.
- Los PDF se muestran como imagen, sin selección de texto ni búsqueda.
- La detección automática se basa en las instrucciones habituales de Cambridge («Part 1», «For questions 1–8…»). Con PDF de otras editoriales o escaneados puede no encontrar nada o equivocarse; siempre se puede corregir a mano.
