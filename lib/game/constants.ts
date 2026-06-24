export const CANVAS_W = 800
export const CANVAS_H = 280
export const PLAYER_X = 110
export const GRAVITY = 0.65
export const JUMP_VY = -13.5

export const DEFAULT_GROUND_Y = 220

export const STAGE_LENGTH = 15000 // TODO: テスト用。本番は70000に戻す
export const SPEED_START   = 4
export const SPEED_END     = 15

export const KNOCKBACK_AMOUNT     = 120
export const HOLE_KNOCKBACK       = 200
export const KNOCKBACK_INVINCIBLE = 90

// [最小frames, ランダム幅frames]。インデックス0は未使用、1〜5がdepartmentId対応
export const SPAWN_GAPS: [number, number][] = [
  [0, 0], [44, 28], [85, 50], [65, 40], [50, 32], [36, 26],
]

export const COYOTE_FRAMES      = 5
export const JUMP_BUFFER_FRAMES = 8
export const HIT_STOP_FRAMES    = 6
export const MISS_OVERLAY_FRAMES = 90
export const REVIVAL_FRAMES      = 75

export const STEP_FOLLOW_SPEED = 8

// 電気電子工学科（充電サバイバル型）専用
export const CHARGE_MAX      = 100   // 充電ゲージ最大値
export const CHARGE_DRAIN    = 0.18  // /frame。常時減少（満タン→空 ≈ 9秒）
export const CHARGE_HIT_COST = 30    // 障害物被弾時のチャージ減
export const CHARGE_REVIVE   = 50    // チャージ0でのミス復活後の残量（= MAX*0.5）
export const BATTERY_REFILL  = 35    // 🔋電池1個の回復量
// [最小frames, ランダム幅frames]。電池スポーン間隔
export const BATTERY_GAP: [number, number] = [110, 80]

// 電子情報工学科（デバッグ踏みつけ型）専用
export const COMBO_NEEDED     = 3    // バグを踏んだ累積数でデバッグモード発動（時間でリセットしない）
export const DEBUG_FRAMES     = 180  // デバッグモード持続（3秒）
export const DEBUG_SPEED_MULT = 1.7  // デバッグモード中のスクロール加速倍率
export const STOMP_BOUNCE     = -10  // 踏んだ後のバウンド初速（px/frame）
export const STOMP_MARGIN     = 26   // 上面接触判定の許容px（広めにして踏みやすく）
