import { atom } from 'jotai'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  loadSettings,
  saveSettings,
  type ReaderSettings,
} from '../lib/storage/settings'

const baseSettingsAtom = atom<ReaderSettings>(loadSettings())

export const settingsAtom = atom(
  (get) => get(baseSettingsAtom),
  (get, set, patch: Partial<ReaderSettings>) => {
    const next = { ...get(baseSettingsAtom), ...patch }
    next.fontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, next.fontSize))
    set(baseSettingsAtom, next)
    saveSettings(next)
  },
)
