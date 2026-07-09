let cachedDataUrl: string | null = null;
let audio: HTMLAudioElement | null = null;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// A one-second, near-silent tone encoded as a WAV data URI. Looping this keeps
// an active audio session alive, which is what stops iOS Safari from suspending
// JS execution (and therefore the timer + notifications) once the app is backgrounded.
function createKeepAliveDataUrl() {
  const sampleRate = 8000;
  const frameCount = sampleRate;
  const amplitude = 0.0008;
  const frequency = 30;
  const buffer = new ArrayBuffer(44 + frameCount * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, text: string) {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + frameCount * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, frameCount * 2, true);

  for (let i = 0; i < frameCount; i += 1) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude;
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  return `data:audio/wav;base64,${toBase64(new Uint8Array(buffer))}`;
}

function ensureAudio() {
  cachedDataUrl ??= createKeepAliveDataUrl();
  audio ??= new Audio(cachedDataUrl);
  audio.loop = true;
  audio.setAttribute("playsinline", "true");
  return audio;
}

export function startKeepAlive() {
  const element = ensureAudio();
  void element.play().catch(() => undefined);
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: "Bird View", artist: "Timer running" });
      navigator.mediaSession.playbackState = "playing";
    } catch {
      // MediaMetadata unsupported in this browser — non-essential, ignore
    }
  }
}

export function stopKeepAlive() {
  audio?.pause();
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.playbackState = "paused";
    } catch {
      // ignore
    }
  }
}
