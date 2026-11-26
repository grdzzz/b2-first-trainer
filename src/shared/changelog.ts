// Novedades de cada versión, para el panel «Novedades» que aparece tras actualizar.
// Textos para el usuario: cortos, claros y sin tecnicismos. La más reciente, primero.
import { compareVersions } from './updates'

export type ChangeIcon = 'level' | 'sparkles' | 'mascot' | 'loading' | 'video' | 'check' | 'review' | 'bell' | 'writing' | 'sheets' | 'sync' | 'plan' | 'notebook' | 'trophy' | 'command'

export interface ChangeItem {
  icon: ChangeIcon
  title: string
  text: string
}

export interface ChangelogEntry {
  version: string
  items: ChangeItem[]
  /** Recorrido guiado opcional cuando la versión cambia menús o secciones. */
  tour?: 'v2'
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.0.1',
    items: [
      { icon: 'bell', title: 'Avisos que se leen bien', text: 'El panel de avisos se abre al lado de la barra lateral, ya no se corta y cada aviso muestra su título, el texto y la hora ordenados.' },
      { icon: 'sparkles', title: 'Inicio más ordenado', text: 'El inicio va en dos columnas: a la izquierda lo de hoy (tu sesión, la semana, las misiones) y a la derecha tu objetivo, tu nivel, los repasos y los próximos hitos.' },
      { icon: 'check', title: 'Recorrido por las novedades', text: 'Cuando una versión cambia menús o secciones, el panel de novedades te ofrece un recorrido opcional para verlas en un minuto.' },
      { icon: 'level', title: 'Modo administrador', text: 'En Ajustes, con contraseña, puedes ver todos los niveles y accesorios de Bubi. Al desactivarlo vuelves a tu nivel y a lo que llevaba puesto Bubi.' }
    ]
  },
  {
    version: '2.0.0',
    tour: 'v2',
    items: [
      { icon: 'plan', title: 'Mi plan', text: 'Un plan de estudio a tu medida: cada día una sesión con el tiempo que tienes, que se ajusta sola a tus resultados y tus errores, con calendario y tu preparación estimada para el examen.' },
      { icon: 'notebook', title: 'Mis errores', text: 'Todos tus fallos (hojas, exámenes, Writing, Speaking…) en un cuaderno con la respuesta correcta y su explicación, con búsqueda, filtros, repasos a medida y ejercicios personalizados con IA.' },
      { icon: 'trophy', title: 'Niveles, logros y misiones', text: 'Gana experiencia aprendiendo, desbloquea más de 50 logros y viste a Bubi con accesorios. Nada se pierde por descansar y se puede ocultar en Ajustes.' },
      { icon: 'command', title: 'Más rápida y personalizable', text: 'Nuevo inicio, barra lateral agrupada, paleta de comandos (Ctrl + K), temas OLED y Midnight Blue, color de acento y densidad. Tus datos de antes se han incorporado y se guardó una copia de seguridad.' }
    ]
  },
  {
    version: '1.9.2',
    items: [
      { icon: 'level', title: 'Prueba de nivel más clara', text: 'Mejor espaciado en la presentación de la prueba y, en la pregunta sobre una frase del texto, la frase sale resaltada y el texto se desplaza hasta ella.' }
    ]
  },
  {
    version: '1.9.1',
    items: [
      { icon: 'sparkles', title: 'Tarjetas más estables', text: 'Las tarjetas de la bienvenida, el inicio, los exámenes y las hojas ya no tiemblan si dejas el ratón justo en su borde, y vuelven a elevarse un poco al pasar por encima.' }
    ]
  },
  {
    version: '1.9.0',
    items: [
      { icon: 'level', title: 'Prueba de nivel', text: 'Una prueba corta (24 preguntas, unos 10 minutos) te dice tu nivel aproximado (B1, B2, C1…) con su nota en la escala Cambridge y te recomienda qué practicar.' },
      { icon: 'mascot', title: 'Bubi cobra vida', text: 'Respira, parpadea, te sigue con la mirada, celebra tus aciertos, se entristece un poco con los fallos, se duerme si te vas un rato y reacciona cuando le haces clic.' },
      { icon: 'loading', title: 'Cargas más suaves', text: 'Mientras algo se carga ves la forma de la pantalla en lugar de un hueco en blanco, y nada salta de sitio al terminar.' },
      { icon: 'sparkles', title: 'Novedades', text: 'Este panel: después de cada actualización te contamos lo que ha cambiado. Puedes volver a verlo en Ajustes.' }
    ]
  },
  {
    version: '1.8.0',
    items: [
      { icon: 'video', title: 'Listening con vídeo', text: 'Puedes importar un vídeo en lugar del audio y verlo en grande mientras respondes.' },
      { icon: 'check', title: 'Tipo de preguntas y corrección a mano', text: 'Sin PDF ni clave, eliges el tipo de preguntas de cada parte y al final marcas tú cada respuesta como bien o mal.' }
    ]
  },
  {
    version: '1.7.0',
    items: [
      { icon: 'review', title: 'Repaso de fallos', text: 'Lo que fallas en las hojas vuelve a salir a los pocos días hasta que lo dominas.' },
      { icon: 'mascot', title: 'Bubi', text: 'Una mascota que te acompaña y te cuenta qué toca hoy.' },
      { icon: 'bell', title: 'Recordatorio diario', text: 'Un aviso a la hora que elijas si ese día aún no has practicado.' },
      { icon: 'writing', title: 'Ayuda para Writing', text: 'Revisión automática y frases útiles mientras escribes (en práctica).' }
    ]
  },
  {
    version: '1.6.0',
    items: [
      { icon: 'sheets', title: '50 hojas de práctica', text: 'Ejercicios cortos de vocabulario, gramática, formación de palabras y lectura, con explicaciones.' },
      { icon: 'sync', title: 'Aviso entre ordenadores', text: 'Si abres la misma carpeta de datos en otro ordenador a la vez, la app te avisa.' }
    ]
  }
]

/** Entradas que hay que enseñar: las posteriores a `seen` hasta `current` (como mucho `max`). */
export function changesSince(seen: string | null, current: string, max = 3): ChangelogEntry[] {
  return CHANGELOG.filter((e) => compareVersions(e.version, current) <= 0 && (seen === null || compareVersions(e.version, seen) > 0)).slice(0, max)
}
