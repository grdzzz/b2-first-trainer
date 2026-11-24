import { useState } from 'react'
import { Sk, SkeletonRegion, SkText } from './Skeleton'
import { MascotSvg } from './Mascot'
import { useApp } from '../lib/store'
import { CheckCircle2, CircleAlert, ScanSearch } from 'lucide-react'
import type { Paper } from '@shared/types'
import type { Detection } from '@shared/detect'
import { Modal } from './Modal'
import { t, tn } from '../i18n'

interface Props {
  paper: Paper
  /** null mientras se analiza el PDF. */
  detection: Detection | null
  error?: string
  onClose(): void
  onApply(opts: { applyTime: boolean; applyKey: boolean }): void
}

export function DetectModal({ paper, detection, error, onClose, onApply }: Props) {
  const [applyTime, setApplyTime] = useState(true)
  const [applyKey, setApplyKey] = useState(true)
  const { settings } = useApp()
  const d = detection
  const usable = !!d && d.parts.length > 0
  const timeDiffers = !!d?.timeLimitMin && d.timeLimitMin !== paper.timeLimitMin

  return (
    <Modal
      open
      size="lg"
      title={t('detect.title', { paper: paper.title })}
      description={t('detect.description')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={!usable} onClick={() => onApply({ applyTime: applyTime && timeDiffers, applyKey: applyKey && !!d?.keyText })}>
            <CheckCircle2 size={16} aria-hidden /> {t('detect.apply')}
          </button>
        </>
      }
    >
      {!d && !error && (
        <SkeletonRegion className="detect-loading" label={t('detect.reading')}>
          <div className="detect-loading-head">
            {settings.mascot ? <MascotSvg mood="thinking" size={56} /> : <ScanSearch size={28} aria-hidden />}
            <p>{t('detect.reading')}</p>
          </div>
          <p className="detect-summary"><SkText w="16em" /></p>
          <div className="sk-table">
            {Array.from({ length: 4 }, (_, i) => <Sk key={i} h="2.25rem" r="var(--radius-sm)" />)}
          </div>
        </SkeletonRegion>
      )}
      {error && <p className="field-error" role="alert">{t('detect.error', { error })}</p>}
      {d && !d.hasText && <p className="notice notice-warning"><CircleAlert size={16} aria-hidden /> {t('detect.scanned')}</p>}
      {d && d.hasText && d.parts.length === 0 && <p className="notice notice-warning"><CircleAlert size={16} aria-hidden /> {t('detect.nothing')}</p>}
      {usable && (
        <div className="form-stack">
          <p className="detect-summary">
            <strong>{tn('detect.parts', d.parts.length)}</strong>
            {d.timeLimitMin ? ` · ${t('detect.time', { min: d.timeLimitMin })}` : ''}
            {d.keyCount ? ` · ${tn('detect.key', d.keyCount)}` : ''}
          </p>
          <div className="table-scroll">
            <table className="data-table detect-table">
              <thead>
                <tr>
                  <th scope="col">{t('detect.colPart')}</th>
                  <th scope="col">{t('exam.category')}</th>
                  <th scope="col">{t('exam.kind')}</th>
                  <th scope="col">{t('exam.questions')}</th>
                  <th scope="col" className="num">{t('detect.colPage')}</th>
                </tr>
              </thead>
              <tbody>
                {d.parts.map((p) => (
                  <tr key={p.number}>
                    <td className="tabular">{p.number}</td>
                    <td>
                      <span className="detect-cat">
                        {p.recognized ? <CheckCircle2 size={14} aria-label={t('detect.recognized')} className="ok" /> : <CircleAlert size={14} aria-label={t('detect.unrecognized')} className="warn" />}
                        {p.category}
                      </span>
                      {p.prompt && <span className="detect-prompt">{p.prompt.replace(/\s+/g, ' ').slice(0, 140)}{p.prompt.length > 140 ? '…' : ''}</span>}
                    </td>
                    <td>
                      {t(`kinds.${p.kind}`)}
                      {p.kind === 'choice' && p.options ? ` (A–${String.fromCharCode(64 + p.options)})` : ''}
                      {p.kind === 'essay' && p.minWords ? ` · ${p.minWords}–${p.maxWords}` : ''}
                    </td>
                    <td className="tabular">{p.count === 1 ? p.firstQuestion : `${p.firstQuestion}–${p.firstQuestion + p.count - 1}`}</td>
                    <td className="num tabular">{p.page}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(timeDiffers || d.keyText) && (
            <div className="detect-options">
              {timeDiffers && (
                <label className="switch">
                  <input type="checkbox" checked={applyTime} onChange={(e) => setApplyTime(e.target.checked)} />
                  <span>{t('detect.applyTime', { min: d.timeLimitMin ?? 0, current: paper.timeLimitMin ?? 0 })}</span>
                </label>
              )}
              {d.keyText && (
                <label className="switch">
                  <input type="checkbox" checked={applyKey} onChange={(e) => setApplyKey(e.target.checked)} />
                  <span>{tn('detect.applyKey', d.keyCount)}</span>
                </label>
              )}
            </div>
          )}
          {d.warnings.length > 0 && (
            <ul className="issue-list">
              {d.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          <p className="text-subtle text-sm">{t('detect.replaceNote')}</p>
        </div>
      )}
    </Modal>
  )
}
