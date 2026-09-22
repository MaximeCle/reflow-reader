import { ArrowLeft, ChevronDown, Settings2 } from 'lucide-react'
import styles from './TopBar.module.css'

interface TopBarProps {
  title: string
  /** 0 to 1. */
  progress: number
  onBack: () => void
  /** Whether this document has detected chapter titles worth listing. */
  hasChapters: boolean
  chaptersOpen: boolean
  onToggleChapters: () => void
  onToggleSettings: () => void
  settingsOpen: boolean
}

export function TopBar({
  title,
  progress,
  onBack,
  hasChapters,
  chaptersOpen,
  onToggleChapters,
  onToggleSettings,
  settingsOpen,
}: TopBarProps) {
  const percent = Math.round(progress * 100)

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <button type="button" className={styles.iconButton} onClick={onBack} aria-label="Retour à la bibliothèque">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>

        <h1 className={styles.title}>
          {hasChapters ? (
            <button
              type="button"
              className={styles.titleButton}
              onClick={onToggleChapters}
              data-chapters-toggle=""
              aria-expanded={chaptersOpen}
              aria-label={`Chapitres de « ${title} »`}
            >
              <span className={styles.titleText}>{title}</span>
              <ChevronDown size={13} className={styles.titleChevron} aria-hidden="true" />
            </button>
          ) : (
            <span className={styles.titleText} title={title}>
              {title}
            </span>
          )}
        </h1>

        <span className={styles.progress} aria-label={`Progression : ${percent} %`}>
          {percent} %
        </span>

        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleSettings}
          data-settings-toggle=""
          aria-expanded={settingsOpen}
          aria-label="Réglages de lecture"
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
      </div>
    </header>
  )
}
