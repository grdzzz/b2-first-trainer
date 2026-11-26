# Changelog

Las notas para el usuario de cada versión están también en la app (panel «Novedades»,
`src/shared/changelog.ts`). Aquí, el detalle técnico.

## 2.0.0 · The Adaptive Learning Update

### Nuevo

- **Mi plan** (plan de estudio adaptativo): asistente de configuración en 4 pasos (fecha del examen
  opcional, puntuación y nivel objetivo, minutos por sesión, días de estudio y de descanso, preferencias,
  destrezas prioritarias, intensidad), sesión diaria generada por un motor local y determinista con el
  motivo de cada actividad, dificultad relativa al alumno, sustitución por alternativas equivalentes,
  replanificación automática (mientras la sesión no se ha empezado), calendario semanal y mensual con
  actividades previstas y hechas, descansos, examen, hitos, progreso semanal y arrastrar y soltar (o
  «Mover a…» con teclado), y **preparación estimada** con intervalo y nivel de confianza (sin
  probabilidades de aprobar).
- **Mis errores** (cuaderno inteligente): registro automático desde hojas, exámenes, repasos y
  correcciones de IA de Writing/Speaking, además de errores escritos a mano; taxonomía de 40 competencias;
  estados (nuevo, en aprendizaje, pendiente, recurrente, dominado); búsqueda tolerante a erratas, filtros
  persistentes, orden, favoritos, notas, vista de tarjetas y de lista, selección múltiple, menú contextual,
  deshacer al borrar, panel de detalle redimensionable, exportación (CSV, Markdown, JSON); sesiones de
  repaso específicas (hoy, recurrentes, pendientes, por competencia, por examen, antiguos,
  personalizada) sobre el mismo Leitner de siempre; detección de patrones explicables; prompts de IA a
  partir de errores (hojas, ejercicios equivalentes, centrados en recurrentes, explicaciones, lecciones) con
  vista previa, elección de datos y validación estricta.
- **Progresión**: XP con anti-repetición, niveles sin tope y rangos originales, 56 logros en 12 categorías
  y 4 rarezas con galería (filtros, búsqueda, detalle, favoritos), misiones diarias y semanales opcionales,
  rachas (también la del plan, que respeta los descansos), constancia y calendario de actividad.
- **Mi perfil**: avatar (Bubi o iniciales), nivel, rango, logros favoritos, tiempo de estudio, competencias
  dominadas, objetivo, récords, calendario de actividad estilo GitHub, historial de XP y de hitos, y
  exportación de una **tarjeta de progreso en PNG** eligiendo qué datos aparecen.
- **Bubi**: 11 actividades nuevas (calendario, leer, escribir, ordenador, música, resolver, bostezar,
  descansar, estudiar, bailar, trofeo) y reacciones de subir de nivel y baile; armario con 7 colores y 15
  accesorios (gorros, birrete, corona, gafas, auriculares, bufanda, pajarita, medalla, chapas, lápiz) que
  se desbloquean por nivel o logro y se adaptan a todas las expresiones.
- **Interfaz**: nuevo inicio con módulos ocultables y reordenables, barra lateral agrupada y contraíble
  (Ctrl/Cmd + B), paleta de comandos (Ctrl/Cmd + K) con búsqueda tolerante y comandos recientes, centro de
  avisos, celebraciones moderadas, ayuda de atajos («?»), pantalla de Estadísticas, temas OLED y Midnight
  Blue, 6 colores de acento, densidad compacta, intensidad de animaciones, visibilidad de la gamificación,
  atajos en las hojas (Ctrl + Intro, Alt + ↓/↑, A–D), skeletons y estados vacíos con Bubi en todas las
  secciones nuevas.

### Datos y migración

- Nueva carpeta `learning/` (`notebook.json`, `game.json`, `plan.json`, `meta.json`) con documentos
  versionados y fusión por registro de las copias en conflicto de carpetas sincronizadas.
- Migración automática e idempotente desde 1.9.2 con copia de seguridad verificada en
  `backups/pre-2.0.0-<fecha>/`. Ningún archivo existente cambia de formato.
- Detalle en [`docs/ARQUITECTURA-2.0.md`](docs/ARQUITECTURA-2.0.md).

### Seguridad

- 4 canales IPC nuevos, validados (lista blanca, tamaños, normalización de esquemas, firma PNG, rutas
  dentro de la carpeta de datos). Sin cambios en `contextIsolation`, `sandbox` ni CSP. Sin conexiones nuevas.

### Pruebas

- 102 pruebas unitarias nuevas (292 en total) y 12 E2E nuevas (30 en total). Incluyen contraste WCAG AA de
  todos los temas y acentos, idempotencia de recompensas, ausencia de bucles, fusión conmutativa,
  migración, recuperación de archivos dañados y rendimiento con un año de datos.
