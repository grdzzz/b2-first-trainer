import { useCountUp } from '../lib/motion'
import { formatNumber } from '../i18n'

/** Número animado que cuenta hasta su valor. */
export function CountUp({ value, decimals = 0, duration }: { value: number; decimals?: number; duration?: number }) {
  const v = useCountUp(value, duration)
  return <>{formatNumber(decimals ? v : Math.round(v), decimals)}</>
}
