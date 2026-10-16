import { describe, it, expect } from 'vitest'
import { normalizeNickname } from '@/lib/nickname'
import { formatTime } from '@/lib/format'
import { deviceFrom, clientKeyFrom } from '@/lib/server/client-key'

describe('normalizeNickname', () => {
  it('前後の空白と制御文字を除く', () => {
    expect(normalizeNickname('  高専太郎 ')).toBe('高専太郎')
    expect(normalizeNickname('a\u0000b\nc')).toBe('abc')
  })
  it('空・長すぎは null（絵文字は1文字と数える）', () => {
    expect(normalizeNickname('   ')).toBeNull()
    expect(normalizeNickname('あ'.repeat(21))).toBeNull()
    expect(normalizeNickname('😀'.repeat(20))).toBe('😀'.repeat(20))
  })
})

describe('formatTime', () => {
  it('m:ss.cc', () => {
    expect(formatTime(105_320)).toBe('1:45.32')
    expect(formatTime(5_009)).toBe('0:05.00')
    expect(formatTime(600_000)).toBe('10:00.00')
  })
})

describe('client-key', () => {
  it('端末の種類', () => {
    expect(deviceFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe('mobile')
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe('mobile')
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 13; SM-X200) Safari/537.36')).toBe('tablet')
    expect(deviceFrom('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe('desktop')
    expect(deviceFrom(null)).toBe('unknown')
  })
  it('IP をそのまま保存しない（ハッシュ）', () => {
    const key = clientKeyFrom(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))
    expect(key).toMatch(/^[0-9a-f]{32}$/)
    expect(key).not.toContain('203')
    expect(clientKeyFrom(new Headers())).toBeNull()
  })
})
