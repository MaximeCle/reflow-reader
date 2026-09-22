import { useAtomValue, useSetAtom } from 'jotai'
import { Check, Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { joinSyncAtom, leaveSyncAtom, syncStateAtom } from '../../atoms/sync'
import { generateSyncCode, isValidSyncCode, normalizeSyncCode } from '../../lib/sync/syncCode'
import styles from './SyncPanel.module.css'

interface SyncPanelProps {
  /** Called once a device has just joined a group, to pull its library in. */
  onJoined: () => void
}

export function SyncPanel({ onJoined }: SyncPanelProps) {
  const syncState = useAtomValue(syncStateAtom)
  const joinSync = useSetAtom(joinSyncAtom)
  const leaveSync = useSetAtom(leaveSyncAtom)
  const [open, setOpen] = useState(false)
  const [pastedCode, setPastedCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Nothing to show at all when this deployment has no sync backend.
  if (!syncState.configured) return null

  const copyCode = async () => {
    if (!syncState.code) return
    try {
      await navigator.clipboard.writeText(syncState.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission denied: the code is still visible to copy by hand.
    }
  }

  const generate = async () => {
    setError(null)
    setBusy(true)
    try {
      await joinSync(generateSyncCode())
      onJoined()
    } catch {
      setError('Impossible de créer un code. Vérifiez votre connexion.')
    } finally {
      setBusy(false)
    }
  }

  const join = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidSyncCode(pastedCode)) {
      setError('Ce code ne semble pas valide.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await joinSync(normalizeSyncCode(pastedCode))
      setPastedCode('')
      onJoined()
    } catch {
      setError('Impossible de rejoindre ce groupe. Vérifiez le code et votre connexion.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.toggle} onClick={() => setOpen((value) => !value)}>
        {syncState.code ? `Synchronisé · ${syncState.code}` : 'Synchroniser mes appareils'}
      </button>

      {open && (
        <div className={styles.panel}>
          {syncState.code ? (
            <>
              <p className={styles.hint}>
                Entrez ce code sur un autre appareil pour partager cette bibliothèque.
              </p>
              <div className={styles.codeRow}>
                <code className={styles.code}>{syncState.code}</code>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => void copyCode()}
                  aria-label="Copier le code"
                >
                  {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                </button>
              </div>
              <button
                type="button"
                className={styles.stopButton}
                onClick={() => {
                  leaveSync()
                  setOpen(false)
                }}
              >
                Ne plus synchroniser cet appareil
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void generate()}
                disabled={busy}
              >
                {busy && <Loader2 size={14} className={styles.spinner} aria-hidden="true" />}
                Générer un code sur cet appareil
              </button>

              <p className={styles.hint}>Ou entrez un code généré sur un autre appareil :</p>
              <form className={styles.joinForm} onSubmit={(event) => void join(event)}>
                <input
                  className={styles.input}
                  value={pastedCode}
                  onChange={(event) => setPastedCode(event.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  aria-label="Code de synchronisation"
                />
                <button type="submit" className={styles.joinButton} disabled={busy}>
                  Rejoindre
                </button>
              </form>
            </>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
