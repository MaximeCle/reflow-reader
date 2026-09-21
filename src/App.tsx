import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { readerAtom } from './atoms/reader'
import { themeAtom } from './atoms/settings'
import { LibraryView } from './features/library/LibraryView'
import { ReaderView } from './features/reader/ReaderView'

export function App() {
  const theme = useAtomValue(themeAtom)
  const reading = useAtomValue(readerAtom) !== null

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // A fresh document always starts at the top; restoring a position scrolls after.
  useEffect(() => {
    if (!reading) window.scrollTo({ top: 0 })
  }, [reading])

  return reading ? <ReaderView /> : <LibraryView />
}
