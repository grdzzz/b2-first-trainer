import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const COLORS = ['#3a54d6', '#8fa1ff', '#17734a', '#5ccf94', '#f0c36a', '#df9be3', '#f2a766']

/** Lluvia breve de confeti (lienzo propio, sin librerías). No se muestra con «reducir movimiento». */
export function Confetti({ pieces = 140, duration = 2600 }: { pieces?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || prefersReducedMotion()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
    }
    resize()
    const w = () => canvas.width
    const parts = Array.from({ length: pieces }, () => ({
      x: w() * (0.25 + Math.random() * 0.5),
      y: -20 * dpr - Math.random() * 120 * dpr,
      vx: (Math.random() - 0.5) * 9 * dpr,
      vy: (2 + Math.random() * 5) * dpr,
      size: (5 + Math.random() * 6) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.3 ? 'circle' : 'rect'
    }))
    const start = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const fade = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4))
      for (const p of parts) {
        p.vy += 0.12 * dpr
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2)
          ctx.fill()
        } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (elapsed < duration) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [pieces, duration])
  return <canvas ref={ref} className="confetti" aria-hidden />
}
