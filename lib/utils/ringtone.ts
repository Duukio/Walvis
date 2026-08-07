/**
 * Generador de tono de llamada usando Web Audio API para asegurar que funcione 
 * en cualquier navegador sin depender de archivos de audio externos.
 */

class RingtonePlayer {
  private audioCtx: AudioContext | null = null
  private isPlaying = false
  private intervalId: any = null

  public startRingtone() {
    if (this.isPlaying) return
    this.isPlaying = true

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      this.audioCtx = new AudioCtx()

      const playBeep = () => {
        if (!this.audioCtx || !this.isPlaying) return

        try {
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume()
          }

          // Tono dual estándar de teléfono (440 Hz + 480 Hz)
          const osc1 = this.audioCtx.createOscillator()
          const osc2 = this.audioCtx.createOscillator()
          const gainNode = this.audioCtx.createGain()

          osc1.type = 'sine'
          osc2.type = 'sine'
          osc1.frequency.setValueAtTime(440, this.audioCtx.currentTime)
          osc2.frequency.setValueAtTime(480, this.audioCtx.currentTime)

          gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime)

          // Fade out suave al final de los 1.5 segundos
          gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5)

          osc1.connect(gainNode)
          osc2.connect(gainNode)
          gainNode.connect(this.audioCtx.destination)

          osc1.start(this.audioCtx.currentTime)
          osc2.start(this.audioCtx.currentTime)
          osc1.stop(this.audioCtx.currentTime + 1.5)
          osc2.stop(this.audioCtx.currentTime + 1.5)
        } catch (e) {
          console.error('Error reproduciendo tono:', e)
        }
      }

      playBeep()
      // Repetir cada 3 segundos (1.5s tono + 1.5s silencio)
      this.intervalId = setInterval(playBeep, 3000)
    } catch (e) {
      console.error('No se pudo inicializar AudioContext:', e)
    }
  }

  public stopRingtone() {
    this.isPlaying = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close()
      } catch (e) {}
      this.audioCtx = null
    }
  }
}

export const ringtonePlayer = new RingtonePlayer()
