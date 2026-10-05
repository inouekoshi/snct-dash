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
// （4=生物応化はパイプの間隔。材料工学科は工程別の MAT_SPAWN_GAPS を使う）
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

// 材料工学科（製品ができるまでラン）専用
// 自分自身が材料になり「溶解 → 圧延 → 熱処理 → 検査」と加工されるたびに性質（物理）が変わる。
// 区間境界は STAGE_LENGTH に対する比率で持つ（テスト時に STAGE_LENGTH を縮めても比率が保たれる）。
export type MatPhase = 'melt' | 'roll' | 'heat' | 'inspect'
export const MAT_PHASE_ORDER: MatPhase[] = ['melt', 'roll', 'heat', 'inspect']
export const MAT_PHASE_START: Record<MatPhase, number> = {
  melt:    0,
  roll:    0.28,
  heat:    0.56,
  inspect: 0.955,
}
// 区間は保存せず stageProgress から毎回計算する（ノックバックで戻っても矛盾しない）
export function matPhase(stageProgress: number): MatPhase {
  const t = stageProgress / STAGE_LENGTH
  if (t >= MAT_PHASE_START.inspect) return 'inspect'
  if (t >= MAT_PHASE_START.heat) return 'heat'
  if (t >= MAT_PHASE_START.roll) return 'roll'
  return 'melt'
}
// 区間境界の stageX 一覧（工程ゲートの描画・安全区間の判定に使う）
export function matBoundaries(): { x: number; phase: MatPhase }[] {
  return MAT_PHASE_ORDER.slice(1).map(phase => ({ x: MAT_PHASE_START[phase] * STAGE_LENGTH, phase }))
}
// 区間ごとのプレイヤー当たり判定の高さ（通常は46）。液滴は丸く低め、薄板はぺたんこ。
export const MAT_HITBOX_H: Record<MatPhase, number> = { melt: 34, roll: 22, heat: 40, inspect: 40 }
export const MAT_SAFE_MARGIN   = 400    // 区間境界の前後この距離には障害物を出さない
export const MELT_BOUNCE_VY    = -5.5   // 溶解（液滴）：着地のたびに小さく自動で弾む
export const ROLL_GAP          = 26     // 圧延：ローラー下面と床のすき間（薄板22pxなら潜れる）
// 熱処理：看板 → ゲート → 課題 のセット配置（セット先頭からの stageX オフセット）
// 🔥炉は空中なのでジャンプで通過する。着地が板バネを飛び越えないよう、板バネは遠めに置く
// （ジャンプの滞空は約41フレーム＝速度8〜15で330〜615px）。
export const HEAT_GATE_OFFSET = 240
export const HEAT_CHALLENGE_OFFSET: Record<'flex' | 'hard', number> = { flex: 820, hard: 520 }
// セット先頭からこの距離で状態が通常に戻る（課題を越えた少し先）
export const HEAT_STATE_SPAN: Record<'flex' | 'hard', number> = { flex: 1060, hard: 720 }
export const HEAT_SET_GAP: [number, number] = [1250, 300]  // セット同士の間隔 [最小, ランダム幅]
// 材料工学科の通常スポーン間隔 [最小frames, ランダム幅]。圧延はローラーの手前で必ず着地できるよう広め
export const MAT_SPAWN_GAPS: Record<'melt' | 'roll', [number, number]> = { melt: [40, 26], roll: [58, 28] }
export const MAT_BEND_FRAMES   = 18     // 板バネで曲がっている時間（0.3秒・この間は減速）
export const MAT_BOOST_FRAMES  = 60     // 形が戻った反動の加速時間
export const MAT_BOOST_MAX     = 1.4    // 加速倍率の上限（重ねがけしない）
export const MAT_SLOW_FRAMES   = 60     // 結晶壁を砕かず迂回したときの減速（1秒）
export const MAT_SLOW_MULT     = 0.6
export const MAT_CUTIN_FRAMES  = 48     // 工程カットインの表示時間（0.8秒）
export const MAT_FLEX_COLOR    = '#ff8a3d'
export const MAT_HARD_COLOR    = '#7fd4ff'
