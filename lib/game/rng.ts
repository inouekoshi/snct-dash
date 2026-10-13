// ゲームロジック用の乱数生成器（mulberry32）。
// Math.random() の代わりにエンジンごとに1つ持たせることで、
// ・シード固定で同じステージを再現できる（自動テスト・ボット）
// ・エンジンの状態を丸ごと複製して先読みできる（ボットの探索）
// ようにしている。描画だけのゆらぎ（パーティクル等）は Math.random() のままでよい。
export class Rng {
  private state: number

  constructor(seed = Math.floor(Math.random() * 2 ** 32)) {
    this.state = seed >>> 0
  }

  /** 0 以上 1 未満の一様乱数 */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  clone(): Rng {
    const r = new Rng(0)
    r.state = this.state
    return r
  }
}

export type Rand = () => number
