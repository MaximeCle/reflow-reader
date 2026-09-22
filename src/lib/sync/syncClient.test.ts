import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, getSession, signInAnonymously } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getSession, signInAnonymously }, rpc }),
}))

const CODE = 'A3F9-KQ2R-88ZP-MNBV'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'cle-de-test')
  rpc.mockReset().mockResolvedValue({ error: null })
  getSession.mockReset().mockResolvedValue({ data: { session: { user: {} } } })
  signInAnonymously.mockReset().mockResolvedValue({ error: null })
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('joinSync', () => {
  /*
   * L'appareil qui génère inscrit le groupe sous la forme groupée. Celui qui
   * rejoint doit aboutir exactement à la même clé, sinon les deux s'inscrivent
   * dans des groupes distincts et le second ne voit jamais rien.
   */
  it('inscrit le groupe sous la forme groupée même si le code est collé sans tirets', async () => {
    const { joinSync, getSyncCode } = await import('./syncClient')

    await joinSync('a3f9kq2r88zpmnbv')

    expect(rpc).toHaveBeenCalledWith('join_sync_group', { target_code: CODE })
    expect(getSyncCode()).toBe(CODE)
  })

  it('accepte la forme déjà groupée sans la modifier', async () => {
    const { joinSync } = await import('./syncClient')

    await joinSync(CODE)

    expect(rpc).toHaveBeenCalledWith('join_sync_group', { target_code: CODE })
  })

  it('remonte l’erreur du serveur au lieu de retenir le code', async () => {
    rpc.mockResolvedValue({ error: new Error('function does not exist') })
    const { joinSync, getSyncCode } = await import('./syncClient')

    await expect(joinSync(CODE)).rejects.toThrow('function does not exist')
    expect(getSyncCode()).toBeNull()
  })

  it('réessaie la connexion anonyme après un échec, sans rechargement', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    signInAnonymously
      .mockResolvedValueOnce({ error: new Error('anonymous sign-ins are disabled') })
      .mockResolvedValueOnce({ error: null })
    const { joinSync } = await import('./syncClient')

    await expect(joinSync(CODE)).rejects.toThrow('anonymous sign-ins are disabled')
    await expect(joinSync(CODE)).resolves.toBeUndefined()
    expect(signInAnonymously).toHaveBeenCalledTimes(2)
  })
})
