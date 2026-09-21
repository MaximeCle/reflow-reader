import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { readerAtom } from './atoms/reader'
import { themeAtom } from './atoms/settings'
import { LibraryView } from './features/library/LibraryView'
import { ReaderView } from './features/reader/ReaderView'

const APP_NAME = 'reflow'

export function App() {
  const theme = useAtomValue(themeAtom)
  const reader = useAtomValue(readerAtom)
  const reading = reader !== null
  const title = reader?.entry.title

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])

  // A fresh document always starts at the top; restoring a position scrolls after.
  useEffect(() => {
    if (!reading) window.scrollTo({ top: 0 })
  }, [reading])

  return reading ? <ReaderView /> : <LibraryView />
}
