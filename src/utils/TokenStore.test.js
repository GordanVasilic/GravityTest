import { describe, it, expect, beforeEach } from 'vitest'
import { getTokens, setTokens, addTokens, consumeToken } from './TokenStore'

describe('TokenStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes to 0', () => {
    expect(getTokens()).toBe(0)
  })

  it('sets and gets tokens', () => {
    setTokens(5)
    expect(getTokens()).toBe(5)
  })

  it('adds tokens', () => {
    setTokens(1)
    addTokens(4)
    expect(getTokens()).toBe(5)
  })

  it('consumes token when available', () => {
    setTokens(2)
    const ok1 = consumeToken()
    const ok2 = consumeToken()
    const ok3 = consumeToken()
    expect(ok1).toBe(true)
    expect(ok2).toBe(true)
    expect(ok3).toBe(false)
    expect(getTokens()).toBe(0)
  })
})

