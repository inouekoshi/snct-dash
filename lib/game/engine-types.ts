export type PlayerState = 'running' | 'jumping' | 'falling'

export interface Obstacle {
  stageX: number
  x: number; y: number; w: number; h: number
  shape: 'gear' | 'bolt' | 'piston' | 'circuit' | 'coil' | 'capacitor'
       | 'bug' | 'monitor' | 'chip' | 'bacteria' | 'flask' | 'mushroom'
       | 'crystal' | 'ingot' | 'lattice' | 'stalactite'
       | 'wrench' | 'spring' | 'flywheel' | 'robot_arm'
       | 'hammer' | 'conveyor'
  moving: boolean; phase: number; baseY: number; amplitude: number
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
