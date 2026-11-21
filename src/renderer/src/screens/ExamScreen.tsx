import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, FileAudio, FileText, KeyRound, Play, Plus, RotateCcw, ScanSearch, Timer, Trash2, X } from 'lucide-react'
import type { Attempt, AttemptMode, Exam, FileRef, Paper, Part, PartFiles, QuestionKind } from '@shared/types'
import { PAPER_ORDER } from '@shared/types'
import { B2_FIRST_TEMPLATE, buildPaper, buildPart, partHasKey, renumberPaper, resizePart } from '@shared/template'
import { applyKey, exportKeyJson, parseKeyText } from '@shared/keys'
import { applyDetection, detectStructure, type Detection } from '@shared/detect'
import { DetectModal } from '../components/DetectModal'
import { pendingMistakes } from '@shared/stats'
import { createAttempt } from '@shared/attempts'
import { errorMessage, useApp } from '../lib/store'
import { KeyEditor } from '../components/KeyEditor'
import { ConfirmDialog, Modal } from '../components/Modal'
import { PaperIcon, paperLabel } from '../components/PaperBadge'
import { formatDate, t, tn } from '../i18n'

type KeyScope = { paperId: string; partId?: string } | null
type DetectState = { paperId: string; detection: Detection | null; error?: string } | null

export function ExamScreen({ examId }: { examId: string }) {
  const app = useApp()
  const stored = app.exams.find((e) => e.id === examId)
  const [exam, setExam] = useState<Exam | undefined>(stored)
  const [keyScope, setKeyScope] = useState<KeyScope>(null)
  const [starting, setStarting] = useState<Paper | null>(null)
  const [detect, setDetect] = useState<DetectState>(null)
  const [confirm, setConfirm] = useState<{ title: string; message: string; action(): void } | null>(null)
  const pending = useRef<Exam | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flush = async () => {
    window.clearTimeout(timer.current)
    const next = pending.current
    pending.current = null
    if (!next) return
    try {
      await app.saveExam(next)
    } catch (e) {
      app.notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
    }
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => () => void flushRef.current(), [])

  if (!exam) {
    return (
      <div className="page">
        <p>{t('exam.notFound')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'library' })}>{t('common.back')}</button>
      </div>
    )
  }

  /** Cambios de edición: se guardan con un pequeño retardo. */
  const update = (next: Exam, immediate = false) => {
    setExam(next)
    pending.current = next
    window.clearTimeout(timer.current)
    if (immediate) void flush()
    else timer.current = window.setTimeout(() => void flush(), 500)
  }
  const updatePaper = (paperId: string, fn: (p: Paper) => Paper, immediate = false) =>
    update({ ...exam, papers: exam.papers.map((p) => (p.id === paperId ? fn(p) : p)) }, immediate)
  const updatePart = (paperId: string, partId: string, fn: (p: Part) => Part, immediate = false) =>
    updatePaper(paperId, (p) => ({ ...p, parts: p.parts.map((x) => (x.id === partId ? fn(x) : x)) }), immediate)

  const importFile = async (kind: 'pdf' | 'audio', current: PartFiles, apply: (files: PartFiles) => void): Promise<FileRef | null> => {
    try {
      const ref = await window.api.importExamFile(exam.id, kind)
      if (!ref) return null
      const old = current[kind]
      apply({ ...current, [kind]: ref })
      if (old) void window.api.removeExamFile(exam.id, old.storedName).catch(() => undefined)
      app.notify('success', t('exam.fileImported', { name: ref.name }))
      return ref
    } catch (e) {
      app.notify('error', t('exam.importFailed', { error: errorMessage(e) }))
      return null
    }
  }

  /** Lee el PDF y propone la estructura. En modo automático solo abre la ventana si encuentra algo. */
  const runDetection = async (paper: Paper, file: FileRef, auto: boolean) => {
    if (!auto) setDetect({ paperId: paper.id, detection: null })
    try {
      const { extractPdfLines } = await import('../lib/pdf')
      const pages = await extractPdfLines(await window.api.readExamFile(exam.id, file.storedName))
      const detection = detectStructure(pages, paper.type)
      if (auto && detection.parts.length === 0) {
        if (!detection.hasText) app.notify('info', t('detect.scanned'))
        return
      }
      setDetect({ paperId: paper.id, detection })
    } catch (e) {
      if (auto) app.notify('error', t('detect.error', { error: errorMessage(e) }))
      else setDetect({ paperId: paper.id, detection: null, error: errorMessage(e) })
    }
  }
  const removeFile = (kind: 'pdf' | 'audio', current: PartFiles, apply: (files: PartFiles) => void) => {
    const old = current[kind]
    const next = { ...current }
    delete next[kind]
    apply(next)
    if (old) void window.api.removeExamFile(exam.id, old.storedName).catch(() => undefined)
  }

  const missingPapers = PAPER_ORDER.filter((type) => !exam.papers.some((p) => p.type === type))
  const scopePaper = keyScope ? exam.papers.find((p) => p.id === keyScope.paperId) : undefined

  const exportKey = async () => {
    try {
      const path = await window.api.saveTextFile(`${exam.name} - clave.json`, exportKeyJson(exam))
      if (path) app.notify('success', t('exam.keyExported'))
    } catch (e) {
      app.notify('error', errorMessage(e))
    }
  }

  return (
    <div className="page">
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => app.navigate({ name: 'library' })}>
        <ArrowLeft size={16} aria-hidden /> {t('nav.library')}
      </button>
      <header className="page-header exam-header">
        <div className="grow">
          <label className="sr-only" htmlFor="exam-name">{t('library.name')}</label>
          <input id="exam-name" className="title-input h1" value={exam.name} onChange={(e) => update({ ...exam, name: e.target.value })} onBlur={() => !exam.name.trim() && update({ ...exam, name: t('exam.untitled') }, true)} maxLength={120} />
          <p className="text-subtle text-sm">{t('library.imported', { date: formatDate(exam.importedAt, { dateStyle: 'long' }) })}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportKey}>
          <Download size={16} aria-hidden /> {t('exam.exportKey')}
        </button>
      </header>

      <label className="field notes-field">
        <span className="field-label">{t('exam.notes')}</span>
        <textarea className="input" rows={2} value={exam.notes ?? ''} onChange={(e) => update({ ...exam, notes: e.target.value })} placeholder={t('exam.notesPlaceholder')} />
      </label>

      {exam.papers.map((paper) => (
        <PaperEditor
          key={paper.id}
          exam={exam}
          paper={paper}
          attempts={app.attempts}
          onChange={(fn, immediate) => updatePaper(paper.id, fn, immediate)}
          onPartChange={(partId, fn, immediate) => updatePart(paper.id, partId, fn, immediate)}
          onEditKey={(partId) => setKeyScope({ paperId: paper.id, partId })}
          onImport={importFile}
          onRemoveFile={removeFile}
          onStart={() => setStarting(paper)}
          onDetect={(file, auto) => void runDetection(paper, file, auto)}
          onDelete={() =>
            setConfirm({
              title: t('exam.deletePaperTitle'),
              message: t('exam.deletePaperMessage', { paper: paper.title }),
              action: () => update({ ...exam, papers: exam.papers.filter((p) => p.id !== paper.id) }, true)
            })
          }
          onDeletePart={(part) =>
            setConfirm({
              title: t('exam.deletePartTitle'),
              message: t('exam.deletePartMessage', { part: part.number }),
              action: () => updatePaper(paper.id, (p) => renumberPaper({ ...p, parts: p.parts.filter((x) => x.id !== part.id) }), true)
            })
          }
        />
      ))}

      {missingPapers.length > 0 && (
        <div className="add-papers">
          <span className="text-muted text-sm">{t('exam.addPaper')}</span>
          {missingPapers.map((type) => (
            <button
              key={type}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const spec = B2_FIRST_TEMPLATE.find((s) => s.type === type)!
                const papers = [...exam.papers, buildPaper(spec)].sort((a, b) => PAPER_ORDER.indexOf(a.type) - PAPER_ORDER.indexOf(b.type))
                update({ ...exam, papers }, true)
              }}
            >
              <Plus size={15} aria-hidden /> {paperLabel(type)}
            </button>
          ))}
        </div>
      )}

      {keyScope && scopePaper && (
        <KeyEditor
          open
          exam={exam}
          paperId={keyScope.paperId}
          partId={keyScope.partId}
          onClose={() => setKeyScope(null)}
          onSave={(next, report) => {
            update(next, true)
            setKeyScope(null)
            app.notify('success', t('keyEditor.saved', { n: report.applied }))
          }}
        />
      )}

      {starting && (
        <StartModal
          exam={exam}
          paper={starting}
          attempts={app.attempts}
          onClose={() => setStarting(null)}
          onStart={async (mode, partIds, questionIds) => {
            try {
              await flush()
              const attempt = await app.saveAttempt(createAttempt(exam, { mode, paperId: starting.id, partIds, questionIds }))
              setStarting(null)
              app.navigate({ name: 'attempt', attemptId: attempt.id })
            } catch (e) {
              app.notify('error', errorMessage(e))
            }
          }}
        />
      )}

      {detect && exam.papers.some((p) => p.id === detect.paperId) && (
        <DetectModal
          paper={exam.papers.find((p) => p.id === detect.paperId)!}
          detection={detect.detection}
          error={detect.error}
          onClose={() => setDetect(null)}
          onApply={({ applyTime, applyKey: withKey }) => {
            const det = detect.detection!
            let next: Exam = { ...exam, papers: exam.papers.map((p) => (p.id === detect.paperId ? applyDetection(p, det, { applyTime }) : p)) }
            if (withKey && det.keyText) next = applyKey(next, parseKeyText(det.keyText), { paperId: detect.paperId }).exam
            update(next, true)
            setDetect(null)
            app.notify('success', t('detect.applied'))
          }}
        />
      )}

      <datalist id="category-suggestions">
        {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
      </datalist>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.action()
          setConfirm(null)
        }}
      />
    </div>
  )
}

interface PaperEditorProps {
  exam: Exam
  paper: Paper
  attempts: Attempt[]
  onChange(fn: (p: Paper) => Paper, immediate?: boolean): void
  onPartChange(partId: string, fn: (p: Part) => Part, immediate?: boolean): void
  onEditKey(partId?: string): void
  onImport(kind: 'pdf' | 'audio', current: PartFiles, apply: (f: PartFiles) => void): Promise<FileRef | null>
  onRemoveFile(kind: 'pdf' | 'audio', current: PartFiles, apply: (f: PartFiles) => void): void
  onStart(): void
  onDetect(file: FileRef, auto: boolean): void
  onDelete(): void
  onDeletePart(part: Part): void
}

function PaperEditor({ exam, paper, attempts, onChange, onPartChange, onEditKey, onImport, onRemoveFile, onStart, onDetect, onDelete, onDeletePart }: PaperEditorProps) {
  const auto = paper.type === 'reading' || paper.type === 'listening'
  const keyed = paper.parts.filter(partHasKey).length
  const pending = useMemo(() => pendingMistakes(exam, paper.id, attempts).length, [exam, paper.id, attempts])
  const setPaperFiles = (files: PartFiles) => onChange((p) => ({ ...p, files }), true)

  return (
    <section className={`card paper-section paper-${paper.type}`} aria-labelledby={`paper-${paper.id}`}>
      <header className="paper-section-head">
        <div className="paper-section-title">
          <PaperIcon type={paper.type} size={22} />
          <h2 id={`paper-${paper.id}`} className="h2">{paper.title}</h2>
        </div>
        <div className="paper-section-actions">
          <label className="inline-field" title={t('exam.timeHint')}>
            <Timer size={16} aria-hidden />
            <span className="sr-only">{t('exam.timeLimit')}</span>
            <input
              type="number"
              className="input input-sm input-num"
              min={0}
              max={600}
              value={paper.timeLimitMin ?? 0}
              onChange={(e) => onChange((p) => ({ ...p, timeLimitMin: Math.max(0, Math.min(600, Number(e.target.value) || 0)) }))}
              aria-label={t('exam.timeLimit')}
            />
            <span className="text-muted text-sm">min</span>
          </label>
          <button type="button" className="btn btn-primary" onClick={onStart}>
            <Play size={16} aria-hidden /> {t('exam.start')}
          </button>
          <button type="button" className="icon-btn" onClick={onDelete} aria-label={t('exam.deletePaperNamed', { paper: paper.title })} title={t('exam.deletePaperTitle')}>
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className="paper-files">
      <div className="paper-meta">
        <FileSlot
          label={t('exam.paperPdf')}
          kind="pdf"
          file={paper.files.pdf}
          onImport={async () => {
            const ref = await onImport('pdf', paper.files, setPaperFiles)
            if (ref) onDetect(ref, true)
          }}
          onRemove={() => onRemoveFile('pdf', paper.files, setPaperFiles)}
        />
        {paper.files.pdf && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDetect(paper.files.pdf!, false)} title={t('detect.buttonHint')}>
            <ScanSearch size={15} aria-hidden /> {t('detect.button')}
          </button>
        )}
        {paper.type === 'listening' && (
          <FileSlot label={t('exam.paperAudio')} kind="audio" file={paper.files.audio} onImport={() => onImport('audio', paper.files, setPaperFiles)} onRemove={() => onRemoveFile('audio', paper.files, setPaperFiles)} />
        )}
        {auto && (
          <div className="key-summary">
            <KeyRound size={16} aria-hidden />
            <span>{t('exam.keyParts', { n: keyed, total: paper.parts.length })}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEditKey()}>{t('exam.editPaperKey')}</button>
            {pending > 0 && <span className="pill pill-warning"><RotateCcw size={13} aria-hidden /> {tn('exam.pendingMistakes', pending)}</span>}
          </div>
        )}
      </div>
      <p className="text-subtle text-sm hint">{t('exam.filesHint')}</p>
      </div>

      <ol className="part-list">
        {paper.parts.map((part) => (
          <PartEditor
            key={part.id}
            paper={paper}
            part={part}
            onChange={(fn, immediate) => onPartChange(part.id, fn, immediate)}
            onStructureChange={(fn) => onChange((p) => renumberPaper({ ...p, parts: p.parts.map((x) => (x.id === part.id ? fn(x) : x)) }))}
            onEditKey={() => onEditKey(part.id)}
            onImport={(kind) => onImport(kind, part.files, (files) => onPartChange(part.id, (x) => ({ ...x, files }), true))}
            onRemoveFile={(kind) => onRemoveFile(kind, part.files, (files) => onPartChange(part.id, (x) => ({ ...x, files }), true))}
            onDelete={() => onDeletePart(part)}
          />
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          const last = paper.parts[paper.parts.length - 1]
          const kind: QuestionKind = last?.questions[0]?.kind ?? (paper.type === 'writing' ? 'essay' : paper.type === 'speaking' ? 'speaking' : 'choice')
          const newPart = buildPart({ title: t('exam.newPart'), category: t('exam.newPart'), count: kind === 'essay' || kind === 'speaking' ? 1 : 5, kind, options: 4 }, paper.parts.length + 1, 1)
          onChange((p) => renumberPaper({ ...p, parts: [...p.parts, newPart] }), true)
        }}
      >
        <Plus size={15} aria-hidden /> {t('exam.addPart')}
      </button>
    </section>
  )
}

function FileSlot({ label, kind, file, onImport, onRemove, compact }: { label: string; kind: 'pdf' | 'audio'; file?: FileRef; onImport(): void; onRemove(): void; compact?: boolean }) {
  const Icon = kind === 'pdf' ? FileText : FileAudio
  return (
    <div className={`file-slot${file ? ' has-file' : ''}${compact ? ' file-slot-compact' : ''}`}>
      <Icon size={16} aria-hidden />
      {file ? (
        <>
          <span className="file-name" title={file.name}>{file.name}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onImport}>{t('exam.replace')}</button>
          <button type="button" className="icon-btn icon-btn-sm" onClick={onRemove} aria-label={t('exam.removeFile', { name: file.name })}><X size={14} aria-hidden /></button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost btn-xs" onClick={onImport}>{label}</button>
      )}
    </div>
  )
}

const CATEGORY_SUGGESTIONS = Array.from(new Set(B2_FIRST_TEMPLATE.flatMap((p) => p.parts.map((x) => x.category))))
const KIND_OPTIONS: QuestionKind[] = ['choice', 'text', 'essay', 'speaking']

interface PartEditorProps {
  paper: Paper
  part: Part
  onChange(fn: (p: Part) => Part, immediate?: boolean): void
  onStructureChange(fn: (p: Part) => Part): void
  onEditKey(): void
  onImport(kind: 'pdf' | 'audio'): void
  onRemoveFile(kind: 'pdf' | 'audio'): void
  onDelete(): void
}

function PartEditor({ paper, part, onChange, onStructureChange, onEditKey, onImport, onRemoveFile, onDelete }: PartEditorProps) {
  const kind = part.questions[0]?.kind ?? 'text'
  const first = part.questions[0]
  const gradable = kind === 'choice' || kind === 'text'
  const keyed = part.questions.filter((q) => q.answers?.length).length
  const range = part.questions.length ? `${part.questions[0].number}–${part.questions[part.questions.length - 1].number}` : '—'
  const idp = `part-${part.id}`

  return (
    <li className="part-row">
      <div className="part-row-num" aria-hidden>{part.number}</div>
      <div className="part-row-body">
        <div className="part-fields">
          <label className="field field-grow">
            <span className="field-label">{t('exam.partTitle', { n: part.number })}</span>
            <input className="input input-sm" value={part.title} onChange={(e) => onChange((p) => ({ ...p, title: e.target.value }))} />
          </label>
          <label className="field">
            <span className="field-label">{t('exam.category')}</span>
            <input className="input input-sm" value={part.category} onChange={(e) => onChange((p) => ({ ...p, category: e.target.value }))} list="category-suggestions" />
          </label>
          <label className="field">
            <span className="field-label">{t('exam.kind')}</span>
            <select className="input input-sm" value={kind} onChange={(e) => onStructureChange((p) => resizePart(p, p.questions.length, e.target.value as QuestionKind, first?.options?.length ?? 4))}>
              {KIND_OPTIONS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
            </select>
          </label>
          <label className="field field-num">
            <span className="field-label">{t('exam.questions')}</span>
            <input type="number" className="input input-sm input-num" min={1} max={100} value={part.questions.length} onChange={(e) => onStructureChange((p) => resizePart(p, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          {kind === 'choice' && (
            <label className="field field-num">
              <span className="field-label">{t('exam.options')}</span>
              <input type="number" className="input input-sm input-num" min={2} max={12} value={first?.options?.length ?? 4} onChange={(e) => onStructureChange((p) => resizePart(p, p.questions.length, undefined, Math.max(2, Math.min(12, Number(e.target.value) || 2))))} />
            </label>
          )}
          {kind !== 'choice' && <div className="field field-num field-placeholder" aria-hidden />}
          {gradable ? (
            <label className="field field-num">
              <span className="field-label">{t('exam.points')}</span>
              <input type="number" className="input input-sm input-num" min={0} max={10} step={0.5} value={first?.points ?? 1} onChange={(e) => onChange((p) => ({ ...p, questions: p.questions.map((q) => ({ ...q, points: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })) }))} />
            </label>
          ) : (
            <div className="field field-num field-placeholder" aria-hidden />
          )}
        </div>
        <div className="part-meta">
          <span className="text-subtle text-sm">{t('exam.range', { range })}</span>
          {paper.files.pdf && !part.files.pdf && (
            <label className="inline-field text-sm" title={t('exam.pageHint')}>
              <span>{t('exam.page')}</span>
              <input type="number" className="input input-sm page-input" min={1} max={999} value={part.pdfPage ?? ''} placeholder="—" onChange={(e) => onChange((p) => ({ ...p, pdfPage: Number(e.target.value) > 0 ? Math.min(999, Math.floor(Number(e.target.value))) : undefined }))} />
            </label>
          )}
          <FileSlot compact label={t('exam.partPdf')} kind="pdf" file={part.files.pdf} onImport={() => onImport('pdf')} onRemove={() => onRemoveFile('pdf')} />
          {paper.type === 'listening' && <FileSlot compact label={t('exam.partAudio')} kind="audio" file={part.files.audio} onImport={() => onImport('audio')} onRemove={() => onRemoveFile('audio')} />}
          {gradable && (
            <button type="button" className={`btn btn-xs ${keyed ? 'btn-ghost' : 'btn-secondary'}`} onClick={onEditKey}>
              <KeyRound size={14} aria-hidden /> {keyed ? t('exam.keyCount', { n: keyed, total: part.questions.length }) : t('exam.addKey')}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="icon-btn icon-btn-sm" onClick={onDelete} aria-label={t('exam.deletePartNamed', { n: part.number })} title={t('exam.deletePartTitle')}>
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
        {(kind === 'essay' || kind === 'speaking') && (
          <div className="prompts">
            {part.questions.map((q) => (
              <label key={q.id} className="field">
                <span className="field-label">{t('exam.prompt')}{part.questions.length > 1 ? ` · ${q.number}` : ''}</span>
                <textarea
                  id={`${idp}-${q.id}`}
                  className="input"
                  rows={4}
                  value={q.prompt ?? ''}
                  placeholder={t('exam.promptPlaceholder')}
                  onChange={(e) => onChange((p) => ({ ...p, questions: p.questions.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)) }))}
                />
              </label>
            ))}
            {kind === 'essay' && (
              <div className="part-fields">
                <label className="field field-num">
                  <span className="field-label">{t('exam.minWords')}</span>
                  <input type="number" className="input input-sm input-num" min={0} max={2000} value={first?.minWords ?? 140} onChange={(e) => onChange((p) => ({ ...p, questions: p.questions.map((q) => ({ ...q, minWords: Math.max(0, Number(e.target.value) || 0) })) }))} />
                </label>
                <label className="field field-num">
                  <span className="field-label">{t('exam.maxWords')}</span>
                  <input type="number" className="input input-sm input-num" min={0} max={2000} value={first?.maxWords ?? 190} onChange={(e) => onChange((p) => ({ ...p, questions: p.questions.map((q) => ({ ...q, maxWords: Math.max(0, Number(e.target.value) || 0) })) }))} />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

interface StartModalProps {
  exam: Exam
  paper: Paper
  attempts: Attempt[]
  onClose(): void
  onStart(mode: AttemptMode, partIds: string[], questionIds?: string[]): void
}

function StartModal({ exam, paper, attempts, onClose, onStart }: StartModalProps) {
  const [mode, setMode] = useState<AttemptMode>('practice')
  const [parts, setParts] = useState<string[]>(paper.parts.map((p) => p.id))
  const pending = useMemo(() => pendingMistakes(exam, paper.id, attempts), [exam, paper.id, attempts])
  const full = parts.length === paper.parts.length
  const timed = mode === 'exam' && full && (paper.timeLimitMin ?? 0) > 0
  const canStart = mode === 'review' ? pending.length > 0 : parts.length > 0
  const auto = paper.type === 'reading' || paper.type === 'listening'

  const modes: Array<{ id: AttemptMode; title: string; desc: string; disabled?: boolean }> = [
    { id: 'exam', title: t('modes.exam'), desc: t('start.examDesc') },
    { id: 'practice', title: t('modes.practice'), desc: t('start.practiceDesc') },
    { id: 'review', title: t('modes.review'), desc: auto ? t('start.reviewDesc', { n: pending.length }) : t('start.reviewNotAvailable'), disabled: !auto }
  ]

  return (
    <Modal
      open
      title={t('start.title', { paper: paper.title })}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={!canStart} onClick={() => (mode === 'review' ? onStart(mode, [], pending) : onStart(mode, parts))}>
            <Play size={16} aria-hidden /> {t('start.go')}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <fieldset className="field">
          <legend className="field-label">{t('start.mode')}</legend>
          <div className="mode-grid" role="radiogroup">
            {modes.map((m) => (
              <label key={m.id} className={`mode-card${mode === m.id ? ' is-selected' : ''}${m.disabled ? ' is-disabled' : ''}`}>
                <input type="radio" name="mode" value={m.id} checked={mode === m.id} disabled={m.disabled} onChange={() => setMode(m.id)} />
                <span className="mode-title">{m.title}</span>
                <span className="mode-desc">{m.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {mode !== 'review' && (
          <fieldset className="field">
            <legend className="field-label">{t('start.parts')}</legend>
            <div className="check-grid">
              {paper.parts.map((p) => (
                <label key={p.id} className="check-card">
                  <input type="checkbox" checked={parts.includes(p.id)} onChange={(e) => setParts((xs) => (e.target.checked ? paper.parts.filter((x) => x.id === p.id || xs.includes(x.id)).map((x) => x.id) : xs.filter((x) => x !== p.id)))} />
                  <span>{t('start.partLabel', { n: p.number, title: p.title })}</span>
                  {auto && !partHasKey(p) && <span className="pill pill-muted">{t('start.noKey')}</span>}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {mode === 'exam' && (
          <p className={`notice ${timed ? '' : 'notice-warning'}`}>
            <Timer size={16} aria-hidden />
            {timed ? t('start.timed', { min: paper.timeLimitMin ?? 0 }) : t('start.untimed')}
          </p>
        )}
      </div>
    </Modal>
  )
}

