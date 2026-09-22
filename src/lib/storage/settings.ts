export type Theme = 'light' | 'dark'

export type ReadingFont = 'literata' | 'source-serif' | 'work-sans' | 'inter'

export const READING_FONTS: ReadonlyArray<{ id: ReadingFont; label: string; stack: string }> = [
  { id: 'literata', label: 'Literata', stack: "'Literata', Georgia, serif" },
  { id: 'source-serif', label: 'Source Serif', stack: "'Source Serif 4', Georgia, serif" },
  { id: 'work-sans', label: 'Work Sans', stack: "'Work Sans', ui-sans-serif, system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', stack: "'Inter', ui-sans-serif, system-ui, sans-serif" },
]

export interface ReaderSettings {
  /** 16 to 24 px. */
  fontSize: number
  /** 1.3 to 2, unitless. */
  lineHeight: number
  theme: Theme
  font: ReadingFont
}

const KEY = 'reflow-reader:settings'

export const MIN_FONT_SIZE = 16
export const MAX_FONT_SIZE = 24
export const MIN_LINE_HEIGHT = 1.3
export const MAX_LINE_HEIGHT = 2

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function isReadingFont(value: unknown): value is ReadingFont {
  return READING_FONTS.some((font) => font.id === value)
}

export function defaultSettings(): ReaderSettings {
  return { fontSize: 17, lineHeight: 1.6, theme: systemTheme(), font: 'literata' }
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
          ? clamp(parsed.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE)
          : fallback.fontSize,
      lineHeight:
        typeof parsed.lineHeight === 'number'
          ? clamp(parsed.lineHeight, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT)
          : fallback.lineHeight,
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
