export type Theme = 'light' | 'dark'

export type ReadingFont = 'literata' | 'source-serif' | 'work-sans'

export const READING_FONTS: ReadonlyArray<{ id: ReadingFont; label: string; stack: string }> = [
  { id: 'literata', label: 'Literata', stack: "'Literata', Georgia, serif" },
  { id: 'source-serif', label: 'Source Serif', stack: "'Source Serif 4', Georgia, serif" },
  { id: 'work-sans', label: 'Work Sans', stack: "'Work Sans', ui-sans-serif, system-ui, sans-serif" },
]

export interface ReaderSettings {
  /** 16 to 24 px. */
  fontSize: number
  theme: Theme
  font: ReadingFont
}

const KEY = 'reflow-reader:settings'

export const MIN_FONT_SIZE = 16
export const MAX_FONT_SIZE = 24

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function isReadingFont(value: unknown): value is ReadingFont {
  return READING_FONTS.some((font) => font.id === value)
}

export function defaultSettings(): ReaderSettings {
  return { fontSize: 17, theme: systemTheme(), font: 'literata' }
}

/** Read synchronously at startup so the theme never flashes. */
export function loadSettings(): ReaderSettings {
  const fallback = defaultSettings()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>
    return {
      fontSize:
        typeof parsed.fontSize === 'number'
          ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parsed.fontSize))
          : fallback.fontSize,
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : fallback.theme,
      font: isReadingFont(parsed.font) ? parsed.font : fallback.font,
    }
  } catch {
    return fallback
  }
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Private browsing or a full quota: settings just do not persist.
  }
}
