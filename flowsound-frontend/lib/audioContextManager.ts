// Shared Web Audio pipeline (orb.md §5): one AudioContext → the media element's
// source → a single AnalyserNode → destination, wired lazily on the first play
// gesture and reused forever. The same <audio> element lives across tab switches,
// so category changes never touch the graph — only the shared analyser feeds the
// FluidAudioOrb.
let sharedAudioContext: AudioContext | null = null;
let sharedAnalyserNode: AnalyserNode | null = null;
let audioSourceNode: MediaElementAudioSourceNode | null = null;

export function initializeWebAudioPipeline(
  audioElement: HTMLAudioElement
): { audioContext: AudioContext; analyserNode: AnalyserNode } | null {
  try {
    if (!sharedAudioContext) {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === "suspended") {
      void sharedAudioContext.resume();
    }

    if (!sharedAnalyserNode) {
      sharedAnalyserNode = sharedAudioContext.createAnalyser();
      sharedAnalyserNode.fftSize = 128;
      sharedAnalyserNode.smoothingTimeConstant = 0.8;
    }

    if (!audioSourceNode) {
      audioSourceNode = sharedAudioContext.createMediaElementSource(
        audioElement
      );
      audioSourceNode.connect(sharedAnalyserNode);
      sharedAnalyserNode.connect(sharedAudioContext.destination);
    }

    return { audioContext: sharedAudioContext, analyserNode: sharedAnalyserNode };
  } catch {
    // Web Audio unavailable — playback still works, the orb has no bass signal.
    return null;
  }
}

/**
 * Resume-before-play hardening. Chrome can suspend the shared AudioContext
 * (hidden browser tab, system sleep, autoplay policy); while suspended the
 * element keeps "playing" but every sample is dropped at the destination →
 * total silence that nothing ever wakes up. This ensures a context is running
 * before playback resumes (awaiting the resume, capped so a stalled resume can
 * never block the press, best-effort on failure).
 *
 * First play is unaffected: a context created inside the click gesture is
 * already running, so this returns without yielding.
 */
export async function ensureAudioContextRunning(
  audioContext: AudioContext,
  timeoutMilliseconds = 400
): Promise<void> {
  if (
    !audioContext ||
    audioContext.state === "running" ||
    audioContext.state === "closed"
  ) {
    return;
  }
  try {
    await Promise.race([
      Promise.resolve(audioContext.resume()).catch(() => undefined),
      new Promise<void>((resolve) =>
        window.setTimeout(resolve, timeoutMilliseconds)
      ),
    ]);
  } catch {
    // Best effort — never block playback if recovery misbehaves.
  }
}