const KEY = 'fmr_tokens'

export function getTokens() {
  const raw = localStorage.getItem(KEY)
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isNaN(n) ? 0 : n
}

function notify() {
  window.dispatchEvent(new CustomEvent('tokens:changed', { detail: { tokens: getTokens() } }))
}

export function setTokens(n) {
  const v = Math.max(0, parseInt(n, 10) || 0)
  localStorage.setItem(KEY, String(v))
  notify()
}

export function addTokens(n) {
  const cur = getTokens()
  setTokens(cur + (parseInt(n, 10) || 0))
}

export function consumeToken() {
  const cur = getTokens()
  if (cur <= 0) return false
  setTokens(cur - 1)
  return true
}

