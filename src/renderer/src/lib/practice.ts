// Las 50 hojas incluidas viven en un módulo aparte que se carga solo al abrir la sección de práctica.
import { useEffect, useMemo, useState } from 'react'
import type { PracticeSheet } from '@shared/practice'
import { useApp } from './store'

let cache: PracticeSheet[] | null = null
let loading: Promise<PracticeSheet[]> | null = null

function loadBuiltIn(): Promise<PracticeSheet[]> {
  if (!loading) loading = import('@shared/practiceSheets').then((m) => (cache = m.BUILT_IN_SHEETS))
  return loading
}

/** Todas las hojas: primero las incluidas (por número) y después las creadas por el usuario. null mientras carga. */
export function useAllSheets(): PracticeSheet[] | null {
  const { customSheets } = useApp()
  const [builtIn, setBuiltIn] = useState<PracticeSheet[] | null>(cache)
  useEffect(() => {
    if (builtIn) return
    let alive = true
    void loadBuiltIn().then((s) => alive && setBuiltIn(s))
    return () => {
      alive = false
    }
  }, [builtIn])
  return useMemo(() => (builtIn ? [...builtIn, ...customSheets.slice().reverse()] : null), [builtIn, customSheets])
}
