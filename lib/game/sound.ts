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

export function playHurt() {
  playTone(200, 0.08, 'square', 0.25)
  setTimeout(() => playTone(150, 0.12, 'square', 0.2), 80)
}

export function playKnockback() {
  playTone(180, 0.1, 'square', 0.2)
  setTimeout(() => playTone(120, 0.15, 'square', 0.18), 100)
}

export function playClear() {
  playTone(440, 0.08, 'sine', 0.15)
  setTimeout(() => playTone(550, 0.08, 'sine', 0.15), 100)
  setTimeout(() => playTone(660, 0.08, 'sine', 0.15), 200)
  setTimeout(() => playTone(880, 0.2, 'sine', 0.18), 300)
}
