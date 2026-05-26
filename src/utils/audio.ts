/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Native Web Audio API Synthesizer for beautiful game sound effects matching Duolingo
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Helper to play an MP3 file with a beautiful procedural fallback synthesizer
 */
function playSoundWithFallback(mp3Url: string, synthFallback: () => void) {
  try {
    const audio = new Audio(mp3Url);
    
    // Explicit low volume to avoid blasting the user's ears
    audio.volume = 0.6;
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // MP3 started playing successfully
        })
        .catch((error) => {
          // Playback failed or file not found => Use procedural synthesizer fallback
          console.warn(`Could not play MP3: ${mp3Url}. Falling back to internal synthesizer. Reason:`, error);
          synthFallback();
        });
    } else {
      synthFallback();
    }
  } catch (error) {
    console.warn(`Audio constructor failed for: ${mp3Url}. Playing synthesizer.`, error);
    synthFallback();
  }
}

/**
 * Plays a sweet, bright, double ascending chime (Duolingo Correct Answer vibe)
 */
export function playCorrectSound() {
  playSoundWithFallback('/sounds/correct.mp3', () => {
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      // First high note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, time); // C5
      osc1.frequency.setValueAtTime(659.25, time + 0.1); // E5
      
      gain1.gain.setValueAtTime(0.15, time);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(time);
      osc1.stop(time + 0.4);

      // Second overlapping even higher note
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, time + 0.08); // G5
      osc2.frequency.setValueAtTime(1046.50, time + 0.18); // C6

      gain2.gain.setValueAtTime(0, time);
      gain2.gain.setValueAtTime(0.12, time + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(time + 0.05);
      osc2.stop(time + 0.5);
    } catch (e) {
      console.warn("Web Audio API not supported or blocked directly by ambient settings", e);
    }
  });
}

/**
 * Plays a warm, flat sliding buzz descending (Duolingo Incorrect Answer vibe)
 */
export function playIncorrectSound() {
  playSoundWithFallback('/sounds/incorrect.mp3', () => {
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      // Buzz oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, time); // A3
      osc.frequency.linearRampToValueAtTime(130, time + 0.3); // Descending Pitch

      // Filter to sweeten the harsh sawtooth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, time);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.45);
    } catch (e) {
      console.warn("Web Audio API failed to load", e);
    }
  });
}

/**
 * Plays a glorious, triumphant multi-tone scale (Duolingo Lesson Completed fanfaring vibe)
 */
export function playSuccessSound() {
  playSoundWithFallback('/sounds/success.mp3', () => {
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      const notes = [
        { note: 523.25, delay: 0 },     // C5
        { note: 659.25, delay: 0.1 },   // E5
        { note: 783.99, delay: 0.2 },   // G5
        { note: 1046.50, delay: 0.3 },  // C6
        { note: 1318.51, delay: 0.45 }  // E6 triumphant finish
      ];

      notes.forEach((item) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(item.note, time + item.delay);

        gain.gain.setValueAtTime(0, time);
        gain.gain.setValueAtTime(0.12, time + item.delay);
        gain.gain.exponentialRampToValueAtTime(0.001, time + item.delay + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time + item.delay);
        osc.stop(time + item.delay + 0.6);
      });

      // Sub-bass root note for warmth
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(261.63, time); // C4
      subGain.gain.setValueAtTime(0.15, time);
      subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.85);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(time);
      subOsc.stop(time + 0.9);
    } catch (e) {
      console.warn("Web Audio API failed", e);
    }
  });
}

/**
 * Plays a sad descending doom jingle (Hearts run out/Game Over vibe)
 */
export function playGameOverSound() {
  playSoundWithFallback('/sounds/gameover.mp3', () => {
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      const notes = [
        { note: 392.00, delay: 0 },     // G4
        { note: 349.23, delay: 0.15 },  // F4
        { note: 311.13, delay: 0.3 },   // Eb4
        { note: 246.94, delay: 0.5 }    // B3 (sad unresolved tension)
      ];

      notes.forEach((item) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.note, time + item.delay);

        gain.gain.setValueAtTime(0, time);
        gain.gain.setValueAtTime(0.15, time + item.delay);
        gain.gain.exponentialRampToValueAtTime(0.001, time + item.delay + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time + item.delay);
        osc.stop(time + item.delay + 0.6);
      });
    } catch (e) {
      console.warn("Web Audio API failed", e);
    }
  });
}

/**
 * Plays a discrete organic click sound for buttons
 */
export function playClickSound() {
  playSoundWithFallback('/sounds/click.mp3', () => {
    try {
      const ctx = getAudioContext();
      const time = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, time);
      osc.frequency.exponentialRampToValueAtTime(200, time + 0.05);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.07);
    } catch (e) {
      console.warn("Web Audio API failed", e);
    }
  });
}

