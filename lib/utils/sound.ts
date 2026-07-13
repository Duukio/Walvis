/**
 * Reproduce un efecto de sonido desde la carpeta pública de la app.
 * @param soundPath Ruta del archivo de audio relativa a la carpeta /public (ej: '/sounds/notification.mp3')
 */
export const playSound = (soundPath: string) => {
  if (typeof window === 'undefined') return // Evita errores en Server-Side Rendering (SSR)

  try {
    const audio = new Audio(soundPath)
    audio.volume = 0.4 // Ajustá el volumen de forma global acá (0.0 a 1.0)
    
    // Forzamos la reproducción
    const playPromise = audio.play()

    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Esto ataja el bloqueo de autoplay de Chrome/Edge si el usuario no interactuó aún
        console.warn('El navegador bloqueó la reproducción automática del sonido hasta que hagas clic:', error)
      })
    }
  } catch (err) {
    console.error('Error al intentar reproducir el archivo de audio:', err)
  }
}