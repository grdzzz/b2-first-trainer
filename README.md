# B2 First Trainer

Aplicación de escritorio para Windows 10 y 11 para practicar el examen **Cambridge B2 First** con tus propios materiales. Es de uso personal y funciona sin conexión: no tiene cuentas, ni nube, ni servicios de pago.

> La app **no incluye contenido de exámenes**. Tú importas tus propios PDF, audios y claves de respuestas.

## Qué hace

- **Biblioteca de exámenes.** Crea un examen con la estructura habitual del B2 First (Reading & Use of English, Writing, Listening y Speaking). Puedes cambiar el número de partes, el número de preguntas, el tipo de respuesta, las opciones, los puntos y el tiempo de cada paper.
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

Las pruebas (Vitest) cubren la lógica de corrección, el parseo y la aplicación de claves, la escritura atómica y la recuperación de datos, el modo repaso, las estadísticas y el texto de «Copiar para corregir».

## Generar el ejecutable

```bash
npm run build:win
```

Este comando comprueba los tipos, compila y genera en `dist/`:

- `B2-First-Trainer-<versión>-portable.exe`: ejecutable portable, no necesita instalación.
- `B2-First-Trainer-<versión>-setup.exe`: instalador por usuario. No pide administrador y permite elegir la carpeta.

`npm run build` solo compila (en `out/`), sin empaquetar.

### Linux

```bash
npm run build:linux
```

Genera `dist/B2-First-Trainer-<versión>-x86_64.AppImage`, un único archivo que funciona en la mayoría de distribuciones de 64 bits. Para abrirlo:

```bash
chmod +x B2-First-Trainer-1.0.0-x86_64.AppImage
```

```bash
./B2-First-Trainer-1.0.0-x86_64.AppImage
```

- Si se queja de **FUSE**, instala `libfuse2` (en Ubuntu 24.04 el paquete es `libfuse2t64`) o arráncalo con `APPIMAGE_EXTRACT_AND_RUN=1 ./B2-First-Trainer-1.0.0-x86_64.AppImage`.
- Si se cierra con un error de **sandbox** (frecuente en Ubuntu 23.10 y posteriores), añade `--no-sandbox` al final del comando.
- En Linux, los datos se guardan en `~/.config/B2 First Trainer/data`.

> **Generar el `.exe` desde Linux o macOS:** electron-builder necesita **Wine** (incluido el de 32 bits) para incrustar el icono en el `.exe`. En Windows no hace falta nada más.

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
└── corrupt\             archivos dañados apartados automáticamente (si los hubiera)
```

- **Escritura atómica.** Cada guardado se escribe en un archivo temporal, se vuelca a disco y después se renombra sobre el original. Si la app se cierra a mitad, el archivo anterior queda intacto.
- **Autoguardado.** Las respuestas se guardan cada 3 segundos (se puede cambiar en Ajustes). También se guardan al salir del intento, al minimizar y antes de cerrar la ventana. Un intento sin terminar se puede continuar desde Inicio.
- Si un archivo está dañado, se aparta a `corrupt\`, se avisa y la app sigue funcionando.

### Hacer una copia de seguridad

- **Desde la app:** ve a Ajustes › Datos › «Copia de seguridad…» y elige una carpeta. Se crea `b2-first-trainer-backup-<fecha>` con todo el contenido.
- **A mano:** cierra la app y copia la carpeta `%APPDATA%\B2 First Trainer\data`. Pega esa ruta en la barra del Explorador o usa «Abrir carpeta» en Ajustes.

### Restaurar una copia

Cierra la app y copia el contenido de la copia (las carpetas `exams`, `attempts`, `files`, `recordings` y `settings.json`) dentro de `%APPDATA%\B2 First Trainer\data`. Sustituye lo que haya.

> Para usar otra carpeta de datos (por ejemplo, en un USB), define la variable de entorno `B2FT_DATA_DIR` con la ruta antes de abrir la app.

## Micrófono en Windows

Para grabar en Speaking, Windows debe permitir el micrófono a las aplicaciones de escritorio: Configuración › Privacidad y seguridad › Micrófono › «Permitir que las aplicaciones de escritorio accedan al micrófono». La app solo pide permiso de micrófono; deniega cualquier otro.

## Estructura del proyecto

```
src/
├── main/        proceso principal de Electron: ventana, IPC, almacenamiento (storage.ts)
├── preload/     puente seguro window.api (contextIsolation + sandbox)
├── shared/      lógica pura y testeada: tipos, plantilla, claves, corrección, intentos, estadísticas, prompts IA
└── renderer/    interfaz React
    └── src/
        ├── styles/tokens.css   tokens de diseño: colores, espaciado, radios, sombras y movimiento
        ├── styles/app.css      estilos de componentes (solo usa tokens)
        ├── i18n/               textos de la interfaz (es.ts) y función t()
        ├── components/         visor PDF (pdf.js), reproductor, grabadora, gráfico…
        └── screens/            Inicio, Biblioteca, Examen, Intento, Resultados, Historial y Ajustes
tests/           pruebas Vitest
build/           icono de la app
examples/        claves de ejemplo con respuestas ficticias
```

**Internacionalización:** todos los textos de la interfaz están en `src/renderer/src/i18n/es.ts`. Para añadir otro idioma, crea un archivo con la misma forma y regístralo en `i18n/index.ts`. Las claves están tipadas y TypeScript avisa si falta alguna.

**Tipografías e iconos incluidos:** Inter y Newsreader (vía `@fontsource-variable`) e iconos Lucide. Todo se empaqueta en la app y no se carga nada de internet.

## Limitaciones conocidas

- No hay corrección automática de Writing ni de Speaking: se usa la autoevaluación y «Copiar para corregir».
- No hay transcripción automática de voz, porque requeriría servicios en línea o modelos pesados. La transcripción se escribe a mano.
- Las preguntas con varias respuestas válidas se corrigen como acierto o fallo. No hay puntuación parcial (por ejemplo, 1 de 2 puntos en Key word transformation).
- El porcentaje es tu nota sobre los puntos corregibles. No se convierte a la Cambridge English Scale.
- Los PDF se muestran como imagen, sin selección de texto ni búsqueda.
- La detección automática se basa en las instrucciones habituales de Cambridge («Part 1», «For questions 1–8…»). Con PDF de otras editoriales o escaneados puede no encontrar nada o equivocarse; siempre se puede corregir a mano.
