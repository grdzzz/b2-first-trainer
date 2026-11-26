// Medalla original de cada logro: marco propio según la rareza (círculo, escudo, hexágono, estrella)
// con el glifo del logro dentro. Los secretos sin desbloquear muestran un candado.
import {
  Award, BookOpen, Bot, Brain, Bug, CalendarCheck, Check, ClipboardCheck, Command, Compass, Crown, Eye, Flag, Flame, Footprints, Gem, GraduationCap, Hammer,
  Headphones, Heart, Layers, Library, Lock, Map, Medal, MessageCircle, Mic, Moon, Mountain, NotebookPen, Palette, PenLine, Plus, Puzzle, Radar, Rocket, RotateCcw, ScrollText,
  Shirt, Shuffle, Sparkles, Sprout, Star, Sunrise, Swords, Target, Timer, TimerReset, TrendingUp, Trophy, Wand2, Zap
} from 'lucide-react'
import type { AchievementDef, AchievementGlyph, Rarity } from '@shared/learning/achievements'

const GLYPHS: Record<AchievementGlyph, typeof Award> = {
  footprints: Footprints, stopwatch: TimerReset, layers: Layers, medal: Medal, flag: Flag, award: Award, crown: Crown,
  book: BookOpen, books: Library, eye: Eye, puzzle: Puzzle, compass: Compass, shuffle: Shuffle, hammer: Hammer, zap: Zap, target: Target, gem: Gem,
  pen: PenLine, scroll: ScrollText, bot: Bot, headphones: Headphones, radar: Radar, mic: Mic, message: MessageCircle,
  rotate: RotateCcw, brain: Brain, bug: Bug, sparkles: Sparkles, swords: Swords, notebook: NotebookPen,
  flame: Flame, calendar: CalendarCheck, sprout: Sprout, mountain: Mountain, check: Check, clipboard: ClipboardCheck,
  trending: TrendingUp, trophy: Trophy, rocket: Rocket, graduation: GraduationCap,
  map: Map, command: Command, palette: Palette, wand: Wand2, plus: Plus,
  heart: Heart, shirt: Shirt, star: Star, moon: Moon, sunrise: Sunrise, timer: Timer
}

const FRAMES: Record<Rarity, string> = {
  common: 'M32 4 A28 28 0 1 1 31.99 4 Z',
  rare: 'M32 3 L56 12 V32 C56 46 46 56 32 61 C18 56 8 46 8 32 V12 Z',
  epic: 'M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z',
  legendary: 'M32 2 L39.5 14 L53 10.5 L50 24.5 L61 32 L50 39.5 L53 53.5 L39.5 50 L32 62 L24.5 50 L11 53.5 L14 39.5 L3 32 L14 24.5 L11 10.5 L24.5 14 Z'
}

export function AchievementBadge({ def, unlocked, size = 56 }: { def: AchievementDef; unlocked: boolean; size?: number }) {
  const Glyph = !unlocked && def.secret ? Lock : (GLYPHS[def.glyph] ?? Award)
  return (
    <span className={`ach-badge rarity-${def.rarity}${unlocked ? ' is-unlocked' : ''}`} style={{ width: size, height: size }} aria-hidden>
      <svg className="ach-svg" viewBox="0 0 64 64" width={size} height={size}>
        <path d={FRAMES[def.rarity]} className="ach-frame" />
        <path d={FRAMES[def.rarity]} className="ach-ring" transform="translate(32 32) scale(0.82) translate(-32 -32)" />
      </svg>
      <Glyph size={Math.round(size * 0.4)} className="ach-glyph" strokeWidth={2.2} />
    </span>
  )
}

export function rarityLabelKey(r: Rarity): `achievements.rarity.${Rarity}` {
  return `achievements.rarity.${r}`
}

