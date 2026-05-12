export type PlayerState = 'running' | 'jumping' | 'dead'

export interface Obstacle {
  x: number; y: number; w: number; h: number
  shape: 'gear' | 'bolt' | 'piston' | 'circuit' | 'coil' | 'capacitor' | 'bug' | 'monitor' | 'chip' | 'bacteria' | 'flask' | 'mushroom' | 'crystal' | 'ingot' | 'lattice'
  moving: boolean; phase: number; baseY: number; amplitude: number
}

export interface Coin   { x: number; y: number; collected: boolean; wobble: number }
export interface ShieldDrop { x: number; y: number; wobble: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
