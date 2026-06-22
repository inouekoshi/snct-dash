export type PlayerState = 'running' | 'jumping' | 'falling'

export interface Obstacle {
  stageX: number
  x: number; y: number; w: number; h: number
  shape: 'gear' | 'bolt' | 'piston' | 'circuit' | 'coil' | 'capacitor'
       | 'bug' | 'monitor' | 'chip' | 'bacteria' | 'flask' | 'mushroom'
       | 'crystal' | 'ingot' | 'lattice' | 'stalactite'
       | 'wrench' | 'spring' | 'flywheel' | 'robot_arm'
       | 'hammer' | 'conveyor'
       | 'resistor' | 'transistor' | 'electron' | 'tesla' | 'arc_ring'
       | 'virus' | 'glitch' | 'firewall' | 'data_block'
  moving: boolean; phase: number; baseY: number; amplitude: number
  stompable?: boolean  // 電子情報工学科：上から踏んで倒せる敵か
}

export type TerrainSegment =
  | { type: 'ground'; stageX: number; width: number; groundY: number }
  | { type: 'hole';   stageX: number; width: number }

export interface Item {
  stageX: number
  x: number; y: number
  effect: 'time_stop' | 'invincible' | 'charge'
  wobble: number
}

export interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
