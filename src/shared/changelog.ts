// Novedades de cada versión, para el panel «Novedades» que aparece tras actualizar.
// Textos para el usuario: cortos, claros y sin tecnicismos. La más reciente, primero.
import { compareVersions } from './updates'

export type ChangeIcon = 'level' | 'sparkles' | 'mascot' | 'loading' | 'video' | 'check' | 'review' | 'bell' | 'writing' | 'sheets' | 'sync'

export interface ChangeItem {
  icon: ChangeIcon
  title: string
  text: string
}

export interface ChangelogEntry {
  version: string
  items: ChangeItem[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
