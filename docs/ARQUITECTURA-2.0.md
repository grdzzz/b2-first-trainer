# B2 First Trainer 2.0 · Documentación técnica

Este documento describe la arquitectura de la actualización 2.0 («The Adaptive Learning Update»):
plan de estudio adaptativo, cuaderno de errores, progresión (XP, niveles, logros, misiones), Bubi con
accesorios y la renovación de la interfaz. Todo sigue siendo **local, sin cuentas, sin backend, sin
claves API y sin telemetría**.

## 1. Auditoría de partida (1.9.2)

| Área | Situación encontrada | Decisión en 2.0 |
|---|---|---|
| Persistencia | JSON por entidad en la carpeta de datos, escritura atómica (temporal + `fsync` + `rename` con reintentos), cola por archivo, cuarentena de dañados en `corrupt/`, tolerancia a archivos a medio sincronizar y a «copias en conflicto» de nubes. | Se reutiliza tal cual (`writeJsonAtomic`, `readJsonPatient`, `looksMidSync`). Los datos nuevos van en `learning/` con documentos versionados y **fusión por registro**. |
| Repaso | Leitner de 4 cajas (1, 3, 7, 14 días) guardado dentro de `PracticeProgress.review`. | Es **el** sistema de repaso de las preguntas de hojas. El cuaderno no duplica su estado: lo lee. Solo las preguntas sin repaso propio (exámenes, Writing, Speaking, manuales) guardan un estado Leitner en el cuaderno, con las mismas funciones (`answerReview`, `failedState`). |
| Estado de la interfaz | Un único `AppContext` con todo (exámenes, intentos, progreso, ajustes). | Contexto aparte `LearningProvider` para no volver a pintar toda la app con cada cambio de XP o del cuaderno. |
| IPC | Canal `handle()` con resultado `{ ok, data } / { ok, error }`, validación de ids y nombres de archivo. | 4 canales nuevos con validación (ver §8). |
| Bubi | Máquina de estados pura (`shared/mascot.ts`) + componente SVG. | Se amplía la misma máquina (estados de actividad y reacciones nuevas) y el mismo SVG (objetos y accesorios dentro del grupo del cuerpo, así siguen todas las animaciones). |
| Pruebas | 190 pruebas Vitest y 18 E2E con Electron + Playwright. | Se mantienen todas (3 E2E adaptadas al nuevo inicio) y se añaden 102 unitarias y 12 E2E. |

## 2. Mapa de módulos

```
src/shared/learning/            lógica pura, sin React ni Electron (100 % probada con Vitest)
├── taxonomy.ts      competencias (gramática, vocabulario, reading, writing, listening, speaking),
│                    partes del examen y clasificación de errores solo con pistas claras
├── notebook.ts      cuaderno de errores: registro idempotente, estados, búsqueda, filtros, sesiones,
│                    exportación (CSV/Markdown), validación y fusión
├── sources.ts       reconciliación: datos de siempre (progreso de hojas, intentos, IA) → eventos
├── events.ts        eventos de dominio y su procesamiento (cuaderno → actividad → XP → plan →
│                    misiones → logros → nivel), estadísticas para logros
├── competency.ts    perfil de competencias y detección de patrones
├── engine.ts        motor adaptativo: prioridades, sesiones, alternativas, previsión, replanificación
├── plan.ts          configuración del plan, sesiones guardadas, actividades movidas, hitos
├── readiness.ts     preparación estimada (intervalo + confianza)
├── game.ts          registro de actividad, XP, niveles y rangos (valores en XP_REWARDS)
├── achievements.ts  56 logros en 12 categorías
├── missions.ts      misiones diarias/semanales
├── streaks.ts       rachas, constancia, calendario de actividad
├── cosmetics.ts     armario de Bubi
└── aiErrors.ts      prompts a partir de errores e importación validada
src/shared/fuzzy.ts             búsqueda tolerante a erratas (Damerau-Levenshtein + subsecuencias)
src/main/learningStore.ts       documentos de `learning/`, fusión de copias en conflicto, migración
src/renderer/src/lib/learning.tsx   LearningProvider (estado, reconciliación, guardado, replanificación)
src/renderer/src/lib/learningInput.ts  datos de la app → entrada del motor
src/renderer/src/screens/       PlanScreen, NotebookScreen, StatsScreen, ProfileScreen,
                                AchievementsScreen, WardrobeScreen (+ HomeScreen y ReviewScreen renovadas)
src/renderer/src/components/    Sidebar, CommandPalette, Celebrations, StudyCalendar, PlanWizard,
                                ReadinessPanel, NotebookModals, Heatmap, AchievementBadge, XpBar…
```

## 3. Eventos de dominio

Tipos (`shared/learning/events.ts`): `PRACTICE_COMPLETED`, `EXAM_COMPLETED`, `ANSWER_INCORRECT`,
`REVIEW_ANSWERED`, `REVIEW_COMPLETED`, `ERROR_MASTERED`, `ERROR_ADDED`, `AI_FEEDBACK_IMPORTED`,
`XP_EARNED`, `LEVEL_UP`, `ACHIEVEMENT_UNLOCKED`, `STUDY_SESSION_COMPLETED`,
`PLAN_ACTIVITY_COMPLETED`, `STUDY_PLAN_UPDATED`, `MISSION_COMPLETED`, `FEATURE_USED`.

### Origen: reconciliación en lugar de instrumentar cada pantalla

Las pantallas de siempre (hoja, intento, resultados) **no cambian su forma de guardar**. Cuando cambian
el progreso de las hojas o los intentos, el proveedor compara con lo ya procesado
(`GameDoc.processed`) y genera los eventos que faltan (`reconcile`). Ventajas:

- **Idempotente por construcción**: volver a reconciliar no genera nada.
- Sirve igual para lo que acaba de pasar, para lo que llega **sincronizado de otro ordenador** y para la
  **migración** (el historial de 1.x se procesa con `retro: true`).
- Las pantallas solo emiten explícitamente lo que no queda en los datos de siempre: respuestas de repaso
  (`REVIEW_ANSWERED`, `REVIEW_COMPLETED`), errores añadidos a mano y uso de funciones.

### Flujo (ejemplo: completar una hoja)

1. `SheetScreen` guarda el progreso como siempre (incluido el Leitner de la hoja).
2. La reconciliación genera `PRACTICE_COMPLETED` con cada pregunta, su parte del examen y su competencia.
3. Cuaderno: cada fallo se registra (`ANSWER_INCORRECT`) con un id de ocurrencia; los aciertos de
   preguntas ya registradas suman «aciertos posteriores»; si una pregunta sale del Leitner, `ERROR_MASTERED`.
4. Actividad: entrada con minutos, aciertos por parte y por competencia (alimenta perfil, patrones,
   preparación, rachas y misiones).
5. XP con reglas anti-repetición; récord personal si mejora.
6. Plan: la actividad de hoy que apuntaba a esa hoja queda hecha; si era la última, `STUDY_SESSION_COMPLETED`.
7. Misiones, logros (en bucle hasta estabilizarse) y nivel.
8. La interfaz recibe los eventos derivados: Bubi celebra (tras su reacción al resultado), tarjeta de
   celebración, aviso en el centro de notificaciones y +XP animado en la barra.
9. El motor replanifica (si la sesión no se había empezado) y el inicio muestra los cambios.

**Sin bucles ni duplicados:** cada efecto persistente tiene una clave estable (`ledger` por id de
recompensa, ocurrencias por error, `processed` por fuente, `missionsDone`, `achievements`). El lote está
acotado (`MAX_EVENTS = 2000`) y la evaluación de logros, a 10 rondas. Hay pruebas para todo ello.

## 4. Persistencia (esquemas)

```
<carpeta de datos>/
├── … (todo lo de 1.x, sin cambios de formato)
├── learning/
│   ├── meta.json       { dataVersion: 2, migratedAt, appVersion, backup, backupFiles, backupError? }
│   ├── notebook.json   NotebookDoc
│   ├── game.json       GameDoc
│   └── plan.json       PlanDoc
└── backups/pre-2.0.0-<fecha>/   copia previa a la migración (JSON de 1.x) + LEEME.json
```

### `notebook.json` (`NotebookDoc`, `schemaVersion: 2`)

```jsonc
{
  "schemaVersion": 2,
  "records": {
    "s:fce_hoja01:0.3": {                     // id estable: s: hoja / e: examen / a: intento (IA) / m: manual
      "id": "s:fce_hoja01:0.3",
      "source": "sheet",                       // sheet | exam | review | writing | speaking | manual | ai
      "ref": { "kind": "sheet", "sheetId": "fce_hoja01", "key": "0.3" },
      "question": "We took a _____ route through the mountains…",
      "context": "A scenic · B sightseeing · C viewing · D picture",
      "given": "B · sightseeing",
      "expected": ["A · scenic"],
      "explanation": "«Scenic route» = ruta panorámica.",
      "skill": "useOfEnglish",
      "part": "reading.p1",
      "category": "vocabulary.collocations", "categorySource": "auto",   // auto | user | ai
      "firstAt": "…", "lastAt": "…", "fails": 2, "successes": 1,
      "occurrences": ["sheet:fce_hoja01@…", "review:…"],                  // idempotencia (máx. 40)
      "review": { "box": 0, "due": "2026-11-27", "lapses": 1, "addedAt": "…" },  // solo si no hay otro Leitner
      "autoCheck": true, "mastered": false, "favorite": true, "notes": "…",
      "deleted": false,                                                    // marca: la sincronización no lo resucita
      "updatedAt": "…"
    }
  },
  "lessons": { "lesson-…": { "id", "title", "sections": [{ "heading", "text", "examples": [] }], "errorIds", "createdAt", "updatedAt" } },
  "updatedAt": "…"
}
```

### `game.json` (`GameDoc`, `schemaVersion: 2`)

```jsonc
{
  "ledger":       { "<id de recompensa>": { "xp": 30, "reason": "sheet", "at": "…", "ref": "fce_hoja01", "retro": false } },
  "achievements": { "warm-up": { "at": "…", "retro": false } },
  "activity":     { "<id de evento>": { "kind": "sheet", "at", "day", "skill", "minutes", "correct", "total",
                    "parts": { "reading.p1": [6, 8] }, "comp": { "grammar.prepositions": [1, 2] }, "record", "first" } },
  "flags":        { "palette": { "at": "…", "count": 3 } },
  "processed":    { "sheet:fce_hoja01": "<lastAt>", "best:fce_hoja01": "9", "attempt:attempt_…": "…", "ai:<intento>:<pregunta>": "<receivedAt>" },
  "missionsDone": { "d-sheet:grammar:2026-11-26": "…" },
  "missionPicks": { "2026-11-26": ["d-sheet:grammar:2026-11-26", "d-master:2026-11-26"], "w2026-11-23": ["…"] },
  "cosmetics":    { "equipped": { "eyes": "round-glasses" }, "updatedAt": "…" },
  "profile":      { "avatar": { "kind": "bubi", "color": "indigo" }, "favorites": ["warm-up"], "updatedAt": "…" },
  "initializedAt": "…",
  "updatedAt": "…"
}
```

La XP total es la **suma del registro** (no un contador): dos equipos que procesan el mismo intento
generan la misma entrada y la fusión no la cuenta dos veces.

### `plan.json` (`PlanDoc`, `schemaVersion: 2`)

```jsonc
{
  "config": { "examDate": "2027-01-20" | null, "targetScore": 173, "targetLevel": "B2", "minutesPerSession": 30,
              "studyDays": [0,1,2,3,4], "restDates": [], "preferences": ["variety"], "prioritySkills": ["listening"],
              "intensity": "balanced", "startedAt": "…", "updatedAt": "…" },
  "sessions": { "2026-11-26": { "date", "generatedAt", "fingerprint", "startedAt?", "budget", "restDay", "gaps": [],
                "welcomeBack?", "activities": [{ "id", "kind", "skill", "title", "minutes", "difficulty?",
                "reasons": [{ "code": "weakPart", "vars": { "part": "reading.p4", "pct": 40 } }],
                "target": { "kind": "sheet", "sheetId": "…" }, "status": "todo" | "done", "doneAt?", "replacedFrom?" }],
                "completedAt?", "updatedAt" } },
  "moves": { "<id de actividad>": { "date": "2026-11-28", "updatedAt": "…", "activity": { … } } },
  "updatedAt": "…"
}
```

Las sesiones de más de 120 días se podan (el historial real está en `game.activity`).

### Ajustes (`settings.json`)

Campos nuevos, opcionales y validados en `mergeSettings`: `theme` admite `oled` y `midnight`;
`appearance { accent, density, motion }`, `gamification`, `dashboard { order, hidden }`. El
`schemaVersion` de exámenes, intentos y ajustes **no cambia** (sus formatos no cambian).

### Fusión y carpetas sincronizadas

- **Al leer**, se fusionan el archivo normal y sus copias en conflicto («game (1).json»,
  «game-PC-conflict.json», «game (Copia en conflicto…).json»); el resultado se guarda y las copias se borran.
- **Al guardar**, se vuelve a fusionar con lo que haya en disco (por si otro equipo escribió entretanto) y se
  devuelve el resultado a la interfaz, que lo incorpora sin volver a guardar si no hay nada nuevo.
- Reglas de fusión (conmutativas e idempotentes, con pruebas): registros del cuaderno y lecciones, el más
  reciente (`updatedAt`); registro de XP, actividad, `processed` y misiones, **unión**; logros, la fecha más
  antigua; cosméticos, perfil y configuración del plan, el más reciente.
- Archivos dañados: igual que en 1.x (cuarentena si no parecen a medio sincronizar).

## 5. Migración desde 1.9.2

1. **Copia de seguridad** (proceso principal, antes de crear nada): `settings.json`, `exams/`,
   `attempts/`, `practice/` (todos los JSON) en `backups/pre-2.0.0-<fecha>/`, con verificación de tamaños
   y un `LEEME.json` que explica cómo restaurar. Los PDF, audios y grabaciones no se copian porque la
   migración no los toca.
2. **Meta**: `learning/meta.json` con `dataVersion: 2`. Si existe, no se repite nada (idempotente).
3. **Inicialización** (interfaz, con el contenido de las hojas cargado): reconciliación con `retro: true`.
   Se crean errores en el cuaderno a partir de la última comprobación de cada hoja **y** de todo lo que
   siga en el Leitner (fallos de comprobaciones anteriores), errores de los intentos de examen y de las
   correcciones de IA, y la actividad con sus fechas reales.
4. **Ningún archivo de 1.x se modifica.** Volver a 1.9.2 sigue funcionando (ignora `learning/`), salvo
   que 1.9.2 normaliza los ajustes al guardarlos y descartaría los campos nuevos de apariencia (ver §10).
5. Verificable: pruebas unitarias (`learningStore.test.ts`, `learningEvents.test.ts`) y E2E
   («migración desde 1.9.2»).

### Recompensas retroactivas (decisión)

- El historial **sí** da XP, con las mismas reglas que la actividad en vivo (incluida la anti-repetición), y
  **sí** desbloquea logros: es esfuerzo real y sería injusto empezar de cero.
- Todo lo retroactivo se marca `retro: true` y **no** genera celebraciones, avisos ni reacciones de Bubi;
  un único aviso resume lo incorporado («N errores y X XP»).
- No hay récords personales retroactivos (no se conoce la nota anterior de cada hoja) ni misiones
  retroactivas.
- De las hojas solo se conoce la última comprobación: si una hoja se hizo varias veces, cuenta una.

## 6. Motor adaptativo

Entrada (`EngineInput`): configuración del plan, catálogo de hojas y exámenes (con si se pueden hacer y
corregir), estado de cada hoja, intentos, registro de actividad, prueba de nivel, errores, repasos que
tocan, sesiones anteriores.

1. **Perfil** (`competency.ts`): precisión por destreza, parte y competencia, ponderada por actualidad
   (vida media de 45 días). Estados: `unassessed` (0 datos), `insufficient` (menos de 10 respuestas por
   destreza, 6 por parte o 5 por competencia), `weak` (< 60 %), `developing` (< 75 %), `strong`. La prueba
   de nivel es solo un punto de partida con poco peso y se marca `placementOnly`. **Sin datos, la
   precisión es `null`: no se inventan puntuaciones.**
2. **Prioridad por destreza**: distancia al objetivo (en porcentaje equivalente a la puntuación objetivo),
   sin evaluar (+24) o con pocos datos (+14), días sin practicarla, prioridad del alumno (+16), errores
   recientes, patrones detectados, cercanía del examen para Writing/Listening/Speaking y −12 si fue la
   principal ayer (equilibrio).
3. **Sesión**: repaso que toca (hasta un 35–45 % del tiempo), una tanda de errores del patrón más claro,
   simulacro si el examen está cerca y cabe (como mucho uno por semana) y, por prioridad, una actividad
   por destreza con contenido hasta llenar el tiempo, **sin superarlo nunca**. Los días de descanso no hay
   sesión (se puede «entrenar igualmente»). Tras 4 o más días sin estudiar, sesión un 25 % más ligera.
4. **Contenido**: evita lo hecho en los últimos 6 días y lo propuesto en sesiones anteriores; prefiere lo
   nunca hecho y lo de peor nota; busca el tipo de hoja que trabaja la parte más floja.
5. **Determinista**: desempates con un número pseudoaleatorio estable (día + id).
6. **Replanificación**: la sesión de hoy guarda una huella de sus datos (configuración, actividad,
   errores, repasos, catálogo, prueba de nivel). Si cambia y la sesión **no se ha empezado**, se rehace.
   Una vez empezada, no se toca (salvo sustituciones y movimientos del alumno). Lo pendiente de días
   pasados **no** se acumula.
7. **Dificultad**: solo cuando hay datos del alumno en ese contenido (relativa a él: asequible, a su nivel,
   exigente).
8. **Sin contenido** para una destreza: se explica y se ofrecen alternativas reales (importar un examen,
   el examen de ejemplo, crear hojas con IA).

### Preparación estimada

Media ponderada por actualidad de los porcentajes de cada paper (paper completo ×3; hojas ×0,35 solo para
Reading & Use of English), convertida a la escala Cambridge con `percentToScale`. Intervalo:
14/√n por paper + 3 puntos por cada paper sin evaluar. Confianza: **alta** (≥ 3 papers de examen, ≥ 8 datos,
el último de hace ≤ 30 días), **media** (≥ 2 papers, ≥ 4 datos, ≤ 60 días), **baja** en otro caso. Sin
resultados se usa la prueba de nivel (confianza baja). **No se calcula ninguna probabilidad de aprobar** y
la interfaz lo dice expresamente.

## 7. Progresión

- **XP** (valores centralizados en `XP_REWARDS`): hoja nueva 30, hoja mejorada 15 (+25 de récord), hoja
  repetida sin mejorar 5 (una vez al día por hoja), sesión de repaso 20 (≥ 3 respuestas, máx. 3 al día),
  pregunta dominada 15 (una vez por error), error recurrente dominado +30, sesión del plan 50, paper
  completo 100 / partes 40 (el primero del día por paper; repetirlo, 20), repaso de examen 20, corrección
  de IA revisada 10, misiones 15/40, logros 10/25/50/100 según rareza. Añadir errores a mano no da XP.
- **Niveles**: `xpToNext(n) = 100 + 30·(n−1) + 2·(n−1)²`, sin tope. Rangos con nombres originales en
  inglés, independientes del MCER.
- **Nada se pierde por inactividad.** Las rachas cuentan días; la racha del plan no se rompe en los días de
  descanso planificados.
- **Misiones**: 2 diarias y 3 semanales elegidas de forma estable para el periodo (se guardan), sin cuenta
  atrás ni penalización; no duplican lo que ya pide el plan.
- **Modo administrador** (2.0.1): `settings.admin = { enabled, outfit }`. Con él activo, `useLearning()`
  muestra el nivel `ADMIN_LEVEL` (100) y `isUnlocked(..., all = true)` desbloquea todos los cosméticos.
  Es solo de vista: no genera eventos, XP ni logros, y `equip()` escribe en `settings.admin.outfit` en vez
  de en `game.json`. Al desactivarlo se descarta ese atuendo y reaparecen el nivel y el equipamiento reales.
  La contraseña está en el código (no es una medida de seguridad, solo evita activarlo por accidente).

## 8. Seguridad

Revisión de lo nuevo:

| Elemento | Medidas |
|---|---|
| `learning:load` | Sin parámetros. Solo lee `learning/` dentro de la carpeta de datos. |
| `learning:save(name, value)` | `name` en lista blanca (`notebook`, `game`, `plan`); `value` debe ser un objeto, máx. 25 MB; se **valida y normaliza** con `parseNotebook/parseGame/parsePlan` (tipos, límites de longitud, enumerados, XP por entrada entre 1 y 1000) antes de fusionar y escribir de forma atómica. |
| `learning:openBackup` | Ruta tomada de `meta.json` del proceso principal y comprobada dentro de la carpeta de datos. |
| `files:saveImage(name, bytes)` | `Uint8Array` de máx. 15 MB con firma PNG; nombre saneado; el destino lo elige el usuario en el diálogo del sistema. |
| Prompts de IA | Nada se envía solo. El texto se previsualiza y el alumno elige qué datos incluye; los ids internos no salen (se usan alias E1, E2…). Las respuestas pegadas se validan estrictamente (formato, ids, longitudes, competencias de la taxonomía, nunca pronunciación) y se muestran como texto (React escapa todo). Las hojas usan el validador de siempre. |
| Tarjeta de progreso | SVG generado con texto escapado, convertido a PNG en un `<canvas>` local. Sin cambios en la CSP (ya permitía `data:` y `blob:` en imágenes). |
| Notificaciones, filtros, vista del calendario | `localStorage` del equipo; nada sensible. |
| Ventana | Sin cambios: `contextIsolation`, `sandbox`, sin `nodeIntegration`, sin navegación ni ventanas nuevas, CSP estricta en producción, solo permiso de micrófono. |

## 9. Rendimiento

- Pantallas nuevas cargadas bajo demanda (`lazy`), contexto de aprendizaje separado y valores memoizados.
- El cuaderno renderiza por bloques de 60 al hacer scroll (`IntersectionObserver`) y usa
  `content-visibility: auto` en cada tarjeta.
- La previsión del calendario es de 42 días en «Mi plan» y de 7 en el inicio.
- Escrituras agrupadas (como mucho una cada ~0,7 s por documento) y al cerrar la ventana.
- Medido en `tests/learningPerf.test.ts` (un año de uso: 1.500 actividades y 3.000 errores): sesión del día
  ≈ 25 ms, previsión de 7 días ≈ 70 ms, búsqueda con erratas en 3.000 errores ≈ 60 ms, migración de 50
  hojas ≈ 65 ms.
- Animaciones solo con `transform` y `opacity`; Bubi se pausa fuera de la vista; movimiento reducido del
  sistema o de Ajustes (reducido/ninguno).

## 10. Limitaciones conocidas

- **Hojas repetidas**: el progreso de 1.x solo guarda la última comprobación de cada hoja; el historial
  anterior a 2.0 cuenta una por hoja.
- **Exámenes en el repaso**: las preguntas de examen no se pueden mostrar fuera de su PDF/audio; se repasan
  abriendo un intento de repaso con esas preguntas (desde el repaso, el cuaderno o los resultados).
- **Writing y Speaking**: no hay corrección automática; sus errores vienen de la corrección de IA pegada y
  se repasan con autoevaluación. La pronunciación solo se puede anotar a mano.
- **Clasificación de errores**: se deduce solo con pistas claras (tipo de tarea, respuesta, palabras de la
  explicación); muchos errores de opción múltiple quedan sin competencia hasta que el alumno o una IA la
  asignan.
- **Versiones mixtas con carpeta sincronizada**: si un equipo sigue en 1.9.2 y guarda los ajustes, se
  pierden los campos de apariencia nuevos (tema OLED/Midnight vuelve a «Sistema»). Los datos de
  aprendizaje no se ven afectados. Conviene actualizar todos los equipos.
- **Preparación estimada**: aproximación basada en material de práctica; con pocos datos el intervalo es
  ancho a propósito.
- **Tarjeta de progreso**: usa fuentes del sistema (la imagen no puede cargar las fuentes de la app).

## 11. Pendiente y mejoras recomendadas

- Guardar un historial de comprobaciones por hoja (no solo la última) para estadísticas más finas.
- Repaso «en contexto» de preguntas de examen mostrando la página del PDF en la propia tarjeta.
- Clasificador de errores de vocabulario más rico (listas de colocaciones y phrasal verbs).
- Exportar e importar el cuaderno en formato propio para pasar errores entre alumnos o con un profesor.
- Vista de calendario con varias semanas de previsión editable (fijar actividades futuras concretas).
- Pruebas visuales automáticas (capturas de referencia) de los temas OLED y Midnight Blue.
