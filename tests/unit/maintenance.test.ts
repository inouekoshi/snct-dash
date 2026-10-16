import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseMaintenanceDepartments, isUnderMaintenance } from '@/lib/maintenance'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('メンテナンス中の学科', () => {
  it('カンマ区切りの学科IDを読み、範囲外や空白・不正な値は無視する', () => {
    expect([...parseMaintenanceDepartments('4')]).toEqual([4])
    expect([...parseMaintenanceDepartments(' 4, 5 ,')]).toEqual([4, 5])
    expect([...parseMaintenanceDepartments('0,6,abc,2.5')]).toEqual([])
    expect([...parseMaintenanceDepartments(undefined)]).toEqual([])
    expect([...parseMaintenanceDepartments('')]).toEqual([])
  })

  it('環境変数に書いた学科だけがメンテナンス中になる', () => {
    vi.stubEnv('NEXT_PUBLIC_MAINTENANCE_DEPARTMENTS', '4')
    expect(isUnderMaintenance(4)).toBe(true)
    expect(isUnderMaintenance(1)).toBe(false)
  })
})
