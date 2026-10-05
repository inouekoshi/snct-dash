export type PlayerState = 'running' | 'jumping' | 'falling'

export interface Obstacle {
  stageX: number
  x: number; y: number; w: number; h: number
  shape: 'gear' | 'bolt' | 'piston' | 'circuit' | 'coil' | 'capacitor'
       | 'bug' | 'monitor' | 'chip' | 'bacteria' | 'flask' | 'mushroom'
       | 'crystal' | 'ingot' | 'lattice' | 'stalactite'
       | 'wrench' | 'spring' | 'flywheel' | 'robot_arm'
       | 'hammer' | 'conveyor'
       | 'resistor' | 'transistor' | 'electron' | 'tesla' | 'arc_ring' | 'pylon'
       | 'virus' | 'glitch' | 'firewall' | 'data_block'
       | 'syntax_error' | 'stack_overflow'
       | 'null_pointer' | 'merge_conflict' | 'segfault'
       | 'malloc_free' | 'blockchain'
       | 'reagent_tube' | 'cell_wall'
       | 'leaf_spring' | 'brittle_crystal' | 'roller'
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
  effect: 'time_stop' | 'invincible' | 'charge' | 'shield'
        | 'furnace' | 'quench' | 'sign_flex' | 'sign_hard'  // 材料工学科：熱処理のゲートと看板
  wobble: number
}

export interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
