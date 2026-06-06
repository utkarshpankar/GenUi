export const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

const BACKEND_HINT = API_BASE
  ? 'Check that the backend is running and VITE_API_BASE_URL is correct.'
  : 'From the project root run: npm install && npm run dev (starts backend + frontend together).'

export function mapFetchError(error) {
  if (error?.name === 'AbortError') return 'Request cancelled.'
  const msg = String(error?.message || '')
  if (error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(msg)) {
    return `Backend is not reachable. ${BACKEND_HINT}`
  }
  return msg || 'Something went wrong'
}

export async function postJSON(url, body, { signal } = {}) {
  let res
  try {
    res = await fetch(apiUrl(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    throw new Error(mapFetchError(error))
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return data
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(apiUrl('/health'), { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}
