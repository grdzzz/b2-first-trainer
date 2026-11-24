import { describe, expect, it } from 'vitest'
import { baseFromMood, bubiExpression, bubiReducer, bubiView, DIZZY_CLICKS, initialMachine, type BubiEvent, type BubiMachine, type BubiState } from '../src/shared/mascot'

const run = (m: BubiMachine, ...events: BubiEvent[]) => events.reduce(bubiReducer, m)
const view = (m: BubiMachine) => bubiView(m).state

describe('máquina de estados de Bubi', () => {
  it('muestra el estado de fondo y lo cambia', () => {
    const m = initialMachine('thinking')
    expect(view(m)).toBe('thinking')
    expect(view(run(m, { type: 'SET_BASE', base: 'idle' }))).toBe('idle')
  })

  it('una reacción se muestra y al terminar vuelve al fondo', () => {
    let m = run(initialMachine(), { type: 'SIGNAL', signal: 'happy', rnd: 0 })
    expect(view(m)).toBe('happy')
    m = run(m, { type: 'REACTION_END', seq: m.reaction!.seq, rnd: 0 })
    expect(view(m)).toBe('idle')
  })

  it('ignora el final de una reacción anterior', () => {
    let m = run(initialMachine(), { type: 'SIGNAL', signal: 'happy', rnd: 0 })
    const old = m.reaction!.seq
    m = run(m, { type: 'SIGNAL', signal: 'celebration', rnd: 0 })
    m = run(m, { type: 'REACTION_END', seq: old, rnd: 0 })
    expect(view(m)).toBe('celebration')
  })

  it('respeta las prioridades: un clic no corta una celebración', () => {
    let m = run(initialMachine(), { type: 'SIGNAL', signal: 'celebration', rnd: 0 })
    m = run(m, { type: 'CLICK', now: 1000, rnd: 0.5 })
    expect(view(m)).toBe('celebration')
    // Pero un saludo sí cede ante un acierto.
    m = run(initialMachine(), { type: 'SIGNAL', signal: 'welcome', rnd: 0 }, { type: 'SIGNAL', signal: 'sad', rnd: 0 })
    expect(view(m)).toBe('sad')
  })

  it('un logro es sorpresa seguida de celebración', () => {
    let m = run(initialMachine(), { type: 'SIGNAL', signal: 'achievement', rnd: 0 })
    expect(view(m)).toBe('surprised')
    m = run(m, { type: 'REACTION_END', seq: m.reaction!.seq, rnd: 0 })
    expect(view(m)).toBe('celebration')
    m = run(m, { type: 'REACTION_END', seq: m.reaction!.seq, rnd: 0 })
    expect(view(m)).toBe('idle')
  })

  it('al pasar el ratón reacciona y al salir vuelve', () => {
    let m = run(initialMachine(), { type: 'POINTER_ENTER', rnd: 0 })
    expect(view(m)).toBe('hover')
    m = run(m, { type: 'POINTER_LEAVE' })
    expect(view(m)).toBe('idle')
  })

  it('los clics varían y no repiten la misma variante seguida', () => {
    let m = run(initialMachine(), { type: 'CLICK', now: 0, rnd: 0 })
    const first = bubiView(m)
    expect(first.state).toBe('poke')
    m = run(m, { type: 'CLICK', now: 100, rnd: 0 })
    expect(bubiView(m).variant).not.toBe(first.variant)
    // También tras terminar la reacción (clics separados en el tiempo).
    const second = bubiView(m).variant
    m = run(m, { type: 'REACTION_END', seq: m.reaction!.seq, rnd: 0 }, { type: 'CLICK', now: 9000, rnd: second / 3 + 0.01 })
    expect(bubiView(m).variant).not.toBe(second)
  })

  it('muchos clics seguidos lo marean', () => {
    let m = initialMachine()
    for (let i = 0; i < DIZZY_CLICKS; i++) m = run(m, { type: 'CLICK', now: i * 200, rnd: 0.1 })
    expect(bubiView(m)).toEqual({ state: 'surprised', variant: 1 })
    // Clics separados en el tiempo no cuentan.
    m = initialMachine()
    for (let i = 0; i < DIZZY_CLICKS; i++) m = run(m, { type: 'CLICK', now: i * 5000, rnd: 0.1 })
    expect(view(m)).toBe('poke')
  })

  it('se duerme por inactividad y se despierta al volver', () => {
    let m = run(initialMachine(), { type: 'INACTIVE' })
    expect(view(m)).toBe('sleeping')
    m = run(m, { type: 'ACTIVE', rnd: 0 })
    expect(view(m)).toBe('wakeUp')
    m = run(m, { type: 'REACTION_END', seq: m.reaction!.seq, rnd: 0 })
    expect(view(m)).toBe('idle')
  })

  it('no se duerme mientras piensa o celebra', () => {
    expect(view(run(initialMachine('thinking'), { type: 'INACTIVE' }))).toBe('thinking')
    // Con la celebración de fondo (tras practicar) sí puede dormirse.
    expect(view(run(initialMachine('celebration'), { type: 'INACTIVE' }))).toBe('sleeping')
    expect(view(run(initialMachine(), { type: 'SIGNAL', signal: 'celebration', rnd: 0 }, { type: 'INACTIVE' }))).toBe('celebration')
  })

  it('pasar el ratón o hacer clic lo despierta', () => {
    expect(view(run(initialMachine(), { type: 'INACTIVE' }, { type: 'POINTER_ENTER', rnd: 0 }))).toBe('wakeUp')
    expect(view(run(initialMachine(), { type: 'INACTIVE' }, { type: 'CLICK', now: 0, rnd: 0 }))).toBe('wakeUp')
  })

  it('cada estado tiene una expresión completa', () => {
    const states: BubiState[] = ['idle', 'welcome', 'cheer', 'sad', 'thinking', 'sleeping', 'celebration', 'happy', 'surprised', 'wakeUp', 'poke', 'hover']
    for (const s of states) for (const v of [0, 1, 2]) {
      const e = bubiExpression(s, v)
      expect(e.eyes).toBeTruthy()
      expect(e.mouth).toBeTruthy()
      expect(e.arms).toBeTruthy()
    }
    expect(bubiExpression('sleeping').eyes).toBe('closed')
    expect(bubiExpression('surprised').eyes).toBe('wide')
  })

  it('traduce los ánimos antiguos', () => {
    expect(baseFromMood('happy')).toBe('idle')
    expect(baseFromMood('wave')).toBe('welcome')
    expect(baseFromMood('celebrate')).toBe('celebration')
    expect(baseFromMood('oops')).toBe('sad')
    expect(baseFromMood('think')).toBe('thinking')
    expect(baseFromMood('sleep')).toBe('sleeping')
  })
})
