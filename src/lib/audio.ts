let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!window.AudioContext && !(window as any).webkitAudioContext) return null;

  if (!audioCtx) {
    try {
      audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    } catch (e) {
      console.warn("Failed to create AudioContext", e);
      return null;
    }
  }

  // Resume the context if it's suspended (e.g. created before user interaction)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  return audioCtx;
}
