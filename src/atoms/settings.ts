import { atom } from 'jotai'
import {
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  clamp,
  loadSettings,
  saveSettings,
  type ReaderSettings,
} from '../lib/storage/settings'

const baseSettingsAtom = atom<ReaderSettings>(loadSettings())

export const settingsAtom = atom(
  (get) => get(baseSettingsAtom),
  (get, set, patch: Partial<ReaderSettings>) => {
    const next = { ...get(baseSettingsAtom), ...patch }
    next.fontSize = clamp(next.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE)
    next.lineHeight = clamp(next.lineHeight, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT)
    set(baseSettingsAtom, next)
    saveSettings(next)
  },
)
