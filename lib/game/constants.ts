export const CANVAS_W = 800
export const CANVAS_H = 280
export const PLAYER_X = 110
export const GRAVITY = 0.65
export const JUMP_VY = -13.5

export const DEFAULT_GROUND_Y = 220

export const STAGE_LENGTH = 70000 // 本番想定の長さ
export const SPEED_START   = 8
export const SPEED_END     = 15

export const KNOCKBACK_AMOUNT     = 120
export const HOLE_KNOCKBACK       = 200
export const KNOCKBACK_INVINCIBLE = 90

// [最小frames, ランダム幅frames]。インデックス0は未使用、1〜4がdepartmentId対応
// （4=生物応化はパイプの間隔。材料工学科は鍛造専用キューを使う）
export const SPAWN_GAPS: [number, number][] = [
  [0, 0], [44, 28], [85, 50], [38, 30], [78, 46],
]

export const COYOTE_FRAMES      = 5
export const JUMP_BUFFER_FRAMES = 8
export const HIT_STOP_FRAMES    = 6
export const MISS_OVERLAY_FRAMES = 90
export const REVIVAL_FRAMES      = 75

export const STEP_FOLLOW_SPEED = 8

// 電気電子工学科（充電サバイバル型）専用
export const CHARGE_MAX      = 100   // 充電ゲージ最大値
export const CHARGE_DRAIN    = 0.16  // /frame。常時減少（満タン→空 ≈ 10.4秒）
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

// malloc/free 点滅ゲート（タイミング突破型）専用
export const MALLOC_PERIOD    = 100  // 点滅の周期（frames）
export const MALLOC_SOLID     = 55   // うち malloc=実体（当たり判定あり）な期間。残りは free=すり抜け
// engine（衝突判定）と drawer（見た目）で共有する solid 判定。phase は障害物ごとの整数オフセット。
export function mallocSolid(phase: number, frame: number): boolean {
  return ((frame + phase) % MALLOC_PERIOD) < MALLOC_SOLID
}

// 生物応用化学科（液体スイム）専用
export const SWIM_THRUST     = -0.72           // 押下中の上昇加速
export const SWIM_DRAG       = 0.90            // 速度減衰（水の抵抗）
export const SWIM_MAX_VY     = 5.2
export const BIO_WALL_KNOCKBACK = 90           // 壁ヒット後退（通常120より軽め）
export const BIO_GAP         = 116             // パイプ縦隙間（プレイヤー高46+余裕）
export const BIO_PIPE_W      = 42
export const BIO_SPEED_START = 6
export const BIO_SPEED_END   = 10
// 保護アイテム（バリア）：取ると1回だけ被弾（パイプ衝突）を無効化する。
// [最小frames, ランダム幅frames]。約4〜9秒間隔。取り逃しても次が来るので出過ぎてOK。
export const SHIELD_GAP: [number, number] = [240, 300]
export const SHIELD_COLOR = '#5ffbf1'

// 材料工学科（鍛えてカン！）専用
export const FORGE_RING_OFFSET     = 175 // 輪の中心の、自キャラからの距離（px）
export const FORGE_INGOT_W         = 40  // 塊の幅（px）
export const FORGE_PERFECT         = 2.5 // PERFECT の幅（±フレーム、t は小数）
export const FORGE_GOOD_EARLY      = 4.5 // GOOD の早い側の端（フレーム）
export const FORGE_GOOD_LATE       = 6.5 // GOOD の遅い側の端（フレーム）
export const FORGE_EARLY_LIMIT     = 20  // これより遠い塊へのタップは罰なしの空振り（フレーム）
export const FORGE_COOLDOWN        = 12  // 空振り後の硬直（フレーム）
export const MAT_BOOST_MAX         = 1.0 // 加速倍率（ブーストなし＝1.0）
export const FORGE_HITSTOP         = 2   // PERFECT のヒットストップ（フレーム）
export const FORGE_SPAWN_DIST      = 560 // 輪の中心から、塊を置く位置（x=845）までの距離（px）
export const FORGE_CUTIN_FRAMES    = 48  // 区間の切り替わりのカットイン表示時間
export const FORGE_CHAIN_GAP       = 18  // 2連・3連の間隔（フレーム）
export const FORGE_TUTORIAL_DELAY  = 90  // 開始から最初の塊までのフレーム数（1.5秒）
export const FORGE_TUTORIAL_SLOW   = 0.2 // 最初の2個の、輪に入ったときの世界の速さ
export const FORGE_TUTORIAL_WAIT   = 120 // 最初の2個で待つ最大フレーム数（2秒）
export const FORGE_RING_R          = 26  // 判定の輪の半径（px）
export const FORGE_SWING_FRAMES    = 8   // ハンマーを振る動きのフレーム数
export const FORGE_TUTORIAL_HITS   = 2   // 「タップでたたけ！」を出し続ける、叩いた数の上限
// 区間の切り替わりのカットイン文言（0〜25%は出さない）
export const FORGE_ZONE_CUTIN: readonly (readonly [string, string])[] = [
  ['', ''],
  ['熱気あふれる鍛造ライン！', 'ぴったり叩いて板に仕上げろ'],
  ['熱処理で鍛え上げろ！', '2連・3連のリズムに乗れ'],
  ['白熱の最終区間！', '最後まで叩ききれ'],
]

