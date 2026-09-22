import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { fromLibraryEntryRow, toLibraryEntryRow, type LibraryEntryRow } from './libraryEntryRow'
import { formatSyncCode } from './syncCode'
import type { ExtractedDocument } from '../pdf/types'
import type { LibraryEntry } from '../storage/types'

const CODE_KEY = 'reflow-reader:sync-code'

let client: SupabaseClient | null | undefined
let sessionReady: Promise<void> | null = null

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  client = url && anonKey ? createClient(url, anonKey) : null
  return client
}

/** Whether this build was given Supabase credentials at all. */
export function isSyncConfigured(): boolean {
  return getClient() !== null
}

export function getSyncCode(): string | null {
  try {
    return window.localStorage.getItem(CODE_KEY)
  } catch {
    return null
  }
}

function setSyncCode(code: string | null): void {
  try {
    if (code) window.localStorage.setItem(CODE_KEY, code)
    else window.localStorage.removeItem(CODE_KEY)
  } catch {
    // Private browsing or a full quota: sync just cannot remember its code.
  }
}

/** Configured and joined to a code: the two conditions for sync to actually run. */
export function isSyncEnabled(): boolean {
  return isSyncConfigured() && getSyncCode() !== null
}

/**
 * A per-device anonymous identity, persisted by supabase-js across reloads.
 * It has no profile of its own — it only ever proves "I was told this sync
 * code", via `join_sync_group`.
 */
async function ensureSession(supabase: SupabaseClient): Promise<void> {
  sessionReady ??= (async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) return
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  })()

  try {
    await sessionReady
  } catch (error) {
    // Never cache the failure: turning anonymous sign-ins on, or simply
    // coming back online, must not need a page reload to take effect.
    sessionReady = null
    throw error
  }
}

/**
 * Joins (and implicitly creates, on first use) the sync group named by
 * `code`. Throws on failure — the caller is a foreground action and should
 * tell the person it didn't work.
 */
export async function joinSync(code: string): Promise<void> {
  const supabase = getClient()
  if (!supabase) throw new Error('La synchronisation n’est pas configurée sur ce déploiement.')
  // The group key is the formatted code, whatever shape it was typed in:
  // generating and joining have to land on the same string or the two
  // devices end up in separate, silently empty groups.
  const canonical = formatSyncCode(code)
  await ensureSession(supabase)
  const { error } = await supabase.rpc('join_sync_group', { target_code: canonical })
  if (error) throw error
  setSyncCode(canonical)
}

/** Stops this device from syncing. Other devices in the group are unaffected. */
export function leaveSync(): void {
  setSyncCode(null)
}

/** Runs `fn` only when sync is actually on; swallows failures (offline, etc). */
async function withSync<T>(
  fn: (supabase: SupabaseClient, code: string) => Promise<T>,
): Promise<T | undefined> {
  const supabase = getClient()
  const code = getSyncCode()
  if (!supabase || !code) return undefined
  try {
    await ensureSession(supabase)
    return await fn(supabase, code)
  } catch {
    // Best effort: local storage already holds the truth for this device.
    return undefined
  }
}

export async function pushEntry(entry: LibraryEntry): Promise<void> {
  await withSync(async (supabase, code) => {
    const { error } = await supabase.from('library_entries').upsert(toLibraryEntryRow(code, entry))
    if (error) throw error
  })
}

export async function pushContent(id: string, document: ExtractedDocument): Promise<void> {
  await withSync(async (supabase, code) => {
    const { error } = await supabase.from('document_content').upsert({ code, id, document })
    if (error) throw error
  })
}

export async function pushDelete(id: string): Promise<void> {
  await withSync(async (supabase, code) => {
    await supabase.from('library_entries').delete().eq('code', code).eq('id', id)
    await supabase.from('document_content').delete().eq('code', code).eq('id', id)
  })
}

/**
 * All entries in the joined group. Throws on failure (offline, RLS not set
 * up yet) so the caller can decide whether to fall back to the local list.
 */
export async function pullEntries(): Promise<LibraryEntry[]> {
  const supabase = getClient()
  const code = getSyncCode()
  if (!supabase || !code) return []
  await ensureSession(supabase)
  const { data, error } = await supabase.from('library_entries').select('*').eq('code', code)
  if (error) throw error
  return (data as LibraryEntryRow[]).map(fromLibraryEntryRow)
}

/**
 * Ids the group already holds the text for. Cheap (ids only) next to the
 * documents themselves, so it can gate re-uploading them.
 */
export async function listSyncedContentIds(): Promise<Set<string>> {
  const ids = await withSync(async (supabase, code) => {
    const { data, error } = await supabase.from('document_content').select('id').eq('code', code)
    if (error) throw error
    return new Set((data as { id: string }[]).map((row) => row.id))
  })
  return ids ?? new Set()
}

export async function pullContent(id: string): Promise<ExtractedDocument | undefined> {
  const supabase = getClient()
  const code = getSyncCode()
  if (!supabase || !code) return undefined
  await ensureSession(supabase)
  const { data, error } = await supabase
    .from('document_content')
    .select('document')
    .eq('code', code)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data?.document as ExtractedDocument | undefined) ?? undefined
}

/**
 * Live updates from other devices in the group while this one stays open.
 * Returns an unsubscribe function; a no-op if sync is off.
 */
export function subscribeToLibraryChanges(onChange: (entry: LibraryEntry) => void): () => void {
  const supabase = getClient()
  const code = getSyncCode()
  if (!supabase || !code) return () => {}

  let channel: RealtimeChannel | null = supabase
    .channel(`library:${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'library_entries', filter: `code=eq.${code}` },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        onChange(fromLibraryEntryRow(payload.new as LibraryEntryRow))
      },
    )
    .subscribe()

  return () => {
    channel?.unsubscribe()
    channel = null
  }
}
