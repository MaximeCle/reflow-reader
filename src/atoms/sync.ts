import { atom } from 'jotai'
import {
  getSyncCode,
  isSyncConfigured,
  joinSync as joinSyncClient,
  leaveSync as leaveSyncClient,
} from '../lib/sync/syncClient'

export interface SyncState {
  /** Whether this build was given Supabase credentials at all. */
  configured: boolean
  code: string | null
}

function readSyncState(): SyncState {
  return { configured: isSyncConfigured(), code: getSyncCode() }
}

export const syncStateAtom = atom<SyncState>(readSyncState())

export const joinSyncAtom = atom(null, async (_get, set, code: string) => {
  await joinSyncClient(code)
  set(syncStateAtom, readSyncState())
})

export const leaveSyncAtom = atom(null, (_get, set) => {
  leaveSyncClient()
  set(syncStateAtom, readSyncState())
})
