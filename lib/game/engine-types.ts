export type PlayerState = 'running' | 'jumping' | 'falling'

export interface Obstacle {
  stageX: number
  x: number; y: number; w: number; h: number
  shape:
       // 機械工学科
       | 'wrench' | 'spring' | 'flywheel' | 'robot_arm' | 'hammer' | 'conveyor'
       // 電気電子工学科
       | 'circuit' | 'coil' | 'capacitor' | 'resistor' | 'transistor' | 'electron' | 'tesla' | 'arc_ring' | 'pylon'
       // 電子情報工学科（bug のみ踏める）
       | 'bug' | 'syntax_error' | 'stack_overflow' | 'null_pointer' | 'merge_conflict' | 'segfault'
       | 'malloc_free' | 'blockchain' | 'firewall'
       // 天井障害（電気電子・電子情報）
       | 'stalactite'
       // 生物応用化学科（液体スイム）
       | 'reagent_tube' | 'cell_wall'
       // 材料工学科
       | 'crystal' | 'ingot' | 'lattice' | 'roller' | 'leaf_spring' | 'brittle_crystal'
  moving: boolean; phase: number; baseY: number; amplitude: number
  stompable?: boolean  // 電子情報工学科：上から踏んで倒せる敵か
  bendable?: boolean   // 材料工学科：「しなる」状態なら当たってよい板バネ（曲がって戻り加速）
  breakable?: boolean  // 材料工学科：「かたい」状態なら砕ける結晶壁
  spent?: boolean      // 材料工学科：判定済み（板バネを曲げた／結晶壁を迂回した）
  bend?: number        // 材料工学科：板バネのしなり具合（1→0で戻る）
}

export type TerrainSegment =
  | { type: 'ground'; stageX: number; width: number; groundY: number }
  | { type: 'hole';   stageX: number; width: number }

export interface Item {
  stageX: number
  x: number; y: number
  effect: 'charge'                    // 電気電子工学科：🔋電池
        | 'shield'                    // 生物応用化学科：バリア
        | 'furnace' | 'quench'        // 材料工学科：熱処理ゲート（🔥炉／💧水槽）
        | 'sign_flex' | 'sign_hard'   // 材料工学科：熱処理の看板（判定なし）
  wobble: number
}

export interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
