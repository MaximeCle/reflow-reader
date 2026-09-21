import { ArrowLeft, Bookmark, BookmarkCheck, Settings2 } from 'lucide-react'
import styles from './TopBar.module.css'

interface TopBarProps {
  title: string
  /** 0 to 1. */
  progress: number
  hasBookmark: boolean
  onBack: () => void
  onToggleBookmark: () => void
  onToggleSettings: () => void
  settingsOpen: boolean
}

export function TopBar({
  title,
  progress,
  hasBookmark,
  onBack,
  onToggleBookmark,
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

        <h1 className={styles.title} title={title}>
          {title}
        </h1>

        <span className={styles.progress} aria-label={`Progression : ${percent} %`}>
          {percent} %
        </span>

        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleBookmark}
          aria-pressed={hasBookmark}
          aria-label={hasBookmark ? 'Retirer le marque-page' : 'Poser un marque-page ici'}
        >
          {hasBookmark ? (
            <BookmarkCheck size={18} aria-hidden="true" />
          ) : (
            <Bookmark size={18} aria-hidden="true" />
          )}
        </button>

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
