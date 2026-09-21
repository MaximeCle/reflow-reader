import { useAtom } from 'jotai'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { settingsAtom } from '../../atoms/settings'
import { MAX_FONT_SIZE, MIN_FONT_SIZE, READING_FONTS } from '../../lib/storage/settings'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, update] = useAtom(settingsAtom)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      // The toggle button closes the panel itself; closing here too would
      // reopen it on the click that follows.
      if (ref.current?.contains(target ?? null) || target?.closest('[data-settings-toggle]')) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div ref={ref} className={styles.panel} role="dialog" aria-label="Réglages de lecture">
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

      <div className={styles.stackedRow}>
        <span className={styles.label}>Police</span>
        <div className={styles.fonts} role="group" aria-label="Police de lecture">
          {READING_FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              className={styles.fontButton}
              // Each option previews itself in the typeface it selects.
              style={{ fontFamily: font.stack }}
              aria-pressed={settings.font === font.id}
              onClick={() => update({ font: font.id })}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

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
