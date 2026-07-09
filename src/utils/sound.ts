import type { SoundId } from "../types";

type SoundEvent = "click" | "phase" | "toggle" | "preview";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

function tone(frequency: number, start: number, duration: number, gain: number, type: OscillatorType) {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(start: number, duration: number, gain: number) {
  const context = getAudioContext();
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const output = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    output[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }
  const source = context.createBufferSource();
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  source.start(start);
  source.stop(start + duration);
}

export function playSound(soundId: SoundId, event: SoundEvent = "click", enabled = true) {
  if (!enabled) return;
  try {
    const context = getAudioContext();
    const now = context.currentTime;
    if (context.state === "suspended") void context.resume();

    const lift = event === "phase" ? 1.18 : event === "toggle" ? 0.86 : 1;
    if (soundId === "soft") {
      tone(420 * lift, now, 0.11, 0.035, "sine");
      tone(640 * lift, now + 0.018, 0.1, 0.018, "sine");
    }
    if (soundId === "wood") {
      noise(now, 0.075, 0.028);
      tone(185 * lift, now, 0.08, 0.02, "triangle");
    }
    if (soundId === "glass") {
      tone(780 * lift, now, 0.13, 0.024, "sine");
      tone(1180 * lift, now + 0.012, 0.16, 0.012, "sine");
    }
    if (soundId === "tape") {
      noise(now, 0.12, 0.015);
      tone(260 * lift, now + 0.016, 0.13, 0.018, "sawtooth");
    }
  } catch {
    // audio playback is a nice-to-have — never let it break the timer
  }
}
