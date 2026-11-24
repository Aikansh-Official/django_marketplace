/**
 * Lazy loaded confetti celebration helper
 * Prevents canvas-confetti bundle from being included in initial chunks
 */
export async function triggerConfetti(options = {}) {
  try {
    const { default: confetti } = await import('canvas-confetti');
    return confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      ...options,
    });
  } catch {
    // Graceful fallback if module fails to load
  }
}

export default triggerConfetti;
