import { useAtom } from 'jotai'
import { Moon, Sun } from 'lucide-react'
import { settingsAtom } from '../../atoms/settings'
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from '../../lib/storage/settings'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, update] = useAtom(settingsAtom)

  return (
    <div
      className={styles.panel}
      role="dialog"
      aria-label="Réglages de lecture"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <label className={styles.row} htmlFor="font-size">
        <span className={styles.label}>Taille du texte</span>
        <span className={styles.value}>{settings.fontSize} px</span>
      </label>
      <input
        id="font-size"
        className={styles.slider}
        type="range"
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        step={1}
        value={settings.fontSize}
        onChange={(event) => update({ fontSize: Number(event.target.value) })}
      />

      <div className={styles.row}>
        <span className={styles.label}>Thème</span>
        <div className={styles.themes} role="group" aria-label="Thème">
          <button
            type="button"
            className={styles.themeButton}
            aria-pressed={settings.theme === 'light'}
            onClick={() => update({ theme: 'light' })}
          >
            <Sun size={15} aria-hidden="true" />
            Clair
          </button>
          <button
            type="button"
            className={styles.themeButton}
            aria-pressed={settings.theme === 'dark'}
            onClick={() => update({ theme: 'dark' })}
          >
            <Moon size={15} aria-hidden="true" />
            Sombre
          </button>
        </div>
      </div>
    </div>
  )
}
