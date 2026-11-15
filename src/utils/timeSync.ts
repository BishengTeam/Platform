/**
 * Server-clock synchronization for countdown and deadline-sensitive UI.
 *
 * The offset includes half of the measured round-trip time: the backend
 * generated its timestamp between the local start and end timestamps.
 */
import { request } from './request.ts'

interface ServerTimePayload {
  unix: number
  unix_ms?: number
}

let serverOffsetMs = 0
let syncPromise: Promise<number> | null = null

export async function syncServerTime(): Promise<number> {
  syncPromise ||= (async () => {
    const localStart = Date.now()
    const response = await request<ServerTimePayload>({
      url: '/api/system/time',
      method: 'GET',
      auth: 'public',
      showLoading: false,
      showError: false,
    })
    const localEnd = Date.now()
    const serverUnixMs = response.data.unix_ms ?? response.data.unix * 1000
    const roundTripMs = Math.max(0, localEnd - localStart)
    serverOffsetMs = serverUnixMs + roundTripMs / 2 - localEnd
    return serverOffsetMs
  })().finally(() => {
    syncPromise = null
  })

  return syncPromise
}

export function serverNow(): number {
  return Date.now() + serverOffsetMs
}

export function getServerOffsetMs(): number {
  return serverOffsetMs
}

/** Test-only reset; production always retains the last successful offset. */
export function resetServerTimeForTest(): void {
  serverOffsetMs = 0
  syncPromise = null
}
