let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not supported
  }
}

export function playJump() {
  playTone(300, 0.1, 'sine')
  setTimeout(() => playTone(440, 0.08, 'sine'), 60)
}

export function playCoin() {
  playTone(660, 0.06, 'sine', 0.1)
  setTimeout(() => playTone(880, 0.08, 'sine', 0.1), 50)
}

export function playGameOver() {
  playTone(330, 0.15, 'square', 0.2)
  setTimeout(() => playTone(220, 0.15, 'square', 0.2), 150)
  setTimeout(() => playTone(110, 0.3, 'square', 0.2), 300)
}

export function playAreaChange() {
  playTone(440, 0.05, 'sine', 0.1)
  setTimeout(() => playTone(550, 0.05, 'sine', 0.1), 80)
  setTimeout(() => playTone(660, 0.1, 'sine', 0.1), 160)
}

export function playHurt() {
  playTone(200, 0.08, 'square', 0.25)
  setTimeout(() => playTone(150, 0.12, 'square', 0.2), 80)
}

export function playShieldGet() {
  playTone(550, 0.06, 'sine', 0.12)
  setTimeout(() => playTone(700, 0.06, 'sine', 0.12), 70)
  setTimeout(() => playTone(880, 0.1, 'sine', 0.12), 140)
}
